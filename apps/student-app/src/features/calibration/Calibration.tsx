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

import type { FirstRunStackParamList } from "../../navigation/FirstRunNavigator";
import { useUserProfileStore } from "../../store/useUserProfileStore";

type Props = NativeStackScreenProps<FirstRunStackParamList, "Calibration">;

export default function Calibration({ navigation }: Props) {
  const [wifiGpsReady] = React.useState(true);
  const [compassReady] = React.useState(true);
  const [barometerReady] = React.useState(false);

  const completeFirstRun = useUserProfileStore(
    (state) => state.completeFirstRun,
  );

  const passedCount = [wifiGpsReady, compassReady, barometerReady].filter(
    Boolean,
  ).length;

  const getStatusTone = (value: boolean) =>
    value ? styles.goodBadge : styles.warnBadge;
  const getStatusTextTone = (value: boolean) =>
    value ? styles.goodBadgeText : styles.warnBadgeText;

  const handleFinish = () => {
    completeFirstRun();
    navigation.replace("MainApp");
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

        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Device readiness</Text>
          <Text style={styles.heroTitle}>Calibration check</Text>
          <Text style={styles.heroSubtitle}>
            Verify that your phone sensors are ready for better indoor guidance
            and floor detection.
          </Text>
        </View>

        <View style={styles.checkCard}>
          <View style={styles.checkHeader}>
            <Ionicons name="wifi-outline" size={22} color="#053668" />
            <Text style={styles.checkTitle}>Wi-Fi & GPS</Text>
            <View style={[styles.badge, getStatusTone(wifiGpsReady)]}>
              <Text style={[styles.badgeText, getStatusTextTone(wifiGpsReady)]}>
                {wifiGpsReady ? "Ready" : "Check"}
              </Text>
            </View>
          </View>
          <Text style={styles.checkText}>
            Wi-Fi signals and location services help UniLocate estimate your
            campus position.
          </Text>
        </View>

        <View style={styles.checkCard}>
          <View style={styles.checkHeader}>
            <Ionicons name="compass-outline" size={22} color="#053668" />
            <Text style={styles.checkTitle}>Compass</Text>
            <View style={[styles.badge, getStatusTone(compassReady)]}>
              <Text style={[styles.badgeText, getStatusTextTone(compassReady)]}>
                {compassReady ? "Ready" : "Check"}
              </Text>
            </View>
          </View>
          <Text style={styles.checkText}>
            A calibrated compass improves direction guidance and map
            orientation.
          </Text>
        </View>

        <View style={styles.checkCard}>
          <View style={styles.checkHeader}>
            <MaterialCommunityIcons name="elevator" size={22} color="#053668" />
            <Text style={styles.checkTitle}>Barometer</Text>
            <View style={[styles.badge, getStatusTone(barometerReady)]}>
              <Text
                style={[styles.badgeText, getStatusTextTone(barometerReady)]}
              >
                {barometerReady ? "Ready" : "Optional"}
              </Text>
            </View>
          </View>
          <Text style={styles.checkText}>
            Barometer support helps improve altitude and floor-level detection
            on supported devices. This is optional and does not block setup.
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Current readiness</Text>
          <Text style={styles.summaryValue}>{passedCount}/3 checks passed</Text>
          <Text style={styles.summaryText}>
            Wi-Fi & GPS are the main requirement. Barometer is optional, so you
            can continue setup even if your device does not support it.
          </Text>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            style={[styles.button, styles.secondaryButton]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.primaryButton]}
            onPress={handleFinish}
          >
            <Text style={styles.primaryButtonText}>Finish setup</Text>
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
    paddingBottom: 36,
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 14,
  },
  logo: {
    width: 210,
    height: 60,
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
  checkCard: {
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
  },
  checkHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  checkText: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 20,
    color: "#667085",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  goodBadge: {
    backgroundColor: "#E7F6EC",
  },
  warnBadge: {
    backgroundColor: "#FFF4E8",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  goodBadgeText: {
    color: "#117A37",
  },
  warnBadgeText: {
    color: "#B54708",
  },
  summaryCard: {
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  summaryValue: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: "800",
    color: "#053668",
  },
  summaryText: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 20,
    color: "#667085",
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