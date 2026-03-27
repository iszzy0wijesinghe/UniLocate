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
import { Ionicons } from "@expo/vector-icons";

import type { SettingsStackParamList } from "../../navigation/SettingsNavigator";

type Props = NativeStackScreenProps<SettingsStackParamList, "LocationLogs">;

type LogItem = {
  id: string;
  place: string;
  time: string;
  detail: string;
};

const sampleLogs: LogItem[] = [
  {
    id: "1",
    place: "Bird Nest",
    time: "Today · 9:42 AM",
    detail: "Visited while using live map guidance",
  },
  {
    id: "2",
    place: "Basement Canteen",
    time: "Yesterday · 1:18 PM",
    detail: "Detected near cafeteria zone",
  },
  {
    id: "3",
    place: "Anohana Canteen",
    time: "Yesterday · 11:03 AM",
    detail: "Recent location activity saved locally",
  },
];

function LogCard({ item }: { item: LogItem }) {
  return (
    <View style={styles.logCard}>
      <View style={styles.logIconWrap}>
        <Ionicons name="location-outline" size={18} color="#053668" />
      </View>

      <View style={styles.logTextWrap}>
        <Text style={styles.logTitle}>{item.place}</Text>
        <Text style={styles.logTime}>{item.time}</Text>
        <Text style={styles.logDetail}>{item.detail}</Text>
      </View>

      <Pressable style={styles.deleteButton}>
        <Ionicons name="trash-outline" size={18} color="#C2410C" />
      </Pressable>
    </View>
  );
}

export default function LocationLogs({ navigation }: Props) {
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
          <Text style={styles.headerTitle}>Location Logs</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="time-outline" size={30} color="#053668" />
          </View>

          <View style={styles.heroTextWrap}>
            <Text style={styles.eyebrow}>History</Text>
            <Text style={styles.heroTitle}>Review recent location activity</Text>
            <Text style={styles.heroSubtitle}>
              View locally stored recent places used in the UniLocate experience.
            </Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Recent logs</Text>

            <View style={styles.headerActions}>
              <Pressable style={styles.headerActionButton}>
                <Text style={styles.headerActionText}>Export</Text>
              </Pressable>
              <Pressable style={styles.headerActionButton}>
                <Text style={styles.headerActionText}>Clear</Text>
              </Pressable>
            </View>
          </View>

          {sampleLogs.map((item) => (
            <LogCard key={item.id} item={item} />
          ))}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Note</Text>
          <Text style={styles.infoText}>
            These are placeholder UI logs for now. Real location history can be connected
            later from local app storage when that part is finalized.
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
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    color: "#98A2B3",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerActionButton: {
    backgroundColor: "#EDF3F8",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  headerActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#053668",
  },
  logCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F9FAFB",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginTop: 10,
  },
  logIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EDF3F8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  logTextWrap: {
    flex: 1,
  },
  logTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  logTime: {
    marginTop: 3,
    fontSize: 12,
    color: "#667085",
    fontWeight: "600",
  },
  logDetail: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: "#667085",
  },
  deleteButton: {
    marginLeft: 10,
    paddingTop: 2,
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