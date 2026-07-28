import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import { moneyToCents } from "../charging/charge.validators.js";
import { computeEventHash, genesisHash } from "../impound/impound.hashchain.js";
import type { CanonicalValue, CustodyEventType } from "../impound/impound.types.js";
import { findActiveSoldRound } from "./auction.repository.js";
import type { AuctionAttempt, AuctionOutcome } from "./auction.types.js";
import {
  assertSettlementSum,
  buildAllocationRows,
  buildSettlementCycleEventPayload,
  buildSettlementEventPayload,
  resolveBalanceCycleTransition,
  type AuctionSettlementRepository,
} from "./auction.settlement.repository.js";
import type {
  SettlementProcessPort,
  SettlementAuctionStatePort,
  SettlementCascadeClaimPort,
} from "./auction.settlement.service.js";
import {
  AuctionSettlementError,
  type DistributeSettlementInput,
  type DistributeSettlementResult,
  type Settlement,
  type SettlementAllocation,
  type SettlementBeneficiaryKind,
  type SettlementCycleInput,
  type SettlementCyclePhase,
  type SettlementCycleResult,
  type SettlementStatus,
  type SettlementView,
} from "./auction.settlement.types.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

type LockedProcessRow = {
  readonly status: string;
  readonly custody_seq_head: number;
  readonly custody_hash_head: string | null;
};

