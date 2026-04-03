/** @format */

import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Pressable,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import type { LostFoundStackScreenProps } from "../../navigation/LostFoundStack";
import type { LostFoundPostSummary } from "./lostFound.api";
import { useLostFoundPosts } from "./lostFound.api";
import { useUserProfileStore } from "../../store/useUserProfileStore";
import LostFoundTopBar from "./components/LostFoundTopBar";

type Navigation = LostFoundStackScreenProps<"LostFoundHome">["navigation"];

export default function LostFoundHome() {
  const navigation = useNavigation<Navigation>();
  const { posts, loading, error, refetch } = useLostFoundPosts();
  const tabBarHeight = useBottomTabBarHeight();

  const username = useUserProfileStore((state) => state.username);
  const userId = useUserProfileStore((state: any) => state.userId);

  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const openLostPosts = useMemo(
    () =>
      posts.filter(
        (p) => p.type === "lost" && p.status === "open" && !p.isFound,
      ),
    [posts],
  );

  const myPosts = useMemo(
    () =>
      posts.filter((p) => String(p.ownerUserId ?? "") === String(userId ?? "")),
    [posts, userId],
  );

  const renderPost = ({ item }: { item: LostFoundPostSummary }) => {
    const thumbnail =
      item.images && item.images.length > 0 ? item.images[0] : null;

    const isOwner = String(item.ownerUserId ?? "") === String(userId ?? "");

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("ItemDetails", { id: item.id })}
        activeOpacity={0.9}>
        <View style={styles.imageWrap}>
          {thumbnail ? (
            <Image source={{ uri: thumbnail }} style={styles.cardImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={26} color="#98A2B3" />
            </View>
          )}

          <View style={styles.typeBadgeWrap}>
            <Text style={styles.typeBadge}>{item.type.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text numberOfLines={2} style={styles.cardTitle}>
            {item.title}
          </Text>

          <Text style={styles.cardMeta}>{item.category}</Text>
          <Text style={styles.cardMeta}>
            Posted by {item.ownerUsername || "Campus User"}
          </Text>
          <Text style={styles.cardMeta}>{item.relativeTime}</Text>

          <View style={styles.cardFooter}>
            {isOwner ? (
              <View style={styles.ownerChip}>
                <Text style={styles.ownerChipText}>Your post</Text>
              </View>
            ) : (
              <View style={styles.findChip}>
                <Text style={styles.findChipText}>Can help owner</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LostFoundTopBar
        title="Smart Lost & Found"
        subtitle="Faster campus recovery with secure owner contact and smart location context."
      />

      <View style={styles.heroCard}>
        <View style={styles.mainActionRow}>
          <TouchableOpacity
            style={[styles.bigActionButton, styles.primaryButton]}
            onPress={() => navigation.navigate("ReportItem", { mode: "lost" })}>
            <Text style={styles.bigActionButtonText}>I lost an item</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.shortcutsRow}>
          <Pressable
            style={styles.shortcutCard}
            onPress={() => navigation.navigate("MyLostFounds")}>
            <Ionicons name="cube-outline" size={18} color="#053668" />
            <Text style={styles.shortcutText}>My Lost &amp; Founds</Text>
          </Pressable>

          <Pressable
            style={styles.shortcutCard}
            onPress={() => navigation.navigate("ChatsHome")}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={18}
              color="#053668"
            />
            <Text style={styles.shortcutText}>Chats</Text>
          </Pressable>

          <Pressable
            style={styles.shortcutCard}
            onPress={() => navigation.navigate("NotificationsHome")}>
            <Ionicons name="notifications-outline" size={18} color="#053668" />
            <Text style={styles.shortcutText}>Notifications</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Open lost-item posts</Text>
          <Text style={styles.sectionSubtext}>
            Welcome, {username?.trim() || "Campus User"}
          </Text>
        </View>

        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{openLostPosts.length}</Text>
        </View>
      </View>

      {!!error && <Text style={styles.errorText}>{error}</Text>}
      {loading && <Text style={styles.loadingText}>Refreshing posts...</Text>}

      <View style={styles.listWrap}>
        <FlatList
          data={openLostPosts}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: tabBarHeight + 80 },
            openLostPosts.length === 0 ? styles.emptyListContainer : undefined,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="search-outline" size={30} color="#98A2B3" />
              <Text style={styles.emptyTitle}>No lost posts right now</Text>
              <Text style={styles.emptyText}>
                New lost-item reports will appear here for the campus community.
              </Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: "#F3F6FA",
  },

  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: "#E4E7EC",
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  mainActionRow: {
    marginTop: 14,
  },
  bigActionButton: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    backgroundColor: "#053668",
  },
  bigActionButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  shortcutsRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
  },
  shortcutCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  shortcutText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#053668",
    textAlign: "center",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#053668",
  },
  sectionSubtext: {
    marginTop: 2,
    fontSize: 12,
    color: "#667085",
  },
  countBadge: {
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FF7100",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  countBadgeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  listContent: {
    paddingBottom: 8,
    paddingTop: 2,
  },
  gridRow: {
    justifyContent: "space-between",
    marginBottom: 12,
  },

  card: {
    width: "48.3%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  imageWrap: {
    position: "relative",
    width: "100%",
    height: 138,
    backgroundColor: "#EEF2F6",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2F6",
  },
  typeBadgeWrap: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  typeBadge: {
    fontSize: 10,
    fontWeight: "800",
    color: "#053668",
    backgroundColor: "rgba(255,255,255,0.94)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },

  cardBody: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
    color: "#111827",
    minHeight: 36,
  },
  cardMeta: {
    marginTop: 4,
    fontSize: 11.5,
    color: "#667085",
  },
  cardFooter: {
    marginTop: 10,
  },
  ownerChip: {
    alignSelf: "flex-start",
    backgroundColor: "#EAF4FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  ownerChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1565C0",
  },
  findChip: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF4E8",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  findChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D96B00",
  },

  emptyListContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
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
    paddingHorizontal: 18,
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
  listWrap: {
    flex: 1,
    overflow: "hidden",
    marginBottom: 35,
  },
});
