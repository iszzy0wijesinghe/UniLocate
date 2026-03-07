import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LostFoundHome from "../features/lost-found/LostFoundHome";
import ReportItem from "../features/lost-found/ReportItem";
import ItemDetails from "../features/lost-found/ItemDetails";
import Chat from "../features/lost-found/Chat";
import FoundReport from "../features/lost-found/FoundReport";

export type LostFoundStackParamList = {
  LostFoundHome: undefined;
  ReportItem: { mode: "lost" | "found" };
  ItemDetails: { id: string };
  FoundReport: { postId: string; postTitle?: string };
  Chat: { postId: string; initialMessage?: string };
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
        gestureEnabled: true,
      }}
    >
      <Stack.Screen
        name="LostFoundHome"
        component={LostFoundHome}
        options={{ title: "Lost & Found" }}
      />
      <Stack.Screen
        name="ReportItem"
        component={ReportItem}
        options={{ title: "Report item" }}
      />
      <Stack.Screen
        name="ItemDetails"
        component={ItemDetails}
        options={{ title: "Item details" }}
      />
      <Stack.Screen
        name="FoundReport"
        component={FoundReport}
        options={{ title: "I found this item" }}
      />
      <Stack.Screen
        name="Chat"
        component={Chat}
        options={{ title: "Secure chat" }}
      />
    </Stack.Navigator>
  );
}

