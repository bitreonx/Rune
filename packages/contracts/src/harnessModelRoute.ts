import * as Schema from "effect/Schema";

import { ProviderDriverKind, ProviderInstanceId } from "./providerInstance.ts";
import { TrimmedNonEmptyString } from "./baseSchemas.ts";

/**
 * How RUNE will connect a selected harness to the selected model service.
 *
 * This is deliberately a public, secret-free decision. Credentials, bridge
 * endpoints, and generated environment variables stay inside the server
 * runtime boundary.
 */
export const HarnessModelRouteKind = Schema.Literals([
  "native",
  "service-compatible",
  "rune-bridge",
]);
export type HarnessModelRouteKind = typeof HarnessModelRouteKind.Type;

export const HarnessModelRouteProtocolFamily = Schema.Literals([
  "anthropic-messages",
  "openai-responses",
  "openai-compatible",
  "native",
]);
export type HarnessModelRouteProtocolFamily = typeof HarnessModelRouteProtocolFamily.Type;

export const HarnessModelRouteCapabilities = Schema.Struct({
  streaming: Schema.Boolean,
  tools: Schema.Boolean,
  images: Schema.Boolean,
  usage: Schema.Boolean,
  reasoningEffort: Schema.Boolean,
});
export type HarnessModelRouteCapabilities = typeof HarnessModelRouteCapabilities.Type;

export const HarnessModelSubagentPolicy = Schema.Literals([
  "inherit",
  "native-default",
  "explicit",
]);
export type HarnessModelSubagentPolicy = typeof HarnessModelSubagentPolicy.Type;

export const HarnessModelRoutePlan = Schema.Struct({
  harness: ProviderDriverKind,
  instanceId: ProviderInstanceId,
  connectionId: Schema.optionalKey(TrimmedNonEmptyString),
  requestedModel: TrimmedNonEmptyString,
  routeKind: HarnessModelRouteKind,
  protocolFamily: HarnessModelRouteProtocolFamily,
  bridgeRequired: Schema.Boolean,
  subagentModelPolicy: HarnessModelSubagentPolicy,
  capabilities: HarnessModelRouteCapabilities,
});
export type HarnessModelRoutePlan = typeof HarnessModelRoutePlan.Type;

/** A user-actionable result when no safe route can be compiled. */
export const HarnessModelRouteUnsupported = Schema.Struct({
  tag: Schema.Literal("unsupported"),
  reason: TrimmedNonEmptyString,
});
export type HarnessModelRouteUnsupported = typeof HarnessModelRouteUnsupported.Type;

export const HarnessModelRouteDecision = Schema.Union([
  Schema.Struct({ tag: Schema.Literal("planned"), plan: HarnessModelRoutePlan }),
  HarnessModelRouteUnsupported,
]);
export type HarnessModelRouteDecision = typeof HarnessModelRouteDecision.Type;
