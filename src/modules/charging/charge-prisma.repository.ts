import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import { computeEventHash, genesisHash } from "../impound/impound.hashchain.js";
import type { CanonicalValue, CustodyEventType } from "../impound/impound.types.js";
import type { DailyCap, DailyModel, ProfileScope } from "../jurisdiction/jurisdiction.types.js";
import { centsToMoney, moneyToCents, toMoneyString } from "./charge.validators.js";
import {
  buildChargeEventPayload,
  buildSettlementEventPayload,
  chargeEventType,
  type ChargeRepository,
  type FinishRunInput,
  type StartRunInput,
} from "./charge.repository.js";
import {
  ChargeError,
  type AccrualContext,
  type AccrueDailyChargeInput,
  type AccrueDailyChargeResult,
  type CreateManualChargeInput,
  type DailyAccrualRun,
  type ListChargesInput,
  type ProcessCharge,
  type SettleProcessInput,
  type SettleResult,
} from "./charge.types.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

type LockedProcessRow = {
  readonly custody_seq_head: number;
  readonly custody_hash_head: string | null;
};

// Repositório de baixo nível sobre um executor de tx. As acumulações/lançamentos rodam FOR UPDATE do processo +
// INSERT do encargo + append do CustodyEvent (REPLICA FIEL de insertEventTx reusando só as PURAS computeEventHash/
// genesisHash — D-Ω5P-CHG-03: NÃO edita o código probatório mergeado do impound) — tudo na MESMA tx (RLS wrapper).
export class PrismaChargeRepository implements ChargeRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async listCharges(input: ListChargesInput): Promise<readonly ProcessCharge[]> {
    const rows = await this.client.processCharge.findMany({
      where: { tenant_id: input.tenantId, process_id: input.processId },
      orderBy: [{ kind: "asc" }, { period_seq: "asc" }, { created_at: "asc" }],
    });
    return rows.map(mapCharge);
  }

  async maxDailyPeriodSeq(tenantId: string, processId: string): Promise<number> {
    const agg = await this.client.processCharge.aggregate({
      where: { tenant_id: tenantId, process_id: processId, kind: "DAILY" },
      _max: { period_seq: true },
    });
    return agg._max.period_seq ?? 0;
  }

  async createManualCharge(input: CreateManualChargeInput): Promise<ProcessCharge> {
    const locked = await this.lockProcess(input.tenantId, input.processId);
    if (!locked) {
      throw new ChargeError(404, "CHARGE_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    // REMOVAL: pré-checa sob o lock (evita o 23505 do partial-unique poluir a tx do append).
    if (input.kind === "REMOVAL") {
      const clash = await this.client.$queryRaw<Array<{ one: number }>>`
        SELECT 1 AS one FROM process_charges
        WHERE tenant_id = ${input.tenantId}::uuid AND process_id = ${input.processId}::uuid AND kind = 'REMOVAL'
        LIMIT 1
      `;
      if (clash.length > 0) {
        throw new ChargeError(409, "CHARGE_CONFLICT", "removal_already_charged", "A removal charge already exists for this process.");
      }
    }
    const chargeRow = await this.client.processCharge.create({
      data: {
        tenant_id: input.tenantId,
        process_id: input.processId,
        kind: input.kind,
        ref_date: refDateToDb(input.refDate),
        description: input.description ?? null,
        quantity: input.quantity,
        unit_amount: input.unitAmount,
        total_amount: input.totalAmount,
        currency: input.currency,
        adjustment_of_charge_id: input.adjustmentOfChargeId ?? null,
        created_by: input.actorId ?? null,
        updated_by: input.actorId ?? null,
      },
    });
    const charge = mapCharge(chargeRow);
    await this.appendChargeEventTx(input.tenantId, input.processId, locked, {
      type: chargeEventType(charge.kind),
      payload: buildChargeEventPayload(charge),
      occurredAt: input.occurredAt,
      actorId: input.actorId,
    });
    return charge;
  }

  // Ω5P PR-10a (charging:settle) — QUITAÇÃO + reconciliação ATÔMICA sob FOR UPDATE (fecha TOCTOU do invariante
  // financeiro): (1) estorna as DAILYs sobre-acumuladas (ADJUSTMENT negativo append-only, idempotente por
  // adjustment_of_charge_id) + append ADJUSTMENT na cadeia; (2) carimba settled_* nas exigíveis não quitadas (UPDATE
  // restrito a settled_*/updated_* — NUNCA amount; process_charges não tem trigger append-only); (3) emite 1
  // SETTLEMENT na cadeia. Cada append re-lê o head sob o MESMO lock (reentrante) — serializa a cadeia.
  async settleProcess(input: SettleProcessInput): Promise<SettleResult> {
    const locked = await this.lockProcess(input.tenantId, input.processId);
    if (!locked) {
      throw new ChargeError(404, "CHARGE_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    let estornoCount = 0;
    for (const estorno of input.estornos) {
      // M1: LÍQUIDO da DAILY = total_da_DAILY + Σ(ADJUSTMENTs que a apontam), somado em Decimal EXATO no Postgres
      // (SUM de DECIMAL(12,2)). O estorno a postar é o RESÍDUO −líquido (o que falta p/ zerar). Idempotente POR
      // VALOR sob o MESMO lock: líquido já 0 ⇒ não posta (nunca estorna 2×); −0,01 pré-existente ⇒ posta o resíduo.
      const netRows = await this.client.$queryRaw<Array<{ net: string }>>`
        SELECT COALESCE(SUM(total_amount), 0)::text AS net FROM process_charges
        WHERE tenant_id = ${input.tenantId}::uuid AND process_id = ${input.processId}::uuid
          AND (id = ${estorno.dailyChargeId}::uuid OR (kind = 'ADJUSTMENT' AND adjustment_of_charge_id = ${estorno.dailyChargeId}::uuid))
      `;
      const residualCents = -moneyToCents(netRows[0]?.net ?? "0");
      if (residualCents === 0) continue;
      const chargeRow = await this.client.processCharge.create({
        data: {
          tenant_id: input.tenantId,
          process_id: input.processId,
          kind: "ADJUSTMENT",
          description: "Estorno de diária sobre-acumulada (reconciliação de liberação)",
          quantity: "1.00",
          unit_amount: centsToMoney(Math.abs(residualCents)),
          total_amount: centsToMoney(residualCents),
          currency: estorno.currency,
          adjustment_of_charge_id: estorno.dailyChargeId,
          created_by: input.actorId ?? null,
          updated_by: input.actorId ?? null,
        },
      });
      const charge = mapCharge(chargeRow);
      const head = await this.lockProcess(input.tenantId, input.processId); // head atual sob o MESMO lock
      await this.appendChargeEventTx(input.tenantId, input.processId, head!, {
        type: "ADJUSTMENT",
        payload: buildChargeEventPayload(charge),
        occurredAt: input.occurredAt,
        actorId: input.actorId,
      });
      estornoCount += 1;
    }
    // QUITAÇÃO: settled_* nas EXIGÍVEIS não quitadas — UPDATE restrito a settled_*/updated_* (NUNCA amount).
    const settled = await this.client.$queryRaw<Array<{ id: string }>>`
      UPDATE process_charges
      SET settled_at = ${input.occurredAt}, settlement_note = ${input.note ?? null}, updated_by = ${input.actorId ?? null}::uuid, updated_at = now()
      WHERE tenant_id = ${input.tenantId}::uuid AND process_id = ${input.processId}::uuid
        AND kind <> 'ADJUSTMENT' AND settled_at IS NULL
      RETURNING id
    `;
    const chargeIds = settled.map((row) => row.id);
    const totals = await this.client.$queryRaw<Array<{ sum: string | null }>>`
      SELECT COALESCE(SUM(total_amount), 0)::text AS sum FROM process_charges
      WHERE tenant_id = ${input.tenantId}::uuid AND process_id = ${input.processId}::uuid
    `;
    const settledTotal = toMoneyString(Number(totals[0]?.sum ?? "0"));
    if (chargeIds.length > 0 || estornoCount > 0) {
      const head = await this.lockProcess(input.tenantId, input.processId);
      await this.appendChargeEventTx(input.tenantId, input.processId, head!, {
        type: "SETTLEMENT",
        payload: buildSettlementEventPayload(settledTotal, chargeIds),
        occurredAt: input.occurredAt,
        actorId: input.actorId,
      });
    }
    return { settledTotal, settledCount: chargeIds.length, estornoCount, chargeIds };
  }

  async accrueDailyCharge(input: AccrueDailyChargeInput): Promise<AccrueDailyChargeResult> {
    const locked = await this.lockProcess(input.tenantId, input.processId);
    if (!locked) {
      throw new ChargeError(404, "CHARGE_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    // Idempotência: sob o lock do processo, re-checa a existência da diária (period_seq). O partial-unique
    // process_charges_daily_idem_key é o backstop de DB (raw-only) — nunca é ALCANÇADO sob o lock (serializa os ticks).
    const existing = await this.client.$queryRaw<Array<{ one: number }>>`
      SELECT 1 AS one FROM process_charges
      WHERE tenant_id = ${input.tenantId}::uuid AND process_id = ${input.processId}::uuid
        AND kind = 'DAILY' AND period_seq = ${input.periodSeq}
      LIMIT 1
    `;
    if (existing.length > 0) return { created: false };

    const chargeRow = await this.client.processCharge.create({
      data: {
        tenant_id: input.tenantId,
        process_id: input.processId,
        kind: "DAILY",
        period_seq: input.periodSeq,
        ref_date: refDateToDb(input.refDate),
        quantity: "1.00",
        unit_amount: input.unitAmount,
        total_amount: input.unitAmount, // quantity=1 ⇒ total = unit
        currency: input.currency,
        tariff_id: input.tariffId ?? null,
        created_by: input.actorId ?? null,
        updated_by: input.actorId ?? null,
      },
    });
    const charge = mapCharge(chargeRow);
    await this.appendChargeEventTx(input.tenantId, input.processId, locked, {
      type: "CHARGE_ACCRUAL",
      payload: buildChargeEventPayload(charge),
      occurredAt: input.occurredAt,
      actorId: input.actorId,
    });
    return { created: true, charge };
  }

  async loadAccrualContext(tenantId: string, processId: string): Promise<AccrualContext | undefined> {
    const rows = await this.client.$queryRaw<
      Array<{
        entered_at: Date | null;
        frozen_at: Date | null;
        timezone: string;
        scope: string;
        daily_model: string;
        daily_cap: string;
        daily_service_catalog_id: string | null;
      }>
    >`
      SELECT ip.entered_at, ip.frozen_at, COALESCE(y.timezone, 'America/Sao_Paulo') AS timezone,
             jp.scope, jp.daily_model, jp.daily_cap, jp.daily_service_catalog_id
      FROM impound_processes ip
      JOIN jurisdiction_profiles jp ON jp.tenant_id = ip.tenant_id AND jp.id = ip.profile_id
      LEFT JOIN yards y ON y.tenant_id = ip.tenant_id AND y.id = ip.yard_id
      WHERE ip.tenant_id = ${tenantId}::uuid AND ip.id = ${processId}::uuid
    `;
    const row = rows[0];
    if (!row) return undefined;
    return {
      tenantId,
      processId,
      enteredAt: row.entered_at ?? undefined,
      frozenAt: row.frozen_at ?? undefined,
      timezone: row.timezone,
      scope: row.scope as ProfileScope,
      model: row.daily_model as DailyModel,
      cap: row.daily_cap as DailyCap,
      dailyServiceCatalogId: row.daily_service_catalog_id ?? undefined,
    };
  }

  async listAccrualCandidates(tenantId: string, limit: number): Promise<readonly string[]> {
    // Processos com t0 (entered_at) e AINDA acumulando (frozen_at NULL). Status-agnóstico: uma vez congelado
    // (liberação/arrematação/reciclagem), frozen_at é setado ⇒ sai do sweep (o fechamento do período final é
    // feito pela transição que congela — PR-10/14). O(processos ativos) por tenant.
    const rows = await this.client.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM impound_processes
      WHERE tenant_id = ${tenantId}::uuid AND entered_at IS NOT NULL AND frozen_at IS NULL
      ORDER BY entered_at ASC
      LIMIT ${limit}
    `;
    return rows.map((row) => row.id);
  }

  async startRun(input: StartRunInput): Promise<DailyAccrualRun> {
    const row = await this.client.dailyAccrualRun.create({
      data: { tenant_id: input.tenantId, run_date: refDateToDb(input.runDate) as Date, status: "running" },
    });
    return mapRun(row);
  }

  async finishRun(input: FinishRunInput): Promise<void> {
    await this.client.dailyAccrualRun.update({
      where: { id: input.runId },
      data: {
        status: input.status,
        processed_count: input.processedCount,
        accrued_count: input.accruedCount,
        error_count: input.errorCount,
        finished_at: new Date(),
      },
    });
  }

  // SELECT ... FOR UPDATE do processo — serializa appends concorrentes no MESMO processo (anti-corrida da cadeia).
  private async lockProcess(tenantId: string, processId: string): Promise<LockedProcessRow | undefined> {
    const rows = await this.client.$queryRaw<LockedProcessRow[]>`
      SELECT custody_seq_head, custody_hash_head
      FROM impound_processes
      WHERE tenant_id = ${tenantId}::uuid AND id = ${processId}::uuid
      FOR UPDATE
    `;
    return rows[0];
  }

  // REPLICA FIEL de impound-prisma.repository.ts:insertEventTx (reusando as PURAS): computa seq/prev/hash, INSERE
  // o custody_event, atualiza a âncora custody_seq_head/custody_hash_head e grava o cross-anchor em audit_logs
  // (MESMA action/entity/metadata do impound → o verifyChain reconcilia e continua `valid` após CHARGE_ACCRUAL).
  private async appendChargeEventTx(
    tenantId: string,
    processId: string,
    head: LockedProcessRow,
    draft: { readonly type: CustodyEventType; readonly payload: CanonicalValue; readonly occurredAt: Date; readonly actorId?: string },
  ): Promise<void> {
    const seq = head.custody_seq_head + 1;
    const prevHash = head.custody_hash_head ?? genesisHash(tenantId, processId);
    const hash = computeEventHash({
      prevHash,
      seq,
      type: draft.type,
      payload: draft.payload,
      occurredAt: draft.occurredAt,
      actorId: draft.actorId ?? null,
    });
    const eventRow = await this.client.custodyEvent.create({
      data: {
        tenant_id: tenantId,
        process_id: processId,
        seq,
        type: draft.type,
        payload: draft.payload as Prisma.InputJsonValue,
        occurred_at: draft.occurredAt,
        actor_id: draft.actorId ?? null,
        prev_hash: prevHash,
        hash,
      },
    });
    await this.client.impoundProcess.update({
      where: { id: processId },
      data: { custody_seq_head: seq, custody_hash_head: hash },
    });
    await this.client.auditLog.create({
      data: {
        tenant_id: tenantId,
        actor_user_id: draft.actorId ?? null,
        action: "impound.custody_event.appended",
        entity: "custody_event",
        entity_id: eventRow.id,
        metadata: { processId, seq, hash },
      },
    });
  }
}

// Wrapper RLS: cada método abre uma tx com app.current_tenant_id. Os appends rodam TODO o fluxo (FOR UPDATE +
// insert + head + cross-anchor) numa só tx.
export class RlsPrismaChargeRepository implements ChargeRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  listCharges(input: ListChargesInput): Promise<readonly ProcessCharge[]> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaChargeRepository(tx).listCharges(input));
  }

  maxDailyPeriodSeq(tenantId: string, processId: string): Promise<number> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaChargeRepository(tx).maxDailyPeriodSeq(tenantId, processId));
  }

  createManualCharge(input: CreateManualChargeInput): Promise<ProcessCharge> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaChargeRepository(tx).createManualCharge(input));
  }

  settleProcess(input: SettleProcessInput): Promise<SettleResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaChargeRepository(tx).settleProcess(input));
  }

  accrueDailyCharge(input: AccrueDailyChargeInput): Promise<AccrueDailyChargeResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaChargeRepository(tx).accrueDailyCharge(input));
  }

  loadAccrualContext(tenantId: string, processId: string): Promise<AccrualContext | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaChargeRepository(tx).loadAccrualContext(tenantId, processId));
  }

  listAccrualCandidates(tenantId: string, limit: number): Promise<readonly string[]> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaChargeRepository(tx).listAccrualCandidates(tenantId, limit));
  }

  startRun(input: StartRunInput): Promise<DailyAccrualRun> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaChargeRepository(tx).startRun(input));
  }

  finishRun(input: FinishRunInput): Promise<void> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaChargeRepository(tx).finishRun(input));
  }
}

export async function createPrismaChargeRepository(): Promise<RlsPrismaChargeRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaChargeRepository(prisma);
}

// ── mappers ─────────────────────────────────────────────────────────────────────────────────────────────────
type ChargeRecord = {
  readonly id: string;
  readonly tenant_id: string;
  readonly process_id: string;
  readonly kind: string;
  readonly period_seq: number | null;
  readonly ref_date: Date | null;
  readonly description: string | null;
  readonly quantity: Prisma.Decimal;
  readonly unit_amount: Prisma.Decimal;
  readonly total_amount: Prisma.Decimal;
  readonly currency: string;
  readonly tariff_id: string | null;
  readonly adjustment_of_charge_id: string | null;
  readonly settled_at: Date | null;
  readonly settlement_note: string | null;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
};

function mapCharge(record: ChargeRecord): ProcessCharge {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    processId: record.process_id,
    kind: record.kind as ProcessCharge["kind"],
    periodSeq: record.period_seq ?? undefined,
    refDate: record.ref_date ? dbDateToStr(record.ref_date) : undefined,
    description: record.description ?? undefined,
    quantity: toMoneyString(Number(record.quantity)),
    unitAmount: toMoneyString(Number(record.unit_amount)),
    totalAmount: toMoneyString(Number(record.total_amount)),
    currency: record.currency,
    tariffId: record.tariff_id ?? undefined,
    adjustmentOfChargeId: record.adjustment_of_charge_id ?? undefined,
    settledAt: record.settled_at ?? undefined,
    settlementNote: record.settlement_note ?? undefined,
    createdBy: record.created_by ?? undefined,
    updatedBy: record.updated_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

type RunRecord = {
  readonly id: string;
  readonly tenant_id: string;
  readonly run_date: Date;
  readonly status: string;
  readonly processed_count: number;
  readonly accrued_count: number;
  readonly error_count: number;
  readonly started_at: Date;
  readonly finished_at: Date | null;
  readonly created_at: Date;
};

function mapRun(record: RunRecord): DailyAccrualRun {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    runDate: dbDateToStr(record.run_date),
    status: record.status as DailyAccrualRun["status"],
    processedCount: record.processed_count,
    accruedCount: record.accrued_count,
    errorCount: record.error_count,
    startedAt: record.started_at,
    finishedAt: record.finished_at ?? undefined,
    createdAt: record.created_at,
  };
}

// @db.Date ↔ "YYYY-MM-DD" (armazenado como UTC midnight).
function refDateToDb(refDate: string | undefined): Date | null {
  return refDate ? new Date(`${refDate}T00:00:00.000Z`) : null;
}

function dbDateToStr(value: Date): string {
  return value.toISOString().slice(0, 10);
}