// Repositório de baixo nível sobre um executor de tx. distributeSettlementAtomic roda FOR UPDATE do processo +
// re-checa AUCTION_CLOSED + ausência de settlement + re-deriva a base I7 (findActiveSoldRound) sob o lock + ASSERT
// Σ==hammer + INSERT settlement + N allocations + append do AUCTION_SETTLEMENT (RÉPLICA FIEL de auction-prisma:
// appendEventTx reusando só as PURAS computeEventHash/genesisHash) — tudo na MESMA tx.
export class PrismaAuctionSettlementRepository implements AuctionSettlementRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async getByProcess(tenantId: string, processId: string): Promise<SettlementView | undefined> {
    const settlement = await this.readSettlementByProcess(tenantId, processId);
    if (!settlement) return undefined;
    return { settlement, allocations: await this.readAllocations(tenantId, settlement.id) };
  }

  async distributeSettlementAtomic(input: DistributeSettlementInput): Promise<DistributeSettlementResult> {
    const locked = await this.lockProcess(input.tenantId, input.processId);
    if (!locked) {
      throw new AuctionSettlementError(404, "SETTLEMENT_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    // IDEMPOTÊNCIA sob o lock (pré-check antes do INSERT; o partial-unique settlements_process_idem_key é o BACKSTOP —
    // um 23505 no create abortaria a tx, por isso pré-checamos sob o FOR UPDATE que serializa as distribuições).
    const existing = await this.readSettlementByProcess(input.tenantId, input.processId);
    if (existing) {
      return { settlement: existing, allocations: await this.readAllocations(input.tenantId, existing.id), created: false };
    }
    // GATE de estado re-verificado sob FOR UPDATE: a liquidação só ocorre em AUCTION_CLOSED.
    if (locked.status !== input.expectedFrom) {
      throw new AuctionSettlementError(409, "SETTLEMENT_CONFLICT", "settlement_wrong_state", "The settlement can only be distributed for an auction-closed process.");
    }
    // BASE de I7 RE-DERIVADA sob o lock (findActiveSoldRound — NUNCA Σ sold_amount; não dupla-conta revenda). Assegura
    // que o hammer que a cascata distribuiu É o soldAmount da SOLD efetiva persistida (belt-and-suspenders anti-forja).
    const attempts = await this.listAttempts(input.tenantId, input.processId);
    const soldRound = findActiveSoldRound(attempts);
    const soldAttempt = attempts.find((attempt) => attempt.outcome === "SOLD" && attempt.roundNumber === soldRound);
    if (soldRound === undefined || soldAttempt?.soldAmount === undefined) {
      throw new AuctionSettlementError(409, "SETTLEMENT_GUARD_FAILED", "settlement_sale_missing", "The settlement requires an effective recorded sale (SOLD) with a hammer amount.");
    }
    if (moneyToCents(soldAttempt.soldAmount) !== input.hammerCents || soldRound !== input.soldRound) {
      throw new AuctionSettlementError(409, "SETTLEMENT_CONFLICT", "settlement_base_changed", "The effective sale base changed concurrently; retry the settlement.");
    }
    // ASSERT Σ==hammer (I7 belt-and-suspenders — throw→rollback da tx se forjado).
    assertSettlementSum(input);

    const now = new Date();
    let settlementRow;
    try {
      settlementRow = await this.client.settlement.create({
        data: {
          tenant_id: input.tenantId,
          process_id: input.processId,
          sold_round: input.soldRound,
          hammer_amount: toDecimalString(input.hammerCents),
          auction_cost_amount: toDecimalString(input.auctionCostCents),
          removal_storage_claim: toDecimalString(input.removalStorageCents),
          owner_balance_amount: toDecimalString(input.ownerBalanceCents),
          shortfall_amount: toDecimalString(input.shortfallCents),
          currency: input.currency,
          status: "DISTRIBUTED",
          owner_notify_due_at: input.ownerNotifyDueAt,
          owner_claim_expires_at: input.ownerClaimExpiresAt,
          distributed_by: input.actorId ?? null,
        },
      });
    } catch (error) {
      // Corrida que fure o lock (não deveria): o partial-unique barra a 2ª → devolve a existente (nunca sobrescreve).
      if (isUniqueViolation(error)) {
        const raced = await this.readSettlementByProcess(input.tenantId, input.processId);
        if (raced) return { settlement: raced, allocations: await this.readAllocations(input.tenantId, raced.id), created: false };
      }
      throw error;
    }
    const rows = buildAllocationRows(input, settlementRow.id, now);
    await this.client.settlementAllocation.createMany({
      data: rows.map((row) => ({
        id: row.id,
        tenant_id: row.tenantId,
        settlement_id: row.settlementId,
        process_id: row.processId,
        order_seq: row.orderSeq,
        beneficiary_kind: row.beneficiaryKind,
        amount: row.amount,
        claim_amount: row.claimAmount ?? null,
        reference: row.reference ?? null,
        created_at: row.createdAt,
      })),
    });
    // AUCTION_SETTLEMENT encadeado (prova I2) — §2.8 { event, soldRound, hammer, breakdown, ownerBalance }, sem PII.
    await this.appendEventTx(input.tenantId, input.processId, locked, {
      type: "AUCTION_SETTLEMENT",
      payload: buildSettlementEventPayload(input.soldRound, input.hammerCents, input.allocations, input.ownerBalanceCents),
      occurredAt: input.occurredAt,
      actorId: input.actorId,
    });
    return { settlement: mapSettlement(settlementRow), allocations: await this.readAllocations(input.tenantId, settlementRow.id), created: true };
  }

  // Ω5P PR-14b — CICLO do saldo (claim | funset). Sob FOR UPDATE do processo (serializa + dá a cabeça da cadeia p/ o
  // append) + FOR UPDATE do settlement (serializa claim×funset concorrentes na MESMA liquidação): re-checa o gate
  // (resolveBalanceCycleTransition) + UPDATE do status/timestamps + AUCTION_SETTLEMENT{phase} — 1 tx. NÃO toca as
  // allocations (Σ==hammer do 14a intacto — o ciclo é state-change, não redistribuição). MUTUAMENTE EXCLUSIVAS +
  // idempotentes por construção do gate (um settlement já BALANCE_CLAIMED/REVERTED falha o 1º check → wrong_state).
  async transitionBalanceAtomic(phase: SettlementCyclePhase, input: SettlementCycleInput): Promise<SettlementCycleResult> {
    const locked = await this.lockProcess(input.tenantId, input.processId);
    if (!locked) {
      throw new AuctionSettlementError(404, "SETTLEMENT_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    const settlement = await this.lockSettlementByProcess(input.tenantId, input.processId);
    if (!settlement) {
      throw new AuctionSettlementError(404, "SETTLEMENT_NOT_FOUND", "settlement_not_found", "No settlement has been distributed for this process.");
    }
    // GATE PURO re-verificado sob o lock (lança o 409 distinto). Serializado pelo FOR UPDATE do settlement ⇒ claim×funset
    // concorrentes: 1 vence e comuta o status; o outro re-lê BALANCE_CLAIMED/REVERTED e falha wrong_state.
    const nextStatus = resolveBalanceCycleTransition(phase, settlement, input.now);
    const now = new Date();
    await this.client.settlement.update({
      where: { id: settlement.id },
      data:
        phase === "CLAIM"
          ? { status: nextStatus, claimed_by: input.actorId ?? null, claimed_at: now, claim_recipient_ref: input.recipientRef ?? null, updated_at: now }
          : { status: nextStatus, reverted_at: now, updated_at: now },
    });
    // AUCTION_SETTLEMENT{phase} encadeado (prova I2) — §2.8 { event, phase, settlementId }, sem PII.
    await this.appendEventTx(input.tenantId, input.processId, locked, {
      type: "AUCTION_SETTLEMENT",
      payload: buildSettlementCycleEventPayload(phase, settlement.id),
      occurredAt: input.occurredAt,
      actorId: input.actorId,
    });
    const refreshed = await this.readSettlementByProcess(input.tenantId, input.processId);
    return { settlement: refreshed ?? settlement, allocations: await this.readAllocations(input.tenantId, settlement.id), phase };
  }

  // ── helpers ─────────────────────────────────────────────────────────────────────────────────────────────────
  private async readSettlementByProcess(tenantId: string, processId: string): Promise<Settlement | undefined> {
    const rows = await this.client.settlement.findMany({
      where: { tenant_id: tenantId, process_id: processId },
      take: 1,
    });
    return rows[0] ? mapSettlement(rows[0]) : undefined;
  }

  private async readAllocations(tenantId: string, settlementId: string): Promise<readonly SettlementAllocation[]> {
    const rows = await this.client.settlementAllocation.findMany({
      where: { tenant_id: tenantId, settlement_id: settlementId },
      orderBy: [{ order_seq: "asc" }],
    });
    return rows.map(mapAllocation);
  }

  // Attempts do processo (só os campos que findActiveSoldRound/hammer leem) — re-leitura sob o lock.
  private async listAttempts(tenantId: string, processId: string): Promise<readonly AuctionAttempt[]> {
    const rows = await this.client.$queryRaw<AttemptLiteRow[]>`
      SELECT id, tenant_id, process_id, round_number, outcome, sold_amount, defaulted_sale_round, created_at, updated_at
      FROM auction_attempts
      WHERE tenant_id = ${tenantId}::uuid AND process_id = ${processId}::uuid
      ORDER BY round_number ASC
    `;
    return rows.map(mapAttemptLite);
  }

  private async lockProcess(tenantId: string, processId: string): Promise<LockedProcessRow | undefined> {
    const rows = await this.client.$queryRaw<LockedProcessRow[]>`
      SELECT status, custody_seq_head, custody_hash_head
      FROM impound_processes
      WHERE tenant_id = ${tenantId}::uuid AND id = ${processId}::uuid
      FOR UPDATE
    `;
    return rows[0];
  }

  // Ω5P PR-14b — trava a liquidação do processo FOR UPDATE (1 por processo). Serializa claim×funset concorrentes na
  // mesma liquidação: a 2ª transação bloqueia até a 1ª comitar, então re-lê o status já comutado e falha o gate.
  private async lockSettlementByProcess(tenantId: string, processId: string): Promise<Settlement | undefined> {
    const rows = await this.client.$queryRaw<SettlementRecord[]>`
      SELECT id, tenant_id, process_id, sold_round, hammer_amount, auction_cost_amount, removal_storage_claim,
             owner_balance_amount, shortfall_amount, currency, status, owner_notify_due_at, owner_claim_expires_at,
             distributed_by, claimed_by, claimed_at, claim_recipient_ref, reverted_at, created_at, updated_at
      FROM settlements
      WHERE tenant_id = ${tenantId}::uuid AND process_id = ${processId}::uuid
      FOR UPDATE
    `;
    return rows[0] ? mapSettlement(rows[0]) : undefined;
  }

  // RÉPLICA FIEL de auction-prisma.repository.ts:appendEventTx (reusando as PURAS): computa seq/prev/hash, INSERE o
  // custody_event (23505 no seq → 409), atualiza a âncora custody_seq_head/custody_hash_head e grava o cross-anchor em
  // audit_logs (MESMA action/entity/metadata do impound → verifyChain reconcilia e continua `valid`).
  private async appendEventTx(
    tenantId: string,
    processId: string,
    head: { readonly custody_seq_head: number; readonly custody_hash_head: string | null },
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
    let eventRow;
    try {
      eventRow = await this.client.custodyEvent.create({
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
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AuctionSettlementError(409, "SETTLEMENT_CONFLICT", "concurrent_custody_append", "A concurrent custody append raced this one; retry.");
      }
      throw error;
    }
    await this.client.impoundProcess.update({ where: { id: processId }, data: { custody_seq_head: seq, custody_hash_head: hash } });
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

// Wrapper RLS: cada método abre uma tx com app.current_tenant_id. distributeSettlementAtomic roda TODO o fluxo (FOR
// UPDATE + re-verificação + INSERT + append + cross-anchor) numa só tx.
export class RlsPrismaAuctionSettlementRepository implements AuctionSettlementRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  getByProcess(tenantId: string, processId: string): Promise<SettlementView | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaAuctionSettlementRepository(tx).getByProcess(tenantId, processId));
  }

  distributeSettlementAtomic(input: DistributeSettlementInput): Promise<DistributeSettlementResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaAuctionSettlementRepository(tx).distributeSettlementAtomic(input));
  }

  transitionBalanceAtomic(phase: SettlementCyclePhase, input: SettlementCycleInput): Promise<SettlementCycleResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaAuctionSettlementRepository(tx).transitionBalanceAtomic(phase, input));
  }
}

