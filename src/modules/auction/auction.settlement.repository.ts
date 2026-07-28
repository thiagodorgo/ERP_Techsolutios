import { randomUUID } from "node:crypto";

import { centsToMoney } from "../charging/charge.validators.js";
import type { CanonicalValue } from "../impound/impound.types.js";
import type { ImpoundRepository } from "../impound/impound.repository.js";
import {
  AuctionSettlementError,
  type CascadeAllocation,
  type CascadeClaim,
  type CascadeResult,
  type DistributeSettlementInput,
  type DistributeSettlementResult,
  type Settlement,
  type SettlementAllocation,
  type SettlementView,
} from "./auction.settlement.types.js";

// ── I7 — motor PURO da cascata §6º (CENTAVOS INTEIROS EXATOS, ZERO float, ZERO arredondamento) ─────────────────
// remaining=hammer; para cada claim NA ORDEM LEGAL: alloc=min(remaining, claim); remaining-=alloc. ownerBalance=
// remaining (SEMPRE, mesmo 0). Σ(allocations.amount) + ownerBalance == hammer POR CONSTRUÇÃO (subtração inteira).
// Insuficiência (hammer < Σclaims): os tiers inferiores recebem parcial/zero e ownerBalance=0; shortfall (informativo)
// = max(0, Σclaims − hammer), NÃO é uma allocation. claimCents é saneado (>=0, inteiro) — defesa em profundidade.
export function distributeCascade(hammerCents: number, claims: readonly CascadeClaim[]): CascadeResult {
  const hammer = Math.max(0, Math.trunc(hammerCents));
  let remaining = hammer;
  let totalClaims = 0;
  const allocations: CascadeAllocation[] = [];
  for (const claim of claims) {
    const claimCents = Math.max(0, Math.trunc(claim.claimCents));
    totalClaims += claimCents;
    const amountCents = Math.min(remaining, claimCents);
    remaining -= amountCents;
    allocations.push({ kind: claim.kind, amountCents, claimCents });
  }
  return {
    allocations,
    ownerBalanceCents: remaining, // resíduo — o SALDO ao ex-dono (§12)
    shortfallCents: Math.max(0, totalClaims - hammer),
  };
}

// Σ das allocations (tiers) + ownerBalance em centavos — a CHECAGEM de I7 (deve == hammer). Reusada pelo motor e pela
// asserção belt-and-suspenders sob o lock (InMemory + Prisma).
export function sumAllocationCents(allocations: readonly CascadeAllocation[], ownerBalanceCents: number): number {
  return allocations.reduce((acc, allocation) => acc + allocation.amountCents, 0) + ownerBalanceCents;
}

// Payload canônico do CustodyEvent AUCTION_SETTLEMENT (I2). §allowlist §2.8 ESTRITA: { event, soldRound, hammer
// (STRING), breakdown:[{kind, amount(STRING)}], ownerBalance(STRING) } — ZERO PII/tenant_id/reference bruta. Dinheiro
// como string (canonicalJson exige money string); soldRound inteiro. breakdown ORDENADO (ordem §6º) p/ determinismo.
export function buildSettlementEventPayload(
  soldRound: number,
  hammerCents: number,
  allocations: readonly CascadeAllocation[],
  ownerBalanceCents: number,
): CanonicalValue {
  return {
    event: "auction_settlement",
    soldRound,
    hammer: centsToMoney(hammerCents),
    breakdown: allocations.map((allocation) => ({ kind: allocation.kind, amount: centsToMoney(allocation.amountCents) })),
    ownerBalance: centsToMoney(ownerBalanceCents),
  };
}

export type AuctionSettlementImpoundDep = Pick<ImpoundRepository, "appendEvent" | "findProcessById">;

export interface AuctionSettlementRepository {
  // Estado consultável (GET .../settlement): a liquidação + allocations ordenadas. undefined = sem liquidação.
  getByProcess(tenantId: string, processId: string): Promise<SettlementView | undefined>;
  // Distribuição ATÔMICA (POST .../settlement): sob FOR UPDATE — re-checa AUCTION_CLOSED + ausência de settlement +
  // re-deriva base I7 sob o lock + ASSERT Σ==hammer + INSERT settlement + N allocations + AUCTION_SETTLEMENT — 1 tx.
  distributeSettlementAtomic(input: DistributeSettlementInput): Promise<DistributeSettlementResult>;
  reset?(): void;
}

// Constrói as N linhas de allocation (tiers §6º na ordem + OWNER_BALANCE ao fim) em cents→string. order_seq 1-based.
// Fonte ÚNICA compartilhada por InMemory e Prisma (mesma disciplina dos build*Payload do auction).
export function buildAllocationRows(
  input: DistributeSettlementInput,
  settlementId: string,
  now: Date,
): SettlementAllocation[] {
  const rows: SettlementAllocation[] = input.allocations.map((allocation, index) => ({
    id: randomUUID(),
    tenantId: input.tenantId,
    settlementId,
    processId: input.processId,
    orderSeq: index + 1,
    beneficiaryKind: allocation.kind,
    amount: centsToMoney(allocation.amountCents),
    claimAmount: centsToMoney(allocation.claimCents),
    createdAt: now,
  }));
  // OWNER_BALANCE SEMPRE gravado (mesmo 0), ao fim da cascata. É resíduo → NÃO tem claim_amount.
  rows.push({
    id: randomUUID(),
    tenantId: input.tenantId,
    settlementId,
    processId: input.processId,
    orderSeq: input.allocations.length + 1,
    beneficiaryKind: "OWNER_BALANCE",
    amount: centsToMoney(input.ownerBalanceCents),
    claimAmount: undefined,
    createdAt: now,
  });
  return rows;
}

