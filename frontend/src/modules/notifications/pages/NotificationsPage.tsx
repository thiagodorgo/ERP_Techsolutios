import { Bell, CalendarClock, CheckCheck, Plus, Sparkles, Trash2 } from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Alert, Badge, Button, Card, EmptyState, ErrorState, Skeleton, Tabs } from "../../../components/ui";
import { useAutoRefresh } from "../../../hooks/useAutoRefresh";
import { useAuth } from "../../../providers/AuthProvider";
import { usePermissions } from "../../../providers/PermissionProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { CreateNotificationDialog } from "../components/CreateNotificationDialog";
import { NotificationList } from "../components/NotificationList";
import {
  filterNotificationsByCategory,
  isNotificationCategory,
  NOTIFICATION_CATEGORY_LABELS,
  NOTIFICATION_CATEGORY_ORDER,
  type NotificationCategory,
} from "../notification.adapter";
import {
  archiveNotification,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  runFleetAlerts,
} from "../notification.service";
import type { NotificationApiContext, NotificationItem, NotificationStatus } from "../notification.types";
import {
  formatNotifyAt,
  getScheduledStatusLabel,
  getScheduledStatusTone,
  getVisibilityLabel,
  interpretCancelError,
} from "../scheduled-notification.adapter";
import { cancelScheduledNotification, listScheduledNotifications } from "../scheduled-notification.service";
import type { ScheduledNotificationView } from "../scheduled-notification.types";

type FilterTab = "all" | NotificationStatus;
type CategoryFilter = "all" | NotificationCategory;

const tabs = [
  { id: "all", label: "Todas" },
  { id: "unread", label: "Não lidas" },
  { id: "read", label: "Lidas" },
  { id: "archived", label: "Arquivadas" },
];

function isFilterTab(value: string | null): value is FilterTab {
  return value === "all" || value === "unread" || value === "read" || value === "archived";
}

// Estilos inline da lista de agendadas (sem depender de CSS ainda não presente no design system).
const scheduledListStyle: CSSProperties = { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--space-8)" };
const scheduledItemStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--space-12)",
  flexWrap: "wrap",
  padding: "var(--space-10) 0",
  borderBottom: "1px solid var(--border-subtle)",
};
const scheduledInfoStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--space-4)" };
const scheduledMetaStyle: CSSProperties = { display: "inline-flex", alignItems: "center", gap: "var(--space-6)", fontSize: "var(--text-xs)", color: "var(--text-secondary)" };
const scheduledActionsStyle: CSSProperties = { display: "inline-flex", alignItems: "center", gap: "var(--space-8)", flexWrap: "wrap" };
const scheduledStatusStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", margin: 0 };

