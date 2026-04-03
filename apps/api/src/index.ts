/** @format */

import express, {
  type Request,
  type Response,
  type RequestHandler,
} from "express";
import cors from "cors";
import "dotenv/config";
import crypto from "crypto";
import { z } from "zod";
import { pool } from "./db";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";

const app = express();

const uploadsDir = path.join(process.cwd(), "uploads", "complaints");
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({ storage });

// IMPORTANT: increase JSON limit for polygons
app.use(express.json({ limit: "10mb" }));
app.use(cors());
app.use("/uploads/complaints", express.static(uploadsDir));

function getOccupancyStatus(currentCount: number, capacity: number) {
  if (!capacity || capacity <= 0) return "Unknown";

  const ratio = currentCount / capacity;

  if (ratio >= 0.8) return "Crowded";
  if (ratio >= 0.4) return "Almost Full";
  if (ratio > 0) return "Available";
  return "Free";
}

const RegisterUserSchema = z
  .object({
    username: z
      .string()
      .min(3)
      .max(24)
      .regex(
        /^[A-Za-z0-9_]+$/,
        "Only letters, numbers, and underscore are allowed",
      ),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const LoginUserSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(
      /^[A-Za-z0-9_]+$/,
      "Only letters, numbers, and underscore are allowed",
    ),
  password: z.string().min(1),
});

const CheckUsernameSchema = z.object({
  username: z.string().min(3).max(24),
});

const UpdateAccountSchema = z.object({
  userId: z.string().min(1),
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(
      /^[A-Za-z0-9_]+$/,
      "Only letters, numbers, and underscore are allowed",
    ),
});

function normalizeNamePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

function buildAdminEmail(firstName: string, lastName: string) {
  const first = normalizeNamePart(firstName);
  const last = normalizeNamePart(lastName);
  return `${first}.${last}@unilocateadmin.com`;
}

const ResetPasswordSchema = z
  .object({
    userId: z.string().min(1),
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => /[A-Z]/.test(data.newPassword), {
    message: "Password must contain at least one uppercase letter",
    path: ["newPassword"],
  })
  .refine((data) => /[a-z]/.test(data.newPassword), {
    message: "Password must contain at least one lowercase letter",
    path: ["newPassword"],
  })
  .refine((data) => /[0-9]/.test(data.newPassword), {
    message: "Password must contain at least one number",
    path: ["newPassword"],
  })
  .refine((data) => /[^A-Za-z0-9]/.test(data.newPassword), {
    message: "Password must contain at least one special character",
    path: ["newPassword"],
  });

const AdminRegisterSchema = z
  .object({
    firstName: z
      .string()
      .min(2, "First name is required")
      .max(100)
      .regex(/^[A-Za-z ]+$/, "First name can contain letters and spaces only"),
    lastName: z
      .string()
      .min(2, "Last name is required")
      .max(100)
      .regex(/^[A-Za-z ]+$/, "Last name can contain letters and spaces only"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .refine((value) => /[A-Z]/.test(value), {
        message: "Password must contain at least one uppercase letter",
      })
      .refine((value) => /[a-z]/.test(value), {
        message: "Password must contain at least one lowercase letter",
      })
      .refine((value) => /[0-9]/.test(value), {
        message: "Password must contain at least one number",
      })
      .refine((value) => /[^A-Za-z0-9]/.test(value), {
        message: "Password must contain at least one special character",
      }),
    confirmPassword: z.string().min(8),
    roleKey: z.string().min(1),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const AdminLoginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

const adminAvatarUploadsDir = path.join(
  process.cwd(),
  "uploads",
  "admin-avatars",
);
fs.mkdirSync(adminAvatarUploadsDir, { recursive: true });

const adminAvatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, adminAvatarUploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const UpdateAdminUserSchema = z.object({
  firstName: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[A-Za-z ]+$/, "First name can contain letters and spaces only"),
  lastName: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[A-Za-z ]+$/, "Last name can contain letters and spaces only"),
  roleKey: z.string().min(1),
  isActive: z.boolean(),
});

const ResetAdminUserPasswordSchema = z
  .object({
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => /[A-Z]/.test(data.newPassword), {
    message: "Password must contain at least one uppercase letter",
    path: ["newPassword"],
  })
  .refine((data) => /[a-z]/.test(data.newPassword), {
    message: "Password must contain at least one lowercase letter",
    path: ["newPassword"],
  })
  .refine((data) => /[0-9]/.test(data.newPassword), {
    message: "Password must contain at least one number",
    path: ["newPassword"],
  })
  .refine((data) => /[^A-Za-z0-9]/.test(data.newPassword), {
    message: "Password must contain at least one special character",
    path: ["newPassword"],
  });

const UpdateMyProfileSchema = z.object({
  firstName: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[A-Za-z ]+$/, "First name can contain letters and spaces only"),
  lastName: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[A-Za-z ]+$/, "Last name can contain letters and spaces only"),
});

const ChangeMyPasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => /[A-Z]/.test(data.newPassword), {
    message: "Password must contain at least one uppercase letter",
    path: ["newPassword"],
  })
  .refine((data) => /[a-z]/.test(data.newPassword), {
    message: "Password must contain at least one lowercase letter",
    path: ["newPassword"],
  })
  .refine((data) => /[0-9]/.test(data.newPassword), {
    message: "Password must contain at least one number",
    path: ["newPassword"],
  })
  .refine((data) => /[^A-Za-z0-9]/.test(data.newPassword), {
    message: "Password must contain at least one special character",
    path: ["newPassword"],
  });

const adminAvatarUpload = multer({ storage: adminAvatarStorage });

app.use("/uploads/admin-avatars", express.static(adminAvatarUploadsDir));

app.get("/health", async (_req: Request, res: Response) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, db: "connected" });
  } catch {
    res.status(500).json({ ok: false, db: "down" });
  }
});

app.post("/users/register", async (req: Request, res: Response) => {
  const parsed = RegisterUserSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid registration data",
      error: parsed.error.flatten(),
    });
  }

  const username = parsed.data.username.trim();
  const password = parsed.data.password;

  try {
    const existing = await pool.query(
      `
      SELECT id, username
      FROM users
      WHERE LOWER(username) = LOWER($1)
      LIMIT 1
      `,
      [username],
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        message: "Username already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users (username, password_hash, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      RETURNING id, username, created_at, updated_at
      `,
      [username, passwordHash],
    );

    const row = result.rows[0];

    return res.status(201).json({
      id: row.id,
      username: row.username,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  } catch (e) {
    console.error("DB error in POST /users/register:", e);
    return res.status(503).json({
      message: "Failed to register user",
      error: "Database unavailable.",
    });
  }
});

app.post("/users/login", async (req: Request, res: Response) => {
  const parsed = LoginUserSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid login data",
      error: parsed.error.flatten(),
    });
  }

  const username = parsed.data.username.trim();
  const password = parsed.data.password;

  try {
    const result = await pool.query(
      `
      SELECT id, username, password_hash, created_at, updated_at
      FROM users
      WHERE LOWER(username) = LOWER($1)
      LIMIT 1
      `,
      [username],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid username or password",
      });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid username or password",
      });
    }

    return res.json({
      id: user.id,
      username: user.username,
      created_at: user.created_at,
      updated_at: user.updated_at,
    });
  } catch (e) {
    console.error("DB error in POST /users/login:", e);
    return res.status(503).json({
      message: "Failed to login",
      error: "Database unavailable.",
    });
  }
});

app.get("/users/check-username", async (req: Request, res: Response) => {
  const parsed = CheckUsernameSchema.safeParse({
    username: String(req.query.username ?? ""),
  });

  if (!parsed.success) {
    return res.status(400).json({
      available: false,
      message: "Invalid username",
    });
  }

  const username = parsed.data.username.trim();

  if (!/^[A-Za-z0-9_]+$/.test(username)) {
    return res.json({
      available: false,
      message: "Only letters, numbers, and underscore are allowed",
    });
  }

  try {
    const existing = await pool.query(
      `
      SELECT id
      FROM users
      WHERE LOWER(username) = LOWER($1)
      LIMIT 1
      `,
      [username],
    );

    if (existing.rows.length > 0) {
      return res.json({
        available: false,
        message: "Username already exists",
      });
    }

    return res.json({
      available: true,
      message: "Username is available",
    });
  } catch (e) {
    console.error("DB error in GET /users/check-username:", e);
    return res.status(503).json({
      available: false,
      message: "Database unavailable",
    });
  }
});

app.patch("/users/update-account", async (req: Request, res: Response) => {
  const parsed = UpdateAccountSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid account update data",
      error: parsed.error.flatten(),
    });
  }

  const { userId, username } = parsed.data;
  const trimmedUsername = username.trim();

  try {
    const existing = await pool.query(
      `
      SELECT id
      FROM users
      WHERE LOWER(username) = LOWER($1)
        AND id <> $2
      LIMIT 1
      `,
      [trimmedUsername, userId],
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        message: "Username already exists",
      });
    }

    const result = await pool.query(
      `
      UPDATE users
      SET username = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING id, username, created_at, updated_at
      `,
      [trimmedUsername, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const row = result.rows[0];

    return res.json({
      id: row.id,
      username: row.username,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  } catch (e) {
    console.error("DB error in PATCH /users/update-account:", e);
    return res.status(503).json({
      message: "Failed to update account",
      error: "Database unavailable.",
    });
  }
});

app.patch("/users/reset-password", async (req: Request, res: Response) => {
  const parsed = ResetPasswordSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid password reset data",
      error: parsed.error.flatten(),
    });
  }

  const { userId, currentPassword, newPassword } = parsed.data;

  try {
    const result = await pool.query(
      `
      SELECT id, password_hash
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        message: "Current password is incorrect",
      });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `
      UPDATE users
      SET password_hash = $1,
          updated_at = NOW()
      WHERE id = $2
      `,
      [newPasswordHash, userId],
    );

    return res.json({
      message: "Password reset successfully",
    });
  } catch (e) {
    console.error("DB error in PATCH /users/reset-password:", e);
    return res.status(503).json({
      message: "Failed to reset password",
      error: "Database unavailable.",
    });
  }
});

