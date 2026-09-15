import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { getToastViewportPresentation, toastRootMotionClassName } from "./toast";

describe("ToastProvider presentation", () => {
  it("uses a centered control-safe default presentation", () => {
    const viewport = getToastViewportPresentation("top-center");
    const markup = renderToStaticMarkup(
      <div className={viewport.className} data-position={viewport.position} />,
    );

    expect(markup).toContain('data-position="top-center"');
    expect(markup).toContain("sm:[--toast-inset:--spacing(8)]");
  });

  it("disables toast transitions for reduced-motion users", () => {
    const markup = renderToStaticMarkup(<div className={toastRootMotionClassName} />);
    expect(markup).toContain("motion-reduce:transition-none");
  });
});
