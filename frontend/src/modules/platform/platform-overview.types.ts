// PR-SCALE-5a — espelho do DTO de GET /api/v1/platform/overview (gate backend `platform:tenants:read`).
// A tela "Visão Geral da Plataforma" consome ESTE modelo; o front NUNCA fabrica número (D-007). O backend
// NÃO envia MRR / uptime / apiCalls / storage (sem fonte real) — então o modelo TAMBÉM não os tem: não há
// campo onde pendurar um valor inventado. §2.8: o `id` da organização serve só para o link de rota, nunca
// é exibido como conteúdo. `source` distingue api/mock/fallback e `forbidden` marca o 403 do gate para a
// UI mostrar "acesso não permitido" honesto — sem inventar organização nem número.

export type PlatformOverviewSource = "api" | "mock" | "fallback";

// Projeção segura para a UI: só o que a tabela mostra. Sem MRR/plano/uptime (não existem no DTO real).
export type PlatformOverviewOrg = {
  readonly id: string; // opaco; usado apenas para o link de rota (§2.8), nunca exibido cru
  readonly name: string;
  readonly slug?: string;
  readonly status: string;
  readonly moduleCount: number;
  readonly userCount: number;
  readonly createdAt: string; // ISO original do backend; a UI formata (dd/mm/aaaa)
};

export type PlatformOverviewData = {
  readonly activeOrgs: number;
  readonly totalOrgs: number;
  readonly totalUsers: number;
  readonly orgs: readonly PlatformOverviewOrg[];
  readonly source: PlatformOverviewSource;
  readonly forbidden: boolean;
};

export type PlatformOverviewApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

// Visão VAZIA honesta (mock/erro/403): zero contagem, zero organização — nada fabricado (D-007). A UI
// mostra o estado honesto correspondente ao `source`/`forbidden`.
export function emptyPlatformOverview(source: PlatformOverviewSource): PlatformOverviewData {
  return { activeOrgs: 0, totalOrgs: 0, totalUsers: 0, orgs: [], source, forbidden: false };
}
