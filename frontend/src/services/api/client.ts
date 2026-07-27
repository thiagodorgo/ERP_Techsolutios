import { isMockMode, readFrontendEnv } from "../../config/env";
import { clearStoredAuthSession, getStoredToken } from "../../modules/auth/auth.storage";
import { refreshSession } from "../../modules/auth/auth.service";

/**
 * Erro de API com mensagem segura para a UI (não vaza corpo cru). `code`/`reason` são o discriminador
 * ESTÁVEL do backend ({ error: { code, reason, message } } — core-saas/routes/http.ts sendRouteError),
 * extraídos de forma ADITIVA: opcionais, a `safeMessage` genérica permanece para todos os callers.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly safeMessage: string,
    readonly code?: string,
    readonly reason?: string,
  ) {
    super(safeMessage);
    this.name = "ApiError";
  }
}

function safeMessageFor(status: number): string {
  if (status === 401 || status === 403) return "Sessão expirada ou sem permissão.";
  if (status === 404) return "Recurso não encontrado.";
  if (status === 409) return "Conflito de dados. Recarregue e tente novamente.";
  if (status >= 500) return "Falha no servidor. Tente novamente em instantes.";
  return "Não foi possível concluir a operação.";
}

/**
 * Monta o ApiError lendo o corpo de erro do backend para carregar `code`/`reason` (discriminadores estáveis)
 * SEM vazar corpo cru: a `safeMessage` exibível continua genérica por status. Corpo não-JSON/ausente → sem
 * code/reason (comportamento idêntico ao anterior). Consome o body só no caminho de erro (já vamos lançar).
 */
async function buildApiError(response: Response): Promise<ApiError> {
  const { code, reason } = await readErrorEnvelope(response);
  return new ApiError(response.status, safeMessageFor(response.status), code, reason);
}

async function readErrorEnvelope(response: Response): Promise<{ code?: string; reason?: string }> {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object" && "error" in body) {
      const error = (body as { error?: unknown }).error;
      if (error && typeof error === "object") {
        const code = (error as { code?: unknown }).code;
        const reason = (error as { reason?: unknown }).reason;
        return {
          code: typeof code === "string" ? code : undefined,
          reason: typeof reason === "string" ? reason : undefined,
        };
      }
    }
  } catch {
    // corpo não-JSON, vazio ou já consumido — mantém o erro genérico (backward-compatible).
  }
  return {};
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string;
  tenantId?: string;
  branchId?: string;
  role?: string;
  permissions?: string[];
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetchWithAuthRetry(path, options, (forceStoredToken) => ({
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders(options, forceStoredToken),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  }));

  if (!response.ok) throw await buildApiError(response);

  return response.json() as Promise<T>;
}

/** Como apiRequest, mas desembrulha o envelope `{ data }` do backend. */
export async function apiData<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const payload = await apiRequest<{ data: T }>(path, options);
  return payload.data;
}

export async function apiFormDataRequest<T>(path: string, options: Omit<RequestOptions, "body"> & { body: FormData }): Promise<T> {
  const response = await fetchWithAuthRetry(path, options, (forceStoredToken) => ({
    method: options.method ?? "POST",
    headers: buildAuthHeaders(options, forceStoredToken),
    body: options.body,
  }));

  if (!response.ok) throw await buildApiError(response);

  return response.json() as Promise<T>;
}

export async function apiBlobRequest(path: string, options: RequestOptions = {}): Promise<{ blob: Blob; fileName?: string; contentType?: string }> {
  const response = await fetchWithAuthRetry(path, options, (forceStoredToken) => ({
    method: options.method ?? "GET",
    headers: buildAuthHeaders(options, forceStoredToken),
  }));

  if (!response.ok) throw await buildApiError(response);

  return {
    blob: await response.blob(),
    fileName: readContentDispositionFileName(response.headers.get("content-disposition")),
    contentType: response.headers.get("content-type") ?? undefined,
  };
}

async function fetchWithAuthRetry(
  path: string,
  options: RequestOptions,
  buildInit: (forceStoredToken: boolean) => RequestInit,
): Promise<Response> {
  const response = await fetch(`${apiBaseUrl()}${path}`, buildInit(false));

  if (response.status !== 401 || !shouldAttemptRefresh(path, options)) {
    handleUnauthorized(response, path);
    return response;
  }

  try {
    await refreshSession();
  } catch {
    clearStoredAuthSession();
    return response;
  }

  const retryResponse = await fetch(`${apiBaseUrl()}${path}`, buildInit(true));
  handleUnauthorized(retryResponse, path);

  return retryResponse;
}

function buildAuthHeaders(options: RequestOptions, forceStoredToken = false): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = forceStoredToken ? getStoredToken() : options.token ?? getStoredToken();

  if (token) headers.Authorization = `Bearer ${token}`;

  if (isMockMode()) {
    if (options.tenantId) headers["X-Tenant-Id"] = options.tenantId;
    if (options.branchId) headers["X-Branch-Id"] = options.branchId;
    if (options.role) headers["X-Role"] = options.role;
    if (options.permissions?.length) headers["X-Permissions"] = options.permissions.join(",");
  }

  return headers;
}

function apiBaseUrl(): string {
  return readFrontendEnv("VITE_API_BASE_URL", "/api/v1");
}

function shouldAttemptRefresh(path: string, options: RequestOptions): boolean {
  if (isMockMode()) return false;
  if (options.method === "DELETE") return false;

  return !path.startsWith("/auth/login") && !path.startsWith("/auth/refresh") && !path.startsWith("/auth/logout");
}

function handleUnauthorized(response: Response, path: string): void {
  if (response.status === 401 && !path.startsWith("/auth/")) {
    clearStoredAuthSession();
  }
}

function readContentDispositionFileName(value: string | null): string | undefined {
  if (!value) return undefined;

  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(value);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);

  const quotedMatch = /filename="([^"]+)"/i.exec(value);
  if (quotedMatch?.[1]) return quotedMatch[1];

  const plainMatch = /filename=([^;]+)/i.exec(value);
  return plainMatch?.[1]?.trim();
}
