import { env } from "../../config/env.js";
import { publishDomainEvent } from "../../infra/events/domain-event.publisher.js";
import { createDefaultCustomerService } from "../customers/customer.service.js";
import { createDefaultFieldLocationService } from "../field-location/field-location.service.js";
import { createDefaultMaintenanceOrderService } from "../maintenance-orders/maintenance-order.service.js";
import { createDefaultPoiService } from "../pois/poi.service.js";
import { createDefaultServiceCatalogService } from "../service-catalog/service-catalog.service.js";
import { createApplicableTariffResolver } from "../service-quotes/service-quote.service.js";
import { createDefaultTeamService } from "../teams/team.service.js";
import { createDefaultVehicleService } from "../vehicles/vehicle.service.js";
import {
  duplicateWorkOrderError,
  InMemoryWorkOrderRepository,
  type WorkOrderRepository,
} from "./work-order.repository.js";
import { buildGeocodeQueryString, GeocoderUnavailableError, type Geocoder } from "./geocoding/geocoder.js";
import { NoopGeocoder } from "./geocoding/noop-geocoder.js";
import { createDefaultGeocoder } from "./geocoding/geocoder.factory.js";
import type {
  AssignWorkOrderInput,
  ListWorkOrdersInput,
  ListWorkOrdersResult,
  UpdateWorkOrderInput,
  WorkOrder,
  WorkOrderActorContext,
  WorkOrderCustomerLink,
  WorkOrderEvent,
  WorkOrderLinks,
  WorkOrderMapBase,
  WorkOrderMapStartPoints,
  WorkOrderServiceCatalogLink,
  WorkOrderStatus,
  WorkOrderTeamLink,
  WorkOrderVehicleLink,
} from "./work-order.types.js";
import { WorkOrderError } from "./work-order.types.js";
import {
  assertNonEmptyString,
  assertStatusTransition,
  optionalString,
  parseChecklistAdjustment,
  parseChecklistSetSelection,
  parseFinancialCancellationDecision,
  parseLimit,
  parseOffset,
  parseOptionalClientActionId,
  parseOptionalCoordinate,
  parseOptionalDate,
  parseOptionalMileage,
  parseOptionalSearch,
  parseOptionalUuid,
  parseRequiredUuid,
  parseServiceDetails,
  parseWorkOrderPriority,
  parseWorkOrderStatus,
  WORK_ORDER_STATUS_TRANSITIONS,
  type ChecklistAdjustmentRemoval,
  type ChecklistSelectionItem,
  type ChecklistSetSelection,
} from "./work-order.validators.js";
import {
  effectiveChecklistSet,
  liveChecklistLinks,
  syntheticChecklistSet,
  workOrderChecklistAlreadyDispatchedError,
  workOrderChecklistCustomerScopedConfirmationError,
  workOrderChecklistDuplicateError,
  workOrderChecklistLinkNotFoundError,
  workOrderChecklistNotPublishedError,
  workOrderChecklistSetRequiresEndpointError,
  workOrderChecklistTerminalError,
  type FreezeChecklistLinkSnapshotsInput,
  type WorkOrderChecklistLink,
  type WorkOrderChecklistLinkInput,
  type WorkOrderChecklistRole,
} from "./work-order-checklists.types.js";
import type { ChecklistApplicabilityMatch } from "../checklists/applicability/checklist-applicability.resolution.js";

type RawRecord = Record<string, unknown>;

/**
 * Point-in-time customer data copied onto a work order at create time.
 * Kept even if the source customer is later renamed (snapshot semantics).
 */
export type WorkOrderCustomerSnapshot = {
  readonly name: string;
  readonly document: string | null;
  readonly phone: string | null;
};

/**
 * Tenant-scoped lookups used to validate the optional cadastro references
 * (customer/vehicle/team/service catalog) and to derive the customer snapshot.
 * Each resolver receives the acting tenant context, so a cross-tenant id
 * resolves to "not found" and is rejected as an invalid reference.
 */
export type WorkOrderReferenceResolvers = {
  readonly resolveCustomer?: (actor: WorkOrderActorContext, id: string) => Promise<WorkOrderCustomerSnapshot | null>;
  readonly resolveVehicle?: (actor: WorkOrderActorContext, id: string) => Promise<boolean>;
  readonly resolveTeam?: (actor: WorkOrderActorContext, id: string) => Promise<boolean>;
  readonly resolveServiceCatalog?: (actor: WorkOrderActorContext, id: string) => Promise<boolean>;
  // Ω3F-2a — tipo do catálogo persistido: dirige o 422 destination_required. Tenant-scoped; null quando
  // o id não resolve (inexistente/cross-tenant). Separado do resolveServiceCatalog (existência) porque
  // precisa do serviceType/requiresDestination, não só de um booleano.
  readonly resolveServiceCatalogTypeInfo?: (
    actor: WorkOrderActorContext,
    id: string,
  ) => Promise<{ readonly serviceType: string | null; readonly requiresDestination: boolean } | null>;
  // Ω3F-3b (#4, spec §1.2) — existe tarifa vigente na tabela do cliente para o serviço? Reusa o
  // resolveApplicableTariff (anti-refaturamento), projetado para booleano (existência) para manter o
  // módulo work-orders desacoplado do tipo Tarifa. Tenant-scoped; false quando não há tarifa aplicável.
  readonly resolveApplicableTariffForOrder?: (
    actor: WorkOrderActorContext,
    serviceCatalogId: string,
    customerId: string,
  ) => Promise<boolean>;
  // F2 R2.3 — read-only availability seam. True when the vehicle has an ACTIVE
  // maintenance order in `em_execucao`; such a vehicle cannot be bound to a NEW
  // work order (409 vehicle_in_maintenance). Additive; field-dispatch untouched.
  readonly hasActiveMaintenance?: (actor: WorkOrderActorContext, id: string) => Promise<boolean>;
  // C2 — detail-only summaries for the linked cadastros. Each returns a small,
  // tenant-scoped projection or null (missing/cross-tenant/unresolvable id).
  readonly resolveCustomerSummary?: (actor: WorkOrderActorContext, id: string) => Promise<WorkOrderCustomerLink | null>;
  readonly resolveVehicleSummary?: (actor: WorkOrderActorContext, id: string) => Promise<WorkOrderVehicleLink | null>;
  readonly resolveTeamSummary?: (actor: WorkOrderActorContext, id: string) => Promise<WorkOrderTeamLink | null>;
  readonly resolveServiceCatalogSummary?: (
    actor: WorkOrderActorContext,
    id: string,
  ) => Promise<WorkOrderServiceCatalogLink | null>;
  // Ω3F-8b (J-MAPAS-5) — última posição do técnico ATRIBUÍDO (LGPD: minimização — só ele, nunca a
  // frota). null quando não há posição válida / resolver ausente. Coordenada NUNCA vai a log.
  readonly resolveAssignedOperatorLocation?: (
    actor: WorkOrderActorContext,
    operatorUserId: string,
  ) => Promise<{ readonly latitude: number; readonly longitude: number; readonly capturedAt: Date } | null>;
  // Ω3F-8b — bases disponíveis = POIs de categoria "base" (Ω2-d; zero migration). Tenant-scoped.
  readonly listMapBases?: (actor: WorkOrderActorContext) => Promise<readonly WorkOrderMapBase[]>;
  // CHECKLIST P1 PR-04c-A — o porto da APLICABILIDADE. Dada a ordem que está nascendo (serviço, tipo e
  // cliente), quais modelos de vistoria se aplicam? Roda UMA vez, na criação, e o resultado é congelado
  // (sticky). AUSENTE nesta fatia por desenho: entre o 04c-A e o 04c-B não existe chave de permissão nem rota
  // que crie uma regra, então o conjunto resolvido é vazio POR CONSTRUÇÃO — não por promessa de que ninguém
  // usaria a API. O 04c-B liga este porto na raiz de composição.
  readonly resolveApplicableChecklists?: (
    actor: WorkOrderActorContext,
    context: { readonly serviceCatalogId?: string; readonly serviceType?: string; readonly customerId?: string },
  ) => Promise<readonly ChecklistApplicabilityMatch[]>;
  // CHECKLIST P1 PR-04c-A — devolve os ids que NÃO são modelo publicado desta organização (lista vazia = todos
  // publicados). Nunca se manda a campo um formulário que a organização não publicou — a mesma disciplina do
  // freeze do despacho, agora na porta de entrada.
  readonly assertChecklistsPublished?: (
    actor: WorkOrderActorContext,
    checklistIds: readonly string[],
  ) => Promise<readonly string[]>;
  // CHECKLIST P1 PR-04c-A (§10.2.5) — esta vistoria já foi ENVIADA ao técnico (run provisionada no despacho)?
  // Se já foi, a linha não é retirada: a vistoria pode estar sendo respondida em campo, às vezes offline, e é
  // prova. Consulta as DUAS chaves de idempotência (a com fase e a legada) — ver a raiz de composição.
  readonly hasProvisionedChecklistRun?: (
    actor: WorkOrderActorContext,
    input: { readonly workOrderId: string; readonly checklistId: string; readonly role: WorkOrderChecklistRole },
  ) => Promise<boolean>;
  // CHECKLIST P1 PR-04c-A (§10.2.9) — a regra que produziu esta linha nomeia um CLIENTE? Só o booleano
  // atravessa a fronteira: o id do cliente NUNCA entra em auditoria/metadata (§2.8).
  readonly isApplicabilityRuleCustomerScoped?: (
    actor: WorkOrderActorContext,
    ruleId: string,
  ) => Promise<boolean>;
  // CHECKLIST P1 PR-04c-A — rótulo do modelo, para a linha da timeline que o guincheiro lê ("Vistoria X
  // retirada..."). `null` quando não resolve; a mensagem então omite o rótulo em vez de inventá-lo (D-007).
  readonly resolveChecklistLabel?: (actor: WorkOrderActorContext, checklistId: string) => Promise<string | null>;
};

type ServiceCatalogTypeInfo = { readonly serviceType: string | null; readonly requiresDestination: boolean } | null;

export class WorkOrderService {
  constructor(
    private readonly repository: WorkOrderRepository,
    private readonly references: WorkOrderReferenceResolvers = {},
    // Ω1b-2 — geocoder injetável; default no-op (memory/CI nunca toca rede).
    private readonly geocoder: Geocoder = new NoopGeocoder(),
  ) {}

  /**
   * Ω1b-2 — geocodifica o endereço da OS sob demanda e persiste a coordenada + metadados.
   * Contrato (junta): 404 inexistente/cross-tenant · 409 já geocodificada sem force · 422 sem endereço ·
   * 502 provedor indisponível (fail-open, nada persistido) · 200 {geocoded:false} quando não há match.
   * NUNCA no caminho de create (R4): create não é atrasado nem falha por geocoding.
   */
  async geocodeById(
    actor: WorkOrderActorContext,
    workOrderId: string,
    force = false,
  ): Promise<{ readonly workOrder?: WorkOrder; readonly geocoded: boolean; readonly reason?: string }> {
    const id = parseRequiredUuid(workOrderId, "workOrderId");
    const workOrder = await this.repository.findById(actor.tenantId, id);
    if (!workOrder) {
      throw new WorkOrderError(404, "WORK_ORDER_NOT_FOUND", "not_found", "Work order was not found.");
    }

    if (hasValidCoordinate(workOrder.serviceLatitude, workOrder.serviceLongitude) && !force) {
      throw new WorkOrderError(
        409,
        "WORK_ORDER_CONFLICT",
        "already_geocoded",
        "Work order already has coordinates. Use force to override.",
      );
    }

    const queryString = buildGeocodeQueryString({
      address: workOrder.serviceAddress,
      city: workOrder.serviceCity,
      state: workOrder.serviceState,
      zipCode: workOrder.serviceZipCode,
    });
    if (!queryString) {
      throw new WorkOrderError(
        422,
        "WORK_ORDER_INVALID",
        "no_address",
        "Work order has no address to geocode.",
      );
    }

    // B8 — quando a geocodificação está desabilitada (NoopGeocoder), a razão é HONESTA: "desabilitada",
    // nunca "endereço não localizado". O botão do painel não mente sobre o motivo.
    if (!this.geocoder.isEnabled()) {
      return { geocoded: false, reason: "Geocodificação está desabilitada neste ambiente." };
    }

    let result;
    try {
      result = await this.geocoder.geocode({
        address: workOrder.serviceAddress,
        city: workOrder.serviceCity,
        state: workOrder.serviceState,
        zipCode: workOrder.serviceZipCode,
      });
    } catch (error) {
      if (error instanceof GeocoderUnavailableError) {
        throw new WorkOrderError(502, "GEOCODER_UNAVAILABLE", "geocoder_unavailable", "Geocoding provider is unavailable.");
      }
      throw error;
    }

    if (!result) {
      return { geocoded: false, reason: "Endereço não localizado pelo provedor." };
    }

    // R2 — nunca persiste sentinela/fora de faixa (o geocoder já filtra; guarda dupla na borda).
    if (!hasValidCoordinate(result.latitude, result.longitude)) {
      return { geocoded: false, reason: "Coordenada retornada é inválida." };
    }

    const updated = await this.repository.updateGeocode({
      tenantId: actor.tenantId,
      workOrderId: id,
      latitude: result.latitude,
      longitude: result.longitude,
      source: result.source,
      geocodedAt: new Date(),
      actorUserId: actor.userId,
    });
    // R10 — corrida: RETURNING vazio → 404, nunca 500 nem vazamento de existência.
    if (!updated) {
      throw new WorkOrderError(404, "WORK_ORDER_NOT_FOUND", "not_found", "Work order was not found.");
    }

    return { workOrder: updated, geocoded: true };
  }

