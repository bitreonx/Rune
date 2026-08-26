import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";

import {
  type AntigravitySettings,
  TextGenerationError,
  type ModelSelection,
} from "@rune/contracts";
import { sanitizeBranchFragment, sanitizeFeatureBranchName } from "@rune/shared/git";
import { getModelSelectionStringOptionValue } from "@rune/shared/model";
import { resolveSpawnCommand } from "@rune/shared/shell";

import * as TextGeneration from "./TextGeneration.ts";
import {
  buildBranchNamePrompt,
  buildCommitMessagePrompt,
  buildPrContentPrompt,
  buildThreadTitlePrompt,
} from "./TextGenerationPrompts.ts";
import {
  normalizeCliError,
  sanitizeCommitSubject,
  sanitizePrTitle,
  sanitizeThreadTitle,
  toJsonSchemaObject,
} from "./TextGenerationUtils.ts";

const ANTIGRAVITY_TIMEOUT_MS = 180_000;
const decodeJsonString = Schema.decodeUnknownSync(Schema.fromJsonString(Schema.Unknown));
const encodeJsonString = Schema.encodeSync(Schema.fromJsonString(Schema.Unknown));

type TextGenerationOperation =
  | "generateCommitMessage"
  | "generatePrContent"
  | "generateBranchName"
  | "generateThreadTitle";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJsonCandidate(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value
    .trim()
    .replace(/^```(?:json)?\s*/iu, "")
    .replace(/\s*```$/u, "");
  try {
    return decodeJsonString(trimmed);
  } catch {
    return value;
  }
}

/** Accept both the documented JSON envelope and a plain JSON response. */
function extractAntigravityStructuredOutput(stdout: string): unknown {
  let parsed: unknown;
  try {
    parsed = decodeJsonString(stdout.trim());
  } catch {
    return parseJsonCandidate(stdout);
  }

  if (!isRecord(parsed)) return parseJsonCandidate(parsed);
  for (const key of ["structured_output", "response", "output"] as const) {
    if (parsed[key] !== undefined) {
      const candidate = parseJsonCandidate(parsed[key]);
      if (candidate !== parsed[key] || isRecord(candidate)) return candidate;
    }
  }
  return parsed;
}

