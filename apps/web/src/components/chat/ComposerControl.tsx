import type { ComponentProps } from "react";
import { ChevronDownIcon, type LucideIcon } from "lucide-react";

import { cn } from "~/lib/utils";
import { Button } from "../ui/button";
import { SelectTrigger } from "../ui/select";
import { Separator } from "../ui/separator";

export type ComposerControlSize = "sm" | "xs";

type ComposerControlProps = Omit<ComponentProps<typeof Button>, "size"> & {
  size?: ComposerControlSize;
};

type ComposerSelectControlProps = Omit<ComponentProps<typeof SelectTrigger>, "size"> & {
  size?: ComposerControlSize;
};

const composerControlClassName =
  "h-7 min-h-7 gap-1.5 rounded-[var(--control-radius)] px-2.5 text-secondary-label transition-none hover:text-foreground [&_svg[data-composer-control-icon]]:mx-0 [&_svg[data-composer-control-chevron]]:-mx-0.5";

export function ComposerControl({
  className,
  size = "sm",
  variant = "ghost",
  ...props
}: ComposerControlProps) {
  return (
    <Button
      className={cn(
        composerControlClassName,
        size === "xs" ? restingComposerControlClassName : expandedComposerControlClassName,
        className,
      )}
      size={size}
      variant={variant}
      {...props}
    />
  );
}

export function ComposerControlIcon({
  icon: Icon,
  className,
  opticalSize = "default",
  size = "sm",
}: {
  icon: LucideIcon;
  className?: string | undefined;
  opticalSize?: "default" | "large";
  size?: ComposerControlSize;
}) {
  return (
    <Icon
      aria-hidden="true"
      className={cn(
        "shrink-0",
        size === "xs" ? "size-3" : opticalSize === "large" ? "size-4.5" : "size-4",
        className,
      )}
      data-composer-control-icon
    />
  );
}

export function ComposerControlChevron({ open = false }: { open?: boolean }) {
  return (
    <ChevronDownIcon
      aria-hidden="true"
      className={cn(
        "-mx-0.5 size-3.5 shrink-0 text-icon-muted transition-transform duration-150",
        open && "rotate-180",
      )}
      data-composer-control-chevron
      strokeWidth={2.25}
    />
  );
}

export function ComposerControlSeparator({
  className,
  size = "sm",
  ...props
}: Omit<ComponentProps<typeof Separator>, "orientation"> & {
  size?: ComposerControlSize;
}) {
  return (
    <Separator
      orientation="vertical"
      className={cn("mx-0.5 hidden sm:block", size === "xs" ? "h-3.5!" : "h-4", className)}
      {...props}
    />
  );
}

export function ComposerSelectControl({
  className,
  size = "sm",
  variant = "ghost",
  ...props
}: ComposerSelectControlProps) {
  return (
    <SelectTrigger
      className={cn(
        composerControlClassName,
        size === "xs" ? restingComposerControlClassName : expandedComposerControlClassName,
        className,
      )}
      icon={<ComposerControlChevron size={size} />}
      size={size}
      variant={variant}
      {...props}
    />
  );
}
