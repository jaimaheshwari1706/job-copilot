import { AnthropicProvider, type LLMProvider } from "@job-copilot/ai";
import { env } from "../../config/env.js";

let cachedProvider: LLMProvider | null | undefined;

export function getLLMProvider(): LLMProvider | null {
  if (cachedProvider !== undefined) return cachedProvider;

  if (!env.ANTHROPIC_API_KEY) {
    cachedProvider = null;
    return null;
  }

  cachedProvider = new AnthropicProvider({ apiKey: env.ANTHROPIC_API_KEY, model: env.AI_MODEL });
  return cachedProvider;
}

export function isAiConfigured(): boolean {
  return getLLMProvider() !== null;
}
