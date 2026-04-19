/** @format */

import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
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
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";

import type { EduHubStackParamList } from "../../../navigation/EduHubNavigator";
import { getEduHubNotes } from "../services/eduhub.api";
import type { EduHubNote } from "../types/eduhub";

const { height } = Dimensions.get("window");

type QuickAction = {
  key: string;
  title: string;
  subtitle: string;
  iconType: "ionicons" | "material";
  iconName: string;
  tint: string;
  bg: string;
};

type Props = NativeStackScreenProps<EduHubStackParamList, "EduHubHome">;

type QuickActionRoute = "NotesHome" | "AskAI" | "Flashcards" | "ExamMode";

const quickActions: Array<QuickAction & { route: QuickActionRoute }> = [
  {
    key: "notes-library",
    title: "Notes Library",
    subtitle: "Browse shared notes, PDFs, images, and your uploads",
    iconType: "ionicons",
    iconName: "library-outline",
    tint: "#0F6CBD",
    bg: "#EAF4FF",
    route: "NotesHome",
  },
  {
    key: "ask-ai",
    title: "Ask AI",
    subtitle: "Get simple explanations from your study content",
    iconType: "ionicons",
    iconName: "sparkles-outline",
    tint: "#FF7100",
    bg: "#FFF1E7",
    route: "AskAI",
  },
  {
    key: "flashcards",
    title: "Flashcards",
    subtitle: "Turn key concepts into quick revision cards",
    iconType: "material",
    iconName: "cards-outline",
    tint: "#7C4DFF",
    bg: "#F1ECFF",
    route: "Flashcards",
  },
  {
    key: "exam-mode",
    title: "Exam Mode",
    subtitle: "Focus on smart revision and weak-topic practice",
    iconType: "material",
    iconName: "brain",
    tint: "#00A389",
    bg: "#EAFBF7",
    route: "ExamMode",
  },
];

function formatRelativeTime(value: string) {
  const now = Date.now();
  const then = new Date(value).getTime();
  const diffMs = now - then;

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < hour) {
    const mins = Math.max(1, Math.floor(diffMs / minute));
    return `Updated ${mins}m ago`;
  }

  if (diffMs < day) {
    const hours = Math.max(1, Math.floor(diffMs / hour));
    return `Updated ${hours}h ago`;
  }

  const days = Math.max(1, Math.floor(diffMs / day));
  if (days === 1) return "Updated yesterday";
  return `Updated ${days} days ago`;
}

function getDisplayNoteType(noteType: string) {
  if (noteType === "Text") return "TEXT";
  if (noteType === "PDF") return "PDF";
  if (noteType === "Image") return "IMAGE";
  return noteType.toUpperCase();
}

function QuickActionCard({
  item,
  onPress,
}: {
  item: QuickAction;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.actionCard} onPress={onPress}>
      <View style={[styles.actionIconWrap, { backgroundColor: item.bg }]}>
        {item.iconType === "ionicons" ? (
          <Ionicons name={item.iconName as any} size={22} color={item.tint} />
        ) : (
          <MaterialCommunityIcons
            name={item.iconName as any}
            size={22}
            color={item.tint}
          />
        )}
      </View>

      <Text style={styles.actionTitle}>{item.title}</Text>
      <Text style={styles.actionSubtitle}>{item.subtitle}</Text>
    </Pressable>
  );
}

function StatCard({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <View style={[styles.statCard, accent && styles.statCardAccent]}>
      <Text style={[styles.statValue, accent && styles.statValueAccent]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, accent && styles.statLabelAccent]}>
        {label}
      </Text>
    </View>
  );
}

