import React, { useState } from "react";
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
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";

import type {
  LostFoundStackParamList,
  LostFoundStackScreenProps,
} from "../../navigation/LostFoundStack";
import {
  createLostFoundPost,
  deleteLostFoundPost,
  getMockLocationTrail,
  type ItemCategory,
  uploadLostFoundImage,
} from "./lostFound.api";

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

  const locationTrail = getMockLocationTrail();

 const goNext = () => {
  // ✅ Step 1 validation
  if (step === 1) {
    if (!title.trim()) {
      Alert.alert("Title required", "Please add a short title.");
      return;
    }

    if (title.trim().length < 3) {
      Alert.alert("Invalid title", "Title must be at least 3 characters.");
      return;
    }

    if (!approxDateTime) {
      Alert.alert(
        "Date & Time required",
        "Please select the date and time."
      );
      return;
    }
  }

  // ✅ move to next step
  if (step < 4) setStep((s) => ((s + 1) as Step));
};

  const goBack = () => {
    if (step > 1) setStep((s) => ((s - 1) as Step));
  };

  // Submit lost item
const handleSubmit = async () => {
  // ✅ Title validation
  if (!title.trim()) {
    Alert.alert("Title required", "Please add a short title for the item.");
    return;
  }

  if (title.trim().length < 3) {
    Alert.alert("Invalid title", "Title must be at least 3 characters long.");
    return;
  }

  // ✅ Date & Time validation
  if (!approxDateTime) {
    Alert.alert(
      "Date & Time required",
      "Please select the approximate date and time."
    );
    return;
  }

  try {
    setSubmitting(true);

    const uploadedImageUrls: string[] = [];
    for (const uri of imageUris) {
      const url = await uploadLostFoundImage(uri);
      uploadedImageUrls.push(url);
    }

    const post = await createLostFoundPost({
      type: reportMode,
      category,
      title: title.trim(),
      description,
      timeHint,
      images: uploadedImageUrls,
    });

    setCreatedPostId(post.id);
    setSubmitted(true);

    setTimeout(() => {
      navigation.navigate("LostFoundHome");
    }, 800);
  } catch (err) {
    console.error(err);
    Alert.alert(
      "Could not post item",
      (err as Error).message || "Network error. Start the API with: pnpm -C apps/api dev"
    );
  } finally {
    setSubmitting(false);
  }
};

  // Delete post if item is collected
  const handleCollectedItem = async () => {
    Alert.alert(
      "Item collected?",
      createdPostId
        ? "This will delete your lost-item post permanently. Continue?"
        : "Great! Since you already collected your item, do you want to stop and go back home?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: createdPostId ? "Delete post" : "Yes, go home",
          style: "destructive",
          onPress: async () => {
            try {
              if (createdPostId) {
                await deleteLostFoundPost(createdPostId);
                setSubmitted(true);
                setCreatedPostId(null);
                return;
              }
              navigation.navigate("LostFoundHome");
            } catch (err) {
              console.error(err);
              Alert.alert("Could not remove post", (err as Error).message);
            }
          },
        },
      ]
    );
  };

  // Handle date selection for mobile
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
          selectedDate.getDate()
        );

        DateTimePickerAndroid.open({
          value: withDate,
          mode: "time",
          is24Hour: true,
          onChange: (event2: any, selectedTime?: Date) => {
            if (event2?.type === "dismissed" || !selectedTime) return;

            const final = new Date(withDate);
            final.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);

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
        "Please allow gallery access to attach item photos."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setImageUris((prev) => {
        if (prev.length >= 4) {
          Alert.alert("Limit reached", "You can upload up to 4 images.");
          return prev;
        }
        return [...prev, result.assets[0].uri];
      });
    }
  };

  const removeImageAt = (idx: number) => {
    setImageUris((prev) => prev.filter((_, i) => i !== idx));
  };

  if (submitted)
    return (
      <View style={styles.container}>
        <Text style={styles.title}>
          {createdPostId ? "Lost item posted" : "Post removed"}
        </Text>
        <Text style={styles.subtitle}>
          {createdPostId
            ? "Your post is now visible to students."
            : "Your post has been removed successfully."}
        </Text>
        <TouchableOpacity
          style={[styles.primaryButton, { marginTop: 16 }]}
          onPress={() => navigation.navigate("LostFoundHome")}
        >
          <Text style={styles.actionButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {reportMode === "lost" ? "I lost an item" : "I found an item"}
      </Text>
      <Text style={styles.subtitle}>
        Step {step} of 4 ·{" "}
        {step === 1
          ? "Item identification"
          : step === 2
          ? "Location context"
          : step === 3
          ? "Decision"
          : "Details & post"}
      </Text>

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

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Step 1: Item Identification */}
        {step === 1 && (
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Item identification</Text>
            <Text style={styles.label}>Category</Text>
            <View style={styles.chipsRow}>
              {categories.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, category === c && styles.chipSelected]}
                  onPress={() => setCategory(c)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      category === c && styles.chipTextSelected,
                    ]}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Short title</Text>
            <TextInput
              style={styles.input}
              placeholder={"e.g. Blue university ID card"}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>Approx. date & time</Text>
            {Platform.OS === "web" ? (
              <input
                type="datetime-local"
                style={{
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: "#d1d5db",
                  padding: 8,
                  width: "100%",
                  marginTop: 8,
                }}
                value={
                  approxDateTime ? approxDateTime.toISOString().slice(0, 16) : ""
                }
                onChange={(e) => {
                  const selected = new Date(e.target.value);
                  setApproxDateTime(selected);
                  setTimeHint(selected.toLocaleString());
                }}
              />
            ) : Platform.OS === "android" ? (
              <TouchableOpacity
                style={styles.input}
                onPress={openAndroidDateTimePicker}
              >
                <Text style={{ color: timeHint ? "#111827" : "#9ca3af" }}>
                  {timeHint || "Select date & time from calendar"}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowPicker(true)}
              >
                <Text style={{ color: timeHint ? "#111827" : "#9ca3af" }}>
                  {timeHint || "Select date & time from calendar"}
                </Text>
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

        {/* Step 2: Location Context */}
        {step === 2 && (
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Location context</Text>
            <Text style={styles.helperText}>
              Based on your past campus movements for the selected time range,
              these areas are highlighted just for you. This is not shared with
              anyone else.
            </Text>
            <View style={styles.mapMock}>
              {locationTrail.map((p) => (
                <View
                  key={p.id}
                  style={[
                    styles.mapPoint,
                    {
                      left: `${p.x}%`,
                      top: `${p.y}%`,
                    },
                  ]}
                >
                  <View style={styles.mapDot} />
                  <Text style={styles.mapLabel}>{p.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Step 3: Decision */}
        {step === 3 && (
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Did you already find it?</Text>
            <Text style={styles.helperText}>
              If you found the item while checking the highlighted areas, you
              can stop here to avoid unnecessary posts.
            </Text>
            <View style={styles.decisionRow}>
              <TouchableOpacity
                style={[styles.decisionButton, styles.secondaryButton]}
                onPress={handleCollectedItem}
              >
                <Text style={styles.secondaryButtonText}>
                  I collected my item
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.decisionButton, styles.primaryButton]}
                onPress={goNext}
              >
                <Text style={styles.actionButtonText}>
                  I still haven&apos;t found it
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 4: Final Details */}
        {step === 4 && (
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Final details</Text>
            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              multiline={true}
              numberOfLines={4}
              placeholder={
                "Add marks, colors, or other details to help others recognise your item."
              }
              value={description}
              onChangeText={setDescription}
            />
            <Text style={styles.label}>Photos (optional)</Text>
            <TouchableOpacity
              style={[styles.input, styles.uploadButton]}
              onPress={pickImageFromGallery}
            >
              <Text style={styles.uploadButtonText}>Select image from gallery</Text>
            </TouchableOpacity>
            <Text style={styles.helperText}>Up to 4 images can be attached.</Text>
            {imageUris.length > 0 && (
              <View style={styles.imageGrid}>
                {imageUris.map((uri, idx) => (
                  <View key={`${uri}-${idx}`} style={styles.imageWrap}>
                    <Image source={{ uri }} style={styles.previewImage} />
                    <TouchableOpacity
                      style={styles.removeBadge}
                      onPress={() => removeImageAt(idx)}
                    >
                      <Text style={styles.removeBadgeText}>X</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: tabBarHeight + 8 }]}>
        {step > 1 && step < 4 && (
          <TouchableOpacity style={styles.footerButton} onPress={goBack}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        {step < 3 && (
          <TouchableOpacity
            style={[styles.footerButton, styles.primaryButton]}
            onPress={goNext}
          >
            <Text style={styles.actionButtonText}>Next</Text>
          </TouchableOpacity>
        )}
        {step === 4 && (
          <TouchableOpacity
            style={[styles.footerButton, styles.primaryButton]}
            onPress={handleSubmit}
          >
            <Text style={styles.actionButtonText}>
              {submitting ? "Posting..." : "Post lost item"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// Styles remain the same
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#F3F6FA" },
  title: { fontSize: 22, fontWeight: "800", color: "#053668" },
  subtitle: { marginTop: 4, fontSize: 14, color: "#667085" },
  stepperRow: { flexDirection: "row", marginTop: 12, marginBottom: 8, justifyContent: "space-between" },
  stepDot: { flex: 1, height: 5, borderRadius: 999, marginHorizontal: 2, backgroundColor: "#D0D5DD" },
  stepDotActive: { backgroundColor: "#053668" },
  content: { paddingVertical: 8 },
  panel: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E4E7EC",
  },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#053668", marginBottom: 8 },
  label: { marginTop: 8, marginBottom: 4, fontSize: 13, color: "#475467" },
  input: { borderRadius: 12, borderWidth: 1, borderColor: "#D0D5DD", paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "white", fontSize: 14 },
  multilineInput: { textAlignVertical: "top", minHeight: 100 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: "#D0D5DD", backgroundColor: "white" },
  chipSelected: { backgroundColor: "#053668", borderColor: "#053668" },
  chipText: { fontSize: 13, color: "#475467" },
  chipTextSelected: { color: "white", fontWeight: "600" },
  helperText: { fontSize: 13, color: "#667085", marginBottom: 12 },
  uploadButton: {
    alignItems: "center",
    borderStyle: "dashed",
  },
  uploadButtonText: {
    color: "#053668",
    fontWeight: "700",
  },
  imageGrid: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  imageWrap: {
    position: "relative",
  },
  previewImage: {
    width: 74,
    height: 74,
    borderRadius: 10,
    backgroundColor: "#E4E7EC",
  },
  removeBadge: {
    position: "absolute",
    right: -6,
    top: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#B42318",
    alignItems: "center",
    justifyContent: "center",
  },
  removeBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "700",
  },
  mapMock: { height: 200, borderRadius: 16, backgroundColor: "#EAF2FA", overflow: "hidden" },
  mapPoint: { position: "absolute", alignItems: "center" },
  mapDot: { width: 10, height: 10, borderRadius: 999, backgroundColor: "#053668", borderWidth: 2, borderColor: "white" },
  mapLabel: { marginTop: 2, fontSize: 10, fontWeight: "600", color: "#053668" },
  decisionRow: { flexDirection: "column", gap: 10, marginTop: 16 },
  decisionButton: { paddingVertical: 12, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  primaryButton: { backgroundColor: "#053668" },
  secondaryButton: { backgroundColor: "#FFF4EB", borderWidth: 1, borderColor: "#FF7100" },
  actionButtonText: { color: "white", fontWeight: "700" },
  secondaryButtonText: { color: "#B54708", fontWeight: "700" },
  footer: { flexDirection: "row", justifyContent: "flex-end", gap: 12, paddingTop: 8 },
  footerButton: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
});