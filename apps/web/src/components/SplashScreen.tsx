import { APP_DISPLAY_NAME } from "../branding";
import { RuneMark } from "./RuneMark";

export function SplashScreen() {
  return (
    <main
      aria-label={`${APP_DISPLAY_NAME} splash screen`}
      className="rune-splash-shell flex min-h-screen items-center justify-center bg-background px-6"
    >
      <div className="flex w-full max-w-xs flex-col items-center text-center">
        <div className="rune-splash-mark flex size-28 items-center justify-center rounded-[2rem] border border-border/60 bg-card/55 shadow-[0_18px_60px_-28px_color-mix(in_srgb,var(--primary)_70%,transparent)] backdrop-blur-sm">
          <RuneMark size="md" showWordmark={false} />
        </div>
        <div className="mt-6 text-[0.7rem] font-semibold tracking-[0.32em] text-foreground/75">
          RUNE
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary" />
          Preparing your workspace
        </div>
      </div>
    </main>
  );
}
