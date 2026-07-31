import { describe, expect, it } from "vitest";
import { createApplicationSchema, updateApplicationSchema } from "./application.js";

describe("createApplicationSchema", () => {
  it("accepts a jobId-only application (in-system job)", () => {
    expect(createApplicationSchema.safeParse({ jobId: "abc123" }).success).toBe(true);
  });

  it("accepts a jobSnapshot-only application (external job)", () => {
    const result = createApplicationSchema.safeParse({
      jobSnapshot: { title: "Engineer", company: "Acme" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects when neither jobId nor jobSnapshot is provided", () => {
    expect(createApplicationSchema.safeParse({}).success).toBe(false);
  });

  it("defaults status to 'saved'", () => {
    const result = createApplicationSchema.safeParse({ jobId: "abc123" });
    if (result.success) expect(result.data.status).toBe("saved");
  });
});

describe("updateApplicationSchema", () => {
  it("accepts a status-only update", () => {
    expect(updateApplicationSchema.safeParse({ status: "interview" }).success).toBe(true);
  });

  it("rejects an invalid status value", () => {
    expect(updateApplicationSchema.safeParse({ status: "ghosted" }).success).toBe(false);
  });

  it("accepts an empty object (all fields optional)", () => {
    expect(updateApplicationSchema.safeParse({}).success).toBe(true);
  });
});
