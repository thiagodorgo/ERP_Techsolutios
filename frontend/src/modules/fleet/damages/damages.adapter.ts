import { formatBRL } from "../../registry/service-catalog/service-catalog.adapter";
import type {
  Damage,
  DamageAttachment,
  DamageAttachmentMarker,
  DamageData,
  DamageDisposition,
  DamageDraft,
  DamageFieldError,
  DamageGravidade,
  DamagePagination,
  DamageStatementDebit,
  DamageStatus,
  DamageStatusFilter,
  DamageTipo,
} from "./damages.types";

const DESCRICAO_MAX = 2000;

// Reexport do formatador de moeda do repo (fonte única — Catálogo de Serviço).
export { formatBRL };

// Situação: token técnico -> rótulo PT-BR + tom do Chip (registrado=neutro, em_tratativa=aviso, resolvido=sucesso).
const DAMAGE_STATUS_META: Record<DamageStatus, { label: string; tone: "default" | "warning" | "success" | "danger" | "audit" }> = {
  registrado: { label: "Registrado", tone: "default" },
  em_tratativa: { label: "Em tratativa", tone: "warning" },
  resolvido: { label: "Resolvido", tone: "success" },
};

// Gravidade: token técnico -> rótulo PT-BR + tom do Chip (leve=neutro, moderada=aviso, grave=perigo).
const DAMAGE_GRAVIDADE_META: Record<DamageGravidade, { label: string; tone: "default" | "warning" | "success" | "danger" | "audit" }> = {
  leve: { label: "Leve", tone: "default" },
  moderada: { label: "Moderada", tone: "warning" },
  grave: { label: "Grave", tone: "danger" },
};

// Ω4C PR-09 — "Tipo de Dano": token técnico -> rótulo PT-BR (Interno/Externo/Ambos). Descritivo, sem regra.
const DAMAGE_TIPO_META: Record<DamageTipo, { label: string }> = {
  internal: { label: "Interno" },
  external: { label: "Externo" },
  both: { label: "Ambos" },
};

// Ω4C PR-09 — disposição do dano no extrato: `statement` = há responsável (desconto lançado) -> badge verde
// "Lançado no extrato"; `none` = sem responsável -> "—".
const DAMAGE_DISPOSITION_META: Record<DamageDisposition, { label: string; tone: "success" | "default" }> = {
  statement: { label: "Lançado no extrato", tone: "success" },
  none: { label: "—", tone: "default" },
};

const DAMAGE_STATUS_VALUES = Object.keys(DAMAGE_STATUS_META) as DamageStatus[];
const DAMAGE_GRAVIDADE_VALUES = Object.keys(DAMAGE_GRAVIDADE_META) as DamageGravidade[];
const DAMAGE_TIPO_VALUES = Object.keys(DAMAGE_TIPO_META) as DamageTipo[];

export function isDamageStatus(value: string | null | undefined): value is DamageStatus {
  return typeof value === "string" && DAMAGE_STATUS_VALUES.includes(value as DamageStatus);
}

export function isDamageGravidade(value: string | null | undefined): value is DamageGravidade {
  return typeof value === "string" && DAMAGE_GRAVIDADE_VALUES.includes(value as DamageGravidade);
}

export function isDamageTipo(value: string | null | undefined): value is DamageTipo {
  return typeof value === "string" && DAMAGE_TIPO_VALUES.includes(value as DamageTipo);
}

export function getDamageTipoLabel(tipo: DamageTipo | null | undefined): string {
  return tipo ? DAMAGE_TIPO_META[tipo]?.label ?? "—" : "—";
}

export function getDamageDispositionLabel(disposition: DamageDisposition): string {
  return DAMAGE_DISPOSITION_META[disposition]?.label ?? "—";
}

export function getDamageDispositionTone(disposition: DamageDisposition): "success" | "default" {
  return DAMAGE_DISPOSITION_META[disposition]?.tone ?? ("default" as const);
}

export const DAMAGE_TIPO_OPTIONS = DAMAGE_TIPO_VALUES.map((value) => ({ value, label: DAMAGE_TIPO_META[value].label }));

