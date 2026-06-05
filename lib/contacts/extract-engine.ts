import { SOURCE_CONFIDENCE } from "./constants";
import { discoverContactPageUrls } from "./discover-contact-pages";
import { fetchPage, PageFetchError } from "./fetch-page";
import { extractFromHtml } from "./parsers/html-extractor";
import type { RawContactHit } from "./types";

export interface EngineExtractionResult {
  hits: RawContactHit[];
  contactPageUrl: string | null;
  pagesScanned: number;
  scannedUrls: string[];
}

/**
 * Crawls homepage + discovered contact pages and extracts public contacts.
 */
export async function extractContactsFromWebsite(
  startUrl: string,
): Promise<EngineExtractionResult> {
  const allHits: RawContactHit[] = [];
  const seen = new Set<string>();
  const scannedUrls: string[] = [];
  let contactPageUrl: string | null = null;

  const homepage = await fetchPage(startUrl);
  scannedUrls.push(homepage.finalUrl);

  const contactPageCandidates = discoverContactPageUrls(
    homepage.html,
    homepage.finalUrl,
  );

  if (contactPageCandidates.length > 0) {
    contactPageUrl = contactPageCandidates[0];
  }

  mergeHits(allHits, seen, extractFromHtml(homepage.html, homepage.finalUrl));

  for (const contactUrl of contactPageCandidates) {
    if (contactUrl === homepage.finalUrl) continue;

    try {
      const page = await fetchPage(contactUrl);
      scannedUrls.push(page.finalUrl);
      mergeHits(
        allHits,
        seen,
        extractFromHtml(page.html, page.finalUrl, {
          contactPageUrl: page.finalUrl,
          isContactPage: true,
        }),
      );
    } catch (error) {
      if (!(error instanceof PageFetchError)) throw error;
    }
  }

  const ranked = rankHits(allHits);

  return {
    hits: ranked,
    contactPageUrl,
    pagesScanned: scannedUrls.length,
    scannedUrls,
  };
}

function mergeHits(
  target: RawContactHit[],
  seen: Set<string>,
  incoming: RawContactHit[],
) {
  for (const hit of incoming) {
    const key = `${hit.type}:${hit.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    target.push(hit);
  }
}

function rankHits(hits: RawContactHit[]): RawContactHit[] {
  return [...hits].sort((a, b) => {
    const confA = SOURCE_CONFIDENCE[a.source] ?? 50;
    const confB = SOURCE_CONFIDENCE[b.source] ?? 50;
    return confB - confA;
  });
}

export function applyConfidence(hit: RawContactHit): number {
  return SOURCE_CONFIDENCE[hit.source] ?? 50;
}
