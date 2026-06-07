import type {
  ChecklistAcknowledgement,
  ChecklistAttachment,
  ChecklistMarker,
  ChecklistRun,
  ChecklistRunAnswer,
  ChecklistTemplate,
  ChecklistTemplateComponent,
} from "./checklist.types.js";

export function toChecklistTemplateDto(template: ChecklistTemplate) {
  return {
    id: template.id,
    tenantId: template.tenantId,
    name: template.name,
    description: template.description ?? null,
    type: template.type,
    status: template.status,
    version: template.version,
    schema: template.schema,
    createdBy: template.createdBy ?? null,
    updatedBy: template.updatedBy ?? null,
    publishedAt: template.publishedAt?.toISOString() ?? null,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
    deletedAt: template.deletedAt?.toISOString() ?? null,
    components: template.components.map(toChecklistTemplateComponentDto),
  };
}

export function toChecklistTemplateComponentDto(component: ChecklistTemplateComponent) {
  return {
    id: component.id,
    tenantId: component.tenantId,
    templateId: component.templateId,
    componentKey: component.componentKey,
    type: component.type,
    label: component.label,
    required: component.required,
    orderIndex: component.orderIndex,
    config: component.config,
    validationRules: component.validationRules,
    visibilityRules: component.visibilityRules,
    createdAt: component.createdAt.toISOString(),
    updatedAt: component.updatedAt.toISOString(),
  };
}

export function toChecklistRunDto(run: ChecklistRun) {
  return {
    id: run.id,
    tenantId: run.tenantId,
    templateId: run.templateId,
    templateVersion: run.templateVersion,
    relatedEntityType: run.relatedEntityType ?? null,
    relatedEntityId: run.relatedEntityId ?? null,
    status: run.status,
    startedBy: run.startedBy ?? null,
    completedBy: run.completedBy ?? null,
    startedAt: run.startedAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
  };
}

export function toChecklistRunAnswerDto(answer: ChecklistRunAnswer) {
  return {
    id: answer.id,
    tenantId: answer.tenantId,
    runId: answer.runId,
    componentId: answer.componentId,
    value: answer.value,
    metadata: answer.metadata,
    createdAt: answer.createdAt.toISOString(),
    updatedAt: answer.updatedAt.toISOString(),
  };
}

export function toChecklistAttachmentDto(attachment: ChecklistAttachment) {
  return {
    id: attachment.id,
    tenantId: attachment.tenantId,
    runId: attachment.runId,
    componentId: attachment.componentId,
    fileUrl: attachment.fileUrl,
    fileName: attachment.fileName ?? null,
    mimeType: attachment.mimeType ?? null,
    sizeBytes: attachment.sizeBytes ?? null,
    metadata: attachment.metadata,
    createdBy: attachment.createdBy ?? null,
    createdAt: attachment.createdAt.toISOString(),
  };
}

export function toChecklistMarkerDto(marker: ChecklistMarker) {
  return {
    id: marker.id,
    tenantId: marker.tenantId,
    runId: marker.runId,
    componentId: marker.componentId,
    x: marker.x,
    y: marker.y,
    markerType: marker.markerType,
    description: marker.description ?? null,
    metadata: marker.metadata,
    createdBy: marker.createdBy ?? null,
    createdAt: marker.createdAt.toISOString(),
  };
}

export function toChecklistAcknowledgementDto(acknowledgement: ChecklistAcknowledgement) {
  return {
    id: acknowledgement.id,
    tenantId: acknowledgement.tenantId,
    runId: acknowledgement.runId,
    acknowledgedBy: acknowledgement.acknowledgedBy,
    message: acknowledgement.message,
    observation: acknowledgement.observation ?? null,
    acknowledgedAt: acknowledgement.acknowledgedAt.toISOString(),
    metadata: acknowledgement.metadata,
  };
}
