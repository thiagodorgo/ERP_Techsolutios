import type {
  CustodyEventItem,
  CustodyEventType,
  ImpoundStatus,
  InspectionData,
  InspectionPhotoItem,
  InspectionView,
  ProcessCreateFieldError,
  ProcessCreatePayload,
  ProcessDetail,
  ProcessesData,
  ProcessesFilters,
  ProcessesPagination,
  ProcessListItem,
  SignatureStatus,
  VerifyResult,
} from "./processes.types";

type ChipTone = "default" | "success" | "warning" | "danger" | "info" | "pending" | "audit";

const AUTHORITY_MAX = 200;
const PLATE_MAX = 10;
const REASON_MAX = 400;

const STATUSES: readonly ImpoundStatus[] = [
  "IN_REMOVAL", "RECEPTION", "ACTIVE_CUSTODY", "RELEASE_IN_PROGRESS", "RELEASED_FOR_REPAIR", "RELEASED",
  "AUCTION_ELIGIBLE", "AUCTION_PREP", "LOTTED", "AUCTIONED", "AUCTION_CLOSED", "DIRECT_RECYCLING",
  "JUDICIAL_HOLD", "CLOSED",
];

const EVENT_TYPES: readonly CustodyEventType[] = [
  "RECEPTION", "INSPECTION", "SPOT_ASSIGNED", "SPOT_MOVED", "YARD_TRANSFER", "PHOTO_SET", "CHARGE_ACCRUAL",
  "NOTIFICATION", "STATUS_CHANGE", "RELEASE", "AUCTION_PREP", "AUCTION_LOTTED", "AUCTION_SOLD",
  "AUCTION_CLOSED", "ADJUSTMENT",
];

const SIGNATURE_STATUSES: readonly SignatureStatus[] = ["SIGNED", "REFUSED", "ABSENT"];

// Rótulos PT-BR de FALLBACK (o backend já devolve *Label; a UI reusa e só cai aqui se ausente). White-label.
const STATUS_LABELS: Record<ImpoundStatus, string> = {
  IN_REMOVAL: "Em remoção",
  RECEPTION: "Recepção",
  ACTIVE_CUSTODY: "Custódia ativa",
  RELEASE_IN_PROGRESS: "Liberação em andamento",
  RELEASED_FOR_REPAIR: "Liberado para reparo",
  RELEASED: "Liberado",
  AUCTION_ELIGIBLE: "Elegível a leilão",
  AUCTION_PREP: "Em preparação de leilão",
  LOTTED: "Loteado",
  AUCTIONED: "Arrematado",
  AUCTION_CLOSED: "Leilão encerrado",
  DIRECT_RECYCLING: "Reciclagem direta",
  JUDICIAL_HOLD: "Bloqueio judicial",
  CLOSED: "Encerrado",
};

const EVENT_TYPE_LABELS: Record<CustodyEventType, string> = {
  RECEPTION: "Recepção",
  INSPECTION: "Vistoria",
  SPOT_ASSIGNED: "Vaga atribuída",
  SPOT_MOVED: "Vaga movida",
  YARD_TRANSFER: "Transferência de pátio",
  PHOTO_SET: "Conjunto fotográfico",
  CHARGE_ACCRUAL: "Acúmulo de diária",
  NOTIFICATION: "Notificação",
  STATUS_CHANGE: "Mudança de estado",
  RELEASE: "Liberação",
  AUCTION_PREP: "Preparação de leilão",
  AUCTION_LOTTED: "Loteamento",
  AUCTION_SOLD: "Arrematação",
  AUCTION_CLOSED: "Leilão encerrado",
  ADJUSTMENT: "Ajuste (correção retroativa)",
};

// §11 — Chip semântico por estado: custódia ativa=verde, recepção=azul, bloqueio judicial=vermelho,
// elegível-leilão=âmbar. Os demais estados usam a família mais próxima (neutro/andamento).
const STATUS_TONES: Record<ImpoundStatus, ChipTone> = {
  IN_REMOVAL: "pending",
  RECEPTION: "info",
  ACTIVE_CUSTODY: "success",
  RELEASE_IN_PROGRESS: "info",
  RELEASED_FOR_REPAIR: "info",
  RELEASED: "default",
  AUCTION_ELIGIBLE: "warning",
  AUCTION_PREP: "warning",
  LOTTED: "warning",
  AUCTIONED: "warning",
  AUCTION_CLOSED: "default",
  DIRECT_RECYCLING: "danger",
  JUDICIAL_HOLD: "danger",
  CLOSED: "default",
};

