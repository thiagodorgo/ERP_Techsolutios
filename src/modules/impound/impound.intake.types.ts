// Ω5P PR-06 — Vistoria de recepção (Res. CONTRAN 1025/2026 art. 9º I / art. 14). Tipos + enums em INGLÊS
// validados na APP (SEM enum-CHECK no banco); labels PT-BR no DTO. km = Decimal(10,1) → string na fronteira.

// SET codes dos conjuntos fotográficos (art. 9º I "imagens do estado físico" + art. 14 §1º lataria/pintura/
// pneus/objetos). App-validado NO SERVIDOR no upload (nunca metadata livre do cliente). O default federal e o
// override por perfil vivem em impound.intake.ts.
export const PHOTO_SET_CODES = [
  "FRONT",
  "REAR",
  "LEFT",
  "RIGHT",
  "ROOF",
  "DASH_PANEL",
  "ENGINE",
  "CHASSIS_ID",
  "ODOMETER",
  "INNER_OBJECTS",
  "DAMAGES",
] as const;
export type PhotoSetCode = (typeof PHOTO_SET_CODES)[number];

// art. 14 §2º — presente no ato = notificado, ainda que se recuse a assinar.
export const SIGNATURE_STATUSES = ["SIGNED", "REFUSED", "ABSENT"] as const;
export type SignatureStatus = (typeof SIGNATURE_STATUSES)[number];

export type IntakeInspection = {
  readonly id: string;
  readonly tenantId: string;
  readonly processId: string;
  readonly inspectedAt: Date;
  readonly agentName?: string;
  readonly bodyworkState?: string;
  readonly paintState?: string;
  readonly tiresState?: string;
  readonly internalObjects?: string;
  readonly missingEquipment?: string;
  readonly odometerKm?: string; // Decimal(10,1) como STRING (invariante; nunca number)
  readonly observations?: string;
  readonly signerName?: string;
  readonly signatureStatus: SignatureStatus;
  readonly signedAt?: Date;
  readonly completedAt?: Date;
  readonly completedBy?: string;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

// Foto da vistoria = Attachment polimórfico REUSADO (entity_type="impound_intake_inspection"). §allowlist: o
// storage_key NUNCA sai (só id/set/fileUrl/status para o console autenticado).
export type InspectionPhoto = {
  readonly id: string;
  readonly set: PhotoSetCode;
  readonly fileUrl: string;
  readonly status: string;
  readonly createdAt: Date;
};

export type UpsertIntakeInspectionInput = {
  readonly tenantId: string;
  readonly processId: string;
  readonly inspectedAt?: Date;
  readonly agentName?: string | null;
  readonly bodyworkState?: string | null;
  readonly paintState?: string | null;
  readonly tiresState?: string | null;
  readonly internalObjects?: string | null;
  readonly missingEquipment?: string | null;
  readonly odometerKm?: string | null;
  readonly observations?: string | null;
  readonly signerName?: string | null;
  readonly signatureStatus?: SignatureStatus;
  readonly signedAt?: Date | null;
  readonly actorId?: string;
};

export type AddInspectionPhotoInput = {
  readonly tenantId: string;
  readonly processId: string;
  readonly inspectionId: string;
  readonly set: PhotoSetCode;
  readonly fileUrl: string;
  readonly fileName?: string;
  readonly contentType?: string;
  readonly checksumSha256?: string;
  readonly storageProvider?: string;
  readonly storageKey?: string;
  readonly actorId?: string;
  readonly occurredAt: Date;
};

export type CompleteInspectionInput = {
  readonly tenantId: string;
  readonly processId: string;
  readonly actorId?: string;
  readonly occurredAt: Date;
};

// Estado bruto que o repositório entrega ao predicado I3 (completude determinística in-module). Os requiredSets
// já vêm resolvidos (default federal aplicado) pelo serviço.
export type IntakeState = {
  readonly inspection?: IntakeInspection;
  readonly storedSets: readonly string[];
  readonly profileRequiredSets: readonly string[] | null;
};
