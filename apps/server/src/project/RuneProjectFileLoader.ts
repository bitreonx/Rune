/**
 * RUNEProjectFileLoader - Effect service that loads the checked-in `rune.json`
 * project file from a workspace root.
 *
 * Loading is best-effort: a missing file resolves to `Option.none`, and
 * unreadable or invalid files are logged and treated as absent so callers
 * can fall back to their defaults.
 *
 * @module RUNEProjectFileLoader
 */
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import { RUNE_PROJECT_FILE_NAME, type RuneProjectFile } from "@rune/contracts";
import { RUNEProjectFileFromJson } from "@rune/shared/runeProjectFile";

const decodeRUNEProjectFileJson = Schema.decodeEffect(RUNEProjectFileFromJson);

export class RUNEProjectFileLoadError extends Schema.TaggedErrorClass<RUNEProjectFileLoadError>()(
  "RUNEProjectFileLoadError",
  {
    operation: Schema.Literals(["read", "decode"]),
    workspaceRoot: Schema.String,
    filePath: Schema.String,
    cause: Schema.Defect(),
  },
) {
  override get message(): string {
    return `Failed to ${this.operation} ${RUNE_PROJECT_FILE_NAME} at ${this.filePath}.`;
  }
}

/** Service tag for rune.json project file loading. */
export class RUNEProjectFileLoader extends Context.Service<
  RUNEProjectFileLoader,
  {
    /**
     * Load and decode `rune.json` at the workspace root.
     *
     * Never fails: missing, unreadable, or invalid files resolve to
     * `Option.none` (invalid files are logged as warnings).
     */
    readonly load: (workspaceRoot: string) => Effect.Effect<Option.Option<RuneProjectFile>>;
  }
>()("rune/project/RUNEProjectFileLoader") {}

const logRUNEProjectFileLoadError = (error: RUNEProjectFileLoadError) =>
  Effect.logWarning(error).pipe(
    Effect.annotateLogs({
      operation: error.operation,
      workspaceRoot: error.workspaceRoot,
      filePath: error.filePath,
      errorTag: error._tag,
    }),
  );

export const make = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const load: RUNEProjectFileLoader["Service"]["load"] = Effect.fn("RUNEProjectFileLoader.load")(
    function* (workspaceRoot) {
      const filePath = path.join(workspaceRoot, RUNE_PROJECT_FILE_NAME);
      const raw = yield* fileSystem.readFileString(filePath).pipe(
        Effect.map(Option.some),
        Effect.catchTags({
          PlatformError: (error) =>
            error.reason._tag === "NotFound"
              ? Effect.succeed(Option.none<string>())
              : logRUNEProjectFileLoadError(
                  new RUNEProjectFileLoadError({
                    operation: "read",
                    workspaceRoot,
                    filePath,
                    cause: error,
                  }),
                ).pipe(Effect.as(Option.none<string>())),
        }),
      );
      if (Option.isNone(raw)) {
        return Option.none<RuneProjectFile>();
      }
      return yield* decodeRUNEProjectFileJson(raw.value).pipe(
        Effect.map(Option.some),
        Effect.catchTags({
          SchemaError: (error) =>
            logRUNEProjectFileLoadError(
              new RUNEProjectFileLoadError({
                operation: "decode",
                workspaceRoot,
                filePath,
                cause: error,
              }),
            ).pipe(Effect.as(Option.none<RuneProjectFile>())),
        }),
      );
    },
  );

  return RUNEProjectFileLoader.of({ load });
});

export const layer = Layer.effect(RUNEProjectFileLoader, make);
