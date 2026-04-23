/** @format */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Picker } from "@react-native-picker/picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { EduHubStackParamList } from "../../../navigation/EduHubNavigator";
import { useUserProfileStore } from "../../../store/useUserProfileStore";
import { getEduHubExamEntries } from "../services/examMode.api";
import { generateEduHubFlashcards } from "../services/flashcardsApi";
import {
  saveFlashcardSetCards,
  saveFlashcardSetToStorage,
} from "../storage/flashcardsStorage";
import type { EduHubExamEntry } from "../types/examMode";
import type { GenerateFlashcardsInput } from "../types/flashcards";

type Props = NativeStackScreenProps<EduHubStackParamList, "FlashcardsHome">;

type ModuleOption = {
  moduleCode: string;
  moduleName: string;
  examEntryId?: string | null;
  label: string;
};

const GENERATION_STEPS = [
  "Scanning your EduHub materials...",
  "Understanding the important concepts...",
  "Finding exam-focused knowledge points...",
  "Creating smart revision cards...",
  "Polishing answers for fast recall...",
];

export default function FlashcardsHome({ navigation, route }: Props) {
  const preselectedModuleCode = route.params?.preselectedModuleCode;
  const preselectedModuleName = route.params?.preselectedModuleName;

  const userId = useUserProfileStore((state: any) => state.userId);
  const username = useUserProfileStore((state: any) => state.username);

  const scrollRef = useRef<ScrollView | null>(null);
  const progressSectionY = useRef(0);

  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{
    setId: string;
    moduleCode: string;
    moduleName: string;
    count: number;
  } | null>(null);

  const [loadingModules, setLoadingModules] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationStepIndex, setGenerationStepIndex] = useState(0);
  const [moduleOptions, setModuleOptions] = useState<ModuleOption[]>([]);
  const [selectedModuleKey, setSelectedModuleKey] = useState<string>("");

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.65)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isMounted = true;

    async function loadModules() {
      try {
        setLoadingModules(true);

        if (!userId) {
          if (isMounted) {
            setModuleOptions([]);
            setSelectedModuleKey("");
          }
          return;
        }

        const exams = await getEduHubExamEntries({
          uploadedByUserId: String(userId),
          uploadedByUsername: username ? String(username) : undefined,
        });

        const map = new Map<string, ModuleOption>();

        exams.forEach((exam: EduHubExamEntry) => {
          const moduleCode = String(exam.moduleCode ?? "").trim();
          const moduleName = String(exam.moduleName ?? "").trim();

          if (!moduleCode || !moduleName) return;

          const key = exam.id ?? `${moduleCode}__${moduleName}`;

          if (!map.has(key)) {
            map.set(key, {
              moduleCode,
              moduleName,
              examEntryId: exam.id ?? null,
              label: `${moduleCode} • ${moduleName}`,
            });
          }
        });

        const options = Array.from(map.values()).sort((a, b) =>
          a.label.localeCompare(b.label),
        );

        if (!isMounted) return;

        setModuleOptions(options);

        if (preselectedModuleCode && preselectedModuleName) {
          const matched =
            options.find(
              (item) =>
                item.moduleCode === preselectedModuleCode &&
                item.moduleName === preselectedModuleName,
            ) ?? null;

          if (matched) {
            setSelectedModuleKey(
              matched.examEntryId ??
                `${matched.moduleCode}__${matched.moduleName}`,
            );
            return;
          }
        }

        if (options.length > 0) {
          setSelectedModuleKey(
            options[0].examEntryId ??
              `${options[0].moduleCode}__${options[0].moduleName}`,
          );
        } else {
          setSelectedModuleKey("");
        }
      } catch (error: any) {
        Alert.alert("Failed to load modules", error?.message || "Try again.");
      } finally {
        if (isMounted) {
          setLoadingModules(false);
        }
      }
    }

    loadModules();

    return () => {
      isMounted = false;
    };
  }, [preselectedModuleCode, preselectedModuleName, userId, username]);

  useEffect(() => {
    if (!generating) return;

    const interval = setInterval(() => {
      setGenerationStepIndex((prev) => {
        if (prev >= GENERATION_STEPS.length - 1) return 0;
        return prev + 1;
      });
    }, 1700);

    return () => clearInterval(interval);
  }, [generating]);

  useEffect(() => {
    if (!generating) {
      pulseAnim.stopAnimation();
      glowAnim.stopAnimation();
      rotateAnim.stopAnimation();
      floatAnim.stopAnimation();

      pulseAnim.setValue(1);
      glowAnim.setValue(0.65);
      rotateAnim.setValue(0);
      floatAnim.setValue(0);
      return;
    }

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.55,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    const rotateLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -6,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    pulseLoop.start();
    glowLoop.start();
    rotateLoop.start();
    floatLoop.start();

    return () => {
      pulseLoop.stop();
      glowLoop.stop();
      rotateLoop.stop();
      floatLoop.stop();
    };
  }, [generating, pulseAnim, glowAnim, rotateAnim, floatAnim]);

  const selectedModule = useMemo(() => {
    return (
      moduleOptions.find((item) => {
        const key =
          item.examEntryId ?? `${item.moduleCode}__${item.moduleName}`;
        return key === selectedModuleKey;
      }) ?? null
    );
  }, [moduleOptions, selectedModuleKey]);

  const progressValue =
    GENERATION_STEPS.length > 1
      ? (generationStepIndex + 1) / GENERATION_STEPS.length
      : 0;

  const rotateInterpolation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const handleGenerate = async () => {
    if (!selectedModule) {
      Alert.alert("Select a module", "Please choose a module first.");
      return;
    }

    if (!userId || !username) {
      Alert.alert(
        "Profile missing",
        "We could not find your user profile. Please reopen EduHub and try again.",
      );
      return;
    }

    try {
      setGenerating(true);
      setGenerationStepIndex(0);

      setTimeout(() => {
        scrollRef.current?.scrollTo({
          y: Math.max(progressSectionY.current - 24, 0),
          animated: true,
        });
      }, 180);

      const input: GenerateFlashcardsInput = {
        moduleCode: selectedModule.moduleCode,
        moduleName: selectedModule.moduleName,
        examEntryId: selectedModule.examEntryId ?? null,
        createdByUserId: String(userId),
        createdByUsername: String(username),
        requestedCount: 15,
      };

      const generated = await generateEduHubFlashcards(input);

      const flashcardSet = generated.set;

      await saveFlashcardSetToStorage(flashcardSet);

      await saveFlashcardSetCards(
        flashcardSet.id,
        generated.cards.map((card) => ({
          id: card.id,
          question: card.question,
          answer: card.answer,
          moduleCode: card.moduleCode,
          moduleName: card.moduleName,
          createdAt: new Date().toISOString(),
          position: card.position,
        })),
      );

      setGenerating(false);

      setSuccessInfo({
        setId: flashcardSet.id,
        moduleCode: flashcardSet.moduleCode,
        moduleName: flashcardSet.moduleName,
        count: generated.cards.length,
      });
      setSuccessVisible(true);
    } catch (error: any) {
      setGenerating(false);
      Alert.alert(
        "Generation failed",
        error?.message || "Could not generate flashcards.",
      );
    }
  };

  const handleOpenGeneratedSet = () => {
    if (!successInfo) return;

    setSuccessVisible(false);

    navigation.replace("FlashcardViewer", {
      setId: successInfo.setId,
      moduleCode: successInfo.moduleCode,
      moduleName: successInfo.moduleName,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <LinearGradient
        colors={["#F7FBFF", "#EEF5FC", "#F7FBFF"]}
        style={styles.background}
      />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}>
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

          <Text style={styles.headerTitle}>Flashcards AI</Text>

          <Pressable
            style={styles.iconBtn}
            onPress={() => navigation.navigate("FlashcardLibrary")}>
            <Ionicons name="library-outline" size={18} color="#053668" />
          </Pressable>
        </View>

        <LinearGradient
          colors={["#053668", "#07427F", "#053668"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroOrbWrap}>
              <LinearGradient
                colors={["#FFFFFF", "#F3F8FF"]}
                style={styles.heroOrb}>
                <Ionicons name="sparkles-outline" size={28} color="#053668" />
              </LinearGradient>
            </View>

            <View style={styles.heroTextWrap}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>UniLocate EduHub AI</Text>
              </View>

              <Text style={styles.heroTitle}>Generate smart flashcards</Text>
              <Text style={styles.heroSubtitle}>
                Turn your exam-linked modules into polished revision cards with
                a more premium AI study flow.
              </Text>
            </View>
          </View>

          <View style={styles.heroMiniRow}>
            <View style={styles.heroMiniChip}>
              <MaterialCommunityIcons name="brain" size={14} color="#FFFFFF" />
              <Text style={styles.heroMiniChipText}>AI-powered</Text>
            </View>

            <View style={styles.heroMiniChip}>
              <Ionicons name="flash-outline" size={14} color="#FFFFFF" />
              <Text style={styles.heroMiniChipText}>Quick revision</Text>
            </View>

            <View style={styles.heroMiniChip}>
              <Ionicons name="school-outline" size={14} color="#FFFFFF" />
              <Text style={styles.heroMiniChipText}>Exam-focused</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Choose your module</Text>
              <Text style={styles.sectionSubtitle}>
                Select a subject from your saved exam entries.
              </Text>
            </View>

            <View style={styles.sectionIconWrap}>
              <Ionicons name="albums-outline" size={18} color="#053668" />
            </View>
          </View>

          {loadingModules ? (
            <View style={styles.infoStateBox}>
              <ActivityIndicator size="small" color="#053668" />
              <Text style={styles.infoStateText}>Loading your modules...</Text>
            </View>
          ) : moduleOptions.length === 0 ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconWrap}>
                <Ionicons
                  name="folder-open-outline"
                  size={22}
                  color="#053668"
                />
              </View>
              <Text style={styles.emptyTitle}>No modules found</Text>
              <Text style={styles.emptySubtitle}>
                Add at least one exam entry in Exam Mode first. Flashcards use
                those modules to know what to generate.
              </Text>

              <Pressable
                style={styles.secondaryActionBtn}
                onPress={() => navigation.navigate("AddExamEntry")}>
                <Ionicons name="add-circle-outline" size={16} color="#053668" />
                <Text style={styles.secondaryActionText}>Add exam entry</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <>
                <View style={styles.dropdownLabelRow}>
                  <Text style={styles.dropdownLabel}>Module selection</Text>
                  <Text style={styles.dropdownCount}>
                    {moduleOptions.length} available
                  </Text>
                </View>

                <Pressable
                  style={styles.dropdownTrigger}
                  onPress={() => setDropdownVisible(true)}>
                  <View style={styles.dropdownTriggerLeft}>
                    <View style={styles.pickerIconWrap}>
                      <Ionicons name="book-outline" size={16} color="#053668" />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.pickerHeaderTitle}>
                        Selected module
                      </Text>
                      <Text style={styles.dropdownTriggerValue}>
                        {selectedModule
                          ? selectedModule.label
                          : "Choose a module"}
                      </Text>
                    </View>
                  </View>

                  <Ionicons
                    name="chevron-down-outline"
                    size={20}
                    color="#053668"
                  />
                </Pressable>
              </>

             
            </>
          )}
        </View>

        {selectedModule ? (
          <View style={styles.previewCard}>
            <LinearGradient
              colors={["#FFFFFF", "#F8FBFF"]}
              style={styles.previewGradient}>
              <View style={styles.previewTopRow}>
                <View style={styles.previewBadge}>
                  <Text style={styles.previewBadgeText}>
                    {selectedModule.moduleCode}
                  </Text>
                </View>

                <View style={styles.readyChip}>
                  <Ionicons name="checkmark-circle" size={14} color="#027A48" />
                  <Text style={styles.readyChipText}>Ready for AI</Text>
                </View>
              </View>

              <Text style={styles.previewTitle}>
                {selectedModule.moduleName}
              </Text>
              <Text style={styles.previewCaption}>
                The AI will generate concise revision cards from your EduHub
                notes and exam-linked material.
              </Text>
            </LinearGradient>
          </View>
        ) : null}

        <Pressable
          style={[
            styles.generateBtn,
            (!selectedModule || generating) && styles.generateBtnDisabled,
          ]}
          disabled={!selectedModule || generating}
          onPress={handleGenerate}>
          <LinearGradient
            colors={
              !selectedModule || generating
                ? ["#7D98B3", "#6F89A3"]
                : ["#053668", "#0B4A88"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.generateBtnGradient}>
            {generating ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.generateBtnText}>Generating magic...</Text>
              </>
            ) : (
              <>
                <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />
                <Text style={styles.generateBtnText}>Generate flashcards</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>

        {generating ? (
          <View
            style={styles.magicCard}
            onLayout={(event) => {
              progressSectionY.current = event.nativeEvent.layout.y;
            }}>
            <LinearGradient
              colors={["#FFFFFF", "#F8FBFF"]}
              style={styles.magicGradient}>
              <View style={styles.magicTopRow}>
                <View>
                  <Text style={styles.magicTitle}>AI is creating your set</Text>
                  <Text style={styles.magicSubtitle}>
                    Sit back — UniLocate EduHub is building a smarter revision
                    experience.
                  </Text>
                </View>

                <Animated.View
                  style={[
                    styles.magicSparkWrap,
                    {
                      transform: [
                        { rotate: rotateInterpolation },
                        { scale: pulseAnim },
                        { translateY: floatAnim },
                      ],
                      opacity: glowAnim,
                    },
                  ]}>
                  <LinearGradient
                    colors={["#FF7100", "#FFA45B"]}
                    style={styles.magicSparkGradient}>
                    <Ionicons name="sparkles" size={22} color="#FFFFFF" />
                  </LinearGradient>
                </Animated.View>
              </View>

              <View style={styles.magicCenterWrap}>
                <Animated.View
                  style={[
                    styles.magicHaloOuter,
                    {
                      transform: [{ scale: pulseAnim }],
                      opacity: glowAnim,
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.magicHaloInner,
                    {
                      transform: [{ scale: pulseAnim }],
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.magicCore,
                    {
                      transform: [{ scale: pulseAnim }],
                    },
                  ]}>
                  <MaterialCommunityIcons
                    name="brain"
                    size={32}
                    color="#053668"
                  />
                </Animated.View>
              </View>

              <View style={styles.progressHeaderRow}>
                <Text style={styles.progressTitle}>
                  {GENERATION_STEPS[generationStepIndex]}
                </Text>
                <Text style={styles.progressPercent}>
                  {Math.round(progressValue * 100)}%
                </Text>
              </View>

              <View style={styles.progressTrack}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    { width: `${progressValue * 100}%` },
                  ]}
                />
              </View>

              <View style={styles.progressStepsWrap}>
                {GENERATION_STEPS.map((step, index) => {
                  const active = index === generationStepIndex;
                  const done = index < generationStepIndex;

                  return (
                    <View key={step} style={styles.progressStepRow}>
                      <View
                        style={[
                          styles.progressStepBullet,
                          done && styles.progressStepBulletDone,
                          active && styles.progressStepBulletActive,
                        ]}>
                        {done ? (
                          <Ionicons
                            name="checkmark"
                            size={12}
                            color="#FFFFFF"
                          />
                        ) : active ? (
                          <Ionicons name="sparkles" size={11} color="#FFFFFF" />
                        ) : null}
                      </View>
                      <Text
                        style={[
                          styles.progressStepText,
                          active && styles.progressStepTextActive,
                        ]}>
                        {step}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </LinearGradient>
          </View>
        ) : (
          <View style={styles.tipCard}>
            <View style={styles.tipIconWrap}>
              <Ionicons name="bulb-outline" size={20} color="#FF7100" />
            </View>
            <View style={styles.tipTextWrap}>
              <Text style={styles.tipTitle}>
                Better flashcards feel smarter
              </Text>
              <Text style={styles.tipSubtitle}>
                Add a few good exam entries and notes first. The richer your
                EduHub content, the better your AI flashcards will feel.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={dropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setDropdownVisible(false)}>
          <Pressable style={styles.dropdownModalCard}>
            <View style={styles.dropdownModalHeader}>
              <Text style={styles.dropdownModalTitle}>Choose module</Text>
              <Pressable onPress={() => setDropdownVisible(false)}>
                <Ionicons name="close" size={20} color="#053668" />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.dropdownModalList}>
              {moduleOptions.map((item) => {
                const key =
                  item.examEntryId ?? `${item.moduleCode}__${item.moduleName}`;
                const isSelected = key === selectedModuleKey;

                return (
                  <Pressable
                    key={key}
                    style={[
                      styles.dropdownOption,
                      isSelected && styles.dropdownOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedModuleKey(key);
                      setDropdownVisible(false);
                    }}>
                    <View style={styles.dropdownOptionLeft}>
                      <View
                        style={[
                          styles.dropdownOptionBadge,
                          isSelected && styles.dropdownOptionBadgeSelected,
                        ]}>
                        <Text
                          style={[
                            styles.dropdownOptionBadgeText,
                            isSelected &&
                              styles.dropdownOptionBadgeTextSelected,
                          ]}>
                          {item.moduleCode}
                        </Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.dropdownOptionTitle,
                            isSelected && styles.dropdownOptionTitleSelected,
                          ]}>
                          {item.moduleName}
                        </Text>
                        <Text style={styles.dropdownOptionSubtitle}>
                          {item.label}
                        </Text>
                      </View>
                    </View>

                    {isSelected ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#053668"
                      />
                    ) : (
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color="#98A2B3"
                      />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={successVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.successModalCard}>
            <LinearGradient
              colors={["#053668", "#0B4A88"]}
              style={styles.successIconHero}>
              <Ionicons name="sparkles" size={28} color="#FFFFFF" />
            </LinearGradient>

            <Text style={styles.successTitle}>Flashcards are ready</Text>

            <Text style={styles.successSubtitle}>
              {successInfo?.count ?? 0} AI-generated flashcards created for{" "}
              {successInfo?.moduleCode ?? ""}.
            </Text>

            <View style={styles.successMetaChip}>
              <Text style={styles.successMetaChipText}>
                {successInfo?.moduleName ?? ""}
              </Text>
            </View>

            <View style={styles.successActionsRow}>
              <Pressable
                style={styles.successSecondaryBtn}
                onPress={() => setSuccessVisible(false)}>
                <Text style={styles.successSecondaryBtnText}>Later</Text>
              </Pressable>

              <Pressable
                style={styles.successPrimaryBtn}
                onPress={handleOpenGeneratedSet}>
                <Text style={styles.successPrimaryBtnText}>Open now</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 120,
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
  heroOrbWrap: {
    marginRight: 14,
  },
  heroOrb: {
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
  heroMiniRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },
  heroMiniChip: {
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
  heroMiniChipText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "700",
  },

  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  sectionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EDF3F8",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#667085",
    lineHeight: 19,
  },

  infoStateBox: {
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: "#F8FBFF",
    borderWidth: 1,
    borderColor: "#E7EEF5",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoStateText: {
    fontSize: 13,
    color: "#667085",
    fontWeight: "600",
  },

  dropdownLabelRow: {
    marginTop: 16,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownLabel: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#344054",
  },
  dropdownCount: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#98A2B3",
  },

  pickerShell: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E7EEF5",
  },
  pickerGradient: {
    padding: 12,
  },
  pickerHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pickerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  pickerIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EDF3F8",
    alignItems: "center",
    justifyContent: "center",
  },
  pickerHeaderTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  pickerHeaderSubtitle: {
    marginTop: 2,
    fontSize: 11.5,
    color: "#667085",
    fontWeight: "600",
  },
  pickerWrap: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#DCE6F0",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },

  emptyBox: {
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "flex-start",
  },
  emptyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EDF3F8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#111827",
  },
  emptySubtitle: {
    marginTop: 4,
    fontSize: 12.5,
    lineHeight: 19,
    color: "#667085",
  },
  secondaryActionBtn: {
    marginTop: 14,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D6E2EE",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  secondaryActionText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#053668",
  },

  previewCard: {
    marginBottom: 14,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  previewGradient: {
    padding: 16,
  },
  previewTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewBadge: {
    backgroundColor: "#EDF3F8",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  previewBadgeText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#053668",
  },
  readyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF3",
    borderWidth: 1,
    borderColor: "#ABEFC6",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  readyChipText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#027A48",
  },
  previewTitle: {
    marginTop: 14,
    fontSize: 19,
    fontWeight: "900",
    color: "#111827",
  },
  previewCaption: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: "#667085",
  },

  generateBtn: {
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 16,
  },
  generateBtnGradient: {
    minHeight: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 18,
  },
  generateBtnDisabled: {
    opacity: 0.7,
  },
  generateBtnText: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "900",
  },

  magicCard: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  magicGradient: {
    padding: 18,
  },
  magicTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  magicTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },
  magicSubtitle: {
    marginTop: 4,
    fontSize: 12.5,
    lineHeight: 19,
    color: "#667085",
    maxWidth: 240,
  },
  magicSparkWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  magicSparkGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },

  magicCenterWrap: {
    height: 138,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    marginBottom: 8,
  },
  magicHaloOuter: {
    position: "absolute",
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: "rgba(255,113,0,0.10)",
  },
  magicHaloInner: {
    position: "absolute",
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: "rgba(5,54,104,0.08)",
  },
  magicCore: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7EEF5",
    alignItems: "center",
    justifyContent: "center",
  },

  progressHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
  },
  progressTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: "800",
    color: "#053668",
  },
  progressTrack: {
    marginTop: 12,
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
  progressStepsWrap: {
    marginTop: 16,
    gap: 10,
  },
  progressStepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  progressStepBullet: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  progressStepBulletDone: {
    backgroundColor: "#12B76A",
  },
  progressStepBulletActive: {
    backgroundColor: "#FF7100",
  },
  progressStepText: {
    flex: 1,
    fontSize: 12.5,
    color: "#667085",
    fontWeight: "600",
  },
  progressStepTextActive: {
    color: "#111827",
    fontWeight: "800",
  },

  tipCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  tipIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFF1E7",
    alignItems: "center",
    justifyContent: "center",
  },
  tipTextWrap: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#111827",
  },
  tipSubtitle: {
    marginTop: 4,
    fontSize: 12.5,
    lineHeight: 19,
    color: "#667085",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.35)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },

  dropdownTrigger: {
    marginTop: 4,
    minHeight: 74,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE6F0",
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  dropdownTriggerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginRight: 12,
  },
  dropdownTriggerValue: {
    marginTop: 2,
    fontSize: 13,
    color: "#667085",
    fontWeight: "700",
  },

  dropdownModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    maxHeight: "75%",
    paddingTop: 16,
    paddingBottom: 10,
    overflow: "hidden",
  },
  dropdownModalHeader: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownModalTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#111827",
  },
  dropdownModalList: {
    padding: 12,
  },
  dropdownOption: {
    minHeight: 72,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownOptionSelected: {
    borderColor: "#053668",
    backgroundColor: "#F8FBFF",
  },
  dropdownOptionLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginRight: 10,
  },
  dropdownOptionBadge: {
    backgroundColor: "#EDF3F8",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dropdownOptionBadgeSelected: {
    backgroundColor: "#053668",
  },
  dropdownOptionBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#053668",
  },
  dropdownOptionBadgeTextSelected: {
    color: "#FFFFFF",
  },
  dropdownOptionTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#111827",
  },
  dropdownOptionTitleSelected: {
    color: "#053668",
  },
  dropdownOptionSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#667085",
    fontWeight: "600",
  },

  successModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 22,
    alignItems: "center",
  },
  successIconHero: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
  },
  successSubtitle: {
    marginTop: 8,
    fontSize: 13.5,
    lineHeight: 21,
    color: "#667085",
    textAlign: "center",
  },
  successMetaChip: {
    marginTop: 14,
    backgroundColor: "#EDF3F8",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  successMetaChipText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#053668",
    textAlign: "center",
  },
  successActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  successSecondaryBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  successSecondaryBtnText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#344054",
  },
  successPrimaryBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: "#053668",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  successPrimaryBtnText: {
    fontSize: 13.5,
    fontWeight: "900",
    color: "#FFFFFF",
  },
});
