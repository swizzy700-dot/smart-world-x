import { OUTREACH_PROVIDER } from "../constants";
import { OpenAIOutreachProvider } from "./openai-provider";
import { TemplateOutreachProvider } from "./template-provider";
import type { OutreachProvider } from "./types";

let cached: OutreachProvider | null = null;

export function getOutreachProvider(): OutreachProvider {
  if (cached) return cached;

  switch (OUTREACH_PROVIDER) {
    case "openai":
      if (process.env.OPENAI_API_KEY) {
        cached = new OpenAIOutreachProvider();
        return cached;
      }
      console.warn(
        "[outreach] OPENAI provider requested but OPENAI_API_KEY missing — falling back to template",
      );
      break;
    case "anthropic":
      console.warn(
        "[outreach] Anthropic provider not yet implemented — falling back to template",
      );
      break;
    default:
      break;
  }

  cached = new TemplateOutreachProvider();
  return cached;
}

export function listAvailableProviders(): {
  id: string;
  displayName: string;
  active: boolean;
}[] {
  const active = getOutreachProvider();
  return [
    {
      id: "template",
      displayName: "Template Engine",
      active: active.id === "template",
    },
    {
      id: "openai",
      displayName: "OpenAI",
      active: active.id === "openai",
    },
    {
      id: "anthropic",
      displayName: "Anthropic (coming soon)",
      active: false,
    },
  ];
}
