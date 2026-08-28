import {
  PlanAnswerValue as PlanAnswerValueSchema,
  PlanSessionId as PlanSessionIdSchema,
  type PlanAnswer,
  type PlanDependencyEdge,
  type PlanDependencyGraph,
  type PlanQuestion,
  type PlanSession,
  type PlanStage,
  type PlanTask,
  type PlanMode,
  type PlanDecisionSource,
} from "@rune/contracts";

export interface PlanValidationIssue {
  readonly code:
    | "duplicate-id"
    | "duplicate-order"
    | "unknown-dependency"
    | "self-dependency"
    | "duplicate-dependency"
    | "dependency-order"
    | "cycle"
    | "unknown-question"
    | "duplicate-answer"
    | "unanswered-question"
    | "missing-specification"
    | "missing-requirements"
    | "missing-tasks"
    | "unmapped-requirement"
    | "missing-verification"
    | "open-question"
    | "stale-dependency-graph"
    | "stage";
  readonly path: string;
  readonly message: string;
}

export interface PlanValidationResult {
  readonly valid: boolean;
  readonly issues: ReadonlyArray<PlanValidationIssue>;
}

export type PlanTransitionResult =
  | { readonly ok: true; readonly session: PlanSession }
  | { readonly ok: false; readonly issues: ReadonlyArray<PlanValidationIssue> };

export type PlanAnswerResult =
  | { readonly ok: true; readonly session: PlanSession }
  | { readonly ok: false; readonly issues: ReadonlyArray<PlanValidationIssue> };

// Paused and blocked are overlays on the linear lifecycle. They never create
// a second plan branch; callers resume into the stage that was interrupted.
const STAGE_ORDER: Readonly<Record<Exclude<PlanStage, "paused" | "blocked">, number>> = {
  ask: 0,
  spec: 1,
  plan: 2,
  planning: 3,
  "reviewing-plan": 4,
  approved: 5,
  executing: 6,
  "reviewing-result": 7,
  completed: 8,
};

const PAUSABLE_STAGES = new Set<
  Exclude<PlanStage, "ask" | "spec" | "completed" | "paused" | "blocked">
>(["plan", "planning", "reviewing-plan", "approved", "executing", "reviewing-result"]);

/** One plan session per thread unless a caller explicitly chooses another id. */
export function planSessionIdForThread(threadId: string): PlanSession["id"] {
  return PlanSessionIdSchema.make(`plan:${threadId}`);
}

export function createPlanSession(input: {
  readonly threadId: PlanSession["threadId"];
  readonly mode: PlanMode;
  readonly now: string;
  readonly questions?: ReadonlyArray<PlanQuestion>;
  readonly id?: PlanSession["id"];
}): PlanSession {
  const questions = [...(input.questions ?? [])];
  return {
    id: input.id ?? planSessionIdForThread(input.threadId),
    threadId: input.threadId,
    mode: input.mode,
    stage: "ask",
    questions,
    answers: [],
    specification: null,
    tasks: [],
    dependencyGraph: { taskIds: [], edges: [] },
    version: 1,
    createdAt: input.now,
    updatedAt: input.now,
  };
}

function issue(
  code: PlanValidationIssue["code"],
  path: string,
  message: string,
): PlanValidationIssue {
  return { code, path, message };
}

