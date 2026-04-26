/** @format */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import CampusMap2D, {
  type CampusBoundary,
  type CampusZone,
} from "./components/CampusMap2D";
import { useLiveLocation } from "../../services/geo/useLiveLocation";
import {
  fetchBoundary,
  fetchOccupancyZones,
  type Boundary,
  type OccupancyZone,
  type Zone,
} from "../../services/api/unilocateApi";
import { useUserProfileStore } from "../../store/useUserProfileStore";
import { useLocationLogger } from "../location-logs/useLocationLogger";
import { sendLocationEvent } from "../../services/api/unilocateApi";
import { getDeviceId } from "../../services/device/getDeviceId";
import {
  notifyOfflineMode,
  notifyOvercrowdedBuilding,
} from "../../services/notifications/notificationService";

const { width, height } = Dimensions.get("window");

const chips = ["Bird Nest", "Anohana Canteen", "SLIIT Wala"];

function getGreeting(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return "Good Morning!";
  if (hour < 17) return "Good Afternoon!";
  return "Good Evening!";
}

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

type MapLoadState = "idle" | "loading" | "ready" | "slow" | "error";

function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms),
    ),
  ]);
}

// function normalizeText(value: string) {
//   return value.trim().toLowerCase().replace(/\s+/g, " ");
// }

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "")
    .trim();
}

function getStatusColors(status?: string) {
  switch (status) {
    case "Free":
      return { bg: "#E8F7EE", text: "#1E8E5A" };
    case "Available":
      return { bg: "#E7F3FF", text: "#1565C0" };
    case "Almost Full":
      return { bg: "#FFF4E5", text: "#D97706" };
    case "Crowded":
      return { bg: "#FDECEC", text: "#D93025" };
    default:
      return { bg: "#EEF2F6", text: "#6B7280" };
  }
}

function isStudyFoodArea(zone?: OccupancyZone | null) {
  return zone?.area_group === "study_food";
}

function isCommonSpace(zone?: OccupancyZone | null) {
  return zone?.area_group === "common_space";
}

function isStructuredSpace(zone?: OccupancyZone | null) {
  return zone?.area_group === "structured_space";
}

function hasLimitedCapacity(zone?: OccupancyZone | null) {
  return zone?.capacity_mode === "limited";
}

function prettyZoneName(zone?: OccupancyZone | null) {
  return (zone?.display_name || zone?.name || "").replace(/_/g, " ");
}

function convertBackendZones(zones: Zone[]): CampusZone[] {
  return zones
    .filter((zone) => zone.id !== "zone_test_1")
    .map((zone) => {
      let coords: unknown;

      if (zone.polygon_geojson?.type === "Polygon") {
        coords = zone.polygon_geojson.coordinates?.[0];
      } else if (zone.polygon_geojson?.type === "MultiPolygon") {
        coords = zone.polygon_geojson.coordinates?.[0]?.[0];
      }

      if (!Array.isArray(coords)) return null;

      const polygon = coords
        .map((point: unknown) => {
          if (!Array.isArray(point) || point.length < 2) return null;

          const lng = Number(point[0]);
          const lat = Number(point[1]);

          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

          return { lat, lng };
        })
        .filter(Boolean) as { lat: number; lng: number }[];

      if (polygon.length < 3) return null;

      return {
        id: zone.id,
        name: zone.name,
        type: zone.type,
        polygon,
      };
    })
    .filter(Boolean) as CampusZone[];
}

function convertOccupancyZones(zones: OccupancyZone[]): CampusZone[] {
  return zones
    .filter((zone) => zone.id !== "zone_test_1")
    .map((zone) => {
      let coords: unknown;

      if (zone.polygon_geojson?.type === "Polygon") {
        coords = zone.polygon_geojson.coordinates?.[0];
      } else if (zone.polygon_geojson?.type === "MultiPolygon") {
        coords = zone.polygon_geojson.coordinates?.[0]?.[0];
      }

      if (!Array.isArray(coords)) return null;

      const polygon = coords
        .map((point: unknown) => {
          if (!Array.isArray(point) || point.length < 2) return null;

          const lng = Number(point[0]);
          const lat = Number(point[1]);

          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

          return { lat, lng };
        })
        .filter(Boolean) as { lat: number; lng: number }[];

      if (polygon.length < 3) return null;

      return {
        id: zone.id,
        name: zone.display_name || zone.name,
        type: zone.type,
        polygon,
      };
    })
    .filter(Boolean) as CampusZone[];
}

