import type { Permission, Role } from "../core-saas/permissions/catalog.js";
import type { DailyCap, DailyModel, ProfileScope } from "../jurisdiction/jurisdiction.types.js";

export type ChargeActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

// Ω5P PR-07 — enums em INGLÊS validados na APP (SEM CHECK de enum no banco). Labels PT-BR ficam no DTO.
// REMOVAL   = encargo-base de remoção (art. 21 §2 / CTB 271 §1º) — 1 por processo (partial-unique).
// DAILY     = diária de estada (I4, motor); period_seq = ordinal DST-imune (chave de idempotência).
// ADDITIONAL= encargo avulso (guincho especial, içamento, etc.) registrado manualmente.
// ADJUSTMENT= correção retroativa append-only (RN-DIA-05 / I2): delta COM SINAL; NUNCA UPDATE/DELETE de valor.
export const CHARGE_KINDS = ["REMOVAL", "DAILY", "ADDITIONAL", "ADJUSTMENT"] as const;
export type ChargeKind = (typeof CHARGE_KINDS)[number];

export const ACCRUAL_RUN_STATUSES = ["running", "completed", "failed"] as const;
export type AccrualRunStatus = (typeof ACCRUAL_RUN_STATUSES)[number];

// Encargo do ledger. Money = string canônica "0.00" (Decimal(12,2)); refDate = "YYYY-MM-DD" (legenda local).
export type ProcessCharge = {
  readonly id: string;
  readonly tenantId: string;
  readonly processId: string;
  readonly kind: ChargeKind;
  readonly periodSeq?: number;
  readonly refDate?: string;
  readonly description?: string;
  readonly quantity: string;
  readonly unitAmount: string;
  readonly totalAmount: string;
  readonly currency: string;
  readonly tariffId?: string;
  readonly adjustmentOfChargeId?: string;
  readonly settledAt?: Date;
  readonly settlementNote?: string;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type DailyAccrualRun = {
  readonly id: string;
  readonly tenantId: string;
  readonly runDate: string; // "YYYY-MM-DD"
  readonly status: AccrualRunStatus;
  readonly processedCount: number;
  readonly accruedCount: number;
  readonly errorCount: number;
  readonly startedAt: Date;
  readonly finishedAt?: Date;
  readonly createdAt: Date;
};

export type ListChargesInput = {
  readonly tenantId: string;
  readonly processId: string;
};

// Manual (charging:create) — REMOVAL/ADDITIONAL/ADJUSTMENT. DAILY NUNCA é criada por esta via (só pelo motor).
export type CreateManualChargeInput = {
  readonly tenantId: string;
  readonly processId: string;
  readonly kind: Exclude<ChargeKind, "DAILY">;
  readonly description?: string;
  readonly quantity: string; // canonical "0.00"
  readonly unitAmount: string; // canonical "0.00"
  readonly totalAmount: string; // = quantity × unitAmount (assinado só p/ ADJUSTMENT)
  readonly currency: string;
  readonly refDate?: string; // "YYYY-MM-DD" — ADJUSTMENT: data corrigida
  readonly adjustmentOfChargeId?: string;
  readonly actorId?: string;
  readonly occurredAt: Date;
};

// Acumulação de UMA diária faltante (motor → repo). period_seq é a chave de idempotência.
export type AccrueDailyChargeInput = {
  readonly tenantId: string;
  readonly processId: string;
  readonly periodSeq: number;
  readonly refDate: string; // "YYYY-MM-DD"
  readonly unitAmount: string; // canonical "0.00"
  readonly tariffId?: string;
  readonly currency: string;
  readonly actorId?: string;
  readonly occurredAt: Date;
};

export type AccrueDailyChargeResult = {
  readonly created: boolean;
  readonly charge?: ProcessCharge;
};

// Contexto de acumulação de um processo (juntando impound_processes + jurisdiction_profiles + yards.timezone).
// enteredAt undefined ⇒ processo ainda não entrou (t0 ausente) → nada acumula. frozenAt ⇒ T_stop.
export type AccrualContext = {
  readonly tenantId: string;
  readonly processId: string;
  readonly enteredAt?: Date;
  readonly frozenAt?: Date;
  readonly timezone: string;
  readonly scope: ProfileScope;
  readonly model: DailyModel;
  readonly cap: DailyCap;
  readonly dailyServiceCatalogId?: string;
};

export type AccrueProcessResult = {
  readonly examined: boolean; // false se o processo não tem t0 (nada a fazer)
  readonly accrued: number; // diárias criadas neste passe
  readonly errors: number; // periods bloqueados por fail-closed (sem tarifa)
};

// Memória de cálculo (RN-DIA-06) — a base fiel que a guia PDF client-side (PR-08) consome. Só READ.
export type ChargeStatementCap = {
  readonly model: DailyModel;
  readonly cap: DailyCap;
  readonly capCount: number | null; // teto em diárias (null = ilimitado)
  readonly nDue: number; // devidas pelo tempo decorrido
  readonly nAccrue: number; // efetivamente devidas (min(nDue,cap))
  readonly capReached: boolean;
};

export type ChargeStatement = {
  readonly processId: string;
  readonly currency: string;
  readonly lines: readonly ProcessCharge[];
  readonly subtotals: ReadonlyArray<{ readonly kind: ChargeKind; readonly total: string }>;
  readonly total: string;
  readonly cap?: ChargeStatementCap; // ausente se não há t0 (processo não entrou)
  readonly asOf: string; // ISO — instante da projeção (min(now, frozen_at))
  // C3 — sinaliza inconsistência OBSERVÁVEL: nº de DAILY persistidas > nAccrue projetado (congelamento retroativo /
  // queda de teto). O ledger é append-only (não estorna aqui); a reconciliação real (ADJUSTMENT de estorno ou
  // recusa de frozen_at retroativo) é REQUISITO de PR-10. Aqui apenas EXPOMOS a pendência com honestidade.
  readonly reconciliationPending: boolean;
  readonly overAccruedDailies: number; // #DAILY persistidas − nAccrue (0 quando consistente)
};

// Ω5P PR-10a (D-Ω5P-07 / F1) — QUITAÇÃO manual (registro SEM PSP) + reconciliação por ESTORNO. O settle carimba
// settled_* nas linhas exigíveis (NUNCA amount — o ledger é amount-imutável) e, na MESMA operação, ESTORNA as
// DAILYs sobre-acumuladas (ADJUSTMENT negativo append-only) e emite 1 CustodyEvent SETTLEMENT (§2.8: sem PII).
export type EstornoInstruction = {
  readonly dailyChargeId: string; // a DAILY sobre-acumulada a reconciliar (o RESÍDUO p/ zerar o líquido é computado sob lock)
  readonly currency: string; // moeda do ADJUSTMENT de estorno a postar (= a da DAILY)
};

export type SettleProcessInput = {
  readonly tenantId: string;
  readonly processId: string;
  readonly estornos: readonly EstornoInstruction[]; // DAILYs a estornar (service-computed; idempotente no repo)
  readonly note?: string;
  readonly actorId?: string;
  readonly occurredAt: Date;
};

export type SettleResult = {
  readonly settledTotal: string; // Σ net do ledger APÓS o estorno (canônico "0.00")
  readonly settledCount: number; // linhas exigíveis carimbadas settled_* neste passe
  readonly estornoCount: number; // ADJUSTMENTs de estorno criados neste passe (0 = já reconciliado)
  readonly chargeIds: readonly string[]; // ids exigíveis quitados (referências §2.8 no payload SETTLEMENT)
};

// Estado do ledger para o GATE DE LIBERAÇÃO (I5) — computado pelo charging (dono de process_charges) e consumido
// pelo release.service. debtsSettled/reconciliationConsistent alimentam as guardas I5; overAccruedDailyIds guia o
// estorno do settle; persistedDailyCount/nDueNow alimentam o freeze-retroactive do salto A.
export type ReleaseChargeState = {
  readonly debtsSettled: boolean; // nenhuma linha exigível (REMOVAL/DAILY/ADDITIONAL) com settled_at NULL
  readonly reconciliationConsistent: boolean; // toda DAILY sobre-acumulada tem estorno ADJUSTMENT
  readonly settledTotal: string; // Σ net do ledger (canônico "0.00")
  readonly overAccruedDailyIds: readonly string[]; // DAILYs além do teto (asOf=min(now,frozen_at)) que EXIGEM estorno
  readonly persistedDailyCount: number; // nº de DAILY no ledger
  readonly nDueNow: number; // nDue (uncapped, time-based) AT now — freeze-retroactive se < persistedDailyCount
};

export class ChargeError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "ChargeError";
  }
}
