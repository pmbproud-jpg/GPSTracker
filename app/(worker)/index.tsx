import { useAuth } from "@/src/providers/AuthProvider";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";

export default function WorkerScreen() {
  const { profile, signOut } = useAuth();
  const [permGranted, setPermGranted] = useState<boolean | null>(null);

  // Sprawdź uprawnienia
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

  // Auto-minimalizacja po 3s — apka przechodzi w tło
  useEffect(() => {
    if (permGranted && Platform.OS !== "web") {
      const timer = setTimeout(() => {
        // Na Androidzie nie da się programowo zminimalizować,
        // ale możemy poinformować użytkownika
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [permGranted]);

  const requestPermissions = async () => {
    const { status: fg } = await Location.requestForegroundPermissionsAsync();
    if (fg !== "granted") return;
    if (Platform.OS === "android") {
      const { status: bg } = await Location.requestBackgroundPermissionsAsync();
      setPermGranted(bg === "granted");
    } else {
      setPermGranted(true);
    }
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
      {/* Status */}
      <View
        style={{
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: permGranted ? "#dcfce7" : "#fee2e2",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        <Ionicons
          name={permGranted ? "checkmark-circle" : "alert-circle"}
          size={50}
          color={permGranted ? "#059669" : "#dc2626"}
        />
      </View>

      <Text style={{ fontSize: 18, fontWeight: "700", color: "#1e293b", marginBottom: 4 }}>
        {profile?.full_name || "Mitarbeiter"}
      </Text>

      <Text
        style={{
          fontSize: 14,
          fontWeight: "600",
          color: permGranted ? "#059669" : "#dc2626",
          marginBottom: 16,
        }}
      >
        {permGranted === null
          ? "..."
          : permGranted
          ? "Aktiv — Sie können die App minimieren"
          : "Standort nicht erlaubt"}
      </Text>

      {!permGranted && permGranted !== null && (
        <TouchableOpacity
          style={{
            backgroundColor: "#4A90D9",
            borderRadius: 12,
            paddingVertical: 14,
            paddingHorizontal: 24,
            marginBottom: 16,
          }}
          onPress={requestPermissions}
        >
          <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>
            Standort erlauben
          </Text>
        </TouchableOpacity>
      )}

      {permGranted && (
        <Text style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", maxWidth: 260 }}>
          Minimieren Sie die App. Der Standort wird automatisch im Hintergrund gesendet.
        </Text>
      )}

      {/* Wylogowanie — małe, na dole */}
      <TouchableOpacity
        onPress={() => {
          if (Platform.OS === "web") {
            if (window.confirm("Abmelden?")) signOut();
          } else {
            signOut();
          }
        }}
        style={{ position: "absolute", bottom: 40 }}
      >
        <Text style={{ color: "#94a3b8", fontSize: 12 }}>Abmelden</Text>
      </TouchableOpacity>
    </View>
  );
}
