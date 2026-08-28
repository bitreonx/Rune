import type { Claim, ClaimDigest } from "@rune/contracts";

/**
 * The read path is pure: these functions never touch a model, a database, or
 * the event stream. FTS5 supplies the lexical feature (BM25); everything else
 * is computed here from the claim rows and the active request. Shipped v1
 * weights — the single tunable source of truth lives here.
 */
export const RANKING_WEIGHTS = {
  lexical: 0.4,
  refOverlap: 0.25,
  recency: 0.15,
  verification: 0.1,
  kindBonus: 0.1,
} as const;

export const STALE_MULTIPLIER = 0.5;
export const SUPERSEDED_MULTIPLIER = 0.7;
export const CONFIDENT_CLAIM_THRESHOLD = 0.6;

/** Claims that are both stale and superseded are doubly bad: hidden by
 * default, still expandable on request. */
export const isDoublyBad = (claim: Claim): boolean =>
  claim.invalidation.stale && claim.invalidation.supersededBy !== undefined;

const KIND_BONUS: Record<Claim["kind"], number> = {
  decision: 1,
  avoidance: 1,
  instruction: 0.75,
  finding: 0.5,
  test_result: 0.5,
  pattern: 0.25,
  file: 0,
};

const tokenize = (value: string): ReadonlyArray<string> =>
  value
    .toLowerCase()
    .split(/[^a-z0-9_.\\/-]+/)
    .filter((token) => token.length >= 2);

const normalizePath = (path: string): string => {
  const withSlashes = path.replace(/\\/g, "/").toLowerCase();
  return withSlashes.startsWith("./") ? withSlashes.slice(2) : withSlashes;
};

const pathMatches = (claimPath: string, activePaths: ReadonlySet<string>): boolean => {
  const claim = normalizePath(claimPath);
  for (const active of activePaths) {
    const normalized = normalizePath(active);
    if (normalized === claim || normalized.endsWith(`/${claim}`) || claim.endsWith(`/${normalized}`)) {
      return true;
    }
  }
  return false;
};

const lexicalOverlap = (queryTokens: ReadonlySet<string>, claimTokens: ReadonlySet<string>) => {
  if (queryTokens.size === 0) return 0;
  let hits = 0;
  for (const token of queryTokens) {
    if (claimTokens.has(token)) hits += 1;
  }
  return hits / queryTokens.size;
};

/** Read refs are weaker evidence than edit refs — half weight. */
const REF_WEIGHT = { edit: 1, read: 0.5 } as const;

const refOverlap = (claim: Claim, activeFiles: ReadonlySet<string>): number => {
  let refCount = 0;
  let hits = 0;
  for (const ref of claim.refs) {
    if (ref.kind !== "file" && ref.kind !== "file_read") continue;
    refCount += 1;
    if (!pathMatches(ref.value, activeFiles)) continue;
    hits += ref.kind === "file" ? REF_WEIGHT.edit : REF_WEIGHT.read;
  }
  return refCount === 0 ? 0 : hits / refCount;
};

const recency = (extractedAt: number, now: number): number => {
  const ageDays = Math.max(0, (now - extractedAt) / 86_400_000);
  return Math.exp(-ageDays / 90);
};

const verification = (claim: Claim): number => {
  if (claim.kind !== "test_result") return 0;
  if (claim.verified === true) return 1;
  if (claim.verified === false) return -1;
  return 0;
};

export interface RankedClaim {
  readonly claim: Claim;
  readonly score: number;
}

export interface RankClaimsInput {
  readonly query: string;
  /** Files the active request names: composer mentions, attachments, and the
   * active thread's recent file activity. */
  readonly activeFiles: ReadonlySet<string>;
  readonly claims: ReadonlyArray<Claim>;
  readonly now: number;
  /** BM25 rank per claim id from the FTS layer. Higher is better; when absent
   * the ranker falls back to plain token overlap. */
  readonly bm25?: ReadonlyMap<string, number>;
}

