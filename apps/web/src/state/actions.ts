import { createActionsEnvironmentAtoms } from "@rune/client-runtime/state/actions";

import { connectionAtomRuntime } from "../connection/runtime";

export const actionsEnvironment = createActionsEnvironmentAtoms(connectionAtomRuntime);
