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

import type {
  LostFoundStackParamList,
  LostFoundStackScreenProps,
} from "../../navigation/LostFoundStack";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { scheduleOwnerNotification } from "../../notifications";
import * as ImagePicker from "expo-image-picker";
import { submitFounderReport, uploadLostFoundImage } from "./lostFound.api";

type FoundRoute = RouteProp<LostFoundStackParamList, "FoundReport">;
type Navigation = LostFoundStackScreenProps<"FoundReport">["navigation"];

export default function FoundReport() {
  const route = useRoute<FoundRoute>();
  const navigation = useNavigation<Navigation>();
  const tabBarHeight = useBottomTabBarHeight();

  const [placeFound, setPlaceFound] = useState("");
  const [description, setDescription] = useState("");
  const [imageUris, setImageUris] = useState<string[]>([]);
const [whenFound, setWhenFound] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onChangeDate = (_: any, selected?: Date) => {
    setShowPicker(false);
    if (selected) {
      setWhenFound(selected);
    }
  };

  const openAndroidDateTimePicker = () => {
    const base = whenFound ?? new Date();
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
            setWhenFound(final);
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

const handleSubmit = async () => {
  // ✅ Place validation
  if (!placeFound.trim()) {
    Alert.alert("Location required", "Please enter where you found the item.");
    return;
  }

  if (placeFound.trim().length < 3) {
    Alert.alert("Invalid location", "Please enter a more specific location.");
    return;
  }

  // ✅ Date validation (optional logic improvement)
  if (!whenFound) {
    Alert.alert("Date & Time required", "Please select when you found the item.");
    return;
  }

  try {
    setSubmitting(true);

    const uploadedImageUrls: string[] = [];
    for (const uri of imageUris) {
      const url = await uploadLostFoundImage(uri);
      uploadedImageUrls.push(url);
    }

    await submitFounderReport(route.params.postId, {
      placeFound: placeFound.trim(),
      whenFound: whenFound.toISOString(),
      description: description.trim() || undefined,
      imageUrls: uploadedImageUrls,
    });

    await scheduleOwnerNotification(route.params.postTitle ?? "your item");

    navigation.navigate("Chat", {
      postId: route.params.postId,
      viewerRole: "finder",
      postTitle: route.params.postTitle,
    });
  } catch (e) {
    Alert.alert("Could not submit", (e as Error).message);
  } finally {
    setSubmitting(false);
  }
};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>I found this item</Text>
      <Text style={styles.subtitle}>
        Share details so the owner can confirm it is really theirs. These
        details are visible only in secure chat.
      </Text>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.label}>Where did you find it?</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Near the main library entrance"
          value={placeFound}
          onChangeText={setPlaceFound}
        />

        <Text style={styles.label}>When did you find it?</Text>
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => {
            if (Platform.OS === "android") {
              openAndroidDateTimePicker();
              return;
            }
            setShowPicker(true);
          }}
        >
          <Text style={styles.pickerButtonText}>
            {whenFound
              ? whenFound.toLocaleString()
              : "Select date & time from calendar"}
          </Text>
        </TouchableOpacity>
        {Platform.OS !== "android" && showPicker && (
          <DateTimePicker
            value={whenFound ?? new Date()}
            mode="datetime"
            display="default"
            onChange={onChangeDate}
          />
        )}

        <Text style={styles.label}>Extra description (optional)</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          multiline
          numberOfLines={4}
          placeholder="Describe colours, marks, or anything unique about the item."
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
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: tabBarHeight + 8 }]}>
        <TouchableOpacity
          style={[styles.footerButton, styles.primaryButton]}
          onPress={handleSubmit}
        >
          <Text style={styles.footerButtonText}>
            {submitting ? "Sending..." : "Send to owner & open chat"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#F3F6FA",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#053668",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: "#667085",
  },
  content: {
    paddingVertical: 16,
  },
  label: {
    marginTop: 12,
    marginBottom: 4,
    fontSize: 13,
    color: "#475467",
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "white",
    fontSize: 14,
  },
  multilineInput: {
    textAlignVertical: "top",
    minHeight: 100,
  },
  helperText: {
    marginTop: 6,
    color: "#667085",
    fontSize: 12,
  },
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
  pickerButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "white",
  },
  pickerButtonText: {
    fontSize: 14,
    color: "#111827",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  footerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    backgroundColor: "#053668",
  },
  footerButtonText: {
    color: "white",
    fontWeight: "700",
  },
});

