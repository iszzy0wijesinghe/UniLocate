import { create } from 'zustand';

import type { StoredComplaintSession } from '../types/complaints';
import { loadComplaintSessions, saveComplaintSessions } from '../utils/secureStore';

type ComplaintSessionState = {
  hydrated: boolean;
  sessions: StoredComplaintSession[];
  hydrate: () => Promise<void>;
  upsertSession: (session: StoredComplaintSession) => Promise<void>;
  removeSession: (caseId: string) => Promise<void>;
};

export const useComplaintSessionStore = create<ComplaintSessionState>((set, get) => ({
  hydrated: false,
  sessions: [],
  hydrate: async () => {
    const sessions = await loadComplaintSessions();
    set({ sessions, hydrated: true });
  },
  upsertSession: async (session) => {
    const sessions = [...get().sessions];
    const next = sessions.filter((entry) => entry.caseId !== session.caseId);
    next.unshift(session);
    await saveComplaintSessions(next);
    set({ sessions: next, hydrated: true });
  },
  removeSession: async (caseId) => {
    const next = get().sessions.filter((entry) => entry.caseId !== caseId);
    await saveComplaintSessions(next);
    set({ sessions: next, hydrated: true });
  },
}));
