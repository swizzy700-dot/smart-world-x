import { MAX_URL_LENGTH } from "./constants";

export interface NormalizedUrl {
  normalizedUrl: string;
  domain: string;
  rawWithScheme: string;
}

/**
 * Normalizes a URL for deduplication and storage.
 * - Adds https:// when scheme is missing
 * - Lowercases hostname
 * - Strips hash, trailing slash on path, default ports
 */
export function normalizeUrl(raw: string): NormalizedUrl | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_URL_LENGTH) {
    return null;
  }

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }

  if (!parsed.hostname || parsed.hostname.includes(" ")) {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase();
  const port =
    (parsed.protocol === "https:" && parsed.port === "443") ||
    (parsed.protocol === "http:" && parsed.port === "80")
      ? ""
      : parsed.port;

  let pathname = parsed.pathname || "/";
  if (pathname.length > 1 && pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1);
  }

  const portSegment = port ? `:${port}` : "";
  const search = parsed.search ?? "";
  const normalizedUrl = `${parsed.protocol}//${hostname}${portSegment}${pathname}${search}`;
  const domain = hostname;

  return {
    normalizedUrl,
    domain,
    rawWithScheme: withScheme,
  };
}
