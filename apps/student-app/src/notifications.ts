import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Mobile notification handler
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

// Ensure permission
export async function ensureNotificationPermissions() {
  if (Platform.OS === "web") {
    // Web requires user interaction
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      alert("Permission denied for notifications");
    }
  } else {
    const settings = await Notifications.getPermissionsAsync();
    if (!settings.granted) {
      await Notifications.requestPermissionsAsync();
    }
  }
}

// Schedule notification for "finder"
export async function scheduleFinderNotification(postTitle: string) {
  if (Platform.OS === "web") {
    new Notification("Someone found your item", {
      body: `A finder has sent details for "${postTitle}". Open Lost & Found to chat.`,
    });
  } else {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Someone found your item",
        body: `A finder has sent details for "${postTitle}". Open Lost & Found to chat.`,
      },
      trigger: null,
    });
  }
}

// Schedule owner reminder (3 days later)
// export async function scheduleOwnerReminderNotification(postTitle: string) {
//   if (Platform.OS === "web") {
//     // Web cannot schedule delayed notifications
//     console.warn("Reminder notifications are not supported on web");
//   } else {
//     await Notifications.scheduleNotificationAsync({
//       content: {
//         title: "Lost item reminder",
//         body: `Do you still need help finding "${postTitle}"?`,
//       },
//       trigger: {
//         seconds: 3 * 24 * 60 * 60, // 3 days
//       },
//     });
//   }
// }