export async function createPrismaAuctionSettlementRepository(): Promise<RlsPrismaAuctionSettlementRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaAuctionSettlementRepository(prisma);
}

// Ports (processo / estado do leilão / claim item I) compostos das fontes reais, cada uma sob RLS. O service ORQUESTRA;
// aqui só os cabeamos aos repositórios/serviços existentes (o settlement NÃO reimplementa nenhum).
export async function createPrismaSettlementPorts(): Promise<{
  readonly impound: SettlementProcessPort;
  readonly auction: SettlementAuctionStatePort;
  readonly cascadeClaim: SettlementCascadeClaimPort;
}> {
  const { createPrismaImpoundRepository } = await import("../impound/impound-prisma.repository.js");
  const { createPrismaAuctionRepository } = await import("./auction-prisma.repository.js");
  const { createDefaultChargeService } = await import("../charging/charge.service.js");
  const [impound, auction] = await Promise.all([createPrismaImpoundRepository(), createPrismaAuctionRepository()]);
  return {
    impound,
    auction,
    cascadeClaim: async (tenantId, processId) => (await createDefaultChargeService()).getCascadeExpenseClaim(tenantId, processId),
  };
}

// ── mappers ─────────────────────────────────────────────────────────────────────────────────────────────────
type SettlementRecord = {
  readonly id: string;
  readonly tenant_id: string;
  readonly process_id: string;
  readonly sold_round: number | null;
  readonly hammer_amount: Prisma.Decimal | string;
  readonly auction_cost_amount: Prisma.Decimal | string | null;
  readonly removal_storage_claim: Prisma.Decimal | string | null;
  readonly owner_balance_amount: Prisma.Decimal | string | null;
  readonly shortfall_amount: Prisma.Decimal | string | null;
  readonly currency: string;
  readonly status: string;
  readonly owner_notify_due_at: Date | null;
  readonly owner_claim_expires_at: Date | null;
  readonly distributed_by: string | null;
  readonly claimed_by: string | null;
  readonly claimed_at: Date | null;
  readonly claim_recipient_ref: string | null;
  readonly reverted_at: Date | null;
  readonly created_at: Date;
  readonly updated_at: Date;
};

