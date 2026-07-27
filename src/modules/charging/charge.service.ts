import pino from "pino";

import { env } from "../../config/env.js";
import { getMemoryImpoundRepositoryForTests } from "../impound/impound.service.js";
import { createMemoryResolveTariff, type TariffResolver } from "../tariffs/tariff-resolution.js";
import { computeDuePeriods, summarizeAccrual, type AccrualParams } from "./charge.accrual.js";
import { dailyNetCents, InMemoryChargeRepository, type ChargeRepository } from "./charge.repository.js";
import {
  ChargeError,
  type AccrueProcessResult,
  type ChargeActorContext,
  type ChargeStatement,
  type ChargeStatementCap,
  type EstornoInstruction,
  type ProcessCharge,
  type ReleaseChargeState,
  type SettleResult,
} from "./charge.types.js";
import {
  multiplyMoney,
  optionalString,
  parseCurrency,
  parseManualChargeKind,
  parseMoney,
  parseOptionalDateOnly,
  parseOptionalUuid,
  parseRequiredUuid,
  toMoneyString,
} from "./charge.validators.js";

type RawRecord = Record<string, unknown>;

const CANDIDATE_PAGE = 500;
// C4 — observabilidade do fail-closed POR PROCESSO (sem PII: só tenantId/processId/reason). O error_count no
// DailyAccrualRun conta; o log warn torna a diária bloqueada RASTREÁVEL na operação.
const logger = pino({ level: env.LOG_LEVEL });

export type TenantAccrualScanResult = {
  readonly runId: string;
  readonly processed: number;
  readonly accrued: number;
  readonly errors: number;
};

export class ChargeService {
  constructor(
    private readonly repository: ChargeRepository,
    private readonly resolveTariff: TariffResolver,
  ) {}

  // GET /impound-processes/:id/charges — o ledger (charging:read).
  async list(actor: ChargeActorContext, processId: string): Promise<readonly ProcessCharge[]> {
    const normalizedId = parseRequiredUuid(processId, "processId");
    return this.repository.listCharges({ tenantId: actor.tenantId, processId: normalizedId });
  }

  // POST /impound-processes/:id/charges — REMOVAL/ADDITIONAL/ADJUSTMENT manual (charging:create). DAILY é privativa
  // do motor. ADJUSTMENT (RN-DIA-05) exige o encargo corrigido + carrega delta COM SINAL (append-only, nunca UPDATE).
  async createManual(actor: ChargeActorContext, processId: string, body: RawRecord): Promise<ProcessCharge> {
    const normalizedId = parseRequiredUuid(processId, "processId");
    const kind = parseManualChargeKind(body.kind);
    // Contrato do ledger (CHECK do banco): unit_amount/quantity SEMPRE >= 0 (magnitude); só total_amount carrega o
    // SINAL, e apenas para ADJUSTMENT (delta com sinal — D-Ω5P-CHG-04). Um ajuste de redução = total_amount negativo.
    const signed = kind === "ADJUSTMENT";
    const quantity = parseMoney(body.quantity ?? "1", "quantity");
    const unitAmount = parseMoney(body.unit_amount ?? body.unitAmount, "unitAmount");
    const rawTotal = body.total_amount ?? body.totalAmount;
    const totalAmount =
      rawTotal === undefined || rawTotal === null || rawTotal === ""
        ? multiplyMoney(quantity, unitAmount)
        : parseMoney(rawTotal, "totalAmount", signed);
    const adjustmentOfChargeId = parseOptionalUuid(body.adjustment_of_charge_id ?? body.adjustmentOfChargeId, "adjustmentOfChargeId");
    if (signed && !adjustmentOfChargeId) {
      throw new ChargeError(422, "CHARGE_INVALID", "adjustment_target_required", "An ADJUSTMENT must reference the corrected charge (adjustmentOfChargeId).");
    }
    // C5 — valida o ALVO do ADJUSTMENT: tem de existir e ser do MESMO process_id/tenant (a trilha da correção
    // aponta um encargo REAL do próprio processo). Inócuo p/ dinheiro (o total vem do body), mas fecha a integridade
    // da trilha append-only. Reusa listCharges (escopado por tenant+process) — sem FK dura (linkage soft da casa).
    if (signed && adjustmentOfChargeId) {
      const ledger = await this.repository.listCharges({ tenantId: actor.tenantId, processId: normalizedId });
      const target = ledger.find((charge) => charge.id === adjustmentOfChargeId);
      if (!target) {
        throw new ChargeError(422, "CHARGE_INVALID", "adjustment_target_not_found", "The referenced charge does not exist for this process/tenant.");
      }
      if (target.kind === "ADJUSTMENT") {
        throw new ChargeError(422, "CHARGE_INVALID", "adjustment_of_adjustment", "An ADJUSTMENT cannot target another ADJUSTMENT.");
      }
    }
    return this.repository.createManualCharge({
      tenantId: actor.tenantId,
      processId: normalizedId,
      kind,
      description: optionalString(body.description),
      quantity,
      unitAmount,
      totalAmount,
      currency: parseCurrency(body.currency),
      refDate: parseOptionalDateOnly(body.ref_date ?? body.refDate, "refDate"),
      adjustmentOfChargeId,
      actorId: actor.userId,
      occurredAt: new Date(),
    });
  }

