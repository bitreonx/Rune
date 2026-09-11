import { createSchedulesEnvironmentAtoms } from "@rune/client-runtime/state/schedules";

import { connectionAtomRuntime } from "../connection/runtime";

export const schedulesEnvironment = createSchedulesEnvironmentAtoms(connectionAtomRuntime);
