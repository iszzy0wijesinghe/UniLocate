/** @format */

import { useComplaintSessionStore } from "./state/useComplaintSessionStore";
import { API_BASE_URL } from "../../services/api/baseUrl";

import type {
  AttachmentDraft,
  ComplaintCase,
  ComplaintCategory,
  ComplaintMessage,
  ComplaintSeverity,
  ComplaintStatus,
  ComplaintSummary,
  CreateComplaintInput,
  CreateComplaintResponse,
  IdentityDisclosureInput,
  ReconnectComplaintInput,
  SendMessageInput,
  StoredComplaintSession,
  UploadComplaintAttachmentResponse,
} from "./types/complaints";

export const complaintCategories: Array<{
  value: ComplaintCategory;
  label: string;
  helper: string;
}> = [
  {
    value: "ragging",
    label: "Ragging",
    helper: "Hostel or campus intimidation",
  },
  {
    value: "harassment",
    label: "Harassment",
    helper: "Threats or repeated harm",
  },
  {
    value: "mental_health",
    label: "Mental health",
    helper: "Support and crisis concerns",
  },
  {
    value: "discrimination",
    label: "Discrimination",
    helper: "Bias or exclusion",
  },
  {
    value: "lecturer_behavior",
    label: "Lecturer behavior",
    helper: "Harmful or unprofessional conduct",
  },
  {
    value: "other",
    label: "Other",
    helper: "Anything else affecting safety",
  },
];

async function request<T>(
  path: string,
  options?: RequestInit,
  token?: string,
): Promise<T> {
  const isFormData = options?.body instanceof FormData;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

function mapToSummary(complaint: ComplaintCase): ComplaintSummary {
  return {
    id: complaint.id,
    anonId: complaint.anonId,
    title: complaint.title,
    category: complaint.category,
    description: complaint.description,
    severity: complaint.severity,
    status: complaint.status,
    assignedTeam: complaint.assignedTeam,
    createdAt: complaint.createdAt,
    updatedAt: complaint.updatedAt,
  };
}

async function persistSession(
  complaint: ComplaintCase,
  sessionToken: string,
  expiresAt: string,
): Promise<StoredComplaintSession> {
  const session: StoredComplaintSession = {
    caseId: complaint.id,
    anonId: complaint.anonId,
    sessionToken,
    expiresAt,
    title: complaint.title,
    severity: complaint.severity,
    status: complaint.status,
    updatedAt: complaint.updatedAt,
  };

  await useComplaintSessionStore.getState().upsertSession(session);
  return session;
}

function getSession(caseId: string) {
  const session = useComplaintSessionStore
    .getState()
    .sessions.find((entry) => entry.caseId === caseId);

  if (!session) {
    throw new Error(
      "This case is not connected on this device. Reconnect with your Anonymous ID and secret.",
    );
  }

  return session;
}

export function getCategoryLabel(category: ComplaintCategory) {
  return (
    complaintCategories.find((option) => option.value === category)?.label ??
    "Complaint"
  );
}

export function formatComplaintDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function getStatusTone(status: ComplaintStatus) {
  if (status === "NEED_MORE_INFO") {
    return "accent" as const;
  }
  if (status === "ACTION_TAKEN" || status === "CLOSED") {
    return "soft" as const;
  }
  return "neutral" as const;
}

export function getSeverityTone(severity: ComplaintSeverity) {
  if (severity === "CRITICAL") {
    return "critical" as const;
  }
  if (severity === "HIGH") {
    return "accent" as const;
  }
  return "neutral" as const;
}

export async function createComplaint(
  input: CreateComplaintInput,
): Promise<CreateComplaintResponse> {
  const payload = {
    ...input,
    attachments: input.attachments.map((attachment) => ({
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
    })),
  };

  const result = await request<CreateComplaintResponse>("/api/public/cases", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  await persistSession(result.complaint, result.sessionToken, result.expiresAt);
  return result;
}

export async function reconnectComplaint(input: ReconnectComplaintInput) {
  const result = await request<{
    sessionToken: string;
    expiresAt: string;
    complaint: ComplaintCase;
  }>("/api/public/cases/reconnect", {
    method: "POST",
    body: JSON.stringify(input),
  });

  await persistSession(result.complaint, result.sessionToken, result.expiresAt);
  return result;
}

export async function fetchStoredComplaints() {
  const sessions = useComplaintSessionStore.getState().sessions;

  const cases = await Promise.all(
    sessions.map(async (session) => {
      try {
        const complaint = await request<ComplaintCase>(
          "/api/public/cases/me",
          { method: "GET" },
          session.sessionToken,
        );
        await persistSession(
          complaint,
          session.sessionToken,
          session.expiresAt,
        );
        return mapToSummary(complaint);
      } catch {
        return {
          id: session.caseId,
          anonId: session.anonId,
          title: session.title ?? "Anonymous complaint",
          category: "other" as const,
          description: "Reconnect to refresh this case on the device.",
          severity: session.severity ?? "LOW",
          status: session.status ?? "NEW",
          assignedTeam: undefined,
          createdAt: session.updatedAt ?? new Date().toISOString(),
          updatedAt: session.updatedAt ?? new Date().toISOString(),
        };
      }
    }),
  );

  return cases.sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

export async function fetchComplaintById(caseId: string) {
  const session = getSession(caseId);
  const complaint = await request<ComplaintCase>(
    "/api/public/cases/me",
    { method: "GET" },
    session.sessionToken,
  );
  await persistSession(complaint, session.sessionToken, session.expiresAt);
  return complaint;
}

export async function fetchComplaintMessages(
  caseId: string,
): Promise<ComplaintMessage[]> {
  const session = getSession(caseId);
  return request<ComplaintMessage[]>(
    "/api/public/cases/me/messages",
    { method: "GET" },
    session.sessionToken,
  );
}

export async function uploadComplaintAttachment(
  caseId: string,
  attachment: AttachmentDraft,
): Promise<UploadComplaintAttachmentResponse> {
  const session = getSession(caseId);

  if (!attachment.uri) {
    throw new Error("Selected attachment is missing file URI");
  }

  const formData = new FormData();

  formData.append("file", {
    uri: attachment.uri,
    name: attachment.originalName,
    type: attachment.mimeType || "application/octet-stream",
  } as any);

  return request<UploadComplaintAttachmentResponse>(
    "/api/public/cases/me/attachments",
    {
      method: "POST",
      body: formData,
    },
    session.sessionToken,
  );
}

export async function sendChatMessage(caseId: string, payload: SendMessageInput) {
  const session = getSession(caseId);

  return request<{
    complaint: ComplaintCase;
    messages: ComplaintMessage[];
    challengeRequired: boolean;
  }>(
    "/api/public/cases/me/messages",
    {
      method: "POST",
      body: JSON.stringify({
        body: payload.body,
        requestCounseling: payload.requestCounseling,
        attachmentIds: payload.attachmentIds ?? [],
      }),
    },
    session.sessionToken,
  );
}

export async function requestCounseling(caseId: string) {
  return sendChatMessage(caseId, {
    body: "I am requesting anonymous counseling follow-up.",
    requestCounseling: true,
    attachmentIds: [],
  });
}

export async function submitIdentityDisclosure(
  caseId: string,
  payload: IdentityDisclosureInput,
) {
  const session = getSession(caseId);
  return request<{ complaint: ComplaintCase }>(
    "/api/public/cases/me/identity-disclosure",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    session.sessionToken,
  );
}

export function classifySeverity(text: string): ComplaintSeverity {
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