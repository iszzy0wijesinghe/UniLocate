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
      // ignore json parse fail
    }
    return body;
  } catch {
    return `HTTP ${res.status}`;
  }
}

function buildAbsoluteImageUrl(imageUrl?: string | null) {
  if (!imageUrl) return null;

  const trimmed = imageUrl.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("file://")) {
    return null;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return `${API_URL}${trimmed}`;
  }

  return `${API_URL}/${trimmed}`;
}

function normalizePost(post: LostFoundPost): LostFoundPost {
  const safeImages = (post.images ?? [])
    .map((img) => buildAbsoluteImageUrl(img))
    .filter(Boolean) as string[];

  return {
    ...post,
    images: safeImages,
  };
}

function toSummary(post: LostFoundPost): LostFoundPostSummary {
  const normalized = normalizePost(post);
  const created = new Date(normalized.createdAt);
  const relativeTime = created.toLocaleString();
  return { ...normalized, relativeTime };
}

function getLocalSummaries(): LostFoundPostSummary[] {
  return [...localPostsStore]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .map(toSummary);
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

export async function uploadLostFoundImage(localUri: string): Promise<string> {
  const filename = localUri.split("/").pop() || `lost-found-${Date.now()}.jpg`;
  const ext = filename.split(".").pop()?.toLowerCase();

  let mimeType = "image/jpeg";
  if (ext === "png") mimeType = "image/png";
  if (ext === "webp") mimeType = "image/webp";
  if (ext === "heic") mimeType = "image/heic";

  const formData = new FormData();
  formData.append("file", {
    uri: localUri,
    name: filename,
    type: mimeType,
  } as any);

  const res = await fetchWithTimeout(`${API_URL}/lost-found/uploads`, {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
    body: formData,
  });

  if (!res.ok) {
    const details = await getErrorDetails(res);
    throw new Error(details || "Failed to upload image");
  }

  const json = (await res.json()) as {
    ok: boolean;
    imageUrl: string;
  };

  const absoluteUrl = buildAbsoluteImageUrl(json.imageUrl);
  if (!absoluteUrl) {
    throw new Error("Upload succeeded but returned invalid image URL");
  }

  return absoluteUrl;
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

    const created = normalizePost((await res.json()) as LostFoundPost);
    localPostsStore.unshift(created);
    return created;
  } catch (e) {
    if (!isNetworkFailure(e)) {
      throw e;
    }

    const fallbackPost: LostFoundPost = normalizePost({
      id: `local-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: "open",
      isFound: false,
      ...input,
    });

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

    const json = normalizePost((await res.json()) as LostFoundPost);
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

    const resolved = normalizePost((await res.json()) as LostFoundPost);

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

export async function getLostFoundChatThreads(
  userId: string,
  username?: string,
) {
  const url = new URL(`${API_URL}/lost-found/chat-threads/${userId}`);
  if (username?.trim()) {
    url.searchParams.set("username", username.trim());
  }

  const res = await fetchWithTimeout(url.toString());

  if (!res.ok) {
    const details = await getErrorDetails(res);
    throw new Error(details || "Failed to load chat threads");
  }

  return (await res.json()) as LostFoundChatThread[];
}


// /** @format */

// import React, { useEffect, useState } from "react";
// import { API_BASE_URL } from "../../services/api/baseUrl";

// export type LostFoundType = "lost" | "found";
// export type ItemCategory = "ID Card" | "Wallet" | "Book" | "Device" | "Other";

// export interface LostFoundPost {
//   id: string;
//   type: LostFoundType;
//   category: ItemCategory;
//   title: string;
//   description?: string;
//   timeHint?: string;
//   images?: string[];
//   createdAt: string;
//   status: "open" | "resolved";
//   ownerUserId?: string;
//   ownerUsername?: string;
//   isFound?: boolean;
// }

// const API_URL = API_BASE_URL;
// const FETCH_TIMEOUT_MS = 15_000;
// const localPostsStore: LostFoundPost[] = [];

// async function fetchWithTimeout(
//   url: string,
//   opts: RequestInit & { timeout?: number } = {},
// ): Promise<Response> {
//   const { timeout = FETCH_TIMEOUT_MS, ...fetchOpts } = opts;
//   const controller = new AbortController();
//   const id = setTimeout(() => controller.abort(), timeout);

//   try {
//     const res = await fetch(url, { ...fetchOpts, signal: controller.signal });
//     clearTimeout(id);
//     return res;
//   } catch (e) {
//     clearTimeout(id);
//     if ((e as Error).name === "AbortError") {
//       throw new Error(
//         "Request timed out. Is the API running? Start it with: pnpm -C apps/api dev",
//       );
//     }
//     throw e;
//   }
// }

// function toAbsoluteFileUrl(path?: string | null) {
//   if (!path) return "";
//   if (path.startsWith("http://") || path.startsWith("https://")) return path;
//   return `${API_URL}${path}`;
// }

// function normalizePost(post: any): LostFoundPost {
//   return {
//     id: String(post.id),
//     type: post.type,
//     category: post.category,
//     title: post.title,
//     description: post.description ?? "",
//     timeHint: post.timeHint ?? post.time_hint ?? "",
//     images: Array.isArray(post.images)
//       ? post.images
//           .map((img: string) => toAbsoluteFileUrl(img))
//           .filter(Boolean)
//       : [],
//     createdAt: post.createdAt ?? post.created_at ?? new Date().toISOString(),
//     status: (post.status ?? "open") as "open" | "resolved",
//     ownerUserId: post.ownerUserId ?? post.owner_user_id ?? "",
//     ownerUsername: post.ownerUsername ?? post.owner_username ?? "",
//     isFound: Boolean(post.isFound ?? post.is_found ?? false),
//   };
// }

// export interface LostFoundPostSummary extends LostFoundPost {
//   relativeTime: string;
// }

// function toSummary(post: LostFoundPost): LostFoundPostSummary {
//   const created = new Date(post.createdAt);
//   const relativeTime = created.toLocaleString();
//   return { ...post, relativeTime };
// }

// function getLocalSummaries(): LostFoundPostSummary[] {
//   return [...localPostsStore]
//     .sort(
//       (a, b) =>
//         new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
//     )
//     .map(toSummary);
// }

// function isNetworkFailure(error: unknown): boolean {
//   if (!(error instanceof Error)) return false;
//   const message = error.message.toLowerCase();
//   return (
//     message.includes("failed to fetch") ||
//     message.includes("network request failed") ||
//     message.includes("timed out") ||
//     message.includes("aborted")
//   );
// }

// async function getErrorDetails(res: Response): Promise<string> {
//   try {
//     const body = await res.text();
//     if (!body) return `HTTP ${res.status}`;

//     try {
//       const parsed = JSON.parse(body) as { message?: string; error?: string };
//       if (parsed.message) return parsed.message;
//       if (parsed.error) return parsed.error;
//     } catch {
//       return body;
//     }

//     return body;
//   } catch {
//     return `HTTP ${res.status}`;
//   }
// }

// export function useLostFoundPosts() {
//   const [posts, setPosts] = useState<LostFoundPostSummary[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const load = React.useCallback(async () => {
//     try {
//       setLoading(true);
//       setError(null);

//       const res = await fetchWithTimeout(`${API_URL}/lost-found/posts`);
//       if (!res.ok) {
//         const details = await getErrorDetails(res);
//         throw new Error(details || `Failed to load posts (${res.status})`);
//       }

//       const json = await res.json();
//       const normalized = Array.isArray(json)
//         ? json.map((post) => normalizePost(post))
//         : [];

//       setPosts(normalized.map(toSummary));
//     } catch (e) {
//       setPosts(getLocalSummaries());
//       setError(
//         isNetworkFailure(e)
//           ? "API unavailable. Showing local posts."
//           : "Failed to load posts",
//       );
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     load();
//   }, [load]);

//   return { posts, loading, error, refetch: load };
// }

// export async function uploadLostFoundImage(localUri: string): Promise<string> {
//   const formData = new FormData();

//   formData.append("file", {
//     uri: localUri,
//     name: `lost-found-${Date.now()}.jpg`,
//     type: "image/jpeg",
//   } as any);

//   const res = await fetchWithTimeout(`${API_URL}/lost-found/uploads`, {
//     method: "POST",
//     body: formData,
//     headers: {
//       Accept: "application/json",
//     },
//   });

//   if (!res.ok) {
//     const details = await getErrorDetails(res);
//     throw new Error(details || "Failed to upload image");
//   }

//   const json = (await res.json()) as { ok: boolean; imageUrl: string };

//   if (!json.imageUrl) {
//     throw new Error("Upload succeeded but no imageUrl returned");
//   }

//   return json.imageUrl;
// }

// export async function createLostFoundPost(
//   input: Omit<LostFoundPost, "id" | "createdAt" | "status" | "isFound">,
// ): Promise<LostFoundPost> {
//   try {
//     const payload = {
//       ...input,
//       images: Array.isArray(input.images)
//         ? input.images.map((img) => toAbsoluteFileUrl(img))
//         : [],
//     };

//     const res = await fetchWithTimeout(`${API_URL}/lost-found/posts`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(payload),
//     });

//     if (!res.ok) {
//       const details = await getErrorDetails(res);
//       throw new Error(`Failed to create post: ${details}`);
//     }

//     const created = normalizePost(await res.json());
//     localPostsStore.unshift(created);
//     return created;
//   } catch (e) {
//     if (!isNetworkFailure(e)) {
//       throw e;
//     }

//     const fallbackPost: LostFoundPost = {
//       id: `local-${Date.now()}`,
//       createdAt: new Date().toISOString(),
//       status: "open",
//       isFound: false,
//       ...input,
//       images: Array.isArray(input.images)
//         ? input.images.map((img) => toAbsoluteFileUrl(img))
//         : [],
//     };

//     localPostsStore.unshift(fallbackPost);
//     return fallbackPost;
//   }
// }

// export async function getPostDetails(
//   id: string,
// ): Promise<LostFoundPostSummary> {
//   try {
//     const res = await fetchWithTimeout(`${API_URL}/lost-found/posts/${id}`);

//     if (!res.ok) {
//       throw new Error("Post not found");
//     }

//     const json = await res.json();
//     return toSummary(normalizePost(json));
//   } catch (e) {
//     const local = localPostsStore.find((p) => p.id === id);
//     if (local) return toSummary(local);
//     throw e;
//   }
// }

// export async function resolvePost(id: string): Promise<LostFoundPost> {
//   try {
//     const res = await fetchWithTimeout(
//       `${API_URL}/lost-found/posts/${id}/resolve`,
//       {
//         method: "POST",
//       },
//     );

//     if (!res.ok) {
//       throw new Error("Failed to resolve post");
//     }

//     const resolved = normalizePost(await res.json());

//     const localIdx = localPostsStore.findIndex((p) => p.id === id);
//     if (localIdx !== -1) {
//       localPostsStore[localIdx] = resolved;
//     }

//     return resolved;
//   } catch (e) {
//     const localIdx = localPostsStore.findIndex((p) => p.id === id);
//     if (localIdx !== -1) {
//       localPostsStore[localIdx] = {
//         ...localPostsStore[localIdx],
//         status: "resolved",
//         isFound: true,
//       };
//       return localPostsStore[localIdx];
//     }

//     throw e;
//   }
// }

// export const deleteLostFoundPost = async (id: string): Promise<void> => {
//   try {
//     const res = await fetchWithTimeout(`${API_URL}/lost-found/posts/${id}`, {
//       method: "DELETE",
//     });

//     if (!res.ok) {
//       throw new Error("Failed to delete post");
//     }
//   } finally {
//     const idx = localPostsStore.findIndex((p) => p.id === id);
//     if (idx !== -1) localPostsStore.splice(idx, 1);
//   }
// };

// export function isOwnLostFoundPost(
//   post: Pick<LostFoundPost, "ownerUserId">,
//   currentUserId?: string | number | null,
// ) {
//   return String(post.ownerUserId ?? "") === String(currentUserId ?? "");
// }

// export type LostFoundChatMessage = {
//   id: string;
//   senderType: "owner" | "finder" | "claimant" | "system";
//   senderLabel?: string;
//   message: string;
//   createdAt: string;
// };

// export async function getLostFoundChats(postId: string) {
//   const res = await fetchWithTimeout(
//     `${API_URL}/lost-found/posts/${postId}/chats`,
//   );

//   if (!res.ok) {
//     throw new Error("Failed to load chats");
//   }

//   return (await res.json()) as LostFoundChatMessage[];
// }

// export async function sendLostFoundChatMessage(
//   postId: string,
//   input: {
//     senderType: "owner" | "finder" | "claimant" | "system";
//     senderLabel?: string;
//     message: string;
//   },
// ) {
//   const res = await fetchWithTimeout(
//     `${API_URL}/lost-found/posts/${postId}/chats`,
//     {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(input),
//     },
//   );

//   if (!res.ok) {
//     const details = await getErrorDetails(res);
//     throw new Error(details || "Failed to send message");
//   }

//   return (await res.json()) as LostFoundChatMessage;
// }

// export type LostFoundChatThread = {
//   id: string;
//   postId: string;
//   title: string;
//   preview: string;
//   lastMessageAt?: string;
//   ownerUserId?: string;
//   ownerUsername?: string;
// };

// export async function getLostFoundChatThreads(
//   userId: string,
//   username?: string,
// ) {
//   const query = username?.trim()
//     ? `?username=${encodeURIComponent(username.trim())}`
//     : "";

//   const res = await fetchWithTimeout(
//     `${API_URL}/lost-found/chat-threads/${encodeURIComponent(userId)}${query}`,
//   );

//   if (!res.ok) {
//     const details = await getErrorDetails(res);
//     throw new Error(details || "Failed to load chat threads");
//   }

//   return (await res.json()) as LostFoundChatThread[];
// }