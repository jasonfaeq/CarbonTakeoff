import Anthropic from "@anthropic-ai/sdk";
import { createAnthropicProvider, DEFAULT_MODEL } from "./anthropic";
import type { LlmProvider } from "./types";

export * from "./types";

export function liveExtractionAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Null when no key is set, so callers can say so and point at the demo documents. */
export function getProvider(): LlmProvider | null {
  if (!liveExtractionAvailable()) return null;
  return createAnthropicProvider(new Anthropic(), process.env.LLM_MODEL || DEFAULT_MODEL);
}