  /**
   * Ω3F-8b (J-MAPAS-5) — geocodifica o DESTINO da OS (absorve o gap: geocodeById só preenchia a origem).
   * Espelho EXATO do contrato de geocodeById, porém nas colunas destination_* (já existentes, SEM
   * migration): 404 inexistente/cross-tenant · 409 destino já geocodificado sem force · 422 sem endereço
   * de destino · 502 provedor indisponível (fail-open) · 200 {geocoded:false} sem match/desabilitado.
   * NUNCA no caminho de create (create não geocodifica origem NEM destino).
   */
  async geocodeDestinationById(
    actor: WorkOrderActorContext,
    workOrderId: string,
    force = false,
  ): Promise<{ readonly workOrder?: WorkOrder; readonly geocoded: boolean; readonly reason?: string }> {
    const id = parseRequiredUuid(workOrderId, "workOrderId");
    const workOrder = await this.repository.findById(actor.tenantId, id);
    if (!workOrder) {
      throw new WorkOrderError(404, "WORK_ORDER_NOT_FOUND", "not_found", "Work order was not found.");
    }

    if (hasValidCoordinate(workOrder.destinationLatitude, workOrder.destinationLongitude) && !force) {
      throw new WorkOrderError(
        409,
        "WORK_ORDER_CONFLICT",
        "already_geocoded",
        "Work order destination already has coordinates. Use force to override.",
      );
    }

    const queryString = buildGeocodeQueryString({
      address: workOrder.destinationAddress,
      city: workOrder.destinationCity,
      state: workOrder.destinationState,
      zipCode: workOrder.destinationZipCode,
    });
    if (!queryString) {
      throw new WorkOrderError(
        422,
        "WORK_ORDER_INVALID",
        "no_destination_address",
        "Work order has no destination address to geocode.",
      );
    }

    // B8 (espelho) — geocoder desabilitado (Noop) → razão HONESTA "desabilitada", nunca "não localizado".
    if (!this.geocoder.isEnabled()) {
      return { geocoded: false, reason: "Geocodificação está desabilitada neste ambiente." };
    }

    let result;
    try {
      result = await this.geocoder.geocode({
        address: workOrder.destinationAddress,
        city: workOrder.destinationCity,
        state: workOrder.destinationState,
        zipCode: workOrder.destinationZipCode,
      });
    } catch (error) {
      if (error instanceof GeocoderUnavailableError) {
        throw new WorkOrderError(502, "GEOCODER_UNAVAILABLE", "geocoder_unavailable", "Geocoding provider is unavailable.");
      }
      throw error;
    }

    if (!result) {
      return { geocoded: false, reason: "Endereço de destino não localizado pelo provedor." };
    }

    // R2 (espelho) — nunca persiste sentinela/fora de faixa (guarda dupla na borda).
    if (!hasValidCoordinate(result.latitude, result.longitude)) {
      return { geocoded: false, reason: "Coordenada de destino retornada é inválida." };
    }

    const updated = await this.repository.updateDestinationGeocode({
      tenantId: actor.tenantId,
      workOrderId: id,
      latitude: result.latitude,
      longitude: result.longitude,
      source: result.source,
      geocodedAt: new Date(),
      actorUserId: actor.userId,
    });
    // Corrida: RETURNING vazio → 404, nunca 500 nem vazamento de existência.
    if (!updated) {
      throw new WorkOrderError(404, "WORK_ORDER_NOT_FOUND", "not_found", "Work order was not found.");
    }

    return { workOrder: updated, geocoded: true };
  }

  /**
   * Ω3F-8b (J-MAPAS-5) — read MINIMIZADO dos pontos de partida do mapa da OS (perm work_orders:read).
   * Devolve SÓ: origem, destino, a posição do técnico ATRIBUÍDO (LGPD: minimização — nunca a frota) com
   * carimbo de idade, e as bases disponíveis (POIs de categoria "base"). 404 cross-tenant/inexistente
   * (via get()). §2.8: nunca tenant_id/place_id/segredo; coordenada NUNCA logada.
   */
  async listMapStartPoints(actor: WorkOrderActorContext, workOrderId: string): Promise<WorkOrderMapStartPoints> {
    const workOrder = await this.get(actor, workOrderId);

    const origin = hasValidCoordinate(workOrder.serviceLatitude, workOrder.serviceLongitude)
      ? {
          latitude: workOrder.serviceLatitude as number,
          longitude: workOrder.serviceLongitude as number,
          address: workOrder.serviceAddress,
        }
      : null;
    const destination = hasValidCoordinate(workOrder.destinationLatitude, workOrder.destinationLongitude)
      ? {
          latitude: workOrder.destinationLatitude as number,
          longitude: workOrder.destinationLongitude as number,
          address: workOrder.destinationAddress,
        }
      : null;

    // Posição real: SÓ o técnico atribuído (assignedUserId). Sem atribuição → sem posição (LGPD).
    let technician: WorkOrderMapStartPoints["technician"] = null;
    const assignedUserId = workOrder.assignedUserId;
    if (assignedUserId && this.references.resolveAssignedOperatorLocation) {
      const point = await this.references.resolveAssignedOperatorLocation(actor, assignedUserId);
      if (point && hasValidCoordinate(point.latitude, point.longitude)) {
        technician = { latitude: point.latitude, longitude: point.longitude, capturedAt: point.capturedAt };
      }
    }

    const bases = this.references.listMapBases ? await this.references.listMapBases(actor) : [];

    return { origin, destination, technician, bases };
  }

  async list(actor: WorkOrderActorContext, query: RawRecord): Promise<ListWorkOrdersResult> {
    const input: ListWorkOrdersInput = {
      tenantId: actor.tenantId,
      status: query.status ? parseWorkOrderStatus(query.status) : undefined,
      priority: query.priority ? parseWorkOrderPriority(query.priority) : undefined,
      assignedOperatorId: parseOptionalUuid(query.assignedOperatorId, "assignedOperatorId"),
      assignedUserId: parseOptionalUuid(query.assignedUserId, "assignedUserId"),
      from: parseOptionalDate(query.from, "from"),
      to: parseOptionalDate(query.to, "to"),
      search: parseOptionalSearch(query.search),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    };

    return this.repository.list(input);
  }

  async create(
    actor: WorkOrderActorContext,
    body: RawRecord,
    // Ω3F-4b — opção INTERNA (composta no código, NUNCA aceita no corpo REST): pula a validação #4
    // (tarifa vigente) no approve→cria OS, porque a OS derivada de orçamento já é precificada pelo
    // preço CONGELADO do orçamento (anti-refaturamento — re-exigir tarifa viva contradiria o freeze e
    // bloquearia orçamentos MANUAIS ou de tarifa arquivada). Ver D-Ω3F-4B-APPROVE-SKIP-TARIFF.
    options?: { readonly skipApplicableTariffCheck?: boolean },
  ): Promise<WorkOrder> {
    const customerId = parseOptionalUuid(body.customer_id ?? body.customerId, "customerId");
    const vehicleId = parseOptionalUuid(body.vehicle_id ?? body.vehicleId, "vehicleId");
    const teamId = parseOptionalUuid(body.team_id ?? body.teamId, "teamId");
    const serviceCatalogId = parseOptionalUuid(body.service_catalog_id ?? body.serviceCatalogId, "serviceCatalogId");
    // CHECKLIST P1 PR-04c-A — tri-state do conjunto de vistorias, lido cedo para o 400 de corpo contraditório
    // (conjunto novo + campo antigo juntos) acontecer antes de qualquer efeito.
    const checklistSelection = parseChecklistSetSelection(body);

    // Validate every provided reference against the acting tenant. A missing or
    // cross-tenant id resolves to "not found" and is rejected with a 400.
    const customerSnapshot = await this.resolveCustomerSnapshot(actor, customerId);
    await this.assertReferenceExists("vehicle", this.references.resolveVehicle, actor, vehicleId);
    // F2 R2.3 — a vehicle under active maintenance cannot be bound to a NEW OS.
    await this.assertVehicleAvailable(actor, vehicleId);
    await this.assertReferenceExists("team", this.references.resolveTeam, actor, teamId);
    await this.assertReferenceExists("service_catalog", this.references.resolveServiceCatalog, actor, serviceCatalogId);

    // Ω3F-2a — destino (espelho da origem) + campos dinâmicos por tipo.
    const destination = this.parseDestination(body);
    const serviceDetails = parseServiceDetails(body.service_details ?? body.serviceDetails);

    // Ω3F-2a — reboque exige destino: bloqueia o create quando o tipo do catálogo pede destino e nenhum
    // campo de destino veio no corpo. Antes do nextCode/create para não consumir número de OS.
    // CHECKLIST P1 PR-04c-A — o tipo do catálogo é resolvido UMA vez e serve a dois usos: a regra de destino e
    // o eixo `serviceType` da aplicabilidade (a ordem não tem essa coluna; quem chama a resolução deriva).
    const serviceTypeInfo = await this.resolveServiceCatalogTypeInfo(actor, serviceCatalogId);
    await this.assertDestinationForType(actor, serviceCatalogId, hasDestination(destination), serviceTypeInfo);

    // Ω3F-3b (#4, spec §1.2) — quando a OS vincula cliente E serviço, o tipo precisa ter tarifa vigente
    // na tabela do cliente. Antes do nextCode/create para não consumir número de OS. Ω3F-4b: o approve→cria
    // OS pula esta validação (skipApplicableTariffCheck) — a OS derivada já é precificada pelo orçamento.
    if (!options?.skipApplicableTariffCheck) {
      await this.assertServiceHasApplicableTariff(actor, serviceCatalogId, customerId);
    }

    // CHECKLIST P1 PR-04c-A — O STICKY. O conjunto de vistorias é resolvido AQUI, uma única vez, e gravado com
    // a ordem na mesma transação. Depois disso NADA re-resolve: trocar o cliente ou o serviço da ordem não
    // muda as vistorias (ponto 4 da decisão do dono), porque uma ordem em campo — às vezes com vistoria já
    // assinada — não pode mudar de exigência por baixo de quem está trabalhando nela.
    // Fica DEPOIS das validações que recusam e ANTES do nextCode, pela mesma razão que o arquivo já documenta
    // duas vezes: validação que recusa não consome número de ordem de serviço.
    const checklists = await this.resolveChecklistSetForCreate(actor, checklistSelection, {
      serviceCatalogId,
      serviceType: serviceTypeInfo?.serviceType ?? undefined,
      customerId,
    });

    const code = await this.repository.nextCode(actor.tenantId);
    const workOrder = await this.repository.create({
      tenantId: actor.tenantId,
      code,
      title: assertNonEmptyString(body.title, "title"),
      description: optionalString(body.description),
      // With a resolved customer the snapshot is server-derived and overrides
      // any client-sent customer fields; without one the legacy path stands.
      customerName: customerSnapshot ? customerSnapshot.name : optionalString(body.customerName),
      customerDocument: customerSnapshot ? customerSnapshot.document ?? undefined : optionalString(body.customerDocument),
      customerPhone: customerSnapshot ? customerSnapshot.phone ?? undefined : optionalString(body.customerPhone),
      serviceAddress: optionalString(body.serviceAddress),
      serviceCity: optionalString(body.serviceCity),
      serviceState: optionalString(body.serviceState),
      serviceZipCode: optionalString(body.serviceZipCode),
      serviceLatitude: parseOptionalCoordinate(body.serviceLatitude, "serviceLatitude", -90, 90),
      serviceLongitude: parseOptionalCoordinate(body.serviceLongitude, "serviceLongitude", -180, 180),
      destinationAddress: destination.destinationAddress,
      destinationCity: destination.destinationCity,
      destinationState: destination.destinationState,
      destinationZipCode: destination.destinationZipCode,
      destinationLatitude: destination.destinationLatitude,
      destinationLongitude: destination.destinationLongitude,
      serviceDetails,
      priority: parseWorkOrderPriority(body.priority),
      // CHECKLIST P1 PR-04c-A — `checklist_id` deixou de ser escrito pelo corpo: vira ESPELHO da linha
      // primária da junção, derivado no repositório. Uma coluna com dois escritores é como o espelho
      // dessincronizaria e o despacho congelaria o formulário errado.
      checklists,
      customerId,
      vehicleId,
      teamId,
      serviceCatalogId,
      scheduledFor: parseOptionalDate(body.scheduledFor, "scheduledFor"),
      // M-7 (J-MAPAS-8) — prazo de SLA opcional. parseOptionalDate reusado (400 invalid_date em malformado);
      // sem regra de futuro/campo-cruzado — a OS pode ser lançada já vencida (espelho de scheduledFor).
      slaDueAt: parseOptionalDate(body.slaDueAt, "slaDueAt"),
      createdBy: actor.userId,
      updatedBy: actor.userId,
      status: "open",
    });

    await this.repository.createEvent({
      tenantId: actor.tenantId,
      workOrderId: workOrder.id,
      eventType: "work_order_created",
      toStatus: workOrder.status,
      actorUserId: actor.userId,
      message: "Ordem de servico criada.",
      metadata: {
        code: workOrder.code,
        priority: workOrder.priority,
      },
    });

    return workOrder;
  }

