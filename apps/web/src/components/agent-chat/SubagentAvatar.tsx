import { memo } from "react";
import {
  Atom,
  Bot,
  Boxes,
  Brain,
  Compass,
  Cpu,
  Flame,
  Hexagon,
  Orbit,
  Radio,
  Sparkles,
  Wand2,
  Workflow,
  Zap,
} from "lucide-react";
import type { SubagentIconName } from "@rune/client-runtime/state/subagentIdentity";
import { cn } from "~/lib/utils";

function renderSubagentIcon(iconName: SubagentIconName | undefined, className?: string) {
  const iconProps = {
    "aria-hidden": true,
    className: cn("size-3.5 text-white drop-shadow-xs", className),
  };

  switch (iconName) {
    case "sparkles":
      return <Sparkles {...iconProps} />;
    case "cpu":
      return <Cpu {...iconProps} />;
    case "atom":
      return <Atom {...iconProps} />;
    case "zap":
      return <Zap {...iconProps} />;
    case "brain":
      return <Brain {...iconProps} />;
    case "compass":
      return <Compass {...iconProps} />;
    case "flame":
      return <Flame {...iconProps} />;
    case "orbit":
      return <Orbit {...iconProps} />;
    case "wand":
      return <Wand2 {...iconProps} />;
    case "boxes":
      return <Boxes {...iconProps} />;
    case "hexagon":
      return <Hexagon {...iconProps} />;
    case "radio":
      return <Radio {...iconProps} />;
    case "workflow":
      return <Workflow {...iconProps} />;
    case "bot":
    default:
      return <Bot {...iconProps} />;
  }
}

export interface SubagentAvatarProps {
  readonly iconName?: SubagentIconName;
  readonly iconColor?: string;
  readonly className?: string;
  readonly iconClassName?: string;
  readonly style?: React.CSSProperties;
}

export const SubagentAvatar = memo(function SubagentAvatar({
  iconName,
  iconColor,
  className,
  iconClassName,
  style,
}: SubagentAvatarProps) {
  const background = iconColor ?? "var(--rune-violet-strong)";

  return (
    <span
      className={cn(
        "relative flex size-7 shrink-0 items-center justify-center rounded-md border border-white/15 shadow-xs transition-transform",
        className,
      )}
      style={{
        backgroundColor: background,
        ...style,
      }}
    >
      {renderSubagentIcon(iconName, iconClassName)}
    </span>
  );
});