app.post("/admin/auth/register", async (req: Request, res: Response) => {
  const parsed = AdminRegisterSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid registration data",
      error: parsed.error.flatten(),
    });
  }

  const { firstName, lastName, password, roleKey } = parsed.data;
  const cleanFirstName = firstName.trim();
  const cleanLastName = lastName.trim();
  const email = buildAdminEmail(cleanFirstName, cleanLastName);
  const fullName = `${cleanFirstName} ${cleanLastName}`;

  try {
    const roleResult = await pool.query(
      `
      SELECT id, role_key, role_name
      FROM admin_roles
      WHERE role_key = $1
      LIMIT 1
      `,
      [roleKey],
    );

    if (roleResult.rows.length === 0) {
      return res.status(400).json({
        message: "Invalid admin role",
      });
    }

    const existingUser = await pool.query(
      `
      SELECT id
      FROM admin_users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [email],
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "Admin email already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const role = roleResult.rows[0];
    const id = crypto.randomUUID();
    const mustChangePassword = role.role_key !== "SUPER_ADMIN";

    const result = await pool.query(
      `
      INSERT INTO admin_users (
        id,
        first_name,
        last_name,
        full_name,
        email,
        password_hash,
        role_id,
        is_active,
        avatar_url,
        must_change_password,
        password_changed_at,
        created_at,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,true,NULL,$8,NULL,NOW(),NOW())
      RETURNING
        id,
        first_name,
        last_name,
        full_name,
        email,
        is_active,
        avatar_url,
        must_change_password,
        password_changed_at,
        created_at,
        updated_at
      `,
      [
        id,
        cleanFirstName,
        cleanLastName,
        fullName,
        email,
        passwordHash,
        role.id,
        mustChangePassword,
      ],
    );

    const row = result.rows[0];

    return res.status(201).json({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      fullName: row.full_name,
      email: row.email,
      isActive: row.is_active,
      avatarUrl: row.avatar_url,
      mustChangePassword: row.must_change_password,
      passwordChangedAt: row.password_changed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      roleKey: role.role_key,
      roleName: role.role_name,
    });
  } catch (e) {
    console.error("DB error in POST /admin/auth/register:", e);
    return res.status(503).json({
      message: "Failed to register admin user",
      error: "Database unavailable.",
    });
  }
});

app.post("/admin/auth/login", async (req: Request, res: Response) => {
  const parsed = AdminLoginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid login data",
      error: parsed.error.flatten(),
    });
  }

  const { email, password } = parsed.data;

  try {
    const result = await pool.query(
      `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.full_name,
        u.email,
        u.password_hash,
        u.is_active,
        u.avatar_url,
        u.must_change_password,
        u.password_changed_at,
        r.role_key,
        r.role_name
      FROM admin_users u
      INNER JOIN admin_roles r
        ON r.id = u.role_id
      WHERE LOWER(u.email) = LOWER($1)
      LIMIT 1
      `,
      [email.trim()],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        message: "This admin account is inactive",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    return res.json({
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      fullName: user.full_name,
      email: user.email,
      roleKey: user.role_key,
      roleName: user.role_name,
      isActive: user.is_active,
      avatarUrl: user.avatar_url,
      mustChangePassword:
        user.role_key !== "SUPER_ADMIN" && !user.password_changed_at,
      passwordChangedAt: user.password_changed_at,
    });
  } catch (e) {
    console.error("DB error in POST /admin/auth/login:", e);
    return res.status(503).json({
      message: "Failed to login admin user",
      error: "Database unavailable.",
    });
  }
});

app.get("/admin/users", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.full_name,
        u.email,
        u.is_active,
        u.avatar_url,
        u.must_change_password,
        u.password_changed_at,
        u.created_at,
        u.updated_at,
        r.role_key,
        r.role_name
      FROM admin_users u
      INNER JOIN admin_roles r
        ON r.id = u.role_id
      ORDER BY u.created_at DESC
      `,
    );

    return res.json(
      rows.map((row) => ({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        fullName: row.full_name,
        email: row.email,
        isActive: row.is_active,
        avatarUrl: row.avatar_url,
        mustChangePassword: row.must_change_password,
        passwordChangedAt: row.password_changed_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        roleKey: row.role_key,
        roleName: row.role_name,
      })),
    );
  } catch (e) {
    console.error("DB error in GET /admin/users:", e);
    return res.status(503).json({
      error: "Database unavailable.",
    });
  }
});

app.patch("/admin/users/:id", async (req: Request, res: Response) => {
  const parsed = UpdateAdminUserSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid update data",
      error: parsed.error.flatten(),
    });
  }

  const { firstName, lastName, roleKey, isActive } = parsed.data;
  const cleanFirstName = firstName.trim();
  const cleanLastName = lastName.trim();
  const fullName = `${cleanFirstName} ${cleanLastName}`;

  try {
    const roleResult = await pool.query(
      `
      SELECT id, role_key, role_name
      FROM admin_roles
      WHERE role_key = $1
      LIMIT 1
      `,
      [roleKey],
    );

    if (roleResult.rows.length === 0) {
      return res.status(400).json({
        message: "Invalid role",
      });
    }

    const role = roleResult.rows[0];

    const result = await pool.query(
      `
      UPDATE admin_users
      SET
        first_name = $2,
        last_name = $3,
        full_name = $4,
        role_id = $5,
        is_active = $6,
        updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        first_name,
        last_name,
        full_name,
        email,
        is_active,
        avatar_url,
        must_change_password,
        password_changed_at,
        created_at,
        updated_at
      `,
      [
        req.params.id,
        cleanFirstName,
        cleanLastName,
        fullName,
        role.id,
        isActive,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Admin user not found",
      });
    }

    const row = result.rows[0];

    return res.json({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      fullName: row.full_name,
      email: row.email,
      isActive: row.is_active,
      avatarUrl: row.avatar_url,
      mustChangePassword: row.must_change_password,
      passwordChangedAt: row.password_changed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      roleKey: role.role_key,
      roleName: role.role_name,
    });
  } catch (e) {
    console.error("DB error in PATCH /admin/users/:id:", e);
    return res.status(503).json({
      message: "Failed to update admin user",
      error: "Database unavailable.",
    });
  }
});

app.delete("/admin/users/:id", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `
      DELETE FROM admin_users
      WHERE id = $1
      RETURNING id
      `,
      [req.params.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Admin user not found",
      });
    }

    return res.json({
      ok: true,
      deletedId: result.rows[0].id,
    });
  } catch (e) {
    console.error("DB error in DELETE /admin/users/:id:", e);
    return res.status(503).json({
      message: "Failed to delete admin user",
      error: "Database unavailable.",
    });
  }
});

