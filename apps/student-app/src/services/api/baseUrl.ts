import { Platform } from "react-native";

/**
 * Base URL for the backend API.
 *
 * Priority:
 * 1) EXPO_PUBLIC_API_URL (e.g. http://10.0.2.2:4000 for Android emulator,
 *    or your machine LAN IP for a real device)
 * 2) sensible platform defaults
 */

const ENV_BASE = process.env.EXPO_PUBLIC_API_URL;

export const API_BASE_URL =
  ENV_BASE && ENV_BASE.length > 0
    ? ENV_BASE
    : Platform.OS === "android"
    ? "http://10.0.2.2:4000"
    : Platform.OS === "ios"
    ? "http://localhost:4000"
    : "http://localhost:4000";