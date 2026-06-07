export type TenantChecklistType = "towing_collection" | "towing_delivery" | "technical_evidence" | "custom";

export type TenantChecklistStatus = "draft" | "published" | "inactive";

export type TenantChecklistComponentType =
  | "text"
  | "textarea"
  | "number"
  | "currency"
  | "date"
  | "datetime"
  | "select"
  | "multi_select"
  | "checkbox"
  | "radio"
  | "boolean"
  | "photo"
  | "file"
  | "signature"
  | "barcode"
  | "qr_code"
  | "location"
  | "rating"
  | "vehicle_type"
  | "damage_marker"
  | "before_after_photo"
  | "acknowledgement";

export type TenantChecklistComponent = {
  id: string;
  key: string;
  label: string;
  type: TenantChecklistComponentType;
  required: boolean;
  orderIndex: number;
  config?: {
    requirePhoto?: boolean;
    requireObservation?: boolean;
    requireMarker?: boolean;
    requireAcknowledgement?: boolean;
    options?: string[];
  };
};

export type TenantChecklist = {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  type: TenantChecklistType;
  status: TenantChecklistStatus;
  version: number;
  components: TenantChecklistComponent[];
  publishedAt?: string;
  updatedAt: string;
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
  status: "in_progress" | "completed" | "cancelled";
  markers: ChecklistMarker[];
  attachments: ChecklistAttachment[];
  acknowledgements: ChecklistAcknowledgement[];
  startedAt: string;
  completedAt?: string;
};
