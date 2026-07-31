import type { ZodSchema } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { AiProviderError } from "./errors.js";

export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

/**
 * Converts a Zod schema into an Anthropic tool definition. Forcing the
 * model to call this single tool is how we get reliable structured JSON
 * out of a text-generation API — far more reliable than asking for JSON
 * in prose and hoping it parses.
 */
export function buildStructuredTool(schema: ZodSchema, schemaName: string): AnthropicTool {
  const jsonSchema = zodToJsonSchema(schema, schemaName);
  const definitions = (jsonSchema as { definitions?: Record<string, unknown> }).definitions;
  const resolved = definitions?.[schemaName] ?? jsonSchema;

  return {
    name: "output",
    description: `Provide the result matching the ${schemaName} schema.`,
    input_schema: resolved as Record<string, unknown>,
  };
}

interface AnthropicContentBlock {
  type: string;
  text?: string;
  input?: unknown;
  name?: string;
}

interface AnthropicMessageResponse {
  content: AnthropicContentBlock[];
  usage?: { input_tokens?: number; output_tokens?: number };
  stop_reason?: string;
}

export function extractTextContent(response: AnthropicMessageResponse): string {
  return response.content
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("\n");
}

/** Extracts the raw (unvalidated) input from the forced tool_use block. */
export function extractToolInput(response: AnthropicMessageResponse): unknown {
  const toolUseBlock = response.content.find((block) => block.type === "tool_use");
  if (!toolUseBlock) {
    throw new AiProviderError("Expected a tool_use block in the response but found none");
  }
  return toolUseBlock.input;
}

export function extractUsage(response: AnthropicMessageResponse): {
  inputTokens: number;
  outputTokens: number;
} {
  return {
    inputTokens: response.usage?.input_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
  };
}

export type { AnthropicMessageResponse };
