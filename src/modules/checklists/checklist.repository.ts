import { randomUUID } from "node:crypto";

import {
  appendChecklistRunUsageInMemory,
  buildChecklistRunUsageEvents,
} from "../cloud-usage/cloud-usage.capture.js";
import type { ChecklistAuditEvent } from "./checklist.audit.js";
import {
  assertChecklistRunCompletionTarget,
  assertChecklistRunFieldWritable,
  assertChecklistRunMutable,
  assertChecklistRunReopenable,
  assertChecklistRunStatusTransition,
  checklistRunAlreadyReopenedError,
  checklistRunTemplateArchivedError,
  CHECKLIST_RUN_ACTIVE_STATUSES,
} from "./checklist.run-lifecycle.js";
import type {
  ChecklistAcknowledgement,
  ChecklistAttachment,
  ChecklistMarker,
  ChecklistRun,
  ChecklistRunAnswer,
  ChecklistRunRole,
  ChecklistRunStatus,
  ChecklistStatus,
  ChecklistTemplate,
  ChecklistTemplateComponent,
} from "./checklist.types.js";
import type {
  ChecklistComponentInput,
  CreateChecklistAcknowledgementInput,
  CreateChecklistAttachmentInput,
  CreateChecklistMarkerInput,
  CreateChecklistRunInput,
  CreateChecklistTemplateInput,
  UpdateChecklistTemplateInput,
  UpsertChecklistAnswerInput,
} from "./checklist.validator.js";

export type CreateTemplateData = CreateChecklistTemplateInput & {
  readonly tenantId: string;
  readonly actorUserId: string;
};

export type UpdateTemplateData = UpdateChecklistTemplateInput & {
  readonly tenantId: string;
  readonly checklistId: string;
  readonly actorUserId: string;
};

export type CreateRunData = CreateChecklistRunInput & {
  readonly tenantId: string;
  readonly actorUserId: string;
  // CHECKLIST P1 PR-04c (§9) — fase da linha de junção que originou esta run. INTERNA: o parser REST
  // (`parseCreateChecklistRunDto`) não a lê, então nenhum cliente consegue declarar a própria fase; só o
  // despacho a carimba, a partir do conjunto de vistorias da ordem.
  readonly role?: ChecklistRunRole;
};

export type UpdateRunData = {
  readonly tenantId: string;
  readonly runId: string;
  readonly status?: ChecklistRunStatus;
  readonly answers: readonly UpsertChecklistAnswerInput[];
};

// CHECKLIST P1 PR-03 (D-CHK-P1-RUN-LIFECYCLE) — reabertura de vistoria concluída. A run terminal NÃO é tocada:
// nasce uma NOVA run vinculada (`reopenedFromRunId`) com as respostas e as marcações de avaria copiadas, para
// o gestor/técnico corrigir sem redigitar. Anexos NÃO são copiados de propósito: duas linhas apontando para a
// MESMA chave de armazenamento tornariam a exclusão de uma capaz de cegar a outra (o binário original segue
// preservado e legível na versão anterior).
export type ReopenRunData = {
  readonly tenantId: string;
  readonly runId: string;
  readonly actorUserId: string;
  readonly reason: string;
};

export type ReopenRunResult = {
  readonly run: ChecklistRun;
  readonly previous: ChecklistRun;
  readonly copiedAnswers: number;
  readonly copiedMarkers: number;
};

export type RepositoryRunDetails = {
  readonly run: ChecklistRun;
  readonly answers: readonly ChecklistRunAnswer[];
  readonly attachments: readonly ChecklistAttachment[];
  readonly markers: readonly ChecklistMarker[];
  readonly acknowledgements: readonly ChecklistAcknowledgement[];
};

