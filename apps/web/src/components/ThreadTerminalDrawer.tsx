import { useAtomValue } from "@effect/atom-react";
import {
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
} from "@t3tools/client-runtime/state/runtime";
import { type TerminalSessionState } from "@t3tools/client-runtime/state/terminal";
import {
  ArrowDown,
  Plus,
  Search,
  Square,
  SquareSplitHorizontal,
  SquareSplitVertical,
  TerminalSquare,
  Trash2,
} from "lucide-react";
import {
  type ContextMenuItem,
  type ResolvedKeybindingsConfig,
  type ScopedThreadRef,
  type ThreadId,
} from "@t3tools/contracts";
import { getTerminalLabel } from "@t3tools/shared/terminalLabels";
import * as Schema from "effect/Schema";
import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { Popover, PopoverPopup, PopoverTrigger } from "~/components/ui/popover";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import { Button } from "~/components/ui/button";
import { PanelTabCloseButton } from "~/components/ui/panel-tab-close-button";
import { readTextFromClipboard, writeTextToClipboard } from "~/hooks/useCopyToClipboard";
import { cn } from "~/lib/utils";
import { type TerminalContextSelection } from "~/lib/terminalContext";
import {
  GhosttyTerminalSurface,
  type GhosttyTerminalSurfaceOptions,
} from "~/terminal/ghostty/surface";
import { type GhosttyColor, type GhosttyTheme } from "~/terminal/ghostty/core";
import { useOpenInPreferredEditor } from "../editorPreferences";
import { isTerminalLinkActivation, resolvePathLinkTarget } from "../terminal-links";
import {
  isDiffToggleShortcut,
  isTerminalClearShortcut,
  isTerminalNewShortcut,
  isTerminalSplitShortcut,
  isTerminalSplitVerticalShortcut,
  isTerminalToggleShortcut,
  terminalDeleteShortcutData,
  terminalNavigationShortcutData,
} from "../keybindings";
import {
  DEFAULT_THREAD_TERMINAL_HEIGHT,
  MAX_TERMINALS_PER_GROUP,
  type ThreadTerminalGroup,
} from "../types";
import { readLocalApi } from "~/localApi";
import { confirmTerminalClose } from "~/lib/terminalCloseConfirm";
import { useClientSettings } from "../hooks/useSettings";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { type TerminalSearchStatus } from "../terminal/ghostty/search";
import {
  useAttachedTerminalSession,
  useKnownTerminalSessions,
} from "../state/terminalSessions";
import { serverEnvironment } from "../state/server";
import { previewEnvironment } from "../state/preview";
import { terminalEnvironment } from "../state/terminal";
import { openTerminalLinkInPreview } from "./preview/openTerminalLinkInPreview";
import { ThreadTerminalSearchBar } from "./ThreadTerminalSearchBar";
import { useAtomCommand } from "../state/use-atom-command";
import { preventTerminalCloseShortcut } from "../lib/terminalCloseShortcut";
import {
  resolveTerminalFontPreference,
  resolveTerminalFontSizePreference,
  TYPOGRAPHY_ADVANCED_STORAGE_KEY,
} from "../appearanceFonts";

const MIN_DRAWER_HEIGHT = 180;
const MAX_DRAWER_HEIGHT_RATIO = 0.75;
const MULTI_CLICK_SELECTION_ACTION_DELAY_MS = 260;

function maxDrawerHeight(): number {
  if (typeof window === "undefined") return DEFAULT_THREAD_TERMINAL_HEIGHT;
  return Math.max(MIN_DRAWER_HEIGHT, Math.floor(window.innerHeight * MAX_DRAWER_HEIGHT_RATIO));
}

function clampDrawerHeight(height: number): number {
  const safeHeight = Number.isFinite(height) ? height : DEFAULT_THREAD_TERMINAL_HEIGHT;
  const maxHeight = maxDrawerHeight();
  return Math.min(Math.max(Math.round(safeHeight), MIN_DRAWER_HEIGHT), maxHeight);
}

function writeSystemMessage(terminal: GhosttyTerminalSurface, message: string): void {
  terminal.write(`\r\n[terminal] ${message}\r\n`);
}

function writeTerminalBuffer(terminal: GhosttyTerminalSurface, buffer: string): void {
  terminal.resetAndWrite(buffer);
}

function parseTerminalColor(value: string, fallback: GhosttyColor): GhosttyColor {
  if (typeof document === "undefined") return fallback;

  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return fallback;

  context.clearRect(0, 0, 1, 1);
  context.fillStyle = value;
  context.fillRect(0, 0, 1, 1);
  const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
  if (alpha === 0) return fallback;

  return {
    r: red ?? fallback.r,
    g: green ?? fallback.g,
    b: blue ?? fallback.b,
  };
}

function runtimeEnvSignature(runtimeEnv: Record<string, string> | undefined): string {
  if (!runtimeEnv) return "";
  return JSON.stringify(
    Object.entries(runtimeEnv)
      .filter(([key, value]) => key.length > 0 && typeof value === "string")
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey)),
  );
}

function normalizeComputedColor(value: string | null | undefined, fallback: string): string {
  const normalizedValue = value?.trim().toLowerCase();
  if (
    !normalizedValue ||
    normalizedValue === "transparent" ||
    normalizedValue === "rgba(0, 0, 0, 0)" ||
    normalizedValue === "rgba(0 0 0 / 0)"
  ) {
    return fallback;
  }
  return value ?? fallback;
}

function readThemeColor(styles: CSSStyleDeclaration, variable: string, fallback: string): string {
  return normalizeComputedColor(styles.getPropertyValue(variable), fallback);
}

/** The surface treats an omitted family or size as "use the built-in default". */
function terminalFontOptions(family: string, size: number): { family?: string; size: number } {
  const trimmed = family.trim();
  return trimmed.length > 0 ? { family: trimmed, size } : { size };
}

export function terminalThemeFromApp(mountElement?: HTMLElement | null): GhosttyTheme {
  const isDark = document.documentElement.classList.contains("dark");
  const fallbackBackground = isDark ? "rgb(14, 18, 24)" : "rgb(255, 255, 255)";
  const fallbackForeground = isDark ? "rgb(237, 241, 247)" : "rgb(28, 33, 41)";
  const drawerSurface =
    mountElement?.closest(".thread-terminal-drawer") ??
    document.querySelector(".thread-terminal-drawer") ??
    document.body;
  const drawerStyles = getComputedStyle(drawerSurface);
  const bodyStyles = getComputedStyle(document.body);
  const themeStyles = getComputedStyle(document.documentElement);
  const background = normalizeComputedColor(
    drawerStyles.backgroundColor,
    normalizeComputedColor(bodyStyles.backgroundColor, fallbackBackground),
  );
  const foreground = normalizeComputedColor(
    drawerStyles.color,
    normalizeComputedColor(bodyStyles.color, fallbackForeground),
  );
  const terminalBackground = readThemeColor(themeStyles, "--terminal-background", background);
  const terminalForeground = readThemeColor(themeStyles, "--terminal-foreground", foreground);
  const terminalCursor = readThemeColor(
    themeStyles,
    "--terminal-cursor",
    isDark ? "rgb(196, 181, 253)" : "rgb(91, 63, 145)",
  );
  const terminalSelection = readThemeColor(
    themeStyles,
    "--terminal-selection-background",
    isDark ? "rgba(167, 139, 250, 0.28)" : "rgba(115, 87, 215, 0.18)",
  );
  return {
    background: parseTerminalColor(
      terminalBackground,
      isDark ? { r: 14, g: 18, b: 24 } : { r: 255, g: 255, b: 255 },
    ),
    foreground: parseTerminalColor(
      terminalForeground,
      isDark ? { r: 237, g: 241, b: 247 } : { r: 28, g: 33, b: 41 },
    ),
    cursor: parseTerminalColor(
      terminalCursor,
      isDark ? { r: 196, g: 181, b: 253 } : { r: 91, g: 63, b: 145 },
    ),
    selectionBackground: terminalSelection,
  };
}

export function resolveTerminalSelectionActionPosition(options: {
  bounds: { left: number; top: number; width: number; height: number };
  selectionRect: { right: number; bottom: number } | null;
  pointer: { x: number; y: number } | null;
  viewport?: { width: number; height: number } | null;
}): { x: number; y: number } {
  const { bounds, selectionRect, pointer, viewport } = options;
  const viewportWidth =
    viewport?.width ??
    (typeof window === "undefined" ? bounds.left + bounds.width + 8 : window.innerWidth);
  const viewportHeight =
    viewport?.height ??
    (typeof window === "undefined" ? bounds.top + bounds.height + 8 : window.innerHeight);
  const drawerLeft = Math.round(bounds.left);
  const drawerTop = Math.round(bounds.top);
  const drawerRight = Math.round(bounds.left + bounds.width);
  const drawerBottom = Math.round(bounds.top + bounds.height);
  const preferredX =
    selectionRect !== null
      ? Math.round(selectionRect.right)
      : pointer === null
        ? Math.round(bounds.left + bounds.width - 140)
        : Math.max(drawerLeft, Math.min(Math.round(pointer.x), drawerRight));
  const preferredY =
    selectionRect !== null
      ? Math.round(selectionRect.bottom + 4)
      : pointer === null
        ? Math.round(bounds.top + 12)
        : Math.max(drawerTop, Math.min(Math.round(pointer.y), drawerBottom));
  return {
    x: Math.max(8, Math.min(preferredX, Math.max(viewportWidth - 8, 8))),
    y: Math.max(8, Math.min(preferredY, Math.max(viewportHeight - 8, 8))),
  };
}