  /**
   * CHECKLIST P1 PR-04c-A — o conjunto de vistorias da ordem NOVA, pelo tri-state:
   *
   *  · `absent`   ⇒ RESOLVE pelas regras (proveniência `resolved` + a regra que explica cada linha);
   *  · `legacy`   ⇒ uma linha `manual` a partir do campo antigo `checklistId`;
   *  · `explicit` ⇒ override manual declarado (lista vazia = ordem deliberadamente sem vistoria).
   *
   * A publicação do modelo é exigida no override EXPLÍCITO e no que a regra devolve (a resolução já filtra por
   * publicados). O campo ANTIGO `checklistId` segue sem essa exigência — é o comportamento de hoje, e apertá-lo
   * aqui mudaria, sem aviso, o contrato de integrações e de ordens já em voo. Está registrado como resíduo,
   * não como esquecimento.
   */
  private async resolveChecklistSetForCreate(
    actor: WorkOrderActorContext,
    selection: ChecklistSetSelection,
    context: { readonly serviceCatalogId?: string; readonly serviceType?: string; readonly customerId?: string },
  ): Promise<readonly WorkOrderChecklistLinkInput[]> {
    if (selection.kind === "legacy") {
      return [
        {
          checklistId: selection.checklistId,
          role: "generic",
          source: "manual",
          orderIndex: 0,
          addedBy: actor.userId,
        },
      ];
    }

    if (selection.kind === "explicit") {
      assertNoRepeatedChecklistPhase(selection.items);
      await this.assertChecklistsArePublished(actor, selection.items.map((item) => item.checklistId));

      return selection.items.map((item, index) => ({
        checklistId: item.checklistId,
        role: item.role,
        source: "manual" as const,
        orderIndex: index,
        addedBy: actor.userId,
      }));
    }

    const resolver = this.references.resolveApplicableChecklists;
    if (!resolver) return [];

    const matches = await resolver(actor, context);

    return matches.map((match, index) => ({
      checklistId: match.templateId,
      role: match.role,
      // PROVENIÊNCIA: a regra que venceu fica gravada na linha. É o que explica, meses depois, por que aquela
      // ordem recebeu aquela vistoria — e o CHECK biconditional do banco impede `resolved` sem regra.
      source: "resolved" as const,
      ruleId: match.ruleId,
      orderIndex: index,
      addedBy: actor.userId,
    }));
  }

  private async assertChecklistsArePublished(
    actor: WorkOrderActorContext,
    checklistIds: readonly string[],
  ): Promise<void> {
    if (checklistIds.length === 0) return;

    const resolver = this.references.assertChecklistsPublished;
    if (!resolver) return;

    const invalid = await resolver(actor, [...new Set(checklistIds)]);
    if (invalid.length > 0) {
      throw workOrderChecklistNotPublishedError();
    }
  }

  /** O conjunto EFETIVO da ordem (junção viva ou a visão sintética da ordem legada) — leitura única do domínio. */
  async listChecklistSet(actor: WorkOrderActorContext, workOrderId: string) {
    const workOrder = await this.get(actor, workOrderId);

    return this.checklistSetOf(actor, workOrder);
  }

  private async checklistSetOf(actor: WorkOrderActorContext, workOrder: WorkOrder) {
    const links = await this.repository.listChecklists(actor.tenantId, workOrder.id);

    return effectiveChecklistSet(workOrder, links);
  }

  private async resolveCustomerSnapshot(
    actor: WorkOrderActorContext,
    customerId: string | undefined,
  ): Promise<WorkOrderCustomerSnapshot | null> {
    if (!customerId) return null;

    const resolver = this.references.resolveCustomer;
    const snapshot = resolver ? await resolver(actor, customerId) : null;
    if (!snapshot) {
      throw new WorkOrderError(
        400,
        "WORK_ORDER_INVALID",
        "invalid_customer_reference",
        "customerId does not reference a customer in this organization.",
      );
    }

    return snapshot;
  }

  // F2 R2.3 — read-only guard: reject binding a vehicle that has an active
  // maintenance order in `em_execucao` to a new work order (409). No-op when the
  // OS carries no vehicle or the resolver is not wired.
  private async assertVehicleAvailable(actor: WorkOrderActorContext, vehicleId: string | undefined): Promise<void> {
    if (!vehicleId) return;

    const resolver = this.references.hasActiveMaintenance;
    const inMaintenance = resolver ? await resolver(actor, vehicleId) : false;
    if (inMaintenance) {
      throw new WorkOrderError(
        409,
        "WORK_ORDER_CONFLICT",
        "vehicle_in_maintenance",
        "The vehicle is under active maintenance and cannot be assigned to a new work order.",
      );
    }
  }

  private async assertReferenceExists(
    entity: "vehicle" | "team" | "service_catalog",
    resolver: ((actor: WorkOrderActorContext, id: string) => Promise<boolean>) | undefined,
    actor: WorkOrderActorContext,
    id: string | undefined,
  ): Promise<void> {
    if (!id) return;

    const exists = resolver ? await resolver(actor, id) : false;
    if (!exists) {
      throw new WorkOrderError(
        400,
        "WORK_ORDER_INVALID",
        `invalid_${entity}_reference`,
        `The provided ${entity} reference does not exist in this organization.`,
      );
    }
  }

  // Ω3F-2a — normaliza os campos de destino do corpo (espelho da origem service_*).
  private parseDestination(body: RawRecord): ParsedDestination {
    return {
      destinationAddress: optionalString(body.destinationAddress),
      destinationCity: optionalString(body.destinationCity),
      destinationState: optionalString(body.destinationState),
      destinationZipCode: optionalString(body.destinationZipCode),
      destinationLatitude: parseOptionalCoordinate(body.destinationLatitude, "destinationLatitude", -90, 90),
      destinationLongitude: parseOptionalCoordinate(body.destinationLongitude, "destinationLongitude", -180, 180),
    };
  }

  // Ω3F-2a — regra "reboque exige destino": se o catálogo referenciado marca requires_destination e a OS
  // não carrega destino, rejeita com 422 destination_required. No-op quando não há catálogo, o resolver não
  // está ligado, ou o id não resolve (tenant-scoped: cross-tenant → null → sem regra de tipo aplicável).
  // CHECKLIST P1 PR-04c-A — lookup único do tipo do catálogo (tenant-scoped; null quando não resolve).
  private async resolveServiceCatalogTypeInfo(
    actor: WorkOrderActorContext,
    serviceCatalogId: string | undefined,
  ): Promise<ServiceCatalogTypeInfo> {
    if (!serviceCatalogId) return null;

    const resolver = this.references.resolveServiceCatalogTypeInfo;

    return resolver ? await resolver(actor, serviceCatalogId) : null;
  }

  private async assertDestinationForType(
    actor: WorkOrderActorContext,
    serviceCatalogId: string | undefined,
    hasDestinationValue: boolean,
    // CHECKLIST P1 PR-04c-A — `undefined` = ainda não resolvido (o update segue resolvendo aqui); qualquer
    // outro valor (inclusive `null`) é o resultado JÁ resolvido pelo chamador — uma chamada, dois usos.
    preResolvedTypeInfo?: ServiceCatalogTypeInfo,
  ): Promise<void> {
    if (!serviceCatalogId) return;

    const typeInfo =
      preResolvedTypeInfo === undefined
        ? await this.resolveServiceCatalogTypeInfo(actor, serviceCatalogId)
        : preResolvedTypeInfo;
    if (typeInfo?.requiresDestination && !hasDestinationValue) {
      throw new WorkOrderError(
        422,
        "WORK_ORDER_UNPROCESSABLE",
        "destination_required",
        "Este tipo de serviço exige endereço de destino.",
      );
    }
  }

  // Ω3F-3b (#4, spec §1.2) — o tipo de serviço da OS precisa estar na tabela de valores do cliente:
  // reusa resolveApplicableTariff (via resolver injetado). Sem tarifa aplicável → 422
  // tariff_not_found_for_service (a OS não teria base de preço p/ os itens financeiros). Só dispara com
  // AMBOS (cliente E serviço) presentes; no-op quando o resolver não está montado (degrada como as demais
  // refs opcionais). Cross-tenant: o resolver é tenant-scoped → tarifa alheia invisível → false → 422
  // (nunca vaza existência entre organizações).
  private async assertServiceHasApplicableTariff(
    actor: WorkOrderActorContext,
    serviceCatalogId: string | undefined,
    customerId: string | undefined,
  ): Promise<void> {
    if (!serviceCatalogId || !customerId) return;

    const resolver = this.references.resolveApplicableTariffForOrder;
    if (!resolver) return;

    const hasTariff = await resolver(actor, serviceCatalogId, customerId);
    if (!hasTariff) {
      throw new WorkOrderError(
        422,
        "WORK_ORDER_UNPROCESSABLE",
        "tariff_not_found_for_service",
        "O serviço selecionado não tem tarifa vigente na tabela de valores deste cliente.",
      );
    }
  }

  async get(actor: WorkOrderActorContext, workOrderId: string): Promise<WorkOrder> {
    const workOrder = await this.repository.findById(actor.tenantId, parseRequiredUuid(workOrderId, "workOrderId"));

    if (!workOrder) {
      throw new WorkOrderError(404, "WORK_ORDER_NOT_FOUND", "not_found", "Work order was not found.");
    }

    return workOrder;
  }

  /**
   * Detail path (`GET /:id`): fetches the OS and resolves each linked cadastro to
   * its small summary. Kept separate from get() so the list and the internal
   * get() callers (update/status/assign/timeline) stay cheap and unchanged.
   */
  async getWithLinks(actor: WorkOrderActorContext, workOrderId: string) {
    const workOrder = await this.get(actor, workOrderId);
    const links = await this.resolveLinks(actor, workOrder);
    // CHECKLIST P1 PR-04c-A — o detalhe passa a carregar o CONJUNTO. A web dizia "Vinculado" para uma ordem com
    // duas vistorias; meia-verdade sobre prova é o mesmo que mentira.
    const checklists = await this.checklistSetOf(actor, workOrder);

    return { workOrder, links, checklists };
  }

  private async resolveLinks(actor: WorkOrderActorContext, workOrder: WorkOrder): Promise<WorkOrderLinks> {
    const [customer, vehicle, team, serviceCatalog] = await Promise.all([
      resolveSummary(this.references.resolveCustomerSummary, actor, workOrder.customerId),
      resolveSummary(this.references.resolveVehicleSummary, actor, workOrder.vehicleId),
      resolveSummary(this.references.resolveTeamSummary, actor, workOrder.teamId),
      resolveSummary(this.references.resolveServiceCatalogSummary, actor, workOrder.serviceCatalogId),
    ]);

    return { customer, vehicle, team, serviceCatalog };
  }

