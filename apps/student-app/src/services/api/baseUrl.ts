import { Platform } from "react-native";

const LAN_IP = "10.116.96.42";

export const API_BASE_URL =
  Platform.OS === "android"
    ? `http://${LAN_IP}:4000`
    : Platform.OS === "ios"
    ? `http://${LAN_IP}:4000`
    : "http://localhost:4000";