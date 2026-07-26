import { isMockMode } from "../../../config/env";
import { apiRequest } from "../../../services/api/client";
import { adaptProfileDefaultsResponse, adaptProfileDetailResponse, adaptProfilesResponse } from "./profiles.adapter";
import type {
  ProfileCreatePayload,
  ProfileDefaults,
  ProfileDetail,
  ProfileScope,
  ProfileUpdatePayload,
  ProfilesApiContext,
  ProfilesData,
  ProfilesFilters,
  ReleaseRequirement,
} from "./profiles.types";

const EMPTY_PAGINATION = { limit: 20, offset: 0, total: 0 } as const;

// Baseline federal LOCAL — a norma federal (pública) escrita uma vez, espelho de jurisdiction.defaults.ts do backend.
// NÃO é dado do tenant: é o pré-preenchimento honesto do formulário quando o endpoint não está disponível (mock/erro).
// Fonte da verdade em runtime segue o GET /jurisdiction-defaults; este é só fallback determinístico.
const LOCAL_FEDERAL_DEFAULTS: ProfileDefaults = {
  scope: "PUBLIC_AGREEMENT",
  scopeLabel: "Convênio público",
  ownerNotifDays: 10, // Res. 1025 art. 15
  noticeEdictDay: 30, // Res. 1025 art. 26
  auctionEligibleDay: 60, // CTB 328 / Res. 1025 art. 25
  auctionEdictBusinessDays: 15, // Lei 14.133/2021
  dailyModel: "ROLLING_24H", // Res. 1025 art. 21 §1º
  dailyModelLabel: "24 horas corridas",
  dailyCap: "SIX_MONTHS", // CTB 271 §10
  dailyCapLabel: "6 meses (art. 271 §10)",
};

// Baseline SUGERIDO de checklist de liberação (CTB 271 §1º / Res. 1025 arts. 23-24). O perfil nasce SEM exigências;
// a UI oferta este baseline ("Usar baseline federal") — não aplica automático (D-Ω5P-JUR-04).
export const FEDERAL_RELEASE_REQUIREMENTS: readonly ReleaseRequirement[] = [
  { code: "OWNER_ID", label: "Documento de identificação de quem retira", required: true },
  { code: "OWNERSHIP_PROOF", label: "Comprovante de propriedade / autorização do proprietário", required: true },
  { code: "DEBTS_SETTLED", label: "Quitação de multas, taxas de remoção e estada (ou dispensa fundamentada)", required: true },
  { code: "AUTHORITY_RELEASE", label: "Autorização de liberação do órgão/autoridade solicitante", required: true },
];

export function resolveLocalDefaults(scope: ProfileScope): ProfileDefaults {
  if (scope === "PRIVATE_CONTRACT") {
    return {
      ...LOCAL_FEDERAL_DEFAULTS,
      scope,
      scopeLabel: "Contrato privado",
      dailyCap: "UNLIMITED",
      dailyCapLabel: "Ilimitado (contratual)",
    };
  }
  return { ...LOCAL_FEDERAL_DEFAULTS };
}

// D-007: nunca fabricar linhas. Modo mock → dataset vazio; erro real → fallback vazio.
export async function listProfilesFromApi(context: ProfilesApiContext, params: Partial<ProfilesFilters> = {}): Promise<ProfilesData> {
  if (isMockMode()) {
    return { items: [], pagination: { ...EMPTY_PAGINATION }, source: "mock" };
  }

  try {
    const response = await apiRequest<unknown>(`/jurisdiction-profiles${buildQuery(params)}`, context);
    return adaptProfilesResponse(response, "api");
  } catch {
    return {
      items: [],
      pagination: { ...EMPTY_PAGINATION },
      source: "fallback",
      fallbackReason: "Não foi possível consultar os Perfis Normativos.",
    };
  }
}

export async function getProfile(context: ProfilesApiContext, profileId: string): Promise<ProfileDetail | null> {
  const response = await apiRequest<unknown>(`/jurisdiction-profiles/${profileId}`, context);
  return adaptProfileDetailResponse(response);
}

export async function createProfile(context: ProfilesApiContext, payload: ProfileCreatePayload): Promise<ProfileDetail | null> {
  const response = await apiRequest<unknown>("/jurisdiction-profiles", { ...context, method: "POST", body: payload });
  return adaptProfileDetailResponse(response);
}

export async function updateProfile(context: ProfilesApiContext, profileId: string, patch: ProfileUpdatePayload): Promise<ProfileDetail | null> {
  const response = await apiRequest<unknown>(`/jurisdiction-profiles/${profileId}`, { ...context, method: "PATCH", body: patch });
  return adaptProfileDetailResponse(response);
}

// Pré-preenchimento do formulário de um perfil NOVO — consome GET /jurisdiction-defaults?scope=. Mock/erro →
// baseline federal LOCAL (determinístico; não é dado de tenant).
export async function fetchJurisdictionDefaults(context: ProfilesApiContext, scope: ProfileScope): Promise<ProfileDefaults> {
  if (isMockMode()) return resolveLocalDefaults(scope);
  try {
    const response = await apiRequest<unknown>(`/jurisdiction-defaults?scope=${encodeURIComponent(scope)}`, context);
    return adaptProfileDefaultsResponse(response) ?? resolveLocalDefaults(scope);
  } catch {
    return resolveLocalDefaults(scope);
  }
}

function buildQuery(params: Partial<ProfilesFilters>): string {
  const query = new URLSearchParams();
  const search = params.search?.trim();
  if (search) query.set("search", search);
  if (params.isActive === "active") query.set("active", "true");
  if (params.isActive === "inactive") query.set("active", "false");
  if (params.limit && Number.isFinite(params.limit)) query.set("limit", String(params.limit));
  return query.size ? `?${query.toString()}` : "";
}
