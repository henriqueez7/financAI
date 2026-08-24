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
  type Goal,
  listGoals,
} from "../lib/goals";

interface UseGoalsResult {
  goals: Goal[];
  isLoading: boolean;
  errorMessage: string;
  reload: () => Promise<void>;
}

export function useGoals(): UseGoalsResult {
  const [goals, setGoals] =
    useState<Goal[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const loadGoals = useCallback(async () => {
    await Promise.resolve();

    try {
      setIsLoading(true);
      setErrorMessage("");

      const data = await listGoals();

      setGoals(data);
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
          : "Não foi possível carregar as metas.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadGoals();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadGoals]);

  return {
    goals,
    isLoading,
    errorMessage,
    reload: loadGoals,
  };
}
