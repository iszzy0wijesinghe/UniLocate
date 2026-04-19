/** @format */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import CampusMap2D, {
  type CampusBoundary,
  type CampusZone,
} from "../home/components/CampusMap2D";
import {
  getLocationLogs,
  clearAllLocationLogs,
  clearLocationLogsForDate,
  deleteSingleLocationLog,
} from "../location-logs/storage";
import { loadSharedCampusMap } from "../location-logs/sharedMapLoader";
import type {
  LocationLogPoint,
  LocationLogsByDate,
} from "../location-logs/types";
import type { SettingsStackParamList } from "../../navigation/SettingsNavigator";
import { useLiveLocation } from "../../services/geo/useLiveLocation";

type Props = NativeStackScreenProps<SettingsStackParamList, "LocationLogs">;

function formatDateHeading(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatLogTime(timestamp: string) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildDetailText(item: LocationLogPoint) {
  if (item.zoneName?.trim()) {
    return `Detected inside ${item.zoneName}`;
  }

  if (item.insideCampus) {
    return "Detected inside campus boundary";
  }

  return "Saved location point";
}

function LogCard({
  item,
  selected,
  onPress,
  onDelete,
}: {
  item: LocationLogPoint;
  selected: boolean;
  onPress: () => void;
  onDelete: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.logCard, selected && styles.logCardSelected]}>
      <View style={styles.logIconWrap}>
        <Ionicons
          name={selected ? "location" : "location-outline"}
          size={18}
          color="#053668"
        />
      </View>

      <View style={styles.logTextWrap}>
        <Text style={styles.logTitle}>
          {item.zoneName || "Campus Location"}
        </Text>
        <Text style={styles.logTime}>{formatLogTime(item.timestamp)}</Text>
        <Text style={styles.logDetail}>{buildDetailText(item)}</Text>
      </View>

      <View style={styles.logRightActions}>
        {selected ? (
          <View style={styles.selectedBadge}>
            <Text style={styles.selectedBadgeText}>Selected</Text>
          </View>
        ) : null}

        <Pressable style={styles.deleteLogButton} onPress={onDelete}>
          <Ionicons name="trash-outline" size={17} color="#BE123C" />
        </Pressable>
      </View>
    </Pressable>
  );
}

