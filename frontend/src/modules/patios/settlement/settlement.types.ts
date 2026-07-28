// Ω5P PR-15b — Liquidação em cascata §6º (dossiê de liquidação no console do operador). Consome o módulo backend
// `auction.settlement` (PR-14a/14b) via /impound-processes/:id/auction/settlement*. A UI NÃO reimplementa regra: a
// cascata I7 (Σ das alocações = arremate, por construção), o ciclo do saldo (§12) e a hash-chain vivem no backend —
// a UI molda por can(...), EXIBE o que o backend gravou e delega ao 403/409. Neutralidade white-label: "leilão /
// liquidação / cascata / credores / multas / tributos / saldo ao proprietário / Funset", NUNCA "polícia" nem termo
// técnico ("tenant").
//
// §2.8/allowlist: tenant_id NUNCA é renderizado (resolvido pelo ator autenticado). distributedBy/claimedBy são UUID
// de ator interno → SUPRIMIDOS (nem entram na view adaptada, jamais renderizados). claimRecipientRef/reference já
// vêm MASCARADOS do backend (renderiza a máscara, jamais PII completa). Dinheiro é string canônica "0.00" do ledger
// (a UI NUNCA calcula dinheiro — só formata via formatMoney o que o backend gravou).

import type { ImpoundStatus } from "../processes/processes.types";

// Enums em inglês (código/claims); rótulo PT-BR vem do backend em *Label (a UI reusa, não recria). Os tiers da ordem
// legal §6º + OWNER_BALANCE (resíduo, §12) + FUNSET (reversão do saldo não reclamado, 14b).
export type SettlementBeneficiaryKind =
  | "AUCTION_COST"
  | "REMOVAL_STORAGE"
  | "VEHICLE_TAXES"
  | "PRIORITY_CREDITORS"
  | "REALIZING_AGENCY_FINES"
  | "OTHER_SNT_FINES"
  | "OTHER_DEBITS"
  | "OWNER_BALANCE"
  | "FUNSET";

// status da liquidação (app-validado no backend). 14a grava DISTRIBUTED; o ciclo do saldo (14b) leva a
// BALANCE_CLAIMED (retirada pelo ex-dono) OU BALANCE_REVERTED_FUNSET (reversão após o prazo) — MUTUAMENTE EXCLUSIVOS.
export type SettlementStatus = "DISTRIBUTED" | "BALANCE_CLAIMED" | "BALANCE_REVERTED_FUNSET";

// SettlementDto — espelha src/modules/auction/auction.settlement.dto.ts toSettlementDto (NÃO inventar campo). Dinheiro
// como string canônica "0.00"; datas ISO. §2.8: distributedBy/claimedBy (UUID de ator) NÃO são adaptados — jamais na
// UI. claimRecipientRef já vem MASCARADO. hammerAmount é a base do I7 (o total distribuído; Σ das alocações == ele).
export type SettlementDto = {
  readonly id: string;
  readonly processId: string;
  readonly soldRound: number | null;
  readonly hammerAmount: string;
  readonly auctionCostAmount: string | null;
  readonly removalStorageClaim: string | null;
  readonly ownerBalanceAmount: string | null;
  readonly shortfallAmount: string | null;
  readonly currency: string;
  readonly status: SettlementStatus;
  readonly statusLabel: string;
  // Janela do saldo ao ex-dono (§12): +30d p/ notificar; +5a p/ reclamar (depois o saldo reverte ao Funset).
  readonly ownerNotifyDueAt: string | null;
  readonly ownerClaimExpiresAt: string | null;
  // Ciclo do saldo (14b): desfecho terminal. claimRecipientRef MASCARADO (§2.8). claimedBy/distributedBy suprimidos.
  readonly claimedAt: string | null;
  readonly claimRecipientRef: string | null;
  readonly revertedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

// AllocationDto — espelha toSettlementAllocationDto. orderSeq 1-based (ordem legal §6º). amount = valor ALOCADO
// (min(remaining, claim)); claimAmount = valor RECLAMADO do tier (OWNER_BALANCE é resíduo → sem claim). reference
// MASCARADA (§2.8). beneficiaryKind (inglês) + beneficiaryLabel PT-BR do backend.
export type SettlementAllocationDto = {
  readonly id: string;
  readonly orderSeq: number;
  readonly beneficiaryKind: SettlementBeneficiaryKind;
  readonly beneficiaryLabel: string;
  readonly amount: string;
  readonly claimAmount: string | null;
  readonly reference: string | null; // já mascarada pelo backend (§2.8)
};

// GET /impound-processes/:id/auction/settlement → { data: { settlement, allocations[] } }. O POST de distribuição
// devolve o mesmo shape (+created, ignorado) e o ciclo (+phase, ignorado) — o adapter lê só settlement+allocations.
export type SettlementView = {
  readonly settlement: SettlementDto;
  readonly allocations: readonly SettlementAllocationDto[];
};

// ── Inputs das ações (corpo REST em snake_case — contrato do auction.settlement.service.ts) ────────────────────────
// Distribuição em cascata §6º (impound:transition). SÓ os 6 tiers DECLARADOS (≥0). O arremate (hammer) é apurado da
// venda efetiva pelo backend e a remoção/estada (item I) é COMPUTADA pelo charging — NENHUM dos dois é input.
export type DistributeInput = {
  readonly auctionCost?: string;
  readonly vehicleTaxes?: string;
  readonly priorityCreditors?: string;
  readonly realizingAgencyFines?: string;
  readonly otherSntFines?: string;
  readonly otherDebits?: string;
};

// Retirada do saldo pelo ex-proprietário (impound:transition, §12). claimRecipientRef OPCIONAL e MINIMIZADO
// (§2.8: rótulo mascarado do recebedor, NUNCA PII completa — o backend impõe o teto e a máscara).
export type ClaimBalanceInput = {
  readonly claimRecipientRef?: string;
};

export type SettlementApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

// Resultado efetivo do certame (SÓ para o comprovante) — projeção da rodada SOLD do módulo auction. winnerRef
// MASCARADO (§2.8); soldAmount público (base de I7). Opcional: sem a rodada carregada o comprovante usa o hammer
// do próprio settlement.
export type CertameResult = {
  readonly roundNumber: number;
  readonly winnerRef: string | null; // já mascarado pelo backend (§2.8)
  readonly soldAmount: string | null;
  readonly saleNoteReference: string | null;
};

// Estágio do painel (PURO) — orquestra a UI por process.status × existência de liquidação. A liquidação só ocorre
// sobre AUCTION_CLOSED; em outros estados o painel é silencioso (não há ato de liquidação disponível).
export type SettlementStage =
  | "distribute" // AUCTION_CLOSED sem liquidação: distribuir a cascata §6º
  | "settled" // liquidação distribuída: cascata + ciclo do saldo + comprovante
  | "unavailable"; // demais estados sem liquidação: o painel não se renderiza