// B-O6R-06 / EMENDA E1·2 (achado E2 do `critico-adversarial`) — A INTENÇÃO DE FATURAR VIAJA POR ASSINATURA.
//
// `repository.completeRun` tem TRÊS chamadores no serviço, e só UM deles fatura hoje:
//   · `service.completeRun`      → publica `checklist_run.completed`  → FATURA         → `true`
//   · `service.registerDivergence` → publica `divergence_reported`    → NÃO fatura     → `false`
//   · `service.acknowledgeRun`     → publica `acknowledgement_created`→ NÃO fatura     → `false`
//
// Capturar a unidade DENTRO do repositório, sem este parâmetro, faria a trilha do mobile
// (divergência → ciência) passar de 0 para 1 unidade cobrada — mudança de PREÇO que é decisão de
// produto, não deste bloco (`P-O6R-B06-DIVERGENCIA-MOBILE-NAO-FATURADA`).
//
// O parâmetro é OBRIGATÓRIO e SEM DEFAULT de propósito: é o compilador (`npm run check`) que recusa um
// QUARTO chamador que não declare a intenção. Um default silenciaria a decisão exatamente onde ela
// custa dinheiro. O aceite C6 prova a recusa por execução do `tsc`.
//
// ATENÇÃO (ressalva da rodada 2 do crítico): o conjunto "caminhos que levam uma run a estado concluído"
// é fechado por DUAS travas, em arquivos diferentes — esta assinatura E
// `assertChecklistRunStatusTransition` (`checklist.run-lifecycle.ts`), que barra com 409 o `updateRun`
// (REST e sync mobile) de saltar para `completed`/`completed_with_divergence`/`pending_acknowledgement`.
// Relaxar a segunda faz uma run chegar a concluída SEM métrica. O aceite C7 pina essa segunda trava.
export type CompleteRunBilling = {
  /** `true` só no caminho que HOJE publica `checklist_run.completed`. Ver tabela acima. */
  readonly meterCompletion: boolean;
};

// D-CHK-DISPATCH-CREATE (achado MÉDIA do crítico) — `createRun` sinaliza se REALMENTE inseriu (`created:true`)
// ou devolveu idempotentemente a run pré-existente (`created:false`, colisão de `client_run_key`/replay). O
// serviço PULA a auditoria `runCreated` + o `publishDomainEvent('checklist_run.created')` quando `created` é
// false — senão dois despachos concorrentes da mesma OS (ou 2× POST com o mesmo `client_run_key`) emitiriam o
// evento 2×, SUPER-CONTANDO a métrica FATURADA `checklist_runs_count` (dedup por `event.id`, único a cada
// emissão) e duplicando a auditoria "run created".
export type CreateRunResult = {
  readonly run: ChecklistRun;
  readonly created: boolean;
};

