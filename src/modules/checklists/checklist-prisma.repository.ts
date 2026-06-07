import type { PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type { ChecklistAuditEvent } from "./checklist.audit.js";
import type {
  ChecklistAcknowledgement,
  ChecklistAttachment,
  ChecklistComponentType,
  ChecklistMarker,
  ChecklistRun,
  ChecklistRunAnswer,
  ChecklistRunStatus,
  ChecklistStatus,
  ChecklistTemplate,
  ChecklistTemplateComponent,
  ChecklistType,
  JsonRecord,
} from "./checklist.types.js";
import type {
  ChecklistRepository,
  CreateRunData,
  CreateTemplateData,
  RepositoryRunDetails,
  UpdateRunData,
  UpdateTemplateData,
} from "./checklist.repository.js";
import type {
  CreateChecklistAcknowledgementInput,
  CreateChecklistAttachmentInput,
  CreateChecklistMarkerInput,
} from "./checklist.validator.js";

type PrismaModelDelegate = {
  findMany(args?: unknown): Promise<unknown[]>;
  findFirst(args: unknown): Promise<unknown | null>;
  create(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
  deleteMany(args: unknown): Promise<unknown>;
  createMany(args: unknown): Promise<unknown>;
  upsert?(args: unknown): Promise<unknown>;
};

type PrismaChecklistClient = {
  checklistTemplate: PrismaModelDelegate;
  checklistTemplateComponent: PrismaModelDelegate;
  checklistRun: PrismaModelDelegate;
  checklistRunAnswer: PrismaModelDelegate;
  checklistAttachment: PrismaModelDelegate;
  checklistMarker: PrismaModelDelegate;
  checklistAcknowledgement: PrismaModelDelegate;
  auditLog: PrismaModelDelegate;
};

export class PrismaChecklistRepository implements ChecklistRepository {
  constructor(private readonly client: PrismaChecklistClient) {}

  async listTemplates(tenantId: string): Promise<readonly ChecklistTemplate[]> {
    const records = await this.client.checklistTemplate.findMany({
      where: {
        tenant_id: tenantId,
        status: {
          not: "archived",
        },
      },
      include: {
        components: {
          orderBy: {
            order_index: "asc",
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return records.map(mapTemplateRecord);
  }

  async listPublishedTemplates(tenantId: string): Promise<readonly ChecklistTemplate[]> {
    const records = await this.client.checklistTemplate.findMany({
      where: {
        tenant_id: tenantId,
        status: "published",
        deleted_at: null,
      },
      include: {
        components: {
          orderBy: {
            order_index: "asc",
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return records.map(mapTemplateRecord);
  }

  async createTemplate(data: CreateTemplateData): Promise<ChecklistTemplate> {
    const record = await this.client.checklistTemplate.create({
      data: {
        tenant_id: data.tenantId,
        name: data.name,
        description: data.description ?? null,
        type: data.type,
        status: "draft",
        version: 1,
        schema: data.schema,
        created_by: data.actorUserId,
        updated_by: data.actorUserId,
        components: {
          create: data.components.map((component, index) => ({
            tenant_id: data.tenantId,
            component_key: component.componentKey ?? `${component.type}_${index + 1}`,
            type: component.type,
            label: component.label,
            required: component.required,
            order_index: component.orderIndex ?? index,
            config: component.config,
            validation_rules: component.validationRules,
            visibility_rules: component.visibilityRules,
          })),
        },
      },
      include: {
        components: {
          orderBy: {
            order_index: "asc",
          },
        },
      },
    });

    return mapTemplateRecord(record);
  }

  async getTemplate(tenantId: string, checklistId: string): Promise<ChecklistTemplate | null> {
    const record = await this.client.checklistTemplate.findFirst({
      where: {
        id: checklistId,
        tenant_id: tenantId,
        status: {
          not: "archived",
        },
      },
      include: {
        components: {
          orderBy: {
            order_index: "asc",
          },
        },
      },
    });

    return record ? mapTemplateRecord(record) : null;
  }

  async updateTemplate(data: UpdateTemplateData): Promise<ChecklistTemplate | null> {
    const existing = await this.getTemplate(data.tenantId, data.checklistId);

    if (!existing) {
      return null;
    }

    if (data.components) {
      await this.client.checklistTemplateComponent.deleteMany({
        where: {
          tenant_id: data.tenantId,
          template_id: data.checklistId,
        },
      });
    }

    const record = await this.client.checklistTemplate.update({
      where: {
        tenant_id_id: {
          tenant_id: data.tenantId,
          id: data.checklistId,
        },
      },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.schema ? { schema: data.schema } : {}),
        updated_by: data.actorUserId,
        ...(data.components
          ? {
              components: {
                create: data.components.map((component, index) => ({
                  tenant_id: data.tenantId,
                  component_key: component.componentKey ?? `${component.type}_${index + 1}`,
                  type: component.type,
                  label: component.label,
                  required: component.required,
                  order_index: component.orderIndex ?? index,
                  config: component.config,
                  validation_rules: component.validationRules,
                  visibility_rules: component.visibilityRules,
                })),
              },
            }
          : {}),
      },
      include: {
        components: {
          orderBy: {
            order_index: "asc",
          },
        },
      },
    });

    return mapTemplateRecord(record);
  }

  async archiveTemplate(tenantId: string, checklistId: string, actorUserId: string): Promise<ChecklistTemplate | null> {
    const existing = await this.getTemplate(tenantId, checklistId);

    if (!existing) {
      return null;
    }

    const record = await this.client.checklistTemplate.update({
      where: {
        tenant_id_id: {
          tenant_id: tenantId,
          id: checklistId,
        },
      },
      data: {
        status: "archived",
        deleted_at: new Date(),
        updated_by: actorUserId,
      },
      include: {
        components: {
          orderBy: {
            order_index: "asc",
          },
        },
      },
    });

    return mapTemplateRecord(record);
  }

  async publishTemplate(tenantId: string, checklistId: string, actorUserId: string): Promise<ChecklistTemplate | null> {
    const existing = await this.getTemplate(tenantId, checklistId);

    if (!existing) {
      return null;
    }

    const record = await this.client.checklistTemplate.update({
      where: {
        tenant_id_id: {
          tenant_id: tenantId,
          id: checklistId,
        },
      },
      data: {
        status: "published",
        version: existing.status === "published" ? existing.version : existing.version + 1,
        schema: {
          ...existing.schema,
          components: existing.components.map((component) => ({
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
        },
        published_at: new Date(),
        updated_by: actorUserId,
      },
      include: {
        components: {
          orderBy: {
            order_index: "asc",
          },
        },
      },
    });

    return mapTemplateRecord(record);
  }

  async listTemplatesByType(tenantId: string): Promise<readonly ChecklistTemplate[]> {
    return this.listPublishedTemplates(tenantId);
  }

  async createRun(data: CreateRunData, template: ChecklistTemplate): Promise<ChecklistRun> {
    const record = await this.client.checklistRun.create({
      data: {
        tenant_id: data.tenantId,
        template_id: template.id,
        template_version: template.version,
        related_entity_type: data.relatedEntityType ?? null,
        related_entity_id: data.relatedEntityId ?? null,
        status: "in_progress",
        started_by: data.actorUserId,
        answers: {
          create: data.answers.map((answer) => ({
            tenant_id: data.tenantId,
            component_id: answer.componentId,
            value: answer.value,
            metadata: answer.metadata,
          })),
        },
      },
    });

    return mapRunRecord(record);
  }

  async listRuns(tenantId: string): Promise<readonly ChecklistRun[]> {
    const records = await this.client.checklistRun.findMany({
      where: {
        tenant_id: tenantId,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return records.map(mapRunRecord);
  }

  async getRun(tenantId: string, runId: string): Promise<RepositoryRunDetails | null> {
    const record = await this.client.checklistRun.findFirst({
      where: {
        id: runId,
        tenant_id: tenantId,
      },
      include: {
        answers: true,
        attachments: true,
        markers: true,
        acknowledgements: true,
      },
    });

    return record ? mapRunDetailsRecord(record) : null;
  }

  async updateRun(data: UpdateRunData): Promise<RepositoryRunDetails | null> {
    const existing = await this.getRun(data.tenantId, data.runId);

    if (!existing) {
      return null;
    }

    for (const answer of data.answers) {
      const current = existing.answers.find((item) => item.componentId === answer.componentId);

      if (current) {
        await this.client.checklistRunAnswer.update({
          where: {
            id: current.id,
          },
          data: {
            value: answer.value,
            metadata: answer.metadata,
          },
        });
      } else {
        await this.client.checklistRunAnswer.create({
          data: {
            tenant_id: data.tenantId,
            run_id: data.runId,
            component_id: answer.componentId,
            value: answer.value,
            metadata: answer.metadata,
          },
        });
      }
    }

    if (data.status) {
      await this.client.checklistRun.update({
        where: {
          tenant_id_id: {
            tenant_id: data.tenantId,
            id: data.runId,
          },
        },
        data: {
          status: data.status,
        },
      });
    }

    return this.getRun(data.tenantId, data.runId);
  }

  async completeRun(tenantId: string, runId: string, actorUserId: string, status: ChecklistRunStatus): Promise<RepositoryRunDetails | null> {
    const existing = await this.getRun(tenantId, runId);

    if (!existing) {
      return null;
    }

    await this.client.checklistRun.update({
      where: {
        tenant_id_id: {
          tenant_id: tenantId,
          id: runId,
        },
      },
      data: {
        status,
        completed_by: status === "pending_acknowledgement" ? null : actorUserId,
        completed_at: status === "pending_acknowledgement" ? null : new Date(),
      },
    });

    return this.getRun(tenantId, runId);
  }

  async createAttachment(
    tenantId: string,
    runId: string,
    actorUserId: string,
    data: CreateChecklistAttachmentInput,
  ): Promise<ChecklistAttachment | null> {
    const run = await this.getRun(tenantId, runId);

    if (!run) {
      return null;
    }

    const record = await this.client.checklistAttachment.create({
      data: {
        tenant_id: tenantId,
        run_id: runId,
        component_id: data.componentId,
        file_url: data.fileUrl,
        file_name: data.fileName ?? null,
        mime_type: data.mimeType ?? null,
        size_bytes: data.sizeBytes ?? null,
        metadata: data.metadata,
        created_by: actorUserId,
      },
    });

    return mapAttachmentRecord(record);
  }

  async createMarker(
    tenantId: string,
    runId: string,
    actorUserId: string,
    data: CreateChecklistMarkerInput,
  ): Promise<ChecklistMarker | null> {
    const run = await this.getRun(tenantId, runId);

    if (!run) {
      return null;
    }

    const record = await this.client.checklistMarker.create({
      data: {
        tenant_id: tenantId,
        run_id: runId,
        component_id: data.componentId,
        x: data.x,
        y: data.y,
        marker_type: data.markerType,
        description: data.description ?? null,
        metadata: data.metadata,
        created_by: actorUserId,
      },
    });

    return mapMarkerRecord(record);
  }

  async createAcknowledgement(
    tenantId: string,
    runId: string,
    actorUserId: string,
    data: CreateChecklistAcknowledgementInput,
  ): Promise<ChecklistAcknowledgement | null> {
    const run = await this.getRun(tenantId, runId);

    if (!run) {
      return null;
    }

    const record = await this.client.checklistAcknowledgement.create({
      data: {
        tenant_id: tenantId,
        run_id: runId,
        acknowledged_by: actorUserId,
        message: data.message,
        observation: data.observation ?? null,
        metadata: data.metadata,
      },
    });

    return mapAcknowledgementRecord(record);
  }

  async createAuditEvent(event: ChecklistAuditEvent): Promise<void> {
    await this.client.auditLog.create({
      data: {
        tenant_id: event.tenantId,
        actor_user_id: event.actorUserId ?? null,
        action: event.action,
        entity: event.entity,
        entity_id: event.entityId,
        metadata: event.metadata ?? {},
      },
    });
  }
}

class RlsPrismaChecklistRepository implements ChecklistRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  listTemplates(tenantId: string): Promise<readonly ChecklistTemplate[]> {
    return this.withTenant(tenantId, (repository) => repository.listTemplates(tenantId));
  }

  listPublishedTemplates(tenantId: string): Promise<readonly ChecklistTemplate[]> {
    return this.withTenant(tenantId, (repository) => repository.listPublishedTemplates(tenantId));
  }

  createTemplate(data: CreateTemplateData): Promise<ChecklistTemplate> {
    return this.withTenant(data.tenantId, (repository) => repository.createTemplate(data));
  }

  getTemplate(tenantId: string, checklistId: string): Promise<ChecklistTemplate | null> {
    return this.withTenant(tenantId, (repository) => repository.getTemplate(tenantId, checklistId));
  }

  updateTemplate(data: UpdateTemplateData): Promise<ChecklistTemplate | null> {
    return this.withTenant(data.tenantId, (repository) => repository.updateTemplate(data));
  }

  archiveTemplate(tenantId: string, checklistId: string, actorUserId: string): Promise<ChecklistTemplate | null> {
    return this.withTenant(tenantId, (repository) => repository.archiveTemplate(tenantId, checklistId, actorUserId));
  }

  publishTemplate(tenantId: string, checklistId: string, actorUserId: string): Promise<ChecklistTemplate | null> {
    return this.withTenant(tenantId, (repository) => repository.publishTemplate(tenantId, checklistId, actorUserId));
  }

  listTemplatesByType(tenantId: string): Promise<readonly ChecklistTemplate[]> {
    return this.withTenant(tenantId, (repository) => repository.listTemplatesByType(tenantId));
  }

  createRun(data: CreateRunData, template: ChecklistTemplate): Promise<ChecklistRun> {
    return this.withTenant(data.tenantId, (repository) => repository.createRun(data, template));
  }

  listRuns(tenantId: string): Promise<readonly ChecklistRun[]> {
    return this.withTenant(tenantId, (repository) => repository.listRuns(tenantId));
  }

  getRun(tenantId: string, runId: string): Promise<RepositoryRunDetails | null> {
    return this.withTenant(tenantId, (repository) => repository.getRun(tenantId, runId));
  }

  updateRun(data: UpdateRunData): Promise<RepositoryRunDetails | null> {
    return this.withTenant(data.tenantId, (repository) => repository.updateRun(data));
  }

  completeRun(tenantId: string, runId: string, actorUserId: string, status: ChecklistRunStatus): Promise<RepositoryRunDetails | null> {
    return this.withTenant(tenantId, (repository) => repository.completeRun(tenantId, runId, actorUserId, status));
  }

  createAttachment(
    tenantId: string,
    runId: string,
    actorUserId: string,
    data: CreateChecklistAttachmentInput,
  ): Promise<ChecklistAttachment | null> {
    return this.withTenant(tenantId, (repository) => repository.createAttachment(tenantId, runId, actorUserId, data));
  }

  createMarker(
    tenantId: string,
    runId: string,
    actorUserId: string,
    data: CreateChecklistMarkerInput,
  ): Promise<ChecklistMarker | null> {
    return this.withTenant(tenantId, (repository) => repository.createMarker(tenantId, runId, actorUserId, data));
  }

  createAcknowledgement(
    tenantId: string,
    runId: string,
    actorUserId: string,
    data: CreateChecklistAcknowledgementInput,
  ): Promise<ChecklistAcknowledgement | null> {
    return this.withTenant(tenantId, (repository) => repository.createAcknowledgement(tenantId, runId, actorUserId, data));
  }

  createAuditEvent(event: ChecklistAuditEvent): Promise<void> {
    return this.withTenant(event.tenantId, (repository) => repository.createAuditEvent(event));
  }

  private withTenant<T>(
    tenantId: string,
    work: (repository: PrismaChecklistRepository) => Promise<T>,
  ): Promise<T> {
    return withTenantRls(this.prismaClient, tenantId, (tx) =>
      work(new PrismaChecklistRepository(tx as unknown as PrismaChecklistClient)),
    );
  }
}

export async function createPrismaChecklistRepository(): Promise<ChecklistRepository> {
  const { prisma } = await import("../../database/prisma.js");

  return new RlsPrismaChecklistRepository(prisma);
}

function mapTemplateRecord(record: unknown): ChecklistTemplate {
  const value = record as {
    id: string;
    tenant_id: string;
    name: string;
    description: string | null;
    type: ChecklistType;
    status: ChecklistStatus;
    version: number;
    schema: JsonRecord;
    created_by: string | null;
    updated_by: string | null;
    published_at: Date | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
    components?: unknown[];
  };

  return {
    id: value.id,
    tenantId: value.tenant_id,
    name: value.name,
    description: value.description ?? undefined,
    type: value.type,
    status: value.status,
    version: value.version,
    schema: value.schema,
    createdBy: value.created_by ?? undefined,
    updatedBy: value.updated_by ?? undefined,
    publishedAt: value.published_at ?? undefined,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
    deletedAt: value.deleted_at ?? undefined,
    components: (value.components ?? []).map(mapComponentRecord),
  };
}

function mapComponentRecord(record: unknown): ChecklistTemplateComponent {
  const value = record as {
    id: string;
    tenant_id: string;
    template_id: string;
    component_key: string;
    type: ChecklistComponentType;
    label: string;
    required: boolean;
    order_index: number;
    config: JsonRecord;
    validation_rules: JsonRecord;
    visibility_rules: JsonRecord;
    created_at: Date;
    updated_at: Date;
  };

  return {
    id: value.id,
    tenantId: value.tenant_id,
    templateId: value.template_id,
    componentKey: value.component_key,
    type: value.type,
    label: value.label,
    required: value.required,
    orderIndex: value.order_index,
    config: value.config,
    validationRules: value.validation_rules,
    visibilityRules: value.visibility_rules,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  };
}

function mapRunRecord(record: unknown): ChecklistRun {
  const value = record as {
    id: string;
    tenant_id: string;
    template_id: string;
    template_version: number;
    related_entity_type: string | null;
    related_entity_id: string | null;
    status: ChecklistRunStatus;
    started_by: string | null;
    completed_by: string | null;
    started_at: Date;
    completed_at: Date | null;
    created_at: Date;
    updated_at: Date;
  };

  return {
    id: value.id,
    tenantId: value.tenant_id,
    templateId: value.template_id,
    templateVersion: value.template_version,
    relatedEntityType: value.related_entity_type ?? undefined,
    relatedEntityId: value.related_entity_id ?? undefined,
    status: value.status,
    startedBy: value.started_by ?? undefined,
    completedBy: value.completed_by ?? undefined,
    startedAt: value.started_at,
    completedAt: value.completed_at ?? undefined,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  };
}

function mapRunDetailsRecord(record: unknown): RepositoryRunDetails {
  const value = record as {
    answers?: unknown[];
    attachments?: unknown[];
    markers?: unknown[];
    acknowledgements?: unknown[];
  };

  return {
    run: mapRunRecord(record),
    answers: (value.answers ?? []).map(mapAnswerRecord),
    attachments: (value.attachments ?? []).map(mapAttachmentRecord),
    markers: (value.markers ?? []).map(mapMarkerRecord),
    acknowledgements: (value.acknowledgements ?? []).map(mapAcknowledgementRecord),
  };
}

function mapAnswerRecord(record: unknown): ChecklistRunAnswer {
  const value = record as {
    id: string;
    tenant_id: string;
    run_id: string;
    component_id: string;
    value: unknown;
    metadata: JsonRecord;
    created_at: Date;
    updated_at: Date;
  };

  return {
    id: value.id,
    tenantId: value.tenant_id,
    runId: value.run_id,
    componentId: value.component_id,
    value: value.value,
    metadata: value.metadata,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  };
}

function mapAttachmentRecord(record: unknown): ChecklistAttachment {
  const value = record as {
    id: string;
    tenant_id: string;
    run_id: string;
    component_id: string;
    file_url: string;
    file_name: string | null;
    mime_type: string | null;
    size_bytes: number | null;
    metadata: JsonRecord;
    created_by: string | null;
    created_at: Date;
  };

  return {
    id: value.id,
    tenantId: value.tenant_id,
    runId: value.run_id,
    componentId: value.component_id,
    fileUrl: value.file_url,
    fileName: value.file_name ?? undefined,
    mimeType: value.mime_type ?? undefined,
    sizeBytes: value.size_bytes ?? undefined,
    metadata: value.metadata,
    createdBy: value.created_by ?? undefined,
    createdAt: value.created_at,
  };
}

function mapMarkerRecord(record: unknown): ChecklistMarker {
  const value = record as {
    id: string;
    tenant_id: string;
    run_id: string;
    component_id: string;
    x: number;
    y: number;
    marker_type: string;
    description: string | null;
    metadata: JsonRecord;
    created_by: string | null;
    created_at: Date;
  };

  return {
    id: value.id,
    tenantId: value.tenant_id,
    runId: value.run_id,
    componentId: value.component_id,
    x: value.x,
    y: value.y,
    markerType: value.marker_type,
    description: value.description ?? undefined,
    metadata: value.metadata,
    createdBy: value.created_by ?? undefined,
    createdAt: value.created_at,
  };
}

function mapAcknowledgementRecord(record: unknown): ChecklistAcknowledgement {
  const value = record as {
    id: string;
    tenant_id: string;
    run_id: string;
    acknowledged_by: string;
    message: string;
    observation: string | null;
    acknowledged_at: Date;
    metadata: JsonRecord;
  };

  return {
    id: value.id,
    tenantId: value.tenant_id,
    runId: value.run_id,
    acknowledgedBy: value.acknowledged_by,
    message: value.message,
    observation: value.observation ?? undefined,
    acknowledgedAt: value.acknowledged_at,
    metadata: value.metadata,
  };
}
