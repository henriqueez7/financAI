import { z } from "zod";

export const pendingFinancialActionPayloadSchema = z
  .object({
    amount: z.number().positive(),
    description: z.string().trim().min(1).max(100).optional(),
    date: z.iso.datetime().optional(),
    categoryHint: z.string().trim().min(1).max(100).optional(),
    accountHint: z.string().trim().min(1).max(100).optional(),
  })
  .strict();
