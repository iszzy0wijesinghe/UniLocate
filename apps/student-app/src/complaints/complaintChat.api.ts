/** @format */

import { API_BASE_URL } from "../../services/api/baseUrl";

export type ComplaintChatMessage = {
  id: string;
  senderType: string;
  senderLabel?: string;
  body: string;
  requestCounseling?: boolean;
  createdAt: string;
};

async function parseJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

export async function getComplaintMessages(sessionToken: string) {
  const res = await fetch(`${API_BASE_URL}/api/public/cases/me/messages`, {
    headers: {
      Authorization: `Bearer ${sessionToken}`,
    },
  });

  const data = await parseJson(res);

  if (!res.ok) {
    throw new Error(data?.message || "Failed to load complaint messages");
  }

  return data as ComplaintChatMessage[];
}

export async function sendComplaintMessage(
  sessionToken: string,
  input: {
    body: string;
    requestCounseling?: boolean;
    attachments?: {
      originalName: string;
      mimeType: string;
      sizeBytes: number;
    }[];
  },
) {
  const res = await fetch(`${API_BASE_URL}/api/public/cases/me/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({
      body: input.body,
      requestCounseling: input.requestCounseling ?? false,
      attachments: input.attachments ?? [],
    }),
  });

  const data = await parseJson(res);

  if (!res.ok) {
    throw new Error(data?.message || "Failed to send complaint message");
  }

  return data;
}