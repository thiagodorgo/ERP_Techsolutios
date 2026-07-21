// Detalhe REAL de UMA organização (cross-tenant, platform_admin). Só metadados da própria org +
// catálogo de módulos (com flag habilitado/não) + os usuários DELA. NÃO fabrica MRR/uptime/health —
// não têm fonte, então são OMITIDOS (§2.8). O `id` é o da própria org (usado pela rota /detail).
export type PlatformTenantDetailModule = {
  readonly key: string;
  readonly label: string;
  readonly enabled: boolean;
};

// O domínio carrega os papéis TÉCNICOS do usuário; o rótulo PT-BR (§3) é derivado só na fronteira
// (DTO). PII (nome/email) é by-design: o platform_admin administra a org — nunca secret/token/path.
export type PlatformTenantDetailUser = {
  readonly name: string;
  readonly email: string;
  readonly roles: readonly string[];
  readonly status: string;
};

export type PlatformTenantDetail = {
  readonly id: string;
  readonly name: string;
  readonly slug?: string;
  readonly status: string;
  readonly createdAt: string;
  // Nº de módulos HABILITADOS da org (mesma semântica de `moduleCount` do overview). `modules` traz o
  // catálogo completo com a flag `enabled` — moduleCount = quantos estão habilitados.
  readonly moduleCount: number;
  readonly modules: readonly PlatformTenantDetailModule[];
  readonly users: readonly PlatformTenantDetailUser[];
};
