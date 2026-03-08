import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text } from "react-native";
import Home from "../features/home/Home";
import CustomTabBar from "./CustomTabBar";

function Placeholder({ title }: { title: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>{title}</Text>
    </View>
  );
}

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
        children={() => <Placeholder title="Lost & Found" />}
      />
      <Tab.Screen
        name="Complaints"
        children={() => <Placeholder title="Complaints" />}
      />
      <Tab.Screen
        name="Settings"
        children={() => <Placeholder title="Settings" />}
      />
    </Tab.Navigator>
  );
}