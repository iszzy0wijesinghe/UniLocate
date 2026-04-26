import { Platform } from "react-native";

const LAN_IP = "192.168.8.110";
// const LAN_IP = "192.168.1.49";
// const LAN_IP = "192.168.1.45";
// const LAN_IP = "10.98.167.3";



export const API_BASE_URL =
  Platform.OS === "android"
    ? `http://${LAN_IP}:4000`
    : Platform.OS === "ios"
      ? `http://${LAN_IP}:4000`
      : "http://localhost:4000";