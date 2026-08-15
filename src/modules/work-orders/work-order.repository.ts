import { randomUUID } from "node:crypto";

import type {
  AssignWorkOrderInput,
  ChangeWorkOrderStatusInput,
  CreateWorkOrderInput,
  ListWorkOrdersInput,
  ListWorkOrdersResult,
  UpdateWorkOrderGeocodeInput,
  FreezeChecklistSnapshotInput,
  UpdateWorkOrderInput,
  SystemRemovalWorkOrderInput,
  WorkOrder,
  WorkOrderAssignment,
  WorkOrderEvent,
  WorkOrderEventType,
  WorkOrderStatus,
} from "./work-order.types.js";
import { WorkOrderError } from "./work-order.types.js";
import {
  assertChecklistRemovalHasActor,
  liveChecklistLinks,
  pickPrimaryChecklistLink,
  sortChecklistLinks,
  syntheticChecklistSet,
  workOrderChecklistDuplicateError,
  type ApplyWorkOrderChecklistsInput,
  type ApplyWorkOrderChecklistsResult,
  type FreezeChecklistLinkSnapshotsInput,
  type WorkOrderChecklistLink,
  type WorkOrderChecklistLinkInput,
} from "./work-order-checklists.types.js";

export interface WorkOrderRepository {
  nextCode(tenantId: string): Promise<string>;
  create(input: CreateWorkOrderInput): Promise<WorkOrder>;
  // CHECKLIST P1 PR-04c-A — a junção `work_order_checklists`. Por padrão devolve só as linhas VIVAS
  // (`removed_at IS NULL`), já ordenadas: a primeira é a PRIMÁRIA (a que o espelho legado reproduz).
  listChecklists(
    tenantId: string,
    workOrderId: string,
    options?: { readonly includeRemoved?: boolean },
  ): Promise<readonly WorkOrderChecklistLink[]>;
  // CHECKLIST P1 PR-04c-A — ÚNICA porta de escrita da junção depois do create. Faz, numa transação só:
  // (1) a PROMOÇÃO PREGUIÇOSA da linha legada, (2) as remoções soft, (3) as adições e (4) o recálculo do
  // espelho `work_orders.checklist_id`/`checklist_snapshot`. Ter uma porta só é o que impede o espelho de
  // dessincronizar — um caminho de escrita que esquecesse o recálculo faria o despacho congelar o formulário
  // errado. `undefined` quando a ordem não existe no tenant (o serviço traduz para 404).
  applyChecklists(input: ApplyWorkOrderChecklistsInput): Promise<ApplyWorkOrderChecklistsResult<WorkOrder> | undefined>;
  // CHECKLIST P1 PR-04c (BLOQ 1 da verificação) — congela o formulário POR LINHA nas vistorias que NÃO são a
  // primária (a primária vai por `freezeChecklistSnapshot`, junto com o espelho da ordem). É a escrita que o
  // porto do conjunto (`WorkOrderChecklistSetPort.freeze`) usa no despacho. Linha que não existir mais (retirada
  // entre a leitura e o freeze) é IGNORADA em silêncio de propósito: o despacho decide sobre o conjunto que LEU,
  // e ressuscitar uma linha removida para carimbá-la inventaria estado.
  freezeChecklistLinkSnapshots(input: FreezeChecklistLinkSnapshotsInput): Promise<void>;
  list(input: ListWorkOrdersInput): Promise<ListWorkOrdersResult>;
  findById(tenantId: string, workOrderId: string): Promise<WorkOrder | undefined>;
  // Ω3F-6 (D-Ω3F-6-DUPLICATE) — pre-check da idempotência do duplicate. TENANT-SCOPED: a chave do
  // cliente só colide dentro da própria organização (o unique parcial no banco inclui tenant_id).
  // work_orders não tem delete lógico, então não há recorte por deleted_at (ao contrário dos vizinhos).
  findByClientActionId(tenantId: string, clientActionId: string): Promise<WorkOrder | undefined>;
  update(input: UpdateWorkOrderInput): Promise<WorkOrder | undefined>;
  updateGeocode(input: UpdateWorkOrderGeocodeInput): Promise<WorkOrder | undefined>;
  // Ω3F-8b — geocode do DESTINO (espelho de updateGeocode; colunas destination_* já existem, SEM migration).
  updateDestinationGeocode(input: UpdateWorkOrderGeocodeInput): Promise<WorkOrder | undefined>;
  freezeChecklistSnapshot(input: FreezeChecklistSnapshotInput): Promise<WorkOrder | undefined>;
  changeStatus(input: ChangeWorkOrderStatusInput): Promise<WorkOrder | undefined>;
  assign(input: AssignWorkOrderInput): Promise<{ readonly workOrder: WorkOrder; readonly assignment: WorkOrderAssignment } | undefined>;
  createEvent(input: CreateWorkOrderEventInput): Promise<WorkOrderEvent>;
  listTimeline(tenantId: string, workOrderId: string): Promise<readonly WorkOrderEvent[]>;
  reset?(): void;
}

