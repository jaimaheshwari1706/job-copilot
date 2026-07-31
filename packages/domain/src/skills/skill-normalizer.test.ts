import { describe, expect, it } from "vitest";
import { SkillNormalizer } from "./skill-normalizer.js";

const entries = [
  { name: "React", aliases: ["react.js", "reactjs", "react"] },
  { name: "Node.js", aliases: ["node", "node.js", "nodejs"] },
  { name: "JavaScript", aliases: ["js", "javascript", "ecmascript"] },
];

describe("SkillNormalizer", () => {
  const normalizer = new SkillNormalizer(entries);

  it("resolves known aliases to their canonical form", () => {
    expect(normalizer.normalize("React.js")).toBe("React");
    expect(normalizer.normalize("ReactJS")).toBe("React");
    expect(normalizer.normalize("react")).toBe("React");
    expect(normalizer.normalize("Node")).toBe("Node.js");
    expect(normalizer.normalize("NodeJS")).toBe("Node.js");
    expect(normalizer.normalize("JS")).toBe("JavaScript");
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(normalizer.normalize("  REACT.JS  ")).toBe("React");
  });

  it("passes through an unrecognized skill, title-cased, rather than dropping it", () => {
    expect(normalizer.normalize("rust")).toBe("Rust");
    expect(normalizer.normalize("some new framework")).toBe("Some New Framework");
  });

  it("handles empty/whitespace-only input without throwing", () => {
    expect(normalizer.normalize("   ")).toBe("");
  });

  it("isKnown reflects whether a skill resolves via the dictionary", () => {
    expect(normalizer.isKnown("reactjs")).toBe(true);
    expect(normalizer.isKnown("some-obscure-lib")).toBe(false);
  });

  describe("normalizeAll", () => {
    it("de-duplicates equivalent aliases within the same list", () => {
      const result = normalizer.normalizeAll(["React.js", "ReactJS", "react", "Node"]);
      expect(result).toEqual(["React", "Node.js"]);
    });

    it("preserves order of first occurrence", () => {
      const result = normalizer.normalizeAll(["JS", "React", "Node"]);
      expect(result).toEqual(["JavaScript", "React", "Node.js"]);
    });

    it("filters out empty entries", () => {
      const result = normalizer.normalizeAll(["React", "  ", "Node"]);
      expect(result).toEqual(["React", "Node.js"]);
    });
  });

  describe("findMentionedSkills", () => {
    it("finds known skills mentioned in free-flowing prose", () => {
      const text = "We're looking for someone strong in React.js and Node.js with JS experience.";
      const found = normalizer.findMentionedSkills(text);
      expect(found).toContain("React");
      expect(found).toContain("Node.js");
      expect(found).toContain("JavaScript");
    });

    it("does not match a substring inside an unrelated word (word-boundary check)", () => {
      // "js" as an alias for JavaScript should not match inside "objects"
      const text = "We work with complex objects and business logic.";
      const found = normalizer.findMentionedSkills(text);
      expect(found).not.toContain("JavaScript");
    });

    it("returns an empty array when nothing in the dictionary is mentioned", () => {
      const text = "We are looking for a passionate person with great communication skills.";
      expect(normalizer.findMentionedSkills(text)).toEqual([]);
    });

    it("de-duplicates when a skill is mentioned via multiple aliases", () => {
      const text = "Must know React, react.js, and ReactJS well.";
      const found = normalizer.findMentionedSkills(text);
      expect(found.filter((s) => s === "React")).toHaveLength(1);
    });
  });
});
