import { env } from "../../config/env.js";
import { actorReadsAssignedOnly, type WorkOrderAssignedToActorScope } from "../work-orders/work-order.types.js";
import {
  InMemoryDashboardRepository,
  type DashboardRepository,
} from "./dashboard.repository.js";
import type { DashboardActorContext, DashboardSummary } from "./dashboard.types.js";
import { DashboardError } from "./dashboard.types.js";

/** B-WO-LEITURA — o escopo de leitura do ator (o mesmo da lista de OS), injetado por import preguiçoso. */
export type DashboardReadScopeResolver = (actor: DashboardActorContext) => Promise<WorkOrderAssignedToActorScope | undefined>;

export class DashboardService {
  constructor(
    private readonly repository: DashboardRepository,
    private readonly readScopeFor?: DashboardReadScopeResolver,
  ) {}

  /**
   * Builds the operational dashboard summary for the acting tenant. "now" is
   * pinned once here so every window ("today"/"this week"/"overdue") is computed
   * against a single reference time.
   */
  async getSummary(actor: DashboardActorContext): Promise<DashboardSummary> {
    const assignedToActor = await this.resolveReadScope(actor); // B-WO-LEITURA:painel
    return this.repository.getSummary({ tenantId: actor.tenantId, now: new Date(), ...(assignedToActor ? { assignedToActor } : {}) });
  }

  /** B-WO-LEITURA — só o papel de campo é escopado (RBAC_MATRIX l.34, "scoped"); sem a dependência, 503 fail-closed. */
  private async resolveReadScope(actor: DashboardActorContext): Promise<WorkOrderAssignedToActorScope | undefined> {
    if (!actorReadsAssignedOnly(actor)) return undefined;
    if (!this.readScopeFor) throw new DashboardError(503, "DASHBOARD_SCOPE_UNAVAILABLE", "scope_resolver_unavailable", "Não foi possível montar o seu painel agora. Tente de novo.");
    return this.readScopeFor(actor);
  }
}

// B-WO-LEITURA — o escopo de leitura pelo serviço de OS da composição (import preguiçoso: o painel não importa o
// serviço de OS estaticamente).
const defaultReadScopeFor: DashboardReadScopeResolver = async (actor) =>
  (await (await import("../work-orders/work-order.service.js")).createDefaultWorkOrderService()).readScopeFor(actor);

const memoryRepository = new InMemoryDashboardRepository();
let defaultServicePromise: Promise<DashboardService> | undefined;

export function createMemoryDashboardService(): DashboardService {
  return new DashboardService(memoryRepository, defaultReadScopeFor);
}

export function getMemoryDashboardRepositoryForTests(): InMemoryDashboardRepository {
  return memoryRepository;
}

export async function createDefaultDashboardService(): Promise<DashboardService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryDashboardService();
  }

  defaultServicePromise ??= createPrismaDashboardService();

  return defaultServicePromise;
}

/**
 * The in-memory repository is stateless — it reads the cadastro/work-order
 * singletons, which the caller resets directly. Only the cached prisma service
 * promise needs clearing here.
 */
export function resetDashboardRuntimeForTests(): void {
  defaultServicePromise = undefined;
}

async function createPrismaDashboardService(): Promise<DashboardService> {
  const { createPrismaDashboardRepository } = await import("./dashboard-prisma.repository.js");
  const repository = await createPrismaDashboardRepository();

  return new DashboardService(repository, defaultReadScopeFor);
}
