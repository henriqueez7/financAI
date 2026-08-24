"use client";

import { useCallback, useEffect, useState } from "react";

import {
  ApiError,
  clearStoredSession,
} from "../lib/api";

import {
  type DashboardData,
  getDashboard,
} from "../lib/dashboard";

interface UseDashboardResult {
  dashboard: DashboardData | null;
  isLoading: boolean;
  errorMessage: string;
  reload: () => Promise<void>;
}

export function useDashboard(): UseDashboardResult {
  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const loadDashboard =
    useCallback(async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const data = await getDashboard();

        setDashboard(data);
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
            : "Não foi possível carregar o dashboard.",
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadDashboard]);

  return {
    dashboard,
    isLoading,
    errorMessage,
    reload: loadDashboard,
  };
}
