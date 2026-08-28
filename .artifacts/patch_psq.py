import io

p = r"D:\Apps\Rune\apps\server\src\orchestration\Layers\ProjectionSnapshotQuery.ts"
s = io.open(p, encoding="utf-8").read()

s = s.replace(
    "import {\n  MessageId,",
    "import {\n  CapsulePreviewResponse,\n  Claim,\n  ClaimId,\n  ClaimRef as CrossThreadClaimRef,\n  ExpandResponse,\n  MessageId,",
    1,
)

s = s.replace(
    'import * as Layer from "effect/Layer";',
    'import * as Layer from "effect/Layer";\n'
    'import { estimateTokens, fitCapsule, rankClaims } from "../../crossThread/capsuleRanking.ts";',
    1,
)

IMPL = """
  // ---- Cross-thread intelligence reads ----
  // Claims live in projection_claims (+ projection_claims_search FTS5), both
  // written by the ClaimExtractor reactor. The read path is pure SQL + the
  // pure ranker in crossThread/capsuleRanking.ts - no model calls.

  const decodeClaimRow = (row: {
    readonly claimId: string;
    readonly threadId: string;
    readonly turnId: string;
    readonly messageIdsJson: string;
    readonly kind: string;
    readonly text: string;
    readonly refsJson: string;
    readonly confidence: number;
    readonly verified: number | null;
    readonly extractionModel: string;
    readonly extractedAt: number;
    readonly stale: number;
    readonly supersededBy: string | null;
    readonly invalidationReason: string | null;
  }): Claim => ({
    id: ClaimId.make(row.claimId),
    threadId: row.threadId as Claim["threadId"],
    turnId: row.turnId as Claim["turnId"],
    messageIds: JSON.parse(row.messageIdsJson),
    kind: row.kind as Claim["kind"],
    text: row.text,
    refs: JSON.parse(row.refsJson) as ReadonlyArray<CrossThreadClaimRef>,
    confidence: row.confidence,
    ...(row.verified === null ? {} : { verified: row.verified === 1 }),
    extractionModel: row.extractionModel,
    extractedAt: row.extractedAt,
    invalidation: {
      stale: row.stale === 1,
      ...(row.supersededBy === null ? {} : { supersededBy: ClaimId.make(row.supersededBy) }),
      ...(row.invalidationReason === null ? {} : { reason: row.invalidationReason }),
    },
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
    `;

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
    `;
    return {
      matches: rows.map((row) => ({
        threadId: row.threadId as ThreadPickerEntry["threadId"],
        projectId: row.projectId as ThreadPickerEntry["projectId"],
        title: row.title,
        harness: row.harness ?? "unknown",
        updatedAt: row.updatedAt,
      })),
    };
  });

  const fetchRankedClaims = Effect.fn("ProjectionSnapshotQuery.fetchRankedClaims")(function* (
    input: {
      readonly sourceThreadId: ThreadId;
      readonly query: string;
    },
  ) {
    const rows = yield* sql<{
      readonly claimId: string;
      readonly threadId: string;
      readonly turnId: string;
      readonly messageIdsJson: string;
      readonly kind: string;
      readonly text: string;
      readonly refsJson: string;
      readonly confidence: number;
      readonly verified: number | null;
      readonly extractionModel: string;
      readonly extractedAt: number;
      readonly stale: number;
      readonly supersededBy: string | null;
      readonly invalidationReason: string | null;
      readonly bm25: number | null;
    }>`
      SELECT
        c.claim_id AS "claimId",
        c.thread_id AS "threadId",
        c.turn_id AS "turnId",
        c.message_ids_json AS "messageIdsJson",
        c.kind AS "kind",
        c.text AS "text",
        c.refs_json AS "refsJson",
        c.confidence AS "confidence",
        c.verified AS "verified",
        c.extraction_model AS "extractionModel",
        c.extracted_at AS "extractedAt",
        c.stale AS "stale",
        c.superseded_by AS "supersededBy",
        c.invalidation_reason AS "invalidationReason",
        (SELECT rank FROM (
          SELECT claim_id, rank FROM projection_claims_search
          WHERE projection_claims_search MATCH ${input.query === "" ? "''" : input.query}
          ORDER BY rank
        ) m WHERE m.claim_id = c.claim_id) AS "bm25"
      FROM projection_claims c
      WHERE c.thread_id = ${input.sourceThreadId}
    `;
    const claims = rows.map(decodeClaimRow);
    // FTS5 rank is smaller-is-better; negate so the pure ranker's
    // larger-is-better assumption holds.
    const bm25 = new Map<string, number>();
    for (const row of rows) {
      if (row.bm25 !== null) bm25.set(row.claimId, -row.bm25);
    }
    return rankClaims({
      query: input.query,
      activeFiles: new Set(),
      claims,
      now: Date.now(),
      bm25,
    });
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
      return yield* new ProjectionSnapshotQueryCrossThreadError({ message: "Thread not found" });
    }
    if (activeRow.projectId !== sourceRow.projectId) {
      return yield* new ProjectionSnapshotQueryCrossThreadError({
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
      return yield* new ProjectionSnapshotQueryCrossThreadError({ message: "Thread not found" });
    }
    if (activeRow.projectId !== sourceRow.projectId) {
      return yield* new ProjectionSnapshotQueryCrossThreadError({
        message: "Referenced thread is in a different project",
      });
    }
    const rawRows = yield* sql<{ readonly rawPayloadJson: string | null }>`
      SELECT raw_payload_json AS "rawPayloadJson"
      FROM projection_message_raw
      WHERE message_id = ${input.messageId}
    `;
    const messageRows = yield* sql<{ readonly text: string }>`
      SELECT text FROM projection_thread_messages
      WHERE message_id = ${input.messageId} AND thread_id = ${input.sourceThreadId}
    `;
    const messageRow = messageRows[0];
    if (messageRow === undefined) {
      return yield* new ProjectionSnapshotQueryCrossThreadError({
        message: "Source message not found",
      });
    }
    const payload = rawRows[0]?.rawPayloadJson ?? null;
    return {
      threadId: input.sourceThreadId,
      threadHarness: sourceRow.harness ?? "unknown",
      rawEvent: payload === null ? null : (JSON.parse(payload) as unknown),
      text: messageRow.text,
      degraded: payload === null,
      tokenCount: estimateTokens(messageRow.text),
      claimIdsCovered: [],
    };
  });

"""

anchor = "  return {\n    getCommandReadModel,"
assert anchor in s
s = s.replace(anchor, IMPL + anchor, 1)

ret_anchor = "    searchThreads,\n"
assert ret_anchor in s
s = s.replace(
    ret_anchor,
    "    searchThreads,\n    listThreadsForPicker,\n    capsulePreview,\n    capsuleExpand,\n",
    1,
)

# error class + ThreadPickerEntry import
s = s.replace(
    "  ExpandResponse,\n  MessageId,",
    "  ExpandResponse,\n  MessageId,\n  ThreadPickerEntry,",
    1,
)
err_cls = """
/**
 * Raised for cross-thread boundary violations (cross-project reference,
 * missing source thread) on top of the repository error channel so ws.ts can
 * map it onto the wire CrossThreadError.
 */
export class ProjectionSnapshotQueryCrossThreadError extends Schema.TaggedErrorClass<ProjectionSnapshotQueryCrossThreadError>()(
  "ProjectionSnapshotQueryCrossThreadError",
  {
    message: Schema.String,
  },
) {}
"""
s = s.rstrip() + "\n" + err_cls
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("ok")
