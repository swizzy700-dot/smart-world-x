import * as cheerio from "cheerio";
import type { ContactSource } from "@prisma/client";
import type { RawContactHit } from "../types";
import { extractEmailsFromText, extractMailtoEmails } from "./email-parser";
import { extractPhonesFromText, extractTelLinks } from "./phone-parser";

function addHits(
  hits: RawContactHit[],
  seen: Set<string>,
  items: {
    type: "EMAIL" | "PHONE";
    values: string[];
    source: ContactSource;
    sourceUrl: string;
    contactPageUrl?: string;
  },
) {
  for (const value of items.values) {
    const key = `${items.type}:${value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    hits.push({
      type: items.type,
      value,
      source: items.source,
      sourceUrl: items.sourceUrl,
      contactPageUrl: items.contactPageUrl,
    });
  }
}

function regionHtml($: cheerio.CheerioAPI, selectors: string[]): string {
  const parts: string[] = [];
  for (const sel of selectors) {
    $(sel).each((_, el) => {
      parts.push($.html(el) ?? "");
    });
  }
  return parts.join("\n");
}

export function extractFromHtml(
  html: string,
  pageUrl: string,
  options?: { contactPageUrl?: string; isContactPage?: boolean },
): RawContactHit[] {
  const $ = cheerio.load(html);
  const hits: RawContactHit[] = [];
  const seen = new Set<string>();
  const contactPageUrl = options?.contactPageUrl;
  const pageSource: ContactSource = options?.isContactPage
    ? "CONTACT_PAGE"
    : "BODY";

  const headerHtml = regionHtml($, [
    "header",
    '[role="banner"]',
    "#header",
    ".header",
    ".site-header",
    "nav",
  ]);

  const footerHtml = regionHtml($, [
    "footer",
    '[role="contentinfo"]',
    "#footer",
    ".footer",
    ".site-footer",
  ]);

  const bodyHtml = $.html("body") ?? html;

  addHits(hits, seen, {
    type: "EMAIL",
    values: extractMailtoEmails(html),
    source: "MAILTO",
    sourceUrl: pageUrl,
    contactPageUrl,
  });

  addHits(hits, seen, {
    type: "PHONE",
    values: extractTelLinks(html),
    source: "TEL",
    sourceUrl: pageUrl,
    contactPageUrl,
  });

  addHits(hits, seen, {
    type: "EMAIL",
    values: extractEmailsFromText(headerHtml),
    source: "HEADER",
    sourceUrl: pageUrl,
    contactPageUrl,
  });

  addHits(hits, seen, {
    type: "PHONE",
    values: extractPhonesFromText(headerHtml),
    source: "HEADER",
    sourceUrl: pageUrl,
    contactPageUrl,
  });

  addHits(hits, seen, {
    type: "EMAIL",
    values: extractEmailsFromText(footerHtml),
    source: "FOOTER",
    sourceUrl: pageUrl,
    contactPageUrl,
  });

  addHits(hits, seen, {
    type: "PHONE",
    values: extractPhonesFromText(footerHtml),
    source: "FOOTER",
    sourceUrl: pageUrl,
    contactPageUrl,
  });

  if (options?.isContactPage) {
    addHits(hits, seen, {
      type: "EMAIL",
      values: extractEmailsFromText(bodyHtml),
      source: "CONTACT_PAGE",
      sourceUrl: pageUrl,
      contactPageUrl: pageUrl,
    });

    addHits(hits, seen, {
      type: "PHONE",
      values: extractPhonesFromText(bodyHtml),
      source: "CONTACT_PAGE",
      sourceUrl: pageUrl,
      contactPageUrl: pageUrl,
    });
  } else {
    addHits(hits, seen, {
      type: "EMAIL",
      values: extractEmailsFromText(bodyHtml),
      source: pageSource,
      sourceUrl: pageUrl,
      contactPageUrl,
    });

    addHits(hits, seen, {
      type: "PHONE",
      values: extractPhonesFromText(bodyHtml),
      source: pageSource,
      sourceUrl: pageUrl,
      contactPageUrl,
    });
  }

  return hits;
}
