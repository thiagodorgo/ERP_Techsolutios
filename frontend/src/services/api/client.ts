type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string;
  tenantId?: string;
  branchId?: string;
  role?: string;
  permissions?: string[];
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...buildAuthHeaders(options),
  };

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function apiFormDataRequest<T>(path: string, options: Omit<RequestOptions, "body"> & { body: FormData }): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? "POST",
    headers: buildAuthHeaders(options),
    body: options.body,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function apiBlobRequest(path: string, options: RequestOptions = {}): Promise<{ blob: Blob; fileName?: string; contentType?: string }> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: buildAuthHeaders(options),
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return {
    blob: await response.blob(),
    fileName: readContentDispositionFileName(response.headers.get("content-disposition")),
    contentType: response.headers.get("content-type") ?? undefined,
  };
}

function buildAuthHeaders(options: RequestOptions): Record<string, string> {
  const headers: Record<string, string> = {};

  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.tenantId) headers["X-Tenant-Id"] = options.tenantId;
  if (options.branchId) headers["X-Branch-Id"] = options.branchId;
  if (options.role) headers["X-Role"] = options.role;
  if (options.permissions?.length) headers["X-Permissions"] = options.permissions.join(",");

  return headers;
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
