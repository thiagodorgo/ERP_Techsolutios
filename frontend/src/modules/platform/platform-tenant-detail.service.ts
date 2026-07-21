import { isMockMode } from "../../config/env";
import { ApiError, apiData } from "../../services/api/client";
import { adaptPlatformTenantDetail } from "./platform-tenant-detail.adapter";
import type { PlatformTenantDetailApiContext, PlatformTenantDetailData } from "./platform-tenant-detail.types";
import { emptyTenantDetail } from "./platform-tenant-detail.types";

// PR-SCALE-5c — service frontend de GET /api/v1/platform/tenants/:tenantId/detail (gate backend
// `platform:tenants:read`). D-007: modo mock → detalhe VAZIO honesto (nada fabricado; a UI mostra o estado
// honesto); 403 → vazio + `forbidden:true` ("acesso não permitido", não é erro de sistema); 404 → vazio +
// `notFound:true` (organização inexistente — a UI mostra "Organização não encontrada"); qualquer outro
// erro (5xx/rede) → vazio + `source:"fallback"` (a UI avisa e o auto-refresh tenta de novo). O front NUNCA
// inventa organização, usuário, MRR, uptime ou saúde.
export async function getPlatformTenantDetail(
  tenantId: string,
  context: PlatformTenantDetailApiContext,
): Promise<PlatformTenantDetailData> {
  // D-007: sem organização fabricada em modo mock — a UI mostra o estado vazio honesto.
  if (isMockMode()) return emptyTenantDetail("mock");

  try {
    const raw = await apiData<unknown>(`/platform/tenants/${encodeURIComponent(tenantId)}/detail`, context);
    const detail = adaptPlatformTenantDetail(raw);
    // Resposta 200 sem identidade honesta (sem id/name) → trata como falha de carga, não fabrica tela.
    if (!detail) return emptyTenantDetail("fallback");
    return { detail, source: "api", forbidden: false, notFound: false };
  } catch (err) {
    if (err instanceof ApiError) {
      // 403 = gate RBAC `platform:tenants:read` → "acesso não permitido" (não é falha de sistema).
      if (err.status === 403) return { ...emptyTenantDetail("fallback"), forbidden: true };
      // 404 = organização inexistente → estado honesto "não encontrada" (não é falha de sistema).
      if (err.status === 404) return { ...emptyTenantDetail("api"), notFound: true };
    }
    // Erro real (5xx, rede) → vazio + fallback. NUNCA fabrica dado; a UI tenta de novo no refresh.
    return emptyTenantDetail("fallback");
  }
}
