"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ApiError,
  clearStoredSession,
} from "../lib/api";
import {
  type FinancialInsightsOverview,
  type InsightFilters,
  getFinancialInsightsOverview,
} from "../lib/insights";

interface UseInsightsResult {
  overview: FinancialInsightsOverview | null;
  isLoading: boolean;
  errorMessage: string;
  reload: () => Promise<void>;
}

export function useInsights(
  filters: InsightFilters = {},
): UseInsightsResult {
  const {
    month,
    year,
    dateFrom,
    dateTo,
    accountId,
    categoryId,
    type,
  } = filters;

  const [overview, setOverview] =
    useState<FinancialInsightsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadInsights = useCallback(async () => {
    await Promise.resolve();

    try {
      setIsLoading(true);
      setErrorMessage("");

      const data = await getFinancialInsightsOverview({
        month,
        year,
        dateFrom,
        dateTo,
        accountId,
        categoryId,
        type,
      });

      setOverview(data);
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status === 401
      ) {
        clearStoredSession();
        window.location.replace("/login");
        return;
      }

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os insights.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    accountId,
    categoryId,
    dateFrom,
    dateTo,
    month,
    type,
    year,
  ]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadInsights();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadInsights]);

  return {
    overview,
    isLoading,
    errorMessage,
    reload: loadInsights,
  };
}