function convertBoundary(boundary: Boundary): CampusBoundary | null {
  let coords: unknown;

  if (boundary.polygon_geojson?.type === "Polygon") {
    coords = boundary.polygon_geojson.coordinates?.[0];
  } else if (boundary.polygon_geojson?.type === "MultiPolygon") {
    coords = boundary.polygon_geojson.coordinates?.[0]?.[0];
  }

  if (!Array.isArray(coords)) return null;

  const polygon = coords
    .map((point: unknown) => {
      if (!Array.isArray(point) || point.length < 2) return null;

      const lng = Number(point[0]);
      const lat = Number(point[1]);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      return { lat, lng };
    })
    .filter(Boolean) as { lat: number; lng: number }[];

  if (polygon.length < 3) return null;

  return {
    id: boundary.id,
    name: boundary.name,
    polygon,
  };
}

function findMatchingOccupancyZone(
  query: string,
  occupancyZones: OccupancyZone[],
) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) return null;

  const exactMatch =
    occupancyZones.find(
      (zone) =>
        normalizeText(zone.display_name || "") === normalizedQuery ||
        normalizeText(zone.name || "") === normalizedQuery ||
        normalizeText(zone.id || "") === normalizedQuery,
    ) ?? null;

  if (exactMatch) return exactMatch;

  const partialMatch =
    occupancyZones.find(
      (zone) =>
        normalizeText(zone.display_name || "").includes(normalizedQuery) ||
        normalizeText(zone.name || "").includes(normalizedQuery) ||
        normalizeText(zone.id || "").includes(normalizedQuery),
    ) ?? null;

  return partialMatch;
}

function isPointInPolygon(
  point: { lat: number; lng: number },
  polygon: { lat: number; lng: number }[],
) {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi + 0.0000001) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

function findMatchedZoneId(
  point: { lat: number; lng: number } | null,
  zones: CampusZone[],
) {
  if (!point) return null;

  const matched = zones.find((zone) => isPointInPolygon(point, zone.polygon));
  return matched?.id ?? null;
}

