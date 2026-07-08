import { env } from "../../config/env.js";
import {
  InMemoryDashboardRepository,
  type DashboardRepository,
} from "./dashboard.repository.js";
import type { DashboardActorContext, DashboardSummary } from "./dashboard.types.js";

export class DashboardService {
  constructor(private readonly repository: DashboardRepository) {}

  /**
   * Builds the operational dashboard summary for the acting tenant. "now" is
   * pinned once here so every window ("today"/"this week"/"overdue") is computed
   * against a single reference time.
   */
  async getSummary(actor: DashboardActorContext): Promise<DashboardSummary> {
    return this.repository.getSummary({ tenantId: actor.tenantId, now: new Date() });
  }
}

const memoryRepository = new InMemoryDashboardRepository();
let defaultServicePromise: Promise<DashboardService> | undefined;

export function createMemoryDashboardService(): DashboardService {
  return new DashboardService(memoryRepository);
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

  return new DashboardService(repository);
}
