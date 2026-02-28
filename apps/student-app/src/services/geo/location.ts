import * as Location from "expo-location";

export type GeoPoint = { lat: number; lng: number; accuracy?: number; timestamp?: number };

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === "granted";
}

export async function getCurrentPoint(): Promise<GeoPoint | null> {
  const ok = await requestLocationPermission();
  if (!ok) return null;

  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: pos.coords.accuracy ?? undefined,
    timestamp: pos.timestamp,
  };
}

export async function startWatchingLocation(
  onPoint: (p: GeoPoint) => void
): Promise<Location.LocationSubscription | null> {
  const ok = await requestLocationPermission();
  if (!ok) return null;

  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 2000, // ~2s updates
      distanceInterval: 1, // meters
    },
    (pos) => {
      onPoint({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy ?? undefined,
        timestamp: pos.timestamp,
      });
    }
  );
}