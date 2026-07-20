import type { AuditEventView } from "./audit-events.types";

// PR-SCALE-3 — normalização DEFENSIVA dos eventos de GET /api/v1/audit-events (clona a defesa de
// work-order-timeseries.adapter). NUNCA fabrica evento (D-007): só normaliza o que o servidor enviou.
// Regras:
//  - item sem `id` string OU sem `action` string → descartado;
//  - `actor` = `actor_user_id` (id honesto, opaco) — null/ausente → "Sistema" (rótulo de ação sem
//    ator humano, NUNCA um nome inventado);
//  - `timestamp` (string|Date) → `when` "dd/mm HH:mm" em America/Sao_Paulo + `whenIso` (instante ISO);
//  - §2.8: o view NUNCA inclui `tenant_id` (a projeção AuditEventView sequer tem o campo);
//  - ordena por instante DESC (mais recente primeiro); instante inválido/ausente vai para o fim.

const WHEN_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

// Aceita string|Date; qualquer coisa inválida → data nula (o item ainda é exibido com when "—").
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

function adaptOne(raw: unknown): { view: AuditEventView; sortMs: number } | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;

  const id = nonEmptyString(row.id);
  const action = nonEmptyString(row.action);
  if (!id || !action) return null; // sem identidade/ação honesta → descartado (D-007)

  const date = toDate(row.timestamp);
  // actor_user_id honesto; ausência = ação do próprio sistema (rótulo, não nome inventado).
  const actor = nonEmptyString(row.actor_user_id) ?? "Sistema";

  const view: AuditEventView = {
    id,
    action,
    actor,
    when: date ? formatWhen(date) : "—",
    whenIso: date ? date.toISOString() : "",
  };
  return { view, sortMs: date ? date.getTime() : Number.NEGATIVE_INFINITY };
}

export function adaptAuditEvents(raw: unknown): AuditEventView[] {
  if (!Array.isArray(raw)) return [];
  const adapted: { view: AuditEventView; sortMs: number }[] = [];
  for (const entry of raw) {
    const one = adaptOne(entry);
    if (one) adapted.push(one);
  }
  adapted.sort((a, b) => b.sortMs - a.sortMs); // mais recente primeiro; inválidos ao fim
  return adapted.map((item) => item.view);
}
