import { useAuth } from "@/src/providers/AuthProvider";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function LoginScreen() {
  const { signIn, signInWithCode } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workerCode, setWorkerCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) Alert.alert("Fehler", error);
  };

  const handleCodeLogin = async () => {
    if (!workerCode.trim()) return;
    setLoading(true);
    const { error } = await signInWithCode(workerCode.trim());
    setLoading(false);
    if (error) Alert.alert("Fehler", error);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#f8fafc" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: 24,
          maxWidth: 400,
          width: "100%",
          alignSelf: "center",
        }}
      >
        {/* Logo */}
        <View style={{ alignItems: "center", marginBottom: 40 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              backgroundColor: "#4A90D9",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Ionicons name="navigate" size={36} color="#fff" />
          </View>
          <Text style={{ fontSize: 28, fontWeight: "800", color: "#1e293b" }}>
            GPSTracker
          </Text>
          <Text style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
            Standortverfolgung für Teams
          </Text>
        </View>

        {/* Mode toggle */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: "#e2e8f0",
            borderRadius: 12,
            padding: 4,
            marginBottom: 24,
          }}
        >
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: mode === "email" ? "#fff" : "transparent",
              alignItems: "center",
            }}
            onPress={() => setMode("email")}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: mode === "email" ? "700" : "500",
                color: mode === "email" ? "#1e293b" : "#64748b",
              }}
            >
              E-Mail Login
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: mode === "code" ? "#fff" : "transparent",
              alignItems: "center",
            }}
            onPress={() => setMode("code")}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: mode === "code" ? "700" : "500",
                color: mode === "code" ? "#1e293b" : "#64748b",
              }}
            >
              Mitarbeiter-Code
            </Text>
          </TouchableOpacity>
        </View>

        {mode === "email" ? (
          <>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#475569", marginBottom: 6 }}>
              E-Mail
            </Text>
            <TextInput
              style={{
                backgroundColor: "#fff",
                borderWidth: 1,
                borderColor: "#e2e8f0",
                borderRadius: 12,
                padding: 14,
                fontSize: 16,
                marginBottom: 16,
              }}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="email@firma.de"
            />
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#475569", marginBottom: 6 }}>
              Passwort
            </Text>
            <TextInput
              style={{
                backgroundColor: "#fff",
                borderWidth: 1,
                borderColor: "#e2e8f0",
                borderRadius: 12,
                padding: 14,
                fontSize: 16,
                marginBottom: 24,
              }}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
            />
            <TouchableOpacity
              style={{
                backgroundColor: "#4A90D9",
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: "center",
              }}
              onPress={handleEmailLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
                  Anmelden
                </Text>
              )}
            </TouchableOpacity>

            {/* Register link */}
            <TouchableOpacity
              style={{ marginTop: 20, alignItems: "center" }}
              onPress={() => router.push("/register")}
            >
              <Text style={{ color: "#4A90D9", fontSize: 14 }}>
                Noch kein Konto? Jetzt registrieren
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: "#475569",
                marginBottom: 6,
              }}
            >
              Mitarbeiter-Code
            </Text>
            <TextInput
              style={{
                backgroundColor: "#fff",
                borderWidth: 1,
                borderColor: "#e2e8f0",
                borderRadius: 12,
                padding: 14,
                fontSize: 24,
                fontWeight: "700",
                letterSpacing: 4,
                textAlign: "center",
                marginBottom: 8,
              }}
              value={workerCode}
              onChangeText={(t) => setWorkerCode(t.toUpperCase())}
              autoCapitalize="characters"
              placeholder="ABC123"
              maxLength={8}
            />
            <Text
              style={{
                fontSize: 12,
                color: "#94a3b8",
                textAlign: "center",
                marginBottom: 24,
              }}
            >
              Geben Sie den Code ein, den Sie von Ihrem Arbeitgeber erhalten haben
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: "#4A90D9",
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: "center",
              }}
              onPress={handleCodeLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
                  Anmelden
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
