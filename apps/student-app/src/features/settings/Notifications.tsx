/** @format */

import React from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import type { SettingsStackParamList } from "../../navigation/SettingsNavigator";
import { useAppSettingsStore } from "../../store/useAppSettingsStore";

type Props = NativeStackScreenProps<SettingsStackParamList, "Notifications">;

type ToggleRowProps = {
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

function ToggleRow({ title, subtitle, value, onChange }: ToggleRowProps) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleTextWrap}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleSubtitle}>{subtitle}</Text>
      </View>

      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#D0D5DD", true: "#FCC9AE" }}
        thumbColor={value ? "#FF7100" : "#FFFFFF"}
      />
    </View>
  );
}

export default function Notifications({ navigation }: Props) {
  const bookingUpdates = useAppSettingsStore(
    (state) => state.bookingUpdatesEnabled,
  );
  const ticketUpdates = useAppSettingsStore(
    (state) => state.ticketUpdatesEnabled,
  );
  const complaintUpdates = useAppSettingsStore(
    (state) => state.complaintUpdatesEnabled,
  );
  const generalAnnouncements = useAppSettingsStore(
    (state) => state.generalAnnouncementsEnabled,
  );

  const setBookingUpdates = useAppSettingsStore(
    (state) => state.setBookingUpdatesEnabled,
  );
  const setTicketUpdates = useAppSettingsStore(
    (state) => state.setTicketUpdatesEnabled,
  );
  const setComplaintUpdates = useAppSettingsStore(
    (state) => state.setComplaintUpdatesEnabled,
  );
  const setGeneralAnnouncements = useAppSettingsStore(
    (state) => state.setGeneralAnnouncementsEnabled,
  );
  const resetNotificationSettings = useAppSettingsStore(
    (state) => state.resetNotificationSettings,
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

        <View style={styles.headerRow}>
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color="#053668" />
          </Pressable>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Pressable
            style={styles.resetButton}
            onPress={resetNotificationSettings}
          >
            <Text style={styles.resetButtonText}>Reset</Text>
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="notifications-outline" size={30} color="#053668" />
          </View>

          <View style={styles.heroTextWrap}>
            <Text style={styles.eyebrow}>Preferences</Text>
            <Text style={styles.heroTitle}>
              Choose what you want to hear about
            </Text>
            <Text style={styles.heroSubtitle}>
              Control which updates and alerts UniLocate can show inside your app
              experience.
            </Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Notification categories</Text>

          <ToggleRow
            title="Booking updates"
            subtitle="Get notified when bookings are approved, rejected, or changed"
            value={bookingUpdates}
            onChange={setBookingUpdates}
          />

          <ToggleRow
            title="Ticket updates"
            subtitle="Receive alerts for support ticket replies and status changes"
            value={ticketUpdates}
            onChange={setTicketUpdates}
          />

          <ToggleRow
            title="Anonymous complaint updates"
            subtitle="See new activity and follow-up updates on complaint cases"
            value={complaintUpdates}
            onChange={setComplaintUpdates}
          />

          <ToggleRow
            title="General announcements"
            subtitle="Show important app-wide notices and information alerts"
            value={generalAnnouncements}
            onChange={setGeneralAnnouncements}
          />
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Current status</Text>
          <Text style={styles.summaryText}>
            Booking updates:{" "}
            <Text style={styles.summaryStrong}>
              {bookingUpdates ? "On" : "Off"}
            </Text>
          </Text>
          <Text style={styles.summaryText}>
            Ticket updates:{" "}
            <Text style={styles.summaryStrong}>
              {ticketUpdates ? "On" : "Off"}
            </Text>
          </Text>
          <Text style={styles.summaryText}>
            Complaint updates:{" "}
            <Text style={styles.summaryStrong}>
              {complaintUpdates ? "On" : "Off"}
            </Text>
          </Text>
          <Text style={styles.summaryText}>
            General announcements:{" "}
            <Text style={styles.summaryStrong}>
              {generalAnnouncements ? "On" : "Off"}
            </Text>
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Good to know</Text>
          <Text style={styles.infoText}>
            These notification preferences are now saved locally on this device.
            Push delivery can be connected later when the notifications backend
            flow is finalized.
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
  resetButton: {
    minWidth: 42,
    alignItems: "flex-end",
  },
  resetButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#053668",
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
  toggleRow: {
    minHeight: 86,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  toggleTextWrap: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  toggleSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: "#667085",
  },
  summaryCard: {
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#667085",
  },
  summaryStrong: {
    color: "#053668",
    fontWeight: "700",
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