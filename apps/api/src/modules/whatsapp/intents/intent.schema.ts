import { z } from "zod";

import { whatsappIntents } from "./intent.types.js";

export const whatsappMessageTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(1_000);

export const financialEntitiesSchema = z
  .object({
    amount: z.number().positive().optional(),
    description: z.string().trim().min(1).max(100).optional(),
    date: z.iso.datetime().optional(),
    categoryHint: z.string().trim().min(1).max(100).optional(),
    accountHint: z.string().trim().min(1).max(100).optional(),
  })
  .strict();

export const intentResultSchema = z
  .object({
    intent: z.enum(whatsappIntents),
    confidence: z.enum(["EXACT", "PATTERN", "NONE"]),
    rawText: z.string().max(1_000),
    entities: financialEntitiesSchema,
  })
  .strict();
