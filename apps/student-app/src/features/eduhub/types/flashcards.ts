/** @format */

export type FlashcardItem = {
  id: string;
  question: string;
  answer: string;
  moduleCode: string;
  moduleName: string;
  createdAt: string;
  position?: number;
};

export type FlashcardSet = {
  id: string;
  moduleCode: string;
  moduleName: string;
  examEntryId?: string | null;
  createdByUserId: string;
  createdByUsername: string;
  createdAt: string;
  updatedAt: string;
  cards: FlashcardItem[];
};

export type FlashcardSetMeta = Omit<FlashcardSet, "cards">;

export type GenerateFlashcardsInput = {
  moduleCode: string;
  moduleName: string;
  examEntryId?: string | null;
  createdByUserId: string;
  createdByUsername: string;
  requestedCount?: number;
};

export type GenerateFlashcardsResponse = {
  set: FlashcardSetMeta;
  cards: Array<{
    id: string;
    question: string;
    answer: string;
    moduleCode: string;
    moduleName: string;
    position: number;
  }>;
};