export const rankClaims = (input: RankClaimsInput): ReadonlyArray<RankedClaim> => {
  const queryTokens = new Set(tokenize(input.query));
  const maxBm25 = input.bm25 ? Math.max(0, ...input.bm25.values()) : 0;

  const ranked = input.claims.map((claim) => {
    const claimTokens = new Set(
      tokenize(
        [claim.text, ...claim.refs.map((ref) => ref.value)].join(" "),
      ),
    );
    const providedBm25 = input.bm25?.get(claim.id) ?? 0;
    const lexical =
      input.bm25 && maxBm25 > 0 ? providedBm25 / (providedBm25 + 1) : lexicalOverlap(queryTokens, claimTokens);

    const score =
      RANKING_WEIGHTS.lexical * lexical +
      RANKING_WEIGHTS.refOverlap * refOverlap(claim, input.activeFiles) +
      RANKING_WEIGHTS.recency * recency(claim.extractedAt, input.now) +
      RANKING_WEIGHTS.verification * verification(claim) +
      RANKING_WEIGHTS.kindBonus * KIND_BONUS[claim.kind];

    let multiplier = 1;
    if (claim.invalidation.stale) multiplier *= STALE_MULTIPLIER;
    if (claim.invalidation.supersededBy !== undefined) multiplier *= SUPERSEDED_MULTIPLIER;

    return { claim, score: score * multiplier };
  });

  return ranked.sort((left, right) => right.score - left.score);
};

/** Deterministic ~4 chars/token approximation, adequate for budget fitting —
 * the delivered `tokenCount` fields are advisory, not billing. */
export const estimateTokens = (text: string): number =>
  Math.max(1, Math.ceil(text.length / 4));

export const toClaimDigest = (claim: Claim): ClaimDigest => ({
  id: claim.id,
  kind: claim.kind,
  text: claim.text,
  refs: claim.refs,
  confidence: claim.confidence,
  ...(claim.verified === undefined ? {} : { verified: claim.verified }),
  invalidation: {
    stale: claim.invalidation.stale,
    ...(claim.invalidation.supersededBy === undefined
      ? {}
      : { supersededBy: claim.invalidation.supersededBy }),
  },
  expandHint: { messageId: claim.messageIds[0] ?? ("" as Claim["messageIds"][number]) },
});

const digestTokens = (claim: Claim): number =>
  estimateTokens(claim.text + claim.refs.map((ref) => ref.value).join(" "));

export interface SelectedClaim {
  readonly digest: ClaimDigest;
  readonly lowConfidence: boolean;
  readonly tokens: number;
}

export interface FitCapsuleInput {
  /** Sorted by score descending, as `rankClaims` returns. */
  readonly ranked: ReadonlyArray<RankedClaim>;
  readonly budgetTokens: number;
}

export interface FittedCapsule {
  readonly selected: ReadonlyArray<SelectedClaim>;
  readonly totalTokens: number;
  /** True when even the mandatory top claim could not fit: the caller reports
   * "would exceed the context budget" instead of silently truncating. */
  readonly exceeded: boolean;
}

/**
 * Selection rules, in order: the top claim always ships (a visible anchor,
 * even at low confidence); remaining budget fills with confident claims; then
 * the rest, marked `lowConfidence` so the agent can discount. Doubly-bad
 * claims never ship by default.
 */
export const fitCapsule = (input: FitCapsuleInput): FittedCapsule => {
  const candidates = input.ranked.filter(({ claim }) => !isDoublyBad(claim));
  if (candidates.length === 0) {
    return { selected: [], totalTokens: 0, exceeded: false };
  }

  const [first, ...rest] = candidates;
  if (first === undefined) {
    return { selected: [], totalTokens: 0, exceeded: false };
  }
  const topTokens = digestTokens(first.claim);
  if (topTokens > input.budgetTokens) {
    return { selected: [], totalTokens: 0, exceeded: true };
  }

  const selected: Array<SelectedClaim> = [
    { digest: toClaimDigest(first.claim), lowConfidence: first.claim.confidence < CONFIDENT_CLAIM_THRESHOLD, tokens: topTokens },
  ];
  let totalTokens = topTokens;

  for (const pass of ["confident", "rest"] as const) {
    for (const { claim } of rest) {
      if (pass === "confident" && claim.confidence < CONFIDENT_CLAIM_THRESHOLD) continue;
      if (pass === "rest" && claim.confidence >= CONFIDENT_CLAIM_THRESHOLD) continue;
      const tokens = digestTokens(claim);
      if (totalTokens + tokens > input.budgetTokens) continue;
      selected.push({
        digest: toClaimDigest(claim),
        lowConfidence: claim.confidence < CONFIDENT_CLAIM_THRESHOLD,
        tokens,
      });
      totalTokens += tokens;
    }
  }

  return { selected, totalTokens, exceeded: false };
};
