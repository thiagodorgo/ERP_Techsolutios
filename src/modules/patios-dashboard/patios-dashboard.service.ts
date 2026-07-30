import { env } from "../../config/env.js";
import { getMemoryImpoundRepositoryForTests } from "../impound/impound.service.js";
import { getMemoryNotificationRepositoryForTests } from "../impound/impound.notifications.service.js";
import { getMemoryYardRepositoryForTests } from "../yard/yard.service.js";
import { getMemoryReleaseRepositoryForTests } from "../release/release.service.js";
import { getMemoryAuctionSettlementRepositoryForTests } from "../auction/auction.settlement.service.js";
import { InMemoryPatiosDashboardRepository, type PatiosDashboardRepository } from "./patios-dashboard.repository.js";
import type { PatiosDashboardActorContext, PatiosDashboardSummary } from "./patios-dashboard.types.js";

export class PatiosDashboardService {
  constructor(private readonly repository: PatiosDashboardRepository) {}

  /** "now" fixado UMA VEZ aqui para que overdue/mês-corrente/deadlineAlerts sejam consistentes num único snapshot. */
  async getSummary(actor: PatiosDashboardActorContext): Promise<PatiosDashboardSummary> {
    return this.repository.getSummary({ tenantId: actor.tenantId, now: new Date() });
  }
}

let memoryRepository: InMemoryPatiosDashboardRepository | undefined;
let defaultServicePromise: Promise<PatiosDashboardService> | undefined;

function getMemoryRepository(): InMemoryPatiosDashboardRepository {
  memoryRepository ??= new InMemoryPatiosDashboardRepository(
    getMemoryImpoundRepositoryForTests(),
    getMemoryYardRepositoryForTests(),
    getMemoryNotificationRepositoryForTests(),
    getMemoryReleaseRepositoryForTests(),
    getMemoryAuctionSettlementRepositoryForTests(),
  );
  return memoryRepository;
}

export function createMemoryPatiosDashboardService(): PatiosDashboardService {
  return new PatiosDashboardService(getMemoryRepository());
}

export function getMemoryPatiosDashboardRepositoryForTests(): InMemoryPatiosDashboardRepository {
  return getMemoryRepository();
}

export async function createDefaultPatiosDashboardService(): Promise<PatiosDashboardService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryPatiosDashboardService();
  }
  defaultServicePromise ??= createPrismaPatiosDashboardService();
  return defaultServicePromise;
}

export function resetPatiosDashboardRuntimeForTests(): void {
  defaultServicePromise = undefined;
}

async function createPrismaPatiosDashboardService(): Promise<PatiosDashboardService> {
  const { createPrismaPatiosDashboardRepository } = await import("./patios-dashboard-prisma.repository.js");
  const repository = await createPrismaPatiosDashboardRepository();
  return new PatiosDashboardService(repository);
}
