/** @format */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

type TextSizeOption = "Small" | "Medium" | "Large";
type LanguageOption = "English" | "Sinhala" | "Tamil";

type AppSettingsState = {
  bookingUpdatesEnabled: boolean;
  ticketUpdatesEnabled: boolean;
  complaintUpdatesEnabled: boolean;
  generalAnnouncementsEnabled: boolean;

  textSize: TextSizeOption;
  language: LanguageOption;
  compactCardsEnabled: boolean;
  highContrastMapEnabled: boolean;

  setBookingUpdatesEnabled: (value: boolean) => void;
  setTicketUpdatesEnabled: (value: boolean) => void;
  setComplaintUpdatesEnabled: (value: boolean) => void;
  setGeneralAnnouncementsEnabled: (value: boolean) => void;

  setTextSize: (value: TextSizeOption) => void;
  setLanguage: (value: LanguageOption) => void;
  setCompactCardsEnabled: (value: boolean) => void;
  setHighContrastMapEnabled: (value: boolean) => void;

  resetNotificationSettings: () => void;
  resetPersonalizeSettings: () => void;
};

export const useAppSettingsStore = create<AppSettingsState>()(
  persist(
    (set) => ({
      bookingUpdatesEnabled: true,
      ticketUpdatesEnabled: true,
      complaintUpdatesEnabled: true,
      generalAnnouncementsEnabled: false,

      textSize: "Medium",
      language: "English",
      compactCardsEnabled: false,
      highContrastMapEnabled: false,

      setBookingUpdatesEnabled: (value: boolean) =>
        set({ bookingUpdatesEnabled: value }),

      setTicketUpdatesEnabled: (value: boolean) =>
        set({ ticketUpdatesEnabled: value }),

      setComplaintUpdatesEnabled: (value: boolean) =>
        set({ complaintUpdatesEnabled: value }),

      setGeneralAnnouncementsEnabled: (value: boolean) =>
        set({ generalAnnouncementsEnabled: value }),

      setTextSize: (value: TextSizeOption) => set({ textSize: value }),

      setLanguage: (value: LanguageOption) => set({ language: value }),

      setCompactCardsEnabled: (value: boolean) =>
        set({ compactCardsEnabled: value }),

      setHighContrastMapEnabled: (value: boolean) =>
        set({ highContrastMapEnabled: value }),

      resetNotificationSettings: () =>
        set({
          bookingUpdatesEnabled: true,
          ticketUpdatesEnabled: true,
          complaintUpdatesEnabled: true,
          generalAnnouncementsEnabled: false,
        }),

      resetPersonalizeSettings: () =>
        set({
          textSize: "Medium",
          language: "English",
          compactCardsEnabled: false,
          highContrastMapEnabled: false,
        }),
    }),
    {
      name: "unilocate-app-settings",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);