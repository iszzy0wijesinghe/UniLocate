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

import type { SettingsStackParamList } from "../../navigation/SettingsNavigator";

type Props = NativeStackScreenProps<SettingsStackParamList, "Storage">;

type UsageRowProps = {
  label: string;
  value: string;
};

function UsageRow({ label, value }: UsageRowProps) {
  return (
    <View style={styles.usageRow}>
      <Text style={styles.usageLabel}>{label}</Text>
      <Text style={styles.usageValue}>{value}</Text>
    </View>
  );
}

type ActionCardProps = {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress?: () => void;
};

function ActionCard({ icon, title, subtitle, onPress }: ActionCardProps) {
  return (
    <Pressable style={styles.actionCard} onPress={onPress}>
      <View style={styles.actionIconWrap}>{icon}</View>
      <View style={styles.actionTextWrap}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#98A2B3" />
    </Pressable>
  );
}

export default function Storage({ navigation }: Props) {
  const totalUsedPercent = 42;

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
          <Text style={styles.headerTitle}>Storage</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <MaterialCommunityIcons
              name="database-outline"
              size={30}
              color="#053668"
            />
          </View>

          <View style={styles.heroTextWrap}>
            <Text style={styles.eyebrow}>App data</Text>
            <Text style={styles.heroTitle}>Manage saved storage usage</Text>
            <Text style={styles.heroSubtitle}>
              View how much space UniLocate uses for app content, cached map data,
              and saved local information.
            </Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Usage overview</Text>

          <Text style={styles.bigValue}>42 MB</Text>
          <Text style={styles.bigValueHint}>Estimated space used on this device</Text>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${totalUsedPercent}%` }]} />
          </View>

          <UsageRow label="Cached map data" value="18 MB" />
          <UsageRow label="Saved complaint sessions" value="8 MB" />
          <UsageRow label="Lost & found media" value="10 MB" />
          <UsageRow label="Temporary app cache" value="6 MB" />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Storage actions</Text>

          <ActionCard
            icon={<Ionicons name="download-outline" size={20} color="#053668" />}
            title="Export data"
            subtitle="Prepare saved app data for backup or review"
          />

          <ActionCard
            icon={<Ionicons name="cloud-upload-outline" size={20} color="#053668" />}
            title="Import data"
            subtitle="Restore previously exported local app data"
          />

          <ActionCard
            icon={<Ionicons name="trash-outline" size={20} color="#C2410C" />}
            title="Clear temporary cache"
            subtitle="Remove cached content without affecting core profile data"
          />
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Note</Text>
          <Text style={styles.infoText}>
            These values are currently placeholder UI values for the settings flow.
            Real storage totals can be connected later when the feature logic is finalized.
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
  bigValue: {
    fontSize: 32,
    fontWeight: "800",
    color: "#053668",
  },
  bigValueHint: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: "#667085",
  },
  progressTrack: {
    marginTop: 14,
    height: 12,
    borderRadius: 999,
    backgroundColor: "#E8EDF3",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#FF7100",
  },
  usageRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  usageLabel: {
    fontSize: 14,
    color: "#667085",
    fontWeight: "600",
  },
  usageValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "700",
  },
  actionCard: {
    minHeight: 76,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  actionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EDF3F8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  actionTextWrap: {
    flex: 1,
    marginRight: 10,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  actionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: "#667085",
  },
  infoCard: {
    marginTop: 16,
    backgroundColor: "#FFF7ED",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FED7AA",
    padding: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#C2410C",
  },
  infoText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: "#9A3412",
  },
});