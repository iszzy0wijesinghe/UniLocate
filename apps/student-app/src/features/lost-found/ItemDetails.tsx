/** @format */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import LostFoundTopBar from "./components/LostFoundTopBar";
import { useUserProfileStore } from "../../store/useUserProfileStore";

import type {
  LostFoundStackParamList,
  LostFoundStackScreenProps,
} from "../../navigation/LostFoundStack";
import {
  getPostDetails,
  resolvePost,
  type LostFoundPostSummary,
} from "./lostFound.api";

type DetailsRoute = RouteProp<LostFoundStackParamList, "ItemDetails">;
type Navigation = LostFoundStackScreenProps<"ItemDetails">["navigation"];

export default function ItemDetails() {
  const route = useRoute<DetailsRoute>();
  const navigation = useNavigation<Navigation>();
  const [post, setPost] = useState<LostFoundPostSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showResolveConfirm, setShowResolveConfirm] = useState(false);
  const [resolving, setResolving] = useState(false);
  const tabBarHeight = useBottomTabBarHeight();

  const userId = useUserProfileStore((state: any) => state.userId);

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

  const currentUserId = String(userId ?? "");
  const ownerUserId = String(post.ownerUserId ?? "");
  const isOwner = currentUserId !== "" && currentUserId === ownerUserId;
  const isOwnPost = String(post.ownerUserId ?? "") === String(userId ?? "");
  const canOfferHelp =
    post.type === "lost" && post.status === "open" && !post.isFound && !isOwner;

  const isLost = post.type === "lost";

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { paddingBottom: tabBarHeight + 24 },
      ]}>
      <LostFoundTopBar
        title="Item Details"
        subtitle="Review item information and take the next secure action."
        compact
      />

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
          phone number or email. Describe where you found the item and ask proof
          questions to confirm ownership.
        </Text>
      </View>

      <View style={styles.footer}>
        {!isOwner &&
        post.type === "lost" &&
        post.status === "open" &&
        !post.isFound ? (
          <TouchableOpacity
            style={[styles.footerButton, styles.secondaryButton]}
            onPress={() =>
              navigation.navigate("FoundReport", {
                postId: post.id,
                postTitle: post.title,
              })
            }>
            <Text style={styles.secondaryButtonText}>I found this item</Text>
          </TouchableOpacity>
        ) : null}

        {isOwner ? (
          <TouchableOpacity
            style={[styles.footerButton, styles.primaryButton]}
            onPress={() => setShowResolveConfirm(true)}>
            <Text style={styles.primaryButtonText}>
              {isLost ? "I collected my item" : "Item returned to owner"}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Modal
        visible={showResolveConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResolveConfirm(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Text style={styles.modalIcon}>✓</Text>
            </View>

            <Text style={styles.modalTitle}>
              {isLost ? "Confirm collection" : "Confirm return"}
            </Text>

            <Text style={styles.modalText}>
              {isLost
                ? "Are you sure you collected this item? This post will be marked as resolved and removed from active lost item listings."
                : "Are you sure this item was returned to its owner? This post will be marked as resolved."}
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowResolveConfirm(false)}
                disabled={resolving}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                disabled={resolving}
                onPress={async () => {
                  try {
                    setResolving(true);
                    await resolvePost(post.id);
                    setShowResolveConfirm(false);
                    navigation.goBack();
                  } catch {
                    setShowResolveConfirm(false);
                  } finally {
                    setResolving(false);
                  }
                }}>
                <Text style={styles.modalConfirmText}>
                  {resolving ? "Please wait..." : "Yes, confirm"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#F3F6FA",
  },
  headerCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  badge: {
    fontSize: 11,
    fontWeight: "700",
    color: "#053668",
    backgroundColor: "#E4EEF8",
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
    fontWeight: "800",
    color: "#053668",
  },
  subtitle: {
    fontSize: 14,
    color: "#667085",
    marginTop: 8,
  },
  meta: {
    marginTop: 4,
    fontSize: 12,
    color: "#667085",
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#053668",
    marginBottom: 4,
  },
  bodyText: {
    fontSize: 14,
    color: "#475467",
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
    backgroundColor: "#053668",
  },
  primaryButtonText: {
    color: "white",
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#FFF4EB",
    borderWidth: 1,
    borderColor: "#FF7100",
  },
  secondaryButtonText: {
    color: "#B54708",
    fontWeight: "600",
  },
  image: {
    width: 160,
    height: 120,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: "#e5e7eb",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(5, 54, 104, 0.28)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  modalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },

  modalIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#ECFDF3",
    borderWidth: 1,
    borderColor: "#ABEFC6",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 14,
  },

  modalIcon: {
    fontSize: 28,
    fontWeight: "800",
    color: "#039855",
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#053668",
    textAlign: "center",
  },

  modalText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: "#667085",
    textAlign: "center",
  },

  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },

  modalButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },

  modalCancelButton: {
    backgroundColor: "#FFF8F3",
    borderWidth: 1.2,
    borderColor: "#F5B27A",
  },

  modalCancelText: {
    color: "#B54708",
    fontWeight: "700",
    fontSize: 14,
  },

  modalConfirmButton: {
    backgroundColor: "#053668",
  },

  modalConfirmText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
});