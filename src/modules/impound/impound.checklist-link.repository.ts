import { randomUUID } from "node:crypto";

import type { ChecklistRunSummary, CreateChecklistLinkInput, ImpoundProcessChecklistLink } from "./impound.checklist-link.types.js";

export interface ImpoundChecklistLinkRepository {
  processExists(tenantId: string, processId: string): Promise<boolean>;
  findChecklistRun(tenantId: string, checklistRunId: string): Promise<ChecklistRunSummary | undefined>;
  // Idempotente: repetir o MESMO par (tenant, process, run) retorna o vínculo já existente em vez de duplicar
  // (a unique constraint (tenant_id, process_id, checklist_run_id) faz o mesmo papel no Postgres).
  createLink(input: CreateChecklistLinkInput): Promise<ImpoundProcessChecklistLink>;
  listChecklistRunsForProcess(tenantId: string, processId: string): Promise<readonly ChecklistRunSummary[]>;

  reset?(): void;
}

export class InMemoryImpoundChecklistLinkRepository implements ImpoundChecklistLinkRepository {
  private readonly processes = new Set<string>(); // `${tenantId}:${processId}`
  private readonly runs = new Map<string, ChecklistRunSummary>(); // key = `${tenantId}:${runId}`
  private readonly links: ImpoundProcessChecklistLink[] = [];

  async processExists(tenantId: string, processId: string): Promise<boolean> {
    return this.processes.has(`${tenantId}:${processId}`);
  }

  async findChecklistRun(tenantId: string, checklistRunId: string): Promise<ChecklistRunSummary | undefined> {
    return this.runs.get(`${tenantId}:${checklistRunId}`);
  }

  async createLink(input: CreateChecklistLinkInput): Promise<ImpoundProcessChecklistLink> {
    const existing = this.links.find(
      (link) => link.tenantId === input.tenantId && link.processId === input.processId && link.checklistRunId === input.checklistRunId,
    );
    if (existing) return existing;

    const link: ImpoundProcessChecklistLink = {
      id: randomUUID(),
      tenantId: input.tenantId,
      processId: input.processId,
      checklistRunId: input.checklistRunId,
      linkSource: input.linkSource,
      createdBy: input.createdBy,
      createdAt: new Date(),
    };
    this.links.push(link);
    return link;
  }

  async listChecklistRunsForProcess(tenantId: string, processId: string): Promise<readonly ChecklistRunSummary[]> {
    return this.links
      .filter((link) => link.tenantId === tenantId && link.processId === processId)
      .map((link) => this.runs.get(`${tenantId}:${link.checklistRunId}`))
      .filter((run): run is ChecklistRunSummary => run !== undefined)
      .sort((left, right) => right.startedAt.getTime() - left.startedAt.getTime());
  }

  // Helpers SÓ de teste — este módulo não depende do repositório real de impound/checklists.
  registerProcessForTests(tenantId: string, processId: string): void {
    this.processes.add(`${tenantId}:${processId}`);
  }

  registerChecklistRunForTests(run: ChecklistRunSummary): void {
    this.runs.set(`${run.tenantId}:${run.id}`, run);
  }

  reset(): void {
    this.processes.clear();
    this.runs.clear();
    this.links.length = 0;
  }
}
