import type { MobileEvidenceRecord } from "../mobile/mobile-evidence.types.js";

/**
 * B-EVIDENCIA-INDICE (§5.3) — allowlist POSITIVA da leitura da evidência do app, no molde do
 * `work-order-attachment.dto.ts`. Só sai o que está escrito aqui.
 *
 * NUNCA sai: `storage_key`, `storage_provider`, `checksum_sha256`, `file_id`, `fingerprint_sha256`,
 * `tenant_id`, o `evidence_id` (ele carrega a organização dentro), o `client_evidence_id`, o `metadata` cru,
 * o nome de arquivo declarado pelo cliente, bucket, caminho ou URL (§2.8 do contrato; teste L6, mutação MU9).
 * O `downloadPath` é o caminho da rota do §5.1, montado com os dois ids públicos.
 */
export type WorkOrderEvidenceViewOptions = {
  /** Nomes legíveis por id de usuário (molde `uploadedByName`): a UI mostra o NOME, nunca o UUID. */
  readonly nameById?: ReadonlyMap<string, string>;
  /**
   * O leitor tem `field_location:read`? A posição da evidência é dado de localização de uma pessoa, e o
   * sistema já tem a permissão que governa ler posição: por isso `position` só aparece para quem a tem e
   * SOME — sem erro, sem campo nulo — para os demais (§5.3, leitura do planejador declarada; teste L9,
   * mutação MU16).
   */
  readonly canReadFieldLocation: boolean;
};

export function toWorkOrderEvidenceDto(record: MobileEvidenceRecord, options: WorkOrderEvidenceViewOptions) {
  const workOrderId = record.workOrderId ?? "";
  const stored = record.fileStatus === "stored";
  return {
    id: record.id,
    workOrderId,
    kind: record.kind,
    note: readText(record.metadata.note),
    signerName: readText(record.metadata.signer_name),
    capturedAt: record.localCreatedAt.toISOString(),
    createdAt: record.createdAt.toISOString(),
    createdBy: record.actorUserId,
    createdByName: options.nameById?.get(record.actorUserId) ?? null,
    // A observação não tem arquivo (§3.1: `file_status = none`); as demais trazem o status e, só quando
    // `stored`, o tipo VERIFICADO e o tamanho gravados na linha.
    file:
      record.fileStatus === "none"
        ? null
        : {
            status: record.fileStatus,
            mimeType: stored ? record.mimeType ?? null : null,
            sizeBytes: stored ? record.sizeBytes ?? null : null,
            downloadPath: `/api/v1/work-orders/${encodeURIComponent(workOrderId)}/evidences/${encodeURIComponent(record.id)}/download`,
          },
    ...(readPosition(record, options.canReadFieldLocation) ?? {}),
  };
}

export function toWorkOrderEvidenceListDto(records: readonly MobileEvidenceRecord[], options: WorkOrderEvidenceViewOptions) {
  return { items: records.map((record) => toWorkOrderEvidenceDto(record, options)) };
}

/** `position` só quando existe E o leitor tem `field_location:read`; sem ele a CHAVE não aparece (§5.3). */
function readPosition(
  record: MobileEvidenceRecord,
  canReadFieldLocation: boolean,
): { position: { lat: number; lng: number; accuracyM: number | null } } | undefined {
  if (!canReadFieldLocation) return undefined;

  const gps = record.metadata.gps;
  if (!isRecord(gps)) return undefined;

  const lat = readNumber(gps.lat);
  const lng = readNumber(gps.lng);
  if (lat === null || lng === null) return undefined;

  return { position: { lat, lng, accuracyM: readNumber(gps.accuracy_m) } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** "só texto" (§5.3): o que não é string não vira campo — nem `[object Object]`, nem eco de estrutura. */
function readText(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
