import { env } from "../../config/env.js";
import {
  createDefaultWorkOrderService,
  createMemoryWorkOrderService,
  type WorkOrderService,
} from "../work-orders/work-order.service.js";
import {
  InMemoryWorkOrderAuditLogRepository,
  type WorkOrderAuditLogRepository,
} from "./work-order-audit-log.repository.js";
import type { WorkOrderAuditLogActorContext, WorkOrderAuditLogEntry } from "./work-order-audit-log.types.js";
import { WORK_ORDER_AUDIT_ENTITY, WORK_ORDER_AUDIT_LOG_DEFAULT_LIMIT } from "./work-order-audit-log.types.js";

// Ω3F-8a — leitura da auditoria filtrada por OS. O serviço (a) VALIDA a OS via WorkOrderService.get →
// 404 cross-tenant (não vaza existência de OS de outra organização); (b) lê os AuditLog da entidade
// "work_order" com esse id. Reusa o WorkOrderService (padrão dos vizinhos: comentários/financeiro);
// o módulo é montado no app.ts e NÃO é importado por work-orders → sem ciclo audit↔work-orders.

export class WorkOrderAuditLogService {
  constructor(
    private readonly repository: WorkOrderAuditLogRepository,
    private readonly workOrderService: WorkOrderService,
  ) {}

  async listWorkOrderAuditLogs(
    actor: WorkOrderAuditLogActorContext,
    workOrderId: string,
    limit?: number,
  ): Promise<readonly WorkOrderAuditLogEntry[]> {
    // Valida a OS in-tenant (404 cross-tenant / inexistente). WorkOrderError(404) sobe direto — o
    // handler HTTP já o traduz para 404 (não inventamos erro novo).
    const workOrder = await this.workOrderService.get(actor, workOrderId);
    return this.repository.listByEntity(
      actor.tenantId,
      WORK_ORDER_AUDIT_ENTITY,
      workOrder.id,
      clampLimit(limit),
    );
  }
}

function clampLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit) || limit <= 0) {
    return WORK_ORDER_AUDIT_LOG_DEFAULT_LIMIT;
  }
  return Math.min(Math.floor(limit), WORK_ORDER_AUDIT_LOG_DEFAULT_LIMIT);
}

const memoryRepository = new InMemoryWorkOrderAuditLogRepository();
let defaultServicePromise: Promise<WorkOrderAuditLogService> | undefined;

export function createMemoryWorkOrderAuditLogService(): WorkOrderAuditLogService {
  return new WorkOrderAuditLogService(memoryRepository, createMemoryWorkOrderService());
}

/** Repositório em memória (singleton) — os testes semeiam AuditLog diretamente por aqui. */
export function getMemoryWorkOrderAuditLogRepositoryForTests(): InMemoryWorkOrderAuditLogRepository {
  return memoryRepository;
}

export function resetWorkOrderAuditLogRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

export async function createDefaultWorkOrderAuditLogService(): Promise<WorkOrderAuditLogService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryWorkOrderAuditLogService();
  }
  defaultServicePromise ??= createPrismaWorkOrderAuditLogService();
  return defaultServicePromise;
}

async function createPrismaWorkOrderAuditLogService(): Promise<WorkOrderAuditLogService> {
  const { createPrismaWorkOrderAuditLogRepository } = await import("./work-order-audit-log-prisma.repository.js");
  const repository = createPrismaWorkOrderAuditLogRepository();
  const workOrderService = await createDefaultWorkOrderService();
  return new WorkOrderAuditLogService(repository, workOrderService);
}
