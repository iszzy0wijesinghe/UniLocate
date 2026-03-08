export type LatLng = { lat: number; lng: number };

export type ZonePolygon = {
  zoneId: string;        // internal id you choose
  placeId: string;       // e.g. "Lobby_Floor8"
  placeType: string;     // STUDY_AREA, LIBRARY, etc.
  building: string;
  floor: number;
  polygon: LatLng[];     // boundary points
};