export function adaptDamagesResponse(response: unknown, source: DamageData["source"] = "api", fallbackReason?: string): DamageData {
  const payload = readRecord(response);
  const dataRecord = readRecord(payload?.data);
  const itemsSource = Array.isArray(response)
    ? response
    : readArray(dataRecord?.items) ?? readArray(payload?.items) ?? readArray(payload?.data) ?? [];
  const items = itemsSource.map((item) => adaptDamage(item)).filter((item): item is Damage => Boolean(item));

  return {
    items,
    pagination: adaptPagination(payload, dataRecord, items.length),
    source,
    fallbackReason,
  };
}

export function adaptDamageResponse(response: unknown): Damage | null {
  const payload = readRecord(response);
  return adaptDamage(readRecord(payload?.data) ?? response);
}

// Anexo SAFE: só metadados de exibição + downloadPath. Nunca copia storage_key/file_url/bucket/base64.
export function adaptDamageAttachment(input: unknown, damageId?: string): DamageAttachment | null {
  const item = readRecord(input);
  if (!item) return null;

  const id = readString(item, ["id"]);
  if (!id) return null;

  const downloadPath =
    readString(item, ["downloadPath", "download_path"]) ??
    (damageId ? `/api/v1/damages/${damageId}/attachments/${id}/download` : `/api/v1/damages/attachments/${id}/download`);

  return {
    id,
    fileName: readString(item, ["fileName", "file_name"]),
    mimeType: readString(item, ["mimeType", "mime_type"]),
    sizeBytes: readNumber(item, ["sizeBytes", "size_bytes"]),
    marker: adaptMarker(item.marker),
    createdAt: readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
    downloadPath,
  };
}

function adaptMarker(input: unknown): DamageAttachmentMarker | null {
  const record = readRecord(input);
  if (!record) return null;
  const marker: DamageAttachmentMarker = {
    x: readNumber(record, ["x"]),
    y: readNumber(record, ["y"]),
    description: readString(record, ["description", "descricao"]),
  };
  return marker.x === undefined && marker.y === undefined && marker.description === undefined ? null : marker;
}

// ── Filtro (client-side sobre a janela carregada) ────────────────────────────
export type DamageFilterCriteria = {
  readonly search: string;
  readonly isActive: DamageStatusFilter;
  readonly status?: DamageStatus;
  readonly gravidade?: DamageGravidade;
  readonly vehicleId?: string;
  readonly workOrderId?: string;
  readonly resolveVehicleName?: (vehicleId: string) => string | undefined;
  readonly resolveWorkOrderCode?: (workOrderId: string) => string | undefined;
};

export function filterDamages(items: readonly Damage[], criteria: DamageFilterCriteria): Damage[] {
  const search = normalize(criteria.search);

  return items.filter((damage) => {
    if (criteria.isActive === "active" && !damage.isActive) return false;
    if (criteria.isActive === "inactive" && damage.isActive) return false;
    if (criteria.status && damage.status !== criteria.status) return false;
    if (criteria.gravidade && damage.gravidade !== criteria.gravidade) return false;
    if (criteria.vehicleId && damage.vehicleId !== criteria.vehicleId) return false;
    if (criteria.workOrderId && damage.workOrderId !== criteria.workOrderId) return false;

    if (!search) return true;
    const vehicleName = criteria.resolveVehicleName?.(damage.vehicleId) ?? "";
    const workOrderCode = damage.workOrderId ? criteria.resolveWorkOrderCode?.(damage.workOrderId) ?? "" : "";
    return [
      damage.descricao,
      vehicleName,
      workOrderCode,
      getDamageStatusLabel(damage.status),
      getGravidadeLabel(damage.gravidade),
    ]
      .filter(Boolean)
      .some((value) => normalize(String(value)).includes(search));
  });
}

