import type { ImpoundStatus } from "../impound/impound.types.js";

// Ω5P PR-14a — LIQUIDAÇÃO em cascata §6º (núcleo I7). Enums em INGLÊS validados na APP (SEM CHECK de enum no banco);
// labels PT-BR no DTO. Dinheiro em CENTAVOS INTEIROS EXATOS no motor (nunca float); string Decimal(12,2) na fronteira.

// beneficiary_kind — os tiers da ordem legal do §6º + OWNER_BALANCE (resíduo, §12) + FUNSET (reversão, 14b).
// AUCTION_COST            = custeio do leilão (topo, rateio proporcional off-system — declarado por processo)
// REMOVAL_STORAGE         = I remoção/estada (COMPUTADO pelo charging, capado ao teto I4/CTB §10)
// VEHICLE_TAXES           = II tributos do veículo (declarado)
// PRIORITY_CREDITORS      = III credores preferenciais (CTN 186 — declarado)
// REALIZING_AGENCY_FINES  = IV multas do órgão realizador (declarado)
// OTHER_SNT_FINES         = V demais multas do SNT (cronológica — declarado)
// OTHER_DEBITS            = VI demais débitos (declarado)
// OWNER_BALANCE           = saldo ao ex-dono = resíduo (SEMPRE gravado, mesmo =0)
// FUNSET                  = reversão do saldo não reclamado ao Funset (14b; declarado aqui p/ aditividade)
export const SETTLEMENT_BENEFICIARY_KINDS = [
  "AUCTION_COST",
  "REMOVAL_STORAGE",
  "VEHICLE_TAXES",
  "PRIORITY_CREDITORS",
  "REALIZING_AGENCY_FINES",
  "OTHER_SNT_FINES",
  "OTHER_DEBITS",
  "OWNER_BALANCE",
  "FUNSET",
] as const;
export type SettlementBeneficiaryKind = (typeof SETTLEMENT_BENEFICIARY_KINDS)[number];

// A ORDEM LEGAL da cascata §6º (PD-Ω5P-CASCADE-ORDER, 3 fontes): custeio → I → II → III → IV → V → VI. OWNER_BALANCE
// é o resíduo (não é um tier reclamável) e FUNSET é do 14b — NENHUM dos dois entra na cascata de tiers.
export const CASCADE_TIER_ORDER: readonly SettlementBeneficiaryKind[] = [
  "AUCTION_COST",
  "REMOVAL_STORAGE",
  "VEHICLE_TAXES",
  "PRIORITY_CREDITORS",
  "REALIZING_AGENCY_FINES",
  "OTHER_SNT_FINES",
  "OTHER_DEBITS",
];

// status da liquidação (app-validado). 14a só grava DISTRIBUTED; o ciclo do saldo (BALANCE_CLAIMED/
// BALANCE_REVERTED_FUNSET) é 14b.
export const SETTLEMENT_STATUSES = ["DISTRIBUTED", "BALANCE_CLAIMED", "BALANCE_REVERTED_FUNSET"] as const;
export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number];

// Uma liquidação (1 por processo). Dinheiro como string canônica "0.00" (Decimal(12,2)). soldRound = a rodada da
// SOLD efetiva (findActiveSoldRound; base de I7). shortfallAmount = Σclaims − hammer (informativo, não é allocation).
export type Settlement = {
  readonly id: string;
  readonly tenantId: string;
  readonly processId: string;
  readonly soldRound?: number;
  readonly hammerAmount: string;
  readonly auctionCostAmount?: string;
  readonly removalStorageClaim?: string;
  readonly ownerBalanceAmount?: string;
  readonly shortfallAmount?: string;
  readonly currency: string;
  readonly status: SettlementStatus;
  readonly ownerNotifyDueAt?: Date;
  readonly ownerClaimExpiresAt?: Date;
  readonly distributedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

// Uma linha do rateio (append-only). order_seq 1-based (ordem §6º). amount = valor ALOCADO (min(remaining, claim),
// centavo exato); claimAmount = valor RECLAMADO do tier (OWNER_BALANCE não tem claim). reference mascarada (§2.8).
export type SettlementAllocation = {
  readonly id: string;
  readonly tenantId: string;
  readonly settlementId: string;
  readonly processId: string;
  readonly orderSeq: number;
  readonly beneficiaryKind: SettlementBeneficiaryKind;
  readonly amount: string;
  readonly claimAmount?: string;
  readonly reference?: string;
  readonly createdAt: Date;
};

// Projeção consultável (GET .../settlement) e resultado do POST: a liquidação + suas allocations ordenadas.
export type SettlementView = {
  readonly settlement: Settlement;
  readonly allocations: readonly SettlementAllocation[];
};

// Resultado do POST: a view + created (false = idempotência: 2ª distribuição devolve a existente, nunca redistribui).
export type DistributeSettlementResult = {
  readonly settlement: Settlement;
  readonly allocations: readonly SettlementAllocation[];
  readonly created: boolean;
};

// ── motor PURO ────────────────────────────────────────────────────────────────────────────────────────────────
// Claim de um tier em centavos INTEIROS (o valor RECLAMADO). O motor distributeCascade consome NA ORDEM.
export type CascadeClaim = {
  readonly kind: SettlementBeneficiaryKind;
  readonly claimCents: number;
};

// Uma alocação computada pelo motor (ainda em centavos; a persistência converte p/ string). amountCents = alocado.
export type CascadeAllocation = {
  readonly kind: SettlementBeneficiaryKind;
  readonly amountCents: number;
  readonly claimCents: number;
};

export type CascadeResult = {
  readonly allocations: readonly CascadeAllocation[]; // os N tiers (ordem §6º); OWNER_BALANCE é separado
  readonly ownerBalanceCents: number;                 // resíduo (SEMPRE, mesmo 0)
  readonly shortfallCents: number;                    // max(0, Σclaims − hammer) — informativo
};

// ── input de repositório ──────────────────────────────────────────────────────────────────────────────────────
// distributeSettlementAtomic: sob FOR UPDATE do processo — re-checa AUCTION_CLOSED (expectedFrom) + ausência de
// settlement (partial-unique) + re-deriva a base I7 (findActiveSoldRound) sob o lock + ASSERT Σalloc==hammer + INSERT
// settlement + N allocations (tiers + OWNER_BALANCE) + appendEventTx(AUCTION_SETTLEMENT) + cross-anchor — 1 tx.
export type DistributeSettlementInput = {
  readonly tenantId: string;
  readonly processId: string;
  readonly expectedFrom: ImpoundStatus; // AUCTION_CLOSED
  readonly soldRound: number;
  readonly hammerCents: number;
  readonly allocations: readonly CascadeAllocation[]; // tiers (ordem §6º)
  readonly ownerBalanceCents: number;
  readonly shortfallCents: number;
  readonly auctionCostCents: number;      // resumo (tier topo) p/ a coluna settlements.auction_cost_amount
  readonly removalStorageCents: number;   // resumo (item I computado) p/ settlements.removal_storage_claim
  readonly currency: string;
  readonly ownerNotifyDueAt: Date;
  readonly ownerClaimExpiresAt: Date;
  readonly actorId?: string;
  readonly occurredAt: Date;
};

export class AuctionSettlementError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "AuctionSettlementError";
  }
}
