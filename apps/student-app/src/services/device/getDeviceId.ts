/** @format */

import AsyncStorage from "@react-native-async-storage/async-storage";

const DEVICE_ID_KEY = "unilocate_device_id";

function generateId() {
  return `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function getDeviceId() {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const next = generateId();
  await AsyncStorage.setItem(DEVICE_ID_KEY, next);
  return next;
}