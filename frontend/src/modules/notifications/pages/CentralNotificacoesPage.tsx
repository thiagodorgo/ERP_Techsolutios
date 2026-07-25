import { Plus, Trash2 } from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { DenseColumn } from "../../../components/dense-list";
import { DenseTable } from "../../../components/dense-list";
import { Alert, Badge, Button, Card, Chip, EmptyState, ErrorState, Input, Select, Skeleton } from "../../../components/ui";
import { useAutoRefresh } from "../../../hooks/useAutoRefresh";
import { useAuth } from "../../../providers/AuthProvider";
import { usePermissions } from "../../../providers/PermissionProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { CreateNotificationDialog } from "../components/CreateNotificationDialog";
import type { NotificationApiContext } from "../notification.types";
import {
  formatNotifyAt,
  getRemindBeforeLabel,
  getScheduledStatusLabel,
  getScheduledStatusTone,
  getSourceTypeLabel,
  getVisibilityLabel,
  interpretCancelError,
} from "../scheduled-notification.adapter";
import { cancelCentralScheduledNotification, listCentralScheduledNotifications } from "../scheduled-notification.service";
import type {
  CentralScheduledNotificationStatusFilter,
  CentralScheduledNotificationView,
} from "../scheduled-notification.types";

// Ω4C PR-20 (D-Ω4C-NOTIF-CENTRAL-SPLIT) — Central de Notificações (tenant-wide). Recria o COMPORTAMENTO do
// AutEM `controle / notificações` (lista TODAS as notificações agendadas da org — manutenção, multas,
// seguros, contas a pagar e avulsas; cadastrar e excluir) no visual do ERP. Consome o motor PR-04:
// GET /notifications/scheduled/central + DELETE .../central/:id + POST /notifications/scheduled (reuso do
// CreateNotificationDialog). §2.8: a view nunca carrega customRecipientIds/sourceId/tenant_id/createdBy.
// Editar = DEFERIDO (D-007, honest-partial). Estados §7: loading/empty/error/acesso não permitido/desatualizado.

const STATUS_FILTER_OPTIONS: readonly { readonly value: CentralScheduledNotificationStatusFilter; readonly label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendentes" },
  { value: "fired", label: "Disparadas" },
  { value: "cancelled", label: "Canceladas" },
];

const NOOP_SORT = () => {};

const actionsStyle: CSSProperties = { display: "flex", alignItems: "flex-end", gap: "var(--space-8)", flexWrap: "wrap" };
const countStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 700 };
const titleCellStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--space-2)" };
const titleRowStyle: CSSProperties = { display: "inline-flex", alignItems: "center", gap: "var(--space-8)", flexWrap: "wrap" };
const secondaryStyle: CSSProperties = { fontSize: "var(--text-xs)", color: "var(--text-secondary)" };
const mutedStyle: CSSProperties = { color: "var(--text-secondary)" };
const retryStyle: CSSProperties = { marginTop: "var(--space-10)" };

// ── View pura (SSR-testável; totalmente controlada pelo container) ────────────────
export type CentralNotificacoesViewProps = {
  readonly items: readonly CentralScheduledNotificationView[];
  readonly loading: boolean;
  readonly isRefreshing: boolean;
  readonly forbidden: boolean;
  readonly error: string | null;
  readonly feedback: string | null;
  readonly statusFilter: CentralScheduledNotificationStatusFilter;
  readonly from: string;
  readonly to: string;
  readonly canCreate: boolean;
  readonly cancelingId: string | null;
  readonly onStatusFilterChange: (value: CentralScheduledNotificationStatusFilter) => void;
  readonly onFromChange: (value: string) => void;
  readonly onToChange: (value: string) => void;
  readonly onCreateClick: () => void;
  readonly onCancelItem: (item: CentralScheduledNotificationView) => void;
  readonly onRetry: () => void;
};