export function terminalSelectionActionDelayForClickCount(clickCount: number): number {
  return clickCount >= 2 ? MULTI_CLICK_SELECTION_ACTION_DELAY_MS : 0;
}

export function shouldHandleTerminalSelectionMouseUp(
  selectionGestureActive: boolean,
  button: number,
): boolean {
  return selectionGestureActive && button === 0;
}

export function terminalSelectionLineRange(position: {
  start: { y: number };
  end: { y: number };
}): { lineStart: number; lineEnd: number } {
  const lineStart = position.start.y + 1;
  return {
    lineStart,
    lineEnd: Math.max(lineStart, position.end.y + 1),
  };
}

export type TerminalContextMenuAction = "add-to-chat" | "copy" | "paste";

/** Post-selection popup: just the two selection actions, always enabled. */
export function terminalSelectionMenuItems(): ContextMenuItem<"add-to-chat" | "copy">[] {
  return [
    { id: "add-to-chat", label: "Add to chat" },
    { id: "copy", label: "Copy" },
  ];
}

/**
 * Right-click menu for the terminal canvas: the selection actions (disabled
 * until a selection exists) plus Paste. Paste is always offered: the browser
 * (and Electron's default editing menu) can only paste into an editable
 * element, so a canvas terminal never gets a usable entry from them.
 */
export function terminalContextMenuItems(options: {
  hasSelection: boolean;
}): ContextMenuItem<TerminalContextMenuAction>[] {
  return [
    ...terminalSelectionMenuItems().map((item) => ({
      ...item,
      disabled: !options.hasSelection,
    })),
    { id: "paste", label: "Paste" },
  ];
}

/**
 * An empty selection change may only cancel a selection-action flow that is
 * still current: a pending popup timer, or an open popup whose request id has
 * not been superseded. A popup already superseded by a right-click keeps its
 * menu promise unsettled for a moment; treating it as active would cancel the
 * newer context-menu flow instead.
 */
export function shouldClearTerminalSelectionAction(options: {
  timerPending: boolean;
  openMenuRequestId: number | null;
  currentRequestId: number;
}): boolean {
  return options.timerPending || options.openMenuRequestId === options.currentRequestId;
}

export function shouldHandleTerminalExit(
  current: TerminalSessionState["status"],
  synchronized: TerminalSessionState["status"],
  alreadyHandled: boolean,
): boolean {
  return (
    (current === "closed" || current === "exited") && current !== synchronized && !alreadyHandled
  );
}

export type TerminalStatusTone = "running" | "starting" | "ended" | "error";

/** Maps a session status to the dot tone and accessible label shown next to tab titles. */
export function terminalStatusIndicator(status: TerminalSessionState["status"]): {
  tone: TerminalStatusTone;
  label: string;
} {
  switch (status) {
    case "running":
      return { tone: "running", label: "Running" };
    case "starting":
      return { tone: "starting", label: "Starting" };
    case "exited":
      return { tone: "ended", label: "Exited" };
    case "closed":
      return { tone: "ended", label: "Closed" };
    case "error":
      return { tone: "error", label: "Error" };
  }
}

interface TerminalViewportProps {
  advancedTypography: boolean;
  threadRef: ScopedThreadRef;
  threadId: ThreadId;
  terminalId: string;
  terminalLabel: string;
  cwd: string;
  worktreePath?: string | null;
  runtimeEnv?: Record<string, string>;
  onSessionExited: () => void;
  onAddTerminalContext: (selection: TerminalContextSelection) => void;
  focusRequestId: number;
  autoFocus: boolean;
  resizeEpoch: number;
  drawerHeight: number;
  keybindings: ResolvedKeybindingsConfig;
  /**
   * Chrome above the pane addresses surfaces through this registry — search
   * runs against the active pane without the pane owning any search UI.
   */
  onSurfacePresence?: (terminalId: string, surface: GhosttyTerminalSurface | null) => void;
  /** Search-state transitions from this pane's surface, tagged with its id. */
  onSearchStatus?: (terminalId: string, status: TerminalSearchStatus | null) => void;
  /** The viewport pins to or leaves the last page of scrollback. */
  onAtBottomChange?: (atBottom: boolean) => void;
}

interface TerminalLaunchLocation {
  readonly cwd: string;
  readonly worktreePath?: string | null;
  readonly runtimeEnv?: Record<string, string>;
}

