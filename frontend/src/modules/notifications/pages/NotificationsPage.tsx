import { Bell, CheckCheck, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Alert, Button, Card, ErrorState, Skeleton, Tabs } from "../../../components/ui";
import { useAuth } from "../../../providers/AuthProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { archiveNotification, listNotifications, markAllNotificationsAsRead, markNotificationAsRead } from "../notification.service";
import type { NotificationApiContext, NotificationItem, NotificationStatus } from "../notification.types";
import { NotificationList } from "../components/NotificationList";

type FilterTab = "all" | NotificationStatus;

const tabs = [
  { id: "all", label: "Todas" },
  { id: "unread", label: "Nao lidas" },
  { id: "read", label: "Lidas" },
  { id: "archived", label: "Arquivadas" },
];

export function NotificationsPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const context = useMemo(() => buildNotificationContext(session?.accessToken, activeContext), [activeContext, session?.accessToken]);
  const unreadCount = notifications.filter((notification) => notification.status === "unread").length;

  const loadNotifications = useCallback(async () => {
    if (!context) return;

    setLoading(true);
    setError(null);

    try {
      const status = activeTab === "all" ? undefined : activeTab;
      setNotifications(await listNotifications(context, { status }));
    } catch {
      setError("Nao foi possivel carregar suas notificacoes.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, context]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  async function handleMarkRead(notification: NotificationItem) {
    if (!context) return;

    setActionLoading(notification.id);
    try {
      const updated = await markNotificationAsRead(context, notification.id);
      setNotifications((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      notifyCounterChanged();
    } catch {
      setError("Nao foi possivel marcar a notificacao como lida.");
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
      setError("Nao foi possivel marcar todas as notificacoes como lidas.");
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
      setError("Nao foi possivel arquivar a notificacao.");
    } finally {
      setActionLoading(null);
    }
  }

  function handleOpen(notification: NotificationItem) {
    if (!notification.actionUrl?.startsWith("/") || notification.actionUrl.startsWith("//")) return;
    navigate(notification.actionUrl);
  }

  if (!context) {
    return <ErrorState title="Contexto indisponivel" detail="Selecione um tenant ativo antes de consultar notificacoes." />;
  }

  return (
    <div className="page-stack notifications-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>Operacao</span>
          <h1>Notificacoes</h1>
          <p>Inbox interna do seu usuario para eventos operacionais relevantes do tenant ativo.</p>
        </div>
        <div className="notification-page-actions">
          <Button type="button" variant="secondary" onClick={loadNotifications} disabled={loading || Boolean(actionLoading)}>
            <RefreshCw size={16} />
            Atualizar
          </Button>
          <Button type="button" onClick={handleMarkAllRead} disabled={unreadCount === 0 || Boolean(actionLoading)}>
            <CheckCheck size={16} />
            Marcar todas como lidas
          </Button>
        </div>
      </header>

      <Card>
        <div className="notification-summary">
          <Bell size={22} />
          <div>
            <strong>{unreadCount} nao lidas</strong>
            <span>{notifications.length} itens no filtro atual</span>
          </div>
        </div>
      </Card>

      <Tabs tabs={tabs} active={activeTab} onChange={(id) => setActiveTab(id as FilterTab)} />

      {error ? (
        <Alert title="Falha na inbox" tone="warning">
          {error}
        </Alert>
      ) : null}
      {loading ? <Skeleton lines={5} /> : null}
      {!loading ? (
        <NotificationList
          notifications={notifications}
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
