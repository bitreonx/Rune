import {
  resolveInlineCodeFileLinkMeta,
  resolveMarkdownFileLinkMeta,
  type MarkdownFileLinkMeta,
} from "./markdown-links";
import { classifyWorkspaceFile } from "@rune/shared/fileKind";

export type SmartReference =
  | {
      kind: "workspace-file";
      file: MarkdownFileLinkMeta;
      /** Executables and archives are reveal-only until an explicit action says otherwise. */
      unsafeToAutoExecute: boolean;
    }
  | {
      kind: "workspace-directory";
      targetPath: string;
      workspaceRelativePath: string;
    }
  | {
      kind: "change-request";
      url: string;
      provider: "github" | "gitlab" | "bitbucket" | "azure-devops";
      number: number;
    }
  | {
      kind: "commit";
      url: string;
      sha: string;
      provider: "github" | "gitlab" | "bitbucket" | "azure-devops";
    }
  | {
      kind: "issue";
      url: string;
      provider: "github" | "gitlab" | "bitbucket" | "azure-devops";
      number: number;
    }
  | {
      kind: "external-url";
      url: string;
    };

export interface SmartReferenceInput {
  readonly href?: string | undefined;
  readonly text?: string | undefined;
  readonly cwd?: string | undefined;
}

const REVEAL_ONLY_EXTENSIONS = new Set([
  ".7z",
  ".app",
  ".deb",
  ".dmg",
  ".exe",
  ".msi",
  ".pkg",
  ".zip",
]);
type HostedProvider = "github" | "gitlab" | "bitbucket" | "azure-devops";

function extensionOf(path: string): string {
  const normalized = path.replaceAll("\\", "/");
  const basename = normalized.slice(normalized.lastIndexOf("/") + 1).toLowerCase();
  const extensionIndex = basename.lastIndexOf(".");
  return extensionIndex >= 0 ? basename.slice(extensionIndex) : "";
}

function providerForHost(hostname: string): HostedProvider | null {
  const host = hostname.toLowerCase();
  if (host === "github.com" || host.endsWith(".github.com")) return "github";
  if (host === "bitbucket.org" || host.endsWith(".bitbucket.org")) return "bitbucket";
  if (host === "dev.azure.com" || host.endsWith(".visualstudio.com")) return "azure-devops";
  return host === "gitlab.com" || host.includes("gitlab") ? "gitlab" : null;
}

function classifyHostedReference(url: URL): SmartReference | null {
  const provider = providerForHost(url.hostname);
  const path = url.pathname;

  if (provider === "github") {
    const changeRequest = /^\/[^/]+\/[^/]+\/pull\/(\d+)(?:\/|$)/u.exec(path);
    if (changeRequest?.[1]) {
      return {
        kind: "change-request",
        url: url.toString(),
        provider,
        number: Number(changeRequest[1]),
      };
    }
    const issue = /^\/[^/]+\/[^/]+\/issues\/(\d+)(?:\/|$)/u.exec(path);
    if (issue?.[1]) {
      return { kind: "issue", url: url.toString(), provider, number: Number(issue[1]) };
    }
    const commit = /^\/[^/]+\/[^/]+\/commit\/([0-9a-f]{7,64})(?:\/|$)/iu.exec(path);
    if (commit?.[1]) {
      return { kind: "commit", url: url.toString(), provider, sha: commit[1] };
    }
  }

  if (provider === "gitlab") {
    const changeRequest = /^\/[^/]+(?:\/[^/]+)+\/-\/merge_requests\/(\d+)(?:\/|$)/u.exec(path);
    if (changeRequest?.[1]) {
      return {
        kind: "change-request",
        url: url.toString(),
        provider,
        number: Number(changeRequest[1]),
      };
    }
    const issue = /^\/[^/]+(?:\/[^/]+)+\/-\/issues\/(\d+)(?:\/|$)/u.exec(path);
    if (issue?.[1]) {
      return { kind: "issue", url: url.toString(), provider, number: Number(issue[1]) };
    }
    const commit = /^\/[^/]+(?:\/[^/]+)+\/-\/commit\/([0-9a-f]{7,64})(?:\/|$)/iu.exec(path);
    if (commit?.[1]) {
      return { kind: "commit", url: url.toString(), provider, sha: commit[1] };
    }
  }

  if (provider === "bitbucket") {
    const changeRequest = /^\/[^/]+\/[^/]+\/pull-requests\/(\d+)(?:\/|$)/u.exec(path);
    if (changeRequest?.[1]) {
      return {
        kind: "change-request",
        url: url.toString(),
        provider,
        number: Number(changeRequest[1]),
      };
    }
    const issue = /^\/[^/]+\/[^/]+\/issues\/(\d+)(?:\/|$)/u.exec(path);
    if (issue?.[1]) {
      return { kind: "issue", url: url.toString(), provider, number: Number(issue[1]) };
    }
    const commit = /^\/[^/]+\/[^/]+\/commits?\/([0-9a-f]{7,64})(?:\/|$)/iu.exec(path);
    if (commit?.[1]) {
      return { kind: "commit", url: url.toString(), provider, sha: commit[1] };
    }
  }

  if (provider === "azure-devops") {
    const changeRequest = /^\/((?:[^/]+\/)*_git\/[^/]+)\/pullrequest\/(\d+)(?:\/|$)/iu.exec(path);
    if (changeRequest?.[2]) {
      return {
        kind: "change-request",
        url: url.toString(),
        provider,
        number: Number(changeRequest[2]),
      };
    }
    const commit = /^\/((?:[^/]+\/)*_git\/[^/]+)\/commit\/([0-9a-f]{7,64})(?:\/|$)/iu.exec(path);
    if (commit?.[2]) {
      return { kind: "commit", url: url.toString(), provider, sha: commit[2] };
    }
  }

  return null;
}

function classifyUrl(value: string): SmartReference | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  return classifyHostedReference(url) ?? { kind: "external-url", url: url.toString() };
}

function classifyFile(meta: MarkdownFileLinkMeta): SmartReference {
  const workspaceRelativePath = meta.workspaceRelativePath;
  if (workspaceRelativePath !== null && meta.filePath.endsWith("/")) {
    return {
      kind: "workspace-directory",
      targetPath: meta.targetPath,
      workspaceRelativePath,
    };
  }
  return {
    kind: "workspace-file",
    file: meta,
    // Keep this aligned with the shared viewer classification. A binary that
    // is not in the small legacy allowlist below is still never safe to
    // execute from a reference (for example .dll, .so, or .wasm).
    unsafeToAutoExecute:
      classifyWorkspaceFile(meta.filePath) === "binary" ||
      REVEAL_ONLY_EXTENSIONS.has(extensionOf(meta.filePath)),
  };
}

/** Classify a rendered href or inline code value without performing any side effect. */
export function classifySmartReference(input: SmartReferenceInput): SmartReference | null {
  const candidate = (input.href ?? input.text)?.trim();
  if (!candidate) return null;

  if (input.href) {
    const markdownFile = resolveMarkdownFileLinkMeta(candidate, input.cwd);
    if (markdownFile) return classifyFile(markdownFile);
    return classifyUrl(candidate);
  }

  const urlReference = classifyUrl(candidate);
  if (urlReference) return urlReference;
  const inlineFile = resolveInlineCodeFileLinkMeta(candidate, input.cwd);
  return inlineFile ? classifyFile(inlineFile) : null;
}
