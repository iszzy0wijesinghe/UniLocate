/** @format */

import express, { type Request, type Response } from "express";
import cors from "cors";
import "dotenv/config";
import crypto from "crypto";
import { z } from "zod";
import { pool } from "./db";

const app = express();

// IMPORTANT: increase JSON limit for polygons
app.use(express.json({ limit: "10mb" }));
app.use(cors());

function getOccupancyStatus(currentCount: number, capacity: number) {
  if (!capacity || capacity <= 0) return "Unknown";

  const ratio = currentCount / capacity;

  if (ratio >= 0.8) return "Crowded";
  if (ratio >= 0.4) return "Almost Full";
  if (ratio > 0) return "Available";
  return "Free";
}

app.get("/health", async (_req: Request, res: Response) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, db: "connected" });
  } catch {
    res.status(500).json({ ok: false, db: "down" });
  }
});

//
// 🔹 LOST & FOUND (temporary in-memory store)
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
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
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
  if (idx === -1)
    return res.status(404).json({ ok: false, message: "Not found" });

  lostFoundPosts.splice(idx, 1);
  res.status(204).send();
});

// 1) Download zones
app.get("/zones", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, type, polygon_geojson FROM zones ORDER BY name ASC",
    );
    res.json(rows);
  } catch (e) {
    console.error("DB error in GET /zones:", e);
    res.status(503).json({
      error: "Database unavailable. Check DATABASE_URL in apps/api/.env",
    });
  }
});

app.get("/boundary", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT id, name, polygon_geojson
      FROM boundaries
      ORDER BY id ASC
      LIMIT 1
      `,
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "No campus boundary found" });
    }

    res.json(rows[0]);
  } catch (e) {
    console.error("DB error in GET /boundary:", e);
    res.status(503).json({
      error: "Database unavailable. Check DATABASE_URL in apps/api/.env",
    });
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
      [
        e.userId,
        e.lat,
        e.lng,
        e.accuracyM ?? null,
        e.matchedZoneId ?? null,
        e.eventType,
      ],
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("DB error in POST /events/location:", err);
    res.status(503).json({
      error: "Database unavailable. Check DATABASE_URL in apps/api/.env",
    });
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
      `,
    );
    res.json(rows);
  } catch (e) {
    console.error("DB error in GET /zones/live:", e);
    res.status(503).json({
      error: "Database unavailable. Check DATABASE_URL in apps/api/.env",
    });
  }
});

