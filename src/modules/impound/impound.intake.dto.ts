import type { InspectionView } from "./impound.service.js";
import type {
  InspectionPhoto,
  IntakeInspection,
  SignatureStatus,
} from "./impound.intake.types.js";

// Labels PT-BR (neutralidade white-label — nada de "polícia"/público-alvo).
const SIGNATURE_LABELS: Record<SignatureStatus, string> = {
  SIGNED: "Assinado",
  REFUSED: "Recusado (presente = notificado, art. 14 §2º)",
  ABSENT: "Ausente",
};

// §allowlist / §2.8: tenant_id NUNCA sai; nenhum storage_key/token. odometer_km é STRING (Decimal(10,1)). Esta
// é a superfície do CONSOLE AUTENTICADO (impound:read/inspect); o portal público (PR-16) usará DTO próprio.
export function toIntakeInspectionDto(inspection: IntakeInspection) {
  return {
    id: inspection.id,
    processId: inspection.processId,
    inspectedAt: inspection.inspectedAt.toISOString(),
    agentName: inspection.agentName ?? null,
    bodyworkState: inspection.bodyworkState ?? null,
    paintState: inspection.paintState ?? null,
    tiresState: inspection.tiresState ?? null,
    internalObjects: inspection.internalObjects ?? null,
    missingEquipment: inspection.missingEquipment ?? null,
    odometerKm: inspection.odometerKm ?? null,
    observations: inspection.observations ?? null,
    signerName: inspection.signerName ?? null,
    signatureStatus: inspection.signatureStatus,
    signatureStatusLabel: SIGNATURE_LABELS[inspection.signatureStatus] ?? inspection.signatureStatus,
    signedAt: inspection.signedAt ? inspection.signedAt.toISOString() : null,
    completedAt: inspection.completedAt ? inspection.completedAt.toISOString() : null,
    completedBy: inspection.completedBy ?? null,
    createdBy: inspection.createdBy ?? null,
    updatedBy: inspection.updatedBy ?? null,
    createdAt: inspection.createdAt.toISOString(),
    updatedAt: inspection.updatedAt.toISOString(),
  };
}

// §2.8: só id/set/fileUrl/status/createdAt — o storage_key/opacos NUNCA voltam.
export function toInspectionPhotoDto(photo: InspectionPhoto) {
  return {
    id: photo.id,
    set: photo.set,
    fileUrl: photo.fileUrl,
    status: photo.status,
    createdAt: photo.createdAt.toISOString(),
  };
}

export function toInspectionViewDto(view: InspectionView) {
  return {
    inspection: toIntakeInspectionDto(view.inspection),
    photos: view.photos.map(toInspectionPhotoDto),
    requiredSets: [...view.requiredSets],
    complete: view.complete,
  };
}
