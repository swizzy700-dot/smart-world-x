import { URL_LINE_SPLIT_REGEX } from "./constants";
import type { ParsedIntakeLine } from "./types";

/**
 * Splits bulk paste / CSV-style input into individual URL lines.
 * Preserves line numbers for operator feedback.
 */
export function parseUrlLines(input: string): ParsedIntakeLine[] {
  const lines = input.split(URL_LINE_SPLIT_REGEX);
  const result: ParsedIntakeLine[] = [];
  let lineNumber = 0;

  for (const segment of lines) {
    const raw = segment.trim();
    if (!raw) continue;
    lineNumber += 1;
    result.push({ lineNumber, raw });
  }

  return result;
}
