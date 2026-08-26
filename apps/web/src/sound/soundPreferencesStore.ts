import {
  clampVolume,
  DEFAULT_SOUND_PREFERENCES,
  sanitizeSoundPreferences,
  type SoundEventId,
  type SoundPreferences,
} from "@rune/client-runtime/sound/preferences";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const SOUND_PREFERENCES_STORAGE_KEY = "rune:sound-preferences:v1";

export interface SoundPreferencesStoreState extends SoundPreferences {
  setEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  setEventEnabled: (event: SoundEventId, enabled: boolean) => void;
  /** Picks a flavor for an event; an undefined id restores the default. */
  setEventVariant: (event: SoundEventId, variantId: string | undefined) => void;
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
      setEventVariant: (event, variantId) =>
        set((state) => {
          const variants = { ...state.variants };
          if (variantId === undefined) delete variants[event];
          else variants[event] = variantId;
          return { variants };
        }),
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
