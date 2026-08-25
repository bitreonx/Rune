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
        viewBox="0 0 18 18"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M3 2.5V15.5M3 2.5H9.25L13.5 6.75L9.25 11H3" stroke="currentColor" strokeWidth="2" />
        <path d="M8.5 10.5L14.5 15.5" stroke="currentColor" strokeWidth="2" />
        <path d="M14.5 2.5L16 4L14.5 5.5L13 4L14.5 2.5Z" fill="currentColor" />
      </svg>
      {showWordmark ? (
        <span aria-hidden className={`${wordmarkSize} font-semibold tracking-[0.14em]`} data-rune-wordmark>
          RUNE
        </span>
      ) : null}
    </span>
  );
}
