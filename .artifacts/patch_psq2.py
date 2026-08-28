import io

p = r"D:\Apps\Rune\apps\server\src\orchestration\Layers\ProjectionSnapshotQuery.ts"
s = io.open(p, encoding="utf-8").read()

start = s.index("  // ---- Cross-thread intelligence reads ----")
end = s.index("  return {\n    getCommandReadModel,")
new_block = '''  // ---- Cross-thread intelligence reads ----
  // Claims live in projection_claims (+ projection_claims_search FTS5), both
  // written by the ClaimExtractor reactor. The read path is pure SQL + the
  // pure ranker in crossThread/capsuleRanking.ts — no model calls.

  const CrossThreadClaimRowSchema = Schema.Struct({
    claimId: ClaimId,
    threadId: ThreadId,
    turnId: TurnId,
    messageIds: Schema.fromJsonString(Schema.Array(MessageId)),
    kind: CrossThreadClaimKind,
    text: Schema.String,
    refs: Schema.fromJsonString(Schema.Array(CrossThreadClaimRef)),
    confidence: Schema.Number,
    verified: Schema.NullOr(Schema.Number),
    extractionModel: Schema.String,
    extractedAt: Schema.Number,
    stale: Schema.Number,
    supersededBy: Schema.NullOr(ClaimId),
    invalidationReason: Schema.NullOr(Schema.String),
    bm25: Schema.NullOr(Schema.Number),
  });

  const decodeClaimRow = (row: typeof CrossThreadClaimRowSchema.Type): Claim => ({
    id: row.claimId,
    threadId: row.threadId,
    turnId: row.turnId,
    messageIds: row.messageIds,
    kind: row.kind,
    text: row.text,
    refs: row.refs,
    confidence: row.confidence,
    ...(row.verified === null ? {} : { verified: row.verified === 1 }),
    extractionModel: row.extractionModel,
    extractedAt: row.extractedAt,
    invalidation: {
      stale: row.stale === 1,
      ...(row.supersededBy === null ? {} : { supersededBy: row.supersededBy }),
      ...(row.invalidationReason === null ? {} : { reason: row.invalidationReason }),
    },
  });

  const claimRowColumns = sql`
    SELECT
      c.claim_id AS "claimId",
      c.thread_id AS "threadId",
      c.turn_id AS "turnId",
      c.message_ids_json AS "messageIds",
      c.kind AS "kind",
      c.text AS "text",
      c.refs_json AS "refs",
      c.confidence AS "confidence",
      c.verified AS "verified",
      c.extraction_model AS "extractionModel",
      c.extracted_at AS "extractedAt",
      c.stale AS "stale",
      c.superseded_by AS "supersededBy",
      c.invalidation_reason AS "invalidationReason"
  `;

  const listClaimRowsUnranked = SqlSchema.findAll({
    Request: Schema.Struct({ sourceThreadId: ThreadId }),
    Result: CrossThreadClaimRowSchema,
    execute: ({ sourceThreadId }) =>
      claimRowColumns.append(sql`
        FROM projection_claims c
        WHERE c.thread_id = ${sourceThreadId}
      `),
  });

  const listClaimRowsBm25 = SqlSchema.findAll({
    Request: Schema.Struct({ sourceThreadId: ThreadId, pattern: Schema.String }),
    Result: CrossThreadClaimRowSchema,
    execute: ({ sourceThreadId, pattern }) =>
      sql`
        SELECT
          c.claim_id AS "claimId",
          c.thread_id AS "threadId",
          c.turn_id AS "turnId",
          c.message_ids_json AS "messageIds",
          c.kind AS "kind",
          c.text AS "text",
          c.refs_json AS "refs",
          c.confidence AS "confidence",
          c.verified AS "verified",
          c.extraction_model AS "extractionModel",
          c.extracted_at AS "extractedAt",
          c.stale AS "stale",
          c.superseded_by AS "supersededBy",
          c.invalidation_reason AS "invalidationReason",
          f.rank AS "bm25"
        FROM projection_claims c
        LEFT JOIN (
          SELECT claim_id, rank FROM projection_claims_search
          WHERE projection_claims_search MATCH ${pattern}
        ) f ON f.claim_id = c.claim_id
        WHERE c.thread_id = ${sourceThreadId}
      `,
  });

  const fetchRankedClaims = Effect.fn("ProjectionSnapshotQuery.fetchRankedClaims")(function* (
    input: { readonly sourceThreadId: ThreadId; readonly query: string },
  ) {
    const decodeError = toPersistenceSqlOrDecodeError(
      "ProjectionSnapshotQuery.fetchRankedClaims:query",
      "ProjectionSnapshotQuery.fetchRankedClaims:decodeRows",
    );
    // FTS5 phrase-quote the raw composer text so user punctuation is treated
    // literally instead of as query syntax.
    const pattern = `"${input.query.replace(/"/g, '""')}"`;
    const rows = yield* (input.query === ""
      ? listClaimRowsUnranked({ sourceThreadId: input.sourceThreadId })
      : listClaimRowsBm25({ sourceThreadId: input.sourceThreadId, pattern })
    ).pipe(Effect.mapError(decodeError));
    // FTS5 rank is smaller-is-better; negate so the pure ranker's
    // larger-is-better assumption holds.
    const bm25 = new Map<string, number>();
    for (const row of rows) {
      if (row.bm25 !== null) bm25.set(row.claimId, -row.bm25);
    }
    const now = yield* Clock.currentTimeMillis;
    return rankClaims({ query: input.query, activeFiles: new Set(), claims: rows.map(decodeClaimRow), now, bm25 });
  });

  const getThreadRow = (threadId: ThreadId) =>
    sql<{
      readonly threadId: string;
      readonly projectId: string;
      readonly title: string;
      readonly harness: string | null;
      readonly updatedAt: string;
      readonly deletedAt: string | null;
      readonly archivedAt: string | null;
    }>`
      SELECT
        t.thread_id AS "threadId",
        t.project_id AS "projectId",
        t.title AS "title",
        s.provider_name AS "harness",
        t.updated_at AS "updatedAt",
        t.deleted_at AS "deletedAt",
        t.archived_at AS "archivedAt"
      FROM projection_threads t
      LEFT JOIN projection_thread_sessions s ON s.thread_id = t.thread_id
      WHERE t.thread_id = ${threadId}
    `.pipe(Effect.mapError(toPersistenceSqlError("ProjectionSnapshotQuery.getThreadRow:query")));

  const listThreadsForPicker: ProjectionSnapshotQueryShape["listThreadsForPicker"] = Effect.fn(
    "ProjectionSnapshotQuery.listThreadsForPicker",
  )(function* (input) {
    const activeRows = yield* getThreadRow(input.activeThreadId);
    const activeRow = activeRows[0];
    if (activeRow === undefined || activeRow.deletedAt !== null) {
      return { matches: [] };
    }
    const escapedQuery = escapeLikePattern(input.query);
    const rows = yield* sql<{
      readonly threadId: string;
      readonly projectId: string;
      readonly title: string;
      readonly harness: string | null;
      readonly updatedAt: string;
    }>`
      SELECT
        t.thread_id AS "threadId",
        t.project_id AS "projectId",
        t.title AS "title",
        s.provider_name AS "harness",
        t.updated_at AS "updatedAt"
      FROM projection_threads t
      LEFT JOIN projection_thread_sessions s ON s.thread_id = t.thread_id
      WHERE t.project_id = ${activeRow.projectId}
        AND t.thread_id <> ${input.activeThreadId}
        AND t.deleted_at IS NULL
        AND t.archived_at IS NULL
        AND (${input.query} = '' OR t.title LIKE ${"%" + escapedQuery + "%"} ESCAPE '\\')
      ORDER BY t.updated_at DESC
      LIMIT ${input.limit ?? 20}
    `.pipe(
      Effect.mapError(
        toPersistenceSqlError("ProjectionSnapshotQuery.listThreadsForPicker:query"),
      ),
    );
    return {
      matches: rows.map((row) => ({
        threadId: ThreadId.make(row.threadId),
        projectId: ProjectId.make(row.projectId),
        title: row.title,
        harness: row.harness ?? "unknown",
        updatedAt: row.updatedAt,
      })),
    };
  });

  const capsulePreview: ProjectionSnapshotQueryShape["capsulePreview"] = Effect.fn(
    "ProjectionSnapshotQuery.capsulePreview",
  )(function* (input) {
    const [activeRows, sourceRows] = yield* Effect.zip(
      getThreadRow(input.activeThreadId),
      getThreadRow(input.sourceThreadId),
    );
    const activeRow = activeRows[0];
    const sourceRow = sourceRows[0];
    if (activeRow === undefined || sourceRow === undefined) {
      return yield* new ProjectionCrossThreadBoundaryError({ message: "Thread not found" });
    }
    if (activeRow.projectId !== sourceRow.projectId) {
      return yield* new ProjectionCrossThreadBoundaryError({
        message: "Referenced thread is in a different project",
      });
    }
    const ranked = yield* fetchRankedClaims({
      sourceThreadId: input.sourceThreadId,
      query: input.query,
    });
    const fitted = fitCapsule({ ranked, budgetTokens: 2000 });
    return {
      threadId: input.sourceThreadId,
      threadTitle: sourceRow.title,
      claimCount: fitted.selected.length,
      tokenEstimate: fitted.totalTokens,
      topClaimTexts: fitted.selected.slice(0, 3).map((entry) => entry.digest.text),
    };
  });

  const capsuleExpand: ProjectionSnapshotQueryShape["capsuleExpand"] = Effect.fn(
    "ProjectionSnapshotQuery.capsuleExpand",
  )(function* (input) {
    const [activeRows, sourceRows] = yield* Effect.zip(
      getThreadRow(input.activeThreadId),
      getThreadRow(input.sourceThreadId),
    );
    const activeRow = activeRows[0];
    const sourceRow = sourceRows[0];
    if (activeRow === undefined || sourceRow === undefined) {
      return yield* new ProjectionCrossThreadBoundaryError({ message: "Thread not found" });
    }
    if (activeRow.projectId !== sourceRow.projectId) {
      return yield* new ProjectionCrossThreadBoundaryError({
        message: "Referenced thread is in a different project",
      });
    }
    const rawRows = yield* sql<{ readonly rawPayloadJson: string | null }>`
      SELECT raw_payload_json AS "rawPayloadJson"
      FROM projection_message_raw
      WHERE message_id = ${input.messageId}
    `.pipe(
      Effect.mapError(toPersistenceSqlError("ProjectionSnapshotQuery.capsuleExpand:raw")),
    );
    const messageRows = yield* sql<{ readonly text: string }>`
      SELECT text FROM projection_thread_messages
      WHERE message_id = ${input.messageId} AND thread_id = ${input.sourceThreadId}
    `.pipe(
      Effect.mapError(toPersistenceSqlError("ProjectionSnapshotQuery.capsuleExpand:message")),
    );
    const messageRow = messageRows[0];
    if (messageRow === undefined) {
      return yield* new ProjectionCrossThreadBoundaryError({
        message: "Source message not found",
      });
    }
    const payload = rawRows[0]?.rawPayloadJson ?? null;
    return {
      threadId: input.sourceThreadId,
      threadHarness: sourceRow.harness ?? "unknown",
      rawEvent: payload === null ? null : decodeRawPayload(payload),
      text: messageRow.text,
      degraded: payload === null,
      tokenCount: estimateTokens(messageRow.text),
      claimIdsCovered: [],
    };
  });

'''
s = s[:start] + new_block + s[end:]

# imports: Clock, ProjectId, TurnId, ClaimKind alias, decodeRawPayload helper
s = s.replace('import * as Effect from "effect/Effect";',
              'import * as Clock from "effect/Clock";\nimport * as Effect from "effect/Effect";', 1)
s = s.replace("  CapsulePreviewResponse,\n", "  CapsulePreviewResponse,\n  ClaimKind as CrossThreadClaimKind,\n", 1)
s = s.replace("  NonNegativeInt,\n", "  NonNegativeInt,\n  ProjectId,\n  TurnId,\n", 1)

# decodeRawPayload helper at module scope (after imports region) — put near escapeLikePattern
anchor = "function escapeLikePattern(value: string): string {"
helper = '''const decodeRawPayload = (payload: string): unknown => {
  const decoded = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Unknown));
  const result = decoded(payload);
  return result._tag === "Success" ? result.success : null;
};

'''
s = s.replace(anchor, helper + anchor, 1)

# remove now-unused imports if any (claimRowSchema var was replaced; CrossThreadClaimRef used)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("ok")
