CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE "ComplaintCategory" AS ENUM (
  'RAGGING',
  'HARASSMENT',
  'MENTAL_HEALTH',
  'DISCRIMINATION',
  'LECTURER_BEHAVIOR',
  'OTHER'
);

CREATE TYPE "ComplaintSeverity" AS ENUM ('LOW', 'MED', 'HIGH', 'CRITICAL');
CREATE TYPE "ComplaintStatus" AS ENUM (
  'NEW',
  'IN_REVIEW',
  'NEED_MORE_INFO',
  'ACTION_TAKEN',
  'CLOSED'
);
CREATE TYPE "MessageSenderType" AS ENUM ('STUDENT', 'STAFF', 'COUNSELOR');
CREATE TYPE "AssignmentTeam" AS ENUM ('GRIEVANCE', 'DISCIPLINE', 'COUNSELING');
CREATE TYPE "StaffRole" AS ENUM ('GRIEVANCE', 'DISCIPLINE', 'COUNSELOR', 'SUPER_ADMIN');
CREATE TYPE "AttachmentScanStatus" AS ENUM ('PENDING', 'CLEAN', 'FLAGGED');

CREATE TABLE "cases" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "anonId" TEXT NOT NULL UNIQUE,
  "secretHash" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" "ComplaintCategory" NOT NULL,
  "description" TEXT NOT NULL,
  "severity" "ComplaintSeverity" NOT NULL,
  "status" "ComplaintStatus" NOT NULL DEFAULT 'NEW',
  "locationPoint" geography(Point, 4326),
  "locationText" TEXT,
  "incidentAt" TIMESTAMPTZ,
  "peopleInvolved" TEXT,
  "counselingRequested" BOOLEAN NOT NULL DEFAULT FALSE,
  "identityDisclosed" BOOLEAN NOT NULL DEFAULT FALSE,
  "captchaRequired" BOOLEAN NOT NULL DEFAULT FALSE,
  "optionalContactInfo" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "staff_users" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "role" "StaffRole" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "messages" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "caseId" UUID NOT NULL REFERENCES "cases" ("id") ON DELETE CASCADE,
  "senderType" "MessageSenderType" NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "attachments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "caseId" UUID NOT NULL REFERENCES "cases" ("id") ON DELETE CASCADE,
  "messageId" UUID REFERENCES "messages" ("id") ON DELETE SET NULL,
  "storageKey" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "originalName" TEXT NOT NULL,
  "scanStatus" "AttachmentScanStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "assignments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "caseId" UUID NOT NULL REFERENCES "cases" ("id") ON DELETE CASCADE,
  "assignedToUserId" UUID NOT NULL REFERENCES "staff_users" ("id") ON DELETE CASCADE,
  "assignedTeam" "AssignmentTeam" NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "audit_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "actorUserId" UUID REFERENCES "staff_users" ("id") ON DELETE SET NULL,
  "action" TEXT NOT NULL,
  "caseId" UUID REFERENCES "cases" ("id") ON DELETE SET NULL,
  "meta" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "identity_disclosures" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "caseId" UUID NOT NULL REFERENCES "cases" ("id") ON DELETE CASCADE,
  "name" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "internal_notes" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "caseId" UUID NOT NULL REFERENCES "cases" ("id") ON DELETE CASCADE,
  "authorUserId" UUID NOT NULL REFERENCES "staff_users" ("id") ON DELETE CASCADE,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "cases_status_idx" ON "cases" ("status");
CREATE INDEX "cases_category_idx" ON "cases" ("category");
CREATE INDEX "cases_severity_idx" ON "cases" ("severity");
CREATE INDEX "audit_logs_case_idx" ON "audit_logs" ("caseId");
