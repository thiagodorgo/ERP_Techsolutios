import { Ban, Pencil, Plus, RefreshCw, RotateCcw, ScrollText, ShieldCheck, UserCheck, Users, UserX } from "lucide-react";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import type { DenseColumn } from "../../../components/dense-list";
import { DenseListPagination, DenseTable, DENSE_LIST_FETCH_LIMIT, useDenseList } from "../../../components/dense-list";
import { Alert, Button, Card, Chip, EmptyState, Modal, SearchBar, Skeleton } from "../../../components/ui";
import { useAutoRefresh } from "../../../hooks/useAutoRefresh";
import { useAuth } from "../../../providers/AuthProvider";
import { usePermissions } from "../../../providers/PermissionProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { UserFormModal } from "../components/UserFormModal";
import {
  computeUserTotals,
  filterUsers,
  formatUserDate,
  formatUserRoles,
  getUserStatusLabel,
  getUserStatusTone,
  interpretUserSubmitError,
} from "../users.adapter";
import { updateUser } from "../users.service";
import type { User, UsersFilters, UsersStatusFilter } from "../users.types";
import { useUsers } from "../useUsers";

// F9 Usuários — lista densa ligada ao endpoint real /api/v1/users (D-007: sem linhas fabricadas).
// Janela carregada uma vez (limit); situação/busca/ordenação/paginação são client-side.
const STABLE_FILTERS: UsersFilters = { search: "", isActive: "all", limit: DENSE_LIST_FETCH_LIMIT };

const STATUS_TABS: readonly { value: UsersStatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" },
];

const filterRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)", flexWrap: "wrap" };
const countStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 700 };
const mutedStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)" };
const tabularStyle: CSSProperties = { fontVariantNumeric: "tabular-nums" };
const totalsGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-10)" };
const userCellStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--space-2)" };
const confirmFooterStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };

