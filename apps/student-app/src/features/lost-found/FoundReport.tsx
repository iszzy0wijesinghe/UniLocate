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
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import type {
  LostFoundStackParamList,
  LostFoundStackScreenProps,
} from "../../navigation/LostFoundStack";
import DateTimePicker from "@react-native-community/datetimepicker";
import { scheduleFinderNotification } from "../../notifications";
import * as ImagePicker from "expo-image-picker";

type FoundRoute = RouteProp<LostFoundStackParamList, "FoundReport">;
type Navigation = LostFoundStackScreenProps<"FoundReport">["navigation"];

export default function FoundReport() {
  const route = useRoute<FoundRoute>();
  const navigation = useNavigation<Navigation>();
  const tabBarHeight = useBottomTabBarHeight();

  const [placeFound, setPlaceFound] = useState("");
  const [description, setDescription] = useState("");
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [whenFound, setWhenFound] = useState<Date | null>(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const onChangeDate = (_: any, selected?: Date) => {
    setShowPicker(false);
    if (selected) {
      setWhenFound(selected);
    }
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
        return [...prev, result.assets[0].uri];
      });
    }
  };

  const removeImageAt = (idx: number) => {
    setImageUris((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    const lines: string[] = [];
    if (placeFound.trim()) {
      lines.push(`Place found: ${placeFound.trim()}`);
    }
    if (whenFound) {
      lines.push(`Time found: ${whenFound.toLocaleString()}`);
    }
    if (description.trim()) {
      lines.push(`Finder description: ${description.trim()}`);
    }
    if (imageUris.length > 0) {
      lines.push(`Attached photos: ${imageUris.length}`);
    }

    const initialMessage =
      lines.length > 0
        ? `Hi, I found an item that may be yours:\n\n${lines.join(
            "\n"
          )}\n\nCan you confirm some details to verify ownership?`
        : "Hi, I found an item that may be yours. Can you confirm some details to verify ownership?";

    await scheduleFinderNotification(route.params.postTitle ?? "your item");

    navigation.navigate("Chat", {
      postId: route.params.postId,
      initialMessage,
    });
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
          onPress={() => setShowPicker(true)}
        >
          <Text style={styles.pickerButtonText}>
            {whenFound
              ? whenFound.toLocaleString()
              : "Select date & time from calendar"}
          </Text>
        </TouchableOpacity>
        {showPicker && (
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
          <Text style={styles.footerButtonText}>Send to owner & open chat</Text>
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

