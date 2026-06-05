/** Matches common phone formats in HTML/text. */
const PHONE_CANDIDATE_REGEX =
  /(?:\+1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}(?:\s*(?:x|ext)\.?\s*\d{1,5})?|\+\d{1,3}[\s.-]\d{2,4}[\s.-]\d{3,4}[\s.-]\d{3,4}/g;

const TEL_HREF_REGEX = /href\s*=\s*["']tel:([^"']+)["']/gi;

export function normalizePhone(raw: string): string | null {
  const cleaned = raw.replace(/[^\d+]/g, "");

  if (cleaned.startsWith("+")) {
    const digits = cleaned.slice(1).replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) return null;
    return `+${digits}`;
  }

  const digits = cleaned.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  return `+${digits}`;
}

export function extractPhonesFromText(text: string): string[] {
  const found = new Set<string>();
  const candidates = text.match(PHONE_CANDIDATE_REGEX) ?? [];

  for (const raw of candidates) {
    const digitCount = raw.replace(/\D/g, "").length;
    if (digitCount < 10) continue;

    const normalized = normalizePhone(raw);
    if (normalized) found.add(normalized);
  }

  return [...found];
}

export function extractTelLinks(html: string): string[] {
  const found = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = TEL_HREF_REGEX.exec(html)) !== null) {
    const normalized = normalizePhone(decodeURIComponent(match[1]));
    if (normalized) found.add(normalized);
  }

  return [...found];
}
