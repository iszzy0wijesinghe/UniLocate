import express, { type Request, type Response } from "express";
import cors from "cors";
import "dotenv/config";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import multer from "multer";
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
// 🔹 LOST & FOUND + CHAT (database-backed)
//

type LostFoundType = "lost" | "found";
type ItemCategory = "ID Card" | "Wallet" | "Book" | "Device" | "Other";
type ChatRole = "owner" | "finder";

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
  images: z.array(z.string()).optional().default([]),
});

const FounderReportSchema = z.object({
  placeFound: z.string().optional(),
  whenFound: z.string().optional(),
  description: z.string().optional(),
  imageUrls: z.array(z.string()).optional().default([]),
});

const SendLostFoundMessageSchema = z.object({
  senderRole: z.union([z.literal("owner"), z.literal("finder")]),
  body: z.string().min(1),
});

const ReadNotificationsSchema = z.object({
  chatId: z.string().uuid(),
  recipientRole: z.union([z.literal("owner"), z.literal("finder")]),
});

const uploadsRoot = path.resolve(process.cwd(), "uploads");
const lostFoundUploadDir = path.join(uploadsRoot, "lost-found");
fs.mkdirSync(lostFoundUploadDir, { recursive: true });
app.use("/uploads", express.static(uploadsRoot));

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req: any, _file: any, cb: any) => cb(null, lostFoundUploadDir),
    filename: (_req: any, file: any, cb: any) => {
      const ext = path.extname(file.originalname || ".jpg");
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
});

