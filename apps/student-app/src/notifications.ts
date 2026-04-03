/** @format */

// import * as Notifications from "expo-notifications";
// import { Platform } from "react-native";
// import Constants from "expo-constants";

// const isAndroidExpoGo =
//   Platform.OS === "android" && Constants.appOwnership === "expo";

// Notifications.setNotificationHandler({
//   handleNotification: async () => ({
//     shouldShowAlert: true,
//     shouldShowBanner: true,
//     shouldShowList: true,
//     shouldPlaySound: false,
//     shouldSetBadge: false,
//   }),
// });

// export async function requestNotificationPermission() {
//   if (isAndroidExpoGo) {
//     console.log("Skipping notification permission in Expo Go on Android");
//     return false;
//   }

//   const { status } = await Notifications.getPermissionsAsync();
//   let finalStatus = status;

//   if (status !== "granted") {
//     const result = await Notifications.requestPermissionsAsync();
//     finalStatus = result.status;
//   }

//   return finalStatus === "granted";
// }

// export async function scheduleFinderNotification(postTitle: string) {
//   if (isAndroidExpoGo) {
//     console.log("Skipping local notification in Expo Go on Android");
//     return;
//   }

//   const granted = await requestNotificationPermission();
//   if (!granted) {
//     console.warn("Permission denied for notifications");
//     return;
//   }

//   if (Platform.OS === "web") {
//     console.warn("Reminder notifications are not supported on web");
//     return;
//   }

//   await Notifications.scheduleNotificationAsync({
//     content: {
//       title: "UniLocate Reminder",
//       body: `Someone may have information about: ${postTitle}`,
//     },
//     trigger: null as any,
//   });
// }

/** @format */

// TEMPORARY Expo Go safe version
// This disables local notification scheduling while you are previewing in Expo Go.

export async function requestNotificationPermission() {
  return false;
}

export async function scheduleFinderNotification(_postTitle: string) {
  console.log(
    "[notifications] skipped temporarily because expo-notifications is not supported in Expo Go SDK 53+",
  );
  return;
}
