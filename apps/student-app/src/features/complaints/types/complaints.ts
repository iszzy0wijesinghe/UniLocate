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

export type ComplaintAttachment = {
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

export type ComplaintTimelineItem = {
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
  location?: { latitude: number; longitude: number };
  counselingRequested: boolean;
  identityDisclosed: boolean;
  captchaRequired: boolean;
  assignedTeam?: AssignmentTeam;
  attachments: ComplaintAttachment[];
  messages: ComplaintMessage[];
  timeline: ComplaintTimelineItem[];
  createdAt: string;
  updatedAt: string;
};

export type ComplaintSummary = Pick<
  ComplaintCase,
  | 'id'
  | 'anonId'
  | 'title'
  | 'category'
  | 'description'
  | 'severity'
  | 'status'
  | 'assignedTeam'
  | 'createdAt'
  | 'updatedAt'
>;

export type AttachmentDraft = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uri?: string;
};

export type StoredComplaintSession = {
  caseId: string;
  anonId: string;
  sessionToken: string;
  expiresAt: string;
  title?: string;
  severity?: ComplaintSeverity;
  status?: ComplaintStatus;
  updatedAt?: string;
};

export type CreateComplaintInput = {
  title: string;
  category: ComplaintCategory;
  description: string;
  locationText?: string;
  incidentAt?: string;
  peopleInvolved?: string;
  attachments: AttachmentDraft[];
  consent: boolean;
};

export type CreateComplaintResponse = {
  anonId: string;
  secret: string;
  sessionToken: string;
  expiresAt: string;
  challengeRequired: boolean;
  emergencyResources: string[];
  complaint: ComplaintCase;
};

export type ReconnectComplaintInput = {
  anonId: string;
  secret: string;
};

export type IdentityDisclosureInput = {
  name?: string;
  phone?: string;
  email?: string;
  notes?: string;
};

export type SendMessageInput = {
  body: string;
  requestCounseling?: boolean;
  attachments?: AttachmentDraft[];
};
