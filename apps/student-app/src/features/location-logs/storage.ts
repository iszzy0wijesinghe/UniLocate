import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  LOCATION_LOGS_RETENTION_DAYS,
  LOCATION_LOGS_STORAGE_KEY,
} from "./constants";
import type { LocationLogPoint, LocationLogsByDate } from "./types";

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function sortNewestFirst(a: string, b: string) {
  return new Date(b).getTime() - new Date(a).getTime();
}

function trimToLastDays(data: LocationLogsByDate): LocationLogsByDate {
  const keys = Object.keys(data).sort(sortNewestFirst);
  const keepKeys = keys.slice(0, LOCATION_LOGS_RETENTION_DAYS);

  const next: LocationLogsByDate = {};
  for (const key of keepKeys) {
    next[key] = [...data[key]].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
  return next;
}

export async function deleteSingleLocationLog(
  dateKey: string,
  logId: string,
) {
  const current = await getLocationLogs();
  const dayLogs = current[dateKey] ?? [];

  const filtered = dayLogs.filter((item) => item.id !== logId);

  if (filtered.length === 0) {
    delete current[dateKey];
  } else {
    current[dateKey] = filtered;
  }

  await saveLocationLogs(current);
}

export async function getLocationLogs(): Promise<LocationLogsByDate> {
  const raw = await AsyncStorage.getItem(LOCATION_LOGS_STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as LocationLogsByDate;
  } catch {
    return {};
  }
}

export async function saveLocationLogs(data: LocationLogsByDate) {
  const trimmed = trimToLastDays(data);
  await AsyncStorage.setItem(LOCATION_LOGS_STORAGE_KEY, JSON.stringify(trimmed));
}

export async function addLocationLog(log: LocationLogPoint) {
  const current = await getLocationLogs();
  const dayLogs = current[log.dateKey] ?? [];
  const next: LocationLogsByDate = {
    ...current,
    [log.dateKey]: [log, ...dayLogs],
  };
  await saveLocationLogs(next);
}

export async function clearAllLocationLogs() {
  await AsyncStorage.removeItem(LOCATION_LOGS_STORAGE_KEY);
}

export async function clearLocationLogsForDate(dateKey: string) {
  const current = await getLocationLogs();
  delete current[dateKey];
  await saveLocationLogs(current);
}

export async function getFlatLocationLogs(): Promise<LocationLogPoint[]> {
  const grouped = await getLocationLogs();
  return Object.values(grouped).flat();
}

export { toDateKey };