const SIGNATURE_LABELS: Record<SignatureStatus, string> = {
  SIGNED: "Assinado",
  REFUSED: "Recusado (presente = notificado, art. 14 §2º)",
  ABSENT: "Ausente",
};

export function getStatusLabel(status: ImpoundStatus | string | null | undefined): string {
  return STATUS_LABELS[(status ?? "IN_REMOVAL") as ImpoundStatus] ?? "Processo";
}

export function getStatusTone(status: ImpoundStatus | string | null | undefined): ChipTone {
  return STATUS_TONES[(status ?? "IN_REMOVAL") as ImpoundStatus] ?? "default";
}

export function getEventTypeLabel(type: CustodyEventType | string | null | undefined): string {
  return EVENT_TYPE_LABELS[(type ?? "STATUS_CHANGE") as CustodyEventType] ?? "Evento";
}

export function getSignatureLabel(status: SignatureStatus | string | null | undefined): string {
  return SIGNATURE_LABELS[(status ?? "ABSENT") as SignatureStatus] ?? "Ausente";
}

// Identidade do bem para exibição (placa OU "Não identificado" — D-Ω5P-09).
export function getVehicleLabel(process: Pick<ProcessListItem, "vehiclePlate" | "vehicleUnidentified">): string {
  if (process.vehiclePlate) return process.vehiclePlate;
  if (process.vehicleUnidentified) return "Não identificado";
  return "Sem placa informada";
}

export const STATUS_OPTIONS: readonly { value: ImpoundStatus; label: string }[] = STATUSES.map((status) => ({
  value: status,
  label: STATUS_LABELS[status],
}));

// §2.8 — hashes são PROVA (não segredo): exibidos TRUNCADOS para leitura (prefixo…sufixo). Nunca truncar a
// ponto de perder o valor probatório inteiro do log; a UI só encurta o texto exibido.
export function truncateHash(hash: string | null | undefined): string {
  if (!hash) return "—";
  const value = hash.trim();
  if (value.length <= 16) return value;
  return `${value.slice(0, 10)}…${value.slice(-6)}`;
}

// Rótulo PT-BR das chaves de payload de evento (nunca expõe tenant_id — §allowlist). Chaves desconhecidas caem
// no próprio nome legível.
const PAYLOAD_KEY_LABELS: Record<string, string> = {
  from: "De",
  to: "Para",
  reason: "Fundamento",
  spotId: "Vaga",
  fromSpotId: "Vaga de origem",
  toSpotId: "Vaga de destino",
  fromYardId: "Pátio de origem",
  toYardId: "Pátio de destino",
  set: "Conjunto",
  periodSeq: "Diária",
  refDate: "Referência",
  amount: "Valor",
  channel: "Canal",
};

export type EventPayloadEntry = { readonly label: string; readonly value: string };

