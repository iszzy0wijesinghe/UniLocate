/** @format */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { Barometer } from "expo-sensors";

export type PermissionState = {
  locationGranted?: boolean;
  notificationsGranted?: boolean;
  storageReady?: boolean;
  wifiReady?: boolean;
  sensorsAvailable?: boolean;
  barometerAvailable?: boolean;
};

export type PermissionFlowResult = {
  granted: boolean;
  available: boolean;
};

const PERMISSION_STATE_KEY = "unilocate-permission-state-v1";

const isAndroidExpoGo =
  Platform.OS === "android" && Constants.appOwnership === "expo";

export async function requestLocationPermission(): Promise<PermissionFlowResult> {
  const result = await Location.requestForegroundPermissionsAsync();

  return {
    granted: result.status === "granted",
    available: true,
  };
}

export async function requestNotificationPermission(): Promise<PermissionFlowResult> {
  if (Platform.OS === "web") {
    return { granted: false, available: false };
  }

  if (isAndroidExpoGo) {
    console.log(
      "[permissionFlow] notifications unavailable in Expo Go on Android",
    );
    return { granted: false, available: false };
  }

  try {
    const Notifications = require("expo-notifications");

    const current = await Notifications.getPermissionsAsync();

    if (current.status === "granted") {
      return {
        granted: true,
        available: true,
      };
    }

    const requested = await Notifications.requestPermissionsAsync();

    return {
      granted: requested.status === "granted",
      available: true,
    };
  } catch (error) {
    console.log("[permissionFlow] notification module unavailable:", error);
    return { granted: false, available: false };
  }
}

export async function checkBarometerAvailability(): Promise<boolean> {
  try {
    return await Barometer.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function checkSensorAvailability(): Promise<boolean> {
  try {
    const barometerAvailable = await Barometer.isAvailableAsync();
    return barometerAvailable;
  } catch {
    return false;
  }
}

export async function getSavedPermissionState(): Promise<PermissionState> {
  const raw = await AsyncStorage.getItem(PERMISSION_STATE_KEY);
  if (!raw) return {};

  try {
    return JSON.parse(raw) as PermissionState;
  } catch {
    return {};
  }
}

export async function savePermissionOnboardingState(
  partial: PermissionState,
): Promise<void> {
  const current = await getSavedPermissionState();
  const next = { ...current, ...partial };
  await AsyncStorage.setItem(PERMISSION_STATE_KEY, JSON.stringify(next));
}

// /** @format */

// import AsyncStorage from "@react-native-async-storage/async-storage";
// import * as Location from "expo-location";
// import { Barometer } from "expo-sensors";
// import { requestNotificationPermission as requestAppNotificationPermission } from "../../services/notifications/notificationService";

// export type PermissionState = {
//   locationGranted?: boolean;
//   notificationsGranted?: boolean;
//   storageReady?: boolean;
//   wifiReady?: boolean;
//   sensorsAvailable?: boolean;
//   barometerAvailable?: boolean;
// };

// export type PermissionFlowResult = {
//   granted: boolean;
//   available: boolean;
// };

// const PERMISSION_STATE_KEY = "unilocate-permission-state-v1";

// export async function requestLocationPermission(): Promise<PermissionFlowResult> {
//   const result = await Location.requestForegroundPermissionsAsync();

//   return {
//     granted: result.status === "granted",
//     available: true,
//   };
// }

// export async function requestNotificationPermission(): Promise<PermissionFlowResult> {
//   const granted = await requestAppNotificationPermission();

//   return {
//     granted,
//     available: true,
//   };
// }

// export async function checkBarometerAvailability(): Promise<boolean> {
//   try {
//     return await Barometer.isAvailableAsync();
//   } catch {
//     return false;
//   }
// }

// export async function checkSensorAvailability(): Promise<boolean> {
//   try {
//     const barometerAvailable = await Barometer.isAvailableAsync();
//     return barometerAvailable;
//   } catch {
//     return false;
//   }
// }

// export async function getSavedPermissionState(): Promise<PermissionState> {
//   const raw = await AsyncStorage.getItem(PERMISSION_STATE_KEY);
//   if (!raw) return {};

//   try {
//     return JSON.parse(raw) as PermissionState;
//   } catch {
//     return {};
//   }
// }

// export async function savePermissionOnboardingState(
//   partial: PermissionState,
// ): Promise<void> {
//   const current = await getSavedPermissionState();
//   const next = { ...current, ...partial };
//   await AsyncStorage.setItem(PERMISSION_STATE_KEY, JSON.stringify(next));
// }
