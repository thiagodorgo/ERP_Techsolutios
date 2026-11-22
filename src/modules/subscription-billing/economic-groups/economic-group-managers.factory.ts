import { env } from "../../../config/env.js";
import { InMemoryEconomicGroupManagersRepository, type EconomicGroupManagersRepository } from "./economic-group-managers.repository.js";
import { EconomicGroupManagersService } from "./economic-group-managers.service.js";

let memory = new InMemoryEconomicGroupManagersRepository();
let override: EconomicGroupManagersRepository | undefined;

export function getMemoryEconomicGroupManagersForTests(): InMemoryEconomicGroupManagersRepository { return memory; }
export function setEconomicGroupManagersRepositoryForTests(repository: EconomicGroupManagersRepository | undefined): void { override = repository; }
export function resetEconomicGroupManagersForTests(): void { memory = new InMemoryEconomicGroupManagersRepository(); override = undefined; }

export async function createDefaultEconomicGroupManagersService(): Promise<EconomicGroupManagersService> {
  if (override) return new EconomicGroupManagersService(override);
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") return new EconomicGroupManagersService(memory);
  const [{ prisma }, module] = await Promise.all([import("../../../database/prisma.js"), import("./economic-group-managers.prisma.js")]);
  return new EconomicGroupManagersService(new module.PrismaEconomicGroupManagersRepository(prisma));
}
