import { resolvePublicApiUrl } from "../../../config/public-api-url";

const API_URL = resolvePublicApiUrl();
const TOKEN_STORAGE_KEY = "token";
const USER_STORAGE_KEY = "user";

export interface ApiErrorResponse {
  message?: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export class ApiError extends Error {
  status: number;
  payload: ApiErrorResponse;

  constructor(
    status: number,
    payload: ApiErrorResponse,
  ) {
    super(
      payload.message ??
        "Erro ao comunicar com a API.",
    );

    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

function getStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }

  const token =
    window.localStorage.getItem(
      TOKEN_STORAGE_KEY,
    ) ??
    window.sessionStorage.getItem(
      TOKEN_STORAGE_KEY,
    );

  if (token && isExpiredJwt(token)) {
    clearStoredSession();
    return null;
  }

  return token;
}

export function clearStoredSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(
    TOKEN_STORAGE_KEY,
  );
  window.localStorage.removeItem(USER_STORAGE_KEY);

  window.sessionStorage.removeItem(
    TOKEN_STORAGE_KEY,
  );
  window.sessionStorage.removeItem(USER_STORAGE_KEY);
}

export function storeSession(
  token: string,
  user: unknown,
  persistent: boolean,
) {
  if (typeof window === "undefined") {
    throw new Error(
      "A sessão só pode ser armazenada no navegador.",
    );
  }

  const storage = persistent
    ? window.localStorage
    : window.sessionStorage;
  const serializedUser = JSON.stringify(user);

  clearStoredSession();

  try {
    storage.setItem(USER_STORAGE_KEY, serializedUser);
    storage.setItem(TOKEN_STORAGE_KEY, token);
  } catch (error) {
    clearStoredSession();
    throw error;
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers);

  if (
    options.body &&
    !headers.has("Content-Type")
  ) {
    headers.set(
      "Content-Type",
      "application/json",
    );
  }

  if (token) {
    headers.set(
      "Authorization",
      `Bearer ${token}`,
    );
  }

  const response = await fetch(
    `${API_URL}${path}`,
    {
      ...options,
      headers,
      cache: "no-store",
    },
  );

  if (response.status === 401) {
    clearStoredSession();
  }

  if (!response.ok) {
    let payload: ApiErrorResponse = {
      message: "Erro ao comunicar com a API.",
    };

    try {
      payload =
        (await response.json()) as ApiErrorResponse;
    } catch {
    }

    throw new ApiError(
      response.status,
      payload,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function isExpiredJwt(token: string) {
  const encodedPayload = token.split(".")[1];

  if (!encodedPayload) {
    return false;
  }

  try {
    const normalizedPayload = encodedPayload
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const paddingLength =
      (4 - (normalizedPayload.length % 4)) % 4;
    const payload = JSON.parse(
      window.atob(
        normalizedPayload.padEnd(
          normalizedPayload.length + paddingLength,
          "=",
        ),
      ),
    ) as { exp?: unknown };

    return (
      typeof payload.exp === "number" &&
      payload.exp * 1000 <= Date.now()
    );
  } catch {
    return false;
  }
}
