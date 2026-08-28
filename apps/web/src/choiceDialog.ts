import type { ChoiceDialogOption, ChoiceDialogOptions } from "@rune/contracts";

export type ChoiceDialogState =
  | { readonly status: "idle" }
  | {
      readonly status: "choosing";
      readonly message: string;
      readonly choices: readonly ChoiceDialogOption[];
      readonly cancelLabel: string;
    }
  | {
      readonly status: "closing";
      readonly message: string;
      readonly choices: readonly ChoiceDialogOption[];
      readonly cancelLabel: string;
    };

type PendingChoice = {
  readonly message: string;
  readonly choices: readonly ChoiceDialogOption[];
  readonly cancelLabel: string;
  readonly resolve: (choice: string | null) => void;
};

const idleState: ChoiceDialogState = { status: "idle" };
let state: ChoiceDialogState = idleState;
let activeChoice: PendingChoice | null = null;
let queuedChoices: PendingChoice[] = [];
let registeredHostCount = 0;
const listeners = new Set<() => void>();

function publish(next: ChoiceDialogState): void {
  state = next;
  for (const listener of listeners) listener();
}

function resolvePendingChoices(choice: string | null): void {
  activeChoice?.resolve(choice);
  for (const pending of queuedChoices) pending.resolve(choice);
  activeChoice = null;
  queuedChoices = [];
}

export function readChoiceDialogState(): ChoiceDialogState {
  return state;
}

export function subscribeChoiceDialog(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function registerChoiceDialogHost(): () => void {
  registeredHostCount += 1;
  let registered = true;
  return () => {
    if (!registered) return;
    registered = false;
    registeredHostCount = Math.max(0, registeredHostCount - 1);
    if (registeredHostCount === 0) {
      resolvePendingChoices(null);
      publish(idleState);
    }
  };
}

export function requestChoiceDialog(
  message: string,
  choices: readonly ChoiceDialogOption[],
  options?: ChoiceDialogOptions,
): Promise<string | null> | undefined {
  if (registeredHostCount === 0 || choices.length === 0) return undefined;
  const pending = new Promise<string | null>((resolve) => {
    const next = {
      message,
      choices,
      cancelLabel: options?.cancelLabel ?? "Cancel",
      resolve,
    } satisfies PendingChoice;
    if (activeChoice || state.status === "closing") {
      queuedChoices.push(next);
      return;
    }
    activeChoice = next;
    publish({
      status: "choosing",
      message: next.message,
      choices: next.choices,
      cancelLabel: next.cancelLabel,
    });
  });
  return pending;
}

export function respondToChoiceDialog(choice: string | null): void {
  if (state.status !== "choosing" || !activeChoice) return;
  const pending = activeChoice;
  activeChoice = null;
  pending.resolve(choice);
  publish({
    status: "closing",
    message: state.message,
    choices: state.choices,
    cancelLabel: state.cancelLabel,
  });
}

export function completeChoiceDialogClose(): void {
  if (state.status !== "closing") return;
  const next = queuedChoices.shift();
  if (!next) {
    publish(idleState);
    return;
  }
  activeChoice = next;
  publish({
    status: "choosing",
    message: next.message,
    choices: next.choices,
    cancelLabel: next.cancelLabel,
  });
}

export function resetChoiceDialogForTests(): void {
  resolvePendingChoices(null);
  registeredHostCount = 0;
  publish(idleState);
  listeners.clear();
}
