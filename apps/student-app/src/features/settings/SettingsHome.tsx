/** @format */

import React from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { useUserProfileStore } from "../../store/useUserProfileStore";
import type { SettingsStackParamList } from "../../navigation/SettingsNavigator";

type Props = NativeStackScreenProps<SettingsStackParamList, "SettingsHome">;

type SettingsRowProps = {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
};

function SettingsRow({ icon, title, subtitle, onPress }: SettingsRowProps) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowLeft}>
        <View style={styles.iconWrap}>{icon}</View>
        <View style={styles.rowTextWrap}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.rowSubtitle}>{subtitle}</Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#98A2B3" />
    </Pressable>
  );
}

export default function SettingsHome({ navigation }: Props) {
  const username = useUserProfileStore((state) => state.username);
  const displayName = username?.trim() ? username.trim() : "Campus User";

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
          <View style={styles.avatarWrap}>
            <Ionicons name="person-outline" size={28} color="#053668" />
          </View>

          <View style={styles.heroTextWrap}>
            <Text style={styles.eyebrow}>Settings</Text>
            <Text style={styles.heroTitle}>{displayName}</Text>
            <Text style={styles.heroSubtitle}>
              Manage your profile, device preferences, privacy-related options,
              and app information.
            </Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Account</Text>

          <SettingsRow
            icon={<Ionicons name="person-outline" size={20} color="#053668" />}
            title="Username"
            subtitle="Update the name used across the app"
            onPress={() => navigation.navigate("EditUsername")}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>App data</Text>

          <SettingsRow
            icon={<Ionicons name="time-outline" size={20} color="#053668" />}
            title="Location Logs"
            subtitle="View and manage recent location history"
            onPress={() => navigation.navigate("LocationLogs")}
          />

          <SettingsRow
            icon={<MaterialCommunityIcons name="database-outline" size={20} color="#053668" />}
            title="Storage"
            subtitle="See app storage usage and manage saved data"
            onPress={() => navigation.navigate("Storage")}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Preferences</Text>

          <SettingsRow
            icon={<Ionicons name="notifications-outline" size={20} color="#053668" />}
            title="Notifications"
            subtitle="Choose what alerts and updates you want"
            onPress={() => navigation.navigate("Notifications")}
          />

          <SettingsRow
            icon={<Ionicons name="color-palette-outline" size={20} color="#053668" />}
            title="Personalize"
            subtitle="Adjust language, text size, and visual preferences"
            onPress={() => navigation.navigate("Personalize")}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>About</Text>

          <SettingsRow
            icon={<Ionicons name="information-circle-outline" size={20} color="#053668" />}
            title="About UniLocate"
            subtitle="App details, version, and platform information"
            onPress={() => navigation.navigate("AboutUniLocate")}
          />
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
  heroCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#053668",
    borderRadius: 28,
    padding: 20,
  },
  avatarWrap: {
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
    paddingVertical: 8,
  },
  sectionLabel: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 8,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    color: "#98A2B3",
  },
  row: {
    minHeight: 72,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EDF3F8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowTextWrap: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  rowSubtitle: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    color: "#667085",
  },
});