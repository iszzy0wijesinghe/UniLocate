/** @format */

import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { EduHubStackParamList } from "../../../navigation/EduHubNavigator";
import {
  deleteFlashcardSetFromStorage,
  getAllFlashcardSetsFromStorage,
} from "../storage/flashcardsStorage";
import type { FlashcardSet } from "../types/flashcards";

type Props = NativeStackScreenProps<EduHubStackParamList, "FlashcardLibrary">;

export default function FlashcardLibrary({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sets, setSets] = useState<FlashcardSet[]>([]);

  const loadSets = useCallback(async () => {
    try {
      const storedSets = await getAllFlashcardSetsFromStorage();
      const sorted = [...storedSets].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      setSets(sorted);
    } catch (error) {
      console.error("Failed to load flashcard sets:", error);
      Alert.alert("Error", "Failed to load flashcard sets.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadSets();
    }, [loadSets]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSets();
  };

  const handleDelete = async (setId: string) => {
    try {
      await deleteFlashcardSetFromStorage(setId);
      await loadSets();
    } catch (error) {
      console.error("Failed to delete flashcard set:", error);
      Alert.alert("Error", "Failed to delete flashcard set.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <LinearGradient
        colors={["#F7FBFF", "#EEF5FC", "#F7FBFF"]}
        style={styles.background}
      />

      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#053668" />
          </Pressable>

          <Text style={styles.headerTitle}>Flashcard Library</Text>

          <Pressable
            style={styles.addBtn}
            onPress={() => navigation.navigate("FlashcardsHome")}
          >
            <Ionicons name="add" size={20} color="#053668" />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="small" color="#053668" />
            <Text style={styles.centerText}>Loading flashcards...</Text>
          </View>
        ) : (
          <FlatList
            data={sets}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
            }
            contentContainerStyle={
              sets.length === 0 ? styles.emptyListContent : styles.listContent
            }
            renderItem={({ item }) => (
              <Pressable
                style={styles.card}
                onPress={() =>
                  navigation.navigate("FlashcardViewer", {
                    setId: item.id,
                    moduleCode: item.moduleCode,
                    moduleName: item.moduleName,
                  })
                }
              >
                <View style={styles.cardTopRow}>
                  <View style={styles.moduleBadge}>
                    <Text style={styles.moduleBadgeText}>{item.moduleCode}</Text>
                  </View>

                  <Pressable
                    hitSlop={8}
                    onPress={() => handleDelete(item.id)}
                    style={styles.deleteBtn}
                  >
                    <Ionicons name="trash-outline" size={18} color="#D92D20" />
                  </Pressable>
                </View>

                <Text style={styles.cardTitle}>{item.moduleName}</Text>
                <Text style={styles.cardSubtitle}>
                  {item.cards?.length ?? 0} cards
                </Text>

                <View style={styles.cardFooter}>
                  <Text style={styles.cardDate}>
                    Updated {new Date(item.updatedAt).toLocaleDateString()}
                  </Text>

                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="#98A2B3"
                  />
                </View>
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="albums-outline" size={26} color="#053668" />
                </View>

                <Text style={styles.emptyTitle}>No flashcard sets yet</Text>

                <Text style={styles.emptySubtitle}>
                  Generate your first module flashcards to build your revision
                  library.
                </Text>

                <Pressable
                  style={styles.emptyActionBtn}
                  onPress={() => navigation.navigate("FlashcardsHome")}
                >
                  <Text style={styles.emptyActionText}>Create flashcards</Text>
                </Pressable>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7FBFF",
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
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
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  centerText: {
    fontSize: 13,
    color: "#667085",
    fontWeight: "600",
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyListContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  moduleBadge: {
    backgroundColor: "#EDF3F8",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  moduleBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#053668",
  },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF5F4",
  },
  cardTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  cardSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#667085",
    fontWeight: "600",
  },
  cardFooter: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardDate: {
    fontSize: 12,
    color: "#98A2B3",
    fontWeight: "600",
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: "#667085",
    textAlign: "center",
  },
  emptyActionBtn: {
    marginTop: 18,
    backgroundColor: "#053668",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  emptyActionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});