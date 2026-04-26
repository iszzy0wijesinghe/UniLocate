/** @format */

import { LogBox } from "react-native";

LogBox.ignoreLogs([
  "expo-notifications",
  "`expo-notifications` functionality is not fully supported in Expo Go",
  "Android Push notifications",
  "NativeModule: AsyncStorage is null",
  "Require cycle:",
]);

import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import FirstRunNavigator from "./src/navigation/FirstRunNavigator";
import MainTabs from "./src/navigation/MainTabs";
import { useUserProfileStore } from "./src/store/useUserProfileStore";
import { configureNotifications } from "./src/services/notifications/notificationService";

export default function App() {
  const hasCompletedFirstRun = useUserProfileStore(
    (state) => state.hasCompletedFirstRun,
  );

  useEffect(() => {
    configureNotifications().catch((error) => {
      console.log("[notifications] configure failed", error);
    });
  }, []);

  return (
    <NavigationContainer>
      {hasCompletedFirstRun ? <MainTabs /> : <FirstRunNavigator />}
    </NavigationContainer>
  );
}

