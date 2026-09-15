import type {
  ChatFileAttachment as ContractChatFileAttachment,
  ChatImageAttachment as ContractChatImageAttachment,
  ChatThreadAttachment as ContractChatThreadAttachment,
  OrchestrationCheckpointFile,
  OrchestrationCheckpointSummary,
  OrchestrationLatestTurn,
  OrchestrationMessage,
  OrchestrationProposedPlan,
  OrchestrationSession,
  ProjectScript as ContractProjectScript,
  ProviderInteractionMode,
  RuntimeMode,
} from "@rune/contracts";
import type {
  EnvironmentProject,
  EnvironmentThread,
  EnvironmentThreadShell,
} from "@rune/client-runtime/state/shell";

export { videoMimeType } from "@rune/shared/video";

export type SessionPhase =
  | "disconnected"
  | "connecting"
  | "ready"
  | "running"
  | "waiting-for-user";
export const DEFAULT_RUNTIME_MODE: RuntimeMode = "full-access";

export const DEFAULT_INTERACTION_MODE: ProviderInteractionMode = "default";
export const DEFAULT_THREAD_TERMINAL_HEIGHT = 280;
export const DEFAULT_THREAD_TERMINAL_ID = "term-1";
export const MAX_TERMINALS_PER_GROUP = 4;
export type ProjectScript = ContractProjectScript;

export interface ThreadTerminalGroup {
  id: string;
  terminalIds: string[];
  splitDirection?: "horizontal" | "vertical";
}

export interface ChatImageAttachment extends ContractChatImageAttachment {
  readonly previewUrl?: string;
}

export interface ChatFileAttachment extends ContractChatFileAttachment {
  readonly previewUrl?: string;
  readonly downloadable?: boolean;
}

export type ChatThreadAttachment = ContractChatThreadAttachment;
export type ChatAttachment = ChatImageAttachment | ChatFileAttachment | ChatThreadAttachment;

export function isImageAttachment(
  attachment: ChatAttachment,
): attachment is ChatImageAttachment {
  return attachment.type === "image";
}

export function isVideoAttachment(attachment: {
  readonly name: string;
  readonly mimeType: string;
}): boolean {
  return videoMimeType(attachment) !== null;
}

export function isBrowserPreviewAttachment(attachment: {
  readonly name: string;
  readonly mimeType: string;
}): boolean {
  const mimeType = attachment.mimeType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  return (
    mimeType === "application/pdf" ||
    mimeType.startsWith("audio/") ||
    mimeType.startsWith("image/") ||
    mimeType.startsWith("text/") ||
    mimeType.startsWith("video/") ||
    isVideoAttachment(attachment)
  );
}

export interface ChatMessage extends Omit<OrchestrationMessage, "attachments"> {
  readonly attachments?: ReadonlyArray<ChatAttachment> | undefined;
}

export type ProposedPlan = OrchestrationProposedPlan;
export type TurnDiffFileChange = OrchestrationCheckpointFile;
export type TurnDiffSummary = OrchestrationCheckpointSummary;

export type Project = EnvironmentProject;
export type Thread = EnvironmentThread;
export type ThreadShell = EnvironmentThreadShell;

export interface ThreadTurnState {
  latestTurn: OrchestrationLatestTurn | null;
}

export type SidebarThreadSummary = EnvironmentThreadShell;
export type ThreadSession = OrchestrationSession;
