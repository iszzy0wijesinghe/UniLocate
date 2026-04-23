/** @format */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useUserProfileStore } from "../../../store/useUserProfileStore";
import type { EduHubStackParamList } from "../../../navigation/EduHubNavigator";
import {
  deleteEduHubExamEntry,
  getEduHubExamEntries,
} from "../services/examMode.api";
import type { EduHubExamEntry, EduHubExamType } from "../types/examMode";

type Props = NativeStackScreenProps<EduHubStackParamList, "ExamMode">;

const { height } = Dimensions.get("window");

const examTypeFilters: Array<EduHubExamType | "All"> = [
  "All",
  "Mock Exam",
  "Mid Exam",
  "Spot Test",
  "Practical Test",
  "Viva",
  "Presentation",
  "Final Exam",
  "Repeat Exam",
];

function formatExamDate(dateValue: string) {
  const raw = String(dateValue || "")
    .trim()
    .replace(/\//g, "-")
    .slice(0, 10);
  const [year, month, day] = raw.split("-").map(Number);

  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return dateValue;
  }

  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString();
}

function parseExamDateTime(examDate: string, startTime: string) {
  const rawDate = String(examDate || "")
    .trim()
    .replace(/\//g, "-");
  const rawTime = String(startTime || "").trim();

  if (!rawDate || !rawTime) return null;

  const datePart = rawDate.slice(0, 10);
  const timeMatch = rawTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);

  if (!timeMatch) return null;

  const [year, month, day] = datePart.split("-").map(Number);
  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  const seconds = Number(timeMatch[3] || 0);

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    Number.isNaN(seconds)
  ) {
    return null;
  }

  const value = new Date(year, month - 1, day, hours, minutes, seconds, 0);

  if (Number.isNaN(value.getTime())) return null;

  return value;
}

function getCountdownParts(examDate: string, startTime: string, nowMs: number) {
  const target = parseExamDateTime(examDate, startTime);

  if (!target) {
    return {
      expired: false,
      valid: false,
      text: "Unknown",
    };
  }

  const diffMs = target.getTime() - nowMs;

  if (diffMs <= 0) {
    return {
      expired: true,
      valid: true,
      text: "Started / passed",
    };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    expired: false,
    valid: true,
    text: `${days}d ${hours}h ${minutes}m ${seconds}s`,
  };
}
function getUpcomingExam(exams: EduHubExamEntry[]) {
  const now = Date.now();

  return [...exams]
    .filter((exam) => {
      const target = parseExamDateTime(exam.examDate, exam.startTime);
      return !!target && target.getTime() >= now;
    })
    .sort((a, b) => {
      const aTime = parseExamDateTime(a.examDate, a.startTime)?.getTime() ?? 0;
      const bTime = parseExamDateTime(b.examDate, b.startTime)?.getTime() ?? 0;
      return aTime - bTime;
    })[0];
}

function groupBySemesterAndType(exams: EduHubExamEntry[]) {
  const grouped: Record<string, Record<string, EduHubExamEntry[]>> = {};

  exams.forEach((exam) => {
    if (!grouped[exam.semester]) {
      grouped[exam.semester] = {};
    }

    if (!grouped[exam.semester][exam.examType]) {
      grouped[exam.semester][exam.examType] = [];
    }

    grouped[exam.semester][exam.examType].push(exam);
  });

  return grouped;
}

