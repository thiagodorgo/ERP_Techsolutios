import { env } from "../../config/env.js";
import type { ImpoundActorContext } from "./impound.types.js";
import { InMemoryImpoundChecklistLinkRepository, type ImpoundChecklistLinkRepository } from "./impound.checklist-link.repository.js";
import type { ChecklistRunSummary, ImpoundProcessChecklistLink } from "./impound.checklist-link.types.js";
import { ImpoundChecklistLinkError } from "./impound.checklist-link.types.js";
import { parseRequiredUuid } from "./impound.validators.js";

type RawRecord = Record<string, unknown>;

export class ImpoundChecklistLinkService {
  constructor(private readonly repository: ImpoundChecklistLinkRepository) {}

  // Ω-VID PR-04 (§Parte D) — vínculo MANUAL. impound:update REUSADA (gate na rota) — a junta de arquitetura
  // decidiu não criar permissão nova aqui: ação reversível/aditiva (elo de navegação), diferente do merge de
  // identidade (irreversível na prática, vehicle_identity:merge dedicada).
  async linkChecklistRun(actor: ImpoundActorContext, processId: string, body: RawRecord): Promise<ImpoundProcessChecklistLink> {
    const validProcessId = parseRequiredUuid(processId, "processId");
    const checklistRunId = parseRequiredUuid(body.checklistRunId, "checklistRunId");

    const processExists = await this.repository.processExists(actor.tenantId, validProcessId);
    if (!processExists) {
      throw new ImpoundChecklistLinkError(404, "IMPOUND_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }

    // A ChecklistRun referenciada precisa pertencer ao MESMO tenant (404 se não — nunca vaza existência
    // cross-tenant).
    const run = await this.repository.findChecklistRun(actor.tenantId, checklistRunId);
    if (!run) {
      throw new ImpoundChecklistLinkError(404, "IMPOUND_CHECKLIST_RUN_NOT_FOUND", "checklist_run_not_found", "Checklist run was not found for this tenant.");
    }

    return this.repository.createLink({
      tenantId: actor.tenantId,
      processId: validProcessId,
      checklistRunId,
      linkSource: "MANUAL",
      createdBy: actor.userId,
    });
  }

  // Ω-VID PR-04 (§Parte D) — leitura sob guarda DUPLA impound:read + checklist_runs:read (gate na rota, achado
  // da junta: field_technician tem a 1ª sem a 2ª — reusar só impound:read vazaria dado hoje escondido dele).
  async listChecklistRuns(actor: ImpoundActorContext, processId: string): Promise<readonly ChecklistRunSummary[]> {
    const validProcessId = parseRequiredUuid(processId, "processId");
    const processExists = await this.repository.processExists(actor.tenantId, validProcessId);
    if (!processExists) {
      throw new ImpoundChecklistLinkError(404, "IMPOUND_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    return this.repository.listChecklistRunsForProcess(actor.tenantId, validProcessId);
  }
}

const memoryRepository = new InMemoryImpoundChecklistLinkRepository();
let defaultServicePromise: Promise<ImpoundChecklistLinkService> | undefined;

export function createMemoryImpoundChecklistLinkService(): ImpoundChecklistLinkService {
  return new ImpoundChecklistLinkService(memoryRepository);
}

export function getMemoryImpoundChecklistLinkRepositoryForTests(): InMemoryImpoundChecklistLinkRepository {
  return memoryRepository;
}

export async function createDefaultImpoundChecklistLinkService(): Promise<ImpoundChecklistLinkService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryImpoundChecklistLinkService();
  }
  defaultServicePromise ??= createPrismaImpoundChecklistLinkService();
  return defaultServicePromise;
}

export function resetImpoundChecklistLinkRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaImpoundChecklistLinkService(): Promise<ImpoundChecklistLinkService> {
  const { createPrismaImpoundChecklistLinkRepository } = await import("./impound.checklist-link-prisma.repository.js");
  return new ImpoundChecklistLinkService(await createPrismaImpoundChecklistLinkRepository());
}
