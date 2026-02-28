import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";

import type {
  LostFoundStackParamList,
  LostFoundStackScreenProps,
} from "../../navigation/LostFoundStack";
import { getPostDetails, resolvePost, type LostFoundPostSummary } from "./lostFound.api";

type DetailsRoute = RouteProp<LostFoundStackParamList, "ItemDetails">;
type Navigation = LostFoundStackScreenProps<"ItemDetails">["navigation"];

export default function ItemDetails() {
  const route = useRoute<DetailsRoute>();
  const navigation = useNavigation<Navigation>();
  const [post, setPost] = useState<LostFoundPostSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPostDetails(route.params.id)
      .then(setPost)
      .catch(() => setError("Post not found"));
  }, [route.params.id]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Post not found</Text>
        <Text style={styles.subtitle}>
          This item might have been resolved or removed by an admin.
        </Text>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.container}>
        <Text style={styles.subtitle}>Loading item details…</Text>
      </View>
    );
  }

  const isLost = post.type === "lost";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Text style={styles.badge}>{post.type.toUpperCase()}</Text>
          <Text style={styles.category}>{post.category}</Text>
        </View>
        <Text style={styles.title}>{post.title}</Text>
        <Text style={styles.meta}>{post.relativeTime}</Text>
        <Text style={styles.meta}>Status: {post.status.toUpperCase()}</Text>
      </View>

      {post.images && post.images.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {post.images.map((uri) => (
              <Image
                key={uri}
                source={{ uri }}
                style={styles.image}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.bodyText}>{post.description}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>If you found this item</Text>
        <Text style={styles.bodyText}>
          Use the secure in-app chat to contact the owner without sharing your
          phone number or email. Describe where you found the item and ask
          proof questions (colour, marks, contents) to confirm ownership.
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerButton, styles.secondaryButton]}
          onPress={() =>
            navigation.navigate("FoundReport", {
              postId: post.id,
              postTitle: post.title,
            })
          }
        >
          <Text style={styles.secondaryButtonText}>I found this item</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.footerButton, styles.primaryButton]}
          onPress={async () => {
            try {
              await resolvePost(post.id);
              navigation.goBack();
            } catch {
              // Optionally show an error toast
            }
          }}
        >
          <Text style={styles.primaryButtonText}>
            {isLost ? "I collected my item" : "Item returned to owner"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: "#f5f5f9",
  },
  headerCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
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
  category: {
    fontSize: 13,
    color: "#4b5563",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 8,
  },
  meta: {
    marginTop: 4,
    fontSize: 12,
    color: "#6b7280",
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  bodyText: {
    fontSize: 14,
    color: "#4b5563",
  },
  footer: {
    marginTop: 24,
    flexDirection: "row",
    gap: 12,
  },
  footerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    backgroundColor: "#16a34a",
  },
  primaryButtonText: {
    color: "white",
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#e5edff",
    borderWidth: 1,
    borderColor: "#2563eb",
  },
  secondaryButtonText: {
    color: "#2563eb",
    fontWeight: "600",
  },
  image: {
    width: 160,
    height: 120,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: "#e5e7eb",
  },
});

