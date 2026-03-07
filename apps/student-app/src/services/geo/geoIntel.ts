import type { CalibrationRecord, ZoneMatch } from "./calibrationTypes";
import { haversineM } from "./distance";

import type { ZonePolygon } from "./polygonTypes";
import { isPointInPolygon } from "./polygon";

export type GeoPoint = { lat: number; lng: number; accuracy?: number };

export type GeoIntelConfig = {
  // Max distance allowed to consider a match (meters)
  maxMatchDistanceM: number;
};

// Polygon match (preferred when you have zone boundaries)
export function matchPolygonZone(
  point: { lat: number; lng: number },
  zones: ZonePolygon[]
): ZoneMatch | null {
  for (const z of zones) {
    if (isPointInPolygon({ lat: point.lat, lng: point.lng }, z.polygon)) {
      return {
        placeId: z.placeId,
        placeType: z.placeType,
        building: z.building,
        floor: z.floor,
        distanceM: 0,
        source: "polygon",
      };
    }
  }
  return null;
}

// Nearest calibration point match (fallback when you don't have polygons)
export function matchNearestPlace(
  point: GeoPoint,
  calibrations: CalibrationRecord[],
  config: GeoIntelConfig = { maxMatchDistanceM: 80 } // tune later (e.g., 50–120m)
): ZoneMatch | null {
  if (!calibrations.length) return null;

  let best: { rec: CalibrationRecord; d: number } | null = null;

  for (const rec of calibrations) {
    const d = haversineM(point, { lat: rec.geo.lat, lng: rec.geo.lng });
    if (!best || d < best.d) best = { rec, d };
  }

  if (!best) return null;
  if (best.d > config.maxMatchDistanceM) return null;

  return {
    placeId: best.rec.placeId,
    placeType: best.rec.placeType,
    building: best.rec.building,
    floor: best.rec.floor,
    distanceM: best.d,
    source: "nearest-point",
  };
}