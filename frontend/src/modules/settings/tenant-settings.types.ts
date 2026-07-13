// Ω2-e — Parâmetros da Organização (key-value, multi-tenant). Tela DATA-BACKED: os PARÂMETROS e
// VALORES vêm de `GET /api/v1/tenant-settings` — NUNCA de mock/hardcode (D-007: modo mock devolve
// lista vazia honesta; erro real → fallback vazio). Categoria e descrição são opcionais no
// contrato: a UI agrupa por `category` e usa um MAPA de apresentação (título/ícone PT-BR) só para
// decorar, jamais como fonte de dados.

export type TenantSettingItem = {
  readonly key: string;
  // Valor sempre normalizado para string para edição inline; o backend guarda o valor cru.
  readonly value: string;
  readonly category: string | null;
  readonly description: string | null;
  readonly updatedAt: string | null;
};

export type TenantSettingsSource = "api" | "mock" | "fallback";

export type TenantSettingsData = {
  readonly items: TenantSettingItem[];
  readonly source: TenantSettingsSource;
  readonly fallbackReason?: string;
};

// Grupo de parâmetros por categoria. O `null` do contrato cai num grupo "sem categoria".
export type TenantSettingsGroup = {
  readonly category: string | null;
  readonly title: string;
  readonly order: number;
  readonly items: TenantSettingItem[];
};

export type TenantSettingsApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

// Upsert (PUT /:key) — apenas o valor é obrigatório; categoria/descrição opcionais.
export type TenantSettingUpsertPayload = {
  readonly value: string;
  readonly category?: string;
  readonly description?: string;
};
