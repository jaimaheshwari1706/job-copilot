import type {
  LLMProvider,
  GenerateTextInput,
  GenerateTextOutput,
  GenerateStructuredInput,
  GenerateStructuredOutput,
} from "./llm-provider.interface.js";
import { AiProviderError, AiValidationError } from "./errors.js";
import {
  buildStructuredTool,
  extractTextContent,
  extractToolInput,
  extractUsage,
  type AnthropicMessageResponse,
} from "./anthropic-helpers.js";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MAX_TOKENS = 1024;

export interface AnthropicProviderConfig {
  apiKey: string;
  model: string;
  /** Injectable for tests — defaults to the global fetch. */
  fetchImpl?: typeof fetch;
}

export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic";
  readonly model: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: AnthropicProviderConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  private async callApi(body: Record<string, unknown>): Promise<AnthropicMessageResponse> {
    let response: Response;
    try {
      response = await this.fetchImpl(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
        },
        body: JSON.stringify({ model: this.model, max_tokens: DEFAULT_MAX_TOKENS, ...body }),
      });
    } catch (err) {
      throw new AiProviderError("Network error calling Anthropic API", err);
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new AiProviderError(`Anthropic API returned ${response.status}: ${errorBody}`);
    }

    return (await response.json()) as AnthropicMessageResponse;
  }

  async generateText({ system, prompt, maxTokens }: GenerateTextInput): Promise<GenerateTextOutput> {
    const response = await this.callApi({
      max_tokens: maxTokens ?? DEFAULT_MAX_TOKENS,
      system,
      messages: [{ role: "user", content: prompt }],
    });

    const { inputTokens, outputTokens } = extractUsage(response);
    return { text: extractTextContent(response), inputTokens, outputTokens };
  }

  async generateStructured<T>({
    system,
    prompt,
    schema,
    schemaName,
    maxTokens,
  }: GenerateStructuredInput<T>): Promise<GenerateStructuredOutput<T>> {
    const tool = buildStructuredTool(schema, schemaName);
    const messages: Array<{ role: "user" | "assistant"; content: unknown }> = [
      { role: "user", content: prompt },
    ];

    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await this.callApi({
        max_tokens: maxTokens ?? DEFAULT_MAX_TOKENS,
        system,
        messages,
        tools: [tool],
        tool_choice: { type: "tool", name: "output" },
      });

      const usage = extractUsage(response);
      totalInputTokens += usage.inputTokens;
      totalOutputTokens += usage.outputTokens;

      const rawOutput = extractToolInput(response);
      const parsed = schema.safeParse(rawOutput);

      if (parsed.success) {
        return {
          data: parsed.data,
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          repaired: attempt > 0,
        };
      }

      if (attempt === 0) {
        // One repair attempt: tell the model exactly what was wrong and
        // ask it to call the tool again, rather than silently failing or
        // guessing at a fix ourselves.
        messages.push({ role: "assistant", content: response.content });
        messages.push({
          role: "user",
          content: `Your previous tool call did not match the required schema. Validation errors: ${JSON.stringify(
            parsed.error.flatten(),
          )}. Please call the "output" tool again with corrected data.`,
        });
        continue;
      }

      throw new AiValidationError(
        `AI output failed schema validation twice for "${schemaName}": ${parsed.error.message}`,
        schemaName,
        rawOutput,
      );
    }

    // Unreachable, but keeps TypeScript happy about the loop's return type.
    throw new AiProviderError("generateStructured exhausted retries unexpectedly");
  }
}