  async update(actor: WorkOrderActorContext, workOrderId: string, body: RawRecord): Promise<WorkOrder> {
    if ("status" in body) {
      throw new WorkOrderError(400, "WORK_ORDER_INVALID", "status_endpoint_required", "Use the status endpoint to change work order status.");
    }

    // Ω3F-2a — reusa o current (tipo IMUTÁVEL pós-create): a regra de destino no update lê o
    // service_catalog_id PERSISTIDO, nunca um do corpo (update não aceita troca de tipo).
    const current = await this.get(actor, workOrderId);

    // CHECKLIST P1 PR-04c-A — o conjunto de vistorias no UPDATE.
    //
    // O que NÃO acontece aqui, e é o coração do sticky: mudar `customerId` ou `serviceCatalogId` NUNCA
    // re-resolve as vistorias (ponto 4 da decisão do dono, verbatim). Não há chamada à resolução neste método —
    // de propósito, e é isto que a suíte prova.
    //
    // O parse é PURO (nenhuma escrita): fica cedo para o 400 de corpo contraditório continuar acontecendo antes
    // de qualquer efeito. A APLICAÇÃO da seleção fica lá embaixo, depois de TODAS as validações (P3 da
    // verificação): validação que recusa não pode acontecer com a junção já reescrita.
    const checklistSelection = parseChecklistSetSelection(body);

    const destination = this.parseDestination(body);
    const serviceDetails = parseServiceDetails(body.service_details ?? body.serviceDetails);

    // Ω3F-2a (J-Ω3F-2 critico, furos #2/#2b) — a regra de destino no update SÓ se aplica quando o corpo
    // TOCA destino: edição parcial de OS legada/sem-destino (ex.: só o título) NÃO trava. Quando toca,
    // o destino efetivo é o MERGE por-campo (campo tocado = corpo; não-tocado = persistido), então
    // limpar só o endereço de uma OS com destino por coordenada não apaga o pin nem dispara o 422.
    if (bodyMentionsDestination(body)) {
      await this.assertDestinationForType(
        actor,
        current.serviceCatalogId,
        hasDestination(mergeDestination(current, body, destination)),
      );
    }

    const input: UpdateWorkOrderInput = {
      tenantId: actor.tenantId,
      workOrderId: parseRequiredUuid(workOrderId, "workOrderId"),
      title: body.title === undefined ? undefined : assertNonEmptyString(body.title, "title"),
      description: optionalString(body.description),
      customerName: optionalString(body.customerName),
      customerDocument: optionalString(body.customerDocument),
      customerPhone: optionalString(body.customerPhone),
      serviceAddress: optionalString(body.serviceAddress),
      serviceCity: optionalString(body.serviceCity),
      serviceState: optionalString(body.serviceState),
      serviceZipCode: optionalString(body.serviceZipCode),
      serviceLatitude: parseOptionalCoordinate(body.serviceLatitude, "serviceLatitude", -90, 90),
      serviceLongitude: parseOptionalCoordinate(body.serviceLongitude, "serviceLongitude", -180, 180),
      destinationAddress: destination.destinationAddress,
      destinationCity: destination.destinationCity,
      destinationState: destination.destinationState,
      destinationZipCode: destination.destinationZipCode,
      destinationLatitude: destination.destinationLatitude,
      destinationLongitude: destination.destinationLongitude,
      serviceDetails,
      priority: body.priority === undefined ? undefined : parseWorkOrderPriority(body.priority),
      // CHECKLIST P1 PR-04c-A — `checklist_id` NÃO é mais escrito por aqui: quem o escreve é o recálculo do
      // espelho, dentro da transação que mexeu na junção (acima). Dois escritores da mesma coluna é como o
      // espelho e o conjunto passariam a discordar.
      scheduledFor: parseOptionalDate(body.scheduledFor, "scheduledFor"),
      // M-7 (J-MAPAS-8) — prazo de SLA pela trilha de update padrão (espelho de scheduledFor).
      slaDueAt: parseOptionalDate(body.slaDueAt, "slaDueAt"),
      updatedBy: actor.userId,
    };

    // P3 da verificação (perda de dados em requisição RECUSADA) — a escrita da junção roda SÓ AQUI, depois de o
    // corpo INTEIRO ter validado (título, prioridade, datas, coordenadas, destino). Antes, um update com
    // prioridade inválida devolvia 400 já tendo destruído o conjunto: o cliente lia "nada mudou" e a vistoria
    // tinha sumido. Antes deste PR tudo viajava numa transação só; a ordem das linhas é o que restaura isso.
    await this.applyChecklistSelectionOnUpdate(actor, current, checklistSelection);

    const updated = await this.repository.update(input);

    if (!updated) {
      throw new WorkOrderError(404, "WORK_ORDER_NOT_FOUND", "not_found", "Work order was not found.");
    }

    await this.repository.createEvent({
      tenantId: actor.tenantId,
      workOrderId: updated.id,
      eventType: "work_order_updated",
      actorUserId: actor.userId,
      message: "Ordem de servico atualizada.",
      metadata: {
        code: updated.code,
        changedFields: Object.keys(body).filter((key) => body[key] !== undefined),
      },
    });

    return updated;
  }

  /**
   * CHECKLIST P1 PR-04c-A (corrigido pela verificação — P1 BLOQUEANTE) — o conjunto no UPDATE:
   *
   *  · `absent`   ⇒ junção INTOCADA (o sticky vive aqui: nada re-resolve);
   *  · `legacy`   ⇒ ALTA 7a. Com 2+ vistorias vivas devolve 409 e manda usar o endpoint de vistorias: um id só
   *                 não expressa um conjunto, e deixá-lo passar apagaria a segunda vistoria em silêncio — o
   *                 sumiço que a revisão adversarial mediu. Com ≤1 (que é o caso de 100% das ordens de hoje) o
   *                 campo antigo REESCREVE a primária, preservando integralmente o comportamento atual;
   *  · `explicit` ⇒ 409 SEMPRE. O update genérico roda sob `work_orders:update` — permissão que o técnico de
   *                 campo TEM — enquanto a rota dedicada exige `field_dispatch:create` exatamente para quem
   *                 está em campo não redefinir a própria prova. A verificação provou por HTTP que aceitar
   *                 `checklists[]` aqui anulava esse gate: o guincheiro apagava a vistoria de entrega (a que
   *                 alimenta a comparação coleta×entrega, prova jurídica do estado do veículo) e zerava o
   *                 conjunto com `checklists: null` — sem a trava da exigência contratada e sem motivo. Porta
   *                 única: o conjunto explícito vive SÓ na criação e no endpoint de vistorias.
   */
  private async applyChecklistSelectionOnUpdate(
    actor: WorkOrderActorContext,
    current: WorkOrder,
    selection: ChecklistSetSelection,
  ): Promise<void> {
    if (selection.kind === "absent") return;

    if (selection.kind === "explicit") {
      // 409 SEMPRE, com o mesmo status/código/razão do campo legado com 2+ linhas. Mensagem PRÓPRIA porque a da
      // fábrica afirma "esta ordem tem mais de uma vistoria", e esta porta fecha independentemente do tamanho do
      // conjunto — afirmar a condição errada seria mentir para quem lê o erro.
      throw new WorkOrderError(
        409,
        "WORK_ORDER_CHECKLIST_SET_REQUIRES_ENDPOINT",
        "checklist_set_requires_endpoint",
        "Para alterar as vistorias desta ordem de serviço, use o endpoint de vistorias.",
      );
    }

    const links = await this.repository.listChecklists(actor.tenantId, current.id);
    const effective = effectiveChecklistSet(current, links);

    if (effective.length >= 2) {
      throw workOrderChecklistSetRequiresEndpointError();
    }

    // O campo antigo NÃO ganha a trava de vistoria-já-enviada nem a exigência de modelo publicado: hoje ele
    // troca o checklist de uma ordem já despachada (há teste mergeado que exerce exatamente isso) e aceita
    // qualquer id. Apertar por aqui quebraria integrações e ordens em voo sem que ninguém tivesse pedido —
    // o lugar do rigor é o endpoint novo, que nasce com ele. Resíduo registrado, não esquecido.
    await this.rewriteChecklistSet(actor, current, [{ checklistId: selection.checklistId, role: "generic" }], effective, {
      enforceRunGuard: false,
    });
  }

  /**
   * Leva o conjunto vivo ao estado declarado por DIFERENÇA, não por "apaga tudo e regrava".
   *
   * A linha que continua no conjunto é PRESERVADA — com a regra que a explica, o `order_index` e o snapshot
   * congelado. Regravá-la transformaria uma vistoria `resolved` em `manual`, apagaria a proveniência e jogaria
   * fora o formulário que o despacho congelou, tudo isso sem nenhum ganho.
   *
   * P1 da verificação — com a porta `explicit` do update fechada, o ÚNICO chamador hoje é o campo legado
   * `checklistId` (`desired` de UMA linha, `enforceRunGuard: false`). Os ramos de limpeza e do run-guard ficam:
   * são o contrato completo da reescrita, e é neles que qualquer porta futura de substituição já encontra as
   * travas prontas em vez de reinventá-las sem elas.
   */
  private async rewriteChecklistSet(
    actor: WorkOrderActorContext,
    current: WorkOrder,
    desired: readonly ChecklistSelectionItem[],
    effective: readonly { readonly checklistId: string; readonly role: WorkOrderChecklistRole; readonly ruleId?: string }[],
    options: { readonly enforceRunGuard: boolean },
  ): Promise<void> {
    const desiredKeys = new Set(desired.map((item) => checklistPhaseKey(item)));
    const removals = effective.filter((line) => !desiredKeys.has(checklistPhaseKey(line)));
    const additions = desired.filter(
      (item) => !effective.some((line) => checklistPhaseKey(line) === checklistPhaseKey(item)),
    );

    if (removals.length === 0 && additions.length === 0) return;

    if (options.enforceRunGuard) {
      for (const line of removals) {
        await this.assertChecklistNotDispatched(actor, current.id, line);
      }
    }

    const clearing = desired.length === 0;
    const result = await this.repository.applyChecklists({
      tenantId: actor.tenantId,
      workOrderId: current.id,
      actorUserId: actor.userId,
      removeAll: clearing,
      remove: clearing ? undefined : removals.map((line) => ({ checklistId: line.checklistId, role: line.role })),
      add: additions.map((item, index) => ({
        checklistId: item.checklistId,
        role: item.role,
        source: "manual" as const,
        orderIndex: index,
        addedBy: actor.userId,
      })),
      appendAfterExisting: true,
    });

    if (!result) {
      throw new WorkOrderError(404, "WORK_ORDER_NOT_FOUND", "not_found", "Work order was not found.");
    }

    await this.recordChecklistSetEvents(actor, result, { cleared: clearing });
  }

  /**
   * CHECKLIST P1 PR-04c-A (§10) — O AJUSTE DO OPERADOR, antes de a ordem ir a campo.
   *
   * É a válvula humana do sticky: a regra decide, e quem despacha corrige o caso concreto. O que ele pode:
   * acrescentar vistoria publicada e retirar vistoria — INCLUSIVE a que veio de regra (é o pedido do dono).
   * O que ele não pode: retirar vistoria já enviada ao técnico (409 — ela pode estar sendo respondida em campo
   * e é prova; o caminho é a reabertura), mexer em ordem já encerrada, duplicar o par modelo+etapa, ou retirar
   * sem motivo. Toda retirada vira linha na timeline que o guincheiro vê.
   */
  async adjustChecklists(actor: WorkOrderActorContext, workOrderId: string, body: RawRecord) {
    const current = await this.get(actor, workOrderId);

    // §10.2.6 — ordem encerrada (concluída/cancelada/recusada) não ajusta vistoria: o conjunto dela já é
    // histórico, e histórico não se reescreve.
    if (WORK_ORDER_STATUS_TRANSITIONS[current.status].length === 0) {
      throw workOrderChecklistTerminalError();
    }

    const { add, remove } = parseChecklistAdjustment(body);
    assertNoRepeatedChecklistPhase(add);

    const links = await this.repository.listChecklists(actor.tenantId, current.id);
    const effective = effectiveChecklistSet(current, links);
    const removalKeys = new Set(remove.map((item) => checklistPhaseKey(item)));

    // Duplicata só conta contra as linhas que SOBREVIVEM a esta chamada: trocar a etapa de uma vistoria
    // (retirar coleta + incluir entrega do mesmo modelo) é um ajuste legítimo numa requisição só.
    for (const item of add) {
      const key = checklistPhaseKey(item);
      if (effective.some((line) => checklistPhaseKey(line) === key) && !removalKeys.has(key)) {
        throw workOrderChecklistDuplicateError();
      }
    }
    await this.assertChecklistsArePublished(actor, add.map((item) => item.checklistId));

    const customerScopedKeys = new Set<string>();
    for (const item of remove) {
      const line = effective.find((candidate) => checklistPhaseKey(candidate) === checklistPhaseKey(item));
      if (!line) {
        throw workOrderChecklistLinkNotFoundError();
      }
      await this.assertChecklistNotDispatched(actor, current.id, line);
      if (await this.isCustomerScopedRemoval(actor, line, item)) {
        customerScopedKeys.add(checklistPhaseKey(line));
      }
    }

    const result = await this.repository.applyChecklists({
      tenantId: actor.tenantId,
      workOrderId: current.id,
      actorUserId: actor.userId,
      remove: remove.map((item) => ({ checklistId: item.checklistId, role: item.role, reason: item.reason })),
      add: add.map((item, index) => ({
        checklistId: item.checklistId,
        role: item.role,
        source: "manual" as const,
        orderIndex: index,
        addedBy: actor.userId,
      })),
      // BLOQ 3 — a vistoria acrescentada entra no FIM da fila: ela nunca desloca a primária que o despacho
      // congelou, então o campo nunca recebe um formulário que o freeze não viu.
      appendAfterExisting: true,
    });

    if (!result) {
      throw new WorkOrderError(404, "WORK_ORDER_NOT_FOUND", "not_found", "Work order was not found.");
    }

    await this.recordChecklistSetEvents(actor, result, { cleared: false, customerScopedKeys });

    return {
      workOrder: result.workOrder,
      checklists: effectiveChecklistSet(result.workOrder, result.links),
      removed: result.removed,
      added: result.added,
    };
  }

  // §10.2.5 — pré-check da vistoria já ENVIADA ao técnico. Sem o porto montado a trava não existe (degrada
  // como as demais referências opcionais) — e é por isso que a suíte a exercita com o porto ligado.
  private async assertChecklistNotDispatched(
    actor: WorkOrderActorContext,
    workOrderId: string,
    line: { readonly checklistId: string; readonly role: WorkOrderChecklistRole },
  ): Promise<void> {
    const resolver = this.references.hasProvisionedChecklistRun;
    if (!resolver) return;

    if (await resolver(actor, { workOrderId, checklistId: line.checklistId, role: line.role })) {
      throw workOrderChecklistAlreadyDispatchedError();
    }
  }

