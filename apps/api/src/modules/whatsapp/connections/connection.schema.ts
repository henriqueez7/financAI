import { z } from "zod";

export const whatsappConnectionInputSchema = z
  .object({
    phoneNumber: z
      .string()
      .regex(/^\+[1-9]\d{7,14}$/),
    waId: z
      .string()
      .regex(/^\d{8,20}$/),
  })
  .strict();
