import { AuthProvider, useAuth } from "@/src/providers/AuthProvider";
import { Slot, useRouter, useSegments } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, Platform, View } from "react-native";

// GPS tracking only on mobile — lazy import to prevent web crash
function useGPSTrackingSafe() {
  if (Platform.OS === "web") return;
  try {
    const { useGPSTracking } = require("@/src/hooks/useGPSTracking");
    useGPSTracking();
  } catch (e) {
    console.warn("GPS tracking init failed:", e);
  }
}

function RootNavigator() {
  const { profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // GPS tracking — safe, won't crash app
  useGPSTrackingSafe();

  useEffect(() => {
    if (loading) return;

    const inAuth = segments[0] === "login" || segments[0] === "register";

    if (!profile) {
      // Not logged in → go to login
      if (!inAuth) router.replace("/login");
      return;
    }

    // Redirect based on role
    const role = profile.role;
    const currentGroup = segments[0];

    if (role === "super_admin" && currentGroup !== "(admin)") {
      router.replace("/(admin)");
    } else if (role === "client" && currentGroup !== "(client)") {
      router.replace("/(client)");
    } else if (role === "worker" && currentGroup !== "(worker)") {
      router.replace("/(worker)");
    }
  }, [profile, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