export function validateDamage(input: DamageDraft): DamageFieldError[] {
  const errors: DamageFieldError[] = [];

  if (!input.vehicleId?.trim()) errors.push({ field: "vehicleId", message: "Selecione a viatura." });

  if (!input.gravidade || !isDamageGravidade(input.gravidade)) errors.push({ field: "gravidade", message: "Selecione a gravidade." });

  const data = (input.data ?? "").trim();
  const dataValid = Boolean(data) && !Number.isNaN(new Date(data).getTime());
  if (!data) errors.push({ field: "data", message: "Informe a data do dano." });
  else if (!dataValid) errors.push({ field: "data", message: "Data do dano inválida." });

  const descricao = (input.descricao ?? "").trim();
  if (!descricao) errors.push({ field: "descricao", message: "Descreva o dano." });
  else if (descricao.length > DESCRICAO_MAX) errors.push({ field: "descricao", message: `A descrição deve ter no máximo ${DESCRICAO_MAX} caracteres.` });

  if (input.custoEstimado !== undefined && (!Number.isFinite(input.custoEstimado) || input.custoEstimado < 0)) {
    errors.push({ field: "custoEstimado", message: "Custo estimado inválido (use um valor em R$ ≥ 0)." });
  }
  if (input.custoReal !== undefined && (!Number.isFinite(input.custoReal) || input.custoReal < 0)) {
    errors.push({ field: "custoReal", message: "Valor Total do dano inválido (use um valor em R$ ≥ 0)." });
  }

  // Ω4C PR-09 (D-Ω4C-DANO-MONEY) — desconto do profissional no extrato. Só valida quando há responsável
  // atribuído E um valor de desconto informado (o profissional pode ser identificação-só, sem cobrança).
  if (input.responsibleOperatorProfileId && input.responsibleAmount !== undefined) {
    const amount = input.responsibleAmount;
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push({ field: "responsibleAmount", message: "O valor do profissional (R$) deve ser maior que zero." });
    } else if (input.custoReal === undefined) {
      // Cobrar exige o Valor Total do dano (a base do desconto).
      errors.push({ field: "custoReal", message: "Informe o Valor Total do dano para lançar o desconto do profissional." });
    } else if (amount - input.custoReal > 1e-9) {
      // Desconto parcial é permitido; exceder o total, não.
      errors.push({ field: "responsibleAmount", message: "O valor do profissional (R$) não pode exceder o Valor Total do dano." });
    }
  }

  // Parcelas do desconto: só entram com responsável (inteiro 1..240).
  if (input.responsibleOperatorProfileId && input.responsibleInstallmentTotal !== undefined) {
    const total = input.responsibleInstallmentTotal;
    if (!Number.isInteger(total) || total < 1 || total > 240) {
      errors.push({ field: "responsibleInstallmentTotal", message: "Parcelas do desconto deve ser um inteiro entre 1 e 240." });
    }
  }

  return errors;
}

// ── Interpretação dos erros de domínio ({error:{reason}}) ────────────────────
// A ApiError não expõe o corpo cru; quando o motivo não vier explícito, inferimos pelo
// status HTTP + contexto da operação (form × transição × desativação).
export type DamageSubmitContext = "form" | "transition" | "toggle-active";

// Ω4C PR-09 — intenção da disposição no submit, só para DESAMBIGUAR um 409 sem corpo (o ApiError esconde o
// motivo). Ao SETAR/TROCAR/LIMPAR o responsável com débito ativo a trava do extrato (RN-EXT-01 → 409
// statement_entry_locked) é a única 409 possível; sem mudança de responsável, um 409 é a trava do dano
// (custo total / desativação com débito ativo → damage_statement_locked).
export type DamageDispositionIntent = "set" | "clear";

export type DamageSubmitFeedback = {
  readonly reason?: string;
  // Campo do formulário a marcar; ausente = mostrar só como Alerta.
  readonly field?: "vehicleId" | "workOrderId" | "responsibleOperatorProfileId" | "custoReal" | "responsibleAmount";
  readonly message: string;
};

