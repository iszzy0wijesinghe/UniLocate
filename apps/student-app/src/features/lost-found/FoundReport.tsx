/** @format */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  Platform,
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";

import LostFoundTopBar from "./components/LostFoundTopBar";
import type {
  LostFoundStackParamList,
  LostFoundStackScreenProps,
} from "../../navigation/LostFoundStack";
import { scheduleFinderNotification } from "../../notifications";
import * as ImagePicker from "expo-image-picker";

type FoundRoute = RouteProp<LostFoundStackParamList, "FoundReport">;
type Navigation = LostFoundStackScreenProps<"FoundReport">["navigation"];

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function FoundReport() {
  const route = useRoute<FoundRoute>();
  const navigation = useNavigation<Navigation>();
  const tabBarHeight = useBottomTabBarHeight();

  const [placeFound, setPlaceFound] = useState("");
  const [description, setDescription] = useState("");
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [whenFound, setWhenFound] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [formMessage, setFormMessage] = useState<{
    type: "error" | "success";
    title: string;
    text: string;
  } | null>(null);

  const openDatePicker = () => {
    const now = new Date();

    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: whenFound > now ? now : whenFound,
        mode: "date",
        is24Hour: true,
        maximumDate: now,
        onChange: onChangeDate,
      });
      return;
    }

    setShowDatePicker(true);
  };

  const openTimePicker = () => {
    const now = new Date();
    const safeBase = whenFound > now ? now : whenFound;

    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: safeBase,
        mode: "time",
        is24Hour: true,
        onChange: onChangeTime,
      });
      return;
    }

    setShowTimePicker(true);
  };

  const onChangeDate = (_: any, selected?: Date) => {
    setShowDatePicker(false);
    if (!selected) return;

    const now = new Date();
    const next = new Date(whenFound);

    next.setFullYear(
      selected.getFullYear(),
      selected.getMonth(),
      selected.getDate(),
    );

    if (next > now) {
      next.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
      next.setHours(
        Math.min(next.getHours(), now.getHours()),
        next.getHours() >= now.getHours()
          ? Math.min(next.getMinutes(), now.getMinutes())
          : next.getMinutes(),
        0,
        0,
      );
    }

    setWhenFound(next);

    if (formMessage?.type === "error") setFormMessage(null);
  };

  const onChangeTime = (_: any, selected?: Date) => {
    setShowTimePicker(false);
    if (!selected) return;

    const now = new Date();
    const next = new Date(whenFound);

    next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);

    if (isSameDay(next, now) && next > now) {
      next.setHours(now.getHours(), now.getMinutes(), 0, 0);
    }

    setWhenFound(next);

    if (formMessage?.type === "error") setFormMessage(null);
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

    const remaining = 4 - imageUris.length;
    if (remaining <= 0) {
      Alert.alert("Limit reached", "You can upload up to 4 images.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });

    if (result.canceled) return;

    const newUris = (result.assets ?? [])
      .map((asset) => asset.uri)
      .filter(Boolean);

    if (newUris.length === 0) return;

    setImageUris((prev) => {
      const merged = [...prev, ...newUris].slice(0, 4);
      return Array.from(new Set(merged));
    });

    if (formMessage?.type === "error") {
      setFormMessage(null);
    }
  };

  const removeImageAt = (idx: number) => {
    setImageUris((prev) => prev.filter((_, i) => i !== idx));
  };

  const validateForm = () => {
    const now = new Date();

    if (placeFound.trim().length < 5) {
      setFormMessage({
        type: "error",
        title: "Location required",
        text: "Please enter where you found the item using at least 5 characters.",
      });
      return false;
    }

    if (!whenFound || Number.isNaN(whenFound.getTime())) {
      setFormMessage({
        type: "error",
        title: "Date and time missing",
        text: "Please select when you found the item.",
      });
      return false;
    }

    if (whenFound > now) {
      setFormMessage({
        type: "error",
        title: "Invalid date and time",
        text: "Future date and time cannot be selected.",
      });
      return false;
    }

    if (description.trim().length < 8) {
      setFormMessage({
        type: "error",
        title: "Description required",
        text: "Please add a short description with at least 8 characters.",
      });
      return false;
    }

    if (imageUris.length < 1) {
      setFormMessage({
        type: "error",
        title: "Photo required",
        text: "Please upload at least one image before continuing.",
      });
      return false;
    }

    setFormMessage(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const lines: string[] = [];
    lines.push(`Place found: ${placeFound.trim()}`);
    lines.push(`Time found: ${whenFound.toLocaleString()}`);
    lines.push(`Finder description: ${description.trim()}`);
    lines.push(`Attached photos: ${imageUris.length}`);

    const initialMessage = `Hi, I found an item that may be yours:\n\n${lines.join(
      "\n",
    )}\n\nCan you confirm some details to verify ownership?`;

    try {
      await scheduleFinderNotification(route.params.postTitle ?? "your item");
    } catch (e) {
      console.warn("Failed to schedule finder notification:", e);
    }

    navigation.navigate("Chat", {
      postId: route.params.postId,
      initialMessage,
    });
  };

  const now = new Date();
  const safePickerValue = whenFound > now ? now : whenFound;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <LostFoundTopBar
          title="I found this item"
          subtitle="Share secure details so the owner can verify it safely."
          compact
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroIconWrap}>
              <Ionicons
                name="shield-checkmark-outline"
                size={22}
                color="#053668"
              />
            </View>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroTitle}>Secure handover details</Text>
              <Text style={styles.heroSubtitle}>
                Only the owner will see the details you send in chat.
              </Text>
            </View>
          </View>

          {formMessage ? (
            <View
              style={[
                styles.messageCard,
                formMessage.type === "error"
                  ? styles.messageCardError
                  : styles.messageCardSuccess,
              ]}
            >
              <Text
                style={[
                  styles.messageTitle,
                  formMessage.type === "error"
                    ? styles.messageTitleError
                    : styles.messageTitleSuccess,
                ]}
              >
                {formMessage.title}
              </Text>
              <Text style={styles.messageText}>{formMessage.text}</Text>
            </View>
          ) : null}

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Where did you find it?</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Near the main library entrance"
              placeholderTextColor="#98A2B3"
              value={placeFound}
              onChangeText={(value) => {
                setPlaceFound(value);
                if (formMessage?.type === "error") setFormMessage(null);
              }}
            />
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>When did you find it?</Text>

            <View style={styles.dateTimeRow}>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={openDatePicker}
              >
                <Ionicons name="calendar-outline" size={18} color="#053668" />
                <Text style={styles.dateTimeButtonText}>
                  {whenFound.toLocaleDateString()}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={openTimePicker}
              >
                <Ionicons name="time-outline" size={18} color="#053668" />
                <Text style={styles.dateTimeButtonText}>
                  {whenFound.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={safePickerValue}
                mode="date"
                display="default"
                maximumDate={new Date()}
                onChange={onChangeDate}
              />
            )}

            {showTimePicker && (
              <DateTimePicker
                value={safePickerValue}
                mode="time"
                display="default"
                onChange={onChangeTime}
              />
            )}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Extra description</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              multiline
              numberOfLines={5}
              placeholder="Describe colours, marks, or anything unique about the item."
              placeholderTextColor="#98A2B3"
              value={description}
              onChangeText={(value) => {
                setDescription(value);
                if (formMessage?.type === "error") setFormMessage(null);
              }}
            />
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.photoHeaderRow}>
              <Text style={styles.sectionTitle}>Photos</Text>
              <Text style={styles.photoCount}>{imageUris.length}/4</Text>
            </View>

            <TouchableOpacity
              style={styles.uploadCard}
              onPress={pickImageFromGallery}
            >
              <Ionicons name="image-outline" size={24} color="#053668" />
              <Text style={styles.uploadTitle}>Select image from gallery</Text>
              <Text style={styles.uploadSubtitle}>
                You can add up to 4 images
              </Text>
            </TouchableOpacity>

            {imageUris.length > 0 && (
              <View style={styles.imageGrid}>
                {imageUris.map((uri, idx) => (
                  <View key={`${uri}-${idx}`} style={styles.imageWrap}>
                    <Image source={{ uri }} style={styles.previewImage} />
                    <TouchableOpacity
                      style={styles.removeBadge}
                      onPress={() => removeImageAt(idx)}
                    >
                      <Ionicons name="close" size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: 110 }]}>
          <TouchableOpacity
            style={[styles.footerButton, styles.primaryButton]}
            onPress={handleSubmit}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={18}
              color="#FFFFFF"
              style={styles.footerButtonIcon}
            />
            <Text style={styles.footerButtonText}>Send to owner & open chat</Text>
          </TouchableOpacity>
        </View>
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
    backgroundColor: "#F3F6FA",
  },

  content: {
    paddingTop: 12,
    paddingBottom: 1,
  },

  heroCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 14,
  },

  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EDF3F8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  heroTextWrap: {
    flex: 1,
  },

  heroTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#053668",
  },

  heroSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: "#667085",
  },

  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#053668",
    marginBottom: 12,
  },

  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FCFDFD",
    fontSize: 14,
    color: "#111827",
  },

  multilineInput: {
    textAlignVertical: "top",
    minHeight: 120,
  },

  dateTimeRow: {
    flexDirection: "row",
    gap: 10,
  },

  dateTimeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    backgroundColor: "#FCFDFD",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },

  dateTimeButtonText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#111827",
  },

  photoHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  photoCount: {
    fontSize: 12,
    fontWeight: "800",
    color: "#D96B00",
    backgroundColor: "#FFF4E8",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  uploadCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#C7D7E7",
    backgroundColor: "#F8FBFE",
    paddingVertical: 20,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  uploadTitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "800",
    color: "#053668",
  },

  uploadSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#667085",
    textAlign: "center",
  },

  imageGrid: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  imageWrap: {
    position: "relative",
  },

  previewImage: {
    width: 84,
    height: 84,
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

  footer: {
    backgroundColor: "#F3F6FA",
    paddingTop: 8,
  },

  footerButton: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: 16,
  },

  primaryButton: {
    backgroundColor: "#053668",
  },

  footerButtonIcon: {
    marginRight: 8,
  },

  footerButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },

  messageCard: {
    marginBottom: 14,
    borderRadius: 16,
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
});