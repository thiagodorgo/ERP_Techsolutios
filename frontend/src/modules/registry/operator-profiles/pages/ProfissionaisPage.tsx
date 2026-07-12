import { Pencil, Plus, RefreshCw } from "lucide-react";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import type { DenseColumn } from "../../../../components/dense-list";
import { DenseListPagination, DenseTable, DENSE_LIST_FETCH_LIMIT, useDenseList } from "../../../../components/dense-list";
import { Alert, Button, Card, Chip, EmptyState, SearchBar, Skeleton } from "../../../../components/ui";
import { useAuth } from "../../../../providers/AuthProvider";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { useTenantContext } from "../../../../providers/TenantProvider";
import { OperatorProfileFormModal } from "../components/OperatorProfileFormModal";
import {
  filterOperatorProfiles,
  formatCnhStatus,
  formatConsentStatus,
  formatUserIdShort,
  getOperatorProfileDisplayName,
  getOperatorProfileStatusLabel,
  getOperatorProfileStatusTone,
} from "../operator-profiles.adapter";
import type { OperatorProfileActiveFilter, OperatorProfileConsentFilter, OperatorProfileItem, OperatorProfilesFilters } from "../operator-profiles.types";
import { useOperatorProfiles } from "../useOperatorProfiles";

// Lista de Profissionais (Ω2-c) — perfis profissionais (OperatorProfile) 1-1 com um Usuário.
// Endpoint /api/v1/operator-profiles. A janela (limit) é carregada por consentimento selecionado;
// busca/situação/ordenação/paginação são client-side na dense-list.
const ACTIVE_TABS: readonly { value: OperatorProfileActiveFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" },
];

const CONSENT_TABS: readonly { value: OperatorProfileConsentFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "with", label: "Consentiram" },
  { value: "without", label: "Sem consentimento" },
];

const filterRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)", flexWrap: "wrap" };
const filterLabelStyle: CSSProperties = { fontSize: "var(--text-xs)", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" };
const dividerStyle: CSSProperties = { width: 1, alignSelf: "stretch", background: "var(--border-subtle, #E2E8F0)", margin: "0 var(--space-4)" };
const countStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 700 };
const mutedStyle: CSSProperties = { color: "var(--text-secondary)" };
const monoStyle: CSSProperties = { fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)", fontSize: "var(--text-xs)" };
const stackCellStyle: CSSProperties = { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "var(--space-4)" };

export function ProfissionaisPage() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();

  const [hasConsent, setHasConsent] = useState<OperatorProfileConsentFilter>("all");

  // Filtro server-side por consentimento muda a janela buscada; memorizado para não re-buscar em loop.
  const filters = useMemo<OperatorProfilesFilters>(
    () => ({ search: "", isActive: "all", hasConsent, limit: DENSE_LIST_FETCH_LIMIT }),
    [hasConsent],
  );

  const { items, pagination, loading, error, refresh } = useOperatorProfiles(filters);

  const [editing, setEditing] = useState<OperatorProfileItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const canCreate = can("operator_profiles:create");
  const canUpdate = can("operator_profiles:update");

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

  function openEdit(profile: OperatorProfileItem) {
    setEditing(profile);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  const columns: DenseColumn<OperatorProfileItem>[] = [
    {
      key: "fullName",
      header: "Profissional",
      sortable: true,
      sortValue: (profile) => profile.fullName ?? "",
      render: (profile) =>
        profile.fullName ? <strong>{getOperatorProfileDisplayName(profile)}</strong> : <span style={mutedStyle}>—</span>,
    },
    {
      key: "userId",
      header: "Usuário",
      tabular: true,
      render: (profile) => (
        <code style={monoStyle} title={profile.userId}>
          {formatUserIdShort(profile.userId)}
        </code>
      ),
    },
    {
      key: "cnh",
      header: "CNH",
      sortable: true,
      sortValue: (profile) => profile.cnhExpiresAt ?? "",
      render: (profile) => {
        const status = formatCnhStatus(profile.cnhNumber, profile.cnhExpiresAt);
        return (
          <div style={stackCellStyle}>
            {profile.cnhNumber ? (
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {profile.cnhNumber}
                {profile.cnhCategory ? ` · ${profile.cnhCategory}` : ""}
              </span>
            ) : null}
            <Chip tone={status.tone}>{status.label}</Chip>
          </div>
        );
      },
    },
    {
      key: "consent",
      header: "Rastreamento",
      sortable: true,
      sortValue: (profile) => (profile.trackingConsent ? 1 : 0),
      render: (profile) => {
        const status = formatConsentStatus(profile.trackingConsent, profile.trackingConsentAt);
        return <Chip tone={status.tone}>{status.label}</Chip>;
      },
    },
    {
      key: "isActive",
      header: "Situação",
      sortable: true,
      sortValue: (profile) => getOperatorProfileStatusLabel(profile.isActive),
      render: (profile) => <Chip tone={getOperatorProfileStatusTone(profile.isActive)}>{getOperatorProfileStatusLabel(profile.isActive)}</Chip>,
    },
    {
      key: "actions",
      header: "Ações",
      render: (profile) =>
        canUpdate ? (
          <div className="work-orders-row-actions" onClick={(event) => event.stopPropagation()}>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              aria-label={`Editar profissional ${profile.fullName ?? profile.userId}`}
              onClick={() => openEdit(profile)}
            >
              <Pencil size={14} aria-hidden /> Editar
            </Button>
          </div>
        ) : (
          <span style={countStyle}>—</span>
        ),
    },
  ];

  const dense = useDenseList<OperatorProfileItem>({ items, columns, filter: filterOperatorProfiles, defaultSort: { key: "fullName", dir: "asc" } });

  const hasAnyFilter = dense.hasActiveFilters || hasConsent !== "all";

  return (
    <section className="page-stack work-orders-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>Cadastros</span>
          <h1>Profissionais</h1>
          <p>Perfis profissionais da organização — nome, CNH e consentimento de rastreamento (registro do próprio operador).</p>
        </div>
        <div className="work-orders-actions">
          <SearchBar value={dense.search} onChange={dense.setSearch} placeholder="Buscar por nome, CNH, categoria ou telefone…" />
          <Button type="button" variant="secondary" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw size={16} aria-hidden /> Atualizar
          </Button>
          {canCreate ? (
            <Button type="button" onClick={openCreate}>
              <Plus size={16} aria-hidden /> Novo profissional
            </Button>
          ) : null}
        </div>
      </header>

      {error ? (
        <Alert title="Não foi possível carregar os profissionais" tone="warning">
          {error}
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
        <span style={filterLabelStyle}>Rastreamento</span>
        {CONSENT_TABS.map((tab) => (
          <Button
            key={tab.value}
            type="button"
            size="sm"
            variant={hasConsent === tab.value ? "primary" : "ghost"}
            aria-pressed={hasConsent === tab.value}
            onClick={() => setHasConsent(tab.value)}
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
        title="Profissionais cadastrados"
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
            title="Nenhum profissional cadastrado"
            detail={hasAnyFilter ? "Ajuste a busca, a situação ou o consentimento para encontrar profissionais." : "Cadastre o primeiro profissional para vincular um perfil a um usuário."}
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
        <OperatorProfileFormModal
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

export default ProfissionaisPage;
