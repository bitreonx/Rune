import { useEffect, useSyncExternalStore } from "react";

import {
  completeChoiceDialogClose,
  readChoiceDialogState,
  registerChoiceDialogHost,
  respondToChoiceDialog,
  subscribeChoiceDialog,
} from "../choiceDialog";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";

export function ChoiceDialogHost() {
  const state = useSyncExternalStore(
    subscribeChoiceDialog,
    readChoiceDialogState,
    readChoiceDialogState,
  );

  useEffect(() => registerChoiceDialogHost(), []);

  const isOpen = state.status === "choosing";
  const message = isOpen || state.status === "closing" ? state.message : "";
  const choices = isOpen || state.status === "closing" ? state.choices : [];
  const cancelLabel = isOpen || state.status === "closing" ? state.cancelLabel : "Cancel";
  const [title, ...descriptionLines] = message.split("\n");

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) respondToChoiceDialog(null);
      }}
      onOpenChangeComplete={(open) => {
        if (!open) completeChoiceDialogClose();
      }}
    >
      <AlertDialogPopup className="max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{title || "Choose how to continue"}</AlertDialogTitle>
          {descriptionLines.length > 0 ? (
            <AlertDialogDescription className="whitespace-pre-line">
              {descriptionLines.join("\n")}
            </AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter variant="bare" className="gap-3 px-6 pb-6">
          <AlertDialogClose render={<Button variant="outline" />}>{cancelLabel}</AlertDialogClose>
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:justify-end">
            {choices.map((choice) => (
              <Button
                key={choice.id}
                variant={choice.destructive ? "destructive" : "default"}
                className="h-auto min-h-10 whitespace-normal text-left sm:max-w-[15rem]"
                onClick={() => respondToChoiceDialog(choice.id)}
              >
                <span className="flex flex-col items-start gap-0.5">
                  <span>{choice.label}</span>
                  {choice.description ? (
                    <span className="text-xs font-normal opacity-80">{choice.description}</span>
                  ) : null}
                </span>
              </Button>
            ))}
          </div>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}
