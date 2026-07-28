import type {
  DistributeSettlementResult,
  Settlement,
  SettlementAllocation,
  SettlementBeneficiaryKind,
  SettlementCycleResult,
  SettlementStatus,
  SettlementView,
} from "./auction.settlement.types.js";

// Labels PT-BR (neutralidade white-label: "custeio do leilão/remoção e estada/saldo ao proprietário/Funset", NUNCA
// "polícia"). Os tiers do §6º na ordem legal + OWNER_BALANCE (resíduo) + FUNSET (14b).
const BENEFICIARY_LABELS: Record<SettlementBeneficiaryKind, string> = {
  AUCTION_COST: "Custeio do leilão",
  REMOVAL_STORAGE: "Remoção e estada",
  VEHICLE_TAXES: "Tributos do veículo",
  PRIORITY_CREDITORS: "Credores preferenciais",
  REALIZING_AGENCY_FINES: "Multas do órgão realizador",
  OTHER_SNT_FINES: "Demais multas do SNT",
  OTHER_DEBITS: "Demais débitos",
  OWNER_BALANCE: "Saldo ao proprietário",
  FUNSET: "Funset",
};

const STATUS_LABELS: Record<SettlementStatus, string> = {
  DISTRIBUTED: "Distribuído",
  BALANCE_CLAIMED: "Saldo reclamado",
  BALANCE_REVERTED_FUNSET: "Saldo revertido ao Funset",
};

// §allowlist: tenant_id NUNCA exposto (resolvido pelo ator autenticado). Superfície do CONSOLE AUTENTICADO
// (impound:read/transition). Dinheiro como string canônica "0.00"; datas ISO. distributed_by = ator interno (UUID),
// NÃO é PII do proprietário. Nenhum CPF/nome de ex-dono/arrematante/credor entra aqui (§2.8).
export function toSettlementDto(settlement: Settlement) {
  return {
    id: settlement.id,
    processId: settlement.processId,
    soldRound: settlement.soldRound ?? null,
    hammerAmount: settlement.hammerAmount,
    auctionCostAmount: settlement.auctionCostAmount ?? null,
    removalStorageClaim: settlement.removalStorageClaim ?? null,
    ownerBalanceAmount: settlement.ownerBalanceAmount ?? null,
    shortfallAmount: settlement.shortfallAmount ?? null,
    currency: settlement.currency,
    status: settlement.status,
    statusLabel: STATUS_LABELS[settlement.status],
    ownerNotifyDueAt: settlement.ownerNotifyDueAt ? settlement.ownerNotifyDueAt.toISOString() : null,
    ownerClaimExpiresAt: settlement.ownerClaimExpiresAt ? settlement.ownerClaimExpiresAt.toISOString() : null,
    distributedBy: settlement.distributedBy ?? null,
    // Ω5P PR-14b — ciclo do saldo (§12). claimedBy/distributedBy = atores internos (UUID), NÃO PII do ex-dono.
    // claimRecipientRef já vem MINIMIZADO/MASCARADO (§2.8) — o rótulo do recebedor, nunca CPF/nome cru.
    claimedBy: settlement.claimedBy ?? null,
    claimedAt: settlement.claimedAt ? settlement.claimedAt.toISOString() : null,
    claimRecipientRef: settlement.claimRecipientRef ?? null,
    revertedAt: settlement.revertedAt ? settlement.revertedAt.toISOString() : null,
    createdAt: settlement.createdAt.toISOString(),
    updatedAt: settlement.updatedAt.toISOString(),
  };
}

// §allowlist: reference já vem MASCARADA da persistência (§2.8: nunca PII de credor/arrematante). amount/claimAmount
// strings canônicas. beneficiaryKind (INGLÊS) + label PT-BR.
export function toSettlementAllocationDto(allocation: SettlementAllocation) {
  return {
    id: allocation.id,
    orderSeq: allocation.orderSeq,
    beneficiaryKind: allocation.beneficiaryKind,
    beneficiaryLabel: BENEFICIARY_LABELS[allocation.beneficiaryKind],
    amount: allocation.amount,
    claimAmount: allocation.claimAmount ?? null,
    reference: allocation.reference ?? null,
    createdAt: allocation.createdAt.toISOString(),
  };
}

export function toSettlementViewDto(view: SettlementView) {
  return {
    data: {
      settlement: toSettlementDto(view.settlement),
      allocations: view.allocations.map(toSettlementAllocationDto),
    },
  };
}

// Resultado do POST: a view + created (false = idempotência: 2ª distribuição devolve a existente).
export function toDistributeSettlementDto(result: DistributeSettlementResult) {
  return {
    data: {
      settlement: toSettlementDto(result.settlement),
      allocations: result.allocations.map(toSettlementAllocationDto),
      created: result.created,
    },
  };
}

// Ω5P PR-14b — resultado do ciclo do saldo (claim-balance | revert-funset): a view atualizada + a fase consumada. As
// allocations vão INTOCADAS (o ciclo é state-change, não redistribuição — Σ==hammer do 14a preservado).
export function toSettlementCycleDto(result: SettlementCycleResult) {
  return {
    data: {
      settlement: toSettlementDto(result.settlement),
      allocations: result.allocations.map(toSettlementAllocationDto),
      phase: result.phase,
    },
  };
}
