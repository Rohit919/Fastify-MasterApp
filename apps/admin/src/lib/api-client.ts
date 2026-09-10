import { config } from "@/config";
import { useAuthStore } from "@/stores/auth.store";
import {
  API_ENDPOINTS,
  buildPath,
  type ApiEndpoint,
  type ErrorEnvelope,
  type TokenPairResponse,
} from "@app/api-contracts";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly requestId?: string,
    public readonly code: string = "INTERNAL_ERROR",
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  anonymous?: boolean;
  retryAuth?: boolean;
}

let refreshPromise: Promise<string> | null = null;

async function parsedResponse(res: Response): Promise<unknown> {
  if (res.status === 204) return null;
  return res.json().catch(() => null);
}

function toApiError(res: Response, json: unknown): ApiError {
  const envelope = json as ErrorEnvelope | null;
  return new ApiError(
    envelope?.error?.message ?? `Request failed (${res.status})`,
    res.status,
    envelope?.error?.requestId,
    envelope?.error?.code ?? "INTERNAL_ERROR",
  );
}

async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const res = await fetch(
      `${config.apiBaseUrl}${API_ENDPOINTS.AUTH.REFRESH}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      },
    );
    const json = await parsedResponse(res);
    if (!res.ok) {
      useAuthStore.getState().clearSession();
      throw toApiError(res, json);
    }
    const token = (json as TokenPairResponse).data.accessToken;
    useAuthStore.getState().setAccessToken(token);
    return token;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function execute(
  path: string,
  options: RequestOptions,
): Promise<unknown> {
  const { method = "GET", body, anonymous = false, retryAuth = true } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (!anonymous) {
    const token = useAuthStore.getState().accessToken;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${config.apiBaseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "include",
  });
  const json = await parsedResponse(res);

  if (res.status === 401 && !anonymous && retryAuth) {
    await refreshAccessToken();
    return execute(path, { ...options, retryAuth: false });
  }
  if (!res.ok) throw toApiError(res, json);
  return json;
}

async function request<TData>(
  path: string,
  options: RequestOptions = {},
): Promise<TData> {
  const json = await execute(path, options);
  return (json as { success: true; data: TData }).data;
}

async function requestRaw<TBody>(
  path: string,
  options: RequestOptions = {},
): Promise<TBody> {
  return execute(path, options) as Promise<TBody>;
}

export interface ContractRequestArgs {
  params?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

function requestContract<TResponse>(
  endpoint: ApiEndpoint,
  args: ContractRequestArgs = {},
): Promise<TResponse> {
  let path = buildPath(endpoint, args.params ?? {});
  if (args.query) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(args.query)) {
      if (value !== undefined) search.append(key, String(value));
    }
    const query = search.toString();
    if (query) path += `?${query}`;
  }
  return requestRaw<TResponse>(path, {
    method: endpoint.method,
    body: args.body,
    anonymous: endpoint.auth === "public",
  });
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown, anonymous = false) =>
    request<T>(path, { method: "POST", body, anonymous }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  request: requestContract,
  restoreSession: refreshAccessToken,
};
