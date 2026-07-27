import type { ChargeKind, ChargeStatement, DailyAccrualRun, ProcessCharge, SettleResult } from "./charge.types.js";

// Labels PT-BR (neutralidade white-label: "pátio/autoridade/órgão", NUNCA termo de público-alvo/"polícia").
const KIND_LABELS: Record<ChargeKind, string> = {
  REMOVAL: "Remoção",
  DAILY: "Diária",
  ADDITIONAL: "Adicional",
  ADJUSTMENT: "Ajuste (correção retroativa)",
};

// §allowlist: tenant_id NUNCA é exposto (resolvido pelo ator autenticado). Superfície do CONSOLE AUTENTICADO
// (charging:read). Valores (money) são a base de cálculo — visíveis a operadores autorizados; sem storage_key/
// token/PII do proprietário. O portal público (owner-portal, PR-16) usará DTO próprio minimizado.
export function toProcessChargeDto(charge: ProcessCharge) {
  return {
    id: charge.id,
    processId: charge.processId,
    kind: charge.kind,
    kindLabel: KIND_LABELS[charge.kind],
    periodSeq: charge.periodSeq ?? null,
    refDate: charge.refDate ?? null,
    description: charge.description ?? null,
    quantity: charge.quantity,
    unitAmount: charge.unitAmount,
    totalAmount: charge.totalAmount,
    currency: charge.currency,
    tariffId: charge.tariffId ?? null,
    adjustmentOfChargeId: charge.adjustmentOfChargeId ?? null,
    settledAt: charge.settledAt ? charge.settledAt.toISOString() : null,
    settlementNote: charge.settlementNote ?? null,
    createdBy: charge.createdBy ?? null,
    updatedBy: charge.updatedBy ?? null,
    createdAt: charge.createdAt.toISOString(),
    updatedAt: charge.updatedAt.toISOString(),
  };
}

export function toProcessChargeListDto(charges: readonly ProcessCharge[]) {
  return { items: charges.map(toProcessChargeDto) };
}

// Memória de cálculo (RN-DIA-06) — linhas discriminadas + subtotais por kind + status do teto + projeção até asOf.
export function toChargeStatementDto(statement: ChargeStatement) {
  return {
    processId: statement.processId,
    currency: statement.currency,
    lines: statement.lines.map(toProcessChargeDto),
    subtotals: statement.subtotals.map((entry) => ({
      kind: entry.kind,
      kindLabel: KIND_LABELS[entry.kind],
      total: entry.total,
    })),
    total: statement.total,
    cap: statement.cap
      ? {
          model: statement.cap.model,
          cap: statement.cap.cap,
          capCount: statement.cap.capCount,
          nDue: statement.cap.nDue,
          nAccrue: statement.cap.nAccrue,
          capReached: statement.cap.capReached,
        }
      : null,
    asOf: statement.asOf,
    reconciliationPending: statement.reconciliationPending,
    overAccruedDailies: statement.overAccruedDailies,
  };
}

// Ω5P PR-10a — resultado da QUITAÇÃO (charging:settle). §allowlist: só agregados/refs (settledTotal string,
// contagens, ids quitados) — sem tenant_id/PII/valor-float.
export function toSettleResultDto(result: SettleResult) {
  return {
    settledTotal: result.settledTotal,
    settledCount: result.settledCount,
    estornoCount: result.estornoCount,
    chargeIds: [...result.chargeIds],
  };
}

export function toDailyAccrualRunDto(run: DailyAccrualRun) {
  return {
    id: run.id,
    runDate: run.runDate,
    status: run.status,
    processedCount: run.processedCount,
    accruedCount: run.accruedCount,
    errorCount: run.errorCount,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt ? run.finishedAt.toISOString() : null,
    createdAt: run.createdAt.toISOString(),
  };
}
