import {
  OPENROUTER_DEFAULT_BASE_URL,
  OpenRouterSettings,
  ProviderDriverKind,
} from "@rune/contracts";
import * as BackgroundPolicy from "../../background/BackgroundPolicy.ts";
import * as Crypto from "effect/Crypto";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { HttpClient } from "effect/unstable/http";

import { ProcessRunner } from "../../processRunner.ts";
import { ServerSettingsService } from "../../serverSettings.ts";
import { WorkspaceEntries } from "../../workspace/WorkspaceEntries.ts";
import { WorkspaceFileSystem } from "../../workspace/WorkspaceFileSystem.ts";
import { makeApiProviderInstance } from "../Layers/ApiProvider.ts";
import { parseOpenRouterModelCatalog } from "../Layers/OpenRouterModelCatalog.ts";
import { ProviderDriverError } from "../Errors.ts";
import type { ProviderDriver } from "../ProviderDriver.ts";

const decodeSettings = (input: unknown): OpenRouterSettings =>
  Schema.decodeUnknownSync(OpenRouterSettings)(input);

const DRIVER_KIND = ProviderDriverKind.make("openrouter");

export type OpenRouterDriverEnv =
  | BackgroundPolicy.BackgroundPolicy
  | Crypto.Crypto
  | HttpClient.HttpClient
  | ProcessRunner
  | ServerSettingsService
  | WorkspaceEntries
  | WorkspaceFileSystem;

export const OpenRouterDriver: ProviderDriver<OpenRouterSettings, OpenRouterDriverEnv> = {
  driverKind: DRIVER_KIND,
  metadata: { displayName: "OpenRouter", supportsMultipleInstances: true },
  configSchema: OpenRouterSettings,
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
        defaultBaseUrl: OPENROUTER_DEFAULT_BASE_URL,
        defaultModel: "openai/gpt-4.1-mini",
        apiKeyLabel: "OpenRouter API Key",
        parseModelCatalog: parseOpenRouterModelCatalog,
        requestHeaders: {
          ...(config.siteUrl ? { "HTTP-Referer": config.siteUrl } : {}),
          ...(config.appName ? { "X-Title": config.appName } : {}),
        },
      }).pipe(
        Effect.mapError(
          (cause) =>
            new ProviderDriverError({
              driver: DRIVER_KIND,
              instanceId,
              detail: `Failed to build OpenRouter provider: ${cause instanceof Error ? cause.message : String(cause)}`,
              cause,
            }),
        ),
      ),
};
