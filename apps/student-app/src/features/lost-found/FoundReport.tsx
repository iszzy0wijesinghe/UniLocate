import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";

import type {
  LostFoundStackParamList,
  LostFoundStackScreenProps,
} from "../../navigation/LostFoundStack";
import DateTimePicker from "@react-native-community/datetimepicker";
import { scheduleFinderNotification } from "../../notifications";

type FoundRoute = RouteProp<LostFoundStackParamList, "FoundReport">;
type Navigation = LostFoundStackScreenProps<"FoundReport">["navigation"];

export default function FoundReport() {
  const route = useRoute<FoundRoute>();
  const navigation = useNavigation<Navigation>();

  const [placeFound, setPlaceFound] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl1, setImageUrl1] = useState("");
  const [imageUrl2, setImageUrl2] = useState("");
  const [whenFound, setWhenFound] = useState<Date | null>(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const onChangeDate = (_: any, selected?: Date) => {
    setShowPicker(false);
    if (selected) {
      setWhenFound(selected);
    }
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
    // We deliberately do NOT include image URLs in the chat text,
    // only in the pictures the finder may share separately later.

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

      <ScrollView contentContainerStyle={styles.content}>
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
      </ScrollView>

      <View style={styles.footer}>
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
    backgroundColor: "#f5f5f9",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: "#6b7280",
  },
  content: {
    paddingVertical: 16,
  },
  label: {
    marginTop: 12,
    marginBottom: 4,
    fontSize: 13,
    color: "#4b5563",
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "white",
    fontSize: 14,
  },
  multilineInput: {
    textAlignVertical: "top",
    minHeight: 100,
  },
  pickerButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
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
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    backgroundColor: "#2563eb",
  },
  footerButtonText: {
    color: "white",
    fontWeight: "600",
  },
});

