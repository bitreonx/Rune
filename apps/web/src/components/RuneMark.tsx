// The kit mark as one even-odd path: the hexagonal outline with the R cut
// out, so it inherits `currentColor` for chrome on any background.
const MARK_PATH =
  "M628 156L997 370L997 858L927 905L858 952L627 1108L541 1050L438 983L258 858L259 373Z" +
  "M629 156L259 373L749 373L913 537L749 709L927 905L997 858L997 370Z" +
  "M259 373L439 491L438 983L258 858Z" +
  "M758 511L541 511L541 1050L627 1108L858 952L544 736Z";

export function RuneMark({
  size = "md",
  showWordmark = true,
}: {
  size?: "sm" | "md";
  showWordmark?: boolean;
}) {
  const symbolSize = size === "sm" ? "size-4" : "size-5";
  const wordmarkSize = size === "sm" ? "text-[0.625rem]" : "text-xs";

  return (
    <span
      aria-label="RUNE"
      className="rune-mark inline-flex shrink-0 items-center gap-1.5"
      data-rune-mark
      role="img"
    >
      <svg
        aria-hidden
        className={symbolSize}
        data-rune-symbol
        fill="none"
        viewBox="0 0 1254 1254"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d={MARK_PATH} fill="currentColor" fillRule="evenodd" />
      </svg>
      {showWordmark ? (
        <span aria-hidden className={`${wordmarkSize} font-semibold tracking-[0.14em]`} data-rune-wordmark>
          RUNE
        </span>
      ) : null}
    </span>
  );
}
