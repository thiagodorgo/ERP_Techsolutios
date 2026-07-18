import type { Checklist, FinancialPeriodClose, ListFinancialPeriodCloseResult } from "./financial-period-close.types.js";

// §2.8 — a resposta OMITE tenant_id (resolvido pelo ator). `snapshot` expõe o corpo CONGELADO mais recente
// (só agregados de dinheiro — somas/contagens; sem party_name/document/ids de título individuais → não vaza
// dado sensível cru). `snapshotHistory` preserva a trilha imutável de todos os fechamentos (d/ataque).
// closed_by/reopened_by são UUIDs de ator (padrão dos vizinhos que expõem createdBy/updatedBy).
export function toFinancialPeriodCloseDto(record: FinancialPeriodClose) {
  // pós-análise L-1: reopened_* só são CORRENTES enquanto status='reopened'. Após um reclose (status='closed')
  // ficam obsoletos → a resposta os nula (a trilha completa vive em snapshotHistory, append-only). Evita a UI
  // renderizar "reaberto por X" num período atualmente fechado.
  const isReopened = record.status === "reopened";
  return {
    period: record.period,
    status: record.status,
    closedAt: record.closedAt?.toISOString() ?? null,
    closedBy: record.closedBy ?? null,
    reopenedAt: isReopened ? (record.reopenedAt?.toISOString() ?? null) : null,
    reopenedBy: isReopened ? (record.reopenedBy ?? null) : null,
    reopenReason: isReopened ? (record.reopenReason ?? null) : null,
    snapshot: record.snapshot?.latest ?? null,
    snapshotHistory: record.snapshot?.history ?? [],
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

// GET /:period — status + snapshot + checklist AO VIVO. Sem linha → status 'open', snapshot null e o checklist
// computado das linhas atuais (pré-visualização de pendências antes de fechar).
export function toFinancialPeriodStatusDto(period: string, record: FinancialPeriodClose | undefined, checklist: Checklist) {
  if (!record) {
    return {
      period,
      status: "open",
      closedAt: null,
      closedBy: null,
      reopenedAt: null,
      reopenedBy: null,
      reopenReason: null,
      snapshot: null,
      snapshotHistory: [] as const,
      checklist,
    };
  }
  return { ...toFinancialPeriodCloseDto(record), checklist };
}

export function toFinancialPeriodCloseListDto(result: ListFinancialPeriodCloseResult) {
  return {
    items: result.items.map((record) => ({
      period: record.period,
      status: record.status,
      closedAt: record.closedAt?.toISOString() ?? null,
      closedBy: record.closedBy ?? null,
      reopenedAt: record.reopenedAt?.toISOString() ?? null,
      reopenedBy: record.reopenedBy ?? null,
      createdAt: record.createdAt.toISOString(),
    })),
    pagination: {
      limit: result.limit,
      offset: result.offset,
      total: result.total,
    },
  };
}
