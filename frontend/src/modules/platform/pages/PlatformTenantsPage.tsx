import { Building2, CircleAlert, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";

import { DenseTable } from "../../../components/dense-list";
import type { DenseColumn } from "../../../components/dense-list/types";
import { KpiStatCard } from "../../../components/patterns";
import { Alert, EmptyState, ErrorState, Skeleton } from "../../../components/ui";
import { usePermissions } from "../../../providers/PermissionProvider";
import { OrganizationDetailPanel } from "../components/OrganizationDetailPanel";
import { NewOrganizationDialog } from "../components/NewOrganizationDialog";
import {
  filterPlatformOrganizations,
  type OrganizationStatusFilter,
  type PlatformOrganizationRow,
} from "../platform-organizations.state";
import { usePlatformOrganizations, type PlatformOrganizationsStatus } from "../usePlatformOrganizations";

const NUMBER_FORMAT = new Intl.NumberFormat("pt-BR");
const DATE_FORMAT = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });

const widths = {
  organization: "calc(30.216% - 6.647px)",
  group: "calc(19.424% - 4.273px)",
  status: "calc(19.424% - 4.273px)",
  users: "calc(9.353% - 2.058px)",
  modules: "calc(9.353% - 2.058px)",
  createdAt: "calc(12.230% - 2.691px)",
} as const;

function formatDate(value: string): string {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime()) ? DATE_FORMAT.format(date) : "—";
}

function formatCount(value: number | null): string {
  return value === null ? "—" : NUMBER_FORMAT.format(value);
}

function statusLabel(status: PlatformOrganizationRow["status"]): string {
  if (status === "active") return "Ativa";
  if (status === "suspended") return "Suspensa";
  return "Pendente";
}

function PageHeader({ canCreate, onCreate }: { readonly canCreate: boolean; readonly onCreate: () => void }) {
  return (
    <header className="page-heading page-heading--row">
      <div>
        <h1>Organizações</h1>
        <p>Cadastros e situação das organizações clientes, filiais de cada grupo</p>
      </div>
      {canCreate ? <button type="button" className="pat-btn pat-btn--primary" onClick={onCreate}><Plus size={15} aria-hidden="true" />Nova organização</button> : null}
    </header>
  );
}

export type PlatformTenantsViewProps = {
  readonly rows: readonly PlatformOrganizationRow[];
  readonly status?: PlatformOrganizationsStatus;
  readonly stale?: boolean;
  readonly query?: string;
  readonly groupId?: string;
  readonly statusFilter?: OrganizationStatusFilter;
  readonly expandedId?: string | null;
  readonly canCreate?: boolean;
  readonly onCreate?: () => void;
  readonly onQueryChange?: (value: string) => void;
  readonly onGroupChange?: (value: string) => void;
  readonly onStatusFilterChange?: (value: OrganizationStatusFilter) => void;
  readonly onExpandedIdChange?: (value: string | null) => void;
  readonly renderDetail?: (row: PlatformOrganizationRow) => ReactNode;
  readonly onRetry?: () => void;
};

