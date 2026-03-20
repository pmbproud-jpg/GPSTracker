import { useAuth } from "@/src/providers/AuthProvider";
import { supabase } from "@/src/lib/supabase/client";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
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

interface Worker {
  id: string;
  full_name: string | null;
  last_latitude: number | null;
  last_longitude: number | null;
  last_location_at: string | null;
}

interface LocationPoint {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  recorded_at: string;
}

function buildMapHTML(
  workers: Worker[],
  history: LocationPoint[],
  selectedId: string | null
): string {
  const valid = workers.filter((w) => w.last_latitude && w.last_longitude);
  const cLat = valid.length ? valid.reduce((s, w) => s + w.last_latitude!, 0) / valid.length : 51.16;
  const cLng = valid.length ? valid.reduce((s, w) => s + w.last_longitude!, 0) / valid.length : 10.45;

  const markers = valid
    .map((w) => {
      const age = w.last_location_at
        ? Math.round((Date.now() - new Date(w.last_location_at).getTime()) / 60000)
        : null;
      const ageStr = age !== null ? (age < 60 ? `${age} min` : `${Math.round(age / 60)}h`) : "?";
      const color = w.id === selectedId ? "#dc2626" : age !== null && age < 30 ? "#16a34a" : age !== null && age < 120 ? "#ea580c" : "#6b7280";
      const name = (w.full_name || "?").replace(/'/g, "\\'");
      return `L.circleMarker([${w.last_latitude},${w.last_longitude}],{radius:${w.id === selectedId ? 10 : 7},fillColor:'${color}',color:'#fff',weight:2,fillOpacity:0.9}).addTo(map).bindPopup('<b>${name}</b><br>${ageStr}');`;
    })
    .join("\n");

  const path =
    selectedId && history.length > 1
      ? `L.polyline([${history.map((h) => `[${h.latitude},${h.longitude}]`).join(",")}],{color:'#3b82f6',weight:3,opacity:0.7,dashArray:'8 4'}).addTo(map);`
      : "";

  return `<!DOCTYPE html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{margin:0;padding:0;width:100%;height:100%}</style>
</head><body><div id="map"></div><script>
var map=L.map('map').setView([${cLat},${cLng}],${valid.length === 1 ? 15 : 10});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:19}).addTo(map);
${markers}
${path}
${valid.length > 1 ? `map.fitBounds([${valid.map((w) => `[${w.last_latitude},${w.last_longitude}]`).join(",")}],{padding:[30,30]});` : ""}
</script></body></html>`;
}

export default function ClientMap() {
  const { profile, signOut } = useAuth();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [history, setHistory] = useState<LocationPoint[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const companyId = profile?.company_id;

  const fetchWorkers = useCallback(async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, last_latitude, last_longitude, last_location_at")
      .eq("company_id", companyId)
      .eq("role", "worker")
      .order("last_location_at", { ascending: false });
    setWorkers((data as Worker[]) || []);
  }, [companyId]);

  const fetchHistory = useCallback(async (userId: string) => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("locations")
      .select("id, latitude, longitude, accuracy, speed, recorded_at")
      .eq("user_id", userId)
      .gte("recorded_at", since)
      .order("recorded_at", { ascending: true })
      .limit(200);
    setHistory((data as LocationPoint[]) || []);
  }, []);

  const refresh = useCallback(async () => {
    await fetchWorkers();
    if (selectedId) await fetchHistory(selectedId);
  }, [fetchWorkers, fetchHistory, selectedId]);

  useEffect(() => {
    fetchWorkers().finally(() => setLoading(false));
  }, [fetchWorkers]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(refresh, 30_000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, refresh]);

  useEffect(() => {
    if (selectedId) fetchHistory(selectedId);
    else setHistory([]);
  }, [selectedId, fetchHistory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const formatAge = (d: string | null) => {
    if (!d) return "—";
    const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 1) return "jetzt";
    if (m < 60) return `${m} min`;
    return `${Math.round(m / 60)}h`;
  };

  const statusColor = (d: string | null) => {
    if (!d) return "#6b7280";
    const m = (Date.now() - new Date(d).getTime()) / 60000;
    if (m < 30) return "#16a34a";
    if (m < 120) return "#ea580c";
    return "#6b7280";
  };

  const isWeb = Platform.OS === "web";
  const withLoc = workers.filter((w) => w.last_latitude && w.last_longitude);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc" }}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 16,
          gap: 12,
          borderBottomWidth: 1,
          borderBottomColor: "#e2e8f0",
          backgroundColor: "#fff",
        }}
      >
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#4A90D9", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="map" size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#1e293b" }}>
            Live-Karte
          </Text>
          <Text style={{ fontSize: 12, color: "#64748b" }}>
            {withLoc.length} / {workers.length} Mitarbeiter online
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setAutoRefresh((v) => !v)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
            backgroundColor: autoRefresh ? "#dcfce7" : "#f1f5f9",
          }}
        >
          <Ionicons name={autoRefresh ? "sync" : "sync-outline"} size={14} color={autoRefresh ? "#16a34a" : "#64748b"} />
          <Text style={{ fontSize: 11, color: autoRefresh ? "#16a34a" : "#64748b" }}>Auto</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onRefresh} style={{ padding: 4 }}>
          <Ionicons name="refresh" size={20} color="#4A90D9" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            Alert.alert("Abmelden?", "", [
              { text: "Abbrechen" },
              { text: "Ja", onPress: signOut, style: "destructive" },
            ])
          }
          style={{ padding: 4 }}
        >
          <Ionicons name="log-out-outline" size={20} color="#dc2626" />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, flexDirection: isWeb ? "row" : "column" }}>
        {/* Map — web only (Leaflet) */}
        {isWeb && withLoc.length > 0 && (
          <View style={{ flex: 2, minHeight: 300 }}>
            <iframe
              srcDoc={buildMapHTML(workers, history, selectedId)}
              style={{ width: "100%", height: "100%", border: "none" } as any}
              sandbox="allow-scripts"
            />
          </View>
        )}

        {/* Worker list */}
        <ScrollView
          style={{ flex: 1, minWidth: isWeb ? 320 : undefined }}
          contentContainerStyle={{ padding: 12 }}
          refreshControl={
            Platform.OS !== "web" ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            ) : undefined
          }
        >
          {workers.length === 0 ? (
            <View style={{ padding: 40, alignItems: "center" }}>
              <Ionicons name="people-outline" size={48} color="#94a3b8" />
              <Text style={{ fontSize: 14, color: "#94a3b8", marginTop: 12, textAlign: "center" }}>
                Noch keine Mitarbeiter. Fügen Sie welche hinzu!
              </Text>
            </View>
          ) : (
            workers.map((w) => {
              const sel = w.id === selectedId;
              return (
                <TouchableOpacity
                  key={w.id}
                  activeOpacity={0.7}
                  onPress={() => setSelectedId((p) => (p === w.id ? null : w.id))}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 12,
                    marginBottom: 6,
                    borderRadius: 12,
                    backgroundColor: sel ? "#eff6ff" : "#fff",
                    borderWidth: sel ? 1.5 : 1,
                    borderColor: sel ? "#4A90D9" : "#e2e8f0",
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: statusColor(w.last_location_at),
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#1e293b" }}>
                      {w.full_name || w.id.slice(0, 8)}
                    </Text>
                    <Text style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>
                      {formatAge(w.last_location_at)}
                    </Text>
                  </View>
                  {w.last_latitude && w.last_longitude && (
                    <Text style={{ fontSize: 10, color: "#94a3b8", fontFamily: isWeb ? "monospace" : undefined }}>
                      {w.last_latitude.toFixed(4)},{"\n"}{w.last_longitude.toFixed(4)}
                    </Text>
                  )}
                  <Ionicons name={sel ? "chevron-down" : "chevron-forward"} size={16} color="#94a3b8" />
                </TouchableOpacity>
              );
            })
          )}

          {/* History */}
          {selectedId && history.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#1e293b", marginBottom: 8 }}>
                Verlauf (24h) — {history.length} Punkte
              </Text>
              {history
                .slice(-15)
                .reverse()
                .map((h) => (
                  <View key={h.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 3, gap: 8 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#3b82f6" }} />
                    <Text style={{ fontSize: 11, color: "#64748b", width: 46 }}>
                      {new Date(h.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                    <Text style={{ fontSize: 11, color: "#1e293b", fontFamily: isWeb ? "monospace" : undefined }}>
                      {h.latitude.toFixed(5)}, {h.longitude.toFixed(5)}
                    </Text>
                    {h.speed != null && h.speed > 0 && (
                      <Text style={{ fontSize: 10, color: "#64748b" }}>{Math.round(h.speed * 3.6)} km/h</Text>
                    )}
                  </View>
                ))}
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}
