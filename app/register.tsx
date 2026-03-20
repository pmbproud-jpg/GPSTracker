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

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Fehler", "Bitte alle Felder ausfüllen");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Fehler", "Passwort muss mindestens 6 Zeichen lang sein");
      return;
    }
    setLoading(true);
    const { error } = await signUp(email.trim(), password, fullName.trim());
    setLoading(false);
    if (error) {
      Alert.alert("Fehler", error);
    } else {
      Alert.alert("Erfolg", "Konto erstellt! Sie können sich jetzt anmelden.", [
        { text: "OK", onPress: () => router.replace("/login") },
      ]);
    }
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
        {/* Header */}
        <View style={{ alignItems: "center", marginBottom: 32 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              backgroundColor: "#059669",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <Ionicons name="business" size={28} color="#fff" />
          </View>
          <Text style={{ fontSize: 22, fontWeight: "800", color: "#1e293b" }}>
            Firma registrieren
          </Text>
          <Text style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
            Erstellen Sie ein Konto, um Ihr Team zu verfolgen
          </Text>
        </View>

        {/* Form */}
        <Text style={{ fontSize: 13, fontWeight: "600", color: "#475569", marginBottom: 6 }}>
          Firmenname / Ihr Name
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
          value={fullName}
          onChangeText={setFullName}
          placeholder="Mustermann GmbH"
        />

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
          placeholder="Mindestens 6 Zeichen"
        />

        <TouchableOpacity
          style={{
            backgroundColor: "#059669",
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: "center",
          }}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
              Registrieren
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={{ marginTop: 20, alignItems: "center" }}
          onPress={() => router.replace("/login")}
        >
          <Text style={{ color: "#4A90D9", fontSize: 14 }}>
            Bereits ein Konto? Anmelden
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