export function NotificationsPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const context = useMemo(() => buildNotificationContext(session?.accessToken, activeContext), [activeContext, session?.accessToken]);
  const canManage = can("notifications:update");
  // Backend é a autoridade: `notifications:create` separa "criar/gerir/broadcast" de "ler as minhas".
  const canCreate = can("notifications:create");

  // ── Notificações agendadas (motor Ω4C PR-04) — fundação do criador; central tenant-wide é PR-20 ──
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scheduled, setScheduled] = useState<ScheduledNotificationView[]>([]);
  const [scheduledLoading, setScheduledLoading] = useState(false);
  const [scheduledForbidden, setScheduledForbidden] = useState(false);
  const [scheduledError, setScheduledError] = useState<string | null>(null);
  const [scheduledFeedback, setScheduledFeedback] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  // Filtros (situação + categoria) persistidos na URL — compartilháveis e estáveis no recarregamento.
  const statusParam = searchParams.get("status");
  const activeTab: FilterTab = isFilterTab(statusParam) ? statusParam : "all";
  const categoryParam = searchParams.get("categoria");
  const activeCategory: CategoryFilter = isNotificationCategory(categoryParam) ? categoryParam : "all";

  const setParam = useCallback(
    (key: "status" | "categoria", value: string) => {
      const next = new URLSearchParams(searchParams);
      if (value && value !== "all") next.set(key, value);
      else next.delete(key);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  // WS-UI-REFRESH — loadNotifications(background): em segundo plano NÃO mostra o skeleton (mantém a
  // lista atual visível, sem flicker no auto-refresh); só a 1ª carga usa `loading`.
  const loadNotifications = useCallback(async (background = false) => {
    if (!context) return;

    if (!background) setLoading(true);
    setError(null);

    try {
      const status = activeTab === "all" ? undefined : activeTab;
      setNotifications(await listNotifications(context, { status }));
    } catch {
      // D-007: falha real degrada para lista vazia — nunca fabrica notificações.
      setNotifications([]);
      setError("Não foi possível carregar suas notificações.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, context]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  // WS-UI-REFRESH — o sistema recarrega sozinho em segundo plano (sem botão "Atualizar").
  useAutoRefresh(loadNotifications, { enabled: Boolean(context) });

  // Carrega as notificações agendadas do próprio criador (só quem tem `notifications:create`).
  const loadScheduled = useCallback(async () => {
    if (!context || !canCreate) return;

    setScheduledLoading(true);
    setScheduledError(null);
    try {
      const result = await listScheduledNotifications(context);
      setScheduled(result.items);
      setScheduledForbidden(result.forbidden);
      if (result.source === "fallback" && !result.forbidden) {
        setScheduledError("Não foi possível carregar as notificações agendadas.");
      }
    } catch {
      setScheduled([]);
      setScheduledError("Não foi possível carregar as notificações agendadas.");
    } finally {
      setScheduledLoading(false);
    }
  }, [context, canCreate]);

  useEffect(() => {
    void loadScheduled();
  }, [loadScheduled]);

  function handleScheduledCreated() {
    setScheduledFeedback("Notificação agendada com sucesso.");
    setScheduledError(null);
    void loadScheduled();
  }

  async function handleCancelScheduled(item: ScheduledNotificationView) {
    if (!context) return;
    if (typeof window !== "undefined" && typeof window.confirm === "function" && !window.confirm("Cancelar esta notificação agendada?")) {
      return;
    }

    setCancelingId(item.id);
    setScheduledFeedback(null);
    setScheduledError(null);
    try {
      await cancelScheduledNotification(context, item.id);
      setScheduledFeedback("Notificação cancelada.");
      await loadScheduled();
    } catch (err) {
      setScheduledError(interpretCancelError(err));
    } finally {
      setCancelingId(null);
    }
  }

  // Categoria é filtrada client-side sobre a janela já carregada (a situação vai ao endpoint).
  const visibleNotifications = useMemo(
    () => filterNotificationsByCategory(notifications, activeCategory),
    [notifications, activeCategory],
  );
  const loadedUnread = notifications.filter((notification) => notification.status === "unread").length;
  const visibleUnread = visibleNotifications.filter((notification) => notification.status === "unread").length;

  async function handleMarkRead(notification: NotificationItem) {
    if (!context) return;

    setActionLoading(notification.id);
    try {
      const updated = await markNotificationAsRead(context, notification.id);
      setNotifications((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      notifyCounterChanged();
    } catch {
      setError("Não foi possível marcar a notificação como lida.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleMarkAllRead() {
    if (!context) return;

    setActionLoading("read-all");
    try {
      await markAllNotificationsAsRead(context);
      await loadNotifications();
      notifyCounterChanged();
    } catch {
      setError("Não foi possível marcar todas as notificações como lidas.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleArchive(notification: NotificationItem) {
    if (!context) return;

    setActionLoading(notification.id);
    try {
      const updated = await archiveNotification(context, notification.id);
      setNotifications((current) =>
        activeTab === "all" || activeTab === "archived"
          ? current.map((item) => (item.id === updated.id ? updated : item))
          : current.filter((item) => item.id !== updated.id),
      );
      notifyCounterChanged();
    } catch {
      setError("Não foi possível arquivar a notificação.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRunAlerts() {
    if (!context) return;

    setActionLoading("run-alerts");
    setError(null);
    setAlertMessage(null);
    try {
      await runFleetAlerts(context);
      await loadNotifications();
      notifyCounterChanged();
      setAlertMessage("Alertas atualizados");
    } catch {
      setError("Não foi possível gerar os alertas de frota.");
    } finally {
      setActionLoading(null);
    }
  }

  function handleOpen(notification: NotificationItem) {
    if (!notification.actionUrl?.startsWith("/") || notification.actionUrl.startsWith("//")) return;
    navigate(notification.actionUrl);
  }

  if (!context) {
    return <ErrorState title="Contexto indisponível" detail="Selecione uma organização ativa antes de consultar notificações." />;
  }

  const busy = loading || Boolean(actionLoading);

  return (
    <div className="page-stack notifications-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>Operação</span>
          <h1>Notificações</h1>
          <p>Avisos e eventos operacionais do seu usuário na organização.</p>
        </div>
        <div className="notification-page-actions">
          {canCreate ? (
            <Button type="button" onClick={() => setDialogOpen(true)}>
              <Plus size={16} aria-hidden />
              Nova notificação
            </Button>
          ) : null}
          {canManage ? (
            <Button type="button" variant="secondary" onClick={handleRunAlerts} disabled={busy}>
              <Sparkles size={16} aria-hidden />
              Gerar alertas
            </Button>
          ) : null}
          <Button type="button" variant="secondary" onClick={handleMarkAllRead} disabled={loadedUnread === 0 || Boolean(actionLoading)}>
            <CheckCheck size={16} aria-hidden />
            Marcar todas como lidas
          </Button>
        </div>
      </header>

      <Card>
        <div className="notification-summary">
          <Bell size={22} aria-hidden />
          <div>
            <strong>{visibleUnread} não lidas</strong>
            <span>{visibleNotifications.length} itens no filtro atual</span>
          </div>
        </div>
      </Card>

      {canCreate ? (
        <Card title="Notificações agendadas">
          {scheduledFeedback ? (
            <Alert title="Tudo certo" tone="info">
              {scheduledFeedback}
            </Alert>
          ) : null}
          {scheduledError ? (
            <Alert title="Falha nas notificações agendadas" tone="warning">
              {scheduledError}
            </Alert>
          ) : null}

          {scheduledForbidden ? (
            <p style={scheduledStatusStyle} role="status">
              Acesso não permitido: você não tem permissão para ver as notificações agendadas.
            </p>
          ) : scheduledLoading && scheduled.length === 0 ? (
            <Skeleton lines={3} />
          ) : scheduled.length === 0 ? (
            <EmptyState
              title="Sem notificações agendadas"
              detail="Use “Nova notificação” para avisar você mesmo ou a organização em uma data e hora."
            />
          ) : (
            <ul style={scheduledListStyle}>
              {scheduled.map((item) => (
                <li key={item.id} style={scheduledItemStyle}>
                  <div style={scheduledInfoStyle}>
                    <strong>{item.title}</strong>
                    <span style={scheduledMetaStyle}>
                      <CalendarClock size={13} aria-hidden /> {formatNotifyAt(item.notifyAt)} · {getVisibilityLabel(item.visibility)}
                    </span>
                  </div>
                  <div style={scheduledActionsStyle}>
                    <Badge tone={getScheduledStatusTone(item.status)}>{getScheduledStatusLabel(item.status)}</Badge>
                    {item.status === "pending" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={cancelingId === item.id}
                        onClick={() => void handleCancelScheduled(item)}
                        aria-label={`Cancelar notificação agendada: ${item.title}`}
                      >
                        <Trash2 size={14} aria-hidden /> Cancelar
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      <div className="notification-category-filter" role="group" aria-label="Filtrar notificações por categoria">
        <Button
          type="button"
          size="sm"
          variant={activeCategory === "all" ? "primary" : "ghost"}
          aria-pressed={activeCategory === "all"}
          onClick={() => setParam("categoria", "all")}
        >
          Todas
        </Button>
        {NOTIFICATION_CATEGORY_ORDER.map((category) => (
          <Button
            key={category}
            type="button"
            size="sm"
            variant={activeCategory === category ? "primary" : "ghost"}
            aria-pressed={activeCategory === category}
            onClick={() => setParam("categoria", category)}
          >
            {NOTIFICATION_CATEGORY_LABELS[category]}
          </Button>
        ))}
      </div>

      <Tabs tabs={tabs} active={activeTab} onChange={(id) => setParam("status", id)} />

      {alertMessage ? (
        <Alert title={alertMessage} tone="info">
          Os produtores de alertas de frota foram executados.
        </Alert>
      ) : null}
      {error ? (
        <Alert title="Falha nas notificações" tone="warning">
          {error}
        </Alert>
      ) : null}
      {loading ? <Skeleton lines={5} /> : null}
      {!loading ? (
        <NotificationList
          notifications={visibleNotifications}
          onArchive={handleArchive}
          onMarkRead={handleMarkRead}
          onOpen={handleOpen}
        />
      ) : null}

      {canCreate && context ? (
        <CreateNotificationDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          context={context}
          onCreated={handleScheduledCreated}
        />
      ) : null}
    </div>
  );
}

export function buildNotificationContext(
  token: string | undefined,
  activeContext: ReturnType<typeof useTenantContext>["activeContext"],
): NotificationApiContext | null {
  if (!activeContext) return null;

  return {
    token,
    tenantId: activeContext.tenantId,
    branchId: activeContext.branchId,
    role: activeContext.role,
    permissions: activeContext.permissions,
  };
}

function notifyCounterChanged(): void {
  window.dispatchEvent(new Event("notifications:changed"));
}
