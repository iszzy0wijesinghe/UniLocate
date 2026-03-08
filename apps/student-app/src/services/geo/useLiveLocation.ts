import { useEffect, useState } from "react";
import type { GeoPoint } from "./location";
import { getCurrentPoint, startWatchingLocation } from "./location";

export function useLiveLocation() {
  const [point, setPoint] = useState<GeoPoint | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    let sub: any;

    (async () => {
      const first = await getCurrentPoint();
      if (!first) {
        setPermissionDenied(true);
        return;
      }
      setPoint(first);

      sub = await startWatchingLocation((p) => setPoint(p));
      if (!sub) setPermissionDenied(true);
    })();

    return () => {
      if (sub?.remove) sub.remove();
    };
  }, []);

  return { point, permissionDenied };
}