// §allowlist/§2.8 — formato UUID (vaga/anexo/vistoria): NUNCA renderizar cru no DOM. Detecção por FORMATO (não
// por nome de chave), para pegar qualquer valor cru (from/to de SPOT_MOVED/YARD_TRANSFER, spotId, etc.).
const UUID_VALUE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Códigos-motivo INTERNOS conhecidos → PT-BR (o `reason` de TEXTO LIVRE — ex.: fundamento de JUDICIAL_HOLD que o
// operador digita — é preservado; só os códigos técnicos do sistema são traduzidos/omitidos).
const REASON_CODE_LABELS: Record<string, string> = {
  process_opened: "Processo aberto",
  removal_reconciled: "Remoção reconciliada",
};

const STATUS_VALUE_SET = new Set<string>(STATUSES);

// Traduz/filtra UM valor de payload para exibição PT-BR e segura. Retorna null quando o par deve ser SUPRIMIDO.
function describeEventValue(raw: unknown): string | null {
  if (typeof raw === "number" || typeof raw === "boolean") return String(raw);
  if (typeof raw !== "string") return null; // §2.8: não serializa objeto cru (poderia vazar UUID/tenant aninhado)
  const value = raw.trim();
  if (!value) return null;
  if (UUID_VALUE_RE.test(value)) return null; // §allowlist: nunca UUID cru (o typeLabel já carrega o sentido)
  if (STATUS_VALUE_SET.has(value)) return getStatusLabel(value as ImpoundStatus); // enum de estado → PT-BR (§11.3)
  if (REASON_CODE_LABELS[value]) return REASON_CODE_LABELS[value]; // código-motivo interno → PT-BR
  return value; // texto livre preservado (ex.: fundamento do bloqueio judicial)
}

// Descreve o payload de forma amigável (pares rótulo→valor), traduzindo enums/códigos internos para PT-BR e
// SUPRIMINDO valores técnicos crus (UUID de vaga/anexo, tenant_id). Determinístico e sem PII nesta fatia.
export function describeEventPayload(payload: Record<string, unknown> | null | undefined): EventPayloadEntry[] {
  if (!payload || typeof payload !== "object") return [];
  const entries: EventPayloadEntry[] = [];
  for (const [key, raw] of Object.entries(payload)) {
    if (/tenant/i.test(key)) continue; // §allowlist: nunca tenant_id
    const value = describeEventValue(raw);
    if (value === null || !value.trim()) continue;
    entries.push({ label: PAYLOAD_KEY_LABELS[key] ?? humanizeKey(key), value });
  }
  return entries;
}

function humanizeKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function adaptProcessesResponse(response: unknown, source: ProcessesData["source"] = "api", fallbackReason?: string): ProcessesData {
  const payload = readRecord(response);
  const dataRecord = readRecord(payload?.data);
  const itemsSource = Array.isArray(response)
    ? response
    : readArray(dataRecord?.items) ?? readArray(payload?.items) ?? readArray(payload?.data) ?? [];
  const items = itemsSource.map((item) => adaptListItem(item)).filter((item): item is ProcessListItem => Boolean(item));
  return { items, pagination: adaptPagination(payload, dataRecord, items.length), source, fallbackReason };
}

export function adaptProcessDetailResponse(response: unknown): ProcessDetail | null {
  const payload = readRecord(response);
  return adaptDetail(readRecord(payload?.data) ?? response);
}

export function adaptEventsResponse(response: unknown): CustodyEventItem[] {
  const payload = readRecord(response);
  const dataRecord = readRecord(payload?.data);
  const itemsSource = Array.isArray(response) ? response : readArray(dataRecord?.items) ?? readArray(payload?.items) ?? [];
  const events = itemsSource.map((item) => adaptEvent(item)).filter((item): item is CustodyEventItem => Boolean(item));
  // Timeline ordenada por seq (append-only na origem; a UI garante a ordem determinística).
  return events.sort((a, b) => a.seq - b.seq);
}

export function adaptVerifyResponse(response: unknown): VerifyResult | null {
  const payload = readRecord(response);
  const record = readRecord(payload?.data) ?? payload;
  if (!record) return null;
  const processId = readString(record, ["processId", "process_id"]);
  if (!processId) return null;
  return {
    processId,
    valid: readBoolean(record, ["valid"]) ?? false,
    eventCount: readNumber(record, ["eventCount", "event_count"]) ?? 0,
    headHash: readString(record, ["headHash", "head_hash"]) ?? null,
    brokenAt: readNumber(record, ["brokenAt", "broken_at"]) ?? null,
    checkedAt: readString(record, ["checkedAt", "checked_at"]) ?? new Date().toISOString(),
  };
}

export function adaptInspectionResponse(response: unknown): InspectionView {
  const payload = readRecord(response);
  const record = readRecord(payload?.data) ?? payload;
  const inspectionRecord = readRecord(record?.inspection);
  if (!inspectionRecord) return null;
  const inspection = adaptInspection(inspectionRecord);
  if (!inspection) return null;
  const photos = (readArray(record?.photos) ?? []).map((item) => adaptPhoto(item)).filter((p): p is InspectionPhotoItem => Boolean(p));
  const requiredSets = (readArray(record?.requiredSets) ?? readArray(record?.required_sets) ?? [])
    .map((value) => (typeof value === "string" ? value : String(value)))
    .filter(Boolean);
  return { inspection, photos, requiredSets, complete: readBoolean(record, ["complete"]) ?? false };
}

// Agrupa as fotos por conjunto (set) — galeria por conjunto exigido (art. 9º I / art. 14).
export function groupPhotosBySet(photos: readonly InspectionPhotoItem[]): { set: string; photos: InspectionPhotoItem[] }[] {
  const bySet = new Map<string, InspectionPhotoItem[]>();
  for (const photo of photos) {
    const list = bySet.get(photo.set) ?? [];
    list.push(photo);
    bySet.set(photo.set, list);
  }
  return [...bySet.entries()].map(([set, list]) => ({ set, photos: list })).sort((a, b) => a.set.localeCompare(b.set));
}

export function filterProcesses(items: readonly ProcessListItem[], filters: { plate: string; status: ProcessesFilters["status"]; yardId: string }): ProcessListItem[] {
  const plate = normalize(filters.plate);
  return items.filter((item) => {
    if (filters.status !== "all" && item.status !== filters.status) return false;
    if (filters.yardId && item.yardId !== filters.yardId) return false;
    if (!plate) return true;
    const haystack = [item.vehiclePlate ?? "", item.originAuthority].join(" ");
    return normalize(haystack).includes(plate);
  });
}

export function validateProcessCreate(input: ProcessCreatePayload): ProcessCreateFieldError[] {
  const errors: ProcessCreateFieldError[] = [];

  if (!input.profileId?.trim()) errors.push({ field: "profileId", message: "Perfil normativo é obrigatório." });

  const authority = (input.originAuthority ?? "").trim();
  if (!authority) errors.push({ field: "originAuthority", message: "Autoridade solicitante é obrigatória." });
  else if (authority.length > AUTHORITY_MAX) errors.push({ field: "originAuthority", message: `Máximo de ${AUTHORITY_MAX} caracteres.` });

  const plate = (input.vehiclePlate ?? "").trim();
  if (input.vehicleUnidentified) {
    if (!(input.unidentifiedReason ?? "").trim()) {
      errors.push({ field: "unidentifiedReason", message: "Justifique por que o bem não pôde ser identificado (art. 9º)." });
    }
  } else if (!plate && !(input.vehicleChassis ?? "").trim() && !(input.vehicleRenavam ?? "").trim()) {
    errors.push({ field: "vehiclePlate", message: "Informe a placa (ou marque 'Bem não identificado' e justifique)." });
  } else if (plate.length > PLATE_MAX) {
    errors.push({ field: "vehiclePlate", message: `Placa deve ter no máximo ${PLATE_MAX} caracteres.` });
  }

  if ((input.unidentifiedReason ?? "").trim().length > REASON_MAX) {
    errors.push({ field: "unidentifiedReason", message: `Máximo de ${REASON_MAX} caracteres.` });
  }

  return errors;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function adaptListItem(input: unknown): ProcessListItem | null {
  const item = readRecord(input);
  if (!item) return null;
  const id = readString(item, ["id"]);
  if (!id) return null;
  const status = coerceStatus(readString(item, ["status"]));
  return {
    id,
    vehiclePlate: readString(item, ["vehiclePlate", "vehicle_plate"]) ?? null,
    vehicleUnidentified: readBoolean(item, ["vehicleUnidentified", "vehicle_unidentified"]) ?? false,
    yardId: readString(item, ["yardId", "yard_id"]) ?? null,
    profileId: readString(item, ["profileId", "profile_id"]) ?? "",
    status,
    statusLabel: readString(item, ["statusLabel"]) ?? getStatusLabel(status),
    enteredAt: readString(item, ["enteredAt", "entered_at"]) ?? null,
    frozenAt: readString(item, ["frozenAt", "frozen_at"]) ?? null,
    originAuthority: readString(item, ["originAuthority", "origin_authority"]) ?? "",
    custodySeqHead: readNumber(item, ["custodySeqHead", "custody_seq_head"]) ?? 0,
    createdAt: readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
  };
}

function adaptDetail(input: unknown): ProcessDetail | null {
  const base = adaptListItem(input);
  const item = readRecord(input);
  if (!base || !item) return null;
  return {
    ...base,
    vehicleChassis: readString(item, ["vehicleChassis", "vehicle_chassis"]) ?? null,
    vehicleRenavam: readString(item, ["vehicleRenavam", "vehicle_renavam"]) ?? null,
    vehicleBrand: readString(item, ["vehicleBrand", "vehicle_brand"]) ?? null,
    vehicleModel: readString(item, ["vehicleModel", "vehicle_model"]) ?? null,
    vehicleColor: readString(item, ["vehicleColor", "vehicle_color"]) ?? null,
    vehicleYear: readNumber(item, ["vehicleYear", "vehicle_year"]) ?? null,
    unidentifiedReason: readString(item, ["unidentifiedReason", "unidentified_reason"]) ?? null,
    originAgentName: readString(item, ["originAgentName", "origin_agent_name"]) ?? null,
    authorityCaseNumber: readString(item, ["authorityCaseNumber", "authority_case_number"]) ?? null,
    incidentReportNumber: readString(item, ["incidentReportNumber", "incident_report_number"]) ?? null,
    legalBasis: readString(item, ["legalBasis", "legal_basis"]) ?? null,
    serviceOrderId: readString(item, ["serviceOrderId", "service_order_id"]) ?? null,
    custodyHashHead: readString(item, ["custodyHashHead", "custody_hash_head"]) ?? null,
    updatedAt: readString(item, ["updatedAt", "updated_at"]) ?? base.createdAt,
  };
}

function adaptEvent(input: unknown): CustodyEventItem | null {
  const item = readRecord(input);
  if (!item) return null;
  const id = readString(item, ["id"]);
  if (!id) return null;
  const type = coerceEventType(readString(item, ["type"]));
  const payloadRecord = readRecord(item.payload) ?? null;
  return {
    id,
    seq: readNumber(item, ["seq"]) ?? 0,
    type,
    typeLabel: readString(item, ["typeLabel"]) ?? getEventTypeLabel(type),
    payload: payloadRecord,
    occurredAt: readString(item, ["occurredAt", "occurred_at"]) ?? new Date().toISOString(),
    actorId: readString(item, ["actorId", "actor_id"]) ?? null,
    prevHash: readString(item, ["prevHash", "prev_hash"]) ?? null,
    hash: readString(item, ["hash"]) ?? null,
    createdAt: readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
  };
}

function adaptInspection(item: Record<string, unknown>): InspectionData | null {
  const id = readString(item, ["id"]);
  if (!id) return null;
  const signatureStatus = coerceSignature(readString(item, ["signatureStatus", "signature_status"]));
  return {
    id,
    processId: readString(item, ["processId", "process_id"]) ?? "",
    inspectedAt: readString(item, ["inspectedAt", "inspected_at"]) ?? new Date().toISOString(),
    agentName: readString(item, ["agentName", "agent_name"]) ?? null,
    bodyworkState: readString(item, ["bodyworkState", "bodywork_state"]) ?? null,
    paintState: readString(item, ["paintState", "paint_state"]) ?? null,
    tiresState: readString(item, ["tiresState", "tires_state"]) ?? null,
    internalObjects: readString(item, ["internalObjects", "internal_objects"]) ?? null,
    missingEquipment: readString(item, ["missingEquipment", "missing_equipment"]) ?? null,
    odometerKm: readString(item, ["odometerKm", "odometer_km"]) ?? null,
    observations: readString(item, ["observations"]) ?? null,
    signerName: readString(item, ["signerName", "signer_name"]) ?? null,
    signatureStatus,
    signatureStatusLabel: readString(item, ["signatureStatusLabel"]) ?? getSignatureLabel(signatureStatus),
    signedAt: readString(item, ["signedAt", "signed_at"]) ?? null,
    completedAt: readString(item, ["completedAt", "completed_at"]) ?? null,
  };
}

function adaptPhoto(input: unknown): InspectionPhotoItem | null {
  const item = readRecord(input);
  if (!item) return null;
  const id = readString(item, ["id"]);
  const fileUrl = readString(item, ["fileUrl", "file_url"]);
  if (!id || !fileUrl) return null;
  return {
    id,
    set: readString(item, ["set"]) ?? "GERAL",
    fileUrl,
    status: readString(item, ["status"]) ?? "stored",
    createdAt: readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
  };
}

function adaptPagination(
  payload: Record<string, unknown> | undefined,
  dataRecord: Record<string, unknown> | undefined,
  fallbackTotal: number,
): ProcessesPagination {
  const pagination = readRecord(dataRecord?.pagination) ?? readRecord(payload?.pagination);
  return {
    limit: readNumber(pagination, ["limit"]) ?? 20,
    offset: readNumber(pagination, ["offset"]) ?? 0,
    total: readNumber(pagination, ["total"]) ?? fallbackTotal,
  };
}

function coerceStatus(value: string | undefined): ImpoundStatus {
  return value && STATUSES.includes(value as ImpoundStatus) ? (value as ImpoundStatus) : "IN_REMOVAL";
}

function coerceEventType(value: string | undefined): CustodyEventType {
  return value && EVENT_TYPES.includes(value as CustodyEventType) ? (value as CustodyEventType) : "STATUS_CHANGE";
}

function coerceSignature(value: string | undefined): SignatureStatus {
  return value && SIGNATURE_STATUSES.includes(value as SignatureStatus) ? (value as SignatureStatus) : "ABSENT";
}

function readArray(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function readString(input: Record<string, unknown> | undefined, keys: readonly string[]): string | undefined {
  if (!input) return undefined;
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function readNumber(input: Record<string, unknown> | undefined, keys: readonly string[]): number | undefined {
  if (!input) return undefined;
  for (const key of keys) {
    const value = input[key];
    const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function readBoolean(input: Record<string, unknown> | undefined, keys: readonly string[]): boolean | undefined {
  if (!input) return undefined;
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "boolean") return value;
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return undefined;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}