export function CentralNotificacoesView({
  items,
  loading,
  isRefreshing,
  forbidden,
  error,
  feedback,
  statusFilter,
  from,
  to,
  canCreate,
  cancelingId,
  onStatusFilterChange,
  onFromChange,
  onToChange,
  onCreateClick,
  onCancelItem,
  onRetry,
}: CentralNotificacoesViewProps) {
  const columns: DenseColumn<CentralScheduledNotificationView>[] = [
    {
      key: "title",
      header: "Título",
      render: (item) => (
        <div style={titleCellStyle}>
          <div style={titleRowStyle}>
            <strong>{item.title || "—"}</strong>
            {item.mine ? <Chip tone="info">Você</Chip> : null}
          </div>
          {item.message ? <span style={secondaryStyle}>{item.message}</span> : null}
        </div>
      ),
    },
    { key: "notifyAt", header: "Data-alvo", tabular: true, render: (item) => formatNotifyAt(item.notifyAt) },
    { key: "remind", header: "Antecedência", render: (item) => getRemindBeforeLabel(item.remindBeforeMinutes) },
    { key: "visibility", header: "Tipo", render: (item) => getVisibilityLabel(item.visibility) },
    { key: "source", header: "Origem", render: (item) => getSourceTypeLabel(item.sourceType) },
    {
      key: "status",
      header: "Situação",
      render: (item) => <Badge tone={getScheduledStatusTone(item.status)}>{getScheduledStatusLabel(item.status)}</Badge>,
    },
    {
      key: "actions",
      header: "Ações",
      align: "right",
      // Excluir = soft-cancel; só faz sentido em PENDENTE (fired/cancelada não cancela — RN-NOTIFCEN-04).
      render: (item) =>
        item.status === "pending" ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={cancelingId === item.id}
            aria-label={`Excluir notificação: ${item.title}`}
            onClick={() => onCancelItem(item)}
          >
            <Trash2 size={14} aria-hidden /> Excluir
          </Button>
        ) : (
          <span style={mutedStyle} aria-hidden>
            —
          </span>
        ),
    },
  ];

  return (
    <section className="page-stack">
      <header className="page-heading page-heading--row">
        <div>
          <span>Controle · Notificações</span>
          <h1>Central de Notificações</h1>
          <p>Todas as notificações agendadas da organização — de manutenção, multas, seguros, contas a pagar e avisos avulsos.</p>
        </div>
        <div style={actionsStyle}>
          <Select
            label="Situação"
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value as CentralScheduledNotificationStatusFilter)}
          >
            {STATUS_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Input label="De" type="date" value={from} onChange={(event) => onFromChange(event.target.value)} />
          <Input label="Até" type="date" value={to} onChange={(event) => onToChange(event.target.value)} />
          {canCreate ? (
            <Button type="button" onClick={onCreateClick}>
              <Plus size={16} aria-hidden /> Cadastrar notificação
            </Button>
          ) : null}
        </div>
      </header>

      {forbidden ? (
        <ErrorState
          title="Acesso não permitido"
          detail="Seu perfil não tem permissão para gerir as notificações desta organização. Fale com um administrador se precisar deste acesso."
        />
      ) : (
        <>
          {feedback ? (
            <Alert title="Tudo certo" tone="info">
              {feedback}
            </Alert>
          ) : null}
          {error ? (
            <Alert title="Não foi possível carregar" tone="warning">
              {error}
            </Alert>
          ) : null}

          <Card
            title="Notificações agendadas"
            action={
              <span style={countStyle}>
                {items.length} notificação(ões){isRefreshing ? " · atualizando…" : ""}
              </span>
            }
          >
            {loading && items.length === 0 ? <Skeleton lines={6} /> : null}

            {!loading && !error && items.length === 0 ? (
              <EmptyState
                title="Nenhuma notificação cadastrada"
                detail="Cadastre uma notificação avulsa ou aguarde os avisos gerados por manutenção, multas, seguros e contas a pagar."
              />
            ) : null}

            {items.length > 0 ? (
              <DenseTable rows={items} keyForRow={(item) => item.id} columns={columns} sort={null} onSort={NOOP_SORT} />
            ) : null}

            {error ? (
              <div style={retryStyle}>
                <Button type="button" size="sm" variant="secondary" onClick={onRetry}>
                  Tentar novamente
                </Button>
              </div>
            ) : null}
          </Card>
        </>
      )}
    </section>
  );
}

