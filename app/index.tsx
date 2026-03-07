import { useEffect, useState } from "react";
import { StyleSheet, Text, View, ActivityIndicator } from "react-native";
import MapView, { Marker, Callout } from "react-native-maps";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import { getCurrentLocation } from "../lib/location";
import type { Plaque } from "../types";

export default function MapScreen() {
  const router = useRouter();
  const [plaques, setPlaques] = useState<Plaque[]>([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState({
    latitude: 43.6532,
    longitude: -79.3832,
    latitudeDelta: 0.06,
    longitudeDelta: 0.06,
  });

  useEffect(() => {
    (async () => {
      const location = await getCurrentLocation();
      if (location) {
        setRegion((r) => ({
          ...r,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        }));
      }

      const { data } = await supabase
        .from("plaques")
        .select("*")
        .limit(100);

      if (data) setPlaques(data as Plaque[]);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a73e8" />
        <Text style={styles.loadingText}>Loading plaques...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView style={styles.map} region={region}>
        {plaques.map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.latitude, longitude: p.longitude }}
          >
            <Callout onPress={() => router.push(`/plaque/${p.id}`)}>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{p.title}</Text>
                {p.year_erected && (
                  <Text style={styles.calloutYear}>Est. {p.year_erected}</Text>
                )}
                {p.address && (
                  <Text style={styles.calloutAddress}>{p.address}</Text>
                )}
                <Text style={styles.calloutHint}>Tap for details</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 16, color: "#666" },
  callout: { width: 200, padding: 4 },
  calloutTitle: { fontSize: 14, fontWeight: "bold", marginBottom: 2 },
  calloutYear: { fontSize: 12, color: "#1a73e8", marginBottom: 2 },
  calloutAddress: { fontSize: 12, color: "#666", marginBottom: 4 },
  calloutHint: { fontSize: 11, color: "#999", fontStyle: "italic" },
});
