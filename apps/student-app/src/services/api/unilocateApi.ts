import { API_BASE_URL } from "./baseUrl";

export type Zone = {
  id: string;
  name: string;
  type: string;
  polygon_geojson: {
    type: "Polygon" | "MultiPolygon";
    coordinates: any;
  };
};

export type LocationEventPayload = {
  userId: string;
  lat: number;
  lng: number;
  accuracyM?: number;
  matchedZoneId?: string | null;
  eventType: "PING" | "ENTER" | "EXIT";
};

export type Boundary = {
  id: string;
  name: string;
  polygon_geojson: {
    type: "Polygon" | "MultiPolygon";
    coordinates: any;
  };
};

export async function fetchBoundary(): Promise<Boundary> {
  const res = await fetch(`${API_BASE_URL}/boundary`);
  if (!res.ok) {
    throw new Error("Failed to fetch campus boundary");
  }
  return res.json();
}

export async function fetchZones(): Promise<Zone[]> {
  const res = await fetch(`${API_BASE_URL}/zones`);
  if (!res.ok) {
    throw new Error("Failed to fetch zones");
  }
  return res.json();
}

export async function sendLocationEvent(payload: LocationEventPayload) {
  const res = await fetch(`${API_BASE_URL}/events/location`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to send location event: ${text}`);
  }

  return res.json();
}

export async function fetchLiveZoneCounts() {
  const res = await fetch(`${API_BASE_URL}/zones/live`);
  if (!res.ok) {
    throw new Error("Failed to fetch live zone counts");
  }
  return res.json();
}