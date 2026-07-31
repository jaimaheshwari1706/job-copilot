import { describe, expect, it } from "vitest";
import { answerEvaluationSchema, generatedQuestionsSchema } from "./interview.js";

describe("answerEvaluationSchema", () => {
  it("requires confidence — an evaluation without it is invalid", () => {
    const result = answerEvaluationSchema.safeParse({
      score: 80,
      strengths: [],
      missingConcepts: [],
      betterAnswerStructure: "x",
      followUpQuestion: "x",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a complete, valid evaluation", () => {
    const result = answerEvaluationSchema.safeParse({
      score: 72,
      confidence: "medium",
      strengths: ["Clear explanation"],
      missingConcepts: ["Edge cases"],
      betterAnswerStructure: "Start with the approach, then complexity.",
      followUpQuestion: "How would this scale to 1M requests?",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a score outside 0-100", () => {
    expect(
      answerEvaluationSchema.safeParse({
        score: 150,
        confidence: "high",
        strengths: [],
        missingConcepts: [],
        betterAnswerStructure: "x",
        followUpQuestion: "x",
      }).success,
    ).toBe(false);
  });
});

describe("generatedQuestionsSchema", () => {
  it("requires at least one question", () => {
    expect(generatedQuestionsSchema.safeParse({ questions: [] }).success).toBe(false);
  });

  it("caps at 12 questions", () => {
    const questions = Array.from({ length: 13 }, (_, i) => ({
      category: "javascript" as const,
      question: `Question number ${i} is here`,
    }));
    expect(generatedQuestionsSchema.safeParse({ questions }).success).toBe(false);
  });

  it("rejects an invalid category", () => {
    const result = generatedQuestionsSchema.safeParse({
      questions: [{ category: "cooking", question: "How do you scramble eggs properly?" }],
    });
    expect(result.success).toBe(false);
  });
});