export interface ChecklistRepository {
  listTemplates(tenantId: string): Promise<readonly ChecklistTemplate[]>;
  listPublishedTemplates(tenantId: string): Promise<readonly ChecklistTemplate[]>;
  createTemplate(data: CreateTemplateData): Promise<ChecklistTemplate>;
  getTemplate(tenantId: string, checklistId: string): Promise<ChecklistTemplate | null>;
  updateTemplate(data: UpdateTemplateData): Promise<ChecklistTemplate | null>;
  archiveTemplate(tenantId: string, checklistId: string, actorUserId: string): Promise<ChecklistTemplate | null>;
  publishTemplate(tenantId: string, checklistId: string, actorUserId: string): Promise<ChecklistTemplate | null>;
  listTemplatesByType(tenantId: string): Promise<readonly ChecklistTemplate[]>;
  createRun(data: CreateRunData, template: ChecklistTemplate): Promise<CreateRunResult>;
  listRuns(tenantId: string): Promise<readonly ChecklistRun[]>;
  getRun(tenantId: string, runId: string): Promise<RepositoryRunDetails | null>;
  // P0a — lookup durável por chave de idempotência do mobile (local_run_id). tenant-scoped.
  getRunByClientKey(tenantId: string, clientRunKey: string): Promise<ChecklistRun | null>;
  // CHECKLIST P1 PR-04c (§8) — carimba a FASE numa run que já existe, SÓ quando ela ainda não tem fase.
  // É o que a ADOÇÃO da run de chave legada faz: a vistoria em voo ganha proveniência de fase sem nascer de
  // novo (nascer de novo custaria uma unidade FATURADA e uma segunda run vazia na mesma ordem).
  //
  // Nunca sobrescreve uma fase já carimbada: a fase é a proveniência de NASCIMENTO da vistoria, e uma run
  // concluída é prova imutável — reescrevê-la mudaria retroativamente o que já foi assinado. Devolve `true`
  // quando carimbou de fato (a run existia no tenant e estava sem fase).
  stampRunRole(tenantId: string, runId: string, role: ChecklistRunRole): Promise<boolean>;
  // D-CHK-DISPATCH-CREATE — lista as runs de uma entidade relacionada (ex.: work_order) para o guincheiro baixar
  // o server_run_id da OS despachada. tenant-scoped (cross-tenant → lista vazia, nunca vaza existência).
  listRunsByRelatedEntity(
    tenantId: string,
    relatedEntityType: string,
    relatedEntityId: string,
  ): Promise<readonly ChecklistRun[]>;
  updateRun(data: UpdateRunData): Promise<RepositoryRunDetails | null>;
  completeRun(
    tenantId: string,
    runId: string,
    actorUserId: string,
    status: ChecklistRunStatus,
    billing: CompleteRunBilling,
  ): Promise<RepositoryRunDetails | null>;
  // CHECKLIST P1 PR-03 — cria a NOVA versão da vistoria a partir de uma run concluída (append-only). Devolve
  // null quando a run não existe no tenant (isolamento: nunca vaza existência); lança 409 quando a run não é
  // reabrível ou já foi reaberta.
  reopenRun(data: ReopenRunData): Promise<ReopenRunResult | null>;
  // CHECKLIST P1 PR-03 (P-CHK-INATIVAR-COM-RUN-ATIVA) — existe vistoria VIVA (in_progress/pending_acknowledgement)
  // deste modelo? É o que permite o `render` continuar servindo o formulário de um modelo INATIVADO para quem
  // já está no meio da vistoria, sem reabrir o modelo para NOVAS ordens.
  hasActiveRunsForTemplate(tenantId: string, templateId: string): Promise<boolean>;
  createAttachment(tenantId: string, runId: string, actorUserId: string, data: CreateChecklistAttachmentInput): Promise<ChecklistAttachment | null>;
  createMarker(tenantId: string, runId: string, actorUserId: string, data: CreateChecklistMarkerInput): Promise<ChecklistMarker | null>;
  createAcknowledgement(
    tenantId: string,
    runId: string,
    actorUserId: string,
    data: CreateChecklistAcknowledgementInput,
  ): Promise<ChecklistAcknowledgement | null>;
  createAuditEvent(event: ChecklistAuditEvent): Promise<void>;
  reset?(): void;
}

export class InMemoryChecklistRepository implements ChecklistRepository {
  private readonly templates = new Map<string, ChecklistTemplate>();
  private readonly runs = new Map<string, ChecklistRun>();
  private readonly answers = new Map<string, ChecklistRunAnswer>();
  private readonly attachments = new Map<string, ChecklistAttachment>();
  private readonly markers = new Map<string, ChecklistMarker>();
  private readonly acknowledgements = new Map<string, ChecklistAcknowledgement>();
  private readonly auditEvents: ChecklistAuditEvent[] = [];

