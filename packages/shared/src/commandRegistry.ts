/**
 * Canonical user-facing commands. Clients own presentation and invocation,
 * but stable ids, aliases, and availability live here so web and mobile do
 * not silently grow different command vocabularies.
 */
export type RuneCommandId = "model" | "goal" | "grill" | "plan" | "build" | "review" | "default";

export interface RuneCommandDescriptor {
  readonly id: RuneCommandId;
  readonly aliases: ReadonlyArray<string>;
  readonly label: string;
  readonly description: string;
  readonly requiresPlanMode: boolean;
}

export const RUNE_COMMANDS: ReadonlyArray<RuneCommandDescriptor> = [
  {
    id: "model",
    aliases: ["model"],
    label: "/model",
    description: "Switch response model for this thread",
    requiresPlanMode: false,
  },
  {
    id: "goal",
    aliases: ["goal"],
    label: "/goal",
    description: "Set, view, or clear the active task goal",
    requiresPlanMode: false,
  },
  {
    id: "grill",
    aliases: ["grill", "grill-me", "grillme"],
    label: "/grill",
    description: "Clarify the real decisions before implementation",
    requiresPlanMode: false,
  },
  {
    id: "plan",
    aliases: ["plan"],
    label: "/plan",
    description: "Switch this thread into plan mode",
    requiresPlanMode: true,
  },
  {
    id: "default",
    aliases: ["default"],
    label: "/default",
    description: "Switch this thread back to normal build mode",
    requiresPlanMode: true,
  },
  {
    id: "build",
    aliases: ["build"],
    label: "/build",
    description: "Run the approved durable plan with real child workers",
    requiresPlanMode: true,
  },
  {
    id: "review",
    aliases: ["review"],
    label: "/review",
    description: "Run an independent read-only review of the plan result",
    requiresPlanMode: true,
  },
];

export function availableRuneCommands(
  planModeEnabled: boolean,
): ReadonlyArray<RuneCommandDescriptor> {
  return RUNE_COMMANDS.filter((command) => !command.requiresPlanMode || planModeEnabled);
}

export function findRuneCommand(value: string): RuneCommandDescriptor | null {
  const normalized = value.trim().replace(/^\//u, "").toLowerCase();
  return RUNE_COMMANDS.find((command) => command.aliases.includes(normalized)) ?? null;
}
