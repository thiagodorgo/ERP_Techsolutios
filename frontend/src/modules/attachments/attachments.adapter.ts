import type { AttachmentStatus, AttachmentView } from "./attachments.types";

// PR-01 Ω4C — normalização DEFENSIVA do AttachmentDto (clona a defesa de audit-events.adapter).
// NUNCA fabrica anexo (D-007): só normaliza o que o servidor enviou. Regras:
//  - item sem `id` string → descartado (sem identidade honesta);
//  - §2.8: SÓ os campos da allow-list entram no view. `storageKey`/`checksum`/`fileUrl`/`tenant_id`
//    NÃO existem no DTO e NÃO são lidos aqui — mesmo que apareçam no raw, são ignorados;
//  - `uploadedAt` (string|Date) → "dd/mm HH:mm" em America/Sao_Paulo; ausente/ inválido → "—";
//  - `extension` do campo próprio; se ausente, derivada do fileName; senão "—";
//  - ordena por instante DESC (mais recente primeiro); instante inválido/ausente vai para o fim.

const WHEN_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const KNOWN_STATUS: readonly AttachmentStatus[] = ["stored", "pending_review", "rejected", "scan_failed"];

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

// Aceita string|Date; qualquer coisa inválida → data nula (o item ainda é exibido com "—").
function toDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "string" && value.length > 0) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

// "dd/mm HH:mm" determinístico em America/Sao_Paulo (formatToParts evita a vírgula do locale pt-BR).
function formatWhen(date: Date): string {
  const parts = WHEN_FORMATTER.formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("day")}/${get("month")} ${get("hour")}:${get("minute")}`;
}

function toStatus(value: unknown): AttachmentStatus {
  const raw = nonEmptyString(value);
  return raw && (KNOWN_STATUS as readonly string[]).includes(raw) ? (raw as AttachmentStatus) : "pending_review";
}

function toSizeBytes(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

// Extensão honesta: do campo `extension`; se ausente, deriva do fileName; senão "—".
function toExtension(rawExtension: unknown, fileName: string): string {
  const explicit = nonEmptyString(rawExtension);
  if (explicit) return explicit.replace(/^\./, "").toLowerCase();
  const dot = fileName.lastIndexOf(".");
  if (dot > 0 && dot < fileName.length - 1) return fileName.slice(dot + 1).toLowerCase();
  return "—";
}

function adaptOne(raw: unknown): { view: AttachmentView; sortMs: number } | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;

  const id = nonEmptyString(row.id);
  if (!id) return null; // sem identidade honesta → descartado (D-007)

  const fileName = nonEmptyString(row.fileName) ?? "arquivo";
  const date = toDate(row.uploadedAt);

  // §2.8: a projeção só lê os campos da allow-list. storageKey/checksum/fileUrl/tenant_id ficam de
  // fora por construção — nem lidos do raw, nem colocados no view.
  const view: AttachmentView = {
    id,
    entityType: nonEmptyString(row.entityType) ?? "",
    entityId: nonEmptyString(row.entityId) ?? "",
    fileName,
    extension: toExtension(row.extension, fileName),
    contentType: nonEmptyString(row.contentType) ?? "",
    sizeBytes: toSizeBytes(row.sizeBytes),
    status: toStatus(row.status),
    downloadPath: nonEmptyString(row.downloadPath),
    uploadedByName: nonEmptyString(row.uploadedByName) ?? undefined,
    uploadedAt: date ? formatWhen(date) : "—",
  };
  return { view, sortMs: date ? date.getTime() : Number.NEGATIVE_INFINITY };
}

export function adaptAttachments(raw: unknown): AttachmentView[] {
  const list = Array.isArray(raw) ? raw : [];
  const adapted: { view: AttachmentView; sortMs: number }[] = [];
  for (const entry of list) {
    const one = adaptOne(entry);
    if (one) adapted.push(one);
  }
  adapted.sort((a, b) => b.sortMs - a.sortMs); // mais recente primeiro; inválidos ao fim
  return adapted.map((item) => item.view);
}

// "Tipo" na tabela (coluna do AutEM) a partir do contentType — rótulo PT-BR de negócio (§3), sem
// expor a string técnica de MIME crua como texto principal. Fallback: a extensão em maiúsculas.
export function contentTypeLabel(view: { contentType: string; extension: string }): string {
  const mime = view.contentType.toLowerCase();
  if (mime.startsWith("image/")) return "Imagem";
  if (mime === "application/pdf") return "PDF";
  if (mime.startsWith("video/")) return "Vídeo";
  if (mime.startsWith("audio/")) return "Áudio";
  if (mime.includes("spreadsheet") || mime.includes("excel") || mime.includes("csv")) return "Planilha";
  if (mime.includes("word") || mime.includes("document") || mime === "application/rtf") return "Documento";
  if (mime === "text/plain") return "Texto";
  const ext = view.extension && view.extension !== "—" ? view.extension.toUpperCase() : "";
  return ext || "Arquivo";
}

// Tamanho legível (usado no title/tooltip da linha; a grade do AutEM tem 3 colunas, sem coluna própria).
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = unit === 0 ? value : Math.round(value * 10) / 10;
  return `${String(rounded).replace(".", ",")} ${units[unit]}`;
}
