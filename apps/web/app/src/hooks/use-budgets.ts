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
  type Budget,
  listBudgets,
} from "../lib/budgets";

interface UseBudgetsOptions {
  month: number;
  year: number;
  categoryId?: string;
}

interface UseBudgetsResult {
  budgets: Budget[];
  isLoading: boolean;
  errorMessage: string;
  reload: () => Promise<void>;
}

export function useBudgets({
  month,
  year,
  categoryId,
}: UseBudgetsOptions): UseBudgetsResult {
  const [budgets, setBudgets] =
    useState<Budget[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const loadBudgets = useCallback(async () => {
    await Promise.resolve();

    try {
      setIsLoading(true);
      setErrorMessage("");

      const data = await listBudgets({
        month,
        year,
        categoryId,
      });

      setBudgets(data);
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
          : "Não foi possível carregar os orçamentos.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [categoryId, month, year]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadBudgets();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadBudgets]);

  return {
    budgets,
    isLoading,
    errorMessage,
    reload: loadBudgets,
  };
}
