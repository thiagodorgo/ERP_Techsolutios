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

// Mobile-facing template DTO for GET /api/v1/mobile/checklists/available.
// Maps the persisted template to the contract the Flutter B-100 client parses:
// it exposes `title` (from name), `schema_version` (from version), and a
// normalized `status` ("published" -> "active") so the app's `activeTemplates`
// filter keeps published templates. Snake_case is primary; the Flutter parser is
// also camelCase-tolerant. Kept separate from `toChecklistTemplateDto` so the
// web/tenant template contract is unaffected.
// CHECKLIST P1 PR-01 — plumba as opções de escolha (single_choice/multi_choice) para o TOPO do item, na forma
// [{value,label}] que o parser do app lê (`j['options']` → _optionFromJson espera {value,label}). No backend as
// opções vivem em `config.options` como string[] (o validator exige lista não-vazia de strings) — aqui sintetizamos
// value=label=string. Sem isso, o campo de escolha authorado na web cai em "Componente não suportado" no app
// (achado ALTA da junta: as opções não chegavam ao mobile — nem no lugar, nem na forma). signature não usa opções.
function toMobileChoiceOptions(component: ChecklistTemplate["components"][number]): Array<{ value: string; label: string }> | undefined {
  if (component.type !== "single_choice" && component.type !== "multi_choice") return undefined;
  const raw = (component.config as Record<string, unknown>).options;
  if (!Array.isArray(raw)) return undefined;
  const options = raw
    .filter((opt): opt is string => typeof opt === "string" && opt.trim().length > 0)
    .map((opt) => ({ value: opt, label: opt }));
  return options.length > 0 ? options : undefined;
}

export function toMobileChecklistTemplateDto(template: ChecklistTemplate) {
  const items = [...template.components]
    .sort((left, right) => left.orderIndex - right.orderIndex)
    .map((component) => {
      const options = toMobileChoiceOptions(component);
      return {
        id: component.id,
        label: component.label,
        type: component.type,
        required: component.required,
        order: component.orderIndex,
        ...(options ? { options } : {}),
      };
    });

  return {
    id: template.id,
    tenant_id: template.tenantId,
    code: template.type,
    name: template.name,
    title: template.name,
    description: template.description ?? null,
    version: template.version,
    schema_version: `v${template.version}`,
    status: toMobileChecklistTemplateStatus(template.status),
    is_required: false,
    category: template.type,
    work_order_type: template.type,
    linked_work_order_type: template.type,
    module: "tenant_checklist",
    updated_at: template.updatedAt.toISOString(),
    items,
  };
}

// Ω3-c — snapshot imutável do template para congelar no despacho. Reusa toMobileChecklistTemplateDto
// (produz objetos NOVOS = deep-copy dos items) e REMOVE `tenant_id` (§2.8 allowlist — nunca sai do
// backend na cópia). Só labels/tipos/ordem (sem PII de cliente). O consumo é Ω3-c.1.
export function buildChecklistSnapshot(template: ChecklistTemplate): Record<string, unknown> {
  const { tenant_id: _omitTenant, ...templateBody } = toMobileChecklistTemplateDto(template);
  return {
    contract: "checklist_snapshot@2026-07-31.omega3c",
    frozen_at: new Date().toISOString(),
    template_id: template.id,
    template_version: template.version,
    template_status: template.status,
    template: templateBody,
  };
}

function toMobileChecklistTemplateStatus(status: ChecklistTemplate["status"]): string {
  return status === "published" ? "active" : status;
}

export function toChecklistTemplateComponentDto(component: ChecklistTemplateComponent) {
  // CHECKLIST P1 PR-01 — o run screen do app lê ESTE DTO (via GET /mobile/checklists/:id/render → getSchema →
  // _fieldFromJson, que lê `j['options']` no topo). Por isso as opções de escolha são plumbadas aqui também, na
  // forma [{value,label}], além do config cru. NOTA: o loop mobile só fecha DE FATO quando P-CHK-RENDER-ENVELOPE
  // for resolvido (hoje o parser do envelope de /render estoura e o app cai no fallback de seeds — pré-existente,
  // afeta TODOS os tipos). Este é o DTO correto para plumbar; o fechamento fim-a-fim é da PR de render mobile.
  const options = toMobileChoiceOptions(component);
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
    ...(options ? { options } : {}),
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
  const hasManagedStorage =
    typeof attachment.metadata.storageKey === "string" &&
    (attachment.metadata.storageProvider === "local" ||
      attachment.metadata.storageProvider === "s3" ||
      attachment.metadata.storageDriver === "local" ||
      attachment.metadata.storageDriver === "s3");

  return {
    id: attachment.id,
    tenantId: attachment.tenantId,
    runId: attachment.runId,
    componentId: attachment.componentId,
    fileUrl: hasManagedStorage
      ? `/api/v1/mobile/checklist-runs/${encodeURIComponent(attachment.runId)}/attachments/${encodeURIComponent(attachment.id)}/download`
      : attachment.fileUrl,
    fileName: attachment.fileName ?? null,
    mimeType: attachment.mimeType ?? null,
    sizeBytes: attachment.sizeBytes ?? null,
    metadata: toPublicAttachmentMetadata(attachment.metadata),
    createdBy: attachment.createdBy ?? null,
    createdAt: attachment.createdAt.toISOString(),
  };
}

function toPublicAttachmentMetadata(metadata: Record<string, unknown>) {
  const {
    storageDriver: _storageDriver,
    storageProvider: _storageProvider,
    storageKey: _storageKey,
    bucket: _bucket,
    path: _path,
    privateUrl: _privateUrl,
    ...publicMetadata
  } = metadata;

  return publicMetadata;
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
