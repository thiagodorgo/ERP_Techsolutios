import { env } from "../../config/env.js";
import { moneyToCents } from "../charging/charge.validators.js";
import { getMemoryImpoundRepositoryForTests } from "../impound/impound.service.js";
import type { ImpoundRepository } from "../impound/impound.repository.js";
import { FEDERAL_DEFAULTS } from "../jurisdiction/jurisdiction.defaults.js";
import { findActiveSoldRound, type AuctionRepository } from "./auction.repository.js";
import { getMemoryAuctionRepositoryForTests } from "./auction.service.js";
import { distributeCascade, InMemoryAuctionSettlementRepository, type AuctionSettlementRepository } from "./auction.settlement.repository.js";
import {
  AuctionSettlementError,
  type CascadeClaim,
  type DistributeSettlementResult,
  type SettlementCycleResult,
  type SettlementView,
} from "./auction.settlement.types.js";
import { parseClaimCents, parseRecipientRef } from "./auction.settlement.validators.js";
import { parseRequiredUuid } from "./auction.validators.js";

type RawRecord = Record<string, unknown>;

// Ports injetados (testáveis por DI). O serviço ORQUESTRA: gate AUCTION_CLOSED + base I7 (findActiveSoldRound) +
// claim item I (charging READ-ONLY) + distributeCascade PURO; o repositório re-verifica sob o lock e persiste 1 tx.
export type SettlementProcessPort = Pick<ImpoundRepository, "findProcessById">;
export type SettlementAuctionStatePort = Pick<AuctionRepository, "getState">;
export type SettlementCascadeClaimPort = (tenantId: string, processId: string) => Promise<{ claimCents: number; currency: string } | undefined>;

export class AuctionSettlementService {
  constructor(
    private readonly repository: AuctionSettlementRepository,
    private readonly impound: SettlementProcessPort,
    private readonly auction: SettlementAuctionStatePort,
    private readonly cascadeClaim: SettlementCascadeClaimPort,
  ) {}

  // GET /impound-processes/:id/auction/settlement (impound:read) — a liquidação + allocations ordenadas. 404 se sem
  // liquidação registrada (o processo pode existir sem ter sido liquidado ainda).
  async get(actor: { tenantId: string }, processId: string): Promise<SettlementView> {
    const normalizedId = parseRequiredUuid(processId, "processId");
    const view = await this.repository.getByProcess(actor.tenantId, normalizedId);
    if (!view) {
      throw new AuctionSettlementError(404, "SETTLEMENT_NOT_FOUND", "settlement_not_found", "No settlement has been distributed for this process.");
    }
    return view;
  }

