import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission() {
  const { status } = await Notifications.getPermissionsAsync();
  let finalStatus = status;

  if (status !== "granted") {
    const result = await Notifications.requestPermissionsAsync();
    finalStatus = result.status;
  }

  return finalStatus === "granted";
}

export async function scheduleFinderNotification(postTitle: string) {
  const granted = await requestNotificationPermission();
  if (!granted) {
    console.warn("Permission denied for notifications");
    return;
  }

  if (Platform.OS === "web") {
    console.warn("Reminder notifications are not supported on web");
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "UniLocate Reminder",
      body: `Someone may have information about: ${postTitle}`,
    },
    trigger: null as any,
  });
}