import type { OutreachContext, OutreachGenerationResult } from "../types";

/**
 * Pluggable outreach generation provider.
 * Implement for OpenAI, Anthropic, or custom LLM backends.
 */
export interface OutreachProvider {
  readonly id: string;
  readonly displayName: string;
  generate(context: OutreachContext): Promise<OutreachGenerationResult>;
}

export class OutreachProviderError extends Error {
  constructor(
    message: string,
    public readonly providerId: string,
  ) {
    super(message);
    this.name = "OutreachProviderError";
  }
}