  // POST /impound-processes/:id/auction/settlement (impound:transition) — DISTRIBUIÇÃO em cascata §6º (I7). GATE
  // AUCTION_CLOSED (o repo re-verifica sob FOR UPDATE). hammer = soldAmount da SOLD EFETIVA (findActiveSoldRound —
  // NUNCA Σ sold_amount; não dupla-conta revenda). item I (REMOVAL_STORAGE) COMPUTADO/capado pelo charging; os demais
  // tiers são DECLARADOS no corpo (≥0). distributeCascade PURO → INSERT settlement + N allocations + AUCTION_SETTLEMENT
  // — 1 tx atômica. Idempotente (2ª chamada devolve a existente). SEM transição de FSM (settlement é registro sobre
  // AUCTION_CLOSED). SEM PSP (pagamento manual/externo — PD-SIGN).
  async distribute(actor: { tenantId: string; userId?: string }, processId: string, body: RawRecord): Promise<DistributeSettlementResult> {
    const normalizedId = parseRequiredUuid(processId, "processId");
    const process = await this.impound.findProcessById(actor.tenantId, normalizedId);
    if (!process) {
      throw new AuctionSettlementError(404, "SETTLEMENT_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    // Barra cedo (reason claro p/ a UI; o repo RE-VERIFICA sob FOR UPDATE via expectedFrom): a liquidação só ocorre em
    // AUCTION_CLOSED (ACTIVE_CUSTODY/AUCTIONED/DIRECT_RECYCLING → 409 settlement_wrong_state; a sucata não tem produto).
    if (process.status !== "AUCTION_CLOSED") {
      throw new AuctionSettlementError(409, "SETTLEMENT_CONFLICT", "settlement_wrong_state", "The settlement can only be distributed for an auction-closed process.");
    }
    // BASE de I7 (findActiveSoldRound — a SOLD não superada por inadimplência; NUNCA Σ sold_amount). Sem SOLD efetiva
    // com soldAmount ⇒ 409 settlement_sale_missing (uma consumação sem venda registrada não distribui produto).
    const state = await this.auction.getState(actor.tenantId, normalizedId);
    const soldRound = findActiveSoldRound(state?.attempts ?? []);
    const soldAttempt = state?.attempts.find((attempt) => attempt.outcome === "SOLD" && attempt.roundNumber === soldRound);
    if (soldRound === undefined || soldAttempt?.soldAmount === undefined) {
      throw new AuctionSettlementError(409, "SETTLEMENT_GUARD_FAILED", "settlement_sale_missing", "The settlement requires an effective recorded sale (SOLD) with a hammer amount.");
    }
    const hammerCents = moneyToCents(soldAttempt.soldAmount);

    // Tiers EXTERNOS declarados (Decimal strings ≥0 → centavos inteiros). Ausente ⇒ 0 (sem reclamação).
    const auctionCostCents = parseClaimCents(body.auction_cost ?? body.auctionCost, "auction_cost");
    const vehicleTaxesCents = parseClaimCents(body.vehicle_taxes ?? body.vehicleTaxes, "vehicle_taxes");
    const priorityCreditorsCents = parseClaimCents(body.priority_creditors ?? body.priorityCreditors, "priority_creditors");
    const realizingAgencyFinesCents = parseClaimCents(body.realizing_agency_fines ?? body.realizingAgencyFines, "realizing_agency_fines");
    const otherSntFinesCents = parseClaimCents(body.other_snt_fines ?? body.otherSntFines, "other_snt_fines");
    const otherDebitsCents = parseClaimCents(body.other_debits ?? body.otherDebits, "other_debits");

    // Item I (REMOVAL_STORAGE) COMPUTADO/capado pelo charging (READ-ONLY; NÃO escreve no ledger). Sem ledger ⇒ 0/BRL.
    const itemI = await this.cascadeClaim(actor.tenantId, normalizedId);
    const removalStorageCents = itemI?.claimCents ?? 0;
    const currency = itemI?.currency ?? "BRL";

    // A cascata NA ORDEM LEGAL do §6º (custeio → I → II → III → IV → V → VI).
    const claims: readonly CascadeClaim[] = [
      { kind: "AUCTION_COST", claimCents: auctionCostCents },
      { kind: "REMOVAL_STORAGE", claimCents: removalStorageCents },
      { kind: "VEHICLE_TAXES", claimCents: vehicleTaxesCents },
      { kind: "PRIORITY_CREDITORS", claimCents: priorityCreditorsCents },
      { kind: "REALIZING_AGENCY_FINES", claimCents: realizingAgencyFinesCents },
      { kind: "OTHER_SNT_FINES", claimCents: otherSntFinesCents },
      { kind: "OTHER_DEBITS", claimCents: otherDebitsCents },
    ];
    const { allocations, ownerBalanceCents, shortfallCents } = distributeCascade(hammerCents, claims);

    const now = new Date();
    return this.repository.distributeSettlementAtomic({
      tenantId: actor.tenantId,
      processId: normalizedId,
      expectedFrom: "AUCTION_CLOSED",
      soldRound,
      hammerCents,
      allocations,
      ownerBalanceCents,
      shortfallCents,
      auctionCostCents,
      removalStorageCents,
      currency,
      // Janela do saldo ao ex-dono (§12): +30d p/ notificar; +5a p/ reclamar (depois Funset — 14b). Só GRAVADOS em 14a.
      ownerNotifyDueAt: addDays(now, FEDERAL_DEFAULTS.ownerBalanceNotifyDays),
      ownerClaimExpiresAt: addYears(now, FEDERAL_DEFAULTS.ownerBalanceClaimYears),
      actorId: actor.userId,
      occurredAt: now,
    });
  }

  // POST /impound-processes/:id/auction/settlement/claim-balance (impound:transition) — Ω5P PR-14b. REGISTRO manual da
  // RETIRADA do saldo pelo ex-proprietário (pagamento presencial, SEM PSP — D-Ω5P-07). Gate REAL sob FOR UPDATE no
  // repositório: status==DISTRIBUTED + owner_balance>0 + now<owner_claim_expires_at → BALANCE_CLAIMED + AUCTION_SETTLEMENT
  // {phase:CLAIM}. NÃO redistribui (allocations do 14a intocadas — o saldo já foi alocado como OWNER_BALANCE). O corpo só
  // traz o recebedor MASCARADO (§2.8) — o gate não consome mais nada (o saldo é o resíduo já apurado).
  async claimBalance(actor: { tenantId: string; userId?: string }, processId: string, body: RawRecord): Promise<SettlementCycleResult> {
    const normalizedId = parseRequiredUuid(processId, "processId");
    const recipientRef = parseRecipientRef(body.claim_recipient_ref ?? body.claimRecipientRef ?? body.recipient_ref);
    const now = new Date();
    return this.repository.transitionBalanceAtomic("CLAIM", {
      tenantId: actor.tenantId,
      processId: normalizedId,
      recipientRef,
      actorId: actor.userId,
      now,
      occurredAt: now,
    });
  }

  // POST /impound-processes/:id/auction/settlement/revert-funset (impound:transition) — Ω5P PR-14b. REVERSÃO do saldo
  // NÃO reclamado ao Funset (art. 320/§12) após o prazo. Gate REAL sob FOR UPDATE: status==DISTRIBUTED + owner_balance>0
  // + now>=owner_claim_expires_at → BALANCE_REVERTED_FUNSET + AUCTION_SETTLEMENT{phase:FUNSET_REVERSION}. É o ATO gated
  // (o disparo AUTOMÁTICO em D+5a — sweep — é Ω6). NÃO redistribui. MUTUAMENTE EXCLUSIVO com o claim (o gate garante).
  async revertToFunset(actor: { tenantId: string; userId?: string }, processId: string): Promise<SettlementCycleResult> {
    const normalizedId = parseRequiredUuid(processId, "processId");
    const now = new Date();
    return this.repository.transitionBalanceAtomic("FUNSET_REVERSION", {
      tenantId: actor.tenantId,
      processId: normalizedId,
      actorId: actor.userId,
      now,
      occurredAt: now,
    });
  }
}

// +N dias (UTC-safe: ms puros). O saldo notifica em <=30d — precisão de dia basta.
function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 86_400_000);
}

