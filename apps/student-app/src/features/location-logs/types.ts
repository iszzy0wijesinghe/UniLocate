export type LocationLogPoint = {
  id: string;
  timestamp: string;
  dateKey: string; // YYYY-MM-DD
  lat: number;
  lng: number;
  accuracy?: number | null;
  insideCampus: boolean;
  zoneId?: string | null;
  zoneName?: string | null;
  source: "foreground-hourly" | "manual" | "resume-check";
};

export type LocationLogsByDate = Record<string, LocationLogPoint[]>;

export type PermissionState = {
  locationGranted: boolean;
  notificationsGranted: boolean;
  storageReady: boolean;
  sensorsAvailable: boolean;
};