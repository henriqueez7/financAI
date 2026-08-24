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
  type ReportFilters,
  type ReportsData,
  getReportsOverview,
} from "../lib/reports";

interface UseReportsResult {
  report: ReportsData | null;
  isLoading: boolean;
  errorMessage: string;
  reload: () => Promise<void>;
}

export function useReports(
  filters: ReportFilters,
): UseReportsResult {
  const [report, setReport] =
    useState<ReportsData | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const loadReports = useCallback(async () => {
    await Promise.resolve();

    try {
      setIsLoading(true);
      setErrorMessage("");

      const data = await getReportsOverview(
        filters,
      );

      setReport(data);
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
          : "Não foi possível carregar os relatórios.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadReports();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadReports]);

  return {
    report,
    isLoading,
    errorMessage,
    reload: loadReports,
  };
}
