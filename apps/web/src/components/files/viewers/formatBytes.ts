/**
 * Format a byte count as a human-readable string. The threshold of
 * 1.0 is fixed (no KB-vs-KiB confusion in the UI) and the unit
 * ladder is 1024-based. We render "B" for sub-1024 counts so a
 * 24-byte file doesn't show up as "0.0 KB".
 */
const UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  let value = bytes / 1024;
  let unitIndex = 1;
  while (value >= 1024 && unitIndex < UNITS.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${UNITS[unitIndex]}`;
}
