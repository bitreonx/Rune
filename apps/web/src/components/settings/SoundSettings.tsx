import { PlayIcon } from "lucide-react";
import { useCallback, useState, type CSSProperties } from "react";

import {
  requestOsNotificationPermission,
  resolveOsNotificationPermission,
  type OsNotificationPermission,
} from "@rune/client-runtime/sound/notification-gate";
import {
  DEFAULT_SOUND_PREFERENCES,
  type SoundEventId,
} from "@rune/client-runtime/sound/preferences";
import { SOUND_VARIANTS } from "@rune/client-runtime/sound/engine";

import { playSoundEffect } from "~/sound/playback";
import { useSoundPreferencesStore } from "~/sound/soundPreferencesStore";
import { Button } from "../ui/button";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import {
  SettingResetButton,
  SettingsPageContainer,
  SettingsRow,
  SettingsSection,
} from "./settingsLayout";
import { searchableSetting, type SettingsSearchItemId } from "./settingsSearch";

const DEFAULT_VOLUME_PERCENT = Math.round(DEFAULT_SOUND_PREFERENCES.volume * 100);

// One row may drive several event ids: the switch pair shares a preference,
// so "Switches" reads and writes both directions at once.
const SOUND_EVENT_ROWS: ReadonlyArray<{
  readonly events: readonly SoundEventId[];
  readonly searchId: SettingsSearchItemId;
  readonly title: string;
  readonly description: string;
}> = [
  {
    events: ["done"],
    searchId: "sound-done",
    title: "Agent finished",
    description: "A rising chime when a turn completes.",
  },
  {
    events: ["needs-input"],
    searchId: "sound-needs-input",
    title: "Agent needs input",
    description: "Two pops when an agent blocks on your answer or approval.",
  },
  {
    events: ["error"],
    searchId: "sound-error",
    title: "Agent error",
    description: "A low fall when a session fails.",
  },
  {
    events: ["click"],
    searchId: "sound-button-clicks",
    title: "Button clicks",
    description: "A quiet tick on every button press.",
  },
  {
    events: ["switch-on", "switch-off"],
    searchId: "sound-switches",
    title: "Switches",
    description: "Ticks up when a toggle turns on, down when it turns off.",
  },
  {
    events: ["copy"],
    searchId: "sound-copy",
    title: "Copy to clipboard",
    description: "A short blip on a confirmed copy.",
  },
  {
    events: ["sent"],
    searchId: "sound-sent",
    title: "Message sent",
    description: "A soft whoosh when your message goes out.",
  },
];

function EventPreviewButton({
  event,
  label,
}: {
  readonly event: SoundEventId;
  readonly label: string;
}) {
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
 * Flavor picker for an event row. Reads and writes the row's primary event;
 * the caller passes every event the row drives so shared rows (the switch
 * pair) change together. Picking a flavor plays it — hearing the choice is
 * the point of making one.
 */
function EventVariantSelect({
  eventIds,
  disabled,
  label,
}: {
  readonly eventIds: readonly SoundEventId[];
  readonly disabled: boolean;
  readonly label: string;
}) {
  const primaryEvent = eventIds[0];
  if (!primaryEvent) return null;
  const storedId = useSoundPreferencesStore((state) => state.variants[primaryEvent]);
  const setEventVariant = useSoundPreferencesStore((state) => state.setEventVariant);
  const variants = SOUND_VARIANTS[primaryEvent] ?? [];
  const defaultVariantId = variants[0]?.id ?? "";
  const selectedVariantId =
    variants.find((variant: { id: string }) => variant.id === storedId)?.id ?? defaultVariantId;

  return (
    <Select
      value={selectedVariantId}
      onValueChange={(value) => {
        const id = String(value);
        for (const eventId of eventIds) setEventVariant(eventId, id);
        playSoundEffect(primaryEvent, { audition: true });
      }}
    >
      <SelectTrigger
        aria-label={`${label} sound style`}
        className="w-28"
        disabled={disabled}
        size="compact"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectPopup>
        {variants.map((variant: { id: string; label: string }) => (
          <SelectItem key={variant.id} value={variant.id}>
            {variant.label}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
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
  const inAppNotifications = useSoundPreferencesStore((state) => state.inAppNotifications);
  const setInAppNotifications = useSoundPreferencesStore((state) => state.setInAppNotifications);

  // Sampled at mount and after each explicit request; a permission change made
  // elsewhere lands on the next visit to this page.
  const [permission, setPermission] = useState<OsNotificationPermission>(() =>
    resolveOsNotificationPermission(),
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

        {SOUND_EVENT_ROWS.map(({ description, events: eventIds, searchId, title }) => {
          const primaryEvent = eventIds[0];
          // Row configs always name at least one event; the guard is for the type.
          if (primaryEvent === undefined) return null;
          return (
            <SettingsRow
              key={searchId}
              {...searchableSetting(searchId)}
              description={description}
              control={
                <div className="flex items-center gap-2">
                  <EventPreviewButton event={primaryEvent} label={title} />
                  <EventVariantSelect eventIds={eventIds} disabled={!enabled} label={title} />
                  <Switch
                    checked={events[primaryEvent]}
                    disabled={!enabled}
                    onCheckedChange={(checked) => {
                      for (const eventId of eventIds) setEventEnabled(eventId, Boolean(checked));
                    }}
                    aria-label={title}
                  />
                </div>
              }
            />
          );
        })}
      </SettingsSection>

      <SettingsSection title="Notifications">
        <SettingsRow
          title="In-app notifications"
          description="Shows a branded RUNE notification card for finished turns, input requests, and errors. It stays inside the app and can open the thread directly."
          control={
            <Switch
              checked={inAppNotifications}
              onCheckedChange={(checked) => setInAppNotifications(Boolean(checked))}
              aria-label="In-app notifications"
            />
          }
        />
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
