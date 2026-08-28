import * as Schema from "effect/Schema";

import { IsoDateTime, TrimmedNonEmptyString } from "./baseSchemas.ts";

/** Stable identity for one discovered skill revision. */
export const SkillId = TrimmedNonEmptyString.pipe(Schema.brand("SkillId"));
export type SkillId = typeof SkillId.Type;

export const SkillScope = Schema.Literals(["project", "repo", "personal", "app", "system"]);
export type SkillScope = typeof SkillScope.Type;

/** Metadata sent to clients. Source paths and bodies stay server-side. */
export const SkillRegistrySkill = Schema.Struct({
  id: SkillId,
  name: TrimmedNonEmptyString,
  description: Schema.String,
  version: Schema.Int,
  source: TrimmedNonEmptyString,
  sourceAdapter: TrimmedNonEmptyString,
  scope: SkillScope,
  explicitOnly: Schema.Boolean,
  aliases: Schema.Array(TrimmedNonEmptyString),
  requiredTools: Schema.Array(TrimmedNonEmptyString),
  optionalTools: Schema.Array(TrimmedNonEmptyString),
  references: Schema.Array(TrimmedNonEmptyString),
  scripts: Schema.Array(TrimmedNonEmptyString),
  assets: Schema.Array(TrimmedNonEmptyString),
  license: Schema.optional(TrimmedNonEmptyString),
  compatibility: Schema.Array(TrimmedNonEmptyString),
  dependencies: Schema.Array(TrimmedNonEmptyString),
  contentHash: TrimmedNonEmptyString,
  enabled: Schema.Boolean,
  lastUsedAt: Schema.NullOr(IsoDateTime),
});
export type SkillRegistrySkill = typeof SkillRegistrySkill.Type;

export const SkillRegistrySnapshot = Schema.Struct({
  version: Schema.Int,
  skills: Schema.Array(SkillRegistrySkill),
});
export type SkillRegistrySnapshot = typeof SkillRegistrySnapshot.Type;

export const SkillBodyResult = Schema.Struct({
  id: SkillId,
  contentHash: TrimmedNonEmptyString,
  body: Schema.String,
});
export type SkillBodyResult = typeof SkillBodyResult.Type;

export const SkillRegistryErrorKind = Schema.Literals([
  "not-found",
  "invalid-source",
  "read-failed",
  "discovery-failed",
]);
export type SkillRegistryErrorKind = typeof SkillRegistryErrorKind.Type;

export class SkillRegistryError extends Schema.TaggedErrorClass<SkillRegistryError>()(
  "SkillRegistryError",
  {
    kind: SkillRegistryErrorKind,
    message: TrimmedNonEmptyString,
  },
) {}

export const SkillRegistryListInput = Schema.Struct({});
export type SkillRegistryListInput = typeof SkillRegistryListInput.Type;
export const SkillRegistryRefreshInput = Schema.Struct({});
export type SkillRegistryRefreshInput = typeof SkillRegistryRefreshInput.Type;
export const SkillGetBodyInput = Schema.Struct({ id: SkillId });
export type SkillGetBodyInput = typeof SkillGetBodyInput.Type;
