import type { AccessView, SessionView } from "./sessions.types";

// Ω4C PR-11 — normalização DEFENSIVA de Sessões/Acessos. NUNCA fabrica linha (D-007): só normaliza o que o
// servidor enviou. §2.8/LGPD: o adapter só reconstrói o allowlist — refresh_token_hash / ip_address /
// tenant_id / user_id, se por acidente vierem no corpo, NÃO entram no objeto retornado.

// Caveat honesto do desenho stateless (D-Ω4C-SESS-REVOKE-REAL): o refresh é bloqueado na hora, mas o access
// token (JWT) segue válido até expirar (≤15 min). NUNCA prometer "logout instantâneo" que o desenho não entrega.
export const SESSION_REVOKE_CAVEAT =
  "Sessão revogada. O usuário será desconectado no próximo ciclo de renovação, em até ~15 minutos.";

export const SESSION_REVOKE_CONFIRM =
  "Encerrar esta sessão vai revogar o acesso do usuário. Ele será desconectado no próximo ciclo de renovação, em até ~15 minutos. Deseja continuar?";

const WHEN_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "string" && value.length > 0) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

// "dd/mm/aa HH:mm" determinístico em America/Sao_Paulo. Instante ausente/inválido → "—".
export function formatWhen(value: unknown): string {
  const date = toDate(value);
  if (!date) return "—";
  const parts = WHEN_FORMATTER.formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}`;
}

export function toEpoch(value: unknown): number {
  const date = toDate(value);
  return date ? date.getTime() : Number.NEGATIVE_INFINITY;
}

const STATUS_LABEL: Record<string, string> = {
  active: "Ativa",
  revoked: "Revogada",
  expired: "Expirada",
};

export function getSessionStatusLabel(status: string): string {
  return STATUS_LABEL[status] ?? "—";
}

export function getSessionStatusTone(status: string): "success" | "danger" | "warning" | "default" {
  if (status === "active") return "success";
  if (status === "revoked") return "danger";
  if (status === "expired") return "warning";
  return "default";
}

// Reconstrói UMA SessionView só com o allowlist. id/status obrigatórios → sem eles, descartada.
function adaptSession(raw: unknown): SessionView | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = nonEmptyString(row.id);
  if (!id) return null;
  const status = nonEmptyString(row.status) ?? "active";
  return {
    id,
    userLabel: nonEmptyString(row.userLabel) ?? "Usuário",
    loginAt: nonEmptyString(row.loginAt) ?? "",
    lastActivityAt: nonEmptyString(row.lastActivityAt) ?? "",
    deviceLabel: nonEmptyString(row.deviceLabel) ?? "Dispositivo desconhecido",
    status,
  };
}

export function adaptSessions(raw: unknown): SessionView[] {
  if (!Array.isArray(raw)) return [];
  const sessions: SessionView[] = [];
  for (const entry of raw) {
    const view = adaptSession(entry);
    if (view) sessions.push(view);
  }
  // Mais recentes primeiro (por último acesso); ativas antes das encerradas na mesma janela.
  return sessions.sort((left, right) => toEpoch(right.lastActivityAt) - toEpoch(left.lastActivityAt));
}

function adaptAccess(raw: unknown): AccessView | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const userLabel = nonEmptyString(row.userLabel);
  const lastAccessAt = nonEmptyString(row.lastAccessAt);
  if (!userLabel || !lastAccessAt) return null;
  return { userLabel, lastAccessAt };
}

export function adaptAccesses(raw: unknown): AccessView[] {
  if (!Array.isArray(raw)) return [];
  const accesses: AccessView[] = [];
  for (const entry of raw) {
    const view = adaptAccess(entry);
    if (view) accesses.push(view);
  }
  return accesses.sort((left, right) => toEpoch(right.lastAccessAt) - toEpoch(left.lastAccessAt));
}

// Gating puro do botão "Revogar" (RN-SESS-05): SÓ com sessions:revoke E sobre sessão ativa. O backend é a
// autoridade final — auditor (sessions:read sem sessions:revoke) → canRevoke=false → nunca vê o botão.
export function shouldOfferRevoke(canRevoke: boolean, status: string): boolean {
  return canRevoke && status === "active";
}

// Interpreta a falha da revogação para uma mensagem honesta na UI (§2.8: nunca vaza corpo cru).
export function interpretRevokeError(error: unknown): string {
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status?: number }).status;
    if (status === 403) return "Seu perfil não tem permissão para revogar sessões.";
    if (status === 404) return "Esta sessão não existe mais ou já foi encerrada.";
  }
  return "Não foi possível revogar a sessão. Tente novamente em instantes.";
}
