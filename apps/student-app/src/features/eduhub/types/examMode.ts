/** @format */

export type EduHubExamType =
  | "Mock Exam"
  | "Mid Exam"
  | "Spot Test"
  | "Practical Test"
  | "Viva"
  | "Presentation"
  | "Final Exam"
  | "Repeat Exam";

export interface EduHubExamEntry {
  id: string;
  semester: string;
  examType: EduHubExamType;
  moduleCode: string;
  moduleName: string;
  examDate: string;
  startTime: string;
  endTime: string;
  sessionNumber?: string | null;
  seatNumber?: string | null;
  venue?: string | null;
  notes?: string | null;
  uploadedByUserId: string;
  uploadedByUsername: string;
  createdAt: string;
  updatedAt: string;

  isUpcoming?: boolean;
  isOngoing?: boolean;
  isGraceVisible?: boolean;
  shouldAutoRemove?: boolean;
  removeAfterAt?: string | null;
}

export interface CreateEduHubExamEntryInput {
  semester: string;
  examType: EduHubExamType;
  moduleCode: string;
  moduleName: string;
  examDate: string;
  startTime: string;
  endTime: string;
  sessionNumber?: string | null;
  seatNumber?: string | null;
  venue?: string | null;
  notes?: string | null;
  uploadedByUserId: string;
  uploadedByUsername: string;
}