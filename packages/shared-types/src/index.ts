export type LatLng = { lat: number; lng: number };

export type ZoneType = "CAFETERIA" | "STUDY" | "LIBRARY" | "LAB" | "HALL";

export type Zone = {
  id: string;
  name: string;
  type: ZoneType;
  buildingId?: string | null;
  floorNumber?: number | null;
  capacity: number;
  polygonGeoJson: any; // later: GeoJSON Polygon type
};

export type LocationPing = {
  sessionId: string;
  lat: number;
  lng: number;
  accuracyM?: number;
  timestamp: string;
  pressureHpa?: number | null;
};
