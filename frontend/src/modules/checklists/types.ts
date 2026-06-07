export type TenantChecklistType = "towing_collection" | "towing_delivery" | "technical_evidence" | "custom";

export type TenantChecklistStatus = "draft" | "published" | "inactive" | "archived";

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

export type ChecklistJsonRecord = Record<string, string | number | boolean | null | string[] | number[] | boolean[]>;

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
  componentId: string;
  x: number;
  y: number;
  label: string;
  severity: "low" | "medium" | "high";
};

export type ChecklistAttachment = {
  id: string;
  componentId: string;
  kind: "photo" | "file" | "signature";
  url: string;
  capturedAt: string;
  metadata?: Record<string, string | number | boolean>;
};

export type ChecklistAcknowledgement = {
  id: string;
  label: string;
  accepted: boolean;
  acceptedBy?: string;
  acceptedAt?: string;
};

export type ChecklistRun = {
  id: string;
  checklistId: string;
  checklistVersion: number;
  type: TenantChecklistType;
  relatedEntityType: string;
  relatedEntityId: string;
  status: ChecklistRunStatus;
  markers: ChecklistMarker[];
  attachments: ChecklistAttachment[];
  acknowledgements: ChecklistAcknowledgement[];
  startedAt: string;
  completedAt?: string;
};
