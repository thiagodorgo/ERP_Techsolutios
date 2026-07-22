import type { Permission, Role } from "../core-saas/permissions/catalog.js";

/** F5 (Danos) — severity domain (validated at the service layer). */
export const DAMAGE_GRAVIDADES = ["leve", "moderada", "grave"] as const;
export type DamageGravidade = (typeof DAMAGE_GRAVIDADES)[number];

/** F5 (Danos) — linear lifecycle: registrado -> em_tratativa -> resolvido. */
export const DAMAGE_STATUSES = ["registrado", "em_tratativa", "resolvido"] as const;
export type DamageStatus = (typeof DAMAGE_STATUSES)[number];

export const DEFAULT_DAMAGE_STATUS: DamageStatus = "registrado";

/**
 * Ω4C PR-09 (D-Ω4C-DANO-MODEL) — "Tipo de Dano" do AutEM (Informações Gerais): enum-app em INGLÊS com
 * labels PT-BR na fronteira (INTERNO/EXTERNO/AMBOS). SEM CHECK no banco — validado na app.
 */
export const DAMAGE_TIPOS = ["internal", "external", "both"] as const;
export type DamageTipo = (typeof DAMAGE_TIPOS)[number];

/**
 * Ω4C PR-09 — "disposição" DERIVADA do próprio dano (espelha a Multa): `statement` quando há profissional
 * responsável atribuído; `none` caso contrário. O valor efetivamente descontado (parcelas/settled) vive no
 * extrato e aparece no bloco `statementDebit` do DETALHE (não na lista, que só carrega a coluna).
 */
export const DAMAGE_DISPOSITIONS = ["statement", "none"] as const;
export type DamageDisposition = (typeof DAMAGE_DISPOSITIONS)[number];

export type JsonRecord = Record<string, unknown>;

export type DamageActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

/** Optional point on the vehicle figure attached to a photo (x/y in [0,1] + note). */
export type DamageMarker = {
  readonly x: number;
  readonly y: number;
  readonly description?: string;
};

export type Damage = {
  readonly id: string;
  readonly tenantId: string;
  readonly vehicleId: string;
  readonly workOrderId?: string;
  /**
   * Ω4C PR-09 — PROFISSIONAL RESPONSÁVEL (um operator_profile). Quando setado E há valor a cobrar, o
   * desconto vira débito parcelado no extrato desse profissional (RN-EXT-01). Ausente = sem responsável.
   */
  readonly responsibleOperatorProfileId?: string;
  readonly data: Date;
  readonly gravidade: DamageGravidade;
  readonly descricao: string;
  readonly status: DamageStatus;
  // Ω4C PR-09 — campos descritivos (display/impressão). `analiseInterna` NUNCA é impressa (ANALISE:126).
  readonly tipo?: DamageTipo;
  readonly origem?: string;
  readonly objeto?: string;
  readonly identificacaoObjeto?: string;
  readonly analiseInterna?: string;
  readonly custoEstimado?: number;
  readonly custoReal?: number;
  readonly isActive: boolean;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

/**
 * Ω4C PR-09 (D-Ω4C-DANO-MONEY) — resumo DERIVADO do débito ativo do dano no extrato (§2.8: agregado, sem
 * parcela individual/CNH). É montado a partir de `findActiveBySource(damage, damageId)` — NUNCA persistido
 * (o dinheiro cobrado é single-source-of-truth no extrato). `null` = sem débito ativo (identificação-só/
 * empresa absorve). Alimenta o badge "lançado no extrato" e a trava do front.
 */
export type DamageStatementDebit = {
  readonly totalAmount: number;
  readonly installmentTotal: number;
  readonly firstDueDate: Date;
  readonly hasSettled: boolean;
};

/**
 * A damage photo. The storage internals (`fileUrl`, `storageProvider`,
 * `storageKey`, `checksumSha256`) live on the domain model but are NEVER exposed
 * by the DTO (allowlist 2.8): the public surface is `id`, `fileName`, `mimeType`,
 * `sizeBytes`, `createdAt`, an optional `marker`, and an authenticated download
 * path.
 */
export type DamageAttachment = {
  readonly id: string;
  readonly tenantId: string;
  readonly damageId: string;
  readonly fileUrl: string;
  readonly fileName?: string;
  readonly mimeType?: string;
  readonly sizeBytes?: number;
  readonly checksumSha256?: string;
  readonly storageProvider?: string;
  readonly storageKey?: string;
  readonly marker?: DamageMarker;
  readonly metadata: JsonRecord;
  readonly createdBy?: string;
  readonly createdAt: Date;
};

export type ListDamagesInput = {
  readonly tenantId: string;
  readonly vehicleId?: string;
  readonly workOrderId?: string;
  readonly status?: DamageStatus;
  readonly gravidade?: DamageGravidade;
  readonly isActive?: boolean;
  readonly search?: string;
  readonly limit: number;
  readonly offset: number;
};

export type ListDamagesResult = {
  readonly items: readonly Damage[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

export type CreateDamageInput = Omit<Damage, "id" | "isActive" | "createdAt" | "updatedAt"> & {
  readonly isActive?: boolean;
};

export type UpdateDamageInput = Partial<
  Pick<
    Damage,
    | "vehicleId"
    | "workOrderId"
    | "data"
    | "gravidade"
    | "descricao"
    | "status"
    | "tipo"
    | "origem"
    | "objeto"
    | "identificacaoObjeto"
    | "analiseInterna"
    | "custoEstimado"
    | "custoReal"
    | "isActive"
    | "updatedBy"
  >
> & {
  readonly tenantId: string;
  readonly damageId: string;
  // `null` = LIMPAR o profissional responsável (retira o débito do extrato); `undefined` = não muda.
  readonly responsibleOperatorProfileId?: string | null;
};

export type CreateDamageAttachmentInput = {
  readonly tenantId: string;
  readonly damageId: string;
  readonly fileUrl: string;
  readonly fileName?: string;
  readonly mimeType?: string;
  readonly sizeBytes?: number;
  readonly checksumSha256?: string;
  readonly storageProvider?: string;
  readonly storageKey?: string;
  readonly marker?: DamageMarker;
  readonly metadata: JsonRecord;
  readonly createdBy?: string;
};

export class DamageError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "DamageError";
  }
}
