import { supabase } from "@/src/lib/supabase/client";
import { useAuth } from "@/src/providers/AuthProvider";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

const TASK_NAME = "background-location-task";
const TIME_INTERVAL_MS = 5 * 60 * 1000;
const DISTANCE_INTERVAL_M = 30;
const DEFERRED_INTERVAL_MS = 5 * 60 * 1000;
const DEFERRED_DISTANCE_M = 50;

let _activeUserId: string | null = null;
let _activeCompanyId: string | null = null;

// Background task — top-level module scope
TaskManager.defineTask(TASK_NAME, async ({ data, error }) => {
  if (error || !data) return;
  const { locations } = data as { locations: Location.LocationObject[] };
  if (!locations?.length) return;

  const loc = locations[locations.length - 1];
  const uid = _activeUserId;
  const cid = _activeCompanyId;
  if (!uid) return;

  try {
    const recorded_at = new Date(loc.timestamp).toISOString();
    await supabase.from("locations").insert({
      user_id: uid,
      company_id: cid,
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy: loc.coords.accuracy,
      altitude: loc.coords.altitude,
      speed: loc.coords.speed,
      heading: loc.coords.heading,
      recorded_at,
    });
    await supabase
      .from("profiles")
      .update({
        last_latitude: loc.coords.latitude,
        last_longitude: loc.coords.longitude,
        last_location_at: recorded_at,
      })
      .eq("id", uid);
  } catch (e) {
    console.warn("BG GPS error:", e);
  }
});

export function useGPSTracking() {
  const { profile } = useAuth();
  const userId = profile?.id ?? null;
  const companyId = profile?.company_id ?? null;
  const isWorker = profile?.role === "worker";
  const prevRef = useRef(false);

  useEffect(() => {
    _activeUserId = userId;
    _activeCompanyId = companyId;
  }, [userId, companyId]);

  useEffect(() => {
    if (!isWorker || !userId) {
      if (prevRef.current) {
        stopTracking();
        prevRef.current = false;
      }
      return;
    }
    prevRef.current = true;
    startTracking();
    return () => {
      stopTracking();
      prevRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWorker, userId]);
}

async function startTracking() {
  try {
    const { status: fg } = await Location.requestForegroundPermissionsAsync();
    if (fg !== "granted") return;

    if (Platform.OS === "android") {
      const { status: bg } = await Location.requestBackgroundPermissionsAsync();
      if (bg !== "granted") {
        await sendOnce();
        return;
      }
    }

    const running = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
    if (running) return;

    await sendOnce();

    await Location.startLocationUpdatesAsync(TASK_NAME, {
      accuracy: Location.Accuracy.High,
      timeInterval: TIME_INTERVAL_MS,
      distanceInterval: DISTANCE_INTERVAL_M,
      deferredUpdatesInterval: DEFERRED_INTERVAL_MS,
      deferredUpdatesDistance: DEFERRED_DISTANCE_M,
      foregroundService: {
        notificationTitle: "GPSTracker",
        notificationBody: "Lokalizacja aktywna",
        notificationColor: "#4A90D9",
        killServiceOnDestroy: false,
      },
      showsBackgroundLocationIndicator: true,
    });
  } catch (e) {
    console.warn("GPS start error:", e);
  }
}

async function stopTracking() {
  try {
    const running = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
    if (running) await Location.stopLocationUpdatesAsync(TASK_NAME);
  } catch {}
  _activeUserId = null;
  _activeCompanyId = null;
}

async function sendOnce() {
  const uid = _activeUserId;
  if (!uid) return;
  try {
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    const recorded_at = new Date(loc.timestamp).toISOString();
    await supabase.from("locations").insert({
      user_id: uid,
      company_id: _activeCompanyId,
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy: loc.coords.accuracy,
      altitude: loc.coords.altitude,
      speed: loc.coords.speed,
      heading: loc.coords.heading,
      recorded_at,
    });
    await supabase
      .from("profiles")
      .update({
        last_latitude: loc.coords.latitude,
        last_longitude: loc.coords.longitude,
        last_location_at: recorded_at,
      })
      .eq("id", uid);
  } catch (e) {
    console.warn("GPS send error:", e);
  }
}
