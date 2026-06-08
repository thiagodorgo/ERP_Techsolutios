import type {
  ChecklistAttachment,
  ChecklistMarker,
  ChecklistRenderSchema,
  ChecklistRuntimeComponent,
  ChecklistRunAnswer,
} from "./types";

export type ChecklistRuntimeAnswers = Record<string, unknown>;

export type ChecklistRuntimeValidationError = {
  componentId: string;
  message: string;
};

export type ChecklistRuntimeProgress = {
  requiredTotal: number;
  requiredCompleted: number;
  percent: number;
  missingLabels: string[];
};

export function validateChecklistRuntime(
  schema: ChecklistRenderSchema,
  answers: ChecklistRuntimeAnswers,
  attachments: readonly ChecklistAttachment[],
  markers: readonly ChecklistMarker[],
): ChecklistRuntimeValidationError[] {
  return schema.components.flatMap((component) => validateComponent(component, answers, attachments, markers));
}

export function calculateChecklistRuntimeProgress(
  schema: ChecklistRenderSchema,
  answers: ChecklistRuntimeAnswers,
  attachments: readonly ChecklistAttachment[],
  markers: readonly ChecklistMarker[],
): ChecklistRuntimeProgress {
  const requiredComponents = schema.components.filter(isRequiredForProgress);
  const errors = validateChecklistRuntime(schema, answers, attachments, markers);
  const invalidIds = new Set(errors.map((error) => error.componentId));
  const requiredCompleted = requiredComponents.filter((component) => !invalidIds.has(component.id)).length;
  const requiredTotal = requiredComponents.length;

  return {
    requiredTotal,
    requiredCompleted,
    percent: requiredTotal === 0 ? 100 : Math.round((requiredCompleted / requiredTotal) * 100),
    missingLabels: requiredComponents.filter((component) => invalidIds.has(component.id)).map((component) => component.label),
  };
}

export function toRunAnswers(answers: ChecklistRuntimeAnswers): ChecklistRunAnswer[] {
  return Object.entries(answers)
    .filter(([, value]) => value !== undefined && value !== null && value !== "" && !isEmptyAcknowledgement(value))
    .map(([componentId, value]) => ({
      componentId,
      value,
      metadata: {},
    }));
}

export function readAcknowledgementValue(value: unknown): { accepted: boolean; observation: string } {
  if (value === true) return { accepted: true, observation: "" };
  if (!isRecord(value)) return { accepted: false, observation: "" };

  return {
    accepted: value.accepted === true,
    observation: readString(value.observation) ?? "",
  };
}

export function requiresAcknowledgementObservation(component: ChecklistRuntimeComponent): boolean {
  return readBoolean(component.config.requireObservation) || readBoolean(component.validationRules.requireObservation);
}

export function readConfiguredMessage(component: ChecklistRuntimeComponent, fallback: string): string {
  return readString(component.config.message) ?? readString(component.config.acknowledgementText) ?? fallback;
}

function validateComponent(
  component: ChecklistRuntimeComponent,
  answers: ChecklistRuntimeAnswers,
  attachments: readonly ChecklistAttachment[],
  markers: readonly ChecklistMarker[],
): ChecklistRuntimeValidationError[] {
  if (!isRequiredForProgress(component)) return [];

  const componentAttachments = attachments.filter((attachment) => attachment.componentId === component.id);
  const componentMarkers = markers.filter((marker) => marker.componentId === component.id);

  if (component.type === "photo_upload") {
    const minPhotos = Math.max(readNumber(component.config.minPhotos) ?? 1, 1);
    return componentAttachments.length >= minPhotos
      ? []
      : [{ componentId: component.id, message: `Envie ao menos ${minPhotos} evidencia(s) para ${component.label}.` }];
  }

  if (component.type === "before_after") {
    const before = componentAttachments.some((attachment) => attachment.metadata?.stage === "before");
    const after = componentAttachments.some((attachment) => attachment.metadata?.stage === "after");
    return before && after
      ? []
      : [{ componentId: component.id, message: `Envie evidencias antes e depois para ${component.label}.` }];
  }

  if (component.type === "damage_map") {
    const hasMarker = componentMarkers.some((marker) => marker.description?.trim() && marker.markerType.trim());
    return hasMarker ? [] : [{ componentId: component.id, message: `Registre ao menos um marcador com tipo e descricao em ${component.label}.` }];
  }

  if (component.type === "acknowledgement") {
    const acknowledgement = readAcknowledgementValue(answers[component.id]);
    if (!acknowledgement.accepted) {
      return [{ componentId: component.id, message: `Confirme a ciencia obrigatoria em ${component.label}.` }];
    }
    if (requiresAcknowledgementObservation(component) && !acknowledgement.observation.trim()) {
      return [{ componentId: component.id, message: `Informe a observacao obrigatoria da ciencia em ${component.label}.` }];
    }
    return [];
  }

  if (component.type === "observation" || component.type === "vehicle_selector") {
    const value = answers[component.id];
    return typeof value === "string" && value.trim()
      ? []
      : [{ componentId: component.id, message: `Preencha o campo obrigatorio ${component.label}.` }];
  }

  return [];
}

function isRequiredForProgress(component: ChecklistRuntimeComponent): boolean {
  if (component.type === "comparison") return false;
  if (component.required) return true;
  if (component.type === "photo_upload") return (readNumber(component.config.minPhotos) ?? 0) > 0;
  if (component.type === "before_after") return readBoolean(component.config.requireBothStages);
  if (component.type === "damage_map") return readBoolean(component.config.requireMarker);
  if (component.type === "acknowledgement") return readBoolean(component.config.requireAcknowledgement);
  return false;
}

function isEmptyAcknowledgement(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return value.accepted !== true && !readString(value.observation);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readBoolean(value: unknown): boolean {
  return value === true || value === "true";
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
