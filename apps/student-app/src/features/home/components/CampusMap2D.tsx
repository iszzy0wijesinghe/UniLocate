/** @format */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, {
  Circle,
  G,
  Polygon,
  Rect,
  Text as SvgText,
} from "react-native-svg";

type Point = {
  lat: number;
  lng: number;
};

export type CampusZone = {
  id: string;
  name: string;
  type: string;
  polygon: Point[];
};

export type CampusBoundary = {
  id: string;
  name: string;
  polygon: Point[];
};

type Props = {
  zones?: CampusZone[];
  boundary?: CampusBoundary | null;
  userLocation?: Point | null;
  selectedZoneId?: string | null;
  onZonePress?: (zone: CampusZone | null) => void;
  onLocateMePress?: () => void;
};

const MIN_SCALE = 1.0;
const MAX_SCALE = 18;
const DOUBLE_TAP_MS = 280;
const DEFAULT_USER_FOCUS_SCALE = 4.4;

function isValidPoint(point: unknown): point is Point {
  return (
    !!point &&
    typeof point === "object" &&
    typeof (point as Point).lat === "number" &&
    typeof (point as Point).lng === "number" &&
    Number.isFinite((point as Point).lat) &&
    Number.isFinite((point as Point).lng)
  );
}

function getCenter(points: Point[]) {
  const sum = points.reduce(
    (acc, p) => {
      acc.lat += p.lat;
      acc.lng += p.lng;
      return acc;
    },
    { lat: 0, lng: 0 },
  );

  return {
    lat: sum.lat / points.length,
    lng: sum.lng / points.length,
  };
}

function shortName(name: string) {
  return name.replace(/_/g, " ");
}

function createProjector(
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  viewport: { width: number; height: number },
) {
  const mapWidth = bounds.maxLng - bounds.minLng;
  const mapHeight = bounds.maxLat - bounds.minLat;

  const safeMapWidth = mapWidth || 0.0001;
  const safeMapHeight = mapHeight || 0.0001;

  const padding = 24;

  const scaleX = (viewport.width - padding * 2) / safeMapWidth;
  const scaleY = (viewport.height - padding * 2) / safeMapHeight;

  const uniformScale = Math.min(scaleX, scaleY);

  const renderedWidth = safeMapWidth * uniformScale;
  const renderedHeight = safeMapHeight * uniformScale;

  const offsetX = (viewport.width - renderedWidth) / 2;
  const offsetY = (viewport.height - renderedHeight) / 2;

  return (point: Point) => {
    const x = (point.lng - bounds.minLng) * uniformScale + offsetX;
    const y =
      viewport.height - ((point.lat - bounds.minLat) * uniformScale + offsetY);

    return { x, y };
  };
}

