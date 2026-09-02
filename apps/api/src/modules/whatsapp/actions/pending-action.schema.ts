import { z } from "zod";

export const pendingFinancialActionPayloadSchema = z
  .object({
    amount: z
      .number()
      .finite()
      .positive()
      .max(9_999_999_999.99),
    description: z.string().trim().min(1).max(100),
    date: z.iso.date(),
    categoryId: z.uuid().optional(),
    accountId: z.uuid().optional(),
  })
  .strict();
