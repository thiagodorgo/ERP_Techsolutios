import type { Fine, FineDisposition, ListFinesResult } from "./fine.types.js";

// §2.8 — a resposta expõe `responsibleOperatorProfileId` (id do PRÓPRIO tenant, não sensível) + a disposição
// DERIVADA da coluna da multa (`statement` = lançado no extrato / `none`). NUNCA tenant_id nem CNH/dado do
// profissional (o rótulo/nome do responsável é resolvido no front a partir da lista de Profissionais). O estado
// `payable` (empresa paga) é derivado à parte pelo badge do rail de contas a pagar (GET /fines/:id/payable).
function deriveDisposition(fine: Fine): FineDisposition {
  return fine.responsibleOperatorProfileId !== undefined ? "statement" : "none";
}

export function toFineDto(fine: Fine) {
  return {
    id: fine.id,
    vehicleId: fine.vehicleId,
    driverId: fine.driverId ?? null,
    responsibleOperatorProfileId: fine.responsibleOperatorProfileId ?? null,
    disposition: deriveDisposition(fine),
    numeroAuto: fine.numeroAuto,
    dataInfracao: fine.dataInfracao.toISOString(),
    orgao: fine.orgao,
    descricao: fine.descricao ?? null,
    valor: fine.valor,
    pontos: fine.pontos,
    prazoRecurso: fine.prazoRecurso ? fine.prazoRecurso.toISOString() : null,
    prazoPagamento: fine.prazoPagamento ? fine.prazoPagamento.toISOString() : null,
    status: fine.status,
    isActive: fine.isActive,
    createdBy: fine.createdBy ?? null,
    updatedBy: fine.updatedBy ?? null,
    createdAt: fine.createdAt.toISOString(),
    updatedAt: fine.updatedAt.toISOString(),
  };
}

export function toFineListDto(result: ListFinesResult) {
  return {
    items: result.items.map((fine) => ({
      id: fine.id,
      vehicleId: fine.vehicleId,
      driverId: fine.driverId ?? null,
      responsibleOperatorProfileId: fine.responsibleOperatorProfileId ?? null,
      disposition: deriveDisposition(fine),
      numeroAuto: fine.numeroAuto,
      dataInfracao: fine.dataInfracao.toISOString(),
      orgao: fine.orgao,
      descricao: fine.descricao ?? null,
      valor: fine.valor,
      pontos: fine.pontos,
      prazoRecurso: fine.prazoRecurso ? fine.prazoRecurso.toISOString() : null,
      prazoPagamento: fine.prazoPagamento ? fine.prazoPagamento.toISOString() : null,
      status: fine.status,
      isActive: fine.isActive,
      createdAt: fine.createdAt.toISOString(),
    })),
    pagination: {
      limit: result.limit,
      offset: result.offset,
      total: result.total,
    },
  };
}