export default function LocationLogs({ navigation }: Props) {
  const [logsByDate, setLogsByDate] = useState<LocationLogsByDate>({});
  const [selectedLog, setSelectedLog] = useState<LocationLogPoint | null>(null);

  const [boundary, setBoundary] = useState<CampusBoundary | null>(null);
  const [zones, setZones] = useState<CampusZone[]>([]);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState("");

  const [logsLoading, setLogsLoading] = useState(true);

  const { point } = useLiveLocation();

  const [pageScrollEnabled, setPageScrollEnabled] = useState(true);
  const [mapRefreshKey, setMapRefreshKey] = useState(0);

  const [gpsAccuracyText, setGpsAccuracyText] = useState("GPS");

  const initialCenterAppliedRef = useRef(false);

  const sortedDateKeys = useMemo(() => {
    return Object.keys(logsByDate).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime(),
    );
  }, [logsByDate]);

  const selectedMapPoint = useMemo(() => {
    if (selectedLog) {
      return { lat: selectedLog.lat, lng: selectedLog.lng };
    }

    if (point) {
      return { lat: point.lat, lng: point.lng };
    }

    return null;
  }, [selectedLog, point]);

  const loadLogs = useCallback(async () => {
    try {
      setLogsLoading(true);
      const data = await getLocationLogs();
      setLogsByDate(data);

      const sortedKeys = Object.keys(data).sort(
        (a, b) => new Date(b).getTime() - new Date(a).getTime(),
      );

      const allLogs = sortedKeys.flatMap((key) => data[key] ?? []);

      if (allLogs.length === 0) {
        setSelectedLog(null);
        return;
      }

      setSelectedLog((prev) => {
        if (!prev) return allLogs[0];

        const stillExists = allLogs.find((item) => item.id === prev.id) ?? null;
        return stillExists ?? allLogs[0];
      });
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const handleDeleteSingleLog = (item: LocationLogPoint) => {
    Alert.alert(
      "Delete this log?",
      "This will remove only this selected location log.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteSingleLocationLog(item.dateKey, item.id);
            await loadLogs();

            if (selectedLog?.id === item.id) {
              setSelectedLog(null);
            }
          },
        },
      ],
    );
  };

  const loadMap = useCallback(async () => {
    try {
      setMapLoading(true);
      setMapError("");

      const mapData = await loadSharedCampusMap();
      setBoundary(mapData.boundary);
      setZones(mapData.zones);
    } catch (error: any) {
      console.error("[location-logs] failed to load shared map", error);
      setMapError(error?.message || "Failed to load campus map");
    } finally {
      setMapLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
    loadMap();
  }, [loadLogs, loadMap]);

  useFocusEffect(
    useCallback(() => {
      loadLogs();
    }, [loadLogs]),
  );

  useEffect(() => {
    if (selectedLog?.accuracy != null) {
      setGpsAccuracyText(`±${Math.round(selectedLog.accuracy)}m`);
      return;
    }

    if (point?.accuracy != null) {
      setGpsAccuracyText(`±${Math.round(point.accuracy)}m`);
      return;
    }

    setGpsAccuracyText("--");
  }, [selectedLog, point?.accuracy]);

  useEffect(() => {
    if (!point) return;
    if (initialCenterAppliedRef.current) return;

    initialCenterAppliedRef.current = true;
    setMapRefreshKey((prev) => prev + 1);
  }, [point]);

  const handleClearAll = () => {
    Alert.alert(
      "Clear all location logs?",
      "This will remove all saved location logs from this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            await clearAllLocationLogs();
            await loadLogs();
          },
        },
      ],
    );
  };

  const handleClearDate = (dateKey: string) => {
    Alert.alert(
      "Clear this date?",
      `Remove all logs saved for ${formatDateHeading(dateKey)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await clearLocationLogsForDate(dateKey);
            await loadLogs();
          },
        },
      ],
    );
  };

  const totalLogCount = useMemo(() => {
    return Object.values(logsByDate).reduce((sum, day) => sum + day.length, 0);
  }, [logsByDate]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        scrollEnabled={pageScrollEnabled}
        nestedScrollEnabled>
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
          <Text style={styles.headerTitle}>Location Logs</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="time-outline" size={30} color="#053668" />
          </View>

          <View style={styles.heroTextWrap}>
            <Text style={styles.eyebrow}>History</Text>
            <Text style={styles.heroTitle}>
              Review recent location activity
            </Text>
            <Text style={styles.heroSubtitle}>
              These logs are stored on your device and can help identify where
              you may have been on campus recently.
            </Text>
          </View>
        </View>

        {__DEV__ ? (
          <View style={styles.devNoteCard}>
            <Ionicons name="code-slash-outline" size={16} color="#B45309" />
            <Text style={styles.devNoteText}>
              Development mode is active. Campus-boundary-only logging is
              temporarily relaxed.
            </Text>
          </View>
        ) : null}

        <View style={styles.mapCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Map preview</Text>

            <Pressable
              style={styles.headerActionButton}
              onPress={() => {
                setSelectedLog(null);
                setMapRefreshKey((prev) => prev + 1);
              }}>
              <Text style={styles.headerActionText}>Current Location</Text>
            </Pressable>
          </View>

          <View
            style={styles.mapWrap}
            onTouchStart={() => setPageScrollEnabled(false)}
            onTouchEnd={() => setPageScrollEnabled(true)}
            onTouchCancel={() => setPageScrollEnabled(true)}>
            {mapLoading ? (
              <View style={styles.mapStateWrap}>
                <ActivityIndicator size="small" color="#053668" />
                <Text style={styles.mapStateText}>Loading campus map...</Text>
              </View>
            ) : mapError ? (
              <View style={styles.mapStateWrap}>
                <Ionicons
                  name="alert-circle-outline"
                  size={22}
                  color="#C2410C"
                />
                <Text style={styles.mapErrorText}>{mapError}</Text>
              </View>
            ) : (
              <View style={styles.mapCanvas}>
                <CampusMap2D
                  key={mapRefreshKey}
                  zones={zones}
                  boundary={boundary}
                  userLocation={selectedMapPoint}
                  selectedZoneId={selectedLog?.zoneId ?? null}
                  onZonePress={() => {}}
                  onLocateMePress={() => {
                    setSelectedLog(null);
                    setMapRefreshKey((prev) => prev + 1);
                  }}
                  networkOk={true}
                  networkSpeedText=""
                  gpsAccuracyText={gpsAccuracyText}
                  isPinging={false}
                  lastPingAt={
                    selectedLog ? new Date(selectedLog.timestamp) : null
                  }
                />
              </View>
            )}
          </View>

          <View style={styles.mapHintCard}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="#6B7280"
            />
            <Text style={styles.mapHintText}>
              Tap a saved log below to show that location on the campus map.
            </Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Saved logs</Text>

            <View style={styles.headerActions}>
              <Pressable
                style={[
                  styles.headerActionButton,
                  styles.headerActionButtonMuted,
                ]}
                onPress={() =>
                  Alert.alert(
                    "Export not ready yet",
                    "Export will be connected from the Storage page next.",
                  )
                }>
                <Text style={styles.headerActionText}>Export</Text>
              </Pressable>

              <Pressable
                style={styles.headerActionButton}
                onPress={handleClearAll}>
                <Text style={styles.headerActionText}>Clear All</Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.summaryText}>
            {totalLogCount} saved log{totalLogCount === 1 ? "" : "s"} across{" "}
            {sortedDateKeys.length} day{sortedDateKeys.length === 1 ? "" : "s"}.
          </Text>

          {logsLoading ? (
            <View style={styles.emptyStateCard}>
              <ActivityIndicator size="small" color="#053668" />
              <Text style={styles.emptyStateText}>Loading saved logs...</Text>
            </View>
          ) : sortedDateKeys.length === 0 ? (
            <View style={styles.emptyStateCard}>
              <Ionicons name="location-outline" size={24} color="#98A2B3" />
              <Text style={styles.emptyStateTitle}>No location logs yet</Text>
              <Text style={styles.emptyStateText}>
                Once the app starts saving campus location history, your recent
                logs will appear here.
              </Text>
            </View>
          ) : (
            sortedDateKeys.map((dateKey) => {
              const items = logsByDate[dateKey] ?? [];

              return (
                <View key={dateKey} style={styles.daySection}>
                  <View style={styles.dayHeader}>
                    <View style={styles.dayHeaderTextWrap}>
                      <Text style={styles.dayTitle}>
                        {formatDateHeading(dateKey)}
                      </Text>
                      <Text style={styles.dayCount}>
                        {items.length} log{items.length === 1 ? "" : "s"}
                      </Text>
                    </View>

                    <Pressable
                      style={styles.dayClearButton}
                      onPress={() => handleClearDate(dateKey)}>
                      <Text style={styles.dayClearButtonText}>Clear</Text>
                    </Pressable>
                  </View>

                  {items.map((item) => (
                    <LogCard
                      key={item.id}
                      item={item}
                      selected={selectedLog?.id === item.id}
                      onPress={() => {
                        setSelectedLog(item);
                        setPageScrollEnabled(true);
                        setMapRefreshKey((prev) => prev + 1);
                      }}
                      onDelete={() => handleDeleteSingleLog(item)}
                    />
                  ))}
                </View>
              );
            })
          )}
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
    paddingTop: 10,
    paddingBottom: 120,
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 10,
    marginTop: 4,
  },
  logo: {
    width: 200,
    height: 60,
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
    shadowColor: "#053668",
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
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

  devNoteCard: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FFF7ED",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FED7AA",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  devNoteText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: "#9A3412",
    fontWeight: "600",
  },

  mapCard: {
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
  },
  mapWrap: {
    marginTop: 10,
    overflow: "hidden",
    borderRadius: 24,
    backgroundColor: "#EEF3F8",
    height: 330,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  mapCanvas: {
    flex: 1,
  },
  mapStateWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    gap: 8,
  },
  mapStateText: {
    fontSize: 13,
    color: "#667085",
    fontWeight: "600",
    textAlign: "center",
  },
  mapErrorText: {
    fontSize: 13,
    color: "#C2410C",
    fontWeight: "700",
    textAlign: "center",
  },
  mapHintCard: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#F5F7FA",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  mapHintText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: "#6B7280",
  },

  sectionCard: {
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  headerActionButtonMuted: {
    opacity: 0.75,
  },
  headerActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#053668",
  },
  summaryText: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    color: "#667085",
  },

  daySection: {
    marginTop: 16,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    gap: 12,
  },
  dayHeaderTextWrap: {
    flex: 1,
  },
  dayTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  dayCount: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
    color: "#667085",
  },
  dayClearButton: {
    backgroundColor: "#FFF1F2",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  dayClearButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#BE123C",
  },

  logCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginTop: 10,
  },
  logCardSelected: {
    borderColor: "#053668",
    backgroundColor: "#F2F7FC",
    shadowColor: "#053668",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
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
    marginTop: 7,
    fontSize: 12.5,
    lineHeight: 18,
    color: "#617281",
    minHeight: 54,
  },
  selectedBadge: {
    marginLeft: 10,
    backgroundColor: "#053668",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  selectedBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  emptyStateCard: {
    marginTop: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 18,
    alignItems: "center",
  },
  emptyStateTitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },
  emptyStateText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: "#667085",
    textAlign: "center",
  },
  logRightActions: {
    marginLeft: 10,
    alignItems: "flex-end",
    gap: 8,
  },

  deleteLogButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFF1F2",
    alignItems: "center",
    justifyContent: "center",
  },
});
