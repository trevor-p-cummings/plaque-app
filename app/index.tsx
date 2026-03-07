import { useEffect, useState } from "react";
import { StyleSheet, Text, View, ActivityIndicator } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import { getCurrentLocation } from "../lib/location";
import type { Plaque } from "../types";

export default function MapScreen() {
  const router = useRouter();
  const [plaques, setPlaques] = useState<Plaque[]>([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState({
    latitude: 51.5074,
    longitude: -0.1278,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
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
            title={p.title}
            description={p.description.slice(0, 80) + "..."}
            onCalloutPress={() => router.push(`/plaque/${p.id}`)}
          />
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
});
