import type { VerifyChainResult } from "./impound.hashchain.js";
import type {
  CustodyEvent,
  CustodyEventType,
  ImpoundProcess,
  ImpoundStatus,
  ListImpoundProcessResult,
} from "./impound.types.js";

// Labels PT-BR (neutralidade white-label: "autoridade/órgão/pátio/vaga", NUNCA termo de público-alvo/"polícia").
const STATUS_LABELS: Record<ImpoundStatus, string> = {
  IN_REMOVAL: "Em remoção",
  RECEPTION: "Recepção",
  ACTIVE_CUSTODY: "Custódia ativa",
  RELEASE_IN_PROGRESS: "Liberação em andamento",
  RELEASED_FOR_REPAIR: "Liberado para reparo",
  RELEASED: "Liberado",
  AUCTION_ELIGIBLE: "Elegível a leilão",
  AUCTION_PREP: "Em preparação de leilão",
  LOTTED: "Loteado",
  AUCTIONED: "Arrematado",
  AUCTION_CLOSED: "Leilão encerrado",
  DIRECT_RECYCLING: "Reciclagem direta",
  JUDICIAL_HOLD: "Bloqueio judicial",
  CLOSED: "Encerrado",
};

const EVENT_TYPE_LABELS: Record<CustodyEventType, string> = {
  RECEPTION: "Recepção",
  INSPECTION: "Vistoria",
  SPOT_ASSIGNED: "Vaga atribuída",
  SPOT_MOVED: "Vaga movida",
  YARD_TRANSFER: "Transferência de pátio",
  PHOTO_SET: "Conjunto fotográfico",
  CHARGE_ACCRUAL: "Acúmulo de diária",
  NOTIFICATION: "Notificação",
  STATUS_CHANGE: "Mudança de estado",
  RELEASE: "Liberação",
  AUCTION_PREP: "Preparação de leilão",
  AUCTION_LOTTED: "Loteamento",
  AUCTION_SOLD: "Arrematação",
  AUCTION_CLOSED: "Leilão encerrado",
  ADJUSTMENT: "Ajuste (correção retroativa)",
};

// §allowlist: tenant_id NUNCA é exposto (resolvido pelo ator autenticado). Esta é a superfície do CONSOLE
// AUTENTICADO (impound:read) — origem/nº do auto/BO/identidade do bem são visíveis a operadores autorizados.
// §2.8: o PORTAL PÚBLICO (owner-portal, PR-16) usará um DTO PRÓPRIO que minimiza (sem origem/agente/BO/dados
// do proprietário); os hashes são PROVA (não segredo), storage keys/tokens NUNCA entram aqui.
export function toImpoundProcessDto(process: ImpoundProcess) {
  return {
    id: process.id,
    vehiclePlate: process.vehiclePlate ?? null,
    vehicleChassis: process.vehicleChassis ?? null,
    vehicleRenavam: process.vehicleRenavam ?? null,
    vehicleBrand: process.vehicleBrand ?? null,
    vehicleModel: process.vehicleModel ?? null,
    vehicleColor: process.vehicleColor ?? null,
    vehicleYear: process.vehicleYear ?? null,
    vehicleUnidentified: process.vehicleUnidentified,
    unidentifiedReason: process.unidentifiedReason ?? null,
    yardId: process.yardId ?? null,
    profileId: process.profileId,
    status: process.status,
    statusLabel: STATUS_LABELS[process.status],
    enteredAt: process.enteredAt ? process.enteredAt.toISOString() : null,
    frozenAt: process.frozenAt ? process.frozenAt.toISOString() : null,
    originAuthority: process.originAuthority,
    originAgentName: process.originAgentName ?? null,
    authorityCaseNumber: process.authorityCaseNumber ?? null,
    incidentReportNumber: process.incidentReportNumber ?? null,
    legalBasis: process.legalBasis ?? null,
    serviceOrderId: process.serviceOrderId ?? null,
    custodySeqHead: process.custodySeqHead,
    custodyHashHead: process.custodyHashHead ?? null,
    createdBy: process.createdBy ?? null,
    updatedBy: process.updatedBy ?? null,
    createdAt: process.createdAt.toISOString(),
    updatedAt: process.updatedAt.toISOString(),
  };
}

export function toImpoundProcessListDto(result: ListImpoundProcessResult) {
  return {
    items: result.items.map((process) => ({
      id: process.id,
      vehiclePlate: process.vehiclePlate ?? null,
      vehicleUnidentified: process.vehicleUnidentified,
      yardId: process.yardId ?? null,
      profileId: process.profileId,
      status: process.status,
      statusLabel: STATUS_LABELS[process.status],
      enteredAt: process.enteredAt ? process.enteredAt.toISOString() : null,
      frozenAt: process.frozenAt ? process.frozenAt.toISOString() : null,
      originAuthority: process.originAuthority,
      custodySeqHead: process.custodySeqHead,
      createdAt: process.createdAt.toISOString(),
    })),
    pagination: {
      limit: result.limit,
      offset: result.offset,
      total: result.total,
    },
  };
}

// Evento de custódia — hashes/seq/prev_hash são PROVA (expostos). payload é o dado do evento (canonicalizável,
// sem PII sensível nesta fatia: STATUS_CHANGE {from,to,reason}, SPOT_ASSIGNED {spotId}). tenant_id NUNCA.
export function toCustodyEventDto(event: CustodyEvent) {
  return {
    id: event.id,
    seq: event.seq,
    type: event.type,
    typeLabel: EVENT_TYPE_LABELS[event.type],
    payload: event.payload,
    occurredAt: event.occurredAt.toISOString(),
    actorId: event.actorId ?? null,
    prevHash: event.prevHash,
    hash: event.hash,
    createdAt: event.createdAt.toISOString(),
  };
}

export function toCustodyEventListDto(events: readonly CustodyEvent[]) {
  return { items: events.map(toCustodyEventDto) };
}

// Resultado da verificação da cadeia (I2). Determinístico, sem PII (só hashes/seq/reason).
export function toVerifyDto(result: VerifyChainResult) {
  return {
    processId: result.processId,
    valid: result.valid,
    eventCount: result.eventCount,
    headHash: result.headHash,
    brokenAt: result.brokenAt ?? null,
    checkedAt: result.checkedAt,
  };
}
