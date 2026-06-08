import type { Prisma } from "@prisma/client";
import {
  ANALYSIS_TIMEOUT_MS,
  CHROME_FLAGS,
  LIGHTHOUSE_CATEGORIES,
  LIGHTHOUSE_FORM_FACTOR,
} from "./constants";
import {
  extractScores,
  generateExecutiveSummary,
  generateFindings,
  type LighthouseReport,
} from "./findings-generator";
import type { LighthouseRunResult } from "./types";

interface LighthouseResult {
  lhr: {
    categories?: Record<string, { score?: number | null; title?: string; auditRefs?: unknown[] }>;
    audits?: Record<string, unknown>;
    finalUrl?: string;
    fetchTime?: number;
    lighthouseVersion?: string;
    configSettings?: { formFactor?: string };
  };
}

function trimRawReport(lhr: LighthouseResult["lhr"]): Prisma.JsonValue {
  const categories: Record<string, unknown> = {};
  for (const id of LIGHTHOUSE_CATEGORIES) {
    const cat = (lhr as { categories?: Record<string, unknown> }).categories?.[
      id
    ] as { score?: number; auditRefs?: unknown[] } | undefined;
    if (cat) {
      categories[id] = {
        id,
        score: cat.score,
        title: (cat as { title?: string }).title,
        auditRefs: cat.auditRefs?.slice(0, 30),
      };
    }
  }

  const audits: Record<string, unknown> = {};
  const sourceAudits = (lhr as { audits?: Record<string, unknown> }).audits ?? {};
  for (const [key, audit] of Object.entries(sourceAudits)) {
    const a = audit as {
      score?: number | null;
      scoreDisplayMode?: string;
      title?: string;
      description?: string;
      displayValue?: string;
    };
    if (a.scoreDisplayMode === "notApplicable") continue;
    if (a.score === null || a.score === undefined || a.score < 0.9) {
      audits[key] = {
        id: key,
        score: a.score,
        scoreDisplayMode: a.scoreDisplayMode,
        title: a.title,
        description: a.description,
        displayValue: a.displayValue,
      };
    }
    if (Object.keys(audits).length >= 80) break;
  }

  return {
    lighthouseVersion: lhr.lighthouseVersion,
    finalUrl: lhr.finalUrl,
    fetchTime: lhr.fetchTime,
    formFactor: lhr.configSettings?.formFactor,
    categories,
    audits,
  } as Prisma.JsonValue;
}

function extractPageTitle(lhr: LighthouseResult["lhr"]): string | null {
  const artifacts = (lhr as { artifacts?: { Title?: string } }).artifacts;
  if (artifacts?.Title) return artifacts.Title;
  return null;
}

/**
 * Runs Lighthouse against a URL using headless Chrome.
 * Loaded dynamically so Next.js does not bundle chrome-launcher.
 */
export async function runLighthouse(url: string): Promise<LighthouseRunResult> {
  const started = Date.now();

  const chromeLauncher = await import("chrome-launcher");
  const lighthouseModule = await import("lighthouse");
  const lighthouse =
    lighthouseModule.default ?? lighthouseModule;

  let chrome;
  try {
    chrome = await chromeLauncher.launch({
      chromeFlags: CHROME_FLAGS,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to launch Chrome";
    throw new Error(`Chrome launch failed: ${message}`);
  }

  try {
    const options = {
      logLevel: "error" as const,
      output: "json" as const,
      onlyCategories: [...LIGHTHOUSE_CATEGORIES],
      port: chrome.port,
      formFactor: LIGHTHOUSE_FORM_FACTOR,
      screenEmulation:
        LIGHTHOUSE_FORM_FACTOR === "mobile"
          ? { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75 }
          : { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1 },
    };

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`Lighthouse timed out after ${ANALYSIS_TIMEOUT_MS}ms`)),
        ANALYSIS_TIMEOUT_MS,
      );
    });

    const runnerResult = (await Promise.race([
      lighthouse(url, options, undefined),
      timeoutPromise,
    ])) as unknown as LighthouseResult;

    const lhr = runnerResult.lhr;
    if (!lhr) {
      throw new Error("Lighthouse returned invalid result: missing lhr data");
    }

    const report = lhr as unknown as LighthouseReport;
    const scores = extractScores(report);
    const findings = generateFindings(report, scores);
    const durationMs = Date.now() - started;

    return {
      scores,
      finalUrl: lhr.finalUrl ?? url,
      pageTitle: extractPageTitle(lhr),
      lighthouseVersion: lhr.lighthouseVersion ?? "unknown",
      formFactor: lhr.configSettings?.formFactor ?? LIGHTHOUSE_FORM_FACTOR,
      fetchTimeMs: Math.round(
        typeof lhr.fetchTime === "number"
          ? lhr.fetchTime
          : Number(lhr.fetchTime) || 0,
      ),
      durationMs,
      rawReport: trimRawReport(lhr),
      findings,
      executiveSummary: "", // filled by service with domain
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lighthouse execution failed";
    throw new Error(`Lighthouse analysis failed: ${message}`);
  } finally {
    if (chrome) {
      try {
        await chrome.kill();
      } catch (killError) {
        console.warn("[lighthouse] Failed to kill Chrome:", killError);
      }
    }
  }
}

export function attachExecutiveSummary(
  result: LighthouseRunResult,
  domain: string,
): LighthouseRunResult {
  return {
    ...result,
    executiveSummary: generateExecutiveSummary(
      domain,
      result.scores,
      result.findings,
    ),
  };
}
