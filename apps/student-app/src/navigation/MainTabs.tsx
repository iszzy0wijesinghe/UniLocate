import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import Home from "../features/home/Home";
import ComplaintsStackNavigator from "./ComplaintsStack";
import LostFoundStackNavigator from "./LostFoundStack";
import Settings from "../features/settings/Settings";
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
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="LostFound" component={LostFoundStackNavigator} />
      <Tab.Screen name="Complaints" component={ComplaintsStackNavigator} />
      <Tab.Screen name="Settings" component={Settings} />
    </Tab.Navigator>
  );
}