export function UsersPage() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();
  const { items, pagination, loading, error, refresh } = useUsers(STABLE_FILTERS);
  // WS-UI-REFRESH — o sistema recarrega sozinho em segundo plano (sem botão "Atualizar").
  useAutoRefresh(refresh, { enabled: Boolean(activeContext) });

  const [editing, setEditing] = useState<User | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingToggle, setPendingToggle] = useState<User | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canManage = can("users.manage");
  // Trilha de auditoria visível para quem enxerga auditoria (auditor/tenant_admin/manager/support).
  const canSeeAudit = can("audit.read") || can("audit:read");

  const context = useMemo(
    () => ({
      token: session?.accessToken,
      tenantId: activeContext?.tenantId,
      branchId: activeContext?.branchId,
      role: activeContext?.role,
      permissions: activeContext?.permissions,
    }),
    [activeContext, session?.accessToken],
  );

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(user: User) {
    setEditing(user);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  // Ativação/desativação lógica (PATCH status) com confirmação (screen-element-map F9).
  async function confirmToggle() {
    const target = pendingToggle;
    if (!target) return;
    setBusyId(target.id);
    setActionError(null);
    try {
      await updateUser(context, target.id, { status: target.status === "active" ? "inactive" : "active" });
      setPendingToggle(null);
      await refresh();
    } catch (submitError) {
      const feedback = interpretUserSubmitError(submitError, "update");
      setActionError(feedback.message);
    } finally {
      setBusyId(null);
    }
  }

  const columns: DenseColumn<User>[] = [
    {
      key: "name",
      header: "Usuário",
      sortable: true,
      sortValue: (user) => user.name,
      render: (user) => (
        <div style={userCellStyle}>
          <strong>{user.name}</strong>
          {user.email ? <span style={mutedStyle}>{user.email}</span> : null}
        </div>
      ),
    },
    {
      key: "roles",
      header: "Papel",
      sortable: true,
      sortValue: (user) => formatUserRoles(user.roles),
      render: (user) => formatUserRoles(user.roles),
    },
    {
      key: "status",
      header: "Situação",
      sortable: true,
      sortValue: (user) => getUserStatusLabel(user.status),
      render: (user) => <Chip tone={getUserStatusTone(user.status)}>{getUserStatusLabel(user.status)}</Chip>,
    },
    {
      key: "createdAt",
      header: "Criado em",
      sortable: true,
      tabular: true,
      sortValue: (user) => user.createdAt,
      render: (user) => formatUserDate(user.createdAt),
    },
    {
      key: "actions",
      header: "Ações",
      render: (user) => {
        if (!canManage && !canSeeAudit) return <span style={countStyle}>—</span>;
        return (
          <div className="work-orders-row-actions" onClick={(event) => event.stopPropagation()}>
            {canManage ? (
              <>
                <Button type="button" size="sm" variant="secondary" aria-label={`Editar ${user.name}`} onClick={() => openEdit(user)}>
                  <Pencil size={14} aria-hidden /> Editar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busyId === user.id}
                  aria-label={user.status === "active" ? `Desativar ${user.name}` : `Ativar ${user.name}`}
                  onClick={() => setPendingToggle(user)}
                >
                  {user.status === "active" ? <Ban size={14} aria-hidden /> : <RotateCcw size={14} aria-hidden />}
                  {user.status === "active" ? "Desativar" : "Ativar"}
                </Button>
              </>
            ) : null}
            {canSeeAudit ? (
              <Link className="ui-button ui-button--ghost ui-button--sm" to="/audit" aria-label={`Auditoria de ${user.name}`}>
                <ScrollText size={14} aria-hidden /> Auditoria
              </Link>
            ) : null}
          </div>
        );
      },
    },
  ];

  const dense = useDenseList<User>({ items, columns, filter: filterUsers, defaultSort: { key: "name", dir: "asc" } });

  // KPIs reais da janela filtrada (renderiza mesmo vazio) — sem números fixos.
  const totalsBase = useMemo(
    () => filterUsers(items, { search: dense.search, isActive: dense.status }),
    [items, dense.search, dense.status],
  );
  const totals = useMemo(() => computeUserTotals(totalsBase), [totalsBase]);

  return (
    <section className="page-stack work-orders-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>Administração</span>
          <h1>Usuários</h1>
          <p>Gestão de acesso da organização — papéis, situação e trilha de auditoria.</p>
        </div>
        <div className="work-orders-actions">
          <SearchBar value={dense.search} onChange={dense.setSearch} placeholder="Buscar por nome, e-mail ou papel…" />
          {canManage ? (
            <Button type="button" onClick={openCreate}>
              <Plus size={16} aria-hidden /> Novo usuário
            </Button>
          ) : null}
        </div>
      </header>

      {error ? (
        <Alert title="Não foi possível carregar os usuários" tone="warning">
          {error}
        </Alert>
      ) : null}

      {actionError ? (
        <Alert title="Ação não concluída" tone="danger">
          {actionError}
        </Alert>
      ) : null}

      <div style={totalsGridStyle}>
        <div className="work-orders-kpi">
          <span>
            <UserCheck size={16} aria-hidden /> Ativos
          </span>
          <strong style={tabularStyle}>{totals.ativos.toLocaleString("pt-BR")}</strong>
        </div>
        <div className="work-orders-kpi">
          <span>
            <UserX size={16} aria-hidden /> Inativos
          </span>
          <strong style={tabularStyle}>{totals.inativos.toLocaleString("pt-BR")}</strong>
        </div>
        <div className="work-orders-kpi">
          <span>
            <Users size={16} aria-hidden /> Total
          </span>
          <strong style={tabularStyle}>{totals.total.toLocaleString("pt-BR")}</strong>
        </div>
        <div className="work-orders-kpi">
          <span>
            <ShieldCheck size={16} aria-hidden /> Papéis
          </span>
          <strong style={tabularStyle}>{totals.papeis.toLocaleString("pt-BR")}</strong>
        </div>
      </div>

      <div style={filterRowStyle} role="group" aria-label="Filtrar usuários por situação">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.value}
            type="button"
            size="sm"
            variant={dense.status === tab.value ? "primary" : "ghost"}
            aria-pressed={dense.status === tab.value}
            onClick={() => dense.setStatus(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
        {error ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => void refresh()}>
            <RefreshCw size={14} aria-hidden /> Tentar novamente
          </Button>
        ) : null}
      </div>

      <Card
        title="Usuários da organização"
        action={
          <span style={countStyle}>
            {dense.total} registro(s)
            {pagination.total > items.length ? ` · janela: primeiros ${items.length} de ${pagination.total}` : ""}
          </span>
        }
      >
        {loading && items.length === 0 ? <Skeleton lines={5} /> : null}

        {!loading && !error && dense.total === 0 ? (
          <EmptyState
            title="Nenhum usuário encontrado"
            detail={
              dense.hasActiveFilters
                ? "Ajuste a busca ou o filtro de situação para encontrar usuários."
                : "Cadastre o primeiro usuário para dar acesso à organização."
            }
          />
        ) : null}

        {!error && dense.total > 0 ? (
          <>
            <DenseTable rows={dense.visibleItems} keyForRow={(user) => user.id} columns={columns} sort={dense.sort} onSort={dense.toggleSort} />
            <DenseListPagination
              page={dense.page}
              pageSize={dense.pageSize}
              pageSizeOptions={dense.pageSizeOptions}
              total={dense.total}
              totalPages={dense.totalPages}
              pageStart={dense.pageStart}
              pageEnd={dense.pageEnd}
              onPageChange={dense.setPage}
              onPageSizeChange={dense.setPageSize}
            />
          </>
        ) : null}
      </Card>

      {modalOpen ? (
        <UserFormModal
          key={editing?.id ?? "new"}
          user={editing}
          context={context}
          onClose={closeModal}
          onSaved={() => {
            closeModal();
            void refresh();
          }}
        />
      ) : null}

      {pendingToggle ? (
        <Modal
          title={pendingToggle.status === "active" ? "Desativar usuário" : "Ativar usuário"}
          open
          onClose={() => setPendingToggle(null)}
        >
          <p>
            {pendingToggle.status === "active"
              ? `Desativar o acesso de ${pendingToggle.name}? A pessoa deixa de entrar na organização até ser reativada.`
              : `Reativar o acesso de ${pendingToggle.name}?`}
          </p>
          <footer style={confirmFooterStyle}>
            <Button type="button" variant="ghost" onClick={() => setPendingToggle(null)} disabled={busyId === pendingToggle.id}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant={pendingToggle.status === "active" ? "danger" : "primary"}
              disabled={busyId === pendingToggle.id}
              onClick={() => void confirmToggle()}
            >
              {busyId === pendingToggle.id ? "Salvando…" : pendingToggle.status === "active" ? "Desativar" : "Ativar"}
            </Button>
          </footer>
        </Modal>
      ) : null}
    </section>
  );
}

export default UsersPage;
