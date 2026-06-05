export const LIGHTHOUSE_CATEGORIES = [
  "performance",
  "accessibility",
  "best-practices",
  "seo",
] as const;

export type LighthouseCategory = (typeof LIGHTHOUSE_CATEGORIES)[number];

export const ANALYSIS_TIMEOUT_MS = Number(
  process.env.ANALYSIS_TIMEOUT_MS ?? 120_000,
);

export const LIGHTHOUSE_FORM_FACTOR = (process.env.LIGHTHOUSE_FORM_FACTOR ??
  "mobile") as "mobile" | "desktop";

export const CHROME_FLAGS = (
  process.env.CHROME_FLAGS ??
  "--headless --no-sandbox --disable-gpu --disable-dev-shm-usage"
).split(/\s+/);

export const MAX_FINDINGS_PER_CATEGORY = Number(
  process.env.MAX_FINDINGS_PER_CATEGORY ?? 5,
);

export const CATEGORY_LABELS: Record<LighthouseCategory, string> = {
  performance: "Performance",
  accessibility: "Accessibility",
  "best-practices": "Best Practices",
  seo: "SEO",
};
