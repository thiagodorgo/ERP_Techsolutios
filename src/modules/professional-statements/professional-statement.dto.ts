import type {
  ProfessionalStatementEntry,
  ProfessionalStatementSummary,
} from "./professional-statement.types.js";

// §2.8/LGPD — a resposta OMITE tenant_id (resolvido pelo ator), source_id (id cru da fonte), client_action_id
// e deleted_at. NUNCA CNH/dado sensível do profissional. entryType/direction/status/sourceType/competencia são
// valores de NEGÓCIO (não segredo/UUID) → OK expor. operatorProfileId/groupId são ids do PRÓPRIO tenant (mesma
// exposição que workOrderId). amount sai como number. runningBalance/saldo são DERIVADOS server-side.
export function toProfessionalStatementEntryDto(entry: ProfessionalStatementEntry, runningBalance?: number) {
  return {
    id: entry.id,
    operatorProfileId: entry.operatorProfileId,
    groupId: entry.groupId,
    entryType: entry.entryType,
    direction: entry.direction,
    description: entry.description ?? null,
    amount: entry.amount,
    currency: entry.currency,
    installmentNumber: entry.installmentNumber,
    installmentTotal: entry.installmentTotal,
    dueDate: entry.dueDate.toISOString(),
    competencia: entry.competencia,
    status: entry.status,
    // Badge liquidado/pendente da Remuneração (ANALISE:237). settlementRef (uuid) NÃO é exposto (§2.8).
    settledAt: entry.settledAt?.toISOString() ?? null,
    sourceType: entry.sourceType ?? null,
    createdAt: entry.createdAt.toISOString(),
    ...(runningBalance === undefined ? {} : { runningBalance }),
  };
}

// Extrato de UM profissional: cabeçalho (id + nome-label) + summary DERIVADO + parcelas (com saldo corrente por
// linha) + paginação. professionalName é APENAS o rótulo (full_name) — jamais CNH (LGPD).
export function toProfessionalStatementLedgerDto(input: {
  readonly operatorProfileId: string;
  readonly professionalName: string | undefined;
  readonly summary: ProfessionalStatementSummary;
  readonly items: readonly { readonly entry: ProfessionalStatementEntry; readonly runningBalance: number }[];
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
}) {
  return {
    operatorProfileId: input.operatorProfileId,
    professionalName: input.professionalName ?? null,
    summary: {
      currentBalance: input.summary.currentBalance,
      totalDebits: input.summary.totalDebits,
      totalCredits: input.summary.totalCredits,
      count: input.summary.count,
    },
    items: input.items.map(({ entry, runningBalance }) => toProfessionalStatementEntryDto(entry, runningBalance)),
    pagination: {
      limit: input.limit,
      offset: input.offset,
      total: input.total,
    },
  };
}

// Um LANÇAMENTO (grupo) + suas parcelas. Usado no GET /:groupId e nas respostas de create/patch/delete. O
// cabeçalho vem do snapshot imutável (idêntico em todas as parcelas do grupo).
export function toProfessionalStatementGroupDto(entries: readonly ProfessionalStatementEntry[]) {
  const head = entries[0]!;
  const installments = [...entries].sort((left, right) => left.installmentNumber - right.installmentNumber);
  const totalAmount = installments.reduce((sum, entry) => Math.round((sum + entry.amount) * 100) / 100, 0);
  return {
    groupId: head.groupId,
    operatorProfileId: head.operatorProfileId,
    entryType: head.entryType,
    direction: head.direction,
    description: head.description ?? null,
    currency: head.currency,
    sourceType: head.sourceType ?? null,
    installmentTotal: head.installmentTotal,
    totalAmount,
    installments: installments.map((entry) => toProfessionalStatementEntryDto(entry)),
    createdAt: head.createdAt.toISOString(),
  };
}
