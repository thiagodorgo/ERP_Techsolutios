import { Archive, ArchiveRestore, AlarmClock, Ban, CalendarClock, CheckCircle2, Pencil, Plus, RotateCcw, ShieldAlert, ShieldCheck } from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import type { DenseColumn } from "../../../../components/dense-list";
import { DenseListPagination, DenseTable, DENSE_LIST_FETCH_LIMIT, useDenseList } from "../../../../components/dense-list";
import { Alert, Button, Card, Chip, EmptyState, SearchBar, Select, Skeleton } from "../../../../components/ui";
import { useAutoRefresh } from "../../../../hooks/useAutoRefresh";
import { useAuth } from "../../../../providers/AuthProvider";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { useTenantContext } from "../../../../providers/TenantProvider";
import { useVehicles } from "../../../registry/vehicles/useVehicles";
import type { VehiclesFilters } from "../../../registry/vehicles/vehicles.types";
import { InsurancePolicyFormModal } from "../components/InsurancePolicyFormModal";
import {
  computeInsuranceTotals,
  computeVigencia,
  filterInsurancePolicies,
  formatValor,
  getInsuranceToggleAction,
  getPolicyStatusLabel,
  getPolicyStatusTone,
  interpretInsuranceSubmitError,
  isInsuranceStatus,
  EXPIRING_SOON_DAYS,
  INSURANCE_STATUS_OPTIONS,
} from "../insurance.adapter";
import { updateInsurancePolicy } from "../insurance.service";
import type { InsurancePolicy, InsuranceFilters, InsuranceStatusFilter } from "../insurance.types";
import { useInsurancePolicies } from "../useInsurance";

// F4 Seguros — lista densa ligada ao endpoint real /api/v1/insurance-policies.
// Janela carregada uma vez (limit); situação/viatura/"A vencer"/busca/ordenação/paginação são client-side.
const STABLE_FILTERS: InsuranceFilters = { search: "", isActive: "all", limit: DENSE_LIST_FETCH_LIMIT };
const STABLE_VEHICLE_FILTERS: VehiclesFilters = { search: "", isActive: "all", limit: DENSE_LIST_FETCH_LIMIT };

const STATUS_TABS: readonly { value: InsuranceStatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" },
];

const chipRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-6)", flexWrap: "wrap" };
const statusRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)", flexWrap: "wrap" };
const filterRowStyle: CSSProperties = { display: "flex", alignItems: "flex-end", gap: "var(--space-8)", flexWrap: "wrap", justifyContent: "space-between" };
const filterFieldStyle: CSSProperties = { minWidth: 200 };
const countStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 700 };
const mutedStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)" };
const tabularStyle: CSSProperties = { fontVariantNumeric: "tabular-nums" };
const totalsGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-10)" };
const coberturaStyle: CSSProperties = { display: "block", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

// Barra de vigência (progressbar acessível). Track + preenchimento tingido pela proximidade do fim.
const vigenciaWrapStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--space-2)", minWidth: 150 };
const vigenciaTrackStyle: CSSProperties = {
  position: "relative",
  height: 6,
  width: 140,
  maxWidth: "100%",
  borderRadius: "var(--radius-4)",
  background: "var(--surface-panel-muted)",
  border: "1px solid var(--border-subtle)",
  overflow: "hidden",
};
const vigenciaFillStyle: CSSProperties = { display: "block", height: "100%", borderRadius: "var(--radius-4)" };

const VIGENCIA_BAR_COLOR: Record<"default" | "warning" | "danger", string> = {
  default: "var(--color-status-success)",
  warning: "var(--color-status-warning)",
  danger: "var(--color-status-danger)",
};