app.patch(
  "/admin/users/:id/reset-password",
  async (req: Request, res: Response) => {
    const parsed = ResetAdminUserPasswordSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid password reset data",
        error: parsed.error.flatten(),
      });
    }

    try {
      const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);

      const result = await pool.query(
        `
  UPDATE admin_users
  SET
    password_hash = $2,
    password_changed_at = NOW(),
    updated_at = NOW()
  WHERE id = $1
  RETURNING id, password_changed_at
  `,
        [req.params.id, passwordHash],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Admin user not found",
        });
      }

      return res.json({
        ok: true,
        message: "Password reset successfully",
      });
    } catch (e) {
      console.error("DB error in PATCH /admin/users/:id/reset-password:", e);
      return res.status(503).json({
        message: "Failed to reset password",
        error: "Database unavailable.",
      });
    }
  },
);

app.patch("/admin/account/profile", async (req: Request, res: Response) => {
  const parsed = UpdateMyProfileSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid profile data",
      error: parsed.error.flatten(),
    });
  }

  const adminUserId = String(req.headers["x-admin-user-id"] ?? "").trim();

  if (!adminUserId) {
    return res.status(400).json({
      message: "Missing admin user id",
    });
  }

  const cleanFirstName = parsed.data.firstName.trim();
  const cleanLastName = parsed.data.lastName.trim();
  const fullName = `${cleanFirstName} ${cleanLastName}`;

  try {
    await pool.query(
      `
      UPDATE admin_users
      SET
        first_name = $2,
        last_name = $3,
        full_name = $4,
        updated_at = NOW()
      WHERE id = $1
      `,
      [adminUserId, cleanFirstName, cleanLastName, fullName],
    );

    const refreshed = await pool.query(
      `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.full_name,
        u.email,
        u.is_active,
        u.avatar_url,
        u.must_change_password,
        u.password_changed_at,
        r.role_key,
        r.role_name
      FROM admin_users u
      INNER JOIN admin_roles r
        ON r.id = u.role_id
      WHERE u.id = $1
      LIMIT 1
      `,
      [adminUserId],
    );

    if (refreshed.rows.length === 0) {
      return res.status(404).json({
        message: "Admin user not found",
      });
    }

    const row = refreshed.rows[0];

    return res.json({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      fullName: row.full_name,
      email: row.email,
      isActive: row.is_active,
      avatarUrl: row.avatar_url,
      mustChangePassword: row.must_change_password,
      passwordChangedAt: row.password_changed_at,
      roleKey: row.role_key,
      roleName: row.role_name,
    });
  } catch (e) {
    console.error("DB error in PATCH /admin/account/profile:", e);
    return res.status(503).json({
      message: "Failed to update profile",
      error: "Database unavailable.",
    });
  }
});

app.patch("/admin/account/password", async (req: Request, res: Response) => {
  const parsed = ChangeMyPasswordSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid password data",
      error: parsed.error.flatten(),
    });
  }

  const adminUserId = String(req.headers["x-admin-user-id"] ?? "").trim();

  if (!adminUserId) {
    return res.status(400).json({
      message: "Missing admin user id",
    });
  }

  try {
    const result = await pool.query(
      `
      SELECT id, password_hash
      FROM admin_users
      WHERE id = $1
      LIMIT 1
      `,
      [adminUserId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Admin user not found",
      });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(
      parsed.data.currentPassword,
      user.password_hash,
    );

    if (!isMatch) {
      return res.status(401).json({
        message: "Current password is incorrect",
      });
    }

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);

    await pool.query(
      `
  UPDATE admin_users
  SET
    password_hash = $2,
    password_changed_at = NOW(),
    updated_at = NOW()
  WHERE id = $1
  `,
      [adminUserId, passwordHash],
    );

    return res.json({
      ok: true,
      message: "Password updated successfully",
      mustChangePassword: false,
    });
  } catch (e) {
    console.error("DB error in PATCH /admin/account/password:", e);
    return res.status(503).json({
      message: "Failed to update password",
      error: "Database unavailable.",
    });
  }
});

app.post(
  "/admin/account/avatar",
  adminAvatarUpload.single("file") as unknown as RequestHandler,
  async (req: Request, res: Response) => {
    try {
      const adminUserId = String(req.headers["x-admin-user-id"] ?? "").trim();

      if (!adminUserId) {
        return res.status(400).json({
          message: "Missing admin user id",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          message: "No avatar file uploaded",
        });
      }

      const avatarUrl = `/uploads/admin-avatars/${req.file.filename}`;

      const result = await pool.query(
        `
        UPDATE admin_users
        SET avatar_url = $2, updated_at = NOW()
        WHERE id = $1
        RETURNING
          id,
          first_name,
          last_name,
          full_name,
          email,
          is_active,
          avatar_url,
          must_change_password,
          password_changed_at
        `,
        [adminUserId, avatarUrl],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Admin user not found",
        });
      }

      return res.json({
        ok: true,
        avatarUrl,
        mustChangePassword: result.rows[0].must_change_password,
        passwordChangedAt: result.rows[0].password_changed_at,
      });
    } catch (e) {
      console.error("DB error in POST /admin/account/avatar:", e);
      return res.status(503).json({
        message: "Failed to upload avatar",
        error: "Database unavailable.",
      });
    }
  },
);
//
// 🔹 LOST & FOUND (database-backed)
//

type LostFoundType = "lost" | "found";
type ItemCategory = "ID Card" | "Wallet" | "Book" | "Device" | "Other";

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
  ownerUserId: z.string().optional(),
  ownerUsername: z.string().optional(),
});

const LostFoundChatInputSchema = z.object({
  senderType: z.union([
    z.literal("owner"),
    z.literal("finder"),
    z.literal("claimant"),
    z.literal("system"),
  ]),
  senderLabel: z.string().optional(),
  message: z.string().min(1),
});

app.get("/lost-found/posts", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        p.id,
        p.type,
        p.category,
        p.title,
        p.description,
        p.time_hint,
        p.status,
        p.created_by_user_id,
        p.owner_user_id,
        p.owner_username,
        p.is_found,
        p.created_at,
        p.updated_at,
        COALESCE(
          json_agg(i.image_url ORDER BY i.created_at) FILTER (WHERE i.id IS NOT NULL),
          '[]'::json
        ) AS images
      FROM lost_found_posts p
      LEFT JOIN lost_found_images i
        ON i.post_id = p.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);

    res.json(
      rows.map((row) => ({
        id: row.id,
        type: row.type,
        category: row.category,
        title: row.title,
        description: row.description,
        timeHint: row.time_hint,
        status: row.status,
        createdByUserId: row.created_by_user_id,
        ownerUserId: row.owner_user_id,
        ownerUsername: row.owner_username,
        isFound: row.is_found,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        images: row.images ?? [],
      })),
    );
  } catch (e) {
    console.error("DB error in GET /lost-found/posts:", e);
    res.status(503).json({ error: "Database unavailable." });
  }
});

