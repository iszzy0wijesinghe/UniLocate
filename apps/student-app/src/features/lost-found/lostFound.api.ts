import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../../services/api/baseUrl";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
}

const API_URL = API_BASE_URL;
const FETCH_TIMEOUT_MS = 15_000;
const localPostsStore: LostFoundPost[] = [];
const localChatsStore = new Map<string, LostFoundChatPayload>();
const LOCAL_POSTS_KEY = "lost_found_local_posts_v1";
let localPostsLoaded = false;
let localPostsLoadPromise: Promise<void> | null = null;

async function ensureLocalPostsLoaded() {
  if (localPostsLoaded) return;
  if (localPostsLoadPromise) {
    await localPostsLoadPromise;
    return;
  }

  localPostsLoadPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(LOCAL_POSTS_KEY);
      if (!raw) {
        localPostsLoaded = true;
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        localPostsStore.splice(0, localPostsStore.length, ...parsed);
      }
    } catch {
      // Ignore corrupted or unavailable local cache.
    } finally {
      localPostsLoaded = true;
      localPostsLoadPromise = null;
    }
  })();

  await localPostsLoadPromise;
}

async function persistLocalPosts() {
  try {
    await AsyncStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(localPostsStore));
  } catch {
    // Best effort persistence; app still works without storage write.
  }
}

async function fetchWithTimeout(
  url: string,
  opts: RequestInit & { timeout?: number } = {}
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
      throw new Error("Request timed out. Is the API running? Start it with: pnpm -C apps/api dev");
    }
    throw e;
  }
}

export interface LostFoundPostSummary extends LostFoundPost {
  relativeTime: string;
}

export type ChatRole = "owner" | "finder";

export interface LostFoundChatMessage {
  id: string;
  senderRole: "owner" | "finder" | "system";
  body: string;
  createdAt: string;
}

export interface LostFoundChatPayload {
  chatId: string;
  unreadCount: number;
  messages: LostFoundChatMessage[];
}

export interface LocationTrailPoint {
  id: string;
  label: string;
  // Simple mock coordinates for a 2D campus map preview
  x: number;
  y: number;
}

function toSummary(post: LostFoundPost): LostFoundPostSummary {
  const created = new Date(post.createdAt);
  const relativeTime = created.toLocaleString();
  return { ...post, relativeTime };
}

function getLocalSummaries(): LostFoundPostSummary[] {
  return [...localPostsStore]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
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

function isBackendUnavailable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("database unavailable") ||
    message.includes("service unavailable") ||
    message.includes("http 503") ||
    message.includes("scram-server-first-message") ||
    message.includes("client password must be a string")
  );
}

function getOrCreateLocalChat(postId: string): LostFoundChatPayload {
  const existing = localChatsStore.get(postId);
  if (existing) return existing;
  const created: LostFoundChatPayload = {
    chatId: `local-chat-${postId}`,
    unreadCount: 0,
    messages: [],
  };
  localChatsStore.set(postId, created);
  return created;
}

