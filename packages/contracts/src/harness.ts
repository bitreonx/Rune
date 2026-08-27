/**
 * Harnesses & Models domain contracts.
 *
 * Defines the four-layer product architecture:
 *   1. Harness (Claude Code, Codex, Cursor, Grok, OpenCode, Antigravity, Rune Native)
 *   2. Profile & Identity (e.g. "Claude via OpenRouter", "Codex Personal Account")
 *   3. Route & Model Service (OpenRouter, Anthropic, OpenAI, Native + default model & role overrides)
 *   4. Compiled Output (Materializes ProviderInstance envelopes for runtime)
 *
 * Forward/backward compatibility:
 *   `HarnessKind`, `ServiceId`, and `ProfileId` are open branded slugs so unknown/fork
 *   entries parse cleanly and degrade gracefully.
 *
 * @module harness
 */
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { TrimmedNonEmptyString, TrimmedString } from "./baseSchemas.ts";
import { ProviderInstanceEnvironment, ProviderInstanceId } from "./providerInstance.ts";

const SLUG_MAX_CHARS = 64;
const SLUG_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

const slugSchema = TrimmedNonEmptyString.check(
  Schema.isMaxLength(SLUG_MAX_CHARS),
  Schema.isPattern(SLUG_PATTERN),
);

/**
 * HarnessRole — execution roles within a harness.
 */
export const HARNESS_ROLES = [
  "main",
  "reasoning",
  "fast",
  "subagent",
  "reviewer",
  "compaction",
] as const;

export const HarnessRole = Schema.Literals(HARNESS_ROLES);
export type HarnessRole = typeof HarnessRole.Type;

/**
 * HarnessKind — branded open slug for coding agent harness implementations.
 */
export const HarnessKind = slugSchema.pipe(Schema.brand("HarnessKind"));
export type HarnessKind = typeof HarnessKind.Type;

const isHarnessKindValue = Schema.is(HarnessKind);
export const isHarnessKind = (value: unknown): value is HarnessKind => isHarnessKindValue(value);

/**
 * ModelServiceKind — types of model providers/gateways.
 */
export const MODEL_SERVICE_KINDS = [
  "native",
  "openrouter",
  "openai",
  "anthropic",
  "google",
  "custom-openai-compatible",
  "custom-anthropic-compatible",
] as const;

export const ModelServiceKind = Schema.Literals(MODEL_SERVICE_KINDS);
export type ModelServiceKind = typeof ModelServiceKind.Type;

/**
 * ServiceId — user-defined routing key for a configured model service.
 */
export const ServiceId = slugSchema.pipe(Schema.brand("ServiceId"));
export type ServiceId = typeof ServiceId.Type;

const isServiceIdValue = Schema.is(ServiceId);
export const isServiceId = (value: unknown): value is ServiceId => isServiceIdValue(value);

/**
 * ProfileId — user-defined routing key for a harness profile.
 */
export const ProfileId = slugSchema.pipe(Schema.brand("ProfileId"));
export type ProfileId = typeof ProfileId.Type;

const isProfileIdValue = Schema.is(ProfileId);
export const isProfileId = (value: unknown): value is ProfileId => isProfileIdValue(value);

/**
 * HarnessCapabilityRoleDescriptor — describes a role supported by a harness.
 */
export const HarnessCapabilityRoleDescriptor = Schema.Struct({
  role: HarnessRole,
  label: Schema.String,
});
export type HarnessCapabilityRoleDescriptor = typeof HarnessCapabilityRoleDescriptor.Type;

/**
 * HarnessCapabilities — dynamic capabilities exposed by a harness.
 */
export const HarnessCapabilities = Schema.Struct({
  canApplyRoutesLive: Schema.Boolean,
  supportsMultipleIdentities: Schema.Boolean,
  supportedServiceKinds: Schema.Array(ModelServiceKind),
  roles: Schema.Array(HarnessCapabilityRoleDescriptor),
});
export type HarnessCapabilities = typeof HarnessCapabilities.Type;

/**
 * HarnessDefinition — metadata and capabilities for a harness.
 */