  // §10.2.9 (ALTA 8) — vistoria exigida pelo CONTRATO de um cliente nomeado só sai com confirmação distinta.
  // Devolve se a linha é de escopo-cliente, para a auditoria registrar o FATO (`ruleCustomerScoped: true`) sem
  // jamais carregar o id do cliente (§2.8).
  private async isCustomerScopedRemoval(
    actor: WorkOrderActorContext,
    line: { readonly ruleId?: string },
    removal: ChecklistAdjustmentRemoval,
  ): Promise<boolean> {
    if (!line.ruleId) return false;

    const resolver = this.references.isApplicabilityRuleCustomerScoped;
    if (!resolver) return false;

    const customerScoped = await resolver(actor, line.ruleId);
    if (customerScoped && !removal.confirmCustomerScoped) {
      throw workOrderChecklistCustomerScopedConfirmationError();
    }

    return customerScoped;
  }

  /**
   * A HISTÓRIA do conjunto, na timeline da própria ordem — e ela chega ao guincheiro sem uma linha de Dart: o
   * app busca a timeline remota e já renderiza a mensagem. Sem isto, "o operador ajusta no envio" seria uma
   * promessa que o campo não tem como auditar.
   *
   * §2.8 — a metadata carrega só o que a operação precisa (modelo, etapa, proveniência, rótulo). NUNCA
   * `tenant_id`, nunca o snapshot, e nunca o id do cliente da regra: dele vai apenas o FATO de a exigência ser
   * contratual (`ruleCustomerScoped`).
   */
  private async recordChecklistSetEvents(
    actor: WorkOrderActorContext,
    result: { readonly workOrder: WorkOrder; readonly removed: readonly WorkOrderChecklistLink[]; readonly added: readonly WorkOrderChecklistLink[] },
    options: { readonly cleared: boolean; readonly customerScopedKeys?: ReadonlySet<string> },
  ): Promise<void> {
    if (options.cleared && result.removed.length > 0) {
      await this.repository.createEvent({
        tenantId: actor.tenantId,
        workOrderId: result.workOrder.id,
        eventType: "work_order_checklists_cleared",
        actorUserId: actor.userId,
        message: "As vistorias desta ordem de serviço foram retiradas.",
        metadata: { removedCount: result.removed.length },
      });
      return;
    }

    for (const link of result.added) {
      const label = await this.resolveChecklistLabel(actor, link.checklistId);
      await this.repository.createEvent({
        tenantId: actor.tenantId,
        workOrderId: result.workOrder.id,
        eventType: "work_order_checklist_added",
        actorUserId: actor.userId,
        message: label
          ? `Vistoria "${label}" incluída nesta ordem de serviço.`
          : "Uma vistoria foi incluída nesta ordem de serviço.",
        metadata: checklistEventMetadata(link, label, false),
      });
    }

    for (const link of result.removed) {
      const label = await this.resolveChecklistLabel(actor, link.checklistId);
      const customerScoped = options.customerScopedKeys?.has(checklistPhaseKey(link)) ?? false;
      const subject = label ? `Vistoria "${label}"` : "Uma vistoria";
      await this.repository.createEvent({
        tenantId: actor.tenantId,
        workOrderId: result.workOrder.id,
        eventType: "work_order_checklist_removed",
        actorUserId: actor.userId,
        // O motivo entra na MENSAGEM (texto que o operador digitou, visível na timeline sob RBAC) — mesmo
        // tratamento que o cancelamento da ordem já dá ao motivo. A auditoria da requisição não o carrega.
        message: link.removedReason
          ? `${subject} foi retirada desta ordem de serviço pelo escritório. Motivo: ${link.removedReason}`
          : `${subject} foi retirada desta ordem de serviço pelo escritório.`,
        metadata: checklistEventMetadata(link, label, customerScoped),
      });
    }
  }

  private async resolveChecklistLabel(actor: WorkOrderActorContext, checklistId: string): Promise<string | null> {
    const resolver = this.references.resolveChecklistLabel;
    if (!resolver) return null;

    try {
      return await resolver(actor, checklistId);
    } catch {
      // Rótulo é enfeite da mensagem; nunca pode derrubar o ajuste nem inventar um nome (D-007).
      return null;
    }
  }

  /**
   * Ω3F-7a — quilometragem (km) da OS. FONTE ÚNICA usada pela base (PATCH /:id/mileage, source="base")
   * E pelo app (fila offline `work_order.mileage`, source="app"). Contrato:
   *  · 404 inexistente/cross-tenant (via get());
   *  · aceita snake (mileage_start/mileage_end) e camel; cada km é decimal OPCIONAL >= 0 (400
   *    invalid_mileage em negativo/NaN/não-número);
   *  · MERGE por-campo — o valor efetivo de cada km = o do corpo se presente, senão o persistido; assim o
   *    app pode mandar só o inicial e, depois, só o final;
   *  · 422 invalid_mileage_range quando AMBOS os efetivos existem e o final < inicial;
   *  · persiste só os km fornecidos + mileageSource=source; se source="base" também mileageCorrectedAt=agora;
   *  · grava o evento de timeline `work_order_mileage_updated` com metadata CURADA (§2.8: source + km,
   *    sem tenant/segredo).
   * A permissão vive em CADA caller (não aqui): a correção da base (PATCH) exige a permissão DEDICADA
   * `work_orders:mileage_correct` (só o escritório a tem); a fila do app exige `work_orders:status` (o campo
   * a tem). O `source` é decidido pelo SERVIDOR (parâmetro), nunca pelo corpo — o app não vira 'base'.
   */
  async setMileage(
    actor: WorkOrderActorContext,
    workOrderId: string,
    body: RawRecord,
    source: "app" | "base",
  ): Promise<WorkOrder> {
    const current = await this.get(actor, workOrderId);

    const mileageStart = parseOptionalMileage(body.mileage_start ?? body.mileageStart, "mileageStart");
    const mileageEnd = parseOptionalMileage(body.mileage_end ?? body.mileageEnd, "mileageEnd");

    // FURO 2 (critico J-Ω3F-7A): corpo SEM nenhum km não pode mutar a OS — antes, `{}` reescrevia
    // mileage_source='base' + carimbava mileage_corrected_at + emitia evento/auditoria FANTASMA (uma
    // "correção" que não corrigiu nada). Exige ≥1 km → 400 mileage_required.
    if (mileageStart === undefined && mileageEnd === undefined) {
      throw new WorkOrderError(400, "WORK_ORDER_INVALID", "mileage_required", "At least one of mileageStart or mileageEnd is required.");
    }

    // Merge por-campo: km efetivo = corpo (se veio) senão o persistido. `0` é valor válido, então ??
    // (que só cai no persistido em null/undefined) é o operador certo aqui — não `||`.
    const effectiveStart = mileageStart ?? current.mileageStart;
    const effectiveEnd = mileageEnd ?? current.mileageEnd;

    if (effectiveStart !== undefined && effectiveEnd !== undefined && effectiveEnd < effectiveStart) {
      throw new WorkOrderError(
        422,
        "WORK_ORDER_UNPROCESSABLE",
        "invalid_mileage_range",
        "mileageEnd must be greater than or equal to mileageStart.",
      );
    }

    const updated = await this.repository.update({
      tenantId: actor.tenantId,
      workOrderId: parseRequiredUuid(workOrderId, "workOrderId"),
      // Só os km FORNECIDOS vão ao banco (compactRecord/definedFields descartam undefined): o merge
      // por-campo preserva o que já estava lá.
      ...(mileageStart !== undefined ? { mileageStart } : {}),
      ...(mileageEnd !== undefined ? { mileageEnd } : {}),
      mileageSource: source,
      ...(source === "base" ? { mileageCorrectedAt: new Date() } : {}),
      updatedBy: actor.userId,
    });

    // Corrida: RETURNING vazio (inexistente/cross-tenant entre o get e o update) → 404, nunca 500.
    if (!updated) {
      throw new WorkOrderError(404, "WORK_ORDER_NOT_FOUND", "not_found", "Work order was not found.");
    }

    await this.repository.createEvent({
      tenantId: actor.tenantId,
      workOrderId: updated.id,
      eventType: "work_order_mileage_updated",
      actorUserId: actor.userId,
      message: "Quilometragem da ordem de servico atualizada.",
      // Metadata CURADA (§2.8): origem + km efetivos. Sem tenant_id, sem segredo/PII.
      metadata: {
        source,
        mileageStart: updated.mileageStart ?? null,
        mileageEnd: updated.mileageEnd ?? null,
      },
    });

    return updated;
  }

  async changeStatus(actor: WorkOrderActorContext, workOrderId: string, body: RawRecord): Promise<WorkOrder> {
    const current = await this.get(actor, workOrderId);
    const nextStatus = parseWorkOrderStatus(body.status);
    const message = optionalString(body.message) ?? defaultStatusMessage(nextStatus);
    const cancellationReason = optionalString(body.cancellationReason) ?? optionalString(body.reason);

    // P-Ω3F6-STATUS-BYPASS FECHADO — o cancelamento NÃO acontece mais por esta rota legada. Antes, quem tinha
    // `work_orders:cancel` (manager/tenant_admin/super_admin) ainda cancelava por aqui SEM gravar a decisão
    // financeira (coluna NULL, itens intactos), contornando o gate do POST /cancel — dívida IRREPARÁVEL via API
    // (a OS já cancelada não aceita /cancel depois). Agora `status=cancelled` neste endpoint é RECUSADO para
    // TODOS (422) e redireciona ao único caminho que exige a decisão. A fila offline do mobile chama este mesmo
    // método → tecnico de campo deixa de cancelar por sync (defensável: campo não arbitra cobrança). O CHECK
    // `cancelled ⇒ decisão ∈ {keep,keep_unpaid,zero}` (migration) e o assertion InMemory travam a invariante nos
    // dois lados. Resíduo de concorrência cancel×create-de-item: P-Ω3F6-CANCEL-RACE.
    if (nextStatus === "cancelled") {
      throw new WorkOrderError(
        422,
        "WORK_ORDER_UNPROCESSABLE",
        "cancel_via_status_forbidden",
        "Cancelling a work order requires a financial decision; use POST /work-orders/:id/cancel.",
      );
    }

    assertStatusTransition(current.status, nextStatus);

    const updated = await this.repository.changeStatus({
      tenantId: actor.tenantId,
      workOrderId: current.id,
      status: nextStatus,
      message,
      cancellationReason,
      actorUserId: actor.userId,
    });

    if (!updated) {
      throw new WorkOrderError(404, "WORK_ORDER_NOT_FOUND", "not_found", "Work order was not found.");
    }

    await this.repository.createEvent({
      tenantId: actor.tenantId,
      workOrderId: updated.id,
      eventType: statusEventType(nextStatus),
      fromStatus: current.status,
      toStatus: nextStatus,
      actorUserId: actor.userId,
      message,
      metadata: {
        cancellationReason,
      },
    });

    await publishDomainEvent(
      "work_order.status_changed",
      {
        entity_type: "work_order",
        entity_id: updated.id,
        code: updated.code,
        from_status: current.status,
        to_status: nextStatus,
      },
      { tenantId: actor.tenantId, actorId: actor.userId },
    );

    return updated;
  }

  /**
   * Ω3F-6a (D-Ω3F-6-CANCEL) — cancelar com DECISÃO FINANCEIRA explícita.
   * Contrato: 400 motivo ausente · 422 decisão inválida/ausente · 422 transição inválida (inclui OS já
   * cancelada) · 404 cross-tenant. A decisão gravada é a FONTE DE VERDADE que o módulo de comissões
   * honra depois — este bloco NÃO mexe em comissões (P-Ω3F6-COMISSAO).
   * `zero` faz SOFT-DELETE dos itens financeiros ativos (total agregado → 0, linhas preservadas com
   * deleted_at para auditoria); `keep`/`keep_unpaid` não tocam os itens.
   */
  async cancel(actor: WorkOrderActorContext, workOrderId: string, body: RawRecord): Promise<WorkOrder> {
    const current = await this.get(actor, workOrderId);

    // Motivo é obrigatório: cancelamento sem justificativa não é auditável (mesmo reason do endpoint
    // de status legado, que já exigia motivo ao cancelar).
    const reason = optionalString(body.reason ?? body.cancellationReason);
    if (!reason) {
      throw new WorkOrderError(400, "WORK_ORDER_INVALID", "cancellation_reason_required", "cancellationReason is required.");
    }

    // Sem default silencioso: quem cancela decide o destino do dinheiro (422 quando ausente/inválida).
    const decision = parseFinancialCancellationDecision(body.financial_decision ?? body.financialDecision);

    this.assertCancellable(current.status);

    // `zero` ANTES de persistir o cancelamento: a OS nunca fica cancelada com o financeiro por zerar.
    // Integridade (D-CANCEL-INTEGRITY, este bloco fechou o cluster P-Ω3F6): (a) o par cancelado↔total-0 é
    // sustentado pelo TERMINAL-GUARD (create/update/delete/invoice recusam OS cancelada — 422 work_order_cancelled),
    // então não se lança/fatura item depois; (b) zeroFinancialItems é ATÔMICO (softDeleteAll numa operação, exclui
    // faturados) — sem a parcialidade/N+1 do loop antigo; item faturado bloqueia `zero` (422 has_invoiced_items,
    // preserva o lastro do Título). Resíduo: a corrida sub-ms cancel×create-de-item (P-Ω3F6-CANCEL-RACE), da mesma
    // classe dos TOCTOU aceitos — fecha com SELECT ... FOR UPDATE da OS (hardening futuro).
    if (decision === "zero") {
      await this.zeroFinancialItems(actor, current.id);
    }

    const updated = await this.repository.changeStatus({
      tenantId: actor.tenantId,
      workOrderId: current.id,
      status: "cancelled",
      message: defaultStatusMessage("cancelled"),
      cancellationReason: reason,
      financialCancellationDecision: decision,
      actorUserId: actor.userId,
    });

    if (!updated) {
      throw new WorkOrderError(404, "WORK_ORDER_NOT_FOUND", "not_found", "Work order was not found.");
    }

    await this.repository.createEvent({
      tenantId: actor.tenantId,
      workOrderId: updated.id,
      eventType: "work_order_cancelled",
      fromStatus: current.status,
      toStatus: "cancelled",
      actorUserId: actor.userId,
      message: defaultStatusMessage("cancelled"),
      // Metadata CURADA (§2.8): decisão + motivo (texto que o operador digitou, visível na timeline da
      // própria OS). Nada de tenant_id, id de item financeiro, valor ou qualquer chave de storage.
      metadata: {
        financialDecision: decision,
        cancellationReason: reason,
      },
    });

    await publishDomainEvent(
      "work_order.status_changed",
      {
        entity_type: "work_order",
        entity_id: updated.id,
        code: updated.code,
        from_status: current.status,
        to_status: "cancelled",
      },
      { tenantId: actor.tenantId, actorId: actor.userId },
    );

    return updated;
  }