export type CreateWorkOrderEventInput = {
  readonly tenantId: string;
  readonly workOrderId: string;
  readonly eventType: WorkOrderEventType;
  readonly fromStatus?: WorkOrderStatus;
  readonly toStatus?: WorkOrderStatus;
  readonly actorUserId?: string;
  readonly message: string;
  readonly metadata?: Record<string, unknown>;
};

export class InMemoryWorkOrderRepository implements WorkOrderRepository {
  private readonly workOrders = new Map<string, WorkOrder>();
  private readonly events = new Map<string, WorkOrderEvent>();
  private readonly assignments = new Map<string, WorkOrderAssignment>();
  // CHECKLIST P1 PR-04c-A — a junção em memória. Espelha o unique PARCIAL do Postgres
  // `(tenant_id, work_order_id, checklist_id, role) WHERE removed_at IS NULL`: um par vivo repetido estoura
  // aqui com o MESMO 409 que o banco produz, senão um bug de serviço passaria verde em memória e só apareceria
  // em produção.
  private readonly checklistLinks = new Map<string, WorkOrderChecklistLink>();

  async nextCode(tenantId: string): Promise<string> {
    let sequence = [...this.workOrders.values()].filter((workOrder) => workOrder.tenantId === tenantId).length + 1;
    let code = formatWorkOrderCode(sequence);

    while ([...this.workOrders.values()].some((workOrder) => workOrder.tenantId === tenantId && workOrder.code === code)) {
      sequence += 1;
      code = formatWorkOrderCode(sequence);
    }

    return code;
  }

  async create(input: CreateWorkOrderInput): Promise<WorkOrder> {
    // Ω3F-6 — espelha o unique PARCIAL do Postgres: replay do mesmo client_action_id no tenant → 409.
    // Rede extra ao pre-check do serviço (aqui é o "banco" do modo memory).
    if (input.clientActionId && (await this.findByClientActionId(input.tenantId, input.clientActionId))) {
      throw duplicateWorkOrderError();
    }

    const now = new Date();
    // CHECKLIST P1 PR-04c-A — `checklists` é a JUNÇÃO, não coluna da ordem: sai do spread para não virar campo
    // fantasma no registro em memória (o Prisma o descartaria de qualquer forma).
    const { checklists, ...columns } = input;
    const workOrderId = randomUUID();
    const links = checklists
      ? checklists.map((link) => this.buildLink(input.tenantId, workOrderId, link, link.orderIndex, now))
      : [];
    assertUniqueChecklistPairs(links);
    const workOrder: WorkOrder = {
      ...columns,
      id: workOrderId,
      status: input.status ?? "open",
      // ESPELHO na origem: quando o create traz a junção, `checklist_id`/`checklist_snapshot` são DERIVADOS da
      // linha primária — nunca do corpo. Sem junção (caminho legado/sistema), os campos do input valem como
      // sempre valeram.
      ...(checklists ? mirrorColumnsFromLinks(links) : {}),
      createdAt: now,
      updatedAt: now,
    };

    this.workOrders.set(workOrder.id, workOrder);
    for (const link of links) {
      this.checklistLinks.set(link.id, link);
    }

    return workOrder;
  }

