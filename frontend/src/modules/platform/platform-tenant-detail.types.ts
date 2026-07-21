// PR-SCALE-5c — espelho do DTO de GET /api/v1/platform/tenants/:tenantId/detail (gate backend
// `platform:tenants:read`). A tela "Detalhe da Organização" consome ESTE modelo; o front NUNCA fabrica
// número (D-007). O backend NÃO envia MRR / uptime / saúde do sistema / endereço (sem fonte real) — então
// o modelo TAMBÉM não os tem: não há campo onde pendurar um valor inventado. §2.8: o `id` da organização
// serve só para a rota/fetch, nunca é exibido como conteúdo. `source` distingue api/mock/fallback;
// `forbidden` marca o 403 do gate e `notFound` marca o 404 (organização inexistente) — a UI mostra o
// estado honesto correspondente, sem inventar organização nem número.

export type PlatformTenantDetailSource = "api" | "mock" | "fallback";

// Projeção segura de UM módulo do catálogo da org: rótulo + flag habilitado/não. Sem campo extra.
export type PlatformTenantDetailModule = {
  readonly key: string; // opaco; usado só como key de lista, nunca exibido cru
  readonly label: string;
  readonly enabled: boolean;
};

// Projeção segura de UM usuário da org. Nome/e-mail são PII by-design do platform_admin (tela
// platform-only) — nunca token/secret/path (§2.8). roleLabel já vem PT-BR do backend (§3).
export type PlatformTenantDetailUser = {
  readonly name: string;
  readonly email: string;
  readonly roleLabel?: string;
  readonly status: string;
};

// Projeção segura para a UI: só o que a tela mostra. Sem MRR/uptime/saúde/endereço (não existem no DTO
// real). `id` só alimenta rota/fetch (§2.8), nunca é exibido.
export type PlatformTenantDetailInfo = {
  readonly id: string;
  readonly name: string;
  readonly slug?: string;
  readonly status: string;
  readonly createdAt: string; // ISO original do backend; a UI formata (dd/mm/aaaa)
  readonly moduleCount: number; // quantos módulos estão habilitados
  readonly modules: readonly PlatformTenantDetailModule[];
  readonly users: readonly PlatformTenantDetailUser[];
};

export type PlatformTenantDetailData = {
  readonly detail: PlatformTenantDetailInfo | null;
  readonly source: PlatformTenantDetailSource;
  readonly forbidden: boolean;
  readonly notFound: boolean;
};

export type PlatformTenantDetailApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

// Estado VAZIO honesto (mock/erro/403/404): nenhum detalhe — nada fabricado (D-007). A UI mostra o estado
// honesto correspondente ao `source`/`forbidden`/`notFound`.
export function emptyTenantDetail(source: PlatformTenantDetailSource): PlatformTenantDetailData {
  return { detail: null, source, forbidden: false, notFound: false };
}
