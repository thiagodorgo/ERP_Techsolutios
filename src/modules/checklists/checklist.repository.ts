import { randomUUID } from "node:crypto";

import type { ChecklistAuditEvent } from "./checklist.audit.js";
import type {
  ChecklistAcknowledgement,
  ChecklistAttachment,
  ChecklistMarker,
  ChecklistRun,
  ChecklistRunAnswer,
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
};

export type UpdateRunData = {
  readonly tenantId: string;
  readonly runId: string;
  readonly status?: ChecklistRunStatus;
  readonly answers: readonly UpsertChecklistAnswerInput[];
};

export type RepositoryRunDetails = {
  readonly run: ChecklistRun;
  readonly answers: readonly ChecklistRunAnswer[];
  readonly attachments: readonly ChecklistAttachment[];
  readonly markers: readonly ChecklistMarker[];
  readonly acknowledgements: readonly ChecklistAcknowledgement[];
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
  createRun(data: CreateRunData, template: ChecklistTemplate): Promise<ChecklistRun>;
  listRuns(tenantId: string): Promise<readonly ChecklistRun[]>;
  getRun(tenantId: string, runId: string): Promise<RepositoryRunDetails | null>;
  updateRun(data: UpdateRunData): Promise<RepositoryRunDetails | null>;
  completeRun(tenantId: string, runId: string, actorUserId: string, status: ChecklistRunStatus): Promise<RepositoryRunDetails | null>;
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
    const components = data.components
      ? data.components.map((component, index) =>
          createComponent(data.tenantId, template.id, component, index, now),
        )
      : [...template.components];
    const status = data.status ?? template.status;
    const updated: ChecklistTemplate = {
      ...template,
      name: data.name ?? template.name,
      description: data.description === null ? undefined : data.description ?? template.description,
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

  async createRun(data: CreateRunData, template: ChecklistTemplate): Promise<ChecklistRun> {
    const now = new Date();
    const run: ChecklistRun = {
      id: randomUUID(),
      tenantId: data.tenantId,
      templateId: template.id,
      templateVersion: template.version,
      relatedEntityType: data.relatedEntityType,
      relatedEntityId: data.relatedEntityId,
      status: "in_progress",
      startedBy: data.actorUserId,
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    this.runs.set(run.id, run);
    this.upsertAnswers(data.tenantId, run.id, data.answers, now);

    return run;
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

  async completeRun(tenantId: string, runId: string, actorUserId: string, status: ChecklistRunStatus): Promise<RepositoryRunDetails | null> {
    const existing = this.runs.get(runId);

    if (!existing || existing.tenantId !== tenantId) {
      return null;
    }

    const now = new Date();
    const updated: ChecklistRun = {
      ...existing,
      status,
      completedBy: status === "pending_acknowledgement" ? existing.completedBy : actorUserId,
      completedAt: status === "pending_acknowledgement" ? existing.completedAt : now,
      updatedAt: now,
    };

    this.runs.set(updated.id, updated);

    return this.buildRunDetails(updated);
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
