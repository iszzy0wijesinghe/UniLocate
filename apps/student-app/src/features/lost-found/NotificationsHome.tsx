/** @format */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import LostFoundTopBar from "./components/LostFoundTopBar";

const notifications = [
  {
    id: "1",
    title: "Possible match received",
    body: "Someone may have found an item related to one of your posts.",
    time: "2 min ago",
  },
  {
    id: "2",
    title: "New secure chat activity",
    body: "A new message was sent in one of your lost & found chats.",
    time: "1 hour ago",
  },
  {
    id: "3",
    title: "Post still active",
    body: "Your lost-item report is still visible to campus users.",
    time: "Today",
  },
];

export default function NotificationsHome() {
  const tabBarHeight = useBottomTabBarHeight();

  return (
    <View style={styles.container}>
      <LostFoundTopBar
        title="Notifications"
        subtitle="Important Lost & Found updates and alerts."
        compact
      />

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 20 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <Ionicons name="notifications-outline" size={20} color="#053668" />
            </View>

            <View style={styles.contentWrap}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
              <Text style={styles.time}>{item.time}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: "#F3F6FA",
  },
  card: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    flexDirection: "row",
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EDF3F8",
    alignItems: "center",
    justifyContent: "center",
  },
  contentWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  body: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: "#667085",
  },
  time: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "600",
    color: "#98A2B3",
  },
});