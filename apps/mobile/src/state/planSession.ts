import { createPlanSessionEnvironmentAtoms } from "@rune/client-runtime/state/planSession";

import { connectionAtomRuntime } from "../connection/runtime";

/** Shared durable plan-session queries and commands for mobile execution controls. */
export const planSessionEnvironment = createPlanSessionEnvironmentAtoms(connectionAtomRuntime);
