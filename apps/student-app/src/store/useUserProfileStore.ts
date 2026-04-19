import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

type UserProfileState = {
  userId: string | null;
  username: string;
  isLoggedIn: boolean;
  hasCompletedFirstRun: boolean;
  setUserProfile: (input: { userId: string; username: string }) => void;
  completeFirstRun: () => void;
  logout: () => void;
  resetProfile: () => void;
};

export const useUserProfileStore = create<UserProfileState>()(
  persist(
    (set) => ({
      userId: null,
      username: "",
      isLoggedIn: false,
      hasCompletedFirstRun: false,

      setUserProfile: ({ userId, username }) =>
        set({
          userId,
          username: username.trim(),
          isLoggedIn: true,
        }),

      completeFirstRun: () =>
        set({
          hasCompletedFirstRun: true,
        }),

      logout: () =>
        set({
          userId: null,
          username: "",
          isLoggedIn: false,
          hasCompletedFirstRun: false,
        }),

      resetProfile: () =>
        set({
          userId: null,
          username: "",
          isLoggedIn: false,
          hasCompletedFirstRun: false,
        }),
    }),
    {
      name: "unilocate-user-profile",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);