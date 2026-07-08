import { AlarmClock, Ban, ChevronDown, ListChecks, Pencil, Plus, Receipt, RefreshCw, RotateCcw } from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import type { DenseColumn } from "../../../../components/dense-list";
import { DenseListPagination, DenseTable, DENSE_LIST_FETCH_LIMIT, useDenseList } from "../../../../components/dense-list";
import { Alert, Button, Card, Chip, EmptyState, SearchBar, Select, Skeleton } from "../../../../components/ui";
import { useAuth } from "../../../../providers/AuthProvider";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { useTenantContext } from "../../../../providers/TenantProvider";
import { listTenantUsers } from "../../../registry/teams/teams.service";
import type { TenantUser } from "../../../registry/teams/teams.types";
import { useVehicles } from "../../../registry/vehicles/useVehicles";
import type { VehiclesFilters } from "../../../registry/vehicles/vehicles.types";
import { FineFormModal } from "../components/FineFormModal";
import {
  computeFinesTotals,
  filterFines,
  formatDeadline,
  formatFineDate,
  formatPontos,
  formatValor,
  getFineStatusLabel,
  getFineStatusTone,
  getValidFineTransitions,
  interpretFineSubmitError,
  isFineStatus,
  FINE_STATUS_OPTIONS,
} from "../fines.adapter";
import type { FineTransition } from "../fines.adapter";
import { updateFine } from "../fines.service";
import type { Fine, FinesFilters, FinesStatusFilter } from "../fines.types";
import { useFines } from "../useFines";

// F3 Multas — lista densa ligada ao endpoint real /api/v1/fines.
// Janela carregada uma vez (limit); situação/viatura/"A vencer"/busca/ordenação/paginação são client-side.
const STABLE_FILTERS: FinesFilters = { search: "", isActive: "all", limit: DENSE_LIST_FETCH_LIMIT };
const STABLE_VEHICLE_FILTERS: VehiclesFilters = { search: "", isActive: "all", limit: DENSE_LIST_FETCH_LIMIT };

// Papéis que autorizam o cancelamento de multas (backend é a autoridade final — 403 cancel_requires_admin).
const ADMIN_ROLES = ["Super Admin", "Administrador"] as const;

const STATUS_TABS: readonly { value: FinesStatusFilter; label: string }[] = [
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
const deadlineWrapStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--space-2)" };
const totalsGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-10)" };
const menuWrapStyle: CSSProperties = { position: "relative", display: "inline-block" };
const menuOverlayStyle: CSSProperties = { position: "fixed", inset: 0, zIndex: 40, background: "transparent", border: "none", cursor: "default" };
const menuPanelStyle: CSSProperties = {
  position: "absolute",
  top: "calc(100% + 4px)",
  right: 0,
  zIndex: 41,
  minWidth: 200,
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-4)",
  padding: "var(--space-6)",
  background: "var(--surface-panel)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-6)",
  boxShadow: "var(--shadow-overlay)",
};
const menuItemStyle: CSSProperties = {
  textAlign: "left",
  padding: "var(--space-6) var(--space-8)",
  borderRadius: "var(--radius-4)",
  border: "none",
  background: "transparent",
  color: "var(--text-primary)",
  font: "inherit",
  cursor: "pointer",
};