// +N anos leap-safe (setFullYear preserva mês/dia; 29/02 → 28/02 no ano não bissexto — determinístico).
function addYears(base: Date, years: number): Date {
  const result = new Date(base.getTime());
  result.setFullYear(result.getFullYear() + years);
  return result;
}

// ── runtime (env-gate memory×prisma), espelha auction.service.ts ────────────────────────────────────────────────
const memorySettlementRepository = new InMemoryAuctionSettlementRepository(getMemoryImpoundRepositoryForTests());
let defaultSettlementServicePromise: Promise<AuctionSettlementService> | undefined;

export function createMemoryAuctionSettlementService(): AuctionSettlementService {
  return new AuctionSettlementService(
    memorySettlementRepository,
    getMemoryImpoundRepositoryForTests(),
    getMemoryAuctionRepositoryForTests(),
    (tenantId, processId) => memoryCascadeClaim(tenantId, processId),
  );
}

export function getMemoryAuctionSettlementRepositoryForTests(): InMemoryAuctionSettlementRepository {
  return memorySettlementRepository;
}

async function memoryCascadeClaim(tenantId: string, processId: string): Promise<{ claimCents: number; currency: string } | undefined> {
  const { createMemoryChargeService } = await import("../charging/charge.service.js");
  return createMemoryChargeService().getCascadeExpenseClaim(tenantId, processId);
}

export async function createDefaultAuctionSettlementService(): Promise<AuctionSettlementService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryAuctionSettlementService();
  }
  defaultSettlementServicePromise ??= createPrismaAuctionSettlementService();
  return defaultSettlementServicePromise;
}

export function resetAuctionSettlementRuntimeForTests(): void {
  memorySettlementRepository.reset();
  defaultSettlementServicePromise = undefined;
}

async function createPrismaAuctionSettlementService(): Promise<AuctionSettlementService> {
  const { createPrismaAuctionSettlementRepository, createPrismaSettlementPorts } = await import("./auction-settlement-prisma.repository.js");
  const [repository, ports] = await Promise.all([createPrismaAuctionSettlementRepository(), createPrismaSettlementPorts()]);
  return new AuctionSettlementService(repository, ports.impound, ports.auction, ports.cascadeClaim);
}
