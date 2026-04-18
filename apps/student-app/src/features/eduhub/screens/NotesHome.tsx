/** @format */

import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import type { EduHubStackParamList } from "../../../navigation/EduHubNavigator";
import { useUserProfileStore } from "../../../store/useUserProfileStore";
import { getEduHubNotes } from "../services/eduhub.api";
import type { EduHubNote } from "../types/eduhub";

type Props = NativeStackScreenProps<EduHubStackParamList, "NotesHome">;
type FilterMode = "all" | "mine";

function formatRelativeDate(value: string) {
  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  return date.toLocaleDateString();
}

export default function NotesHome({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const tabBarHeight = useBottomTabBarHeight();
  const isTablet = width >= 768;

  const userId = useUserProfileStore((state: any) => state.userId);

  const [searchInput, setSearchInput] = useState("");
  const [notes, setNotes] = useState<EduHubNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [error, setError] = useState("");

  const loadNotes = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      const data = await getEduHubNotes({
        uploadedByUserId:
          filterMode === "mine" && userId ? String(userId) : undefined,
        search: searchInput.trim() || undefined,
      });

      setNotes(data);
    } catch (err: any) {
      console.error("[eduhub] failed to load notes:", err);
      setError(err?.message || "Could not load notes.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotes(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMode]);

  const displayedCount = useMemo(() => notes.length, [notes]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <LinearGradient
        colors={["#F7FBFF", "#EEF5FC", "#F7FBFF"]}
        style={styles.background}
      />

      <View
        style={[
          styles.screen,
          {
            paddingBottom: tabBarHeight + 10,
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={[
            styles.container,
            {
              paddingHorizontal: isTablet ? 28 : 16,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <Pressable
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={20} color="#053668" />
            </Pressable>

            <Text style={styles.headerTitle}>Notes Library</Text>

            <Pressable
              style={styles.addBtn}
              onPress={() => navigation.navigate("AddNote")}
            >
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </Pressable>
          </View>

          <LinearGradient
            colors={["#053668", "#07427F"]}
            style={styles.heroCard}
          >
            <View style={styles.heroRow}>
              <View style={styles.heroIcon}>
                <Ionicons
                  name="document-text-outline"
                  size={26}
                  color="#053668"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>Shared study library</Text>
                <Text style={styles.heroSubtitle}>
                  Browse community notes, PDFs, images, and your own uploads in
                  one place
                </Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#98A2B3" />
            <TextInput
              placeholder="Search notes, modules, or uploader..."
              placeholderTextColor="#98A2B3"
              style={styles.searchInput}
              value={searchInput}
              onChangeText={setSearchInput}
              returnKeyType="search"
              onSubmitEditing={() => loadNotes(false)}
            />

            <Pressable style={styles.searchActionBtn} onPress={() => loadNotes(false)}>
              <Text style={styles.searchActionBtnText}>Search</Text>
            </Pressable>
          </View>

          <View style={styles.filterRow}>
            <Pressable
              style={[
                styles.filterChip,
                filterMode === "all" && styles.filterChipActive,
              ]}
              onPress={() => setFilterMode("all")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterMode === "all" && styles.filterChipTextActive,
                ]}
              >
                All Notes
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.filterChip,
                filterMode === "mine" && styles.filterChipActive,
              ]}
              onPress={() => setFilterMode("mine")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterMode === "mine" && styles.filterChipTextActive,
                ]}
              >
                My Notes
              </Text>
            </Pressable>

            <Pressable style={styles.refreshChip} onPress={() => loadNotes(false)}>
              {refreshing ? (
                <ActivityIndicator size="small" color="#053668" />
              ) : (
                <>
                  <Ionicons name="refresh-outline" size={15} color="#053668" />
                  <Text style={styles.refreshChipText}>Refresh</Text>
                </>
              )}
            </Pressable>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {filterMode === "mine" ? "My Notes" : "Library Notes"}
            </Text>
            <Text style={styles.sectionMeta}>{displayedCount} items</Text>
          </View>

          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color="#053668" />
              <Text style={styles.loadingText}>Loading notes...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Could not load notes</Text>
              <Text style={styles.errorText}>{error}</Text>

              <Pressable style={styles.retryBtn} onPress={() => loadNotes(true)}>
                <Text style={styles.retryBtnText}>Try again</Text>
              </Pressable>
            </View>
          ) : notes.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons
                name="folder-open-outline"
                size={28}
                color="#98A2B3"
              />
              <Text style={styles.emptyTitle}>No notes found</Text>
              <Text style={styles.emptyText}>
                {filterMode === "mine"
                  ? "You have not added any notes yet."
                  : "No shared notes matched your search."}
              </Text>

              <Pressable
                style={styles.emptyActionBtn}
                onPress={() => navigation.navigate("AddNote")}
              >
                <Text style={styles.emptyActionBtnText}>Add Note</Text>
              </Pressable>
            </View>
          ) : (
            notes.map((item) => (
              <Pressable
                key={item.id}
                style={styles.noteCard}
                onPress={() =>
                  navigation.navigate("NoteDetails", { noteId: item.id })
                }
              >
                <View style={styles.noteTop}>
                  <View style={styles.noteBadge}>
                    <Text style={styles.noteBadgeText}>{item.noteType}</Text>
                  </View>

                  <Text style={styles.noteTime}>
                    {formatRelativeDate(item.updatedAt)}
                  </Text>
                </View>

                <Text style={styles.noteTitle}>{item.title}</Text>
                <Text style={styles.noteModule}>{item.module}</Text>

                <Text style={styles.noteUploader}>
                  Uploaded by {item.uploadedByUsername}
                </Text>

                <View style={styles.noteActions}>
                  <Pressable
                    style={styles.noteBtn}
                    onPress={() =>
                      navigation.navigate("NoteDetails", { noteId: item.id })
                    }
                  >
                    <Text style={styles.noteBtnText}>Open</Text>
                  </Pressable>

                  <Pressable style={[styles.noteBtn, styles.noteBtnAccent]}>
                    <Text style={[styles.noteBtnText, { color: "#C2410C" }]}>
                      Summarize
                    </Text>
                  </Pressable>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7FBFF" },
  background: { ...StyleSheet.absoluteFillObject },

  container: {
    paddingTop: 8,
  },

  screen: {
    flex: 1,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },

  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FF7100",
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },

  heroCard: {
    borderRadius: 24,
    padding: 18,
  },

  heroRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  heroTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  heroSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#DCEEF2",
  },

  searchBox: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    minHeight: 52,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
  },

  searchActionBtn: {
    backgroundColor: "#EDF3F8",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  searchActionBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#053668",
  },

  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
    flexWrap: "wrap",
  },

  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  filterChipActive: {
    backgroundColor: "#053668",
    borderColor: "#053668",
  },

  filterChipText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#053668",
  },

  filterChipTextActive: {
    color: "#FFFFFF",
  },

  refreshChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
  },

  refreshChipText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#053668",
  },

  sectionHeader: {
    marginTop: 22,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },

  sectionMeta: {
    fontSize: 12,
    color: "#98A2B3",
    fontWeight: "700",
  },

  loadingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
    alignItems: "center",
    gap: 10,
  },

  loadingText: {
    fontSize: 13,
    color: "#667085",
    fontWeight: "600",
  },

  errorCard: {
    backgroundColor: "#FFF7ED",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FED7AA",
    padding: 18,
  },

  errorTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#9A3412",
  },

  errorText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: "#9A3412",
  },

  retryBtn: {
    alignSelf: "flex-start",
    marginTop: 12,
    backgroundColor: "#053668",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "800",
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 24,
    alignItems: "center",
  },

  emptyTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  emptyText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: "#667085",
    textAlign: "center",
  },

  emptyActionBtn: {
    marginTop: 14,
    backgroundColor: "#FF7100",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  emptyActionBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  noteCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 12,
  },

  noteTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  noteBadge: {
    backgroundColor: "#EDF3F8",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  noteBadgeText: {
    fontSize: 11,
    color: "#053668",
    fontWeight: "800",
  },

  noteTime: {
    fontSize: 12,
    color: "#98A2B3",
  },

  noteTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },

  noteModule: {
    marginTop: 4,
    fontSize: 13,
    color: "#667085",
    fontWeight: "700",
  },

  noteUploader: {
    marginTop: 8,
    fontSize: 12,
    color: "#053668",
    fontWeight: "600",
  },

  noteActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  noteBtn: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  noteBtnAccent: {
    backgroundColor: "#FFF1E7",
    borderColor: "#FED7AA",
  },

  noteBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#053668",
  },
});