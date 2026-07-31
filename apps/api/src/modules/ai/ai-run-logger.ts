import { AiRun } from "@job-copilot/db";
import { env } from "../../config/env.js";

interface LogAiRunOptions {
  userId: string;
  feature: string;
  promptVersion?: number;
}

interface AiCallOutcome {
  inputTokens?: number;
  outputTokens?: number;
  repaired?: boolean;
}

export async function withAiRunLogging<T extends AiCallOutcome>(
  options: LogAiRunOptions,
  fn: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now();
  try {
    const result = await fn();
    await AiRun.create({
      userId: options.userId,
      feature: options.feature,
      provider: "anthropic",
      model: env.AI_MODEL,
      promptVersion: options.promptVersion ?? 1,
      status: "success",
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      repaired: result.repaired ?? false,
      latencyMs: Date.now() - startedAt,
    });
    return result;
  } catch (err) {
    await AiRun.create({
      userId: options.userId,
      feature: options.feature,
      provider: "anthropic",
      model: env.AI_MODEL,
      promptVersion: options.promptVersion ?? 1,
      status: "failed",
      latencyMs: Date.now() - startedAt,
      error: err instanceof Error ? err.message : "Unknown error",
    });
    throw err;
  }
}
