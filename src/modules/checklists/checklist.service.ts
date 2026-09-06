import { env } from "../../config/env.js";
import { publishDomainEvent } from "../../infra/events/domain-event.publisher.js";
import { UploadGateError, uploadGateStatus, verifyUploadContent } from "../evidence/upload-gate.js";
import {
  deleteStoredChecklistAttachmentFile,
  getChecklistAttachmentStorageConfig,
  resolveChecklistAttachmentDownload,
  saveChecklistAttachmentFile,
  type ChecklistAttachmentDownload,
  type ChecklistAttachmentUpload,
} from "./checklist-attachment.storage.js";
import { CHECKLIST_AUDIT_ACTIONS } from "./checklist.audit.js";
import { CHECKLIST_COMPONENT_CATALOG } from "./checklist.components.js";
import { buildChecklistSnapshot } from "./checklist.dto.js";
import type {
  ChecklistAcknowledgement,
  ChecklistAttachment,
  ChecklistMarker,
  ChecklistRun,
  ChecklistRunAnswer,
  ChecklistRunRole,
  ChecklistTemplate,
  ChecklistTemplateComponent,
} from "./checklist.types.js";
import { ChecklistError } from "./checklist.types.js";
import {
  assertChecklistRunFieldWritable,
  assertChecklistRunMutable,
  assertChecklistRunStatusTransition,
} from "./checklist.run-lifecycle.js";
import {
  InMemoryChecklistRepository,
  type ChecklistRepository,
  type RepositoryRunDetails,
} from "./checklist.repository.js";
import type {
  CompleteChecklistRunInput,
  CreateChecklistAcknowledgementInput,
  CreateChecklistAttachmentInput,
  CreateChecklistMarkerInput,
  CreateChecklistRunInput,
  CreateChecklistTemplateInput,
  RegisterDivergenceInput,
  ReopenChecklistRunInput,
  UpdateChecklistRunInput,
  UpdateChecklistTemplateInput,
} from "./checklist.validator.js";

type ActorContext = {
  readonly tenantId: string;
  readonly userId: string;
};

export type ChecklistRenderSchema = {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly type: string;
  readonly version: number;
  readonly schema: Record<string, unknown>;
  readonly components: readonly ChecklistTemplateComponent[];
};

export class ChecklistService {
  constructor(private readonly repository: ChecklistRepository) {}

  listComponents() {
    return CHECKLIST_COMPONENT_CATALOG;
  }

  listTemplates(actor: ActorContext): Promise<readonly ChecklistTemplate[]> {
    return this.repository.listTemplates(actor.tenantId);
  }

  listAvailableTemplates(actor: ActorContext): Promise<readonly ChecklistTemplate[]> {
    return this.repository.listPublishedTemplates(actor.tenantId);
  }

  async createTemplate(
    actor: ActorContext,
    input: CreateChecklistTemplateInput,
  ): Promise<ChecklistTemplate> {
    const template = await this.repository.createTemplate({
      ...input,
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
    });

    await this.audit(actor, CHECKLIST_AUDIT_ACTIONS.templateCreated, "checklist_template", template.id, {
      type: template.type,
      status: template.status,
    });

    return template;
  }

  async getTemplate(actor: ActorContext, checklistId: string): Promise<ChecklistTemplate> {
    const template = await this.repository.getTemplate(actor.tenantId, checklistId);

    if (!template) {
      throw new ChecklistError(404, "CHECKLIST_NOT_FOUND", "checklist_not_found", "Checklist not found.");
    }

    return template;
  }

  // Ω3-c (port resolveChecklistSnapshot) — resolve o snapshot congelável de um template. Só congela
  // template PUBLICADO e não-deletado (paridade com o guard de createRun/render). tenant-scoped.
  // Retorna null (não erro) quando não há template, não está publicado, ou foi deletado — o despacho
  // segue sem checklist. Nunca lança: o congelamento é efeito colateral do despacho.
  async snapshotPublishedTemplate(tenantId: string, checklistId: string): Promise<Record<string, unknown> | null> {
    const template = await this.repository.getTemplate(tenantId, checklistId);
    if (!template || template.status !== "published" || template.deletedAt) {
      return null;
    }
    return buildChecklistSnapshot(template);
  }