// Dinheiro canônico "0.00" (Decimal(12,2)) — Prisma.Decimal.toString() dropa zeros à direita; Number(·).toFixed(2)
// normaliza (mesma disciplina do mapAttempt de auction-prisma). null ⇒ undefined.
function money(value: Prisma.Decimal | string | null | undefined): string | undefined {
  return value === null || value === undefined ? undefined : Number(value).toFixed(2);
}

function mapSettlement(record: SettlementRecord): Settlement {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    processId: record.process_id,
    soldRound: record.sold_round === null ? undefined : Number(record.sold_round),
    hammerAmount: Number(record.hammer_amount).toFixed(2),
    auctionCostAmount: money(record.auction_cost_amount),
    removalStorageClaim: money(record.removal_storage_claim),
    ownerBalanceAmount: money(record.owner_balance_amount),
    shortfallAmount: money(record.shortfall_amount),
    currency: record.currency,
    status: record.status as SettlementStatus,
    ownerNotifyDueAt: record.owner_notify_due_at ?? undefined,
    ownerClaimExpiresAt: record.owner_claim_expires_at ?? undefined,
    distributedBy: record.distributed_by ?? undefined,
    claimedBy: record.claimed_by ?? undefined,
    claimedAt: record.claimed_at ?? undefined,
    claimRecipientRef: record.claim_recipient_ref ?? undefined,
    revertedAt: record.reverted_at ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

type AllocationRecord = {
  readonly id: string;
  readonly tenant_id: string;
  readonly settlement_id: string;
  readonly process_id: string;
  readonly order_seq: number;
  readonly beneficiary_kind: string;
  readonly amount: Prisma.Decimal | string;
  readonly claim_amount: Prisma.Decimal | string | null;
  readonly reference: string | null;
  readonly created_at: Date;
};

function mapAllocation(record: AllocationRecord): SettlementAllocation {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    settlementId: record.settlement_id,
    processId: record.process_id,
    orderSeq: Number(record.order_seq),
    beneficiaryKind: record.beneficiary_kind as SettlementBeneficiaryKind,
    amount: Number(record.amount).toFixed(2),
    claimAmount: money(record.claim_amount),
    reference: record.reference ?? undefined,
    createdAt: record.created_at,
  };
}

