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
  type Category,
  listCategories,
} from "../lib/categories";

interface UseCategoriesResult {
  categories: Category[];
  isLoading: boolean;
  errorMessage: string;
  reload: () => Promise<void>;
}

export function useCategories(): UseCategoriesResult {
  const [categories, setCategories] =
    useState<Category[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const loadCategories =
    useCallback(async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const data =
          await listCategories();

        setCategories(data);
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.status === 401
        ) {
          clearStoredSession();
          window.location.replace(
            "/login",
          );

          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar as categorias.",
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadCategories();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadCategories]);

  return {
    categories,
    isLoading,
    errorMessage,
    reload: loadCategories,
  };
}