  async updateTemplate(
    actor: ActorContext,
    checklistId: string,
    input: UpdateChecklistTemplateInput,
  ): Promise<ChecklistTemplate> {
    // CHECKLIST P1 PR-02c (junta): remover um campo JÁ RESPONDIDO esbarra na FK `Restrict` de
    // `checklist_run_answers.component_id` e o Prisma sobe P2003 cru — que chegava ao tenant admin
    // como texto de banco no toast. O Restrict está CERTO (a resposta do técnico não pode ficar
    // órfã); o que faltava era traduzir a recusa para linguagem de negócio.
    // Estado anterior lido ANTES da gravação: sem ele a auditoria não sabe dizer o que mudou.
    const previous = await this.repository.getTemplate(actor.tenantId, checklistId);

    let template: ChecklistTemplate | null;
    try {
      template = await this.repository.updateTemplate({
        ...input,
        tenantId: actor.tenantId,
        checklistId,
        actorUserId: actor.userId,
      });
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new ChecklistError(
          409,
          "CHECKLIST_COMPONENT_IN_USE",
          "component_has_answers",
          "Um dos campos removidos já foi respondido em uma vistoria. Ele não pode ser excluído — mantenha o campo no formulário (você pode deixá-lo opcional) ou conclua as vistoriais em andamento antes.",
        );
      }
      throw error;
    }

    if (!template) {
      throw new ChecklistError(404, "CHECKLIST_NOT_FOUND", "checklist_not_found", "Checklist not found.");
    }

    await this.audit(actor, CHECKLIST_AUDIT_ACTIONS.templateUpdated, "checklist_template", template.id, {
      status: template.status,
      version: template.version,
      // Junta PR-02c (ALTA do dba): trocar o `type` de um modelo PUBLICADO muda o significado de
      // uma versão já congelada — o snapshot do despacho e as vistorias em andamento apontam para
      // (modelo, versão). A troca continua permitida (é metadado, sem efeito de runtime), mas
      // deixa de ser invisível: fica na trilha de auditoria, com destaque quando é em publicado.
      ...(previous && input.type && input.type !== previous.type
        ? {
            typeFrom: previous.type,
            typeTo: input.type,
            typeChangedWhilePublished: previous.status === "published",
          }
        : {}),
    });

