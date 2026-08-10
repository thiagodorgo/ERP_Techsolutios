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

/**
 * Junta PR-03, 2ª rodada (BAIXA do critico-adversarial) — de sucessor IMEDIATO até a versão VIGENTE.
 *
 * O mapa recebido é "quem substituiu quem" (origem → sucessor imediato). Percorrer é seguro porque o
 * `@@unique([tenant_id, reopened_from_run_id])` garante NO MÁXIMO um sucessor por versão: a cadeia de
 * reaberturas é uma lista, nunca uma árvore com dois fins.
 *
 * O conjunto de visitados NÃO é zelo decorativo: o banco barra a auto-referência A→A (CHECK da migração
 * 20260860000000), mas NÃO barra A→B→A. Se um dado assim existir, sem esta guarda o dossiê entraria em
 * laço infinito e a aba nunca carregaria. Ao reencontrar um id já visto, paramos no último id REAL da
 * cadeia — D-007: dado corrompido não vira dado inventado, vira o que ainda dá para afirmar.
 *
 * `undefined` quando ninguém substituiu esta versão: ela própria é a vigente.
 */
export function resolveCurrentRunId(supersededBy: ReadonlyMap<string, string>, runId: string): string | undefined {
  const visited = new Set<string>([runId]);
  let current = runId;

  for (;;) {
    const next = supersededBy.get(current);
    if (next === undefined || visited.has(next)) break;
    visited.add(next);
    current = next;
  }

  return current === runId ? undefined : current;
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
    const linkedRuns = this.links
      .filter((link) => link.tenantId === tenantId && link.processId === processId)
      .map((link) => this.runs.get(`${tenantId}:${link.checklistRunId}`))
      .filter((run): run is ChecklistRunSummary => run !== undefined);

    // Mesmo retorno cedo do repositório Prisma (lá ele poupa um round-trip; aqui é só paridade de caminho,
    // para que os dois repositórios exercitem exatamente a mesma sequência de decisões).
    if (linkedRuns.length === 0) return [];

    const supersededBy = this.buildSupersessionMap(tenantId);

    return linkedRuns
      // Paridade com o repositório Prisma (junta PR-03): quem substituiu a original — e qual versão vale
      // HOJE — é resolvido aqui também; o dossiê nunca apresenta a substituída como se fosse a vigente.
      .map((run) => ({
        ...run,
        supersededByRunId: supersededBy.get(run.id),
        currentRunId: resolveCurrentRunId(supersededBy, run.id),
      }))
      .sort((left, right) => right.startedAt.getTime() - left.startedAt.getTime());
  }

  // "Quem substituiu quem" para o tenant inteiro. Em memória cabe varrer tudo de uma vez; o repositório
  // Prisma faz o mesmo mapa por níveis, para não carregar as vistorias da organização inteira.
  private buildSupersessionMap(tenantId: string): Map<string, string> {
    const supersededBy = new Map<string, string>();

    for (const run of this.runs.values()) {
      if (run.tenantId !== tenantId || run.reopenedFromRunId === undefined) continue;
      // O primeiro sucessor registrado vence. No Postgres o unique (tenant_id, reopened_from_run_id) torna
      // o empate impossível; aqui nada impede um teste de registrar dois — e um resultado determinístico é
      // melhor do que depender da ordem de varredura.
      if (!supersededBy.has(run.reopenedFromRunId)) supersededBy.set(run.reopenedFromRunId, run.id);
    }

    return supersededBy;
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
