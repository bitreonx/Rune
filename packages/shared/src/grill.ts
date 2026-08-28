/**
 * Provider-neutral Grill decision planning.
 *
 * Grill is deliberately a pure planning seam: repository facts and provider
 * I/O stay at the adapter/runtime boundary, while this module owns the small
 * deterministic DAG that decides what may be asked next. Keeping this logic
 * provider-independent prevents a skill from creating a second questionnaire
 * protocol or leaking numbered questions into assistant prose.
 */

export type GrillDecisionStatus = "unresolved" | "resolved" | "skipped";

export interface GrillDecisionOption {
  readonly id: string;
  readonly label: string;
}

export interface GrillDecisionNode {
  readonly id: string;
  readonly question: string;
  readonly recommendedAnswer: string;
  readonly options: readonly GrillDecisionOption[];
  readonly dependencyIds: readonly string[];
  readonly status: GrillDecisionStatus;
  readonly answer?: string;
  readonly answerSource?: "user" | "repository" | "policy";
}

export interface GrillDecisionGraph {
  readonly nodes: readonly GrillDecisionNode[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface GrillDecisionLedgerEntry {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
  readonly source: "user" | "repository" | "policy";
  readonly recommended: boolean;
}

export interface GrillParseResult {
  readonly ok: boolean;
  readonly nodes: readonly GrillDecisionNode[];
  readonly remainder: string;
}

export type GrillInvocationAlias = "/grill" | "/grill-me" | "/grillme" | "$grill-me" | "grill me";

export interface GrillInvocation {
  readonly alias: GrillInvocationAlias;
  /** Optional topic or recognized imported-skill block following the trigger. */
  readonly prompt: string;
}

function clean(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

function compareNodes(left: GrillDecisionNode, right: GrillDecisionNode): number {
  return left.id.localeCompare(right.id);
}

function dependenciesResolved(node: GrillDecisionNode, resolved: ReadonlySet<string>): boolean {
  return node.dependencyIds.every((dependencyId) => resolved.has(dependencyId));
}

/**
 * Recognizes only deliberate Grill invocations. In particular, ordinary prose
 * containing the word "grill" is never treated as a command.
 */
export function parseGrillInvocation(text: string): GrillInvocation | null {
  const source = text.trim();
  const slashOrDollar = source.match(
    /^(\/(?:grill-me|grillme|grill)|\$grill-me)(?:\s+([\s\S]*))?$/iu,
  );
  if (slashOrDollar) {
    return {
      alias: slashOrDollar[1]!.toLowerCase() as GrillInvocationAlias,
      // Keep line breaks so the high-confidence imported-skill guard can
      // inspect its block separators without altering the source content.
      prompt: (slashOrDollar[2] ?? "").trim(),
    };
  }

  const naturalLanguage = source.match(/^(?:please\s+)?grill\s+me(?:\s*[:,-]?\s*([\s\S]*))?$/iu);
  if (naturalLanguage) {
    return {
      alias: "grill me",
      prompt: (naturalLanguage[1] ?? "").trim(),
    };
  }

  return null;
}

/**
 * Creates the first bounded decision for a direct Grill invocation. Imported
 * skill blocks remain lossless when they pass the high-confidence parser;
 * otherwise the native runtime asks one editable scope question and waits.
 */
export function grillDecisionNodesForInvocation(
  invocation: GrillInvocation,
): readonly GrillDecisionNode[] {
  const recognized = parseRecognizedGrillBlock(invocation.prompt);
  if (recognized.ok) {
    return recognized.nodes;
  }

  const subject = invocation.prompt || "the current task";
  const questionSubject = subject.length > 160 ? `${subject.slice(0, 157)}...` : subject;
  return [
    {
      id: "grill:scope",
      question: `What should Grill settle first about ${questionSubject}?`,
      recommendedAnswer: "A concrete product behavior",
      options: [
        { id: "product", label: "A concrete product behavior" },
        { id: "implementation", label: "An implementation constraint" },
        { id: "verification", label: "A verification or acceptance criterion" },
      ],
      dependencyIds: [],
      status: "unresolved",
    },
  ];
}

/** Returns only questions whose prerequisites have been resolved. */
export function grillFrontier(graph: GrillDecisionGraph): readonly GrillDecisionNode[] {
  const resolved = new Set(
    graph.nodes
      .filter((node) => node.status === "resolved" || node.status === "skipped")
      .map((node) => node.id),
  );
  return graph.nodes
    .filter((node) => node.status === "unresolved" && dependenciesResolved(node, resolved))
    .toSorted(compareNodes);
}

/** Applies one answer without mutating the graph or unlocking unrelated nodes. */
export function resolveGrillDecision(input: {
  readonly graph: GrillDecisionGraph;
  readonly nodeId: string;
  readonly answer: string;
  readonly source: "user" | "repository" | "policy";
  readonly now: string;
}): GrillDecisionGraph {
  const answer = clean(input.answer);
  if (!answer) return input.graph;
  const target = input.graph.nodes.find((node) => node.id === input.nodeId);
  if (!target || target.status !== "unresolved") return input.graph;
  if (!grillFrontier(input.graph).some((node) => node.id === target.id)) return input.graph;
  return {
    ...input.graph,
    nodes: input.graph.nodes.map((node) =>
      node.id === input.nodeId
        ? { ...node, status: "resolved", answer, answerSource: input.source }
        : node,
    ),
    updatedAt: input.now,
  };
}

/** Converts resolved decisions into a compact, auditable handoff ledger. */
export function grillDecisionLedger(
  graph: GrillDecisionGraph,
): readonly GrillDecisionLedgerEntry[] {
  return graph.nodes
    .filter(
      (
        node,
      ): node is GrillDecisionNode & {
        readonly answer: string;
        readonly answerSource: "user" | "repository" | "policy";
      } =>
        node.status === "resolved" &&
        typeof node.answer === "string" &&
        node.answerSource !== undefined,
    )
    .toSorted(compareNodes)
    .map((node) => ({
      id: node.id,
      question: node.question,
      answer: node.answer,
      source: node.answerSource,
      recommended: node.answer === node.recommendedAnswer,
    }));
}

/** True once no user decision remains. */
export function isGrillComplete(graph: GrillDecisionGraph): boolean {
  return graph.nodes.every((node) => node.status !== "unresolved");
}

/**
 * Parses only the high-confidence imported-skill block shape. Unknown prose is
 * returned untouched; this is intentionally not a general Markdown parser.
 */
export function parseRecognizedGrillBlock(text: string): GrillParseResult {
  const source = text.trim();
  if (!source.includes("❓") || !source.includes("➡️")) {
    return { ok: false, nodes: [], remainder: text };
  }

  const blocks = source
    .split(/\n\s*---+\s*\n/gu)
    .map((block) => block.trim())
    .filter(Boolean);
  const nodes: GrillDecisionNode[] = [];
  for (const [index, block] of blocks.entries()) {
    const question = block.match(/^❓\s*(?:Q\d+\s*[:.)-]?\s*)?(.+?)(?:\n|$)/u)?.[1];
    const recommendation = block.match(
      /(?:^|\n)➡️\s*(?:Recommended\s*[:：]\s*)?(.+?)(?:\n|$)/u,
    )?.[1];
    if (
      !question ||
      !recommendation ||
      clean(question).length === 0 ||
      clean(recommendation).length === 0
    ) {
      return { ok: false, nodes: [], remainder: text };
    }
    nodes.push({
      id: `grill:${index + 1}`,
      question: clean(question),
      recommendedAnswer: clean(recommendation),
      options: [{ id: "recommended", label: clean(recommendation) }],
      dependencyIds: index === 0 ? [] : [`grill:${index}`],
      status: "unresolved",
    });
  }
  return { ok: nodes.length > 0, nodes, remainder: "" };
}
