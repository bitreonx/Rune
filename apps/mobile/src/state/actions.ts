import { createActionsEnvironmentAtoms } from "@rune/client-runtime/state/actions";

import { connectionAtomRuntime } from "../connection/runtime";

/** Shared Action Registry access for mobile action sheets and future quick actions. */
export const actionsEnvironment = createActionsEnvironmentAtoms(connectionAtomRuntime);
