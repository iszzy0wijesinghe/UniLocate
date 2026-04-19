/** @format */

import {
  fetchBoundary,
  fetchOccupancyZones,
  type Boundary,
  type OccupancyZone,
} from "../../services/api/unilocateApi";
import type {
  CampusBoundary,
  CampusZone,
} from "../home/components/CampusMap2D";

export function convertSharedBoundary(boundary: Boundary): CampusBoundary | null {
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

export function convertSharedOccupancyZones(
  zones: OccupancyZone[],
): CampusZone[] {
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

export async function loadSharedCampusMap() {
  const [occupancyZones, boundaryData] = await Promise.all([
    fetchOccupancyZones(),
    fetchBoundary(),
  ]);

  return {
    occupancyZones,
    zones: convertSharedOccupancyZones(occupancyZones),
    boundary: convertSharedBoundary(boundaryData),
  };
}