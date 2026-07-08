import type { Fine, ListFinesResult } from "./fine.types.js";

export function toFineDto(fine: Fine) {
  return {
    id: fine.id,
    vehicleId: fine.vehicleId,
    driverId: fine.driverId ?? null,
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
