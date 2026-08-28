import type { PlanTask, PlanTaskId } from "@rune/contracts";

/** A task reservation owned by a running worker or by this scheduler pass. */
export interface PlanTaskReservation {
  readonly taskId: PlanTaskId;
  readonly ownershipScope: ReadonlyArray<string>;
  readonly workspacePolicy?: PlanTask["workspacePolicy"];
}

export interface PlanSchedulerInput {
  readonly tasks: ReadonlyArray<PlanTask>;
  /** When supplied, tasks whose bound provider is unavailable are blocked. */
  readonly availableTaskIds?: ReadonlySet<PlanTaskId>;
  readonly runningTaskIds?: ReadonlySet<PlanTaskId>;
  readonly reservations?: ReadonlyArray<PlanTaskReservation>;
  readonly maxConcurrent?: number;
}

export type PlanTaskBlockReason =
  | "dependency"
  | "provider-unavailable"
  | "workspace-conflict"
  | "capacity"
  | "already-running";

export interface PlanTaskScheduleBlock {
  readonly task: PlanTask;
  readonly reason: PlanTaskBlockReason;
  readonly blockingTaskIds: ReadonlyArray<PlanTaskId>;
}

export interface PlanSchedulerResult {
  readonly runnable: ReadonlyArray<PlanTask>;
  readonly blocked: ReadonlyArray<PlanTaskScheduleBlock>;
}

function normalizedScope(scope: string): string {
  return scope
    .trim()
    .replaceAll("\\", "/")
    .replace(/^\.\//u, "")
    .replace(/\/\*\*?$/u, "")
    .replace(/\/$/u, "");
}

function scopesOverlap(left: string, right: string): boolean {
  const a = normalizedScope(left);
  const b = normalizedScope(right);
  if (!a || !b) return false;
  return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
}

function taskCanWrite(task: Pick<PlanTask, "workspacePolicy">): boolean {
  return task.workspacePolicy !== "read-only";
}

function reservationConflicts(task: PlanTask, reservation: PlanTaskReservation): boolean {
  if (!taskCanWrite(task) || reservation.workspacePolicy === "read-only") return false;
  // Isolated workers receive their own worktree at the runtime boundary, so
  // their logical file scopes cannot collide with a shared worker. The
  // coordinator still has to provision that worktree before dispatching.
  if (task.workspacePolicy === "isolated" || reservation.workspacePolicy === "isolated") {
    return false;
  }
  const taskScopes = task.ownershipScope ?? [];
  return taskScopes.some((scope) =>
    reservation.ownershipScope.some((reservedScope) => scopesOverlap(scope, reservedScope)),
  );
}

function readyByDependency(tasks: ReadonlyArray<PlanTask>): ReadonlySet<PlanTaskId> {
  const completed = new Set(
    tasks.filter((task) => task.state === "completed").map((task) => task.id),
  );
  return new Set(
    tasks
      .filter(
        (task) =>
          (task.state === "pending" || task.state === "ready") &&
          task.dependencyIds.every((dependencyId) => completed.has(dependencyId)),
      )
      .map((task) => task.id),
  );
}

/**
 * Deterministically selects the next plan workers. No provider or model is
 * consulted here: availability and ownership are explicit inputs from the
 * runtime boundary, which keeps the scheduler replayable and testable.
 */
export function schedulePlanTasks(input: PlanSchedulerInput): PlanSchedulerResult {
  const tasks = [...input.tasks].sort(
    (left, right) => left.order - right.order || left.id.localeCompare(right.id),
  );
  const ready = readyByDependency(tasks);
  const running = input.runningTaskIds ?? new Set<PlanTaskId>();
  const reservations = [...(input.reservations ?? [])];
  const runnable: PlanTask[] = [];
  const blocked: PlanTaskScheduleBlock[] = [];
  const capacity = Math.max(0, input.maxConcurrent ?? Number.MAX_SAFE_INTEGER);

  for (const task of tasks) {
    if (task.state !== "pending" && task.state !== "ready") continue;
    if (running.has(task.id)) {
      blocked.push({ task, reason: "already-running", blockingTaskIds: [task.id] });
      continue;
    }
    if (!ready.has(task.id)) {
      blocked.push({
        task,
        reason: "dependency",
        blockingTaskIds: task.dependencyIds.filter(
          (dependencyId) =>
            tasks.find((candidate) => candidate.id === dependencyId)?.state !== "completed",
        ),
      });
      continue;
    }
    if (input.availableTaskIds !== undefined && !input.availableTaskIds.has(task.id)) {
      blocked.push({ task, reason: "provider-unavailable", blockingTaskIds: [] });
      continue;
    }
    const conflicts = reservations.filter((reservation) => reservationConflicts(task, reservation));
    if (conflicts.length > 0) {
      blocked.push({
        task,
        reason: "workspace-conflict",
        blockingTaskIds: conflicts.map((reservation) => reservation.taskId),
      });
      continue;
    }
    if (runnable.length >= capacity) {
      blocked.push({
        task,
        reason: "capacity",
        blockingTaskIds: runnable.map((candidate) => candidate.id),
      });
      continue;
    }
    runnable.push(task);
    reservations.push({
      taskId: task.id,
      ownershipScope: task.ownershipScope ?? [],
      workspacePolicy: task.workspacePolicy,
    });
  }

  return { runnable, blocked };
}
