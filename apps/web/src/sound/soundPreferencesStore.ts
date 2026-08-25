import {
  clampVolume,
  DEFAULT_SOUND_PREFERENCES,
  sanitizeSoundPreferences,
  type SoundEventId,
  type SoundPreferences,
} from "@t3tools/client-runtime/sound/preferences";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const SOUND_PREFERENCES_STORAGE_KEY = "t3code:sound-preferences:v1";

export interface SoundPreferencesStoreState extends SoundPreferences {
  setEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  setEventEnabled: (event: SoundEventId, enabled: boolean) => void;
  setNotifications: (notifications: boolean) => void;
}

/**
 * Device-local sound preferences. Sounds are a property of the machine's
 * speakers and the human in front of them, so unlike server settings these
 * deliberately do not roam between clients.
 */
export const useSoundPreferencesStore = create<SoundPreferencesStoreState>()(
  persist(
    (set) => ({
      ...DEFAULT_SOUND_PREFERENCES,
      setEnabled: (enabled) => set({ enabled }),
      setVolume: (volume) => set({ volume: clampVolume(volume) }),
      setEventEnabled: (event, enabled) =>
        set((state) => ({ events: { ...state.events, [event]: enabled } })),
      setNotifications: (notifications) => set({ notifications }),
    }),
    {
      name: SOUND_PREFERENCES_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Sanitizes on rehydrate so older versions or corrupt writes land on
      // defaults instead of leaking mistyped values into playback.
      merge: (persisted, currentState) => ({
        ...currentState,
        ...sanitizeSoundPreferences(persisted),
      }),
    },
  ),
);
