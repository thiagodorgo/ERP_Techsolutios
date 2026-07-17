import type {
  ListWorkOrdersResult,
  WorkOrder,
  WorkOrderEvent,
  WorkOrderLinks,
  WorkOrderMapStartPoints,
} from "./work-order.types.js";

/**
 * Serializes a work order. On the single-detail path (`GET /:id`) the caller
 * passes the resolved cadastro summaries, which are exposed under `links`. Every
 * other path (list, create, update, status, assign, mobile sync) omits the
 * argument, so the response keeps its pre-C2 shape with no `links` key.
 */
export function toWorkOrderDto(workOrder: WorkOrder, links?: WorkOrderLinks) {
  return {
    id: workOrder.id,
    code: workOrder.code,
    title: workOrder.title,
    description: workOrder.description,
    customerName: workOrder.customerName,
    customerDocument: workOrder.customerDocument,
    customerPhone: workOrder.customerPhone,
    serviceAddress: workOrder.serviceAddress,
    serviceCity: workOrder.serviceCity,
    serviceState: workOrder.serviceState,
    serviceZipCode: workOrder.serviceZipCode,
    serviceLatitude: workOrder.serviceLatitude,
    serviceLongitude: workOrder.serviceLongitude,
    // Ω1b-2 — rastreabilidade do geocode (quando/fonte); null enquanto não geocodificada.
    serviceGeocodedAt: workOrder.serviceGeocodedAt?.toISOString() ?? null,
    serviceGeocodeSource: workOrder.serviceGeocodeSource ?? null,
    // Ω3F-2a — destino (espelho da origem) + campos dinâmicos por tipo. serviceDetails é payload
    // FUNCIONAL que o operador vê (pode conter senha de acesso do residencial) — §2.8: fica no DTO de
    // detalhe, NUNCA em metadata de evento/auditoria/log.
    destinationAddress: workOrder.destinationAddress ?? null,
    destinationCity: workOrder.destinationCity ?? null,
    destinationState: workOrder.destinationState ?? null,
    destinationZipCode: workOrder.destinationZipCode ?? null,
    destinationLatitude: workOrder.destinationLatitude ?? null,
    destinationLongitude: workOrder.destinationLongitude ?? null,
    destinationGeocodedAt: workOrder.destinationGeocodedAt?.toISOString() ?? null,
    destinationGeocodeSource: workOrder.destinationGeocodeSource ?? null,
    serviceDetails: workOrder.serviceDetails ?? null,
    priority: workOrder.priority,
    status: workOrder.status,
    assignedOperatorId: workOrder.assignedOperatorId,
    assignedUserId: workOrder.assignedUserId,
    checklistId: workOrder.checklistId,
    // Ω3-c — snapshot imutável do checklist congelado no despacho; null antes do despacho. Aditivo:
    // chega ao GET /work-orders/:id E ao server_state do sync mobile (mobile-work-order-sync). Fora do
    // list DTO (payload enxuto). O consumo (createRun a partir do snapshot) é Ω3-c.1.
    checklistSnapshot: workOrder.checklistSnapshot ?? null,
    customerId: workOrder.customerId ?? null,
    vehicleId: workOrder.vehicleId ?? null,
    teamId: workOrder.teamId ?? null,
    serviceCatalogId: workOrder.serviceCatalogId ?? null,
    scheduledFor: workOrder.scheduledFor?.toISOString() ?? null,
    startedAt: workOrder.startedAt?.toISOString() ?? null,
    arrivedAt: workOrder.arrivedAt?.toISOString() ?? null,
    completedAt: workOrder.completedAt?.toISOString() ?? null,
    cancelledAt: workOrder.cancelledAt?.toISOString() ?? null,
    cancellationReason: workOrder.cancellationReason,
    // Ω3F-6 (D-Ω3F-6-CANCEL) — decisão financeira do cancelamento; null quando a OS não foi cancelada
    // por este fluxo. O front mostra o desfecho do dinheiro no cabeçalho da OS cancelada.
    // `clientActionId` fica FORA do DTO de propósito: é chave de idempotência do cliente, não dado da OS.
    financialCancellationDecision: workOrder.financialCancellationDecision ?? null,
    // Ω3F-7a — quilometragem (km) da OS: app preenche / base corrige. A aba KM lê do DETAIL (o list DTO
    // omite, payload enxuto). mileageCorrectedAt = ISO da correção da base, ou null. Aditivo.
    mileageStart: workOrder.mileageStart ?? null,
    mileageEnd: workOrder.mileageEnd ?? null,
    mileageSource: workOrder.mileageSource ?? null,
    mileageCorrectedAt: workOrder.mileageCorrectedAt?.toISOString() ?? null,
    createdBy: workOrder.createdBy,
    updatedBy: workOrder.updatedBy,
    createdAt: workOrder.createdAt.toISOString(),
    updatedAt: workOrder.updatedAt.toISOString(),
    ...(links === undefined ? {} : { links }),
  };
}