// ── Container: contexto + carga tenant-wide + filtros + ações ao backend ──────────
export function CentralNotificacoesPage() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();
  const context = useMemo(
    () => buildCentralContext(session?.accessToken, activeContext),
    [activeContext, session?.accessToken],
  );
  // Backend é a autoridade: a Central é gestão/broadcast (notifications:create), NÃO o inbox (read).
  const canCreate = can("notifications:create");

  const [statusFilter, setStatusFilter] = useState<CentralScheduledNotificationStatusFilter>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [items, setItems] = useState<CentralScheduledNotificationView[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  // WS-UI-REFRESH — em segundo plano (background) NÃO mostra skeleton: mantém a lista visível sem flicker.
  const load = useCallback(
    async (background = false) => {
      if (!context) return;

      if (background) setIsRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const result = await listCentralScheduledNotifications(context, {
          status: statusFilter === "all" ? undefined : statusFilter,
          from: from || undefined,
          to: to || undefined,
        });
        setItems(result.items);
        setForbidden(result.forbidden);
        if (result.source === "fallback" && !result.forbidden) {
          setError("Não foi possível carregar as notificações agendadas.");
        }
      } catch {
        // D-007: falha real degrada para lista vazia — nunca fabrica notificações.
        setItems([]);
        setError("Não foi possível carregar as notificações agendadas.");
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [context, statusFilter, from, to],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // O sistema recarrega sozinho em segundo plano (dados desatualizados §7); pausa se não há acesso.
  useAutoRefresh(load, { enabled: Boolean(context) && !forbidden });

  function handleCreated() {
    setFeedback("Notificação agendada com sucesso.");
    setError(null);
    void load();
  }

  async function handleCancel(item: CentralScheduledNotificationView) {
    if (!context) return;
    if (typeof window !== "undefined" && typeof window.confirm === "function" && !window.confirm("Excluir esta notificação agendada?")) {
      return;
    }

    setCancelingId(item.id);
    setFeedback(null);
    setError(null);
    try {
      await cancelCentralScheduledNotification(context, item.id);
      setFeedback("Notificação excluída.");
      await load();
    } catch (err) {
      setError(interpretCancelError(err));
    } finally {
      setCancelingId(null);
    }
  }

  if (!context) {
    return <ErrorState title="Contexto indisponível" detail="Selecione uma organização ativa antes de gerir as notificações." />;
  }

  return (
    <>
      <CentralNotificacoesView
        items={items}
        loading={loading}
        isRefreshing={isRefreshing}
        forbidden={forbidden}
        error={error}
        feedback={feedback}
        statusFilter={statusFilter}
        from={from}
        to={to}
        canCreate={canCreate}
        cancelingId={cancelingId}
        onStatusFilterChange={setStatusFilter}
        onFromChange={setFrom}
        onToChange={setTo}
        onCreateClick={() => setDialogOpen(true)}
        onCancelItem={(item) => void handleCancel(item)}
        onRetry={() => void load()}
      />
      {canCreate ? (
        <CreateNotificationDialog open={dialogOpen} onClose={() => setDialogOpen(false)} context={context} onCreated={handleCreated} />
      ) : null}
    </>
  );
}

// Contexto de API a partir da sessão + organização ativa (espelha buildNotificationContext do inbox, sem
// acoplar à página do inbox — que é intocada nesta fatia).
function buildCentralContext(
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

export default CentralNotificacoesPage;
