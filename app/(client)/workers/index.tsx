import { useAuth } from "@/src/providers/AuthProvider";
import { supabase, supabaseAdmin } from "@/src/lib/supabase/client";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Worker {
  id: string;
  full_name: string | null;
  email: string | null;
  worker_code: string | null;
  is_active: boolean;
  last_location_at: string | null;
}

export default function WorkerListScreen() {
  const { profile } = useAuth();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const companyId = profile?.company_id;

  const fetch = useCallback(async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, worker_code, is_active, last_location_at")
      .eq("company_id", companyId)
      .eq("role", "worker")
      .order("full_name");
    setWorkers((data as Worker[]) || []);
  }, [companyId]);

  useEffect(() => {
    fetch().finally(() => setLoading(false));
  }, [fetch]);

  const toggleActive = async (w: Worker) => {
    await supabaseAdmin.from("profiles").update({ is_active: !w.is_active }).eq("id", w.id);
    fetch();
  };

  const deleteWorker = async (w: Worker) => {
    if (!window.confirm(`${w.full_name || w.worker_code} wirklich entfernen?`)) return;
    await supabaseAdmin.from("locations").delete().eq("user_id", w.id);
    await supabaseAdmin.from("profiles").delete().eq("id", w.id);
    await supabaseAdmin.auth.admin.deleteUser(w.id);
    fetch();
  };

  const formatAge = (d: string | null) => {
    if (!d) return "Nie aktiv";
    const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 1) return "Gerade aktiv";
    if (m < 60) return `Vor ${m} min`;
    if (m < 1440) return `Vor ${Math.round(m / 60)}h`;
    return `Vor ${Math.round(m / 1440)}d`;
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc" }}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f8fafc" }}
      contentContainerStyle={{ padding: 20, maxWidth: 600, width: "100%", alignSelf: "center" }}
      refreshControl={
        Platform.OS !== "web" ? (
          <RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetch(); setRefreshing(false); }} />
        ) : undefined
      }
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#7c3aed", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="people" size={22} color="#fff" />
        </View>
        <View>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#1e293b" }}>
            Mitarbeiter
          </Text>
          <Text style={{ fontSize: 12, color: "#64748b" }}>{workers.length} registriert</Text>
        </View>
      </View>

      {workers.length === 0 ? (
        <View style={{ padding: 40, alignItems: "center" }}>
          <Ionicons name="people-outline" size={48} color="#94a3b8" />
          <Text style={{ fontSize: 14, color: "#94a3b8", marginTop: 12 }}>
            Keine Mitarbeiter. Erstellen Sie einen neuen.
          </Text>
        </View>
      ) : (
        workers.map((w) => (
          <View
            key={w.id}
            style={{
              backgroundColor: "#fff",
              borderRadius: 14,
              padding: 16,
              marginBottom: 8,
              borderWidth: 1,
              borderColor: "#e2e8f0",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: w.is_active ? "#dcfce7" : "#fee2e2",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="person" size={20} color={w.is_active ? "#059669" : "#dc2626"} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#1e293b" }}>
                  {w.full_name || "Unbenannt"}
                </Text>
                <Text style={{ fontSize: 12, color: "#64748b" }}>
                  Code: {w.worker_code || "—"} · {formatAge(w.last_location_at)}
                </Text>
              </View>
            </View>

            {/* Actions */}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
              <TouchableOpacity
                onPress={() => toggleActive(w)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: w.is_active ? "#fef3c7" : "#dcfce7",
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "600", color: w.is_active ? "#d97706" : "#059669" }}>
                  {w.is_active ? "Deaktivieren" : "Aktivieren"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => deleteWorker(w)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: "#fee2e2",
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#dc2626" }}>Löschen</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}
