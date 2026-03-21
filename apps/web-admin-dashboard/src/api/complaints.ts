import type {
  AdminSession,
  AuditLog,
  ComplaintCase,
  ComplaintCaseDetail,
  ComplaintStatus,
  DashboardOverview,
  StaffRole,
  StaffUser,
} from '../lib/types';
import { useAuthStore } from '../store/useAuthStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().session?.token;
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    throw new Error('Cannot reach the API. Start `pnpm dev:api` or set VITE_API_BASE_URL.');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? 'Request failed');
  }

  return response.json() as Promise<T>;
}

export function login(email: string, password: string) {
  return apiRequest<AdminSession>('/api/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function fetchOverview() {
  return apiRequest<DashboardOverview>('/api/admin');
}

export function fetchCases(filters: Record<string, string | undefined>) {
  const query = new URLSearchParams(
    Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
  return apiRequest<ComplaintCase[]>(`/api/admin/cases?${query.toString()}`);
}

export function fetchCaseDetail(caseId: string) {
  return apiRequest<ComplaintCaseDetail>(`/api/admin/cases/${caseId}`);
}

export function updateCaseStatus(caseId: string, status: ComplaintStatus, reason: string) {
  return apiRequest<ComplaintCaseDetail>(`/api/admin/cases/${caseId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason }),
  });
}

export function assignCase(caseId: string, assignedToUserId: string, assignedTeam: string) {
  return apiRequest(`/api/admin/cases/${caseId}/assign`, {
    method: 'POST',
    body: JSON.stringify({ assignedToUserId, assignedTeam }),
  });
}

export function sendStaffMessage(caseId: string, body: string, senderType?: 'STAFF' | 'COUNSELOR') {
  return apiRequest(`/api/admin/cases/${caseId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ body, senderType }),
  });
}

export function addInternalNote(caseId: string, body: string) {
  return apiRequest(`/api/admin/cases/${caseId}/internal-notes`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

export function requestAttachmentDownload(caseId: string, attachmentId: string) {
  return apiRequest<{ attachmentId: string; downloadUrl: string; expiresAt: string }>(
    `/api/admin/cases/${caseId}/attachments/${attachmentId}/download`,
    { method: 'POST' },
  );
}

export function fetchUsers() {
  return apiRequest<StaffUser[]>('/api/admin/users');
}

export function createUser(payload: {
  email: string;
  password: string;
  role: StaffRole;
  isActive?: boolean;
}) {
  return apiRequest<StaffUser>('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateUser(
  userId: string,
  payload: Partial<{ email: string; password: string; role: StaffRole; isActive: boolean }>,
) {
  return apiRequest<StaffUser>(`/api/admin/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteUser(userId: string) {
  return apiRequest<{ success: boolean }>(`/api/admin/users/${userId}`, {
    method: 'DELETE',
  });
}

export function fetchAudit(filters: Record<string, string | undefined>) {
  const query = new URLSearchParams(
    Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
  return apiRequest<AuditLog[]>(`/api/admin/audit?${query.toString()}`);
}
