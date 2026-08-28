import { createExecutionControllerEnvironmentAtoms } from "@rune/client-runtime/state/executionController";

import { connectionAtomRuntime } from "../connection/runtime";

export const executionControllerEnvironment =
  createExecutionControllerEnvironmentAtoms(connectionAtomRuntime);
