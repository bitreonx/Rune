"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  EyeIcon,
  EyeOffIcon,
  InfoIcon,
  PencilIcon,
  PlusIcon,
  StarIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ProviderDriverKind,
  type ProviderInstanceId,
  type ServerProviderModel,
} from "@rune/contracts";
import type { CustomModelDefinition } from "@rune/shared/model";
import { normalizeCustomModelSlug } from "@rune/shared/model";

import { cn } from "../../lib/utils";
import { sortModelsForProviderInstance } from "../../modelOrdering";
import { MAX_CUSTOM_MODEL_LENGTH } from "../../modelSelection";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { CustomModelEditor } from "./CustomModelEditor";

const CUSTOM_MODEL_PLACEHOLDER_BY_KIND: Partial<Record<ProviderDriverKind, string>> = {
  [ProviderDriverKind.make("codex")]: "gpt-6.7-codex-ultra-preview",
  [ProviderDriverKind.make("claudeAgent")]: "claude-sonnet-5",
  [ProviderDriverKind.make("cursor")]: "claude-sonnet-4-6",
  [ProviderDriverKind.make("opencode")]: "openai/gpt-5",
  [ProviderDriverKind.make("antigravity")]: "gemini-3.7-flash-high",
};

function metadataLabels(model: ServerProviderModel): string[] {
  const metadata = model.metadata;
  if (!metadata) return [];
  const labels: string[] = [];
  if (metadata.contextWindow !== undefined) {
    const context =
      metadata.contextWindow >= 1_000_000
        ? `${(metadata.contextWindow / 1_000_000).toFixed(1)}M`
        : `${Math.round(metadata.contextWindow / 1_000)}k`;
    labels.push(`${context} context`);
  }
  if (metadata.inputModalities?.includes("image") || metadata.inputModalities?.includes("audio")) {
    labels.push(`Input: ${metadata.inputModalities.join("/")}`);
  }
  if (metadata.outputModalities?.some((modality) => modality !== "text")) {
    labels.push(`Output: ${metadata.outputModalities.join("/")}`);
  }
  if (
    metadata.supportedParameters?.some(
      (parameter) => parameter === "tools" || parameter === "tool_choice",
    )
  ) {
    labels.push("Tools");
  }
  if (metadata.reasoning) labels.push("Reasoning");
  if (metadata.pricing) labels.push("Pricing available");
  return labels;
}

interface ProviderModelsSectionProps {
  readonly instanceId: ProviderInstanceId;
  readonly driverKind: ProviderDriverKind | null;
  readonly models: ReadonlyArray<ServerProviderModel>;
  readonly customModels: ReadonlyArray<CustomModelDefinition>;
  readonly hiddenModels: ReadonlyArray<string>;
  readonly favoriteModels: ReadonlyArray<string>;
  readonly modelOrder: ReadonlyArray<string>;
  readonly searchQuery?: string;
  readonly onChange: (next: ReadonlyArray<CustomModelDefinition>) => void;
  readonly onHiddenModelsChange: (next: ReadonlyArray<string>) => void;
  readonly onFavoriteModelsChange: (next: ReadonlyArray<string>) => void;
  readonly onModelOrderChange: (next: ReadonlyArray<string>) => void;
}