export const HarnessDefinition = Schema.Struct({
  kind: HarnessKind,
  displayName: Schema.String,
  iconKey: Schema.String,
  tagline: Schema.String,
  capabilities: HarnessCapabilities,
});
export type HarnessDefinition = typeof HarnessDefinition.Type;

/**
 * ModelRoute — routing configuration for a profile.
 */
export const ModelRoute = Schema.Struct({
  modelServiceId: Schema.Union([ServiceId, Schema.Literal("native")]),
  defaultModel: TrimmedNonEmptyString,
  sameModelEverywhere: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(true))),
  roleOverrides: Schema.Record(Schema.String, Schema.String).pipe(
    Schema.withDecodingDefault(Effect.succeed({})),
  ),
});
export type ModelRoute = typeof ModelRoute.Type;

/**
 * ModelServiceStatus — connection / auth status of a model service.
 */
export const MODEL_SERVICE_STATUSES = [
  "connected",
  "needs-auth",
  "unavailable",
  "checking",
] as const;

export const ModelServiceStatus = Schema.Literals(MODEL_SERVICE_STATUSES);
export type ModelServiceStatus = typeof ModelServiceStatus.Type;

/**
 * ModelServiceConfig — configuration for a model service (OpenRouter, API gateway, etc.).
 */
export const ModelServiceConfig = Schema.Struct({
  serviceId: ServiceId,
  kind: ModelServiceKind,
  displayName: TrimmedNonEmptyString,
  baseUrl: Schema.optionalKey(TrimmedString),
  credentialRef: Schema.optionalKey(TrimmedString),
  // Wire projection fields (non-secret state populated for client UI)
  hasCredential: Schema.optionalKey(Schema.Boolean),
  maskedLabel: Schema.optionalKey(Schema.String),
  status: Schema.optionalKey(ModelServiceStatus),
});
export type ModelServiceConfig = typeof ModelServiceConfig.Type;

export const ModelServiceConfigMap = Schema.Record(ServiceId, ModelServiceConfig);
export type ModelServiceConfigMap = typeof ModelServiceConfigMap.Type;

/**
 * HarnessProfileIdentity — account/identity settings for multi-account harnesses (e.g. Codex).
 */
export const HarnessProfileIdentity = Schema.Struct({
  label: TrimmedNonEmptyString,
  accountDisplay: Schema.optionalKey(Schema.String),
  authState: Schema.optionalKey(Schema.String),
  configDir: Schema.optionalKey(Schema.String),
  managedShadowHome: Schema.optionalKey(Schema.String),
});
export type HarnessProfileIdentity = typeof HarnessProfileIdentity.Type;

/**
 * HarnessProfileAdvanced — verbatim passthrough configuration.
 */
export const HarnessProfileAdvanced = Schema.Struct({
  environment: Schema.optionalKey(ProviderInstanceEnvironment),
  configPatch: Schema.optionalKey(Schema.Unknown),
});
export type HarnessProfileAdvanced = typeof HarnessProfileAdvanced.Type;

/**
 * HarnessProfileConfig — user-authored profile configuration.
 */
export const HarnessProfileConfig = Schema.Struct({
  profileId: ProfileId,
  harnessKind: HarnessKind,
  displayName: TrimmedNonEmptyString,
  accentColor: Schema.optionalKey(TrimmedNonEmptyString),
  enabled: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(true))),
  identity: Schema.optionalKey(HarnessProfileIdentity),
  instanceId: ProviderInstanceId,
  route: ModelRoute,
  routeVersion: Schema.Int.pipe(Schema.withDecodingDefault(Effect.succeed(1))),
  advanced: Schema.optionalKey(HarnessProfileAdvanced),
});
export type HarnessProfileConfig = typeof HarnessProfileConfig.Type;

export const HarnessProfileConfigMap = Schema.Record(ProfileId, HarnessProfileConfig);
export type HarnessProfileConfigMap = typeof HarnessProfileConfigMap.Type;

/**
 * HarnessesSettings — Authoring surface container inside ServerSettings.
 */
