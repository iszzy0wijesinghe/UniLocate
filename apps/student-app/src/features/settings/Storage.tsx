/** @format */

import React from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import type { SettingsStackParamList } from "../../navigation/SettingsNavigator";
import {
  clearTemporaryCache,
  exportAppData,
  formatBytes,
  getAppStorageSnapshot,
  importAppData,
} from "./storageTools";

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
  danger?: boolean;
  loading?: boolean;
};

function ActionCard({
  icon,
  title,
  subtitle,
  onPress,
  danger,
  loading,
}: ActionCardProps) {
  return (
    <Pressable
      style={[styles.actionCard, danger && styles.actionCardDanger]}
      onPress={onPress}
      disabled={loading}>
      <View
        style={[
          styles.actionIconWrap,
          danger && styles.actionIconWrapDanger,
        ]}>
        {loading ? <ActivityIndicator size="small" color="#053668" /> : icon}
      </View>

      <View style={styles.actionTextWrap}>
        <Text style={[styles.actionTitle, danger && styles.actionTitleDanger]}>
          {title}
        </Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#98A2B3" />
    </Pressable>
  );
}

export default function Storage({ navigation }: Props) {
  const [loading, setLoading] = React.useState(true);
  const [busyAction, setBusyAction] = React.useState<
    "export" | "import" | "clear" | null
  >(null);

  const [snapshot, setSnapshot] = React.useState({
    totalBytes: 0,
    totalKeys: 0,
    locationLogsCount: 0,
    chatCacheCount: 0,
    complaintSessionCount: 0,
  });

  const loadSnapshot = React.useCallback(async () => {
    try {
      setLoading(true);
      const next = await getAppStorageSnapshot();
      setSnapshot({
        totalBytes: next.totalBytes,
        totalKeys: next.totalKeys,
        locationLogsCount: next.locationLogsCount,
        chatCacheCount: next.chatCacheCount,
        complaintSessionCount: next.complaintSessionCount,
      });
    } catch (error: any) {
      Alert.alert(
        "Storage error",
        error?.message || "Failed to load storage details.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  const totalUsedPercent = Math.min(
    100,
    Math.max(6, Math.round((snapshot.totalBytes / (25 * 1024 * 1024)) * 100)),
  );

  const handleExport = async () => {
    try {
      setBusyAction("export");
      await exportAppData();
      Alert.alert(
        "Export ready",
        "Your UniLocate backup file was prepared and shared successfully.",
      );
    } catch (error: any) {
      Alert.alert("Export failed", error?.message || "Could not export data.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleImport = async () => {
    try {
      setBusyAction("import");
      const result = await importAppData();

      if (result.skipped) {
        setBusyAction(null);
        return;
      }

      await loadSnapshot();

      Alert.alert(
        "Import completed",
        // `${result.imported} saved storage entries were restored successfully.`,
        `Backup restored successfully.`,
      );
    } catch (error: any) {
      Alert.alert("Import failed", error?.message || "Could not import backup.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      "Clear cached local data?",
      "This will remove saved location logs, cached chat data, and complaint session cache stored on this device. Profile-related account data will not be removed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              setBusyAction("clear");
              const removedCount = await clearTemporaryCache();
              await loadSnapshot();

              Alert.alert(
                "Cache cleared",
                `${removedCount} cached storage entries were removed successfully.`,
              );
            } catch (error: any) {
              Alert.alert(
                "Clear failed",
                error?.message || "Could not clear cached data.",
              );
            } finally {
              setBusyAction(null);
            }
          },
        },
      ],
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
            onPress={() => navigation.goBack()}>
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
              View how much space UniLocate uses for local logs, complaint
              sessions, and cached chat data saved on this device.
            </Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Usage overview</Text>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#053668" />
              <Text style={styles.loadingBoxText}>Loading storage data...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.bigValue}>
                {formatBytes(snapshot.totalBytes)}
              </Text>
              <Text style={styles.bigValueHint}>
                Local UniLocate data currently stored on this device
              </Text>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${totalUsedPercent}%` },
                  ]}
                />
              </View>

              <UsageRow
                label="Saved location logs"
                value={`${snapshot.locationLogsCount} items`}
              />
              <UsageRow
                label="Cached Lost & Found chats"
                value={`${snapshot.chatCacheCount} items`}
              />
              <UsageRow
                label="Saved complaint sessions"
                value={`${snapshot.complaintSessionCount} items`}
              />
              <UsageRow
                label="Tracked local storage keys"
                value={`${snapshot.totalKeys} keys`}
              />
            </>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Storage actions</Text>

          <ActionCard
            icon={<Ionicons name="download-outline" size={20} color="#053668" />}
            title="Export data"
            subtitle="Create an encrypted UniLocate backup file for this app"
            onPress={handleExport}
            loading={busyAction === "export"}
          />

          <ActionCard
            icon={<Ionicons name="cloud-upload-outline" size={20} color="#053668" />}
            title="Import data"
            subtitle="Restore a previously exported UniLocate backup file"
            onPress={handleImport}
            loading={busyAction === "import"}
          />

          <ActionCard
            icon={<Ionicons name="trash-outline" size={20} color="#C2410C" />}
            title="Clear temporary cache"
            subtitle="Remove saved logs, complaint sessions, and chat cache from this device"
            onPress={handleClearCache}
            danger
            loading={busyAction === "clear"}
          />
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Important</Text>
          <Text style={styles.infoText}>
            Exported backups are encrypted for UniLocate import use. Clearing
            cached local data may remove saved location logs, complaint session
            history, and Lost & Found chat cache from this device.
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
  actionCardDanger: {},
  actionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EDF3F8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  actionIconWrapDanger: {
    backgroundColor: "#FFF1F2",
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
  actionTitleDanger: {
    color: "#C2410C",
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
  loadingBox: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingBoxText: {
    marginTop: 8,
    fontSize: 13,
    color: "#667085",
    fontWeight: "600",
  },
});