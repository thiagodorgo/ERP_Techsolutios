import { env } from "../../config/env.js";
import {
  deleteStoredChecklistAttachmentFile,
  resolveChecklistAttachmentDownload,
  saveChecklistAttachmentFile,
  type ChecklistAttachmentDownload,
  type ChecklistAttachmentUpload,
} from "./checklist-attachment.storage.js";
import { CHECKLIST_AUDIT_ACTIONS } from "./checklist.audit.js";
import { CHECKLIST_COMPONENT_CATALOG } from "./checklist.components.js";
import type {
  ChecklistAcknowledgement,
  ChecklistAttachment,
  ChecklistMarker,
  ChecklistRun,
  ChecklistRunAnswer,
  ChecklistTemplate,
  ChecklistTemplateComponent,
} from "./checklist.types.js";
import { ChecklistError } from "./checklist.types.js";
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

  async updateTemplate(
    actor: ActorContext,
    checklistId: string,
    input: UpdateChecklistTemplateInput,
  ): Promise<ChecklistTemplate> {
    const template = await this.repository.updateTemplate({
      ...input,
      tenantId: actor.tenantId,
      checklistId,
      actorUserId: actor.userId,
    });

    if (!template) {
      throw new ChecklistError(404, "CHECKLIST_NOT_FOUND", "checklist_not_found", "Checklist not found.");
    }

    await this.audit(actor, CHECKLIST_AUDIT_ACTIONS.templateUpdated, "checklist_template", template.id, {
      status: template.status,
      version: template.version,
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

  async renderChecklist(actor: ActorContext, checklistId: string): Promise<ChecklistRenderSchema> {
    const template = await this.getTemplate(actor, checklistId);

    if (template.status !== "published") {
      throw new ChecklistError(409, "CHECKLIST_NOT_PUBLISHED", "checklist_not_published", "Checklist must be published before execution.");
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

  async createRun(actor: ActorContext, input: CreateChecklistRunInput): Promise<ChecklistRun> {
    const template = await this.getTemplate(actor, input.checklistId);

    if (template.status !== "published") {
      throw new ChecklistError(409, "CHECKLIST_NOT_PUBLISHED", "checklist_not_published", "Checklist must be published before execution.");
    }

    const run = await this.repository.createRun(
      {
        ...input,
        tenantId: actor.tenantId,
        actorUserId: actor.userId,
      },
      template,
    );

    await this.audit(actor, CHECKLIST_AUDIT_ACTIONS.runCreated, "checklist_run", run.id, {
      templateId: template.id,
      templateVersion: template.version,
    });

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

  async updateRun(actor: ActorContext, runId: string, input: UpdateChecklistRunInput): Promise<RepositoryRunDetails> {
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

    const stored = await saveChecklistAttachmentFile({
      tenantId: actor.tenantId,
      runId,
      upload: upload.file,
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

      return attachment;
    } catch (error) {
      await deleteStoredChecklistAttachmentFile(stored.storageKey);
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

    return resolveChecklistAttachmentDownload(attachment);
  }

  async createMarker(actor: ActorContext, runId: string, input: CreateChecklistMarkerInput): Promise<ChecklistMarker> {
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

    const status = input.hasDivergence ? "pending_acknowledgement" : "completed";
    const run = await this.repository.completeRun(actor.tenantId, runId, actor.userId, status);

    if (!run) {
      throw new ChecklistError(404, "CHECKLIST_RUN_NOT_FOUND", "checklist_run_not_found", "Checklist run not found.");
    }

    await this.audit(actor, CHECKLIST_AUDIT_ACTIONS.runCompleted, "checklist_run", run.run.id, {
      status: run.run.status,
      hasDivergence: input.hasDivergence,
    });

    return run;
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
    const attachment = await this.repository.createAttachment(actor.tenantId, runId, actor.userId, {
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

    const run = await this.repository.completeRun(actor.tenantId, runId, actor.userId, "pending_acknowledgement");

    if (!run) {
      throw new ChecklistError(404, "CHECKLIST_RUN_NOT_FOUND", "checklist_run_not_found", "Checklist run not found.");
    }

    await this.audit(actor, CHECKLIST_AUDIT_ACTIONS.runDivergenceRegistered, "checklist_run", run.run.id, {
      observation: input.observation,
      attachmentId: attachment.id,
    });

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

  private async assertRunComponent(actor: ActorContext, runId: string, componentId: string): Promise<void> {
    const details = await this.getRun(actor, runId);
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
