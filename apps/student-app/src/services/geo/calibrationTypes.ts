export type CalibrationRecord = {
  id: string;
  placeId: string;
  placeType: string;
  building: string;
  floor: number;
  capturedAt: string;
  geo: { lat: number; lng: number; accuracyM?: number };
  sensors?: any;
};

export type ZoneMatch = {
  placeId: string;
  placeType: string;
  building: string;
  floor: number;
  distanceM: number;
  source: "nearest-point" | "polygon";
};