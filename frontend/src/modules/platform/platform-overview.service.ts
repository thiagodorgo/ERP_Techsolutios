import { isMockMode } from "../../config/env";
import { ApiError, apiData } from "../../services/api/client";
import { adaptPlatformOverview } from "./platform-overview.adapter";
import type { PlatformOverviewApiContext, PlatformOverviewData } from "./platform-overview.types";
import { emptyPlatformOverview } from "./platform-overview.types";

// PR-SCALE-5a — service frontend de GET /api/v1/platform/overview (gate backend `platform:tenants:read`).
// D-007: modo mock → visão VAZIA honesta (nada fabricado; a UI mostra o estado honesto); 403 → visão vazia
// + `forbidden:true` (a UI mostra "acesso não permitido", não é erro de sistema); qualquer outro erro
// (5xx/rede) → visão vazia + `source:"fallback"` (a UI avisa e o auto-refresh tenta de novo). O front NUNCA
// inventa organização, contagem, MRR ou uptime.

export async function getPlatformOverview(context: PlatformOverviewApiContext): Promise<PlatformOverviewData> {
  // D-007: sem organização/contagem fabricada em modo mock — a UI mostra o estado vazio honesto.
  if (isMockMode()) return emptyPlatformOverview("mock");

  try {
    const raw = await apiData<unknown>("/platform/overview", context);
    return { ...adaptPlatformOverview(raw), source: "api", forbidden: false };
  } catch (err) {
    // 403 = gate RBAC `platform:tenants:read` → estado "acesso não permitido" (não é falha de sistema).
    if (err instanceof ApiError && err.status === 403) {
      return { ...emptyPlatformOverview("fallback"), forbidden: true };
    }
    // Erro real (5xx, rede) → visão vazia + fallback. NUNCA fabrica dado; a UI tenta de novo no refresh.
    return emptyPlatformOverview("fallback");
  }
}
