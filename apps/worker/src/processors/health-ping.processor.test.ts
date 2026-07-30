import { describe, expect, it } from "vitest";
import { healthPingJobSchema } from "@job-copilot/shared";

describe("healthPingJobSchema", () => {
  it("accepts a valid ping payload", () => {
    const result = healthPingJobSchema.safeParse({
      pingId: "abc-123",
      sentAt: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });

  it("rejects a payload missing required fields", () => {
    const result = healthPingJobSchema.safeParse({ pingId: "abc-123" });
    expect(result.success).toBe(false);
  });
});
