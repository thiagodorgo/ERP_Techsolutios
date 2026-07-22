import { ApiError } from "../../services/api/client";
import type {
  CreateScheduledNotificationInput,
  ScheduledNotificationStatus,
  ScheduledNotificationView,
  ScheduledNotificationVisibility,
} from "./scheduled-notification.types";

// Ω4C PR-04 — camada pura do motor de notificações agendáveis: rótulos PT-BR (§3), validação-espelho do
// backend, tradução camelCase→snake_case do POST e adaptação §2.8 do DTO. Sem efeito colateral (testável em SSR).

// ── Tipo (visibilidade): token técnico → rótulo PT-BR + dica ─────────────────────
export const VISIBILITY_LABELS: Record<ScheduledNotificationVisibility, string> = {
  private: "Privada",
  public: "Pública",
  custom: "Personalizada",
};

export const VISIBILITY_OPTIONS: readonly {
  readonly value: ScheduledNotificationVisibility;
  readonly label: string;
  readonly hint: string;
}[] = [
  { value: "private", label: "Privada", hint: "Só para o meu usuário" },
  { value: "public", label: "Pública", hint: "Para todos da organização" },
  { value: "custom", label: "Personalizada", hint: "Selecionar destinatários" },
];

export function getVisibilityLabel(value: ScheduledNotificationVisibility): string {
  return VISIBILITY_LABELS[value] ?? "—";
}

// ── Situação: token técnico → rótulo PT-BR + tom do Badge ────────────────────────
const STATUS_META: Record<ScheduledNotificationStatus, { label: string; tone: "warning" | "success" | "default" }> = {
  pending: { label: "Pendente", tone: "warning" },
  fired: { label: "Disparada", tone: "success" },
  cancelled: { label: "Cancelada", tone: "default" },
};

export function getScheduledStatusLabel(status: ScheduledNotificationStatus): string {
  return STATUS_META[status]?.label ?? "—";
}

export function getScheduledStatusTone(status: ScheduledNotificationStatus): "warning" | "success" | "default" {
  return STATUS_META[status]?.tone ?? "default";
}

// ── Antecedência (remind_before, OPCIONAL): presets → minutos (string p/ <select>; "" = sem lembrete) ──
export const REMIND_BEFORE_OPTIONS: readonly { readonly value: string; readonly label: string }[] = [
  { value: "", label: "Sem lembrete" },
  { value: "15", label: "15 minutos antes" },
  { value: "30", label: "30 minutos antes" },
  { value: "60", label: "1 hora antes" },
  { value: "120", label: "2 horas antes" },
  { value: "1440", label: "1 dia antes" },
];

// ── Adaptação §2.8 do DTO → view mínima ──────────────────────────────────────────
// Descarta DEFENSIVAMENTE qualquer campo sensível (tenant_id/client_action_id/custom_recipient_ids/source_id),
// mesmo que o backend não os envie — a view nunca os projeta.
export function adaptScheduledNotification(raw: unknown): ScheduledNotificationView | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;

  const id = readString(row.id);
  if (!id) return null; // sem identidade honesta → descartado (D-007: nada fabricado)

  return {
    id,
    title: readString(row.title) ?? "",
    message: readString(row.message) ?? "",
    notifyAt: readString(row.notifyAt ?? row.notify_at) ?? "",
    remindBeforeMinutes: readNumber(row.remindBeforeMinutes ?? row.remind_before_minutes),
    visibility: coerceVisibility(readString(row.visibility)),
    status: coerceStatus(readString(row.status)),
    createdAt: readString(row.createdAt ?? row.created_at) ?? "",
  };
}

export function adaptScheduledNotifications(raw: unknown): ScheduledNotificationView[] {
  return readList(raw)
    .map(adaptScheduledNotification)
    .filter((entry): entry is ScheduledNotificationView => entry !== null);
}

// ── Validação client (espelha o backend; feedback imediato antes do POST) ─────────
export function validateScheduledNotification(input: {
  readonly title: string;
  readonly message: string;
  readonly notifyAt: string;
  readonly visibility: ScheduledNotificationVisibility;
  readonly selectedRecipientIds: readonly string[];
}): string[] {
  const found: string[] = [];
  if (!input.title.trim()) found.push("Informe o título.");
  if (!input.message.trim()) found.push("Informe a mensagem.");
  if (!input.notifyAt.trim() || Number.isNaN(Date.parse(input.notifyAt))) {
    found.push("Informe uma data e hora válidas.");
  }
  if (input.visibility === "custom" && input.selectedRecipientIds.length === 0) {
    found.push("Selecione ao menos um destinatário.");
  }
  return found;
}

// ── Tradução camelCase → contrato snake_case do POST /notifications/scheduled ─────
export function toCreateBody(input: CreateScheduledNotificationInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    title: input.title.trim(),
    message: input.message.trim(),
    notify_at: input.notifyAt,
    visibility: input.visibility,
  };
  if (input.remindBeforeMinutes != null) body.remind_before_minutes = input.remindBeforeMinutes;
  if (input.visibility === "custom" && input.customRecipientIds && input.customRecipientIds.length > 0) {
    body.custom_recipient_ids = [...input.customRecipientIds];
  }
  if (input.sourceType) body.source_type = input.sourceType;
  if (input.sourceId) body.source_id = input.sourceId;
  return body;
}

// ── Interpretação de erro de domínio (backend é a autoridade — 403 → acesso; 400 → validação) ─────
export function interpretCreateError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return "Acesso não permitido: você não tem permissão para criar notificações.";
    if (err.status === 400) return "Dados inválidos. Revise os campos e tente novamente.";
    if (err.status === 404) return "Registro não encontrado.";
    return err.safeMessage;
  }
  return "Não foi possível agendar a notificação.";
}

export function interpretCancelError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return "Acesso não permitido: você não tem permissão para cancelar notificações.";
    if (err.status === 404) return "Notificação não encontrada. Atualize a lista e tente novamente.";
    return err.safeMessage;
  }
  return "Não foi possível cancelar a notificação.";
}

// ── Formatação da data-alvo (ISO → dd/mm/aaaa hh:mm em pt-BR) ─────────────────────
export function formatNotifyAt(iso: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

// ── Helpers de leitura tolerante ─────────────────────────────────────────────────
function coerceVisibility(value: string | undefined): ScheduledNotificationVisibility {
  return value === "public" || value === "custom" ? value : "private";
}

function coerceStatus(value: string | undefined): ScheduledNotificationStatus {
  return value === "fired" || value === "cancelled" ? value : "pending";
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function readList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const data = (raw as { data?: unknown }).data;
    if (Array.isArray(data)) return data;
  }
  return [];
}