export function SegurosPage() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();
  const { items, pagination, loading, error, refresh } = useInsurancePolicies(STABLE_FILTERS);
  // WS-UI-REFRESH — o sistema recarrega sozinho em segundo plano (sem botão "Atualizar").
  useAutoRefresh(refresh, { enabled: Boolean(activeContext) });
  const { items: vehicles } = useVehicles(STABLE_VEHICLE_FILTERS);

  const [searchParams, setSearchParams] = useSearchParams();
  const [editing, setEditing] = useState<InsurancePolicy | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canCreate = can("insurance_policies:create");
  const canUpdate = can("insurance_policies:update");

  // "Agora" estável por montagem — coloração de vigência determinística durante a sessão da tela.
  const now = useMemo(() => new Date(), []);

  // Filtros específicos de F4 (situação/viatura/"A vencer") persistidos na URL, preservando os params da dense-list.
  const statusFilter = isInsuranceStatus(searchParams.get("situacao")) ? (searchParams.get("situacao") as InsurancePolicy["status"]) : undefined;
  const vehicleFilter = searchParams.get("vehicle") ?? "";
  const expiringActive = searchParams.get("vencimento") === "30d";

  const setExtraParam = useCallback(
    (key: "situacao" | "vehicle" | "vencimento", value: string) => {
      const next = new URLSearchParams(searchParams);
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete("page"); // troca de filtro volta para a primeira página
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

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

  const vehicleById = useMemo(() => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])), [vehicles]);
  const resolveVehicleName = useCallback(
    (id: string) => {
      const vehicle = vehicleById.get(id);
      return vehicle ? `${vehicle.plate} ${vehicle.model}` : undefined;
    },
    [vehicleById],
  );

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(policy: InsurancePolicy) {
    setEditing(policy);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  // Alternância de situação (PATCH status). Nunca envia "vencida" (derivada); 422 cannot_set_derived_status vira Alerta.
  async function toggleStatus(policy: InsurancePolicy) {
    const action = getInsuranceToggleAction(policy.status);
    setBusyId(policy.id);
    setActionError(null);
    try {
      await updateInsurancePolicy(context, policy.id, { status: action.to });
      await refresh();
    } catch (submitError) {
      const feedback = interpretInsuranceSubmitError(submitError, "transition");
      setActionError(feedback.message);
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(policy: InsurancePolicy) {
    setBusyId(policy.id);
    setActionError(null);
    try {
      await updateInsurancePolicy(context, policy.id, { isActive: !policy.isActive });
      await refresh();
    } catch {
      setActionError(`Não foi possível ${policy.isActive ? "desativar" : "reativar"} a apólice. Tente novamente.`);
    } finally {
      setBusyId(null);
    }
  }

  const columns: DenseColumn<InsurancePolicy>[] = [
    {
      key: "status",
      header: "Situação",
      sortable: true,
      sortValue: (policy) => getPolicyStatusLabel(policy.status),
      render: (policy) => <Chip tone={getPolicyStatusTone(policy.status)}>{getPolicyStatusLabel(policy.status)}</Chip>,
    },
    {
      key: "seguradora",
      header: "Seguradora",
      sortable: true,
      sortValue: (policy) => policy.seguradora,
      render: (policy) => (policy.seguradora ? <strong>{policy.seguradora}</strong> : <span style={mutedStyle}>—</span>),
    },
    {
      key: "numeroApolice",
      header: "Nº da apólice",
      sortable: true,
      sortValue: (policy) => policy.numeroApolice,
      render: (policy) => policy.numeroApolice,
    },
    {
      key: "vehicle",
      header: "Viatura",
      sortable: true,
      sortValue: (policy) => vehicleById.get(policy.vehicleId)?.plate ?? "",
      render: (policy) => {
        const vehicle = vehicleById.get(policy.vehicleId);
        if (!vehicle) return <span style={mutedStyle}>—</span>;
        return (
          <div>
            <Link to="/cadastros/viaturas" aria-label={`Ver viatura ${vehicle.plate} em Cadastros`}>
              <strong>{vehicle.plate}</strong>
            </Link>
            {vehicle.model ? <div style={mutedStyle}>{vehicle.model}</div> : null}
          </div>
        );
      },
    },
    {
      key: "vigencia",
      header: "Vigência",
      sortable: true,
      tabular: true,
      sortValue: (policy) => (policy.vigenciaFim ? Date.parse(policy.vigenciaFim) : null),
      render: (policy) => <VigenciaCell policy={policy} now={now} />,
    },
    {
      key: "valor",
      header: "Valor",
      sortable: true,
      align: "right",
      tabular: true,
      sortValue: (policy) => policy.valor,
      render: (policy) => formatValor(policy.valor),
    },
    {
      key: "cobertura",
      header: "Cobertura",
      sortable: true,
      sortValue: (policy) => policy.cobertura ?? "",
      render: (policy) =>
        policy.cobertura ? (
          <span style={coberturaStyle} title={policy.cobertura}>
            {policy.cobertura}
          </span>
        ) : (
          <span style={mutedStyle}>—</span>
        ),
    },
    {
      key: "actions",
      header: "Ações",
      render: (policy) => {
        if (!canUpdate) return <span style={countStyle}>—</span>;
        const vehicle = vehicleById.get(policy.vehicleId);
        const ref = vehicle ? `${vehicle.plate} · ${policy.numeroApolice}` : policy.numeroApolice;
        const toggle = getInsuranceToggleAction(policy.status);
        return (
          <div className="work-orders-row-actions">
            <Button type="button" size="sm" variant="secondary" aria-label={`Editar apólice ${ref}`} onClick={() => openEdit(policy)}>
              <Pencil size={14} aria-hidden /> Editar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busyId === policy.id}
              aria-label={`${toggle.label} apólice ${ref}`}
              onClick={() => void toggleStatus(policy)}
            >
              {toggle.kind === "cancel" ? <Ban size={14} aria-hidden /> : <RotateCcw size={14} aria-hidden />}
              {toggle.label}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busyId === policy.id}
              aria-label={`${policy.isActive ? "Desativar" : "Reativar"} o registro da apólice ${ref}`}
              onClick={() => void toggleActive(policy)}
            >
              {policy.isActive ? <Archive size={14} aria-hidden /> : <ArchiveRestore size={14} aria-hidden />}
              {policy.isActive ? "Desativar" : "Reativar"}
            </Button>
          </div>
        );
      },
    },
  ];

  const denseFilter = useCallback(
    (rows: readonly InsurancePolicy[], base: { search: string; isActive: InsuranceStatusFilter }) =>
      filterInsurancePolicies(rows, {
        ...base,
        status: statusFilter,
        vehicleId: vehicleFilter || undefined,
        expiringSoon: expiringActive,
        now,
        resolveVehicleName,
      }),
    [statusFilter, vehicleFilter, expiringActive, now, resolveVehicleName],
  );

  const dense = useDenseList<InsurancePolicy>({ items, columns, filter: denseFilter, defaultSort: { key: "vigencia", dir: "asc" } });

  // Totais/agregados da janela filtrada (o mesmo conjunto que a tabela pagina) — renderiza mesmo vazio.
  const totalsBase = useMemo(
    () => denseFilter(items, { search: dense.search, isActive: dense.status }),
    [denseFilter, items, dense.search, dense.status],
  );
  const totals = useMemo(() => computeInsuranceTotals(totalsBase, now), [totalsBase, now]);

  const hasExtraFilters = Boolean(statusFilter) || Boolean(vehicleFilter) || expiringActive;

  return (
    <section className="page-stack work-orders-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>Frota</span>
          <h1>Seguros</h1>
          <p>Apólices de seguro por viatura, com situação, vigência, valor e cobertura. A situação “vencida” é derivada das datas.</p>
        </div>
        <div className="work-orders-actions">
          <SearchBar value={dense.search} onChange={dense.setSearch} placeholder="Buscar por seguradora, nº da apólice, viatura ou cobertura…" />
          {canCreate ? (
            <Button type="button" onClick={openCreate}>
              <Plus size={16} aria-hidden /> Nova apólice
            </Button>
          ) : null}
        </div>
      </header>

      {error ? (
        <Alert title="Não foi possível carregar as apólices" tone="warning">
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
            <ShieldCheck size={16} aria-hidden /> Total de apólices
          </span>
          <strong style={tabularStyle}>{totals.count.toLocaleString("pt-BR")}</strong>
        </div>
        <div className="work-orders-kpi">
          <span>
            <CheckCircle2 size={16} aria-hidden /> Vigentes
          </span>
          <strong style={tabularStyle}>{totals.vigenteCount.toLocaleString("pt-BR")}</strong>
        </div>
        <div className="work-orders-kpi">
          <span>
            <CalendarClock size={16} aria-hidden /> A vencer (≤{EXPIRING_SOON_DAYS} dias)
          </span>
          <strong style={tabularStyle}>{totals.expiringSoonCount.toLocaleString("pt-BR")}</strong>
          <small style={mutedStyle}>Apólices vigentes perto do fim da vigência.</small>
        </div>
        <div className="work-orders-kpi">
          <span>
            <ShieldAlert size={16} aria-hidden /> Vencidas
          </span>
          <strong style={tabularStyle}>{totals.vencidaCount.toLocaleString("pt-BR")}</strong>
        </div>
      </div>

      <div style={chipRowStyle} role="group" aria-label="Filtrar apólices por situação">
        <Button
          type="button"
          size="sm"
          variant={!statusFilter ? "primary" : "ghost"}
          aria-pressed={!statusFilter}
          onClick={() => setExtraParam("situacao", "")}
        >
          Todas
        </Button>
        {INSURANCE_STATUS_OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={statusFilter === option.value ? "primary" : "ghost"}
            aria-pressed={statusFilter === option.value}
            onClick={() => setExtraParam("situacao", option.value)}
          >
            {option.label}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant={expiringActive ? "primary" : "secondary"}
          aria-pressed={expiringActive}
          onClick={() => setExtraParam("vencimento", expiringActive ? "" : "30d")}
        >
          <AlarmClock size={14} aria-hidden /> A vencer
        </Button>
      </div>

      <div style={filterRowStyle}>
        <div style={statusRowStyle}>
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
        </div>
        <div style={filterFieldStyle}>
          <Select label="Viatura" value={vehicleFilter} onChange={(event) => setExtraParam("vehicle", event.target.value)}>
            <option value="">Todas as viaturas</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.plate}
                {vehicle.model ? ` — ${vehicle.model}` : ""}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <Card
        title="Apólices de seguro"
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
            title="Nenhuma apólice encontrada"
            detail={
              dense.hasActiveFilters || hasExtraFilters
                ? "Ajuste a busca, a situação, a viatura ou o vencimento para encontrar apólices."
                : "Registre a primeira apólice para acompanhar vigências, valores e cobertura da frota."
            }
          />
        ) : null}

        {!error && dense.total > 0 ? (
          <>
            <DenseTable rows={dense.visibleItems} keyForRow={(policy) => policy.id} columns={columns} sort={dense.sort} onSort={dense.toggleSort} />
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
        <InsurancePolicyFormModal
          key={editing?.id ?? "new"}
          policy={editing}
          vehicles={vehicles}
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

// Célula de vigência: janela início–fim + barra de progresso (tempo decorrido) tingida pela proximidade do fim.
// Sempre acompanha rótulo textual acessível ("Vence em N dias"/"Vencida há N dias") — nunca cor sozinha.
function VigenciaCell({ policy, now }: { readonly policy: InsurancePolicy; readonly now: Date }) {
  const info = computeVigencia(policy.vigenciaInicio, policy.vigenciaFim, now, policy.status);
  if (!info.hasRange) return <span style={mutedStyle}>—</span>;
  const barColor = VIGENCIA_BAR_COLOR[info.tone];
  return (
    <div style={vigenciaWrapStyle}>
      <span style={tabularStyle}>
        {info.start} – {info.end}
      </span>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(info.percent)}
        aria-label={info.label}
        style={vigenciaTrackStyle}
      >
        <span style={{ ...vigenciaFillStyle, width: `${info.percent}%`, background: barColor }} />
      </div>
      {info.tone === "default" ? (
        <span style={mutedStyle}>{info.label}</span>
      ) : (
        <span>
          <Chip tone={info.tone}>{info.label}</Chip>
        </span>
      )}
    </div>
  );
}

export default SegurosPage;