async function ensureLostFoundTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS lost_found_posts (
      id UUID PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('lost','found')),
      category TEXT NOT NULL CHECK (category IN ('ID Card','Wallet','Book','Device','Other')),
      title TEXT NOT NULL,
      description TEXT,
      time_hint TEXT,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS lost_found_images (
      id UUID PRIMARY KEY,
      post_id UUID NOT NULL REFERENCES lost_found_posts(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS lost_found_chats (
      id UUID PRIMARY KEY,
      post_id UUID NOT NULL UNIQUE REFERENCES lost_found_posts(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_message_at TIMESTAMPTZ
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS lost_found_messages (
      id UUID PRIMARY KEY,
      chat_id UUID NOT NULL REFERENCES lost_found_chats(id) ON DELETE CASCADE,
      sender_role TEXT NOT NULL CHECK (sender_role IN ('owner','finder','system')),
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS lost_found_founder_reports (
      id UUID PRIMARY KEY,
      post_id UUID NOT NULL REFERENCES lost_found_posts(id) ON DELETE CASCADE,
      place_found TEXT,
      when_found TIMESTAMPTZ,
      description TEXT,
      image_urls TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS lost_found_notifications (
      id UUID PRIMARY KEY,
      post_id UUID NOT NULL REFERENCES lost_found_posts(id) ON DELETE CASCADE,
      chat_id UUID NOT NULL REFERENCES lost_found_chats(id) ON DELETE CASCADE,
      message_id UUID NOT NULL REFERENCES lost_found_messages(id) ON DELETE CASCADE,
      recipient_role TEXT NOT NULL CHECK (recipient_role IN ('owner','finder')),
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getOrCreateChatId(postId: string) {
  const existing = await pool.query(
    `SELECT id FROM lost_found_chats WHERE post_id = $1 LIMIT 1`,
    [postId]
  );
  if (existing.rows.length > 0) return existing.rows[0].id as string;

  const chatId = crypto.randomUUID();
  await pool.query(
    `INSERT INTO lost_found_chats (id, post_id, created_at, updated_at, last_message_at)
     VALUES ($1, $2, NOW(), NOW(), NOW())`,
    [chatId, postId]
  );
  return chatId;
}

async function getPostWithImages(postId: string) {
  const result = await pool.query(
    `
    SELECT
      p.id,
      p.type,
      p.category,
      p.title,
      p.description,
      p.time_hint as "timeHint",
      p.status,
      p.created_at as "createdAt",
      COALESCE(
        ARRAY_AGG(i.image_url ORDER BY i.created_at) FILTER (WHERE i.id IS NOT NULL),
        ARRAY[]::TEXT[]
      ) as images
    FROM lost_found_posts p
    LEFT JOIN lost_found_images i ON i.post_id = p.id
    WHERE p.id = $1
    GROUP BY p.id
    `,
    [postId]
  );
  return result.rows[0] ?? null;
}

app.post("/lost-found/uploads/image", upload.single("image"), (req: Request, res: Response) => {
  const uploaded = req as Request & { file?: { filename: string } };
  if (!uploaded.file) {
    return res.status(400).json({ message: "Image file is required" });
  }

  const host = req.get("host");
  const protocol = req.protocol;
  const url = `${protocol}://${host}/uploads/lost-found/${uploaded.file.filename}`;
  return res.status(201).json({ url });
});

app.get("/lost-found/posts", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT
        p.id,
        p.type,
        p.category,
        p.title,
        p.description,
        p.time_hint as "timeHint",
        p.status,
        p.created_at as "createdAt",
        COALESCE(
          ARRAY_AGG(i.image_url ORDER BY i.created_at) FILTER (WHERE i.id IS NOT NULL),
          ARRAY[]::TEXT[]
        ) as images
      FROM lost_found_posts p
      LEFT JOIN lost_found_images i ON i.post_id = p.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
      `
    );
    return res.json(rows);
  } catch (e) {
    console.error("DB error in GET /lost-found/posts:", e);
    return res.status(503).json({ message: "Database unavailable" });
  }
});

app.post("/lost-found/posts", async (req: Request, res: Response) => {
  try {
    const parsed = LostFoundInputSchema.parse(req.body);
    const id = crypto.randomUUID();
    await pool.query(
      `
      INSERT INTO lost_found_posts (id, type, category, title, description, time_hint, status, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,'open',NOW(),NOW())
      `,
      [id, parsed.type, parsed.category, parsed.title, parsed.description ?? null, parsed.timeHint ?? null]
    );

    for (const imageUrl of parsed.images) {
      await pool.query(
        `INSERT INTO lost_found_images (id, post_id, image_url, created_at) VALUES ($1,$2,$3,NOW())`,
        [crypto.randomUUID(), id, imageUrl]
      );
    }

    const post = await getPostWithImages(id);
    return res.status(201).json(post);
  } catch (e) {
    console.error("DB error in POST /lost-found/posts:", e);
    return res.status(400).json({ message: e instanceof Error ? e.message : "Could not create post" });
  }
});

app.get("/lost-found/posts/:id", async (req: Request, res: Response) => {
  try {
    const post = await getPostWithImages(req.params.id);
    if (!post) return res.status(404).json({ message: "Not found" });
    return res.json(post);
  } catch (e) {
    console.error("DB error in GET /lost-found/posts/:id:", e);
    return res.status(503).json({ message: "Database unavailable" });
  }
});

app.post("/lost-found/posts/:id/resolve", async (req: Request, res: Response) => {
  try {
    const { rowCount } = await pool.query(
      `UPDATE lost_found_posts SET status = 'resolved', updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ message: "Not found" });
    const post = await getPostWithImages(req.params.id);
    return res.json(post);
  } catch (e) {
    console.error("DB error in POST /lost-found/posts/:id/resolve:", e);
    return res.status(503).json({ message: "Database unavailable" });
  }
});

app.delete("/lost-found/posts/:id", async (req: Request, res: Response) => {
  try {
    const { rowCount } = await pool.query(`DELETE FROM lost_found_posts WHERE id = $1`, [req.params.id]);
    if (!rowCount) return res.status(404).json({ message: "Not found" });
    return res.status(204).send();
  } catch (e) {
    console.error("DB error in DELETE /lost-found/posts/:id:", e);
    return res.status(503).json({ message: "Database unavailable" });
  }
});

app.post("/lost-found/posts/:id/founder-report", async (req: Request, res: Response) => {
  try {
    const postId = req.params.id;
    const parsed = FounderReportSchema.parse(req.body);
    const post = await getPostWithImages(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    await pool.query(
      `
      INSERT INTO lost_found_founder_reports (id, post_id, place_found, when_found, description, image_urls, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,NOW())
      `,
      [
        crypto.randomUUID(),
        postId,
        parsed.placeFound ?? null,
        parsed.whenFound ? new Date(parsed.whenFound) : null,
        parsed.description ?? null,
        parsed.imageUrls,
      ]
    );

    const chatId = await getOrCreateChatId(postId);
    const lines: string[] = [];
    if (parsed.placeFound?.trim()) lines.push(`Place found: ${parsed.placeFound.trim()}`);
    if (parsed.whenFound) lines.push(`Time found: ${new Date(parsed.whenFound).toLocaleString()}`);
    if (parsed.description?.trim()) lines.push(`Finder description: ${parsed.description.trim()}`);
    if (parsed.imageUrls.length) lines.push(`Photos: ${parsed.imageUrls.join(", ")}`);
    const initialBody =
      lines.length > 0
        ? `Hi, I found an item that may be yours.\n${lines.join("\n")}\nPlease confirm details to verify ownership.`
        : "Hi, I found an item that may be yours. Please confirm details to verify ownership.";

    const messageId = crypto.randomUUID();
    await pool.query(
      `
      INSERT INTO lost_found_messages (id, chat_id, sender_role, body, created_at)
      VALUES ($1,$2,'finder',$3,NOW())
      `,
      [messageId, chatId, initialBody]
    );
    await pool.query(
      `
      UPDATE lost_found_chats
      SET updated_at = NOW(), last_message_at = NOW()
      WHERE id = $1
      `,
      [chatId]
    );
    await pool.query(
      `
      INSERT INTO lost_found_notifications (id, post_id, chat_id, message_id, recipient_role, title, body, is_read, created_at)
      VALUES ($1,$2,$3,$4,'owner',$5,$6,FALSE,NOW())
      `,
      [crypto.randomUUID(), postId, chatId, messageId, "UniLocate Lost & Found", "A finder sent you a new message."]
    );

    return res.status(201).json({ chatId, initialMessage: initialBody });
  } catch (e) {
    console.error("DB error in POST /lost-found/posts/:id/founder-report:", e);
    return res.status(400).json({ message: e instanceof Error ? e.message : "Could not submit founder report" });
  }
});

app.get("/lost-found/posts/:id/chat", async (req: Request, res: Response) => {
  try {
    const postId = req.params.id;
    const viewerRoleRaw = String(req.query.viewerRole ?? "owner");
    const viewerRole: ChatRole = viewerRoleRaw === "finder" ? "finder" : "owner";
    const chatId = await getOrCreateChatId(postId);

    const messagesResult = await pool.query(
      `
      SELECT id, sender_role, body, created_at
      FROM lost_found_messages
      WHERE chat_id = $1
      ORDER BY created_at ASC
      `,
      [chatId]
    );

    const notificationsResult = await pool.query(
      `
      SELECT COUNT(*)::int as unread
      FROM lost_found_notifications
      WHERE chat_id = $1 AND recipient_role = $2 AND is_read = FALSE
      `,
      [chatId, viewerRole]
    );

    return res.json({
      chatId,
      unreadCount: notificationsResult.rows[0]?.unread ?? 0,
      messages: messagesResult.rows.map((row) => ({
        id: row.id,
        senderRole: row.sender_role,
        body: row.body,
        createdAt: row.created_at,
      })),
    });
  } catch (e) {
    console.error("DB error in GET /lost-found/posts/:id/chat:", e);
    return res.status(400).json({ message: "Could not load chat" });
  }
});

app.post("/lost-found/chats/:chatId/messages", async (req: Request, res: Response) => {
  try {
    const parsed = SendLostFoundMessageSchema.parse(req.body);
    const chatId = req.params.chatId;
    const messageId = crypto.randomUUID();
    const recipientRole: ChatRole = parsed.senderRole === "finder" ? "owner" : "finder";

    const chatResult = await pool.query(
      `SELECT id, post_id FROM lost_found_chats WHERE id = $1 LIMIT 1`,
      [chatId]
    );
    if (chatResult.rows.length === 0) return res.status(404).json({ message: "Chat not found" });

    await pool.query(
      `
      INSERT INTO lost_found_messages (id, chat_id, sender_role, body, created_at)
      VALUES ($1,$2,$3,$4,NOW())
      `,
      [messageId, chatId, parsed.senderRole, parsed.body]
    );
    await pool.query(
      `UPDATE lost_found_chats SET updated_at = NOW(), last_message_at = NOW() WHERE id = $1`,
      [chatId]
    );
    await pool.query(
      `
      INSERT INTO lost_found_notifications (id, post_id, chat_id, message_id, recipient_role, title, body, is_read, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,FALSE,NOW())
      `,
      [
        crypto.randomUUID(),
        chatResult.rows[0].post_id,
        chatId,
        messageId,
        recipientRole,
        "UniLocate Lost & Found",
        "You have a new secure chat message.",
      ]
    );

    return res.status(201).json({
      id: messageId,
      senderRole: parsed.senderRole,
      body: parsed.body,
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("DB error in POST /lost-found/chats/:chatId/messages:", e);
    return res.status(400).json({ message: e instanceof Error ? e.message : "Could not send message" });
  }
});

app.post("/lost-found/notifications/read", async (req: Request, res: Response) => {
  try {
    const parsed = ReadNotificationsSchema.parse(req.body);
    await pool.query(
      `
      UPDATE lost_found_notifications
      SET is_read = TRUE
      WHERE chat_id = $1 AND recipient_role = $2 AND is_read = FALSE
      `,
      [parsed.chatId, parsed.recipientRole]
    );
    return res.json({ ok: true });
  } catch (e) {
    return res.status(400).json({ message: e instanceof Error ? e.message : "Could not mark notifications as read" });
  }
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

app.get("/boundary", async (_req: Request, res: Response) => {
  try {
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
  } catch (e) {
    console.error("DB error in GET /boundary:", e);
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
  if (input?.type === "Polygon") return input;
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
      })
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
      })
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
    ["self-harm", "suicide", "kill", "weapon", "knife", "violence threat", "immediate danger"].some(
      (keyword) => normalized.includes(keyword)
    )
  ) {
    return "CRITICAL";
  }

  if (
    ["threat", "violent", "ragging", "harass", "abuse", "unsafe"].some((keyword) =>
      normalized.includes(keyword)
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
    [sessionToken]
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
    [complaintId]
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
    [complaintId]
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
    const severity = classifyComplaintSeverity(`${parsed.title} ${parsed.description}`);
    const status = "NEW";
    const now = new Date().toISOString();

    const sessionToken = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();

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
      ]
    );

    await pool.query(
      `
      INSERT INTO complaint_sessions (session_token, complaint_id, expires_at)
      VALUES ($1, $2, $3)
      `,
      [sessionToken, id, expiresAt]
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
      message: error instanceof Error ? error.message : "Could not create complaint",
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
      [parsed.anonId, secretHash]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid Anonymous ID or secret" });
    }

    const complaintId = rows[0].id;
    const sessionToken = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();

    await pool.query(
      `
      INSERT INTO complaint_sessions (session_token, complaint_id, expires_at)
      VALUES ($1, $2, $3)
      `,
      [sessionToken, complaintId, expiresAt]
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
      message: error instanceof Error ? error.message : "Could not reconnect complaint",
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
      message: error instanceof Error ? error.message : "Could not load complaint",
    });
  }
});

app.get("/api/public/cases/me/messages", async (req: Request, res: Response) => {
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
      [session.complaint_id]
    );

    return res.json(
      rows.map((message) => ({
        id: message.id,
        senderType: message.sender_type,
        senderLabel: message.sender_label,
        body: message.body,
        requestCounseling: message.request_counseling,
        createdAt: message.created_at,
      }))
    );
  } catch (error) {
    return res.status(401).json({
      message: error instanceof Error ? error.message : "Could not load messages",
    });
  }
});

app.post("/api/public/cases/me/messages", async (req: Request, res: Response) => {
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
      ]
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
      [session.complaint_id, parsed.requestCounseling]
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
      message: error instanceof Error ? error.message : "Could not send message",
    });
  }
});

const port = Number(process.env.PORT || 4000);
const host = "0.0.0.0";

let lostFoundDbReady = false;

ensureLostFoundTables()
  .then(() => {
    lostFoundDbReady = true;
    console.log("Lost & Found DB tables ready.");
  })
  .catch((error) => {
    console.error("Failed to initialize Lost & Found tables:", error);
    console.error(
      "Lost & Found DB is disabled until DATABASE_URL is fixed. API still starts for troubleshooting."
    );
  })
  .finally(() => {
app.listen(port, host, () => {
  console.log(`API running on http://localhost:${port} (also http://0.0.0.0:${port})`);
    });
  });

app.get("/lost-found/status", (_req: Request, res: Response) => {
  if (!lostFoundDbReady) {
    return res.status(503).json({
      ok: false,
      message:
        "Lost & Found DB is not ready. Check apps/api/.env DATABASE_URL. Expected format: postgres://user:password@host:5432/dbname",
    });
  }
  return res.json({ ok: true });
});