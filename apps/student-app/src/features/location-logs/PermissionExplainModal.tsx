/** @format */

import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

type PermissionKind =
  | "location"
  | "notifications"
  | "storage"
  | "wifi"
  | "barometer"
  | "sensors";

type Props = {
  visible: boolean;
  type: PermissionKind;
  onClose: () => void;
  onAllow: () => void;
};

const permissionContent: Record<
  PermissionKind,
  {
    title: string;
    subtitle: string;
    body: string;
    iconSet: "ionicons" | "material";
    iconName: string;
  }
> = {
  location: {
    title: "Allow GPS Access",
    subtitle: "Needed for campus location history",
    body:
      "UniLocate uses your location only while you are within the campus area to save hourly location logs for the past 3 days. These logs help you track where you may have lost an item and improve app features like Lost & Found.",
    iconSet: "ionicons",
    iconName: "location",
  },
  notifications: {
    title: "Allow Notifications",
    subtitle: "Get updates that matter",
    body:
      "Turn on notifications to receive alerts for complaint updates, lost and found activity, reminders, and important campus-related events in the app.",
    iconSet: "ionicons",
    iconName: "notifications",
  },
  storage: {
    title: "Allow Device Storage Usage",
    subtitle: "Save your logs and app data securely",
    body:
      "UniLocate stores location logs, preferences, and offline app data securely on your device so you can access useful information later and export or clear it when needed.",
    iconSet: "material",
    iconName: "database-outline",
  },
  wifi: {
    title: "Allow Wi-Fi Status Access",
    subtitle: "Improve campus connectivity insights",
    body:
      "UniLocate can use available network information to show connection quality indicators and improve some smart campus features. This does not collect your private browsing activity.",
    iconSet: "ionicons",
    iconName: "wifi",
  },
  barometer: {
    title: "Allow Barometer Access",
    subtitle: "Improve indoor context awareness",
    body:
      "If your device supports a barometer, UniLocate can use it to improve smart environmental sensing and future indoor context features. Unsupported devices will continue normally.",
    iconSet: "material",
    iconName: "speedometer",
  },
  sensors: {
    title: "Allow Sensor Access",
    subtitle: "Enable smarter campus features",
    body:
      "UniLocate may use supported device sensors to improve movement awareness, campus intelligence features, and future smart assistance. Devices without these sensors can still use the app.",
    iconSet: "material",
    iconName: "access-point",
  },
};

export default function PermissionExplainModal({
  visible,
  type,
  onClose,
  onAllow,
}: Props) {
  const content = permissionContent[type];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          <View style={styles.iconWrap}>
            {content.iconSet === "ionicons" ? (
              <Ionicons
                name={content.iconName as any}
                size={34}
                color="#053668"
              />
            ) : (
              <MaterialCommunityIcons
                name={content.iconName as any}
                size={34}
                color="#053668"
              />
            )}
          </View>

          <Text style={styles.title}>{content.title}</Text>
          <Text style={styles.subtitle}>{content.subtitle}</Text>
          <Text style={styles.body}>{content.body}</Text>

          <View style={styles.buttonRow}>
            <Pressable style={styles.notNowButton} onPress={onClose}>
              <Text style={styles.notNowText}>Not Now</Text>
            </Pressable>

            <Pressable style={styles.allowButton} onPress={onAllow}>
              <Text style={styles.allowText}>Allow</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(7,16,28,0.48)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#EEF5FB",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    textAlign: "center",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    color: "#053668",
  },
  subtitle: {
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    color: "#FF7100",
    marginTop: 6,
  },
  body: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 22,
    color: "#51606F",
    marginTop: 14,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 22,
  },
  notNowButton: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#EEF2F6",
    alignItems: "center",
    justifyContent: "center",
  },
  notNowText: {
    color: "#5D6B79",
    fontSize: 15,
    fontWeight: "800",
  },
  allowButton: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#053668",
    alignItems: "center",
    justifyContent: "center",
  },
  allowText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});