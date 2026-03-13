import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import Home from "../features/home/Home";
import ComplaintsStackNavigator from "./ComplaintsStack";
import LostFoundStackNavigator from "./LostFoundStack";
import Settings from "../features/settings/Settings";

export type MainTabParamList = {
  Home: undefined;
  LostFound: undefined;
  Complaints: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: true }}>
      <Tab.Screen name="Home" component={Home} options={{ title: "Home" }} />

      <Tab.Screen
        name="LostFound"
        component={LostFoundStackNavigator}
        options={{
          title: "Lost & Found",
          headerShown: false, // important: let the stack handle headers
        }}
      />

      <Tab.Screen
        name="Complaints"
        component={ComplaintsStackNavigator}
        options={{ title: "Complaints", headerShown: false }}
      />
      <Tab.Screen
        name="Settings"
        component={Settings}
        options={{ title: "Settings" }}
      />
    </Tab.Navigator>
  );
}
