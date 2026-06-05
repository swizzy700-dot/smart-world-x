export const FETCH_TIMEOUT_MS = Number(
  process.env.CONTACT_FETCH_TIMEOUT_MS ?? 15_000,
);

export const MAX_CONTACT_PAGES = Number(
  process.env.CONTACT_MAX_PAGES ?? 3,
);

export const MAX_HTML_BYTES = Number(
  process.env.CONTACT_MAX_HTML_BYTES ?? 2_000_000,
);

export const USER_AGENT =
  process.env.CONTACT_USER_AGENT ??
  "SMART-WORLD-X-ContactBot/1.0 (+https://github.com/swizzy700-dot/smart-world-x)";

/** Path segments that suggest a contact page (matched against pathname). */
export const CONTACT_PATH_PATTERNS = [
  /^\/contact(?:-us)?\/?$/i,
  /^\/contact-us\/?$/i,
  /^\/get-in-touch\/?$/i,
  /^\/reach-us\/?$/i,
  /^\/about\/contact\/?$/i,
  /^\/support\/contact\/?$/i,
  /^\/en\/contact\/?$/i,
  /^\/contacts\/?$/i,
];

/** Link text hints for contact pages. */
export const CONTACT_LINK_TEXT = [
  "contact",
  "contact us",
  "get in touch",
  "reach us",
  "email us",
  "talk to us",
];

export const SOURCE_CONFIDENCE: Record<string, number> = {
  MAILTO: 95,
  TEL: 90,
  CONTACT_PAGE: 85,
  FOOTER: 75,
  HEADER: 70,
  BODY: 55,
};
