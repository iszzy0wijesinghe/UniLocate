import { create } from 'zustand';

import type { AdminSession } from '../lib/types';

const STORAGE_KEY = 'complaints.admin.session';

type AuthState = {
  hydrated: boolean;
  session: AdminSession | null;
  hydrate: () => void;
  setSession: (session: AdminSession | null) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  hydrated: false,
  session: null,
  hydrate: () => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      set({ hydrated: true, session: null });
      return;
    }

    try {
      set({ hydrated: true, session: JSON.parse(raw) as AdminSession });
    } catch {
      set({ hydrated: true, session: null });
    }
  },
  setSession: (session) => {
    if (session) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    set({ session, hydrated: true });
  },
}));
