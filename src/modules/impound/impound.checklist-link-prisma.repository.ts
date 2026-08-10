import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import { resolveCurrentRunId, type ImpoundChecklistLinkRepository } from "./impound.checklist-link.repository.js";
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
      // Ω-VID PR-08 — inclui o NOME do template (rótulo do formulário) para a aba do dossiê. select estreito no
      // template (só `name`) — §allowlist: nenhum outro campo do template vaza.
      include: { run: { include: { template: { select: { name: true } } } } },
      orderBy: { created_at: "desc" },
    });

    // Junta PR-03, 2ª rodada (A1 do agente-dba-guardiao): a versão anterior disparava a consulta de
    // substituições com `in: []` — o Prisma traduz para `1=0`, que não quebra, só queima um round-trip em
    // todo dossiê sem checklist, que é a maioria deles. Quem garante o zero hoje é a fronteira vazia do
    // percurso abaixo; este retorno diz o mesmo mais cedo e mais perto de quem lê — um processo sem vínculo
    // termina no primeiro SELECT, sem montar mapa nenhum.
    if (links.length === 0) return [];

    const supersededBy = await this.loadSupersessionChain(
      tenantId,
      links.map((link) => link.run.id),
    );

    return links.map((link) =>
      mapRun(link.run, link.run.template?.name, supersededBy.get(link.run.id), resolveCurrentRunId(supersededBy, link.run.id)),
    );
  }

  /**
   * CHECKLIST P1 PR-03 (junta, MÉDIA): o vínculo aponta para a vistoria ORIGINAL — reabrir cria outra run,
   * e sem estas leituras o dossiê apresentaria a versão SUBSTITUÍDA como se fosse a vigente.
   *
   * Junta PR-03, 2ª rodada (BAIXA do critico-adversarial): a versão anterior resolvia UM salto e parava. A
   * segunda correção da mesma vistoria (v1→v2→v3) já a derrubava — o dossiê apontava a v2, que também já
   * tinha sido substituída. Percorremos a cadeia inteira.
   *
   * O custo real é por PROFUNDIDADE, não por linha: cada volta avança TODAS as vistorias do processo um
   * salto de uma vez. Dossiê sem reabertura nenhuma = 1 consulta (o mesmo de antes); v1→v2→v3 = 3. Como
   * reabrir é excepcional (exige `checklist_runs:reopen` e motivo escrito), a cadeia é rasa na prática — foi
   * o que dispensou o CTE recursivo em SQL cru, que custaria perder a tipagem do Prisma e escrever o filtro
   * de organização à mão dentro da transação RLS.
   *
   * O laço termina sempre, inclusive num ciclo A→B→A — que o banco NÃO barra (o CHECK só proíbe A→A). São
   * duas guardas com papéis diferentes, medidos por mutação:
   *   · `supersededBy.has(origin)` — o primeiro sucessor de uma origem vence e nunca é reescrito. É esta que
   *     FECHA o laço: reencontrando um trecho já mapeado, a volta seguinte não produz fronteira nova;
   *   · `visited` — impede que um id volte à fronteira. Sem ela o laço ainda termina, só que gastando uma
   *     consulta a mais (no ciclo A→B→A: 3 em vez de 2).
   */
  private async loadSupersessionChain(tenantId: string, rootRunIds: readonly string[]): Promise<Map<string, string>> {
    const supersededBy = new Map<string, string>();
    const visited = new Set<string>(rootRunIds);
    let frontier = [...visited];

    while (frontier.length > 0) {
      // Leitura estreita: só o par de ids, nunca o conteúdo da vistoria (§allowlist).
      const successors = await this.client.checklistRun.findMany({
        where: { tenant_id: tenantId, reopened_from_run_id: { in: frontier } },
        select: { id: true, reopened_from_run_id: true },
      });

      const nextFrontier: string[] = [];
      for (const successor of successors) {
        const origin = successor.reopened_from_run_id;
        if (origin === null || supersededBy.has(origin)) continue;
        supersededBy.set(origin, successor.id);
        if (visited.has(successor.id)) continue;
        visited.add(successor.id);
        nextFrontier.push(successor.id);
      }
      frontier = nextFrontier;
    }

    return supersededBy;
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

function mapRun(
  record: {
    readonly id: string;
    readonly tenant_id: string;
    readonly template_id: string;
    readonly template_version: number;
    readonly status: string;
    readonly related_entity_type: string | null;
    readonly related_entity_id: string | null;
    readonly started_at: Date;
    readonly completed_at: Date | null;
    readonly reopened_from_run_id?: string | null;
  },
  templateName?: string,
  supersededByRunId?: string,
  currentRunId?: string,
): ChecklistRunSummary {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    templateId: record.template_id,
    templateName: templateName ?? undefined,
    templateVersion: record.template_version,
    status: record.status,
    reopenedFromRunId: record.reopened_from_run_id ?? undefined,
    supersededByRunId,
    currentRunId,
    relatedEntityType: record.related_entity_type ?? undefined,
    relatedEntityId: record.related_entity_id ?? undefined,
    startedAt: record.started_at,
    completedAt: record.completed_at ?? undefined,
  };
}
