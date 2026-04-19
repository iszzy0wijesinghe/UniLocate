/** @format */

export type EduHubNoteType = "PDF" | "Image" | "Text";

export interface EduHubNote {
  id: string;
  title: string;
  module: string;
  noteType: EduHubNoteType;
  contentText?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  uploadedByUserId: string;
  uploadedByUsername: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEduHubTextNoteInput {
  title: string;
  module: string;
  noteType: "Text";
  contentText: string;
  uploadedByUserId: string;
  uploadedByUsername: string;
}

export interface UploadEduHubNoteInput {
  title: string;
  module: string;
  noteType: "PDF" | "Image";
  uploadedByUserId: string;
  uploadedByUsername: string;
  file: {
    uri: string;
    name: string;
    type: string;
  };
}