export function ProviderModelsSection({
  instanceId,
  driverKind,
  models,
  customModels,
  hiddenModels,
  favoriteModels,
  modelOrder,
  searchQuery = "",
  onChange,
  onHiddenModelsChange,
  onFavoriteModelsChange,
  onModelOrderChange,
}: ProviderModelsSectionProps) {
  const [input, setInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const scrollToSlugRef = useRef<string | null>(null);
  const hiddenModelSet = useMemo(() => new Set(hiddenModels), [hiddenModels]);
  const favoriteModelSet = useMemo(() => new Set(favoriteModels), [favoriteModels]);
  const orderedModels = useMemo(() => {
    const sorted = sortModelsForProviderInstance(models, {
      favoriteModels: favoriteModelSet,
      groupFavorites: true,
      modelOrder,
    });
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
    return normalizedQuery.length === 0
      ? sorted
      : sorted.filter(
          (model) =>
            model.name.toLocaleLowerCase().includes(normalizedQuery) ||
            model.slug.toLocaleLowerCase().includes(normalizedQuery),
        );
  }, [favoriteModelSet, modelOrder, models, searchQuery]);

  useEffect(() => {
    const slug = scrollToSlugRef.current;
    if (!slug || !listRef.current) return;
    const row = Array.from(listRef.current.children).find(
      (child) => child.getAttribute("data-model-slug") === slug,
    );
    if (row instanceof HTMLElement) row.scrollIntoView({ block: "nearest" });
    scrollToSlugRef.current = null;
  }, [orderedModels]);

  const handleAdd = () => {
    if (driverKind === "antigravity") return;
    const normalized = normalizeCustomModelSlug(input);
    if (!normalized) {
      setError("Enter a model slug.");
      return;
    }
    if (models.some((model) => !model.isCustom && model.slug === normalized)) {
      setError("That model is already built in.");
      return;
    }
    if (normalized.length > MAX_CUSTOM_MODEL_LENGTH) {
      setError(`Model slugs must be ${MAX_CUSTOM_MODEL_LENGTH} characters or less.`);
      return;
    }
    if (customModels.some((entry) => entry.slug === normalized)) {
      setError("That custom model is already saved.");
      return;
    }
    scrollToSlugRef.current = normalized;
    onChange([...customModels, { slug: normalized, name: normalized, capabilities: null }]);
    setInput("");
    setError(null);
    setIsAdding(false);
  };

  const handleRemove = (slug: string) => {
    if (editingSlug === slug) setEditingSlug(null);
    onChange(customModels.filter((entry) => entry.slug !== slug));
    onModelOrderChange(modelOrder.filter((model) => model !== slug));
    onFavoriteModelsChange(favoriteModels.filter((model) => model !== slug));
    setError(null);
  };

  const setHidden = (slug: string, hidden: boolean) => {
    if (hidden === hiddenModelSet.has(slug)) return;
    onHiddenModelsChange(
      hidden ? [...hiddenModels, slug] : hiddenModels.filter((model) => model !== slug),
    );
  };

  const handleToggleFavorite = (slug: string) => {
    onFavoriteModelsChange(
      favoriteModelSet.has(slug)
        ? favoriteModels.filter((model) => model !== slug)
        : [...favoriteModels, slug],
    );
  };

  const groupOf = (model: ServerProviderModel) =>
    favoriteModelSet.has(model.slug)
      ? "favorite"
      : !model.isCustom && hiddenModelSet.has(model.slug)
        ? "hidden"
        : "visible";

  const handleMove = (slug: string, direction: -1 | 1) => {
    const index = orderedModels.findIndex((model) => model.slug === slug);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= orderedModels.length) return;
    if (groupOf(orderedModels[index]!) !== groupOf(orderedModels[nextIndex]!)) return;
    const next = orderedModels.map((model) => model.slug);
    [next[index], next[nextIndex]] = [next[nextIndex]!, next[index]!];
    onModelOrderChange(next);
  };

  return (
    <div>
      <div className="text-xs font-medium text-foreground">Models</div>
      <div className="mt-1 text-xs text-muted-foreground">
        {models.length} model{models.length === 1 ? "" : "s"} available for every project using this
        provider. Hide or show models in the composer, or add a custom model ID below.
        {searchQuery.trim().length > 0 ? ` Showing ${orderedModels.length} matching results.` : ""}
      </div>

      <div ref={listRef} className="mt-2 max-h-56 overflow-y-auto pb-1">
        {orderedModels.map((model, index) => {
          const isHidden = hiddenModelSet.has(model.slug);
          const isFavorite = favoriteModelSet.has(model.slug);
          const previousModel = orderedModels[index - 1];
          const nextModel = orderedModels[index + 1];
          const canMoveUp =
            previousModel !== undefined && groupOf(previousModel) === groupOf(model);
          const canMoveDown = nextModel !== undefined && groupOf(nextModel) === groupOf(model);
          const detailLabels = metadataLabels(model);
          const descriptors = model.capabilities?.optionDescriptors ?? [];
          if (descriptors.some((descriptor) => descriptor.id === "fastMode")) {
            detailLabels.push("Fast mode");
          }
          if (descriptors.some((descriptor) => descriptor.id === "thinking")) {
            detailLabels.push("Thinking");
          }
          if (
            descriptors.some(
              (descriptor) =>
                descriptor.type === "select" &&
                ["reasoningEffort", "effort", "reasoning", "variant"].includes(descriptor.id),
            )
          ) {
            detailLabels.push("Reasoning");
          }
          const customEntry = model.isCustom
            ? customModels.find((entry) => entry.slug === model.slug)
            : undefined;

          return (
            <div key={`${instanceId}:${model.slug}`} data-model-slug={model.slug} className="py-1">
              <div
                className={cn(
                  "grid min-h-7 grid-cols-[minmax(0,1fr)_auto] items-center gap-2",
                  isHidden && "text-muted-foreground",
                )}
              >
                <div className="flex min-w-0 items-center gap-1">
                  <span
                    className={cn(
                      "min-w-0 truncate text-xs",
                      isHidden ? "text-muted-foreground line-through" : "text-foreground/90",
                    )}
                  >
                    {model.name}
                  </span>
                  {detailLabels.length > 0 || model.name !== model.slug ? (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            size="icon-micro"
                            variant="ghost"
                            className="text-muted-foreground/60 hover:text-muted-foreground"
                            aria-label={`Details for ${model.name}`}
                          />
                        }
                      >
                        <InfoIcon className="size-3" />
                      </TooltipTrigger>
                      <TooltipPopup side="top" className="max-w-56">
                        <div className="space-y-1">
                          <code className="block text-[11px] text-foreground">{model.slug}</code>
                          {detailLabels.length > 0 ? (
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                              {detailLabels.map((label) => (
                                <span key={label} className="text-[10px] text-muted-foreground">
                                  {label}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </TooltipPopup>
                    </Tooltip>
                  ) : null}
                  {isHidden ? <span className="text-[10px]">hidden</span> : null}
                  {model.isCustom ? <span className="text-[10px]">custom</span> : null}
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          size="icon-micro"
                          variant="ghost-muted"
                          className={cn(isFavorite && "text-yellow-500 hover:text-yellow-600")}
                          onClick={() => handleToggleFavorite(model.slug)}
                          aria-label={`${isFavorite ? "Remove" : "Add"} ${model.name} ${isFavorite ? "from" : "to"} favorites`}
                        />
                      }
                    >
                      <StarIcon className={cn("size-3", isFavorite && "fill-current")} />
                    </TooltipTrigger>
                    <TooltipPopup side="top">
                      {isFavorite ? "Remove from favorites" : "Add to favorites"}
                    </TooltipPopup>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          size="icon-micro"
                          variant="ghost-muted"
                          disabled={!canMoveUp}
                          onClick={() => handleMove(model.slug, -1)}
                          aria-label={`Move ${model.name} up`}
                        />
                      }
                    >
                      <ArrowUpIcon className="size-3" />
                    </TooltipTrigger>
                    <TooltipPopup side="top">Move up</TooltipPopup>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          size="icon-micro"
                          variant="ghost-muted"
                          disabled={!canMoveDown}
                          onClick={() => handleMove(model.slug, 1)}
                          aria-label={`Move ${model.name} down`}
                        />
                      }
                    >
                      <ArrowDownIcon className="size-3" />
                    </TooltipTrigger>
                    <TooltipPopup side="top">Move down</TooltipPopup>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          size="icon-micro"
                          variant="ghost-muted"
                          onClick={() => setHidden(model.slug, !isHidden)}
                          aria-label={`${isHidden ? "Show" : "Hide"} ${model.name}`}
                        />
                      }
                    >
                      {isHidden ? <EyeIcon className="size-3" /> : <EyeOffIcon className="size-3" />}
                    </TooltipTrigger>
                    <TooltipPopup side="top">
                      {isHidden ? "Show in picker" : "Hide from picker"}
                    </TooltipPopup>
                  </Tooltip>
                  {customEntry ? (
                    <>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              size="icon-micro"
                              variant="ghost-muted"
                              onClick={() =>
                                setEditingSlug((current) =>
                                  current === model.slug ? null : model.slug,
                                )
                              }
                              aria-label={`Edit ${model.name}`}
                            />
                          }
                        >
                          <PencilIcon className="size-3" />
                        </TooltipTrigger>
                        <TooltipPopup side="top">Edit custom model</TooltipPopup>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              size="icon-micro"
                              variant="ghost-muted"
                              aria-label={`Remove ${model.name}`}
                              onClick={() => handleRemove(model.slug)}
                            />
                          }
                        >
                          <XIcon className="size-3" />
                        </TooltipTrigger>
                        <TooltipPopup side="top">Remove custom model</TooltipPopup>
                      </Tooltip>
                    </>
                  ) : null}
                </div>
              </div>
              {editingSlug === model.slug && customEntry ? (
                <div className="mt-2 rounded-lg border border-border/70 bg-muted/20 p-2">
                  <CustomModelEditor
                    instanceId={String(instanceId)}
                    driverKind={driverKind}
                    entry={customEntry}
                    builtInModels={models.filter((candidate) => !candidate.isCustom)}
                    onSave={(next) => {
                      onChange(
                        customModels.map((entry) => (entry.slug === next.slug ? next : entry)),
                      );
                      setEditingSlug(null);
                    }}
                    onCancel={() => setEditingSlug(null)}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {driverKind === "antigravity" ? null : isAdding ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input
            id={`provider-instance-${instanceId}-custom-model`}
            size="sm"
            autoFocus
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                setInput("");
                setError(null);
                setIsAdding(false);
              } else if (event.key === "Enter") {
                event.preventDefault();
                handleAdd();
              }
            }}
            placeholder={driverKind ? CUSTOM_MODEL_PLACEHOLDER_BY_KIND[driverKind] : "model-slug"}
            spellCheck={false}
          />
          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="outline" onClick={handleAdd}>
              Add
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setInput("");
                setError(null);
                setIsAdding(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          size="xs"
          variant="ghost-muted"
          className="mt-2 -ml-2"
          onClick={() => setIsAdding(true)}
        >
          <PlusIcon className="size-3" />
          Add custom model
        </Button>
      )}

      {driverKind !== "antigravity" && error ? (
        <p className="mt-2 text-xs text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
