import { z } from "zod";

import {
  intentSources,
  MAX_FINANCIAL_MESSAGE_LENGTH,
  periodHints,
  whatsappIntents,
} from "./intent.types.js";

export const whatsappMessageTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_FINANCIAL_MESSAGE_LENGTH);

export const financialEntitiesSchema = z
  .object({
    amount: z.number().finite().positive().optional(),
    description: z.string().trim().min(1).max(100).optional(),
    date: z.iso.date().optional(),
    categoryHint: z.string().trim().min(1).max(100).optional(),
    accountHint: z.string().trim().min(1).max(100).optional(),
    periodHint: z.enum(periodHints).optional(),
  })
  .strict();

export const intentResultSchema = z
  .object({
    intent: z.enum(whatsappIntents),
    source: z.enum(intentSources),
    confidence: z.enum(["EXACT", "PATTERN", "MODEL", "NONE"]),
    rawText: z.string().max(MAX_FINANCIAL_MESSAGE_LENGTH),
    entities: financialEntitiesSchema,
  })
  .strict();

export const aiIntentOutputSchema = z
  .object({
    intent: z.enum(whatsappIntents),
    entities: z
      .object({
        amount: z.number().finite().positive().nullable(),
        description: z.string().trim().min(1).max(100).nullable(),
        date: z.iso.date().nullable(),
        categoryHint: z.string().trim().min(1).max(100).nullable(),
        accountHint: z.string().trim().min(1).max(100).nullable(),
        periodHint: z.enum(periodHints).nullable(),
      })
      .strict(),
  })
  .strict();

export type AiIntentOutput = z.infer<
  typeof aiIntentOutputSchema
>;
