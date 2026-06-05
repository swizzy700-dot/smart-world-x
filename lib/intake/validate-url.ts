import { MAX_URL_LENGTH, PRIVATE_HOST_PATTERNS } from "./constants";
import { normalizeUrl } from "./normalize-url";
import type { InvalidUrl, ParsedIntakeLine, ValidatedUrl } from "./types";

export function validateUrlLine(line: ParsedIntakeLine): ValidatedUrl | InvalidUrl {
  const { lineNumber, raw } = line;

  if (!raw) {
    return { lineNumber, raw, reason: "Empty line" };
  }

  if (raw.length > MAX_URL_LENGTH) {
    return {
      lineNumber,
      raw,
      reason: `URL exceeds ${MAX_URL_LENGTH} characters`,
    };
  }

  const normalized = normalizeUrl(raw);
  if (!normalized) {
    return { lineNumber, raw, reason: "Invalid URL format" };
  }

  if (isPrivateOrLocalHost(normalized.domain)) {
    return {
      lineNumber,
      raw,
      reason: "Private or local addresses are not allowed",
    };
  }

  if (!hasValidDomainShape(normalized.domain)) {
    return { lineNumber, raw, reason: "Invalid domain" };
  }

  return {
    lineNumber,
    raw,
    normalizedUrl: normalized.normalizedUrl,
    domain: normalized.domain,
  };
}

function isPrivateOrLocalHost(hostname: string): boolean {
  return PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
}

function hasValidDomainShape(hostname: string): boolean {
  if (hostname.length < 3 || hostname.length > 253) return false;
  if (hostname.startsWith(".") || hostname.endsWith(".")) return false;
  if (hostname.includes("..")) return false;
  // Require at least one dot for TLD (excludes bare "localhost" caught above)
  if (!hostname.includes(".")) return false;
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(
    hostname,
  );
}