export default function CampusMap2D({
  zones = [],
  boundary = null,
  userLocation,
  selectedZoneId,
  onZonePress,
  onLocateMePress,
}: Props) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(DEFAULT_USER_FOCUS_SCALE);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });

  const initializedRef = useRef(false);

  const initialUserFocusDoneRef = useRef(false);

  const gestureRef = useRef({
    mode: "none" as "none" | "pan" | "pinch",
    startScale: 1,
    startDistance: 0,
    lastTouchX: 0,
    lastTouchY: 0,
  });

  const lastTapRef = useRef<{ zoneId: string | null; ts: number }>({
    zoneId: null,
    ts: 0,
  });

  const safeZones = useMemo(
    () =>
      zones.filter(
        (z) =>
          z &&
          Array.isArray(z.polygon) &&
          z.polygon.length >= 3 &&
          z.polygon.every(isValidPoint),
      ),
    [zones],
  );

  const safeBoundary = useMemo(() => {
    if (!boundary) return null;
    if (!Array.isArray(boundary.polygon) || boundary.polygon.length < 3)
      return null;
    if (!boundary.polygon.every(isValidPoint)) return null;
    return boundary;
  }, [boundary]);

  const allPoints = useMemo(() => {
    const zonePoints = safeZones.flatMap((z) => z.polygon);
    const boundaryPoints = safeBoundary?.polygon ?? [];
    return [...zonePoints, ...boundaryPoints];
  }, [safeZones, safeBoundary]);

  const bounds = useMemo(() => {
    if (allPoints.length === 0) return null;

    const lats = allPoints.map((p) => p.lat);
    const lngs = allPoints.map((p) => p.lng);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latPad = (maxLat - minLat) * 0.05 || 0.0001;
    const lngPad = (maxLng - minLng) * 0.05 || 0.0001;

    return {
      minLat: minLat - latPad,
      maxLat: maxLat + latPad,
      minLng: minLng - lngPad,
      maxLng: maxLng + lngPad,
    };
  }, [allPoints]);

  const projector = useMemo(() => {
    if (!bounds || layout.width === 0 || layout.height === 0) return null;
    return createProjector(bounds, layout);
  }, [bounds, layout]);

  const projectPoint = (point: Point) => {
    if (!projector) return { x: 0, y: 0 };
    return projector(point);
  };

  const projectedBoundary = useMemo(() => {
    if (!safeBoundary || !projector) return null;
    return safeBoundary.polygon.map(projectPoint);
  }, [safeBoundary, projector]);

  const projectedZones = useMemo(() => {
    if (!projector) return [];

    return safeZones.map((zone) => {
      const points = zone.polygon.map(projectPoint);
      const center = projectPoint(getCenter(zone.polygon));

      return {
        ...zone,
        projected: points,
        center,
      };
    });
  }, [safeZones, projector]);

  const projectedUser = useMemo(() => {
    if (!userLocation || !projector) return null;
    return projectPoint(userLocation);
  }, [userLocation, projector]);

  const screenPoint = (x: number, y: number) => ({
    x: x * scale + translate.x,
    y: y * scale + translate.y,
  });

  const fitToScreen = () => {
    setScale(2.2);
    setTranslate({ x: 0, y: 0 });
  };

  const zoomToUser = (targetScale = DEFAULT_USER_FOCUS_SCALE) => {
    if (!projectedUser || layout.width === 0 || layout.height === 0) return;

    const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, targetScale));
    const targetX = layout.width / 2 - projectedUser.x * nextScale;
    const targetY = layout.height / 2 - projectedUser.y * nextScale;

    gestureRef.current.mode = "none";
    setScale(nextScale);
    setTranslate({ x: targetX, y: targetY });
  };

  const zoomToZone = (zoneId: string, targetScale = 4.2) => {
    const selected = projectedZones.find((z) => z.id === zoneId);
    if (!selected || layout.width === 0 || layout.height === 0) return;

    const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, targetScale));
    const targetX = layout.width / 2 - selected.center.x * nextScale;
    const targetY = layout.height / 2 - selected.center.y * nextScale;

    gestureRef.current.mode = "none";
    setScale(nextScale);
    setTranslate({ x: targetX, y: targetY });
  };

  const zoomToScreenPoint = (
    screenX: number,
    screenY: number,
    nextScale: number,
  ) => {
    const worldX = (screenX - translate.x) / scale;
    const worldY = (screenY - translate.y) / scale;

    const nextTranslateX = screenX - worldX * nextScale;
    const nextTranslateY = screenY - worldY * nextScale;

    setScale(nextScale);
    setTranslate({ x: nextTranslateX, y: nextTranslateY });
  };

  const zoomInAction = () => {
    const nextScale = Math.min(MAX_SCALE, scale + 0.5);

    if (selectedZoneId) {
      const selected = projectedZones.find((z) => z.id === selectedZoneId);
      if (selected) {
        const p = screenPoint(selected.center.x, selected.center.y);
        zoomToScreenPoint(p.x, p.y, nextScale);
        return;
      }
    }

    if (projectedUser) {
      const p = screenPoint(projectedUser.x, projectedUser.y);
      zoomToScreenPoint(p.x, p.y, nextScale);
      return;
    }

    zoomToScreenPoint(layout.width / 2, layout.height / 2, nextScale);
  };

  const zoomOutAction = () => {
    const nextScale = Math.max(MIN_SCALE, scale - 0.5);

    if (selectedZoneId) {
      const selected = projectedZones.find((z) => z.id === selectedZoneId);
      if (selected) {
        const p = screenPoint(selected.center.x, selected.center.y);
        zoomToScreenPoint(p.x, p.y, nextScale);
        return;
      }
    }

    if (projectedUser) {
      const p = screenPoint(projectedUser.x, projectedUser.y);
      zoomToScreenPoint(p.x, p.y, nextScale);
      return;
    }

    zoomToScreenPoint(layout.width / 2, layout.height / 2, nextScale);
  };

  const handleLocateMe = () => {
    initializedRef.current = false;
    initialUserFocusDoneRef.current = false;
    onLocateMePress?.();

    setTimeout(() => {
      zoomToUser(4.8);
      initialUserFocusDoneRef.current = true;
      initializedRef.current = true;
    }, 350);
  };

  useEffect(() => {
    if (layout.width === 0 || layout.height === 0) return;
    if (projectedZones.length === 0) return;

    // If user location becomes available anytime before first focus is done,
    // always prioritize focusing on the user.
    if (projectedUser && !initialUserFocusDoneRef.current) {
      zoomToUser(DEFAULT_USER_FOCUS_SCALE);
      initialUserFocusDoneRef.current = true;
      initializedRef.current = true;
      return;
    }

    // Only fallback to fit if nothing has initialized yet.
    if (initializedRef.current) return;

    const timer = setTimeout(() => {
      if (!initialUserFocusDoneRef.current && !initializedRef.current) {
        fitToScreen();
        initializedRef.current = true;
      }
    }, 2200);

    return () => clearTimeout(timer);
  }, [layout.width, layout.height, projectedUser, projectedZones.length]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setLayout({ width, height });
  };

  const onTouchStart = (e: any) => {
    const touches = e.nativeEvent.touches;

    if (touches.length === 1) {
      const t = touches[0];
      gestureRef.current.mode = "pan";
      gestureRef.current.lastTouchX = t.pageX;
      gestureRef.current.lastTouchY = t.pageY;
    }

    if (touches.length === 2) {
      const [a, b] = touches;
      const dx = b.pageX - a.pageX;
      const dy = b.pageY - a.pageY;

      gestureRef.current.mode = "pinch";
      gestureRef.current.startDistance = Math.sqrt(dx * dx + dy * dy);
      gestureRef.current.startScale = scale;
    }
  };

  const onTouchMove = (e: any) => {
    const touches = e.nativeEvent.touches;

    if (touches.length === 1 && gestureRef.current.mode === "pan") {
      const t = touches[0];
      const dx = t.pageX - gestureRef.current.lastTouchX;
      const dy = t.pageY - gestureRef.current.lastTouchY;

      gestureRef.current.lastTouchX = t.pageX;
      gestureRef.current.lastTouchY = t.pageY;

      setTranslate((prev) => ({
        x: prev.x + dx,
        y: prev.y + dy,
      }));
    }

    if (touches.length === 2 && gestureRef.current.mode === "pinch") {
      const [a, b] = touches;
      const dx = b.pageX - a.pageX;
      const dy = b.pageY - a.pageY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const centerX = (a.pageX + b.pageX) / 2;
      const centerY = (a.pageY + b.pageY) / 2;

      const ratio = distance / gestureRef.current.startDistance;
      const nextScale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, gestureRef.current.startScale * ratio),
      );

      const worldX = (centerX - translate.x) / scale;
      const worldY = (centerY - translate.y) / scale;

      const nextTranslateX = centerX - worldX * nextScale;
      const nextTranslateY = centerY - worldY * nextScale;

      setScale(nextScale);
      setTranslate({ x: nextTranslateX, y: nextTranslateY });
    }
  };

  const onTouchEnd = () => {
    gestureRef.current.mode = "none";
  };

  const labelMode = scale >= 3 ? "many" : scale >= 2.2 ? "selected" : "none";
  const labelFontSize = Math.max(6.5, Math.min(9, 9 / Math.max(scale, 1) + 3));
  const labelWidth = Math.max(48, Math.min(80, 80 / Math.max(scale, 1) + 18));
  const labelHeight = Math.max(15, Math.min(20, 20 / Math.max(scale, 1) + 5));

  const userOuterRadius = Math.max(
    6,
    Math.min(11, 11 / Math.max(scale, 1) + 2),
  );
  const userInnerRadius = Math.max(3, Math.min(5, 5 / Math.max(scale, 1) + 1));

  const zoneFill = (type: string, selected: boolean) => {
    if (selected) return "rgba(255,113,0,0.42)";

    const t = type.toLowerCase();

    if (t.includes("food")) return "rgba(255,173,92,0.28)";
    if (t.includes("sports")) return "rgba(76,175,80,0.24)";
    if (t.includes("block")) return "rgba(66,133,244,0.16)";
    if (t.includes("parking")) return "rgba(158,158,158,0.18)";
    if (t.includes("security")) return "rgba(239,83,80,0.22)";

    return "rgba(120,144,156,0.16)";
  };

  const handleZoneDoubleTapOnly = (zone: CampusZone) => {
    const now = Date.now();
    const isDoubleTap =
      lastTapRef.current.zoneId === zone.id &&
      now - lastTapRef.current.ts < DOUBLE_TAP_MS;

    lastTapRef.current = { zoneId: zone.id, ts: now };

    if (!isDoubleTap) return;

    // If already selected, double tap again = deselect
    if (selectedZoneId === zone.id) {
      onZonePress?.({
        ...zone,
        id: "",
        name: "",
        type: "",
        polygon: [],
      });
      zoomToUser(4.8);
      return;
    }

    // Otherwise select this zone
    onZonePress?.(zone);
    zoomToZone(zone.id, 4.2);
  };

  return (
    <View style={styles.wrapper} onLayout={onLayout}>
      <View
        style={styles.mapBackground}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}>
        <Svg width={layout.width} height={layout.height}>
          <G
            transform={`translate(${translate.x}, ${translate.y}) scale(${scale})`}>
            {projectedBoundary ? (
              <Polygon
                points={projectedBoundary.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="rgba(232,238,244,0.85)"
                stroke="#9AB0C4"
                strokeWidth={2 / scale}
              />
            ) : null}

            {projectedZones.map((zone) => {
              const selected = selectedZoneId === zone.id;

              return (
                <Polygon
                  key={zone.id}
                  points={zone.projected.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill={zoneFill(zone.type, selected)}
                  stroke={selected ? "#FF7100" : "#4F6F8F"}
                  strokeWidth={selected ? 2.6 / scale : 1.2 / scale}
                  onPress={() => handleZoneDoubleTapOnly(zone)}
                />
              );
            })}
          </G>

          {projectedZones.map((zone) => {
            const selected = selectedZoneId === zone.id;
            const showLabel =
              labelMode === "many" || (labelMode === "selected" && selected);

            if (!showLabel) return null;

            const p = screenPoint(zone.center.x, zone.center.y);

            return (
              <G key={`label-${zone.id}`}>
                <Rect
                  x={p.x - labelWidth / 2}
                  y={p.y - labelHeight / 2}
                  rx={7}
                  ry={7}
                  width={labelWidth}
                  height={labelHeight}
                  fill="rgba(255,255,255,0.90)"
                />
                <SvgText
                  x={p.x}
                  y={p.y + labelFontSize * 0.32}
                  textAnchor="middle"
                  fontSize={labelFontSize}
                  fontWeight="700"
                  fill="#053668">
                  {shortName(zone.name)}
                </SvgText>
              </G>
            );
          })}

          {projectedUser ? (
            <G>
              <Circle
                cx={screenPoint(projectedUser.x, projectedUser.y).x}
                cy={screenPoint(projectedUser.x, projectedUser.y).y}
                r={userOuterRadius}
                fill="rgba(66,133,244,0.18)"
              />
              <Circle
                cx={screenPoint(projectedUser.x, projectedUser.y).x}
                cy={screenPoint(projectedUser.x, projectedUser.y).y}
                r={userInnerRadius}
                fill="#4285F4"
                stroke="#FFFFFF"
                strokeWidth={2}
              />
            </G>
          ) : null}
        </Svg>
      </View>

      <View style={styles.controls}>
        <Pressable style={styles.controlButton} onPress={zoomInAction}>
          <Text style={styles.controlText}>＋</Text>
        </Pressable>

        <Pressable style={styles.controlButton} onPress={zoomOutAction}>
          <Text style={styles.controlText}>－</Text>
        </Pressable>

        <Pressable style={styles.locateButton} onPress={handleLocateMe}>
          <Text style={styles.locateText}>◎</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    overflow: "hidden",
  },
  mapBackground: {
    flex: 1,
    backgroundColor: "#EEF3F7",
  },
  controls: {
    position: "absolute",
    right: 14,
    bottom: 170,
    gap: 10,
    zIndex: 60,
  },
  controlButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.96)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  controlText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#053668",
  },
  locateButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  locateText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#4285F4",
  },
});
