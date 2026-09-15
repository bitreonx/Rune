import { InfoIcon } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "~/lib/utils";
import { Button } from "../ui/button";
import { Popover, PopoverPopup, PopoverTrigger } from "../ui/popover";
import { ComposerBanner, type ComposerBannerVariant } from "./ComposerBanner";

// Match the duration-220 exit transition before removing a dismissed notice.
const DISMISS_TRANSITION_MS = 220;
const frontExitStyle = {
  opacity: 0,
  transform: "translate3d(0, 4rem, 0)",
} satisfies CSSProperties;
const stackedExitStyle = {
  opacity: 0,
  transform: "translate3d(0, 7rem, 0)",
} satisfies CSSProperties;
const restingStyle = {
  opacity: 1,
  transform: "none",
} satisfies CSSProperties;
const exitTransitionStyle = {
  transition: `transform ${DISMISS_TRANSITION_MS}ms ease-in, opacity ${DISMISS_TRANSITION_MS}ms ease-in`,
} satisfies CSSProperties;

// The collapsed cap peeking above the front banner is the only hint that more
// banners are stacked behind it, so its border must match the severity of the
// first hidden banner — a neutral banner must not masquerade as a warning.
const stackCapBorderClass: Record<ComposerBannerStackItem["variant"], string> = {
  default: "border-[var(--chat-composer-attached-outline)]",
  error: "border-destructive/24",
  info: "border-info/24",
  success: "border-success/24",
  warning: "border-warning/24",
};

export interface ComposerBannerStackItem {
  readonly id: string;
  readonly variant: ComposerBannerVariant;
  readonly priority?: "urgent" | "activity" | "notice";
  readonly icon: ReactNode;
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly children?: ReactNode;
  readonly actions?: ReactNode;
  readonly dismissLabel?: string;
  readonly onDismiss?: () => void;
}

export type ComposerBannerStackContent = Pick<
  ComposerBannerStackItem,
  "id" | "variant" | "priority"
> & { readonly content: ReactNode };

type ComposerBannerStackEntry = ComposerBannerStackItem | ComposerBannerStackContent;

function bannerPriority(item: ComposerBannerStackEntry) {
  if (item.priority === "activity") {
    return 0;
  }
  if (item.priority === "urgent" || item.variant === "error" || item.variant === "warning") {
    return 1;
  }
  return 2;
}

interface ComposerBannerStackProps {
  readonly className?: string;
  readonly items: ReadonlyArray<ComposerBannerStackEntry>;
}