app.post("/lost-found/posts", async (req: Request, res: Response) => {
  const parsed = LostFoundInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const data = parsed.data;
  const postId = crypto.randomUUID();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
  INSERT INTO lost_found_posts (
    id,
    type,
    category,
    title,
    description,
    time_hint,
    status,
    created_by_user_id,
    owner_user_id,
    owner_username,
    is_found,
    created_at,
    updated_at
  )
  VALUES ($1,$2,$3,$4,$5,$6,'open',$7,$8,$9,false,NOW(),NOW())
  `,
      [
        postId,
        data.type,
        data.category,
        data.title,
        data.description ?? null,
        data.timeHint ?? null,
        data.ownerUserId ?? null,
        data.ownerUserId ?? null,
        data.ownerUsername ?? null,
      ],
    );

    for (const imageUrl of data.images ?? []) {
      await client.query(
        `
        INSERT INTO lost_found_images (id, post_id, image_url, created_at)
        VALUES ($1,$2,$3,NOW())
        `,
        [crypto.randomUUID(), postId, imageUrl],
      );
    }

    await client.query("COMMIT");

    const result = await client.query(
      `
      SELECT
        p.id,
        p.type,
        p.category,
        p.title,
        p.description,
        p.time_hint,
        p.status,
        p.created_by_user_id,
        p.owner_username,
        p.is_found,
        p.created_at,
        p.updated_at,
        COALESCE(
          json_agg(i.image_url ORDER BY i.created_at) FILTER (WHERE i.id IS NOT NULL),
          '[]'::json
        ) AS images
      FROM lost_found_posts p
      LEFT JOIN lost_found_images i
        ON i.post_id = p.id
      WHERE p.id = $1
      GROUP BY p.id
      `,
      [postId],
    );

    const row = result.rows[0];

    return res.status(201).json({
      id: row.id,
      type: row.type,
      category: row.category,
      title: row.title,
      description: row.description,
      timeHint: row.time_hint,
      status: row.status,
      ownerUserId: row.owner_user_id,
      ownerUsername: row.owner_username,
      isFound: row.is_found ?? false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      images: row.images ?? [],
    });
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("DB error in POST /lost-found/posts:", e);
    return res.status(503).json({ error: "Database unavailable." });
  } finally {
    client.release();
  }
});

app.get("/lost-found/posts/:id", async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT
        p.id,
        p.type,
        p.category,
        p.title,
        p.description,
        p.time_hint,
        p.status,
        p.created_by_user_id,
        p.owner_user_id,
        p.owner_username,
        p.is_found,
        p.created_at,
        p.updated_at,
        COALESCE(
          json_agg(DISTINCT i.image_url) FILTER (WHERE i.id IS NOT NULL),
          '[]'::json
        ) AS images
      FROM lost_found_posts p
      LEFT JOIN lost_found_images i
        ON i.post_id = p.id
      WHERE p.id = $1
      GROUP BY p.id
      `,
      [req.params.id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Not found" });
    }

    const chatResult = await pool.query(
      `
      SELECT id, sender_type, sender_label, message, created_at
      FROM lost_found_chats
      WHERE post_id = $1
      ORDER BY created_at ASC
      `,
      [req.params.id],
    );

    const row = rows[0];

    res.json({
      id: row.id,
      type: row.type,
      category: row.category,
      title: row.title,
      description: row.description,
      timeHint: row.time_hint,
      status: row.status,
      createdByUserId: row.created_by_user_id,
      ownerUserId: row.owner_user_id,
      ownerUsername: row.owner_username,
      isFound: row.is_found,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      images: row.images ?? [],
      chats: chatResult.rows.map((chat) => ({
        id: chat.id,
        senderType: chat.sender_type,
        senderLabel: chat.sender_label,
        message: chat.message,
        createdAt: chat.created_at,
      })),
    });
  } catch (e) {
    console.error("DB error in GET /lost-found/posts/:id:", e);
    res.status(503).json({ error: "Database unavailable." });
  }
});

app.post(
  "/lost-found/posts/:id/resolve",
  async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `
        UPDATE lost_found_posts
        SET status = 'resolved',
            is_found = true,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
        `,
        [req.params.id],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ ok: false, message: "Not found" });
      }

      const row = result.rows[0];

      res.json({
        id: row.id,
        type: row.type,
        category: row.category,
        title: row.title,
        description: row.description,
        timeHint: row.time_hint,
        status: row.status,
        createdByUserId: row.created_by_user_id,
        ownerUserId: row.owner_user_id,
        ownerUsername: row.owner_username,
        isFound: row.is_found,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    } catch (e) {
      console.error("DB error in POST /lost-found/posts/:id/resolve:", e);
      res.status(503).json({ error: "Database unavailable." });
    }
  },
);

app.delete("/lost-found/posts/:id", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `DELETE FROM lost_found_posts WHERE id = $1 RETURNING id`,
      [req.params.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Not found" });
    }

    res.status(204).send();
  } catch (e) {
    console.error("DB error in DELETE /lost-found/posts/:id", e);
    res.status(503).json({ error: "Database unavailable." });
  }
});

