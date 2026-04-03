/** @format */

import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../../services/api/baseUrl";
export type LostFoundType = "lost" | "found";

export type ItemCategory = "ID Card" | "Wallet" | "Book" | "Device" | "Other";

export interface LostFoundPost {
  id: string;
  type: LostFoundType;
  category: ItemCategory;
  title: string;
  description?: string;
  timeHint?: string;
  images?: string[];
  createdAt: string;
  status: "open" | "resolved";
  ownerUserId?: string;
  ownerUsername?: string;
  isFound?: boolean;
}

const API_URL = API_BASE_URL;
const FETCH_TIMEOUT_MS = 15_000;
const localPostsStore: LostFoundPost[] = [];

async function fetchWithTimeout(
  url: string,
  opts: RequestInit & { timeout?: number } = {},
): Promise<Response> {
  const { timeout = FETCH_TIMEOUT_MS, ...fetchOpts } = opts;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...fetchOpts, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    if ((e as Error).name === "AbortError") {
      throw new Error(
        "Request timed out. Is the API running? Start it with: pnpm -C apps/api dev",
      );
    }
    throw e;
  }
}

export interface LostFoundPostSummary extends LostFoundPost {
  relativeTime: string;
}

function toSummary(post: LostFoundPost): LostFoundPostSummary {
  const created = new Date(post.createdAt);
  const relativeTime = created.toLocaleString();
  return { ...post, relativeTime };
}

function getLocalSummaries(): LostFoundPostSummary[] {
  return [...localPostsStore]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .map(toSummary);
}

function isNetworkFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("network request failed") ||
    message.includes("timed out") ||
    message.includes("aborted")
  );
}

async function getErrorDetails(res: Response): Promise<string> {
  try {
    const body = await res.text();
    if (!body) return `HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(body) as { message?: string; error?: string };
      if (parsed.message) return parsed.message;
      if (parsed.error) return parsed.error;
    } catch {
      // keep plain text body
    }
    return body;
  } catch {
    return `HTTP ${res.status}`;
  }
}

export function useLostFoundPosts() {
  const [posts, setPosts] = useState<LostFoundPostSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchWithTimeout(`${API_URL}/lost-found/posts`);
      if (!res.ok) {
        throw new Error(`Failed to load posts (${res.status})`);
      }
      const json = (await res.json()) as LostFoundPost[];
      setPosts(json.map(toSummary));
    } catch (e) {
      setPosts(getLocalSummaries());
      setError(
        isNetworkFailure(e)
          ? "API unavailable. Showing local posts."
          : "Failed to load posts",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { posts, loading, error, refetch: load };
}

export async function createLostFoundPost(
  input: Omit<LostFoundPost, "id" | "createdAt" | "status" | "isFound">,
): Promise<LostFoundPost> {
  try {
    const res = await fetchWithTimeout(`${API_URL}/lost-found/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const details = await getErrorDetails(res);
      throw new Error(`Failed to create post: ${details}`);
    }
    const created = (await res.json()) as LostFoundPost;
    localPostsStore.unshift(created);
    return created;
  } catch (e) {
    if (!isNetworkFailure(e)) {
      throw e;
    }
    // Offline-first fallback so students can still report immediately.
    const fallbackPost: LostFoundPost = {
      id: `local-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: "open",
      isFound: false,
      ...input,
    };
    localPostsStore.unshift(fallbackPost);
    return fallbackPost;
  }
}

export async function getPostDetails(
  id: string,
): Promise<LostFoundPostSummary> {
  try {
    const res = await fetchWithTimeout(`${API_URL}/lost-found/posts/${id}`);
    if (!res.ok) {
      throw new Error("Post not found");
    }
    const json = (await res.json()) as LostFoundPost;
    return toSummary(json);
  } catch (e) {
    const local = localPostsStore.find((p) => p.id === id);
    if (local) return toSummary(local);
    throw e;
  }
}

export async function resolvePost(id: string): Promise<LostFoundPost> {
  try {
    const res = await fetchWithTimeout(
      `${API_URL}/lost-found/posts/${id}/resolve`,
      {
        method: "POST",
      },
    );

    if (!res.ok) {
      throw new Error("Failed to resolve post");
    }

    const resolved = (await res.json()) as LostFoundPost;

    const localIdx = localPostsStore.findIndex((p) => p.id === id);
    if (localIdx !== -1) {
      localPostsStore[localIdx] = resolved;
    }

    return resolved;
  } catch (e) {
    const localIdx = localPostsStore.findIndex((p) => p.id === id);
    if (localIdx !== -1) {
      localPostsStore[localIdx] = {
        ...localPostsStore[localIdx],
        status: "resolved",
        isFound: true,
      };
      return localPostsStore[localIdx];
    }

    throw e;
  }
}

export const deleteLostFoundPost = async (id: string): Promise<void> => {
  try {
    const res = await fetchWithTimeout(`${API_URL}/lost-found/posts/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      throw new Error("Failed to delete post");
    }
  } finally {
    const idx = localPostsStore.findIndex((p) => p.id === id);
    if (idx !== -1) localPostsStore.splice(idx, 1);
  }
};

export function isOwnLostFoundPost(
  post: Pick<LostFoundPost, "ownerUserId">,
  currentUserId?: string | number | null,
) {
  return String(post.ownerUserId ?? "") === String(currentUserId ?? "");
}

export type LostFoundChatMessage = {
  id: string;
  senderType: "owner" | "finder" | "claimant" | "system";
  senderLabel?: string;
  message: string;
  createdAt: string;
};

export async function getLostFoundChats(postId: string) {
  const res = await fetchWithTimeout(
    `${API_URL}/lost-found/posts/${postId}/chats`,
  );

  if (!res.ok) {
    throw new Error("Failed to load chats");
  }

  return (await res.json()) as LostFoundChatMessage[];
}

export async function sendLostFoundChatMessage(
  postId: string,
  input: {
    senderType: "owner" | "finder" | "claimant" | "system";
    senderLabel?: string;
    message: string;
  },
) {
  const res = await fetchWithTimeout(
    `${API_URL}/lost-found/posts/${postId}/chats`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );

  if (!res.ok) {
    const details = await getErrorDetails(res);
    throw new Error(details || "Failed to send message");
  }

  return (await res.json()) as LostFoundChatMessage;
}


export type LostFoundChatThread = {
  id: string;
  postId: string;
  title: string;
  preview: string;
  lastMessageAt?: string;
  ownerUserId?: string;
  ownerUsername?: string;
};

export async function getLostFoundChatThreads(userId: string) {
  const res = await fetchWithTimeout(`${API_URL}/lost-found/chat-threads/${userId}`);

  if (!res.ok) {
    const details = await getErrorDetails(res);
    throw new Error(details || "Failed to load chat threads");
  }

  return (await res.json()) as LostFoundChatThread[];
}