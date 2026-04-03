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
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { useUserProfileStore } from "../../store/useUserProfileStore";
import type { SettingsStackParamList } from "../../navigation/SettingsNavigator";
import {
  checkUsernameAvailability,
  updateAccountDetails,
  resetPassword,
} from "../../services/api/auth";

type Props = NativeStackScreenProps<SettingsStackParamList, "EditUsername">;

function getPasswordChecks(password: string, confirmPassword: string) {
  return {
    minLength: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
    match: password.length > 0 && password === confirmPassword,
  };
}

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return "Weak";
  if (score <= 4) return "Normal";
  return "Strong";
}

export default function EditUsername({ navigation }: Props) {
  const userId = useUserProfileStore((state: any) => state.userId);
  const username = useUserProfileStore((state) => state.username);
  const setUserProfile = useUserProfileStore((state) => state.setUserProfile);

  const [draftUsername, setDraftUsername] = React.useState(username ?? "");
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const [saving, setSaving] = React.useState(false);

  const [usernameStatus, setUsernameStatus] = React.useState<
    "idle" | "checking" | "valid" | "invalid"
  >("idle");
  const [usernameMessage, setUsernameMessage] = React.useState("");

  const trimmedUsername = draftUsername.trim();
  const usernameIsClean = /^[A-Za-z0-9_]*$/.test(draftUsername);
  const passwordChecks = getPasswordChecks(newPassword, confirmPassword);
  const passwordStrength = getPasswordStrength(newPassword);

  const wantsPasswordReset =
    currentPassword.length > 0 ||
    newPassword.length > 0 ||
    confirmPassword.length > 0;

  React.useEffect(() => {
    if (!trimmedUsername) {
      setUsernameStatus("invalid");
      setUsernameMessage("Username is required.");
      return;
    }

    if (!usernameIsClean) {
      setUsernameStatus("invalid");
      setUsernameMessage("Only letters, numbers, and underscore are allowed.");
      return;
    }

    if (trimmedUsername.length < 3) {
      setUsernameStatus("invalid");
      setUsernameMessage("Username must be at least 3 characters.");
      return;
    }

    if (trimmedUsername.toLowerCase() === (username ?? "").trim().toLowerCase()) {
      setUsernameStatus("valid");
      setUsernameMessage("This is your current username.");
      return;
    }

    setUsernameStatus("checking");
    setUsernameMessage("Checking username...");

    const timer = setTimeout(async () => {
      try {
        const result = await checkUsernameAvailability(trimmedUsername);
        setUsernameStatus(result.available ? "valid" : "invalid");
        setUsernameMessage(result.message);
      } catch {
        setUsernameStatus("invalid");
        setUsernameMessage("Could not verify username right now.");
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [draftUsername, trimmedUsername, username, usernameIsClean]);

  const renderCheck = (label: string, ok: boolean) => (
    <View style={styles.checkRow} key={label}>
      <Ionicons
        name={ok ? "checkmark-circle" : "ellipse-outline"}
        size={18}
        color={ok ? "#12B76A" : "#98A2B3"}
      />
      <Text style={[styles.checkText, ok && styles.checkTextOk]}>{label}</Text>
    </View>
  );

  const handleSave = async () => {
    if (!userId) {
      Alert.alert("Missing user", "User session not found. Please login again.");
      return;
    }

    if (!trimmedUsername) {
      Alert.alert("Username required", "Please enter a username before saving.");
      return;
    }

    if (!/^[A-Za-z0-9_]+$/.test(trimmedUsername)) {
      Alert.alert(
        "Invalid username",
        "Username can only contain letters, numbers, and underscore.",
      );
      return;
    }

    if (usernameStatus !== "valid") {
      Alert.alert(
        "Invalid username",
        usernameMessage || "Please use a valid available username.",
      );
      return;
    }

    if (wantsPasswordReset) {
      if (!currentPassword.trim()) {
        Alert.alert(
          "Current password required",
          "Please enter your current password to reset it.",
        );
        return;
      }

      if (!passwordChecks.minLength ||
          !passwordChecks.upper ||
          !passwordChecks.lower ||
          !passwordChecks.number ||
          !passwordChecks.special ||
          !passwordChecks.match) {
        Alert.alert(
          "Weak password",
          "Please satisfy all new password requirements before saving.",
        );
        return;
      }
    }

    try {
      setSaving(true);

      if (trimmedUsername !== (username ?? "").trim()) {
        const updated = await updateAccountDetails({
          userId,
          username: trimmedUsername,
        });

        setUserProfile({
          userId: updated.id,
          username: updated.username,
        });
      }

      if (wantsPasswordReset) {
        await resetPassword({
          userId,
          currentPassword,
          newPassword,
          confirmPassword,
        });
      }

      Alert.alert(
        "Saved",
        wantsPasswordReset
          ? "Your account details and password have been updated."
          : "Your account details have been updated.",
      );

      navigation.goBack();
    } catch (error: any) {
      Alert.alert("Update failed", error?.message || "Failed to update account.");
    } finally {
      setSaving(false);
    }
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
          <Text style={styles.headerTitle}>Edit Account</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Profile & Security</Text>
          <Text style={styles.heroTitle}>Update account details</Text>
          <Text style={styles.heroSubtitle}>
            Change your username and, if needed, reset your password securely.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Username</Text>
          <Text style={styles.helpText}>
            Use only letters, numbers, and underscore. Minimum 3 characters.
          </Text>

          <View
            style={[
              styles.inputWrap,
              usernameStatus === "invalid" && styles.inputWrapError,
              usernameStatus === "valid" && styles.inputWrapValid,
            ]}>
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

            {usernameStatus === "checking" ? (
              <ActivityIndicator size="small" color="#053668" />
            ) : usernameStatus === "valid" ? (
              <Ionicons name="checkmark-circle" size={20} color="#12B76A" />
            ) : usernameStatus === "invalid" ? (
              <Ionicons name="close-circle" size={20} color="#F04438" />
            ) : null}
          </View>

          {usernameMessage ? (
            <Text
              style={[
                styles.usernameMessage,
                usernameStatus === "valid"
                  ? styles.usernameMessageValid
                  : usernameStatus === "invalid"
                    ? styles.usernameMessageInvalid
                    : styles.usernameMessageNeutral,
              ]}>
              {usernameMessage}
            </Text>
          ) : null}

          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>Preview</Text>
            <Text style={styles.previewValue}>
              {trimmedUsername ? trimmedUsername : "Campus User"}
            </Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Reset Password</Text>
          <Text style={styles.helpText}>
            Fill the fields below only if you want to change your password.
          </Text>

          <Text style={styles.label}>Current password</Text>
          <View style={styles.inputWrapPlain}>
            <TextInput
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Enter current password"
              placeholderTextColor="#98A2B3"
              style={styles.input}
              secureTextEntry={!showCurrentPassword}
              contextMenuHidden
            />
            <Pressable onPress={() => setShowCurrentPassword((prev) => !prev)}>
              <Ionicons
                name={showCurrentPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#667085"
              />
            </Pressable>
          </View>

          <Text style={styles.label}>New password</Text>
          <View style={styles.inputWrapPlain}>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              placeholderTextColor="#98A2B3"
              style={styles.input}
              secureTextEntry={!showNewPassword}
              contextMenuHidden
            />
            <Pressable onPress={() => setShowNewPassword((prev) => !prev)}>
              <Ionicons
                name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#667085"
              />
            </Pressable>
          </View>

          <Text style={styles.label}>Confirm new password</Text>
          <View style={styles.inputWrapPlain}>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter new password"
              placeholderTextColor="#98A2B3"
              style={styles.input}
              secureTextEntry={!showConfirmPassword}
              contextMenuHidden
            />
            <Pressable onPress={() => setShowConfirmPassword((prev) => !prev)}>
              <Ionicons
                name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#667085"
              />
            </Pressable>
          </View>

          {newPassword.length > 0 || confirmPassword.length > 0 ? (
            <>
              <View style={styles.strengthWrap}>
                <Text style={styles.strengthLabel}>Password strength:</Text>
                <Text
                  style={[
                    styles.strengthValue,
                    passwordStrength === "Weak"
                      ? styles.weak
                      : passwordStrength === "Normal"
                        ? styles.normal
                        : styles.strong,
                  ]}>
                  {passwordStrength}
                </Text>
              </View>

              <View style={styles.rulesCard}>
                {renderCheck("At least 8 characters", passwordChecks.minLength)}
                {renderCheck("At least one uppercase letter", passwordChecks.upper)}
                {renderCheck("At least one lowercase letter", passwordChecks.lower)}
                {renderCheck("At least one number", passwordChecks.number)}
                {renderCheck(
                  "At least one special character",
                  passwordChecks.special,
                )}
                {renderCheck("Passwords match", passwordChecks.match)}
              </View>
            </>
          ) : null}

          <View style={styles.securityNote}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#053668" />
            <Text style={styles.securityNoteText}>
              Password will only change if all password fields are filled correctly.
            </Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            style={[styles.button, styles.secondaryButton]}
            onPress={() => navigation.goBack()}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.primaryButton]}
            onPress={handleSave}
            disabled={saving}>
            <Text style={styles.primaryButtonText}>
              {saving ? "Saving..." : "Save Changes"}
            </Text>
          </Pressable>
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
  label: {
    marginTop: 14,
    marginBottom: 6,
    fontSize: 13,
    color: "#475467",
    fontWeight: "600",
  },
  inputWrap: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inputWrapPlain: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 0,
  },
  inputWrapError: {
    borderColor: "#F04438",
  },
  inputWrapValid: {
    borderColor: "#12B76A",
  },
  input: {
    flex: 1,
    color: "#111827",
    fontSize: 15,
    paddingVertical: 14,
  },
  usernameMessage: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "600",
  },
  usernameMessageValid: {
    color: "#12B76A",
  },
  usernameMessageInvalid: {
    color: "#D92D20",
  },
  usernameMessageNeutral: {
    color: "#667085",
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
  strengthWrap: {
    marginTop: 14,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  strengthLabel: {
    fontSize: 13,
    color: "#475467",
    fontWeight: "600",
  },
  strengthValue: {
    fontSize: 13,
    fontWeight: "800",
  },
  weak: { color: "#D92D20" },
  normal: { color: "#F79009" },
  strong: { color: "#12B76A" },
  rulesCard: {
    marginTop: 14,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkText: {
    fontSize: 13,
    color: "#667085",
  },
  checkTextOk: {
    color: "#111827",
    fontWeight: "600",
  },
  securityNote: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#EDF3F8",
    borderRadius: 16,
    padding: 12,
  },
  securityNoteText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: "#475467",
    fontWeight: "600",
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