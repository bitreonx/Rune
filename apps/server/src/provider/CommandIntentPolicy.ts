import { getHostCommandProfile, type HostCommandPlatform } from "@rune/shared/hostCommandProfile";

export type CommandIntent =
  | "file-lookup"
  | "content-search"
  | "directory-inspection"
  | "known-executable"
  | "focused-test"
  | "shell-grammar";

export type CommandIntentTool =
  | "rune_operation.findFiles"
  | "rune_operation.search"
  | "rune_operation.listDirectory"
  | "rune_operation.runProcess"
  | "rune_operation.runTest"
  | "shell";

export interface CommandIntentDecision {
  readonly intent: CommandIntent;
  readonly tool: CommandIntentTool;
  readonly reason: string;
}

const normalize = (value: string): string => value.trim().toLowerCase();

/**
 * Select the existing typed tool for deterministic repository work. This is
 * intentionally a local classifier: it does not rewrite shell text or make a
 * second model request, and it leaves ambiguous commands at the explicit
 * shell boundary.
 */
export const selectCommandIntent = (input: {
  readonly request: string;
  readonly platform?: HostCommandPlatform;
}): CommandIntentDecision => {
  const request = normalize(input.request);
  const platform = input.platform ?? getHostCommandProfile().platform;

  if (/(^|\b)(find|locate|discover|where)\b.*\b(file|artifact|binary|exe|app)\b/u.test(request)) {
    return {
      intent: "file-lookup",
      tool: "rune_operation.findFiles",
      reason: "A bounded workspace file search avoids shell discovery and preserves path scope.",
    };
  }
  if (/(^|\b)(search|grep|rg|ripgrep|find references|find usages)\b/u.test(request)) {
    return {
      intent: "content-search",
      tool: "rune_operation.search",
      reason: "Content lookup is already represented by the structured search operation.",
    };
  }
  if (/(^|\b)(list|inspect|show)\b.*\b(directory|folder|tree|files)\b/u.test(request)) {
    return {
      intent: "directory-inspection",
      tool: "rune_operation.listDirectory",
      reason: "Directory inspection does not need shell globbing or platform-specific listing syntax.",
    };
  }
  if (/\b(node|pnpm|npm|npx|vp|git|python|deno|bun)\b/u.test(request)) {
    return {
      intent: "known-executable",
      tool: "rune_operation.runProcess",
      reason: `Known executables run as executable plus argv; RUNE resolves ${platform === "win32" ? "Windows shims" : "host paths"} without shell parsing.`,
    };
  }
  if (/(^|\b)(test|tests|lint|typecheck|build|verify|check)\b/u.test(request)) {
    return {
      intent: "focused-test",
      tool: "rune_operation.runTest",
      reason: "Focused verification should run through the bounded test operation.",
    };
  }
  return {
    intent: "shell-grammar",
    tool: "shell",
    reason: "Use the raw shell escape hatch only when pipes, redirection, or shell built-ins are required.",
  };
};

export const commandIntentGuidance = (platform: HostCommandPlatform = getHostCommandProfile().platform): string => {
  const profile = getHostCommandProfile(platform);
  return [
    `Host: ${platform === "win32" ? "Windows" : platform === "darwin" ? "macOS" : "Linux"}.`,
    `Preferred shell dialect: ${profile.preferredShellDialect}.`,
    "Package manager executable resolution is managed by RUNE.",
    "Prefer rune_operation.findFiles for artifacts, rune_operation.search for content, rune_operation.listDirectory for structure, and argv-safe rune_operation.runProcess/runTest for known commands.",
    "Use shell only for pipes, redirection, shell built-ins, or other grammar that cannot be represented by a structured operation.",
  ].join("\n");
};
