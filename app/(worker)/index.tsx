import { useAuth } from "@/src/providers/AuthProvider";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import { Alert, Platform, Text, TouchableOpacity, View } from "react-native";

export default function WorkerScreen() {
  const { profile, signOut } = useAuth();
  const [permGranted, setPermGranted] = useState<boolean | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(
    profile?.last_location_at ?? null
  );

  useEffect(() => {
    (async () => {
      const { status: fg } = await Location.getForegroundPermissionsAsync();
      if (fg !== "granted") {
        setPermGranted(false);
        return;
      }
      if (Platform.OS === "android") {
        const { status: bg } = await Location.getBackgroundPermissionsAsync();
        setPermGranted(bg === "granted");
      } else {
        setPermGranted(true);
      }
    })();
  }, []);

  // Refresh last update time periodically
  useEffect(() => {
    const iv = setInterval(() => {
      // Profile is re-fetched by AuthProvider, but we can show the current known time
      setLastUpdate(profile?.last_location_at ?? null);
    }, 30_000);
    return () => clearInterval(iv);
  }, [profile]);

  const requestPermissions = async () => {
    const { status: fg } = await Location.requestForegroundPermissionsAsync();
    if (fg !== "granted") {
      Alert.alert("Berechtigung erforderlich", "Bitte erlauben Sie den Standortzugriff.");
      return;
    }
    if (Platform.OS === "android") {
      const { status: bg } = await Location.requestBackgroundPermissionsAsync();
      setPermGranted(bg === "granted");
      if (bg !== "granted") {
        Alert.alert(
          "Hintergrund-Standort",
          'Bitte wählen Sie "Immer zulassen" für die Standortberechtigung.'
        );
      }
    } else {
      setPermGranted(true);
    }
  };

  const formatTime = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatAge = (d: string | null) => {
    if (!d) return "";
    const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 1) return "gerade eben";
    if (m < 60) return `vor ${m} min`;
    return `vor ${Math.round(m / 60)}h`;
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#f8fafc",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
      }}
    >
      {/* GPS Status indicator */}
      <View
        style={{
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: permGranted ? "#dcfce7" : "#fee2e2",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
        }}
      >
        <Ionicons
          name={permGranted ? "navigate" : "navigate-outline"}
          size={56}
          color={permGranted ? "#059669" : "#dc2626"}
        />
      </View>

      <Text style={{ fontSize: 22, fontWeight: "800", color: "#1e293b", marginBottom: 4 }}>
        {profile?.full_name || "Mitarbeiter"}
      </Text>

      <Text
        style={{
          fontSize: 16,
          fontWeight: "600",
          color: permGranted ? "#059669" : "#dc2626",
          marginBottom: 20,
        }}
      >
        {permGranted === null
          ? "Prüfe Berechtigungen..."
          : permGranted
          ? "GPS aktiv"
          : "GPS nicht erlaubt"}
      </Text>

      {!permGranted && permGranted !== null && (
        <TouchableOpacity
          style={{
            backgroundColor: "#4A90D9",
            borderRadius: 12,
            paddingVertical: 14,
            paddingHorizontal: 24,
            marginBottom: 20,
          }}
          onPress={requestPermissions}
        >
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
            Standort erlauben
          </Text>
        </TouchableOpacity>
      )}

      {/* Last update info */}
      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 14,
          padding: 20,
          width: "100%",
          maxWidth: 300,
          borderWidth: 1,
          borderColor: "#e2e8f0",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <Text style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>
          Letzte Aktualisierung
        </Text>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#1e293b" }}>
          {formatTime(lastUpdate)}
        </Text>
        <Text style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
          {formatAge(lastUpdate)}
        </Text>
      </View>

      <Text style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", maxWidth: 280, marginBottom: 32 }}>
        Die App sendet automatisch Ihren Standort alle 5 Minuten. Sie können die App minimieren.
      </Text>

      {/* Sign out */}
      <TouchableOpacity
        onPress={() => {
          if (typeof window !== "undefined" && window.confirm("Abmelden?")) {
            signOut();
          }
        }
        }
        style={{ padding: 8 }}
      >
        <Text style={{ color: "#dc2626", fontSize: 14 }}>Abmelden</Text>
      </TouchableOpacity>
    </View>
  );
}
