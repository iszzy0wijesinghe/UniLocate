/** @format */

import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as DocumentPicker from "expo-document-picker";

import type { EduHubStackParamList } from "../../../navigation/EduHubNavigator";
import { useUserProfileStore } from "../../../store/useUserProfileStore";
import {
  createEduHubTextNote,
  uploadEduHubNote,
} from "../services/eduhub.api";

type Props = NativeStackScreenProps<EduHubStackParamList, "AddNote">;

type SupportedNoteType = "Text" | "PDF" | "Image";

type SelectedFile = {
  uri: string;
  name: string;
  type: string;
  size?: number;
};

const noteTypes: SupportedNoteType[] = ["Text", "PDF", "Image"];

export default function AddNote({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const tabBarHeight = useBottomTabBarHeight();
  const isTablet = width >= 768;
  const horizontalPadding = isTablet ? 28 : 16;

  const userId = useUserProfileStore((state: any) => state.userId);
  const username = useUserProfileStore((state: any) => state.username);

  const [selectedType, setSelectedType] = useState<SupportedNoteType>("Text");
  const [title, setTitle] = useState("");
  const [module, setModule] = useState("");
  const [contentText, setContentText] = useState("");
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [saving, setSaving] = useState(false);

  const trimmedTitle = title.trim();
  const trimmedModule = module.trim();
  const trimmedContentText = contentText.trim();

  const isTextType = selectedType === "Text";
  const isPdfType = selectedType === "PDF";
  const isImageType = selectedType === "Image";

  const isValid = useMemo(() => {
    if (trimmedTitle.length < 3) return false;
    if (trimmedModule.length < 2) return false;

    if (isTextType) {
      return trimmedContentText.length >= 10;
    }

    return !!selectedFile;
  }, [
    trimmedTitle,
    trimmedModule,
    trimmedContentText,
    isTextType,
    selectedFile,
  ]);

  const heroTitle = useMemo(() => {
    if (isTextType) return "Create a text note";
    if (isPdfType) return "Upload a PDF note";
    return "Upload an image note";
  }, [isImageType, isPdfType, isTextType]);

  const heroSubtitle = useMemo(() => {
    if (isTextType) {
      return "Write summaries, revision notes, and academic explanations for the shared Notes Library.";
    }

    if (isPdfType) {
      return "Upload lecture handouts, PDF notes, and academic documents to share through EduHub.";
    }

    return "Upload diagrams, whiteboard captures, and note images for the shared EduHub library.";
  }, [isImageType, isPdfType, isTextType]);

  const previewDescription = useMemo(() => {
    if (isTextType) {
      if (!trimmedContentText) return "Your typed note preview will appear here.";
      return trimmedContentText.length > 180
        ? `${trimmedContentText.slice(0, 180)}...`
        : trimmedContentText;
    }

    if (!selectedFile) {
      return isPdfType
        ? "Select a PDF file to preview its upload card."
        : "Select an image file to preview its upload card.";
    }

    return selectedFile.name;
  }, [isPdfType, isTextType, selectedFile, trimmedContentText]);

  const validateBeforeSave = () => {
    if (trimmedTitle.length < 3) {
      Alert.alert(
        "Missing title",
        "Please enter a note title with at least 3 characters.",
      );
      return false;
    }

    if (trimmedModule.length < 2) {
      Alert.alert(
        "Missing module",
        "Please enter a module code or module name.",
      );
      return false;
    }

    if (isTextType && trimmedContentText.length < 10) {
      Alert.alert(
        "Missing content",
        "Please add at least 10 characters of note content.",
      );
      return false;
    }

    if (!isTextType && !selectedFile) {
      Alert.alert(
        "Missing file",
        `Please choose a ${isPdfType ? "PDF" : "image"} file before uploading.`,
      );
      return false;
    }

    if (!userId || !username?.trim()) {
      Alert.alert(
        "Account required",
        "You need to be logged in before adding a note.",
      );
      return false;
    }

    return true;
  };

  const handlePickFile = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: isPdfType ? "application/pdf" : "image/*",
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (picked.canceled) return;

      const file = picked.assets?.[0];
      if (!file?.uri) {
        Alert.alert("File error", "No file was selected.");
        return;
      }

      if (isPdfType && file.mimeType !== "application/pdf") {
        Alert.alert("Invalid file", "Please choose a PDF file.");
        return;
      }

      if (isImageType && !String(file.mimeType || "").startsWith("image/")) {
        Alert.alert("Invalid file", "Please choose an image file.");
        return;
      }

      setSelectedFile({
        uri: file.uri,
        name: file.name || (isPdfType ? "note.pdf" : "image"),
        type:
          file.mimeType ||
          (isPdfType ? "application/pdf" : "image/jpeg"),
        size: file.size,
      });
    } catch (error) {
      console.error("[eduhub] file pick failed:", error);
      Alert.alert("File error", "Could not open file picker.");
    }
  };

  const handleSave = async () => {
    if (saving) return;

    const ok = validateBeforeSave();
    if (!ok) return;

    try {
      setSaving(true);

      if (isTextType) {
        await createEduHubTextNote({
          title: trimmedTitle,
          module: trimmedModule,
          noteType: "Text",
          contentText: trimmedContentText,
          uploadedByUserId: String(userId),
          uploadedByUsername: username.trim(),
        });
      } else if (selectedFile) {
        await uploadEduHubNote({
          title: trimmedTitle,
          module: trimmedModule,
          noteType: isPdfType ? "PDF" : "Image",
          uploadedByUserId: String(userId),
          uploadedByUsername: username.trim(),
          file: {
            uri: selectedFile.uri,
            name: selectedFile.name,
            type: selectedFile.type,
          },
        });
      }

      Alert.alert(
        isTextType ? "Note saved" : "Note uploaded",
        "Your note was added to Notes Library.",
        [
          {
            text: "OK",
            onPress: () => navigation.navigate("NotesHome"),
          },
        ],
      );
    } catch (error: any) {
      console.error("[eduhub] failed to save note:", error);
      Alert.alert(
        "Save failed",
        error?.message || "Could not save the note. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const renderPreview = () => {
    if (isTextType) {
      return (
        <View style={styles.previewCard}>
          <View style={styles.previewTopRow}>
            <View style={styles.previewBadge}>
              <Text style={styles.previewBadgeText}>TEXT</Text>
            </View>
            <Text style={styles.previewMeta}>Preview</Text>
          </View>

          <Text style={styles.previewTitle}>
            {trimmedTitle || "Untitled text note"}
          </Text>
          <Text style={styles.previewModule}>
            {trimmedModule || "Module not set"}
          </Text>

          <Text style={styles.previewBody}>{previewDescription}</Text>

          <Text style={styles.previewUploader}>
            By {username?.trim() || "You"}
          </Text>
        </View>
      );
    }

    if (!selectedFile) {
      return (
        <View style={styles.previewCard}>
          <View style={styles.previewEmptyIconWrap}>
            <Ionicons
              name={isPdfType ? "document-outline" : "image-outline"}
              size={24}
              color="#98A2B3"
            />
          </View>

          <Text style={styles.previewTitle}>
            {isPdfType ? "No PDF selected yet" : "No image selected yet"}
          </Text>

          <Text style={styles.previewBody}>{previewDescription}</Text>
        </View>
      );
    }

    return (
      <View style={styles.previewCard}>
        <View style={styles.previewTopRow}>
          <View style={styles.previewBadge}>
            <Text style={styles.previewBadgeText}>{selectedType}</Text>
          </View>
          <Text style={styles.previewMeta}>Ready to upload</Text>
        </View>

        <Text style={styles.previewTitle}>
          {trimmedTitle || selectedFile.name || "Untitled upload"}
        </Text>
        <Text style={styles.previewModule}>
          {trimmedModule || "Module not set"}
        </Text>

        {isImageType ? (
          <Image source={{ uri: selectedFile.uri }} style={styles.previewImage} />
        ) : (
          <View style={styles.previewFileBox}>
            <Ionicons name="document-text-outline" size={28} color="#053668" />
            <Text style={styles.previewFileName}>{selectedFile.name}</Text>
          </View>
        )}

        <Text style={styles.previewUploader}>
          By {username?.trim() || "You"}
        </Text>
      </View>
    );
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
        ]}>
        <ScrollView
          contentContainerStyle={[
            styles.contentContainer,
            { paddingHorizontal: horizontalPadding },
          ]}
          showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <Pressable
              style={styles.backBtn}
              onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color="#053668" />
            </Pressable>

            <Text style={styles.headerTitle}>Add Note</Text>

            <View style={styles.headerSpacer} />
          </View>

          <LinearGradient
            colors={["#053668", "#07427F", "#053668"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroIconWrap}>
                <Ionicons
                  name={
                    isTextType
                      ? "document-text-outline"
                      : isPdfType
                        ? "document-outline"
                        : "image-outline"
                  }
                  size={26}
                  color="#053668"
                />
              </View>

              <View style={styles.heroTextWrap}>
                <Text style={styles.heroEyebrow}>EduHub Notes</Text>
                <Text style={styles.heroTitle}>{heroTitle}</Text>
                <Text style={styles.heroSubtitle}>{heroSubtitle}</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.formCard}>
            <Text style={styles.sectionLabel}>Note type</Text>
            <View style={styles.typeWrap}>
              {noteTypes.map((type) => {
                const active = selectedType === type;

                return (
                  <Pressable
                    key={type}
                    style={[styles.typeChip, active && styles.typeChipActive]}
                    onPress={() => {
                      setSelectedType(type);
                      setSelectedFile(null);
                    }}>
                    <Text
                      style={[
                        styles.typeChipText,
                        active && styles.typeChipTextActive,
                      ]}>
                      {type}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={
                isTextType
                  ? "Ex: Database Normalization Summary"
                  : isPdfType
                    ? "Ex: Week 05 Lecture PDF"
                    : "Ex: ER Diagram Whiteboard Image"
              }
              placeholderTextColor="#98A2B3"
              style={styles.input}
            />

            <Text style={styles.sectionLabel}>Module</Text>
            <TextInput
              value={module}
              onChangeText={setModule}
              placeholder="Ex: IT3030"
              placeholderTextColor="#98A2B3"
              style={styles.input}
              autoCapitalize="characters"
            />

            {isTextType ? (
              <>
                <Text style={styles.sectionLabel}>Content</Text>
                <TextInput
                  value={contentText}
                  onChangeText={setContentText}
                  placeholder="Paste or type your note content here..."
                  placeholderTextColor="#98A2B3"
                  style={[styles.input, styles.contentInput]}
                  multiline
                  textAlignVertical="top"
                />
              </>
            ) : (
              <>
                <Text style={styles.sectionLabel}>
                  {isPdfType ? "PDF file" : "Image file"}
                </Text>

                <Pressable style={styles.uploadPickerCard} onPress={handlePickFile}>
                  <View style={styles.uploadPickerIconWrap}>
                    <Ionicons
                      name={isPdfType ? "cloud-upload-outline" : "image-outline"}
                      size={22}
                      color="#053668"
                    />
                  </View>

                  <View style={styles.uploadPickerTextWrap}>
                    <Text style={styles.uploadPickerTitle}>
                      {selectedFile
                        ? "Change selected file"
                        : isPdfType
                          ? "Choose PDF file"
                          : "Choose image file"}
                    </Text>
                    <Text style={styles.uploadPickerSubtitle}>
                      {selectedFile
                        ? selectedFile.name
                        : isPdfType
                          ? "Upload academic PDF material"
                          : "Upload note images, diagrams, or captures"}
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="#98A2B3"
                  />
                </Pressable>
              </>
            )}

            <Text style={styles.sectionLabel}>Preview</Text>
            {renderPreview()}

            <View style={styles.infoCard}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color="#C2410C"
              />
              <Text style={styles.infoText}>
                Text notes are published with title, module, and full content.
                PDF and image notes are uploaded securely and shown with a file
                preview before publishing.
              </Text>
            </View>

            <View style={styles.actionsRow}>
              <Pressable
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() => navigation.goBack()}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.actionButton,
                  styles.primaryButton,
                  (!isValid || saving) && styles.primaryButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={!isValid || saving}>
                <Ionicons
                  name={isTextType ? "save-outline" : "cloud-upload-outline"}
                  size={16}
                  color="#FFFFFF"
                />
                <Text style={styles.primaryButtonText}>
                  {saving
                    ? isTextType
                      ? "Saving..."
                      : "Uploading..."
                    : isTextType
                      ? "Publish Note"
                      : "Upload Note"}
                </Text>
              </Pressable>
            </View>
          </View>
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
  contentInput: {
    height: 180,
    paddingTop: 14,
    paddingBottom: 14,
  },

  uploadPickerCard: {
    minHeight: 74,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F8FAFC",
    padding: 14,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  uploadPickerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#EDF3F8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  uploadPickerTextWrap: {
    flex: 1,
  },
  uploadPickerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  uploadPickerSubtitle: {
    marginTop: 4,
    fontSize: 12.5,
    lineHeight: 18,
    color: "#667085",
  },

  previewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 14,
  },
  previewTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  previewBadge: {
    backgroundColor: "#EDF3F8",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  previewBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#053668",
  },
  previewMeta: {
    fontSize: 12,
    fontWeight: "700",
    color: "#98A2B3",
  },
  previewTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  previewModule: {
    marginTop: 4,
    fontSize: 13,
    color: "#667085",
    fontWeight: "700",
  },
  previewBody: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    color: "#667085",
  },
  previewUploader: {
    marginTop: 12,
    fontSize: 12,
    color: "#053668",
    fontWeight: "700",
  },
  previewEmptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  previewFileBox: {
    marginTop: 12,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  previewFileName: {
    marginTop: 8,
    fontSize: 12.5,
    fontWeight: "700",
    color: "#053668",
    textAlign: "center",
  },
  previewImage: {
    width: "100%",
    height: 190,
    borderRadius: 16,
    marginTop: 12,
    backgroundColor: "#F3F4F6",
  },

  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 18,
    padding: 14,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
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