function NoteCard({
  item,
  onPress,
}: {
  item: EduHubNote;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.noteCard} onPress={onPress}>
      <View style={styles.noteTopRow}>
        <View style={styles.noteBadge}>
          <Text style={styles.noteBadgeText}>
            {getDisplayNoteType(item.noteType)}
          </Text>
        </View>

        <Text style={styles.noteUpdatedAt}>
          {formatRelativeTime(item.updatedAt)}
        </Text>
      </View>

      <Text style={styles.noteTitle}>{item.title}</Text>
      <Text style={styles.noteModule}>{item.module}</Text>
      <Text style={styles.noteUploader}>By {item.uploadedByUsername}</Text>

      <View style={styles.noteBottomRow}>
        <Pressable style={styles.noteMiniButton} onPress={onPress}>
          <Text style={styles.noteMiniButtonText}>Open</Text>
        </Pressable>

        <Pressable
          style={[styles.noteMiniButton, styles.noteMiniButtonAccent]}
          onPress={() => {}}
        >
          <Text
            style={[
              styles.noteMiniButtonText,
              styles.noteMiniButtonTextAccent,
            ]}
          >
            Summarize
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

export default function EduHubHome({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const tabBarHeight = useBottomTabBarHeight();

  const [notes, setNotes] = useState<EduHubNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isTablet = width >= 768;
  const horizontalPadding = isTablet ? 28 : 16;
  const gridGap = 12;

  const actionCardWidth = isTablet
    ? (width - horizontalPadding * 2 - gridGap * 3) / 4
    : (width - horizontalPadding * 2 - gridGap) / 2;

  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getEduHubNotes();
      setNotes(Array.isArray(response) ? response : []);
    } catch (err: any) {
      console.error("[eduhub] failed to load home notes:", err);
      setError(err?.message || "Could not load EduHub notes.");
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [loadNotes]),
  );

  const recentNotes = useMemo(() => notes.slice(0, 3), [notes]);
  const totalNotes = notes.length;
  const textNotesCount = useMemo(
    () => notes.filter((item) => item.noteType === "Text").length,
    [notes],
  );
  const fileNotesCount = useMemo(
    () =>
      notes.filter(
        (item) => item.noteType === "PDF" || item.noteType === "Image",
      ).length,
    [notes],
  );

  const handleOpenNote = (noteId: string) => {
    navigation.navigate("NoteDetails", { noteId });
  };

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
            styles.contentContainer,
            { paddingHorizontal: horizontalPadding },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoWrap}>
            <Image
              source={require("../../../assets/images/UniLocateLogo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <LinearGradient
            colors={["#053668", "#07427F", "#053668"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroTopRow}>
              <View style={styles.heroIconWrap}>
                <Ionicons name="school-outline" size={28} color="#053668" />
              </View>

              <View style={styles.heroTextWrap}>
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>EduHub by UniLocate</Text>
                </View>

                <Text style={styles.heroTitle}>Study smarter on campus</Text>

                <Text style={styles.heroSubtitle}>
                  Your premium academic space for notes, AI support, revision,
                  and smarter study decisions.
                </Text>
              </View>
            </View>

            <View style={styles.heroMiniStatsRow}>
              <View style={styles.heroMiniStat}>
                <Text style={styles.heroMiniStatValue}>{totalNotes}</Text>
                <Text style={styles.heroMiniStatLabel}>Notes</Text>
              </View>

              <View style={styles.heroMiniDivider} />

              <View style={styles.heroMiniStat}>
                <Text style={styles.heroMiniStatValue}>{textNotesCount}</Text>
                <Text style={styles.heroMiniStatLabel}>Text notes</Text>
              </View>

              <View style={styles.heroMiniDivider} />

              <View style={styles.heroMiniStat}>
                <Text style={styles.heroMiniStatValue}>{fileNotesCount}</Text>
                <Text style={styles.heroMiniStatLabel}>PDF/Image</Text>
              </View>
            </View>

            <View style={styles.heroButtonsRow}>
              <Pressable
                style={[styles.heroButton, styles.heroPrimaryButton]}
                onPress={() => navigation.navigate("NotesHome")}
              >
                <Ionicons name="rocket-outline" size={16} color="#FFFFFF" />
                <Text style={styles.heroPrimaryButtonText}>Start Learning</Text>
              </Pressable>

              <Pressable
                style={[styles.heroButton, styles.heroSecondaryButton]}
                onPress={() => navigation.navigate("AskAI")}
              >
                <Ionicons name="sparkles-outline" size={16} color="#053668" />
                <Text style={styles.heroSecondaryButtonText}>Ask AI</Text>
              </Pressable>
            </View>
          </LinearGradient>

          <View style={styles.statsRow}>
            <StatCard value={String(totalNotes)} label="Library notes" />
            <StatCard value={String(textNotesCount)} label="Text notes" />
            <StatCard
              value={String(fileNotesCount)}
              label="PDF & images"
              accent
            />
          </View>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Quick actions</Text>
              <Text style={styles.sectionSubtitle}>
                Jump into your academic tools
              </Text>
            </View>
            <Text style={styles.sectionMeta}>Tools</Text>
          </View>

          <View style={styles.actionsGrid}>
            {quickActions.map((item) => (
              <View
                key={item.key}
                style={{
                  width: actionCardWidth,
                  marginBottom: gridGap,
                }}
              >
                <QuickActionCard
                  item={item}
                  onPress={() => navigation.navigate(item.route)}
                />
              </View>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Continue studying</Text>
              <Text style={styles.sectionSubtitle}>
                Pick up where you left off
              </Text>
            </View>
            <Text style={styles.sectionMeta}>Recent</Text>
          </View>

          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color="#053668" />
              <Text style={styles.loadingText}>Loading live EduHub notes...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Could not load notes</Text>
              <Text style={styles.errorText}>{error}</Text>

              <Pressable style={styles.retryBtn} onPress={loadNotes}>
                <Text style={styles.retryBtnText}>Try again</Text>
              </Pressable>
            </View>
          ) : recentNotes.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons
                name="document-text-outline"
                size={28}
                color="#98A2B3"
              />
              <Text style={styles.emptyTitle}>No notes yet</Text>
              <Text style={styles.emptyText}>
                Your shared Notes Library is empty right now. Add the first note
                to start building EduHub.
              </Text>

              <Pressable
                style={styles.retryBtn}
                onPress={() => navigation.navigate("NotesHome")}
              >
                <Text style={styles.retryBtnText}>Open Notes Library</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.notesSection}>
              {recentNotes.map((item) => (
                <NoteCard
                  key={item.id}
                  item={item}
                  onPress={() => handleOpenNote(item.id)}
                />
              ))}
            </View>
          )}

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Smart study suggestion</Text>
              <Text style={styles.sectionSubtitle}>
                Based on your current EduHub activity
              </Text>
            </View>
            <Text style={styles.sectionMeta}>Adaptive</Text>
          </View>

          <View style={styles.studySuggestionCard}>
            <View style={styles.studySuggestionIconWrap}>
              <Ionicons name="bulb-outline" size={22} color="#FF7100" />
            </View>

            <View style={styles.studySuggestionTextWrap}>
              <View style={styles.studySuggestionHeaderRow}>
                <Text style={styles.studySuggestionTitle}>
                  Best next step right now
                </Text>

                <View style={styles.recommendChip}>
                  <Text style={styles.recommendChipText}>Recommended</Text>
                </View>
              </View>

              <Text style={styles.studySuggestionSubtitle}>
                {totalNotes === 0
                  ? "Start by adding your first note to EduHub. Once your library grows, AI summaries and smart revision will feel much more useful."
                  : totalNotes < 3
                    ? "Your library is growing. Add a few more notes or PDFs so Ask AI can help you study with better context."
                    : "You already have a useful note base. Open Ask AI next and start getting explanations from your stored study material."}
              </Text>

              <View style={styles.studySuggestionMetaRow}>
                <View style={styles.studyChip}>
                  <Text style={styles.studyChipText}>{totalNotes} in library</Text>
                </View>
                <View style={styles.studyChip}>
                  <Text style={styles.studyChipText}>
                    {textNotesCount} text notes
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <LinearGradient
            colors={["#FFF7ED", "#FFF1E7"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.examModeCard}
          >
            <View style={styles.examModeTopRow}>
              <View>
                <Text style={styles.examModeEyebrow}>Exam mode</Text>
                <Text style={styles.examModeTitle}>Get revision-ready</Text>
              </View>

              <View style={styles.examModeBadge}>
                <Text style={styles.examModeBadgeText}>Coming soon</Text>
              </View>
            </View>

            <Text style={styles.examModeSubtitle}>
              Personalized revision plans, weak-topic focus, and quick academic
              practice are coming into EduHub next.
            </Text>

            <Pressable
              style={styles.examModeButton}
              onPress={() => navigation.navigate("ExamMode")}
            >
              <Text style={styles.examModeButtonText}>Preview roadmap</Text>
            </Pressable>
          </LinearGradient>
        </ScrollView>
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
  contentContainer: {
    paddingTop: 8,
    paddingBottom: 100,
  },

  logoWrap: {
    alignItems: "center",
    marginBottom: 14,
  },
  logo: {
    width: 180,
    height: 60,
  },

  heroCard: {
    borderRadius: 30,
    padding: 20,
    shadowColor: "#053668",
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  heroIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
    fontSize: 27,
    lineHeight: 33,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#DCEEF2",
  },

  heroMiniStatsRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  heroMiniStat: {
    flex: 1,
    alignItems: "center",
  },
  heroMiniStatValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  heroMiniStatLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "700",
    color: "#DCEEF2",
  },
  heroMiniDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.18)",
  },

  heroButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    flexWrap: "wrap",
  },
  heroButton: {
    minHeight: 46,
    borderRadius: 16,
    paddingHorizontal: 18,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  heroPrimaryButton: {
    backgroundColor: "#FF7100",
  },
  heroSecondaryButton: {
    backgroundColor: "#FFFFFF",
  },
  heroPrimaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  heroSecondaryButtonText: {
    color: "#053668",
    fontSize: 14,
    fontWeight: "800",
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
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
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

  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionCard: {
    minHeight: 172,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  actionIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
    color: "#053668",
  },
  actionSubtitle: {
    marginTop: 6,
    fontSize: 12.5,
    lineHeight: 18,
    color: "#667085",
  },

  notesSection: {
    gap: 12,
  },
  noteCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  noteTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  noteBadge: {
    backgroundColor: "#EDF3F8",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  noteBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#053668",
  },
  noteUpdatedAt: {
    fontSize: 12,
    color: "#98A2B3",
    fontWeight: "600",
  },
  noteTitle: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800",
    color: "#111827",
  },
  noteModule: {
    marginTop: 4,
    fontSize: 13,
    color: "#667085",
    fontWeight: "600",
  },
  noteBottomRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    flexWrap: "wrap",
  },
  noteMiniButton: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  noteMiniButtonAccent: {
    backgroundColor: "#FFF1E7",
    borderColor: "#FED7AA",
  },
  noteMiniButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#053668",
  },
  noteMiniButtonTextAccent: {
    color: "#C2410C",
  },

  studySuggestionCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  studySuggestionIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FFF1E7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  studySuggestionTextWrap: {
    flex: 1,
  },
  studySuggestionHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  studySuggestionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  recommendChip: {
    backgroundColor: "#ECFDF3",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#ABEFC6",
  },
  recommendChipText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#027A48",
    textTransform: "uppercase",
  },
  studySuggestionSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: "#667085",
  },
  studySuggestionMetaRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    flexWrap: "wrap",
  },
  studyChip: {
    backgroundColor: "#EDF3F8",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  studyChipText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#053668",
  },

  examModeCard: {
    marginTop: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#FED7AA",
    padding: 18,
    shadowColor: "#FF7100",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  examModeTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  examModeEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    color: "#C2410C",
    letterSpacing: 0.8,
  },
  examModeTitle: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: "900",
    color: "#9A3412",
  },
  examModeBadge: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  examModeBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#C2410C",
  },
  examModeSubtitle: {
    marginTop: 10,
    fontSize: 13.5,
    lineHeight: 20,
    color: "#9A3412",
  },
  examModeButton: {
    alignSelf: "flex-start",
    marginTop: 14,
    borderRadius: 14,
    backgroundColor: "#053668",
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  examModeButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  screen: {
    flex: 1,
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

  noteUploader: {
    marginTop: 6,
    fontSize: 12.5,
    color: "#98A2B3",
    fontWeight: "600",
  },
});