  async listChecklists(
    tenantId: string,
    workOrderId: string,
    options?: { readonly includeRemoved?: boolean },
  ): Promise<readonly WorkOrderChecklistLink[]> {
    const all = [...this.checklistLinks.values()].filter(
      (link) => link.tenantId === tenantId && link.workOrderId === workOrderId,
    );

    return options?.includeRemoved ? sortChecklistLinks(all) : liveChecklistLinks(all);
  }

  // CHECKLIST P1 PR-04c (BLOQ 1 da verificação) — congela o formulário POR LINHA. Alvo = o par `(modelo,
  // etapa)` VIVO; linha inexistente (nunca existiu, ou foi retirada entre a leitura do despacho e este
  // carimbo) é IGNORADA em silêncio, como o contrato da interface declara: o despacho decide sobre o conjunto
  // que LEU, e ressuscitar uma linha removida para carimbá-la inventaria estado que ninguém pediu.
  //
  // Não passa pelo espelho de propósito: a coluna `work_orders.checklist_snapshot` reproduz a PRIMÁRIA, e a
  // primária é congelada por `freezeChecklistSnapshot` (que grava a coluna e a linha na mesma escrita). Se
  // este método também mexesse no espelho, dois caminhos disputariam a mesma coluna no mesmo despacho.
  async freezeChecklistLinkSnapshots(input: FreezeChecklistLinkSnapshotsInput): Promise<void> {
    if (input.entries.length === 0) return;

    const now = new Date();
    const live = await this.listChecklists(input.tenantId, input.workOrderId);

    for (const entry of input.entries) {
      const match = live.find((link) => link.checklistId === entry.checklistId && link.role === entry.role);
      if (!match) continue;

      this.checklistLinks.set(match.id, { ...match, checklistSnapshot: entry.snapshot, updatedAt: now });
    }
  }

  async applyChecklists(
    input: ApplyWorkOrderChecklistsInput,
  ): Promise<ApplyWorkOrderChecklistsResult<WorkOrder> | undefined> {
    const current = await this.findById(input.tenantId, input.workOrderId);
    if (!current) return undefined;

    const now = new Date();
    let live = [...(await this.listChecklists(input.tenantId, input.workOrderId))];

    // ALTA 6 — PROMOÇÃO PREGUIÇOSA. A PRIMEIRA escrita de junção numa ordem que tem `checklist_id` e junção
    // vazia materializa a linha legada ANTES, na mesma transação (`manual`, `rule_id=NULL`, `role='generic'`,
    // `order_index=0`, snapshot copiado). Isto NÃO é o backfill que o dono proibiu — aquele é uma MIGRAÇÃO
    // varrendo a tabela inteira; esta é promoção POR-ORDEM, DISPARADA POR ESCRITA, e só acontece na ordem que
    // alguém tocou. Sem ela: ordem antiga com T, o operador acrescenta U no envio, a junção vira [U], o espelho
    // re-aponta e T DESAPARECE — inclusive com vistoria já respondida pendurada numa ordem que não a referencia
    // mais.
    let promoted: WorkOrderChecklistLink | undefined;
    if (live.length === 0 && current.checklistId) {
      const [legacy] = syntheticChecklistSet(current);
      if (legacy) {
        promoted = this.buildLink(input.tenantId, input.workOrderId, { ...legacy, addedBy: input.actorUserId }, 0, now);
        this.checklistLinks.set(promoted.id, promoted);
        live = [promoted];
      }
    }

    // BLOQ 3 — a base do `order_index` das adições é calculada ANTES das remoções: mesmo que o operador retire
    // a primária na mesma chamada, a linha nova não salta para a frente da fila que o despacho congelou.
    const base = input.appendAfterExisting ? live.reduce((max, link) => Math.max(max, link.orderIndex), -1) + 1 : 0;

    const removalTargets = input.removeAll
      ? live.map((link) => ({ checklistId: link.checklistId, role: link.role, reason: input.removeAllReason }))
      : input.remove ?? [];

    const removed: WorkOrderChecklistLink[] = [];
    if (removalTargets.length > 0) assertChecklistRemovalHasActor(input.actorUserId);
    for (const target of removalTargets) {
      const match = live.find((link) => link.checklistId === target.checklistId && link.role === target.role);
      if (!match) continue;
      const updated: WorkOrderChecklistLink = {
        ...match,
        removedAt: now,
        removedBy: input.actorUserId,
        removedReason: target.reason,
        updatedAt: now,
      };
      this.checklistLinks.set(updated.id, updated);
      live = live.filter((link) => link.id !== match.id);
      removed.push(updated);
    }

    const added: WorkOrderChecklistLink[] = [];
    for (const link of input.add ?? []) {
      if (live.some((existing) => existing.checklistId === link.checklistId && existing.role === link.role)) {
        throw workOrderChecklistDuplicateError();
      }
      const created = this.buildLink(input.tenantId, input.workOrderId, link, base + link.orderIndex, now);
      this.checklistLinks.set(created.id, created);
      live.push(created);
      added.push(created);
    }

    const links = liveChecklistLinks(live);
    const workOrder: WorkOrder = {
      ...current,
      ...mirrorColumnsFromLinks(links),
      updatedBy: input.actorUserId ?? current.updatedBy,
      updatedAt: now,
    };
    this.workOrders.set(workOrder.id, workOrder);

    return { workOrder, links, removed, added, promoted };
  }

