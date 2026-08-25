import { EnvironmentId, ProviderInstanceId } from "@t3tools/contracts";
import { beforeAll, describe, expect, it, vi } from "vite-plus/test";
import { renderToStaticMarkup } from "react-dom/server";

import type { ProviderInstanceEntry } from "../../providerInstances";

vi.mock("@pierre/diffs/react", () => {
  return { FileDiff: () => <div data-testid="file-diff" /> };
});

let ProviderModelPicker: typeof import("./ProviderModelPicker").ProviderModelPicker;

beforeAll(async () => {
  vi.stubGlobal("matchMedia", {
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  ({ ProviderModelPicker } = await import("./ProviderModelPicker"));
}, 30_000);

const INSTANCE_ID = ProviderInstanceId.make("codex");

// The trigger only reads identity fields off the entry (icon, display name,
// badge); the full server snapshot is irrelevant to these assertions.
function fakeInstanceEntry(): ProviderInstanceEntry {
  return {
    instanceId: INSTANCE_ID,
    driverKind: "codex",
    displayName: "Codex",
  } as unknown as ProviderInstanceEntry;
}

function buildProps(open?: boolean) {
  return {
    activeInstanceId: INSTANCE_ID,
    model: "gpt-5.4",
    lockedProvider: null,
    instanceEntries: [fakeInstanceEntry()],
    modelOptionsByInstance: new Map([
      [
        INSTANCE_ID,
        [{ slug: "gpt-5.4", name: "GPT-5.4", description: null, recommended: false }],
      ],
    ]),
    ...(open === undefined ? {} : { open }),
    onInstanceModelChange: () => {},
  };
}

describe("ProviderModelPicker trigger", () => {
  it("flips its chevron up while the picker is open", () => {
    const markup = renderToStaticMarkup(<ProviderModelPicker {...buildProps(true)} />);
    expect(markup).toContain("data-chat-provider-model-picker");
    expect(markup).toContain("rotate-180");
  });

  it("keeps the chevron pointing down while closed", () => {
    const markup = renderToStaticMarkup(<ProviderModelPicker {...buildProps(false)} />);
    expect(markup).toContain("data-chat-provider-model-picker");
    expect(markup).not.toContain("rotate-180");
  });
});
