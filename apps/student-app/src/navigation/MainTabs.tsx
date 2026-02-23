import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import Home from "../features/home/Home";
import LostFoundHome from "../features/lost-found/LostFoundHome";
import ComplaintsHome from "../features/complaints/ComplaintsHome";
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
    <Tab.Navigator id="main-tabs" screenOptions={{ headerShown: true }}>
      <Tab.Screen name="Home" component={Home} options={{ title: "Home" }} />
      <Tab.Screen
        name="LostFound"
        component={LostFoundHome}
        options={{ title: "Lost & Found" }}
      />
      <Tab.Screen
        name="Complaints"
        component={ComplaintsHome}
        options={{ title: "Complaints" }}
      />
      <Tab.Screen
        name="Settings"
        component={Settings}
        options={{ title: "Settings" }}
      />
    </Tab.Navigator>
  );
}