type AttemptLiteRow = {
  readonly id: string;
  readonly tenant_id: string;
  readonly process_id: string;
  readonly round_number: number;
  readonly outcome: string;
  readonly sold_amount: Prisma.Decimal | string | null;
  readonly defaulted_sale_round: number | null;
  readonly created_at: Date;
  readonly updated_at: Date;
};

function mapAttemptLite(record: AttemptLiteRow): AuctionAttempt {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    processId: record.process_id,
    roundNumber: Number(record.round_number),
    outcome: record.outcome as AuctionOutcome,
    soldAmount: record.sold_amount === null ? undefined : Number(record.sold_amount).toFixed(2),
    defaultedSaleRound: record.defaulted_sale_round === null ? undefined : Number(record.defaulted_sale_round),
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

// cents inteiros → string Decimal(12,2) canônica "0.00" (a fronteira app→banco; nunca float na soma, só na formatação).
function toDecimalString(cents: number): string {
  return (cents / 100).toFixed(2);
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const record = error as { readonly code?: unknown; readonly meta?: Record<string, unknown>; readonly message?: unknown };
  if (record.code === "P2002") return true;
  const haystack = `${String(record.code ?? "")} ${String(record.meta?.code ?? "")} ${String(record.meta?.message ?? "")} ${String(record.message ?? "")}`.toLowerCase();
  return (
    haystack.includes("23505") ||
    haystack.includes("settlements_process_idem_key") ||
    haystack.includes("settlement_allocations_order_idem_key") ||
    haystack.includes("custody_events_tenant_id_process_id_seq_key")
  );
}