export function TerminalViewport({
  advancedTypography,
  threadRef,
  threadId,
  terminalId,
  terminalLabel,
  cwd,
  worktreePath,
  runtimeEnv,
  onSessionExited,
  onAddTerminalContext,
  focusRequestId,
  autoFocus,
  resizeEpoch,
  drawerHeight,
  keybindings,
  onSurfacePresence,
  onSearchStatus,
  onAtBottomChange,
}: TerminalViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<GhosttyTerminalSurface | null>(null);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const environmentId = threadRef.environmentId;
  const serverConfig = useAtomValue(serverEnvironment.configValueAtom(environmentId));
  const openInPreferredEditor = useOpenInPreferredEditor(
    environmentId,
    serverConfig?.availableEditors ?? [],
  );
  const openTerminalPath = useEffectEvent((target: string) => openInPreferredEditor(target));
  const openPreview = useAtomCommand(previewEnvironment.open, {
    reportFailure: false,
  });
  const runTerminalWrite = useAtomCommand(terminalEnvironment.write, {
    reportFailure: false,
  });
  const runTerminalResize = useAtomCommand(terminalEnvironment.resize, {
    reportFailure: false,
  });
  const hasHandledExitRef = useRef(false);
  const selectionPointerRef = useRef<{ x: number; y: number } | null>(null);
  const selectionGestureActiveRef = useRef(false);
  const selectionActionRequestIdRef = useRef(0);
  // Holds the request id of the selection popup currently on screen, so a
  // popup that was superseded (but whose menu promise has not settled yet)
  // cannot be mistaken for the active flow.
  const openSelectionMenuRequestIdRef = useRef<number | null>(null);
  const selectionActionTimerRef = useRef<number | null>(null);
  const keybindingsRef = useRef(keybindings);
  const runtimeEnvKey = useMemo(() => runtimeEnvSignature(runtimeEnv), [runtimeEnv]);
  const handleSessionExited = useEffectEvent(() => {
    onSessionExited();
  });
  const reportSurfacePresence = useEffectEvent((surface: GhosttyTerminalSurface | null) => {
    onSurfacePresence?.(terminalId, surface);
  });
  const reportSearchStatus = useEffectEvent((status: TerminalSearchStatus | null) => {
    onSearchStatus?.(terminalId, status);
  });
  const reportAtBottom = useEffectEvent((atBottom: boolean) => {
    setIsScrolledUp(!atBottom);
    onAtBottomChange?.(atBottom);
  });
  const handleAddTerminalContext = useEffectEvent((selection: TerminalContextSelection) => {
    onAddTerminalContext(selection);
  });
  const readTerminalLabel = useEffectEvent(() => terminalLabel);
  const terminalFontFamily = useClientSettings((settings) =>
    resolveTerminalFontPreference({
      advanced: advancedTypography,
      code: settings.fontFamilyCode,
      terminal: settings.fontFamilyTerminal,
    }),
  );
  const terminalFontSize = useClientSettings((settings) =>
    resolveTerminalFontSizePreference({
      advanced: advancedTypography,
      code: settings.fontSizeCode,
      terminal: settings.fontSizeTerminal,
    }),
  );
  const terminalFontRef = useRef({ family: terminalFontFamily, size: terminalFontSize });
  const terminalSession = useAttachedTerminalSession({
    environmentId,
    terminal: {
      threadId,
      terminalId,
      cwd,
      ...(worktreePath !== undefined ? { worktreePath } : {}),
      ...(runtimeEnv ? { env: runtimeEnv } : {}),
    },
  });
  const writeTerminal = useEffectEvent((data: string) =>
    runTerminalWrite({
      environmentId,
      input: { threadId, terminalId, data },
    }),
  );
  const resizeTerminal = useEffectEvent((cols: number, rows: number) =>
    runTerminalResize({
      environmentId,
      input: { threadId, terminalId, cols, rows },
    }),
  );
  const terminalBuffer = terminalSession.buffer;
  const terminalError = terminalSession.error;
  const terminalStatus = terminalSession.status;
  const synchronizedStatusRef = useRef<TerminalSessionState["status"]>("closed");
  const synchronizeTerminalStatus = useEffectEvent(
    (terminal: GhosttyTerminalSurface, status: TerminalSessionState["status"]) => {
      const synchronized = synchronizedStatusRef.current;
      if (status === "running") {
        hasHandledExitRef.current = false;
      } else if (shouldHandleTerminalExit(status, synchronized, hasHandledExitRef.current)) {
        hasHandledExitRef.current = true;
        writeSystemMessage(terminal, status === "closed" ? "Terminal closed" : "Process exited");
        window.setTimeout(() => {
          if (hasHandledExitRef.current) {
            handleSessionExited();
          }
        }, 0);
      }
      synchronizedStatusRef.current = status;
    },
  );
  const terminalVersion = terminalSession.version;
  const previousSessionRef = useRef({
    buffer: terminalBuffer,
    error: terminalError,
    status: terminalStatus,
    version: terminalVersion,
  });
  const latestSessionRef = useRef(previousSessionRef.current);
  latestSessionRef.current = {
    buffer: terminalBuffer,
    error: terminalError,
    status: terminalStatus,
    version: terminalVersion,
  };

  useEffect(() => {
    keybindingsRef.current = keybindings;
  }, [keybindings]);

  useEffect(() => {
    const current = terminalFontRef.current;
    if (current.family === terminalFontFamily && current.size === terminalFontSize) return;
    terminalFontRef.current = { family: terminalFontFamily, size: terminalFontSize };
    void terminalRef.current?.setFont(terminalFontOptions(terminalFontFamily, terminalFontSize));
  }, [terminalFontFamily, terminalFontSize]);

  useEffect(() => {
    const mount = containerRef.current;
    if (!mount) return;

    const localApi = readLocalApi();
    let cancelled = false;
    let teardown: (() => void) | null = null;
    let setupTerminal: GhosttyTerminalSurface | null = null;
    let setupCleanups: Array<() => void> = [];

    const setup = async (): Promise<(() => void) | null> => {
      const setupFont = terminalFontRef.current;
      const terminalOptions: GhosttyTerminalSurfaceOptions = {
        theme: terminalThemeFromApp(mount),
        font: terminalFontOptions(setupFont.family, setupFont.size),
        onData: (data) => handleData(data),
        onResize: (cols, rows) => void resizeTerminal(cols, rows),
        onSelectionChange: () => handleSelectionChange(),
        beforeKey: (event) => handleBeforeKey(event),
        onLinkActivate: (text, event) => handleLinkActivate(text, event),
        // The surface listens from construction, so a right-click can land
        // while `create` is still awaiting WASM — before the handler below it
        // exists. The ref is only assigned once that setup has run.
        onContextMenu: (event) => {
          if (terminalRef.current) void showTerminalContextMenu(event);
        },
        onSearchChange: (status) => reportSearchStatus(status),
        onAtBottomChange: (atBottom) => reportAtBottom(atBottom),
      };
      const terminal = await GhosttyTerminalSurface.create(mount, terminalOptions);
      if (cancelled) {
        terminal.dispose();
        return null;
      }
      // The theme observer is not installed yet, so re-read the theme in case
      // the app toggled light/dark while the WASM surface was loading.
      terminal.setTheme(terminalThemeFromApp(mount));
      setupTerminal = terminal;
      terminalRef.current = terminal;
      reportSurfacePresence(terminal);
      // Client settings hydrate asynchronously; a font preference that landed
      // while the surface was loading found terminalRef null, so its setFont
      // was dropped. Re-apply whatever is current once the terminal exists.
      const currentFont = terminalFontRef.current;
      if (currentFont.family !== setupFont.family || currentFont.size !== setupFont.size) {
        void terminal.setFont(terminalFontOptions(currentFont.family, currentFont.size));
      }
      const latestSession = latestSessionRef.current;
      previousSessionRef.current = latestSession;
      if (latestSession.buffer.length > 0) terminal.resetAndWrite(latestSession.buffer);
      if (latestSession.error !== null) writeSystemMessage(terminal, latestSession.error);
      // Attaching to a session that already exited must still run exit handling
      // once, so mount synchronization starts from the empty "closed" state.
      // (A session that is "closed" at mount is indistinguishable from one that
      // never started, so only "exited" triggers the message — as with xterm.)
      synchronizedStatusRef.current = "closed";
      synchronizeTerminalStatus(terminal, latestSession.status);
      if (autoFocus) window.requestAnimationFrame(() => terminal.focus());

      const clearSelectionAction = () => {
        selectionActionRequestIdRef.current += 1;
        if (selectionActionTimerRef.current !== null) {
          window.clearTimeout(selectionActionTimerRef.current);
          selectionActionTimerRef.current = null;
        }
      };
      setupCleanups.push(clearSelectionAction);

      const readSelectionAction = (): {
        position: { x: number; y: number };
        clipboardText: string;
        selection: TerminalContextSelection;
      } | null => {
        const activeTerminal = terminalRef.current;
        const mountElement = containerRef.current;
        if (!activeTerminal || !mountElement || !activeTerminal.hasSelection()) {
          return null;
        }
        const selectionText = activeTerminal.getSelection();
        const selectionPosition = activeTerminal.getSelectionPosition();
        const normalizedText = selectionText.replace(/\r\n/g, "\n").replace(/^\n+|\n+$/g, "");
        if (!selectionPosition || normalizedText.length === 0) {
          return null;
        }
        const { lineStart, lineEnd } = terminalSelectionLineRange(selectionPosition);
        const bounds = mountElement.getBoundingClientRect();
        const position = resolveTerminalSelectionActionPosition({
          bounds,
          selectionRect: activeTerminal.getSelectionEndClientRect(),
          pointer: selectionPointerRef.current,
        });
        return {
          position,
          clipboardText: selectionText,
          selection: {
            terminalId,
            terminalLabel: readTerminalLabel(),
            lineStart,
            lineEnd,
            text: normalizedText,
          },
        };
      };

      const addSelectionToChat = (selection: TerminalContextSelection) => {
        handleAddTerminalContext(selection);
        terminalRef.current?.clearSelection();
        terminalRef.current?.focus();
      };

      // A selection-action flow that was superseded while its async work ran
      // must go silent: no error message, no focus steal.
      const reportIfCurrent = (requestId: number, error: unknown, fallback: string) => {
        if (requestId !== selectionActionRequestIdRef.current) return;
        const activeTerminal = terminalRef.current;
        if (activeTerminal) {
          writeSystemMessage(activeTerminal, error instanceof Error ? error.message : fallback);
        }
      };

      const focusIfCurrent = (requestId: number) => {
        if (requestId === selectionActionRequestIdRef.current) {
          terminalRef.current?.focus();
        }
      };

      const copySelection = async (text: string, requestId: number) => {
        try {
          await writeTextToClipboard(text, "terminal selection");
        } catch (error) {
          reportIfCurrent(requestId, error, "Unable to copy terminal selection");
        }
        focusIfCurrent(requestId);
      };

      const pasteFromClipboard = async (requestId: number) => {
        const activeTerminal = terminalRef.current;
        if (!activeTerminal) return;
        try {
          // The surface owns the read so it can claim the paste race before it
          // starts: a paste shortcut fired while the menu read is in flight
          // supersedes this paste instead of landing alongside it.
          await activeTerminal.pasteFromClipboard(
            () => readTextFromClipboard("terminal input"),
            () => requestId === selectionActionRequestIdRef.current,
          );
        } catch (error) {
          reportIfCurrent(requestId, error, "Unable to read the clipboard");
          return;
        }
        focusIfCurrent(requestId);
      };

      const showTerminalContextMenu = async (event: MouseEvent) => {
        if (!localApi || !terminalRef.current) return;
        // Own the gesture before anything async: leaving the default alive lets
        // the browser (or Electron's editing menu) answer with a Paste entry
        // that is permanently disabled over the terminal canvas.
        event.preventDefault();
        // A right-click supersedes a selection popup that is pending or open.
        clearSelectionAction();
        const selectionAction = readSelectionAction();
        const requestId = selectionActionRequestIdRef.current;
        let clicked: TerminalContextMenuAction | null;
        try {
          clicked = await localApi.contextMenu.show(
            terminalContextMenuItems({ hasSelection: selectionAction !== null }),
            { x: event.clientX, y: event.clientY },
          );
        } catch (error) {
          reportIfCurrent(requestId, error, "Unable to open the terminal context menu");
          focusIfCurrent(requestId);
          return;
        }
        if (requestId !== selectionActionRequestIdRef.current || clicked === null) {
          return;
        }
        switch (clicked) {
          case "add-to-chat":
            if (selectionAction) addSelectionToChat(selectionAction.selection);
            return;
          case "copy":
            if (selectionAction) await copySelection(selectionAction.clipboardText, requestId);
            return;
          case "paste":
            await pasteFromClipboard(requestId);
            return;
        }
      };

      const showSelectionAction = async () => {
        if (!localApi) {
          clearSelectionAction();
          return;
        }
        if (openSelectionMenuRequestIdRef.current !== null) {
          return;
        }
        const nextAction = readSelectionAction();
        if (!nextAction) {
          clearSelectionAction();
          return;
        }
        const requestId = ++selectionActionRequestIdRef.current;
        openSelectionMenuRequestIdRef.current = requestId;
        const clicked = await localApi.contextMenu
          .show(terminalSelectionMenuItems(), nextAction.position)
          .finally(() => {
            if (openSelectionMenuRequestIdRef.current === requestId) {
              openSelectionMenuRequestIdRef.current = null;
            }
          });
        if (requestId !== selectionActionRequestIdRef.current || clicked === null) {
          return;
        }
        switch (clicked) {
          case "add-to-chat":
            addSelectionToChat(nextAction.selection);
            return;
          case "copy":
            await copySelection(nextAction.clipboardText, requestId);
            return;
        }
      };

      const sendTerminalInput = async (data: string, fallbackError: string) => {
        const activeTerminal = terminalRef.current;
        if (!activeTerminal) return;
        const result = await writeTerminal(data);
        if (result._tag === "Failure" && !isAtomCommandInterrupted(result)) {
          const error = squashAtomCommandFailure(result);
          writeSystemMessage(
            activeTerminal,
            error instanceof Error ? error.message : fallbackError,
          );
        }
      };

      function handleBeforeKey(event: KeyboardEvent): boolean {
        const currentKeybindings = keybindingsRef.current;
        const options = { context: { terminalFocus: true, terminalOpen: true } };
        if (preventTerminalCloseShortcut(event, currentKeybindings)) {
          return false;
        }
        if (
          isTerminalToggleShortcut(event, currentKeybindings, options) ||
          isTerminalSplitShortcut(event, currentKeybindings, options) ||
          isTerminalSplitVerticalShortcut(event, currentKeybindings, options) ||
          isTerminalNewShortcut(event, currentKeybindings, options) ||
          isDiffToggleShortcut(event, currentKeybindings, options)
        ) {
          return false;
        }

        const navigationData = terminalNavigationShortcutData(event);
        if (navigationData !== null) {
          event.preventDefault();
          event.stopPropagation();
          void sendTerminalInput(navigationData, "Failed to move cursor");
          return false;
        }

        const deleteData = terminalDeleteShortcutData(event);
        if (deleteData !== null) {
          event.preventDefault();
          event.stopPropagation();
          void sendTerminalInput(deleteData, "Failed to delete terminal input");
          return false;
        }

        if (!isTerminalClearShortcut(event)) return true;
        event.preventDefault();
        event.stopPropagation();
        void sendTerminalInput("\u000c", "Failed to clear terminal");
        return false;
      }

      function handleLinkActivate(text: string, event: MouseEvent): void {
        if (!isTerminalLinkActivation(event)) return;
        const latestTerminal = terminalRef.current;
        if (!latestTerminal) return;
        if (/^https?:\/\//u.test(text)) {
          if (!localApi) {
            writeSystemMessage(latestTerminal, "Opening links is unavailable in this browser.");
            return;
          }
          const fallbackToBrowser = () => {
            void localApi.shell.openExternal(text).catch((error: unknown) => {
              writeSystemMessage(
                latestTerminal,
                error instanceof Error ? error.message : "Unable to open link",
              );
            });
          };
          void openTerminalLinkInPreview({
            url: text,
            position: { x: event.clientX, y: event.clientY },
            threadRef,
            openPreview,
            localApi,
            fallbackToBrowser,
          });
          return;
        }
        const target = resolvePathLinkTarget(text, cwd);
        void (async () => {
          const result = await openTerminalPath(target);
          if (result._tag === "Success" || isAtomCommandInterrupted(result)) {
            return;
          }
          const error = squashAtomCommandFailure(result);
          writeSystemMessage(
            latestTerminal,
            error instanceof Error ? error.message : "Unable to open path",
          );
        })();
      }

      function handleData(data: string): void {
        void (async () => {
          const result = await writeTerminal(data);
          if (result._tag === "Success" || isAtomCommandInterrupted(result)) return;
          const error = squashAtomCommandFailure(result);
          writeSystemMessage(
            terminal,
            error instanceof Error ? error.message : "Terminal write failed",
          );
        })();
      }

      function handleSelectionChange(): void {
        if (terminalRef.current?.hasSelection()) {
          return;
        }
        const shouldClear = shouldClearTerminalSelectionAction({
          timerPending: selectionActionTimerRef.current !== null,
          openMenuRequestId: openSelectionMenuRequestIdRef.current,
          currentRequestId: selectionActionRequestIdRef.current,
        });
        if (!shouldClear) return;
        clearSelectionAction();
        // A copy shortcut that clears the selection (Ctrl+C) must also close
        // the context menu that appears with the selection, but a clear that
        // never opened a menu must not dismiss an unrelated one.
        if (openSelectionMenuRequestIdRef.current !== null) {
          void localApi?.contextMenu.close();
        }
      }

      const handleMouseUp = (event: MouseEvent) => {
        const shouldHandle = shouldHandleTerminalSelectionMouseUp(
          selectionGestureActiveRef.current,
          event.button,
        );
        selectionGestureActiveRef.current = false;
        if (!shouldHandle) {
          return;
        }
        selectionPointerRef.current = { x: event.clientX, y: event.clientY };
        const delay = terminalSelectionActionDelayForClickCount(event.detail);
        selectionActionTimerRef.current = window.setTimeout(() => {
          selectionActionTimerRef.current = null;
          window.requestAnimationFrame(() => {
            void showSelectionAction();
          });
        }, delay);
      };
      const handlePointerDown = (event: PointerEvent) => {
        clearSelectionAction();
        selectionGestureActiveRef.current = event.button === 0;
      };
      window.addEventListener("mouseup", handleMouseUp);
      mount.addEventListener("pointerdown", handlePointerDown);
      setupCleanups.push(() => {
        window.removeEventListener("mouseup", handleMouseUp);
        mount.removeEventListener("pointerdown", handlePointerDown);
      });

      const themeObserver = new MutationObserver(() => {
        const activeTerminal = terminalRef.current;
        if (!activeTerminal) return;
        activeTerminal.setTheme(terminalThemeFromApp(containerRef.current));
      });
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class", "style"],
      });
      setupCleanups.push(() => themeObserver.disconnect());

      const fitTimer = window.setTimeout(() => {
        const activeTerminal = terminalRef.current;
        if (!activeTerminal) return;
        const wasAtBottom = activeTerminal.isAtBottom();
        activeTerminal.fit();
        if (wasAtBottom) {
          activeTerminal.scrollToBottom();
        }
      }, 30);
      setupCleanups.push(() => window.clearTimeout(fitTimer));

      const cleanups = setupCleanups;
      setupCleanups = [];
      setupTerminal = null;
      return () => {
        for (const cleanup of cleanups.toReversed()) cleanup();
        reportSurfacePresence(null);
        if (terminalRef.current === terminal) terminalRef.current = null;
        terminal.dispose();
      };
    };

    void setup()
      .then((nextTeardown) => {
        if (cancelled) {
          nextTeardown?.();
          return;
        }
        teardown = nextTeardown;
      })
      .catch((error: unknown) => {
        for (const cleanup of setupCleanups.toReversed()) cleanup();
        setupCleanups = [];
        reportSurfacePresence(null);
        if (terminalRef.current === setupTerminal) terminalRef.current = null;
        setupTerminal?.dispose();
        setupTerminal = null;
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : "Unable to initialize libghostty-vt";
        mount.textContent = `${message} — close and reopen the terminal to retry.`;
      });

    return () => {
      cancelled = true;
      teardown?.();
    };
    // autoFocus is intentionally omitted;
    // it is only read at mount time and must not trigger terminal teardown/recreation.
  }, [cwd, environmentId, runtimeEnvKey, terminalId, threadId, worktreePath]);

  useEffect(() => {
    const terminal = terminalRef.current;
    const current = {
      buffer: terminalBuffer,
      error: terminalError,
      status: terminalStatus,
      version: terminalVersion,
    };
    if (!terminal) {
      previousSessionRef.current = current;
      return;
    }

    const previous = previousSessionRef.current;
    synchronizeTerminalStatus(terminal, current.status);
    if (current.version === previous.version) {
      return;
    }

    if (
      current.buffer.length >= previous.buffer.length &&
      current.buffer.startsWith(previous.buffer)
    ) {
      terminal.write(current.buffer.slice(previous.buffer.length));
    } else {
      writeTerminalBuffer(terminal, current.buffer);
    }
    terminal.clearSelection();

    if (current.error !== null && current.error !== previous.error) {
      writeSystemMessage(terminal, current.error);
    }

    if (previous.version === 0 && autoFocus) {
      window.requestAnimationFrame(() => {
        terminal.focus();
      });
    }
    previousSessionRef.current = current;
  }, [autoFocus, terminalBuffer, terminalError, terminalStatus, terminalVersion]);

  useEffect(() => {
    if (!autoFocus) return;
    const terminal = terminalRef.current;
    if (!terminal) return;
    const frame = window.requestAnimationFrame(() => {
      terminal.focus();
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [autoFocus, focusRequestId]);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;
    const wasAtBottom = terminal.isAtBottom();
    // The surface reports grid changes through onResize, which is the single
    // channel for PTY resize RPCs; fitting here only refreshes the layout.
    const frame = window.requestAnimationFrame(() => {
      terminal.fit();
      if (wasAtBottom) {
        terminal.scrollToBottom();
      }
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [drawerHeight, environmentId, resizeEpoch, terminalId, threadId]);
  return (
    <div className="relative h-full w-full overflow-hidden bg-[var(--terminal-background)]">
      {/* The surface claims this node with replaceChildren, so overlays must
          live beside it, not inside it. */}
      <div ref={containerRef} className="h-full w-full" />
      {isScrolledUp ? (
        <button
          type="button"
          data-terminal-jump-to-bottom="true"
          aria-label="Jump to bottom"
          className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 cursor-pointer items-center gap-1 rounded-full border border-border/60 bg-background/85 px-2.5 py-1 text-[11px] font-medium text-muted-foreground shadow-lg backdrop-blur-md transition-colors hover:bg-accent hover:text-foreground"
          onClick={() => {
            terminalRef.current?.scrollToBottom();
            terminalRef.current?.focus();
          }}
        >
          <ArrowDown className="size-3" aria-hidden />
          Bottom
        </button>
      ) : null}
    </div>
  );
}

interface ThreadTerminalDrawerProps {
  mode?: "drawer" | "panel";
  threadRef: ScopedThreadRef;
  threadId: ThreadId;
  cwd: string;
  worktreePath?: string | null;
  runtimeEnv?: Record<string, string>;
  visible?: boolean;
  motionState?: "closed" | "opening" | "open" | "closing";
  height: number;
  terminalIds: string[];
  activeTerminalId: string;
  terminalGroups: ThreadTerminalGroup[];
  activeTerminalGroupId: string;
  focusRequestId: number;
  onSplitTerminal: () => void;
  onSplitTerminalVertical: () => void;
  onNewTerminal: () => void;
  splitShortcutLabel?: string | undefined;
  splitVerticalShortcutLabel?: string | undefined;
  newShortcutLabel?: string | undefined;
  closeShortcutLabel?: string | undefined;
  /** Bumped by the terminal.search command to open the buffer search row. */
  searchRequestId?: number | undefined;
  searchShortcutLabel?: string | undefined;
  onActiveTerminalChange: (terminalId: string) => void;
  onCloseTerminal: (terminalId: string) => void;
  onHeightChange: (height: number) => void;
  onAddTerminalContext: (selection: TerminalContextSelection) => void;
  keybindings: ResolvedKeybindingsConfig;
  /** Prefer server-provided tab titles when present (e.g. active subprocess name). */
  terminalLabelsById?: ReadonlyMap<string, string>;
  /** Prefer per-session launch locations when the server already knows a terminal. */
  terminalLaunchLocationsById?: ReadonlyMap<string, TerminalLaunchLocation>;
}

interface TerminalActionButtonProps {
  label: string;
  className: string;
  onClick: () => void;
  children: ReactNode;
}

function TerminalActionButton({ label, className, onClick, children }: TerminalActionButtonProps) {
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        render={<button type="button" className={className} onClick={onClick} aria-label={label} />}
      >
        {children}
      </PopoverTrigger>
      <PopoverPopup
        tooltipStyle
        side="bottom"
        sideOffset={6}
        align="center"
        className="pointer-events-none select-none"
      >
        {label}
      </PopoverPopup>
    </Popover>
  );
}

const TERMINAL_STATUS_DOT_CLASS: Record<TerminalStatusTone, string> = {
  running: "bg-emerald-400",
  starting: "bg-amber-400",
  ended: "bg-muted-foreground/50",
  error: "bg-destructive",
};

/**
 * Live/dead indicator rendered next to tab titles and in the header bar.
 * Renders as a span so it stays valid inside the sidebar's tab buttons.
 */
function TerminalStatusDot({ status }: { status: TerminalSessionState["status"] }) {
  const indicator = terminalStatusIndicator(status);
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            role="status"
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              TERMINAL_STATUS_DOT_CLASS[indicator.tone],
            )}
          />
        }
      >
        <span className="sr-only">{indicator.label}</span>
      </TooltipTrigger>
      <TooltipPopup side="bottom">{indicator.label}</TooltipPopup>
    </Tooltip>
  );
}