app.get("/lost-found/posts/:id/chats", async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT id, sender_type, sender_label, message, created_at
      FROM lost_found_chats
      WHERE post_id = $1
      ORDER BY created_at ASC
      `,
      [req.params.id],
    );

    res.json(
      rows.map((chat) => ({
        id: chat.id,
        senderType: chat.sender_type,
        senderLabel: chat.sender_label,
        message: chat.message,
        createdAt: chat.created_at,
      })),
    );
  } catch (e) {
    console.error("DB error in GET /lost-found/posts/:id/chats:", e);
    res.status(503).json({ error: "Database unavailable." });
  }
});

app.post("/lost-found/posts/:id/chats", async (req: Request, res: Response) => {
  const parsed = LostFoundChatInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  try {
    const postCheck = await pool.query(
      `SELECT id FROM lost_found_posts WHERE id = $1`,
      [req.params.id],
    );

    if (postCheck.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Post not found" });
    }

    const result = await pool.query(
      `
      INSERT INTO lost_found_chats (id, post_id, sender_type, sender_label, message, created_at)
      VALUES ($1,$2,$3,$4,$5,NOW())
      RETURNING id, sender_type, sender_label, message, created_at
      `,
      [
        crypto.randomUUID(),
        req.params.id,
        parsed.data.senderType,
        parsed.data.senderLabel ?? null,
        parsed.data.message,
      ],
    );

    res.status(201).json({
      id: result.rows[0].id,
      senderType: result.rows[0].sender_type,
      senderLabel: result.rows[0].sender_label,
      message: result.rows[0].message,
      createdAt: result.rows[0].created_at,
    });
  } catch (e) {
    console.error("DB error in POST /lost-found/posts/:id/chats:", e);
    res.status(503).json({ error: "Database unavailable." });
  }
});

app.get(
  "/lost-found/chat-threads/:userId",
  async (req: Request, res: Response) => {
    try {
      const userId = req.params.userId;

      const { rows } = await pool.query(
        `
      SELECT
        p.id AS post_id,
        p.title,
        p.owner_user_id,
        p.owner_username,
        MAX(c.created_at) AS last_message_at,
        (
          SELECT c2.message
          FROM lost_found_chats c2
          WHERE c2.post_id = p.id
          ORDER BY c2.created_at DESC
          LIMIT 1
        ) AS last_message
      FROM lost_found_posts p
      INNER JOIN lost_found_chats c
        ON c.post_id = p.id
      WHERE p.owner_user_id = $1
         OR EXISTS (
           SELECT 1
           FROM lost_found_chats c3
           WHERE c3.post_id = p.id
             AND c3.sender_label IS NOT NULL
         )
      GROUP BY p.id, p.title, p.owner_user_id, p.owner_username
      ORDER BY MAX(c.created_at) DESC
      `,
        [userId],
      );

      res.json(
        rows.map((row) => ({
          id: row.post_id,
          postId: row.post_id,
          title: row.title,
          preview: row.last_message ?? "No messages yet",
          lastMessageAt: row.last_message_at,
          ownerUserId: row.owner_user_id,
          ownerUsername: row.owner_username,
        })),
      );
    } catch (e) {
      console.error("DB error in GET /lost-found/chat-threads/:userId:", e);
      res.status(503).json({ error: "Database unavailable." });
    }
  },
);

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

// //
// // ✅ ADMIN IMPORT ENDPOINT (Upload calibrator JSON -> upsert zones)
// //
// // const ZoneSchema = z.object({
// //   id: z.string().min(1),
// //   name: z.string().min(1),
// //   type: z.string().min(1),
// //   polygon_geojson: z.any(),
// // });

// const ZoneImportSchema = z.object({
//   id: z.string().min(1),
//   name: z.string().min(1),
//   type: z.string().min(1),
//   polygon_geojson: z.any(),
//   details: z
//     .object({
//       display_name: z.string().optional().nullable(),
//       capacity: z.number().int().nonnegative().optional().nullable(),
//       description: z.string().optional().nullable(),
//       status_override: z.string().optional().nullable(),
//       area_group: z.string().optional().nullable(),
//       capacity_mode: z.string().optional().nullable(),
//     })
//     .optional()
//     .nullable(),
// });

// function normalizeGeoJson(input: any) {
//   if (input?.type === "Polygon") return input;
//   if (input?.geometry?.type === "Polygon") return input.geometry;
//   return input;
// }

// // function normalizeGeoJson(input: any) {
// //   if (input?.type === "Polygon") return input;
// //   if (input?.geometry?.type === "Polygon") return input.geometry;
// //   return input;
// // }

// // app.post("/admin/zones/import", async (req: Request, res: Response) => {
// //   try {
// //     const body = req.body;
// //     const zonesRaw = Array.isArray(body) ? body : body?.zones;

// //     if (!Array.isArray(zonesRaw)) {
// //       return res.status(400).json({
// //         ok: false,
// //         message: "Expected JSON array or { zones: [...] }",
// //       });
// //     }

// //     const parsed = zonesRaw.map((z) => ZoneSchema.parse(z));

// //     let client;
// //     try {
// //       client = await pool.connect();
// //     } catch (dbErr) {
// //       console.error("DB error in POST /admin/zones/import:", dbErr);
// //       return res.status(503).json({
// //         ok: false,
// //         message: "Database unavailable. Check DATABASE_URL in apps/api/.env",
// //       });
// //     }

// //     try {
// //       await client.query("BEGIN");

// //       for (const z of parsed) {
// //         const polygon = normalizeGeoJson(z.polygon_geojson);

// //         if (
// //           !polygon ||
// //           polygon.type !== "Polygon" ||
// //           !Array.isArray(polygon.coordinates)
// //         ) {
// //           throw new Error(
// //             `Zone ${z.id} invalid polygon_geojson (must be GeoJSON Polygon)`,
// //           );
// //         }

// //         await client.query(
// //           `
// //           INSERT INTO zones (id, name, type, polygon_geojson)
// //           VALUES ($1, $2, $3, $4::jsonb)
// //           ON CONFLICT (id)
// //           DO UPDATE SET
// //             name = EXCLUDED.name,
// //             type = EXCLUDED.type,
// //             polygon_geojson = EXCLUDED.polygon_geojson
// //           `,
// //           [z.id, z.name, z.type, JSON.stringify(polygon)],
// //         );
// //       }

// //       await client.query("COMMIT");
// //     } catch (e) {
// //       await client.query("ROLLBACK");
// //       throw e;
// //     } finally {
// //       client.release();
// //     }

// //     res.json({ ok: true, imported: parsed.length });
// //   } catch (e: any) {
// //     if (
// //       e?.code === "28P01" ||
// //       e?.message?.includes("password authentication")
// //     ) {
// //       return res.status(503).json({
// //         ok: false,
// //         message: "Database unavailable. Check DATABASE_URL in apps/api/.env",
// //       });
// //     }
// //     res.status(400).json({ ok: false, message: e?.message ?? "Import failed" });
// //   }
// // });

// app.post("/admin/zones/import", async (req: Request, res: Response) => {
//   try {
//     const body = req.body;
//     const zonesRaw = Array.isArray(body) ? body : body?.zones;

//     if (!Array.isArray(zonesRaw)) {
//       return res.status(400).json({
//         ok: false,
//         message: "Expected JSON array or { zones: [...] }",
//       });
//     }

//     const parsed = zonesRaw.map((z) => ZoneImportSchema.parse(z));

//     let client;
//     try {
//       client = await pool.connect();
//     } catch (dbErr) {
//       console.error("DB error in POST /admin/zones/import:", dbErr);
//       return res.status(503).json({
//         ok: false,
//         message: "Database unavailable. Check DATABASE_URL in apps/api/.env",
//       });
//     }

//     try {
//       await client.query("BEGIN");

//       for (const z of parsed) {
//         const polygon = normalizeGeoJson(z.polygon_geojson);

//         if (
//           !polygon ||
//           polygon.type !== "Polygon" ||
//           !Array.isArray(polygon.coordinates)
//         ) {
//           throw new Error(
//             `Zone ${z.id} invalid polygon_geojson (must be GeoJSON Polygon)`,
//           );
//         }

//         await client.query(
//           `
//           INSERT INTO zones (id, name, type, polygon_geojson)
//           VALUES ($1, $2, $3, $4::jsonb)
//           ON CONFLICT (id)
//           DO UPDATE SET
//             name = EXCLUDED.name,
//             type = EXCLUDED.type,
//             polygon_geojson = EXCLUDED.polygon_geojson
//           `,
//           [z.id, z.name, z.type, JSON.stringify(polygon)],
//         );

//         const details = z.details ?? {};

//         await client.query(
//           `
//           INSERT INTO zone_details (
//             zone_id,
//             display_name,
//             capacity,
//             description,
//             status_override,
//             created_at,
//             updated_at,
//             area_group,
//             capacity_mode
//           )
//           VALUES (
//             $1,
//             $2,
//             $3,
//             $4,
//             $5,
//             NOW(),
//             NOW(),
//             $6,
//             $7
//           )
//           ON CONFLICT (zone_id)
//           DO UPDATE SET
//             display_name = EXCLUDED.display_name,
//             capacity = EXCLUDED.capacity,
//             description = EXCLUDED.description,
//             status_override = EXCLUDED.status_override,
//             updated_at = NOW(),
//             area_group = EXCLUDED.area_group,
//             capacity_mode = EXCLUDED.capacity_mode
//           `,
//           [
//             z.id,
//             details.display_name ?? z.name,
//             details.capacity ?? 0,
//             details.description ?? null,
//             details.status_override ?? null,
//             details.area_group ?? "common_space",
//             details.capacity_mode ?? "open",
//           ],
//         );
//       }

//       await client.query("COMMIT");
//     } catch (e) {
//       await client.query("ROLLBACK");
//       throw e;
//     } finally {
//       client.release();
//     }

//     return res.json({
//       ok: true,
//       imported: parsed.length,
//     });
//   } catch (e: any) {
//     if (
//       e?.code === "28P01" ||
//       e?.message?.includes("password authentication")
//     ) {
//       return res.status(503).json({
//         ok: false,
//         message: "Database unavailable. Check DATABASE_URL in apps/api/.env",

//
// ✅ ADMIN IMPORT ENDPOINT (Upload calibrator JSON -> upsert zones + zone_details)
//

const ZoneImportSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  polygon_geojson: z.any(),
  details: z
    .object({
      display_name: z.string().optional().nullable(),
      capacity: z.number().int().nonnegative().optional().nullable(),
      description: z.string().optional().nullable(),
      status_override: z.string().optional().nullable(),
      area_group: z.string().optional().nullable(),
      capacity_mode: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
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

    const parsed = zonesRaw.map((z) => ZoneImportSchema.parse(z));

    const parsedIds = parsed.map((z) => z.id);
    const duplicateIdsInPayload = parsedIds.filter(
      (id, index) => parsedIds.indexOf(id) !== index,
    );

    if (duplicateIdsInPayload.length > 0) {
      return res.status(400).json({
        ok: false,
        message: `Duplicate zone id(s) found in import payload: ${[
          ...new Set(duplicateIdsInPayload),
        ].join(", ")}`,
      });
    }

    const client = await pool.connect();

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

        const details = z.details ?? {};

        await client.query(
          `
          INSERT INTO zone_details (
            zone_id,
            display_name,
            capacity,
            description,
            status_override,
            created_at,
            updated_at,
            area_group,
            capacity_mode
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            NOW(),
            NOW(),
            $6,
            $7
          )
          ON CONFLICT (zone_id)
          DO UPDATE SET
            display_name = EXCLUDED.display_name,
            capacity = EXCLUDED.capacity,
            description = EXCLUDED.description,
            status_override = EXCLUDED.status_override,
            updated_at = NOW(),
            area_group = EXCLUDED.area_group,
            capacity_mode = EXCLUDED.capacity_mode
          `,
          [
            z.id,
            details.display_name ?? z.name,
            details.capacity ?? 0,
            details.description ?? null,
            details.status_override ?? null,
            details.area_group ?? "common_space",
            details.capacity_mode ?? "open",
          ],
        );
      }

      await client.query("COMMIT");

      return res.json({
        ok: true,
        imported: parsed.length,
      });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (e: any) {
    console.error("DB error in POST /admin/zones/import:", e);

    if (
      e?.code === "28P01" ||
      e?.message?.includes("password authentication")
    ) {
      return res.status(503).json({
        ok: false,
        message: "Database unavailable. Check DATABASE_URL in apps/api/.env",
      });
    }

    return res.status(400).json({
      ok: false,
      message: e?.message ?? "Import failed",
    });
  }
});

