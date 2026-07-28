import { formatDateTime, formatMoney } from "../charges/charges.adapter";
import type { ImpoundStatus } from "../processes/processes.types";
import type {
  SettlementAllocationDto,
  SettlementBeneficiaryKind,
  SettlementDto,
  SettlementStage,
  SettlementStatus,
  SettlementView,
} from "./settlement.types";

export { formatDateTime, formatMoney };

type ChipTone = "default" | "success" | "warning" | "danger" | "info" | "pending" | "audit";

const BENEFICIARY_KINDS: readonly SettlementBeneficiaryKind[] = [
  "AUCTION_COST",
  "REMOVAL_STORAGE",
  "VEHICLE_TAXES",
  "PRIORITY_CREDITORS",
  "REALIZING_AGENCY_FINES",
  "OTHER_SNT_FINES",
  "OTHER_DEBITS",
  "OWNER_BALANCE",
  "FUNSET",
];

const SETTLEMENT_STATUSES: readonly SettlementStatus[] = ["DISTRIBUTED", "BALANCE_CLAIMED", "BALANCE_REVERTED_FUNSET"];

// Rótulos PT-BR de FALLBACK (o backend já devolve beneficiaryLabel/statusLabel; a UI reusa e só cai aqui se ausente).
// White-label: "custeio do leilão / remoção e estada / tributos / credores / multas / saldo ao proprietário / Funset",
// NUNCA "polícia".
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

export function getBeneficiaryLabel(kind: SettlementBeneficiaryKind | string | null | undefined): string {
  return BENEFICIARY_LABELS[(kind ?? "OTHER_DEBITS") as SettlementBeneficiaryKind] ?? "Beneficiário";
}

export function getSettlementStatusLabel(status: SettlementStatus | string | null | undefined): string {
  return STATUS_LABELS[(status ?? "DISTRIBUTED") as SettlementStatus] ?? "Distribuído";
}

// §11 — tom semântico do estado da liquidação: distribuído=azul (ativo), saldo reclamado=verde (desfecho ao ex-dono),
// revertido ao Funset=neutro (terminal legal).
export function getSettlementStatusTone(status: SettlementStatus): ChipTone {
  if (status === "BALANCE_CLAIMED") return "success";
  if (status === "BALANCE_REVERTED_FUNSET") return "default";
  return "info";
}

// ── reason 409/400/404 → PT-BR (white-label) ────────────────────────────────────────────────────────────────────
// O `reason` vem do corpo do erro do backend ({ error:{ code, reason } }). Cobre TODOS os reasons DISTINTOS do
// serviço/repositório de liquidação: distribuição (settlement_wrong_state / settlement_sale_missing), ciclo do saldo
// (balance_claim_wrong_state / balance_zero / balance_claim_expired / funset_wrong_state / funset_not_yet_due), os
// 400 de validação (claim_recipient_ref_too_long / <tier>_invalid) e process_not_found. NUNCA vaza corpo cru nem cai
// no genérico para um reason conhecido.
export function settlementActionErrorMessage(reason: string | null | undefined, status?: number): string {
  switch (reason) {
    // Distribuição da cascata §6º.
    case "settlement_wrong_state":
      return "A liquidação só pode ser distribuída com o leilão encerrado (venda consumada).";
    case "settlement_sale_missing":
      return "A liquidação exige uma venda efetiva registrada, com o valor de arremate apurado.";
    // Ciclo do saldo ao ex-proprietário (§12).
    case "balance_claim_wrong_state":
      return "O saldo só pode ser retirado a partir de uma liquidação distribuída.";
    case "balance_zero":
      return "Não há saldo ao proprietário a movimentar nesta liquidação.";
    case "balance_claim_expired":
      return "O prazo para o proprietário retirar o saldo expirou; o saldo agora reverte ao Funset.";
    case "funset_wrong_state":
      return "Somente o saldo de uma liquidação distribuída pode reverter ao Funset.";
    case "funset_not_yet_due":
      return "O prazo para o proprietário retirar o saldo ainda está aberto; o saldo não pode reverter ao Funset agora.";
    // Validação (400).
    case "claim_recipient_ref_too_long":
      return "A referência de quem recebe o saldo é longa demais (use um rótulo minimizado, não dados pessoais completos).";
    case "auction_cost_invalid":
    case "vehicle_taxes_invalid":
    case "priority_creditors_invalid":
    case "realizing_agency_fines_invalid":
    case "other_snt_fines_invalid":
    case "other_debits_invalid":
      return "Informe um valor válido (número não negativo, com até duas casas decimais).";
    // Defensivos.
    case "settlement_not_found":
      return "Ainda não há liquidação distribuída para este processo.";
    case "process_not_found":
      return "Processo de custódia não encontrado.";
    default:
      if (status === 401 || status === 403) return "Sessão expirada ou sem permissão para conduzir a liquidação.";
      if (status === 404) return "Recurso da liquidação não encontrado. Recarregue o dossiê.";
      if (status === 409) return "O estado da liquidação mudou. Recarregue o dossiê e tente novamente.";
      return "Não foi possível concluir a ação de liquidação.";
  }
}

