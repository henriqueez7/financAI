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
  type Account,
  listAccounts,
} from "../lib/accounts";

interface UseAccountsResult {
  accounts: Account[];
  isLoading: boolean;
  errorMessage: string;
  reload: () => Promise<void>;
  removeAccountFromState: (
    accountId: string,
  ) => void;
}

export function useAccounts(): UseAccountsResult {
  const [accounts, setAccounts] = useState<
    Account[]
  >([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const loadAccounts =
    useCallback(async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const data = await listAccounts();

        setAccounts(data);
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
            : "Não foi possível carregar as contas.",
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  function removeAccountFromState(
    accountId: string,
  ) {
    setAccounts((currentAccounts) =>
      currentAccounts.filter(
        (account) => account.id !== accountId,
      ),
    );
  }

  return {
    accounts,
    isLoading,
    errorMessage,
    reload: loadAccounts,
    removeAccountFromState,
  };
}