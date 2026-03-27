/** @format */

import React from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { useUserProfileStore } from "../../store/useUserProfileStore";
import type { SettingsStackParamList } from "../../navigation/SettingsNavigator";

type Props = NativeStackScreenProps<SettingsStackParamList, "EditUsername">;

export default function EditUsername({ navigation }: Props) {
  const username = useUserProfileStore((state) => state.username);
  const setUsername = useUserProfileStore((state) => state.setUsername);

  const [draftUsername, setDraftUsername] = React.useState(username ?? "");

  const handleSave = () => {
    const trimmedUsername = draftUsername.trim();

    if (!trimmedUsername) {
      Alert.alert("Username required", "Please enter a username before saving.");
      return;
    }

    if (trimmedUsername.length < 2) {
      Alert.alert(
        "Username too short",
        "Please choose a username with at least 2 characters.",
      );
      return;
    }

    setUsername(trimmedUsername);
    Alert.alert("Saved", "Your username has been updated.");
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.logoWrap}>
          <Image
            source={require("../../assets/images/UniLocateLogo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#053668" />
          </Pressable>
          <Text style={styles.headerTitle}>Edit Username</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Profile</Text>
          <Text style={styles.heroTitle}>Update your app name</Text>
          <Text style={styles.heroSubtitle}>
            This is the name shown across UniLocate, including the home screen
            greeting and other profile-related areas.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Username</Text>
          <Text style={styles.helpText}>
            Keep it short, simple, and easy to recognize.
          </Text>

          <TextInput
            value={draftUsername}
            onChangeText={setDraftUsername}
            placeholder="Enter username"
            placeholderTextColor="#98A2B3"
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={24}
          />

          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>Preview</Text>
            <Text style={styles.previewValue}>
              {draftUsername.trim() ? draftUsername.trim() : "Campus User"}
            </Text>
          </View>

          <View style={styles.actionRow}>
            <Pressable
              style={[styles.button, styles.secondaryButton]}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={[styles.button, styles.primaryButton]}
              onPress={handleSave}
            >
              <Text style={styles.primaryButtonText}>Save Changes</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 14,
  },
  logo: {
    width: 210,
    height: 64,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  backButton: {
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
    backgroundColor: "#053668",
    borderRadius: 28,
    padding: 22,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    color: "#CCE2E8",
    letterSpacing: 0.8,
  },
  heroTitle: {
    marginTop: 10,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  heroSubtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: "#DCEEF2",
  },
  sectionCard: {
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  helpText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: "#667085",
  },
  input: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    color: "#111827",
    fontSize: 15,
  },
  previewCard: {
    marginTop: 16,
    borderRadius: 18,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    color: "#98A2B3",
  },
  previewValue: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "800",
    color: "#053668",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 22,
  },
  button: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    backgroundColor: "#FF7100",
  },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#053668",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryButtonText: {
    color: "#053668",
    fontSize: 14,
    fontWeight: "700",
  },
});