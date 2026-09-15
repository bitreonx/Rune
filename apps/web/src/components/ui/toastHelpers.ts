"use client";

import type { ToastManagerAddOptions } from "@base-ui/react/toast";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import type { ThreadToastData } from "./toast";
import type { ToastNotificationKind } from "./toast.logic";

export type StackedThreadToastOptions = {
  type: "error" | "warning" | "success" | "info" | "loading";
  title: ReactNode;
  description?: ReactNode;
  timeout?: number;
  priority?: "low" | "high";
  notificationKind?: ToastNotificationKind;
  threadRef?: ThreadToastData["threadRef"];
  threadId?: ThreadToastData["threadId"];
  actionProps?: ComponentPropsWithoutRef<"button">;
  /** Merged into `data`; `actionLayout` is always forced to `"stacked-end"` by the helper. */
  actionVariant?: ThreadToastData["actionVariant"];
  data?: Omit<ThreadToastData, "actionLayout">;
};

/**
 * Defined `actionProps` that hide a previous toast CTA on `toastManager.update`.
 * Passing `actionProps: undefined` is a no-op because updates omit undefined keys.
 */
export const hiddenToastActionProps = {
  children: null,
} as const satisfies Pick<ComponentPropsWithoutRef<"button">, "children">;

/**
 * Thread toast using the stacked body + bottom action row (copy for errors, CTA on its own row).
 */
export function stackedThreadToast(
  options: StackedThreadToastOptions,
): ToastManagerAddOptions<ThreadToastData> {
  const {
    type,
    title,
    description,
    timeout,
    priority,
    notificationKind,
    threadRef,
    threadId,
    actionProps,
    actionVariant,
    data,
  } = options;

  // Helper-owned `actionLayout` must win over any caller-provided `data`, so spread
  // the caller's data first and apply `actionLayout: "stacked-end"` last.
  const mergedData: ThreadToastData = {
    ...(data !== undefined ? data : {}),
    actionLayout: "stacked-end",
  };
  if (actionVariant !== undefined) {
    mergedData.actionVariant = actionVariant;
  }
  if (notificationKind !== undefined) mergedData.notificationKind = notificationKind;
  if (threadRef !== undefined) mergedData.threadRef = threadRef;
  if (threadId !== undefined) mergedData.threadId = threadId;

  const payload: ToastManagerAddOptions<ThreadToastData> = {
    type,
    title,
    data: mergedData,
  };

  if (description !== undefined) {
    payload.description = description;
  }
  if (timeout !== undefined) {
    payload.timeout = timeout;
  }
  if (priority !== undefined) {
    payload.priority = priority;
  }
  if (actionProps !== undefined) {
    payload.actionProps = actionProps;
  }

  return payload;
}
