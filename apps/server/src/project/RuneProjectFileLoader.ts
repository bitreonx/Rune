/** Effect service that loads the checked-in `rune.json` project file. */
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import { RUNE_PROJECT_FILE_NAME, type RuneProjectFile } from "@rune/contracts";
import { RuneProjectFileFromJson } from "@rune/shared/runeProjectFile";

const decodeRuneProjectFileJson = Schema.decodeEffect(RuneProjectFileFromJson);

export class RuneProjectFileLoadError extends Schema.TaggedErrorClass<RuneProjectFileLoadError>()(
  "RuneProjectFileLoadError",
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

export class RuneProjectFileLoader extends Context.Service<
  RuneProjectFileLoader,
  {
    /** Load and decode `rune.json` at the workspace root. */
    readonly load: (workspaceRoot: string) => Effect.Effect<Option.Option<RuneProjectFile>>;
  }
>()("rune/project/RuneProjectFileLoader") {}

const logRuneProjectFileLoadError = (error: RuneProjectFileLoadError) =>
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

  const load: RuneProjectFileLoader["Service"]["load"] = Effect.fn("RuneProjectFileLoader.load")(
    function* (workspaceRoot) {
      const filePath = path.join(workspaceRoot, RUNE_PROJECT_FILE_NAME);
      const raw = yield* fileSystem.readFileString(filePath).pipe(
        Effect.map(Option.some),
        Effect.catchTags({
          PlatformError: (error) =>
            error.reason._tag === "NotFound"
              ? Effect.succeed(Option.none<string>())
              : logRuneProjectFileLoadError(
                  new RuneProjectFileLoadError({
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
      return yield* decodeRuneProjectFileJson(raw.value).pipe(
        Effect.map(Option.some),
        Effect.catchTags({
          SchemaError: (error) =>
            logRuneProjectFileLoadError(
              new RuneProjectFileLoadError({
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

  return RuneProjectFileLoader.of({ load });
});

export const layer = Layer.effect(RuneProjectFileLoader, make);