app.get("/admin/dashboard/summary", async (_req: Request, res: Response) => {
  try {
    const [
      zonesResult,
      occupancyResult,
      lostFoundResult,
      usersResult,
      complaintsResult,
    ] = await Promise.all([
      pool.query(`
          SELECT COUNT(*)::int AS total_buildings
          FROM zones
        `),
      pool.query(`
          SELECT
            COUNT(*) FILTER (
              WHERE COALESCE(d.capacity, 0) > 0
              AND COALESCE(l.pings_last_60s, 0) >= (COALESCE(d.capacity, 0) * 0.9)
            )::int AS overcrowded_buildings,
            COUNT(*) FILTER (
              WHERE COALESCE(d.capacity, 0) > 0
              AND COALESCE(l.pings_last_60s, 0) >= (COALESCE(d.capacity, 0) * 0.8)
              AND COALESCE(l.pings_last_60s, 0) < (COALESCE(d.capacity, 0) * 0.9)
            )::int AS warning_buildings
          FROM zones z
          LEFT JOIN zone_details d ON d.zone_id = z.id
          LEFT JOIN (
            SELECT
              matched_zone_id,
              COUNT(*)::int AS pings_last_60s
            FROM location_events
            WHERE matched_zone_id IS NOT NULL
              AND event_type = 'PING'
              AND created_at > NOW() - INTERVAL '60 seconds'
            GROUP BY matched_zone_id
          ) l ON l.matched_zone_id = z.id
        `),
      pool.query(`
          SELECT
            COUNT(*)::int AS total_posts,
            COUNT(*) FILTER (WHERE type = 'lost')::int AS lost_posts,
            COUNT(*) FILTER (WHERE type = 'found')::int AS found_posts,
            COUNT(*) FILTER (
              WHERE created_at >= date_trunc('day', NOW())
            )::int AS reports_today
          FROM lost_found_posts
        `),
      pool.query(`
          SELECT COUNT(*)::int AS total_users
          FROM users
        `),
      pool.query(`
          SELECT
            COUNT(*)::int AS total_complaints,
            COUNT(*) FILTER (WHERE status IN ('NEW', 'OPEN', 'PENDING', 'NEED_MORE_INFO'))::int AS active_complaints
          FROM complaint_cases
        `),
    ]);

    const summary = {
      totalBuildings: zonesResult.rows[0]?.total_buildings ?? 0,
      overcrowdedBuildings: occupancyResult.rows[0]?.overcrowded_buildings ?? 0,
      warningBuildings: occupancyResult.rows[0]?.warning_buildings ?? 0,
      totalLostFoundPosts: lostFoundResult.rows[0]?.total_posts ?? 0,
      lostPosts: lostFoundResult.rows[0]?.lost_posts ?? 0,
      foundPosts: lostFoundResult.rows[0]?.found_posts ?? 0,
      lostItemReportsToday: lostFoundResult.rows[0]?.reports_today ?? 0,
      totalUsers: usersResult.rows[0]?.total_users ?? 0,
      totalComplaints: complaintsResult.rows[0]?.total_complaints ?? 0,
      activeComplaints: complaintsResult.rows[0]?.active_complaints ?? 0,
    };

    return res.json(summary);
  } catch (e) {
    console.error("DB error in GET /admin/dashboard/summary:", e);
    return res.status(503).json({
      error: "Database unavailable.",
    });
  }
});

app.get("/admin/zones/check-id/:id", async (req: Request, res: Response) => {
  try {
    const zoneId = String(req.params.id || "").trim();

    if (!zoneId) {
      return res.status(400).json({
        ok: false,
        message: "Zone ID is required.",
      });
    }

    const { rows } = await pool.query(
      `
      SELECT id, name
      FROM zones
      WHERE id = $1
      LIMIT 1
      `,
      [zoneId],
    );

    return res.json({
      ok: true,
      exists: rows.length > 0,
      zone: rows[0] ?? null,
    });
  } catch (e) {
    console.error("DB error in GET /admin/zones/check-id/:id:", e);
    return res.status(503).json({
      ok: false,
      message: "Database unavailable.",
    });
  }
});

app.patch("/admin/zones/:id/details", async (req: Request, res: Response) => {
  try {
    const zoneId = String(req.params.id || "").trim();

    const UpdateZoneDetailsSchema = z.object({
      area_group: z.string().min(1),
      capacity: z.number().int().nonnegative(),
      capacity_mode: z.string().min(1),
      description: z.string().nullable().optional(),
    });

    const parsed = UpdateZoneDetailsSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Invalid update payload.",
        error: parsed.error.flatten(),
      });
    }

    const existingZone = await pool.query(
      `
      SELECT id
      FROM zones
      WHERE id = $1
      LIMIT 1
      `,
      [zoneId],
    );

    if (existingZone.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "Zone not found.",
      });
    }

    const { area_group, capacity, capacity_mode, description } = parsed.data;

    const result = await pool.query(
      `
      INSERT INTO zone_details (
        zone_id,
        display_name,
        capacity,
        description,
        status_override,
        created_at,
        updated_at,
        area_group,
        capacity_mode
      )
      VALUES (
        $1,
        COALESCE((SELECT display_name FROM zone_details WHERE zone_id = $1), (SELECT name FROM zones WHERE id = $1)),
        $2,
        $3,
        NULL,
        NOW(),
        NOW(),
        $4,
        $5
      )
      ON CONFLICT (zone_id)
      DO UPDATE SET
        capacity = EXCLUDED.capacity,
        description = EXCLUDED.description,
        updated_at = NOW(),
        area_group = EXCLUDED.area_group,
        capacity_mode = EXCLUDED.capacity_mode
      RETURNING zone_id, display_name, capacity, description, area_group, capacity_mode
      `,
      [zoneId, capacity, description ?? "", area_group, capacity_mode],
    );

    return res.json({
      ok: true,
      details: result.rows[0],
    });
  } catch (e) {
    console.error("DB error in PATCH /admin/zones/:id/details:", e);
    return res.status(503).json({
      ok: false,
      message: "Database unavailable.",
    });
  }
});

