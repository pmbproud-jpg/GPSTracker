import { useAuth } from "@/src/providers/AuthProvider";
import { supabaseAdmin } from "@/src/lib/supabase/client";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function NewWorkerScreen() {
  const { profile } = useAuth();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const companyId = profile?.company_id;

  const handleCreate = async () => {
    setError(null);

    if (!name.trim()) {
      setError("Bitte einen Namen eingeben");
      return;
    }
    if (!companyId) {
      setError("Keine Firma zugeordnet. Bitte erneut einloggen. (company_id fehlt)");
      return;
    }

    setLoading(true);

    const code = generateCode();
    const fakeEmail = `worker-${code.toLowerCase()}@gpstracker.local`;

    try {
      // 1. Create auth user (service role)
      console.log("Creating worker:", { fakeEmail, code, companyId });
      const { data: authData, error: authErr } =
        await supabaseAdmin.auth.admin.createUser({
          email: fakeEmail,
          password: code,
          email_confirm: true,
        });

      console.log("Auth result:", { user: authData?.user?.id, error: authErr });

      if (authErr || !authData.user) {
        setError("Auth: " + (authErr?.message || "Benutzer konnte nicht erstellt werden"));
        setLoading(false);
        return;
      }

      // 2. Update profile (trigger already created it with role='client')
      const { error: updateErr } = await supabaseAdmin.from("profiles").update({
        full_name: name.trim(),
        role: "worker",
        company_id: companyId,
        worker_code: code,
        email: fakeEmail,
        is_active: true,
      }).eq("id", authData.user.id);

      console.log("Profile update result:", { error: updateErr });

      if (updateErr) {
        setError("Profil: " + updateErr.message);
        setLoading(false);
        return;
      }

      setCreatedCode(code);
      setName("");
    } catch (e: any) {
      console.error("Worker creation error:", e);
      setError("Exception: " + (e.message || "Unbekannter Fehler"));
    }
    setLoading(false);
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
        {createdCode ? (
          <View style={{ alignItems: "center" }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: "#dcfce7",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
              }}
            >
              <Ionicons name="checkmark" size={40} color="#059669" />
            </View>
            <Text style={{ fontSize: 20, fontWeight: "700", color: "#1e293b", marginBottom: 8 }}>
              Mitarbeiter erstellt!
            </Text>
            <Text style={{ fontSize: 14, color: "#64748b", textAlign: "center", marginBottom: 24 }}>
              Geben Sie diesen Code dem Mitarbeiter. Er loggt sich damit in der App ein.
            </Text>

            <View
              style={{
                backgroundColor: "#1e293b",
                borderRadius: 16,
                paddingVertical: 20,
                paddingHorizontal: 32,
                marginBottom: 24,
              }}
            >
              <Text
                style={{
                  fontSize: 36,
                  fontWeight: "900",
                  color: "#fff",
                  letterSpacing: 8,
                  textAlign: "center",
                  fontFamily: Platform.OS === "web" ? "monospace" : undefined,
                }}
              >
                {createdCode}
              </Text>
            </View>

            <Text style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", marginBottom: 24 }}>
              Der Mitarbeiter installiert die App, wählt "Mitarbeiter-Code" und gibt diesen Code ein.
            </Text>

            <TouchableOpacity
              style={{
                backgroundColor: "#4A90D9",
                borderRadius: 12,
                paddingVertical: 14,
                paddingHorizontal: 24,
                alignItems: "center",
                width: "100%",
              }}
              onPress={() => setCreatedCode(null)}
            >
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
                Weiteren Mitarbeiter erstellen
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={{ alignItems: "center", marginBottom: 32 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  backgroundColor: "#4A90D9",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <Ionicons name="person-add" size={28} color="#fff" />
              </View>
              <Text style={{ fontSize: 20, fontWeight: "700", color: "#1e293b" }}>
                Neuer Mitarbeiter
              </Text>
              <Text style={{ fontSize: 13, color: "#64748b", marginTop: 4, textAlign: "center" }}>
                Erstellen Sie einen Mitarbeiter. Er erhält einen Login-Code.
              </Text>
            </View>

            {/* Error message */}
            {error && (
              <View style={{
                backgroundColor: "#fee2e2",
                borderRadius: 10,
                padding: 12,
                marginBottom: 16,
              }}>
                <Text style={{ color: "#dc2626", fontSize: 13 }}>{error}</Text>
              </View>
            )}

            <Text style={{ fontSize: 13, fontWeight: "600", color: "#475569", marginBottom: 6 }}>
              Name des Mitarbeiters
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
              value={name}
              onChangeText={setName}
              placeholder="z.B. Max Mustermann"
            />

            <TouchableOpacity
              style={{
                backgroundColor: "#059669",
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: "center",
                opacity: !name.trim() || loading ? 0.5 : 1,
              }}
              onPress={handleCreate}
              disabled={!name.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
                  Erstellen & Code generieren
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
