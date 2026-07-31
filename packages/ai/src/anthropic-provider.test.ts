import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AnthropicProvider } from "./anthropic-provider.js";
import { AiValidationError, AiProviderError } from "./errors.js";

const schema = z.object({ strengths: z.array(z.string()) });

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("AnthropicProvider.generateText", () => {
  it("sends the expected request shape and extracts text from the response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        content: [{ type: "text", text: "Generated cover letter text" }],
        usage: { input_tokens: 100, output_tokens: 50 },
      }),
    );

    const provider = new AnthropicProvider({ apiKey: "test-key", model: "claude-test", fetchImpl });
    const result = await provider.generateText({ prompt: "Write something" });

    expect(result.text).toBe("Generated cover letter text");
    expect(result.inputTokens).toBe(100);
    expect(result.outputTokens).toBe(50);

    const [url, options] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(options.headers["x-api-key"]).toBe("test-key");
    const body = JSON.parse(options.body);
    expect(body.model).toBe("claude-test");
    expect(body.messages[0].content).toBe("Write something");
  });

  it("throws AiProviderError on a non-OK response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ error: "bad request" }, 400));
    const provider = new AnthropicProvider({ apiKey: "test-key", model: "claude-test", fetchImpl });
    await expect(provider.generateText({ prompt: "x" })).rejects.toThrow(AiProviderError);
  });

  it("throws AiProviderError when fetch itself rejects (network error)", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("ECONNRESET"));
    const provider = new AnthropicProvider({ apiKey: "test-key", model: "claude-test", fetchImpl });
    await expect(provider.generateText({ prompt: "x" })).rejects.toThrow(AiProviderError);
  });
});

describe("AnthropicProvider.generateStructured", () => {
  it("returns validated data on the first successful attempt, repaired=false", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        content: [{ type: "tool_use", name: "output", input: { strengths: ["React", "Node.js"] } }],
        usage: { input_tokens: 50, output_tokens: 20 },
      }),
    );

    const provider = new AnthropicProvider({ apiKey: "test-key", model: "claude-test", fetchImpl });
    const result = await provider.generateStructured({
      prompt: "Analyze this",
      schema,
      schemaName: "Analysis",
    });

    expect(result.data).toEqual({ strengths: ["React", "Node.js"] });
    expect(result.repaired).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries once with a repair prompt when the first response fails validation, then succeeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          content: [{ type: "tool_use", name: "output", input: { strengths: "not-an-array" } }], // invalid
          usage: { input_tokens: 50, output_tokens: 20 },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          content: [{ type: "tool_use", name: "output", input: { strengths: ["Fixed"] } }], // valid
          usage: { input_tokens: 60, output_tokens: 15 },
        }),
      );

    const provider = new AnthropicProvider({ apiKey: "test-key", model: "claude-test", fetchImpl });
    const result = await provider.generateStructured({
      prompt: "Analyze this",
      schema,
      schemaName: "Analysis",
    });

    expect(result.data).toEqual({ strengths: ["Fixed"] });
    expect(result.repaired).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    // The repair attempt's request should include the validation error context.
    const secondCallBody = JSON.parse(fetchImpl.mock.calls[1]![1].body);
    const repairMessage = secondCallBody.messages.find((m: { role: string }) => m.role === "user" && secondCallBody.messages.indexOf(m) > 0);
    expect(repairMessage.content).toContain("did not match the required schema");
  });

  it("throws AiValidationError after two failed attempts, never returning invalid data", async () => {
    const fetchImpl = vi.fn().mockImplementation(() =>
      Promise.resolve(
        jsonResponse({
          content: [{ type: "tool_use", name: "output", input: { strengths: "still-invalid" } }],
          usage: { input_tokens: 50, output_tokens: 20 },
        }),
      ),
    );

    const provider = new AnthropicProvider({ apiKey: "test-key", model: "claude-test", fetchImpl });
    await expect(
      provider.generateStructured({ prompt: "Analyze this", schema, schemaName: "Analysis" }),
    ).rejects.toThrow(AiValidationError);

    expect(fetchImpl).toHaveBeenCalledTimes(2); // exactly one repair attempt, not infinite retries
  });

  it("forces tool_choice to the single 'output' tool", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        content: [{ type: "tool_use", name: "output", input: { strengths: [] } }],
        usage: { input_tokens: 10, output_tokens: 5 },
      }),
    );
    const provider = new AnthropicProvider({ apiKey: "test-key", model: "claude-test", fetchImpl });
    await provider.generateStructured({ prompt: "x", schema, schemaName: "Analysis" });

    const body = JSON.parse(fetchImpl.mock.calls[0]![1].body);
    expect(body.tool_choice).toEqual({ type: "tool", name: "output" });
    expect(body.tools[0].name).toBe("output");
  });
});
