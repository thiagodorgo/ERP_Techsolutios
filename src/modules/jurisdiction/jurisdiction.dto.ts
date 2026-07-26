import type {
  DailyCap,
  DailyModel,
  JurisdictionProfile,
  ListJurisdictionProfileResult,
  ProfileScope,
} from "./jurisdiction.types.js";

// Labels PT-BR (neutralidade white-label: "convênio público / contrato privado / perfil normativo", nunca termo
// de público-alvo).
const SCOPE_LABELS: Record<ProfileScope, string> = {
  PUBLIC_AGREEMENT: "Convênio público",
  PRIVATE_CONTRACT: "Contrato privado",
};

const DAILY_MODEL_LABELS: Record<DailyModel, string> = {
  ROLLING_24H: "24 horas corridas",
  CALENDAR: "Dia-calendário",
};

const DAILY_CAP_LABELS: Record<DailyCap, string> = {
  SIX_MONTHS: "6 meses (art. 271 §10)",
  THIRTY_DAYS_LEGACY: "30 diárias (Tema 124)",
  UNLIMITED: "Ilimitado (contratual)",
};

// §allowlist: tenant_id NUNCA é exposto (resolvido pelo ator autenticado).
export function toJurisdictionProfileDto(profile: JurisdictionProfile) {
  return {
    id: profile.id,
    name: profile.name,
    scope: profile.scope,
    scopeLabel: SCOPE_LABELS[profile.scope],
    ownerNotifDays: profile.ownerNotifDays,
    noticeEdictDay: profile.noticeEdictDay,
    auctionEligibleDay: profile.auctionEligibleDay,
    auctionEdictBusinessDays: profile.auctionEdictBusinessDays,
    dailyModel: profile.dailyModel,
    dailyModelLabel: DAILY_MODEL_LABELS[profile.dailyModel],
    dailyCap: profile.dailyCap,
    dailyCapLabel: DAILY_CAP_LABELS[profile.dailyCap],
    releaseRequirements: profile.releaseRequirements.map((requirement) => ({
      code: requirement.code,
      label: requirement.label,
      required: requirement.required,
    })),
    notes: profile.notes ?? null,
    active: profile.active,
    createdBy: profile.createdBy ?? null,
    updatedBy: profile.updatedBy ?? null,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

export function toJurisdictionProfileListDto(result: ListJurisdictionProfileResult) {
  return {
    items: result.items.map((profile) => ({
      id: profile.id,
      name: profile.name,
      scope: profile.scope,
      scopeLabel: SCOPE_LABELS[profile.scope],
      dailyModel: profile.dailyModel,
      dailyCap: profile.dailyCap,
      dailyCapLabel: DAILY_CAP_LABELS[profile.dailyCap],
      active: profile.active,
      createdAt: profile.createdAt.toISOString(),
    })),
    pagination: {
      limit: result.limit,
      offset: result.offset,
      total: result.total,
    },
  };
}

// GET /jurisdiction-defaults — o que a UI (PR-04) chama para pré-preencher o formulário de um novo perfil.
export function toJurisdictionDefaultsDto(
  scope: ProfileScope,
  defaults: {
    readonly ownerNotifDays: number;
    readonly noticeEdictDay: number;
    readonly auctionEligibleDay: number;
    readonly auctionEdictBusinessDays: number;
    readonly dailyModel: DailyModel;
    readonly dailyCap: DailyCap;
  },
) {
  return {
    scope,
    scopeLabel: SCOPE_LABELS[scope],
    ownerNotifDays: defaults.ownerNotifDays,
    noticeEdictDay: defaults.noticeEdictDay,
    auctionEligibleDay: defaults.auctionEligibleDay,
    auctionEdictBusinessDays: defaults.auctionEdictBusinessDays,
    dailyModel: defaults.dailyModel,
    dailyModelLabel: DAILY_MODEL_LABELS[defaults.dailyModel],
    dailyCap: defaults.dailyCap,
    dailyCapLabel: DAILY_CAP_LABELS[defaults.dailyCap],
  };
}
