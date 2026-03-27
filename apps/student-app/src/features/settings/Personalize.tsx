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

type Props = NativeStackScreenProps<SettingsStackParamList, "Personalize">;

type SelectRowProps = {
  title: string;
  subtitle: string;
  value: string;
  onPress?: () => void;
};

function SelectRow({ title, subtitle, value, onPress }: SelectRowProps) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowTextWrap}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>

      <View style={styles.rowRight}>
        <Text style={styles.rowValue}>{value}</Text>
        <Ionicons name="chevron-forward" size={18} color="#98A2B3" />
      </View>
    </Pressable>
  );
}

type ToggleRowProps = {
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

function ToggleRow({ title, subtitle, value, onChange }: ToggleRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowTextWrap}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
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

export default function Personalize({ navigation }: Props) {
  const textSize = useAppSettingsStore((state) => state.textSize);
  const language = useAppSettingsStore((state) => state.language);
  const compactCards = useAppSettingsStore((state) => state.compactCardsEnabled);
  const highContrastMap = useAppSettingsStore(
    (state) => state.highContrastMapEnabled,
  );

  const setTextSize = useAppSettingsStore((state) => state.setTextSize);
  const setLanguage = useAppSettingsStore((state) => state.setLanguage);
  const setCompactCards = useAppSettingsStore(
    (state) => state.setCompactCardsEnabled,
  );
  const setHighContrastMap = useAppSettingsStore(
    (state) => state.setHighContrastMapEnabled,
  );
  const resetPersonalizeSettings = useAppSettingsStore(
    (state) => state.resetPersonalizeSettings,
  );

  const cycleTextSize = () => {
    if (textSize === "Small") {
      setTextSize("Medium");
      return;
    }
    if (textSize === "Medium") {
      setTextSize("Large");
      return;
    }
    setTextSize("Small");
  };

  const cycleLanguage = () => {
    if (language === "English") {
      setLanguage("Sinhala");
      return;
    }
    if (language === "Sinhala") {
      setLanguage("Tamil");
      return;
    }
    setLanguage("English");
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
          <Text style={styles.headerTitle}>Personalize</Text>
          <Pressable
            style={styles.resetButton}
            onPress={resetPersonalizeSettings}
          >
            <Text style={styles.resetButtonText}>Reset</Text>
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="color-palette-outline" size={30} color="#053668" />
          </View>

          <View style={styles.heroTextWrap}>
            <Text style={styles.eyebrow}>Appearance</Text>
            <Text style={styles.heroTitle}>Make the app feel right for you</Text>
            <Text style={styles.heroSubtitle}>
              Adjust visual preferences and display choices for a more
              comfortable UniLocate experience.
            </Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Display</Text>

          <SelectRow
            title="Text size"
            subtitle="Choose how large interface text should appear"
            value={textSize}
            onPress={cycleTextSize}
          />

          <SelectRow
            title="Language"
            subtitle="Select the language used across the app"
            value={language}
            onPress={cycleLanguage}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>View options</Text>

          <ToggleRow
            title="Compact cards"
            subtitle="Show a tighter layout with less vertical spacing"
            value={compactCards}
            onChange={setCompactCards}
          />

          <ToggleRow
            title="High-contrast map"
            subtitle="Improve visual contrast for map and highlighted areas"
            value={highContrastMap}
            onChange={setHighContrastMap}
          />
        </View>

        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>Saved preferences</Text>
          <Text style={styles.previewText}>
            Text size: <Text style={styles.previewStrong}>{textSize}</Text>
          </Text>
          <Text style={styles.previewText}>
            Language: <Text style={styles.previewStrong}>{language}</Text>
          </Text>
          <Text style={styles.previewText}>
            Compact cards:{" "}
            <Text style={styles.previewStrong}>
              {compactCards ? "On" : "Off"}
            </Text>
          </Text>
          <Text style={styles.previewText}>
            High-contrast map:{" "}
            <Text style={styles.previewStrong}>
              {highContrastMap ? "On" : "Off"}
            </Text>
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
  row: {
    minHeight: 78,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
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
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: "#667085",
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#053668",
  },
  previewCard: {
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
  },
  previewText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#667085",
  },
  previewStrong: {
    color: "#053668",
    fontWeight: "700",
  },
});