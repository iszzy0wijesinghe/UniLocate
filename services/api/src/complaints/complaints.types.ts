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

export type AuditAction =
  | 'view'
  | 'status_change'
  | 'assignment'
  | 'message'
  | 'download_attachment'
  | 'internal_note'
  | 'user_create'
  | 'user_update'
  | 'user_delete';

export type MessageSenderType = 'STUDENT' | 'STAFF' | 'COUNSELOR';

export type AttachmentInput = {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
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

export type ReconnectInput = {
  anonId: string;
  secret: string;
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

export type StaffLoginInput = {
  email: string;
  password: string;
};

export type AdminCaseFilters = {
  status?: ComplaintStatus;
  category?: ComplaintCategory;
  severity?: ComplaintSeverity;
  assignedTeam?: AssignmentTeam;
  from?: string;
  to?: string;
};

export type AuditFilters = {
  caseId?: string;
  actorUserId?: string;
  action?: AuditAction;
  from?: string;
  to?: string;
};

export type StaffUserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  role: StaffRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CaseRecord = {
  id: string;
  anonId: string;
  secretHash: string;
  title: string;
  category: ComplaintCategory;
  description: string;
  severity: ComplaintSeverity;
  status: ComplaintStatus;
  location?: { latitude: number; longitude: number };
  locationText?: string;
  incidentAt?: string;
  peopleInvolved?: string;
  createdAt: string;
  updatedAt: string;
  counselingRequested: boolean;
  identityDisclosed: boolean;
  captchaRequired: boolean;
};

export type MessageRecord = {
  id: string;
  caseId: string;
  senderType: MessageSenderType;
  senderLabel: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type AttachmentRecord = {
  id: string;
  caseId: string;
  messageId?: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  originalName: string;
  scanStatus: 'pending' | 'clean' | 'flagged';
  createdAt: string;
  updatedAt: string;
};

export type AssignmentRecord = {
  id: string;
  caseId: string;
  assignedToUserId: string;
  assignedTeam: AssignmentTeam;
  createdAt: string;
  updatedAt: string;
};

export type AuditLogRecord = {
  id: string;
  actorUserId?: string;
  action: AuditAction;
  caseId?: string;
  meta: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
};

export type IdentityDisclosureRecord = {
  id: string;
  caseId: string;
  name?: string;
  phone?: string;
  email?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type InternalNoteRecord = {
  id: string;
  caseId: string;
  authorUserId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type TimelineItem = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
};

export type RealtimeEventName =
  | 'case.message.created'
  | 'case.status.updated'
  | 'case.critical.alert'
  | 'case.assignment.updated';

export type RealtimeEvent = {
  type: RealtimeEventName;
  caseId: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type AttachmentDownload = {
  attachmentId: string;
  downloadUrl: string;
  expiresAt: string;
};

export type AdminCaseDetail = {
  case: CaseRecord;
  messages: Array<MessageRecord & { attachments: AttachmentRecord[] }>;
  attachments: AttachmentRecord[];
  assignments: AssignmentRecord[];
  auditLogs: AuditLogRecord[];
  internalNotes: InternalNoteRecord[];
  disclosures: IdentityDisclosureRecord[];
  timeline: TimelineItem[];
};
