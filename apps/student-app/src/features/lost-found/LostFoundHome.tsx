import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import type { LostFoundStackScreenProps } from "../../navigation/LostFoundStack";
import type { LostFoundPostSummary } from "./lostFound.api";
import { useLostFoundPosts } from "./lostFound.api";

type Navigation = LostFoundStackScreenProps<"LostFoundHome">["navigation"];

export default function LostFoundHome() {
  const navigation = useNavigation<Navigation>();
  const { posts, refetch } = useLostFoundPosts();

  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
  );

  const renderPost = ({ item }: { item: LostFoundPostSummary }) => {
    const thumbnail =
      item.images && item.images.length > 0 ? item.images[0] : null;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("ItemDetails", { id: item.id })}
      >
        <View style={styles.cardRow}>
          {thumbnail && (
            <Image source={{ uri: thumbnail }} style={styles.thumbnail} />
          )}
          <View style={{ flex: 1 }}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.badge}>{item.type.toUpperCase()}</Text>
            </View>
            <Text style={styles.cardMeta}>{item.category}</Text>
            <Text style={styles.cardMeta}>{item.relativeTime}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Smart Lost &amp; Found</Text>
        <Text style={styles.subtitle}>
          Campus-only, privacy-friendly lost &amp; found for students.
        </Text>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={() => navigation.navigate("ReportItem", { mode: "lost" })}
        >
          <Text style={styles.actionButtonText}>I lost an item</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Lost item posts</Text>
      <FlatList
        data={posts.filter((p) => p.type === "lost" && p.status === "open")}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        contentContainerStyle={
          posts.length === 0 ? styles.emptyListContainer : undefined
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No posts yet. Be the first to report a lost or found item.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f9",
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: "#6b7280",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    backgroundColor: "#2563eb",
  },
  secondaryButton: {
    backgroundColor: "#e5edff",
    borderWidth: 1,
    borderColor: "#2563eb",
  },
  actionButtonText: {
    color: "white",
    fontWeight: "600",
  },
  secondaryButtonText: {
    color: "#2563eb",
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#e5e7eb",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },
  badge: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1d4ed8",
    backgroundColor: "#dbeafe",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  cardMeta: {
    fontSize: 12,
    color: "#6b7280",
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
  },
});