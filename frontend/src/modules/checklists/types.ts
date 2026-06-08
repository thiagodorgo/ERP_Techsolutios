export type TenantChecklistType = "towing_collection" | "towing_delivery" | "technical_evidence" | "custom";

export type TenantChecklistStatus = "draft" | "published" | "inactive" | "archived";

export type TenantChecklistUiState = "pending_changes";

export type TenantChecklistComponentType =
  | "vehicle_selector"
  | "damage_map"
  | "photo_upload"
  | "observation"
  | "comparison"
  | "before_after"
  | "acknowledgement";

export type ChecklistRunStatus =
  | "in_progress"
  | "completed"
  | "completed_with_divergence"
  | "pending_acknowledgement"
  | "cancelled";

export type ChecklistJsonPrimitive = string | number | boolean | null;
export type ChecklistJsonValue =
  | ChecklistJsonPrimitive
  | ChecklistJsonValue[]
  | { readonly [key: string]: ChecklistJsonValue };
export type ChecklistJsonRecord = Record<string, ChecklistJsonValue>;

export type ChecklistAttachmentMetadata = Record<string, unknown> & {
  storageDriver?: string;
  storageKey?: string;
  checksumSha256?: string;
};

export type ChecklistRuntimeComponentType = TenantChecklistComponentType;

export type TenantChecklistComponent = {
  id: string;
  tenantId?: string;
  templateId?: string;
  componentKey: string;
  label: string;
  type: TenantChecklistComponentType;
  required: boolean;
  orderIndex: number;
  config: ChecklistJsonRecord;
  validationRules: ChecklistJsonRecord;
  visibilityRules: ChecklistJsonRecord;
  createdAt?: string;
  updatedAt?: string;
};

export type ChecklistAvailableItem = TenantChecklist;

export type ChecklistRuntimeComponent = TenantChecklistComponent;

export type ChecklistRenderSchema = {
  id: string;
  name: string;
  description?: string;
  type: TenantChecklistType;
  version: number;
  schema: Record<string, unknown>;
  components: ChecklistRuntimeComponent[];
};

export type TenantChecklistComponentCatalogItem = {
  type: TenantChecklistComponentType;
  label: string;
  description: string;
  defaultConfig: ChecklistJsonRecord;
};

export type TenantChecklist = {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: TenantChecklistType;
  status: TenantChecklistStatus;
  version: number;
  schema: Record<string, unknown>;
  components: TenantChecklistComponent[];
  createdBy?: string;
  updatedBy?: string;
  publishedAt?: string;
  createdAt?: string;
  updatedAt: string;
  deletedAt?: string;
};

export type ChecklistApiContext = {
  token?: string;
  tenantId: string;
  branchId?: string;
  role: string;
  permissions: string[];
};

export type TenantChecklistComponentInput = {
  componentKey: string;
  type: TenantChecklistComponentType;
  label: string;
  required: boolean;
  orderIndex: number;
  config: ChecklistJsonRecord;
  validationRules: ChecklistJsonRecord;
  visibilityRules: ChecklistJsonRecord;
};

export type TenantChecklistBuilderComponent = TenantChecklistComponentInput & {
  id: string;
};

export type TenantChecklistBuilderDraft = {
  name: string;
  description: string;
  type: TenantChecklistType;
  components: TenantChecklistBuilderComponent[];
};

export type CreateTenantChecklistInput = {
  name: string;
  description?: string;
  type: TenantChecklistType;
  schema: Record<string, unknown>;
  components: TenantChecklistComponentInput[];
};

export type UpdateTenantChecklistInput = Partial<CreateTenantChecklistInput> & {
  status?: TenantChecklistStatus;
};

export type ChecklistMarker = {
  id: string;
  tenantId?: string;
  runId?: string;
  componentId: string;
  x: number;
  y: number;
  markerType: string;
  description?: string;
  metadata?: ChecklistJsonRecord;
  createdBy?: string;
  createdAt?: string;
  label?: string;
  severity?: "low" | "medium" | "high";
};

export type ChecklistAttachment = {
  id: string;
  tenantId?: string;
  runId: string;
  componentId: string;
  fileUrl: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  metadata: ChecklistAttachmentMetadata;
  createdBy?: string;
  createdAt: string;
  checksum?: string;
  storageDriver?: string;
  storageKey?: string;
};

export type ChecklistAttachmentUploadInput = {
  context: ChecklistApiContext;
  runId: string;
  componentId: string;
  file: File;
  metadata?: ChecklistAttachmentMetadata;
};

export type ChecklistAttachmentUploadResult = {
  attachment: ChecklistAttachment;
};

export type ChecklistAttachmentDownloadResult = {
  blob: Blob;
  objectUrl: string;
  fileName: string;
  mimeType: string;
};

export type ChecklistAcknowledgement = {
  id: string;
  tenantId?: string;
  runId?: string;
  acknowledgedBy?: string;
  message: string;
  observation?: string;
  acknowledgedAt?: string;
  metadata?: ChecklistJsonRecord;
  label?: string;
  accepted?: boolean;
  acceptedBy?: string;
  acceptedAt?: string;
};

export type ChecklistRunAnswer = {
  id?: string;
  tenantId?: string;
  runId?: string;
  componentId: string;
  value: unknown;
  metadata?: ChecklistJsonRecord;
  createdAt?: string;
  updatedAt?: string;
};

export type ChecklistRun = {
  id: string;
  tenantId?: string;
  templateId: string;
  templateVersion: number;
  checklistId?: string;
  checklistVersion?: number;
  type?: TenantChecklistType;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  status: ChecklistRunStatus;
  startedBy?: string | null;
  completedBy?: string | null;
  startedAt: string;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  markers?: ChecklistMarker[];
  attachments?: ChecklistAttachment[];
  acknowledgements?: ChecklistAcknowledgement[];
  answers?: ChecklistRunAnswer[];
};

export type ChecklistRunDetails = {
  run: ChecklistRun;
  answers: ChecklistRunAnswer[];
  attachments: ChecklistAttachment[];
  markers: ChecklistMarker[];
  acknowledgements: ChecklistAcknowledgement[];
};

export type CreateChecklistRunInput = {
  checklistId: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  answers?: ChecklistRunAnswer[];
};

export type UpdateChecklistRunInput = {
  status?: ChecklistRunStatus;
  answers: ChecklistRunAnswer[];
};

export type CreateChecklistMarkerInput = {
  componentId: string;
  x: number;
  y: number;
  markerType: string;
  description?: string;
  metadata?: ChecklistJsonRecord;
};

export type ChecklistDivergence = {
  componentId: string;
  fileUrl: string;
  fileName?: string;
  mimeType?: string;
  observation: string;
  metadata?: ChecklistJsonRecord;
};

export type CreateChecklistAcknowledgementInput = {
  message: string;
  observation?: string;
  metadata?: ChecklistJsonRecord;
};

export type ChecklistRunComparison = {
  run: ChecklistRun;
  template?: TenantChecklist | null;
  answers: ChecklistRunAnswer[];
  attachments: ChecklistAttachment[];
  markers: ChecklistMarker[];
  comparison: {
    status: ChecklistRunStatus;
    divergence: boolean;
  };
};
