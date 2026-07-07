import { Ban, Pencil, Plus, RefreshCw, RotateCcw } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";

import { Alert, Button, Card, Chip, EmptyState, SearchBar, Skeleton, Table } from "../../../../components/ui";
import { useAuth } from "../../../../providers/AuthProvider";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { useTenantContext } from "../../../../providers/TenantProvider";
import { TeamFormModal } from "../components/TeamFormModal";
import { filterTeams, formatTeamMemberCount, getTeamOperationalStatusLabel, getTeamStatusLabel, getTeamStatusTone } from "../teams.adapter";
import { listTenantUsers, updateTeam } from "../teams.service";
import type { Team, TeamsFilters, TeamsStatusFilter, TenantUser } from "../teams.types";
import { useTeams } from "../useTeams";

// Lista de "Equipes" (cadastro) — ligada ao endpoint real /api/v1/teams.
// Busca full-list uma vez (filtros estáveis) e filtra em memória para evitar refresh loop.
const STABLE_FILTERS: TeamsFilters = { search: "", isActive: "all" };

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
  const { items, loading, error, refresh } = useTeams(STABLE_FILTERS);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TeamsStatusFilter>("all");
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

  const visible = useMemo(() => filterTeams(items, { search, isActive: statusFilter }), [items, search, statusFilter]);
  const hasActiveFilters = search.trim().length > 0 || statusFilter !== "all";

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

  const columns = [
    { key: "name", header: "Nome", render: (team: Team) => <strong>{team.name}</strong> },
    { key: "leader", header: "Líder", render: (team: Team) => resolveLeader(team) },
    { key: "members", header: "Membros", render: (team: Team) => formatTeamMemberCount(team) },
    { key: "opstatus", header: "Status", render: (team: Team) => getTeamOperationalStatusLabel(team.status) },
    {
      key: "status",
      header: "Situação",
      render: (team: Team) => <Chip tone={getTeamStatusTone(team.isActive)}>{getTeamStatusLabel(team.isActive)}</Chip>,
    },
    {
      key: "actions",
      header: "Ações",
      render: (team: Team) =>
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

  return (
    <section className="page-stack work-orders-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>Cadastros</span>
          <h1>Equipes</h1>
          <p>Cadastro das equipes de campo da organização — líder, integrantes e situação operacional.</p>
        </div>
        <div className="work-orders-actions">
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nome da equipe…" />
          <Button type="button" variant="secondary" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw size={16} aria-hidden /> Atualizar
          </Button>
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
            variant={statusFilter === tab.value ? "primary" : "ghost"}
            aria-pressed={statusFilter === tab.value}
            onClick={() => setStatusFilter(tab.value)}
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

      <Card title="Equipes cadastradas" action={<span style={countStyle}>{visible.length} registro(s)</span>}>
        {loading && items.length === 0 ? <Skeleton lines={5} /> : null}

        {!loading && !error && visible.length === 0 ? (
          <EmptyState
            title="Nenhuma equipe cadastrada"
            detail={hasActiveFilters ? "Ajuste a busca ou o filtro de situação para encontrar equipes." : "Cadastre a primeira equipe para começar a operar."}
          />
        ) : null}

        {!error && visible.length > 0 ? <Table rows={visible} keyForRow={(team) => team.id} columns={columns} /> : null}
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
