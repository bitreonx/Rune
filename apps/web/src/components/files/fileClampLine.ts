/**
 * Clamp a requested 1-based line number to a file's actual line count.
 * Counts `\n` and `\r\n` line terminators so a 3-line file reports 3
 * regardless of platform. Used by file-link reveal requests so the
 * shell never scrolls past the end of a freshly edited file.
 */
export function clampFileLine(contents: string, requestedLine: number): number {
  let lineCount = 1;
  for (let index = 0; index < contents.length; index += 1) {
    const character = contents.charCodeAt(index);
    if (character === 10) {
      lineCount += 1;
    } else if (character === 13) {
      lineCount += 1;
      if (contents.charCodeAt(index + 1) === 10) index += 1;
    }
  }
  return Math.min(Math.max(1, requestedLine), lineCount);
}