export const makeAntigravityTextGeneration = Effect.fn("makeAntigravityTextGeneration")(function* (
  antigravitySettings: AntigravitySettings,
  environment: NodeJS.ProcessEnv = process.env,
) {
  const commandSpawner = yield* ChildProcessSpawner.ChildProcessSpawner;

  const readStreamAsString = <E>(
    operation: TextGenerationOperation,
    stream: Stream.Stream<Uint8Array, E>,
  ): Effect.Effect<string, TextGenerationError> =>
    stream.pipe(
      Stream.decodeText(),
      Stream.runFold(
        () => "",
        (acc, chunk) => acc + chunk,
      ),
      Effect.mapError((cause) =>
        normalizeCliError("agy", operation, cause, "Failed to collect Antigravity CLI output."),
      ),
    );

  const runAntigravityJson = Effect.fn("runAntigravityJson")(function* <S extends Schema.Top>({
    operation,
    cwd,
    prompt,
    outputSchemaJson,
    modelSelection,
  }: {
    readonly operation: TextGenerationOperation;
    readonly cwd: string;
    readonly prompt: string;
    readonly outputSchemaJson: S;
    readonly modelSelection: ModelSelection;
  }): Effect.fn.Return<S["Type"], TextGenerationError, S["DecodingServices"]> {
    const effort = getModelSelectionStringOptionValue(modelSelection, "effort");
    if (effort !== undefined && effort !== "low" && effort !== "medium" && effort !== "high") {
      return yield* new TextGenerationError({
        operation,
        detail: `Antigravity supports low, medium, or high effort; received '${effort}'.`,
      });
    }

    const schemaJson = encodeJsonString(toJsonSchemaObject(outputSchemaJson));
    const schemaInstruction = `\n\nReturn only valid JSON matching this schema:\n${schemaJson}`;
    const spawnCommand = yield* resolveSpawnCommand(
      antigravitySettings.binaryPath || "agy",
      [
        "-p",
        `${prompt}${schemaInstruction}`,
        "--output-format",
        "json",
        "--model",
        modelSelection.model,
        ...(effort ? ["--effort", effort] : []),
      ],
      { env: environment },
    ).pipe(
      Effect.mapError((cause) =>
        normalizeCliError("agy", operation, cause, "Failed to resolve Antigravity CLI command."),
      ),
    );

    const child = yield* commandSpawner
      .spawn(
        ChildProcess.make(spawnCommand.command, spawnCommand.args, {
          env: environment,
          cwd,
          shell: spawnCommand.shell,
        }),
      )
      .pipe(
        Effect.mapError((cause) =>
          normalizeCliError("agy", operation, cause, "Failed to spawn Antigravity CLI process."),
        ),
      );

    const [stdout, stderr, exitCode] = yield* Effect.all(
      [
        readStreamAsString(operation, child.stdout),
        readStreamAsString(operation, child.stderr),
        child.exitCode.pipe(
          Effect.mapError((cause) =>
            normalizeCliError("agy", operation, cause, "Failed to read Antigravity CLI exit code."),
          ),
        ),
      ],
      { concurrency: "unbounded" },
    );

    if (exitCode !== 0) {
      const detail = stderr.trim() || stdout.trim();
      return yield* new TextGenerationError({
        operation,
        detail:
          detail.length > 0
            ? `Antigravity CLI command failed: ${detail}`
            : `Antigravity CLI command failed with code ${exitCode}.`,
      });
    }

    const decodedOutput = Schema.decodeEffect(outputSchemaJson)(
      extractAntigravityStructuredOutput(stdout),
    );
    return yield* decodedOutput.pipe(
      Effect.catchTags({
        SchemaError: (cause) =>
          Effect.fail(
            new TextGenerationError({
              operation,
              detail: "Antigravity returned invalid structured output.",
              cause,
            }),
          ),
      }),
    );
  });

  const runWithTimeout = <S extends Schema.Top>(input: {
    readonly operation: TextGenerationOperation;
    readonly cwd: string;
    readonly prompt: string;
    readonly outputSchemaJson: S;
    readonly modelSelection: ModelSelection;
  }): Effect.Effect<S["Type"], TextGenerationError, S["DecodingServices"]> =>
    runAntigravityJson(input).pipe(
      Effect.scoped,
      Effect.timeoutOption(ANTIGRAVITY_TIMEOUT_MS),
      Effect.flatMap(
        Option.match({
          onNone: () =>
            Effect.fail(
              new TextGenerationError({
                operation: input.operation,
                detail: "Antigravity CLI request timed out.",
              }),
            ),
          onSome: (value) => Effect.succeed(value),
        }),
      ),
    );

  const generateCommitMessage: TextGeneration.TextGeneration["Service"]["generateCommitMessage"] =
    Effect.fn("AntigravityTextGeneration.generateCommitMessage")(function* (input) {
      const { prompt, outputSchema } = buildCommitMessagePrompt({
        branch: input.branch,
        stagedSummary: input.stagedSummary,
        stagedPatch: input.stagedPatch,
        includeBranch: input.includeBranch === true,
        policy: input.policy,
      });
      const generated = yield* runWithTimeout({
        operation: "generateCommitMessage",
        cwd: input.cwd,
        prompt,
        outputSchemaJson: outputSchema,
        modelSelection: input.modelSelection,
      });
      return {
        subject: sanitizeCommitSubject(generated.subject),
        body: generated.body.trim(),
        ...("branch" in generated && typeof generated.branch === "string"
          ? { branch: sanitizeFeatureBranchName(generated.branch) }
          : {}),
      };
    });

  const generatePrContent: TextGeneration.TextGeneration["Service"]["generatePrContent"] =
    Effect.fn("AntigravityTextGeneration.generatePrContent")(function* (input) {
      const { prompt, outputSchema } = buildPrContentPrompt({
        baseBranch: input.baseBranch,
        headBranch: input.headBranch,
        commitSummary: input.commitSummary,
        diffSummary: input.diffSummary,
        diffPatch: input.diffPatch,
        policy: input.policy,
        changeRequestTemplate: input.changeRequestTemplate,
      });
      const generated = yield* runWithTimeout({
        operation: "generatePrContent",
        cwd: input.cwd,
        prompt,
        outputSchemaJson: outputSchema,
        modelSelection: input.modelSelection,
      });
      return { title: sanitizePrTitle(generated.title), body: generated.body.trim() };
    });

  const generateBranchName: TextGeneration.TextGeneration["Service"]["generateBranchName"] =
    Effect.fn("AntigravityTextGeneration.generateBranchName")(function* (input) {
      const { prompt, outputSchema } = buildBranchNamePrompt({
        message: input.message,
        attachments: input.attachments,
      });
      const generated = yield* runWithTimeout({
        operation: "generateBranchName",
        cwd: input.cwd,
        prompt,
        outputSchemaJson: outputSchema,
        modelSelection: input.modelSelection,
      });
      return { branch: sanitizeBranchFragment(generated.branch) };
    });

  const generateThreadTitle: TextGeneration.TextGeneration["Service"]["generateThreadTitle"] =
    Effect.fn("AntigravityTextGeneration.generateThreadTitle")(function* (input) {
      const { prompt, outputSchema } = buildThreadTitlePrompt({
        message: input.message,
        previousTitle: input.previousTitle,
        attachments: input.attachments,
      });
      const generated = yield* runWithTimeout({
        operation: "generateThreadTitle",
        cwd: input.cwd,
        prompt,
        outputSchemaJson: outputSchema,
        modelSelection: input.modelSelection,
      });
      return { title: sanitizeThreadTitle(generated.title) };
    });

  return {
    generateCommitMessage,
    generatePrContent,
    generateBranchName,
    generateThreadTitle,
  } satisfies TextGeneration.TextGeneration["Service"];
});
