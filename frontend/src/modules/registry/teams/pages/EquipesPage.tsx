import { Ban, Pencil, Plus, RefreshCw, RotateCcw } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";

import type { DenseColumn } from "../../../../components/dense-list";
import { DenseListPagination, DenseTable, DENSE_LIST_FETCH_LIMIT, useDenseList } from "../../../../components/dense-list";
import { Alert, Button, Card, Chip, EmptyState, SearchBar, Skeleton } from "../../../../components/ui";
import { useAutoRefresh } from "../../../../hooks/useAutoRefresh";
import { useAuth } from "../../../../providers/AuthProvider";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { useTenantContext } from "../../../../providers/TenantProvider";
import { TeamFormModal } from "../components/TeamFormModal";
import {
  filterTeams,
  formatTeamDate,
  formatTeamMemberCount,
  getTeamOperationalStatusLabel,
  getTeamStatusLabel,
  getTeamStatusTone,
} from "../teams.adapter";
import { listTenantUsers, updateTeam } from "../teams.service";
import type { Team, TeamsFilters, TeamsStatusFilter, TenantUser } from "../teams.types";
import { useTeams } from "../useTeams";

// Lista de "Equipes" (cadastro) — ligada ao endpoint real /api/v1/teams.
// Carrega a janela de trabalho (limit) uma vez; busca/ordenação/paginação são client-side.
const STABLE_FILTERS: TeamsFilters = { search: "", isActive: "all", limit: DENSE_LIST_FETCH_LIMIT };

const STATUS_TABS: readonly { value: TeamsStatusFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "active", label: "Ativas" },
  { value: "inactive", label: "Inativas" },
];

const filterRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)", flexWrap: "wrap" };
const countStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 700 };

export function EquipesPage() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();
  const { items, pagination, loading, error, refresh } = useTeams(STABLE_FILTERS);
  // WS-UI-REFRESH — o sistema recarrega sozinho em segundo plano (sem botão "Atualizar").
  useAutoRefresh(refresh, { enabled: Boolean(activeContext) });

  const [editing, setEditing] = useState<Team | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [users, setUsers] = useState<TenantUser[]>([]);

  const canCreate = can("teams:create");
  const canUpdate = can("teams:update");

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

  // Carrega os usuários da organização uma vez para resolver líder e popular os seletores.
  useEffect(() => {
    if (!activeContext) return;
    let active = true;
    void listTenantUsers(context).then((loaded) => {
      if (active) setUsers(loaded);
    });
    return () => {
      active = false;
    };
  }, [activeContext, context]);

  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user.name])), [users]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(team: Team) {
    setEditing(team);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  async function toggleActive(team: Team) {
    setBusyId(team.id);
    setActionError(null);
    try {
      await updateTeam(context, team.id, { isActive: !team.isActive });
      await refresh();
    } catch {
      setActionError(`Não foi possível ${team.isActive ? "desativar" : "reativar"} a equipe ${team.name}. Tente novamente.`);
    } finally {
      setBusyId(null);
    }
  }

  function resolveLeader(team: Team): string {
    if (!team.leaderUserId) return "—";
    // Distingue "sem líder" de "líder não resolvido" (ex.: lista de usuários indisponível).
    return usersById.get(team.leaderUserId) ?? "Líder indisponível";
  }

  const columns: DenseColumn<Team>[] = [
    { key: "name", header: "Nome", sortable: true, sortValue: (team) => team.name, render: (team) => <strong>{team.name}</strong> },
    { key: "leader", header: "Líder", sortable: true, sortValue: (team) => resolveLeader(team), render: (team) => resolveLeader(team) },
    {
      key: "members",
      header: "Membros",
      sortable: true,
      align: "right",
      tabular: true,
      sortValue: (team) => formatTeamMemberCount(team),
      render: (team) => formatTeamMemberCount(team),
    },
    {
      key: "opstatus",
      header: "Status",
      sortable: true,
      sortValue: (team) => getTeamOperationalStatusLabel(team.status),
      render: (team) => getTeamOperationalStatusLabel(team.status),
    },
    {
      key: "status",
      header: "Situação",
      sortable: true,
      sortValue: (team) => getTeamStatusLabel(team.isActive),
      render: (team) => <Chip tone={getTeamStatusTone(team.isActive)}>{getTeamStatusLabel(team.isActive)}</Chip>,
    },
    {
      key: "createdAt",
      header: "Criada em",
      sortable: true,
      tabular: true,
      sortValue: (team) => team.createdAt,
      render: (team) => formatTeamDate(team.createdAt),
    },
    {
      key: "actions",
      header: "Ações",
      render: (team) =>
        canUpdate ? (
          <div className="work-orders-row-actions" onClick={(event) => event.stopPropagation()}>
            <Button type="button" size="sm" variant="secondary" aria-label={`Editar ${team.name}`} onClick={() => openEdit(team)}>
              <Pencil size={14} aria-hidden /> Editar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busyId === team.id}
              aria-label={team.isActive ? `Desativar ${team.name}` : `Reativar ${team.name}`}
              onClick={() => void toggleActive(team)}
            >
              {team.isActive ? <Ban size={14} aria-hidden /> : <RotateCcw size={14} aria-hidden />}
              {team.isActive ? "Desativar" : "Reativar"}
            </Button>
          </div>
        ) : (
          <span style={countStyle}>—</span>
        ),
    },
  ];

  const dense = useDenseList<Team>({ items, columns, filter: filterTeams, defaultSort: { key: "name", dir: "asc" } });

  return (
    <section className="page-stack work-orders-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>Cadastros</span>
          <h1>Equipes</h1>
          <p>Cadastro das equipes de campo da organização — líder, integrantes e situação operacional.</p>
        </div>
        <div className="work-orders-actions">
          <SearchBar value={dense.search} onChange={dense.setSearch} placeholder="Buscar por nome da equipe…" />
          {canCreate ? (
            <Button type="button" onClick={openCreate}>
              <Plus size={16} aria-hidden /> Nova equipe
            </Button>
          ) : null}
        </div>
      </header>

      {error ? (
        <Alert title="Não foi possível carregar as equipes" tone="warning">
          {error}
        </Alert>
      ) : null}

      {actionError ? (
        <Alert title="Ação não concluída" tone="danger">
          {actionError}
        </Alert>
      ) : null}

      <div style={filterRowStyle}>
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
        title="Equipes cadastradas"
        action={
          <span style={countStyle}>
            {dense.total} registro(s)
            {pagination.total > items.length ? ` · janela: primeiras ${items.length} de ${pagination.total}` : ""}
          </span>
        }
      >
        {loading && items.length === 0 ? <Skeleton lines={5} /> : null}

        {!loading && !error && dense.total === 0 ? (
          <EmptyState
            title="Nenhuma equipe cadastrada"
            detail={dense.hasActiveFilters ? "Ajuste a busca ou o filtro de situação para encontrar equipes." : "Cadastre a primeira equipe para começar a operar."}
          />
        ) : null}

        {!error && dense.total > 0 ? (
          <>
            <DenseTable rows={dense.visibleItems} keyForRow={(team) => team.id} columns={columns} sort={dense.sort} onSort={dense.toggleSort} />
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
        <TeamFormModal
          key={editing?.id ?? "new"}
          team={editing}
          context={context}
          users={users}
          onClose={closeModal}
          onSaved={() => {
            closeModal();
            void refresh();
          }}
          onMembersChanged={() => void refresh()}
        />
      ) : null}
    </section>
  );
}

export default EquipesPage;
