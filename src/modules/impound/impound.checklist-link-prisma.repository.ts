import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type { ImpoundChecklistLinkRepository } from "./impound.checklist-link.repository.js";
import type { ChecklistLinkSource, ChecklistRunSummary, CreateChecklistLinkInput, ImpoundProcessChecklistLink } from "./impound.checklist-link.types.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaImpoundChecklistLinkRepository implements ImpoundChecklistLinkRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async processExists(tenantId: string, processId: string): Promise<boolean> {
    const process = await this.client.impoundProcess.findFirst({ where: { tenant_id: tenantId, id: processId }, select: { id: true } });
    return process !== null;
  }

  async findChecklistRun(tenantId: string, checklistRunId: string): Promise<ChecklistRunSummary | undefined> {
    const run = await this.client.checklistRun.findFirst({ where: { tenant_id: tenantId, id: checklistRunId } });
    return run ? mapRun(run) : undefined;
  }

  // Idempotente via upsert na unique (tenant_id, process_id, checklist_run_id) — repetir o mesmo par nunca
  // duplica nem falha por conflito.
  async createLink(input: CreateChecklistLinkInput): Promise<ImpoundProcessChecklistLink> {
    const created = await this.client.impoundProcessChecklistLink.upsert({
      where: {
        tenant_id_process_id_checklist_run_id: {
          tenant_id: input.tenantId,
          process_id: input.processId,
          checklist_run_id: input.checklistRunId,
        },
      },
      create: {
        tenant_id: input.tenantId,
        process_id: input.processId,
        checklist_run_id: input.checklistRunId,
        link_source: input.linkSource,
        created_by: input.createdBy ?? null,
      },
      update: {},
    });
    return mapLink(created);
  }

  async listChecklistRunsForProcess(tenantId: string, processId: string): Promise<readonly ChecklistRunSummary[]> {
    const links = await this.client.impoundProcessChecklistLink.findMany({
      where: { tenant_id: tenantId, process_id: processId },
      include: { run: true },
      orderBy: { created_at: "desc" },
    });
    return links.map((link) => mapRun(link.run));
  }
}

// Wrapper RLS: cada método abre uma transação com o contexto app.current_tenant_id — mesmo padrão do resto do
// módulo impound e de vehicle-identities.
export class RlsPrismaImpoundChecklistLinkRepository implements ImpoundChecklistLinkRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  processExists(tenantId: string, processId: string): Promise<boolean> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaImpoundChecklistLinkRepository(tx).processExists(tenantId, processId));
  }

  findChecklistRun(tenantId: string, checklistRunId: string): Promise<ChecklistRunSummary | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaImpoundChecklistLinkRepository(tx).findChecklistRun(tenantId, checklistRunId));
  }

  createLink(input: CreateChecklistLinkInput): Promise<ImpoundProcessChecklistLink> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaImpoundChecklistLinkRepository(tx).createLink(input));
  }

  listChecklistRunsForProcess(tenantId: string, processId: string): Promise<readonly ChecklistRunSummary[]> {
    return withTenantRls(this.prismaClient, tenantId, (tx) =>
      new PrismaImpoundChecklistLinkRepository(tx).listChecklistRunsForProcess(tenantId, processId),
    );
  }
}

export async function createPrismaImpoundChecklistLinkRepository(): Promise<RlsPrismaImpoundChecklistLinkRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaImpoundChecklistLinkRepository(prisma);
}

function mapLink(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly process_id: string;
  readonly checklist_run_id: string;
  readonly link_source: string;
  readonly created_by: string | null;
  readonly created_at: Date;
}): ImpoundProcessChecklistLink {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    processId: record.process_id,
    checklistRunId: record.checklist_run_id,
    linkSource: record.link_source as ChecklistLinkSource,
    createdBy: record.created_by ?? undefined,
    createdAt: record.created_at,
  };
}

function mapRun(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly template_id: string;
  readonly template_version: number;
  readonly status: string;
  readonly related_entity_type: string | null;
  readonly related_entity_id: string | null;
  readonly started_at: Date;
  readonly completed_at: Date | null;
}): ChecklistRunSummary {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    templateId: record.template_id,
    templateVersion: record.template_version,
    status: record.status,
    relatedEntityType: record.related_entity_type ?? undefined,
    relatedEntityId: record.related_entity_id ?? undefined,
    startedAt: record.started_at,
    completedAt: record.completed_at ?? undefined,
  };
}
