import { useEffect, useState, type ReactNode } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";

export function ComposerPromptQueue(props: {
  items: readonly PromptQueueItem[];
  onEdit: (itemId: string, text: string) => void;
  onRemove: (itemId: string) => void;
  onMove: (itemId: string, direction: -1 | 1) => void;
  onReorder: (itemId: string, beforeItemId: string | null) => void;
  onSteer: (itemId: string) => void;
  onRetry?: (itemId: string) => void;
}) {
  const pending = props.items.filter(
    (item) => item.status === "queued" || item.status === "steering",
  );
  const failed = props.items.filter((item) => item.status === "failed");
  const visible = [...pending, ...failed];
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  if (visible.length === 0) return null;
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = visible.findIndex((item) => item.id === active.id);
    const to = visible.findIndex((item) => item.id === over.id);
    if (from < 0 || to < 0 || visible[to]?.status !== "queued") return;
    props.onReorder(String(active.id), to < from ? visible[to]!.id : (visible[to + 1]?.id ?? null));
  };
  return (
    <section
      className="rune-composer-context-tray mb-2 overflow-hidden rounded-[1.05rem] border border-border/55 bg-background/42 shadow-sm backdrop-blur-xl"
      aria-label="Prompt queue"
      aria-live="polite"
      data-prompt-queue
    >
      <div className="flex min-h-8 items-center gap-2 border-b border-border/40 px-3 py-1.5 text-[11px] text-muted-foreground sm:px-3.5">
        <ZapIcon className="size-3.5 text-primary" aria-hidden="true" />
        <span className="font-medium text-foreground/80">Prompt queue</span>
        <span className="text-muted-foreground/75">{`${visible.length} waiting`}</span>
        <span className="ms-auto rounded-full bg-muted/65 px-1.5 py-0.5 font-medium tabular-nums text-foreground/70">
          {visible.length}
        </span>
      </div>
      {visible.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={visible.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1 p-1.5 sm:p-2">
              {visible.map((item, index) => (
                <QueueRow
                  key={item.id}
                  item={item}
                  index={index}
                  count={visible.length}
                  {...props}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : null}
    </section>
  );
}

function QueueRow(props: {
  item: PromptQueueItem;
  index: number;
  count: number;
  onEdit: (itemId: string, text: string) => void;
  onRemove: (itemId: string) => void;
  onMove: (itemId: string, direction: -1 | 1) => void;
  onReorder: (itemId: string, beforeItemId: string | null) => void;
  onSteer: (itemId: string) => void;
  onRetry?: (itemId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(props.item.text);
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.item.id, disabled: props.item.status !== "queued" });
  useEffect(() => setText(props.item.text), [props.item.text]);
  const failed = props.item.status === "failed";
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group flex items-center gap-1.5 rounded-[0.8rem] border border-border/35 bg-muted/22 px-2 py-1.5 text-xs transition-[border-color,background,opacity] ${isDragging ? "z-10 border-primary/50 bg-background shadow-lg opacity-90" : "hover:border-border/75 hover:bg-background/55"}`}
      data-prompt-queue-item-id={props.item.id}
      data-prompt-queue-item-status={props.item.status}
      {...attributes}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="inline-flex size-6 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground/60 outline-none hover:bg-accent/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
        aria-label={`Reorder queued prompt: ${props.item.text}`}
        {...listeners}
      >
        <GripVerticalIcon className="size-3.5" aria-hidden="true" />
      </button>
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
            className="min-h-8 w-full resize-y rounded-md border border-input bg-background/80 px-2 py-1.5 outline-none focus:ring-1 focus:ring-ring"
            aria-label="Edit queued prompt"
          />
        ) : (
          <div className="line-clamp-2 whitespace-pre-wrap break-words leading-4 text-foreground/85">
            {props.item.text}
          </div>
        )}
        <div
          className={`mt-0.5 text-[10px] ${failed ? "text-destructive" : "text-muted-foreground"}`}
        >
          {failed
            ? `Failed: ${props.item.error ?? "retry available"}`
            : props.item.status === "steering"
              ? "Steering next"
              : "Waiting · FIFO"}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-0.5 opacity-70 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        {failed && props.onRetry ? (
          <IconAction label="Retry queued prompt" onClick={() => props.onRetry?.(props.item.id)}>
            <RotateCcwIcon />
          </IconAction>
        ) : null}
        <IconAction
          label={editing ? "Save queued prompt" : "Edit queued prompt"}
          onClick={() => {
            if (editing && text.trim()) props.onEdit(props.item.id, text.trim());
            setEditing((value) => !value);
          }}
        >
          {editing ? <CheckIcon /> : <PencilIcon />}
        </IconAction>
        <IconAction
          label="Move prompt up"
          disabled={props.index === 0 || failed}
          onClick={() => props.onMove(props.item.id, -1)}
        >
          <ArrowUpIcon />
        </IconAction>
        <IconAction
          label="Move prompt down"
          disabled={props.index === props.count - 1 || failed}
          onClick={() => props.onMove(props.item.id, 1)}
        >
          <ArrowDownIcon />
        </IconAction>
        <IconAction
          label="Steer now"
          disabled={failed || props.item.status === "steering"}
          onClick={() => props.onSteer(props.item.id)}
        >
          <ZapIcon />
        </IconAction>
        <IconAction label="Delete queued prompt" onClick={() => props.onRemove(props.item.id)}>
          <Trash2Icon />
        </IconAction>
      </div>
    </div>
  );
}

function IconAction({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            size="icon-xs"
            variant="ghost"
            disabled={disabled}
            aria-label={label}
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipPopup side="top" variant="glass">
        {label}
      </TooltipPopup>
    </Tooltip>
  );
}