export default function ThreadTerminalDrawer({
  mode = "drawer",
  threadRef,
  threadId,
  cwd,
  worktreePath,
  runtimeEnv,
  visible = true,
  motionState,
  height,
  terminalIds,
  activeTerminalId,
  terminalGroups,
  activeTerminalGroupId,
  focusRequestId,
  onSplitTerminal,
  onSplitTerminalVertical,
  onNewTerminal,
  splitShortcutLabel,
  splitVerticalShortcutLabel,
  newShortcutLabel,
  closeShortcutLabel,
  searchRequestId,
  searchShortcutLabel,
  onActiveTerminalChange,
  onCloseTerminal,
  onHeightChange,
  onAddTerminalContext,
  keybindings,
  terminalLabelsById,
  terminalLaunchLocationsById,
}: ThreadTerminalDrawerProps) {
  const isPanel = mode === "panel";
  const resolvedMotionState = motionState ?? (visible ? "open" : "closed");
  const [advancedTypography] = useLocalStorage(
    TYPOGRAPHY_ADVANCED_STORAGE_KEY,
    false,
    Schema.Boolean,
  );
  const controlledDrawerHeight = clampDrawerHeight(height);
  const [drawerHeightState, setDrawerHeightState] = useState(() => ({
    threadId,
    height: controlledDrawerHeight,
  }));
  const drawerHeight =
    drawerHeightState.threadId === threadId ? drawerHeightState.height : controlledDrawerHeight;
  const setDrawerHeight = useCallback(
    (update: SetStateAction<number>) => {
      setDrawerHeightState((current) => {
        const currentHeight =
          current.threadId === threadId ? current.height : controlledDrawerHeight;
        const nextHeight = typeof update === "function" ? update(currentHeight) : update;
        return nextHeight === currentHeight && current.threadId === threadId
          ? current
          : { threadId, height: nextHeight };
      });
    },
    [controlledDrawerHeight, threadId],
  );
  const setDrawerHeightFromWindowResize = useEffectEvent((nextHeight: number) => {
    setDrawerHeight(nextHeight);
  });
  const [resizeEpoch, setResizeEpoch] = useState(0);
  const drawerHeightRef = useRef(drawerHeight);
  const lastSyncedHeightRef = useRef(controlledDrawerHeight);
  const onHeightChangeRef = useRef(onHeightChange);
  const resizeStateRef = useRef<{
    pointerId: number;
    startY: number;
    startHeight: number;
  } | null>(null);
  const didResizeDuringDragRef = useRef(false);

  const normalizedTerminalIds = useMemo(() => {
    const normalizedIds: string[] = [];
    const seen = new Set<string>();
    for (const id of terminalIds) {
      const trimmedId = id.trim();
      if (trimmedId.length === 0 || seen.has(trimmedId)) continue;
      seen.add(trimmedId);
      normalizedIds.push(trimmedId);
    }
    return normalizedIds;
  }, [terminalIds]);

  const resolvedActiveTerminalId =
    normalizedTerminalIds.length === 0
      ? ""
      : normalizedTerminalIds.includes(activeTerminalId)
        ? activeTerminalId
        : (normalizedTerminalIds[0] ?? "");

  const resolvedTerminalGroups = useMemo(() => {
    if (normalizedTerminalIds.length === 0) {
      return [];
    }
    const validTerminalIdSet = new Set(normalizedTerminalIds);
    const assignedTerminalIds = new Set<string>();
    const usedGroupIds = new Set<string>();
    const nextGroups: ThreadTerminalGroup[] = [];

    const assignUniqueGroupId = (groupId: string): string => {
      if (!usedGroupIds.has(groupId)) {
        usedGroupIds.add(groupId);
        return groupId;
      }
      let suffix = 2;
      while (usedGroupIds.has(`${groupId}-${suffix}`)) {
        suffix += 1;
      }
      const uniqueGroupId = `${groupId}-${suffix}`;
      usedGroupIds.add(uniqueGroupId);
      return uniqueGroupId;
    };

    for (const terminalGroup of terminalGroups) {
      const nextTerminalIds: string[] = [];
      const seenGroupTerminalIds = new Set<string>();
      for (const id of terminalGroup.terminalIds) {
        const terminalId = id.trim();
        if (terminalId.length === 0) continue;
        if (seenGroupTerminalIds.has(terminalId)) continue;
        seenGroupTerminalIds.add(terminalId);
        if (!validTerminalIdSet.has(terminalId)) continue;
        if (assignedTerminalIds.has(terminalId)) continue;
        nextTerminalIds.push(terminalId);
      }
      if (nextTerminalIds.length === 0) continue;

      for (const terminalId of nextTerminalIds) {
        assignedTerminalIds.add(terminalId);
      }

      const baseGroupId =
        terminalGroup.id.trim().length > 0
          ? terminalGroup.id.trim()
          : `group-${nextTerminalIds[0] ?? normalizedTerminalIds[0] ?? ""}`;
      nextGroups.push({
        id: assignUniqueGroupId(baseGroupId),
        terminalIds: nextTerminalIds,
        ...(terminalGroup.splitDirection === "vertical"
          ? { splitDirection: "vertical" as const }
          : {}),
      });
    }

    for (const terminalId of normalizedTerminalIds) {
      if (assignedTerminalIds.has(terminalId)) continue;
      nextGroups.push({
        id: assignUniqueGroupId(`group-${terminalId}`),
        terminalIds: [terminalId],
      });
    }

    const terminalOrderIndex = new Map(
      normalizedTerminalIds.map((id, index) => [id, index] as const),
    );
    nextGroups.sort((left, right) => {
      const rank = (ids: readonly string[]) =>
        Math.min(...ids.map((id) => terminalOrderIndex.get(id) ?? Number.POSITIVE_INFINITY));
      return rank(left.terminalIds) - rank(right.terminalIds);
    });

    return nextGroups;
  }, [normalizedTerminalIds, terminalGroups]);

  const resolvedActiveGroupIndex = useMemo(() => {
    const indexById = resolvedTerminalGroups.findIndex(
      (terminalGroup) => terminalGroup.id === activeTerminalGroupId,
    );
    if (indexById >= 0) return indexById;
    const indexByTerminal = resolvedTerminalGroups.findIndex((terminalGroup) =>
      terminalGroup.terminalIds.includes(resolvedActiveTerminalId),
    );
    return indexByTerminal >= 0 ? indexByTerminal : 0;
  }, [activeTerminalGroupId, resolvedActiveTerminalId, resolvedTerminalGroups]);

  const visibleTerminalIds =
    resolvedTerminalGroups[resolvedActiveGroupIndex]?.terminalIds ??
    (normalizedTerminalIds.length > 0 ? [resolvedActiveTerminalId] : []);
  const splitDirection =
    resolvedTerminalGroups[resolvedActiveGroupIndex]?.splitDirection ?? "horizontal";
  const hasTerminalSidebar = normalizedTerminalIds.length > 1;
  const isSplitView = visibleTerminalIds.length > 1;
  const showGroupHeaders =
    resolvedTerminalGroups.length > 1 ||
    resolvedTerminalGroups.some((terminalGroup) => terminalGroup.terminalIds.length > 1);
  const hasReachedSplitLimit = visibleTerminalIds.length >= MAX_TERMINALS_PER_GROUP;
  const terminalLabelById = useMemo(() => {
    const next = new Map<string, string>();
    for (const terminalId of normalizedTerminalIds) {
      next.set(terminalId, terminalLabelsById?.get(terminalId) ?? getTerminalLabel(terminalId));
    }
    return next;
  }, [normalizedTerminalIds, terminalLabelsById]);
  const resolveTerminalLaunchLocation = useCallback(
    (terminalId: string): TerminalLaunchLocation => {
      return (
        terminalLaunchLocationsById?.get(terminalId) ?? {
          cwd,
          ...(worktreePath !== undefined ? { worktreePath } : {}),
          ...(runtimeEnv ? { runtimeEnv } : {}),
        }
      );
    },
    [cwd, runtimeEnv, terminalLaunchLocationsById, worktreePath],
  );
  const splitTerminalActionLabel = hasReachedSplitLimit
    ? `Split Terminal Horizontally (max ${MAX_TERMINALS_PER_GROUP} per group)`
    : splitShortcutLabel
      ? `Split Terminal Horizontally (${splitShortcutLabel})`
      : "Split Terminal Horizontally";
  const splitTerminalVerticalActionLabel = hasReachedSplitLimit
    ? `Split Terminal Vertically (max ${MAX_TERMINALS_PER_GROUP} per group)`
    : splitVerticalShortcutLabel
      ? `Split Terminal Vertically (${splitVerticalShortcutLabel})`
      : "Split Terminal Vertically";
  const newTerminalActionLabel = newShortcutLabel
    ? `New Terminal (${newShortcutLabel})`
    : "New Terminal";
  const closeTerminalActionLabel = closeShortcutLabel
    ? `Close Terminal (${closeShortcutLabel})`
    : "Close Terminal";
  const onSplitTerminalAction = useCallback(() => {
    if (hasReachedSplitLimit) return;
    onSplitTerminal();
  }, [hasReachedSplitLimit, onSplitTerminal]);
  const onSplitTerminalVerticalAction = useCallback(() => {
    if (hasReachedSplitLimit) return;
    onSplitTerminalVertical();
  }, [hasReachedSplitLimit, onSplitTerminalVertical]);
  const onNewTerminalAction = useCallback(() => {
    onNewTerminal();
  }, [onNewTerminal]);
  const confirmCloseTerminal = useCallback(
    (terminalId: string) => {
      const label = terminalLabelById.get(terminalId) ?? getTerminalLabel(terminalId);
      void confirmTerminalClose([label]).then((confirmed) => {
        if (confirmed) onCloseTerminal(terminalId);
      });
    },
    [onCloseTerminal, terminalLabelById],
  );

  const knownTerminalSessions = useKnownTerminalSessions({
    environmentId: threadRef.environmentId,
    threadId,
  });
  const terminalStatusById = useMemo(() => {
    const next = new Map<string, TerminalSessionState["status"]>();
    for (const session of knownTerminalSessions) {
      next.set(session.target.terminalId, session.state.status);
    }
    return next;
  }, [knownTerminalSessions]);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchStatus, setSearchStatus] = useState<TerminalSearchStatus | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  // Live surfaces by terminal id; chrome drives the active pane through this
  // registry instead of reaching into pane-local refs.
  const terminalSurfacesRef = useRef(new Map<string, GhosttyTerminalSurface>());
  const activeTerminalIdRef = useRef(resolvedActiveTerminalId);
  activeTerminalIdRef.current = resolvedActiveTerminalId;
  const lastSearchRequestRef = useRef(searchRequestId ?? 0);
  const searchActionLabel = isSearchOpen
    ? "Close Search"
    : searchShortcutLabel
      ? `Search Terminal (${searchShortcutLabel})`
      : "Search Terminal";
  // Sessions absent from server metadata have not reported yet; treat them as
  // starting rather than silently dead.
  const activeTerminalStatus: TerminalSessionState["status"] | null = resolvedActiveTerminalId
    ? (terminalStatusById.get(resolvedActiveTerminalId) ?? "starting")
    : null;

  useEffect(() => {
    const request = searchRequestId ?? 0;
    if (request === lastSearchRequestRef.current) return;
    lastSearchRequestRef.current = request;
    if (request === 0 || normalizedTerminalIds.length === 0) return;
    setIsSearchOpen(true);
  }, [normalizedTerminalIds.length, searchRequestId]);

  const handleSurfacePresence = useCallback(
    (surfaceTerminalId: string, surface: GhosttyTerminalSurface | null) => {
      const surfaces = terminalSurfacesRef.current;
      if (surface === null) {
        surfaces.delete(surfaceTerminalId);
        return;
      }
      surfaces.set(surfaceTerminalId, surface);
    },
    [],
  );

  const handleSearchStatus = useCallback(
    (statusTerminalId: string, status: TerminalSearchStatus | null) => {
      if (statusTerminalId !== activeTerminalIdRef.current) return;
      setSearchStatus(status);
    },
    [],
  );

  const clearAllTerminalSearches = useCallback(() => {
    for (const surface of terminalSurfacesRef.current.values()) {
      surface.clearSearch();
    }
    setSearchStatus(null);
  }, []);

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
    setSearchQuery("");
    clearAllTerminalSearches();
    terminalSurfacesRef.current.get(activeTerminalIdRef.current)?.focus();
  }, [clearAllTerminalSearches]);

  const toggleSearch = useCallback(() => {
    if (isSearchOpen) {
      closeSearch();
      return;
    }
    setIsSearchOpen(true);
  }, [closeSearch, isSearchOpen]);

  const stepSearch = useCallback((direction: 1 | -1) => {
    const surface = terminalSurfacesRef.current.get(activeTerminalIdRef.current);
    if (!surface) return;
    if (direction === 1) {
      surface.searchNext();
      return;
    }
    surface.searchPrevious();
  }, []);

  // Focus (and select, so typing replaces the previous query) on open.
  useEffect(() => {
    if (!isSearchOpen) return;
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  }, [isSearchOpen]);

  // Rescan the active buffer for the query. Debounced because a scan pages
  // through the whole scrollback synchronously.
  useEffect(() => {
    if (!isSearchOpen) return;
    const surface = terminalSurfacesRef.current.get(resolvedActiveTerminalId);
    if (!surface) return;
    if (searchQuery.length === 0) {
      surface.clearSearch();
      setSearchStatus(null);
      return;
    }
    const timer = window.setTimeout(() => {
      surface.search(searchQuery);
    }, 150);
    return () => {
      window.clearTimeout(timer);
    };
  }, [isSearchOpen, resolvedActiveTerminalId, searchQuery]);

  // Switching panes drops the previous pane's highlights; the effect above
  // scans the newly active one.
  const searchActiveTerminalRef = useRef(resolvedActiveTerminalId);
  useEffect(() => {
    const previous = searchActiveTerminalRef.current;
    searchActiveTerminalRef.current = resolvedActiveTerminalId;
    if (!isSearchOpen || previous === resolvedActiveTerminalId) return;
    terminalSurfacesRef.current.get(previous)?.clearSearch();
  }, [isSearchOpen, resolvedActiveTerminalId]);

  useEffect(() => {
    onHeightChangeRef.current = onHeightChange;
  }, [onHeightChange]);

  useEffect(() => {
    drawerHeightRef.current = drawerHeight;
  }, [drawerHeight]);

  const syncHeight = useCallback((nextHeight: number) => {
    const clampedHeight = clampDrawerHeight(nextHeight);
    if (lastSyncedHeightRef.current === clampedHeight) return;
    lastSyncedHeightRef.current = clampedHeight;
    onHeightChangeRef.current(clampedHeight);
  }, []);

  useEffect(() => {
    lastSyncedHeightRef.current = controlledDrawerHeight;
  }, [controlledDrawerHeight, threadId]);

  const handleResizePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    didResizeDuringDragRef.current = false;
    resizeStateRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startHeight: drawerHeightRef.current,
    };
  }, []);

  const handleResizePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const resizeState = resizeStateRef.current;
      if (!resizeState || resizeState.pointerId !== event.pointerId) return;
      event.preventDefault();
      const clampedHeight = clampDrawerHeight(
        resizeState.startHeight + (resizeState.startY - event.clientY),
      );
      if (clampedHeight === drawerHeightRef.current) {
        return;
      }
      didResizeDuringDragRef.current = true;
      drawerHeightRef.current = clampedHeight;
      setDrawerHeight(clampedHeight);
    },
    [setDrawerHeight],
  );

  const handleResizePointerEnd = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const resizeState = resizeStateRef.current;
      if (!resizeState || resizeState.pointerId !== event.pointerId) return;
      resizeStateRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      if (!didResizeDuringDragRef.current) {
        return;
      }
      syncHeight(drawerHeightRef.current);
      setResizeEpoch((value) => value + 1);
    },
    [syncHeight],
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    const onWindowResize = () => {
      const clampedHeight = clampDrawerHeight(drawerHeightRef.current);
      const changed = clampedHeight !== drawerHeightRef.current;
      if (changed) {
        setDrawerHeightFromWindowResize(clampedHeight);
        drawerHeightRef.current = clampedHeight;
      }
      if (!resizeStateRef.current) {
        syncHeight(clampedHeight);
      }
      setResizeEpoch((value) => value + 1);
    };
    window.addEventListener("resize", onWindowResize);
    return () => {
      window.removeEventListener("resize", onWindowResize);
    };
  }, [syncHeight, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    setResizeEpoch((value) => value + 1);
  }, [visible]);

  useEffect(() => {
    return () => {
      syncHeight(drawerHeightRef.current);
    };
  }, [syncHeight]);

  if (normalizedTerminalIds.length === 0) {
    return (
      <aside
        data-terminal-owner={isPanel ? "right-panel" : "drawer"}
        data-rune-console="true"
        data-rune-console-mode={isPanel ? "panel" : "drawer"}
        data-rune-console-session="none"
        data-rune-console-status="empty"
        data-rune-console-state={resolvedMotionState}
        aria-label="RUNE Console"
        className={cn(
          "thread-terminal-drawer rune-console-surface relative flex min-w-0 flex-col overflow-hidden",
          isPanel
            ? "h-full flex-1 rounded-2xl border border-border/70"
            : "shrink-0 rounded-t-2xl border border-border/75",
        )}
        style={isPanel ? undefined : { height: `${drawerHeight}px` }}
      >
        {!isPanel ? (
          <div
            className="group/grip absolute inset-x-0 top-0 z-20 flex h-2 cursor-row-resize items-start justify-center"
            onPointerDown={handleResizePointerDown}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerEnd}
            onPointerCancel={handleResizePointerEnd}
          >
            <span
              data-terminal-resize-grip="true"
              className="mt-0.5 h-1 w-10 rounded-full bg-border opacity-0 transition-opacity duration-150 group-hover/grip:opacity-100"
            />
          </div>
        ) : null}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2.5 px-4 py-6 text-center text-sm text-muted-foreground">
          <TerminalSquare className="size-5 text-muted-foreground/50" aria-hidden />
          <div className="space-y-1">
            <p>No terminal sessions for this thread yet.</p>
            <p className="text-xs text-muted-foreground/70">
              Run builds, dev servers, and logs next to your chat.
            </p>
          </div>
          <Button size="xs" variant="outline" onClick={onNewTerminalAction}>
            {newTerminalActionLabel}
          </Button>
        </div>
      </aside>
    );
  }

  const activeTerminalLaunchLocation = resolveTerminalLaunchLocation(resolvedActiveTerminalId);

  return (
    <aside
      data-terminal-owner={isPanel ? "right-panel" : "drawer"}
      data-rune-console="true"
      data-rune-console-mode={isPanel ? "panel" : "drawer"}
      data-rune-console-session={resolvedActiveTerminalId}
      data-rune-console-status={visible ? "active" : "background"}
      data-rune-console-state={resolvedMotionState}
      aria-label="RUNE Console"
      className={cn(
        "thread-terminal-drawer rune-console-surface relative flex min-w-0 flex-col overflow-hidden",
        isPanel
          ? "h-full flex-1 rounded-2xl border border-border/70"
          : "shrink-0 rounded-t-2xl border border-border/75",
      )}
      style={isPanel ? undefined : { height: `${drawerHeight}px` }}
    >
      {!isPanel ? (
        <div
          className="group/grip absolute inset-x-0 top-0 z-20 flex h-2 cursor-row-resize items-start justify-center"
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerEnd}
          onPointerCancel={handleResizePointerEnd}
        >
          <span
            data-terminal-resize-grip="true"
            className="mt-0.5 h-1 w-10 rounded-full bg-border opacity-0 transition-opacity duration-150 group-hover/grip:opacity-100"
          />
        </div>
      ) : null}

      <div
        data-rune-console-toolbar="true"
        className="flex h-7 shrink-0 items-center justify-between gap-1 border-b border-border/70 pr-1 pl-2"
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <TerminalSquare className="size-3 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate text-[11px] font-medium text-secondary-label">
            {resolvedActiveTerminalId
              ? (terminalLabelById.get(resolvedActiveTerminalId) ?? "Terminal")
              : "Console"}
          </span>
          {activeTerminalStatus ? <TerminalStatusDot status={activeTerminalStatus} /> : null}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <TerminalActionButton
            className={`p-1 text-foreground/90 transition-colors ${
              isSearchOpen ? "bg-accent/70 text-foreground" : "hover:bg-accent"
            }`}
            onClick={toggleSearch}
            label={searchActionLabel}
          >
            <Search className="size-3.25" />
          </TerminalActionButton>
          <div className="mx-0.5 h-4 w-px bg-border/80" aria-hidden="true" />
          <TerminalActionButton
            className={`p-1 text-foreground/90 transition-colors ${
              hasReachedSplitLimit
                ? "cursor-not-allowed opacity-45 hover:bg-transparent"
                : "hover:bg-accent"
            }`}
            onClick={onSplitTerminalAction}
            label={splitTerminalActionLabel}
          >
            <SquareSplitHorizontal className="size-3.25" />
          </TerminalActionButton>
          <TerminalActionButton
            className={`p-1 text-foreground/90 transition-colors ${
              hasReachedSplitLimit
                ? "cursor-not-allowed opacity-45 hover:bg-transparent"
                : "hover:bg-accent"
            }`}
            onClick={onSplitTerminalVerticalAction}
            label={splitTerminalVerticalActionLabel}
          >
            <SquareSplitVertical className="size-3.25" />
          </TerminalActionButton>
          <div className="mx-0.5 h-4 w-px bg-border/80" aria-hidden="true" />
          <TerminalActionButton
            className="p-1 text-foreground/90 transition-colors hover:bg-accent"
            onClick={onNewTerminalAction}
            label={newTerminalActionLabel}
          >
            <Plus className="size-3.25" />
          </TerminalActionButton>
          <TerminalActionButton
            className="p-1 text-foreground/90 transition-colors hover:bg-accent"
            onClick={() => confirmCloseTerminal(resolvedActiveTerminalId)}
            label={closeTerminalActionLabel}
          >
            <Trash2 className="size-3.25" />
          </TerminalActionButton>
        </div>
      </div>

      {isSearchOpen ? (
        <ThreadTerminalSearchBar
          inputRef={searchInputRef}
          query={searchQuery}
          status={searchStatus}
          onQueryChange={setSearchQuery}
          onNext={() => stepSearch(1)}
          onPrevious={() => stepSearch(-1)}
          onClose={closeSearch}
        />
      ) : null}

      <div
        className={cn("min-h-0 w-full flex-1 p-2", isPanel && "p-2.5")}
      >
        <div
          className={cn(
            "flex h-full min-h-0 overflow-hidden rounded-xl border border-border/70 bg-[var(--terminal-background)] shadow-lg shadow-black/5 dark:shadow-[0_18px_48px_-32px_rgb(0_0_0/0.9)] dark:inset-ring-1 dark:inset-ring-white/5",
            hasTerminalSidebar && "gap-2 p-1.5",
          )}
        >
          <div className="min-w-0 flex-1 overflow-hidden rounded-lg">
            {isSplitView ? (
              <div
                className="grid h-full w-full min-w-0 gap-0 overflow-hidden"
                style={
                  splitDirection === "vertical"
                    ? {
                        gridTemplateRows: `repeat(${visibleTerminalIds.length}, minmax(0, 1fr))`,
                      }
                    : {
                        gridTemplateColumns: `repeat(${visibleTerminalIds.length}, minmax(0, 1fr))`,
                      }
                }
              >
                {visibleTerminalIds.map((terminalId) => {
                  const terminalLaunchLocation = resolveTerminalLaunchLocation(terminalId);
                  return (
                    <div
                      key={terminalId}
                      className={`min-h-0 min-w-0 ${
                        splitDirection === "vertical"
                          ? "border-t first:border-t-0"
                          : "border-l first:border-l-0"
                      } ${
                        terminalId === resolvedActiveTerminalId
                          ? "border-[color-mix(in_srgb,var(--rune-violet-strong)_40%,transparent)]"
                          : "border-border/40"
                      }`}
                      onMouseDown={() => {
                        if (terminalId !== resolvedActiveTerminalId) {
                          onActiveTerminalChange(terminalId);
                        }
                      }}
                    >
                      <div className="h-full">
                        <TerminalViewport
                          advancedTypography={advancedTypography}
                          threadRef={threadRef}
                          threadId={threadId}
                          terminalId={terminalId}
                          terminalLabel={terminalLabelById.get(terminalId) ?? "Terminal"}
                          cwd={terminalLaunchLocation.cwd}
                          {...(terminalLaunchLocation.worktreePath !== undefined
                            ? { worktreePath: terminalLaunchLocation.worktreePath }
                            : {})}
                          {...(terminalLaunchLocation.runtimeEnv
                            ? { runtimeEnv: terminalLaunchLocation.runtimeEnv }
                            : {})}
                          onSessionExited={() => onCloseTerminal(terminalId)}
                          onAddTerminalContext={onAddTerminalContext}
                          onSurfacePresence={handleSurfacePresence}
                          onSearchStatus={handleSearchStatus}
                          focusRequestId={focusRequestId}
                          autoFocus={terminalId === resolvedActiveTerminalId}
                          resizeEpoch={resizeEpoch}
                          drawerHeight={drawerHeight}
                          keybindings={keybindings}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full">
                <TerminalViewport
                  advancedTypography={advancedTypography}
                  key={resolvedActiveTerminalId}
                  threadRef={threadRef}
                  threadId={threadId}
                  terminalId={resolvedActiveTerminalId}
                  terminalLabel={terminalLabelById.get(resolvedActiveTerminalId) ?? "Terminal"}
                  cwd={activeTerminalLaunchLocation.cwd}
                  {...(activeTerminalLaunchLocation.worktreePath !== undefined
                    ? { worktreePath: activeTerminalLaunchLocation.worktreePath }
                    : {})}
                  {...(activeTerminalLaunchLocation.runtimeEnv
                    ? { runtimeEnv: activeTerminalLaunchLocation.runtimeEnv }
                    : {})}
                  onSessionExited={() => onCloseTerminal(resolvedActiveTerminalId)}
                  onAddTerminalContext={onAddTerminalContext}
                  onSurfacePresence={handleSurfacePresence}
                  onSearchStatus={handleSearchStatus}
                  focusRequestId={focusRequestId}
                  autoFocus
                  resizeEpoch={resizeEpoch}
                  drawerHeight={drawerHeight}
                  keybindings={keybindings}
                />
              </div>
            )}
          </div>

          {hasTerminalSidebar && (
            <aside className="flex w-40 min-w-40 flex-col overflow-hidden rounded-lg border border-border/70 bg-muted/40">
              <div className="min-h-0 flex-1 overflow-y-auto px-1.5 py-1.5">
                {resolvedTerminalGroups.map((terminalGroup) => {
                  const isGroupActive =
                    terminalGroup.terminalIds.includes(resolvedActiveTerminalId);
                  const groupActiveTerminalId = isGroupActive
                    ? resolvedActiveTerminalId
                    : (terminalGroup.terminalIds[0] ?? resolvedActiveTerminalId);
                  const terminalCount = terminalGroup.terminalIds.length;
                  const isSplitGroup = terminalCount > 1;
                  const groupLabel = !isSplitGroup
                    ? "Single"
                    : terminalGroup.splitDirection === "vertical"
                      ? "Stacked"
                      : "Side by side";
                  const GroupIcon = !isSplitGroup
                    ? Square
                    : terminalGroup.splitDirection === "vertical"
                      ? SquareSplitVertical
                      : SquareSplitHorizontal;

                  return (
                    <div key={terminalGroup.id} className="pb-0.5">
                      {showGroupHeaders && (
                        <button
                          type="button"
                          className={`flex h-[22px] w-full cursor-pointer items-center gap-1 rounded px-1.5 text-[11px] ${
                            isGroupActive
                              ? "bg-accent/50 text-foreground"
                              : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                          }`}
                          onClick={() => onActiveTerminalChange(groupActiveTerminalId)}
                        >
                          <GroupIcon className="size-3 shrink-0" />
                          <span className="min-w-0 flex-1 truncate text-left">{groupLabel}</span>
                          <span className="text-muted-foreground/70 text-[10px] tabular-nums">
                            {terminalCount}
                          </span>
                        </button>
                      )}

                      <div className="flex flex-col gap-0.5">
                        {terminalGroup.terminalIds.map((terminalId) => {
                          const isActive = terminalId === resolvedActiveTerminalId;
                          const terminalLabel = terminalLabelById.get(terminalId) ?? "Terminal";
                          const closeTerminalLabel = `Close ${terminalLabel}${
                            isActive && closeShortcutLabel ? ` (${closeShortcutLabel})` : ""
                          }`;
                          return (
                            <div
                              key={terminalId}
                              className={cn(
                                "group/tab flex h-6 w-full items-center gap-0.5 rounded-md pr-2 pl-1.5 text-xs",
                                isActive
                                  ? "bg-accent text-foreground"
                                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                              )}
                            >
                              <PanelTabCloseButton
                                label={closeTerminalLabel}
                                onClick={() => confirmCloseTerminal(terminalId)}
                                tooltip={closeTerminalLabel}
                              >
                                <TerminalSquare className="size-3 shrink-0" />
                              </PanelTabCloseButton>
                              <button
                                type="button"
                                className="flex min-w-0 flex-1 cursor-pointer items-center gap-1 text-left"
                                onClick={() => onActiveTerminalChange(terminalId)}
                              >
                                <TerminalStatusDot
                                  status={terminalStatusById.get(terminalId) ?? "starting"}
                                />
                                <span className="truncate">{terminalLabel}</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>
          )}
        </div>
      </div>
    </aside>
  );
}
