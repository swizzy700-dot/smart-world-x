export const OUTREACH_PROMPT_VERSION = "1.0";

export const OUTREACH_MAX_SUBJECT_LENGTH = 200;

export const OUTREACH_MAX_BODY_LENGTH = 8000;

export const OUTREACH_PROVIDER = (process.env.OUTREACH_PROVIDER ??
  "template") as "template" | "openai" | "anthropic";

export const OPENAI_MODEL =
  process.env.OUTREACH_OPENAI_MODEL ?? "gpt-4o-mini";

export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export const ANTHROPIC_MODEL =
  process.env.OUTREACH_ANTHROPIC_MODEL ?? "claude-3-5-haiku-20241022";