export const DAMAGE_REASON_FEEDBACK: Record<string, DamageSubmitFeedback> = {
  invalid_status_transition: {
    reason: "invalid_status_transition",
    message: "Transição de situação inválida. Recarregue a lista e tente novamente.",
  },
  invalid_vehicle_reference: {
    reason: "invalid_vehicle_reference",
    field: "vehicleId",
    message: "Viatura inválida para esta organização. Selecione outra viatura.",
  },
  invalid_work_order_reference: {
    reason: "invalid_work_order_reference",
    field: "workOrderId",
    message: "OS de origem inválida para esta organização. Selecione outra OS ou deixe em branco.",
  },
  // Ω4C PR-09 — Profissional responsável inválido/de outra organização (400 do backend).
  invalid_operator_profile_reference: {
    reason: "invalid_operator_profile_reference",
    field: "responsibleOperatorProfileId",
    message: "Profissional inválido para esta organização. Selecione outro profissional.",
  },
  // Ω4C PR-09 (D-Ω4C-DANO-TRAVA / alerta amarelo AutEM) — dano com desconto ativo no extrato: Valor Total e
  // desativação travados até todas as parcelas serem removidas do extrato.
  damage_statement_locked: {
    reason: "damage_statement_locked",
    message:
      "O valor do dano já se encontra no extrato do profissional. A exclusão e algumas alterações não podem ser feitas até que todas as parcelas sejam removidas do mesmo.",
  },
  // Ω4C PR-09 — reversão barrada pela trava do extrato (RN-EXT-01): parcela já liquidada não se desfaz.
  statement_entry_locked: {
    reason: "statement_entry_locked",
    message:
      "Não é possível alterar o responsável: há parcela já liquidada no extrato. A reversão só é possível por ajuste.",
  },
  // Ω4C PR-09 (D-Ω4C-DANO-MONEY / 422) — cobrar exige o Valor Total do dano (a base do desconto).
  damage_total_required: {
    reason: "damage_total_required",
    field: "custoReal",
    message: "Informe o Valor Total do dano para lançar o desconto do profissional.",
  },
  // Ω4C PR-09 (422) — desconto parcial é permitido; exceder o Valor Total, não.
  responsible_amount_exceeds_total: {
    reason: "responsible_amount_exceeds_total",
    field: "responsibleAmount",
    message: "O valor do profissional (R$) não pode exceder o Valor Total do dano.",
  },
  invalid_responsible_amount: {
    reason: "invalid_responsible_amount",
    field: "responsibleAmount",
    message: "O valor do profissional (R$) deve ser maior que zero.",
  },
};

const FALLBACK_MESSAGE: Record<DamageSubmitContext, string> = {
  form: "Não foi possível salvar o dano. Tente novamente.",
  transition: "Não foi possível atualizar a situação do dano. Tente novamente.",
  "toggle-active": "Não foi possível atualizar o registro do dano. Tente novamente.",
};

function resolveReason(
  explicitReason: string | undefined,
  status: number | undefined,
  context: DamageSubmitContext,
  dispositionIntent?: DamageDispositionIntent,
): string | undefined {
  if (explicitReason) return explicitReason;
  if (status === 409) {
    // Desativar com débito ativo → trava do dano.
    if (context === "toggle-active") return "damage_statement_locked";
    // Mudou o responsável (setar/trocar/limpar) → trava do extrato (parcela liquidada).
    if (dispositionIntent === "set" || dispositionIntent === "clear") return "statement_entry_locked";
    // Sem mudança de responsável (ex.: editar Valor Total com débito ativo) → trava do dano.
    return "damage_statement_locked";
  }
  if (status === 422) {
    // Transição inválida só faz sentido no fluxo de transição de situação.
    return context === "transition" ? "invalid_status_transition" : undefined;
  }
  // 400 é ambíguo (viatura × OS × responsável) sem o motivo do corpo → Alerta genérico.
  return undefined;
}

export function interpretDamageSubmitError(
  error: unknown,
  context: DamageSubmitContext = "form",
  dispositionIntent?: DamageDispositionIntent,
): DamageSubmitFeedback {
  const reason = resolveReason(readErrorReason(error), readErrorStatus(error), context, dispositionIntent);
  if (reason && DAMAGE_REASON_FEEDBACK[reason]) return DAMAGE_REASON_FEEDBACK[reason];

  if (error instanceof Error && error.message) return { message: error.message };
  return { message: FALLBACK_MESSAGE[context] };
}

