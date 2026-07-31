import type {
  LLMProvider,
  GenerateTextInput,
  GenerateTextOutput,
  GenerateStructuredInput,
  GenerateStructuredOutput,
} from "./llm-provider.interface.js";
import { AiValidationError } from "./errors.js";

/**
 * A scriptable fake for tests. Queue up responses with `queueText`/
 * `queueStructured`, or leave nothing queued to get a schema-valid
 * default derived from the Zod schema's `.parse({})`-friendly shape
 * (callers should generally queue explicit responses instead of relying
 * on this fallback).
 */
export class FakeLLMProvider implements LLMProvider {
  readonly name = "fake";
  readonly model = "fake-model";

  private textQueue: GenerateTextOutput[] = [];
  private structuredQueue: unknown[] = [];
  public calls: Array<{ type: "text" | "structured"; input: unknown }> = [];

  queueText(text: string, tokens = { inputTokens: 10, outputTokens: 10 }) {
    this.textQueue.push({ text, ...tokens });
  }

  queueStructured(data: unknown) {
    this.structuredQueue.push(data);
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextOutput> {
    this.calls.push({ type: "text", input });
    const next = this.textQueue.shift();
    if (!next) throw new Error("FakeLLMProvider: no queued text response");
    return next;
  }

  async generateStructured<T>(input: GenerateStructuredInput<T>): Promise<GenerateStructuredOutput<T>> {
    this.calls.push({ type: "structured", input });
    const next = this.structuredQueue.shift();
    if (next === undefined) throw new Error("FakeLLMProvider: no queued structured response");

    const parsed = input.schema.safeParse(next);
    if (!parsed.success) {
      throw new AiValidationError(
        `FakeLLMProvider: queued response failed schema validation for "${input.schemaName}"`,
        input.schemaName,
        next,
      );
    }
    return { data: parsed.data, inputTokens: 10, outputTokens: 10, repaired: false };
  }
}