  // Ω3F-6 — a OS já cancelada NÃO é pega por assertStatusTransition: o helper retorna cedo quando
  // from === to (idempotência do endpoint de status legado), então cancelar duas vezes passaria batido.
  // Guarda explícita antes. Nas demais transições, o helper segue sendo a ÚNICA fonte da tabela de
  // transições; só o status HTTP é reajustado: D-Ω3F-6-CANCEL fixa 422 para transição inválida nesta
  // rota, enquanto o helper emite o 409 do endpoint de status. Código e reason do módulo preservados.
  private assertCancellable(from: WorkOrderStatus): void {
    if (from === "cancelled") {
      throw cancelTransitionError(from);
    }

    try {
      assertStatusTransition(from, "cancelled");
    } catch (error) {
      if (error instanceof WorkOrderError && error.reason === "invalid_status_transition") {
        throw cancelTransitionError(from);
      }
      throw error;
    }
  }

  // D-Ω3F-6-CANCEL (`zero`) — reusa o DELETE LÓGICO já testado do Ω3F-3a: os itens somem da lista e do
  // total agregado, mas as linhas persistem com deleted_at (auditoria). Não "zera valores" (que
  // deixaria linhas 0,00 poluindo a aba). DYNAMIC import: work-order-financials importa work-orders
  // estaticamente — um import estático aqui fecharia o ciclo (mesmo padrão do approve→OS, D-Ω3F-4B).
  private async zeroFinancialItems(actor: WorkOrderActorContext, workOrderId: string): Promise<void> {
    const { createDefaultWorkOrderFinancialService } = await import(
      "../work-order-financials/work-order-financial.service.js"
    );
    const financials = await createDefaultWorkOrderFinancialService();
    // P-Ω3F6-STATUS-BYPASS (ataque de desenho, ALTA) — item JÁ FATURADO é lastro de um Título receivable
    // (D-Ω4-C1, imutável): `zero` NÃO pode destruí-lo (deixaria o Título sem itens-fonte). Se há item faturado,
    // `zero` é contraditório → 422 has_invoiced_items (o gestor deve usar `keep`; o Título já foi emitido).
    if (await financials.hasActiveInvoicedItems(actor, workOrderId)) {
      throw new WorkOrderError(
        422,
        "WORK_ORDER_UNPROCESSABLE",
        "has_invoiced_items",
        "Cannot zero the financials of a work order with invoiced items; the receivable title already exists. Use keep.",
      );
    }
    // P-Ω3F6-ZERO-ATOMICIDADE — UMA operação atômica (softDeleteAll) em vez de N deletes sequenciais sem
    // transação (que deixavam OS viva + itens meio-destruídos numa falha parcial + N+1). Não toca faturados.
    await financials.zeroActiveItems(actor, workOrderId);
  }

  /**
   * Ω3F-6a (D-Ω3F-6-DUPLICATE) — duplica a OS: novo código, novo ciclo (status open), data/hora atual.
   * NÃO herda orçamento nem itens financeiros congelados (invariante Ω3-e: duplicar não herda preço
   * congelado — a OS nova precifica do zero, contra refaturamento) nem anexos nem o desfecho da fonte
   * (cancelamento/decisão financeira). 404 cross-tenant · 409 replay do client_action_id.
   */
  async duplicate(actor: WorkOrderActorContext, workOrderId: string, body: RawRecord): Promise<WorkOrder> {
    const source = await this.get(actor, workOrderId);

    // Idempotência tenant-scoped (§6): replay → 409 ANTES de consumir número de OS (nextCode). O unique
    // PARCIAL do Postgres é a rede contra corrida (P2002 → 409 no repositório Prisma).
    const clientActionId = parseOptionalClientActionId(body.client_action_id ?? body.clientActionId);
    if (clientActionId) {
      const existing = await this.repository.findByClientActionId(actor.tenantId, clientActionId);
      if (existing) {
        throw duplicateWorkOrderError();
      }
    }

    const copyComments = body.copy_comments === true || body.copyComments === true;
    const copyChecklist = body.copy_checklist === true || body.copyChecklist === true;

    // Grava DIRETO pelo repositório (não por this.create): (a) create não carimba client_action_id e
    // ligá-lo lá levaria idempotência ao create normal, que D-Ω3F-6-DUPLICATE deixa para depois;
    // (b) o snapshot do cliente é COPIADO da fonte, enquanto create o RE-RESOLVE do cadastro (um
    // cliente renomeado reescreveria o snapshot congelado da OS-fonte). Consequência assumida: as
    // validações do create (#4 tarifa vigente, destino por tipo, viatura em manutenção, refs) NÃO se
    // aplicam — correto por construção, porque a fonte JÁ passou por elas e uma cópia não pode falhar
    // por uma tarifa que venceu ou uma viatura que entrou em manutenção depois.
    // ALTA 7b (o defeito REAL, medido) — como o duplicate não passa pelo `create`, a cópia nascia com
    // `checklist_id` e ZERO linha de junção: uma ordem-fonte com duas vistorias produzia uma cópia com UMA, a
    // etapa virava genérica e toda a proveniência sumia — em silêncio, no caminho feliz. A cópia leva agora o
    // CONJUNTO VIVO da origem, explicitamente.
    //
    // As cópias saem `manual` com `rule_id` nulo: marcá-las `resolved` apontando a regra original faria a
    // proveniência afirmar um ato de resolução que não aconteceu. E `copy_checklist=false` produz conjunto
    // VAZIO — "não copiar a vistoria" nunca pode virar "resolver uma vistoria nova".
    const checklists = copyChecklist ? await this.copyChecklistSetFrom(actor, source) : [];

    const code = await this.repository.nextCode(actor.tenantId);
    const workOrder = await this.repository.create({
      tenantId: actor.tenantId,
      code,
      title: source.title,
      description: source.description,
      // Snapshot do cliente: cópia literal do congelado na fonte (não re-resolve o cadastro).
      customerName: source.customerName,
      customerDocument: source.customerDocument,
      customerPhone: source.customerPhone,
      // Origem + destino (o mesmo trajeto).
      serviceAddress: source.serviceAddress,
      serviceCity: source.serviceCity,
      serviceState: source.serviceState,
      serviceZipCode: source.serviceZipCode,
      serviceLatitude: source.serviceLatitude,
      serviceLongitude: source.serviceLongitude,
      destinationAddress: source.destinationAddress,
      destinationCity: source.destinationCity,
      destinationState: source.destinationState,
      destinationZipCode: source.destinationZipCode,
      destinationLatitude: source.destinationLatitude,
      destinationLongitude: source.destinationLongitude,
      serviceDetails: source.serviceDetails,
      priority: source.priority,
      // Vínculos de cadastro (cliente/viatura/equipe/tipo de serviço).
      // RESSALVA HONESTA (pós-análise Ω3F-6): `vehicleId`/`teamId` são DUAL-ORIGIN — nascem no create, mas o
      // `assign` também os grava (work-order.repository.ts). Numa OS já despachada, a cópia nasce `open` e
      // SEM operador/assignment, porém COM a viatura e a equipe do despacho anterior. É o comportamento
      // aceito (a cópia herda o plano de recurso, não a atribuição), mas não diga "sem atribuição" como se
      // nenhum resíduo do despacho viesse junto — vem.
      customerId: source.customerId,
      vehicleId: source.vehicleId,
      teamId: source.teamId,
      serviceCatalogId: source.serviceCatalogId,
      // Checklist: opt-in. Template + snapshot congelado andam JUNTOS — herdar o id sem o snapshot (ou
      // vice-versa) produziria uma OS cujo checklist exibido não é o que o despacho congelou. As duas colunas
      // são DERIVADAS da linha primária do conjunto copiado (espelho); ficam aqui só como intenção explícita.
      checklists,
      checklistId: copyChecklist ? source.checklistId : undefined,
      checklistSnapshot: copyChecklist ? source.checklistSnapshot : null,
      // NOVO ciclo: sem agendamento, sem atribuição, sem desfecho da fonte (cancelled_at/
      // cancellation_reason/financial_cancellation_decision nascem vazios).
      status: "open",
      scheduledFor: undefined,
      clientActionId,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });

    if (copyComments) {
      await this.copyComments(actor, source.id, workOrder.id);
    }

    await this.repository.createEvent({
      tenantId: actor.tenantId,
      workOrderId: workOrder.id,
      eventType: "work_order_created",
      toStatus: workOrder.status,
      actorUserId: actor.userId,
      message: "Ordem de servico duplicada.",
      // Metadata curada (§2.8): rastreia a origem da cópia. Sem tenant_id, sem service_details.
      metadata: {
        code: workOrder.code,
        priority: workOrder.priority,
        duplicatedFrom: source.id,
      },
    });

    return workOrder;
  }

  /**
   * ALTA 7b — o conjunto que a cópia herda: as linhas VIVAS da origem (ou a visão sintética, quando a origem é
   * uma ordem legada sem junção). `role` e `order_index` são preservados — a fila de vistorias da cópia é a
   * mesma da origem — e o snapshot congelado de cada linha vai junto, porque o modelo pode ter sido editado ou
   * despublicado desde então e a cópia herda o plano da origem, não o catálogo de hoje.
   */
  private async copyChecklistSetFrom(
    actor: WorkOrderActorContext,
    source: WorkOrder,
  ): Promise<readonly WorkOrderChecklistLinkInput[]> {
    const live = liveChecklistLinks(await this.repository.listChecklists(actor.tenantId, source.id));
    if (live.length === 0) {
      return syntheticChecklistSet(source).map((link) => ({ ...link, addedBy: actor.userId }));
    }

    return live.map((link) => ({
      checklistId: link.checklistId,
      role: link.role,
      source: "manual" as const,
      orderIndex: link.orderIndex,
      checklistSnapshot: link.checklistSnapshot ?? null,
      addedBy: actor.userId,
    }));
  }

  // D-Ω3F-6-DUPLICATE (`copy_comments`) — copia os comentários ATIVOS (o repositório já exclui os
  // deletados logicamente) preservando a AUTORIA ORIGINAL. Vai ao repositório, não ao
  // WorkOrderCommentService: addComment carimba o ator como autor, e quem duplica não escreveu o que a
  // equipe comentou. Copia SÓ mensagem + autor: as TAGS ficam de fora — a associação polimórfica
  // (TagAssignment) classifica AQUELE comentário naquele contexto; replicá-la inflaria a contagem de
  // uso de cada tag numa OS nova que ainda não foi triada. Reclassificar é 1 clique; desfazer tag
  // fantasma em massa, não. DYNAMIC import: work-order-comments importa work-orders estaticamente.
  private async copyComments(actor: WorkOrderActorContext, sourceId: string, targetId: string): Promise<void> {
    const { createDefaultWorkOrderCommentRepository } = await import(
      "../work-order-comments/work-order-comment.service.js"
    );
    const comments = await createDefaultWorkOrderCommentRepository();
    const sourceComments = await comments.listByWorkOrder(actor.tenantId, sourceId);

    for (const comment of sourceComments) {
      await comments.create({
        tenantId: actor.tenantId,
        workOrderId: targetId,
        authorUserId: comment.authorUserId,
        message: comment.message,
      });
    }
  }