export function PlatformTenantsView({
  rows,
  status = rows.length ? "ready" : "empty",
  stale = false,
  query = "",
  groupId = "",
  statusFilter = "all",
  expandedId = null,
  canCreate = false,
  onCreate = () => undefined,
  onQueryChange = () => undefined,
  onGroupChange = () => undefined,
  onStatusFilterChange = () => undefined,
  onExpandedIdChange = () => undefined,
  renderDetail = (row) => <div className="platform-organizations__detail-placeholder">Carregando detalhes de {row.name}…</div>,
  onRetry = () => undefined,
}: PlatformTenantsViewProps) {
  const groupOptions = useMemo(() => [...new Map(rows.flatMap((row) => row.group ? [[row.group.id, row.group.name] as const] : [])).entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR")), [rows]);
  const recut = filterPlatformOrganizations(rows, { query, groupId, status: "all" });
  const customerRecut = recut.filter((row) => !row.system);
  const counts = {
    active: customerRecut.filter((row) => row.status === "active").length,
    suspended: customerRecut.filter((row) => row.status === "suspended").length,
    incomplete: customerRecut.filter((row) => !row.setup.complete).length,
  };
  const visible = filterPlatformOrganizations(rows, { query, groupId, status: statusFilter });

  useEffect(() => {
    if (status === "ready" && expandedId && !visible.some((row) => row.id === expandedId)) onExpandedIdChange(null);
  }, [expandedId, onExpandedIdChange, visible]);

  const columns: readonly DenseColumn<PlatformOrganizationRow>[] = [
    { key: "organization", header: "ORGANIZAÇÃO", width: widths.organization, render: (row) => <span className="platform-organizations__name"><span className="platform-organizations__avatar" aria-hidden="true"><Building2 size={14} /></span><span title={row.name}>{row.name}</span>{row.system ? <span className="ui-badge">Organização de sistema</span> : null}</span> },
    { key: "group", header: "GRUPO", width: widths.group, render: (row) => <span title={row.group?.name}>{row.group?.name ?? "—"}</span> },
    { key: "status", header: "SITUAÇÃO", width: widths.status, render: (row) => <span className={`platform-organizations__status platform-organizations__status--${row.status}`}>{statusLabel(row.status)}{!row.setup.complete ? <span className="ui-badge">Cadastro incompleto</span> : null}{row.countsStale ? <span title="Contagens aguardando atualização">Dados desatualizados</span> : null}</span> },
    { key: "users", header: "USUÁRIOS", width: widths.users, align: "right", tabular: true, render: (row) => formatCount(row.userCount) },
    { key: "modules", header: "MÓDULOS", width: widths.modules, align: "right", tabular: true, render: (row) => formatCount(row.moduleCount) },
    { key: "createdAt", header: "CRIADA EM", width: widths.createdAt, align: "right", tabular: true, render: (row) => formatDate(row.createdAt) },
  ];

  if (status === "loading") return <section className="platform-organizations page-stack"><PageHeader canCreate={canCreate} onCreate={onCreate} /><Skeleton lines={7} /></section>;
  if (status === "forbidden") return <section className="platform-organizations page-stack"><PageHeader canCreate={false} onCreate={onCreate} /><ErrorState title="Acesso não permitido" detail="Seu perfil não tem permissão para consultar as organizações da plataforma." /></section>;
  if (status === "error") return <section className="platform-organizations page-stack"><PageHeader canCreate={canCreate} onCreate={onCreate} /><ErrorState title="Não foi possível carregar as organizações" detail="Tente novamente para consultar a lista completa." /><button type="button" className="pat-btn" onClick={onRetry}>Tentar novamente</button></section>;
  if (status === "empty") return <section className="platform-organizations page-stack"><PageHeader canCreate={canCreate} onCreate={onCreate} /><EmptyState title="Nenhuma organização encontrada" detail="Ainda não há organizações cadastradas na plataforma." /></section>;

  return (
    <section className="platform-organizations page-stack">
      <PageHeader canCreate={canCreate} onCreate={onCreate} />
      {stale ? <Alert title="Dados desatualizados" tone="warning">A última atualização falhou. O último conjunto completo continua visível.</Alert> : null}
      <div className="platform-organizations__kpis">
        <KpiStatCard icon={Building2} iconColor="var(--color-core-primary)" iconBg="var(--surface-panel-muted)" value={counts.active} label="Organizações ativas" hint="No recorte atual" ariaLabel={`Organizações ativas: ${counts.active}. No recorte atual`} onClick={() => onStatusFilterChange("active")} pressed={statusFilter === "active"} />
        <KpiStatCard icon={CircleAlert} iconColor="var(--color-status-danger)" iconBg="var(--surface-panel-muted)" value={counts.suspended} label="Organizações suspensas" hint="No recorte atual" ariaLabel={`Organizações suspensas: ${counts.suspended}. No recorte atual`} onClick={() => onStatusFilterChange("suspended")} pressed={statusFilter === "suspended"} />
        <KpiStatCard icon={CircleAlert} iconColor="var(--color-status-warning)" iconBg="var(--surface-panel-muted)" value={counts.incomplete} label="Cadastros incompletos" hint="No recorte atual" ariaLabel={`Cadastros incompletos: ${counts.incomplete}. No recorte atual`} onClick={() => onStatusFilterChange("incomplete")} pressed={statusFilter === "incomplete"} />
        <div className="platform-organizations__revenue-note"><strong>Receita por organização</strong><span>Disponível após a ativação da medição cloud.</span></div>
      </div>
      <div className="platform-organizations__filters">
        <label className="platform-organizations__search"><Search size={14} aria-hidden="true" /><span className="sr-only">Buscar organização ou grupo</span><input aria-label="Buscar organização ou grupo" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Buscar organização ou grupo…" /></label>
        <label>Grupo<select aria-label="Filtrar por grupo" value={groupId} onChange={(event) => onGroupChange(event.target.value)}><option value="">Todos os grupos</option>{groupOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
      </div>
      {statusFilter !== "all" ? <span className="pat-filtro-chip">Filtro: {statusFilter === "active" ? "Ativas" : statusFilter === "suspended" ? "Suspensas" : "Cadastro incompleto"}<button type="button" aria-label={`Tirar o filtro ${statusFilter === "active" ? "Ativas" : statusFilter === "suspended" ? "Suspensas" : "Cadastro incompleto"}`} onClick={() => onStatusFilterChange("all")}>×</button></span> : null}
      {visible.length === 0 ? <EmptyState title="Nenhuma organização encontrada" detail="Ajuste a busca ou os filtros para consultar outras organizações." /> : null}
      {visible.length > 0 ? (
        <DenseTable
          columns={columns}
          rows={visible}
          keyForRow={(row) => row.id}
          sort={null}
          onSort={() => undefined}
          onRowClick={(row) => onExpandedIdChange(expandedId === row.id ? null : row.id)}
          expandedKey={expandedId}
          renderDetail={renderDetail}
          isRowExpandable={(row) => !row.system}
          detailColumnWidth={22}
          cellTitle={(row, key) => key === "organization" ? row.name : key === "group" ? row.group?.name : undefined}
        />
      ) : null}
    </section>
  );
}

export function PlatformTenantsScreen(props: PlatformTenantsViewProps) {
  return <PlatformTenantsView {...props} />;
}

export function PlatformTenantsPage() {
  const [params, setParams] = useSearchParams();
  const { permissions } = usePermissions();
  const has = (permission: string) => permissions.includes(permission);
  const organizations = usePlatformOrganizations();
  const [expandedId, setExpandedId] = useState<string | null>(() => params.get("org"));
  const [createOpen, setCreateOpen] = useState(false);
  const query = params.get("q") ?? "";
  const groupId = params.get("grupo") ?? "";
  const rawStatus = params.get("situacao");
  const statusFilter: OrganizationStatusFilter = rawStatus === "active" || rawStatus === "suspended" || rawStatus === "incomplete" ? rawStatus : "all";
  const write = (key: string, value: string) => { const next = new URLSearchParams(params); value ? next.set(key, value) : next.delete(key); setParams(next, { replace: true }); };
  const changeExpanded = (value: string | null) => { setExpandedId(value); write("org", value ?? ""); };
  const actionPermissions = ["platform:tenants:update", "platform:tenants:suspend", "platform:users:create_admin", "platform:billing:manage", "platform:billing:read"].filter(has);
  const returnSearch = params.toString() ? `?${params.toString()}` : "";

  return <>
    <PlatformTenantsView rows={organizations.rows} status={organizations.status} stale={organizations.stale} query={query} groupId={groupId} statusFilter={statusFilter} expandedId={expandedId} canCreate={has("platform:tenants:create")} onCreate={() => setCreateOpen(true)} onQueryChange={(value) => write("q", value)} onGroupChange={(value) => write("grupo", value)} onStatusFilterChange={(value) => write("situacao", value === "all" ? "" : value)} onExpandedIdChange={changeExpanded} onRetry={() => void organizations.refresh(false)} renderDetail={(row) => <OrganizationDetailPanel organization={row} returnSearch={returnSearch} permissions={actionPermissions} onRefreshList={() => void organizations.refresh(false)} />} />
    {createOpen ? <NewOrganizationDialog onClose={() => setCreateOpen(false)} onCreated={() => void organizations.refresh(false)} permissions={actionPermissions} /> : null}
  </>;
}

export default PlatformTenantsPage;
