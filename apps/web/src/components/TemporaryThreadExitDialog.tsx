import { Button } from "./ui/button";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Clock, Flame, Sparkles, Trash2 } from "lucide-react";

export interface TemporaryThreadExitDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onDeleteImmediately: () => void;
  readonly onSnooze5Minutes: () => void;
  readonly onSnooze10Minutes: () => void;
  readonly onKeepPermanently?: () => void;
}

/**
 * Dialog shown before closing or navigating away from a temporary chat, offering options
 * to delete immediately, snooze deletion for 5 or 10 minutes, or convert to a permanent chat.
 */
export function TemporaryThreadExitDialog(props: TemporaryThreadExitDialogProps) {
  const {
    open,
    onOpenChange,
    onDeleteImmediately,
    onSnooze5Minutes,
    onSnooze10Minutes,
    onKeepPermanently,
  } = props;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <Flame className="size-4" />
            </span>
            <AlertDialogTitle>Leaving Temporary Chat</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            This conversation is temporary. Before you leave, would you like to delete it now, snooze its auto-deletion, or save it as a permanent chat?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter variant="default">
          <Button
            variant="destructive"
            className="gap-1.5"
            onClick={() => {
              onOpenChange(false);
              onDeleteImmediately();
            }}
          >
            <Trash2 className="size-4" />
            Delete immediately
          </Button>
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={() => {
              onOpenChange(false);
              onSnooze5Minutes();
            }}
          >
            <Clock className="size-4 text-amber-500" />
            Snooze deletion for 5 minutes
          </Button>
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={() => {
              onOpenChange(false);
              onSnooze10Minutes();
            }}
          >
            <Clock className="size-4 text-amber-500" />
            Snooze deletion for 10 minutes
          </Button>
          {onKeepPermanently ? (
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                onOpenChange(false);
                onKeepPermanently();
              }}
            >
              <Sparkles className="size-4 text-[var(--rune-violet-strong)]" />
              Keep as permanent chat
            </Button>
          ) : null}
          <AlertDialogClose render={<Button variant="ghost" />}>
            Cancel (stay on this chat)
          </AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}

