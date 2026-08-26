import { createHash } from "node:crypto";

/**
 * Prompt assembly for the native agent loop.
 *
 * Sections are ordered stable-prefix-first so provider-side prompt caching
 * can reuse everything above the dynamic tail: identity and tool guidance
 * never change within a session, workspace instructions are read once, and
 * the task itself ships last. The compiled prompt is hashed so future
 * observability work can diff prompts without retrofitting.
 */

export const defaultIdentity = [
  "You are RUNE, a coding agent operating inside the user's workspace.",
  "You can read, search, edit files and run commands using the provided tools.",
  "Paths are workspace-relative. Read a file before editing it.",
  "oldText in edit_file must match exactly one location.",
  "When the task is complete, reply with a concise summary and stop calling tools.",
].join("\n");

export const defaultToolGuidance = [
  "- Prefer search over listing directories when locating code.",
  "- For UI work, inspect existing product patterns first; extend canonical components and preserve the requested surface.",
  "- Avoid generic dashboard cards, gradients, decorative icons, invented placeholder data, and excessive rounded containers.",
  "- Make hierarchy, spacing, responsive behavior, keyboard access, and empty/error/loading states concrete before calling UI work complete.",
  "- Keep command output small; you will see only what fits.",
  "Verify edits compile/run when the workspace has fast checks available.",
].join("\n");

export function compileSystemPrompt(input: {
  identity: string;
  toolGuidance: string;
  workspaceInstructions?: string;
  /** Per-turn outcome/evidence state. Kept last so the stable prefix remains cacheable. */
  outcomeContract?: string;
}): string {
  return [input.identity, input.toolGuidance, input.workspaceInstructions, input.outcomeContract]
    .filter((section): section is string => section !== undefined && section.length > 0)
    .join("\n\n");
}

export function hashPrompt(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex").slice(0, 16);
}
