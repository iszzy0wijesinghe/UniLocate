/** @format */

import { API_BASE_URL } from "../../../services/api/baseUrl";
import type {
  FlashcardSet,
  GenerateFlashcardsInput,
  GenerateFlashcardsResponse,
} from "../types/flashcards";

function buildQuery(params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value && value.trim()) {
      searchParams.append(key, value.trim());
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export async function generateEduHubFlashcards(
  input: GenerateFlashcardsInput,
): Promise<GenerateFlashcardsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/eduhub/flashcard-sets/generate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    let message = "Failed to generate flashcards";

    try {
      const errorBody = await response.json();
      message = errorBody?.message || message;
    } catch {
      // ignore json parse failure
    }

    throw new Error(message);
  }

  return (await response.json()) as GenerateFlashcardsResponse;
}

export async function getEduHubFlashcardSets(input?: {
  createdByUserId?: string;
  moduleCode?: string;
  examEntryId?: string;
}): Promise<FlashcardSet[]> {
  const query = buildQuery({
    createdByUserId: input?.createdByUserId,
    moduleCode: input?.moduleCode,
    examEntryId: input?.examEntryId,
  });

  const response = await fetch(
    `${API_BASE_URL}/eduhub/flashcard-sets${query}`,
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to fetch flashcard sets");
  }

  return (await response.json()) as FlashcardSet[];
}

export async function getEduHubFlashcardSetById(
  setId: string,
): Promise<FlashcardSet> {
  const response = await fetch(
    `${API_BASE_URL}/eduhub/flashcard-sets/${setId}`,
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to fetch flashcard set");
  }

  return (await response.json()) as FlashcardSet;
}

export async function deleteEduHubFlashcardSet(
  setId: string,
): Promise<{
  ok: boolean;
  deletedId: string;
}> {
  const response = await fetch(
    `${API_BASE_URL}/eduhub/flashcard-sets/${setId}`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    let message = "Failed to delete flashcard set";

    try {
      const errorBody = await response.json();
      message = errorBody?.message || message;
    } catch {
      // ignore json parse failure
    }

    throw new Error(message);
  }

  return (await response.json()) as { ok: boolean; deletedId: string };
}