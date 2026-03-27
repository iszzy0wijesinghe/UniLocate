import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type UserProfileState = {
  username: string;
  hasCompletedFirstRun: boolean;
  setUsername: (username: string) => void;
  completeFirstRun: () => void;
  resetProfile: () => void;
};

export const useUserProfileStore = create<UserProfileState>()(
  persist(
    (set) => ({
      username: '',
      hasCompletedFirstRun: false,

      setUsername: (username: string) =>
        set({
          username: username.trim(),
        }),

      completeFirstRun: () =>
        set({
          hasCompletedFirstRun: true,
        }),

      resetProfile: () =>
        set({
          username: '',
          hasCompletedFirstRun: false,
        }),
    }),
    {
      name: 'unilocate-user-profile',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);