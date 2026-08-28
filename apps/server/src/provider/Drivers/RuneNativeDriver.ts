import {
  OPENAI_API_DEFAULT_BASE_URL,
  OpenAiApiSettings,
  ProviderDriverKind,
} from "@rune/contracts";
import * as BackgroundPolicy from "../../background/BackgroundPolicy.ts";
import * as Crypto from "effect/Crypto";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { HttpClient } from "effect/unstable/http";

import { ServerSettingsService } from "../../serverSettings.ts";
import { WorkspaceEntries } from "../../workspace/WorkspaceEntries.ts";
import { WorkspaceFileSystem } from "../../workspace/WorkspaceFileSystem.ts";
import { makeApiProviderInstance } from "../Layers/ApiProvider.ts";
import { ProviderDriverError } from "../Errors.ts";
import type { ProviderDriver } from "../ProviderDriver.ts";

const DRIVER_KIND = ProviderDriverKind.make("runeNative");

export type RuneNativeDriverEnv =
  | BackgroundPolicy.BackgroundPolicy
  | Crypto.Crypto
  | HttpClient.HttpClient
  | ServerSettingsService
  | WorkspaceEntries
  | WorkspaceFileSystem;

const decodeSettings = (input: unknown): OpenAiApiSettings =>
  Schema.decodeUnknownSync(OpenAiApiSettings)(input);

/**
 * RUNE Native is deliberately a first-class driver. It shares the hardened
 * OpenAI-compatible transport with the API driver, but keeps its own driver
 * identity so continuation, telemetry, settings, and provider routing never
 * collapse a native session into a different product surface.
 */
export const RuneNativeDriver: ProviderDriver<OpenAiApiSettings, RuneNativeDriverEnv> = {
  driverKind: DRIVER_KIND,
  metadata: { displayName: "Rune Native", supportsMultipleInstances: true },
  configSchema: OpenAiApiSettings,
  defaultConfig: () => decodeSettings({}),
  create: ({ instanceId, displayName, accentColor, environment, enabled, config }) =>
    makeApiProviderInstance({
      driver: DRIVER_KIND,
      settings: { ...config, enabled },
      instanceId,
      displayName,
      accentColor,
      environment,
      enabled,
      defaultBaseUrl: OPENAI_API_DEFAULT_BASE_URL,
      defaultModel: "gpt-4.1-mini",
      apiKeyLabel: "RUNE Native API Key",
      requestHeaders: {
        "X-Rune-Driver": "rune-native",
      },
    }).pipe(
      Effect.mapError(
        (cause) =>
          new ProviderDriverError({
            driver: DRIVER_KIND,
            instanceId,
            detail: `Failed to build RUNE Native provider: ${cause instanceof Error ? cause.message : String(cause)}`,
            cause,
          }),
      ),
    ),
};
