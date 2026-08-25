import { PlayIcon } from "lucide-react";
import { useCallback, useState, type CSSProperties } from "react";

import {
  requestOsNotificationPermission,
  resolveOsNotificationPermission,
  type OsNotificationPermission,
} from "@t3tools/client-runtime/sound/notification-gate";
import { DEFAULT_SOUND_PREFERENCES, type SoundEventId } from "@t3tools/client-runtime/sound/preferences";

import { playSoundEffect } from "~/sound/playback";
import { useSoundPreferencesStore } from "~/sound/soundPreferencesStore";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import {
  SettingResetButton,
  SettingsPageContainer,
  SettingsRow,
  SettingsSection,
} from "./settingsLayout";
import { searchableSetting, type SettingsSearchItemId } from "./settingsSearch";

const DEFAULT_VOLUME_PERCENT = Math.round(DEFAULT_SOUND_PREFERENCES.volume * 100);

const SOUND_EVENT_ROWS: ReadonlyArray<{
  readonly event: SoundEventId;
  readonly searchId: SettingsSearchItemId;
  readonly title: string;
  readonly description: string;
}> = [
  {
    event: "done",
    searchId: "sound-done",
    title: "Agent finished",
    description: "Plays when a turn completes.",
  },
  {
    event: "needs-input",
    searchId: "sound-needs-input",
    title: "Agent needs input",
    description: "Plays when an agent blocks on your answer or approval.",
  },
  {
    event: "error",
    searchId: "sound-error",
    title: "Agent error",
    description: "Plays when a session fails.",
  },
  {
    event: "click",
    searchId: "sound-button-clicks",
    title: "Button clicks",
    description: "A quiet tick on every button press.",
  },
];

function EventPreviewButton({ event, label }: { readonly event: SoundEventId; readonly label: string }) {
  return (
    <Button
      size="icon-sm"
      variant="outline"
      aria-label={`Preview ${label.toLowerCase()} sound`}
      onClick={() => playSoundEffect(event, { audition: true })}
    >
      <PlayIcon />
    </Button>
  );
}

/**
 * Device-local audio: which UI moments get a sound effect, how loud, and
 * whether unfocused attention edges may raise an OS banner. Everything here
 * takes effect immediately — there is no save step for sound.
 */
export function SoundSettingsPanel() {
  const enabled = useSoundPreferencesStore((state) => state.enabled);
  const setEnabled = useSoundPreferencesStore((state) => state.setEnabled);
  const volume = useSoundPreferencesStore((state) => state.volume);
  const setVolume = useSoundPreferencesStore((state) => state.setVolume);
  const events = useSoundPreferencesStore((state) => state.events);
  const setEventEnabled = useSoundPreferencesStore((state) => state.setEventEnabled);
  const notifications = useSoundPreferencesStore((state) => state.notifications);
  const setNotifications = useSoundPreferencesStore((state) => state.setNotifications);

  // Sampled at mount and after each explicit request; a permission change made
  // elsewhere lands on the next visit to this page.
  const [permission, setPermission] = useState<OsNotificationPermission>(
    () => resolveOsNotificationPermission(),
  );
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  const handleRequestPermission = useCallback(async () => {
    setIsRequestingPermission(true);
    try {
      setPermission(await requestOsNotificationPermission());
    } finally {
      setIsRequestingPermission(false);
    }
  }, []);

  const volumePercent = Math.round(volume * 100);
  const volumeSliderStyle = {
    "--settings-slider-progress": `${volumePercent}%`,
    "--settings-slider-fill-offset": `${0.5 - volumePercent / 100}rem`,
  } as CSSProperties;

  return (
    <SettingsPageContainer>
      <SettingsSection title="Sound">
        <SettingsRow
          {...searchableSetting("sound-effects")}
          description="Short synthesized effects for agent activity and interface controls. Per-device: each client you connect keeps its own choice."
          control={
            <Switch
              checked={enabled}
              onCheckedChange={(checked) => setEnabled(Boolean(checked))}
              aria-label="Sound effects"
            />
          }
        />

        <SettingsRow
          {...searchableSetting("sound-volume")}
          description={enabled ? "Overall loudness of every effect." : "Sound effects are off."}
          resetAction={
            volumePercent !== DEFAULT_VOLUME_PERCENT ? (
              <SettingResetButton
                label="sound volume"
                onClick={() => setVolume(DEFAULT_VOLUME_PERCENT / 100)}
              />
            ) : null
          }
          control={
            <div className="flex w-full items-center gap-3 sm:w-52">
              <output
                className="min-w-12 rounded-md bg-muted px-2 py-1 text-center font-mono text-xs font-medium tabular-nums text-foreground"
                htmlFor="sound-volume"
              >
                {volumePercent}%
              </output>
              <input
                aria-label="Sound volume"
                className="settings-slider min-w-0 flex-1"
                id="sound-volume"
                disabled={!enabled}
                max={100}
                min={0}
                onChange={(event) => {
                  setVolume(Number(event.currentTarget.value) / 100);
                }}
                step={5}
                style={volumeSliderStyle}
                type="range"
                value={volumePercent}
              />
            </div>
          }
        />

        {SOUND_EVENT_ROWS.map(({ description, event, searchId, title }) => (
          <SettingsRow
            key={event}
            {...searchableSetting(searchId)}
            description={description}
            control={
              <div className="flex items-center gap-2">
                <EventPreviewButton event={event} label={title} />
                <Switch
                  checked={events[event]}
                  disabled={!enabled}
                  onCheckedChange={(checked) => setEventEnabled(event, Boolean(checked))}
                  aria-label={title}
                />
              </div>
            }
          />
        ))}
      </SettingsSection>

      <SettingsSection title="Notifications">
        <SettingsRow
          {...searchableSetting("sound-notifications")}
          description="Shows an OS banner for finished turns, input requests, and errors — but only while this window is out of focus or minimized. Sounds carry the focused case alone."
          status={
            permission === "denied" ? "Blocked by your browser’s notification settings." : undefined
          }
          control={
            <>
              {permission === "default" ? (
                <Button
                  variant="outline"
                  size="xs"
                  disabled={isRequestingPermission || !notifications}
                  onClick={() => void handleRequestPermission()}
                >
                  Enable notifications
                </Button>
              ) : null}
              <Switch
                checked={notifications}
                onCheckedChange={(checked) => setNotifications(Boolean(checked))}
                aria-label="Unfocused notifications"
              />
            </>
          }
        />
      </SettingsSection>
    </SettingsPageContainer>
  );
}
