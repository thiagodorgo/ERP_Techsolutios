import { randomUUID } from "node:crypto";

import type { CanonicalValue, CustodyEventType } from "../impound/impound.types.js";
import type { ImpoundRepository } from "../impound/impound.repository.js";
import type { DailyCap, DailyModel, ProfileScope } from "../jurisdiction/jurisdiction.types.js";
import {
  ChargeError,
  type AccrualContext,
  type AccrueDailyChargeInput,
  type AccrueDailyChargeResult,
  type AccrualRunStatus,
  type CreateManualChargeInput,
  type DailyAccrualRun,
  type ListChargesInput,
  type ProcessCharge,
} from "./charge.types.js";

export type StartRunInput = {
  readonly tenantId: string;
  readonly runDate: string; // "YYYY-MM-DD"
};

export type FinishRunInput = {
  readonly tenantId: string;
  readonly runId: string;
  readonly status: Exclude<AccrualRunStatus, "running">;
  readonly processedCount: number;
  readonly accruedCount: number;
  readonly errorCount: number;
};

export interface ChargeRepository {
  listCharges(input: ListChargesInput): Promise<readonly ProcessCharge[]>;
  // Maior period_seq de DAILY já acumulado (0 se nenhum) — as diárias são contíguas 1..k (catch-up a partir de k+1).
  maxDailyPeriodSeq(tenantId: string, processId: string): Promise<number>;
  // Manual (charging:create): REMOVAL/ADDITIONAL/ADJUSTMENT + append do CustodyEvent na MESMA tx.
  createManualCharge(input: CreateManualChargeInput): Promise<ProcessCharge>;
  // Acumula UMA diária faltante (motor): idempotente pelo period_seq sob lock do processo; +CustodyEvent CHARGE_ACCRUAL.
  accrueDailyCharge(input: AccrueDailyChargeInput): Promise<AccrueDailyChargeResult>;
  // Contexto de acumulação (impound_processes + jurisdiction_profiles + yards.timezone). undefined = processo inexistente.
  loadAccrualContext(tenantId: string, processId: string): Promise<AccrualContext | undefined>;
  // Candidatos do SWEEP: processos com t0 (entered_at) e AINDA acumulando (frozen_at NULL). Prisma-only (o sweep
  // é gated por persistence=prisma); o InMemory devolve [] (os testes InMemory chamam accrueProcess direto).
  listAccrualCandidates(tenantId: string, limit: number): Promise<readonly string[]>;
  // Bookkeeping do sweep.
  startRun(input: StartRunInput): Promise<DailyAccrualRun>;
  finishRun(input: FinishRunInput): Promise<void>;
  reset?(): void;
}

// Payload canônico do CustodyEvent do encargo (I2). Money = STRING (exigência do canonicalJson); period/null OK.
export function buildChargeEventPayload(charge: ProcessCharge): CanonicalValue {
  return {
    chargeId: charge.id,
    kind: charge.kind,
    periodSeq: charge.periodSeq ?? null,
    refDate: charge.refDate ?? null,
    quantity: charge.quantity,
    unitAmount: charge.unitAmount,
    totalAmount: charge.totalAmount,
    currency: charge.currency,
    adjustmentOf: charge.adjustmentOfChargeId ?? null,
  };
}

// ADJUSTMENT encadeia um evento ADJUSTMENT (correção retroativa I2); os demais encargos, CHARGE_ACCRUAL.
export function chargeEventType(kind: ProcessCharge["kind"]): CustodyEventType {
  return kind === "ADJUSTMENT" ? "ADJUSTMENT" : "CHARGE_ACCRUAL";
}

type StoredProfile = {
  readonly scope: ProfileScope;
  readonly model: DailyModel;
  readonly cap: DailyCap;
  readonly dailyServiceCatalogId?: string;
};

// InMemory (espelha a lógica do Prisma repo 1:1; a corrida/idempotência REAL roda no teste DB-gated). Compõe o
// impound repo de MEMÓRIA para (a) ler o processo (t0/frozen/yard/profile) e (b) ENCADEAR o CustodyEvent na cadeia
// existente (reusa impound.appendEvent — NÃO duplica a lógica probatória). Perfis/timezone são injetados por teste.
export class InMemoryChargeRepository implements ChargeRepository {
  private readonly charges: ProcessCharge[] = [];
  private readonly runs: DailyAccrualRun[] = [];
  private readonly profiles = new Map<string, StoredProfile>();
  private readonly timezones = new Map<string, string>();

  constructor(private readonly impound: Pick<ImpoundRepository, "appendEvent" | "findProcessById">) {}

  async listCharges(input: ListChargesInput): Promise<readonly ProcessCharge[]> {
    return this.charges
      .filter((charge) => charge.tenantId === input.tenantId && charge.processId === input.processId)
      .sort((left, right) => sortCharge(left, right));
  }

  async maxDailyPeriodSeq(tenantId: string, processId: string): Promise<number> {
    return this.charges
      .filter((c) => c.tenantId === tenantId && c.processId === processId && c.kind === "DAILY")
      .reduce((max, c) => Math.max(max, c.periodSeq ?? 0), 0);
  }