// ASSERT belt-and-suspenders (I7): Σ(tiers) + ownerBalance == hammer. Falha ⇒ throw (a tx faz rollback — nenhuma
// distribuição parcial). É redundante com a construção do motor, mas protege contra input FORJADO (teste de atomicidade).
export function assertSettlementSum(input: DistributeSettlementInput): void {
  if (sumAllocationCents(input.allocations, input.ownerBalanceCents) !== input.hammerCents) {
    throw new AuctionSettlementError(
      500,
      "SETTLEMENT_INVARIANT",
      "settlement_allocation_mismatch",
      "Invariant I7 violated: the sum of settlement allocations must equal the hammer amount.",
    );
  }
}

// InMemory (espelha o Prisma 1:1; a corrida/atomicidade REAL = teste DB-gated). Compõe o impound repo de MEMÓRIA
// (ler o processo + ENCADEAR o CustodyEvent na cadeia existente via appendEvent — NÃO duplica a lógica probatória).
export class InMemoryAuctionSettlementRepository implements AuctionSettlementRepository {
  private readonly settlements: Settlement[] = [];
  private readonly allocations: SettlementAllocation[] = [];

  constructor(private readonly impound: AuctionSettlementImpoundDep) {}

  async getByProcess(tenantId: string, processId: string): Promise<SettlementView | undefined> {
    const settlement = this.settlements.find((s) => s.tenantId === tenantId && s.processId === processId);
    if (!settlement) return undefined;
    return { settlement, allocations: this.allocationsFor(settlement.id) };
  }

  async distributeSettlementAtomic(input: DistributeSettlementInput): Promise<DistributeSettlementResult> {
    const process = await this.impound.findProcessById(input.tenantId, input.processId);
    if (!process) {
      throw new AuctionSettlementError(404, "SETTLEMENT_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    // IDEMPOTÊNCIA (espelha o partial-unique settlements_process_idem_key): 2ª distribuição do MESMO processo devolve a
    // existente (created:false), NUNCA redistribui/sobrescreve — a distribuição de dinheiro jamais dobra.
    const existing = this.settlements.find((s) => s.tenantId === input.tenantId && s.processId === input.processId);
    if (existing) {
      return { settlement: existing, allocations: this.allocationsFor(existing.id), created: false };
    }
    // GATE de estado re-verificado (o Prisma re-verifica sob FOR UPDATE): a liquidação só ocorre em AUCTION_CLOSED.
    if (process.status !== input.expectedFrom) {
      throw new AuctionSettlementError(409, "SETTLEMENT_CONFLICT", "settlement_wrong_state", "The settlement can only be distributed for an auction-closed process.");
    }
    // ASSERT Σ==hammer (I7 belt-and-suspenders — throw→rollback se forjado).
    assertSettlementSum(input);
    const now = new Date();
    const settlement: Settlement = {
      id: randomUUID(),
      tenantId: input.tenantId,
      processId: input.processId,
      soldRound: input.soldRound,
      hammerAmount: centsToMoney(input.hammerCents),
      auctionCostAmount: centsToMoney(input.auctionCostCents),
      removalStorageClaim: centsToMoney(input.removalStorageCents),
      ownerBalanceAmount: centsToMoney(input.ownerBalanceCents),
      shortfallAmount: centsToMoney(input.shortfallCents),
      currency: input.currency,
      status: "DISTRIBUTED",
      ownerNotifyDueAt: input.ownerNotifyDueAt,
      ownerClaimExpiresAt: input.ownerClaimExpiresAt,
      distributedBy: input.actorId,
      createdAt: now,
      updatedAt: now,
    };
    this.settlements.push(settlement);
    const rows = buildAllocationRows(input, settlement.id, now);
    this.allocations.push(...rows);
    // AUCTION_SETTLEMENT encadeado (prova I2) — §2.8 { event, soldRound, hammer, breakdown, ownerBalance }, sem PII.
    await this.impound.appendEvent({
      tenantId: input.tenantId,
      processId: input.processId,
      event: {
        type: "AUCTION_SETTLEMENT",
        payload: buildSettlementEventPayload(input.soldRound, input.hammerCents, input.allocations, input.ownerBalanceCents),
        occurredAt: input.occurredAt,
        actorId: input.actorId,
      },
    });
    return { settlement, allocations: this.allocationsFor(settlement.id), created: true };
  }

  private allocationsFor(settlementId: string): readonly SettlementAllocation[] {
    return this.allocations
      .filter((allocation) => allocation.settlementId === settlementId)
      .sort((left, right) => left.orderSeq - right.orderSeq);
  }

  reset(): void {
    this.settlements.length = 0;
    this.allocations.length = 0;
  }
}
