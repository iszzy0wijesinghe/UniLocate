import { isPointInPolygon } from "../../services/geo/polygon";
import type { CampusBoundary, CampusZone } from "../home/components/CampusMap2D";

export function isInsideCampus(
  point: { lat: number; lng: number },
  boundary: CampusBoundary | null
) {
  if (!boundary?.polygon?.length) return false;
  return isPointInPolygon(point, boundary.polygon);
}

export function findContainingZone(
  point: { lat: number; lng: number },
  zones: CampusZone[]
) {
  for (const zone of zones) {
    if (zone?.polygon?.length && isPointInPolygon(point, zone.polygon)) {
      return zone;
    }
  }
  return null;
}