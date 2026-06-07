import { z } from "zod";

import {
  CHECKLIST_COMPONENT_TYPES,
  CHECKLIST_RUN_STATUSES,
  CHECKLIST_STATUSES,
  CHECKLIST_TYPES,
  type ChecklistComponentType,
  type ChecklistRunStatus,
  type ChecklistStatus,
  type ChecklistType,
  type JsonRecord,
} from "./checklist.types.js";

const jsonRecordSchema = z
  .record(z.unknown())
  .default({})
  .transform((value) => value as JsonRecord);

const checklistTypeSchema = z.enum(CHECKLIST_TYPES);
const checklistStatusSchema = z.enum(CHECKLIST_STATUSES);
const checklistRunStatusSchema = z.enum(CHECKLIST_RUN_STATUSES);
const componentTypeSchema = z.enum(CHECKLIST_COMPONENT_TYPES);

const componentSchema = z.object({
  componentKey: z.string().trim().min(1).optional(),
  type: componentTypeSchema,
  label: z.string().trim().min(1),
  required: z.boolean().default(false),
  orderIndex: z.number().int().nonnegative().optional(),
  config: jsonRecordSchema,
  validationRules: jsonRecordSchema,
  visibilityRules: jsonRecordSchema,
});

export type ChecklistComponentInput = {
  readonly componentKey?: string;
  readonly type: ChecklistComponentType;
  readonly label: string;
  readonly required: boolean;
  readonly orderIndex?: number;
  readonly config: JsonRecord;
  readonly validationRules: JsonRecord;
  readonly visibilityRules: JsonRecord;
};

export type CreateChecklistTemplateInput = {
  readonly name: string;
  readonly description?: string;
  readonly type: ChecklistType;
  readonly schema: JsonRecord;
  readonly components: readonly ChecklistComponentInput[];
};

export type UpdateChecklistTemplateInput = {
  readonly name?: string;
  readonly description?: string | null;
  readonly status?: ChecklistStatus;
  readonly schema?: JsonRecord;
  readonly components?: readonly ChecklistComponentInput[];
};

export type CreateChecklistRunInput = {
  readonly checklistId: string;
  readonly relatedEntityType?: string;
  readonly relatedEntityId?: string;
  readonly answers: readonly UpsertChecklistAnswerInput[];
};

export type UpdateChecklistRunInput = {
  readonly status?: ChecklistRunStatus;
  readonly answers: readonly UpsertChecklistAnswerInput[];
};

export type UpsertChecklistAnswerInput = {
  readonly componentId: string;
  readonly value: unknown;
  readonly metadata: JsonRecord;
};

export type CreateChecklistAttachmentInput = {
  readonly componentId: string;
  readonly fileUrl: string;
  readonly fileName?: string;
  readonly mimeType?: string;
  readonly sizeBytes?: number;
  readonly metadata: JsonRecord;
};

export type CreateChecklistMarkerInput = {
  readonly componentId: string;
  readonly x: number;
  readonly y: number;
  readonly markerType: string;
  readonly description?: string;
  readonly metadata: JsonRecord;
};

export type CompleteChecklistRunInput = {
  readonly hasDivergence: boolean;
  readonly observation?: string;
};

export type RegisterDivergenceInput = {
  readonly observation: string;
  readonly componentId: string;
  readonly fileUrl: string;
  readonly fileName?: string;
  readonly mimeType?: string;
  readonly metadata: JsonRecord;
};

export type CreateChecklistAcknowledgementInput = {
  readonly message: string;
  readonly observation?: string;
  readonly metadata: JsonRecord;
};

export function parseCreateChecklistTemplateDto(body: Record<string, unknown>): CreateChecklistTemplateInput {
  const parsed = z.object({
    name: z.string().trim().min(1),
    description: z.string().trim().min(1).optional(),
    type: checklistTypeSchema,
    schema: jsonRecordSchema,
    components: z.array(componentSchema).min(1),
  }).parse(body);

  return {
    ...parsed,
    components: normalizeComponents(parsed.components),
  };
}

