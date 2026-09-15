import { requireOptionalNativeModule } from "expo";

interface RUNEMarkdownTextSelectionNativeModule {
  readonly installCopySanitizer: (reactTag: number) => void;
}

const nativeModule =
  requireOptionalNativeModule<RUNEMarkdownTextSelectionNativeModule>("RUNEMarkdownTextSelection");

export function installMarkdownCopySanitizer(reactTag: number): void {
  nativeModule?.installCopySanitizer(reactTag);
}