  async assign(actor: WorkOrderActorContext, workOrderId: string, body: RawRecord) {
    const current = await this.get(actor, workOrderId);
    // D1 — the assign action gains optional viatura/equipe selection, carried by the
    // mobile `work_order.assign` sync action and accepted on the REST body. Each
    // provided reference is validated tenant-scoped via the same B1 resolvers used on
    // create; a missing/cross-tenant id resolves to "not found" and is rejected with a
    // 400. When both are absent the legacy assign path is unchanged.
    const vehicleId = parseOptionalUuid(body.vehicleId ?? body.vehicle_id, "vehicleId");
    const teamId = parseOptionalUuid(body.teamId ?? body.team_id, "teamId");
    await this.assertReferenceExists("vehicle", this.references.resolveVehicle, actor, vehicleId);
    await this.assertReferenceExists("team", this.references.resolveTeam, actor, teamId);

    const input: AssignWorkOrderInput = {
      tenantId: actor.tenantId,
      workOrderId: current.id,
      operatorId: parseRequiredUuid(body.operatorId ?? body.userId, "operatorId"),
      userId: parseOptionalUuid(body.userId, "userId"),
      vehicleId,
      teamId,
      message: optionalString(body.message) ?? "Ordem de servico atribuida.",
      assignedBy: actor.userId,
    };

    assertStatusTransition(current.status, "assigned");
    const result = await this.repository.assign(input);

    if (!result) {
      throw new WorkOrderError(404, "WORK_ORDER_NOT_FOUND", "not_found", "Work order was not found.");
    }

    await this.repository.createEvent({
      tenantId: actor.tenantId,
      workOrderId: current.id,
      eventType: "work_order_assigned",
      fromStatus: current.status,
      toStatus: "assigned",
      actorUserId: actor.userId,
      message: input.message,
      metadata: {
        operatorId: input.operatorId,
        userId: input.userId,
        vehicleId: input.vehicleId,
        teamId: input.teamId,
        assignmentId: result.assignment.id,
      },
    });

    return result.workOrder;
  }

  async timeline(actor: WorkOrderActorContext, workOrderId: string): Promise<readonly WorkOrderEvent[]> {
    const workOrder = await this.get(actor, workOrderId);

    return this.repository.listTimeline(actor.tenantId, workOrder.id);
  }

  // Ω3F-5 (D-Ω3F-5-COMMENT) — o comentário do usuário deixou de gravar evento na timeline: agora é um
  // AGREGADO PRÓPRIO mutável (`WorkOrderComment`), servido por WorkOrderCommentService/`/comments`.
  // WorkOrderEvent volta a ser SÓ audit trail de sistema (append-only). Eventos `work_order_comment`
  // históricos permanecem inertes em work_order_events (sem backfill; o filtro P-034 do dashboard segue).

  // Ω3-c — congela (ou limpa) o snapshot de checklist na OS. Chamado pelo FieldDispatchService no
  // despacho (E1/E3); tenant-scoped (OS de outro tenant → 404). Snapshot é cópia imutável (JSON).
  async freezeChecklistSnapshot(
    actor: WorkOrderActorContext,
    workOrderId: string,
    snapshot: Record<string, unknown> | null,
  ): Promise<WorkOrder> {
    const updated = await this.repository.freezeChecklistSnapshot({
      tenantId: actor.tenantId,
      workOrderId: parseRequiredUuid(workOrderId, "workOrderId"),
      checklistSnapshot: snapshot,
      actorUserId: actor.userId,
    });
    if (!updated) {
      throw new WorkOrderError(404, "WORK_ORDER_NOT_FOUND", "not_found", "Work order was not found.");
    }
    return updated;
  }

  // ─────────── CHECKLIST P1 PR-04c (§7) — o que o DESPACHO precisa da ordem de serviço ───────────
  //
  // Estes quatro membros são a superfície que `WorkOrderChecklistSetPort` (field-dispatch) consome. Ficam
  // JUNTOS e no fim da classe de propósito: são efeito de domínio do despacho, não a seleção de vistorias da
  // ordem (que vive lá em cima, na criação/ajuste). Ligar o porto a eles é o que transforma "o despacho
  // congela TODAS as vistorias vivas" de comentário em fato.

  /**
   * As linhas VIVAS da junção, CRUAS — com `checklistSnapshot`, já ordenadas (a primeira é a primária).
   *
   * POR QUE NÃO `listChecklistSet`: aquele devolve o conjunto EFETIVO (`effectiveChecklistSet`), que DESCARTA o
   * `checklistSnapshot` e materializa a ordem legada como uma linha genérica. O despacho precisa exatamente da
   * distinção que aquela leitura apaga — "linha de junção que o congelamento nunca viu" (não vai a campo,
   * guard do BLOQ 3) contra "ordem anterior ao conjunto, sem linha nenhuma" (resolve ao vivo, e é isso que faz
   * do reassign um caminho real de recuperação). Servir o conjunto efetivo ao despacho apagaria a diferença:
   * trancaria a recuperação das ordens antigas E mandaria a campo formulário que ninguém congelou.
   *
   * SEM ator, e de propósito: é leitura de um efeito de domínio JÁ autorizado na rota do despacho
   * (`field_dispatch:create`) — o padrão NÃO-amplificador que a junta fixou. Continua tenant-scoped: a
   * organização é parâmetro explícito, nunca deduzida.
   */
  listChecklistLinks(tenantId: string, workOrderId: string): Promise<readonly WorkOrderChecklistLink[]> {
    return this.repository.listChecklists(tenantId, workOrderId);
  }

  /**
   * Congela o formulário das linhas que NÃO são a primária (a primária vai por `freezeChecklistSnapshot`, que
   * grava a coluna-espelho e a linha na mesma escrita). Linha que não existe mais é ignorada — ver o contrato
   * no repositório.
   */
  async freezeChecklistLinkSnapshots(input: FreezeChecklistLinkSnapshotsInput): Promise<void> {
    await this.repository.freezeChecklistLinkSnapshots(input);
  }

  /**
   * §7.3 — a contrapartida de provisionar SÓ a primária: a vistoria que ficou para depois vira linha na
   * história da ORDEM. É `work_order_events`, e não a timeline do despacho, porque é a timeline da ordem que o
   * aplicativo de campo lê (`GET /work-orders/:id/timeline`) — escrever aqui é escrever na tela do guincheiro,
   * sem uma linha de Dart. Diferir em silêncio seria efeito sem superfície, a doença que esta fatia existe para
   * não repetir.
   */
  async recordChecklistDeferredAtDispatch(input: DispatchChecklistOutcomeInput): Promise<void> {
    await this.recordDispatchChecklistOutcome("work_order_checklist_run_deferred", input);
  }

  /**
   * §7.5 (ALTA 9) — a VISTORIA PROMETIDA QUE NÃO FOI: o modelo foi arquivado ou despublicado entre a criação da
   * ordem e o despacho, e não há formulário para congelar. Antes desta fatia era um `if` que simplesmente não
   * entrava — a vistoria sumia sem nenhuma linha, e ninguém descobria até o litígio.
   *
   * O despacho também registra a falha na SUA timeline + notificação (isso serve o escritório). Este evento é o
   * outro lado: é o que chega a quem está com o veículo na mão.
   */
  async recordChecklistMissingAtDispatch(input: DispatchChecklistOutcomeInput): Promise<void> {
    await this.recordDispatchChecklistOutcome("work_order_checklist_missing_at_dispatch", input);
  }

  private async recordDispatchChecklistOutcome(
    eventType: "work_order_checklist_run_deferred" | "work_order_checklist_missing_at_dispatch",
    input: DispatchChecklistOutcomeInput,
  ): Promise<void> {
    const actor: WorkOrderActorContext = {
      tenantId: input.tenantId,
      userId: input.actorUserId,
      roles: [],
      permissions: [],
    };
    const label = await this.resolveChecklistLabel(actor, input.checklistId);

    // A PROVENIÊNCIA vem da junção, não do porto. O despacho conhece modelo e etapa (é o que decide se a
    // vistoria vai a campo); `source`/`ruleId` são a explicação de POR QUE aquela vistoria estava prometida, e
    // essa resposta é da linha. Custa uma leitura indexada por evento — o preço de não fazer o porto carregar
    // campos que ele não usa para decidir nada. Ordem legada (sem junção) sai com os dois nulos, que é a
    // verdade: nenhuma regra a explicou.
    const link = (await this.repository.listChecklists(input.tenantId, input.workOrderId)).find(
      (candidate) => candidate.checklistId === input.checklistId && candidate.role === input.role,
    );

    await this.repository.createEvent({
      tenantId: input.tenantId,
      workOrderId: input.workOrderId,
      eventType,
      actorUserId: input.actorUserId,
      message:
        eventType === "work_order_checklist_run_deferred"
          ? `${checklistPhaseSubject(label, input.role)} foi registrada nesta ordem de serviço e ainda não foi enviada ao técnico.`
          : `${checklistPhaseSubject(label, input.role)} não foi enviada ao técnico: o modelo não está publicado.`,
      // §2.8 — allowlist estrita: modelo, rótulo, etapa e proveniência. NUNCA a organização, nunca o
      // formulário congelado, nunca o id do cliente da regra.
      metadata: {
        checklistId: input.checklistId,
        checklistLabel: label,
        role: input.role,
        source: link?.source ?? null,
        ruleId: link?.ruleId ?? null,
      },
    });
  }
}

/** O alvo de um evento de conjunto emitido pelo DESPACHO: a organização, a ordem, o modelo e a etapa. */
export type DispatchChecklistOutcomeInput = {
  readonly tenantId: string;
  readonly actorUserId: string;
  readonly workOrderId: string;
  readonly checklistId: string;
  readonly role: WorkOrderChecklistRole;
};

/**
 * §3 — a etapa em PT-BR de negócio. O vocabulário técnico (`collection`/`delivery`/`generic`) é da coluna e do
 * contrato; o que chega à tela do guincheiro é "da coleta"/"da entrega". `generic` não vira texto nenhum: ela
 * significa "vale para a ordem toda", e nomear isso na frase só confundiria quem lê.
 *
 * `Record` completo (e não um `switch` com default) para a extensão do eixo que o dono já anunciou
 * (`custody_field`/`custody_yard`) parar a compilação aqui em vez de sair silenciosamente sem rótulo.
 */
const CHECKLIST_PHASE_LABELS: Record<WorkOrderChecklistRole, string> = {
  collection: "da coleta",
  delivery: "da entrega",
  generic: "",
};

function checklistPhaseSubject(label: string | null, role: WorkOrderChecklistRole): string {
  const named = label ? `A vistoria "${label}"` : "Uma vistoria";
  const phase = CHECKLIST_PHASE_LABELS[role];

  return phase ? `${named} ${phase}` : named;
}

const memoryRepository = new InMemoryWorkOrderRepository();
let defaultServicePromise: Promise<WorkOrderService> | undefined;

export function createMemoryWorkOrderService(): WorkOrderService {
  return new WorkOrderService(memoryRepository, createDefaultReferenceResolvers());
}

/**
 * Builds tenant-scoped reference resolvers over the cadastro modules' default
 * services. In memory mode these share the same singletons the cadastro routes
 * use, so API-created customers/vehicles/teams/services are visible here.
 */
