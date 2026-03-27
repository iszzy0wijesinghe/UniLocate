import { Platform } from "react-native";

const LAN_IP = "192.168.8.110";

export const API_BASE_URL =
  Platform.OS === "android"
    ? `http://${LAN_IP}:4000`
    : Platform.OS === "ios"
    ? `http://${LAN_IP}:4000`
    : "http://localhost:4000";