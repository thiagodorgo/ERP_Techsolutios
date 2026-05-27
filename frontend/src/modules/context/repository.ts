import { mockTenantContexts } from "../../mocks/auth/context";
import type { TenantContext } from "./types";

export async function listAvailableContexts(): Promise<TenantContext[]> {
  await new Promise((resolve) => window.setTimeout(resolve, 250));
  return mockTenantContexts;
}
