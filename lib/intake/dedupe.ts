import type { ValidatedUrl } from "./types";

export interface BatchDedupeResult {
  unique: ValidatedUrl[];
  duplicates: ValidatedUrl[];
}

/**
 * Removes duplicates within a single batch (first occurrence wins).
 */
export function dedupeWithinBatch(validated: ValidatedUrl[]): BatchDedupeResult {
  const seen = new Set<string>();
  const unique: ValidatedUrl[] = [];
  const duplicates: ValidatedUrl[] = [];

  for (const item of validated) {
    if (seen.has(item.normalizedUrl)) {
      duplicates.push(item);
      continue;
    }
    seen.add(item.normalizedUrl);
    unique.push(item);
  }

  return { unique, duplicates };
}

/**
 * Finds URLs that already exist in the database.
 */
export async function findExistingNormalizedUrls(
  normalizedUrls: string[],
  lookup: (urls: string[]) => Promise<Set<string>>,
): Promise<Set<string>> {
  const existing = new Set<string>();
  const chunkSize = 1000;

  for (let i = 0; i < normalizedUrls.length; i += chunkSize) {
    const chunk = normalizedUrls.slice(i, i + chunkSize);
    const found = await lookup(chunk);
    for (const url of found) {
      existing.add(url);
    }
  }

  return existing;
}
