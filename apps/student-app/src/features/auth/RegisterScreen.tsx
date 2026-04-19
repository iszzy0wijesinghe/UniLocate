/** @format */

import React from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { FirstRunStackParamList } from "../../navigation/FirstRunNavigator";
import {
  registerUser,
  checkUsernameAvailability,
} from "../../services/api/auth";
import { useUserProfileStore } from "../../store/useUserProfileStore";
import { notifyRegisterSuccess } from "../../services/notifications/notificationService";

type Props = NativeStackScreenProps<FirstRunStackParamList, "Register">;

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

export default function RegisterScreen({ navigation }: Props) {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const [usernameStatus, setUsernameStatus] = React.useState<
    "idle" | "checking" | "valid" | "invalid"
  >("idle");
  const [usernameMessage, setUsernameMessage] = React.useState("");

  const setUserProfile = useUserProfileStore((state) => state.setUserProfile);

  const checks = getPasswordChecks(password, confirmPassword);
  const strength = getPasswordStrength(password);

  const usernameIsClean = /^[A-Za-z0-9_]*$/.test(username);
  const trimmedUsername = username.trim();

  const [acceptedTerms, setAcceptedTerms] = React.useState(false);
  const [showTermsModal, setShowTermsModal] = React.useState(false);

  React.useEffect(() => {
    if (!trimmedUsername) {
      setUsernameStatus("idle");
      setUsernameMessage("");
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

    setUsernameStatus("checking");
    setUsernameMessage("Checking username...");

    const timeout = setTimeout(async () => {
      try {
        const result = await checkUsernameAvailability(trimmedUsername);
        setUsernameStatus(result.available ? "valid" : "invalid");
        setUsernameMessage(result.message);
      } catch {
        setUsernameStatus("invalid");
        setUsernameMessage("Could not verify username right now.");
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [trimmedUsername, usernameIsClean]);

  const allPasswordValid =
    checks.minLength &&
    checks.upper &&
    checks.lower &&
    checks.number &&
    checks.special &&
    checks.match;

  const canSubmit = usernameStatus === "valid" && allPasswordValid;

  const handleRegister = async () => {
    if (!trimmedUsername) {
      Alert.alert("Username required", "Please enter your username.");
      return;
    }

    if (usernameStatus !== "valid") {
      Alert.alert(
        "Invalid username",
        usernameMessage || "Please use an available username.",
      );
      return;
    }

    if (!acceptedTerms) {
      Alert.alert(
        "Terms required",
        "Please read and accept the Terms & Conditions to continue.",
      );
      return;
    }

    if (!allPasswordValid) {
      Alert.alert(
        "Weak password",
        "Please satisfy all password requirements before continuing.",
      );
      return;
    }

    try {
      setSubmitting(true);

      const user = await registerUser({
        username: trimmedUsername,
        password,
        confirmPassword,
      });

      setUserProfile({
        userId: user.id,
        username: user.username,
      });

      await notifyRegisterSuccess(user.username);

      navigation.replace("LocationPermissions");
    } catch (error: any) {
      Alert.alert(
        "Registration failed",
        error?.message || "Failed to register",
      );
    } finally {
      setSubmitting(false);
    }
  };

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
          <Text style={styles.heroEyebrow}>Create account</Text>
          <Text style={styles.heroTitle}>Set up your access</Text>
          <Text style={styles.heroSubtitle}>
            Choose an available username and create a strong password.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Username</Text>
          <View
            style={[
              styles.inputWrap,
              usernameStatus === "invalid" && styles.inputWrapError,
              usernameStatus === "valid" && styles.inputWrapValid,
            ]}>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Choose username"
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

          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrap}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              placeholderTextColor="#98A2B3"
              style={styles.input}
              secureTextEntry={!showPassword}
              contextMenuHidden
            />
            <Pressable onPress={() => setShowPassword((prev) => !prev)}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#667085"
              />
            </Pressable>
          </View>

          <Text style={styles.label}>Confirm password</Text>
          <View style={styles.inputWrap}>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter password"
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

          <View style={styles.strengthWrap}>
            <Text style={styles.strengthLabel}>Password strength:</Text>
            <Text
              style={[
                styles.strengthValue,
                strength === "Weak"
                  ? styles.weak
                  : strength === "Normal"
                    ? styles.normal
                    : styles.strong,
              ]}>
              {strength}
            </Text>
          </View>

          <View style={styles.rulesCard}>
            {renderCheck("At least 8 characters", checks.minLength)}
            {renderCheck("At least one uppercase letter", checks.upper)}
            {renderCheck("At least one lowercase letter", checks.lower)}
            {renderCheck("At least one number", checks.number)}
            {renderCheck("At least one special character", checks.special)}
            {renderCheck("Passwords match", checks.match)}
          </View>

          

          <View style={styles.termsCard}>
            <Text style={styles.termsTitle}>Terms & Conditions</Text>
            <Text style={styles.termsText}>
              Please read and accept the terms and conditions before continuing.
            </Text>

            <Pressable
              style={styles.termsLinkButton}
              onPress={() => setShowTermsModal(true)}>
              <Text style={styles.termsLinkText}>View Terms & Conditions</Text>
            </Pressable>

            <Pressable
              style={styles.termsTickRow}
              onPress={() => {
                if (!acceptedTerms) {
                  setShowTermsModal(true);
                } else {
                  setAcceptedTerms(false);
                }
              }}>
              <Ionicons
                name={acceptedTerms ? "checkbox" : "square-outline"}
                size={22}
                color={acceptedTerms ? "#12B76A" : "#98A2B3"}
              />
              <Text style={styles.termsTickText}>
                I agree to the Terms & Conditions
              </Text>
            </Pressable>
          </View>

          <View style={styles.actionRow}>
            <Pressable
              style={[styles.button, styles.secondaryButton]}
              onPress={() => navigation.goBack()}>
              <Text style={styles.secondaryButtonText}>Back</Text>
            </Pressable>

            <Pressable
              style={[
                styles.button,
                styles.primaryButton,
                !canSubmit && styles.primaryButtonDisabled,
              ]}
              onPress={handleRegister}
              disabled={submitting || !canSubmit}>
              <Text style={styles.primaryButtonText}>
                {submitting ? "Please wait..." : "Register"}
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={styles.bottomLink}
            onPress={() => navigation.navigate("Login")}>
            <Text style={styles.bottomLinkText}>
              Already have an account? Login
            </Text>
          </Pressable>
        </View>
      </ScrollView>
      <Modal
        visible={showTermsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTermsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Terms & Conditions</Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.modalScroll}>
              <Text style={styles.modalText}>
                By using UniLocate, you agree to use the app responsibly for
                campus services only. You must not misuse chat, submit false
                reports, or impersonate other users. Your account activity may
                be used to support app safety, Lost & Found communication, and
                complaint handling.
              </Text>

              <Text style={styles.modalText}>
                Keep your login credentials secure. UniLocate is intended for
                academic and campus-related support features only. Any misuse
                may result in restricted access.
              </Text>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowTermsModal(false)}>
                <Text style={styles.modalCancelText}>Close</Text>
              </Pressable>

              <Pressable
                style={[styles.modalButton, styles.modalAgreeButton]}
                onPress={() => {
                  setAcceptedTerms(true);
                  setShowTermsModal(false);
                }}>
                <Text style={styles.modalAgreeText}>Agree</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7F8FA" },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 36,
  },
  logoWrap: { alignItems: "center", marginBottom: 14 },
  logo: { width: 220, height: 80 },
  heroCard: {
    backgroundColor: "#053668",
    borderRadius: 28,
    padding: 20,
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
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
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
  label: {
    marginTop: 12,
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
  primaryButton: { backgroundColor: "#FF7100" },
  primaryButtonDisabled: {
    opacity: 0.55,
  },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#053668",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  secondaryButtonText: {
    color: "#053668",
    fontSize: 14,
    fontWeight: "800",
  },
  bottomLink: {
    marginTop: 18,
    alignItems: "center",
  },
  bottomLinkText: {
    color: "#053668",
    fontSize: 13,
    fontWeight: "700",
  },
  termsCard: {
    marginTop: 18,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    padding: 14,
  },
  termsTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#053668",
  },
  termsText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: "#667085",
  },
  termsLinkButton: {
    marginTop: 12,
    alignSelf: "flex-start",
  },
  termsLinkText: {
    color: "#FF7100",
    fontSize: 13,
    fontWeight: "800",
  },
  termsTickRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  termsTickText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    maxHeight: "75%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#053668",
    marginBottom: 12,
  },
  modalScroll: {
    maxHeight: 260,
  },
  modalText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#475467",
    marginBottom: 14,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D0D5DD",
  },
  modalAgreeButton: {
    backgroundColor: "#FF7100",
  },
  modalCancelText: {
    color: "#344054",
    fontWeight: "700",
    fontSize: 14,
  },
  modalAgreeText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
});