  private buildLink(
    tenantId: string,
    workOrderId: string,
    input: WorkOrderChecklistLinkInput,
    orderIndex: number,
    now: Date,
  ): WorkOrderChecklistLink {
    return {
      id: randomUUID(),
      tenantId,
      workOrderId,
      checklistId: input.checklistId,
      role: input.role,
      source: input.source,
      ruleId: input.ruleId,
      orderIndex,
      checklistSnapshot: input.checklistSnapshot ?? null,
      addedBy: input.addedBy,
      createdAt: now,
      updatedAt: now,
    };
  }

  async findByClientActionId(tenantId: string, clientActionId: string): Promise<WorkOrder | undefined> {
    return [...this.workOrders.values()].find(
      (workOrder) => workOrder.tenantId === tenantId && workOrder.clientActionId === clientActionId,
    );
  }

  async list(input: ListWorkOrdersInput): Promise<ListWorkOrdersResult> {
    const filtered = this.sortedWorkOrders()
      .filter((workOrder) => workOrder.tenantId === input.tenantId)
      .filter((workOrder) => !input.status || workOrder.status === input.status)
      .filter((workOrder) => !input.priority || workOrder.priority === input.priority)
      .filter((workOrder) => !input.assignedOperatorId || workOrder.assignedOperatorId === input.assignedOperatorId)
      .filter((workOrder) => !input.assignedUserId || workOrder.assignedUserId === input.assignedUserId)
      .filter((workOrder) => !input.from || workOrder.createdAt >= input.from)
      .filter((workOrder) => !input.to || workOrder.createdAt <= input.to)
      .filter((workOrder) => matchesSearch(workOrder, input.search));

    return {
      items: filtered.slice(input.offset, input.offset + input.limit),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findById(tenantId: string, workOrderId: string): Promise<WorkOrder | undefined> {
    const workOrder = this.workOrders.get(workOrderId);
    return workOrder?.tenantId === tenantId ? workOrder : undefined;
  }

  async update(input: UpdateWorkOrderInput): Promise<WorkOrder | undefined> {
    const current = await this.findById(input.tenantId, input.workOrderId);
    if (!current) return undefined;

    const updated: WorkOrder = {
      ...current,
      ...definedFields(input),
      updatedAt: new Date(),
    };
    this.workOrders.set(updated.id, updated);

    return updated;
  }

  async updateGeocode(input: UpdateWorkOrderGeocodeInput): Promise<WorkOrder | undefined> {
    // R10 — tenant-scoped: OS inexistente ou de outro tenant retorna undefined (serviço mapeia 404).
    const current = await this.findById(input.tenantId, input.workOrderId);
    if (!current) return undefined;

    const updated: WorkOrder = {
      ...current,
      serviceLatitude: input.latitude,
      serviceLongitude: input.longitude,
      serviceGeocodedAt: input.geocodedAt,
      serviceGeocodeSource: input.source,
      updatedBy: input.actorUserId ?? current.updatedBy,
      updatedAt: new Date(),
    };
    this.workOrders.set(updated.id, updated);

    return updated;
  }

  // Ω3F-8b — grava a coordenada geocodificada do DESTINO + metadados. Espelho de updateGeocode;
  // tenant-scoped: OS inexistente/cross-tenant → undefined (serviço mapeia 404).
  async updateDestinationGeocode(input: UpdateWorkOrderGeocodeInput): Promise<WorkOrder | undefined> {
    const current = await this.findById(input.tenantId, input.workOrderId);
    if (!current) return undefined;

    const updated: WorkOrder = {
      ...current,
      destinationLatitude: input.latitude,
      destinationLongitude: input.longitude,
      destinationGeocodedAt: input.geocodedAt,
      destinationGeocodeSource: input.source,
      updatedBy: input.actorUserId ?? current.updatedBy,
      updatedAt: new Date(),
    };
    this.workOrders.set(updated.id, updated);

    return updated;
  }

  // Ω3-c — congela (idempotente/sobrescreve) o snapshot na OS. tenant-scoped (undefined → 404 no serviço).
  async freezeChecklistSnapshot(input: FreezeChecklistSnapshotInput): Promise<WorkOrder | undefined> {
    const current = await this.findById(input.tenantId, input.workOrderId);
    if (!current) return undefined;

    const now = new Date();
    // CHECKLIST P1 PR-04c-A — o freeze grava o snapshot NA LINHA PRIMÁRIA também, na mesma escrita. O espelho
    // é "a coluna da ordem reproduz a primária": se só a coluna fosse congelada, o próximo ajuste do operador
    // recalcularia o espelho a partir de uma linha com snapshot NULL e APAGARIA o formulário congelado — a
    // ordem iria a campo sem o que o despacho prometeu.
    const primary = pickPrimaryChecklistLink(await this.listChecklists(input.tenantId, input.workOrderId));
    if (primary) {
      this.checklistLinks.set(primary.id, { ...primary, checklistSnapshot: input.checklistSnapshot, updatedAt: now });
    }

    const updated: WorkOrder = {
      ...current,
      checklistSnapshot: input.checklistSnapshot,
      updatedBy: input.actorUserId ?? current.updatedBy,
      updatedAt: now,
    };
    this.workOrders.set(updated.id, updated);

    return updated;
  }

  async changeStatus(input: ChangeWorkOrderStatusInput): Promise<WorkOrder | undefined> {
    const current = await this.findById(input.tenantId, input.workOrderId);
    if (!current) return undefined;
    // Paridade InMemory↔Prisma da invariante do cancelamento (o Prisma tem o CHECK; aqui é a assertion
    // equivalente): OS 'cancelled' EXIGE decisão financeira (o único caminho legítimo é cancel(), que sempre
    // a grava; o /status legado passou a recusar cancelled). Um caminho rogue falha idêntico nos dois lados.
    if (input.status === "cancelled" && input.financialCancellationDecision == null) {
      throw new WorkOrderError(422, "WORK_ORDER_UNPROCESSABLE", "cancel_requires_decision", "A cancelled work order requires a financial decision.");
    }
    const now = new Date();
    const updated: WorkOrder = {
      ...current,
      status: input.status,
      cancellationReason: input.status === "cancelled" ? input.cancellationReason : current.cancellationReason,
      // Ω3F-6 — só grava a decisão quando ela VEM (cancel). Paridade exata com o compactRecord do
      // Prisma: o endpoint de status legado (sem decisão) cancela SEM carimbar a coluna, em vez de
      // sobrescrevê-la com undefined.
      ...(input.status === "cancelled" && input.financialCancellationDecision !== undefined
        ? { financialCancellationDecision: input.financialCancellationDecision }
        : {}),
      updatedBy: input.actorUserId ?? current.updatedBy,
      updatedAt: now,
      arrivedAt: input.status === "on_site" ? now : current.arrivedAt,
      startedAt: input.status === "in_progress" && !current.startedAt ? now : current.startedAt,
      completedAt: input.status === "completed" ? now : current.completedAt,
      cancelledAt: input.status === "cancelled" ? now : current.cancelledAt,
    };
    this.workOrders.set(updated.id, updated);

    return updated;
  }

  async assign(input: AssignWorkOrderInput): Promise<{ readonly workOrder: WorkOrder; readonly assignment: WorkOrderAssignment } | undefined> {
    const current = await this.findById(input.tenantId, input.workOrderId);
    if (!current) return undefined;
    const now = new Date();
    const workOrder: WorkOrder = {
      ...current,
      assignedOperatorId: input.operatorId,
      assignedUserId: input.userId,
      // D1 — set the viatura/equipe FKs only when provided; otherwise keep existing.
      ...(input.vehicleId !== undefined ? { vehicleId: input.vehicleId } : {}),
      ...(input.teamId !== undefined ? { teamId: input.teamId } : {}),
      status: "assigned",
      updatedBy: input.assignedBy ?? current.updatedBy,
      updatedAt: now,
    };
    const assignment: WorkOrderAssignment = {
      id: randomUUID(),
      tenantId: input.tenantId,
      workOrderId: input.workOrderId,
      operatorId: input.operatorId,
      userId: input.userId,
      status: "assigned",
      assignedBy: input.assignedBy,
      assignedAt: now,
      metadata: {},
    };
    this.workOrders.set(workOrder.id, workOrder);
    this.assignments.set(assignment.id, assignment);

    return { workOrder, assignment };
  }

  async createEvent(input: CreateWorkOrderEventInput): Promise<WorkOrderEvent> {
    const event: WorkOrderEvent = {
      id: randomUUID(),
      tenantId: input.tenantId,
      workOrderId: input.workOrderId,
      eventType: input.eventType,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      actorUserId: input.actorUserId,
      message: input.message,
      metadata: input.metadata ?? {},
      createdAt: new Date(),
    };
    this.events.set(event.id, event);

    return event;
  }

  async listTimeline(tenantId: string, workOrderId: string): Promise<readonly WorkOrderEvent[]> {
    return [...this.events.values()]
      .filter((event) => event.tenantId === tenantId && event.workOrderId === workOrderId)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  }

  reset(): void {
    this.workOrders.clear();
    this.events.clear();
    this.assignments.clear();
    this.checklistLinks.clear();
  }

  private sortedWorkOrders(): WorkOrder[] {
    return [...this.workOrders.values()].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }
}

export function formatWorkOrderCode(sequence: number): string {
  return `OS-${String(sequence).padStart(6, "0")}`;
}

/**
 * CHECKLIST P1 PR-04c-A — O ESPELHO, num lugar só. `work_orders.checklist_id` e `checklist_snapshot` passam a
 * ser PROJEÇÃO da linha primária: o app de campo, o despacho, o dossiê de custódia e as integrações antigas
 * continuam lendo as duas colunas exatamente como hoje, e elas nunca contradizem a junção.
 * Conjunto vivo vazio ⇒ as duas colunas ficam vazias (é a ordem sem vistoria de hoje, estado legítimo).
 *
 * Compartilhada pelo repositório em memória e pelo Prisma DE PROPÓSITO: derivar o espelho de dois jeitos é
 * como uma ordem congelaria vistorias diferentes conforme o modo de persistência.
 */
export function mirrorColumnsFromLinks(links: readonly WorkOrderChecklistLink[]): {
  readonly checklistId: string | undefined;
  readonly checklistSnapshot: Record<string, unknown> | null;
} {
  const primary = pickPrimaryChecklistLink(links);

  return {
    checklistId: primary?.checklistId,
    checklistSnapshot: primary?.checklistSnapshot ?? null,
  };
}

/**
 * Mesma projeção do espelho, a partir das ENTRADAS (o create ainda não tem linhas gravadas). Empate de
 * `order_index` resolve pela ordem do payload — a fila que o operador declarou.
 */
export function mirrorColumnsFromInputs(inputs: readonly WorkOrderChecklistLinkInput[]): {
  readonly checklistId: string | undefined;
  readonly checklistSnapshot: Record<string, unknown> | null;
} {
  const primary = [...inputs].sort((left, right) => left.orderIndex - right.orderIndex)[0];

  return {
    checklistId: primary?.checklistId,
    checklistSnapshot: primary?.checklistSnapshot ?? null,
  };
}

/**
 * CHECKLIST P1 PR-04c-A — a identidade viva da junção inclui a FASE. Duas linhas do MESMO modelo na MESMA fase
 * tornariam indefinida qual vistoria o técnico recebe; o mesmo modelo em fases DIFERENTES é o caso de uso
 * central (coleta × entrega) e passa. Espelha o unique parcial do banco na borda de escrita em memória.
 */
export function assertUniqueChecklistPairs(links: readonly WorkOrderChecklistLink[]): void {
  const seen = new Set<string>();
  for (const link of links) {
    const key = `${link.checklistId}:${link.role}`;
    if (seen.has(key)) throw workOrderChecklistDuplicateError();
    seen.add(key);
  }
}

// Ω5P PR-18b — título/descrição WHITE-LABEL da OS de remoção originada pela autoridade. Carregam a PLACA (para o
// operador identificar o bem), NUNCA o nome do órgão (a OS é neutra — anti-spoof; espelha a origem neutra do sweep).
export function systemRemovalWorkOrderTitle(plate: string): string {
  return `Remoção de veículo — placa ${plate}`;
}
export function systemRemovalWorkOrderDescription(plate: string): string {
  return `Solicitação de remoção registrada para o veículo de placa ${plate}. A custódia é aberta apenas quando a ordem for concluída pela operação de campo.`;
}

// Ω5P PR-18b — método SYSTEM-only (ator SISTEMA, SEM rota/controller, inalcançável por HTTP) que ORIGINA a OS de
// remoção. Espelha o openFromRemoval do sweep: shape controlado, NÃO passa pelo create REST (nenhuma validação de
// cliente/veículo/tarifa/destino). A OS nasce 'open' (SoD: a custódia só abre na CONCLUSÃO pelo operador de campo,
// NUNCA aqui — I1/I3 intactos), vinculada ao catálogo de remoção, veículo NÃO identificado (só a placa), created_by
// NULL = SISTEMA. ACEITA um `repo` já escopado à TX do chamador (tenant-RLS): a origem da OS fica ATÔMICA com o
// INSERT da AuthorityRemovalRequest (o repo tx-scoped é PrismaWorkOrderRepository(tx) em prod; InMemory em teste).
export async function originateSystemRemovalWorkOrder(
  repo: Pick<WorkOrderRepository, "nextCode" | "create" | "createEvent">,
  input: SystemRemovalWorkOrderInput,
): Promise<WorkOrder> {
  const code = await repo.nextCode(input.tenantId);
  const workOrder = await repo.create({
    tenantId: input.tenantId,
    code,
    title: systemRemovalWorkOrderTitle(input.plate),
    description: systemRemovalWorkOrderDescription(input.plate),
    priority: "medium",
    serviceCatalogId: input.serviceCatalogId,
    // Ator SISTEMA: created_by/updated_by ausentes (NULL). Veículo NÃO identificado: sem vehicleId/customer.
    status: "open",
  });
  await repo.createEvent({
    tenantId: input.tenantId,
    workOrderId: workOrder.id,
    eventType: "work_order_created",
    toStatus: workOrder.status,
    message: "Ordem de servico criada.",
    metadata: { code: workOrder.code, priority: workOrder.priority, origin: "authority_removal" },
  });
  return workOrder;
}

// Ω3F-6 (D-Ω3F-6-DUPLICATE) — replay do duplicate (mesmo client_action_id no tenant) → 409. Emitido
// pelo pre-check do serviço E pela violação do unique parcial (P2002) traduzida no Prisma.
export function duplicateWorkOrderError(): WorkOrderError {
  return new WorkOrderError(
    409,
    "WORK_ORDER_CONFLICT",
    "duplicate_work_order",
    "A work order with this client_action_id already exists for this organization.",
  );
}

function matchesSearch(workOrder: WorkOrder, search: string | undefined): boolean {
  if (!search) return true;
  const normalized = search.toLowerCase();

  return [
    workOrder.code,
    workOrder.title,
    workOrder.description,
    workOrder.customerName,
    workOrder.customerDocument,
    workOrder.customerPhone,
    workOrder.serviceAddress,
    workOrder.serviceCity,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized));
}

function definedFields<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
