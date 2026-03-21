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
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";

import type {
  LostFoundStackParamList,
  LostFoundStackScreenProps,
} from "../../navigation/LostFoundStack";
import {
  createLostFoundPost,
  deleteLostFoundPost,
  getMockLocationTrail,
  type ItemCategory,
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

  const [step, setStep] = useState<Step>(1);
  const [category, setCategory] = useState<ItemCategory>("ID Card");
  const [title, setTitle] = useState("");
  const [timeHint, setTimeHint] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl1, setImageUrl1] = useState("");
  const [imageUrl2, setImageUrl2] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [approxDateTime, setApproxDateTime] = useState<Date | null>(null);
  const [createdPostId, setCreatedPostId] = useState<string | null>(null);

  const locationTrail = getMockLocationTrail();

  const goNext = () => {
    if (step < 4) setStep((s) => ((s + 1) as Step));
  };

  const goBack = () => {
    if (step > 1) setStep((s) => ((s - 1) as Step));
  };

  // Submit lost item
  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const post = await createLostFoundPost({
        type: "lost",
        category,
        title,
        description,
        timeHint,
        images: [imageUrl1, imageUrl2].filter((u) => u.trim().length > 0),
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
    if (!createdPostId) return;
    try {
      await deleteLostFoundPost(createdPostId);
      setSubmitted(true);
      setCreatedPostId(null);
    } catch (err) {
      console.error(err);
    }
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
      <Text style={styles.title}>I lost an item</Text>
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

      <ScrollView contentContainerStyle={styles.content}>
        {/* Step 1: Item Identification */}
        {step === 1 && (
          <View>
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
          <View>
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
          <View>
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
          <View>
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
            <Text style={styles.label}>Image URL 1 (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="https://example.com/image1.jpg"
              value={imageUrl1}
              onChangeText={setImageUrl1}
            />
            <Text style={styles.label}>Image URL 2 (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="https://example.com/image2.jpg"
              value={imageUrl2}
              onChangeText={setImageUrl2}
            />
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
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
  container: { flex: 1, padding: 16, backgroundColor: "#f5f5f9" },
  title: { fontSize: 20, fontWeight: "700", color: "#111827" },
  subtitle: { marginTop: 4, fontSize: 14, color: "#6b7280" },
  stepperRow: { flexDirection: "row", marginTop: 12, marginBottom: 8, justifyContent: "space-between" },
  stepDot: { flex: 1, height: 4, borderRadius: 999, marginHorizontal: 2, backgroundColor: "#e5e7eb" },
  stepDotActive: { backgroundColor: "#2563eb" },
  content: { paddingVertical: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#111827", marginBottom: 8 },
  label: { marginTop: 8, marginBottom: 4, fontSize: 13, color: "#4b5563" },
  input: { borderRadius: 10, borderWidth: 1, borderColor: "#d1d5db", paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "white", fontSize: 14 },
  multilineInput: { textAlignVertical: "top", minHeight: 100 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: "#d1d5db", backgroundColor: "white" },
  chipSelected: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  chipText: { fontSize: 13, color: "#4b5563" },
  chipTextSelected: { color: "white", fontWeight: "600" },
  helperText: { fontSize: 13, color: "#6b7280", marginBottom: 12 },
  mapMock: { height: 200, borderRadius: 16, backgroundColor: "#dbeafe", overflow: "hidden" },
  mapPoint: { position: "absolute", alignItems: "center" },
  mapDot: { width: 10, height: 10, borderRadius: 999, backgroundColor: "#2563eb", borderWidth: 2, borderColor: "white" },
  mapLabel: { marginTop: 2, fontSize: 10, fontWeight: "600", color: "#1e40af" },
  decisionRow: { flexDirection: "column", gap: 10, marginTop: 16 },
  decisionButton: { paddingVertical: 12, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  primaryButton: { backgroundColor: "#2563eb" },
  secondaryButton: { backgroundColor: "#e5edff", borderWidth: 1, borderColor: "#2563eb" },
  actionButtonText: { color: "white", fontWeight: "600" },
  secondaryButtonText: { color: "#2563eb", fontWeight: "600" },
  footer: { flexDirection: "row", justifyContent: "flex-end", gap: 12, paddingTop: 8 },
  footerButton: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999 },
});