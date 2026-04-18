/** @format */

import { API_BASE_URL } from "../../../services/api/baseUrl";
import type {
  CreateEduHubTextNoteInput,
  EduHubNote,
  UploadEduHubNoteInput,
} from "../types/eduhub";

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

export async function getEduHubNotes(input?: {
  uploadedByUserId?: string;
  search?: string;
}): Promise<EduHubNote[]> {
  const query = buildQuery({
    uploadedByUserId: input?.uploadedByUserId,
    search: input?.search,
  });

  const response = await fetch(`${API_BASE_URL}/eduhub/notes${query}`);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to fetch EduHub notes");
  }

  return (await response.json()) as EduHubNote[];
}

export async function getEduHubNoteById(noteId: string): Promise<EduHubNote> {
  const response = await fetch(`${API_BASE_URL}/eduhub/notes/${noteId}`);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to fetch EduHub note");
  }

  return (await response.json()) as EduHubNote;
}

export async function createEduHubTextNote(
  input: CreateEduHubTextNoteInput,
): Promise<EduHubNote> {
  const response = await fetch(`${API_BASE_URL}/eduhub/notes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    let message = "Failed to create note";

    try {
      const errorBody = await response.json();
      message = errorBody?.message || message;
    } catch {
      // ignore json parse failure
    }

    throw new Error(message);
  }

  return (await response.json()) as EduHubNote;
}

export async function uploadEduHubNote(
  input: UploadEduHubNoteInput,
): Promise<EduHubNote> {
  const formData = new FormData();

  formData.append("title", input.title);
  formData.append("module", input.module);
  formData.append("noteType", input.noteType);
  formData.append("uploadedByUserId", input.uploadedByUserId);
  formData.append("uploadedByUsername", input.uploadedByUsername);

  formData.append("file", {
    uri: input.file.uri,
    name: input.file.name,
    type: input.file.type,
  } as any);

  const response = await fetch(`${API_BASE_URL}/eduhub/notes/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let message = "Failed to upload note";

    try {
      const errorBody = await response.json();
      message = errorBody?.message || message;
    } catch {
      // ignore json parse failure
    }

    throw new Error(message);
  }

  return (await response.json()) as EduHubNote;
}

export async function deleteEduHubNote(noteId: string): Promise<{
  ok: boolean;
  deletedId: string;
}> {
  const response = await fetch(`${API_BASE_URL}/eduhub/notes/${noteId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    let message = "Failed to delete note";

    try {
      const errorBody = await response.json();
      message = errorBody?.message || message;
    } catch {
      // ignore json parse failure
    }

    throw new Error(message);
  }

  return (await response.json()) as { ok: boolean; deletedId: string };
}

export function getEduHubFileUrl(fileUrl?: string | null) {
  if (!fileUrl) return null;
  if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
    return fileUrl;
  }
  return `${API_BASE_URL}${fileUrl}`;
}