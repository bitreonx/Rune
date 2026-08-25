export type ChatWebPreviewIntent =
  | "none"
  | "requested-link"
  | "requested-preview"
  | "requested-dev-server";

export interface ChatWebPreviewIntentMessage {
  readonly role: "user" | "assistant" | "system";
  readonly text: string;
}

const DEV_SERVER_REQUEST =
  /\b(?:run|start|launch|spin\s+up|turn\s+on|restart|serve)\b[\s\S]{0,72}\b(?:the\s+)?(?:dev(?:elopment)?\s+)?server\b|\b(?:dev(?:elopment)?\s+server)\b[\s\S]{0,72}\b(?:run|start|launch|spin\s+up|turn\s+on|restart)\b/i;
const PREVIEW_REQUEST =
  /\b(?:web\s+preview|preview\s+panel|preview\s+in\s+(?:the\s+)?browser|show\s+(?:me\s+)?(?:the\s+)?(?:web\s+)?preview|open\s+(?:the\s+)?(?:web\s+)?preview|open\s+it\s+in\s+(?:the\s+)?browser)\b/i;
const LINK_REQUEST =
  /\b(?:give|show|send|share|copy|open|visit|go\s+to|what(?:'s|\s+is))\b[\s\S]{0,72}\b(?:the\s+)?(?:web\s+)?(?:link|url|address)\b|\b(?:open|visit|go\s+to|load)\s+(?:https?:\/\/|www\.|localhost\b|127\.0\.0\.1\b)/i;

/**
 * Classify explicit web actions from user-authored chat only. Provider output
 * may contain URLs and server chatter, but neither should make the composer
 * grow a preview card without the user asking for one.
 */
export function classifyChatWebPreviewIntent(
  messages: ReadonlyArray<ChatWebPreviewIntentMessage>,
): ChatWebPreviewIntent {
  const userText = messages
    .filter((message) => message.role === "user")
    .map((message) => message.text.trim())
    .filter(Boolean)
    .join("\n");

  if (!userText) return "none";
  if (DEV_SERVER_REQUEST.test(userText)) return "requested-dev-server";
  if (PREVIEW_REQUEST.test(userText)) return "requested-preview";
  if (LINK_REQUEST.test(userText)) return "requested-link";
  return "none";
}
