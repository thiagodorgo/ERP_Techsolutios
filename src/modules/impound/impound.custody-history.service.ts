import { env } from "../../config/env.js";
import { InMemoryImpoundCustodyHistoryRepository, type ImpoundCustodyHistoryRepository } from "./impound.custody-history.repository.js";
import type { CustodyHistoryItem } from "./impound.custody-history.types.js";
import { ImpoundCustodyHistoryError } from "./impound.custody-history.types.js";
import type { ImpoundActorContext } from "./impound.types.js";
import { parseRequiredUuid } from "./impound.validators.js";

export class ImpoundCustodyHistoryService {
  constructor(private readonly repository: ImpoundCustodyHistoryRepository) {}

  // Ω-VID PR-09 — leitura sob `impound:read` (gate na rota, mesma do dossiê). O agrupamento por identidade é resolvido
  // no repositório numa ÚNICA consulta. 404 quando a lista volta VAZIA: um processo existente no tenant SEMPRE inclui
  // a si mesmo (isCurrent), então vazio ⟺ processo inexistente/cross-tenant (nunca vaza existência).
  async listCustodyHistory(actor: ImpoundActorContext, processId: string): Promise<readonly CustodyHistoryItem[]> {
    const validProcessId = parseRequiredUuid(processId, "processId");
    const history = await this.repository.listCustodyHistory(actor.tenantId, validProcessId);
    if (history.length === 0) {
      throw new ImpoundCustodyHistoryError(404, "IMPOUND_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    return history;
  }
}

const memoryRepository = new InMemoryImpoundCustodyHistoryRepository();
let defaultServicePromise: Promise<ImpoundCustodyHistoryService> | undefined;

export function createMemoryImpoundCustodyHistoryService(): ImpoundCustodyHistoryService {
  return new ImpoundCustodyHistoryService(memoryRepository);
}

export function getMemoryImpoundCustodyHistoryRepositoryForTests(): InMemoryImpoundCustodyHistoryRepository {
  return memoryRepository;
}

export async function createDefaultImpoundCustodyHistoryService(): Promise<ImpoundCustodyHistoryService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryImpoundCustodyHistoryService();
  }
  defaultServicePromise ??= createPrismaImpoundCustodyHistoryService();
  return defaultServicePromise;
}

export function resetImpoundCustodyHistoryRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaImpoundCustodyHistoryService(): Promise<ImpoundCustodyHistoryService> {
  const { createPrismaImpoundCustodyHistoryRepository } = await import("./impound.custody-history-prisma.repository.js");
  return new ImpoundCustodyHistoryService(await createPrismaImpoundCustodyHistoryRepository());
}
