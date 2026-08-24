import { z } from "zod";

export const categoryTypeSchema = z.enum([
  "INCOME",
  "EXPENSE",
]);

export const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome da categoria.")
    .max(
      60,
      "O nome deve possuir no máximo 60 caracteres.",
    ),

  type: categoryTypeSchema,

  icon: z
    .string()
    .trim()
    .max(
      50,
      "O nome do ícone deve possuir no máximo 50 caracteres.",
    )
    .nullable()
    .optional(),

  color: z
    .string()
    .trim()
    .regex(
      /^#[0-9A-Fa-f]{6}$/,
      "Informe uma cor hexadecimal válida.",
    )
    .nullable()
    .optional(),

  isActive: z
    .boolean()
    .optional()
    .default(true),
}).strict();

export const updateCategorySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Informe o nome da categoria.")
      .max(
        60,
        "O nome deve possuir no máximo 60 caracteres.",
      )
      .optional(),

    type: categoryTypeSchema.optional(),

    icon: z
      .string()
      .trim()
      .max(
        50,
        "O nome do ícone deve possuir no máximo 50 caracteres.",
      )
      .nullable()
      .optional(),

    color: z
      .string()
      .trim()
      .regex(
        /^#[0-9A-Fa-f]{6}$/,
        "Informe uma cor hexadecimal válida.",
      )
      .nullable()
      .optional(),

    isActive: z
      .boolean()
      .optional(),
  })
  .strict()
  .refine(
    (input) =>
      Object.keys(input).length > 0,
    {
      message:
        "Informe pelo menos um campo para atualizar.",
    },
  );

export type CreateCategoryInput =
  z.infer<typeof createCategorySchema>;

export type UpdateCategoryInput =
  z.infer<typeof updateCategorySchema>;
