import { Bell, CheckCheck, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Alert, Button, Card, ErrorState, Skeleton, Tabs } from "../../../components/ui";
import { useAutoRefresh } from "../../../hooks/useAutoRefresh";
import { useAuth } from "../../../providers/AuthProvider";
import { usePermissions } from "../../../providers/PermissionProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
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
          {canManage ? (
            <Button type="button" variant="secondary" onClick={handleRunAlerts} disabled={busy}>
              <Sparkles size={16} aria-hidden />
              Gerar alertas
            </Button>
          ) : null}
          <Button type="button" onClick={handleMarkAllRead} disabled={loadedUnread === 0 || Boolean(actionLoading)}>
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
