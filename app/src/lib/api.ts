const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3333";

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

  return (
    window.localStorage.getItem("token") ??
    window.sessionStorage.getItem("token")
  );
}

export function clearStoredSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem("token");
  window.localStorage.removeItem("user");

  window.sessionStorage.removeItem("token");
  window.sessionStorage.removeItem("user");
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