app.delete("/admin/zones/:id", async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    const zoneId = String(req.params.id || "").trim();

    await client.query("BEGIN");

    const existingZone = await client.query(
      `
      SELECT id
      FROM zones
      WHERE id = $1
      LIMIT 1
      `,
      [zoneId],
    );

    if (existingZone.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        ok: false,
        message: "Zone not found.",
      });
    }

    await client.query(
      `
      DELETE FROM zone_details
      WHERE zone_id = $1
      `,
      [zoneId],
    );

    await client.query(
      `
      DELETE FROM zones
      WHERE id = $1
      `,
      [zoneId],
    );

    await client.query("COMMIT");

    return res.json({
      ok: true,
      deletedId: zoneId,
    });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("DB error in DELETE /admin/zones/:id:", e);
    return res.status(503).json({
      ok: false,
      message: "Database unavailable.",
    });
  } finally {
    client.release();
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
  attachmentIds: z.array(z.string().uuid()).optional().default([]),
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
    m.id,
    m.sender_type,
    m.sender_label,
    m.body,
    m.request_counseling,
    m.created_at,
    COALESCE(
      json_agg(
        json_build_object(
          'id', a.id,
          'originalName', a.original_name,
          'mimeType', a.mime_type,
          'sizeBytes', a.size_bytes,
          'fileUrl', '/uploads/complaints/' || a.storage_path
        )
      ) FILTER (WHERE a.id IS NOT NULL),
      '[]'::json
    ) AS attachments
  FROM complaint_messages m
  LEFT JOIN complaint_attachments a
    ON a.message_id = m.id
  WHERE m.complaint_id = $1
  GROUP BY m.id
  ORDER BY m.created_at ASC
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
    attachments: message.attachments ?? [],
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

app.post(
  "/api/public/cases/me/attachments",
  upload.single("file") as unknown as RequestHandler,
  async (req: Request, res: Response) => {
    try {
      const session = await getComplaintSession(req);

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const attachmentId = crypto.randomUUID();

      await pool.query(
        `
        INSERT INTO complaint_attachments (
          id,
          complaint_id,
          original_name,
          mime_type,
          size_bytes,
          storage_path,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `,
        [
          attachmentId,
          session.complaint_id,
          req.file.originalname,
          req.file.mimetype,
          req.file.size,
          req.file.filename,
        ],
      );

      return res.status(201).json({
        id: attachmentId,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        storagePath: req.file.filename,
        fileUrl: `/uploads/complaints/${req.file.filename}`,
      });
    } catch (error) {
      console.error("Upload complaint attachment failed:", error);
      return res.status(400).json({
        message:
          error instanceof Error
            ? error.message
            : "Could not upload attachment",
      });
    }
  },
);

// app.get(
//   "/api/public/cases/me/messages",
//   async (req: Request, res: Response) => {
//     try {
//       const session = await getComplaintSession(req);

//       const { rows } = await pool.query(
//         `
//       SELECT
//         id,
//         sender_type,
//         sender_label,
//         body,
//         request_counseling,
//         created_at
//       FROM complaint_messages
//       WHERE complaint_id = $1
//       ORDER BY created_at ASC
//       `,
//         [session.complaint_id],
//       );

//       return res.json(
//         rows.map((message) => ({
//           id: message.id,
//           senderType: message.sender_type,
//           senderLabel: message.sender_label,
//           body: message.body,
//           requestCounseling: message.request_counseling,
//           createdAt: message.created_at,
//         })),
//       );
//     } catch (error) {
//       return res.status(401).json({
//         message:
//           error instanceof Error ? error.message : "Could not load messages",
//       });
//     }
//   },
// );

app.get(
  "/api/public/cases/me/messages",
  async (req: Request, res: Response) => {
    try {
      const session = await getComplaintSession(req);

      const { rows } = await pool.query(
        `
        SELECT
          m.id,
          m.sender_type,
          m.sender_label,
          m.body,
          m.request_counseling,
          m.created_at,
          COALESCE(
            json_agg(
              json_build_object(
                'id', a.id,
                'originalName', a.original_name,
                'mimeType', a.mime_type,
                'sizeBytes', a.size_bytes,
                'fileUrl', '/uploads/complaints/' || a.storage_path
              )
            ) FILTER (WHERE a.id IS NOT NULL),
            '[]'::json
          ) AS attachments
        FROM complaint_messages m
        LEFT JOIN complaint_attachments a
          ON a.message_id = m.id
        WHERE m.complaint_id = $1
        GROUP BY m.id
        ORDER BY m.created_at ASC
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
          attachments: message.attachments ?? [],
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

// app.post(
//   "/api/public/cases/me/messages",
//   async (req: Request, res: Response) => {
//     try {
//       const session = await getComplaintSession(req);
//       const parsed = sendComplaintMessageSchema.parse(req.body);

//       await pool.query(
//         `
//       INSERT INTO complaint_messages (
//         id,
//         complaint_id,
//         sender_type,
//         sender_label,
//         body,
//         request_counseling,
//         created_at
//       )
//       VALUES ($1, $2, $3, $4, $5, $6, NOW())
//       `,
//         [
//           crypto.randomUUID(),
//           session.complaint_id,
//           "STUDENT",
//           "You",
//           parsed.body,
//           parsed.requestCounseling,
//         ],
//       );

//       await pool.query(
//         `
//       UPDATE complaint_cases
//       SET
//         status = CASE
//           WHEN $2 = true THEN 'NEED_MORE_INFO'
//           ELSE status
//         END,
//         updated_at = NOW()
//       WHERE id = $1
//       `,
//         [session.complaint_id, parsed.requestCounseling],
//       );

//       const complaint = await buildComplaintResponse(session.complaint_id);

//       return res.json({
//         complaint,
//         messages: complaint.messages,
//         challengeRequired: false,
//       });
//     } catch (error) {
//       console.error("Send complaint message failed:", error);
//       return res.status(400).json({
//         message:
//           error instanceof Error ? error.message : "Could not send message",
//       });
//     }
//   },
// );

app.post(
  "/api/public/cases/me/messages",
  async (req: Request, res: Response) => {
    try {
      const session = await getComplaintSession(req);
      const parsed = sendComplaintMessageSchema.parse(req.body);

      const insertedMessageId = crypto.randomUUID();

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
          insertedMessageId,
          session.complaint_id,
          "STUDENT",
          null,
          parsed.body,
          parsed.requestCounseling,
        ],
      );

      if (parsed.attachmentIds.length > 0) {
        await pool.query(
          `
          UPDATE complaint_attachments
          SET message_id = $1
          WHERE id = ANY($2::uuid[])
            AND complaint_id = $3
          `,
          [insertedMessageId, parsed.attachmentIds, session.complaint_id],
        );
      }

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

async function createComplaintAdminLog(input: {
  complaintId: string;
  actionType: string;
  actorUserId?: string | null;
  actorUsername?: string | null;
  actorEmail?: string | null;
  details?: Record<string, unknown>;
}) {
  await pool.query(
    `
    INSERT INTO complaint_admin_logs (
      id,
      complaint_id,
      action_type,
      actor_user_id,
      actor_username,
      actor_email,
      details_json,
      created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW())
    `,
    [
      crypto.randomUUID(),
      input.complaintId,
      input.actionType,
      input.actorUserId ?? null,
      input.actorUsername ?? null,
      input.actorEmail ?? null,
      JSON.stringify(input.details ?? {}),
    ],
  );
}

app.get("/admin/complaints", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT
        c.id,
        c.anon_id,
        c.title,
        c.category,
        c.description,
        c.severity,
        c.status,
        c.assigned_team,
        c.location_text,
        c.incident_at,
        c.people_involved,
        c.created_at,
        c.updated_at,
        COUNT(DISTINCT m.id)::int AS message_count,
        COUNT(DISTINCT s.session_token)::int AS active_session_count
      FROM complaint_cases c
      LEFT JOIN complaint_messages m
        ON m.complaint_id = c.id
      LEFT JOIN complaint_sessions s
        ON s.complaint_id = c.id
       AND s.expires_at > NOW()
      GROUP BY c.id
      ORDER BY c.created_at DESC
      `,
    );

    return res.json(
      rows.map((row) => ({
        id: row.id,
        anonId: row.anon_id,
        title: row.title,
        category: row.category,
        description: row.description,
        severity: row.severity,
        status: row.status,
        assignedTeam: row.assigned_team,
        locationText: row.location_text,
        incidentAt: row.incident_at,
        peopleInvolved: row.people_involved,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        messageCount: row.message_count,
        activeSessionCount: row.active_session_count,
      })),
    );
  } catch (e) {
    console.error("DB error in GET /admin/complaints:", e);
    return res.status(503).json({
      error: "Database unavailable.",
    });
  }
});

app.get("/admin/complaints/logs", async (req: Request, res: Response) => {
  try {
    const from = String(req.query.from ?? "").trim();
    const to = String(req.query.to ?? "").trim();

    const { rows } = await pool.query(
      `
      SELECT
        l.id,
        l.complaint_id,
        c.anon_id,
        c.title,
        l.action_type,
        l.actor_user_id,
        l.actor_username,
        l.actor_email,
        l.details_json,
        l.created_at
      FROM complaint_admin_logs l
      INNER JOIN complaint_cases c
        ON c.id = l.complaint_id
      WHERE ($1 = '' OR l.created_at >= $1::timestamptz)
        AND ($2 = '' OR l.created_at <= $2::timestamptz)
      ORDER BY l.created_at DESC
      LIMIT 500
      `,
      [from, to],
    );

    return res.json(
      rows.map((row) => ({
        id: row.id,
        complaintId: row.complaint_id,
        anonId: row.anon_id,
        title: row.title,
        actionType: row.action_type,
        actorUserId: row.actor_user_id,
        actorUsername: row.actor_username,
        actorEmail: row.actor_email,
        details: row.details_json,
        createdAt: row.created_at,
      })),
    );
  } catch (e) {
    console.error("DB error in GET /admin/complaints/logs:", e);
    return res.status(503).json({
      error: "Database unavailable.",
    });
  }
});

app.get("/admin/complaints/:id", async (req: Request, res: Response) => {
  try {
    const complaintId = req.params.id;

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
      return res.status(404).json({
        message: "Complaint not found",
      });
    }

    const sessionsResult = await pool.query(
      `
      SELECT
        session_token,
        expires_at
      FROM complaint_sessions
      WHERE complaint_id = $1
      ORDER BY expires_at DESC
      `,
      [complaintId],
    );

    const messagesResult = await pool.query(
      `
      SELECT
        m.id,
        m.sender_type,
        m.sender_label,
        m.body,
        m.request_counseling,
        m.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', a.id,
              'originalName', a.original_name,
              'mimeType', a.mime_type,
              'sizeBytes', a.size_bytes,
              'fileUrl', '/uploads/complaints/' || a.storage_path
            )
          ) FILTER (WHERE a.id IS NOT NULL),
          '[]'::json
        ) AS attachments
      FROM complaint_messages m
      LEFT JOIN complaint_attachments a
        ON a.message_id = m.id
      WHERE m.complaint_id = $1
      GROUP BY m.id
      ORDER BY m.created_at ASC
      `,
      [complaintId],
    );

    const row = complaintResult.rows[0];

    return res.json({
      id: row.id,
      anonId: row.anon_id,
      title: row.title,
      category: row.category,
      description: row.description,
      severity: row.severity,
      status: row.status,
      assignedTeam: row.assigned_team,
      locationText: row.location_text,
      incidentAt: row.incident_at,
      peopleInvolved: row.people_involved,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      sessions: sessionsResult.rows.map((session) => ({
        expiresAt: session.expires_at,
        isActive: new Date(session.expires_at).getTime() > Date.now(),
      })),
      messages: messagesResult.rows.map((message) => ({
        id: message.id,
        senderType: message.sender_type,
        senderLabel: message.sender_label,
        body: message.body,
        requestCounseling: message.request_counseling,
        createdAt: message.created_at,
        attachments: message.attachments ?? [],
      })),
    });
  } catch (e) {
    console.error("DB error in GET /admin/complaints/:id:", e);
    return res.status(503).json({
      error: "Database unavailable.",
    });
  }
});

app.patch(
  "/admin/complaints/:id/status",
  async (req: Request, res: Response) => {
    try {
      const complaintId = req.params.id;

      const UpdateComplaintStatusSchema = z.object({
        status: z.string().min(1),
        assignedTeam: z.string().nullable().optional(),
      });

      const parsed = UpdateComplaintStatusSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          message: "Invalid complaint update payload",
          error: parsed.error.flatten(),
        });
      }

      const result = await pool.query(
        `
      UPDATE complaint_cases
      SET
        status = $2,
        assigned_team = $3,
        updated_at = NOW()
      WHERE id = $1
      RETURNING
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
      `,
        [complaintId, parsed.data.status, parsed.data.assignedTeam ?? null],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Complaint not found",
        });
      }

      await createComplaintAdminLog({
        complaintId,
        actionType: "STATUS_UPDATED",
        actorUserId: String(req.headers["x-admin-user-id"] ?? ""),
        actorUsername: String(req.headers["x-admin-username"] ?? ""),
        actorEmail: String(req.headers["x-admin-email"] ?? ""),
        details: {
          newStatus: parsed.data.status,
          assignedTeam: parsed.data.assignedTeam ?? null,
        },
      });

      const row = result.rows[0];

      return res.json({
        id: row.id,
        anonId: row.anon_id,
        title: row.title,
        category: row.category,
        description: row.description,
        severity: row.severity,
        status: row.status,
        assignedTeam: row.assigned_team,
        locationText: row.location_text,
        incidentAt: row.incident_at,
        peopleInvolved: row.people_involved,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    } catch (e) {
      console.error("DB error in PATCH /admin/complaints/:id/status:", e);

      return res.status(503).json({
        error: "Database unavailable.",
      });
    }
  },
);

app.get(
  "/admin/complaints/:id/messages",
  async (req: Request, res: Response) => {
    try {
      const complaintId = req.params.id;

      const complaintCheck = await pool.query(
        `
      SELECT id
      FROM complaint_cases
      WHERE id = $1
      LIMIT 1
      `,
        [complaintId],
      );

      if (complaintCheck.rows.length === 0) {
        return res.status(404).json({
          message: "Complaint not found",
        });
      }

      const { rows } = await pool.query(
        `
      SELECT
        m.id,
        m.sender_type,
        m.sender_label,
        m.body,
        m.request_counseling,
        m.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', a.id,
              'originalName', a.original_name,
              'mimeType', a.mime_type,
              'sizeBytes', a.size_bytes,
              'fileUrl', '/uploads/complaints/' || a.storage_path
            )
          ) FILTER (WHERE a.id IS NOT NULL),
          '[]'::json
        ) AS attachments
      FROM complaint_messages m
      LEFT JOIN complaint_attachments a
        ON a.message_id = m.id
      WHERE m.complaint_id = $1
      GROUP BY m.id
      ORDER BY m.created_at ASC
      `,
        [complaintId],
      );

      return res.json(
        rows.map((message) => ({
          id: message.id,
          senderType: message.sender_type,
          senderLabel: message.sender_label,
          body: message.body,
          requestCounseling: message.request_counseling,
          createdAt: message.created_at,
          attachments: message.attachments ?? [],
        })),
      );
    } catch (e) {
      console.error("DB error in GET /admin/complaints/:id/messages:", e);
      return res.status(503).json({
        error: "Database unavailable.",
      });
    }
  },
);

const adminSendComplaintMessageSchema = z.object({
  body: z.string().min(1),
  senderLabel: z.string().optional().nullable(),
  requestCounseling: z.boolean().optional().default(false),
});

app.post(
  "/admin/complaints/:id/messages",
  async (req: Request, res: Response) => {
    try {
      const complaintId = req.params.id;
      const parsed = adminSendComplaintMessageSchema.parse(req.body);

      const complaintCheck = await pool.query(
        `
        SELECT id
        FROM complaint_cases
        WHERE id = $1
        LIMIT 1
        `,
        [complaintId],
      );

      if (complaintCheck.rows.length === 0) {
        return res.status(404).json({
          message: "Complaint not found",
        });
      }

      const insertedId = crypto.randomUUID();

      const result = await pool.query(
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
        RETURNING
          id,
          sender_type,
          sender_label,
          body,
          request_counseling,
          created_at
        `,
        [
          insertedId,
          complaintId,
          "ADMIN",
          parsed.senderLabel ?? "Support Team",
          parsed.body,
          parsed.requestCounseling,
        ],
      );

      await createComplaintAdminLog({
        complaintId,
        actionType: "CHAT_SENT",
        actorUserId: String(req.headers["x-admin-user-id"] ?? ""),
        actorUsername: String(req.headers["x-admin-username"] ?? ""),
        actorEmail: String(req.headers["x-admin-email"] ?? ""),
        details: {
          messageId: insertedId,
          senderLabel: parsed.senderLabel ?? "Support Team",
        },
      });

      const row = result.rows[0];

      return res.status(201).json({
        id: row.id,
        senderType: row.sender_type,
        senderLabel: row.sender_label,
        body: row.body,
        requestCounseling: row.request_counseling,
        createdAt: row.created_at,
        attachments: [],
      });
    } catch (e: any) {
      console.error("DB error in POST /admin/complaints/:id/messages:", e);
      return res.status(400).json({
        message: e?.message ?? "Could not send message",
      });
    }
  },
);

