/** @format */

import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  CampusBoundary,
  CampusZone,
} from "../home/components/CampusMap2D";
import {
  LOCATION_LOG_INTERVAL_MS,
  LOCATION_LOGS_LAST_RUN_KEY,
} from "./constants";
import { addLocationLog, toDateKey } from "./storage";
import { findContainingZone, isInsideCampus } from "./geo";

type LogNowArgs = {
  boundary: CampusBoundary | null;
  zones: CampusZone[];
  source: "foreground-hourly" | "manual" | "resume-check";
};

// export async function shouldRunLocationLog() {
//   const raw = await AsyncStorage.getItem(LOCATION_LOGS_LAST_RUN_KEY);
//   if (!raw) return true;

//   const last = Number(raw);
//   if (!Number.isFinite(last)) return true;

//   return Date.now() - last >= LOCATION_LOG_INTERVAL_MS;
// }

export async function shouldRunLocationLog() {
  const raw = await AsyncStorage.getItem(LOCATION_LOGS_LAST_RUN_KEY);

  console.log("[location-log] last run raw =", raw);

  if (!raw) {
    console.log("[location-log] no last run found -> allow save");
    return true;
  }

  const last = Number(raw);
  if (!Number.isFinite(last)) {
    console.log("[location-log] invalid last run -> allow save");
    return true;
  }

  const diff = Date.now() - last;

  console.log("[location-log] diff ms =", diff);
  console.log("[location-log] interval ms =", LOCATION_LOG_INTERVAL_MS);

  return diff >= LOCATION_LOG_INTERVAL_MS;
}

export async function markLocationLogRunNow() {
  const now = String(Date.now());
  await AsyncStorage.setItem(LOCATION_LOGS_LAST_RUN_KEY, now);
  console.log("[location-log] marked last run =", now);
}

export async function captureLocationLog({
  boundary,
  zones,
  source,
}: LogNowArgs) {
  const permission = await Location.getForegroundPermissionsAsync();
  if (permission.status !== "granted") return null;

  const current = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  const point = {
    lat: current.coords.latitude,
    lng: current.coords.longitude,
  };
  const enforceCampusBoundary = !__DEV__;

  const insideCampus = boundary ? isInsideCampus(point, boundary) : false;

  if (enforceCampusBoundary && !insideCampus) return null;

  const matchedZone = findContainingZone(point, zones);
  const now = new Date();

  const log = {
    id: `${now.getTime()}`,
    timestamp: now.toISOString(),
    dateKey: toDateKey(now),
    lat: point.lat,
    lng: point.lng,
    accuracy: current.coords.accuracy ?? null,
    insideCampus: enforceCampusBoundary ? insideCampus : true,
    zoneId: matchedZone?.id ?? null,
    zoneName: matchedZone?.name ?? null,
    source,
  };

  console.log("[location-log] saving", log);
  await addLocationLog(log);
  await markLocationLogRunNow();

  return log;
}
