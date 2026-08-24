import { z } from "zod";

const reportMonthSchema = z.coerce
  .number()
  .int("Informe um mês válido.")
  .min(1, "O mês deve estar entre 1 e 12.")
  .max(12, "O mês deve estar entre 1 e 12.");

const reportYearSchema = z.coerce
  .number()
  .int("Informe um ano válido.")
  .min(2000, "O ano deve ser igual ou posterior a 2000.")
  .max(2100, "O ano deve ser igual ou anterior a 2100.");

const optionalDateSchema = z.preprocess(
  (value) => value === "" ? undefined : value,
  z.coerce
    .date({
      error: "Informe uma data válida.",
    })
    .optional(),
);

const optionalIdSchema = z.preprocess(
  (value) => value === "" ? undefined : value,
  z
    .string()
    .uuid("Informe um identificador válido.")
    .optional(),
);

export const reportQuerySchema = z
  .object({
    month: reportMonthSchema.optional(),
    year: reportYearSchema.optional(),
    dateFrom: optionalDateSchema,
    dateTo: optionalDateSchema,
    accountId: optionalIdSchema,
    categoryId: optionalIdSchema,
    type: z
      .enum(["INCOME", "EXPENSE"])
      .optional(),
  })
  .superRefine((input, context) => {
    const hasMonth = input.month !== undefined;
    const hasYear = input.year !== undefined;
    const hasDateFrom = input.dateFrom !== undefined;
    const hasDateTo = input.dateTo !== undefined;

    if (hasMonth !== hasYear) {
      context.addIssue({
        code: "custom",
        path: hasMonth ? ["year"] : ["month"],
        message: "Informe month e year juntos.",
      });
    }

    if (hasDateFrom !== hasDateTo) {
      context.addIssue({
        code: "custom",
        path: hasDateFrom ? ["dateTo"] : ["dateFrom"],
        message: "Informe dateFrom e dateTo juntos.",
      });
    }

    if (
      (hasMonth || hasYear) &&
      (hasDateFrom || hasDateTo)
    ) {
      context.addIssue({
        code: "custom",
        path: ["dateFrom"],
        message:
          "Use month/year ou dateFrom/dateTo, não os dois formatos ao mesmo tempo.",
      });
    }

    if (!input.dateFrom || !input.dateTo) {
      return;
    }

    const dateFrom = normalizeDate(input.dateFrom);
    const dateTo = normalizeDate(input.dateTo);

    if (dateFrom > dateTo) {
      context.addIssue({
        code: "custom",
        path: ["dateTo"],
        message:
          "A data final deve ser igual ou posterior à data inicial.",
      });
    }

    if (
      dateFrom.getUTCFullYear() < 2000 ||
      dateTo.getUTCFullYear() > 2100
    ) {
      context.addIssue({
        code: "custom",
        path: ["dateFrom"],
        message:
          "O período deve estar entre os anos 2000 e 2100.",
      });
    }

    const rangeInDays = Math.floor(
      (dateTo.getTime() - dateFrom.getTime()) /
        (24 * 60 * 60 * 1000),
    );

    if (rangeInDays > 1_096) {
      context.addIssue({
        code: "custom",
        path: ["dateTo"],
        message:
          "O período personalizado deve ter no máximo três anos.",
      });
    }
  });

export type ReportQuery = z.infer<
  typeof reportQuerySchema
>;

function normalizeDate(value: Date) {
  return new Date(
    Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate(),
    ),
  );
}