export function ComposerBannerStack({ className, items }: ComposerBannerStackProps) {
  const [stackExpanded, setStackExpanded] = useState(false);
  const noticesRef = useRef<HTMLDivElement>(null);
  const peekRef = useRef<HTMLButtonElement>(null);
  const expandedItemsRef = useRef<HTMLDivElement>(null);
  const pendingFocusRef = useRef<"peek" | "notice" | null>(null);
  const expandedItemsId = useId();
  const [requestedExitingItemId, setExitingItemId] = useState<string | null>(null);
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitingItemId =
    requestedExitingItemId !== null && items.some((item) => item.id === requestedExitingItemId)
      ? requestedExitingItemId
      : null;

  useEffect(() => {
    return () => {
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (items.length < 2) setStackExpanded(false);
  }, [items.length]);

  useLayoutEffect(() => {
    if (stackExpanded && pendingFocusRef.current === "notice") {
      pendingFocusRef.current = null;
      const firstControl = expandedItemsRef.current?.querySelector<HTMLElement>(
        'button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]',
      );
      (firstControl ?? expandedItemsRef.current)?.focus({ preventScroll: true });
    } else if (!stackExpanded && pendingFocusRef.current === "peek") {
      pendingFocusRef.current = null;
      peekRef.current?.focus({ preventScroll: true });
    }
  }, [stackExpanded]);

  if (items.length === 0) {
    return null;
  }

  // Activity stays attached. Urgency and severity only order the notices behind it.
  const orderedItems = items.toSorted((a, b) => bannerPriority(a) - bannerPriority(b));
  const frontItem = orderedItems[0];
  if (!frontItem) {
    return null;
  }
  const stackedItems = orderedItems.slice(1);
  const hasStack = stackedItems.length > 0;
  const showCollapsedStackCap = hasStack && exitingItemId !== frontItem.id;
  const firstStackedItem = stackedItems[0];

  const requestDismiss = (item: ComposerBannerStackEntry) => {
    if (!("onDismiss" in item) || !item.onDismiss || exitingItemId) {
      return;
    }
    setExitingItemId(item.id);
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
    }
    dismissTimeoutRef.current = setTimeout(() => {
      dismissTimeoutRef.current = null;
      item.onDismiss?.();
    }, DISMISS_TRANSITION_MS);
  };

  return (
    <div
      className={cn("group/banner-stack chat-composer-drawer-slot", className)}
      data-composer-banner-drawer="true"
    >
      <div
        className={cn(
          "relative flex flex-col-reverse",
          hasStack ? "group-hover/banner-stack:z-50 group-focus-within/banner-stack:z-50" : null,
        )}
      >
        {showCollapsedStackCap && firstStackedItem ? (
          <div
            className={cn(
              "pointer-events-none absolute inset-x-0 -top-3 z-0 mx-auto h-3 rounded-t-2xl",
              "chat-composer-banner-stack-cap border border-b-0 shadow-[0_6px_18px_rgba(0,0,0,0.06)]",
              stackCapBorderClass[firstStackedItem.variant],
              "transition-opacity duration-150 ease-out",
              "group-hover/banner-stack:opacity-0 group-focus-within/banner-stack:opacity-0",
            )}
            style={{ width: "96%" }}
            aria-hidden="true"
          />
        ) : null}
        <div
          key={frontItem.id}
          className={cn(
            "relative z-10 transition-[translate,opacity] duration-220 ease-in",
            exitingItemId === frontItem.id
              ? "pointer-events-none translate-y-16 opacity-0"
              : "opacity-100",
          )}
          onPointerDownCapture={() => {
            setStackExpanded(false);
            const activeElement = document.activeElement;
            if (
              activeElement instanceof HTMLElement &&
              noticesRef.current?.contains(activeElement)
            ) {
              activeElement.blur();
            }
          }}
        >
          <ComposerBannerStackAlert
            item={frontItem}
            attached
            exiting={exitingItemId === frontItem.id}
            onDismissRequest={() => requestDismiss(frontItem)}
          />
        </div>
        {hasStack ? (
          <div
            ref={noticesRef}
            className="relative z-20 min-h-3"
            onPointerEnter={(event) => {
              if (event.pointerType === "touch") return;
              if (document.activeElement === peekRef.current) {
                pendingFocusRef.current = "notice";
              }
              setStackExpanded(true);
            }}
            onPointerLeave={(event) => {
              if (!event.currentTarget.contains(document.activeElement)) setStackExpanded(false);
            }}
            onBlurCapture={(event) => {
              if (
                !event.currentTarget.contains(event.relatedTarget) &&
                !event.currentTarget.matches(":hover")
              ) {
                setStackExpanded(false);
              }
            }}
            onKeyDown={(event) => {
              if (event.key !== "Escape" || !stackExpanded) return;
              event.preventDefault();
              event.stopPropagation();
              pendingFocusRef.current = "peek";
              setStackExpanded(false);
            }}
          >
            <div className="min-h-0 overflow-hidden">
              <div
                className={cn(
                  "invisible pointer-events-none space-y-1.5 pb-1.5 opacity-0",
                  "translate-y-1 transform-gpu transition-[opacity,transform] duration-150 ease-out will-change-[opacity,transform]",
                  "group-hover/banner-stack:visible group-hover/banner-stack:pointer-events-auto group-hover/banner-stack:translate-y-0 group-hover/banner-stack:opacity-100",
                  "group-focus-within/banner-stack:visible group-focus-within/banner-stack:pointer-events-auto group-focus-within/banner-stack:translate-y-0 group-focus-within/banner-stack:opacity-100",
                )}
              >
                {stackedItems.map((item) => (
                  <div
                    key={item.id}
                    className={cn(exitingItemId === item.id ? "pointer-events-none" : null)}
                    style={{
                      ...exitTransitionStyle,
                      ...(exitingItemId === item.id ? stackedExitStyle : restingStyle),
                    }}
                  >
                    <ComposerBannerStackAlert
                      item={item}
                      attached={false}
                      exiting={exitingItemId === item.id}
                      onDismissRequest={() => requestDismiss(item)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </ComposerBanner.Attachment>
  );
}

function ComposerBannerStackAlert({
  item,
  attached,
  exiting,
  onDismissRequest,
}: {
  readonly item: ComposerBannerStackItem;
  readonly attached: boolean;
  readonly exiting: boolean;
  readonly onDismissRequest: () => void;
}) {
  if ("content" in item) {
    return (
      <ComposerBanner.Root
        density="comfortable"
        placement={attached ? "attached" : "floating"}
        variant={item.variant}
      >
        {item.content}
      </ComposerBanner.Root>
    );
  }
  return (
    <ComposerBanner.Root
      role="alert"
      placement={attached ? "attached" : "floating"}
      variant={item.variant}
      className={cn(
        attached
          ? "chat-composer-drawer-surface chat-composer-drawer-attached px-3 pt-2 pb-[calc(var(--chat-composer-attachment-overlap)_+_0.375rem)] text-xs before:mask-none sm:px-4"
          : "alert-glass rounded-[22px]",
        item.className,
      )}
      data-variant={item.variant}
    >
      <ComposerBanner.Row layout="wrap-actions-narrow">
        <ComposerBanner.Icon className="h-(--composer-banner-icon-column) self-start">
          {item.icon}
        </ComposerBanner.Icon>
        <ComposerBanner.Content className="whitespace-nowrap">
          <span
            className={cn(
              "min-w-0 font-medium leading-7 sm:leading-6",
              typeof item.title === "string" && "truncate",
            )}
          >
            {item.title}
          </span>
          {item.description ? (
            <>
              <span className="min-w-0 shrink-[9999] truncate text-muted-foreground @max-[400px]:sr-only">
                {item.description}
              </span>
              <Popover>
                <PopoverTrigger
                  openOnHover
                  render={
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      aria-label="Show notice details"
                      className="hidden flex-none text-muted-foreground hover:text-foreground @max-[400px]:inline-flex"
                    />
                  }
                >
                  <InfoIcon className="size-3.5" />
                </PopoverTrigger>
                <PopoverPopup
                  tooltipStyle
                  side="top"
                  className="max-w-72 whitespace-normal text-pretty"
                >
                  {item.description}
                </PopoverPopup>
              </Popover>
            </>
          ) : null}
        </ComposerBanner.Content>
        {item.actions || item.onDismiss ? (
          <ComposerBanner.Actions>
            {item.actions}
            {item.onDismiss ? (
              <ComposerBanner.Dismiss
                aria-label={item.dismissLabel ?? "Dismiss warning"}
                disabled={exiting}
                onClick={onDismissRequest}
              />
            ) : null}
          </ComposerBanner.Actions>
        ) : null}
      </ComposerBanner.Row>
      {item.children ? <ComposerBanner.Children>{item.children}</ComposerBanner.Children> : null}
    </ComposerBanner.Root>
  );
}