function createDefaultReferenceResolvers(): WorkOrderReferenceResolvers {
  return {
    resolveCustomer: async (actor, id) => {
      try {
        const service = await createDefaultCustomerService();
        const customer = await service.get(actor, id);

        return {
          name: customer.name,
          document: customer.document ?? null,
          phone: customer.phone ?? null,
        };
      } catch {
        return null;
      }
    },
    resolveVehicle: (actor, id) => referenceExists(createDefaultVehicleService, actor, id),
    resolveTeam: (actor, id) => referenceExists(createDefaultTeamService, actor, id),
    resolveServiceCatalog: (actor, id) => referenceExists(createDefaultServiceCatalogService, actor, id),
    // Ω3F-2a — lê o tipo do serviço no catálogo (tenant-scoped). null quando o id não resolve
    // (inexistente/cross-tenant) — nesse caso a regra de destino não se aplica.
    resolveServiceCatalogTypeInfo: async (actor, id) => {
      try {
        const service = await createDefaultServiceCatalogService();
        const serviceCatalog = await service.get(actor, id);

        return {
          serviceType: serviceCatalog.serviceType ?? null,
          requiresDestination: serviceCatalog.requiresDestination,
        };
      } catch {
        return null;
      }
    },
    // Ω3F-3b (#4) — existência de tarifa aplicável (tenant+cliente) para o serviço, reusando o mesmo
    // resolveApplicableTariff do orçamento/financeiro. Projeta a Tarifa para booleano (só existência),
    // mantendo work-orders desacoplado. Falha → false (a validação #4 rejeita com 422; nunca 500).
    resolveApplicableTariffForOrder: async (actor, serviceCatalogId, customerId) => {
      try {
        const resolve = await createApplicableTariffResolver();
        const tariff = await resolve(actor.tenantId, serviceCatalogId, customerId);

        return Boolean(tariff);
      } catch {
        return false;
      }
    },
    // F2 R2.3 — reuses the maintenance default service singleton so an OS-facing
    // availability check sees maintenance orders created via the API. Fails open
    // (available) on any error so maintenance never blocks OS creation spuriously.
    hasActiveMaintenance: async (actor, id) => {
      try {
        const service = await createDefaultMaintenanceOrderService();

        return await service.hasActiveMaintenance(actor, id);
      } catch {
        return false;
      }
    },
    resolveCustomerSummary: (actor, id) =>
      resolveEntitySummary(createDefaultCustomerService, actor, id, (customer) => ({
        id: customer.id,
        name: customer.name,
        isActive: customer.isActive,
      })),
    resolveVehicleSummary: (actor, id) =>
      resolveEntitySummary(createDefaultVehicleService, actor, id, (vehicle) => ({
        id: vehicle.id,
        plate: vehicle.plate,
        model: vehicle.model,
      })),
    resolveTeamSummary: (actor, id) =>
      resolveEntitySummary(createDefaultTeamService, actor, id, (team) => ({
        id: team.id,
        name: team.name,
      })),
    resolveServiceCatalogSummary: (actor, id) =>
      resolveEntitySummary(createDefaultServiceCatalogService, actor, id, (service) => ({
        id: service.id,
        name: service.name,
        basePrice: service.basePrice ?? null,
      })),
    // Ω3F-8b — última posição do técnico atribuído: reusa FieldLocationService (listHistory, limit 1) —
    // o mesmo singleton em memória que a rota mobile alimenta. Falha/ausência → null (o mapa degrada:
    // sem posição real, cai na origem). LGPD: só o operatorUserId atribuído; coordenada nunca logada.
    resolveAssignedOperatorLocation: async (actor, operatorUserId) => {
      try {
        const service = await createDefaultFieldLocationService();
        const history = await service.listHistory(actor, { operatorUserId, limit: 1 });
        const latest = history[0];
        if (!latest) return null;
        return { latitude: latest.latitude, longitude: latest.longitude, capturedAt: latest.recordedAt };
      } catch {
        return null;
      }
    },
    // CHECKLIST P1 PR-04c-A — portos do conjunto de vistorias. DYNAMIC import de propósito: field-dispatch já
    // importa work-orders estaticamente e o módulo de checklists é vizinho dessa aresta; um import estático
    // aqui amarraria os três num nó difícil de desfazer (mesmo padrão de zeroFinancialItems/copyComments).
    //
    // `resolveApplicableChecklists` NÃO é montado aqui: entre o 04c-A e o 04c-B não existe rota nem permissão
    // que crie uma regra, então o conjunto resolvido é vazio POR CONSTRUÇÃO. O 04c-B liga o porto junto da tela.
    assertChecklistsPublished: async (actor, checklistIds) => {
      const { createDefaultChecklistService } = await import("../checklists/checklist.service.js");
      const service = await createDefaultChecklistService();
      const published = new Set((await service.listAvailableTemplates(actor)).map((template) => template.id));

      return checklistIds.filter((checklistId) => !published.has(checklistId));
    },
    // §10.2.5 — a vistoria já foi enviada ao técnico? Consulta as DUAS chaves de idempotência do
    // provisionamento: a nova (com etapa) e a LEGADA (ordens anteriores ao 04c, cuja run nasceu sem etapa na
    // chave). Perguntar só pela nova daria "não enviada" para toda ordem em voo — e o operador retiraria uma
    // vistoria que o guincheiro já está respondendo.
    // O FORMATO das chaves é o do provisionador do despacho (field-dispatch); ele é repetido aqui, e não
    // importado, porque field-dispatch importa work-orders — importar de volta fecharia o ciclo. O par de
    // formatos está fixado em teste dos dois lados.
    hasProvisionedChecklistRun: async (actor, { workOrderId, checklistId, role }) => {
      try {
        const { createDefaultChecklistService } = await import("../checklists/checklist.service.js");
        const service = await createDefaultChecklistService();
        const keys = [`dispatch:${workOrderId}:${checklistId}:${role}`, `dispatch:${workOrderId}:${checklistId}`];
        for (const key of keys) {
          if (await service.findRunByClientKey(actor, key)) return true;
        }

        return false;
      } catch {
        // Falha de leitura NÃO pode virar "pode remover": a trava existe para proteger prova. Sem resposta
        // confiável, o ajuste é recusado (fail-closed) — o oposto do fail-open do provisionamento, porque aqui
        // o erro destrói informação em vez de adiar trabalho.
        return true;
      }
    },
    // §10.2.9 — `isApplicabilityRuleCustomerScoped` fica DESLIGADO nesta fatia, e não por esquecimento: sem
    // rota que crie regra, nenhuma linha pode nascer `resolved`, logo nenhuma linha tem `rule_id` e não há o
    // que perguntar. A trava e o carimbo `ruleCustomerScoped` já existem no serviço e são exercitados na suíte
    // com o porto injetado; o 04c-B liga o porto real junto do CRUD de regras.
    // Rótulo do modelo para a linha da timeline. null quando não resolve — a mensagem omite o nome em vez de
    // inventar um (D-007).
    resolveChecklistLabel: async (actor, checklistId) => {
      try {
        const { createDefaultChecklistService } = await import("../checklists/checklist.service.js");
        const service = await createDefaultChecklistService();

        return (await service.getTemplate(actor, checklistId)).name;
      } catch {
        return null;
      }
    },
    // Ω3F-8b — bases = POIs de categoria "base" (Ω2-d; zero migration). Reusa PoiService (mesmo singleton
    // que a rota /pois). Falha → lista vazia (o mapa degrada sem quebrar).
    listMapBases: async (actor) => {
      try {
        const service = await createDefaultPoiService();
        const { items } = await service.list(actor, { limit: 100, is_active: true });
        return items
          .filter((poi) => poi.isActive && (poi.category ?? "").trim().toLowerCase() === "base")
          .map((poi) => ({ id: poi.id, name: poi.name, latitude: poi.latitude, longitude: poi.longitude }));
      } catch {
        return [];
      }
    },
  };
}

/**
 * Runs a resolver only when the OS actually carries the FK, so a work order with
 * no link short-circuits to null without a lookup.
 */
async function resolveSummary<T>(
  resolver: ((actor: WorkOrderActorContext, id: string) => Promise<T | null>) | undefined,
  actor: WorkOrderActorContext,
  id: string | undefined,
): Promise<T | null> {
  if (!id || !resolver) return null;

  return resolver(actor, id);
}

/**
 * Loads an entity via its tenant-scoped default service and projects it to a
 * small summary. A missing/cross-tenant id (get() throws not_found) yields null,
 * so unresolvable links never leak data and never fail the detail request.
 */
async function resolveEntitySummary<Entity, Summary>(
  createService: () => Promise<{ get(actor: WorkOrderActorContext, id: string): Promise<Entity> }>,
  actor: WorkOrderActorContext,
  id: string,
  project: (entity: Entity) => Summary,
): Promise<Summary | null> {
  try {
    const service = await createService();
    const entity = await service.get(actor, id);

    return project(entity);
  } catch {
    return null;
  }
}

type ReferenceLookupService = {
  get(actor: WorkOrderActorContext, id: string): Promise<unknown>;
};

async function referenceExists(
  createService: () => Promise<ReferenceLookupService>,
  actor: WorkOrderActorContext,
  id: string,
): Promise<boolean> {
  try {
    const service = await createService();
    await service.get(actor, id);

    return true;
  } catch {
    return false;
  }
}

export function getMemoryWorkOrderRepositoryForTests(): InMemoryWorkOrderRepository {
  return memoryRepository;
}

export async function createDefaultWorkOrderService(): Promise<WorkOrderService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryWorkOrderService();
  }

  defaultServicePromise ??= createPrismaWorkOrderService();

  return defaultServicePromise;
}

export function resetWorkOrderRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaWorkOrderService(): Promise<WorkOrderService> {
  const { createPrismaWorkOrderRepository } = await import("./work-order-prisma.repository.js");
  const repository = await createPrismaWorkOrderRepository();

  // Ω1b-2 — só o serviço Prisma recebe o geocoder real (gated por GEOCODING_ENABLED, default noop).
  return new WorkOrderService(repository, createDefaultReferenceResolvers(), createDefaultGeocoder());
}

// CHECKLIST P1 PR-04c-A — a chave de identidade da linha, num lugar só: MODELO + ETAPA. `(ordem, modelo)`
// deixou de identificar uma linha quando a junta decidiu que o mesmo formulário pode servir coleta E entrega.
function checklistPhaseKey(line: { readonly checklistId: string; readonly role: WorkOrderChecklistRole }): string {
  return `${line.checklistId}:${line.role}`;
}

// Duas linhas do MESMO modelo na MESMA etapa tornariam indefinida qual vistoria o técnico recebe — é o que o
// unique parcial do banco impede, recusado aqui na borda com mensagem de negócio em vez de erro de driver.
function assertNoRepeatedChecklistPhase(items: readonly ChecklistSelectionItem[]): void {
  const seen = new Set<string>();
  for (const item of items) {
    const key = checklistPhaseKey(item);
    if (seen.has(key)) throw workOrderChecklistDuplicateError();
    seen.add(key);
  }
}

// §2.8 (allowlist) — a metadata do evento carrega o que a operação precisa para entender a linha do tempo:
// modelo, etapa, proveniência e rótulo. NUNCA tenant_id, nunca o snapshot, e do escopo-cliente vai só o FATO
// (`ruleCustomerScoped`), jamais o id do cliente.
function checklistEventMetadata(
  link: WorkOrderChecklistLink,
  label: string | null,
  customerScoped: boolean,
): Record<string, unknown> {
  return {
    checklistId: link.checklistId,
    checklistLabel: label,
    role: link.role,
    source: link.source,
    ruleId: link.ruleId ?? null,
    ...(customerScoped ? { ruleCustomerScoped: true } : {}),
  };
}

// Ω3F-2a — destino normalizado do corpo (campos opcionais; espelho da origem).
type ParsedDestination = {
  readonly destinationAddress?: string;
  readonly destinationCity?: string;
  readonly destinationState?: string;
  readonly destinationZipCode?: string;
  readonly destinationLatitude?: number;
  readonly destinationLongitude?: number;
};

// Ω3F-2a (J-Ω3F-2 critico, obs 1/2) — destino REAL = endereço OU coordenada válida (não-sentinela 0/0,
// mesmo predicado do mapa). Cidade/estado/CEP soltos não bastam para um reboque (destino "lixo").
function hasDestination(destination: ParsedDestination): boolean {
  return (
    Boolean(destination.destinationAddress) ||
    hasValidCoordinate(destination.destinationLatitude, destination.destinationLongitude)
  );
}

// Ω3F-2a — verdadeiro quando o corpo do update toca em algum campo de destino (mesmo que para limpá-lo).
function bodyMentionsDestination(body: RawRecord): boolean {
  return (
    "destinationAddress" in body ||
    "destinationCity" in body ||
    "destinationState" in body ||
    "destinationZipCode" in body ||
    "destinationLatitude" in body ||
    "destinationLongitude" in body
  );
}

// Ω3F-2a (J-Ω3F-2 critico, furo #2) — destino efetivo do update: campo TOCADO pelo corpo vale o corpo;
// não-tocado mantém o persistido. Evita que limpar um campo (ex.: endereço) apague o destino por
// coordenada intacto e dispare 422 indevido.
function mergeDestination(current: WorkOrder, body: RawRecord, parsed: ParsedDestination): ParsedDestination {
  return {
    destinationAddress: "destinationAddress" in body ? parsed.destinationAddress : current.destinationAddress,
    destinationCity: "destinationCity" in body ? parsed.destinationCity : current.destinationCity,
    destinationState: "destinationState" in body ? parsed.destinationState : current.destinationState,
    destinationZipCode: "destinationZipCode" in body ? parsed.destinationZipCode : current.destinationZipCode,
    destinationLatitude: "destinationLatitude" in body ? parsed.destinationLatitude : current.destinationLatitude,
    destinationLongitude: "destinationLongitude" in body ? parsed.destinationLongitude : current.destinationLongitude,
  };
}

// Ω1b-2 — coordenada válida = número finito, dentro da faixa e não-sentinela 0/0 (mesmo predicado do mapa).
function hasValidCoordinate(latitude: number | undefined, longitude: number | undefined): boolean {
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}

// Ω3F-6 — transição inválida no `cancel`: 422 (D-Ω3F-6-CANCEL), preservando código e reason do módulo.
function cancelTransitionError(from: WorkOrderStatus): WorkOrderError {
  return new WorkOrderError(
    422,
    "WORK_ORDER_STATUS_INVALID",
    "invalid_status_transition",
    `Cannot transition work order from ${from} to cancelled.`,
  );
}

function defaultStatusMessage(status: WorkOrderStatus): string {
  const labels: Record<WorkOrderStatus, string> = {
    open: "Ordem de servico aberta.",
    assigned: "Ordem de servico atribuida.",
    accepted: "Ordem de servico aceita.",
    on_route: "Operador em deslocamento.",
    on_site: "Operador chegou ao local.",
    in_progress: "Atendimento iniciado.",
    paused: "Atendimento pausado.",
    completed: "Ordem de servico concluida.",
    cancelled: "Ordem de servico cancelada.",
    rejected: "Ordem de servico recusada.",
  };

  return labels[status];
}

function statusEventType(status: WorkOrderStatus) {
  if (status === "cancelled") return "work_order_cancelled" as const;
  if (status === "completed") return "work_order_completed" as const;
  return "work_order_status_changed" as const;
}
