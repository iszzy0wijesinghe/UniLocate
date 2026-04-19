/** @format */

import React from "react";
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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { EduHubStackParamList } from "../../../navigation/EduHubNavigator";

type Props = NativeStackScreenProps<EduHubStackParamList, "ExamMode">;

const { height } = Dimensions.get("window");

const todayTasks = [
  "Review database normalization notes",
  "Practice 10 MCQs from Data Structures",
  "Revise 5-mark answers from Software Engineering",
];

const weakTopics = [
  "Normalization forms",
  "Recursion tracing",
  "Design pattern comparisons",
];

function TaskCard({ text }: { text: string }) {
  return (
    <View style={styles.taskCard}>
      <View style={styles.taskIconWrap}>
        <Ionicons name="checkmark-circle-outline" size={18} color="#FF7100" />
      </View>
      <Text style={styles.taskText}>{text}</Text>
    </View>
  );
}

function TopicChip({ label }: { label: string }) {
  return (
    <View style={styles.topicChip}>
      <Text style={styles.topicChipText}>{label}</Text>
    </View>
  );
}

export default function ExamMode({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <LinearGradient
        colors={["#F7FBFF", "#EEF5FC", "#F7FBFF"]}
        style={styles.background}
      />

      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingHorizontal: isTablet ? 28 : 16,
            paddingBottom: 140,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#053668" />
          </Pressable>

          <Text style={styles.headerTitle}>Exam Mode</Text>

          <View style={styles.headerSpacer} />
        </View>

        <LinearGradient
          colors={["#053668", "#07427F", "#053668"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconWrap}>
              <MaterialCommunityIcons
                name="brain"
                size={26}
                color="#053668"
              />
            </View>

            <View style={styles.heroTextWrap}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>Focused revision</Text>
              </View>

              <Text style={styles.heroTitle}>Get revision-ready</Text>
              <Text style={styles.heroSubtitle}>
                Stay on top of your weak areas, daily study targets, and upcoming
                exam pressure with a smarter revision flow.
              </Text>
            </View>
          </View>

          <View style={styles.countdownWrap}>
            <Text style={styles.countdownLabel}>Next exam in</Text>
            <Text style={styles.countdownValue}>4 Days</Text>
            <Text style={styles.countdownHint}>Database Systems • IT3030</Text>
          </View>
        </LinearGradient>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statLabel}>Tasks today</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>84%</Text>
            <Text style={styles.statLabel}>Revision streak</Text>
          </View>

          <View style={[styles.statCard, styles.statCardAccent]}>
            <Text style={[styles.statValue, styles.statValueAccent]}>3</Text>
            <Text style={[styles.statLabel, styles.statLabelAccent]}>
              Weak topics
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Today’s smart targets</Text>
            <Text style={styles.sectionSubtitle}>
              Suggested tasks for focused preparation
            </Text>
          </View>
          <Text style={styles.sectionMeta}>Today</Text>
        </View>

        <View style={styles.tasksSection}>
          {todayTasks.map((task) => (
            <TaskCard key={task} text={task} />
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Weak topics</Text>
            <Text style={styles.sectionSubtitle}>
              Areas that need extra revision
            </Text>
          </View>
          <Text style={styles.sectionMeta}>Priority</Text>
        </View>

        <View style={styles.topicsWrap}>
          {weakTopics.map((topic) => (
            <TopicChip key={topic} label={topic} />
          ))}
        </View>

        <LinearGradient
          colors={["#FFF7ED", "#FFF1E7"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.mockQuizCard}
        >
          <View style={styles.mockQuizTopRow}>
            <View style={styles.mockQuizIconWrap}>
              <Ionicons name="sparkles-outline" size={20} color="#FF7100" />
            </View>

            <View style={styles.mockQuizTextWrap}>
              <Text style={styles.mockQuizTitle}>Quick mock quiz</Text>
              <Text style={styles.mockQuizSubtitle}>
                Test yourself with short AI-generated revision questions.
              </Text>
            </View>
          </View>

          <Pressable style={styles.mockQuizButton}>
            <Text style={styles.mockQuizButtonText}>Start practice</Text>
          </Pressable>
        </LinearGradient>

        <View style={styles.bottomSpacer} />
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
    borderRadius: 28,
    padding: 20,
    shadowColor: "#053668",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  heroIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  heroTextWrap: {
    flex: 1,
  },
  heroBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    color: "#E2EDF7",
    letterSpacing: 0.7,
  },
  heroTitle: {
    marginTop: 10,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#DCEEF2",
  },

  countdownWrap: {
    marginTop: 18,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  countdownLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DCEEF2",
  },
  countdownValue: {
    marginTop: 4,
    fontSize: 30,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  countdownHint: {
    marginTop: 4,
    fontSize: 12,
    color: "#DCEEF2",
  },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
  },
  statCardAccent: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "900",
    color: "#053668",
  },
  statValueAccent: {
    color: "#FF7100",
  },
  statLabel: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: "#667085",
    fontWeight: "600",
  },
  statLabelAccent: {
    color: "#9A3412",
  },

  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111827",
  },
  sectionSubtitle: {
    marginTop: 3,
    fontSize: 12.5,
    lineHeight: 18,
    color: "#667085",
  },
  sectionMeta: {
    fontSize: 12,
    fontWeight: "700",
    color: "#98A2B3",
  },

  tasksSection: {
    gap: 12,
  },
  taskCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
  },
  taskIconWrap: {
    width: 30,
    alignItems: "center",
    paddingTop: 1,
    marginRight: 6,
  },
  taskText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    color: "#111827",
  },

  topicsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  topicChip: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  topicChipText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#053668",
  },

  mockQuizCard: {
    marginTop: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#FED7AA",
    padding: 18,
  },
  mockQuizTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  mockQuizIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  mockQuizTextWrap: {
    flex: 1,
  },
  mockQuizTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#9A3412",
  },
  mockQuizSubtitle: {
    marginTop: 6,
    fontSize: 13.5,
    lineHeight: 20,
    color: "#9A3412",
  },
  mockQuizButton: {
    alignSelf: "flex-start",
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: "#053668",
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  mockQuizButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  bottomSpacer: {
    height: height < 750 ? 24 : 36,
  },
});