// Erro específico de upload de foto: 415/400 unsupported_media_type → formato de imagem não suportado.
export function interpretDamageUploadError(error: unknown): string {
  const reason = readErrorReason(error);
  const status = readErrorStatus(error);
  if (reason === "unsupported_media_type" || status === 415 || status === 400) {
    return "Formato de imagem não suportado. Envie um arquivo de imagem (JPG, PNG ou WebP).";
  }
  if (error instanceof Error && error.message) return error.message;
  return "Não foi possível enviar a foto. Tente novamente.";
}

// ── Transições de situação (só as próximas válidas são oferecidas na linha) ───
export type DamageTransition = {
  readonly to: DamageStatus;
  readonly label: string;
};

const TRANSITIONS: Record<DamageStatus, readonly DamageTransition[]> = {
  registrado: [{ to: "em_tratativa", label: "Em tratativa" }],
  em_tratativa: [{ to: "resolvido", label: "Resolvido" }],
  resolvido: [],
};

export function getValidDamageTransitions(status: DamageStatus): readonly DamageTransition[] {
  return TRANSITIONS[status] ?? [];
}

export function getDamageStatusLabel(status: DamageStatus): string {
  return DAMAGE_STATUS_META[status]?.label ?? "—";
}

export function getDamageStatusTone(status: DamageStatus) {
  return DAMAGE_STATUS_META[status]?.tone ?? ("default" as const);
}

export function getGravidadeLabel(gravidade: DamageGravidade): string {
  return DAMAGE_GRAVIDADE_META[gravidade]?.label ?? "—";
}

export function getGravidadeTone(gravidade: DamageGravidade) {
  return DAMAGE_GRAVIDADE_META[gravidade]?.tone ?? ("default" as const);
}

export const DAMAGE_STATUS_OPTIONS = DAMAGE_STATUS_VALUES.map((value) => ({ value, label: DAMAGE_STATUS_META[value].label }));
export const DAMAGE_GRAVIDADE_OPTIONS = DAMAGE_GRAVIDADE_VALUES.map((value) => ({ value, label: DAMAGE_GRAVIDADE_META[value].label }));

// ── Totais/agregados da janela carregada (renderizam mesmo vazio) ────────────
export type DamageTotals = {
  readonly count: number;
  readonly registradoCount: number;
  readonly emTratativaCount: number;
  readonly resolvidoCount: number;
};

export function computeDamageTotals(items: readonly Damage[]): DamageTotals {
  let registradoCount = 0;
  let emTratativaCount = 0;
  let resolvidoCount = 0;
  for (const damage of items) {
    if (damage.status === "registrado") registradoCount += 1;
    if (damage.status === "em_tratativa") emTratativaCount += 1;
    if (damage.status === "resolvido") resolvidoCount += 1;
  }
  return { count: items.length, registradoCount, emTratativaCount, resolvidoCount };
}

// pt-BR: remove separador de milhar (ponto antes de 3 dígitos) e usa vírgula como decimal.
export function parsePtBrNumber(value: string | null | undefined): number | undefined {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return undefined;
  const normalized = trimmed.replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseIntStrict(value: string | null | undefined): number | undefined {
  const trimmed = (value ?? "").trim();
  if (!trimmed || !/^-?\d+$/.test(trimmed)) return undefined;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) ? parsed : undefined;
}

export function formatValor(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return formatBRL(value);
}

export function formatDamageDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(date);
}

export function formatFileSize(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value) || value < 0) return "";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export function isImageMimeType(mimeType: string | null | undefined): boolean {
  return typeof mimeType === "string" && mimeType.toLowerCase().startsWith("image/");
}

