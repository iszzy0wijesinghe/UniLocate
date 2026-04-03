import { useEffect } from "react";
import { AppState } from "react-native";
import type { CampusBoundary, CampusZone } from "../home/components/CampusMap2D";
import { captureLocationLog, shouldRunLocationLog } from "./service";

type Args = {
  boundary: CampusBoundary | null;
  zones: CampusZone[];
};

export function useLocationLogger({ boundary, zones }: Args) {
  useEffect(() => {
    let mounted = true;

    async function run() {
      if (!mounted || !boundary || zones.length === 0) return;

      const canRun = await shouldRunLocationLog();
      if (!canRun) return;

      try {
        await captureLocationLog({
          boundary,
          zones,
          source: "foreground-hourly",
        });
      } catch (error) {
        console.log("[location-logger] capture failed", error);
      }
    }

    run();

    const sub = AppState.addEventListener("change", async (state) => {
      if (state !== "active") return;
      if (!boundary || zones.length === 0) return;

      const canRun = await shouldRunLocationLog();
      if (!canRun) return;

      try {
        await captureLocationLog({
          boundary,
          zones,
          source: "resume-check",
        });
      } catch (error) {
        console.log("[location-logger] resume capture failed", error);
      }
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, [boundary, zones]);
}