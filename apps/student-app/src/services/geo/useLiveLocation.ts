import { useEffect, useRef, useState } from "react";
import * as Location from "expo-location";

type LivePoint = {
  lat: number;
  lng: number;
  accuracy?: number | null;
};

function averagePoints(points: LivePoint[]) {
  const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const lng = points.reduce((s, p) => s + p.lng, 0) / points.length;
  const accuracy =
    points.reduce((s, p) => s + (p.accuracy ?? 0), 0) / points.length;

  return { lat, lng, accuracy };
}

export function useLiveLocation() {
  const [point, setPoint] = useState<LivePoint | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const bufferRef = useRef<LivePoint[]>([]);

  useEffect(() => {
    let mounted = true;

    async function start() {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (!mounted) return;

      if (status !== "granted") {
        setPermissionDenied(true);
        return;
      }

      subscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1500,
          distanceInterval: 1,
          mayShowUserSettingsDialog: true,
        },
        (loc) => {
          const accuracy = loc.coords.accuracy ?? null;

          // reject poor fixes
          if (accuracy !== null && accuracy > 35) return;

          const next = {
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            accuracy,
          };

          bufferRef.current = [...bufferRef.current, next].slice(-4);

          const smoothed = averagePoints(bufferRef.current);
          setPoint(smoothed);
        }
      );
    }

    start();

    return () => {
      mounted = false;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, []);

  return { point, permissionDenied };
}
// import { useEffect, useState } from "react";
// import type { GeoPoint } from "./location";
// import { getCurrentPoint, startWatchingLocation } from "./location";

// export function useLiveLocation() {
//   const [point, setPoint] = useState<GeoPoint | null>(null);
//   const [permissionDenied, setPermissionDenied] = useState(false);

//   useEffect(() => {
//     let sub: any;

//     (async () => {
//       const first = await getCurrentPoint();
//       if (!first) {
//         setPermissionDenied(true);
//         return;
//       }
//       setPoint(first);

//       sub = await startWatchingLocation((p) => setPoint(p));
//       if (!sub) setPermissionDenied(true);
//     })();

//     return () => {
//       if (sub?.remove) sub.remove();
//     };
//   }, []);

//   return { point, permissionDenied };
// }