// ── Estágio do painel (PURO) — orquestra a UI por process.status × existência de liquidação ───────────────────────
// A liquidação só ocorre sobre AUCTION_CLOSED. Sem liquidação e fora do estado → o painel não se renderiza (silencioso).
export function resolveSettlementStage(status: ImpoundStatus, view: SettlementView | null): SettlementStage {
  if (view) return "settled";
  if (status === "AUCTION_CLOSED") return "distribute";
  return "unavailable";
}

// ── Cascata: parte os tiers (ordem §6º) do resíduo OWNER_BALANCE ───────────────────────────────────────────────────
// A allocation OWNER_BALANCE é o resíduo (SEMPRE gravada, mesmo 0) e vem ao fim (orderSeq maior). Para a tabela,
// separamos os N tiers (na ordem legal, por orderSeq) do saldo ao proprietário — a prova visual do I7 é o rodapé
// Σ == arremate (hammerAmount), exibido DIRETO do DTO (a UI NUNCA soma dinheiro para afirmar o total).
export type CascadeSplit = {
  readonly tiers: readonly SettlementAllocationDto[];
  readonly ownerBalance: SettlementAllocationDto | null;
};

export function splitCascade(allocations: readonly SettlementAllocationDto[]): CascadeSplit {
  const ordered = [...allocations].sort((a, b) => a.orderSeq - b.orderSeq);
  return {
    tiers: ordered.filter((allocation) => allocation.beneficiaryKind !== "OWNER_BALANCE"),
    ownerBalance: ordered.find((allocation) => allocation.beneficiaryKind === "OWNER_BALANCE") ?? null,
  };
}

// Dinheiro > 0? (HINT de estado, NÃO cálculo de valor exibido). Parse defensivo da string canônica; o backend é a
// AUTORIDADE (balance_zero 409 recarrega). Usado para orquestrar o ciclo do saldo, nunca para exibir um total.
export function isPositiveMoney(value: string | null | undefined): boolean {
  if (value == null || value.trim() === "") return false;
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0;
}

// Há saldo ao proprietário a movimentar? (settlement.ownerBalanceAmount > 0).
export function hasOwnerBalance(settlement: SettlementDto): boolean {
  return isPositiveMoney(settlement.ownerBalanceAmount);
}

// Houve shortfall? (arremate < Σ despesas → tiers inferiores e saldo ficam 0). Informativo, honesto.
export function hasShortfall(settlement: SettlementDto): boolean {
  return isPositiveMoney(settlement.shortfallAmount);
}

// ── Ciclo do saldo (ESPELHO client-side de resolveBalanceCycleTransition) ─────────────────────────────────────────
// Gate HINT do prazo: expiresAt nulo/ausente = "prazo não atingido" (claim permitido; funset bloqueado) — espelha o
// backend (isExpired = expiresAt !== undefined && now >= expiresAt). É só HINT: o backend re-verifica sob lock e é a
// AUTORIDADE (409 recarrega). As duas ações são MUTUAMENTE EXCLUSIVAS (uma habilita quando a outra não).
export function isClaimWindowExpired(settlement: SettlementDto, now: Date = new Date()): boolean {
  if (!settlement.ownerClaimExpiresAt) return false;
  const expiresAt = new Date(settlement.ownerClaimExpiresAt);
  if (Number.isNaN(expiresAt.getTime())) return false;
  return now.getTime() >= expiresAt.getTime();
}

// Retirada pelo ex-dono habilitável? DISTRIBUTED + saldo>0 + dentro do prazo.
export function canClaimBalance(settlement: SettlementDto, now: Date = new Date()): boolean {
  return settlement.status === "DISTRIBUTED" && hasOwnerBalance(settlement) && !isClaimWindowExpired(settlement, now);
}

// Reversão ao Funset habilitável? DISTRIBUTED + saldo>0 + prazo vencido.
export function canRevertToFunset(settlement: SettlementDto, now: Date = new Date()): boolean {
  return settlement.status === "DISTRIBUTED" && hasOwnerBalance(settlement) && isClaimWindowExpired(settlement, now);
}

