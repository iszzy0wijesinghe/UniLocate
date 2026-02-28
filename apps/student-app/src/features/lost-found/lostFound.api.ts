import { useEffect, useState } from "react";
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

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export interface LostFoundPostSummary extends LostFoundPost {
  relativeTime: string;
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

export function useLostFoundPosts() {
  const [posts, setPosts] = useState<LostFoundPostSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/lost-found/posts`);
      const json = (await res.json()) as LostFoundPost[];
      setPosts(json.map(toSummary));
    } catch (e) {
      setError("Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return { posts, loading, error, refetch: load };
}

export async function createLostFoundPost(
  input: Omit<LostFoundPost, "id" | "createdAt" | "status">
): Promise<LostFoundPost> {
  const res = await fetch(`${API_URL}/lost-found/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error("Failed to create post");
  }
  return (await res.json()) as LostFoundPost;
}

export async function getPostDetails(id: string): Promise<LostFoundPostSummary> {
  const res = await fetch(`${API_URL}/lost-found/posts/${id}`);
  if (!res.ok) {
    throw new Error("Post not found");
  }
  const json = (await res.json()) as LostFoundPost;
  return toSummary(json);
}

export async function resolvePost(id: string): Promise<LostFoundPost> {
  const res = await fetch(`${API_URL}/lost-found/posts/${id}/resolve`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error("Failed to resolve post");
  }
  return (await res.json()) as LostFoundPost;
}

export function getMockLocationTrail(): LocationTrailPoint[] {
  return [
    { id: "1", label: "Library", x: 20, y: 30 },
    { id: "2", label: "Main Hall", x: 55, y: 45 },
    { id: "3", label: "Canteen", x: 75, y: 70 },
  ];
}


