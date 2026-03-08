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

//
// 🔹 LOST & FOUND (temporary in‑memory store)
//

type LostFoundType = "lost" | "found";
type ItemCategory = "ID Card" | "Wallet" | "Book" | "Device" | "Other";

interface LostFoundPost {
  id: string;
  type: LostFoundType;
  category: ItemCategory;
  title: string;
  description?: string;
  timeHint?: string;
  images?: string[];
  createdAt: string;
  status: "open" | "resolved";
}

const LostFoundInputSchema = z.object({
  type: z.union([z.literal("lost"), z.literal("found")]),
  category: z.union([
    z.literal("ID Card"),
    z.literal("Wallet"),
    z.literal("Book"),
    z.literal("Device"),
    z.literal("Other"),
  ]),
  title: z.string().min(1),
  description: z.string().optional(),
  timeHint: z.string().optional(),
  images: z.array(z.string()).optional(),
});

const lostFoundPosts: LostFoundPost[] = [];

app.get("/lost-found/posts", (_req: Request, res: Response) => {
  const sorted = [...lostFoundPosts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json(sorted);
});

app.post("/lost-found/posts", (req: Request, res: Response) => {
  const parsed = LostFoundInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const now = new Date();
  const post: LostFoundPost = {
    id: now.getTime().toString(),
    createdAt: now.toISOString(),
    status: "open",
    ...parsed.data,
  };

  lostFoundPosts.push(post);
  res.status(201).json(post);
});

app.get("/lost-found/posts/:id", (req: Request, res: Response) => {
  const post = lostFoundPosts.find((p) => p.id === req.params.id);
  if (!post) return res.status(404).json({ ok: false, message: "Not found" });
  res.json(post);
});

app.post("/lost-found/posts/:id/resolve", (req: Request, res: Response) => {
  const post = lostFoundPosts.find((p) => p.id === req.params.id);
  if (!post) return res.status(404).json({ ok: false, message: "Not found" });

  post.status = "resolved";
  res.json(post);
});

app.delete("/lost-found/posts/:id", (req: Request, res: Response) => {
  const idx = lostFoundPosts.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ ok: false, message: "Not found" });

  lostFoundPosts.splice(idx, 1);
  res.status(204).send();
});

// 1) Download zones
app.get("/zones", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, type, polygon_geojson FROM zones ORDER BY name ASC"
    );
    res.json(rows);
  } catch (e) {
    console.error("DB error in GET /zones:", e);
    res.status(503).json({ error: "Database unavailable. Check DATABASE_URL in apps/api/.env" });
  }
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

  try {
    await pool.query(
      `INSERT INTO location_events (user_id, lat, lng, accuracy_m, matched_zone_id, event_type)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [e.userId, e.lat, e.lng, e.accuracyM ?? null, e.matchedZoneId ?? null, e.eventType]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("DB error in POST /events/location:", err);
    res.status(503).json({ error: "Database unavailable. Check DATABASE_URL in apps/api/.env" });
  }
});

// 3) Live counts (last 60s) per zone
app.get("/zones/live", async (_req: Request, res: Response) => {
  try {
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
  } catch (e) {
    console.error("DB error in GET /zones/live:", e);
    res.status(503).json({ error: "Database unavailable. Check DATABASE_URL in apps/api/.env" });
  }
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

    let client;
    try {
      client = await pool.connect();
    } catch (dbErr) {
      console.error("DB error in POST /admin/zones/import:", dbErr);
      return res.status(503).json({ ok: false, message: "Database unavailable. Check DATABASE_URL in apps/api/.env" });
    }
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
    if (e?.code === "28P01" || e?.message?.includes("password authentication")) {
      return res.status(503).json({ ok: false, message: "Database unavailable. Check DATABASE_URL in apps/api/.env" });
    }
    res.status(400).json({ ok: false, message: e?.message ?? "Import failed" });
  }
});

const port = Number(process.env.PORT || 4000);
const host = "0.0.0.0"; // so emulator (10.0.2.2) and same‑network devices can reach the API
app.listen(port, host, () => {
  console.log(`API running on http://localhost:${port} (also http://0.0.0.0:${port})`);
});