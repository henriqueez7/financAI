"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ApiError,
  clearStoredSession,
} from "../lib/api";
import {
  type AiAnalysisResponse,
  requestAiAnalysis,
} from "../lib/ai";
import type { InsightFilters } from "../lib/insights";

export function useAiAnalysis(
  filters: InsightFilters,
) {
  const {
    month,
    year,
    dateFrom,
    dateTo,
    accountId,
    categoryId,
    type,
  } = filters;

  const [result, setResult] =
    useState<AiAnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const activeRequest = useRef<AbortController | null>(null);

  const analyze = useCallback(
    async (question?: string) => {
      activeRequest.current?.abort();
      const controller = new AbortController();
      activeRequest.current = controller;

      try {
        setIsLoading(true);
        setErrorMessage("");

        const nextResult = await requestAiAnalysis({
          filters: {
            month,
            year,
            dateFrom,
            dateTo,
            accountId,
            categoryId,
            type,
          },
          question,
          signal: controller.signal,
        });

        setResult(nextResult);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

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
            : "Não foi possível gerar sua análise.",
        );
      } finally {
        if (activeRequest.current === controller) {
          activeRequest.current = null;
          setIsLoading(false);
        }
      }
    }, [
      accountId,
      categoryId,
      dateFrom,
      dateTo,
      month,
      type,
      year,
    ],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void analyze();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      activeRequest.current?.abort();
    };
  }, [analyze]);

  return {
    result,
    isLoading,
    errorMessage,
    analyze,
  };
}
