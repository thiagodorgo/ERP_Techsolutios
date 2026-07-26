import type { Permission, Role } from "../core-saas/permissions/catalog.js";

export type JurisdictionActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

// Ω5P PR-02 — enums em INGLÊS validados na APP (sem CHECK de enum no banco). Labels PT-BR ficam no DTO.
export const PROFILE_SCOPES = ["PUBLIC_AGREEMENT", "PRIVATE_CONTRACT"] as const;
export type ProfileScope = (typeof PROFILE_SCOPES)[number];

export const DAILY_MODELS = ["ROLLING_24H", "CALENDAR"] as const;
export type DailyModel = (typeof DAILY_MODELS)[number];

export const DAILY_CAPS = ["SIX_MONTHS", "THIRTY_DAYS_LEGACY", "UNLIMITED"] as const;
export type DailyCap = (typeof DAILY_CAPS)[number];

// Item do checklist de liberação (CTB art. 271 §1º / Res. 1025 arts. 23-24) — shape app-validado.
export type ReleaseRequirement = {
  readonly code: string;
  readonly label: string;
  readonly required: boolean;
};

// Perfil normativo — parametrização nacional (prazos legais, diária, teto, exigências) por natureza.
export type JurisdictionProfile = {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly scope: ProfileScope;
  readonly ownerNotifDays: number;
  readonly noticeEdictDay: number;
  readonly auctionEligibleDay: number;
  readonly auctionEdictBusinessDays: number;
  readonly dailyModel: DailyModel;
  readonly dailyCap: DailyCap;
  readonly releaseRequirements: readonly ReleaseRequirement[];
  readonly notes?: string;
  readonly active: boolean;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CreateJurisdictionProfileInput = {
  readonly tenantId: string;
  readonly name: string;
  readonly scope: ProfileScope;
  readonly ownerNotifDays: number;
  readonly noticeEdictDay: number;
  readonly auctionEligibleDay: number;
  readonly auctionEdictBusinessDays: number;
  readonly dailyModel: DailyModel;
  readonly dailyCap: DailyCap;
  readonly releaseRequirements: readonly ReleaseRequirement[];
  readonly notes?: string;
  readonly active?: boolean;
  readonly createdBy?: string;
  readonly updatedBy?: string;
};

export type UpdateJurisdictionProfileInput = {
  readonly tenantId: string;
  readonly profileId: string;
  readonly name?: string;
  readonly scope?: ProfileScope;
  readonly ownerNotifDays?: number;
  readonly noticeEdictDay?: number;
  readonly auctionEligibleDay?: number;
  readonly auctionEdictBusinessDays?: number;
  readonly dailyModel?: DailyModel;
  readonly dailyCap?: DailyCap;
  readonly releaseRequirements?: readonly ReleaseRequirement[];
  readonly notes?: string | null;
  readonly active?: boolean;
  readonly updatedBy?: string;
};

export type ListJurisdictionProfileInput = {
  readonly tenantId: string;
  readonly scope?: ProfileScope;
  readonly active?: boolean;
  readonly search?: string;
  readonly limit: number;
  readonly offset: number;
};

export type ListJurisdictionProfileResult = {
  readonly items: readonly JurisdictionProfile[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

export class JurisdictionError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "JurisdictionError";
  }
}
