import { z } from "zod";

const budgetAmountSchema = z.coerce
  .number()
  .finite("Informe um valor de orçamento válido.")
  .positive("O valor do orçamento deve ser maior que zero.");

const budgetMonthSchema = z.coerce
  .number()
  .int("Informe um mês válido.")
  .min(1, "O mês deve estar entre 1 e 12.")
  .max(12, "O mês deve estar entre 1 e 12.");

const budgetYearSchema = z.coerce
  .number()
  .int("Informe um ano válido.")
  .min(2000, "O ano deve ser igual ou posterior a 2000.")
  .max(2100, "O ano deve ser igual ou anterior a 2100.");

const budgetCategorySchema = z
  .string()
  .uuid("Informe uma categoria válida.");

export const createBudgetSchema = z.object({
  categoryId: budgetCategorySchema,
  amount: budgetAmountSchema,
  month: budgetMonthSchema,
  year: budgetYearSchema,
}).strict();

export const updateBudgetSchema = z
  .object({
    categoryId: budgetCategorySchema.optional(),
    amount: budgetAmountSchema.optional(),
    month: budgetMonthSchema.optional(),
    year: budgetYearSchema.optional(),
  })
  .strict()
  .refine(
    (input) => Object.keys(input).length > 0,
    {
      message:
        "Informe pelo menos um campo para atualizar.",
    },
  );

export const listBudgetsQuerySchema = z.object({
  categoryId: budgetCategorySchema.optional(),
  month: budgetMonthSchema.optional(),
  year: budgetYearSchema.optional(),
});

export type CreateBudgetInput = z.infer<
  typeof createBudgetSchema
>;

export type UpdateBudgetInput = z.infer<
  typeof updateBudgetSchema
>;

export type ListBudgetsQuery = z.infer<
  typeof listBudgetsQuerySchema
>;
