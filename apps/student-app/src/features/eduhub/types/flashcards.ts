export type FlashcardItem = {
  id: string;
  question: string;
  answer: string;
  moduleCode: string;
  moduleName: string;
  createdAt: string;
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