app.post(
  "/admin/complaints/:id/messages",
  async (req: Request, res: Response) => {
    try {
      const complaintId = req.params.id;
      const parsed = adminSendComplaintMessageSchema.parse(req.body);

      const complaintCheck = await pool.query(
        `
      SELECT id
      FROM complaint_cases
      WHERE id = $1
      LIMIT 1
      `,
        [complaintId],
      );

      if (complaintCheck.rows.length === 0) {
        return res.status(404).json({
          message: "Complaint not found",
        });
      }

      const insertedId = crypto.randomUUID();

      const result = await pool.query(
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
      RETURNING
        id,
        sender_type,
        sender_label,
        body,
        request_counseling,
        created_at
      `,
        [
          insertedId,
          complaintId,
          "ADMIN",
          parsed.senderLabel ?? "Support Team",
          parsed.body,
          parsed.requestCounseling,
        ],
      );

      await createComplaintAdminLog({
        complaintId,
        actionType: "CHAT_SENT",
        actorUserId: String(req.headers["x-admin-user-id"] ?? ""),
        actorUsername: String(req.headers["x-admin-username"] ?? ""),
        actorEmail: String(req.headers["x-admin-email"] ?? ""),
        details: {
          messageId: insertedId,
          senderLabel: parsed.senderLabel ?? "Support Team",
        },
      });

      const row = result.rows[0];

      return res.status(201).json({
        id: row.id,
        senderType: row.sender_type,
        senderLabel: row.sender_label,
        body: row.body,
        requestCounseling: row.request_counseling,
        createdAt: row.created_at,
        attachments: [],
      });
    } catch (e: any) {
      console.error("DB error in POST /admin/complaints/:id/messages:", e);
      return res.status(400).json({
        message: e?.message ?? "Could not send message",
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
