// Ω5P PR-04 — Perfis Normativos (parametrização nacional, ESTUDO §9). Prazos federais, modelo/teto de diária e
// exigências de liberação por convênio público / contrato privado. Consome o módulo backend `jurisdiction` (PR-02).
// Neutralidade white-label: "perfil normativo / convênio público / contrato privado / autoridade solicitante",
// NUNCA termo técnico ("tenant") nem público-alvo. §allowlist: tenant_id NUNCA é dado renderizado.

export type ProfileScope = "PUBLIC_AGREEMENT" | "PRIVATE_CONTRACT";
export type DailyModel = "ROLLING_24H" | "CALENDAR";
export type DailyCap = "SIX_MONTHS" | "THIRTY_DAYS_LEGACY" | "UNLIMITED";

// Checklist de liberação (CTB 271 §1º / Res. 1025 arts. 23-24). Coluna nasce vazia (D-Ω5P-JUR-04).
export type ReleaseRequirement = {
  readonly code: string;
  readonly label: string;
  readonly required: boolean;
};

// Item da lista (o backend expõe um subconjunto na listagem).
export type ProfileItem = {
  readonly id: string;
  readonly name: string;
  readonly scope: ProfileScope;
  readonly scopeLabel: string;
  readonly dailyModel: DailyModel;
  readonly dailyCap: DailyCap;
  readonly dailyCapLabel: string;
  readonly active: boolean;
  readonly createdAt: string;
};

// Detalhe completo (usado no formulário de edição — prazos + exigências).
export type ProfileDetail = ProfileItem & {
  readonly ownerNotifDays: number;
  readonly noticeEdictDay: number;
  readonly auctionEligibleDay: number;
  readonly auctionEdictBusinessDays: number;
  readonly dailyModelLabel: string;
  readonly releaseRequirements: ReleaseRequirement[];
  readonly notes: string | null;
};

// Defaults federais devolvidos por GET /jurisdiction-defaults?scope= (pré-preenchem um perfil NOVO).
export type ProfileDefaults = {
  readonly scope: ProfileScope;
  readonly scopeLabel: string;
  readonly ownerNotifDays: number;
  readonly noticeEdictDay: number;
  readonly auctionEligibleDay: number;
  readonly auctionEdictBusinessDays: number;
  readonly dailyModel: DailyModel;
  readonly dailyModelLabel: string;
  readonly dailyCap: DailyCap;
  readonly dailyCapLabel: string;
};

export type ProfilesPagination = {
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
};

export type ProfilesSource = "api" | "mock" | "fallback";

export type ProfilesData = {
  readonly items: ProfileItem[];
  readonly pagination: ProfilesPagination;
  readonly source: ProfilesSource;
  readonly fallbackReason?: string;
};

export type ProfileActiveFilter = "all" | "active" | "inactive";
export type ProfileScopeFilter = "all" | ProfileScope;

export type ProfilesFilters = {
  readonly search: string;
  readonly isActive: ProfileActiveFilter;
  readonly limit?: number;
};

export type ProfilesApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

// Nome = chave natural (409 JURISDICTION_CONFLICT → msg PT-BR). Prazos/modelo/teto herdam o default do escopo
// quando omitidos (o backend aplica resolveDefaults).
export type ProfileCreatePayload = {
  readonly name: string;
  readonly scope: ProfileScope;
  readonly ownerNotifDays?: number;
  readonly noticeEdictDay?: number;
  readonly auctionEligibleDay?: number;
  readonly auctionEdictBusinessDays?: number;
  readonly dailyModel?: DailyModel;
  readonly dailyCap?: DailyCap;
  readonly releaseRequirements?: ReleaseRequirement[];
  readonly notes?: string;
};

// Nome é chave natural IMUTÁVEL: fica FORA do payload de edição (input desabilitado — lição veto B2).
export type ProfileUpdatePayload = {
  readonly scope?: ProfileScope;
  readonly ownerNotifDays?: number;
  readonly noticeEdictDay?: number;
  readonly auctionEligibleDay?: number;
  readonly auctionEdictBusinessDays?: number;
  readonly dailyModel?: DailyModel;
  readonly dailyCap?: DailyCap;
  readonly releaseRequirements?: ReleaseRequirement[];
  readonly notes?: string;
  readonly active?: boolean;
};