export default function Home() {
  const [selectedChip, setSelectedChip] = useState("Bird Nest");
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [now, setNow] = useState(new Date());
  // const [zones, setZones] = useState<CampusZone[]>([]);
  // const [boundary, setBoundary] = useState<CampusBoundary | null>(null);
  const [zones, setZones] = useState<CampusZone[]>([]);

  const [occupancyZones, setOccupancyZones] = useState<OccupancyZone[]>([]);
  const [boundary, setBoundary] = useState<CampusBoundary | null>(null);
  useLocationLogger({ boundary, zones });

  const [zonesStatus, setZonesStatus] = useState("Loading map...");
  const [zonesError, setZonesError] = useState("");
  const [mapRefreshKey, setMapRefreshKey] = useState(0);

  const [mapLoadState, setMapLoadState] = useState<MapLoadState>("idle");
  const [mapErrorMessage, setMapErrorMessage] = useState("");
  const latestMapRequestId = useRef(0);
  const cachedOccupancyZonesRef = useRef<OccupancyZone[]>([]);
  const cachedBoundaryRef = useRef<CampusBoundary | null>(null);

  const [isPinging, setIsPinging] = useState(false);
  const [lastPingAt, setLastPingAt] = useState<Date | null>(null);
  const [networkOk, setNetworkOk] = useState(true);
  const [gpsAccuracyText, setGpsAccuracyText] = useState("GPS");
  const [networkSpeedText, setNetworkSpeedText] = useState("-- Mbps");

  const username = useUserProfileStore((state: any) => state.username);
  const userId = useUserProfileStore((state: any) => state.userId);
  const displayName = username?.trim() ? username.trim() : "Campus User";

  const { point } = useLiveLocation();

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const livePingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const previousZoneIdRef = useRef<string | null>(null);

  const offlineNotifiedRef = useRef(false);
  const overcrowdedNotifiedRef = useRef<string | null>(null);

  const lastPingSentAtRef = useRef<number>(0);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  const currentMatchedZoneId = useMemo(() => {
    if (!point) return null;

    return findMatchedZoneId({ lat: point.lat, lng: point.lng }, zones);
  }, [point, zones]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // useEffect(() => {
  //   Promise.all([fetchOccupancyZones(), fetchBoundary()])
  //     .then(([zoneData, boundaryData]) => {
  //       const convertedZones = convertOccupancyZones(zoneData);
  //       const convertedBoundary = convertBoundary(boundaryData);

  //       setOccupancyZones(zoneData);
  //       setZones(convertedZones);
  //       setBoundary(convertedBoundary);
  //       setZonesStatus(`${convertedZones.length} zones loaded`);
  //     })
  //     .catch((err) => {
  //       console.error(err);
  //       setZonesError(err.message || "Failed to load map");
  //       setZonesStatus("Map loading failed");
  //     });
  // }, []);

  useEffect(() => {
    const loadInitialMap = async () => {
      const requestId = ++latestMapRequestId.current;

      try {
        setMapLoadState("loading");
        setMapErrorMessage("");
        setZonesError("");
        setZonesStatus("Loading map...");

        const [zoneData, boundaryData] = await withTimeout(
          Promise.all([fetchOccupancyZones(), fetchBoundary()]),
          8000,
        );

        if (requestId !== latestMapRequestId.current) return;

        const convertedZones = convertOccupancyZones(zoneData);
        const convertedBoundary = convertBoundary(boundaryData);

        cachedOccupancyZonesRef.current = zoneData;
        cachedBoundaryRef.current = convertedBoundary;

        setOccupancyZones(zoneData);
        setZones(convertedZones);
        setBoundary(convertedBoundary);
        setZonesStatus(`${convertedZones.length} zones loaded`);
        setZonesError("");
        setMapErrorMessage("");
        setMapLoadState("ready");
        setNetworkOk(true);
      } catch (err: any) {
        if (requestId !== latestMapRequestId.current) return;

        const cachedZones = cachedOccupancyZonesRef.current;
        const cachedBoundary = cachedBoundaryRef.current;

        if (cachedZones.length > 0) {
          setOccupancyZones(cachedZones);
          setZones(convertOccupancyZones(cachedZones));
          setBoundary(cachedBoundary);
          setZonesStatus(`Showing cached map · ${cachedZones.length} zones`);
        } else {
          setZonesStatus("Map loading failed");
        }

        setNetworkOk(false);
        setMapLoadState("slow");
        setMapErrorMessage("Network Slow. Could Not Load Map.");
        setZonesError("Network Slow. Could Not Load Map.");

        console.log("[home] map loading failed:", err?.message);
      }
    };

    loadInitialMap();
  }, []);

  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     fetchOccupancyZones()
  //       .then((zoneData) => {
  //         setOccupancyZones(zoneData);
  //         setZones(convertOccupancyZones(zoneData));
  //       })
  //       .catch((err) => {
  //         console.error("Failed to refresh occupancy zones:", err);
  //       });
  //   }, 10000);

  //   return () => clearInterval(interval);
  // }, []);

  useEffect(() => {
    const refreshOccupancy = async () => {
      const requestId = ++latestMapRequestId.current;

      try {
        const zoneData = await withTimeout(fetchOccupancyZones(), 6000);

        if (requestId !== latestMapRequestId.current) return;

        cachedOccupancyZonesRef.current = zoneData;

        setOccupancyZones(zoneData);
        setZones(convertOccupancyZones(zoneData));
        setZonesStatus(`${zoneData.length} zones loaded`);
        setZonesError("");
        setMapErrorMessage("");
        setMapLoadState("ready");
        setNetworkOk(true);
      } catch (err: any) {
        if (requestId !== latestMapRequestId.current) return;

        const cachedZones = cachedOccupancyZonesRef.current;

        if (cachedZones.length > 0) {
          setOccupancyZones(cachedZones);
          setZones(convertOccupancyZones(cachedZones));
          setZonesStatus(`Showing cached map · ${cachedZones.length} zones`);
        }

        setNetworkOk(false);
        setMapLoadState("slow");
        setMapErrorMessage("Network Slow. Could Not Load Map.");
        setZonesError("Network Slow. Could Not Load Map.");

        console.log("[home] failed to refresh occupancy zones:", err?.message);
      }
    };

    const interval = setInterval(refreshOccupancy, 10000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (point?.accuracy != null) {
      const acc = Math.round(point.accuracy);
      setGpsAccuracyText(`±${acc}m`);
    } else {
      setGpsAccuracyText("--");
    }
  }, [point?.accuracy]);

  useEffect(() => {
    const runPingIndicator = async () => {
      try {
        setIsPinging(true);

        const start = Date.now();

        await new Promise((resolve) =>
          setTimeout(resolve, 300 + Math.random() * 600),
        );

        const duration = Date.now() - start;

        setLastPingAt(new Date());

        if (duration < 250) {
          setNetworkSpeedText("18 Mbps");
          setNetworkOk(true);
        } else if (duration < 500) {
          setNetworkSpeedText("9 Mbps");
          setNetworkOk(true);
        } else if (duration < 800) {
          setNetworkSpeedText("4 Mbps");
          setNetworkOk(true);
        } else {
          setNetworkSpeedText("1 Mbps");
          setNetworkOk(true);
        }
      } catch {
        setNetworkOk(false);
        setNetworkSpeedText("--");
      } finally {
        setIsPinging(false);
      }
    };

    runPingIndicator();
    const interval = setInterval(runPingIndicator, 8000);

    return () => clearInterval(interval);
  }, []);

  // useEffect(() => {
  //   if (!networkOk && !offlineNotifiedRef.current) {
  //     offlineNotifiedRef.current = true;
  //     notifyOfflineMode();
  //   }

  //   if (networkOk) {
  //     offlineNotifiedRef.current = false;
  //   }
  // }, [networkOk]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    if (!networkOk && !offlineNotifiedRef.current) {
      timeout = setTimeout(() => {
        offlineNotifiedRef.current = true;
        notifyOfflineMode();
      }, 5000);
    }

    if (networkOk) {
      offlineNotifiedRef.current = false;
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [networkOk]);

  useEffect(() => {
    if (!point || !userId || zones.length === 0) return;
    if (!deviceId) return;

    const sendPresence = async () => {
      try {
        const nowTs = Date.now();
        const nextZoneId = currentMatchedZoneId;
        const previousZoneId = previousZoneIdRef.current;

        if (previousZoneId !== nextZoneId) {
          if (previousZoneId) {
            await sendLocationEvent({
              userId: String(userId),
              deviceId,
              lat: point.lat,
              lng: point.lng,
              accuracyM: point.accuracy ?? undefined,
              matchedZoneId: previousZoneId,
              eventType: "EXIT",
              appState: "foreground",
            });
          }

          if (nextZoneId) {
            await sendLocationEvent({
              userId: String(userId),
              deviceId,
              lat: point.lat,
              lng: point.lng,
              accuracyM: point.accuracy ?? undefined,
              matchedZoneId: nextZoneId,
              eventType: "ENTER",
              appState: "foreground",
            });
          }

          previousZoneIdRef.current = nextZoneId;
        }

        if (nowTs - lastPingSentAtRef.current >= 30000) {
          await sendLocationEvent({
            userId: String(userId),
            deviceId,
            lat: point.lat,
            lng: point.lng,
            accuracyM: point.accuracy ?? undefined,
            matchedZoneId: nextZoneId,
            eventType: "PING",
            appState: "foreground",
          });

          lastPingSentAtRef.current = nowTs;
        }
      } catch (error) {
        console.error("[home] failed to send live presence:", error);
      }
    };

    sendPresence();

    if (livePingIntervalRef.current) {
      clearInterval(livePingIntervalRef.current);
    }

    livePingIntervalRef.current = setInterval(() => {
      sendPresence();
    }, 30000);

    return () => {
      if (livePingIntervalRef.current) {
        clearInterval(livePingIntervalRef.current);
        livePingIntervalRef.current = null;
      }
    };
  }, [point, userId, zones.length, currentMatchedZoneId, deviceId]);

  useEffect(() => {
    const loadDeviceId = async () => {
      try {
        const id = await getDeviceId();
        setDeviceId(id);
      } catch (error) {
        console.error("[home] failed to load device id:", error);
      }
    };

    loadDeviceId();
  }, []);

  // const selectedZoneData = useMemo(
  //   () => zones.find((z) => z.id === selectedZoneId) ?? null,
  //   [selectedZoneId, zones],
  // );

  const selectedZoneData = useMemo(
    () => occupancyZones.find((z) => z.id === selectedZoneId) ?? null,
    [selectedZoneId, occupancyZones],
  );

  useEffect(() => {
    if (
      selectedZoneData?.status === "Crowded" &&
      selectedZoneData.id &&
      overcrowdedNotifiedRef.current !== selectedZoneData.id
    ) {
      overcrowdedNotifiedRef.current = selectedZoneData.id;
      notifyOvercrowdedBuilding(prettyZoneName(selectedZoneData));
    }

    if (selectedZoneData?.status !== "Crowded") {
      overcrowdedNotifiedRef.current = null;
    }
  }, [selectedZoneData]);

  const statusColors = getStatusColors(selectedZoneData?.status);

  const topSafeSpace = Math.max(34, height * 0.045);
  const sideSpace = Math.max(14, width * 0.035);

  const handleSearch = () => {
    const normalizedQuery = normalizeText(searchText);

    if (!normalizedQuery) {
      Alert.alert("Search required", "Please enter a building name to search.");
      return;
    }

    const matchedZone = findMatchingOccupancyZone(searchText, occupancyZones);

    if (!matchedZone) {
      Alert.alert(
        "Building not found",
        `No building matched "${searchText.trim()}".`,
      );
      return;
    }

    const displayLabel = matchedZone.display_name || matchedZone.name;

    setSelectedZoneId(matchedZone.id);
    setSelectedChip(displayLabel);
    setSearchText(displayLabel);
  };

  const handleChipPress = (chip: string) => {
    setSelectedChip(chip);
    setSearchText(chip);

    const matchedZone = findMatchingOccupancyZone(chip, occupancyZones);

    if (matchedZone) {
      setSelectedZoneId(matchedZone.id);
      setSearchText(matchedZone.display_name || matchedZone.name);
    } else {
      setSelectedZoneId(null);
    }
  };

  return (
    <View style={styles.screen}>
      <CampusMap2D
        key={mapRefreshKey}
        zones={zones}
        boundary={boundary}
        userLocation={point ? { lat: point.lat, lng: point.lng } : null}
        selectedZoneId={selectedZoneId}
        onZonePress={(zone) => {
          setSelectedZoneId(zone?.id ?? null);
          if (zone?.name) {
            setSelectedChip(zone.name);
            setSearchText(zone.name);
          }
        }}
        onLocateMePress={() => {
          setSelectedZoneId(null);
          setSearchText("");
          setMapRefreshKey((prev) => prev + 1);
        }}
        networkOk={networkOk}
        networkSpeedText={networkSpeedText}
        gpsAccuracyText={gpsAccuracyText}
        isPinging={isPinging}
        lastPingAt={lastPingAt}
      />

      {mapLoadState === "loading" || mapLoadState === "slow" ? (
        <View style={styles.mapDarkOverlay} pointerEvents="auto">
          {mapErrorMessage ? (
            <View style={styles.redToast}>
              <Ionicons name="warning-outline" size={16} color="#FFFFFF" />
              <Text style={styles.redToastText}>{mapErrorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.iosLoaderCard}>
            <View style={styles.loaderGlow}>
              <ActivityIndicator size="large" color="#FFFFFF" />
            </View>

            <Text style={styles.loaderTitle}>
              {mapLoadState === "loading"
                ? "Loading live occupancy..."
                : "Still trying to reconnect..."}
            </Text>

            <Text style={styles.loaderSubtitle}>
              UniLocate is refreshing the campus map and occupancy data.
              Switch to SLIIT-STD to Connect.
            </Text>
          </View>
        </View>
      ) : null}

      <LinearGradient
        colors={[
          "rgba(243,246,250,1)",
          "rgba(243,246,250,0.90)",
          "transparent",
        ]}
        style={styles.topFade}
        pointerEvents="none"
      />

      <LinearGradient
        colors={[
          "transparent",
          "rgba(243,246,250,0.90)",
          "rgba(243,246,250,1)",
        ]}
        style={styles.bottomFade}
        pointerEvents="none"
      />

      <LinearGradient
        colors={["rgba(243,246,250,0.92)", "transparent"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.leftFade}
        pointerEvents="none"
      />

      <LinearGradient
        colors={["transparent", "rgba(243,246,250,0.92)"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.rightFade}
        pointerEvents="none"
      />

      <View
        style={[
          styles.topOverlay,
          {
            top: topSafeSpace,
            left: sideSpace,
            right: sideSpace,
          },
        ]}>
        <View style={styles.topRow}>
          <View style={styles.userBlock}>
            <Text style={styles.greeting}>{getGreeting(now)}</Text>
            <Text style={styles.name}>{displayName}</Text>
          </View>

          <View style={styles.logoWrap}>
            <Image
              source={require("../../assets/images/UniLocateLogo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.rightInfo}>
            <Text style={styles.date}>{formatDate(now)}</Text>
            <Text style={styles.time}>{formatTime(now)}</Text>
          </View>
        </View>

        <View style={styles.searchRow}>
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search Any Building here"
            placeholderTextColor="#7A8795"
            style={styles.searchInput}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          <Pressable style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>Search</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}>
          {chips.map((chip) => {
            const active = chip === selectedChip;
            return (
              <Pressable
                key={chip}
                onPress={() => handleChipPress(chip)}
                style={[styles.chip, active && styles.chipActive]}>
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}>
                  {chip}
                </Text>
              </Pressable>
            );
          })}
          <Pressable style={styles.arrowChip}>
            <Text style={styles.arrowChipText}>›</Text>
          </Pressable>
        </ScrollView>
      </View>

      <View style={styles.bottomInfo}>
        <Text style={styles.internetHint}>
          {zonesError ? zonesError : zonesStatus}
        </Text>

        {selectedZoneData ? (
          <View
            style={[
              styles.bottomSheet,
              isStudyFoodArea(selectedZoneData) && styles.studyFoodSheet,
              isCommonSpace(selectedZoneData) && styles.commonSpaceSheet,
              isStructuredSpace(selectedZoneData) &&
                styles.structuredSpaceSheet,
            ]}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetTopBar}>
              <View style={styles.sheetHeaderRow}>
                <View style={styles.sheetTitleWrap}>
                  <Text style={styles.sheetTitle}>
                    {prettyZoneName(selectedZoneData)}
                  </Text>

                  <Text style={styles.sheetSubtitle}>
                    {isStudyFoodArea(selectedZoneData)
                      ? "Study / Lunch Area"
                      : isCommonSpace(selectedZoneData)
                        ? "Common Space"
                        : selectedZoneData.type}
                  </Text>
                </View>

                <View style={styles.sheetHeaderRight}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusColors.bg },
                    ]}>
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: statusColors.text },
                      ]}>
                      {selectedZoneData.status ?? "Unknown"}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => {
                      setSelectedZoneId(null);
                      setSearchText("");
                      setSelectedChip("");
                    }}
                    style={styles.closeButton}>
                    <Ionicons name="close" size={18} color="#053668" />
                  </Pressable>
                </View>
              </View>
            </View>

            {isStudyFoodArea(selectedZoneData) ? (
              <>
                <View style={styles.areaTagRow}>
                  <View style={styles.studyFoodTag}>
                    <Text style={styles.studyFoodTagText}>
                      Popular student area
                    </Text>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Capacity</Text>
                    <Text style={styles.statValue}>
                      {selectedZoneData.capacity ?? 0}
                    </Text>
                  </View>

                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Current</Text>
                    <Text style={styles.statValue}>
                      {selectedZoneData.current_count ?? 0}
                    </Text>
                  </View>
                </View>
              </>
            ) : isCommonSpace(selectedZoneData) ? (
              <>
                <View style={styles.statsRow}>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Current</Text>
                    <Text style={styles.statValue}>
                      {selectedZoneData.current_count ?? 0}
                    </Text>
                  </View>

                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Capacity</Text>
                    <Text style={styles.openAreaValue}>Open Area</Text>
                  </View>
                </View>

                <View style={styles.infoBanner}>
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color="#6B7280"
                  />
                  <Text style={styles.infoBannerText}>
                    This is an open common space with no fixed seating limit.
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.statsRow}>
                {hasLimitedCapacity(selectedZoneData) ? (
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Capacity</Text>
                    <Text style={styles.statValue}>
                      {selectedZoneData.capacity ?? 0}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Capacity</Text>
                    <Text style={styles.openAreaValue}>Open Area</Text>
                  </View>
                )}

                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Current</Text>
                  <Text style={styles.statValue}>
                    {selectedZoneData.current_count ?? 0}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.descriptionCard}>
              <Text style={styles.descriptionLabel}>Description</Text>
              <Text style={styles.descriptionText}>
                {selectedZoneData.description?.trim()
                  ? selectedZoneData.description
                  : "No description available."}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F3F6FA",
  },

  topOverlay: {
    position: "absolute",
    zIndex: 20,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  userBlock: {
    flex: 1,
    paddingTop: 28,
  },
  greeting: {
    fontSize: 13,
    color: "#8B95A3",
    marginBottom: 4,
  },
  name: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "800",
    color: "#053668",
  },
  logoWrap: {
    width: 120,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 8,
  },
  logo: {
    width: 110,
    height: 74,
  },
  rightInfo: {
    flex: 1,
    alignItems: "flex-end",
    paddingTop: 28,
  },
  date: {
    fontSize: 11,
    color: "#707784",
  },
  time: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: "700",
    color: "#7C7C7C",
    marginTop: 2,
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderRadius: 16,
    borderWidth: 1.4,
    borderColor: "#0B4A86",
    backgroundColor: "rgba(235,240,245,0.92)",
    paddingHorizontal: 18,
    fontSize: 14,
    color: "#111827",
  },
  searchButton: {
    height: 44,
    minWidth: 98,
    borderRadius: 16,
    backgroundColor: "#053668",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  searchButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
  },

  chipsRow: {
    marginTop: 12,
    gap: 10,
    alignItems: "center",
    paddingRight: 12,
  },
  chip: {
    backgroundColor: "rgba(220,227,234,0.96)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: "#D7DDE5",
  },
  chipText: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#111827",
  },
  arrowChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#AAB5C1",
    alignItems: "center",
    justifyContent: "center",
  },
  arrowChipText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },

  bottomInfo: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 108,
    alignItems: "center",
    zIndex: 20,
    paddingHorizontal: 16,
  },
  internetHint: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FF8B38",
    backgroundColor: "rgba(255,255,255,0.65)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  zonePopup: {
    marginTop: 12,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minWidth: 180,
  },
  zonePopupTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#053668",
  },
  zonePopupText: {
    marginTop: 4,
    fontSize: 13,
    color: "#374151",
  },

  topFade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 350,
    zIndex: 5,
  },
  bottomFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 170,
    zIndex: 5,
  },
  leftFade: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 28,
    zIndex: 5,
  },
  rightFade: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: 28,
    zIndex: 5,
  },

  zonePopupDescription: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: "#5B6470",
  },

  bottomSheet: {
    marginTop: 14,
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.97)",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },

  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D5DCE5",
    marginBottom: 14,
  },

  sheetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sheetTitleWrap: {
    flex: 1,
    paddingRight: 12,
  },

  sheetTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#053668",
  },

  sheetSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#7B8794",
    fontWeight: "600",
  },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },

  statusBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#F5F8FB",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },

  statLabel: {
    fontSize: 12,
    color: "#7B8794",
    fontWeight: "600",
  },

  statValue: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },

  descriptionCard: {
    marginTop: 14,
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 14,
  },

  descriptionLabel: {
    fontSize: 12,
    color: "#7B8794",
    fontWeight: "700",
    marginBottom: 6,
  },

  descriptionText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#4B5563",
  },

  sheetTopBar: {
    marginBottom: 2,
  },

  sheetHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F2F5F8",
    alignItems: "center",
    justifyContent: "center",
  },

  studyFoodSheet: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,113,0,0.08)",
  },

  commonSpaceSheet: {
    borderTopWidth: 1,
    borderTopColor: "rgba(107,114,128,0.10)",
  },

  structuredSpaceSheet: {
    borderTopWidth: 1,
    borderTopColor: "rgba(5,54,104,0.08)",
  },

  areaTagRow: {
    marginTop: 12,
    flexDirection: "row",
  },

  studyFoodTag: {
    backgroundColor: "#FFF4E8",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },

  studyFoodTagText: {
    color: "#D96B00",
    fontSize: 12,
    fontWeight: "700",
  },

  openAreaValue: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: "800",
    color: "#6B7280",
  },

  infoBanner: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F4F6F8",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  infoBannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: "#6B7280",
  },

  mapDarkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 6, 23, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    zIndex: 60,
  },

  iosLoaderCard: {
    width: "88%",
    borderRadius: 28,
    paddingVertical: 26,
    paddingHorizontal: 18,
    backgroundColor: "rgba(5, 54, 104, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },

  loaderGlow: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },

  loaderTitle: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
  },

  loaderSubtitle: {
    marginTop: 6,
    fontSize: 12.5,
    lineHeight: 19,
    color: "#DCEEF2",
    textAlign: "center",
  },

  redToast: {
    position: "absolute",
    top: 48,
    left: 16,
    right: 16,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: "#D92D20",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#D92D20",
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },

  redToastText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
