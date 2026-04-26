/** @format */

import { API_BASE_URL } from "../../../services/api/baseUrl";
import type {
  CreateEduHubExamEntryInput,
  EduHubExamEntry,
} from "../types/examMode";

function buildQuery(params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value && value.trim()) {
      searchParams.append(key, value.trim());
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export async function getEduHubExamEntries(input: {
  uploadedByUserId?: string;
  uploadedByUsername?: string;
  semester?: string;
  examType?: string;
}): Promise<EduHubExamEntry[]> {
  const query = buildQuery({
    uploadedByUserId: input.uploadedByUserId,
    uploadedByUsername: input.uploadedByUsername,
    semester: input.semester,
    examType: input.examType,
  });

  const response = await fetch(`${API_BASE_URL}/eduhub/exams${query}`);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to fetch exam entries");
  }

  return (await response.json()) as EduHubExamEntry[];
}

export async function getEduHubExamEntryById(input: {
  examId: string;
  uploadedByUserId?: string;
  uploadedByUsername?: string;
}): Promise<EduHubExamEntry> {
  const query = buildQuery({
    uploadedByUserId: input.uploadedByUserId,
    uploadedByUsername: input.uploadedByUsername,
  });

  const response = await fetch(
    `${API_BASE_URL}/eduhub/exams/${input.examId}${query}`,
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to fetch exam entry");
  }

  return (await response.json()) as EduHubExamEntry;
}

export async function createEduHubExamEntry(
  input: CreateEduHubExamEntryInput,
): Promise<EduHubExamEntry> {
  const response = await fetch(`${API_BASE_URL}/eduhub/exams`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    let message = "Failed to create exam entry";

    try {
      const errorBody = await response.json();
      message = errorBody?.message || message;
    } catch {
      // ignore
    }

    throw new Error(message);
  }

  return (await response.json()) as EduHubExamEntry;
}

export async function deleteEduHubExamEntry(input: {
  examId: string;
  uploadedByUserId?: string;
  uploadedByUsername?: string;
}): Promise<{
  ok: boolean;
  deletedId: string;
}> {
  const query = buildQuery({
    uploadedByUserId: input.uploadedByUserId,
    uploadedByUsername: input.uploadedByUsername,
  });

  const response = await fetch(
    `${API_BASE_URL}/eduhub/exams/${input.examId}${query}`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    let message = "Failed to delete exam entry";

    try {
      const errorBody = await response.json();
      message = errorBody?.message || message;
    } catch {
      // ignore
    }

    throw new Error(message);
  }

  return (await response.json()) as { ok: boolean; deletedId: string };
}