/** @format */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Alert,
  Image,
  Modal,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import type {
  LostFoundStackParamList,
  LostFoundStackScreenProps,
} from "../../navigation/LostFoundStack";
import { createLostFoundPost, type ItemCategory } from "./lostFound.api";
import { getLocationLogs } from "../location-logs/storage";
import { loadSharedCampusMap } from "../location-logs/sharedMapLoader";
import type {
  LocationLogPoint,
  LocationLogsByDate,
} from "../location-logs/types";
import CampusMap2D, {
  type CampusBoundary,
  type CampusZone,
} from "../home/components/CampusMap2D";
import { useLiveLocation } from "../../services/geo/useLiveLocation";
import { useUserProfileStore } from "../../store/useUserProfileStore";

type ReportRoute = RouteProp<LostFoundStackParamList, "ReportItem">;
type Navigation = LostFoundStackScreenProps<"ReportItem">["navigation"];

type Step = 1 | 2 | 3 | 4;

const categories: ItemCategory[] = [
  "ID Card",
  "Wallet",
  "Book",
  "Device",
  "Other",
];

function formatDateHeading(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatLogTime(timestamp: string) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildDetailText(item: LocationLogPoint) {
  if (item.zoneName?.trim()) {
    return `Detected inside ${item.zoneName}`;
  }

  if (item.insideCampus) {
    return "Detected inside campus boundary";
  }

  return "Saved location point";
}

function getStepMeta(step: Step) {
  if (step === 1) {
    return {
      eyebrow: "Step 1",
      title: "Tell us what you lost",
      subtitle:
        "Add the basic item details first so your report is clear and easy to identify.",
      icon: "search-outline" as const,
    };
  }

  if (step === 2) {
    return {
      eyebrow: "Step 2",
      title: "Check your movement context",
      subtitle:
        "Review your recent saved location logs to remember where you may have been.",
      icon: "map-outline" as const,
    };
  }

  if (step === 3) {
    return {
      eyebrow: "Step 3",
      title: "Quick recovery check",
      subtitle:
        "If you already found the item while checking those areas, you can stop here.",
      icon: "checkmark-done-outline" as const,
    };
  }

  return {
    eyebrow: "Step 4",
    title: "Complete your report",
    subtitle:
      "Add a strong description and photos so others can help identify your item quickly.",
    icon: "document-text-outline" as const,
  };
}

function LocationLogPreviewCard({
  item,
  selected,
  onPress,
}: {
  item: LocationLogPoint;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.logCard, selected && styles.logCardSelected]}>
      <View style={styles.logIconWrap}>
        <Ionicons
          name={selected ? "location" : "location-outline"}
          size={18}
          color="#053668"
        />
      </View>

      <View style={styles.logTextWrap}>
        <Text style={styles.logTitle}>
          {item.zoneName || "Campus Location"}
        </Text>
        <Text style={styles.logTime}>{formatLogTime(item.timestamp)}</Text>
        <Text style={styles.logDetail}>{buildDetailText(item)}</Text>
      </View>

      {selected ? (
        <View style={styles.selectedBadge}>
          <Text style={styles.selectedBadgeText}>Selected</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function ReportItem() {
  const route = useRoute<ReportRoute>();
  const navigation = useNavigation<Navigation>();
  const reportMode = route.params.mode;
  const tabBarHeight = useBottomTabBarHeight();

  const [step, setStep] = useState<Step>(1);
  const [category, setCategory] = useState<ItemCategory>("ID Card");
  const [title, setTitle] = useState("");
  const [timeHint, setTimeHint] = useState("");
  const [description, setDescription] = useState("");
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [approxDateTime, setApproxDateTime] = useState<Date | null>(null);
  const [createdPostId, setCreatedPostId] = useState<string | null>(null);
  const [showCollectedConfirm, setShowCollectedConfirm] = useState(false);
  const [collectingItem, setCollectingItem] = useState(false);

  const [logsByDate, setLogsByDate] = useState<LocationLogsByDate>({});
  const [selectedLog, setSelectedLog] = useState<LocationLogPoint | null>(null);

  const [mapBoundary, setMapBoundary] = useState<CampusBoundary | null>(null);
  const [mapZones, setMapZones] = useState<CampusZone[]>([]);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState("");

  const [stepTwoLogsLoading, setStepTwoLogsLoading] = useState(true);
  const [pageScrollEnabled, setPageScrollEnabled] = useState(true);
  const [mapRefreshKey, setMapRefreshKey] = useState(0);
  const [gpsAccuracyText, setGpsAccuracyText] = useState("GPS");
  const { point } = useLiveLocation();

  const username = useUserProfileStore((state) => state.username);
  const userId = useUserProfileStore((state: any) => state.userId);
  const initialCenterAppliedRef = useRef(false);

  const [formMessage, setFormMessage] = useState<{
    type: "error" | "success";
    title: string;
    text: string;
  } | null>(null);

  const stepMeta = getStepMeta(step);

  const sortedDateKeys = useMemo(() => {
    return Object.keys(logsByDate).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime(),
    );
  }, [logsByDate]);

  const selectedMapPoint = useMemo(() => {
    if (selectedLog) {
      return {
        lat: selectedLog.lat,
        lng: selectedLog.lng,
      };
    }

    if (point) {
      return {
        lat: point.lat,
        lng: point.lng,
      };
    }

    return null;
  }, [selectedLog, point]);

  const loadStepTwoLogs = useCallback(async () => {
    try {
      setStepTwoLogsLoading(true);
      const data = await getLocationLogs();
      setLogsByDate(data);

      const sortedKeys = Object.keys(data).sort(
        (a, b) => new Date(b).getTime() - new Date(a).getTime(),
      );

      const allLogs = sortedKeys.flatMap((key) => data[key] ?? []);

      if (allLogs.length === 0) {
        setSelectedLog(null);
        return;
      }

      setSelectedLog((prev) => {
        if (!prev) return allLogs[0];
        const stillExists = allLogs.find((item) => item.id === prev.id) ?? null;
        return stillExists ?? allLogs[0];
      });
    } finally {
      setStepTwoLogsLoading(false);
    }
  }, []);

  const loadStepTwoMap = useCallback(async () => {
    try {
      setMapLoading(true);
      setMapError("");

      const mapData = await loadSharedCampusMap();
      setMapBoundary(mapData.boundary);
      setMapZones(mapData.zones);
    } catch (error: any) {
      console.error("[report-item] failed to load shared map", error);
      setMapError(error?.message || "Failed to load campus map");
    } finally {
      setMapLoading(false);
    }
  }, []);

  useEffect(() => {
    if (step !== 2) return;
    loadStepTwoLogs();
    loadStepTwoMap();
  }, [step, loadStepTwoLogs, loadStepTwoMap]);

  useEffect(() => {
    if (selectedLog?.accuracy != null) {
      setGpsAccuracyText(`±${Math.round(selectedLog.accuracy)}m`);
      return;
    }

    if (point?.accuracy != null) {
      setGpsAccuracyText(`±${Math.round(point.accuracy)}m`);
      return;
    }

    setGpsAccuracyText("--");
  }, [selectedLog, point?.accuracy]);

  useEffect(() => {
    if (step !== 2) return;
    if (!selectedLog && !point) return;
    if (initialCenterAppliedRef.current) return;

    initialCenterAppliedRef.current = true;
    setMapRefreshKey((prev) => prev + 1);
  }, [step, selectedLog, point]);

  useEffect(() => {
    if (step !== 2) {
      initialCenterAppliedRef.current = false;
    }
  }, [step]);

  const validateStepOne = () => {
    if (title.trim().length < 5) {
      setFormMessage({
        type: "error",
        title: "Add a better title",
        text: "Please enter a short title with at least 5 characters.",
      });
      return false;
    }

    if (!approxDateTime) {
      setFormMessage({
        type: "error",
        title: "Date and time missing",
        text: "Please select the approximate date and time.",
      });
      return false;
    }

    setFormMessage(null);
    return true;
  };

  const goNext = () => {
    if (step === 1 && !validateStepOne()) return;
    setFormMessage(null);
    if (step < 4) setStep((s) => (s + 1) as Step);
  };

  const goBack = () => {
    setFormMessage(null);
    if (step > 1) setStep((s) => (s - 1) as Step);
  };

  const validateStepFour = () => {
    const hasDescription = description.trim().length >= 8;
    const hasImages = imageUris.length > 0;

    if (!hasDescription) {
      setFormMessage({
        type: "error",
        title: "Description required",
        text: "Please add a description with at least 8 characters.",
      });
      return false;
    }

    if (!hasImages) {
      setFormMessage({
        type: "error",
        title: "Image required",
        text: "Please upload at least one image before posting.",
      });
      return false;
    }

    setFormMessage(null);
    return true;
  };

  const handleSubmit = async () => {
    if (title.trim().length < 5) {
      setFormMessage({
        type: "error",
        title: "Add a better title",
        text: "Please enter a short title with at least 5 characters.",
      });
      return;
    }

    if (!approxDateTime) {
      setFormMessage({
        type: "error",
        title: "Date and time missing",
        text: "Please select the approximate date and time.",
      });
      return;
    }

    if (!validateStepFour()) return;

    try {
      setFormMessage(null);
      setSubmitting(true);

      const post = await createLostFoundPost({
        type: reportMode,
        category,
        title: title.trim(),
        description,
        timeHint,
        images: imageUris,
        ownerUserId: String(userId ?? "local-user"),
        ownerUsername: username?.trim() || "Campus User",
      });

      setCreatedPostId(post.id);
      setFormMessage({
        type: "success",
        title: "Post published successfully",
        text: "Your lost item post is now live. Hopefully someone will spot it soon.",
      });
      setSubmitted(true);

      setTimeout(() => {
        navigation.navigate("LostFoundHome");
      }, 1400);
    } catch (err) {
      console.error(err);
      setFormMessage({
        type: "error",
        title: "Could not publish post",
        text:
          (err as Error).message ||
          "Network error. Please check your connection and try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCollectedItem = async () => {
    try {
      setCollectingItem(true);
      setShowCollectedConfirm(false);
      navigation.navigate("LostFoundHome");
    } catch (err) {
      console.error(err);
    } finally {
      setCollectingItem(false);
    }
  };

  const onChangeDate = (_: any, selected?: Date) => {
    setShowPicker(false);
    if (selected) {
      setApproxDateTime(selected);
      setTimeHint(selected.toLocaleString());
    }
  };

  const openAndroidDateTimePicker = () => {
    const base = approxDateTime ?? new Date();

    DateTimePickerAndroid.open({
      value: base,
      mode: "date",
      is24Hour: true,
      onChange: (event: any, selectedDate?: Date) => {
        if (event?.type === "dismissed" || !selectedDate) return;

        const withDate = new Date(base);
        withDate.setFullYear(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate(),
        );

        DateTimePickerAndroid.open({
          value: withDate,
          mode: "time",
          is24Hour: true,
          onChange: (event2: any, selectedTime?: Date) => {
            if (event2?.type === "dismissed" || !selectedTime) return;

            const final = new Date(withDate);
            final.setHours(
              selectedTime.getHours(),
              selectedTime.getMinutes(),
              0,
              0,
            );

            setApproxDateTime(final);
            setTimeHint(final.toLocaleString());
          },
        });
      },
    });
  };

  const pickImageFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission required",
        "Please allow gallery access to attach item photos.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setImageUris((prev) => {
        if (prev.length >= 4) {
          Alert.alert("Limit reached", "You can upload up to 4 images.");
          return prev;
        }
        const nextImages = [...prev, result.assets[0].uri];
        if (formMessage?.type === "error") setFormMessage(null);
        return nextImages;
      });
    }
  };

  const removeImageAt = (idx: number) => {
    setImageUris((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      const hasDescription = description.trim().length > 0;
      const hasImages = next.length > 0;

      if (hasDescription || hasImages) {
        setFormMessage(null);
      }

      return next;
    });
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.successScreen}>
          <View style={styles.topBrandWrap}>
            <Image
              source={require("../../assets/images/UniLocateLogo.png")}
              style={styles.topBrandLogo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.successIconWrap}>
            <Text style={styles.successIcon}>✓</Text>
          </View>

          <Text style={styles.successTitle}>
            {createdPostId ? "Post published" : "Post removed"}
          </Text>

          <Text style={styles.successSubtitle}>
            {createdPostId
              ? "Your lost item post has been published successfully. We hope someone will spot it and help you recover it soon."
              : "Your post has been removed successfully."}
          </Text>

          <TouchableOpacity
            style={[styles.successButton, styles.primaryButton]}
            onPress={() => navigation.navigate("LostFoundHome")}>
            <Text style={styles.actionButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.topBrandWrap}>
          <Image
            source={require("../../assets/images/UniLocateLogo.png")}
            style={styles.topBrandLogo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <Ionicons name={stepMeta.icon} size={22} color="#053668" />
          </View>

          <View style={styles.heroTextWrap}>
            <Text style={styles.heroEyebrow}>
              {reportMode === "lost" ? "Lost item report" : "Found item report"}
            </Text>
            <Text style={styles.heroTitle}>{stepMeta.title}</Text>
            <Text style={styles.heroSubtitle}>{stepMeta.subtitle}</Text>
          </View>
        </View>

        <View style={styles.progressHeaderRow}>
          <Text style={styles.progressText}>
            Step {step} of 4 · {stepMeta.eyebrow}
          </Text>
          <Text style={styles.progressPercent}>{step * 25}%</Text>
        </View>

        <View style={styles.stepperRow}>
          {[1, 2, 3, 4].map((s) => (
            <View
              key={s}
              style={[
                styles.stepDot,
                s <= step ? styles.stepDotActive : undefined,
              ]}
            />
          ))}
        </View>

        {formMessage ? (
          <View
            style={[
              styles.messageCard,
              formMessage.type === "error"
                ? styles.messageCardError
                : styles.messageCardSuccess,
            ]}>
            <Text
              style={[
                styles.messageTitle,
                formMessage.type === "error"
                  ? styles.messageTitleError
                  : styles.messageTitleSuccess,
              ]}>
              {formMessage.title}
            </Text>
            <Text style={styles.messageText}>{formMessage.text}</Text>
          </View>
        ) : null}

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          scrollEnabled={pageScrollEnabled}>
          {step === 1 && (
            <View style={styles.panel}>
              <View style={styles.sectionBanner}>
                <View style={styles.sectionBannerIcon}>
                  <Ionicons name="cube-outline" size={18} color="#053668" />
                </View>
                <View style={styles.sectionBannerTextWrap}>
                  <Text style={styles.sectionTitle}>Item identification</Text>
                  <Text style={styles.sectionSubcopy}>
                    Add the essential details first so others can immediately
                    understand what is missing.
                  </Text>
                </View>
              </View>

              <Text style={styles.label}>Category</Text>
              <View style={styles.chipsRow}>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.chip, category === c && styles.chipSelected]}
                    onPress={() => setCategory(c)}>
                    <Text
                      style={[
                        styles.chipText,
                        category === c && styles.chipTextSelected,
                      ]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.infoMiniCard}>
                <Ionicons name="sparkles-outline" size={16} color="#FF7100" />
                <Text style={styles.infoMiniCardText}>
                  A clear title and accurate time make this post easier to
                  match.
                </Text>
              </View>

              <Text style={styles.label}>Short title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Blue university ID card"
                placeholderTextColor="#98A2B3"
                value={title}
                onChangeText={(value) => {
                  setTitle(value);
                  if (formMessage?.type === "error") setFormMessage(null);
                }}
                maxLength={80}
              />
              <Text style={styles.helperText}>
                Minimum 5 characters required.
              </Text>

              <Text style={styles.label}>Approx. date & time *</Text>
              {Platform.OS === "web" ? (
                <input
                  type="datetime-local"
                  style={{
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#d1d5db",
                    padding: 10,
                    width: "100%",
                    marginTop: 8,
                    backgroundColor: "white",
                  }}
                  value={
                    approxDateTime
                      ? approxDateTime.toISOString().slice(0, 16)
                      : ""
                  }
                  onChange={(e) => {
                    const selected = new Date(e.target.value);
                    setApproxDateTime(selected);
                    setTimeHint(selected.toLocaleString());
                  }}
                />
              ) : Platform.OS === "android" ? (
                <TouchableOpacity
                  style={styles.inputButtonCard}
                  onPress={openAndroidDateTimePicker}>
                  <View style={styles.inputButtonLeft}>
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color="#053668"
                    />
                    <Text
                      style={[
                        styles.inputButtonText,
                        !timeHint && styles.inputButtonPlaceholder,
                      ]}>
                      {timeHint || "Select date & time from calendar"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#98A2B3" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.inputButtonCard}
                  onPress={() => setShowPicker(true)}>
                  <View style={styles.inputButtonLeft}>
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color="#053668"
                    />
                    <Text
                      style={[
                        styles.inputButtonText,
                        !timeHint && styles.inputButtonPlaceholder,
                      ]}>
                      {timeHint || "Select date & time from calendar"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#98A2B3" />
                  {showPicker && (
                    <DateTimePicker
                      value={approxDateTime ?? new Date()}
                      mode="datetime"
                      display="default"
                      onChange={onChangeDate}
                    />
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

          {step === 2 && (
            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>Location context</Text>
              <Text style={styles.helperText}>
                Based on your recent saved location logs, these areas are shown
                only for you to help remember where you may have been. This is
                not shared with anyone else.
              </Text>

              <View style={styles.stepTwoMapCard}>
                <View style={styles.stepTwoHeaderRow}>
                  <Text style={styles.stepTwoLabel}>Recent location logs</Text>

                  <Pressable
                    style={styles.stepTwoActionButton}
                    onPress={() => {
                      if (sortedDateKeys.length === 0) return;
                      setSelectedLog(null);
                      setMapRefreshKey((prev) => prev + 1);
                    }}>
                    <Text style={styles.stepTwoActionText}>Reset</Text>
                  </Pressable>
                </View>

                <View
                  style={styles.stepTwoMapWrap}
                  onTouchStart={() => setPageScrollEnabled(false)}
                  onTouchEnd={() => setPageScrollEnabled(true)}
                  onTouchCancel={() => setPageScrollEnabled(true)}>
                  {mapLoading ? (
                    <View style={styles.mapStateWrap}>
                      <ActivityIndicator size="small" color="#053668" />
                      <Text style={styles.mapStateText}>
                        Loading campus map...
                      </Text>
                    </View>
                  ) : mapError ? (
                    <View style={styles.mapStateWrap}>
                      <Ionicons
                        name="alert-circle-outline"
                        size={22}
                        color="#C2410C"
                      />
                      <Text style={styles.mapErrorText}>{mapError}</Text>
                    </View>
                  ) : (
                    <View style={styles.stepTwoMapCanvas}>
                      <CampusMap2D
                        key={mapRefreshKey}
                        zones={mapZones}
                        boundary={mapBoundary}
                        userLocation={selectedMapPoint}
                        selectedZoneId={selectedLog?.zoneId ?? null}
                        onZonePress={() => {}}
                        onLocateMePress={() => {
                          setSelectedLog(null);
                          setMapRefreshKey((prev) => prev + 1);
                        }}
                        networkOk={true}
                        networkSpeedText=""
                        gpsAccuracyText={gpsAccuracyText}
                        isPinging={false}
                        lastPingAt={
                          selectedLog ? new Date(selectedLog.timestamp) : null
                        }
                      />
                    </View>
                  )}
                </View>

                <View style={styles.stepTwoHintCard}>
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color="#6B7280"
                  />
                  <Text style={styles.stepTwoHintText}>
                    Tap a saved log below to preview where you were on the
                    campus map.
                  </Text>
                </View>
              </View>

              <View style={styles.stepTwoLogsCard}>
                <Text style={styles.stepTwoLabel}>Saved logs</Text>

                {stepTwoLogsLoading ? (
                  <View style={styles.emptyStateCard}>
                    <ActivityIndicator size="small" color="#053668" />
                    <Text style={styles.emptyStateText}>
                      Loading saved logs...
                    </Text>
                  </View>
                ) : sortedDateKeys.length === 0 ? (
                  <View style={styles.emptyStateCard}>
                    <Ionicons
                      name="location-outline"
                      size={24}
                      color="#98A2B3"
                    />
                    <Text style={styles.emptyStateTitle}>
                      No recent logs available
                    </Text>
                    <Text style={styles.emptyStateText}>
                      Once the app saves recent location history, your movement
                      context will appear here.
                    </Text>
                  </View>
                ) : (
                  sortedDateKeys.map((dateKey) => {
                    const items = logsByDate[dateKey] ?? [];

                    return (
                      <View key={dateKey} style={styles.daySection}>
                        <View style={styles.dayHeader}>
                          <View style={styles.dayHeaderTextWrap}>
                            <Text style={styles.dayTitle}>
                              {formatDateHeading(dateKey)}
                            </Text>
                            <Text style={styles.dayCount}>
                              {items.length} log{items.length === 1 ? "" : "s"}
                            </Text>
                          </View>
                        </View>

                        {items.map((item) => (
                          <LocationLogPreviewCard
                            key={item.id}
                            item={item}
                            selected={selectedLog?.id === item.id}
                            onPress={() => {
                              setSelectedLog(item);
                              setPageScrollEnabled(true);
                              setMapRefreshKey((prev) => prev + 1);
                            }}
                          />
                        ))}
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          )}

          {step === 3 && (
            <View style={styles.panel}>
              <View style={styles.sectionBanner}>
                <View style={styles.sectionBannerIcon}>
                  <Ionicons
                    name="help-buoy-outline"
                    size={18}
                    color="#053668"
                  />
                </View>
                <View style={styles.sectionBannerTextWrap}>
                  <Text style={styles.sectionTitle}>Recovery decision</Text>
                  <Text style={styles.sectionSubcopy}>
                    Before publishing, confirm whether the item is still
                    missing.
                  </Text>
                </View>
              </View>

              <View style={styles.decisionHeroCard}>
                <Text style={styles.decisionHeroTitle}>
                  Did you already find it?
                </Text>
                <Text style={styles.decisionHeroText}>
                  Sometimes checking your recent location context is enough to
                  remember where the item was left.
                </Text>

                <View style={styles.decisionTipList}>
                  <View style={styles.decisionTipRow}>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={16}
                      color="#039855"
                    />
                    <Text style={styles.decisionTipText}>
                      Stop here if you recovered it already
                    </Text>
                  </View>
                  <View style={styles.decisionTipRow}>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={16}
                      color="#039855"
                    />
                    <Text style={styles.decisionTipText}>
                      Continue only if you still need campus help
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.decisionRow}>
                <TouchableOpacity
                  style={[styles.decisionButtonLarge, styles.secondaryButton]}
                  onPress={() => setShowCollectedConfirm(true)}>
                  <Ionicons
                    name="checkmark-done-outline"
                    size={18}
                    color="#B54708"
                  />
                  <Text style={styles.secondaryButtonText}>
                    I collected my item
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.decisionButtonLarge, styles.primaryButton]}
                  onPress={goNext}>
                  <Ionicons
                    name="arrow-forward-outline"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.actionButtonText}>
                    I still haven&apos;t found it
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 4 && (
            <View style={styles.panel}>
              <View style={styles.sectionBanner}>
                <View style={styles.sectionBannerIcon}>
                  <Ionicons name="camera-outline" size={18} color="#053668" />
                </View>
                <View style={styles.sectionBannerTextWrap}>
                  <Text style={styles.sectionTitle}>Final details</Text>
                  <Text style={styles.sectionSubcopy}>
                    Strong details and clear photos improve the chance of a fast
                    recovery.
                  </Text>
                </View>
              </View>

              <View style={styles.infoMiniCard}>
                <Ionicons name="sparkles-outline" size={16} color="#FF7100" />
                <Text style={styles.infoMiniCardText}>
                  Mention color, size, unique marks, stickers, covers, or
                  anything memorable.
                </Text>
              </View>

              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                multiline
                numberOfLines={5}
                placeholder="Add marks, colors, or other details to help others recognise your item."
                placeholderTextColor="#98A2B3"
                value={description}
                onChangeText={(value) => {
                  setDescription(value);
                  if (
                    formMessage?.type === "error" &&
                    value.trim().length >= 8
                  ) {
                    setFormMessage(null);
                  }
                }}
              />

              <Text style={styles.label}>Photos *</Text>
              <TouchableOpacity
                style={styles.uploadHeroCard}
                onPress={pickImageFromGallery}>
                <View style={styles.uploadHeroIcon}>
                  <Ionicons name="image-outline" size={22} color="#053668" />
                </View>
                <View style={styles.uploadHeroTextWrap}>
                  <Text style={styles.uploadHeroTitle}>
                    Select image from gallery
                  </Text>
                  <Text style={styles.uploadHeroSubtitle}>
                    Add at least 1 image. You can upload up to 4 images.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#98A2B3" />
              </TouchableOpacity>

              {imageUris.length > 0 && (
                <View style={styles.imagePreviewSection}>
                  <Text style={styles.imagePreviewTitle}>
                    Selected photos ({imageUris.length}/4)
                  </Text>

                  <View style={styles.imageGrid}>
                    {imageUris.map((uri, idx) => (
                      <View key={`${uri}-${idx}`} style={styles.imageWrap}>
                        <Image source={{ uri }} style={styles.previewImage} />
                        <TouchableOpacity
                          style={styles.removeBadge}
                          onPress={() => removeImageAt(idx)}>
                          <Text style={styles.removeBadgeText}>×</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: tabBarHeight + 25 }]}>
          {step > 1 && step < 4 && (
            <TouchableOpacity
              style={[styles.footerButton, styles.secondaryButton]}
              onPress={goBack}>
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
          )}

          {step < 3 && (
            <TouchableOpacity
              style={[styles.footerButton, styles.primaryButton]}
              onPress={goNext}>
              <Text style={styles.actionButtonText}>Next</Text>
            </TouchableOpacity>
          )}

          {step === 4 && (
            <TouchableOpacity
              style={[styles.footerButton, styles.primaryButton]}
              onPress={handleSubmit}>
              <Text style={styles.actionButtonText}>
                {submitting ? "Posting..." : "Post lost item"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <Modal
          visible={showCollectedConfirm}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCollectedConfirm(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalIconWrap}>
                <Text style={styles.modalIcon}>✓</Text>
              </View>

              <Text style={styles.modalTitle}>Confirm item collected</Text>

              <Text style={styles.modalText}>
                Are you sure you already collected your item? You will be taken
                back to Lost &amp; Found home and this report flow will be
                closed.
              </Text>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={() => setShowCollectedConfirm(false)}
                  disabled={collectingItem}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.modalConfirmButton]}
                  onPress={handleCollectedItem}
                  disabled={collectingItem}>
                  <Text style={styles.modalConfirmText}>
                    {collectingItem ? "Please wait..." : "Yes, go home"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F3F6FA",
  },

  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 4,
    backgroundColor: "#F3F6FA",
  },

  topBrandWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 2,
    marginBottom: 8,
  },

  topBrandLogo: {
    width: 108,
    height: 40,
  },

  heroCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E4E7EC",
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  heroIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#EDF3F8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  heroTextWrap: {
    flex: 1,
  },

  heroEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#FF7100",
  },

  heroTitle: {
    marginTop: 6,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    color: "#053668",
  },

  heroSubtitle: {
    marginTop: 6,
    fontSize: 13.5,
    lineHeight: 20,
    color: "#667085",
  },

  progressHeaderRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  progressText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#667085",
  },

  progressPercent: {
    fontSize: 13,
    fontWeight: "800",
    color: "#053668",
  },

  stepperRow: {
    flexDirection: "row",
    marginTop: 10,
    marginBottom: 8,
    justifyContent: "space-between",
  },

  stepDot: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    marginHorizontal: 2,
    backgroundColor: "#D0D5DD",
  },

  stepDotActive: {
    backgroundColor: "#053668",
  },

  content: {
    paddingVertical: 10,
  },

  panel: {
    backgroundColor: "white",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E4E7EC",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  sectionBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },

  sectionBannerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EDF3F8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  sectionBannerTextWrap: {
    flex: 1,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#053668",
  },

  sectionSubcopy: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: "#667085",
  },

  label: {
    marginTop: 10,
    marginBottom: 6,
    fontSize: 13,
    color: "#475467",
    fontWeight: "700",
  },

  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    fontSize: 14,
    color: "#111827",
  },

  inputButtonCard: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  inputButtonLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    paddingRight: 10,
  },

  inputButtonText: {
    fontSize: 14,
    color: "#111827",
    flex: 1,
  },

  inputButtonPlaceholder: {
    color: "#9CA3AF",
  },

  multilineInput: {
    textAlignVertical: "top",
    minHeight: 120,
  },

  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  chip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    backgroundColor: "#FAFBFC",
  },

  chipSelected: {
    backgroundColor: "#053668",
    borderColor: "#053668",
  },

  chipText: {
    fontSize: 13,
    color: "#475467",
    fontWeight: "600",
  },

  chipTextSelected: {
    color: "white",
    fontWeight: "700",
  },

  infoMiniCard: {
    marginTop: 12,
    marginBottom: 2,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FFF7ED",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FED7AA",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  infoMiniCardText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: "#9A3412",
    fontWeight: "600",
  },

  helperText: {
    fontSize: 12.5,
    color: "#667085",
    marginTop: 6,
    marginBottom: 10,
  },

  stepTwoMapCard: {
    marginTop: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
  },

  stepTwoLogsCard: {
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
  },

  stepTwoHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  stepTwoLabel: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    color: "#98A2B3",
  },

  stepTwoActionButton: {
    backgroundColor: "#EDF3F8",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  stepTwoActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#053668",
  },

  stepTwoMapWrap: {
    marginTop: 10,
    overflow: "hidden",
    borderRadius: 22,
    backgroundColor: "#EEF3F8",
    height: 320,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  stepTwoMapCanvas: {
    flex: 1,
  },

  stepTwoHintCard: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#F5F7FA",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  stepTwoHintText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: "#6B7280",
  },

  mapStateWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    gap: 8,
  },

  mapStateText: {
    fontSize: 13,
    color: "#667085",
    fontWeight: "600",
    textAlign: "center",
  },

  mapErrorText: {
    fontSize: 13,
    color: "#C2410C",
    fontWeight: "700",
    textAlign: "center",
  },

  daySection: {
    marginTop: 14,
  },

  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    gap: 12,
  },

  dayHeaderTextWrap: {
    flex: 1,
  },

  dayTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },

  dayCount: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
    color: "#667085",
  },

  logCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F9FAFB",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginTop: 10,
  },

  logCardSelected: {
    borderColor: "#053668",
    backgroundColor: "#F2F7FC",
  },

  logIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EDF3F8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  logTextWrap: {
    flex: 1,
  },

  logTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },

  logTime: {
    marginTop: 3,
    fontSize: 12,
    color: "#667085",
    fontWeight: "600",
  },

  logDetail: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: "#667085",
  },

  selectedBadge: {
    marginLeft: 10,
    backgroundColor: "#053668",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },

  selectedBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  emptyStateCard: {
    marginTop: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 18,
    alignItems: "center",
  },

  emptyStateTitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },

  emptyStateText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: "#667085",
    textAlign: "center",
  },

  decisionHeroCard: {
    marginTop: 8,
    backgroundColor: "#F8FBFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#D8E6F4",
    padding: 16,
  },

  decisionHeroTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#053668",
  },

  decisionHeroText: {
    marginTop: 8,
    fontSize: 13.5,
    lineHeight: 20,
    color: "#667085",
  },

  decisionTipList: {
    marginTop: 14,
    gap: 10,
  },

  decisionTipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  decisionTipText: {
    flex: 1,
    fontSize: 13,
    color: "#475467",
    fontWeight: "600",
  },

  decisionRow: {
    flexDirection: "column",
    gap: 12,
    marginTop: 16,
  },

  decisionButtonLarge: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
  },

  uploadHeroCard: {
    marginTop: 2,
    minHeight: 72,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#B8C7D8",
    backgroundColor: "#F8FBFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  uploadHeroIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EDF3F8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  uploadHeroTextWrap: {
    flex: 1,
    paddingRight: 12,
  },

  uploadHeroTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#053668",
  },

  uploadHeroSubtitle: {
    marginTop: 4,
    fontSize: 12.5,
    lineHeight: 18,
    color: "#667085",
  },

  imagePreviewSection: {
    marginTop: 14,
  },

  imagePreviewTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#475467",
    marginBottom: 10,
  },

  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  imageWrap: {
    position: "relative",
  },

  previewImage: {
    width: 82,
    height: 82,
    borderRadius: 14,
    backgroundColor: "#E4E7EC",
  },

  removeBadge: {
    position: "absolute",
    right: -6,
    top: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#B42318",
    alignItems: "center",
    justifyContent: "center",
  },

  removeBadgeText: {
    color: "white",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 14,
  },

  primaryButton: {
    backgroundColor: "#053668",
  },

  secondaryButton: {
    backgroundColor: "#FFF8F3",
    borderWidth: 1.5,
    borderColor: "#F5B27A",
  },

  actionButtonText: {
    color: "white",
    fontWeight: "800",
    fontSize: 14,
  },

  secondaryButtonText: {
    color: "#B54708",
    fontWeight: "800",
    fontSize: 14,
  },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingTop: 12,
    marginTop: 8,
    paddingHorizontal: 4,
    backgroundColor: "#F3F6FA",
  },

  footerButton: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  messageCard: {
    marginTop: 10,
    marginBottom: 6,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },

  messageCardError: {
    backgroundColor: "#FEF3F2",
    borderColor: "#FECACA",
  },

  messageCardSuccess: {
    backgroundColor: "#ECFDF3",
    borderColor: "#ABEFC6",
  },

  messageTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },

  messageTitleError: {
    color: "#B42318",
  },

  messageTitleSuccess: {
    color: "#027A48",
  },

  messageText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#475467",
  },

  successScreen: {
    flex: 1,
    padding: 24,
    backgroundColor: "#F3F6FA",
    alignItems: "center",
    justifyContent: "center",
  },

  successIconWrap: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#ECFDF3",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#ABEFC6",
  },

  successIcon: {
    fontSize: 34,
    fontWeight: "800",
    color: "#039855",
  },

  successTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#053668",
    textAlign: "center",
  },

  successSubtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: "#667085",
    textAlign: "center",
    paddingHorizontal: 8,
  },

  successButton: {
    marginTop: 22,
    minWidth: 220,
    minHeight: 48,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
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
