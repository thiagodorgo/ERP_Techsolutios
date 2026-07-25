import { isMockMode } from "../../config/env";
import { ApiError, apiRequest } from "../../services/api/client";
import { listUsersFromApi } from "../users/users.service";
import type { NotificationApiContext } from "./notification.types";
import {
  adaptCentral,
  adaptCentralList,
  adaptScheduledNotification,
  adaptScheduledNotifications,
  toCreateBody,
} from "./scheduled-notification.adapter";
import type {
  CentralScheduledNotificationFilters,
  CentralScheduledNotificationListResult,
  CentralScheduledNotificationView,
  CreateScheduledNotificationInput,
  RecipientCandidatesResult,
  ScheduledNotificationListResult,
  ScheduledNotificationView,
} from "./scheduled-notification.types";

// Ω4C PR-04 — adapter HTTP do motor de notificações agendáveis. Base /api/v1: /notifications/scheduled
// (POST criar · GET listar as MINHAS · DELETE soft-cancel). O inbox/sino (/notifications, unread-count,
// read/read-all/archive) NÃO é tocado aqui. Backend é a autoridade: 403 → "acesso não permitido".

// POST /notifications/scheduled → 201 { data }. Erros propagam (ApiError) → o dialog traduz (403/400).
export async function createScheduledNotification(
  context: NotificationApiContext,
  input: CreateScheduledNotificationInput,
): Promise<ScheduledNotificationView | null> {
  const raw = await apiRequest<unknown>("/notifications/scheduled", {
    ...toRequestOptions(context),
    method: "POST",
    body: toCreateBody(input),
  });
  return adaptScheduledNotification(readData(raw));
}

// GET /notifications/scheduled → { data: [...], pagination }. Lista SÓ as definições do próprio criador
// (foundation; a central tenant-wide é PR-20). D-007: mock → vazio honesto; 403 → forbidden; erro → fallback.
export async function listScheduledNotifications(context: NotificationApiContext): Promise<ScheduledNotificationListResult> {
  if (isMockMode()) return { items: [], source: "mock", forbidden: false };

  try {
    const raw = await apiRequest<unknown>("/notifications/scheduled", toRequestOptions(context));
    return { items: adaptScheduledNotifications(raw), source: "api", forbidden: false };
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) {
      return { items: [], source: "fallback", forbidden: true };
    }
    return { items: [], source: "fallback", forbidden: false };
  }
}

// Ω4C PR-20 — GET /notifications/scheduled/central → { data: [...DTO-central §2.8], pagination }. Lista
// TENANT-WIDE (todas as definições da org, qualquer criador; inclui canceladas p/ histórico), gated
// notifications:create no backend. Filtros: situação + período (De/Até) sobre notify_at. D-007: mock →
// vazio honesto; 403 → forbidden; erro → fallback (a tela degrada sem fabricar linhas).
export async function listCentralScheduledNotifications(
  context: NotificationApiContext,
  filters: CentralScheduledNotificationFilters = {},
): Promise<CentralScheduledNotificationListResult> {
  if (isMockMode()) return { items: [], source: "mock", forbidden: false };

  const query = new URLSearchParams();
  if (filters.status) query.set("status", filters.status);
  if (filters.from) query.set("from", filters.from);
  if (filters.to) query.set("to", filters.to);
  const suffix = query.toString();
  const path = suffix ? `/notifications/scheduled/central?${suffix}` : "/notifications/scheduled/central";

  try {
    const raw = await apiRequest<unknown>(path, toRequestOptions(context));
    return { items: adaptCentralList(raw), source: "api", forbidden: false };
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) {
      return { items: [], source: "fallback", forbidden: true };
    }
    return { items: [], source: "fallback", forbidden: false };
  }
}

// Ω4C PR-20 — DELETE /notifications/scheduled/central/:id → 200 { data } (soft-cancel TENANT-WIDE de
// QUALQUER pendente; fired/cancelled/cross-tenant → 404). Erros propagam — a tela traduz para feedback.
export async function cancelCentralScheduledNotification(
  context: NotificationApiContext,
  id: string,
): Promise<CentralScheduledNotificationView | null> {
  const raw = await apiRequest<unknown>(`/notifications/scheduled/central/${encodeURIComponent(id)}`, {
    ...toRequestOptions(context),
    method: "DELETE",
  });
  return adaptCentral(readData(raw));
}

// DELETE /notifications/scheduled/:id → 200 { data } (soft-cancel: para ocorrências FUTURAS; entregas já
// disparadas permanecem no inbox). Erros propagam — o componente traduz para feedback inline.
export async function cancelScheduledNotification(
  context: NotificationApiContext,
  id: string,
): Promise<ScheduledNotificationView | null> {
  const raw = await apiRequest<unknown>(`/notifications/scheduled/${encodeURIComponent(id)}`, {
    ...toRequestOptions(context),
    method: "DELETE",
  });
  return adaptScheduledNotification(readData(raw));
}

// Picker do Tipo PERSONALIZADA: reusa GET /users (perm users:read no backend). §2.8 — projeta SÓ id + nome,
// e só usuários ATIVOS (o disparo intersecta com ativos de qualquer forma). listUsersFromApi degrada para
// fallback vazio em erro/sem-permissão → sinaliza `unavailable` para o dialog exibir a dica honesta.
export async function listRecipientCandidates(context: NotificationApiContext): Promise<RecipientCandidatesResult> {
  if (isMockMode()) return { items: [], unavailable: false };

  const data = await listUsersFromApi(
    {
      token: context.token,
      tenantId: context.tenantId,
      branchId: context.branchId,
      role: context.role,
      permissions: context.permissions ? [...context.permissions] : undefined,
    },
    { limit: 100 },
  );

  const items = data.items
    .filter((user) => user.status === "active")
    .map((user) => ({ id: user.id, name: user.name }));
  return { items, unavailable: data.source === "fallback" };
}

function toRequestOptions(context: NotificationApiContext) {
  return {
    token: context.token,
    tenantId: context.tenantId,
    branchId: context.branchId,
    role: context.role,
    permissions: context.permissions ? [...context.permissions] : undefined,
  };
}

// GET/POST/DELETE envelopam em { data } — desembrulha de forma defensiva (data pode ser null).
function readData(response: unknown): unknown {
  if (response && typeof response === "object" && "data" in response) {
    return (response as { data?: unknown }).data;
  }
  return response;
}
