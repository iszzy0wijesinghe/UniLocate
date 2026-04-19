import { api } from './api';
import type { LostFoundPost, LostFoundPostDetail } from '../types/lost-found';

export async function getLostFoundPosts() {
  const { data } = await api.get<LostFoundPost[]>('/lost-found/posts');
  return data;
}

export async function getLostFoundPostById(id: string) {
  const { data } = await api.get<LostFoundPostDetail>(`/lost-found/posts/${encodeURIComponent(id)}`);
  return data;
}

export async function resolveLostFoundPost(id: string) {
  const { data } = await api.post(`/lost-found/posts/${encodeURIComponent(id)}/resolve`);
  return data;
}

export async function deleteLostFoundPost(id: string) {
  const { data } = await api.delete(`/lost-found/posts/${encodeURIComponent(id)}`);
  return data;
}