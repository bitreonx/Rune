import type { SelectableMarkdownTextProps } from "@rune/mobile-markdown-text/renderer";

type MobileSelectableMarkdownTextProps = Omit<SelectableMarkdownTextProps, "highlightCode">;

export type {
  MarkdownImageRenderer,
  MarkdownImageRequest,
  NativeMarkdownTextStyle,
  SelectableMarkdownSkill,
} from "@rune/mobile-markdown-text/types";

export function hasNativeSelectableMarkdownText(): boolean {
  return false;
}

export function SelectableMarkdownText(_props: MobileSelectableMarkdownTextProps) {
  return null;
}
