import { z } from "zod";

export const accountTypeSchema = z.enum([
  "CHECKING",
  "SAVINGS",
  "CASH",
  "INVESTMENT",
  "DIGITAL_WALLET",
  "OTHER",
]);

export const createAccountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome da conta.")
    .max(
      80,
      "O nome deve possuir no máximo 80 caracteres.",
    ),

  type: accountTypeSchema,

  initialBalance: z.coerce
    .number()
    .finite("Informe um saldo inicial válido."),

  isActive: z.boolean().optional().default(true),
}).strict();

export const updateAccountSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Informe o nome da conta.")
      .max(
        80,
        "O nome deve possuir no máximo 80 caracteres.",
      )
      .optional(),

    type: accountTypeSchema.optional(),

    initialBalance: z.coerce
      .number()
      .finite("Informe um saldo inicial válido.")
      .optional(),

    isActive: z.boolean().optional(),
  })
  .strict()
  .refine(
    (input) => Object.keys(input).length > 0,
    {
      message:
        "Informe pelo menos um campo para atualizar.",
    },
  );

export type CreateAccountInput = z.infer<
  typeof createAccountSchema
>;

export type UpdateAccountInput = z.infer<
  typeof updateAccountSchema
>;
