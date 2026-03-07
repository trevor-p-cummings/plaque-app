import { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../../lib/supabase";
import {
  getCurrentLocation,
  distanceMeters,
  CHECK_IN_RADIUS,
} from "../../lib/location";
import { POINTS_PER_CHECKIN, POINTS_PER_PHOTO, POINTS_PER_QUIZ, getEarnedBadges } from "../../lib/badges";
import type { Plaque, QuizQuestion } from "../../types";

export default function PlaqueDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [plaque, setPlaque] = useState<Plaque | null>(null);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<QuizQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizAlreadyAttempted, setQuizAlreadyAttempted] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [narrativeLoading, setNarrativeLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: plaqueData }, { data: quizData }] = await Promise.all([
        supabase.from("plaques").select("*").eq("id", id).single(),
        supabase.from("quiz_questions").select("*").eq("plaque_id", id).limit(1).single(),
      ]);

      if (plaqueData) setPlaque(plaqueData as Plaque);
      if (quizData) setQuiz(quizData as QuizQuestion);

      // Check if user already checked in or attempted the quiz
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: existingCheckIn } = await supabase
          .from("check_ins")
          .select("id")
          .eq("user_id", user.id)
          .eq("plaque_id", id)
          .limit(1)
          .maybeSingle();

        if (existingCheckIn) setCheckedIn(true);

        if (quizData) {
          const { data: existingAttempt } = await supabase
            .from("quiz_attempts")
            .select("selected_index")
            .eq("user_id", user.id)
            .eq("quiz_question_id", quizData.id)
            .maybeSingle();

          if (existingAttempt) {
            setSelectedAnswer(existingAttempt.selected_index);
            setQuizAlreadyAttempted(true);
          }
        }
      }

      setLoading(false);
    })();
  }, [id]);

  const handleCheckIn = async () => {
    if (!plaque) return;
    const location = await getCurrentLocation();
    if (!location) {
      Alert.alert("Location Required", "Please enable location services.");
      return;
    }

    const dist = distanceMeters(
      location.coords.latitude,
      location.coords.longitude,
      plaque.latitude,
      plaque.longitude
    );

    if (dist > CHECK_IN_RADIUS) {
      Alert.alert(
        "Too Far",
        `You are ${Math.round(dist)}m away. Get within ${CHECK_IN_RADIUS}m to check in.`
      );
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert("Sign In Required", "Please sign in to check in.");
      return;
    }

    const { error } = await supabase.from("check_ins").insert({
      user_id: user.id,
      plaque_id: plaque.id,
    });

    if (error) {
      if (error.code === "23505") {
        setCheckedIn(true);
        Alert.alert("Already Checked In", "You've already visited this plaque.");
        return;
      }
      Alert.alert("Error", "Could not check in. Try again.");
      return;
    }

    // Award points
    await supabase.rpc("increment_points", { user_id: user.id, amount: POINTS_PER_CHECKIN });

    // Check for new badges
    const { count } = await supabase
      .from("check_ins")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const newBadges = getEarnedBadges(count ?? 0).map((b) => b.id);
    await supabase
      .from("profiles")
      .update({ badges: newBadges })
      .eq("id", user.id);

    setCheckedIn(true);
    Alert.alert("Checked In!", `+${POINTS_PER_CHECKIN} points`);
  };

  const handlePhotoUpload = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPhotoUri(asset.uri);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !plaque) return;

    // Upload to Supabase Storage
    const fileName = `${user.id}/${plaque.id}_${Date.now()}.jpg`;
    const response = await fetch(asset.uri);
    const blob = await response.blob();

    const { error } = await supabase.storage
      .from("plaque-photos")
      .upload(fileName, blob, { contentType: "image/jpeg" });

    if (error) {
      Alert.alert("Upload Failed", error.message);
      return;
    }

    // Award points
    await supabase.rpc("increment_points", { user_id: user.id, amount: POINTS_PER_PHOTO });
    Alert.alert("Photo Uploaded!", `+${POINTS_PER_PHOTO} points`);
  };

  const handleGenerateNarrative = async () => {
    if (!plaque) return;
    setNarrativeLoading(true);

    const { data, error } = await supabase.functions.invoke("generate-narrative", {
      body: {
        title: plaque.title,
        description: plaque.description,
      },
    });

    setNarrativeLoading(false);
    if (error) {
      Alert.alert("Error", "Could not generate narrative.");
      return;
    }
    setNarrative(data.narrative);
  };

  const handleQuizAnswer = async (index: number) => {
    if (!quiz || quizAlreadyAttempted) return;
    setSelectedAnswer(index);

    const isCorrect = index === quiz.correct_index;

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Record attempt (unique constraint prevents duplicates)
      await supabase.from("quiz_attempts").insert({
        user_id: user.id,
        quiz_question_id: quiz.id,
        selected_index: index,
        correct: isCorrect,
      });

      if (isCorrect) {
        await supabase.rpc("increment_points", { user_id: user.id, amount: POINTS_PER_QUIZ });
      }
    }

    setQuizAlreadyAttempted(true);

    if (isCorrect) {
      Alert.alert("Correct!", `+${POINTS_PER_QUIZ} points`);
    } else {
      Alert.alert("Incorrect", "Better luck next time!");
    }
  };

  if (loading || !plaque) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {plaque.image_url && (
        <Image source={{ uri: plaque.image_url }} style={styles.heroImage} />
      )}

      <View style={styles.content}>
        <Text style={styles.title}>{plaque.title}</Text>

        <View style={styles.metaRow}>
          {plaque.year_erected && (
            <Text style={styles.metaBadge}>Est. {plaque.year_erected}</Text>
          )}
          {plaque.address && (
            <Text style={styles.metaAddress}>{plaque.address}</Text>
          )}
        </View>

        <Text style={styles.description}>{plaque.description}</Text>

        {/* Check-in button */}
        <TouchableOpacity
          style={[styles.button, checkedIn && styles.buttonDisabled]}
          onPress={handleCheckIn}
          disabled={checkedIn}
        >
          <Text style={styles.buttonText}>
            {checkedIn ? "Checked In" : "Check In"}
          </Text>
        </TouchableOpacity>

        {/* Photo upload */}
        <TouchableOpacity style={styles.buttonSecondary} onPress={handlePhotoUpload}>
          <Text style={styles.buttonSecondaryText}>Upload Photo</Text>
        </TouchableOpacity>

        {photoUri && (
          <Image source={{ uri: photoUri }} style={styles.uploadedPhoto} />
        )}

        {/* AI Narrative */}
        <TouchableOpacity
          style={styles.buttonSecondary}
          onPress={handleGenerateNarrative}
          disabled={narrativeLoading}
        >
          <Text style={styles.buttonSecondaryText}>
            {narrativeLoading ? "Generating..." : "Get AI Narrative"}
          </Text>
        </TouchableOpacity>

        {narrative && (
          <View style={styles.narrativeBox}>
            <Text style={styles.narrativeTitle}>AI Narrative</Text>
            <Text style={styles.narrativeText}>{narrative}</Text>
          </View>
        )}

        {/* Quiz */}
        {quiz && (
          <View style={styles.quizBox}>
            <Text style={styles.quizTitle}>Quiz</Text>
            <Text style={styles.quizQuestion}>{quiz.question}</Text>
            {(quiz.options as string[]).map((option, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.quizOption,
                  selectedAnswer === i &&
                    (i === quiz.correct_index
                      ? styles.quizCorrect
                      : styles.quizIncorrect),
                ]}
                onPress={() => handleQuizAnswer(i)}
                disabled={quizAlreadyAttempted}
              >
                <Text style={styles.quizOptionText}>{option}</Text>
              </TouchableOpacity>
            ))}
            {quizAlreadyAttempted && (
              <Text style={styles.quizAttempted}>
                You have already answered this quiz.
              </Text>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  heroImage: { width: "100%", height: 200, resizeMode: "cover" },
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 8 },
  metaBadge: {
    fontSize: 13,
    color: "#fff",
    backgroundColor: "#1a73e8",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
    fontWeight: "600",
  },
  metaAddress: { fontSize: 13, color: "#666", flexShrink: 1 },
  description: { fontSize: 16, color: "#444", lineHeight: 24, marginBottom: 16 },
  button: {
    backgroundColor: "#1a73e8",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonDisabled: { backgroundColor: "#aaa" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  buttonSecondary: {
    borderWidth: 1,
    borderColor: "#1a73e8",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonSecondaryText: { color: "#1a73e8", fontSize: 16, fontWeight: "600" },
  uploadedPhoto: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  narrativeBox: {
    backgroundColor: "#f0f7ff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  narrativeTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  narrativeText: { fontSize: 15, lineHeight: 22, color: "#333" },
  quizBox: {
    backgroundColor: "#fff9e6",
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  quizTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  quizQuestion: { fontSize: 16, marginBottom: 12 },
  quizOption: {
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 8,
  },
  quizOptionText: { fontSize: 15 },
  quizCorrect: { backgroundColor: "#d4edda", borderColor: "#28a745" },
  quizIncorrect: { backgroundColor: "#f8d7da", borderColor: "#dc3545" },
  quizAttempted: { fontSize: 13, color: "#888", fontStyle: "italic", marginTop: 4 },
});