export const HarnessesSettings = Schema.Struct({
  profiles: HarnessProfileConfigMap.pipe(Schema.withDecodingDefault(Effect.succeed({}))),
  services: ModelServiceConfigMap.pipe(Schema.withDecodingDefault(Effect.succeed({}))),
});
export type HarnessesSettings = typeof HarnessesSettings.Type;

export const DEFAULT_HARNESSES_SETTINGS: HarnessesSettings = {
  profiles: {},
  services: {},
};

/**
 * Catalog of built-in harness definitions.
 */
export const BUILT_IN_HARNESS_DEFINITIONS: ReadonlyArray<HarnessDefinition> = [
  {
    kind: HarnessKind.make("codex"),
    displayName: "Codex",
    iconKey: "codex",
    tagline: "OpenAI Codex coding agent with project and worktree awareness",
    capabilities: {
      canApplyRoutesLive: false,
      supportsMultipleIdentities: true,
      supportedServiceKinds: ["native", "openrouter", "openai", "custom-openai-compatible"],
      roles: [{ role: "main", label: "Main model" }],
    },
  },
  {
    kind: HarnessKind.make("claudeAgent"),
    displayName: "Claude Code",
    iconKey: "claude",
    tagline: "Anthropic Claude Code agent with native tool execution",
    capabilities: {
      canApplyRoutesLive: true,
      supportsMultipleIdentities: true,
      supportedServiceKinds: ["native", "openrouter", "anthropic", "custom-anthropic-compatible"],
      roles: [
        { role: "main", label: "Main model" },
        { role: "reasoning", label: "Reasoning (Opus)" },
        { role: "fast", label: "Fast (Haiku)" },
        { role: "subagent", label: "Subagent" },
      ],
    },
  },
  {
    kind: HarnessKind.make("cursor"),
    displayName: "Cursor Agent",
    iconKey: "cursor",
    tagline: "Cursor CLI agent harness",
    capabilities: {
      canApplyRoutesLive: false,
      supportsMultipleIdentities: false,
      supportedServiceKinds: ["native"],
      roles: [{ role: "main", label: "Main model" }],
    },
  },
  {
    kind: HarnessKind.make("grok"),
    displayName: "Grok",
    iconKey: "grok",
    tagline: "xAI Grok CLI agent harness",
    capabilities: {
      canApplyRoutesLive: false,
      supportsMultipleIdentities: false,
      supportedServiceKinds: ["native"],
      roles: [{ role: "main", label: "Main model" }],
    },
  },
  {
    kind: HarnessKind.make("opencode"),
    displayName: "OpenCode",
    iconKey: "opencode",
    tagline: "OpenCode open source agent harness",
    capabilities: {
      canApplyRoutesLive: false,
      supportsMultipleIdentities: false,
      supportedServiceKinds: ["native"],
      roles: [{ role: "main", label: "Main model" }],
    },
  },
  {
    kind: HarnessKind.make("antigravity"),
    displayName: "Antigravity",
    iconKey: "antigravity",
    tagline: "Google Antigravity agent harness",
    capabilities: {
      canApplyRoutesLive: false,
      supportsMultipleIdentities: false,
      supportedServiceKinds: ["native"],
      roles: [{ role: "main", label: "Main model" }],
    },
  },
  {
    kind: HarnessKind.make("runeNative"),
    displayName: "Rune Native",
    iconKey: "rune",
    tagline: "RUNE native agent loop using direct LLM APIs",
    capabilities: {
      canApplyRoutesLive: true,
      supportsMultipleIdentities: false,
      supportedServiceKinds: [
        "openrouter",
        "openai",
        "anthropic",
        "google",
        "custom-openai-compatible",
      ],
      roles: [
        { role: "main", label: "Main model" },
        { role: "fast", label: "Fast model" },
        { role: "subagent", label: "Subagent model" },
      ],
    },
  },
];

export const getHarnessDefinition = (kind: string): HarnessDefinition | undefined => {
  return BUILT_IN_HARNESS_DEFINITIONS.find((def) => def.kind === kind);
};
