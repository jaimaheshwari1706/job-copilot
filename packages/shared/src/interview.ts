import { z } from "zod";

export const interviewQuestionCategorySchema = z.enum([
  "javascript",
  "react",
  "nodejs",
  "database",
  "apis",
  "testing",
  "system_design",
  "behavioral",
  "project_specific",
]);
export type InterviewQuestionCategory = z.infer<typeof interviewQuestionCategorySchema>;

export const interviewSessionTypeSchema = z.enum(["prep", "mock"]);

/** What the AI must produce when generating prep questions — validated, not parsed from prose. */
export const generatedQuestionsSchema = z.object({
  questions: z
    .array(
      z.object({
        category: interviewQuestionCategorySchema,
        question: z.string().min(10).max(500),
      }),
    )
    .min(1)
    .max(12),
});
export type GeneratedQuestions = z.infer<typeof generatedQuestionsSchema>;

/** What the AI must produce when generating the next mock-interview question. */
export const nextQuestionSchema = z.object({
  category: interviewQuestionCategorySchema,
  question: z.string().min(10).max(500),
});
export type NextQuestion = z.infer<typeof nextQuestionSchema>;

/**
 * confidence is required, never omitted — the evaluator must always state
 * how certain it is, rather than defaulting to implied high confidence
 * (Phase 0 §23: never show fake precision on inherently subjective judgment).
 */
export const answerEvaluationSchema = z.object({
  score: z.number().min(0).max(100),
  confidence: z.enum(["low", "medium", "high"]),
  strengths: z.array(z.string()).max(5),
  missingConcepts: z.array(z.string()).max(5),
  betterAnswerStructure: z.string().max(1000),
  followUpQuestion: z.string().max(500),
});
export type AnswerEvaluation = z.infer<typeof answerEvaluationSchema>;

export const startPrepSessionSchema = z.object({
  jobId: z.string().optional(),
  categories: z.array(interviewQuestionCategorySchema).min(1).max(9).optional(),
});
export type StartPrepSessionInput = z.infer<typeof startPrepSessionSchema>;

export const startMockSessionSchema = z.object({
  jobId: z.string().optional(),
});
export type StartMockSessionInput = z.infer<typeof startMockSessionSchema>;

export const submitAnswerSchema = z.object({
  answer: z.string().trim().min(1).max(3000),
});
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;

export const interviewQuestionDtoSchema = z.object({
  category: interviewQuestionCategorySchema,
  question: z.string(),
  userAnswer: z.string().optional(),
  evaluation: answerEvaluationSchema.optional(),
  answeredAt: z.string().optional(),
});
export type InterviewQuestionDto = z.infer<typeof interviewQuestionDtoSchema>;

export const interviewSessionSchema = z.object({
  id: z.string(),
  jobId: z.string().nullable(),
  type: interviewSessionTypeSchema,
  status: z.enum(["active", "completed"]),
  questions: z.array(interviewQuestionDtoSchema),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
});
export type InterviewSessionDto = z.infer<typeof interviewSessionSchema>;
