/** @format */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  FlashcardItem,
  FlashcardSet,
  FlashcardSetMeta,
} from "../types/flashcards";

const FLASHCARD_SET_PREFIX = "eduhub_flashcards_set_";
const FLASHCARD_SETS_META_KEY = "eduhub_flashcards_sets_meta";

function getSetStorageKey(setId: string) {
  return `${FLASHCARD_SET_PREFIX}${setId}`;
}

export async function saveFlashcardSetCards(
  setId: string,
  cards: FlashcardItem[],
): Promise<void> {
  await AsyncStorage.setItem(getSetStorageKey(setId), JSON.stringify(cards));
}

export async function getFlashcardSetCards(
  setId: string,
): Promise<FlashcardItem[]> {
  const raw = await AsyncStorage.getItem(getSetStorageKey(setId));

  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as FlashcardItem[];
  } catch {
    return [];
  }
}

export async function removeFlashcardSetCards(setId: string): Promise<void> {
  await AsyncStorage.removeItem(getSetStorageKey(setId));
}

export async function getFlashcardSetCardCount(setId: string): Promise<number> {
  const cards = await getFlashcardSetCards(setId);
  return cards.length;
}

export async function getAllFlashcardSetsFromStorage(): Promise<FlashcardSet[]> {
  const raw = await AsyncStorage.getItem(FLASHCARD_SETS_META_KEY);

  if (!raw) {
    return [];
  }

  try {
    const metas = JSON.parse(raw) as FlashcardSetMeta[];

    const sets = await Promise.all(
      metas.map(async (meta) => {
        const cards = await getFlashcardSetCards(meta.id);
        return {
          ...meta,
          cards,
        };
      }),
    );

    return sets;
  } catch {
    return [];
  }
}

export async function saveFlashcardSetToStorage(
  setMeta: FlashcardSetMeta,
): Promise<void> {
  const existing = await getAllFlashcardSetsFromStorage();

  const next: FlashcardSetMeta[] = [
    setMeta,
    ...existing
      .filter((item) => item.id !== setMeta.id)
      .map(({ cards, ...rest }) => rest),
  ];

  await AsyncStorage.setItem(FLASHCARD_SETS_META_KEY, JSON.stringify(next));
}

export async function deleteFlashcardSetFromStorage(
  setId: string,
): Promise<void> {
  const existing = await getAllFlashcardSetsFromStorage();

  const next = existing
    .filter((item) => item.id !== setId)
    .map(({ cards, ...rest }) => rest);

  await AsyncStorage.setItem(FLASHCARD_SETS_META_KEY, JSON.stringify(next));
  await removeFlashcardSetCards(setId);
}