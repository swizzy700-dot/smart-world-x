import * as cheerio from "cheerio";
import {
  CONTACT_LINK_TEXT,
  CONTACT_PATH_PATTERNS,
  MAX_CONTACT_PAGES,
} from "./constants";

export function discoverContactPageUrls(
  html: string,
  baseUrl: string,
): string[] {
  const base = new URL(baseUrl);
  const $ = cheerio.load(html);
  const candidates = new Map<string, number>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href")?.trim();
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) {
      return;
    }

    let resolved: URL;
    try {
      resolved = new URL(href, base);
    } catch {
      return;
    }

    if (resolved.hostname !== base.hostname) return;
    if (!["http:", "https:"].includes(resolved.protocol)) return;

    const pathname = resolved.pathname;
    let score = 0;

    if (CONTACT_PATH_PATTERNS.some((p) => p.test(pathname))) {
      score += 10;
    }

    const text = $(el).text().trim().toLowerCase();
    const aria = ($(el).attr("aria-label") ?? "").toLowerCase();
    const combined = `${text} ${aria}`;

    if (CONTACT_LINK_TEXT.some((hint) => combined.includes(hint))) {
      score += 5;
    }

    if (href.toLowerCase().includes("contact")) {
      score += 3;
    }

    if (score > 0) {
      resolved.hash = "";
      const key = resolved.toString();
      candidates.set(key, Math.max(candidates.get(key) ?? 0, score));
    }
  });

  return [...candidates.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_CONTACT_PAGES)
    .map(([url]) => url);
}
