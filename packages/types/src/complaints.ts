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

export type StaffRole =
  | 'GRIEVANCE'
  | 'DISCIPLINE'
  | 'COUNSELOR'
  | 'SUPER_ADMIN';

export type AssignmentTeam = 'GRIEVANCE' | 'DISCIPLINE' | 'COUNSELING';

export type MessageSenderType = 'STUDENT' | 'STAFF' | 'COUNSELOR';

export type AttachmentInput = {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
};

export type ComplaintMessage = {
  id: string;
  caseId: string;
  senderType: MessageSenderType;
  senderLabel: string;
  body: string;
  createdAt: string;
  attachments: ComplaintAttachment[];
};

export type ComplaintAttachment = {
  id: string;
  caseId: string;
  messageId?: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  signedUrl?: string;
  scanStatus: 'pending' | 'clean' | 'flagged';
  createdAt: string;
};

export type ComplaintTimelineItem = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
};

export type ComplaintSummary = {
  id: string;
  anonId: string;
  title: string;
  category: ComplaintCategory;
  description: string;
  severity: ComplaintSeverity;
  status: ComplaintStatus;
  assignedTeam?: AssignmentTeam;
  createdAt: string;
  updatedAt: string;
};

export type ComplaintCase = ComplaintSummary & {
  locationText?: string;
  incidentAt?: string;
  peopleInvolved?: string;
  location?: { latitude: number; longitude: number };
  attachments: ComplaintAttachment[];
  timeline: ComplaintTimelineItem[];
  messages: ComplaintMessage[];
  counselingRequested: boolean;
  identityDisclosed: boolean;
  captchaRequired: boolean;
};

export type ComplaintReconnectResponse = {
  sessionToken: string;
  expiresAt: string;
  complaint: ComplaintCase;
};

export type CreateComplaintInput = {
  title: string;
  category: ComplaintCategory;
  description: string;
  locationText?: string;
  incidentAt?: string;
  peopleInvolved?: string;
  location?: { latitude: number; longitude: number };
  attachments?: AttachmentInput[];
  consent: boolean;
  challengeToken?: string;
};

export type CreateComplaintResponse = {
  anonId: string;
  secret: string;
  sessionToken: string;
  expiresAt: string;
  complaint: ComplaintCase;
  challengeRequired: boolean;
  emergencyResources: string[];
};

export type PublicMessageInput = {
  body: string;
  requestCounseling?: boolean;
  attachments?: AttachmentInput[];
};

export type IdentityDisclosureInput = {
  name?: string;
  phone?: string;
  email?: string;
  notes?: string;
};

export type AdminLoginResponse = {
  token: string;
  expiresAt: string;
  user: StaffUser;
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

export type AdminDashboardOverview = {
  totalCases: number;
  newCases: number;
  criticalCases: number;
  needMoreInfo: number;
  closedThisWeek: number;
  recentActivity: AuditLog[];
  criticalAlerts: ComplaintSummary[];
};
