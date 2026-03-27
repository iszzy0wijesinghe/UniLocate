import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const isDevClientLike = __DEV__;

if (!isDevClientLike) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function requestNotificationPermission() {
  if (isDevClientLike || Platform.OS === "web") return false;
  const { status } = await Notifications.getPermissionsAsync();
  let finalStatus = status;

  if (status !== "granted") {
    const result = await Notifications.requestPermissionsAsync();
    finalStatus = result.status;
  }

  return finalStatus === "granted";
}

export async function scheduleFinderNotification(postTitle: string) {
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "UniLocate Reminder",
        body: `Someone may have information about: ${postTitle}`,
      },
      trigger: null as any,
    });
  } catch {
    // Ignore notification errors in development clients.
  }
}

export async function scheduleOwnerNotification(postTitle: string) {
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "New Finder Message",
        body: `A finder sent a secure message about: ${postTitle}`,
      },
      trigger: null as any,
    });
  } catch {
    // Ignore notification errors in development clients.
  }
}