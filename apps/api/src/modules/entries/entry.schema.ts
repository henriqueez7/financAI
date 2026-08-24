import { z } from "zod";

const entryTypeSchema = z.enum([
  "INCOME",
  "EXPENSE",
]);

const entryStatusSchema = z.enum([
  "PENDING",
  "COMPLETED",
  "CANCELLED",
]);

export const createEntrySchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "Informe a descrição.")
    .max(
      100,
      "A descrição deve ter no máximo 100 caracteres.",
    ),

  amount: z.coerce
    .number()
    .positive("O valor deve ser maior que zero."),

  type: entryTypeSchema,

  status: entryStatusSchema.default("COMPLETED"),

  dueDate: z.coerce.date({
    error: "Informe uma data válida.",
  }),

  accountId: z
    .string()
    .uuid("Informe uma conta válida."),

  categoryId: z
    .string()
    .uuid("Informe uma categoria válida.")
    .optional()
    .nullable(),

  notes: z
    .string()
    .trim()
    .max(
      500,
      "As observações devem ter no máximo 500 caracteres.",
    )
    .optional()
    .nullable(),
}).strict();

export const listEntriesQuerySchema = z.object({
  type: entryTypeSchema.optional(),

  status: entryStatusSchema.optional(),

  accountId: z
    .string()
    .uuid("Informe uma conta válida.")
    .optional(),

  categoryId: z
    .string()
    .uuid("Informe uma categoria válida.")
    .optional(),

  month: z.coerce
    .number()
    .int()
    .min(1)
    .max(12)
    .optional(),

  year: z.coerce
    .number()
    .int()
    .min(2000)
    .max(2100)
    .optional(),
});

export const updateEntrySchema = z
  .object({
    description: z
      .string()
      .trim()
      .min(1, "Informe a descrição.")
      .max(
        100,
        "A descrição deve ter no máximo 100 caracteres.",
      )
      .optional(),

    amount: z.coerce
      .number()
      .positive("O valor deve ser maior que zero.")
      .optional(),

    type: entryTypeSchema.optional(),

    status: entryStatusSchema.optional(),

    dueDate: z.coerce
      .date({
        error: "Informe uma data válida.",
      })
      .optional(),

    accountId: z
      .string()
      .uuid("Informe uma conta válida.")
      .optional(),

    categoryId: z
      .string()
      .uuid("Informe uma categoria válida.")
      .nullable()
      .optional(),

    notes: z
      .string()
      .trim()
      .max(
        500,
        "As observações devem ter no máximo 500 caracteres.",
      )
      .nullable()
      .optional(),
  })
  .strict()
  .refine(
    (input) => Object.keys(input).length > 0,
    {
      message:
        "Informe pelo menos um campo para atualizar.",
    },
  );

export type CreateEntryInput = z.infer<
  typeof createEntrySchema
>;

export type ListEntriesQuery = z.infer<
  typeof listEntriesQuerySchema
>;

export type UpdateEntryInput = z.infer<
  typeof updateEntrySchema
>;
