import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Home from "../features/home/Home";
import LostFoundStackNavigator from "./LostFoundStack";
import ComplaintsStackNavigator from "./ComplaintsStack";
import SettingsNavigator from "./SettingsNavigator";
import CustomTabBar from "./CustomTabBar";

export type MainTabParamList = {
  Home: undefined;
  LostFound: undefined;
  Complaints: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={Home} />

      <Tab.Screen
        name="LostFound"
        component={LostFoundStackNavigator}
        options={{ title: "Lost & Found", headerShown: false }}
      />

      <Tab.Screen
        name="Complaints"
        component={ComplaintsStackNavigator}
        options={{ title: "Complaints", headerShown: false }}
      />

      <Tab.Screen
        name="Settings"
        component={SettingsNavigator}
        options={{ title: "Settings", headerShown: false }}
      />
    </Tab.Navigator>
  );
}