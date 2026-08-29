import { memo } from "react";
import { ORPHANED_PROVIDER_SESSION_ERROR } from "@rune/contracts";
import { Alert, AlertAction, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "../ui/menu";
import { CircleAlertIcon, XIcon } from "lucide-react";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";

export function getThreadErrorBannerKey(threadKey: string, error: string | null): string | null {
  return error === null ? null : `${threadKey}\u0000${error}`;
}

export function shouldShowThreadErrorBanner(
  threadKey: string,
  error: string | null,
  isDismissed: boolean,
): boolean {
  return getThreadErrorBannerKey(threadKey, error) !== null && !isDismissed;
}

// Session-scoped (module-level so it survives ChatView remounts, e.g. route
// changes between threads). Mirrors the branch-mismatch banner: a dismissal
// is remembered per thread key plus message, so navigating away to a thread
// with no error cannot resurrect the banner, while a different error message
// on the same thread still appears.
const sessionDismissedThreadErrorBannerKeys = new Set<string>();

export function dismissThreadErrorBannerForSession(bannerKey: string | null): void {
  if (bannerKey !== null) {
    sessionDismissedThreadErrorBannerKeys.add(bannerKey);
  }
}

export function isThreadErrorBannerDismissedForSession(bannerKey: string | null): boolean {
  return bannerKey !== null && sessionDismissedThreadErrorBannerKeys.has(bannerKey);
}

// Only the restart-orphaned provider session error has a one-click recovery:
// resuming the dead CLI session with an invisible nudge message.
export function threadErrorOffersContinue(error: string | null): boolean {
  return error === ORPHANED_PROVIDER_SESSION_ERROR;
}

export interface ThreadContinuationOption {
  readonly id: string;
  readonly label: string;
  readonly description: string;
}

export const ThreadErrorBanner = memo(function ThreadErrorBanner({
  error,
  onDismiss,
  onContinue,
  continuations,
  onContinueWith,
}: {
  error: string | null;
  onDismiss?: () => void;
  onContinue?: () => void;
  continuations?: ReadonlyArray<ThreadContinuationOption>;
  onContinueWith?: (id: string) => void;
}) {
  if (!error) return null;
  return (
    <div className="mx-auto w-fit max-w-[min(48rem,calc(100%-2rem))] pt-3">
      <Alert variant="error" controlAlignment="first-line">
        <CircleAlertIcon />
        <AlertDescription>
          <Tooltip>
            <TooltipTrigger render={<div className="line-clamp-3" />}>{error}</TooltipTrigger>
            <TooltipPopup side="top" className="max-w-96 whitespace-pre-wrap">
              {error}
            </TooltipPopup>
          </Tooltip>
        </AlertDescription>
        {onContinue && (
          <AlertAction>
            <Button variant="outline" size="xs" onClick={onContinue}>
              Continue
            </Button>
          </AlertAction>
        )}
        {continuations && continuations.length > 0 && onContinueWith ? (
          <AlertAction>
            <Menu>
              <MenuTrigger render={<Button variant="outline" size="xs" />}>
                Continue with…
              </MenuTrigger>
              <MenuPopup align="end">
                {continuations.map((continuation) => (
                  <MenuItem key={continuation.id} onClick={() => onContinueWith(continuation.id)}>
                    <span className="flex min-w-0 flex-col">
                      <span>{continuation.label}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {continuation.description}
                      </span>
                    </span>
                  </MenuItem>
                ))}
              </MenuPopup>
            </Menu>
          </AlertAction>
        ) : null}
        {onDismiss && (
          <AlertAction>
            <Button variant="ghost" size="icon-xs" aria-label="Dismiss error" onClick={onDismiss}>
              <XIcon className="text-destructive" />
            </Button>
          </AlertAction>
        )}
      </Alert>
    </div>
  );
});
