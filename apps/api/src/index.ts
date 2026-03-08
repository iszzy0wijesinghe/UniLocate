import express, { type Request, type Response } from "express";
import cors from "cors";
import "dotenv/config";
import { z } from "zod";
import { pool } from "./db";

const app = express();

// IMPORTANT: increase JSON limit for polygons
app.use(express.json({ limit: "10mb" }));
app.use(cors());

app.get("/health", async (_req: Request, res: Response) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, db: "connected" });
  } catch {
    res.status(500).json({ ok: false, db: "down" });
  }
});

// 1) Download zones
app.get("/zones", async (_req: Request, res: Response) => {
  const { rows } = await pool.query(
    "SELECT id, name, type, polygon_geojson FROM zones ORDER BY name ASC"
  );
  res.json(rows);
});

app.get("/boundary", async (_req: Request, res: Response) => {
  const { rows } = await pool.query(
    `
    SELECT id, name, polygon_geojson
    FROM boundaries
    ORDER BY id ASC
    LIMIT 1
    `
  );

  if (rows.length === 0) {
    return res.status(404).json({ message: "No campus boundary found" });
  }

  res.json(rows[0]);
});

// 2) Send a location event
const LocationEventSchema = z.object({
  userId: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  accuracyM: z.number().optional(),
  matchedZoneId: z.string().optional().nullable(),
  eventType: z.enum(["PING", "ENTER", "EXIT"]),
});

app.post("/events/location", async (req: Request, res: Response) => {
  const parsed = LocationEventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const e = parsed.data;

  await pool.query(
    `INSERT INTO location_events (user_id, lat, lng, accuracy_m, matched_zone_id, event_type)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [e.userId, e.lat, e.lng, e.accuracyM ?? null, e.matchedZoneId ?? null, e.eventType]
  );

  res.json({ ok: true });
});

// 3) Live counts (last 60s) per zone
app.get("/zones/live", async (_req: Request, res: Response) => {
  const { rows } = await pool.query(
    `
    SELECT matched_zone_id as "zoneId", COUNT(*)::int as "pingsLast60s"
    FROM location_events
    WHERE matched_zone_id IS NOT NULL
      AND event_type = 'PING'
      AND created_at > NOW() - INTERVAL '60 seconds'
    GROUP BY matched_zone_id
    `
  );
  res.json(rows);
});

//
// ✅ ADMIN IMPORT ENDPOINT (Upload calibrator JSON -> upsert zones)
//
const ZoneSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  polygon_geojson: z.any(),
});

function normalizeGeoJson(input: any) {
  // Accept direct Polygon
  if (input?.type === "Polygon") return input;

  // Accept Feature { geometry: { type: "Polygon", ... } }
  if (input?.geometry?.type === "Polygon") return input.geometry;

  return input;
}

app.post("/admin/zones/import", async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const zonesRaw = Array.isArray(body) ? body : body?.zones;

    if (!Array.isArray(zonesRaw)) {
      return res
        .status(400)
        .json({ ok: false, message: "Expected JSON array or { zones: [...] }" });
    }

    const parsed = zonesRaw.map((z) => ZoneSchema.parse(z));

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      for (const z of parsed) {
        const polygon = normalizeGeoJson(z.polygon_geojson);

        if (!polygon || polygon.type !== "Polygon" || !Array.isArray(polygon.coordinates)) {
          throw new Error(`Zone ${z.id} invalid polygon_geojson (must be GeoJSON Polygon)`);
        }

        await client.query(
          `
          INSERT INTO zones (id, name, type, polygon_geojson)
          VALUES ($1, $2, $3, $4::jsonb)
          ON CONFLICT (id)
          DO UPDATE SET
            name = EXCLUDED.name,
            type = EXCLUDED.type,
            polygon_geojson = EXCLUDED.polygon_geojson
          `,
          [z.id, z.name, z.type, JSON.stringify(polygon)]
        );
      }

      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }

    res.json({ ok: true, imported: parsed.length });
  } catch (e: any) {
    res.status(400).json({ ok: false, message: e?.message ?? "Import failed" });
  }
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});