import { z } from "zod";

const maximumMoneyValue = 9_999_999_999.99;

export const goalStatusSchema = z.enum([
  "ACTIVE",
  "COMPLETED",
  "PAUSED",
  "CANCELLED",
]);

const positiveMoneySchema = z.coerce
  .number()
  .finite("Informe um valor válido.")
  .positive("O valor deve ser maior que zero.")
  .max(
    maximumMoneyValue,
    "O valor informado excede o limite permitido.",
  );

const nonNegativeMoneySchema = z.coerce
  .number()
  .finite("Informe um valor válido.")
  .min(0, "O valor não pode ser negativo.")
  .max(
    maximumMoneyValue,
    "O valor informado excede o limite permitido.",
  );

const optionalDateSchema = z.preprocess(
  (value) => value === "" ? null : value,
  z.coerce
    .date({
      error: "Informe uma data válida.",
    })
    .nullable(),
);

const optionalSearchSchema = z.preprocess(
  (value) =>
    typeof value === "string" && !value.trim()
      ? undefined
      : value,
  z
    .string()
    .trim()
    .max(
      100,
      "A busca deve possuir no máximo 100 caracteres.",
    )
    .optional(),
);

export const createGoalSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome da meta.")
    .max(
      100,
      "O nome deve possuir no máximo 100 caracteres.",
    ),

  description: z
    .string()
    .trim()
    .max(
      500,
      "A descrição deve possuir no máximo 500 caracteres.",
    )
    .nullable()
    .optional(),

  targetAmount: positiveMoneySchema,
  initialAmount: nonNegativeMoneySchema.optional().default(0),
  targetDate: optionalDateSchema.optional(),
  status: goalStatusSchema.optional().default("ACTIVE"),

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
}).strict();

export const updateGoalSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Informe o nome da meta.")
      .max(
        100,
        "O nome deve possuir no máximo 100 caracteres.",
      )
      .optional(),

    description: z
      .string()
      .trim()
      .max(
        500,
        "A descrição deve possuir no máximo 500 caracteres.",
      )
      .nullable()
      .optional(),

    targetAmount: positiveMoneySchema.optional(),
    targetDate: optionalDateSchema.optional(),
    status: goalStatusSchema.optional(),

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
  })
  .strict()
  .refine(
    (input) => Object.keys(input).length > 0,
    {
      message:
        "Informe pelo menos um campo para atualizar.",
    },
  );

export const listGoalsQuerySchema = z.object({
  status: goalStatusSchema.optional(),
  search: optionalSearchSchema,
});

export const createGoalContributionSchema = z.object({
  amount: positiveMoneySchema,

  date: z.coerce
    .date({
      error: "Informe uma data válida.",
    })
    .optional(),

  notes: z
    .string()
    .trim()
    .max(
      300,
      "As observações devem possuir no máximo 300 caracteres.",
    )
    .nullable()
    .optional(),
}).strict();

export type CreateGoalInput = z.infer<
  typeof createGoalSchema
>;

export type UpdateGoalInput = z.infer<
  typeof updateGoalSchema
>;

export type ListGoalsQuery = z.infer<
  typeof listGoalsQuerySchema
>;

export type CreateGoalContributionInput = z.infer<
  typeof createGoalContributionSchema
>;
