import { z } from "zod";

import { reportQuerySchema } from "../reports/report.schema.js";

const insightSeveritySchema = z.enum([
  "CRITICAL",
  "WARNING",
  "POSITIVE",
  "INFO",
]);

const insightTypeSchema = z.enum([
  "EXPENSE_INCREASE",
  "EXPENSE_DECREASE",
  "SAVINGS_RATE_GOOD",
  "SAVINGS_RATE_LOW",
  "CATEGORY_CONCENTRATION",
  "LARGE_EXPENSE",
  "BUDGET_WARNING",
  "BUDGET_EXCEEDED",
  "GOAL_NEAR_COMPLETION",
  "GOAL_COMPLETED",
  "GOAL_OVERDUE",
  "NEGATIVE_RESULT",
  "POSITIVE_RESULT",
]);

export const aiAnalyzeRequestSchema = z
  .object({
    filters: reportQuerySchema.optional().default({}),
    question: z
      .string()
      .trim()
      .min(3, "Escreva uma pergunta mais completa.")
      .max(
        300,
        "A pergunta deve possuir no máximo 300 caracteres.",
      )
      .optional(),
  })
  .strict();

export const aiGeneratedAnalysisSchema = z
  .object({
    headline: z.string().trim().min(5).max(120),
    summary: z.string().trim().min(20).max(900),
    facts: z
      .array(
        z
          .object({
            title: z.string().trim().min(3).max(90),
            description: z.string().trim().min(10).max(360),
            severity: insightSeveritySchema,
          })
          .strict(),
      )
      .max(5),
    priorities: z
      .array(
        z
          .object({
            title: z.string().trim().min(3).max(90),
            rationale: z.string().trim().min(10).max(360),
            severity: insightSeveritySchema,
            sourceInsightTypes: z
              .array(insightTypeSchema)
              .max(3),
          })
          .strict(),
      )
      .max(4),
    recommendations: z
      .array(
        z
          .object({
            title: z.string().trim().min(3).max(90),
            suggestion: z.string().trim().min(10).max(360),
            priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
          })
          .strict(),
      )
      .max(4),
    warnings: z.array(z.string().trim().min(5).max(260)).max(4),
    answer: z.string().trim().min(3).max(900).nullable(),
  })
  .strict();

export type AiAnalyzeRequest = z.infer<
  typeof aiAnalyzeRequestSchema
>;

export type AiGeneratedAnalysis = z.infer<
  typeof aiGeneratedAnalysisSchema
>;
