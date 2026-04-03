/** @format */

import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import type { LostFoundStackScreenProps } from "../../navigation/LostFoundStack";
import { useLostFoundPosts, type LostFoundPostSummary } from "./lostFound.api";
import { useUserProfileStore } from "../../store/useUserProfileStore";
import LostFoundTopBar from "./components/LostFoundTopBar";

type Navigation = LostFoundStackScreenProps<"MyLostFounds">["navigation"];

export default function MyLostFounds() {
  const navigation = useNavigation<Navigation>();
  const tabBarHeight = useBottomTabBarHeight();
  const { posts, loading, error } = useLostFoundPosts();
  const userId = useUserProfileStore((state: any) => state.userId);

  const myPosts = useMemo(
    () =>
      posts.filter((p) => String(p.ownerUserId ?? "") === String(userId ?? "")),
    [posts, userId],
  );

  const openMyPosts = useMemo(
    () => myPosts.filter((p) => p.status === "open" && !p.isFound),
    [myPosts],
  );

  const resolvedMyPosts = useMemo(
    () => myPosts.filter((p) => p.status === "resolved" || p.isFound),
    [myPosts],
  );

  const renderPost = ({ item }: { item: LostFoundPostSummary }) => {
    const thumbnail =
      item.images && item.images.length > 0 ? item.images[0] : null;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => navigation.navigate("ItemDetails", { id: item.id })}>
        <View style={styles.cardRow}>
          {thumbnail ? (
            <Image source={{ uri: thumbnail }} style={styles.thumbnail} />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Ionicons name="image-outline" size={22} color="#98A2B3" />
            </View>
          )}

          <View style={styles.cardContent}>
            <View style={styles.headerRow}>
              <Text style={styles.title} numberOfLines={1}>
                {item.title}
              </Text>
              <View
                style={[
                  styles.statusChip,
                  item.status === "resolved"
                    ? styles.statusChipResolved
                    : styles.statusChipOpen,
                ]}>
                <Text
                  style={[
                    styles.statusChipText,
                    item.status === "resolved"
                      ? styles.statusChipTextResolved
                      : styles.statusChipTextOpen,
                  ]}>
                  {item.status === "resolved" || item.isFound ? "Resolved" : "Open"}
                </Text>
              </View>
            </View>

            <Text style={styles.meta}>{item.category}</Text>
            <Text style={styles.meta}>{item.relativeTime}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LostFoundTopBar
        title="My Lost & Founds"
        subtitle="Track your active and resolved lost-item posts."
        compact
      />

      {!!error && <Text style={styles.errorText}>{error}</Text>}
      {loading && <Text style={styles.loadingText}>Refreshing your posts...</Text>}

      <FlatList
        data={[...openMyPosts, ...resolvedMyPosts]}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: tabBarHeight + 20,
        }}
        ListHeaderComponent={
          <View>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Open posts</Text>
              <Text style={styles.sectionCount}>{openMyPosts.length} active</Text>
            </View>

            {resolvedMyPosts.length > 0 ? (
              <View style={[styles.sectionCard, { marginTop: 10 }]}>
                <Text style={styles.sectionTitle}>Resolved posts</Text>
                <Text style={styles.sectionCount}>
                  {resolvedMyPosts.length} completed
                </Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="cube-outline" size={30} color="#98A2B3" />
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptyText}>
              Lost-item posts you create will appear here.
            </Text>
          </View>
        }
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
  sectionCard: {
    marginTop: 4,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#053668",
  },
  sectionCount: {
    marginTop: 4,
    fontSize: 12,
    color: "#667085",
    fontWeight: "600",
  },
  card: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
  },
  cardRow: {
    flexDirection: "row",
    gap: 12,
  },
  thumbnail: {
    width: 76,
    height: 76,
    borderRadius: 14,
    backgroundColor: "#E5E7EB",
  },
  thumbnailPlaceholder: {
    width: 76,
    height: 76,
    borderRadius: 14,
    backgroundColor: "#EEF2F6",
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
    justifyContent: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  meta: {
    marginTop: 5,
    fontSize: 12.5,
    color: "#667085",
  },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusChipOpen: {
    backgroundColor: "#EAF4FF",
  },
  statusChipResolved: {
    backgroundColor: "#ECFDF3",
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: "800",
  },
  statusChipTextOpen: {
    color: "#1565C0",
  },
  statusChipTextResolved: {
    color: "#027A48",
  },
  emptyWrap: {
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
    marginBottom: 8,
    color: "#B42318",
    fontSize: 12,
  },
  loadingText: {
    marginBottom: 8,
    color: "#667085",
    fontSize: 12,
  },
});