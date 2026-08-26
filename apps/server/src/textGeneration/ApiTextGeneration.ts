import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http";
import type * as HttpClientRequestModel from "effect/unstable/http/HttpClientRequest";

import {
  TextGenerationError,
  type ModelSelection,
  type OpenAiApiSettings,
  type OpenRouterSettings,
} from "@rune/contracts";
import { extractJsonObject } from "@rune/shared/schemaJson";
import { sanitizeBranchFragment, sanitizeFeatureBranchName } from "@rune/shared/git";
import * as TextGeneration from "./TextGeneration.ts";
import {
  buildBranchNamePrompt,
  buildCommitMessagePrompt,
  buildPrContentPrompt,
  buildThreadTitlePrompt,
} from "./TextGenerationPrompts.ts";
import {
  sanitizeCommitSubject,
  sanitizePrTitle,
  sanitizeThreadTitle,
} from "./TextGenerationUtils.ts";
import { extractOpenAiCompatibleText } from "../provider/Layers/ApiAdapter.ts";

export interface ApiTextGenerationOptions {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly defaultModel: string;
  readonly requestHeaders?: Readonly<Record<string, string>>;
}

type ApiSettings = OpenAiApiSettings | OpenRouterSettings;

function headersFor(options: ApiTextGenerationOptions): HttpClientRequestModel.HttpClientRequest {
  let request = HttpClientRequest.post(`${options.baseUrl.replace(/\/$/u, "")}/chat/completions`).pipe(
    HttpClientRequest.acceptJson,
  );
  if (options.apiKey.trim().length > 0) {
    request = request.pipe(HttpClientRequest.bearerToken(options.apiKey.trim()));
  }
  for (const [name, value] of Object.entries(options.requestHeaders ?? {})) {
    if (value.trim().length > 0) request = request.pipe(HttpClientRequest.setHeader(name, value));
  }
  return request;
}

export const makeApiTextGeneration = Effect.fn("makeApiTextGeneration")(function* (
  settings: ApiSettings,
  options: ApiTextGenerationOptions,
) {
  const httpClient = yield* HttpClient.HttpClient;

  const runJson = <S extends Schema.Top>({
    operation,
    prompt,
    outputSchema,
    modelSelection,
  }: {
    readonly operation:
      | "generateCommitMessage"
      | "generatePrContent"
      | "generateBranchName"
      | "generateThreadTitle";
    readonly prompt: string;
    readonly outputSchema: S;
    readonly modelSelection: ModelSelection;
  }): Effect.Effect<S["Type"], TextGenerationError, S["DecodingServices"]> =>
    HttpClientRequest.bodyJson(headersFor(options), {
      model: modelSelection.model.trim() || options.defaultModel,
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      stream: false,
    }).pipe(
      Effect.flatMap(httpClient.execute),
      Effect.flatMap(HttpClientResponse.filterStatusOk),
      Effect.flatMap((response) => HttpClientResponse.schemaBodyJson(Schema.Unknown)(response)),
      Effect.mapError(
        (cause) =>
          new TextGenerationError({
            operation,
            detail: "API provider text generation request failed.",
            cause,
          }),
      ),
      Effect.flatMap((payload) => {
        const text = extractOpenAiCompatibleText(payload).trim();
        if (text.length === 0) {
          return Effect.fail(
            new TextGenerationError({
              operation,
              detail: "API provider returned an empty structured response.",
            }),
          );
        }
        return Schema.decodeEffect(Schema.fromJsonString(outputSchema))(extractJsonObject(text)).pipe(
          Effect.mapError(
            (cause) =>
              new TextGenerationError({
                operation,
                detail: "API provider returned invalid structured output.",
                cause,
              }),
          ),
        );
      }),
    );

  const generateCommitMessage: TextGeneration.TextGeneration["Service"]["generateCommitMessage"] =
    Effect.fn("ApiTextGeneration.generateCommitMessage")(function* (input) {
      const { prompt, outputSchema } = buildCommitMessagePrompt({
        branch: input.branch,
        stagedSummary: input.stagedSummary,
        stagedPatch: input.stagedPatch,
        includeBranch: input.includeBranch === true,
        policy: input.policy,
      });
      const generated = yield* runJson({
        operation: "generateCommitMessage",
        prompt,
        outputSchema,
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
    Effect.fn("ApiTextGeneration.generatePrContent")(function* (input) {
      const { prompt, outputSchema } = buildPrContentPrompt({
        baseBranch: input.baseBranch,
        headBranch: input.headBranch,
        commitSummary: input.commitSummary,
        diffSummary: input.diffSummary,
        diffPatch: input.diffPatch,
        policy: input.policy,
        changeRequestTemplate: input.changeRequestTemplate,
      });
      const generated = yield* runJson({
        operation: "generatePrContent",
        prompt,
        outputSchema,
        modelSelection: input.modelSelection,
      });
      return { title: sanitizePrTitle(generated.title), body: generated.body.trim() };
    });

  const generateBranchName: TextGeneration.TextGeneration["Service"]["generateBranchName"] =
    Effect.fn("ApiTextGeneration.generateBranchName")(function* (input) {
      const { prompt, outputSchema } = buildBranchNamePrompt({
        message: input.message,
        attachments: input.attachments,
      });
      const generated = yield* runJson({
        operation: "generateBranchName",
        prompt,
        outputSchema,
        modelSelection: input.modelSelection,
      });
      return { branch: sanitizeBranchFragment(generated.branch) };
    });

  const generateThreadTitle: TextGeneration.TextGeneration["Service"]["generateThreadTitle"] =
    Effect.fn("ApiTextGeneration.generateThreadTitle")(function* (input) {
      const { prompt, outputSchema } = buildThreadTitlePrompt({
        message: input.message,
        previousTitle: input.previousTitle,
        attachments: input.attachments,
      });
      const generated = yield* runJson({
        operation: "generateThreadTitle",
        prompt,
        outputSchema,
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