function orderedQuestions(session: Pick<PlanSession, "questions">): ReadonlyArray<PlanQuestion> {
  return [...session.questions].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

function answeredQuestionIds(session: Pick<PlanSession, "answers">): ReadonlySet<string> {
  return new Set(session.answers.map((answer) => answer.questionId));
}

/** Returns the deterministic frontier: unanswered questions with settled prerequisites. */
export function getPlanQuestionFrontier(
  session: Pick<PlanSession, "questions" | "answers">,
): ReadonlyArray<PlanQuestion> {
  const answered = answeredQuestionIds(session);
  const questionIds = new Set(session.questions.map((question) => question.id));
  return orderedQuestions(session).filter(
    (question) =>
      !answered.has(question.id) &&
      question.dependencyIds.every(
        (dependencyId) => questionIds.has(dependencyId) && answered.has(dependencyId),
      ),
  );
}

export function validatePlanDecisionGraph(
  session: Pick<PlanSession, "questions" | "answers">,
): ReadonlyArray<PlanValidationIssue> {
  const issues: PlanValidationIssue[] = [];
  const questionsById = new Map<string, PlanQuestion>();
  const orders = new Set<number>();

  for (const [index, question] of session.questions.entries()) {
    if (questionsById.has(question.id)) {
      issues.push(
        issue("duplicate-id", `questions[${index}].id`, `Question '${question.id}' is duplicated.`),
      );
    }
    if (orders.has(question.order)) {
      issues.push(
        issue(
          "duplicate-order",
          `questions[${index}].order`,
          `Question order '${question.order}' is duplicated.`,
        ),
      );
    }
    questionsById.set(question.id, question);
    orders.add(question.order);
  }

  const answered = answeredQuestionIds(session);
  for (const [index, question] of session.questions.entries()) {
    const dependencies = new Set<string>();
    for (const dependencyId of question.dependencyIds) {
      if (!questionsById.has(dependencyId)) {
        issues.push(
          issue(
            "unknown-dependency",
            `questions[${index}].dependencyIds`,
            `Question '${question.id}' depends on unknown question '${dependencyId}'.`,
          ),
        );
      } else if (dependencyId === question.id) {
        issues.push(
          issue(
            "self-dependency",
            `questions[${index}].dependencyIds`,
            `Question '${question.id}' cannot depend on itself.`,
          ),
        );
      } else if (dependencies.has(dependencyId)) {
        issues.push(
          issue(
            "duplicate-dependency",
            `questions[${index}].dependencyIds`,
            `Question '${question.id}' repeats dependency '${dependencyId}'.`,
          ),
        );
      }
      dependencies.add(dependencyId);
    }
    if (question.required && !answered.has(question.id)) {
      issues.push(
        issue(
          "unanswered-question",
          `questions[${index}]`,
          `Required question '${question.id}' is unanswered.`,
        ),
      );
    }
  }

  for (const [index, answer] of session.answers.entries()) {
    const priorAnswer = session.answers.findIndex(
      (candidate) => candidate.questionId === answer.questionId,
    );
    if (priorAnswer !== index) {
      issues.push(
        issue(
          "duplicate-answer",
          `answers[${index}].questionId`,
          `Question '${answer.questionId}' has more than one answer.`,
        ),
      );
    }
    if (!questionsById.has(answer.questionId)) {
      issues.push(
        issue(
          "unknown-question",
          `answers[${index}].questionId`,
          `Answer refers to unknown question '${answer.questionId}'.`,
        ),
      );
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (questionId: string, path: ReadonlyArray<string>): void => {
    if (visiting.has(questionId)) {
      issues.push(
        issue(
          "cycle",
          "questions",
          `Question dependency cycle detected: ${[...path, questionId].join(" -> ")}.`,
        ),
      );
      return;
    }
    if (visited.has(questionId)) return;
    visiting.add(questionId);
    const question = questionsById.get(questionId);
    for (const dependencyId of [...(question?.dependencyIds ?? [])].sort()) {
      if (questionsById.has(dependencyId)) visit(dependencyId, [...path, questionId]);
    }
    visiting.delete(questionId);
    visited.add(questionId);
  };
  for (const question of orderedQuestions(session)) visit(question.id, []);

  return issues;
}

/** Records an answer locally and keeps answer order aligned with question order. */
export function answerPlanQuestion(input: {
  readonly session: PlanSession;
  readonly questionId: PlanQuestion["id"];
  readonly value: string;
  readonly source?: PlanDecisionSource;
  readonly answeredAt: string;
}): PlanAnswerResult {
  const question = input.session.questions.find((candidate) => candidate.id === input.questionId);
  if (!question) {
    return {
      ok: false,
      issues: [
        issue(
          "unknown-question",
          "questionId",
          `Question '${input.questionId}' does not exist in this session.`,
        ),
      ],
    };
  }
  const value = input.value.trim();
  if (!value) {
    return {
      ok: false,
      issues: [
        issue("unanswered-question", "value", `Answer for '${question.id}' must not be empty.`),
      ],
    };
  }
  const answer: PlanAnswer = {
    questionId: question.id,
    value: PlanAnswerValueSchema.make(value),
    source: input.source ?? "user",
    answeredAt: input.answeredAt,
  };
  const answers = [
    ...input.session.answers.filter((candidate) => candidate.questionId !== question.id),
    answer,
  ].sort(
    (a, b) =>
      (input.session.questions.find((candidate) => candidate.id === a.questionId)?.order ??
        Number.MAX_SAFE_INTEGER) -
        (input.session.questions.find((candidate) => candidate.id === b.questionId)?.order ??
          Number.MAX_SAFE_INTEGER) || a.questionId.localeCompare(b.questionId),
  );
  return { ok: true, session: { ...input.session, answers, updatedAt: input.answeredAt } };
}

/** Returns pending tasks whose dependencies are completed, in plan order. */
export function getReadyPlanTasks(tasks: ReadonlyArray<PlanTask>): ReadonlyArray<PlanTask> {
  const completed = new Set(
    tasks.filter((task) => task.state === "completed").map((task) => task.id),
  );
  return [...tasks]
    .filter(
      (task) =>
        (task.state === "pending" || task.state === "ready") &&
        task.dependencyIds.every((dependencyId) => completed.has(dependencyId)),
    )
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

export function buildPlanDependencyGraph(tasks: ReadonlyArray<PlanTask>): PlanDependencyGraph {
  const ordered = [...tasks].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const edges: PlanDependencyEdge[] = [];
  for (const task of ordered) {
    for (const dependsOn of [...task.dependencyIds].sort()) {
      edges.push({ taskId: task.id, dependsOn });
    }
  }
  return { taskIds: ordered.map((task) => task.id), edges };
}

export function validatePlanDependencyGraph(tasks: ReadonlyArray<PlanTask>): PlanValidationResult {
  const issues: PlanValidationIssue[] = [];
  const byId = new Map<string, PlanTask>();
  const orders = new Set<number>();

  for (const [index, task] of tasks.entries()) {
    if (byId.has(task.id))
      issues.push(issue("duplicate-id", `tasks[${index}].id`, `Task '${task.id}' is duplicated.`));
    if (orders.has(task.order))
      issues.push(
        issue(
          "duplicate-order",
          `tasks[${index}].order`,
          `Task order '${task.order}' is duplicated.`,
        ),
      );
    byId.set(task.id, task);
    orders.add(task.order);
  }

  for (const [index, task] of tasks.entries()) {
    const dependencies = new Set<string>();
    for (const dependencyId of task.dependencyIds) {
      if (!byId.has(dependencyId)) {
        issues.push(
          issue(
            "unknown-dependency",
            `tasks[${index}].dependencyIds`,
            `Task '${task.id}' depends on unknown task '${dependencyId}'.`,
          ),
        );
      } else if (dependencyId === task.id) {
        issues.push(
          issue(
            "self-dependency",
            `tasks[${index}].dependencyIds`,
            `Task '${task.id}' cannot depend on itself.`,
          ),
        );
      } else if (dependencies.has(dependencyId)) {
        issues.push(
          issue(
            "duplicate-dependency",
            `tasks[${index}].dependencyIds`,
            `Task '${task.id}' repeats dependency '${dependencyId}'.`,
          ),
        );
      } else if (byId.get(dependencyId)!.order >= task.order) {
        issues.push(
          issue(
            "dependency-order",
            `tasks[${index}].dependencyIds`,
            `Task '${task.id}' must come after dependency '${dependencyId}'.`,
          ),
        );
      }
      dependencies.add(dependencyId);
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (taskId: string, path: ReadonlyArray<string>): void => {
    if (visiting.has(taskId)) {
      issues.push(
        issue(
          "cycle",
          "tasks",
          `Task dependency cycle detected: ${[...path, taskId].join(" -> ")}.`,
        ),
      );
      return;
    }
    if (visited.has(taskId)) return;
    visiting.add(taskId);
    const task = byId.get(taskId);
    for (const dependencyId of [...(task?.dependencyIds ?? [])].sort()) {
      if (byId.has(dependencyId)) visit(dependencyId, [...path, taskId]);
    }
    visiting.delete(taskId);
    visited.add(taskId);
  };
  for (const task of [...tasks].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)))
    visit(task.id, []);

  return { valid: issues.length === 0, issues };
}

/** Checks the build boundary without invoking a provider or guessing missing facts. */
export function validatePlanCompleteness(session: PlanSession): PlanValidationResult {
  const issues: PlanValidationIssue[] = [];
  if (!(session.stage in STAGE_ORDER) && !PAUSABLE_STAGES.has(session.stage as never)) {
    issues.push(issue("stage", "stage", "Plan completeness is available after the SPEC stage."));
  }
  if (session.specification === null)
    issues.push(
      issue(
        "missing-specification",
        "specification",
        "A specification is required before PLAN is complete.",
      ),
    );
  if (session.specification !== null && session.specification.requirements.length === 0) {
    issues.push(
      issue(
        "missing-requirements",
        "specification.requirements",
        "A specification must contain at least one requirement.",
      ),
    );
  }
  if (session.tasks.length === 0)
    issues.push(issue("missing-tasks", "tasks", "At least one ordered task is required."));
  issues.push(...validatePlanDecisionGraph(session));
  const taskGraphResult = validatePlanDependencyGraph(session.tasks);
  issues.push(...taskGraphResult.issues);
  const expectedGraph = buildPlanDependencyGraph(session.tasks);
  if (JSON.stringify(expectedGraph) !== JSON.stringify(session.dependencyGraph)) {
    issues.push(
      issue(
        "stale-dependency-graph",
        "dependencyGraph",
        "The stored dependency graph does not match the ordered task dependencies.",
      ),
    );
  }

  const mappedRequirements = new Set(session.tasks.flatMap((task) => task.requirementIds));
  for (const [index, requirement] of (session.specification?.requirements ?? []).entries()) {
    if (!mappedRequirements.has(requirement.id)) {
      issues.push(
        issue(
          "unmapped-requirement",
          `specification.requirements[${index}]`,
          `Requirement '${requirement.id}' is not mapped to a task.`,
        ),
      );
    }
  }
  for (const [index, task] of session.tasks.entries()) {
    if (task.verification.length === 0)
      issues.push(
        issue(
          "missing-verification",
          `tasks[${index}].verification`,
          `Task '${task.id}' has no verification requirement.`,
        ),
      );
  }
  for (const [index, openQuestion] of (session.specification?.openQuestions ?? []).entries()) {
    issues.push(
      issue(
        "open-question",
        `specification.openQuestions[${index}]`,
        `Open question remains: ${openQuestion}.`,
      ),
    );
  }
  return { valid: issues.length === 0, issues };
}

export function transitionPlanSession(
  session: PlanSession,
  nextStage: PlanStage,
): PlanTransitionResult {
  if (nextStage === session.stage) return { ok: true, session };

  // These overlays are explicit and reversible. The caller must provide the
  // stage to resume into; silently guessing would make execution state lie.
  if (nextStage === "paused" || nextStage === "blocked") {
    if (!PAUSABLE_STAGES.has(session.stage as never)) {
      return {
        ok: false,
        issues: [
          issue("stage", "stage", `${session.stage.toUpperCase()} cannot be paused or blocked.`),
        ],
      };
    }
    return { ok: true, session: { ...session, stage: nextStage } };
  }
  if (session.stage === "paused" || session.stage === "blocked") {
    return {
      ok: false,
      issues: [
        issue(
          "stage",
          "stage",
          "Resume requires the stage that was interrupted; paused/blocked plans do not infer it.",
        ),
      ],
    };
  }

  const currentOrder = STAGE_ORDER[session.stage as Exclude<PlanStage, "paused" | "blocked">];
  const nextOrder = STAGE_ORDER[nextStage as Exclude<PlanStage, "paused" | "blocked">];
  if (currentOrder === undefined || nextOrder !== currentOrder + 1) {
    return {
      ok: false,
      issues: [
        issue(
          "stage",
          "stage",
          `Cannot transition from ${session.stage.toUpperCase()} to ${nextStage.toUpperCase()}.`,
        ),
      ],
    };
  }
  if (session.stage === "ask") {
    const issues = validatePlanDecisionGraph(session);
    if (issues.length > 0) return { ok: false, issues };
  }
  if (session.stage === "spec" && session.specification === null) {
    return {
      ok: false,
      issues: [
        issue(
          "missing-specification",
          "specification",
          "A specification is required before entering PLAN.",
        ),
      ],
    };
  }
  if (session.stage === "plan") {
    const issues = validatePlanCompleteness(session).issues.filter((item) => item.code !== "stage");
    if (issues.length > 0) return { ok: false, issues };
  }
  if (nextStage === "completed") {
    const incomplete = session.tasks.filter(
      (task) => task.state !== "completed" && task.state !== "skipped",
    );
    if (incomplete.length > 0) {
      return {
        ok: false,
        issues: [
          issue(
            "stage",
            "tasks",
            `Cannot complete a plan while ${incomplete.length} task(s) are not settled.`,
          ),
        ],
      };
    }
  }
  return { ok: true, session: { ...session, stage: nextStage } };
}

/** Resumes an explicitly selected stage after a pause/block overlay. */
export function resumePlanSession(
  session: PlanSession,
  resumeStage: Exclude<PlanStage, "paused" | "blocked">,
): PlanTransitionResult {
  if (session.stage !== "paused" && session.stage !== "blocked") {
    return {
      ok: false,
      issues: [issue("stage", "stage", "Only paused or blocked plans can be resumed.")],
    };
  }
  const resumed = { ...session, stage: resumeStage };
  if (resumeStage === "completed") {
    return {
      ok: false,
      issues: [
        issue("stage", "stage", "A paused or blocked plan cannot resume directly into COMPLETED."),
      ],
    };
  }
  return { ok: true, session: resumed };
}