export function toWorkOrderListDto(result: ListWorkOrdersResult) {
  return {
    items: result.items.map((workOrder) => ({
      id: workOrder.id,
      code: workOrder.code,
      title: workOrder.title,
      status: workOrder.status,
      priority: workOrder.priority,
      customerName: workOrder.customerName,
      serviceAddress: workOrder.serviceAddress,
      // Ω1b (Mapa · pins de chamado): coordenadas da OS para o Mapa Operacional posicionar o pin.
      // `null` quando ainda não geocodificada — o mapa lista a OS no painel "Sem localização".
      serviceLatitude: workOrder.serviceLatitude ?? null,
      serviceLongitude: workOrder.serviceLongitude ?? null,
      assignedOperatorId: workOrder.assignedOperatorId ?? null,
      assignedUserId: workOrder.assignedUserId ?? null,
      // F6 (Mapa real): badges de manutencao/seguro no pin precisam da viatura da OS
      vehicleId: workOrder.vehicleId ?? null,
      scheduledFor: workOrder.scheduledFor?.toISOString() ?? null,
      createdAt: workOrder.createdAt.toISOString(),
    })),
    pagination: {
      limit: result.limit,
      offset: result.offset,
      total: result.total,
    },
  };
}

/**
 * Ω3F-8b (J-MAPAS-5) — serializa o read minimizado do mapa da OS. §2.8: expõe SÓ coordenadas (dado
 * próprio do tenant) + rótulos de exibição; NUNCA tenant_id, place_id, chave ou id de operador. O
 * técnico vem SEM userId (minimização LGPD — a aba não precisa identificar quem, só a posição/idade).
 */
export function toWorkOrderMapStartPointsDto(points: WorkOrderMapStartPoints) {
  return {
    origin: points.origin
      ? { latitude: points.origin.latitude, longitude: points.origin.longitude, address: points.origin.address ?? null }
      : null,
    destination: points.destination
      ? {
          latitude: points.destination.latitude,
          longitude: points.destination.longitude,
          address: points.destination.address ?? null,
        }
      : null,
    technician: points.technician
      ? {
          latitude: points.technician.latitude,
          longitude: points.technician.longitude,
          capturedAt: points.technician.capturedAt.toISOString(),
        }
      : null,
    bases: points.bases.map((base) => ({
      id: base.id,
      name: base.name,
      latitude: base.latitude,
      longitude: base.longitude,
    })),
  };
}

export function toWorkOrderEventDto(event: WorkOrderEvent) {
  return {
    id: event.id,
    workOrderId: event.workOrderId,
    eventType: event.eventType,
    fromStatus: event.fromStatus,
    toStatus: event.toStatus,
    actorUserId: event.actorUserId,
    message: event.message,
    metadata: event.metadata,
    createdAt: event.createdAt.toISOString(),
  };
}
