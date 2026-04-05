/** @format */

import { Platform } from "react-native";
import Constants from "expo-constants";

const isAndroidExpoGo =
  Platform.OS === "android" && Constants.appOwnership === "expo";

let NotificationsModule: any = null;
let handlerConfigured = false;

function getNotificationsModule() {
  if (Platform.OS === "web") return null;
  if (isAndroidExpoGo) return null;

  if (NotificationsModule) return NotificationsModule;

  try {
    NotificationsModule = require("expo-notifications");

    if (!handlerConfigured) {
      NotificationsModule.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      handlerConfigured = true;
    }

    return NotificationsModule;
  } catch (error) {
    console.log("[notifications] module load skipped:", error);
    return null;
  }
}

export async function configureNotifications() {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
      enableLights: true,
      lightColor: "#FF7100",
      sound: "default",
      lockscreenVisibility:
        Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
}

export async function requestNotificationPermission() {
  const Notifications = getNotificationsModule();
  if (!Notifications) return false;

  const existing = await Notifications.getPermissionsAsync();
  let finalStatus = existing.status;

  if (finalStatus !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  return finalStatus === "granted";
}

export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
) {
  const Notifications = getNotificationsModule();
  if (!Notifications) {
    console.log("[notifications] skipped:", title, body);
    return;
  }

  const granted = await requestNotificationPermission();
  if (!granted) {
    console.log("[notifications] permission not granted");
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data ?? {},
      sound: "default",
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: null,
  });
}

export async function notifyLoginSuccess(username?: string) {
  await sendLocalNotification(
    "Welcome to UniLocate",
    username
      ? `Hi ${username}, you logged in successfully.`
      : "You logged in successfully.",
  );
}

export async function notifyRegisterSuccess(username?: string) {
  await sendLocalNotification(
    "Registration successful",
    username
      ? `Your account is ready, ${username}.`
      : "Your account has been created successfully.",
  );
}

export async function notifyLostFoundPosted(title: string) {
  await sendLocalNotification(
    "Lost & Found post created",
    `Your post "${title}" is now live.`,
  );
}

export async function notifyLostFoundResolved(title: string) {
  await sendLocalNotification(
    "Item marked as found",
    `"${title}" has been removed from active Lost & Found posts.`,
  );
}

export async function notifyComplaintSubmitted(title: string) {
  await sendLocalNotification(
    "Complaint submitted",
    `Your anonymous complaint "${title}" was submitted successfully.`,
  );
}

export async function notifyComplaintResolved(title: string) {
  await sendLocalNotification(
    "Complaint resolved",
    `Your complaint "${title}" has been marked as resolved.`,
  );
}

export async function notifyOfflineMode() {
  await sendLocalNotification(
    "You are offline",
    "UniLocate is running with limited connectivity.",
  );
}

export async function notifyOvercrowdedBuilding(buildingName: string) {
  await sendLocalNotification(
    "Building overcrowded",
    `${buildingName} is currently overcrowded.`,
  );
}

export async function notifyLostFoundChat(title: string) {
  await sendLocalNotification(
    "New Lost & Found message",
    `You received a new message about "${title}".`,
  );
}

export async function notifyComplaintChat() {
  await sendLocalNotification(
    "New complaint message",
    "You received a new message in your anonymous complaint chat.",
  );
}


// /** @format */

// import * as Notifications from "expo-notifications";
// import { Platform } from "react-native";

// Notifications.setNotificationHandler({
//   handleNotification: async () => ({
//     shouldShowAlert: true,
//     shouldShowBanner: true,
//     shouldShowList: true,
//     shouldPlaySound: false,
//     shouldSetBadge: false,
//   }),
// });

// export async function configureNotifications() {
//   if (Platform.OS === "android") {
//     await Notifications.setNotificationChannelAsync("default", {
//       name: "Default",
//       importance: Notifications.AndroidImportance.HIGH,
//       vibrationPattern: [0, 250, 250, 250],
//       lightColor: "#FF7100",
//     });
//   }
// }

// export async function requestNotificationPermission() {
//   if (Platform.OS === "web") {
//     return false;
//   }

//   const existing = await Notifications.getPermissionsAsync();
//   let finalStatus = existing.status;

//   if (finalStatus !== "granted") {
//     const requested = await Notifications.requestPermissionsAsync();
//     finalStatus = requested.status;
//   }

//   return finalStatus === "granted";
// }

// export async function sendLocalNotification(
//   title: string,
//   body: string,
//   data?: Record<string, unknown>,
// ) {
//   if (Platform.OS === "web") {
//     return;
//   }

//   const granted = await requestNotificationPermission();
//   if (!granted) {
//     console.log("[notifications] permission not granted");
//     return;
//   }

//   await Notifications.scheduleNotificationAsync({
//     content: {
//       title,
//       body,
//       data: data ?? {},
//       sound: false,
//     },
//     trigger: null,
//   });
// }

// export async function notifyLoginSuccess(username?: string) {
//   await sendLocalNotification(
//     "Welcome to UniLocate",
//     username
//       ? `Hi ${username}, you logged in successfully.`
//       : "You logged in successfully.",
//   );
// }

// export async function notifyRegisterSuccess(username?: string) {
//   await sendLocalNotification(
//     "Registration successful",
//     username
//       ? `Your account is ready, ${username}.`
//       : "Your account has been created successfully.",
//   );
// }

// export async function notifyLostFoundPosted(title: string) {
//   await sendLocalNotification(
//     "Lost & Found post created",
//     `Your post "${title}" is now live.`,
//   );
// }

// export async function notifyLostFoundResolved(title: string) {
//   await sendLocalNotification(
//     "Item marked as found",
//     `"${title}" has been removed from active Lost & Found posts.`,
//   );
// }

// export async function notifyComplaintSubmitted(title: string) {
//   await sendLocalNotification(
//     "Complaint submitted",
//     `Your anonymous complaint "${title}" was submitted successfully.`,
//   );
// }

// export async function notifyComplaintResolved(title: string) {
//   await sendLocalNotification(
//     "Complaint resolved",
//     `Your complaint "${title}" has been marked as resolved.`,
//   );
// }

// export async function notifyOfflineMode() {
//   await sendLocalNotification(
//     "You are offline",
//     "UniLocate is running with limited connectivity.",
//   );
// }

// export async function notifyOvercrowdedBuilding(buildingName: string) {
//   await sendLocalNotification(
//     "Building overcrowded",
//     `${buildingName} is currently overcrowded.`,
//   );
// }

// export async function notifyLostFoundChat(title: string) {
//   await sendLocalNotification(
//     "New Lost & Found message",
//     `You received a new message about "${title}".`,
//   );
// }

// export async function notifyComplaintChat() {
//   await sendLocalNotification(
//     "New complaint message",
//     "You received a new message in your anonymous complaint chat.",
//   );
// }

