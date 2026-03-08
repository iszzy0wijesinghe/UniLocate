import React, { useMemo, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type ZoneItem = {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  crowd: "low" | "medium" | "high";
};

type Props = {
  zones?: ZoneItem[];
  onZonePress?: (zone: ZoneItem) => void;
};

export default function CampusMap2D({ zones = [], onZonePress }: Props) {
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const [scale] = useState(new Animated.Value(1));

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          pan.extractOffset();
        },
        onPanResponderMove: Animated.event(
          [null, { dx: pan.x, dy: pan.y }],
          { useNativeDriver: false }
        ),
        onPanResponderRelease: () => {
          pan.flattenOffset();
        },
      }),
    [pan]
  );

  return (
    <View style={styles.container}>
      <Animated.View
        {...responder.panHandlers}
        style={[
          styles.mapCanvas,
          {
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
              { scale },
            ],
          },
        ]}
      >
        <View style={styles.mapBackground} />

        {zones.map((zone) => {
          const bg =
            zone.crowd === "high"
              ? "rgba(255,80,80,0.55)"
              : zone.crowd === "medium"
              ? "rgba(255,113,0,0.45)"
              : "rgba(70,180,120,0.35)";

          return (
            <Pressable
              key={zone.id}
              onPress={() => onZonePress?.(zone)}
              style={[
                styles.zone,
                {
                  left: zone.x,
                  top: zone.y,
                  width: zone.width,
                  height: zone.height,
                  backgroundColor: bg,
                },
              ]}
            >
              <Text style={styles.zoneText}>{zone.name}</Text>
            </Pressable>
          );
        })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 28,
  },
  mapCanvas: {
    width: 1400,
    height: 1100,
  },
  mapBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#E9EEF2",
    borderRadius: 28,
  },
  zone: {
    position: "absolute",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(5,54,104,0.25)",
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  zoneText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#053668",
    textAlign: "center",
  },
});