import { describe, expect, it } from "vitest";
import { onboardingSchema, confirmSkillsSchema } from "./profile.js";

describe("onboardingSchema", () => {
  it("accepts a minimal valid submission (name only)", () => {
    const result = onboardingSchema.safeParse({ name: "Ada Lovelace" });
    expect(result.success).toBe(true);
  });

  it("rejects a missing name", () => {
    const result = onboardingSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects an invalid workMode value", () => {
    const result = onboardingSchema.safeParse({ name: "Ada", workMode: "space" });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed github URL but allows an empty string", () => {
    expect(onboardingSchema.safeParse({ name: "Ada", github: "not-a-url" }).success).toBe(false);
    expect(onboardingSchema.safeParse({ name: "Ada", github: "" }).success).toBe(true);
  });

  it("coerces numeric-looking strings for experienceYears", () => {
    const result = onboardingSchema.safeParse({ name: "Ada", experienceYears: "5" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.experienceYears).toBe(5);
  });
});

describe("confirmSkillsSchema", () => {
  it("requires at least one skill name", () => {
    expect(confirmSkillsSchema.safeParse({ skillNames: [] }).success).toBe(false);
    expect(confirmSkillsSchema.safeParse({ skillNames: ["React"] }).success).toBe(true);
  });
});
