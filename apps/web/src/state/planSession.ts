import { createPlanSessionEnvironmentAtoms } from "@rune/client-runtime/state/planSession";

import { connectionAtomRuntime } from "../connection/runtime";

export const planSessionEnvironment = createPlanSessionEnvironmentAtoms(connectionAtomRuntime);
