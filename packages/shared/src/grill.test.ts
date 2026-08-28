import { describe, expect, it } from "vite-plus/test";

import { grillDecisionNodesForInvocation, parseGrillInvocation } from "./grill.ts";

describe("Grill invocation", () => {
  it("recognizes deliberate aliases and keeps ordinary prose untouched", () => {
    expect(parseGrillInvocation("/grill")).toEqual({ alias: "/grill", prompt: "" });
    expect(parseGrillInvocation("/grill-me API ownership")).toEqual({
      alias: "/grill-me",
      prompt: "API ownership",
    });
    expect(parseGrillInvocation("$grill-me API ownership")).toEqual({
      alias: "$grill-me",
      prompt: "API ownership",
    });
    expect(parseGrillInvocation("please grill me about API ownership")).toEqual({
      alias: "grill me",
      prompt: "about API ownership",
    });
    expect(parseGrillInvocation("we should grill me about API ownership")).toBeNull();
    expect(parseGrillInvocation("The grill is ready")).toBeNull();
  });

  it("creates one bounded, editable decision with three suggestions", () => {
    const invocation = parseGrillInvocation("/grill the API boundary");
    expect(invocation).not.toBeNull();
    const [node] = grillDecisionNodesForInvocation(invocation!);

    expect(node).toMatchObject({
      id: "grill:scope",
      status: "unresolved",
      recommendedAnswer: "A concrete product behavior",
    });
    expect(node?.options).toHaveLength(3);
  });

  it("accepts only the recognized imported Grill block shape", () => {
    const invocation = parseGrillInvocation(
      "/grill\n❓ Q1 Who owns the boundary?\n➡️ Recommended: The service\n---\n❓ Q2 What is the proof?\n➡️ Recommended: A focused test",
    );
    expect(invocation).not.toBeNull();
    expect(grillDecisionNodesForInvocation(invocation!)).toHaveLength(2);
  });
});
