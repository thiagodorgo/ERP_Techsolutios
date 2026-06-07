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
  };

  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.tenantId) headers["X-Tenant-Id"] = options.tenantId;
  if (options.branchId) headers["X-Branch-Id"] = options.branchId;
  if (options.role) headers["X-Role"] = options.role;
  if (options.permissions?.length) headers["X-Permissions"] = options.permissions.join(",");

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