    return template;
  }

  async archiveTemplate(actor: ActorContext, checklistId: string): Promise<void> {
    const template = await this.repository.archiveTemplate(actor.tenantId, checklistId, actor.userId);

    if (!template) {
      throw new ChecklistError(404, "CHECKLIST_NOT_FOUND", "checklist_not_found", "Checklist not found.");
    }

    await this.audit(actor, CHECKLIST_AUDIT_ACTIONS.templateDeleted, "checklist_template", template.id, {
      status: template.status,
    });
  }

  async publishTemplate(actor: ActorContext, checklistId: string): Promise<ChecklistTemplate> {
    const template = await this.repository.publishTemplate(actor.tenantId, checklistId, actor.userId);

    if (!template) {
      throw new ChecklistError(404, "CHECKLIST_NOT_FOUND", "checklist_not_found", "Checklist not found.");
    }

    if (template.components.length === 0) {
      throw new ChecklistError(422, "CHECKLIST_INVALID", "components_required", "Published checklist requires at least one component.");
    }

    await this.audit(actor, CHECKLIST_AUDIT_ACTIONS.templatePublished, "checklist_template", template.id, {
      version: template.version,
      type: template.type,
    });

    return template;
  }

  // P-CHK-INATIVAR-COM-RUN-ATIVA (achado da junta do PR-02c) — inativar um modelo NÃO pode derrubar quem já
  // está no meio da vistoria. "Inativo" promete na própria tela "fora das NOVAS ordens": o formulário continua
  // sendo servido enquanto existir vistoria VIVA daquele modelo na organização, e o bloqueio real fica em
  // `createRun` (nenhuma vistoria NOVA nasce de modelo inativo). Rascunho e arquivado seguem recusados.
  async renderChecklist(actor: ActorContext, checklistId: string): Promise<ChecklistRenderSchema> {
    const template = await this.getTemplate(actor, checklistId);

    if (template.status !== "published") {
      const servesActiveRun =
        template.status === "inactive" &&
        !template.deletedAt &&
        (await this.repository.hasActiveRunsForTemplate(actor.tenantId, template.id));

      if (!servesActiveRun) {
        throw new ChecklistError(409, "CHECKLIST_NOT_PUBLISHED", "checklist_not_published", "Checklist must be published before execution.");
      }
    }

    return {
      id: template.id,
      name: template.name,
      description: template.description,
      type: template.type,
      version: template.version,
      schema: template.schema,
      components: template.components,
    };
  }

  // CHECKLIST P1 PR-04c (§9) — o `role` entra pela ASSINATURA do serviço, não pelo parser: `CreateChecklistRunInput`
  // (o que o REST sabe montar) segue sem fase, e o campo extra só é preenchível por quem chama o serviço de
  // dentro do processo — hoje, apenas o provisionamento do despacho. Nenhum corpo HTTP consegue declarar em que
  // fase a vistoria nasceu.
  async createRun(
    actor: ActorContext,
    input: CreateChecklistRunInput & { readonly role?: ChecklistRunRole },
  ): Promise<ChecklistRun> {
    const template = await this.getTemplate(actor, input.checklistId);

    if (template.status !== "published") {
      throw new ChecklistError(409, "CHECKLIST_NOT_PUBLISHED", "checklist_not_published", "Checklist must be published before execution.");
    }

    const { run, created } = await this.repository.createRun(
      {
        ...input,
        tenantId: actor.tenantId,
        actorUserId: actor.userId,
      },
      template,
    );

    // D-CHK-DISPATCH-CREATE (achado MÉDIA do crítico) — SÓ audita e publica o evento de domínio quando a run
    // foi REALMENTE inserida. Se o repositório devolveu idempotentemente a run pré-existente (`created:false`,
    // por colisão de `client_run_key`: 2 despachos concorrentes da mesma OS ou 2× POST com a mesma chave),
    // PULA os dois efeitos — senão `checklist_run.created` sairia 2× e a métrica FATURADA `checklist_runs_count`
    // (dedup por `event.id`, único por emissão) super-contaria, além de duplicar a auditoria "run created".
    if (created) {
      await this.audit(actor, CHECKLIST_AUDIT_ACTIONS.runCreated, "checklist_run", run.id, {
        templateId: template.id,
        templateVersion: template.version,
      });

      await publishDomainEvent(
        "checklist_run.created",
        {
          runId: run.id,
          templateId: template.id,
          status: run.status,
        },
        {
          tenantId: actor.tenantId,
          actorId: actor.userId,
        },
      );
    }

    return run;
  }

  listRuns(actor: ActorContext): Promise<readonly ChecklistRun[]> {
    return this.repository.listRuns(actor.tenantId);
  }

  async getRun(actor: ActorContext, runId: string): Promise<RepositoryRunDetails> {
    const run = await this.repository.getRun(actor.tenantId, runId);

    if (!run) {
      throw new ChecklistError(404, "CHECKLIST_RUN_NOT_FOUND", "checklist_run_not_found", "Checklist run not found.");
    }

    return run;
  }

  // P0a — resolve a run pela chave durável do mobile (local_run_id → client_run_key). Usado pelo sync para
  // (a) pré-checar idempotência de `checklist.run_create` e (b) resolver o `local_run_id` que as demais ações
  // do lote (answer/marker/divergence/ack/attachment) usam para referenciar a run recém-criada. tenant-scoped.
  findRunByClientKey(actor: ActorContext, clientRunKey: string): Promise<ChecklistRun | null> {
    return this.repository.getRunByClientKey(actor.tenantId, clientRunKey);
  }

  // CHECKLIST P1 PR-04c (§8) — ADOÇÃO da run em voo: carimba a fase numa vistoria que já existe, sem criar
  // nada e sem publicar `checklist_run.created`. Publicar aqui seria justamente o defeito que a adoção existe
  // para evitar: a métrica FATURADA `checklist_runs_count` deduplica por `event.id`, então cada emissão nova é
  // uma unidade cobrada nova — e nenhuma vistoria nasceu.
  stampRunRole(actor: ActorContext, runId: string, role: ChecklistRunRole): Promise<boolean> {
    return this.repository.stampRunRole(actor.tenantId, runId, role);
  }

  // D-CHK-DISPATCH-CREATE — o guincheiro baixa a(s) run(s) pré-criada(s) da OS despachada pelo server_run_id.
  // Tenant-scoped (RLS herdada): OS de outro tenant → lista vazia (isolamento, nunca vaza existência).
  // `workOrderId` ausente/vazio → 422 (query malformada), coerente com o gate `checklist_runs:read` da rota.
  //
  // CONTRATO (achado BAIXO do crítico) — a lista pode ter >1 run: a `client_run_key` é
  // `dispatch:<workOrderId>:<checklistId>`, então se a OS TROCA de checklist entre despachos, o re-despacho
  // cria uma 2ª run (chave diferente) e ambas ficam ligadas à OS. Desambiguação: (1) a lista vem ORDENADA por
  // `created_at` desc (mais recente primeiro — a run vigente por recência); (2) o app deve casar pelo checklist
  // VIGENTE da OS passando o filtro opcional `?checklistId=` (aqui aplicado por `templateId`). Re-despacho com o
  // MESMO checklist continua idempotente (1 run). `checklistId` vazio → sem filtro (devolve todas, desc).
  async listRunsForWorkOrder(
    actor: ActorContext,
    workOrderIdRaw: unknown,
    checklistIdRaw?: unknown,
  ): Promise<readonly ChecklistRun[]> {
    const workOrderId = typeof workOrderIdRaw === "string" ? workOrderIdRaw.trim() : "";

    if (!workOrderId) {
      throw new ChecklistError(
        422,
        "CHECKLIST_RUN_QUERY_INVALID",
        "work_order_id_required",
        "workOrderId is required.",
      );
    }

    const runs = await this.repository.listRunsByRelatedEntity(actor.tenantId, "work_order", workOrderId);
    const checklistId = typeof checklistIdRaw === "string" ? checklistIdRaw.trim() : "";

    return checklistId ? runs.filter((run) => run.templateId === checklistId) : runs;
  }

  async updateRun(actor: ActorContext, runId: string, input: UpdateChecklistRunInput): Promise<RepositoryRunDetails> {
    // CHECKLIST P1 PR-03 (D-CHK-P1-RUN-LIFECYCLE) — a vistoria concluída é a prova do estado do veículo:
    // nenhuma escrita passa. Corrigir = reabrir (nova versão). O repositório repete a trava (defesa em
    // profundidade); aqui ela vale para QUALQUER repositório, inclusive os de teste.
    assertChecklistRunFieldWritable((await this.getRun(actor, runId)).run);
    assertChecklistRunStatusTransition(input.status);

    const run = await this.repository.updateRun({
      tenantId: actor.tenantId,
      runId,
      status: input.status,
      answers: input.answers,
    });

    if (!run) {
      throw new ChecklistError(404, "CHECKLIST_RUN_NOT_FOUND", "checklist_run_not_found", "Checklist run not found.");
    }

    await this.audit(actor, CHECKLIST_AUDIT_ACTIONS.runUpdated, "checklist_run", run.run.id, {
      status: run.run.status,
      answerCount: run.answers.length,
    });

    return run;
  }

  async createAttachment(actor: ActorContext, runId: string, input: CreateChecklistAttachmentInput): Promise<ChecklistAttachment> {
    await this.assertRunComponent(actor, runId, input.componentId);

    const attachment = await this.repository.createAttachment(actor.tenantId, runId, actor.userId, input);

    if (!attachment) {
      throw new ChecklistError(404, "CHECKLIST_RUN_NOT_FOUND", "checklist_run_not_found", "Checklist run not found.");
    }

    await this.audit(actor, CHECKLIST_AUDIT_ACTIONS.runUpdated, "checklist_run", runId, {
      attachmentId: attachment.id,
      componentId: attachment.componentId,
    });

    return attachment;
  }

  async createUploadedAttachment(
    actor: ActorContext,
    runId: string,
    upload: ChecklistAttachmentUpload,
  ): Promise<ChecklistAttachment> {
    await this.assertRunComponent(actor, runId, upload.componentId);

    // B-O6R-07b (Ω6R-SEC-004) — O SCAN NASCE AQUI. Esta via NÃO tinha scanner nenhum: nem Noop.
    // `createUploadedAttachment` ia direto de `assertRunComponent` para `saveChecklistAttachmentFile`,
    // e a única checagem de tipo era a allowlist contra o MIME DECLARADO no parser. Agora o gate único
    // roda depois do `assertRunComponent` (posse antes de verificação, como nas irmãs) e antes do save.
    const verification = await verifyUploadContent({
      via: "V4",
      buffer: upload.file.buffer,
      declaredMimeType: upload.file.mimeType,
      allowedMimeTypes: getChecklistAttachmentStorageConfig().allowedMimeTypes,
      scan: {
        tenantId: actor.tenantId,
        evidenceId: runId,
        clientEvidenceId: upload.componentId,
      },
    }).catch((error: unknown) => {
      throw toChecklistAttachmentGateError(error);
    });

    const stored = await saveChecklistAttachmentFile({
      tenantId: actor.tenantId,
      runId,
      upload: upload.file,
      verification,
    });

    try {
      const attachment = await this.repository.createAttachment(actor.tenantId, runId, actor.userId, {
        componentId: upload.componentId,
        fileUrl: stored.fileUrl,
        fileName: stored.fileName,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        metadata: {
          ...upload.metadata,
          storageProvider: stored.storageDriver,
          storageDriver: stored.storageDriver,
          storageKey: stored.storageKey,
          checksumSha256: stored.checksum,
        },
      });

      if (!attachment) {
        throw new ChecklistError(404, "CHECKLIST_RUN_NOT_FOUND", "checklist_run_not_found", "Checklist run not found.");
      }

      await this.audit(actor, CHECKLIST_AUDIT_ACTIONS.attachmentUploaded, "checklist_run", runId, {
        runId,
        componentId: attachment.componentId,
        attachmentId: attachment.id,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        tenantId: actor.tenantId,
        actorId: actor.userId,
      });

      await publishDomainEvent(
        "checklist_run.attachment_uploaded",
        {
          runId,
          componentId: attachment.componentId,
          attachmentId: attachment.id,
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
        },
        {
          tenantId: actor.tenantId,
          actorId: actor.userId,
        },
      );

      return attachment;
    } catch (error) {
      await deleteStoredChecklistAttachmentFile(stored.storageKey, stored.storageDriver);
      throw error;
    }
  }

  async getAttachmentDownload(
    actor: ActorContext,
    runId: string,
    attachmentId: string,
  ): Promise<ChecklistAttachmentDownload> {
    const details = await this.getRun(actor, runId);
    const attachment = details.attachments.find((item) => item.id === attachmentId);

    if (!attachment) {
      throw new ChecklistError(404, "CHECKLIST_ATTACHMENT_NOT_FOUND", "checklist_attachment_not_found", "Checklist attachment not found.");
    }

    const download = await resolveChecklistAttachmentDownload(attachment);

    await publishDomainEvent(
      "checklist_run.attachment_downloaded",
      {
        runId,
        componentId: attachment.componentId,
        attachmentId: attachment.id,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        sizeBytes: download.sizeBytes ?? attachment.sizeBytes,
      },
      {
        tenantId: actor.tenantId,
        actorId: actor.userId,
      },
    );

    return download;
  }

  async createMarker(actor: ActorContext, runId: string, input: CreateChecklistMarkerInput): Promise<ChecklistMarker> {
    assertChecklistRunFieldWritable((await this.getRun(actor, runId)).run);

    const marker = await this.repository.createMarker(actor.tenantId, runId, actor.userId, input);

    if (!marker) {
      throw new ChecklistError(404, "CHECKLIST_RUN_NOT_FOUND", "checklist_run_not_found", "Checklist run not found.");
    }

    await this.audit(actor, CHECKLIST_AUDIT_ACTIONS.runUpdated, "checklist_run", runId, {
      markerId: marker.id,
      componentId: marker.componentId,
    });

    return marker;
  }

  async completeRun(
    actor: ActorContext,
    runId: string,
    input: CompleteChecklistRunInput,
  ): Promise<RepositoryRunDetails> {
    if (input.hasDivergence && !input.observation?.trim()) {
      throw new ChecklistError(422, "DIVERGENCE_OBSERVATION_REQUIRED", "divergence_observation_required", "Divergence requires an observation.");
    }

    // Concluir de novo o que já está concluído (ou cancelado) é mutação de prova assinada → 409.
    assertChecklistRunFieldWritable((await this.getRun(actor, runId)).run);

    const status = input.hasDivergence ? "pending_acknowledgement" : "completed";
    const run = await this.repository.completeRun(actor.tenantId, runId, actor.userId, status);

    if (!run) {
      throw new ChecklistError(404, "CHECKLIST_RUN_NOT_FOUND", "checklist_run_not_found", "Checklist run not found.");
    }

    await this.audit(actor, CHECKLIST_AUDIT_ACTIONS.runCompleted, "checklist_run", run.run.id, {
      status: run.run.status,
      hasDivergence: input.hasDivergence,
    });

    // Junta PR-03 (ALTA do critico-adversarial) — a premissa original estava ERRADA. Quem alimenta
    // a base de rateio FATURADA não é só `checklist_run.created`: `checklist_run.completed` é
    // metric-key de cobrança em cloud-usage.events e entra em `basisMetricKeys` do rateio
    // (cloud-cost-allocation.rules). Sem marcar a origem, CONCLUIR a vistoria reaberta contaria
    // como trabalho novo e DOBRARIA a base — cobrando o cliente pela correção de um erro nosso.
    // A conclusão da reabertura vai marcada; quem soma decide sem adivinhar.
    const isReopenedRun = Boolean(run.run.reopenedFromRunId);

    await publishDomainEvent(
      "checklist_run.completed",
      {
        runId: run.run.id,
        templateId: run.run.templateId,
        status: run.run.status,
        hasDivergence: input.hasDivergence,
        isReopenedRun,
        ...(isReopenedRun ? { reopenedFromRunId: run.run.reopenedFromRunId } : {}),
      },
      {
        tenantId: actor.tenantId,
        actorId: actor.userId,
      },
    );

    return run;
  }

  /**
   * CHECKLIST P1 PR-03 (D-CHK-P1-RUN-LIFECYCLE) — REABRIR uma vistoria concluída.
   *
   * A vistoria concluída NUNCA é editada: nasce uma NOVA versão vinculada à anterior, herdando modelo/versão,
   * o vínculo com a OS/custódia, as respostas e as marcações de avaria. A original continua íntegra e legível
   * (é a prova do estado do veículo naquele momento) e a trilha de auditoria registra QUEM reabriu, QUANDO e
   * a partir de QUAL vistoria — com o motivo declarado.
   *
   * Gate de permissão: `checklist_runs:reopen` (gestão + admins). Ver checklist.permissions.ts.
   *
   * FATURAMENTO: publica `checklist_run.reopened`, NUNCA `checklist_run.created` — este último alimenta a
   * métrica FATURADA `checklist_runs_count` (cloud-usage.events), e cobrar de novo pela correção de uma
   * vistoria seria cobrar duas vezes o mesmo trabalho de campo.
   */
  async reopenRun(
    actor: ActorContext,
    runId: string,
    input: ReopenChecklistRunInput,
  ): Promise<{
    readonly run: RepositoryRunDetails;
    readonly previousRunId: string;
  }> {
    const result = await this.repository.reopenRun({
      tenantId: actor.tenantId,
      runId,
      actorUserId: actor.userId,
      reason: input.reason,
    });

    if (!result) {
      throw new ChecklistError(404, "CHECKLIST_RUN_NOT_FOUND", "checklist_run_not_found", "Checklist run not found.");
    }

    await this.audit(actor, CHECKLIST_AUDIT_ACTIONS.runReopened, "checklist_run", result.run.id, {
      previousRunId: result.previous.id,
      previousStatus: result.previous.status,
      templateId: result.run.templateId,
      templateVersion: result.run.templateVersion,
      reason: input.reason,
      copiedAnswers: result.copiedAnswers,
      copiedMarkers: result.copiedMarkers,
    });

    await publishDomainEvent(
      "checklist_run.reopened",
      {
        runId: result.run.id,
        previousRunId: result.previous.id,
        templateId: result.run.templateId,
        status: result.run.status,
      },
      {
        tenantId: actor.tenantId,
        actorId: actor.userId,
      },
    );

    return {
      run: await this.getRun(actor, result.run.id),
      previousRunId: result.previous.id,
    };
  }

  async getComparison(actor: ActorContext, runId: string) {
    const details = await this.getRun(actor, runId);
    const template = await this.repository.getTemplate(actor.tenantId, details.run.templateId);

    return {
      run: details.run,
      template,
      answers: details.answers,
      markers: details.markers,
      attachments: details.attachments,
      comparison: {
        status: details.run.status,
        divergence: details.run.status === "pending_acknowledgement" || details.run.status === "completed_with_divergence",
      },
    };
  }

  async registerDivergence(
    actor: ActorContext,
    runId: string,
    input: RegisterDivergenceInput,
  ): Promise<RepositoryRunDetails> {
    // P0a — anexo de divergência só é criado quando há fileUrl (caminho REST). O sync do mobile registra a
    // divergência SEM arquivo (componente + observação): pula a criação de anexo para NUNCA gerar "anexo
    // fantasma" (schema exige file_url NOT NULL) e apenas marca a run como pending_acknowledgement.
    assertChecklistRunFieldWritable((await this.getRun(actor, runId)).run);

    let attachment: ChecklistAttachment | null = null;

    if (input.fileUrl) {
      attachment = await this.repository.createAttachment(actor.tenantId, runId, actor.userId, {
        componentId: input.componentId,
        fileUrl: input.fileUrl,
        fileName: input.fileName,
        mimeType: input.mimeType,
        metadata: {
          ...input.metadata,
          divergence: true,
        },
      });

      if (!attachment) {
        throw new ChecklistError(404, "CHECKLIST_RUN_NOT_FOUND", "checklist_run_not_found", "Checklist run not found.");
      }
    }

    const run = await this.repository.completeRun(actor.tenantId, runId, actor.userId, "pending_acknowledgement");

    if (!run) {
      throw new ChecklistError(404, "CHECKLIST_RUN_NOT_FOUND", "checklist_run_not_found", "Checklist run not found.");
    }

    await this.audit(actor, CHECKLIST_AUDIT_ACTIONS.runDivergenceRegistered, "checklist_run", run.run.id, {
      observation: input.observation,
      attachmentId: attachment?.id ?? null,
    });

    await publishDomainEvent(
      "checklist_run.divergence_reported",
      {
        runId: run.run.id,
        templateId: run.run.templateId,
        status: run.run.status,
        attachmentId: attachment?.id ?? null,
      },
      {
        tenantId: actor.tenantId,
        actorId: actor.userId,
      },
    );

    return run;
  }

  async acknowledgeRun(
    actor: ActorContext,
    runId: string,
    input: CreateChecklistAcknowledgementInput,
  ): Promise<{
    readonly acknowledgement: ChecklistAcknowledgement;
    readonly run: RepositoryRunDetails;
  }> {
    const existing = await this.getRun(actor, runId);

    if (existing.run.status !== "pending_acknowledgement") {
      throw new ChecklistError(409, "ACKNOWLEDGEMENT_NOT_REQUIRED", "acknowledgement_not_required", "Checklist run is not pending acknowledgement.");
    }

    const acknowledgement = await this.repository.createAcknowledgement(actor.tenantId, runId, actor.userId, input);

    if (!acknowledgement) {
      throw new ChecklistError(404, "CHECKLIST_RUN_NOT_FOUND", "checklist_run_not_found", "Checklist run not found.");
    }

    const run = await this.repository.completeRun(actor.tenantId, runId, actor.userId, "completed_with_divergence");

    if (!run) {
      throw new ChecklistError(404, "CHECKLIST_RUN_NOT_FOUND", "checklist_run_not_found", "Checklist run not found.");
    }

    await this.audit(actor, CHECKLIST_AUDIT_ACTIONS.runAcknowledged, "checklist_run", run.run.id, {
      acknowledgementId: acknowledgement.id,
    });

    await publishDomainEvent(
      "checklist_run.acknowledgement_created",
      {
        runId: run.run.id,
        templateId: run.run.templateId,
        status: run.run.status,
        acknowledgementId: acknowledgement.id,
      },
      {
        tenantId: actor.tenantId,
        actorId: actor.userId,
      },
    );

    return {
      acknowledgement,
      run,
    };
  }

  private async audit(
    actor: ActorContext,
    action: Parameters<ChecklistRepository["createAuditEvent"]>[0]["action"],
    entity: string,
    entityId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.repository.createAuditEvent({
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      action,
      entity,
      entityId,
      metadata,
    });
  }

  // Pré-condição comum das escritas de anexo: a run existe no tenant, AINDA aceita escrita (PR-03) e o campo
  // pertence ao modelo dela. A ordem importa no caminho multipart: a trava roda ANTES de gravar o binário —
  // vistoria travada nunca chega a escrever arquivo no armazenamento.
  private async assertRunComponent(actor: ActorContext, runId: string, componentId: string): Promise<void> {
    const details = await this.getRun(actor, runId);

    assertChecklistRunFieldWritable(details.run);

    const template = await this.repository.getTemplate(actor.tenantId, details.run.templateId);
    const componentBelongsToRun = template?.components.some((component) => component.id === componentId) ?? false;

    if (!componentBelongsToRun) {
      throw new ChecklistError(404, "CHECKLIST_COMPONENT_NOT_FOUND", "checklist_component_not_found", "Checklist component not found.");
    }
  }
}

