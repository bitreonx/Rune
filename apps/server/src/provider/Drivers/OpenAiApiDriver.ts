import {
  OPENAI_API_DEFAULT_BASE_URL,
  OpenAiApiSettings,
  ProviderDriverKind,
} from "@t3tools/contracts";
import * as BackgroundPolicy from "../../background/BackgroundPolicy.ts";
import * as Crypto from "effect/Crypto";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { HttpClient } from "effect/unstable/http";

import { ServerSettingsService } from "../../serverSettings.ts";
import { makeApiProviderInstance } from "../Layers/ApiProvider.ts";
import { ProviderDriverError } from "../Errors.ts";
import type { ProviderDriver } from "../ProviderDriver.ts";

const decodeSettings = (input: unknown): OpenAiApiSettings =>
  Schema.decodeUnknownSync(OpenAiApiSettings)(input);

const DRIVER_KIND = ProviderDriverKind.make("openaiApi");

export type OpenAiApiDriverEnv =
  | BackgroundPolicy.BackgroundPolicy
  | Crypto.Crypto
  | HttpClient.HttpClient
  | ServerSettingsService;

export const OpenAiApiDriver: ProviderDriver<OpenAiApiSettings, OpenAiApiDriverEnv> = {
  driverKind: DRIVER_KIND,
  metadata: { displayName: "OpenAI API", supportsMultipleInstances: true },
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
        apiKeyLabel: "OpenAI API Key",
        requestHeaders: {
          ...(config.organization ? { "OpenAI-Organization": config.organization } : {}),
          ...(config.project ? { "OpenAI-Project": config.project } : {}),
        },
      }).pipe(
        Effect.mapError(
          (cause) =>
            new ProviderDriverError({
              driver: DRIVER_KIND,
              instanceId,
              detail: `Failed to build OpenAI API provider: ${cause instanceof Error ? cause.message : String(cause)}`,
              cause,
            }),
        ),
      ),
};
