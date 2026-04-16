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
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import type { SettingsStackParamList } from "../../navigation/SettingsNavigator";
import { useAppSettingsStore } from "../../store/useAppSettingsStore";
import {
  requestNotificationPermission,
  sendLocalNotification,
} from "../../services/notifications/notificationService";

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
  const lostFoundUpdates = useAppSettingsStore(
    (state) => state.bookingUpdatesEnabled,
  );
  const chatMessageUpdates = useAppSettingsStore(
    (state) => state.ticketUpdatesEnabled,
  );
  const complaintUpdates = useAppSettingsStore(
    (state) => state.complaintUpdatesEnabled,
  );
  const campusAlerts = useAppSettingsStore(
    (state) => state.generalAnnouncementsEnabled,
  );

  const setLostFoundUpdates = useAppSettingsStore(
    (state) => state.setBookingUpdatesEnabled,
  );
  const setChatMessageUpdates = useAppSettingsStore(
    (state) => state.setTicketUpdatesEnabled,
  );
  const setComplaintUpdates = useAppSettingsStore(
    (state) => state.setComplaintUpdatesEnabled,
  );
  const setCampusAlerts = useAppSettingsStore(
    (state) => state.setGeneralAnnouncementsEnabled,
  );
  const resetNotificationSettings = useAppSettingsStore(
    (state) => state.resetNotificationSettings,
  );

  const [permissionGranted, setPermissionGranted] = React.useState<
    boolean | null
  >(null);
  const [checkingPermission, setCheckingPermission] = React.useState(false);
  const [sendingTest, setSendingTest] = React.useState(false);

  const enabledCount = [
    lostFoundUpdates,
    chatMessageUpdates,
    complaintUpdates,
    campusAlerts,
  ].filter(Boolean).length;

  const handleEnableSystemNotifications = async () => {
    try {
      setCheckingPermission(true);
      const granted = await requestNotificationPermission();
      setPermissionGranted(granted);

      if (granted) {
        Alert.alert(
          "Notifications enabled",
          "UniLocate can now show system notifications on this device.",
        );
      } else {
        Alert.alert(
          "Permission not granted",
          "System notifications are still disabled on this device.",
        );
      }
    } catch (error: any) {
      setPermissionGranted(false);
      Alert.alert(
        "Permission check failed",
        error?.message || "Could not request notification permission.",
      );
    } finally {
      setCheckingPermission(false);
    }
  };

  const handleSendTestNotification = async () => {
    try {
      setSendingTest(true);

      const granted = await requestNotificationPermission();
      setPermissionGranted(granted);

      if (!granted) {
        Alert.alert(
          "Notifications disabled",
          "Please enable system notification permission first.",
        );
        return;
      }

      await sendLocalNotification(
        "UniLocate test notification",
        "Your notification settings are working correctly.",
        { source: "settings-test" },
      );

      Alert.alert(
        "Test sent",
        "A system notification was triggered. Check your notification bar.",
      );
    } catch (error: any) {
      Alert.alert(
        "Test failed",
        error?.message || "Could not send test notification.",
      );
    } finally {
      setSendingTest(false);
    }
  };

  const handleReset = () => {
    resetNotificationSettings();
    setPermissionGranted(null);
    Alert.alert(
      "Notification settings reset",
      "Your in-app notification preferences were restored to default values.",
    );
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
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color="#053668" />
          </Pressable>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Pressable style={styles.resetButton} onPress={handleReset}>
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
              Control how UniLocate notifies you
            </Text>
            <Text style={styles.heroSubtitle}>
              Manage your app notification categories and check whether system
              notifications are enabled on this device.
            </Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>System notification access</Text>

          <View style={styles.permissionCard}>
            <View style={styles.permissionTextWrap}>
              <Text style={styles.permissionTitle}>Device permission</Text>
              <Text style={styles.permissionSubtitle}>
                {permissionGranted === null
                  ? "Not checked yet"
                  : permissionGranted
                    ? "System notifications are allowed"
                    : "System notifications are blocked or unavailable"}
              </Text>
            </View>

            <View
              style={[
                styles.permissionBadge,
                permissionGranted
                  ? styles.permissionBadgeOn
                  : styles.permissionBadgeOff,
              ]}
            >
              <Text
                style={[
                  styles.permissionBadgeText,
                  permissionGranted
                    ? styles.permissionBadgeTextOn
                    : styles.permissionBadgeTextOff,
                ]}
              >
                {permissionGranted ? "On" : "Off"}
              </Text>
            </View>
          </View>

          <Pressable
            style={styles.actionRowButton}
            onPress={handleEnableSystemNotifications}
            disabled={checkingPermission}
          >
            <Ionicons name="shield-checkmark-outline" size={18} color="#053668" />
            <Text style={styles.actionRowButtonText}>
              {checkingPermission
                ? "Checking permission..."
                : "Enable / check system notifications"}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.actionRowButton, styles.testButton]}
            onPress={handleSendTestNotification}
            disabled={sendingTest}
          >
            <Ionicons name="send-outline" size={18} color="#053668" />
            <Text style={styles.actionRowButtonText}>
              {sendingTest ? "Sending test..." : "Send test notification"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Notification categories</Text>

          <ToggleRow
            title="Lost & Found updates"
            subtitle="Get notified when your lost and found posts are created, resolved, or updated"
            value={lostFoundUpdates}
            onChange={setLostFoundUpdates}
          />

          <ToggleRow
            title="Chat message updates"
            subtitle="Receive alerts for new Lost & Found or anonymous complaint chat messages"
            value={chatMessageUpdates}
            onChange={setChatMessageUpdates}
          />

          <ToggleRow
            title="Anonymous complaint updates"
            subtitle="See follow-up updates when complaint cases are submitted or resolved"
            value={complaintUpdates}
            onChange={setComplaintUpdates}
          />

          <ToggleRow
            title="Campus alerts"
            subtitle="Show important alerts such as offline mode or overcrowded building warnings"
            value={campusAlerts}
            onChange={setCampusAlerts}
          />
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Current status</Text>

          <Text style={styles.summaryText}>
            System permission:{" "}
            <Text style={styles.summaryStrong}>
              {permissionGranted === null
                ? "Not checked"
                : permissionGranted
                  ? "Enabled"
                  : "Disabled"}
            </Text>
          </Text>

          <Text style={styles.summaryText}>
            Enabled categories:{" "}
            <Text style={styles.summaryStrong}>{enabledCount} / 4</Text>
          </Text>

          <Text style={styles.summaryText}>
            Lost & Found updates:{" "}
            <Text style={styles.summaryStrong}>
              {lostFoundUpdates ? "On" : "Off"}
            </Text>
          </Text>
          <Text style={styles.summaryText}>
            Chat message updates:{" "}
            <Text style={styles.summaryStrong}>
              {chatMessageUpdates ? "On" : "Off"}
            </Text>
          </Text>
          <Text style={styles.summaryText}>
            Complaint updates:{" "}
            <Text style={styles.summaryStrong}>
              {complaintUpdates ? "On" : "Off"}
            </Text>
          </Text>
          <Text style={styles.summaryText}>
            Campus alerts:{" "}
            <Text style={styles.summaryStrong}>
              {campusAlerts ? "On" : "Off"}
            </Text>
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Good to know</Text>
          <Text style={styles.infoText}>
            These settings are saved on this device and directly control which
            UniLocate notifications should be shown. System delivery still also
            depends on your phone&apos;s notification permission and device
            settings.
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
  permissionCard: {
    marginHorizontal: 18,
    marginTop: 4,
    marginBottom: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  permissionTextWrap: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  permissionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: "#667085",
  },
  permissionBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  permissionBadgeOn: {
    backgroundColor: "#ECFDF3",
  },
  permissionBadgeOff: {
    backgroundColor: "#FEF3F2",
  },
  permissionBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  permissionBadgeTextOn: {
    color: "#027A48",
  },
  permissionBadgeTextOff: {
    color: "#B42318",
  },
  actionRowButton: {
    minHeight: 54,
    marginHorizontal: 18,
    marginBottom: 10,
    borderRadius: 16,
    backgroundColor: "#EDF3F8",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  testButton: {
    backgroundColor: "#FFF7ED",
  },
  actionRowButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#053668",
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