/** @format */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
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
import * as Haptics from "expo-haptics";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { EduHubStackParamList } from "../../../navigation/EduHubNavigator";
import type { FlashcardItem } from "../types/flashcards";
import { getFlashcardSetCards } from "../storage/flashcardsStorage";

type Props = NativeStackScreenProps<EduHubStackParamList, "FlashcardViewer">;

const { height } = Dimensions.get("window");

export default function FlashcardViewer({ navigation, route }: Props) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const { setId, moduleCode, moduleName } = route.params;

  const [cards, setCards] = useState<FlashcardItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);

  const flipAnim = useRef(new Animated.Value(0)).current;
  const cardFloatAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.85)).current;

  const currentCard = useMemo(() => {
    if (cards.length === 0) return null;
    return cards[currentIndex] ?? null;
  }, [cards, currentIndex]);

  useEffect(() => {
    let mounted = true;

    async function loadCards() {
      try {
        setLoading(true);

        const storedCards = await getFlashcardSetCards(setId);

        if (!mounted) return;

        const sortedCards = [...storedCards].sort(
          (a, b) => (a.position ?? 0) - (b.position ?? 0),
        );

        setCards(sortedCards);
        setCurrentIndex(0);
        setFlipped(false);
        flipAnim.setValue(0);
      } catch (error) {
        console.error("Failed to load flashcards:", error);

        if (mounted) {
          setCards([]);
          setCurrentIndex(0);
          setFlipped(false);
          flipAnim.setValue(0);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadCards();

    return () => {
      mounted = false;
    };
  }, [setId, flipAnim]);

  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(cardFloatAnim, {
          toValue: -6,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(cardFloatAnim, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.8,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    floatLoop.start();
    glowLoop.start();

    return () => {
      floatLoop.stop();
      glowLoop.stop();
    };
  }, [cardFloatAnim, glowAnim]);

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ["0deg", "180deg"],
  });

  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ["180deg", "360deg"],
  });

  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 89, 90, 180],
    outputRange: [1, 1, 0, 0],
  });

  const backOpacity = flipAnim.interpolate({
    inputRange: [0, 89, 90, 180],
    outputRange: [0, 0, 1, 1],
  });

  const handleFlip = async () => {
    if (!currentCard) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // ignore haptic failure
    }

    const nextFlipped = !flipped;
    setFlipped(nextFlipped);

    Animated.spring(flipAnim, {
      toValue: nextFlipped ? 180 : 0,
      friction: 8,
      tension: 50,
      useNativeDriver: true,
    }).start();
  };

  const handleNext = async () => {
    if (cards.length === 0) return;

    try {
      await Haptics.selectionAsync();
    } catch {
      // ignore haptic failure
    }

    flipAnim.setValue(0);
    setFlipped(false);
    setCurrentIndex((prev) => (prev + 1 >= cards.length ? 0 : prev + 1));
  };

  const handlePrev = async () => {
    if (cards.length === 0) return;

    try {
      await Haptics.selectionAsync();
    } catch {
      // ignore haptic failure
    }

    flipAnim.setValue(0);
    setFlipped(false);
    setCurrentIndex((prev) => (prev - 1 < 0 ? cards.length - 1 : prev - 1));
  };

  const progress = cards.length > 0 ? (currentIndex + 1) / cards.length : 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <LinearGradient
        colors={["#F4F9FF", "#EEF5FC", "#F8FBFF"]}
        style={styles.background}
      />

      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingHorizontal: isTablet ? 28 : 16 },
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

        <View style={styles.headerRow}>
          <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#053668" />
          </Pressable>

          <Text style={styles.headerTitle}>Flashcards</Text>

          <Pressable
            style={styles.iconBtn}
            onPress={() => navigation.navigate("FlashcardLibrary")}
          >
            <Ionicons name="grid-outline" size={18} color="#053668" />
          </Pressable>
        </View>

        <LinearGradient
          colors={["#053668", "#0B4A88", "#053668"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconWrap}>
              <LinearGradient
                colors={["#FFFFFF", "#F4F8FF"]}
                style={styles.heroIconInner}
              >
                <MaterialCommunityIcons
                  name="cards-outline"
                  size={28}
                  color="#053668"
                />
              </LinearGradient>
            </View>

            <View style={styles.heroTextWrap}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>UniLocate EduHub</Text>
              </View>

              <Text style={styles.heroTitle}>{moduleCode}</Text>
              <Text style={styles.heroSubtitle}>{moduleName}</Text>
            </View>
          </View>

          <View style={styles.heroMetaRow}>
            <View style={styles.heroChip}>
              <Ionicons name="sparkles-outline" size={14} color="#FFFFFF" />
              <Text style={styles.heroChipText}>Smart revision</Text>
            </View>

            <View style={styles.heroChip}>
              <Ionicons name="flash-outline" size={14} color="#FFFFFF" />
              <Text style={styles.heroChipText}>Fast recall</Text>
            </View>
          </View>
        </LinearGradient>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#053668" />
            <Text style={styles.loadingText}>Loading flashcards...</Text>
          </View>
        ) : cards.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="document-text-outline" size={30} color="#053668" />
            </View>

            <Text style={styles.emptyTitle}>No flashcards found</Text>
            <Text style={styles.emptySubtitle}>
              Generate a flashcard set first for this module.
            </Text>

            <Pressable
              style={styles.generateBtn}
              onPress={() =>
                navigation.navigate("FlashcardsHome", {
                  preselectedModuleCode: moduleCode,
                  preselectedModuleName: moduleName,
                })
              }
            >
              <LinearGradient
                colors={["#053668", "#0B4A88"]}
                style={styles.generateBtnGradient}
              >
                <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />
                <Text style={styles.generateBtnText}>Generate Flashcards</Text>
              </LinearGradient>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.progressCard}>
              <View style={styles.progressTopRow}>
                <View>
                  <Text style={styles.progressEyebrow}>Your study deck</Text>
                  <Text style={styles.progressText}>
                    Card {currentIndex + 1} of {cards.length}
                  </Text>
                </View>

                <View
                  style={[
                    styles.sideBadge,
                    flipped ? styles.answerBadge : styles.questionBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.sideBadgeText,
                      flipped
                        ? styles.answerBadgeText
                        : styles.questionBadgeText,
                    ]}
                  >
                    {flipped ? "ANSWER" : "QUESTION"}
                  </Text>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[styles.progressFill, { width: `${progress * 100}%` }]}
                />
              </View>
            </View>

            <Animated.View
              style={[
                styles.cardWrap,
                {
                  transform: [{ translateY: cardFloatAnim }],
                  opacity: glowAnim,
                },
              ]}
            >
              <Pressable style={styles.cardTouchable} onPress={handleFlip}>
                <View style={styles.cardStackShadowOne} />
                <View style={styles.cardStackShadowTwo} />

                <Animated.View
                  style={[
                    styles.cardFace,
                    styles.cardFront,
                    {
                      transform: [{ perspective: 1200 }, { rotateY: frontInterpolate }],
                      opacity: frontOpacity,
                    },
                  ]}
                >
                  <LinearGradient
                    colors={["#FFFFFF", "#F8FBFF"]}
                    style={styles.cardGradient}
                  >
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.moduleBadge}>
                        <Text style={styles.moduleBadgeText}>
                          {currentCard?.moduleCode ?? moduleCode}
                        </Text>
                      </View>

                      <View style={styles.faceMiniPill}>
                        <Ionicons
                          name="help-circle-outline"
                          size={14}
                          color="#053668"
                        />
                        <Text style={styles.faceMiniPillText}>Question</Text>
                      </View>
                    </View>

                    <View style={styles.faceContentWrap}>
                      <Text style={styles.faceTitle}>Think first</Text>
                      <Text style={styles.questionText}>
                        {currentCard?.question}
                      </Text>
                    </View>

                    <View style={styles.cardFooterRow}>
                      <Text style={styles.tapHint}>Tap card to reveal answer</Text>
                      <Ionicons
                        name="refresh-outline"
                        size={16}
                        color="#98A2B3"
                      />
                    </View>
                  </LinearGradient>
                </Animated.View>

                <Animated.View
                  style={[
                    styles.cardFace,
                    styles.cardBack,
                    {
                      transform: [{ perspective: 1200 }, { rotateY: backInterpolate }],
                      opacity: backOpacity,
                    },
                  ]}
                >
                  <LinearGradient
                    colors={["#FFF4E8", "#FFF9F3"]}
                    style={styles.cardGradient}
                  >
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.moduleBadgeAnswer}>
                        <Text style={styles.moduleBadgeAnswerText}>
                          {currentCard?.moduleCode ?? moduleCode}
                        </Text>
                      </View>

                      <View style={styles.faceMiniPillAnswer}>
                        <Ionicons
                          name="sparkles-outline"
                          size={14}
                          color="#C2410C"
                        />
                        <Text style={styles.faceMiniPillAnswerText}>Answer</Text>
                      </View>
                    </View>

                    <View style={styles.faceContentWrap}>
                      <Text style={styles.faceTitleAnswer}>Recall boost</Text>
                      <Text style={styles.answerText}>{currentCard?.answer}</Text>
                    </View>

                    <View style={styles.cardFooterRow}>
                      <Text style={styles.tapHintAnswer}>Tap card to flip back</Text>
                      <Ionicons name="repeat-outline" size={16} color="#F79009" />
                    </View>
                  </LinearGradient>
                </Animated.View>
              </Pressable>
            </Animated.View>

            <View style={styles.actionGrid}>
              <Pressable style={styles.secondaryBtn} onPress={handlePrev}>
                <Ionicons name="arrow-back" size={18} color="#053668" />
                <Text style={styles.secondaryBtnText}>Previous</Text>
              </Pressable>

              <Pressable style={styles.primaryBtn} onPress={handleNext}>
                <LinearGradient
                  colors={["#053668", "#0B4A88"]}
                  style={styles.primaryBtnGradient}
                >
                  <Text style={styles.primaryBtnText}>Next card</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </LinearGradient>
              </Pressable>
            </View>

            <View style={styles.helperCard}>
              <View style={styles.helperIconWrap}>
                <Ionicons name="bulb-outline" size={18} color="#FF7100" />
              </View>
              <View style={styles.helperTextWrap}>
                <Text style={styles.helperTitle}>Study tip</Text>
                <Text style={styles.helperSubtitle}>
                  Try answering in your head before flipping. That makes recall
                  stronger and the cards feel more useful.
                </Text>
              </View>
            </View>
          </>
        )}

        <View style={{ height: height < 750 ? 32 : 56 }} />
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

  logoWrap: {
    alignItems: "center",
    marginBottom: 12,
  },
  logo: {
    width: 170,
    height: 56,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#111827",
  },

  heroCard: {
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#053668",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  heroIconWrap: {
    marginRight: 14,
  },
  heroIconInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTextWrap: {
    flex: 1,
  },
  heroBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    marginBottom: 10,
  },
  heroBadgeText: {
    color: "#E6F0FA",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: "#DCEEF2",
  },
  heroMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },
  heroChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  heroChipText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "700",
  },

  progressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginTop: 2,
  },
  progressTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: "#98A2B3",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  progressText: {
    marginTop: 4,
    fontSize: 15,
    color: "#111827",
    fontWeight: "800",
  },
  sideBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
  },
  questionBadge: {
    backgroundColor: "#EDF3F8",
    borderColor: "#D7E5F1",
  },
  answerBadge: {
    backgroundColor: "#FFF1E7",
    borderColor: "#FED7AA",
  },
  sideBadgeText: {
    fontSize: 11,
    fontWeight: "900",
  },
  questionBadgeText: {
    color: "#053668",
  },
  answerBadgeText: {
    color: "#C2410C",
  },
  progressTrack: {
    marginTop: 14,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#E8EEF5",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#053668",
  },

  cardWrap: {
    marginTop: 18,
    height: 380,
    justifyContent: "center",
  },
  cardTouchable: {
    flex: 1,
    justifyContent: "center",
  },
  cardStackShadowOne: {
    position: "absolute",
    left: 12,
    right: 12,
    top: 20,
    bottom: 6,
    borderRadius: 28,
    backgroundColor: "rgba(5,54,104,0.06)",
  },
  cardStackShadowTwo: {
    position: "absolute",
    left: 6,
    right: 6,
    top: 10,
    bottom: 0,
    borderRadius: 28,
    backgroundColor: "rgba(255,113,0,0.08)",
  },
  cardFace: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 30,
    backfaceVisibility: "hidden",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  cardFront: {
    zIndex: 2,
  },
  cardBack: {
    zIndex: 1,
  },
  cardGradient: {
    flex: 1,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 30,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  moduleBadge: {
    backgroundColor: "#EDF3F8",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  moduleBadgeText: {
    fontSize: 11.5,
    fontWeight: "900",
    color: "#053668",
  },
  moduleBadgeAnswer: {
    backgroundColor: "#FFE7D0",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  moduleBadgeAnswerText: {
    fontSize: 11.5,
    fontWeight: "900",
    color: "#C2410C",
  },

  faceMiniPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F8FBFF",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#DCE6F0",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  faceMiniPillText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#053668",
  },
  faceMiniPillAnswer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFF4E8",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#FED7AA",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  faceMiniPillAnswerText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#C2410C",
  },

  faceContentWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 22,
  },
  faceTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#98A2B3",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  faceTitleAnswer: {
    fontSize: 12,
    fontWeight: "800",
    color: "#F79009",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },

  questionText: {
    fontSize: 23,
    lineHeight: 31,
    textAlign: "center",
    fontWeight: "900",
    color: "#111827",
  },
  answerText: {
    fontSize: 21,
    lineHeight: 30,
    textAlign: "center",
    fontWeight: "800",
    color: "#7A2E0B",
  },

  cardFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tapHint: {
    fontSize: 12.5,
    color: "#98A2B3",
    fontWeight: "700",
  },
  tapHintAnswer: {
    fontSize: 12.5,
    color: "#D97706",
    fontWeight: "700",
  },

  actionGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 20,
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#053668",
  },
  primaryBtn: {
    flex: 1.2,
    borderRadius: 18,
    overflow: "hidden",
  },
  primaryBtnGradient: {
    minHeight: 54,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  helperCard: {
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  helperIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFF1E7",
    alignItems: "center",
    justifyContent: "center",
  },
  helperTextWrap: {
    flex: 1,
  },
  helperTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#111827",
  },
  helperSubtitle: {
    marginTop: 4,
    fontSize: 12.5,
    lineHeight: 19,
    color: "#667085",
  },

  loadingWrap: {
    marginTop: 28,
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "700",
    color: "#667085",
  },

  emptyCard: {
    marginTop: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 24,
    alignItems: "center",
  },
  emptyIconWrap: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#EDF3F8",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  emptySubtitle: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 20,
    color: "#667085",
  },
  generateBtn: {
    marginTop: 18,
    borderRadius: 16,
    overflow: "hidden",
  },
  generateBtnGradient: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 16,
  },
  generateBtnText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 13,
  },
});