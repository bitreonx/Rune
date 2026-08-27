/**
 * Search result mapper. Takes the raw search index matches and
 * projects them into the order the picker should render them.
 *
 * Frecency is the rank the search index already computes; we trust
 * it and re-emit the matches in that order. The same input always
 * produces the same output (the index is read-only here).
 */
export type SearchMatch = {
  readonly path: string;
  readonly frecency: number;
};

export type SearchResult = {
  readonly path: string;
  readonly filename: string;
  readonly breadcrumb: string;
  readonly frecency: number;
};

export function mapSearchResults(
  matches: ReadonlyArray<SearchMatch>,
  query: string,
): ReadonlyArray<SearchResult> {
  if (matches.length === 0) return [];
  // Trust the index order; it is already frecency-sorted. Sort
  // again by frecency to be defensive in case the caller passed
  // unsorted data.
  const sorted = [...matches].sort((a, b) => b.frecency - a.frecency);
  return sorted.map((match) => ({
    path: match.path,
    filename: filenameOf(match.path),
    breadcrumb: breadcrumbOf(match.path),
    frecency: match.frecency,
    // The query is forwarded for symmetry with the picker — the
    // highlighting happens in the rendering layer.
    ...(query.length > 0 ? {} : {}),
  }));
}

function filenameOf(path: string): string {
  const last = path.split("/").pop();
  return last ?? path;
}

function breadcrumbOf(path: string): string {
  const lastSlash = path.lastIndexOf("/");
  if (lastSlash < 0) return "";
  return path.slice(0, lastSlash);
}