// ── Adaptação de linha (snake_case/camelCase → DTO) ──────────────────────────
function adaptDamage(input: unknown): Damage | null {
  const item = readRecord(input);
  if (!item) return null;

  const id = readString(item, ["id"]);
  const vehicleId = readString(item, ["vehicleId", "vehicle_id"]);
  const descricao = readString(item, ["descricao"]);
  if (!id || !vehicleId || !descricao) return null;

  const attachmentsSource = readArray(item.attachments) ?? [];
  const attachments = attachmentsSource
    .map((attachment) => adaptDamageAttachment(attachment, id))
    .filter((attachment): attachment is DamageAttachment => Boolean(attachment));

  return {
    id,
    vehicleId,
    workOrderId: readNullableString(item, ["workOrderId", "work_order_id"]),
    responsibleOperatorProfileId: readNullableString(item, ["responsibleOperatorProfileId", "responsible_operator_profile_id"]),
    disposition: coerceDisposition(readString(item, ["disposition"])),
    data: readString(item, ["data"]) ?? "",
    gravidade: coerceGravidade(readString(item, ["gravidade"])),
    descricao,
    status: coerceStatus(readString(item, ["status"])),
    tipo: coerceTipo(readString(item, ["tipo"])),
    origem: readNullableString(item, ["origem"]),
    objeto: readNullableString(item, ["objeto"]),
    identificacaoObjeto: readNullableString(item, ["identificacaoObjeto", "identificacao_objeto"]),
    analiseInterna: readNullableString(item, ["analiseInterna", "analise_interna"]),
    custoEstimado: readNullableNumber(item, ["custoEstimado", "custo_estimado"]),
    custoReal: readNullableNumber(item, ["custoReal", "custo_real"]),
    statementDebit: adaptStatementDebit(item.statementDebit ?? item.statement_debit),
    isActive: readBoolean(item, ["isActive", "is_active"]) ?? true,
    attachments,
    createdAt: readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
    updatedAt: readString(item, ["updatedAt", "updated_at"]) ?? readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
  };
}

function coerceStatus(value: string | undefined): DamageStatus {
  return isDamageStatus(value) ? value : "registrado";
}

function coerceGravidade(value: string | undefined): DamageGravidade {
  return isDamageGravidade(value) ? value : "leve";
}

// Disposição derivada: `statement` só quando o backend confirma o responsável; senão `none`.
function coerceDisposition(value: string | undefined): DamageDisposition {
  return value === "statement" ? "statement" : "none";
}

function coerceTipo(value: string | undefined): DamageTipo | null {
  return isDamageTipo(value) ? value : null;
}

// Ω4C PR-09 — bloco DERIVADO do débito ativo no extrato (§2.8: agregado; nunca parcela individual/CNH).
// Ausente/incompleto → null (sem débito ativo).
function adaptStatementDebit(input: unknown): DamageStatementDebit | null {
  const record = readRecord(input);
  if (!record) return null;
  const totalAmount = readNumber(record, ["totalAmount", "total_amount"]);
  const installmentTotal = readNumber(record, ["installmentTotal", "installment_total"]);
  const firstDueDate = readString(record, ["firstDueDate", "first_due_date"]);
  if (totalAmount === undefined || installmentTotal === undefined || !firstDueDate) return null;
  return {
    totalAmount,
    installmentTotal,
    firstDueDate,
    hasSettled: readBoolean(record, ["hasSettled", "has_settled"]) ?? false,
  };
}

function adaptPagination(
  payload: Record<string, unknown> | undefined,
  dataRecord: Record<string, unknown> | undefined,
  fallbackTotal: number,
): DamagePagination {
  const pagination = readRecord(dataRecord?.pagination) ?? readRecord(payload?.pagination);
  return {
    limit: readNumber(pagination, ["limit"]) ?? 20,
    offset: readNumber(pagination, ["offset"]) ?? 0,
    total: readNumber(pagination, ["total"]) ?? fallbackTotal,
  };
}

function readErrorReason(error: unknown): string | undefined {
  if (error && typeof error === "object") {
    const direct = (error as { reason?: unknown }).reason;
    if (typeof direct === "string" && direct.trim()) return direct.trim();
    const nested = readRecord((error as { error?: unknown }).error);
    const nestedReason = nested?.reason;
    if (typeof nestedReason === "string" && nestedReason.trim()) return nestedReason.trim();
  }
  return undefined;
}

function readErrorStatus(error: unknown): number | undefined {
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === "number") return status;
  }
  return undefined;
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

function readNullableString(input: Record<string, unknown>, keys: readonly string[]): string | null {
  return readString(input, keys) ?? null;
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

function readNullableNumber(input: Record<string, unknown>, keys: readonly string[]): number | null {
  return readNumber(input, keys) ?? null;
}

function readBoolean(input: Record<string, unknown>, keys: readonly string[]): boolean | undefined {
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
