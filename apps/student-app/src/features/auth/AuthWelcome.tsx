/** @format */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { FirstRunStackParamList } from "../../navigation/FirstRunNavigator";

type Props = NativeStackScreenProps<FirstRunStackParamList, "AuthWelcome">;

export default function AuthWelcome({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.container}>
        <View style={styles.logoWrap}>
          <Image
            source={require("../../assets/images/UniLocateLogo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Secure Access</Text>
          <Text style={styles.title}>Welcome to UniLocate</Text>
          <Text style={styles.subtitle}>
            Login to continue, or create a new account to access Lost &amp;
            Found, complaints, and campus tools.
          </Text>

          <View style={styles.featureList}>
            <View style={styles.featureRow}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#DCEEF2" />
              <Text style={styles.featureText}>Secure account access</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color="#DCEEF2" />
              <Text style={styles.featureText}>Private chat and reports</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="location-outline" size={18} color="#DCEEF2" />
              <Text style={styles.featureText}>Personalized campus experience</Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={[styles.button, styles.primaryButton]}
            onPress={() => navigation.navigate("Login")}>
            <Text style={styles.primaryButtonText}>Login</Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.secondaryButton]}
            onPress={() => navigation.navigate("Register")}>
            <Text style={styles.secondaryButtonText}>Create account</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 18,
  },
  logo: {
    width: 220,
    height: 82,
  },
  heroCard: {
    backgroundColor: "#053668",
    borderRadius: 30,
    padding: 22,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    color: "#CCE2E8",
    letterSpacing: 0.8,
  },
  title: {
    marginTop: 10,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  subtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: "#DCEEF2",
  },
  featureList: {
    marginTop: 18,
    gap: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureText: {
    color: "#E8F4F7",
    fontSize: 13.5,
    fontWeight: "600",
  },
  actions: {
    marginTop: 20,
    gap: 12,
  },
  button: {
    borderRadius: 999,
    paddingVertical: 15,
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
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryButtonText: {
    color: "#053668",
    fontSize: 15,
    fontWeight: "800",
  },
});