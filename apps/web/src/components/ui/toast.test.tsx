import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { getToastViewportPresentation, toastRootMotionClassName } from "./toast";

describe("ToastProvider presentation", () => {
  it("renders the shared viewport in a control-safe position", () => {
    const viewport = getToastViewportPresentation("top-center");
    const markup = renderToStaticMarkup(
      <div
        className={viewport.className}
        data-position={viewport.position}
        data-slot="toast-viewport"
      />,
    );

    expect(markup).toContain('data-position="top-center"');
    expect(markup).toContain('data-slot="toast-viewport"');
    expect(markup).toContain("sm:[--toast-inset:--spacing(8)]");
  });

  it("keeps toast transitions disabled for reduced-motion users", () => {
    const markup = renderToStaticMarkup(<div className={toastRootMotionClassName} />);

    expect(markup).toContain("motion-reduce:transition-none");
  });
});
