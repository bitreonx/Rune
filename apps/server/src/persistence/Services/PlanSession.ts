import {
  PlanSessionCreateInput,
  PlanSessionError,
  PlanSessionGetInput,
  PlanSessionResumeInput,
  PlanSessionTransitionInput,
  PlanSessionUpdateInput,
  type PlanSession as PlanSessionRecord,
} from "@rune/contracts";
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";

export interface PlanSessionServiceShape {
  readonly create: (
    input: PlanSessionCreateInput,
  ) => Effect.Effect<PlanSessionRecord, PlanSessionError>;
  readonly get: (input: PlanSessionGetInput) => Effect.Effect<PlanSessionRecord, PlanSessionError>;
  readonly update: (
    input: PlanSessionUpdateInput,
  ) => Effect.Effect<PlanSessionRecord, PlanSessionError>;
  readonly transition: (
    input: PlanSessionTransitionInput,
  ) => Effect.Effect<PlanSessionRecord, PlanSessionError>;
  readonly resume: (
    input: PlanSessionResumeInput,
  ) => Effect.Effect<PlanSessionRecord, PlanSessionError>;
}

export class PlanSession extends Context.Service<PlanSession, PlanSessionServiceShape>()(
  "rune/persistence/Services/PlanSession",
) {}
