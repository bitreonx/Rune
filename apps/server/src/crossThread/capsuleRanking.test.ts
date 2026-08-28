import { describe, expect, it } from "vite-plus/test";

import type { Claim, ClaimId } from "@rune/contracts";

import {
  estimateTokens,
  fitCapsule,
  isDoublyBad,
  rankClaims,
  toClaimDigest,
} from "./capsuleRanking.ts";

const NOW = 1_750_000_000_000;

let nextClaimId = 0;
const makeClaim = (overrides: Partial<Claim> = {}): Claim => {
  nextClaimId += 1;
  return {
    id: `claim-${String(nextClaimId).padStart(4, "0")}` as ClaimId,
    threadId: "thread-source" as Claim["threadId"],
    turnId: "turn-1" as Claim["turnId"],
    messageIds: ["msg-1" as Claim["messageIds"][number]],
    kind: "finding",
    text: "rotating refresh tokens happens in the auth service",
    refs: [],
    confidence: 0.9,
    extractionModel: "test",
    extractedAt: NOW,
    invalidation: { stale: false },
    ...overrides,
  };
};

describe("rankClaims", () => {
  it("ranks lexically overlapping claims above unrelated ones", () => {
    const claims = [
      makeClaim({ text: "the database uses wal mode" }),
      makeClaim({ text: "rotating refresh tokens happens in the auth service" }),
    ];
    const ranked = rankClaims({ query: "how do refresh tokens rotate", activeFiles: new Set(), claims, now: NOW });
    expect(ranked[0]?.claim.text).toBe("rotating refresh tokens happens in the auth service");
  });

  it("applies stale and superseded multipliers", () => {
    const baseline = rankClaims({
      query: "refresh tokens",
      activeFiles: new Set(),
      claims: [makeClaim()],
      now: NOW,
    })[0]?.score ?? 0;
    const stale = rankClaims({
      query: "refresh tokens",
      activeFiles: new Set(),
      claims: [makeClaim({ invalidation: { stale: true } })],
      now: NOW,
    })[0]?.score ?? 0;
    const superseded = rankClaims({
      query: "refresh tokens",
      activeFiles: new Set(),
      claims: [makeClaim({ invalidation: { stale: false, supersededBy: "claim-9999" as ClaimId } })],
      now: NOW,
    })[0]?.score ?? 0;
    expect(stale).toBeCloseTo(baseline * 0.5, 10);
    expect(superseded).toBeCloseTo(baseline * 0.7, 10);
  });

  it("penalizes failed test results and boosts verified ones", () => {
    const failed = rankClaims({
      query: "",
      activeFiles: new Set(),
      claims: [makeClaim({ kind: "test_result", verified: false, text: "auth tests" })],
      now: NOW,
    })[0]?.score ?? 0;
    const verified = rankClaims({
      query: "",
      activeFiles: new Set(),
      claims: [makeClaim({ kind: "test_result", verified: true, text: "auth tests" })],
      now: NOW,
    })[0]?.score ?? 0;
    expect(verified).toBeGreaterThan(failed);
  });

  it("treats file_read refs as weaker evidence than file refs", () => {
    const activeFiles = new Set(["src/auth/service.ts"]);
    const edited = rankClaims({
      query: "",
      activeFiles,
      claims: [makeClaim({ refs: [{ kind: "file", value: "src/auth/service.ts" }], text: "auth" })],
      now: NOW,
    })[0]?.score ?? 0;
    const read = rankClaims({
      query: "",
      activeFiles,
      claims: [makeClaim({ refs: [{ kind: "file_read", value: "src/auth/service.ts" }], text: "auth" })],
      now: NOW,
    })[0]?.score ?? 0;
    expect(edited).toBeGreaterThan(read);
  });

  it("decays old claims", () => {
    const fresh = rankClaims({
      query: "",
      activeFiles: new Set(),
      claims: [makeClaim()],
      now: NOW,
    })[0]?.score ?? 0;
    const yearOld = rankClaims({
      query: "",
      activeFiles: new Set(),
      claims: [makeClaim({ extractedAt: NOW - 365 * 86_400_000 })],
      now: NOW,
    })[0]?.score ?? 0;
    expect(fresh).toBeGreaterThan(yearOld);
  });
});

describe("fitCapsule", () => {
  it("always ships the top claim, flagged low-confidence when appropriate", () => {
    const ranked = rankClaims({
      query: "",
      activeFiles: new Set(),
      claims: [makeClaim({ confidence: 0.2 })],
      now: NOW,
    });
    const fitted = fitCapsule({ ranked, budgetTokens: 1000 });
    expect(fitted.exceeded).toBe(false);
    expect(fitted.selected).toHaveLength(1);
    expect(fitted.selected[0]?.lowConfidence).toBe(true);
  });

  it("never ships doubly-bad claims", () => {
    const claim = makeClaim({ invalidation: { stale: true, supersededBy: "claim-9999" as ClaimId } });
    expect(isDoublyBad(claim)).toBe(true);
    const fitted = fitCapsule({ ranked: [{ claim, score: 1 }], budgetTokens: 1000 });
    expect(fitted.selected).toHaveLength(0);
    expect(fitted.exceeded).toBe(false);
  });

  it("fills confident claims before low-confidence ones", () => {
    const claims = [
      makeClaim({ id: "claim-a" as ClaimId, confidence: 0.2, text: "weak claim one" }),
      makeClaim({ id: "claim-b" as ClaimId, confidence: 0.9, text: "strong claim" }),
      makeClaim({ id: "claim-c" as ClaimId, confidence: 0.8, text: "another strong" }),
    ];
    const ranked = rankClaims({ query: "strong", activeFiles: new Set(), claims, now: NOW });
    const fitted = fitCapsule({ ranked, budgetTokens: 1000 });
    expect(fitted.selected.map((entry) => entry.digest.id)).toEqual([
      "claim-b",
      "claim-c",
      "claim-a",
    ]);
    expect(fitted.selected.at(-1)?.lowConfidence).toBe(true);
    expect(fitted.selected[0]?.lowConfidence).toBe(false);
  });

  it("stops at the budget and reports exceeded when even the top claim cannot fit", () => {
    const big = makeClaim({ text: "x".repeat(10_000) });
    const fitted = fitCapsule({
      ranked: [{ claim: big, score: 1 }],
      budgetTokens: estimateTokens("placeholder"),
    });
    expect(fitted.exceeded).toBe(true);
    expect(fitted.selected).toHaveLength(0);

    const budget = estimateTokens("x".repeat(10_000)) + estimateTokens("short claim") + 1;
    const partial = fitCapsule({
      ranked: [
        { claim: big, score: 2 },
        { claim: makeClaim({ text: "short claim" }), score: 1 },
      ],
      budgetTokens: budget,
    });
    expect(partial.exceeded).toBe(false);
    expect(partial.selected).toHaveLength(2);
    expect(partial.totalTokens).toBeLessThanOrEqual(budget);
  });

  it("round-trips a claim into a digest with an expand hint", () => {
    const claim = makeClaim({ verified: true, kind: "test_result" });
    const digest = toClaimDigest(claim);
    expect(digest.expandHint.messageId).toBe(claim.messageIds[0]);
    expect(digest.verified).toBe(true);
    expect(digest.invalidation).toEqual({ stale: false });
  });
});
