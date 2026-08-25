import { describe, expect, it } from "vite-plus/test";

import { classifyChatWebPreviewIntent } from "./chatWebPreviewIntent";

const user = (text: string) => ({ role: "user" as const, text });
const assistant = (text: string) => ({ role: "assistant" as const, text });

describe("classifyChatWebPreviewIntent", () => {
  it("recognizes explicit link requests", () => {
    expect(classifyChatWebPreviewIntent([user("give me the web link")])).toBe("requested-link");
    expect(classifyChatWebPreviewIntent([user("open http://localhost:3000 in the browser")])).toBe(
      "requested-link",
    );
  });

  it("recognizes preview and dev-server requests", () => {
    expect(classifyChatWebPreviewIntent([user("show me the web preview")])).toBe(
      "requested-preview",
    );
    expect(classifyChatWebPreviewIntent([user("start the dev server")])).toBe(
      "requested-dev-server",
    );
  });

  it("ignores assistant links and incidental code discussion", () => {
    expect(classifyChatWebPreviewIntent([assistant("Here is http://localhost:3000")])).toBe("none");
    expect(classifyChatWebPreviewIntent([user("the website component needs a link prop")])).toBe(
      "none",
    );
  });

  it("uses the strongest explicit action when several user messages exist", () => {
    expect(
      classifyChatWebPreviewIntent([
        user("build the landing page"),
        assistant("I started working on it."),
        user("now run the dev server and show the preview"),
      ]),
    ).toBe("requested-dev-server");
  });
});