  async createManualCharge(input: CreateManualChargeInput): Promise<ProcessCharge> {
    const process = await this.impound.findProcessById(input.tenantId, input.processId);
    if (!process) {
      throw new ChargeError(404, "CHARGE_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    const now = new Date();
    const charge: ProcessCharge = {
      id: randomUUID(),
      tenantId: input.tenantId,
      processId: input.processId,
      kind: input.kind,
      refDate: input.refDate,
      description: input.description,
      quantity: input.quantity,
      unitAmount: input.unitAmount,
      totalAmount: input.totalAmount,
      currency: input.currency,
      adjustmentOfChargeId: input.adjustmentOfChargeId,
      createdBy: input.actorId,
      updatedBy: input.actorId,
      createdAt: now,
      updatedAt: now,
    };
    // REMOVAL só 1 por processo (espelha o partial-unique process_charges_removal_once_key).
    if (charge.kind === "REMOVAL") {
      const clash = this.charges.some((c) => c.tenantId === charge.tenantId && c.processId === charge.processId && c.kind === "REMOVAL");
      if (clash) {
        throw new ChargeError(409, "CHARGE_CONFLICT", "removal_already_charged", "A removal charge already exists for this process.");
      }
    }
    this.charges.push(charge);
    await this.impound.appendEvent({
      tenantId: input.tenantId,
      processId: input.processId,
      event: { type: chargeEventType(charge.kind), payload: buildChargeEventPayload(charge), occurredAt: input.occurredAt, actorId: input.actorId },
    });
    return charge;
  }

  async accrueDailyCharge(input: AccrueDailyChargeInput): Promise<AccrueDailyChargeResult> {
    const process = await this.impound.findProcessById(input.tenantId, input.processId);
    if (!process) {
      throw new ChargeError(404, "CHARGE_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    // Idempotência pelo period_seq (espelha o partial-unique WHERE kind='DAILY') — 2ª acumulação = no-op.
    const exists = this.charges.some(
      (c) => c.tenantId === input.tenantId && c.processId === input.processId && c.kind === "DAILY" && c.periodSeq === input.periodSeq,
    );
    if (exists) return { created: false };
    const now = new Date();
    const charge: ProcessCharge = {
      id: randomUUID(),
      tenantId: input.tenantId,
      processId: input.processId,
      kind: "DAILY",
      periodSeq: input.periodSeq,
      refDate: input.refDate,
      quantity: "1.00",
      unitAmount: input.unitAmount,
      totalAmount: input.unitAmount, // quantity=1 ⇒ total = unit
      currency: input.currency,
      tariffId: input.tariffId,
      createdBy: input.actorId,
      updatedBy: input.actorId,
      createdAt: now,
      updatedAt: now,
    };
    this.charges.push(charge);
    await this.impound.appendEvent({
      tenantId: input.tenantId,
      processId: input.processId,
      event: { type: "CHARGE_ACCRUAL", payload: buildChargeEventPayload(charge), occurredAt: input.occurredAt, actorId: input.actorId },
    });
    return { created: true, charge };
  }

  async loadAccrualContext(tenantId: string, processId: string): Promise<AccrualContext | undefined> {
    const process = await this.impound.findProcessById(tenantId, processId);
    if (!process) return undefined;
    const profile = this.profiles.get(`${tenantId}:${process.profileId}`) ?? {
      scope: "PUBLIC_AGREEMENT" as ProfileScope,
      model: "ROLLING_24H" as DailyModel,
      cap: "SIX_MONTHS" as DailyCap,
    };
    return {
      tenantId,
      processId,
      enteredAt: process.enteredAt,
      frozenAt: process.frozenAt,
      timezone: this.timezones.get(`${tenantId}:${processId}`) ?? "America/Sao_Paulo",
      scope: profile.scope,
      model: profile.model,
      cap: profile.cap,
      dailyServiceCatalogId: profile.dailyServiceCatalogId,
    };
  }

  async listAccrualCandidates(): Promise<readonly string[]> {
    // O sweep é PRISMA-only (gated por persistence=prisma); os testes InMemory exercitam accrueProcess direto.
    return [];
  }

  async startRun(input: StartRunInput): Promise<DailyAccrualRun> {
    const now = new Date();
    const run: DailyAccrualRun = {
      id: randomUUID(),
      tenantId: input.tenantId,
      runDate: input.runDate,
      status: "running",
      processedCount: 0,
      accruedCount: 0,
      errorCount: 0,
      startedAt: now,
      createdAt: now,
    };
    this.runs.push(run);
    return run;
  }

  async finishRun(input: FinishRunInput): Promise<void> {
    const index = this.runs.findIndex((r) => r.tenantId === input.tenantId && r.id === input.runId);
    if (index < 0) return;
    this.runs[index] = {
      ...this.runs[index],
      status: input.status,
      processedCount: input.processedCount,
      accruedCount: input.accruedCount,
      errorCount: input.errorCount,
      finishedAt: new Date(),
    };
  }

  // ── setters de teste ──────────────────────────────────────────────────────────────────────────────────────
  setProfileForTests(tenantId: string, profileId: string, profile: StoredProfile): void {
    this.profiles.set(`${tenantId}:${profileId}`, profile);
  }

  setTimezoneForTests(tenantId: string, processId: string, timezone: string): void {
    this.timezones.set(`${tenantId}:${processId}`, timezone);
  }

  getRunsForTests(): readonly DailyAccrualRun[] {
    return [...this.runs];
  }

  reset(): void {
    this.charges.length = 0;
    this.runs.length = 0;
    this.profiles.clear();
    this.timezones.clear();
  }
}

// Ordena o ledger: REMOVAL, DAILY (por period_seq), ADDITIONAL, ADJUSTMENT — depois por created_at.
const KIND_ORDER: Record<ProcessCharge["kind"], number> = { REMOVAL: 0, DAILY: 1, ADDITIONAL: 2, ADJUSTMENT: 3 };
function sortCharge(left: ProcessCharge, right: ProcessCharge): number {
  if (KIND_ORDER[left.kind] !== KIND_ORDER[right.kind]) return KIND_ORDER[left.kind] - KIND_ORDER[right.kind];
  if (left.kind === "DAILY" && right.kind === "DAILY") return (left.periodSeq ?? 0) - (right.periodSeq ?? 0);
  return left.createdAt.getTime() - right.createdAt.getTime();
}
