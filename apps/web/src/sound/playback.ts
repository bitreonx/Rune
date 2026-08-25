import {
  randomClickDetune,
  SoundPlayer,
  SOUND_SCORES,
} from "@t3tools/client-runtime/sound/engine";
import { type SoundEventId } from "@t3tools/client-runtime/sound/preferences";

import { useSoundPreferencesStore } from "./soundPreferencesStore";

/** Single shared AudioContext for every UI sound on this device. */
export const soundPlayer = new SoundPlayer();

/**
 * Plays one UI effect, reading preferences at call time so callers (a click
 * handler, an event watcher) never subscribe to preference state or
 * re-render for audio's sake.
 */
export function playSoundEffect(event: SoundEventId, options: { audition?: boolean } = {}): void {
  const preferences = useSoundPreferencesStore.getState();
  // An audition — the settings preview button — is an explicit request to
  // hear exactly this effect, so it skips the per-event toggle alone. The
  // master switch still owns the device: off means no sound at all.
  if (!preferences.enabled) return;
  if (!options.audition && !preferences.events[event]) return;
  soundPlayer.setVolume(preferences.volume);
  // The first call usually runs inside a user gesture, which doubles as the
  // autoplay-policy unlock; later calls are no-ops.
  void soundPlayer.unlock();
  soundPlayer.play(SOUND_SCORES[event], event === "click" ? { detuneCents: randomClickDetune() } : undefined);
}