export function parseUpdateChecklistTemplateDto(body: Record<string, unknown>): UpdateChecklistTemplateInput {
  const parsed = z.object({
    name: z.string().trim().min(1).optional(),
    description: z.union([z.string().trim().min(1), z.null()]).optional(),
    status: checklistStatusSchema.optional(),
    schema: jsonRecordSchema.optional(),
    components: z.array(componentSchema).min(1).optional(),
  }).parse(body);

  return {
    ...parsed,
    ...(parsed.components ? { components: normalizeComponents(parsed.components) } : {}),
  };
}

export function parseCreateChecklistRunDto(body: Record<string, unknown>): CreateChecklistRunInput {
  return z.object({
    checklistId: z.string().trim().min(1).optional(),
    templateId: z.string().trim().min(1).optional(),
    relatedEntityType: z.string().trim().min(1).optional(),
    relatedEntityId: z.string().trim().min(1).optional(),
    answers: z.array(answerSchema).default([]),
  }).transform((value, context) => {
    const checklistId = value.checklistId ?? value.templateId;

    if (!checklistId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["checklistId"],
        message: "checklistId is required.",
      });
      return z.NEVER;
    }

    return {
      checklistId,
      relatedEntityType: value.relatedEntityType,
      relatedEntityId: value.relatedEntityId,
      answers: value.answers,
    };
  }).parse(body);
}

export function parseUpdateChecklistRunDto(body: Record<string, unknown>): UpdateChecklistRunInput {
  return z.object({
    status: checklistRunStatusSchema.optional(),
    answers: z.array(answerSchema).default([]),
  }).parse(body);
}

export function parseCreateChecklistAttachmentDto(body: Record<string, unknown>): CreateChecklistAttachmentInput {
  return z.object({
    componentId: z.string().trim().min(1),
    fileUrl: z.string().trim().min(1),
    fileName: z.string().trim().min(1).optional(),
    mimeType: z.string().trim().min(1).optional(),
    sizeBytes: z.number().int().nonnegative().optional(),
    metadata: jsonRecordSchema,
  }).parse(body);
}

export function parseCreateChecklistMarkerDto(body: Record<string, unknown>): CreateChecklistMarkerInput {
  return z.object({
    componentId: z.string().trim().min(1),
    x: z.number(),
    y: z.number(),
    markerType: z.string().trim().min(1),
    description: z.string().trim().min(1).optional(),
    metadata: jsonRecordSchema,
  }).parse(body);
}

export function parseCompleteChecklistRunDto(body: Record<string, unknown>): CompleteChecklistRunInput {
  return z.object({
    hasDivergence: z.boolean().default(false),
    observation: z.string().trim().min(1).optional(),
  }).parse(body);
}

export function parseRegisterDivergenceDto(body: Record<string, unknown>): RegisterDivergenceInput {
  return z.object({
    observation: z.string().trim().min(1),
    componentId: z.string().trim().min(1),
    fileUrl: z.string().trim().min(1),
    fileName: z.string().trim().min(1).optional(),
    mimeType: z.string().trim().min(1).optional(),
    metadata: jsonRecordSchema,
  }).parse(body);
}

export function parseCreateChecklistAcknowledgementDto(body: Record<string, unknown>): CreateChecklistAcknowledgementInput {
  return z.object({
    message: z.string().trim().min(1),
    observation: z.string().trim().min(1).optional(),
    metadata: jsonRecordSchema,
  }).parse(body);
}

const answerValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.unknown()),
  z.record(z.unknown()),
]);

const answerSchema = z.object({
  componentId: z.string().trim().min(1),
  value: answerValueSchema,
  metadata: jsonRecordSchema,
});

function normalizeComponents(
  components: readonly z.infer<typeof componentSchema>[],
): ChecklistComponentInput[] {
  return components.map((component, index) => ({
    ...component,
    componentKey: component.componentKey ?? `${component.type}_${index + 1}`,
    orderIndex: component.orderIndex ?? index,
  }));
}
