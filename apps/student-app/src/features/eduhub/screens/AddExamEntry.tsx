/** @format */

import React, { useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { EduHubStackParamList } from "../../../navigation/EduHubNavigator";
import { useUserProfileStore } from "../../../store/useUserProfileStore";
import {
  createEduHubExamEntry,
} from "../services/examMode.api";
import type { CreateEduHubExamEntryInput, EduHubExamType } from "../types/examMode";

type Props = NativeStackScreenProps<EduHubStackParamList, "AddExamEntry">;

const examTypes: EduHubExamType[] = [
  "Mock Exam",
  "Mid Exam",
  "Spot Test",
  "Practical Test",
  "Viva",
  "Presentation",
  "Final Exam",
  "Repeat Exam",
];

function formatDateForInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatTimeForInput(date: Date) {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString();
}

function formatTimeLabel(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTodayStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getMaxAllowedDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
}

export default function AddExamEntry({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const tabBarHeight = useBottomTabBarHeight();
  const isTablet = width >= 768;
  const horizontalPadding = isTablet ? 28 : 16;

  const userId = useUserProfileStore((state: any) => state.userId);
  const username = useUserProfileStore((state: any) => state.username);

  const [semester, setSemester] = useState("Year 1 - Semester 1");
  const [examType, setExamType] = useState<EduHubExamType>("Mid Exam");
  const [moduleCode, setModuleCode] = useState("");
  const [moduleName, setModuleName] = useState("");
  const [sessionNumber, setSessionNumber] = useState("");
  const [seatNumber, setSeatNumber] = useState("");
  const [venue, setVenue] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const todayStart = useMemo(() => getTodayStart(), []);
  const maxAllowedDate = useMemo(() => getMaxAllowedDate(), []);

  const initialDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d;
  }, []);

  const initialStartTime = useMemo(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  }, []);

  const initialEndTime = useMemo(() => {
    const d = new Date();
    d.setHours(11, 0, 0, 0);
    return d;
  }, []);

  const [examDateObj, setExamDateObj] = useState(initialDate);
  const [startTimeObj, setStartTimeObj] = useState(initialStartTime);
  const [endTimeObj, setEndTimeObj] = useState(initialEndTime);

  const [showExamDatePicker, setShowExamDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const examDate = formatDateForInput(examDateObj);
  const startTime = formatTimeForInput(startTimeObj);
  const endTime = formatTimeForInput(endTimeObj);

  const trimmedSemester = semester.trim();
  const trimmedModuleCode = moduleCode.trim().toUpperCase();
  const trimmedModuleName = moduleName.trim();
  const trimmedSessionNumber = sessionNumber.trim();
  const trimmedSeatNumber = seatNumber.trim();
  const trimmedVenue = venue.trim();
  const trimmedNotes = notes.trim();

  const isFutureDateValid =
    examDateObj >= todayStart && examDateObj <= maxAllowedDate;

  const startDateTime = useMemo(() => {
    const d = new Date(examDateObj);
    d.setHours(startTimeObj.getHours(), startTimeObj.getMinutes(), 0, 0);
    return d;
  }, [examDateObj, startTimeObj]);

  const endDateTime = useMemo(() => {
    const d = new Date(examDateObj);
    d.setHours(endTimeObj.getHours(), endTimeObj.getMinutes(), 0, 0);
    return d;
  }, [examDateObj, endTimeObj]);

  const isTimeRangeValid = endDateTime.getTime() > startDateTime.getTime();

  const isValid =
    trimmedSemester.length >= 3 &&
    trimmedModuleCode.length >= 2 &&
    trimmedModuleName.length >= 3 &&
    isFutureDateValid &&
    isTimeRangeValid;

  const handleExamDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    setShowExamDatePicker(false);

    if (event.type === "dismissed" || !selectedDate) {
      return;
    }

    const pickedDate = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
    );

    if (pickedDate < todayStart) {
      Alert.alert("Invalid date", "Please select today or a future date.");
      return;
    }

    if (pickedDate > maxAllowedDate) {
      Alert.alert(
        "Date too far",
        "You can only select exam dates within the next 3 months.",
      );
      return;
    }

    setExamDateObj(pickedDate);
  };

  const handleStartTimeChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    setShowStartTimePicker(false);

    if (event.type === "dismissed" || !selectedDate) {
      return;
    }

    setStartTimeObj(selectedDate);
  };

  const handleEndTimeChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    setShowEndTimePicker(false);

    if (event.type === "dismissed" || !selectedDate) {
      return;
    }

    setEndTimeObj(selectedDate);
  };

  const handleSave = async () => {
    if (saving) return;

    if (trimmedSemester.length < 3) {
      Alert.alert("Missing semester", "Please enter the semester.");
      return;
    }

    if (trimmedModuleCode.length < 2) {
      Alert.alert("Missing module code", "Please enter the module code.");
      return;
    }

    if (trimmedModuleName.length < 3) {
      Alert.alert("Missing module name", "Please enter the module name.");
      return;
    }

    if (!isFutureDateValid) {
      Alert.alert(
        "Invalid exam date",
        "Please select a future exam date within the next 3 months.",
      );
      return;
    }

    if (!isTimeRangeValid) {
      Alert.alert(
        "Invalid time range",
        "End time must be later than the start time.",
      );
      return;
    }

    if (!userId || !username?.trim()) {
      Alert.alert(
        "Account required",
        "You need to be logged in before adding an exam entry.",
      );
      return;
    }

    try {
      setSaving(true);

      const payload: CreateEduHubExamEntryInput = {
        semester: trimmedSemester,
        examType,
        moduleCode: trimmedModuleCode,
        moduleName: trimmedModuleName,
        examDate,
        startTime,
        endTime,
        sessionNumber: trimmedSessionNumber || undefined,
        seatNumber: trimmedSeatNumber || undefined,
        venue: trimmedVenue || undefined,
        notes: trimmedNotes || undefined,
        uploadedByUserId: String(userId),
        uploadedByUsername: username.trim(),
      };

      await createEduHubExamEntry(payload);

      Alert.alert("Saved", "Your exam entry was added successfully.", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      console.error("[exam-mode] failed to create exam entry:", error);
      Alert.alert(
        "Save failed",
        error?.message || "Could not save the exam entry. Please try again.",
      );
    } finally {
      setSaving(false);
    }
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
          <View style={styles.headerRow}>
            <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color="#053668" />
            </Pressable>

            <Text style={styles.headerTitle}>Add Exam Entry</Text>

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
                <Ionicons name="calendar-outline" size={26} color="#053668" />
              </View>

              <View style={styles.heroTextWrap}>
                <Text style={styles.heroEyebrow}>Exam Mode</Text>
                <Text style={styles.heroTitle}>Create exam timetable entry</Text>
                <Text style={styles.heroSubtitle}>
                  Add your exam details to unlock countdowns, grouped timetables,
                  and future smart revision support.
                </Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.formCard}>
            <Text style={styles.sectionLabel}>Semester</Text>
            <TextInput
              value={semester}
              onChangeText={setSemester}
              placeholder="Ex: Year 2 - Semester 1"
              placeholderTextColor="#98A2B3"
              style={styles.input}
            />

            <Text style={styles.sectionLabel}>Exam type</Text>
            <View style={styles.typeWrap}>
              {examTypes.map((type) => {
                const active = examType === type;

                return (
                  <Pressable
                    key={type}
                    style={[styles.typeChip, active && styles.typeChipActive]}
                    onPress={() => setExamType(type)}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        active && styles.typeChipTextActive,
                      ]}
                    >
                      {type}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>Module code</Text>
            <TextInput
              value={moduleCode}
              onChangeText={setModuleCode}
              placeholder="Ex: IT3030"
              placeholderTextColor="#98A2B3"
              style={styles.input}
              autoCapitalize="characters"
            />

            <Text style={styles.sectionLabel}>Module name</Text>
            <TextInput
              value={moduleName}
              onChangeText={setModuleName}
              placeholder="Ex: Database Systems"
              placeholderTextColor="#98A2B3"
              style={styles.input}
            />

            <Text style={styles.sectionLabel}>Exam date</Text>
            <Pressable
              style={styles.pickerButton}
              onPress={() => setShowExamDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={18} color="#053668" />
              <Text style={styles.pickerButtonText}>
                {formatDateLabel(examDateObj)}
              </Text>
            </Pressable>

            <Text style={styles.helperText}>
              Only future dates are allowed, up to 3 months from today.
            </Text>

            <Text style={styles.sectionLabel}>Start time</Text>
            <Pressable
              style={styles.pickerButton}
              onPress={() => setShowStartTimePicker(true)}
            >
              <Ionicons name="time-outline" size={18} color="#053668" />
              <Text style={styles.pickerButtonText}>
                {formatTimeLabel(startTimeObj)}
              </Text>
            </Pressable>

            <Text style={styles.sectionLabel}>End time</Text>
            <Pressable
              style={styles.pickerButton}
              onPress={() => setShowEndTimePicker(true)}
            >
              <Ionicons name="time-outline" size={18} color="#053668" />
              <Text style={styles.pickerButtonText}>
                {formatTimeLabel(endTimeObj)}
              </Text>
            </Pressable>

            <Text style={styles.sectionLabel}>Session number</Text>
            <TextInput
              value={sessionNumber}
              onChangeText={setSessionNumber}
              placeholder="Ex: Session 02"
              placeholderTextColor="#98A2B3"
              style={styles.input}
            />

            <Text style={styles.sectionLabel}>Seat number</Text>
            <TextInput
              value={seatNumber}
              onChangeText={setSeatNumber}
              placeholder="Ex: A-17"
              placeholderTextColor="#98A2B3"
              style={styles.input}
            />

            <Text style={styles.sectionLabel}>Venue</Text>
            <TextInput
              value={venue}
              onChangeText={setVenue}
              placeholder="Ex: Main Hall"
              placeholderTextColor="#98A2B3"
              style={styles.input}
            />

            <Text style={styles.sectionLabel}>Notes</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional note for this exam entry..."
              placeholderTextColor="#98A2B3"
              style={[styles.input, styles.notesInput]}
              multiline
              textAlignVertical="top"
            />

            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>Quick preview</Text>
              <Text style={styles.previewText}>
                {trimmedModuleCode || "MODULE"} • {trimmedModuleName || "Module Name"}
              </Text>
              <Text style={styles.previewSubText}>{examType}</Text>
              <Text style={styles.previewSubText}>
                {formatDateLabel(examDateObj)} • {formatTimeLabel(startTimeObj)} -{" "}
                {formatTimeLabel(endTimeObj)}
              </Text>
            </View>

            <View style={styles.actionsRow}>
              <Pressable
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.actionButton,
                  styles.primaryButton,
                  (!isValid || saving) && styles.primaryButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={!isValid || saving}
              >
                <Ionicons name="save-outline" size={16} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>
                  {saving ? "Saving..." : "Save Exam"}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>

        {showExamDatePicker ? (
          <DateTimePicker
            value={examDateObj}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            minimumDate={todayStart}
            maximumDate={maxAllowedDate}
            onChange={handleExamDateChange}
          />
        ) : null}

        {showStartTimePicker ? (
          <DateTimePicker
            value={startTimeObj}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleStartTimeChange}
          />
        ) : null}

        {showEndTimePicker ? (
          <DateTimePicker
            value={endTimeObj}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleEndTimeChange}
          />
        ) : null}
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
  screen: {
    flex: 1,
  },
  contentContainer: {
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
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    color: "#CCE2E8",
    letterSpacing: 0.8,
  },
  heroTitle: {
    marginTop: 8,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#DCEEF2",
  },

  formCard: {
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
  },
  sectionLabel: {
    marginTop: 2,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "800",
    color: "#053668",
  },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#111827",
    marginBottom: 14,
  },
  notesInput: {
    height: 110,
    paddingTop: 14,
    paddingBottom: 14,
  },

  pickerButton: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pickerButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  helperText: {
    marginBottom: 14,
    fontSize: 12,
    lineHeight: 18,
    color: "#667085",
  },

  typeWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  typeChip: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  typeChipActive: {
    backgroundColor: "#FFF1E7",
    borderColor: "#FED7AA",
  },
  typeChipText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#053668",
  },
  typeChipTextActive: {
    color: "#C2410C",
  },

  previewCard: {
    marginTop: 4,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 18,
    padding: 14,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#9A3412",
    marginBottom: 6,
  },
  previewText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  previewSubText: {
    marginTop: 4,
    fontSize: 12.5,
    lineHeight: 18,
    color: "#9A3412",
    fontWeight: "600",
  },

  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  actionButton: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#053668",
  },
  primaryButton: {
    flex: 1.2,
    backgroundColor: "#053668",
  },
  primaryButtonDisabled: {
    opacity: 0.55,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});