function ExamEntryCard({
  item,
  onEdit,
  onDelete,
  nowMs,
}: {
  item: EduHubExamEntry;
  onEdit: (item: EduHubExamEntry) => void;
  onDelete: (item: EduHubExamEntry) => void;
  nowMs: number;
}) {
  const countdown = getCountdownParts(
    item.examDate,
    item.startTime,
    nowMs,
  ).text;

  const removalCountdown = item.removeAfterAt
    ? (() => {
        const removeAt = new Date(item.removeAfterAt).getTime();

        if (Number.isNaN(removeAt)) return null;

        const diffMs = removeAt - nowMs;
        if (diffMs <= 0) return "Removing soon";

        const totalSeconds = Math.floor(diffMs / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
      })()
    : null;

  return (
    <View style={styles.examCard}>
      <View style={styles.examTopRow}>
        <View style={styles.examTypeBadge}>
          <Text style={styles.examTypeBadgeText}>{item.examType}</Text>
        </View>

        <Text style={styles.examDateText}>{formatExamDate(item.examDate)}</Text>
      </View>

      <Text style={styles.examTitle}>
        {item.moduleCode} • {item.moduleName}
      </Text>

      <Text style={styles.examMeta}>
        {item.startTime} - {item.endTime}
      </Text>

      <Text style={styles.examCountdown}>Countdown: {countdown}</Text>

      {item.isGraceVisible && removalCountdown ? (
        <Text style={styles.examRemovalText}>
          This entry will be removed in {removalCountdown}
        </Text>
      ) : null}

      {item.sessionNumber ? (
        <Text style={styles.examMeta}>Session: {item.sessionNumber}</Text>
      ) : null}

      {item.seatNumber ? (
        <Text style={styles.examMeta}>Seat: {item.seatNumber}</Text>
      ) : null}

      {item.venue ? (
        <Text style={styles.examMeta}>Venue: {item.venue}</Text>
      ) : null}

      {item.notes ? (
        <Text style={styles.examMeta}>Notes: {item.notes}</Text>
      ) : null}

      <View style={styles.examActionRow}>
        <Pressable style={styles.examEditBtn} onPress={() => onEdit(item)}>
          <Ionicons name="create-outline" size={16} color="#053668" />
          <Text style={styles.examEditBtnText}>Edit</Text>
        </Pressable>

        <Pressable style={styles.examDeleteBtn} onPress={() => onDelete(item)}>
          <Ionicons name="trash-outline" size={16} color="#B42318" />
          <Text style={styles.examDeleteBtnText}>Delete</Text>
        </Pressable>
      </View>

      <Text style={styles.examUploader}>
        Added by {item.uploadedByUsername}
      </Text>
    </View>
  );
}

export default function ExamMode({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const username = useUserProfileStore((state) => state.username);
  const userId = useUserProfileStore((state: any) => state.userId);

  const [examEntries, setExamEntries] = useState<EduHubExamEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedExamType, setSelectedExamType] = useState<
    EduHubExamType | "All"
  >("All");
  const [nowMs, setNowMs] = useState(Date.now());

  const loadExamEntries = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      console.log("[exam-mode] resolved store user:", { userId, username });

      if (!String(userId ?? "").trim() && !String(username ?? "").trim()) {
        setExamEntries([]);
        setError("Could not detect logged-in user. Please log in again.");
        return;
      }

      const response = await getEduHubExamEntries({
        uploadedByUserId: String(userId ?? "").trim() || undefined,
        uploadedByUsername: String(username ?? "").trim() || undefined,
      });

      setExamEntries(Array.isArray(response) ? response : []);
    } catch (err: any) {
      console.error("[exam-mode] failed to load exam entries:", err);
      setError(err?.message || "Could not load exam timetable.");
      setExamEntries([]);
    } finally {
      setLoading(false);
    }
  }, [userId, username]);

  const handleDeleteExam = useCallback(
    (item: EduHubExamEntry) => {
      Alert.alert(
        "Delete exam entry",
        `Are you sure you want to delete ${item.moduleCode} • ${item.moduleName}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteEduHubExamEntry({
                  examId: item.id,
                  uploadedByUserId: String(userId ?? "").trim() || undefined,
                  uploadedByUsername:
                    String(username ?? "").trim() || undefined,
                });

                await loadExamEntries();
              } catch (err: any) {
                Alert.alert(
                  "Delete failed",
                  err?.message || "Could not delete exam entry.",
                );
              }
            },
          },
        ],
      );
    },
    [loadExamEntries, userId, username],
  );

  const handleEditExam = useCallback(
    (item: EduHubExamEntry) => {
      navigation.navigate("AddExamEntry", {
        examEntry: item,
        mode: "edit",
      } as never);
    },
    [navigation],
  );

  useFocusEffect(
    useCallback(() => {
      loadExamEntries();
    }, [loadExamEntries]),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const filteredExamEntries = useMemo(() => {
    if (selectedExamType === "All") return examEntries;
    return examEntries.filter((item) => item.examType === selectedExamType);
  }, [examEntries, selectedExamType]);

  const groupedExamEntries = useMemo(
    () => groupBySemesterAndType(filteredExamEntries),
    [filteredExamEntries],
  );

  const nextExam = useMemo(() => {
    const upcoming = examEntries
      .map((item) => ({
        item,
        startAt: parseExamDateTime(item.examDate, item.startTime),
      }))
      .filter((entry) => entry.startAt && entry.startAt.getTime() > nowMs)
      .sort((a, b) => a.startAt!.getTime() - b.startAt!.getTime());

    return upcoming.length > 0 ? upcoming[0].item : undefined;
  }, [examEntries, nowMs]);

  const nextExamCountdownText = useMemo(() => {
    if (!nextExam) return "No upcoming exam";
    return getCountdownParts(nextExam.examDate, nextExam.startTime, nowMs).text;
  }, [nextExam, nowMs]);

  const totalExams = examEntries.length;

  const semesterCount = useMemo(
    () => new Set(examEntries.map((item) => item.semester)).size,
    [examEntries],
  );

  const upcomingCount = useMemo(() => {
    return examEntries.filter((exam) => {
      const target = parseExamDateTime(exam.examDate, exam.startTime);
      return !!target && target.getTime() > nowMs;
    }).length;
  }, [examEntries, nowMs]);

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
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#053668" />
          </Pressable>

          <Text style={styles.headerTitle}>Exam Mode</Text>

          <Pressable
            style={styles.addBtn}
            onPress={() => navigation.navigate("AddExamEntry")}>
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        <LinearGradient
          colors={["#053668", "#07427F", "#053668"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconWrap}>
              <MaterialCommunityIcons name="brain" size={26} color="#053668" />
            </View>

            <View style={styles.heroTextWrap}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>Focused revision</Text>
              </View>

              <Text style={styles.heroTitle}>Get revision-ready</Text>
              <Text style={styles.heroSubtitle}>
                Stay on top of your timetable, upcoming exams, and preparation
                flow with a smarter revision dashboard.
              </Text>
            </View>
          </View>

          <View style={styles.countdownWrap}>
            <Text style={styles.countdownLabel}>Next exam in</Text>
            <Text style={styles.countdownValue}>{nextExamCountdownText}</Text>
            <Text style={styles.countdownHint}>
              {nextExam
                ? `${nextExam.moduleName} • ${nextExam.moduleCode}`
                : "Add an exam entry to start tracking"}
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalExams}</Text>
            <Text style={styles.statLabel}>Total exams</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{semesterCount}</Text>
            <Text style={styles.statLabel}>Semesters</Text>
          </View>

          <View style={[styles.statCard, styles.statCardAccent]}>
            <Text style={[styles.statValue, styles.statValueAccent]}>
              {upcomingCount}
            </Text>
            <Text style={[styles.statLabel, styles.statLabelAccent]}>
              Upcoming
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Filter by exam type</Text>
            <Text style={styles.sectionSubtitle}>
              Group your timetable by assessment category
            </Text>
          </View>
          <Text style={styles.sectionMeta}>Filter</Text>
        </View>

        <View style={styles.topicsWrap}>
          {examTypeFilters.map((item) => {
            const active = selectedExamType === item;

            return (
              <Pressable
                key={item}
                style={[styles.topicChip, active && styles.topicChipActive]}
                onPress={() => setSelectedExamType(item)}>
                <Text
                  style={[
                    styles.topicChipText,
                    active && styles.topicChipTextActive,
                  ]}>
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Your timetable</Text>
            <Text style={styles.sectionSubtitle}>
              Grouped by semester and exam type
            </Text>
          </View>
          <Text style={styles.sectionMeta}>
            {filteredExamEntries.length} items
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color="#053668" />
            <Text style={styles.loadingText}>Loading exam timetable...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Could not load timetable</Text>
            <Text style={styles.errorText}>{error}</Text>

            <Pressable style={styles.retryBtn} onPress={loadExamEntries}>
              <Text style={styles.retryBtnText}>Try again</Text>
            </Pressable>
          </View>
        ) : filteredExamEntries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={28} color="#98A2B3" />
            <Text style={styles.emptyTitle}>No exam entries yet</Text>
            <Text style={styles.emptyText}>
              Add your semester timetable to unlock smarter countdowns and
              future study intelligence.
            </Text>

            <Pressable
              style={styles.retryBtn}
              onPress={() => navigation.navigate("AddExamEntry")}>
              <Text style={styles.retryBtnText}>Add Exam Entry</Text>
            </Pressable>
          </View>
        ) : (
          Object.entries(groupedExamEntries).map(([semester, types]) => (
            <View key={semester} style={styles.groupSection}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>{semester}</Text>
              </View>

              {Object.entries(types).map(([type, items]) => (
                <View key={`${semester}-${type}`} style={styles.typeGroup}>
                  <Text style={styles.typeGroupTitle}>{type}</Text>

                  <View style={styles.tasksSection}>
                    {items.map((item) => (
                      <ExamEntryCard
                        key={item.id}
                        item={item}
                        onEdit={handleEditExam}
                        onDelete={handleDeleteExam}
                        nowMs={nowMs}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ))
        )}

        <LinearGradient
          colors={["#FFF7ED", "#FFF1E7"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.mockQuizCard}>
          <View style={styles.mockQuizTopRow}>
            <View style={styles.mockQuizIconWrap}>
              <Ionicons name="sparkles-outline" size={20} color="#FF7100" />
            </View>

            <View style={styles.mockQuizTextWrap}>
              <Text style={styles.mockQuizTitle}>Smart next step</Text>
              <Text style={styles.mockQuizSubtitle}>
                Later, EduHub can use these exam entries with your notes library
                to create flashcards, revision targets, and AI preparation help.
              </Text>
            </View>
          </View>

          <Pressable
            style={styles.mockQuizButton}
            onPress={() => navigation.navigate("AddExamEntry")}>
            <Text style={styles.mockQuizButtonText}>Add another exam</Text>
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
    textAlign: "center",
  },
  countdownHint: {
    marginTop: 4,
    fontSize: 12,
    color: "#DCEEF2",
    textAlign: "center",
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

  groupSection: {
    marginTop: 8,
  },
  groupHeader: {
    marginBottom: 12,
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#053668",
  },
  typeGroup: {
    marginBottom: 16,
  },
  typeGroupTitle: {
    marginBottom: 10,
    fontSize: 14,
    fontWeight: "800",
    color: "#9A3412",
  },

  tasksSection: {
    gap: 12,
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
  topicChipActive: {
    backgroundColor: "#FFF1E7",
    borderColor: "#FED7AA",
  },
  topicChipText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#053668",
  },
  topicChipTextActive: {
    color: "#C2410C",
  },

  examCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
  },
  examTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  examTypeBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#EDF3F8",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  examTypeBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#053668",
  },
  examDateText: {
    fontSize: 12,
    color: "#98A2B3",
    fontWeight: "600",
  },
  examTitle: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "800",
    color: "#111827",
  },
  examMeta: {
    marginTop: 5,
    fontSize: 13,
    color: "#667085",
    fontWeight: "600",
  },
  examCountdown: {
    marginTop: 7,
    fontSize: 13,
    color: "#C2410C",
    fontWeight: "800",
  },
  examUploader: {
    marginTop: 8,
    fontSize: 12.5,
    color: "#98A2B3",
    fontWeight: "600",
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

  loadingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 10,
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
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 20,
    alignItems: "center",
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
    lineHeight: 20,
    color: "#667085",
    textAlign: "center",
  },

  bottomSpacer: {
    height: height < 750 ? 24 : 36,
  },
  examRemovalText: {
    marginTop: 6,
    fontSize: 12.5,
    color: "#9A3412",
    fontWeight: "700",
  },
  examActionRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
  },

  examEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EEF4FF",
    borderWidth: 1,
    borderColor: "#D0DDF7",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  examEditBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#053668",
  },

  examDeleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF1F3",
    borderWidth: 1,
    borderColor: "#FBCDD6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  examDeleteBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#B42318",
  },
});
