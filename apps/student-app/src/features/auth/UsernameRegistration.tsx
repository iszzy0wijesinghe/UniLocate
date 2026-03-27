/** @format */

import React from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useUserProfileStore } from "../../store/useUserProfileStore";
import type { FirstRunStackParamList } from "../../navigation/FirstRunNavigator";

type Props = NativeStackScreenProps<
  FirstRunStackParamList,
  "UsernameRegistration"
>;

export default function UsernameRegistration({ navigation }: Props) {
  const [username, setUsername] = React.useState("");
  const [acceptedPrivacy, setAcceptedPrivacy] = React.useState(false);

  const setUsernameInStore = useUserProfileStore((state) => state.setUsername);

  const handleContinue = () => {
    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      Alert.alert("Username required", "Please enter a username to continue.");
      return;
    }

    if (!acceptedPrivacy) {
      Alert.alert(
        "Privacy policy required",
        "Please accept the privacy policy to continue.",
      );
      return;
    }

    setUsernameInStore(trimmedUsername);
    navigation.navigate("Calibration");
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

        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Create your profile</Text>
          <Text style={styles.heroTitle}>Choose a username</Text>
          <Text style={styles.heroSubtitle}>
            UniLocate does not require your real name, email, or student ID.
            Pick a simple username to personalize your app experience.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Username</Text>
          <Text style={styles.helpText}>
            This name is used only inside the app experience. Keep it simple and
            easy to recognize.
          </Text>

          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username"
            placeholderTextColor="#98A2B3"
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={24}
          />

          <View style={styles.policyCard}>
            <View style={styles.policyHeader}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color="#053668"
              />
              <Text style={styles.policyTitle}>Privacy policy</Text>
            </View>

            <Text style={styles.policyText}>
              UniLocate uses campus-only device data to support map guidance,
              lost & found, and anonymous complaints. Personal identity details
              are not required for core use.
            </Text>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>
                I agree to the privacy policy
              </Text>
              <Switch
                value={acceptedPrivacy}
                onValueChange={setAcceptedPrivacy}
                trackColor={{ false: "#D0D5DD", true: "#FCC9AE" }}
                thumbColor={acceptedPrivacy ? "#FF7100" : "#FFFFFF"}
              />
            </View>
          </View>

          <View style={styles.actionRow}>
            <Pressable
              style={[styles.button, styles.secondaryButton]}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.secondaryButtonText}>Back</Text>
            </Pressable>

            <Pressable
              style={[styles.button, styles.primaryButton]}
              onPress={handleContinue}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
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
    paddingBottom: 36,
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 14,
  },
  logo: {
    width: 220,
    height: 80,
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
  policyCard: {
    marginTop: 18,
    borderRadius: 18,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
  },
  policyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  policyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#053668",
  },
  policyText: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 20,
    color: "#667085",
  },
  toggleRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    justifyContent: "space-between",
  },
  toggleLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
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