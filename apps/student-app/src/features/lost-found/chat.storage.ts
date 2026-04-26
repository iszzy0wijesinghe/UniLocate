/** @format */

import AsyncStorage from "@react-native-async-storage/async-storage";

export type StoredLostFoundChatMessage = {
  id: string;
  postId: string;
  senderType: "owner" | "finder" | "claimant" | "system";
  senderLabel?: string;
  message: string;
  createdAt: string;
};

function getChatStorageKey(postId: string) {
  return `lostfound-chat-${postId}`;
}

export async function getStoredChatMessages(postId: string) {
  try {
    const raw = await AsyncStorage.getItem(getChatStorageKey(postId));
    if (!raw) return [];
    return JSON.parse(raw) as StoredLostFoundChatMessage[];
  } catch {
    return [];
  }
}

export async function saveStoredChatMessages(
  postId: string,
  messages: StoredLostFoundChatMessage[],
) {
  await AsyncStorage.setItem(getChatStorageKey(postId), JSON.stringify(messages));
}

export async function appendStoredChatMessage(
  postId: string,
  message: StoredLostFoundChatMessage,
) {
  const existing = await getStoredChatMessages(postId);
  const next = [...existing, message];
  await saveStoredChatMessages(postId, next);
  return next;
}