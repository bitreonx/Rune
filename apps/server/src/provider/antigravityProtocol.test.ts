import { describe, expect, it } from "vite-plus/test";

import {
  buildAntigravityCliArgs,
  parseAntigravityModelList,
  parseAntigravityStreamLine,
  readAntigravityConversationId,
  serializeAntigravityUserMessage,
} from "./antigravityProtocol.ts";

describe("Antigravity stream protocol", () => {
  it("parses init, response, and result events without losing provider data", () => {
    const init = parseAntigravityStreamLine(
      JSON.stringify({
        event: "init",
        conversation_id: "conv-123",
        cwd: "D:\\Apps\\Rune",
        model: "gemini-3.7-flash-high",
      }),
    );
    const response = parseAntigravityStreamLine(
      JSON.stringify({
        event: "step_update",
        conversation_id: "conv-123",
        step_type: "agent_response",
        text_delta: "hello",
      }),
    );
    const result = parseAntigravityStreamLine(
      JSON.stringify({
        event: "result",
        conversation_id: "conv-123",
        status: "SUCCESS",
        response: "hello",
        usage: { input_tokens: 12, output_tokens: 4 },
      }),
    );

    expect(init).toMatchObject({
      event: "init",
      conversation_id: "conv-123",
      model: "gemini-3.7-flash-high",
    });
    expect(response).toMatchObject({
      event: "step_update",
      step_type: "agent_response",
      text_delta: "hello",
    });
    expect(result).toMatchObject({
      event: "result",
      status: "SUCCESS",
      response: "hello",
      usage: { input_tokens: 12, output_tokens: 4 },
    });
  });

  it("normalizes the current nested agy event payloads", () => {
    expect(
      parseAntigravityStreamLine(
        JSON.stringify({
          event: "init",
          conversation_id: "conv-current",
          init: { model: "gemini-3.7-flash-low", cwd: "D:\\Apps\\Rune" },
        }),
      ),
    ).toMatchObject({
      event: "init",
      conversation_id: "conv-current",
      model: "gemini-3.7-flash-low",
    });
    expect(
      parseAntigravityStreamLine(
        JSON.stringify({
          event: "step_update",
          step_update: {
            step_type: "agent_response",
            text_delta: "OK",
          },
        }),
      ),
    ).toMatchObject({ event: "step_update", step_type: "agent_response", text_delta: "OK" });
    expect(
      parseAntigravityStreamLine(
        JSON.stringify({
          event: "result",
          result: {
            status: "SUCCESS",
            response: "OK",
            usage: { input_tokens: 3, output_tokens: 1 },
          },
        }),
      ),
    ).toMatchObject({
      event: "result",
      status: "SUCCESS",
      response: "OK",
      usage: { input_tokens: 3, output_tokens: 1 },
    });
  });

  it("ignores blank and malformed output rather than taking down the session reader", () => {
    expect(parseAntigravityStreamLine("")).toBeUndefined();
    expect(parseAntigravityStreamLine("not json")).toBeUndefined();
    expect(parseAntigravityStreamLine(JSON.stringify({ event: "unknown" }))).toBeUndefined();
  });

  it("serializes a user turn as the documented newline-delimited input event", () => {
    expect(serializeAntigravityUserMessage("Fix the failing test")).toBe(
      '{"event":"user","message":{"content":"Fix the failing test"}}\n',
    );
  });

  it("reads the durable conversation id from a persisted resume cursor", () => {
    expect(
      readAntigravityConversationId({
        schemaVersion: 1,
        conversationId: "conv-123",
      }),
    ).toBe("conv-123");
    expect(readAntigravityConversationId({ conversationId: "" })).toBeUndefined();
    expect(readAntigravityConversationId({ schemaVersion: 2, conversationId: "conv-123" })).toBe(
      undefined,
    );
  });
});

describe("Antigravity CLI contract", () => {
  it("builds the long-lived stream command with explicit model and effort", () => {
    expect(
      buildAntigravityCliArgs({
        model: "gemini-3.7-flash-high",
        effort: "high",
        dangerouslySkipPermissions: true,
      }),
    ).toEqual([
      "--input-format",
      "stream-json",
      "--output-format",
      "stream-json",
      "--model",
      "gemini-3.7-flash-high",
      "--effort",
      "high",
      "--dangerously-skip-permissions",
    ]);
  });

  it("passes a persisted conversation id when starting a replacement process", () => {
    expect(
      buildAntigravityCliArgs({
        model: "gemini-3.7-flash-high",
        conversationId: "conv-123",
      }),
    ).toEqual([
      "--input-format",
      "stream-json",
      "--output-format",
      "stream-json",
      "--model",
      "gemini-3.7-flash-high",
      "--conversation",
      "conv-123",
    ]);
  });

  it("parses the tab-separated output of agy models and skips non-model lines", () => {
    expect(
      parseAntigravityModelList(
        [
          "Available models:",
          "gemini-3.7-flash-high\tGemini 3.7 Flash (High)",
          "gemini-3.1-pro-high\tGemini 3.1 Pro (High)",
          "",
          "Use arrows to navigate",
        ].join("\n"),
      ),
    ).toEqual([
      { slug: "gemini-3.7-flash-high", name: "Gemini 3.7 Flash (High)" },
      { slug: "gemini-3.1-pro-high", name: "Gemini 3.1 Pro (High)" },
    ]);
  });
});
