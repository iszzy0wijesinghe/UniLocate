import type { StoredComplaintSession } from '../types/complaints';

const STORAGE_KEY = 'complaints.sessions.v1';
let memoryStore = '[]';

function getSecureStore() {
  try {
    return require('expo-secure-store') as {
      getItemAsync(key: string): Promise<string | null>;
      setItemAsync(key: string, value: string): Promise<void>;
      deleteItemAsync(key: string): Promise<void>;
    };
  } catch {
    return null;
  }
}

export async function loadComplaintSessions(): Promise<StoredComplaintSession[]> {
  const secureStore = getSecureStore();
  const value = secureStore
    ? await secureStore.getItemAsync(STORAGE_KEY)
    : memoryStore;

  if (!value) {
    return [];
  }

  try {
    return JSON.parse(value) as StoredComplaintSession[];
  } catch {
    return [];
  }
}

export async function saveComplaintSessions(records: StoredComplaintSession[]) {
  const payload = JSON.stringify(records);
  const secureStore = getSecureStore();

  if (secureStore) {
    await secureStore.setItemAsync(STORAGE_KEY, payload);
    return;
  }

  memoryStore = payload;
}

export async function clearComplaintSessions() {
  const secureStore = getSecureStore();
  if (secureStore) {
    await secureStore.deleteItemAsync(STORAGE_KEY);
    return;
  }

  memoryStore = '[]';
}
