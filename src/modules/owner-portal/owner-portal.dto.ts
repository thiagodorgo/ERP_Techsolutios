import type { ImpoundProcess, ImpoundStatus } from "../impound/impound.types.js";

// Ω5P PR-16 — DTO PÚBLICO MINIMIZADO do owner-portal (§2.8 / RN-POR-02). Contém APENAS os 6 campos autorizados.
// JAMAIS: id/tenant_id/profile_id/serviceOrderId · origem/autoridade/agente/nº do auto/BO/base legal · Renavam/
// chassi/proprietário · hashes/heads/storage_key/token. Labels PT-BR white-label (D-Ω5P — "pátio/órgão", nunca
// "polícia"). Próprio do portal (NÃO reusa o DTO do console autenticado) — isolamento por design.

const STATUS_LABELS: Record<ImpoundStatus, string> = {
  IN_REMOVAL: "Em remoção",
  RECEPTION: "Em recepção no pátio",
  ACTIVE_CUSTODY: "Sob custódia no pátio",
  RELEASE_IN_PROGRESS: "Liberação em andamento",
  RELEASED_FOR_REPAIR: "Liberado para reparo",
  RELEASED: "Liberado",
  AUCTION_ELIGIBLE: "Elegível a leilão",
  AUCTION_PREP: "Em preparação de leilão",
  LOTTED: "Em leilão",
  AUCTIONED: "Arrematado em leilão",
  AUCTION_CLOSED: "Leilão encerrado",
  DIRECT_RECYCLING: "Encaminhado à reciclagem",
  JUDICIAL_HOLD: "Sob bloqueio judicial",
  CLOSED: "Encerrado",
};

// R$ 1.234,56 (pt-BR) a partir de centavos inteiros — sem Intl (determinismo/leveza), sem aritmética de float.
export function formatMoneyLabel(cents: number, currency: string): string {
  const symbol = currency === "BRL" ? "R$" : currency;
  const negative = cents < 0;
  const abs = Math.abs(Math.trunc(cents));
  const reais = Math.trunc(abs / 100);
  const centavos = abs % 100;
  const reaisStr = reais.toLocaleString("pt-BR");
  return `${negative ? "-" : ""}${symbol} ${reaisStr},${String(centavos).padStart(2, "0")}`;
}

export type OwnerPortalProcessDto = {
  readonly status: ImpoundStatus;
  readonly statusLabel: string;
  readonly yardPublicName: string | null;
  readonly yardPublicAddress: string | null;
  readonly enteredAt: string | null;
  readonly totalDueLabel: string;
};

export function toOwnerPortalProcessDto(
  process: ImpoundProcess,
  yard: { name: string; address: string } | undefined,
  due: { totalDueCents: number; currency: string },
): OwnerPortalProcessDto {
  return {
    status: process.status,
    statusLabel: STATUS_LABELS[process.status],
    yardPublicName: yard?.name ?? null,
    yardPublicAddress: yard?.address ?? null,
    enteredAt: process.enteredAt ? process.enteredAt.toISOString() : null,
    totalDueLabel: formatMoneyLabel(due.totalDueCents, due.currency),
  };
}
