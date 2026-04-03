/** @format */

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LostFoundHome from "../features/lost-found/LostFoundHome";
import ReportItem from "../features/lost-found/ReportItem";
import ItemDetails from "../features/lost-found/ItemDetails";
import Chat from "../features/lost-found/Chat";
import FoundReport from "../features/lost-found/FoundReport";
import MyLostFounds from "../features/lost-found/MyLostFounds";
import ChatsHome from "../features/lost-found/ChatsHome";
import NotificationsHome from "../features/lost-found/NotificationsHome";

export type LostFoundStackParamList = {
  LostFoundHome: undefined;
  ReportItem: { mode: "lost" | "found" };
  ItemDetails: { id: string };
  FoundReport: { postId: string; postTitle?: string };
  Chat: { postId: string; initialMessage?: string };
  MyLostFounds: undefined;
  ChatsHome: undefined;
  NotificationsHome: undefined;
};

export type LostFoundStackScreenProps<T extends keyof LostFoundStackParamList> =
  {
    navigation: any;
    route: { key: string; name: T; params: LostFoundStackParamList[T] };
  };

const Stack = createNativeStackNavigator<LostFoundStackParamList>();

export default function LostFoundStackNavigator() {
  return (
    <Stack.Navigator
      id="lost-found-stack"
      screenOptions={{
        headerShown: true,
      }}>
      <Stack.Screen
        name="LostFoundHome"
        component={LostFoundHome}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ReportItem"
        component={ReportItem}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ItemDetails"
        component={ItemDetails}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FoundReport"
        component={FoundReport}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Chat"
        component={Chat}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MyLostFounds"
        component={MyLostFounds}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ChatsHome"
        component={ChatsHome}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="NotificationsHome"
        component={NotificationsHome}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