  // GET /impound-processes/:id/charges/statement — a MEMÓRIA DE CÁLCULO (RN-DIA-06): linhas discriminadas +
  // subtotais por kind + status do teto + projeção até asOf. A guia PDF (client-side) é PR-08; aqui só a base fiel.
  async getStatement(actor: ChargeActorContext, processId: string, now: Date = new Date()): Promise<ChargeStatement> {
    const normalizedId = parseRequiredUuid(processId, "processId");
    const ctx = await this.repository.loadAccrualContext(actor.tenantId, normalizedId);
    if (!ctx) {
      throw new ChargeError(404, "CHARGE_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    const lines = await this.repository.listCharges({ tenantId: actor.tenantId, processId: normalizedId });
    const currency = lines[0]?.currency ?? "BRL";

    const subtotals = (["REMOVAL", "DAILY", "ADDITIONAL", "ADJUSTMENT"] as const)
      .map((kind) => ({ kind, total: sumMoney(lines.filter((line) => line.kind === kind).map((line) => line.totalAmount)) }))
      .filter((entry) => lines.some((line) => line.kind === entry.kind));
    const total = sumMoney(lines.map((line) => line.totalAmount));

    let cap: ChargeStatementCap | undefined;
    let asOf = now;
    let overAccruedDailies = 0;
    if (ctx.enteredAt) {
      asOf = ctx.frozenAt ? new Date(Math.min(now.getTime(), ctx.frozenAt.getTime())) : now;
      const params: AccrualParams = { t0: ctx.enteredAt, asOf, timezone: ctx.timezone, model: ctx.model, cap: ctx.cap };
      const summary = summarizeAccrual(params);
      cap = { model: ctx.model, cap: ctx.cap, capCount: summary.capCount, nDue: summary.nDue, nAccrue: summary.nAccrue, capReached: summary.capReached };
      // C3 — pendência de reconciliação: mais DAILY persistidas do que o motor projeta AGORA (congelamento
      // retroativo / queda de teto). O ledger é append-only → NÃO estorna aqui; só sinaliza (reconciliação = PR-10).
      const persistedDailies = lines.filter((line) => line.kind === "DAILY").length;
      overAccruedDailies = Math.max(0, persistedDailies - summary.nAccrue);
    }
    return {
      processId: normalizedId,
      currency,
      lines,
      subtotals,
      total,
      cap,
      asOf: asOf.toISOString(),
      reconciliationPending: overAccruedDailies > 0,
      overAccruedDailies,
    };
  }

  // POST /impound-processes/:id/charges/settle — QUITAÇÃO manual (charging:settle, D-Ω5P-07). Registra o
  // pagamento SEM PSP: reconcilia (estorna as DAILYs sobre-acumuladas — F1), carimba settled_* nas exigíveis
  // (NUNCA amount) e emite 1 SETTLEMENT na cadeia. Idempotente (re-run sem pendência = no-op).
  async settle(actor: ChargeActorContext, processId: string, body: RawRecord): Promise<SettleResult> {
    const normalizedId = parseRequiredUuid(processId, "processId");
    const note = optionalString(body.note ?? body.settlement_note ?? body.settlementNote);
    const state = await this.getReleaseChargeState(actor.tenantId, normalizedId);
    if (!state) {
      throw new ChargeError(404, "CHARGE_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    const lines = await this.repository.listCharges({ tenantId: actor.tenantId, processId: normalizedId });
    const byId = new Map(lines.map((line) => [line.id, line]));
    // Reconcilia EXATAMENTE as DAILYs sobre-acumuladas (M1: o repo posta o RESÍDUO que zera o líquido, computado
    // sob lock; aqui só indicamos QUAIS DAILY + a moeda). Σ ledger = teto é garantido pelo líquido-zero, não pela
    // magnitude da DAILY.
    const estornos: EstornoInstruction[] = state.overAccruedDailyIds
      .map((id) => byId.get(id))
      .filter((charge): charge is ProcessCharge => charge !== undefined)
      .map((charge) => ({ dailyChargeId: charge.id, currency: charge.currency }));
    return this.repository.settleProcess({
      tenantId: actor.tenantId,
      processId: normalizedId,
      estornos,
      note,
      actorId: actor.userId,
      occurredAt: new Date(),
    });
  }

  // Estado do ledger para o GATE DE LIBERAÇÃO (I5) — consumido pelo release.service. Computa débitos quitados,
  // reconciliação (estorno das sobre-acumuladas), total quitado, e os sinais do freeze-retroactive (salto A).
  async getReleaseChargeState(tenantId: string, processId: string, now: Date = new Date()): Promise<ReleaseChargeState | undefined> {
    const ctx = await this.repository.loadAccrualContext(tenantId, processId);
    if (!ctx) return undefined;
    const lines = await this.repository.listCharges({ tenantId, processId });
    const exigible = lines.filter((line) => line.kind !== "ADJUSTMENT");
    const debtsSettled = exigible.every((line) => line.settledAt !== undefined);
    const dailies = lines.filter((line) => line.kind === "DAILY").sort((left, right) => (left.periodSeq ?? 0) - (right.periodSeq ?? 0));
    const persistedDailyCount = dailies.length;
    let overAccruedDailyIds: string[] = [];
    let nDueNow = 0;
    if (ctx.enteredAt) {
      // freeze-retroactive (salto A): nDue (uncapped, time-based) AT now. Se < persistedDailyCount, congelar em now
      // estranharia DAILYs já acumuladas (period termina depois de now) — MODEL-CORRECT p/ ROLLING e CALENDAR.
      nDueNow = summarizeAccrual({ t0: ctx.enteredAt, asOf: now, timezone: ctx.timezone, model: ctx.model, cap: ctx.cap }).nDue;
      // over-accrual (reconciliação): DAILYs além do teto AT asOf=min(now, frozen_at). frozen ⇒ estável.
      const asOf = ctx.frozenAt ? new Date(Math.min(now.getTime(), ctx.frozenAt.getTime())) : now;
      const nAccrue = summarizeAccrual({ t0: ctx.enteredAt, asOf, timezone: ctx.timezone, model: ctx.model, cap: ctx.cap }).nAccrue;
      overAccruedDailyIds = dailies.slice(nAccrue).map((daily) => daily.id);
    }
    // M1 (invariante financeiro) — consistente ⟺ o LÍQUIDO de TODA DAILY sobre-acumulada é 0 (centavo EXATO):
    // total_da_DAILY + Σ(ADJUSTMENTs que a apontam) == 0. Um ADJUSTMENT PARCIAL pré-existente (ex. −0,01 postado por
    // um insider com charging:create) deixa líquido≠0 → NÃO consistente → 409 na consumação. Fecha o furo do gate
    // por-existência (que liberaria o cidadão cobrado acima do teto CTB §10, imutável na cadeia).
    const reconciliationConsistent = overAccruedDailyIds.every((id) => dailyNetCents(id, lines) === 0);
    const settledTotal = sumMoney(lines.map((line) => line.totalAmount));
    return { debtsSettled, reconciliationConsistent, settledTotal, overAccruedDailyIds, persistedDailyCount, nDueNow };
  }

  // ── Motor de diárias (I4) — acumulação de UM processo. Usado pelo SWEEP e (futuro PR-10/14) pelo congelamento
  // com asOf=frozen_at. Idempotente/DST-safe/fail-closed. Recalculabilidade (RN-DIA-05): só CRIA faltantes.
  async accrueProcess(tenantId: string, processId: string, now: Date, actorId?: string): Promise<AccrueProcessResult> {
    const ctx = await this.repository.loadAccrualContext(tenantId, processId);
    if (!ctx || !ctx.enteredAt) return { examined: false, accrued: 0, errors: 0 };

    const asOf = ctx.frozenAt ? new Date(Math.min(now.getTime(), ctx.frozenAt.getTime())) : now; // congelamento RN-DIA-04
    const params: AccrualParams = { t0: ctx.enteredAt, asOf, timezone: ctx.timezone, model: ctx.model, cap: ctx.cap };
    const periods = computeDuePeriods(params);
    const maxExisting = await this.repository.maxDailyPeriodSeq(tenantId, processId);

    let accrued = 0;
    let errors = 0;
    for (const period of periods) {
      if (period.periodSeq <= maxExisting) continue; // já acumulada (diárias são contíguas 1..k)
      // FAIL-CLOSED (F7): sem serviço-diária configurado ⇒ NÃO cria diária de valor 0 em silêncio; PARA (mantém a
      // contiguidade do period_seq) e sinaliza. O próximo run tenta de novo quando a config existir.
      if (!ctx.dailyServiceCatalogId) {
        errors += 1;
        logger.warn({ tenantId, processId, periodSeq: period.periodSeq, reason: "no_daily_service_catalog" }, "charging.accrue-daily: fail-closed (sem serviço-diária); diária NÃO acumulada");
        break;
      }
      const tariff = await this.resolveTariff({
        tenantId,
        serviceCatalogId: ctx.dailyServiceCatalogId,
        scope: ctx.scope,
        date: period.refInstant, // tarifa vigente NA data da diária (não no relógio de parede)
      });
      // FAIL-CLOSED: sem tarifa vigente na refDate ⇒ NÃO cobra 0; PARA e sinaliza (catch-up quando publicada).
      if (!tariff) {
        errors += 1;
        logger.warn({ tenantId, processId, periodSeq: period.periodSeq, refDate: period.refDate, reason: "no_tariff_for_ref_date" }, "charging.accrue-daily: fail-closed (sem tarifa vigente na data); diária NÃO acumulada");
        break;
      }
      const result = await this.repository.accrueDailyCharge({
        tenantId,
        processId,
        periodSeq: period.periodSeq,
        refDate: period.refDate,
        unitAmount: toMoneyString(tariff.unitPrice),
        tariffId: tariff.id,
        currency: tariff.currency ?? "BRL",
        actorId,
        occurredAt: now,
      });
      if (result.created) accrued += 1;
    }
    return { examined: true, accrued, errors };
  }

  // Varredura de UM tenant (o sweep chama por tenant). Abre DailyAccrualRun(running) → acumula por candidato
  // (try/catch POR candidato isola o raio de dano — F-4) → fecha (completed/failed + counts).
  async accrueTenantScan(tenantId: string, now: Date = new Date()): Promise<TenantAccrualScanResult> {
    const run = await this.repository.startRun({ tenantId, runDate: now.toISOString().slice(0, 10) });
    let processed = 0;
    let accrued = 0;
    let errors = 0;
    try {
      const candidates = await this.repository.listAccrualCandidates(tenantId, CANDIDATE_PAGE);
      for (const processId of candidates) {
        try {
          const result = await this.accrueProcess(tenantId, processId, now);
          if (result.examined) processed += 1;
          accrued += result.accrued;
          errors += result.errors;
        } catch {
          errors += 1; // isola o candidato que lança; o run segue
        }
      }
      await this.repository.finishRun({ tenantId, runId: run.id, status: "completed", processedCount: processed, accruedCount: accrued, errorCount: errors });
    } catch (error) {
      await this.repository.finishRun({ tenantId, runId: run.id, status: "failed", processedCount: processed, accruedCount: accrued, errorCount: errors }).catch(() => undefined);
      throw error;
    }
    return { runId: run.id, processed, accrued, errors };
  }
}

// Σ money (centavos, evita float). ADJUSTMENT pode ser negativo ⇒ soma assinada.
function sumMoney(values: readonly string[]): string {
  const cents = values.reduce((acc, value) => acc + Math.round(Number(value) * 100), 0);
  return toMoneyString(cents / 100);
}

// ── runtime (env-gate memory×prisma), espelha impound/jurisdiction ──────────────────────────────────────────
const memoryRepository = new InMemoryChargeRepository(getMemoryImpoundRepositoryForTests());
let defaultChargeServicePromise: Promise<ChargeService> | undefined;

export function createMemoryChargeService(): ChargeService {
  return new ChargeService(memoryRepository, createMemoryResolveTariff());
}

// Testes InMemory injetam um resolveTariff STUB (determinismo + fail-closed) sobre o MESMO repo de memória.
export function createChargeServiceWithResolver(resolveTariff: TariffResolver): ChargeService {
  return new ChargeService(memoryRepository, resolveTariff);
}

export function getMemoryChargeRepositoryForTests(): InMemoryChargeRepository {
  return memoryRepository;
}

export async function createDefaultChargeService(): Promise<ChargeService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryChargeService();
  }
  defaultChargeServicePromise ??= createPrismaChargeService();
  return defaultChargeServicePromise;
}

export function resetChargeRuntimeForTests(): void {
  memoryRepository.reset();
  defaultChargeServicePromise = undefined;
}

async function createPrismaChargeService(): Promise<ChargeService> {
  const { createPrismaChargeRepository } = await import("./charge-prisma.repository.js");
  const { createResolveTariff } = await import("../tariffs/tariff-resolution.js");
  return new ChargeService(await createPrismaChargeRepository(), await createResolveTariff());
}
