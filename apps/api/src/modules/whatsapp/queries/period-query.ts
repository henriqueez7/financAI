import type { ReportQuery } from "../../reports/report.schema.js";
import type { PeriodHint } from "../intents/intent.types.js";

export function resolveReportQuery(
  periodHint: PeriodHint | undefined,
  referenceDate: Date,
): ReportQuery {
  assertValidReferenceDate(referenceDate);

  switch (periodHint) {
    case "TODAY": {
      const day = startOfUtcDay(referenceDate);

      return {
        dateFrom: day,
        dateTo: day,
      };
    }

    case "CURRENT_MONTH":
      return {
        month: referenceDate.getUTCMonth() + 1,
        year: referenceDate.getUTCFullYear(),
      };

    case "PREVIOUS_MONTH": {
      const previousMonth = new Date(
        Date.UTC(
          referenceDate.getUTCFullYear(),
          referenceDate.getUTCMonth() - 1,
          1,
        ),
      );

      return {
        month: previousMonth.getUTCMonth() + 1,
        year: previousMonth.getUTCFullYear(),
      };
    }

    case "CURRENT_YEAR":
      return {
        dateFrom: new Date(
          Date.UTC(referenceDate.getUTCFullYear(), 0, 1),
        ),
        dateTo: new Date(
          Date.UTC(referenceDate.getUTCFullYear(), 11, 31),
        ),
      };

    default:
      return {
        month: referenceDate.getUTCMonth() + 1,
        year: referenceDate.getUTCFullYear(),
      };
  }
}

export function resolveCurrentBudgetPeriod(
  referenceDate: Date,
) {
  assertValidReferenceDate(referenceDate);

  return {
    month: referenceDate.getUTCMonth() + 1,
    year: referenceDate.getUTCFullYear(),
  };
}

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    ),
  );
}

function assertValidReferenceDate(referenceDate: Date) {
  if (!Number.isFinite(referenceDate.getTime())) {
    throw new TypeError("A data de referência é inválida.");
  }
}