// ── Adapters de resposta (camelCase do backend; robusto a snake_case) ─────────────────────────────────────────────
export function adaptSettlementView(response: unknown): SettlementView | null {
  const payload = readRecord(response);
  const dataRecord = readRecord(payload?.data) ?? payload;
  const settlement = adaptSettlement(readRecord(dataRecord?.settlement));
  if (!settlement) return null;
  const allocations = (readArray(dataRecord?.allocations) ?? [])
    .map((item) => adaptAllocation(item))
    .filter((item): item is SettlementAllocationDto => Boolean(item))
    .sort((a, b) => a.orderSeq - b.orderSeq);
  return { settlement, allocations };
}

function adaptSettlement(input: Record<string, unknown> | undefined): SettlementDto | null {
  if (!input) return null;
  const id = readString(input, ["id"]);
  if (!id) return null;
  const status = coerceStatus(readString(input, ["status"]));
  return {
    id,
    processId: readString(input, ["processId", "process_id"]) ?? "",
    soldRound: readNumber(input, ["soldRound", "sold_round"]) ?? null,
    hammerAmount: readMoney(input, ["hammerAmount", "hammer_amount"]) ?? "0.00",
    auctionCostAmount: readMoney(input, ["auctionCostAmount", "auction_cost_amount"]) ?? null,
    removalStorageClaim: readMoney(input, ["removalStorageClaim", "removal_storage_claim"]) ?? null,
    ownerBalanceAmount: readMoney(input, ["ownerBalanceAmount", "owner_balance_amount"]) ?? null,
    shortfallAmount: readMoney(input, ["shortfallAmount", "shortfall_amount"]) ?? null,
    currency: readString(input, ["currency"]) ?? "BRL",
    status,
    statusLabel: readString(input, ["statusLabel"]) ?? getSettlementStatusLabel(status),
    ownerNotifyDueAt: readString(input, ["ownerNotifyDueAt", "owner_notify_due_at"]) ?? null,
    ownerClaimExpiresAt: readString(input, ["ownerClaimExpiresAt", "owner_claim_expires_at"]) ?? null,
    // §2.8 — distributedBy/claimedBy (UUID de ator interno) NÃO são lidos: jamais chegam à UI.
    claimedAt: readString(input, ["claimedAt", "claimed_at"]) ?? null,
    claimRecipientRef: readString(input, ["claimRecipientRef", "claim_recipient_ref"]) ?? null, // já mascarado (§2.8)
    revertedAt: readString(input, ["revertedAt", "reverted_at"]) ?? null,
    createdAt: readString(input, ["createdAt", "created_at"]) ?? new Date().toISOString(),
    updatedAt: readString(input, ["updatedAt", "updated_at"]) ?? new Date().toISOString(),
  };
}

function adaptAllocation(input: unknown): SettlementAllocationDto | null {
  const item = readRecord(input);
  if (!item) return null;
  const id = readString(item, ["id"]);
  if (!id) return null;
  const kind = coerceKind(readString(item, ["beneficiaryKind", "beneficiary_kind"]));
  return {
    id,
    orderSeq: readNumber(item, ["orderSeq", "order_seq"]) ?? 0,
    beneficiaryKind: kind,
    beneficiaryLabel: readString(item, ["beneficiaryLabel"]) ?? getBeneficiaryLabel(kind),
    amount: readMoney(item, ["amount"]) ?? "0.00",
    claimAmount: readMoney(item, ["claimAmount", "claim_amount"]) ?? null,
    reference: readString(item, ["reference"]) ?? null, // já mascarada pelo backend (§2.8)
  };
}

function coerceKind(value: string | undefined): SettlementBeneficiaryKind {
  return value && BENEFICIARY_KINDS.includes(value as SettlementBeneficiaryKind) ? (value as SettlementBeneficiaryKind) : "OTHER_DEBITS";
}

function coerceStatus(value: string | undefined): SettlementStatus {
  return value && SETTLEMENT_STATUSES.includes(value as SettlementStatus) ? (value as SettlementStatus) : "DISTRIBUTED";
}

function readArray(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function readString(input: Record<string, unknown> | undefined, keys: readonly string[]): string | undefined {
  if (!input) return undefined;
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

// Money vem como string canônica do backend; aceitamos number defensivamente e mantemos "0.00".
function readMoney(input: Record<string, unknown> | undefined, keys: readonly string[]): string | undefined {
  if (!input) return undefined;
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return value.toFixed(2);
  }
  return undefined;
}

function readNumber(input: Record<string, unknown> | undefined, keys: readonly string[]): number | undefined {
  if (!input) return undefined;
  for (const key of keys) {
    const value = input[key];
    const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}
