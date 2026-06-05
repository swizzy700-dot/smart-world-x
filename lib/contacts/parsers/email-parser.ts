const EMAIL_REGEX =
  /\b[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]{0,62}[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+\b/g;

const BLOCKED_LOCAL_PARTS = new Set([
  "example",
  "test",
  "noreply",
  "no-reply",
  "donotreply",
  "mailer-daemon",
  "postmaster",
  "webmaster",
  "root",
  "admin@localhost",
]);

const BLOCKED_DOMAINS = new Set([
  "example.com",
  "example.org",
  "test.com",
  "sentry.io",
  "wixpress.com",
  "domain.com",
  "email.com",
  "yourdomain.com",
]);

const FALSE_POSITIVE_PATTERNS = [
  /@2x\./i,
  /\.png$/i,
  /\.jpg$/i,
  /\.svg$/i,
  /^images?@/i,
  /^asset@/i,
];

export function normalizeEmail(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  const match = trimmed.match(
    /^([^@\s]+)@([a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+)$/i,
  );
  if (!match) return null;

  const local = match[1].toLowerCase();
  const domain = match[2].toLowerCase();

  if (local.length > 64 || domain.length > 255) return null;
  if (BLOCKED_LOCAL_PARTS.has(local)) return null;
  if (BLOCKED_DOMAINS.has(domain)) return null;
  if (FALSE_POSITIVE_PATTERNS.some((p) => p.test(trimmed))) return null;
  if (local.includes("..")) return null;

  return `${local}@${domain}`;
}

export function extractEmailsFromText(text: string): string[] {
  const found = new Set<string>();
  const matches = text.match(EMAIL_REGEX) ?? [];

  for (const raw of matches) {
    const normalized = normalizeEmail(raw);
    if (normalized) found.add(normalized);
  }

  return [...found];
}

export function extractMailtoEmails(html: string): string[] {
  const found = new Set<string>();
  const mailtoRegex = /href\s*=\s*["']mailto:([^"'?>\s]+)/gi;
  let match: RegExpExecArray | null;

  while ((match = mailtoRegex.exec(html)) !== null) {
    const decoded = decodeURIComponent(match[1].replace(/\s/g, ""));
    const normalized = normalizeEmail(decoded.split("?")[0]);
    if (normalized) found.add(normalized);
  }

  return [...found];
}
