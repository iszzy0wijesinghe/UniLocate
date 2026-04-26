/** @format */

import React from "react";
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import type { SettingsStackParamList } from "../../navigation/SettingsNavigator";

type Props = NativeStackScreenProps<SettingsStackParamList, "AboutUniLocate">;

type InfoRowProps = {
  label: string;
  value: string;
};

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

type LinkRowProps = {
  title: string;
  subtitle: string;
  onPress: () => void;
};

function LinkRow({ title, subtitle, onPress }: LinkRowProps) {
  return (
    <Pressable style={styles.linkRow} onPress={onPress}>
      <View style={styles.linkTextWrap}>
        <Text style={styles.linkTitle}>{title}</Text>
        <Text style={styles.linkSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="open-outline" size={18} color="#98A2B3" />
    </Pressable>
  );
}

export default function AboutUniLocate({ navigation }: Props) {
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
          <Text style={styles.headerTitle}>About UniLocate</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="information-circle-outline" size={30} color="#053668" />
          </View>

          <View style={styles.heroTextWrap}>
            <Text style={styles.eyebrow}>About</Text>
            <Text style={styles.heroTitle}>UniLocate Student App</Text>
            <Text style={styles.heroSubtitle}>
              A privacy-first campus companion for smart navigation, lost &
              found, and anonymous support tools.
            </Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>App information</Text>
          <InfoRow label="Version" value="1.0.0" />
          <InfoRow label="Build" value="Student Preview" />
          <InfoRow label="Platform" value="Mobile" />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Description</Text>
          <Text style={styles.bodyText}>
            UniLocate is designed to support students inside campus with better
            orientation, community-driven item recovery, and safer reporting
            experiences. The app focuses on practical features while keeping the
            experience lightweight and easy to use.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Helpful links</Text>

          <LinkRow
            title="Privacy Policy"
            subtitle="Understand how UniLocate uses campus-related data"
            onPress={() => Linking.openURL("https://example.com/privacy")}
          />

          <LinkRow
            title="Terms & Conditions"
            subtitle="Read the basic rules for using the app"
            onPress={() => Linking.openURL("https://example.com/terms")}
          />

          <LinkRow
            title="Contact Support"
            subtitle="Reach out if you need help with the app"
            onPress={() => Linking.openURL("mailto:info.unilocatelk@gmail.com")}
          />
        </View>

        <View style={styles.footerCard}>
          <Text style={styles.footerText}>
            Built for a smoother, safer, and smarter campus experience.
          </Text>
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
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#053668",
    borderRadius: 28,
    padding: 20,
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  heroTextWrap: {
    flex: 1,
  },
  eyebrow: {
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
    fontWeight: "800",
    color: "#FFFFFF",
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
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
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    color: "#98A2B3",
    marginBottom: 10,
  },
  infoRow: {
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 14,
    color: "#667085",
    fontWeight: "600",
  },
  infoValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "700",
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#374151",
  },
  linkRow: {
    minHeight: 64,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  linkTextWrap: {
    flex: 1,
    marginRight: 12,
  },
  linkTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  linkSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: "#667085",
  },
  footerCard: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  footerText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    color: "#98A2B3",
    fontWeight: "600",
  },
});