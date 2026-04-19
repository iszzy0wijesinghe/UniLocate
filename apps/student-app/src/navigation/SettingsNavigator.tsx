import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import SettingsHome from "../features/settings/SettingsHome";
import EditUsername from "../features/settings/EditUsername";
import AboutUniLocate from "../features/settings/AboutUniLocate";
import Notifications from "../features/settings/Notifications";
import Personalize from "../features/settings/Personalize";
import Storage from "../features/settings/Storage";
import LocationLogs from "../features/settings/LocationLogs";

export type SettingsStackParamList = {
  SettingsHome: undefined;
  EditUsername: undefined;
  LocationLogs: undefined;
  Storage: undefined;
  Notifications: undefined;
  Personalize: undefined;
  AboutUniLocate: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="SettingsHome"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="SettingsHome" component={SettingsHome} />
      <Stack.Screen name="EditUsername" component={EditUsername} />
      <Stack.Screen name="AboutUniLocate" component={AboutUniLocate} />
      <Stack.Screen name="Notifications" component={Notifications} />
      <Stack.Screen name="Personalize" component={Personalize} />
      <Stack.Screen name="Storage" component={Storage} />
      <Stack.Screen name="LocationLogs" component={LocationLogs} />
    </Stack.Navigator>
  );
}