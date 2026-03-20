import { useAuth } from "@/src/providers/AuthProvider";
import { supabaseAdmin } from "@/src/lib/supabase/client";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Company {
  id: string;
  name: string;
  email: string | null;
  is_active: boolean;
  max_workers: number;
  created_at: string;
  worker_count?: number;
}

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCompanies = useCallback(async () => {
    const { data } = await supabaseAdmin
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      // Get worker count per company
      const enriched = await Promise.all(
        data.map(async (c: any) => {
          const { count } = await supabaseAdmin
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("company_id", c.id)
            .eq("role", "worker");
          return { ...c, worker_count: count ?? 0 } as Company;
        })
      );
      setCompanies(enriched);
    }
  }, []);

  useEffect(() => {
    fetchCompanies().finally(() => setLoading(false));
  }, [fetchCompanies]);

  const toggleCompany = async (id: string, isActive: boolean) => {
    await supabaseAdmin.from("companies").update({ is_active: !isActive }).eq("id", id);
    fetchCompanies();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCompanies();
    setRefreshing(false);
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
      contentContainerStyle={{ padding: 20, maxWidth: 800, width: "100%", alignSelf: "center" }}
      refreshControl={
        Platform.OS !== "web" ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        ) : undefined
      }
    >
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "#dc2626", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="shield-checkmark" size={24} color="#fff" />
          </View>
          <View>
            <Text style={{ fontSize: 22, fontWeight: "800", color: "#1e293b" }}>
              Super Admin
            </Text>
            <Text style={{ fontSize: 13, color: "#64748b" }}>
              {companies.length} Firmen registriert
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => Alert.alert("Abmelden?", "", [
            { text: "Abbrechen" },
            { text: "Ja", onPress: signOut, style: "destructive" },
          ])}
          style={{ padding: 8 }}
        >
          <Ionicons name="log-out-outline" size={24} color="#dc2626" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          { label: "Firmen", value: companies.length, icon: "business", color: "#4A90D9" },
          { label: "Aktiv", value: companies.filter((c) => c.is_active).length, icon: "checkmark-circle", color: "#059669" },
          { label: "Mitarbeiter", value: companies.reduce((s, c) => s + (c.worker_count ?? 0), 0), icon: "people", color: "#7c3aed" },
        ].map((s) => (
          <View
            key={s.label}
            style={{
              flex: 1,
              minWidth: 120,
              backgroundColor: "#fff",
              borderRadius: 14,
              padding: 16,
              borderWidth: 1,
              borderColor: "#e2e8f0",
            }}
          >
            <Ionicons name={s.icon as any} size={22} color={s.color} />
            <Text style={{ fontSize: 28, fontWeight: "800", color: "#1e293b", marginTop: 8 }}>
              {s.value}
            </Text>
            <Text style={{ fontSize: 12, color: "#64748b" }}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Company list */}
      <Text style={{ fontSize: 16, fontWeight: "700", color: "#1e293b", marginBottom: 12 }}>
        Alle Firmen
      </Text>
      {companies.map((c) => (
        <View
          key={c.id}
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#fff",
            borderRadius: 14,
            padding: 16,
            marginBottom: 8,
            borderWidth: 1,
            borderColor: "#e2e8f0",
            gap: 12,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: c.is_active ? "#dcfce7" : "#fee2e2",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name="business"
              size={20}
              color={c.is_active ? "#059669" : "#dc2626"}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#1e293b" }}>
              {c.name}
            </Text>
            <Text style={{ fontSize: 12, color: "#64748b" }}>
              {c.email} · {c.worker_count ?? 0} Mitarbeiter
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => toggleCompany(c.id, c.is_active)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: c.is_active ? "#fee2e2" : "#dcfce7",
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "600", color: c.is_active ? "#dc2626" : "#059669" }}>
              {c.is_active ? "Deaktivieren" : "Aktivieren"}
            </Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}
