/**
 * Shown under the file tree when the workspace listing hit the server's
 * 25,000-entry cap: without it, a huge workspace just looks like a short one.
 */
export function FileTreeTruncationFooter() {
  return (
    <div className="shrink-0 border-t border-border/60 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
      Large workspace — showing the first 25,000 entries. Use the search field to narrow what's
      listed.
    </div>
  );
}
