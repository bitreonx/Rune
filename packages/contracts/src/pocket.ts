import * as Schema from "effect/Schema";

import {
  EnvironmentId,
  IsoDateTime,
  NonNegativeInt,
  ProjectId,
  ThreadId,
  TrimmedNonEmptyString,
} from "./baseSchemas.ts";

const boundedName = TrimmedNonEmptyString.check(Schema.isMaxLength(120));
const boundedFilePath = TrimmedNonEmptyString.check(Schema.isMaxLength(1024)).check(
  Schema.isPattern(/^(?![\\/])(?![A-Za-z]:[\\/])(?!.*(?:^|[\\/])\.\.(?:[\\/]|$))/),
);
const boundedOrderKey = TrimmedNonEmptyString.check(Schema.isMaxLength(128));

export const PocketId = TrimmedNonEmptyString.pipe(Schema.brand("PocketId"));
export type PocketId = typeof PocketId.Type;

export const PocketFileReferenceKind = Schema.Literal("reference");
export type PocketFileReferenceKind = typeof PocketFileReferenceKind.Type;

export const RunePocket = Schema.Struct({
  id: PocketId,
  title: boundedName,
  icon: Schema.optionalKey(Schema.String),
  parentPocketId: Schema.NullOr(PocketId),
  projectId: Schema.optionalKey(ProjectId),
  environmentId: Schema.optionalKey(EnvironmentId),
  orderKey: boundedOrderKey,
  archivedAt: Schema.optionalKey(Schema.NullOr(IsoDateTime)),
  trashedAt: Schema.optionalKey(Schema.NullOr(IsoDateTime)),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type RunePocket = typeof RunePocket.Type;

export const PocketThreadMembership = Schema.Struct({
  pocketId: PocketId,
  threadId: ThreadId,
  orderKey: boundedOrderKey,
});
export type PocketThreadMembership = typeof PocketThreadMembership.Type;

export const PocketFileReference = Schema.Struct({
  pocketId: PocketId,
  environmentId: EnvironmentId,
  relativePath: boundedFilePath,
  kind: PocketFileReferenceKind,
});
export type PocketFileReference = typeof PocketFileReference.Type;

export const PocketSnapshot = Schema.Struct({
  revision: NonNegativeInt,
  pockets: Schema.Array(RunePocket),
  threadMemberships: Schema.Array(PocketThreadMembership),
  fileReferences: Schema.Array(PocketFileReference),
});
export type PocketSnapshot = typeof PocketSnapshot.Type;

const pocketCreateCommand = Schema.Struct({
  type: Schema.Literal("pocket.create"),
  pocket: RunePocket,
});

export const PocketCommand = Schema.Union([
  pocketCreateCommand,
  Schema.Struct({ type: Schema.Literal("pocket.rename"), pocketId: PocketId, title: boundedName }),
  Schema.Struct({
    type: Schema.Literal("pocket.move"),
    pocketId: PocketId,
    parentPocketId: Schema.NullOr(PocketId),
    orderKey: boundedOrderKey,
  }),
  Schema.Struct({ type: Schema.Literal("pocket.archive"), pocketId: PocketId }),
  Schema.Struct({ type: Schema.Literal("pocket.trash"), pocketId: PocketId }),
  Schema.Struct({ type: Schema.Literal("pocket.restore"), pocketId: PocketId }),
  Schema.Struct({ type: Schema.Literal("pocket.delete"), pocketId: PocketId }),
  Schema.Struct({
    type: Schema.Literal("pocket.thread-added"),
    pocketId: PocketId,
    threadId: ThreadId,
    orderKey: boundedOrderKey,
  }),
  Schema.Struct({
    type: Schema.Literal("pocket.thread-removed"),
    pocketId: PocketId,
    threadId: ThreadId,
  }),
  Schema.Struct({
    type: Schema.Literal("pocket.thread-reordered"),
    pocketId: PocketId,
    threadId: ThreadId,
    orderKey: boundedOrderKey,
  }),
  Schema.Struct({
    type: Schema.Literal("pocket.file-referenced"),
    pocketId: PocketId,
    environmentId: EnvironmentId,
    relativePath: boundedFilePath,
  }),
  Schema.Struct({
    type: Schema.Literal("pocket.file-unreferenced"),
    pocketId: PocketId,
    environmentId: EnvironmentId,
    relativePath: boundedFilePath,
  }),
]);
export type PocketCommand = typeof PocketCommand.Type;

export const PocketEvent = Schema.Union([
  Schema.Struct({
    type: Schema.Literal("pocket.created"),
    eventId: TrimmedNonEmptyString,
    sequence: NonNegativeInt,
    occurredAt: IsoDateTime,
    pocket: RunePocket,
  }),
  Schema.Struct({
    type: Schema.Literal("pocket.renamed"),
    eventId: TrimmedNonEmptyString,
    sequence: NonNegativeInt,
    occurredAt: IsoDateTime,
    pocketId: PocketId,
    title: boundedName,
  }),
  Schema.Struct({
    type: Schema.Literal("pocket.moved"),
    eventId: TrimmedNonEmptyString,
    sequence: NonNegativeInt,
    occurredAt: IsoDateTime,
    pocketId: PocketId,
    parentPocketId: Schema.NullOr(PocketId),
    orderKey: boundedOrderKey,
  }),
  Schema.Struct({
    type: Schema.Literal("pocket.archived"),
    eventId: TrimmedNonEmptyString,
    sequence: NonNegativeInt,
    occurredAt: IsoDateTime,
    pocketId: PocketId,
    archivedAt: IsoDateTime,
  }),
  Schema.Struct({
    type: Schema.Literal("pocket.trashed"),
    eventId: TrimmedNonEmptyString,
    sequence: NonNegativeInt,
    occurredAt: IsoDateTime,
    pocketId: PocketId,
    trashedAt: IsoDateTime,
  }),
  Schema.Struct({
    type: Schema.Literal("pocket.restored"),
    eventId: TrimmedNonEmptyString,
    sequence: NonNegativeInt,
    occurredAt: IsoDateTime,
    pocketId: PocketId,
  }),
  Schema.Struct({
    type: Schema.Literal("pocket.deleted"),
    eventId: TrimmedNonEmptyString,
    sequence: NonNegativeInt,
    occurredAt: IsoDateTime,
    pocketId: PocketId,
  }),
  Schema.Struct({
    type: Schema.Literal("pocket.thread-added"),
    eventId: TrimmedNonEmptyString,
    sequence: NonNegativeInt,
    occurredAt: IsoDateTime,
    pocketId: PocketId,
    threadId: ThreadId,
    orderKey: boundedOrderKey,
  }),
  Schema.Struct({
    type: Schema.Literal("pocket.thread-removed"),
    eventId: TrimmedNonEmptyString,
    sequence: NonNegativeInt,
    occurredAt: IsoDateTime,
    pocketId: PocketId,
    threadId: ThreadId,
  }),
  Schema.Struct({
    type: Schema.Literal("pocket.thread-reordered"),
    eventId: TrimmedNonEmptyString,
    sequence: NonNegativeInt,
    occurredAt: IsoDateTime,
    pocketId: PocketId,
    threadId: ThreadId,
    orderKey: boundedOrderKey,
  }),
  Schema.Struct({
    type: Schema.Literal("pocket.file-referenced"),
    eventId: TrimmedNonEmptyString,
    sequence: NonNegativeInt,
    occurredAt: IsoDateTime,
    pocketId: PocketId,
    environmentId: EnvironmentId,
    relativePath: boundedFilePath,
    kind: PocketFileReferenceKind,
  }),
  Schema.Struct({
    type: Schema.Literal("pocket.file-unreferenced"),
    eventId: TrimmedNonEmptyString,
    sequence: NonNegativeInt,
    occurredAt: IsoDateTime,
    pocketId: PocketId,
    environmentId: EnvironmentId,
    relativePath: boundedFilePath,
  }),
]);
export type PocketEvent = typeof PocketEvent.Type;
type WithoutSequence<T> = T extends { readonly sequence: number } ? Omit<T, "sequence"> : never;
export type PocketEventInput = WithoutSequence<PocketEvent>;

export const PocketImportInput = Schema.Struct({
  snapshot: Schema.Struct({
    pockets: Schema.Array(RunePocket),
    threadMemberships: Schema.Array(PocketThreadMembership),
    fileReferences: Schema.Array(PocketFileReference),
  }),
});
export type PocketImportInput = typeof PocketImportInput.Type;

export const PocketOperationCode = Schema.Literals([
  "invalid-command",
  "not-found",
  "conflict",
  "persistence",
]);
export type PocketOperationCode = typeof PocketOperationCode.Type;

export class PocketOperationError extends Schema.TaggedErrorClass<PocketOperationError>()(
  "PocketOperationError",
  {
    code: PocketOperationCode,
    operation: TrimmedNonEmptyString,
    message: TrimmedNonEmptyString,
    cause: Schema.optional(Schema.Defect()),
  },
) {}
