

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