app.get("/zones/occupancy", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT
        z.id,
        z.name,
        z.type,
        z.polygon_geojson,
        COALESCE(d.display_name, z.name) AS display_name,
COALESCE(d.capacity, 0) AS capacity,
COALESCE(d.description, '') AS description,
COALESCE(d.area_group, 'common_space') AS area_group,
COALESCE(d.capacity_mode, 'open') AS capacity_mode,
COALESCE(l.pings_last_60s, 0) AS current_count
      FROM zones z
      LEFT JOIN zone_details d
        ON d.zone_id = z.id
      LEFT JOIN (
        SELECT
          matched_zone_id,
          COUNT(*)::int AS pings_last_60s
        FROM location_events
        WHERE matched_zone_id IS NOT NULL
          AND event_type = 'PING'
          AND created_at > NOW() - INTERVAL '60 seconds'
        GROUP BY matched_zone_id
      ) l
        ON l.matched_zone_id = z.id
      ORDER BY z.name ASC
      `,
    );

    const result = rows.map((row) => ({
      ...row,
      status: getOccupancyStatus(
        Number(row.current_count ?? 0),
        Number(row.capacity ?? 0),
      ),
    }));

    res.json(result);
  } catch (e) {
    console.error("DB error in GET /zones/occupancy:", e);
    res.status(503).json({
      error: "Database unavailable. Check DATABASE_URL in apps/api/.env",
    });
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
  if (input?.type === "Polygon") return input;
  if (input?.geometry?.type === "Polygon") return input.geometry;
  return input;
}

app.post("/admin/zones/import", async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const zonesRaw = Array.isArray(body) ? body : body?.zones;

    if (!Array.isArray(zonesRaw)) {
      return res.status(400).json({
        ok: false,
        message: "Expected JSON array or { zones: [...] }",
      });
    }

    const parsed = zonesRaw.map((z) => ZoneSchema.parse(z));

    let client;
    try {
      client = await pool.connect();
    } catch (dbErr) {
      console.error("DB error in POST /admin/zones/import:", dbErr);
      return res.status(503).json({
        ok: false,
        message: "Database unavailable. Check DATABASE_URL in apps/api/.env",
      });
    }

    try {
      await client.query("BEGIN");

      for (const z of parsed) {
        const polygon = normalizeGeoJson(z.polygon_geojson);

        if (
          !polygon ||
          polygon.type !== "Polygon" ||
          !Array.isArray(polygon.coordinates)
        ) {
          throw new Error(
            `Zone ${z.id} invalid polygon_geojson (must be GeoJSON Polygon)`,
          );
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
          [z.id, z.name, z.type, JSON.stringify(polygon)],
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
    if (
      e?.code === "28P01" ||
      e?.message?.includes("password authentication")
    ) {
      return res.status(503).json({
        ok: false,
        message: "Database unavailable. Check DATABASE_URL in apps/api/.env",
      });
    }
    res.status(400).json({ ok: false, message: e?.message ?? "Import failed" });
  }
});

//
// 🔹 ANONYMOUS COMPLAINTS + CHAT
//

const createComplaintSchema = z.object({
  title: z.string().min(3),
  category: z.enum([
    "ragging",
    "harassment",
    "mental_health",
    "discrimination",
    "lecturer_behavior",
    "other",
  ]),
  description: z.string().min(10),
  locationText: z.string().optional().nullable(),
  incidentAt: z.string().optional().nullable(),
  peopleInvolved: z.string().optional().nullable(),
  consent: z.boolean(),
  attachments: z
    .array(
      z.object({
        originalName: z.string(),
        mimeType: z.string(),
        sizeBytes: z.number(),
      }),
    )
    .default([]),
});

const reconnectComplaintSchema = z.object({
  anonId: z.string().min(1),
  secret: z.string().min(1),
});

const sendComplaintMessageSchema = z.object({
  body: z.string().min(1),
  requestCounseling: z.boolean().optional().default(false),
  attachments: z
    .array(
      z.object({
        originalName: z.string(),
        mimeType: z.string(),
        sizeBytes: z.number(),
      }),
    )
    .optional()
    .default([]),
});

function generateAnonId() {
  return `ANON-${Math.floor(10000 + Math.random() * 90000)}`;
}

function generateSecret() {
  return crypto.randomBytes(16).toString("hex");
}

function hashSecret(secret: string) {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

function classifyComplaintSeverity(text: string) {
  const normalized = text.toLowerCase();

  if (
    [
      "self-harm",
      "suicide",
      "kill",
      "weapon",
      "knife",
      "violence threat",
      "immediate danger",
    ].some((keyword) => normalized.includes(keyword))
  ) {
    return "CRITICAL";
  }

  if (
    ["threat", "violent", "ragging", "harass", "abuse", "unsafe"].some(
      (keyword) => normalized.includes(keyword),
    )
  ) {
    return "HIGH";
  }

  if (normalized.trim().length > 280) {
    return "MED";
  }

  return "LOW";
}

function getEmergencyResources(severity: string) {
  if (severity === "CRITICAL") {
    return [
      "If there is immediate danger, contact campus security or emergency services now.",
      "Reach out to a trusted counselor or staff member immediately.",
    ];
  }

  return [];
}

async function getComplaintSession(req: Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing session token");
  }

  const sessionToken = authHeader.slice("Bearer ".length).trim();

  const { rows } = await pool.query(
    `
    SELECT session_token, complaint_id, expires_at
    FROM complaint_sessions
    WHERE session_token = $1
    LIMIT 1
    `,
    [sessionToken],
  );

  if (rows.length === 0) {
    throw new Error("Invalid session");
  }

  const session = rows[0];
  if (new Date(session.expires_at).getTime() < Date.now()) {
    throw new Error("Session expired");
  }

  return session;
}

async function buildComplaintResponse(complaintId: string) {
  const complaintResult = await pool.query(
    `
    SELECT
      id,
      anon_id,
      title,
      category,
      description,
      severity,
      status,
      assigned_team,
      location_text,
      incident_at,
      people_involved,
      created_at,
      updated_at
    FROM complaint_cases
    WHERE id = $1
    LIMIT 1
    `,
    [complaintId],
  );

  if (complaintResult.rows.length === 0) {
    throw new Error("Complaint not found");
  }

  const row = complaintResult.rows[0];

  const messagesResult = await pool.query(
    `
    SELECT
      id,
      sender_type,
      sender_label,
      body,
      request_counseling,
      created_at
    FROM complaint_messages
    WHERE complaint_id = $1
    ORDER BY created_at ASC
    `,
    [complaintId],
  );

  const messages = messagesResult.rows.map((message) => ({
    id: message.id,
    senderType: message.sender_type,
    senderLabel: message.sender_label,
    body: message.body,
    requestCounseling: message.request_counseling,
    createdAt: message.created_at,
  }));

  return {
    id: row.id,
    anonId: row.anon_id,
    title: row.title,
    category: row.category,
    description: row.description,
    severity: row.severity,
    status: row.status,
    assignedTeam: row.assigned_team,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    locationText: row.location_text,
    incidentAt: row.incident_at,
    peopleInvolved: row.people_involved,
    attachments: [],
    timeline: [
      {
        id: `${row.id}-submitted`,
        title: "Complaint submitted",
        description: "Your anonymous complaint was received.",
        createdAt: row.created_at,
      },
    ],
    messages,
  };
}

app.post("/api/public/cases", async (req: Request, res: Response) => {
  try {
    const parsed = createComplaintSchema.parse(req.body);

    const id = crypto.randomUUID();
    const anonId = generateAnonId();
    const secret = generateSecret();
    const secretHash = hashSecret(secret);
    const severity = classifyComplaintSeverity(
      `${parsed.title} ${parsed.description}`,
    );
    const status = "NEW";
    const now = new Date().toISOString();

    const sessionToken = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 30,
    ).toISOString();

    await pool.query(
      `
      INSERT INTO complaint_cases (
        id,
        anon_id,
        secret_hash,
        title,
        category,
        description,
        severity,
        status,
        assigned_team,
        location_text,
        incident_at,
        people_involved,
        consent,
        created_at,
        updated_at
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
      )
      `,
      [
        id,
        anonId,
        secretHash,
        parsed.title,
        parsed.category,
        parsed.description,
        severity,
        status,
        null,
        parsed.locationText ?? null,
        parsed.incidentAt ? new Date(parsed.incidentAt) : null,
        parsed.peopleInvolved ?? null,
        parsed.consent,
        now,
        now,
      ],
    );

    await pool.query(
      `
      INSERT INTO complaint_sessions (session_token, complaint_id, expires_at)
      VALUES ($1, $2, $3)
      `,
      [sessionToken, id, expiresAt],
    );

    const complaint = await buildComplaintResponse(id);

    return res.status(201).json({
      anonId,
      secret,
      sessionToken,
      expiresAt,
      emergencyResources: getEmergencyResources(severity),
      complaint,
    });
  } catch (error) {
    console.error("Create complaint failed:", error);
    return res.status(400).json({
      message:
        error instanceof Error ? error.message : "Could not create complaint",
    });
  }
});

app.post("/api/public/cases/reconnect", async (req: Request, res: Response) => {
  try {
    const parsed = reconnectComplaintSchema.parse(req.body);
    const secretHash = hashSecret(parsed.secret);

    const { rows } = await pool.query(
      `
      SELECT id
      FROM complaint_cases
      WHERE anon_id = $1 AND secret_hash = $2
      LIMIT 1
      `,
      [parsed.anonId, secretHash],
    );

    if (rows.length === 0) {
      return res
        .status(401)
        .json({ message: "Invalid Anonymous ID or secret" });
    }

    const complaintId = rows[0].id;
    const sessionToken = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 30,
    ).toISOString();

    await pool.query(
      `
      INSERT INTO complaint_sessions (session_token, complaint_id, expires_at)
      VALUES ($1, $2, $3)
      `,
      [sessionToken, complaintId, expiresAt],
    );

    const complaint = await buildComplaintResponse(complaintId);

    return res.json({
      sessionToken,
      expiresAt,
      complaint,
    });
  } catch (error) {
    console.error("Reconnect complaint failed:", error);
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Could not reconnect complaint",
    });
  }
});

app.get("/api/public/cases/me", async (req: Request, res: Response) => {
  try {
    const session = await getComplaintSession(req);
    const complaint = await buildComplaintResponse(session.complaint_id);
    return res.json(complaint);
  } catch (error) {
    return res.status(401).json({
      message:
        error instanceof Error ? error.message : "Could not load complaint",
    });
  }
});

app.get(
  "/api/public/cases/me/messages",
  async (req: Request, res: Response) => {
    try {
      const session = await getComplaintSession(req);

      const { rows } = await pool.query(
        `
      SELECT
        id,
        sender_type,
        sender_label,
        body,
        request_counseling,
        created_at
      FROM complaint_messages
      WHERE complaint_id = $1
      ORDER BY created_at ASC
      `,
        [session.complaint_id],
      );

      return res.json(
        rows.map((message) => ({
          id: message.id,
          senderType: message.sender_type,
          senderLabel: message.sender_label,
          body: message.body,
          requestCounseling: message.request_counseling,
          createdAt: message.created_at,
        })),
      );
    } catch (error) {
      return res.status(401).json({
        message:
          error instanceof Error ? error.message : "Could not load messages",
      });
    }
  },
);

app.post(
  "/api/public/cases/me/messages",
  async (req: Request, res: Response) => {
    try {
      const session = await getComplaintSession(req);
      const parsed = sendComplaintMessageSchema.parse(req.body);

      await pool.query(
        `
      INSERT INTO complaint_messages (
        id,
        complaint_id,
        sender_type,
        sender_label,
        body,
        request_counseling,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `,
        [
          crypto.randomUUID(),
          session.complaint_id,
          "STUDENT",
          "You",
          parsed.body,
          parsed.requestCounseling,
        ],
      );

      await pool.query(
        `
      UPDATE complaint_cases
      SET
        status = CASE
          WHEN $2 = true THEN 'NEED_MORE_INFO'
          ELSE status
        END,
        updated_at = NOW()
      WHERE id = $1
      `,
        [session.complaint_id, parsed.requestCounseling],
      );

      const complaint = await buildComplaintResponse(session.complaint_id);

      return res.json({
        complaint,
        messages: complaint.messages,
        challengeRequired: false,
      });
    } catch (error) {
      console.error("Send complaint message failed:", error);
      return res.status(400).json({
        message:
          error instanceof Error ? error.message : "Could not send message",
      });
    }
  },
);

const port = Number(process.env.PORT || 4000);
const host = "0.0.0.0";

app.listen(port, host, () => {
  console.log(
    `API running on http://localhost:${port} (also http://0.0.0.0:${port})`,
  );
});
