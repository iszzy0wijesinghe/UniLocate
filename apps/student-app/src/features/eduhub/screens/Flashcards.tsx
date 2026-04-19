/** @format */

import React, { useMemo, useState } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { EduHubStackParamList } from "../../../navigation/EduHubNavigator";

type Props = NativeStackScreenProps<EduHubStackParamList, "Flashcards">;

const { height } = Dimensions.get("window");

type Flashcard = {
  id: string;
  question: string;
  answer: string;
  module: string;
};

const demoCards: Flashcard[] = [
  {
    id: "1",
    question: "What is normalization in databases?",
    answer:
      "Normalization is the process of organizing data to reduce redundancy and improve data integrity.",
    module: "IT3030",
  },
  {
    id: "2",
    question: "What is a design pattern?",
    answer:
      "A reusable solution to common software design problems.",
    module: "SE2040",
  },
  {
    id: "3",
    question: "What is a stack data structure?",
    answer:
      "A linear structure that follows LIFO (Last In, First Out) principle.",
    module: "CS2020",
  },
];

export default function Flashcards({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const currentCard = useMemo(() => demoCards[currentIndex], [currentIndex]);

  const handleNext = () => {
    setFlipped(false);
    setCurrentIndex((prev) =>
      prev + 1 >= demoCards.length ? 0 : prev + 1,
    );
  };

  const handlePrev = () => {
    setFlipped(false);
    setCurrentIndex((prev) =>
      prev - 1 < 0 ? demoCards.length - 1 : prev - 1,
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <LinearGradient
        colors={["#F7FBFF", "#EEF5FC", "#F7FBFF"]}
        style={styles.background}
      />

      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingHorizontal: isTablet ? 28 : 16 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#053668" />
          </Pressable>

          <Text style={styles.headerTitle}>Flashcards</Text>

          <View style={styles.headerSpacer} />
        </View>

        {/* Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="albums-outline" size={26} color="#053668" />
          </View>

          <Text style={styles.heroTitle}>Revise faster</Text>
          <Text style={styles.heroSubtitle}>
            Flip through key concepts and test your memory quickly.
          </Text>
        </View>

        {/* Progress */}
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>
            Card {currentIndex + 1} / {demoCards.length}
          </Text>
        </View>

        {/* Flashcard */}
        <Pressable
          style={styles.card}
          onPress={() => setFlipped((prev) => !prev)}
        >
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{currentCard.module}</Text>
          </View>

          <Text style={styles.cardLabel}>
            {flipped ? "Answer" : "Question"}
          </Text>

          <Text style={styles.cardText}>
            {flipped ? currentCard.answer : currentCard.question}
          </Text>

          <Text style={styles.tapHint}>Tap to flip</Text>
        </Pressable>

        {/* Controls */}
        <View style={styles.controlsRow}>
          <Pressable style={styles.controlBtn} onPress={handlePrev}>
            <Ionicons name="arrow-back" size={18} color="#053668" />
            <Text style={styles.controlText}>Previous</Text>
          </Pressable>

          <Pressable style={styles.controlBtnPrimary} onPress={handleNext}>
            <Text style={styles.controlTextPrimary}>Next</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Bottom spacing */}
        <View style={{ height: height < 750 ? 30 : 50 }} />
      </ScrollView>
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
    paddingTop: 8,
    paddingBottom: 100,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  headerSpacer: {
    width: 42,
  },

  heroCard: {
    backgroundColor: "#053668",
    borderRadius: 24,
    padding: 18,
    alignItems: "center",
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: "#DCEEF2",
    textAlign: "center",
  },

  progressRow: {
    marginTop: 16,
    alignItems: "center",
  },
  progressText: {
    fontSize: 13,
    color: "#667085",
    fontWeight: "600",
  },

  card: {
    marginTop: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 20,
    minHeight: 240,
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 14,
    right: 14,
    backgroundColor: "#EDF3F8",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#053668",
  },
  cardLabel: {
    fontSize: 12,
    textAlign: "center",
    color: "#98A2B3",
    fontWeight: "700",
    marginBottom: 10,
  },
  cardText: {
    fontSize: 18,
    lineHeight: 26,
    textAlign: "center",
    fontWeight: "800",
    color: "#111827",
  },
  tapHint: {
    marginTop: 14,
    textAlign: "center",
    fontSize: 12,
    color: "#98A2B3",
  },

  controlsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 10,
  },
  controlBtn: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    borderRadius: 16,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  controlBtnPrimary: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    borderRadius: 16,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#053668",
  },
  controlText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#053668",
  },
  controlTextPrimary: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});