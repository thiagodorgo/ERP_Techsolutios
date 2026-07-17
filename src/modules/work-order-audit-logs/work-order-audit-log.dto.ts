import type { WorkOrderAuditLogEntry } from "./work-order-audit-log.types.js";

// Ω3F-8a — DTO da aba Logs (§2.8, allowlist). O DTO NUNCA emite tenant_id (recorte pelo ator
// autenticado). `actorName` é o NOME resolvido no backend (a UI mostra o nome, nunca o UUID; §11.2) —
// null quando irresolvível (o front cai em "Sistema"). `actorUserId` viaja apenas como referência
// técnica opaca (não é renderizado). `metadata` é RE-sanitizado na leitura: mesmo já curado na escrita,
// aqui removemos qualquer chave sensível/tenant que possa ter entrado por outro caminho de gravação.

// Chaves proibidas na saída (§2.8): tenant, token/segredo/senha, storage/bucket/path/base64/checksum/blob.
const forbiddenKeyPattern =
  /(authorization|access_?token|refresh_?token|password|passwd|pwd|secret|api_?key|token_hash|password_hash|refresh_token_hash|token|storage_?key|bucket|base64|checksum|blob|(^|_)path$|(^|_)path_|tenant_?id)/i;

export function toWorkOrderAuditLogDto(entry: WorkOrderAuditLogEntry, nameById?: ReadonlyMap<string, string>) {
  return {
    id: entry.id,
    action: entry.action,
    actorUserId: entry.actorUserId,
    actorName: entry.actorUserId ? nameById?.get(entry.actorUserId) ?? null : null,
    entity: entry.entity,
    entityId: entry.entityId,
    metadata: sanitizeMetadataForRead(entry.metadata),
    createdAt: entry.createdAt.toISOString(),
  };
}

export function toWorkOrderAuditLogListDto(
  entries: readonly WorkOrderAuditLogEntry[],
  nameById?: ReadonlyMap<string, string>,
) {
  return { items: entries.map((entry) => toWorkOrderAuditLogDto(entry, nameById)) };
}

// Redação defensiva de leitura: chave sensível → removida; recorre em objetos/arrays aninhados.
function sanitizeMetadataForRead(value: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!value) return null;
  const sanitized = sanitizeRecord(value);
  return Object.keys(sanitized).length > 0 ? sanitized : null;
}

function sanitizeRecord(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(record)) {
    if (forbiddenKeyPattern.test(key)) continue; // dropar a chave inteira (não vazar sequer o nome)
    const value = sanitizeValue(raw);
    if (value !== undefined) out[key] = value;
  }
  return out;
}

function sanitizeValue(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value.map(sanitizeValue).filter((item) => item !== undefined);
  if (typeof value === "object" && value !== null) return sanitizeRecord(value as Record<string, unknown>);
  return value;
}
