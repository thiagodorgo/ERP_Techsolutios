// B-ASS-04 — fábrica do serviço do demonstrativo. Memória: dublê + as portas em memória do B-ASS-02 (medições e
// vínculos vazios, declarado). Prisma: repositório Prisma sob `withTenantRls` (F5).

import { env } from "../../../config/env.js";
import {
  getMemoryPlansRepositoryForTests,
  getMemorySubscriptionsRepositoryForTests,
  getMemoryTenantLookupForTests,
} from "../subscription-billing.service.js";
import {
  EMPTY_BINDINGS_SOURCE,
  EMPTY_USAGE_SOURCE,
  RepositoryStatementInputsProvider,
} from "./statement.inputs-provider.js";
import { InMemoryStatementRepository, type StatementRepository } from "./statement.repository.js";
import { StatementService, type StatementAuditSink } from "./statement.service.js";
import type { StatementAuditEvent } from "./statement.types.js";

export class RecordingStatementAuditSink implements StatementAuditSink {
  readonly events: StatementAuditEvent[] = [];
  async record(event: StatementAuditEvent): Promise<void> {
    this.events.push(event);
  }
}

let memoryRepository = new InMemoryStatementRepository();
let memoryAudit = new RecordingStatementAuditSink();
let prismaRuntime: Promise<{ service: StatementService; repository: StatementRepository }> | undefined;

export function getMemoryStatementRepositoryForTests(): InMemoryStatementRepository {
  return memoryRepository;
}

export function getMemoryStatementAuditForTests(): RecordingStatementAuditSink {
  return memoryAudit;
}

export function resetStatementRuntimeForTests(): void {
  memoryRepository = new InMemoryStatementRepository();
  memoryAudit = new RecordingStatementAuditSink();
  prismaRuntime = undefined;
}

function memoryService(): StatementService {
  return new StatementService(
    memoryRepository,
    new RepositoryStatementInputsProvider(
      getMemorySubscriptionsRepositoryForTests(),
      getMemoryPlansRepositoryForTests(),
      getMemoryTenantLookupForTests(),
      EMPTY_USAGE_SOURCE,
      EMPTY_BINDINGS_SOURCE,
    ),
    memoryAudit,
  );
}

export async function createDefaultStatementRuntime(): Promise<{ service: StatementService; repository: StatementRepository }> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return { service: memoryService(), repository: memoryRepository };
  }
  prismaRuntime ??= import("./statement.prisma-runtime.js").then((module) => module.createPrismaStatementRuntime());
  return prismaRuntime;
}
