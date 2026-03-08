import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import CampusMap2D from "./components/CampusMap2D";

const { width, height } = Dimensions.get("window");

const chips = ["Bird Nest", "Basement Canteen", "Anohana Canteen"];

const mockZones = [
  {
    id: "library",
    name: "Library",
    x: 420,
    y: 260,
    width: 220,
    height: 140,
    crowd: "medium" as const,
  },
  {
    id: "study_a",
    name: "Study Area A",
    x: 760,
    y: 460,
    width: 240,
    height: 150,
    crowd: "high" as const,
  },
  {
    id: "canteen",
    name: "Main Canteen",
    x: 210,
    y: 650,
    width: 250,
    height: 140,
    crowd: "low" as const,
  },
];

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

export default function Home() {
  const [selectedChip, setSelectedChip] = useState("Bird Nest");
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const selectedZoneData = useMemo(
    () => mockZones.find((z) => z.id === selectedZone) ?? null,
    [selectedZone]
  );

  const topSafeSpace = Math.max(34, height * 0.045);
  const sideSpace = Math.max(14, width * 0.035);

  return (
    <View style={styles.screen}>
      <CampusMap2D
        zones={mockZones}
        onZonePress={(zone) => {
          setSelectedZone(zone.id);
        }}
      />

      <LinearGradient
        colors={["rgba(243,246,250,1)", "rgba(243,246,250,0.90)", "transparent"]}
        style={styles.topFade}
        pointerEvents="none"
      />

      <LinearGradient
        colors={["transparent", "rgba(243,246,250,0.90)", "rgba(243,246,250,1)"]}
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
        ]}
      >
        <View style={styles.topRow}>
          <View style={styles.userBlock}>
            <Text style={styles.greeting}>{getGreeting(now)}</Text>
            <Text style={styles.name}>Navindu{"\n"}Wijesundara</Text>
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
            <View style={styles.iconRow}>
              <Text style={styles.topIcon}>⌁</Text>
              <Text style={styles.topIcon}>📍</Text>
              <Text style={styles.topIcon}>◔</Text>
            </View>
          </View>
        </View>

        <View style={styles.searchRow}>
          <TextInput
            placeholder="Search Any Building here"
            placeholderTextColor="#7A8795"
            style={styles.searchInput}
          />
          <Pressable style={styles.searchButton}>
            <Text style={styles.searchButtonText}>Search</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {chips.map((chip) => {
            const active = chip === selectedChip;
            return (
              <Pressable
                key={chip}
                onPress={() => setSelectedChip(chip)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
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
          For Real-time Map Please Maintain Good Internet Connection
        </Text>

        {selectedZoneData ? (
          <View style={styles.zonePopup}>
            <Text style={styles.zonePopupTitle}>{selectedZoneData.name}</Text>
            <Text style={styles.zonePopupText}>
              Crowd level: {selectedZoneData.crowd}
            </Text>
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
    paddingTop: 2,
  },
  greeting: {
    fontSize: 13,
    color: "#8B95A3",
    marginBottom: 4,
  },
  name: {
    fontSize: 18,
    lineHeight: 19,
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
    paddingTop: 2,
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
  iconRow: {
    marginTop: 6,
    flexDirection: "row",
    gap: 10,
  },
  topIcon: {
    fontSize: 17,
    color: "#FF7100",
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
    height: 270,
    zIndex: 5,
  },
  bottomFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 72,
    height: 190,
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
});