/** @format */

import AsyncStorage from "@react-native-async-storage/async-storage";

export type StoredComplaintMessage = {
  id: string;
  complaintId: string;
  senderType: string;
  senderLabel?: string;
  body: string;
  createdAt: string;
};

function getComplaintChatKey(complaintId: string) {
  return `complaint-chat-${complaintId}`;
}

export async function getStoredComplaintMessages(complaintId: string) {
  try {
    const raw = await AsyncStorage.getItem(getComplaintChatKey(complaintId));
    if (!raw) return [];
    return JSON.parse(raw) as StoredComplaintMessage[];
  } catch {
    return [];
  }
}

export async function saveStoredComplaintMessages(
  complaintId: string,
  messages: StoredComplaintMessage[],
) {
  await AsyncStorage.setItem(
    getComplaintChatKey(complaintId),
    JSON.stringify(messages),
  );
}