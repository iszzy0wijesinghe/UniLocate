/** @format */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { EduHubNote } from "../types/eduhub";

const EDUHUB_NOTES_KEY = "unilocate-eduhub-notes-v1";

export async function getStoredEduHubNotes(): Promise<EduHubNote[]> {
  try {
    const raw = await AsyncStorage.getItem(EDUHUB_NOTES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as EduHubNote[];
  } catch {
    return [];
  }
}

export async function saveStoredEduHubNotes(
  notes: EduHubNote[],
): Promise<void> {
  await AsyncStorage.setItem(EDUHUB_NOTES_KEY, JSON.stringify(notes));
}

export async function addEduHubNote(note: EduHubNote): Promise<EduHubNote[]> {
  const current = await getStoredEduHubNotes();
  const next = [note, ...current];
  await saveStoredEduHubNotes(next);
  return next;
}

export async function deleteEduHubNote(noteId: string): Promise<EduHubNote[]> {
  const current = await getStoredEduHubNotes();
  const next = current.filter((item) => item.id !== noteId);
  await saveStoredEduHubNotes(next);
  return next;
}

export async function getEduHubNoteById(
  noteId: string,
): Promise<EduHubNote | null> {
  const notes = await getStoredEduHubNotes();
  return notes.find((item) => item.id === noteId) ?? null;
}