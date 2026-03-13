export type ComplaintCategory =
  | 'ragging'
  | 'harassment'
  | 'mental_health'
  | 'discrimination'
  | 'lecturer_behavior'
  | 'other';

export type ComplaintSeverity = 'LOW' | 'MED' | 'HIGH' | 'CRITICAL';
export type ComplaintStatus =
  | 'NEW'
  | 'IN_REVIEW'
  | 'NEED_MORE_INFO'
  | 'ACTION_TAKEN'
  | 'CLOSED';

export type AssignmentTeam = 'GRIEVANCE' | 'DISCIPLINE' | 'COUNSELING';
export type StaffRole = 'GRIEVANCE' | 'DISCIPLINE' | 'COUNSELOR' | 'SUPER_ADMIN';

export type ComplaintAttachment = {
  id: string;
  caseId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  scanStatus: 'pending' | 'clean' | 'flagged';
  createdAt: string;
  updatedAt: string;
};

export type ComplaintMessage = {
  id: string;
  caseId: string;
  senderType: 'STUDENT' | 'STAFF' | 'COUNSELOR';
  senderLabel: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  attachments: ComplaintAttachment[];
};

export type TimelineItem = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
};

export type ComplaintCase = {
  id: string;
  anonId: string;
  title: string;
  category: ComplaintCategory;
  description: string;
  severity: ComplaintSeverity;
  status: ComplaintStatus;
  locationText?: string;
  incidentAt?: string;
  peopleInvolved?: string;
  assignedTeam?: AssignmentTeam;
  counselingRequested: boolean;
  identityDisclosed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ComplaintCaseDetail = {
  case: ComplaintCase;
  messages: ComplaintMessage[];
  attachments: ComplaintAttachment[];
  assignments: Array<{
    id: string;
    caseId: string;
    assignedToUserId: string;
    assignedTeam: AssignmentTeam;
    createdAt: string;
    updatedAt: string;
  }>;
  internalNotes: Array<{
    id: string;
    caseId: string;
    authorUserId: string;
    body: string;
    createdAt: string;
    updatedAt: string;
  }>;
  auditLogs: AuditLog[];
  disclosures: Array<{
    id: string;
    caseId: string;
    name?: string;
    phone?: string;
    email?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
  }>;
  timeline: TimelineItem[];
};

export type StaffUser = {
  id: string;
  email: string;
  role: StaffRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AuditLog = {
  id: string;
  actorUserId?: string;
  action:
    | 'view'
    | 'status_change'
    | 'assignment'
    | 'message'
    | 'download_attachment'
    | 'internal_note'
    | 'user_create'
    | 'user_update'
    | 'user_delete';
  caseId?: string;
  meta: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
};

export type DashboardOverview = {
  totalCases: number;
  newCases: number;
  criticalCases: number;
  needMoreInfo: number;
  closedThisWeek: number;
  recentActivity: AuditLog[];
  criticalAlerts: ComplaintCase[];
};

export type AdminSession = {
  token: string;
  expiresAt: string;
  user: StaffUser;
};
