export type ComplaintSummary = {
  id: string;
  anonId: string;
  title: string;
  category: string;
  description: string;
  severity: string;
  status: string;
  assignedTeam?: string | null;
  locationText?: string | null;
  incidentAt?: string | null;
  peopleInvolved?: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  activeSessionCount: number;
};

export type ComplaintAttachment = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  fileUrl: string;
};

export type ComplaintMessageAdmin = {
  id: string;
  senderType: string;
  senderLabel?: string | null;
  body: string;
  requestCounseling: boolean;
  createdAt: string;
  attachments: ComplaintAttachment[];
};

export type ComplaintSessionAdmin = {
  expiresAt: string;
  isActive: boolean;
};

export type ComplaintDetail = {
  id: string;
  anonId: string;
  title: string;
  category: string;
  description: string;
  severity: string;
  status: string;
  assignedTeam?: string | null;
  locationText?: string | null;
  incidentAt?: string | null;
  peopleInvolved?: string | null;
  createdAt: string;
  updatedAt: string;
  sessions: ComplaintSessionAdmin[];
  messages: ComplaintMessageAdmin[];
};