const memoryRepository = new InMemoryChecklistRepository();
let defaultServicePromise: Promise<ChecklistService> | undefined;

export function createMemoryChecklistService(): ChecklistService {
  return new ChecklistService(memoryRepository);
}

export async function createDefaultChecklistService(): Promise<ChecklistService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryChecklistService();
  }

  defaultServicePromise ??= createPrismaChecklistService();

  return defaultServicePromise;
}

export function resetChecklistRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaChecklistService(): Promise<ChecklistService> {
  const { createPrismaChecklistRepository } = await import("./checklist-prisma.repository.js");

  return new ChecklistService(await createPrismaChecklistRepository());
}

export type ChecklistRunDetailsDto = {
  readonly run: ChecklistRun;
  readonly answers: readonly ChecklistRunAnswer[];
  readonly attachments: readonly ChecklistAttachment[];
  readonly markers: readonly ChecklistMarker[];
  readonly acknowledgements: readonly ChecklistAcknowledgement[];
};

/**
 * Violação de chave estrangeira do Postgres (23503 / Prisma P2003). Detecta pelo CÓDIGO, não pela
 * mensagem — texto de erro muda entre versões, código não. Usado para traduzir a recusa de apagar
 * um componente já respondido em erro de negócio (409), em vez de vazar SQL para a tela.
 */
function isForeignKeyViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const code = (error as { code?: unknown }).code;
  return code === "P2003" || code === "23503";
}

/**
 * B-O6R-07b — recusa neutra do gate → família DESTA via (plano §4). As famílias 422/503 são NOVAS aqui
 * (a via não tinha scanner), espelhando nominalmente o módulo `attachments` (Ω4C PR-01): mesmos
 * `reason`, mesma mensagem, mesma posição — nada persistido, nenhum órfão no storage.
 *
 * O `400 mime_type_not_allowed` do parser (MIME declarado) permanece e roda antes: é contrato vigente,
 * afirmado por `checklist-attachments.test.ts`, e a inconsistência com o `415`/`413` das irmãs é
 * pré-existente e declarada (`P-O6R-B07B-CODIGOS-INCONSISTENTES`, BAIXA).
 */
function toChecklistAttachmentGateError(error: unknown): unknown {
  if (!(error instanceof UploadGateError)) return error;
  const status = uploadGateStatus(error.kind);
  if (status === 422) {
    return new ChecklistError(422, "CHECKLIST_ATTACHMENT_REJECTED", "evidence_rejected", "Attachment failed the malware scan.");
  }
  if (status === 503) {
    return new ChecklistError(503, "CHECKLIST_ATTACHMENT_SCAN_UNAVAILABLE", "scan_unavailable", "Attachment scanner is unavailable; retry later.");
  }
  return new ChecklistError(415, "CHECKLIST_ATTACHMENT_UNSUPPORTED_MEDIA_TYPE", error.kind, error.detail);
}