export function MultasPage() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can, roles } = usePermissions();
  const { items, pagination, loading, error, refresh } = useFines(STABLE_FILTERS);
  const { items: vehicles } = useVehicles(STABLE_VEHICLE_FILTERS);

  const [searchParams, setSearchParams] = useSearchParams();
  const [drivers, setDrivers] = useState<TenantUser[]>([]);
  const [editing, setEditing] = useState<Fine | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canCreate = can("fines:create");
  const canUpdate = can("fines:update");
  const isAdmin = useMemo(() => roles.some((role) => (ADMIN_ROLES as readonly string[]).includes(role)), [roles]);

  // "Agora" estável por montagem — coloração de prazo determinística durante a sessão da tela.
  const now = useMemo(() => new Date(), []);

  // Filtros específicos de F3 (situação/viatura/"A vencer") persistidos na URL, preservando os params da dense-list.
  const statusFilter = isFineStatus(searchParams.get("situacao")) ? (searchParams.get("situacao") as Fine["status"]) : undefined;
  const vehicleFilter = searchParams.get("vehicle") ?? "";
  const dueSoonActive = searchParams.get("prazo") === "7d";

  const setExtraParam = useCallback(
    (key: "situacao" | "vehicle" | "prazo", value: string) => {
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

  // Carrega os usuários da organização uma vez para popular o seletor de condutor e resolver nomes.
  useEffect(() => {
    if (!activeContext) return;
    let active = true;
    void listTenantUsers(context).then((loaded) => {
      if (active) setDrivers(loaded);
    });
    return () => {
      active = false;
    };
  }, [activeContext, context]);

  const vehicleById = useMemo(() => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])), [vehicles]);
  const driverById = useMemo(() => new Map(drivers.map((driver) => [driver.id, driver.name])), [drivers]);
  const resolveVehicleName = useCallback(
    (id: string) => {
      const vehicle = vehicleById.get(id);
      return vehicle ? `${vehicle.plate} ${vehicle.model}` : undefined;
    },
    [vehicleById],
  );
  const resolveDriverName = useCallback((id: string) => driverById.get(id), [driverById]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(fine: Fine) {
    setEditing(fine);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  // Transição direta (PATCH status). Cancelar (admin) → 403 cancel_requires_admin vira Alerta.
  async function applyTransition(fine: Fine, transition: FineTransition) {
    setBusyId(fine.id);
    setActionError(null);
    try {
      await updateFine(context, fine.id, { status: transition.to });
      await refresh();
    } catch (submitError) {
      const feedback = interpretFineSubmitError(submitError, "transition");
      setActionError(feedback.message);
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(fine: Fine) {
    setBusyId(fine.id);
    setActionError(null);
    try {
      await updateFine(context, fine.id, { isActive: !fine.isActive });
      await refresh();
    } catch {
      setActionError(`Não foi possível ${fine.isActive ? "desativar" : "reativar"} a multa. Tente novamente.`);
    } finally {
      setBusyId(null);
    }
  }

  const columns: DenseColumn<Fine>[] = [
    {
      key: "status",
      header: "Situação",
      sortable: true,
      sortValue: (fine) => getFineStatusLabel(fine.status),
      render: (fine) => <Chip tone={getFineStatusTone(fine.status)}>{getFineStatusLabel(fine.status)}</Chip>,
    },
    {
      key: "numeroAuto",
      header: "Nº do auto",
      sortable: true,
      sortValue: (fine) => fine.numeroAuto,
      render: (fine) => <strong>{fine.numeroAuto}</strong>,
    },
    {
      key: "vehicle",
      header: "Viatura",
      sortable: true,
      sortValue: (fine) => vehicleById.get(fine.vehicleId)?.plate ?? "",
      render: (fine) => {
        const vehicle = vehicleById.get(fine.vehicleId);
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
      key: "driver",
      header: "Condutor",
      sortable: true,
      sortValue: (fine) => (fine.driverId ? driverById.get(fine.driverId) ?? "" : ""),
      render: (fine) => {
        if (!fine.driverId) return <span style={mutedStyle}>—</span>;
        const name = driverById.get(fine.driverId);
        return (
          <Link to="/users" aria-label={`Ver perfil de ${name ?? "condutor"} em Usuários`}>
            {name ?? "Condutor"}
          </Link>
        );
      },
    },
    {
      key: "orgao",
      header: "Órgão",
      sortable: true,
      sortValue: (fine) => fine.orgao,
      render: (fine) => (fine.orgao ? fine.orgao : <span style={mutedStyle}>—</span>),
    },
    {
      key: "dataInfracao",
      header: "Data infração",
      sortable: true,
      tabular: true,
      sortValue: (fine) => (fine.dataInfracao ? Date.parse(fine.dataInfracao) : null),
      render: (fine) => formatFineDate(fine.dataInfracao),
    },
    {
      key: "valor",
      header: "Valor",
      sortable: true,
      align: "right",
      tabular: true,
      sortValue: (fine) => fine.valor,
      render: (fine) => formatValor(fine.valor),
    },
    {
      key: "pontos",
      header: "Pontos",
      sortable: true,
      align: "right",
      tabular: true,
      sortValue: (fine) => fine.pontos,
      render: (fine) => formatPontos(fine.pontos),
    },
    {
      key: "prazoRecurso",
      header: "Prazo recurso",
      sortable: true,
      tabular: true,
      sortValue: (fine) => (fine.prazoRecurso ? Date.parse(fine.prazoRecurso) : null),
      render: (fine) => <DeadlineCell iso={fine.prazoRecurso} status={fine.status} now={now} />,
    },
    {
      key: "prazoPagamento",
      header: "Prazo pagamento",
      sortable: true,
      tabular: true,
      sortValue: (fine) => (fine.prazoPagamento ? Date.parse(fine.prazoPagamento) : null),
      render: (fine) => <DeadlineCell iso={fine.prazoPagamento} status={fine.status} now={now} />,
    },
    {
      key: "actions",
      header: "Ações",
      render: (fine) => {
        if (!canUpdate) return <span style={countStyle}>—</span>;
        const vehicle = vehicleById.get(fine.vehicleId);
        const ref = vehicle ? `${vehicle.plate} · ${fine.numeroAuto}` : fine.numeroAuto;
        return (
          <div className="work-orders-row-actions">
            <Button type="button" size="sm" variant="secondary" aria-label={`Editar multa ${ref}`} onClick={() => openEdit(fine)}>
              <Pencil size={14} aria-hidden /> Editar
            </Button>
            <StatusTransitionMenu
              fine={fine}
              includeCancel={isAdmin}
              disabled={busyId === fine.id}
              onPick={(transition) => void applyTransition(fine, transition)}
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busyId === fine.id}
              aria-label={`${fine.isActive ? "Desativar" : "Reativar"} multa ${ref}`}
              onClick={() => void toggleActive(fine)}
            >
              {fine.isActive ? <Ban size={14} aria-hidden /> : <RotateCcw size={14} aria-hidden />}
              {fine.isActive ? "Desativar" : "Reativar"}
            </Button>
          </div>
        );
      },
    },
  ];

  const denseFilter = useCallback(
    (rows: readonly Fine[], base: { search: string; isActive: FinesStatusFilter }) =>
      filterFines(rows, {
        ...base,
        status: statusFilter,
        vehicleId: vehicleFilter || undefined,
        dueSoon: dueSoonActive,
        now,
        resolveVehicleName,
        resolveDriverName,
      }),
    [statusFilter, vehicleFilter, dueSoonActive, now, resolveVehicleName, resolveDriverName],
  );

  const dense = useDenseList<Fine>({ items, columns, filter: denseFilter, defaultSort: { key: "dataInfracao", dir: "desc" } });

  // Totais/agregados da janela filtrada (o mesmo conjunto que a tabela pagina) — renderiza mesmo vazio.
  const totalsBase = useMemo(
    () => denseFilter(items, { search: dense.search, isActive: dense.status }),
    [denseFilter, items, dense.search, dense.status],
  );
  const totals = useMemo(() => computeFinesTotals(totalsBase, now), [totalsBase, now]);

  const hasExtraFilters = Boolean(statusFilter) || Boolean(vehicleFilter) || dueSoonActive;

  return (
    <section className="page-stack work-orders-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>Frota</span>
          <h1>Multas</h1>
          <p>Multas de trânsito por viatura e condutor, com situação, valor, pontos e prazos de recurso e pagamento.</p>
        </div>
        <div className="work-orders-actions">
          <SearchBar value={dense.search} onChange={dense.setSearch} placeholder="Buscar por nº do auto, órgão, viatura ou condutor…" />
          <Button type="button" variant="secondary" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw size={16} aria-hidden /> Atualizar
          </Button>
          {canCreate ? (
            <Button type="button" onClick={openCreate}>
              <Plus size={16} aria-hidden /> Nova multa
            </Button>
          ) : null}
        </div>
      </header>

      {error ? (
        <Alert title="Não foi possível carregar as multas" tone="warning">
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
            <ListChecks size={16} aria-hidden /> Total de multas
          </span>
          <strong style={tabularStyle}>{totals.count.toLocaleString("pt-BR")}</strong>
        </div>
        <div className="work-orders-kpi">
          <span>
            <Receipt size={16} aria-hidden /> Valor total
          </span>
          <strong style={tabularStyle}>{formatValor(totals.totalValor)}</strong>
        </div>
        <div className="work-orders-kpi">
          <span>
            <AlarmClock size={16} aria-hidden /> A vencer (≤7 dias)
          </span>
          <strong style={tabularStyle}>{totals.dueSoonCount.toLocaleString("pt-BR")}</strong>
          <small style={mutedStyle}>Prazos de recurso ou pagamento próximos.</small>
        </div>
      </div>

      <div style={chipRowStyle} role="group" aria-label="Filtrar multas por situação">
        <Button
          type="button"
          size="sm"
          variant={!statusFilter ? "primary" : "ghost"}
          aria-pressed={!statusFilter}
          onClick={() => setExtraParam("situacao", "")}
        >
          Todas
        </Button>
        {FINE_STATUS_OPTIONS.map((option) => (
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
          variant={dueSoonActive ? "primary" : "secondary"}
          aria-pressed={dueSoonActive}
          onClick={() => setExtraParam("prazo", dueSoonActive ? "" : "7d")}
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
        title="Multas"
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
            title="Nenhuma multa encontrada"
            detail={
              dense.hasActiveFilters || hasExtraFilters
                ? "Ajuste a busca, a situação, a viatura ou o prazo para encontrar multas."
                : "Registre a primeira multa para acompanhar prazos, valores e pontos da frota."
            }
          />
        ) : null}

        {!error && dense.total > 0 ? (
          <>
            <DenseTable rows={dense.visibleItems} keyForRow={(fine) => fine.id} columns={columns} sort={dense.sort} onSort={dense.toggleSort} />
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
        <FineFormModal
          key={editing?.id ?? "new"}
          fine={editing}
          vehicles={vehicles}
          drivers={drivers}
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

// Célula de prazo com coloração semântica (R3.2): ≤7d aviso, vencido (não-final) perigo, senão neutro.
// Sempre mostra a data + rótulo acessível — nunca cor sozinha.
function DeadlineCell({ iso, status, now }: { readonly iso: string | null; readonly status: Fine["status"]; readonly now: Date }) {
  const info = formatDeadline(iso, status, now);
  if (!info.hasDate) return <span style={mutedStyle}>—</span>;
  // Situação final: prazo é histórico e o rótulo repete a própria data — mostra só a data (sem linha redundante).
  const showLabelLine = info.label !== info.date;
  return (
    <div style={deadlineWrapStyle}>
      <span style={tabularStyle}>{info.date}</span>
      {info.tone === "default" ? (
        showLabelLine ? <span style={mutedStyle}>{info.label}</span> : null
      ) : (
        <span>
          <Chip tone={info.tone}>{info.label}</Chip>
        </span>
      )}
    </div>
  );
}

// Menu de transição: só oferece as próximas situações válidas a partir da atual.
// Cancelar só entra para administradores (`includeCancel`); o backend é a autoridade final.
function StatusTransitionMenu({
  fine,
  includeCancel,
  disabled,
  onPick,
}: {
  readonly fine: Fine;
  readonly includeCancel: boolean;
  readonly disabled: boolean;
  readonly onPick: (transition: FineTransition) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);
  const transitions = getValidFineTransitions(fine.status, includeCancel);

  // Ao abrir, leva o foco ao primeiro item (navegação por teclado).
  useEffect(() => {
    if (open) firstItemRef.current?.focus();
  }, [open]);

  // Fecha e devolve o foco ao gatilho (dismiss acessível — Escape / clique fora).
  const closeAndReturnFocus = useCallback(() => {
    setOpen(false);
    wrapRef.current?.querySelector<HTMLButtonElement>("[aria-haspopup='menu']")?.focus();
  }, []);

  if (transitions.length === 0) return null;

  return (
    <span ref={wrapRef} style={menuWrapStyle}>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        Avançar situação <ChevronDown size={14} aria-hidden />
      </Button>
      {open ? (
        <>
          <button type="button" aria-hidden tabIndex={-1} style={menuOverlayStyle} onClick={() => setOpen(false)} />
          <div
            role="menu"
            style={menuPanelStyle}
            aria-label={`Próxima situação da multa ${fine.numeroAuto}`}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                closeAndReturnFocus();
              }
            }}
          >
            {transitions.map((transition, index) => (
              <button
                key={transition.to}
                ref={index === 0 ? firstItemRef : undefined}
                type="button"
                role="menuitem"
                className="ui-menu-item"
                style={menuItemStyle}
                onClick={() => {
                  setOpen(false);
                  onPick(transition);
                }}
              >
                {transition.label}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </span>
  );
}

export default MultasPage;
