import { createPocketEnvironmentAtoms } from "@rune/client-runtime/state/pockets";

import { connectionAtomRuntime } from "../connection/runtime";

export const pocketEnvironment = createPocketEnvironmentAtoms(connectionAtomRuntime);