function getOrCreateLocalChatByChatId(chatId: string): LostFoundChatPayload {
  const existingEntry = [...localChatsStore.entries()].find(([, chat]) => chat.chatId === chatId);
  if (existingEntry) return existingEntry[1];
  const fallbackPostId = `chat-${chatId}`;
  const created: LostFoundChatPayload = {
    chatId,
    unreadCount: 0,
    messages: [],
  };
  localChatsStore.set(fallbackPostId, created);
  return created;
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
      await ensureLocalPostsLoaded();
      const res = await fetchWithTimeout(`${API_URL}/lost-found/posts`);
      if (!res.ok) {
        throw new Error(`Failed to load posts (${res.status})`);
      }
      const json = (await res.json()) as LostFoundPost[];
      setPosts(json.map(toSummary));
    } catch (e) {
      const local = getLocalSummaries();
      setPosts(local);
      setError(
        local.length > 0
          ? null
          : isNetworkFailure(e) || isBackendUnavailable(e)
          ? "API unavailable. Showing local posts."
          : "Failed to load posts"
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
  input: Omit<LostFoundPost, "id" | "createdAt" | "status">
): Promise<LostFoundPost> {
  await ensureLocalPostsLoaded();
  try {
    const res = await fetchWithTimeout(`${API_URL}/lost-found/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const details = await getErrorDetails(res);
      if (
        res.status >= 500 ||
        details.toLowerCase().includes("scram-server-first-message") ||
        details.toLowerCase().includes("client password must be a string")
      ) {
        throw new Error(`Service unavailable: ${details}`);
      }
      throw new Error(`Failed to create post: ${details}`);
    }
    const created = (await res.json()) as LostFoundPost;
    localPostsStore.unshift(created);
    await persistLocalPosts();
    return created;
  } catch (e) {
    if (!isNetworkFailure(e) && !isBackendUnavailable(e)) {
      throw e;
    }
    // Offline-first fallback so students can still report immediately.
    const fallbackPost: LostFoundPost = {
      id: `local-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: "open",
      ...input,
    };
    localPostsStore.unshift(fallbackPost);
    await persistLocalPosts();
    return fallbackPost;
  }
}

export async function uploadLostFoundImage(uri: string): Promise<string> {
  const form = new FormData();
  const fileName = uri.split("/").pop() || `lost-found-${Date.now()}.jpg`;
  const ext = fileName.split(".").pop()?.toLowerCase();
  const mime = ext === "png" ? "image/png" : "image/jpeg";

  form.append("image", {
    uri,
    name: fileName,
    type: mime,
  } as any);

  try {
    const res = await fetchWithTimeout(`${API_URL}/lost-found/uploads/image`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const details = await getErrorDetails(res);
      if (
        res.status >= 500 ||
        details.toLowerCase().includes("scram-server-first-message") ||
        details.toLowerCase().includes("client password must be a string")
      ) {
        return uri;
      }
      throw new Error(`Failed to upload image: ${details}`);
    }
    const json = (await res.json()) as { url: string };
    return json.url;
  } catch (e) {
    if (isNetworkFailure(e) || isBackendUnavailable(e)) {
      return uri;
    }
    throw e;
  }
}

export async function getPostDetails(id: string): Promise<LostFoundPostSummary> {
  await ensureLocalPostsLoaded();
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
  await ensureLocalPostsLoaded();
  try {
    const res = await fetchWithTimeout(`${API_URL}/lost-found/posts/${id}/resolve`, {
      method: "POST",
    });
    if (!res.ok) {
      throw new Error("Failed to resolve post");
    }
    const resolved = (await res.json()) as LostFoundPost;
    const idx = localPostsStore.findIndex((p) => p.id === id);
    if (idx !== -1) {
      localPostsStore[idx] = resolved;
      await persistLocalPosts();
    }
    return resolved;
  } catch (e) {
    const idx = localPostsStore.findIndex((p) => p.id === id);
    if (idx !== -1) {
      localPostsStore[idx] = { ...localPostsStore[idx], status: "resolved" };
      await persistLocalPosts();
      return localPostsStore[idx];
    }
    throw e;
  }
}

export const deleteLostFoundPost = async (id: string): Promise<void> => {
  await ensureLocalPostsLoaded();

  try {
    const res = await fetchWithTimeout(`${API_URL}/lost-found/posts/${id}`, {
      method: "DELETE",
    });

    // ✅ Accept 204 or 200
    if (res.status !== 204 && res.status !== 200) {
      const errorText = await res.text();
      throw new Error(errorText || "Delete failed");
    }

    // ✅ ONLY remove locally if API succeeded
    const idx = localPostsStore.findIndex((p) => p.id === id);
    if (idx !== -1) {
      localPostsStore.splice(idx, 1);
      await persistLocalPosts();
    }

  } catch (err) {
    console.error("DELETE API ERROR:", err);
    throw err; // important so your Alert shows
  }
};

export async function submitFounderReport(
  postId: string,
  payload: {
    placeFound?: string;
    whenFound?: string;
    description?: string;
    imageUrls?: string[];
  }
): Promise<{ chatId: string; initialMessage: string }> {
  try {
    const res = await fetchWithTimeout(`${API_URL}/lost-found/posts/${postId}/founder-report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const details = await getErrorDetails(res);
      if (
        res.status >= 500 ||
        details.toLowerCase().includes("scram-server-first-message") ||
        details.toLowerCase().includes("client password must be a string")
      ) {
        throw new Error(`Service unavailable: ${details}`);
      }
      throw new Error(`Failed to submit founder report: ${details}`);
    }
    return (await res.json()) as { chatId: string; initialMessage: string };
  } catch (e) {
    if (!isNetworkFailure(e) && !isBackendUnavailable(e)) {
      throw e;
    }
    const local = getOrCreateLocalChat(postId);
    const lines: string[] = [];
    if (payload.placeFound?.trim()) lines.push(`Place found: ${payload.placeFound.trim()}`);
    if (payload.whenFound) lines.push(`Time found: ${new Date(payload.whenFound).toLocaleString()}`);
    if (payload.description?.trim()) lines.push(`Finder description: ${payload.description.trim()}`);
    if (payload.imageUrls?.length) {
      lines.push(`Photos: ${payload.imageUrls.length} attached`);
      for (const imageUrl of payload.imageUrls) {
        lines.push(`Photo URL: ${imageUrl}`);
      }
    }
    const initialMessage =
      lines.length > 0
        ? `Hi, I found an item that may be yours.\n${lines.join("\n")}\nPlease confirm details to verify ownership.`
        : "Hi, I found an item that may be yours. Please confirm details.";
    local.messages.push({
      id: `local-msg-${Date.now()}`,
      senderRole: "finder",
      body: initialMessage,
      createdAt: new Date().toISOString(),
    });
    return { chatId: local.chatId, initialMessage };
  }
}

export async function getPostChat(
  postId: string,
  viewerRole: ChatRole
): Promise<LostFoundChatPayload> {
  try {
    const res = await fetchWithTimeout(
      `${API_URL}/lost-found/posts/${postId}/chat?viewerRole=${viewerRole}`
    );
    if (!res.ok) throw new Error(await getErrorDetails(res));
    return (await res.json()) as LostFoundChatPayload;
  } catch {
    return getOrCreateLocalChat(postId);
  }
}

export async function sendPostChatMessage(
  chatId: string,
  senderRole: ChatRole,
  body: string
): Promise<LostFoundChatMessage> {
  try {
    const res = await fetchWithTimeout(`${API_URL}/lost-found/chats/${chatId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senderRole, body }),
    });
    if (!res.ok) {
      const details = await getErrorDetails(res);
      if (
        res.status >= 500 ||
        details.toLowerCase().includes("scram-server-first-message") ||
        details.toLowerCase().includes("client password must be a string")
      ) {
        throw new Error(`Service unavailable: ${details}`);
      }
      throw new Error(`Failed to send message: ${details}`);
    }
    return (await res.json()) as LostFoundChatMessage;
  } catch {
    const local = getOrCreateLocalChatByChatId(chatId);
    const localMessage: LostFoundChatMessage = {
      id: `local-msg-${Date.now()}`,
      senderRole,
      body,
      createdAt: new Date().toISOString(),
    };
    local.messages.push(localMessage);
    return localMessage;
  }
}

export async function markChatNotificationsRead(
  chatId: string,
  recipientRole: ChatRole
): Promise<void> {
  if (chatId.startsWith("local-chat-") || chatId.startsWith("local-")) {
    return;
  }
  try {
    const res = await fetchWithTimeout(`${API_URL}/lost-found/notifications/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, recipientRole }),
    });
    if (!res.ok) {
      const details = await getErrorDetails(res);
      if (
        res.status >= 500 ||
        details.toLowerCase().includes("scram-server-first-message") ||
        details.toLowerCase().includes("client password must be a string") ||
        details.toLowerCase().includes("invalid uuid")
      ) {
        return;
      }
      throw new Error(`Failed to mark notifications read: ${details}`);
    }
  } catch (e) {
    if (isNetworkFailure(e) || isBackendUnavailable(e)) return;
    throw e;
  }
}

export function getMockLocationTrail(): LocationTrailPoint[] {
  return [
    { id: "1", label: "Library", x: 20, y: 30 },
    { id: "2", label: "Main Hall", x: 55, y: 45 },
    { id: "3", label: "Canteen", x: 75, y: 70 },
  ];
}


