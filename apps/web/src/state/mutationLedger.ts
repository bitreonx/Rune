import { createMutationLedgerEnvironmentAtoms } from "@rune/client-runtime/state/mutationLedger";

import { connectionAtomRuntime } from "../connection/runtime";

export const mutationLedgerEnvironment =
  createMutationLedgerEnvironmentAtoms(connectionAtomRuntime);
