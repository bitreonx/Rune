// @effect-diagnostics nodeBuiltinImport:off
// @effect-diagnostics globalDate:off
// @effect-diagnostics globalTimers:off
// @effect-diagnostics tryCatchInEffectGen:off
// @effect-diagnostics runEffectInsideEffect:off
/**
 * WorkspaceFileWatcher - streams debounced filesystem events per workspace root.
 *
 * One recursive fs.watch per root, refcounted across subscribers. Raw watcher
 * noise is coalesced into batched events: within a debounce window every
 * touched path is statted once and classified as created / changed / removed.
 * When watching is unavailable (platform or permission), the stream stays
 * silent — clients keep their polling refresh as the safety net.
 *
 * @module WorkspaceFileWatcher
 */
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

import type { ProjectFileEventsBatch } from "@rune/contracts";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as PubSub from "effect/PubSub";
import * as Ref from "effect/Ref";
import * as Stream from "effect/Stream";

const DEBOUNCE_MS = 300;
/** One batched event groups at most this many paths; heavier churn splits across events. */
const MAX_PATHS_PER_EVENT = 100;
/** A path statted this recently after a watcher event is treated as created, not changed. */
const CREATED_GRACE_MS = 5_000;

interface WatchedRoot {
  readonly pubsub: PubSub.PubSub<ProjectFileEventsBatch>;
  readonly watcher: NodeFS.FSWatcher | null;
  readonly subscribers: number;
}

export class WorkspaceFileWatcher extends Context.Service<WorkspaceFileWatcher, {
  /** Batched, debounced change events for one workspace root. */
  readonly streamEvents: (input: { readonly cwd: string }) => Stream.Stream<ProjectFileEventsBatch>;
}>()("rune/workspace/WorkspaceFileWatcher") {}

const toPosix = (value: string) => value.replaceAll("\\", "/");

export const make = Effect.gen(function* () {
  const rootsRef = yield* Ref.make(new Map<string, WatchedRoot>());

  const releaseRoot = (root: string) =>
    Ref.modify(rootsRef, (roots: ReadonlyMap<string, WatchedRoot>) => {
      const watched = roots.get(root);
      if (!watched) return [undefined, new Map(roots)] as const;
      if (watched.subscribers > 1) {
        const next = new Map(roots);
        next.set(root, { ...watched, subscribers: watched.subscribers - 1 });
        return [undefined, next] as const;
      }
      watched.watcher?.close();
      const next = new Map(roots);
      next.delete(root);
      return [undefined, next] as const;
    });

  const retainRoot = (root: string) =>
    Effect.gen(function* () {
      const existing = (yield* Ref.get(rootsRef)).get(root);
      if (existing) {
        const next = new Map(yield* Ref.get(rootsRef));
        next.set(root, { ...existing, subscribers: existing.subscribers + 1 });
        yield* Ref.set(rootsRef, next);
        return existing;
      }

      const pubsub = yield* PubSub.unbounded<ProjectFileEventsBatch>();
      const flushSignal = { pending: new Set<string>(), timer: null as NodeJS.Timeout | null };

      const flush = () => {
        flushSignal.timer = null;
        const paths = [...flushSignal.pending];
        flushSignal.pending.clear();
        if (paths.length === 0) return;

        const created: string[] = [];
        const changed: string[] = [];
        const removed: string[] = [];
        for (const absolutePath of paths.slice(0, MAX_PATHS_PER_EVENT)) {
          let stat: NodeFS.Stats | null = null;
          try {
            stat = NodeFS.statSync(absolutePath);
          } catch {
            stat = null;
          }
          const relative = toPosix(NodePath.relative(root, absolutePath));
          if (relative === "" || relative.startsWith("..")) continue;
          if (stat === null) removed.push(relative);
          else if (Date.now() - stat.birthtimeMs < CREATED_GRACE_MS) created.push(relative);
          else changed.push(relative);
        }

        const at = Date.now();
        const push = (kind: "created" | "changed" | "removed", list: string[]) => {
          if (list.length === 0) return;
          Effect.runFork(
            PubSub.publish(pubsub, {
              cwd: root,
              events: [{ paths: list, kind, at }],
            } satisfies ProjectFileEventsBatch),
          );
        };
        push("created", created);
        push("changed", changed);
        push("removed", removed);
      };

      const enqueue = (absolutePath: string) => {
        flushSignal.pending.add(absolutePath);
        if (flushSignal.timer !== null) clearTimeout(flushSignal.timer);
        flushSignal.timer = setTimeout(flush, DEBOUNCE_MS);
      };

      const attach = Effect.try({
        try: () =>
          NodeFS.watch(root, { recursive: true, persistent: false }, (_event, fileName) => {
            if (typeof fileName !== "string" || fileName.length === 0) return;
            // Watcher filenames are host-format; normalize to an absolute path.
            enqueue(NodePath.resolve(root, fileName));
          }),
        catch: () => null,
      }).pipe(
        // Watching is best-effort: a failed or unsupported recursive watch
        // yields a null watcher and the stream stays event-free. Client
        // polling remains the freshness safety net either way.
        Effect.catch(() => Effect.succeed(null)),
      );
      const watcher = yield* attach;
      watcher?.on("error", () => watcher.close());

      const watched: WatchedRoot = { pubsub, watcher, subscribers: 1 };
      yield* Ref.update(rootsRef, (roots) => new Map(roots).set(root, watched));
      return watched;
    });

  const streamEvents: WorkspaceFileWatcher["Service"]["streamEvents"] = (input) =>
    Stream.unwrap(
      Effect.gen(function* () {
        let canonicalRoot = input.cwd;
        try {
          canonicalRoot = NodeFS.realpathSync(input.cwd);
        } catch {
          // Fall back to the raw cwd; normalizeWorkspaceRoot reports bad roots.
        }
        const watched = yield* retainRoot(canonicalRoot);
        const subscription = yield* PubSub.subscribe(watched.pubsub);
        return Stream.fromSubscription(subscription).pipe(
          Stream.ensuring(releaseRoot(canonicalRoot)),
        );
      }),
    );

  return WorkspaceFileWatcher.of({ streamEvents });
});

export const layer = Layer.effect(WorkspaceFileWatcher, make);