  async listTemplates(tenantId: string): Promise<readonly ChecklistTemplate[]> {
    return [...this.templates.values()]
      .filter((template) => template.tenantId === tenantId && template.status !== "archived")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async listPublishedTemplates(tenantId: string): Promise<readonly ChecklistTemplate[]> {
    return [...this.templates.values()]
      .filter((template) => template.tenantId === tenantId && template.status === "published")
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async createTemplate(data: CreateTemplateData): Promise<ChecklistTemplate> {
    const now = new Date();
    const templateId = randomUUID();
    const components = data.components.map((component, index) =>
      createComponent(data.tenantId, templateId, component, index, now),
    );
    const template: ChecklistTemplate = {
      id: templateId,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      type: data.type,
      status: "draft",
      version: 1,
      schema: buildSchema(data.schema, components),
      createdBy: data.actorUserId,
      updatedBy: data.actorUserId,
      createdAt: now,
      updatedAt: now,
      components,
    };

    this.templates.set(template.id, template);

    return template;
  }

  async getTemplate(tenantId: string, checklistId: string): Promise<ChecklistTemplate | null> {
    const template = this.templates.get(checklistId);

    if (!template || template.tenantId !== tenantId || template.status === "archived") {
      return null;
    }

    return template;
  }

  async updateTemplate(data: UpdateTemplateData): Promise<ChecklistTemplate | null> {
    const template = await this.getTemplate(data.tenantId, data.checklistId);

    if (!template) {
      return null;
    }

    const now = new Date();
    // CHECKLIST P1 PR-02c (ALTA da junta) — PRESERVA a identidade do componente, espelhando o
    // repositório Prisma: quem mantém o `componentKey` mantém o `id`. Antes, cada save gerava id
    // novo para TODOS, e no caminho real isso fazia a resposta de um técnico offline (que aponta
    // para o id antigo, com FK Restrict) ser recusada para sempre.
    const components = data.components
      ? data.components.map((component, index) => {
          const rebuilt = createComponent(data.tenantId, template.id, component, index, now);
          const previous = template.components.find(
            (current) => current.componentKey === rebuilt.componentKey,
          );
          return previous ? { ...rebuilt, id: previous.id, createdAt: previous.createdAt } : rebuilt;
        })
      : [...template.components];
    const status = data.status ?? template.status;
    const updated: ChecklistTemplate = {
      ...template,
      name: data.name ?? template.name,
      description: data.description === null ? undefined : data.description ?? template.description,
      // CHECKLIST P1 PR-02c (P-CHK-PATCH-SEM-TYPE) — o tipo agora e gravado; ausente = mantem.
      type: data.type ?? template.type,
      status,
      schema: buildSchema(data.schema ?? template.schema, components),
      updatedBy: data.actorUserId,
      updatedAt: now,
      components,
      ...(status === "published" && !template.publishedAt ? { publishedAt: now } : {}),
    };

    this.templates.set(updated.id, updated);

    return updated;
  }

  async archiveTemplate(tenantId: string, checklistId: string, actorUserId: string): Promise<ChecklistTemplate | null> {
    const template = await this.getTemplate(tenantId, checklistId);

    if (!template) {
      return null;
    }

    const now = new Date();
    const updated: ChecklistTemplate = {
      ...template,
      status: "archived",
      updatedBy: actorUserId,
      updatedAt: now,
      deletedAt: now,
    };

    this.templates.set(updated.id, updated);

    return updated;
  }

  async publishTemplate(tenantId: string, checklistId: string, actorUserId: string): Promise<ChecklistTemplate | null> {
    const template = await this.getTemplate(tenantId, checklistId);

    if (!template) {
      return null;
    }

    const now = new Date();
    const updated: ChecklistTemplate = {
      ...template,
      status: "published",
      version: template.status === "published" ? template.version : template.version + 1,
      updatedBy: actorUserId,
      publishedAt: now,
      updatedAt: now,
      schema: buildSchema(template.schema, template.components),
    };

    this.templates.set(updated.id, updated);

    return updated;
  }

  async listTemplatesByType(tenantId: string): Promise<readonly ChecklistTemplate[]> {
    return this.listPublishedTemplates(tenantId);
  }

  async createRun(data: CreateRunData, template: ChecklistTemplate): Promise<CreateRunResult> {
    // P0a — idempotência durável: se já existe uma run com esta client_run_key no tenant, devolve a existente
    // (não cria duplicata). Espelha o unique [tenant_id, client_run_key] do Postgres. `created:false` faz o
    // serviço PULAR audit + publishDomainEvent (não super-conta o faturamento).
    if (data.clientRunKey) {
      const existing = [...this.runs.values()].find(
        (run) => run.tenantId === data.tenantId && run.clientRunKey === data.clientRunKey,
      );

      if (existing) {
        return { run: existing, created: false };
      }
    }

    const now = new Date();
    const run: ChecklistRun = {
      id: randomUUID(),
      tenantId: data.tenantId,
      templateId: template.id,
      templateVersion: template.version,
      relatedEntityType: data.relatedEntityType,
      relatedEntityId: data.relatedEntityId,
      clientRunKey: data.clientRunKey,
      // CHECKLIST P1 PR-04c (§9) — a fase com que a vistoria nasce; ausente quando a run não vem do despacho.
      role: data.role,
      status: "in_progress",
      startedBy: data.actorUserId,
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    this.runs.set(run.id, run);
    this.upsertAnswers(data.tenantId, run.id, data.answers, now);

    // B-O6R-06 — DUBLE da captura transacional, pelo MESMO builder do caminho Prisma. `await` de
    // proposito: a suite em memoria tem de enxergar a unidade JA gravada quando `createRun` retorna,
    // como o Postgres a enxerga depois do commit. Nao e evidencia de atomicidade (isso e a suite -db).
    await appendChecklistRunUsageInMemory(buildChecklistRunUsageEvents("created", run));

    return { run, created: true };
  }

  async getRunByClientKey(tenantId: string, clientRunKey: string): Promise<ChecklistRun | null> {
    return (
      [...this.runs.values()].find(
        (run) => run.tenantId === tenantId && run.clientRunKey === clientRunKey,
      ) ?? null
    );
  }

  async stampRunRole(tenantId: string, runId: string, role: ChecklistRunRole): Promise<boolean> {
    const run = this.runs.get(runId);

    // `run.role != null` também barra o re-carimbo: espelha o `WHERE role IS NULL` do Postgres (a fase é
    // proveniência de nascimento, nunca reescrita).
    if (!run || run.tenantId !== tenantId || run.role != null) {
      return false;
    }

    this.runs.set(runId, { ...run, role, updatedAt: new Date() });
    return true;
  }

  async listRunsByRelatedEntity(
    tenantId: string,
    relatedEntityType: string,
    relatedEntityId: string,
  ): Promise<readonly ChecklistRun[]> {
    return [...this.runs.values()]
      .filter(
        (run) =>
          run.tenantId === tenantId &&
          run.relatedEntityType === relatedEntityType &&
          run.relatedEntityId === relatedEntityId,
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async listRuns(tenantId: string): Promise<readonly ChecklistRun[]> {
    return [...this.runs.values()]
      .filter((run) => run.tenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getRun(tenantId: string, runId: string): Promise<RepositoryRunDetails | null> {
    const run = this.runs.get(runId);

    if (!run || run.tenantId !== tenantId) {
      return null;
    }

    return this.buildRunDetails(run);
  }

  async updateRun(data: UpdateRunData): Promise<RepositoryRunDetails | null> {
    const existing = this.runs.get(data.runId);

    if (!existing || existing.tenantId !== data.tenantId) {
      return null;
    }

    // CHECKLIST P1 PR-03 — trava de imutabilidade também NO REPOSITÓRIO (defesa em profundidade): quem chamar
    // daqui direto, sem passar pelo serviço, esbarra na mesma recusa 409.
    assertChecklistRunFieldWritable(existing);
    assertChecklistRunStatusTransition(data.status);

    const now = new Date();
    const updated: ChecklistRun = {
      ...existing,
      status: data.status ?? existing.status,
      updatedAt: now,
    };

    this.runs.set(updated.id, updated);
    this.upsertAnswers(data.tenantId, updated.id, data.answers, now);

    return this.buildRunDetails(updated);
  }

  async completeRun(
    tenantId: string,
    runId: string,
    actorUserId: string,
    status: ChecklistRunStatus,
    billing: CompleteRunBilling,
  ): Promise<RepositoryRunDetails | null> {
    const existing = this.runs.get(runId);

    if (!existing || existing.tenantId !== tenantId) {
      return null;
    }

    // Concluir duas vezes (ou concluir o que já está concluído/cancelado) é mutação de run terminal.
    assertChecklistRunMutable(existing);
    assertChecklistRunCompletionTarget(existing.status, status);

    const now = new Date();
    const updated: ChecklistRun = {
      ...existing,
      status,
      completedBy: status === "pending_acknowledgement" ? existing.completedBy : actorUserId,
      completedAt: status === "pending_acknowledgement" ? existing.completedAt : now,
      updatedAt: now,
    };

    this.runs.set(updated.id, updated);

    // B-O6R-06 / E1.2 — so o chamador que HOJE fatura declara `meterCompletion: true`. A trilha de
    // divergencia/ciencia do mobile continua valendo 0 unidades, como sempre valeu.
    if (billing.meterCompletion) {
      await appendChecklistRunUsageInMemory(buildChecklistRunUsageEvents("completed", updated));
    }

    return this.buildRunDetails(updated);
  }

  // CHECKLIST P1 PR-03 — reabertura append-only: a run concluída fica intacta e uma NOVA run nasce vinculada a
  // ela, herdando modelo/versão, vínculo com a OS/custódia, respostas e marcações. `clientRunKey` NÃO é
  // herdado (é a chave de idempotência do app para AQUELA criação; herdá-la colidiria no unique).
  async reopenRun(data: ReopenRunData): Promise<ReopenRunResult | null> {
    const previous = this.runs.get(data.runId);

    if (!previous || previous.tenantId !== data.tenantId) {
      return null;
    }

    assertChecklistRunReopenable(previous);

    // Junta PR-03 (MÉDIA): paridade com o repositório Prisma — modelo arquivado não aceita novo
    // preenchimento nem por reabertura (a versão nasceria em limbo: o app de campo só lista publicados).
    const template = this.templates.get(previous.templateId);

    if (!template || template.tenantId !== data.tenantId || template.status === "archived") {
      throw checklistRunTemplateArchivedError();
    }

    const alreadyReopened = [...this.runs.values()].some(
      (run) => run.tenantId === data.tenantId && run.reopenedFromRunId === previous.id,
    );

    if (alreadyReopened) {
      throw checklistRunAlreadyReopenedError();
    }

    const now = new Date();
    const run: ChecklistRun = {
      id: randomUUID(),
      tenantId: data.tenantId,
      templateId: previous.templateId,
      templateVersion: previous.templateVersion,
      relatedEntityType: previous.relatedEntityType,
      relatedEntityId: previous.relatedEntityId,
      reopenedFromRunId: previous.id,
      reopenReason: data.reason,
      status: "in_progress",
      startedBy: data.actorUserId,
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    this.runs.set(run.id, run);

    const copiedAnswers = [...this.answers.values()].filter(
      (answer) => answer.tenantId === data.tenantId && answer.runId === previous.id,
    );

    for (const answer of copiedAnswers) {
      const record: ChecklistRunAnswer = {
        ...answer,
        id: randomUUID(),
        runId: run.id,
        createdAt: now,
        updatedAt: now,
      };
      this.answers.set(record.id, record);
    }

    const copiedMarkers = [...this.markers.values()].filter(
      (marker) => marker.tenantId === data.tenantId && marker.runId === previous.id,
    );

    for (const marker of copiedMarkers) {
      const record: ChecklistMarker = {
        ...marker,
        id: randomUUID(),
        runId: run.id,
        createdBy: data.actorUserId,
        createdAt: now,
      };
      this.markers.set(record.id, record);
    }

    return {
      run,
      previous,
      copiedAnswers: copiedAnswers.length,
      copiedMarkers: copiedMarkers.length,
    };
  }

  async hasActiveRunsForTemplate(tenantId: string, templateId: string): Promise<boolean> {
    return [...this.runs.values()].some(
      (run) =>
        run.tenantId === tenantId &&
        run.templateId === templateId &&
        (CHECKLIST_RUN_ACTIVE_STATUSES as readonly string[]).includes(run.status),
    );
  }

  async createAttachment(
    tenantId: string,
    runId: string,
    actorUserId: string,
    data: CreateChecklistAttachmentInput,
  ): Promise<ChecklistAttachment | null> {
    const run = this.runs.get(runId);

    if (!run || run.tenantId !== tenantId || !this.componentBelongsToRun(tenantId, run, data.componentId)) {
      return null;
    }

    assertChecklistRunFieldWritable(run);

    const attachment: ChecklistAttachment = {
      id: randomUUID(),
      tenantId,
      runId,
      componentId: data.componentId,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      metadata: data.metadata,
      createdBy: actorUserId,
      createdAt: new Date(),
    };

    this.attachments.set(attachment.id, attachment);

    return attachment;
  }

  async createMarker(
    tenantId: string,
    runId: string,
    actorUserId: string,
    data: CreateChecklistMarkerInput,
  ): Promise<ChecklistMarker | null> {
    const run = this.runs.get(runId);

    if (!run || run.tenantId !== tenantId || !this.componentBelongsToRun(tenantId, run, data.componentId)) {
      return null;
    }

    assertChecklistRunFieldWritable(run);

    const marker: ChecklistMarker = {
      id: randomUUID(),
      tenantId,
      runId,
      componentId: data.componentId,
      x: data.x,
      y: data.y,
      markerType: data.markerType,
      description: data.description,
      metadata: data.metadata,
      createdBy: actorUserId,
      createdAt: new Date(),
    };

    this.markers.set(marker.id, marker);

    return marker;
  }

  async createAcknowledgement(
    tenantId: string,
    runId: string,
    actorUserId: string,
    data: CreateChecklistAcknowledgementInput,
  ): Promise<ChecklistAcknowledgement | null> {
    const run = this.runs.get(runId);

    if (!run || run.tenantId !== tenantId) {
      return null;
    }

    // A ciência só existe sobre uma run em `pending_acknowledgement` (não-terminal); numa run já fechada ela
    // seria escrita nova sobre prova assinada.
    assertChecklistRunMutable(run);

    const acknowledgement: ChecklistAcknowledgement = {
      id: randomUUID(),
      tenantId,
      runId,
      acknowledgedBy: actorUserId,
      message: data.message,
      observation: data.observation,
      acknowledgedAt: new Date(),
      metadata: data.metadata,
    };

    this.acknowledgements.set(acknowledgement.id, acknowledgement);

    return acknowledgement;
  }

  async createAuditEvent(event: ChecklistAuditEvent): Promise<void> {
    this.auditEvents.push(event);
  }

  reset(): void {
    this.templates.clear();
    this.runs.clear();
    this.answers.clear();
    this.attachments.clear();
    this.markers.clear();
    this.acknowledgements.clear();
    this.auditEvents.length = 0;
  }

  private upsertAnswers(
    tenantId: string,
    runId: string,
    answers: readonly UpsertChecklistAnswerInput[],
    now: Date,
  ): void {
    const run = this.runs.get(runId);

    if (!run) {
      return;
    }

    for (const answer of answers) {
      if (!this.componentBelongsToRun(tenantId, run, answer.componentId)) {
        continue;
      }

      const existing = [...this.answers.values()].find(
        (item) =>
          item.tenantId === tenantId &&
          item.runId === runId &&
          item.componentId === answer.componentId,
      );
      const record: ChecklistRunAnswer = {
        id: existing?.id ?? randomUUID(),
        tenantId,
        runId,
        componentId: answer.componentId,
        value: answer.value,
        metadata: answer.metadata,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };

      this.answers.set(record.id, record);
    }
  }

  private componentBelongsToRun(tenantId: string, run: ChecklistRun, componentId: string): boolean {
    const template = this.templates.get(run.templateId);

    return (
      template?.tenantId === tenantId &&
      template.components.some((component) => component.id === componentId)
    );
  }

  private buildRunDetails(run: ChecklistRun): RepositoryRunDetails {
    return {
      run,
      answers: [...this.answers.values()].filter(
        (answer) => answer.tenantId === run.tenantId && answer.runId === run.id,
      ),
      attachments: [...this.attachments.values()].filter(
        (attachment) => attachment.tenantId === run.tenantId && attachment.runId === run.id,
      ),
      markers: [...this.markers.values()].filter(
        (marker) => marker.tenantId === run.tenantId && marker.runId === run.id,
      ),
      acknowledgements: [...this.acknowledgements.values()].filter(
        (acknowledgement) =>
          acknowledgement.tenantId === run.tenantId && acknowledgement.runId === run.id,
      ),
    };
  }
}

function createComponent(
  tenantId: string,
  templateId: string,
  input: ChecklistComponentInput,
  index: number,
  now: Date,
): ChecklistTemplateComponent {
  return {
    id: randomUUID(),
    tenantId,
    templateId,
    componentKey: input.componentKey ?? `${input.type}_${index + 1}`,
    type: input.type,
    label: input.label,
    required: input.required,
    orderIndex: input.orderIndex ?? index,
    config: input.config,
    validationRules: input.validationRules,
    visibilityRules: input.visibilityRules,
    createdAt: now,
    updatedAt: now,
  };
}

function buildSchema(
  schema: Record<string, unknown>,
  components: readonly ChecklistTemplateComponent[],
): Record<string, unknown> {
  return {
    ...schema,
    components: components
      .slice()
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((component) => ({
        id: component.id,
        componentKey: component.componentKey,
        type: component.type,
        label: component.label,
        required: component.required,
        orderIndex: component.orderIndex,
        config: component.config,
        validationRules: component.validationRules,
        visibilityRules: component.visibilityRules,
      })),
  };
}
