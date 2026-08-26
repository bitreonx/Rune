import { useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  GripVerticalIcon,
  PencilIcon,
  RotateCcwIcon,
  Trash2Icon,
  ZapIcon,
} from "lucide-react";
import type { PromptQueueItem } from "@rune/client-runtime/state/promptQueue";
import { Button } from "../ui/button";

export function ComposerPromptQueue(props: {
  items: readonly PromptQueueItem[];
  onEdit: (itemId: string, text: string) => void;
  onRemove: (itemId: string) => void;
  onMove: (itemId: string, direction: -1 | 1) => void;
  onSteer: (itemId: string) => void;
  onRetry?: (itemId: string) => void;
}) {
  const items = props.items.filter((item) =>
    ["queued", "steering", "claimed", "failed"].includes(item.status),
  );
  if (items.length === 0) return null;
  return (
    <div
      className="mb-2 rounded-xl border border-border/70 bg-muted/25 px-2 py-1.5"
      aria-label="Prompt queue"
    >
      <div className="flex items-center gap-1.5 px-1 pb-1 text-[11px] font-medium text-muted-foreground">
        <ZapIcon className="size-3" aria-hidden="true" />
        <span>
          {items.some((item) => item.status === "claimed")
            ? "Working + queued"
            : "Queued instructions"}
        </span>
        <span className="ms-auto tabular-nums">{items.length}</span>
      </div>
      <div className="space-y-1">
        {items.map((item, index) => (
          <QueueRow key={item.id} item={item} index={index} count={items.length} {...props} />
        ))}
      </div>
    </div>
  );
}

function QueueRow(props: {
  item: PromptQueueItem;
  index: number;
  count: number;
  onEdit: (itemId: string, text: string) => void;
  onRemove: (itemId: string) => void;
  onMove: (itemId: string, direction: -1 | 1) => void;
  onSteer: (itemId: string) => void;
  onRetry?: (itemId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(props.item.text);
  const busy = props.item.status === "claimed" || props.item.status === "steering";
  return (
    <div
      className="group flex items-start gap-1 rounded-lg bg-background/70 px-1.5 py-1 text-xs"
      data-queue-item-id={props.item.id}
    >
      <GripVerticalIcon
        className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        {editing ? (
          <textarea
            autoFocus
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setEditing(false);
                setText(props.item.text);
              }
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (text.trim()) props.onEdit(props.item.id, text.trim());
                setEditing(false);
              }
            }}
            className="min-h-8 w-full resize-y rounded border border-input bg-background px-1.5 py-1 outline-none focus:ring-1 focus:ring-ring"
            aria-label="Edit queued prompt"
          />
        ) : (
          <div className="line-clamp-2 whitespace-pre-wrap break-words">{props.item.text}</div>
        )}
        <div className="mt-0.5 text-[10px] text-muted-foreground">
          {props.item.status === "failed"
            ? `Failed: ${props.item.error ?? "retry available"}`
            : itemLabel(props.item)}
        </div>
      </div>
      {!busy ? (
        <div className="flex shrink-0 items-center gap-0.5 opacity-70 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          {item.status === "failed" && props.onRetry ? (
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label="Retry queued prompt"
              onClick={() => props.onRetry?.(props.item.id)}
            >
              <RotateCcwIcon />
            </Button>
          ) : null}
          {editing ? (
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label="Save queued prompt"
              onClick={() => {
                if (text.trim()) props.onEdit(props.item.id, text.trim());
                setEditing(false);
              }}
            >
              <CheckIcon />
            </Button>
          ) : (
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label="Edit queued prompt"
              onClick={() => setEditing(true)}
            >
              <PencilIcon />
            </Button>
          )}
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label="Move prompt up"
            disabled={props.index === 0}
            onClick={() => props.onMove(props.item.id, -1)}
          >
            <ArrowUpIcon />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label="Move prompt down"
            disabled={props.index === props.count - 1}
            onClick={() => props.onMove(props.item.id, 1)}
          >
            <ArrowDownIcon />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label="Steer now"
            onClick={() => props.onSteer(props.item.id)}
          >
            <ZapIcon />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label="Delete queued prompt"
            onClick={() => props.onRemove(props.item.id)}
          >
            <Trash2Icon />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function itemLabel(item: PromptQueueItem) {
  if (item.status === "claimed") return "Running";
  if (item.status === "steering") return "Steering next";
  return "Waiting · FIFO";
}
