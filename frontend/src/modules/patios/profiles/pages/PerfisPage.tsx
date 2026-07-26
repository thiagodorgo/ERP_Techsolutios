import { Pencil, Plus, RefreshCw } from "lucide-react";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import type { DenseColumn } from "../../../../components/dense-list";
import { DenseListPagination, DenseTable, DENSE_LIST_FETCH_LIMIT, useDenseList } from "../../../../components/dense-list";
import { Alert, Button, Card, Chip, EmptyState, SearchBar, Skeleton } from "../../../../components/ui";
import { useAutoRefresh } from "../../../../hooks/useAutoRefresh";
import { useAuth } from "../../../../providers/AuthProvider";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { useTenantContext } from "../../../../providers/TenantProvider";
import { PerfilFormModal } from "../components/PerfilFormModal";
import {
  filterProfiles,
  getDailyCapLabel,
  getDailyModelLabel,
  getProfileActiveLabel,
  getProfileActiveTone,
  getScopeLabel,
  getScopeTone,
} from "../profiles.adapter";
import { getProfile } from "../profiles.service";
import type { ProfileDetail, ProfileItem, ProfileScopeFilter, ProfilesFilters } from "../profiles.types";
import { useProfiles } from "../useProfiles";

// Perfis Normativos (Ω5P PR-04) — dense-list ligada ao endpoint real /api/v1/jurisdiction-profiles.
const STABLE_FILTERS: ProfilesFilters = { search: "", isActive: "all", limit: DENSE_LIST_FETCH_LIMIT };

const ACTIVE_TABS: readonly { value: ProfilesFilters["isActive"]; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" },
];

const SCOPE_TABS: readonly { value: ProfileScopeFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "PUBLIC_AGREEMENT", label: "Convênio público" },
  { value: "PRIVATE_CONTRACT", label: "Contrato privado" },
];

const filterRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)", flexWrap: "wrap" };
const filterLabelStyle: CSSProperties = { fontSize: "var(--text-xs)", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" };
const dividerStyle: CSSProperties = { width: 1, alignSelf: "stretch", background: "var(--border-subtle, #E2E8F0)", margin: "0 var(--space-4)" };
const countStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 700 };

export function PerfisPage() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();
  const { items, pagination, loading, error, refresh } = useProfiles(STABLE_FILTERS);
  useAutoRefresh(refresh, { enabled: Boolean(activeContext) });

  const [editing, setEditing] = useState<ProfileDetail | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [scopeFilter, setScopeFilter] = useState<ProfileScopeFilter>("all");
  const [loadError, setLoadError] = useState<string | null>(null);

  const canCreate = can("jurisdiction:create");
  const canUpdate = can("jurisdiction:update");

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

  const scopeFiltered = useMemo(
    () => (scopeFilter === "all" ? items : items.filter((profile) => profile.scope === scopeFilter)),
    [items, scopeFilter],
  );

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  async function openEdit(profile: ProfileItem) {
    setLoadError(null);
    try {
      const detail = await getProfile(context, profile.id);
      if (!detail) {
        setLoadError("Não foi possível carregar o perfil selecionado.");
        return;
      }
      setEditing(detail);
      setModalOpen(true);
    } catch {
      setLoadError("Não foi possível carregar o perfil selecionado.");
    }
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  const columns: DenseColumn<ProfileItem>[] = [
    { key: "name", header: "Nome", sortable: true, sortValue: (profile) => profile.name, render: (profile) => <strong>{profile.name}</strong> },
    {
      key: "scope",
      header: "Escopo",
      sortable: true,
      sortValue: (profile) => getScopeLabel(profile.scope),
      render: (profile) => <Chip tone={getScopeTone(profile.scope)}>{getScopeLabel(profile.scope)}</Chip>,
    },
    {
      key: "dailyModel",
      header: "Modelo de diária",
      sortable: true,
      sortValue: (profile) => getDailyModelLabel(profile.dailyModel),
      render: (profile) => getDailyModelLabel(profile.dailyModel),
    },
    {
      key: "dailyCap",
      header: "Teto de estada",
      sortable: true,
      sortValue: (profile) => getDailyCapLabel(profile.dailyCap),
      render: (profile) => profile.dailyCapLabel || getDailyCapLabel(profile.dailyCap),
    },
    {
      key: "active",
      header: "Situação",
      sortable: true,
      sortValue: (profile) => getProfileActiveLabel(profile.active),
      render: (profile) => <Chip tone={getProfileActiveTone(profile.active)}>{getProfileActiveLabel(profile.active)}</Chip>,
    },
    {
      key: "actions",
      header: "Ações",
      render: (profile) =>
        canUpdate ? (
          <div className="work-orders-row-actions" onClick={(event) => event.stopPropagation()}>
            <Button type="button" size="sm" variant="secondary" aria-label={`Editar o perfil ${profile.name}`} onClick={() => void openEdit(profile)}>
              <Pencil size={14} aria-hidden /> Editar
            </Button>
          </div>
        ) : (
          <span style={countStyle}>—</span>
        ),
    },
  ];

  const dense = useDenseList<ProfileItem>({ items: scopeFiltered, columns, filter: filterProfiles, defaultSort: { key: "name", dir: "asc" } });
  const hasAnyFilter = dense.hasActiveFilters || scopeFilter !== "all";

  return (
    <section className="page-stack work-orders-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>Pátios</span>
          <h1>Perfis Normativos</h1>
          <p>Parâmetros federais por convênio público ou contrato privado — prazos, modelo e teto de diária e exigências de liberação.</p>
        </div>
        <div className="work-orders-actions">
          <SearchBar value={dense.search} onChange={dense.setSearch} placeholder="Buscar por nome ou escopo…" />
          {canCreate ? (
            <Button type="button" onClick={openCreate}>
              <Plus size={16} aria-hidden /> Novo perfil
            </Button>
          ) : null}
        </div>
      </header>

      {error ? (
        <Alert title="Não foi possível carregar os perfis normativos" tone="warning">
          {error}
        </Alert>
      ) : null}

      {loadError ? (
        <Alert title="Não foi possível abrir o perfil" tone="danger">
          {loadError}
        </Alert>
      ) : null}

      <div style={filterRowStyle}>
        <span style={filterLabelStyle}>Situação</span>
        {ACTIVE_TABS.map((tab) => (
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
        <span style={dividerStyle} aria-hidden />
        <span style={filterLabelStyle}>Escopo</span>
        {SCOPE_TABS.map((tab) => (
          <Button
            key={tab.value}
            type="button"
            size="sm"
            variant={scopeFilter === tab.value ? "primary" : "ghost"}
            aria-pressed={scopeFilter === tab.value}
            onClick={() => setScopeFilter(tab.value)}
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
        title="Perfis cadastrados"
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
            title="Nenhum perfil normativo cadastrado"
            detail={hasAnyFilter ? "Ajuste a busca ou os filtros para encontrar perfis." : "Cadastre o primeiro perfil normativo para parametrizar prazos, diária e exigências de liberação."}
          />
        ) : null}

        {!error && dense.total > 0 ? (
          <>
            <DenseTable rows={dense.visibleItems} keyForRow={(profile) => profile.id} columns={columns} sort={dense.sort} onSort={dense.toggleSort} />
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
        <PerfilFormModal
          key={editing?.id ?? "new"}
          profile={editing}
          context={context}
          onClose={closeModal}
          onSaved={() => {
            closeModal();
            void refresh();
          }}
        />
      ) : null}
    </section>
  );
}

export default PerfisPage;
