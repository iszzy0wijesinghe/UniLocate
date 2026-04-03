/** @format */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import type { LostFoundStackScreenProps } from "../../navigation/LostFoundStack";
import LostFoundTopBar from "./components/LostFoundTopBar";
import {
  getLostFoundChatThreads,
  type LostFoundChatThread,
} from "./lostFound.api";
import { useUserProfileStore } from "../../store/useUserProfileStore";

type Navigation = LostFoundStackScreenProps<"ChatsHome">["navigation"];

function formatThreadTime(value?: string) {
  if (!value) return "";

  const date = new Date(value);
  const now = new Date();

  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHr = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMin < 1) return "Now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hr ago`;

  return date.toLocaleDateString();
}

export default function ChatsHome() {
  const navigation = useNavigation<Navigation>();
  const tabBarHeight = useBottomTabBarHeight();
  const userId = useUserProfileStore((state: any) => state.userId);

  const [threads, setThreads] = React.useState<LostFoundChatThread[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadThreads = React.useCallback(async () => {
    if (!userId) {
      setThreads([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await getLostFoundChatThreads(String(userId));
      setThreads(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load chats");
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    React.useCallback(() => {
      loadThreads();
    }, [loadThreads]),
  );

  return (
    <View style={styles.container}>
      <LostFoundTopBar
        title="Chats"
        subtitle="Your secure Lost & Found conversations."
        compact
      />

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="small" color="#053668" />
          <Text style={styles.loadingText}>Loading chats...</Text>
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: tabBarHeight + 20,
            flexGrow: threads.length === 0 ? 1 : undefined,
          }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.9}
              onPress={() =>
                navigation.navigate("Chat", {
                  postId: item.postId,
                })
              }>
              <View style={styles.avatar}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={20}
                  color="#053668"
                />
              </View>

              <View style={styles.contentWrap}>
                <View style={styles.headerRow}>
                  <Text style={styles.title} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.time}>
                    {formatThreadTime(item.lastMessageAt)}
                  </Text>
                </View>

                <Text style={styles.preview} numberOfLines={2}>
                  {item.preview}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={30}
                color="#98A2B3"
              />
              <Text style={styles.emptyTitle}>No chats yet</Text>
              <Text style={styles.emptyText}>
                Secure Lost & Found conversations will appear here.
              </Text>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: "#F3F6FA",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#667085",
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EDF3F8",
    alignItems: "center",
    justifyContent: "center",
  },
  contentWrap: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  time: {
    fontSize: 11.5,
    color: "#98A2B3",
    fontWeight: "600",
  },
  preview: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: "#667085",
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  emptyText: {
    marginTop: 8,
    fontSize: 13,
    color: "#98A2B3",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 12,
    color: "#B42318",
    textAlign: "center",
  },
});