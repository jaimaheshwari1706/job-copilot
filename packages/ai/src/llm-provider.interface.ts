import type { ZodSchema } from "zod";

export interface GenerateTextInput {
  system?: string;
  prompt: string;
  maxTokens?: number;
}

export interface GenerateTextOutput {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export interface GenerateStructuredInput<T> {
  system?: string;
  prompt: string;
  schema: ZodSchema<T>;
  /** Used only in error messages / aiRuns logging — has no effect on the actual call. */
  schemaName: string;
  maxTokens?: number;
}

export interface GenerateStructuredOutput<T> {
  data: T;
  inputTokens: number;
  outputTokens: number;
  /** True if the first response failed validation and a repair retry was needed. */
  repaired: boolean;
}

/**
 * Every AI feature (JD analysis, cover letters, tailoring, etc.) codes
 * against this interface, never a vendor SDK directly — swapping providers
 * or adding a second one is a new implementation of this interface, not a
 * rewrite of feature code (Phase 0 amendment #16).
 */
export interface LLMProvider {
  readonly name: string;
  readonly model: string;
  generateText(input: GenerateTextInput): Promise<GenerateTextOutput>;
  generateStructured<T>(input: GenerateStructuredInput<T>): Promise<GenerateStructuredOutput<T>>;
}

/**
 * Embeddings need a dedicated vendor decision (Anthropic doesn't offer an
 * embeddings endpoint) that hasn't been made yet — this interface is
 * reserved per amendment #16, but no concrete implementation ships until
 * that choice is made and semantic matching (Phase 6's deferred weight) is
 * actually wired up. Left unimplemented rather than faked.
 */
export interface EmbeddingProvider {
  readonly name: string;
  readonly model: string;
  readonly dimensions: number;
  embedText(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}
