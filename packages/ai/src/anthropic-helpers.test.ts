import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  buildStructuredTool,
  extractTextContent,
  extractToolInput,
  extractUsage,
} from "./anthropic-helpers.js";
import { AiProviderError } from "./errors.js";

describe("buildStructuredTool", () => {
  it("converts a Zod schema into a tool named 'output' with a matching input_schema", () => {
    const schema = z.object({ strengths: z.array(z.string()), score: z.number() });
    const tool = buildStructuredTool(schema, "TestSchema");
    expect(tool.name).toBe("output");
    expect(tool.input_schema).toBeDefined();
    expect(tool.input_schema.type).toBe("object");
  });
});

describe("extractTextContent", () => {
  it("concatenates text blocks", () => {
    const response = { content: [{ type: "text", text: "Hello" }, { type: "text", text: "world" }] };
    expect(extractTextContent(response)).toBe("Hello\nworld");
  });

  it("returns an empty string when there are no text blocks", () => {
    const response = { content: [{ type: "tool_use", input: {} }] };
    expect(extractTextContent(response)).toBe("");
  });
});

describe("extractToolInput", () => {
  it("extracts the input from a tool_use block", () => {
    const response = { content: [{ type: "tool_use", input: { foo: "bar" } }] };
    expect(extractToolInput(response)).toEqual({ foo: "bar" });
  });

  it("throws AiProviderError when there is no tool_use block", () => {
    const response = { content: [{ type: "text", text: "no tool call here" }] };
    expect(() => extractToolInput(response)).toThrow(AiProviderError);
  });
});

describe("extractUsage", () => {
  it("extracts input/output token counts", () => {
    const response = { content: [], usage: { input_tokens: 42, output_tokens: 7 } };
    expect(extractUsage(response)).toEqual({ inputTokens: 42, outputTokens: 7 });
  });

  it("defaults to 0 when usage is missing", () => {
    const response = { content: [] };
    expect(extractUsage(response)).toEqual({ inputTokens: 0, outputTokens: 0 });
  });
});
