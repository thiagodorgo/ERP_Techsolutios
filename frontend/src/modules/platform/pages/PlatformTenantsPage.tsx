import { Building2, CircleAlert, Plus, Search, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode, type Ref } from "react";
import { useSearchParams } from "react-router-dom";

import { DenseTable } from "../../../components/dense-list";
import type { DenseColumn } from "../../../components/dense-list/types";
import { KpiStatCard, PageHeader, StatusPill } from "../../../components/patterns";
import { Alert, EmptyState, ErrorState, Skeleton } from "../../../components/ui";
import { usePermissions } from "../../../providers/PermissionProvider";
import { OrganizationDetailPanel } from "../components/OrganizationDetailPanel";
import { NewOrganizationDialog } from "../components/NewOrganizationDialog";
import {
  filterPlatformOrganizations,
  organizationsTableDensity,
  sortByUsersDesc,
  type OrganizationStatusFilter,
  type OrganizationsTableDensity,
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

const mediumWidths = {
  organization: "36.13%",
  group: "23.48%",
  status: "26.19%",
  users: "10.84%",
} as const;

function useOrganizationsTableDensity() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [density, setDensity] = useState<OrganizationsTableDensity>("full");

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setDensity(organizationsTableDensity(entry.contentRect.width));
    });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return { density, sectionRef } as const;
}

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

export type PlatformTenantsViewProps = {
  readonly rows: readonly PlatformOrganizationRow[];
  readonly status?: PlatformOrganizationsStatus;
  readonly stale?: boolean;
  readonly density?: OrganizationsTableDensity;
  readonly sectionRef?: Ref<HTMLElement>;
  readonly query?: string;
  readonly groupId?: string;
  readonly statusFilter?: OrganizationStatusFilter;
  readonly order?: "usuarios" | null;
  readonly expandedId?: string | null;
  readonly canCreate?: boolean;
  readonly onCreate?: () => void;
  readonly onQueryChange?: (value: string) => void;
  readonly onGroupChange?: (value: string) => void;
  readonly onStatusFilterChange?: (value: OrganizationStatusFilter) => void;
  readonly onOrderChange?: (value: "usuarios" | null) => void;
  readonly onExpandedIdChange?: (value: string | null) => void;
  readonly renderDetail?: (row: PlatformOrganizationRow) => ReactNode;
  readonly onRetry?: () => void;
};

export function PlatformTenantsView({
  rows,
  status = rows.length ? "ready" : "empty",
  stale = false,
  density = "full",
  sectionRef,
  query = "",
  groupId = "",
  statusFilter = "all",
  order = null,
  expandedId = null,
  canCreate = false,
  onCreate = () => undefined,
  onQueryChange = () => undefined,
  onGroupChange = () => undefined,
  onStatusFilterChange = () => undefined,
  onOrderChange = () => undefined,
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
  const totalUsers = customerRecut.some((row) => row.userCount === null)
    ? null
    : customerRecut.reduce((sum, row) => sum + (row.userCount ?? 0), 0);
  let visible = filterPlatformOrganizations(rows, { query, groupId, status: statusFilter });
    if (order === "usuarios") visible = sortByUsersDesc(visible);
  const noCustomers = rows.length > 0 && rows.every((row) => row.system);

  useEffect(() => {
    if (status === "ready" && expandedId && !visible.some((row) => row.id === expandedId)) onExpandedIdChange(null);
  }, [expandedId, onExpandedIdChange, visible]);

  const columns: readonly DenseColumn<PlatformOrganizationRow>[] = [
    { key: "organization", header: "ORGANIZAÇÃO", width: density === "narrow" ? "100%" : density === "medium" ? mediumWidths.organization : widths.organization, render: (row) => <span className="platform-organizations__name">{density !== "narrow" ? <span className="platform-organizations__avatar" aria-hidden="true"><Building2 size={14} /></span> : null}<span title={row.name}>{row.name}</span>{row.system ? <span className="ui-badge" aria-label="Organização de sistema" title="Organização de sistema">Sistema</span> : null}{density === "narrow" ? <span className="platform-organizations__group-inline">· {row.group?.name ?? "Sem grupo"}</span> : null}</span> },
    ...(density !== "narrow" ? [{ key: "group", header: "GRUPO", width: density === "medium" ? mediumWidths.group : widths.group, render: (row: PlatformOrganizationRow) => <span title={row.group?.name}>{row.group?.name ?? "—"}</span> } satisfies DenseColumn<PlatformOrganizationRow>] : []),
    { key: "status", header: "SITUAÇÃO", width: density === "narrow" ? "1%" : density === "medium" ? mediumWidths.status : widths.status, render: (row) => <span className="platform-organizations__status"><StatusPill label={statusLabel(row.status)} bg="var(--surface-panel-muted)" fg={`var(--color-status-${row.status === "active" ? "success" : row.status === "suspended" ? "danger" : "warning"})`} dot={`var(--color-status-${row.status === "active" ? "success" : row.status === "suspended" ? "danger" : "warning"})`} sm />{!row.setup.complete ? <span className="ui-badge" title="Cadastro incompleto">incompleto</span> : null}{row.countsStale ? <span title="Contagens aguardando atualização">Dados desatualizados</span> : null}</span> },
    ...(density !== "narrow" ? [{ key: "users", header: "USUÁRIOS", width: density === "medium" ? mediumWidths.users : widths.users, align: "right", tabular: true, render: (row: PlatformOrganizationRow) => formatCount(row.userCount) } satisfies DenseColumn<PlatformOrganizationRow>] : []),
    ...(density === "full" ? [
      { key: "modules", header: "MÓDULOS", width: widths.modules, align: "right", tabular: true, render: (row: PlatformOrganizationRow) => formatCount(row.moduleCount) } satisfies DenseColumn<PlatformOrganizationRow>,
      { key: "createdAt", header: "CRIADA EM", width: widths.createdAt, align: "right", tabular: true, render: (row: PlatformOrganizationRow) => formatDate(row.createdAt) } satisfies DenseColumn<PlatformOrganizationRow>,
    ] : []),
  ];
  const pageHeader = (
    <PageHeader
      kicker="Plataforma"
      title="Organizações"
      subtitle="Cadastros e situação das organizações clientes, filiais de cada grupo"
      actions={status !== "forbidden" && canCreate ? <button type="button" className="pat-btn pat-btn--primary" onClick={onCreate}><Plus size={15} aria-hidden="true" />Nova organização</button> : undefined}
    />
  );

  if (status === "loading") return <section ref={sectionRef} className="platform-organizations page-stack">{pageHeader}<Skeleton lines={7} /></section>;
  if (status === "forbidden") return <section ref={sectionRef} className="platform-organizations page-stack">{pageHeader}<ErrorState title="Acesso não permitido" detail="Seu perfil não tem permissão para consultar as organizações da plataforma." /></section>;
  if (status === "error") return <section ref={sectionRef} className="platform-organizations page-stack">{pageHeader}<ErrorState title="Não foi possível carregar as organizações" detail="Tente novamente para consultar a lista completa." /><button type="button" className="pat-btn" onClick={onRetry}>Tentar novamente</button></section>;
  if (status === "empty") return <section ref={sectionRef} className="platform-organizations page-stack">{pageHeader}<EmptyState title="Nenhuma organização encontrada" detail="Ainda não há organizações cadastradas na plataforma." /></section>;

  return (
    <section ref={sectionRef} className="platform-organizations page-stack">
      {pageHeader}
      {stale ? <Alert title="Dados desatualizados" tone="warning">A última atualização falhou. O último conjunto completo continua visível.</Alert> : null}
      <div className="platform-organizations__kpis">
        <KpiStatCard icon={Building2} iconColor="var(--color-core-primary)" iconBg="var(--surface-panel-muted)" value={counts.active} label="Organizações ativas" hint="sem a organização de sistema" ariaLabel={`Organizações ativas: ${counts.active}. Sem a organização de sistema`} onClick={() => onStatusFilterChange("active")} pressed={statusFilter === "active"} />
        <KpiStatCard icon={CircleAlert} iconColor="var(--color-status-danger)" iconBg="var(--surface-panel-muted)" value={counts.suspended} label="Organizações suspensas" hint={counts.suspended > 0 ? "acesso cortado" : "nenhuma agora"} ariaLabel={`Organizações suspensas: ${counts.suspended}. ${counts.suspended > 0 ? "Acesso cortado" : "Nenhuma agora"}`} onClick={() => onStatusFilterChange("suspended")} pressed={statusFilter === "suspended"} />
        <KpiStatCard icon={CircleAlert} iconColor="var(--color-status-warning)" iconBg="var(--surface-panel-muted)" value={counts.incomplete} label="Cadastro incompleto" hint="plano, administrador ou dados" ariaLabel={`Cadastro incompleto: ${counts.incomplete}. Plano, administrador ou dados`} onClick={() => onStatusFilterChange("incomplete")} pressed={statusFilter === "incomplete"} />
        <KpiStatCard icon={Users} iconColor="var(--color-core-primary)" iconBg="var(--surface-panel-muted)" value={totalUsers === null ? "—" : totalUsers} label="Usuários totais" hint={totalUsers === null ? "contagem indisponível agora" : "clique para ordenar a lista"} ariaLabel={`Usuários totais: ${totalUsers === null ? "contagem indisponível" : totalUsers}. ${totalUsers === null ? "Contagem indisponível agora" : "Clique para ordenar a lista"}`} onClick={() => onOrderChange(order === "usuarios" ? null : "usuarios")} pressed={order === "usuarios"} />
        <div className="platform-organizations__revenue-note"><strong>Receita por organização</strong><span>Disponível após a ativação da medição cloud.</span></div>
      </div>
      <div className="platform-organizations__list-card">
        <div className="platform-organizations__list-head"><strong>{visible.length} de {rows.length} organizações</strong></div>
        <div className="platform-organizations__filters">
          <label className="platform-organizations__search"><Search size={14} aria-hidden="true" /><span className="sr-only">Buscar organização ou grupo</span><input aria-label="Buscar organização ou grupo" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Buscar organização ou grupo…" /></label>
          <label><span className="sr-only">Grupo</span><select aria-label="Filtrar por grupo" value={groupId} onChange={(event) => onGroupChange(event.target.value)}><option value="">Todos os grupos</option>{groupOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}<option value="__sem">Sem grupo</option></select></label>
        </div>
        {statusFilter !== "all" ? <span className="pat-filtro-chip">Filtro: {statusFilter === "active" ? "Ativas" : statusFilter === "suspended" ? "Suspensas" : "Cadastro incompleto"}<button type="button" aria-label={`Tirar o filtro ${statusFilter === "active" ? "Ativas" : statusFilter === "suspended" ? "Suspensas" : "Cadastro incompleto"}`} onClick={() => onStatusFilterChange("all")}>×</button></span> : null}
        {order === "usuarios" ? <span className="pat-filtro-chip">Ordenado por: usuários<button type="button" aria-label="Tirar a ordem por usuários" onClick={() => onOrderChange(null)}>×</button></span> : null}
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
      </div>
      {status === "ready" && noCustomers ? <div className="platform-organizations__customer-empty"><EmptyState title="Nenhuma organização cliente ainda" detail="Só existe a organização de sistema. A primeira filial nasce aqui, com o grupo dela." />{canCreate ? <button type="button" className="pat-btn pat-btn--primary" onClick={onCreate}><Plus size={15} aria-hidden="true" />Nova organização</button> : null}</div> : null}
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
  const table = useOrganizationsTableDensity();
  const [expandedId, setExpandedId] = useState<string | null>(() => params.get("org"));
  const [createOpen, setCreateOpen] = useState(false);
  const query = params.get("q") ?? "";
  const groupId = params.get("grupo") ?? "";
  const rawStatus = params.get("situacao");
  const statusFilter: OrganizationStatusFilter = rawStatus === "active" || rawStatus === "suspended" || rawStatus === "incomplete" ? rawStatus : "all";
  const order = params.get("ordem") === "usuarios" ? "usuarios" : null;
  const write = (key: string, value: string) => { const next = new URLSearchParams(params); value ? next.set(key, value) : next.delete(key); setParams(next, { replace: true }); };
  const changeExpanded = (value: string | null) => { setExpandedId(value); write("org", value ?? ""); };
  const actionPermissions = ["platform:tenants:update", "platform:tenants:suspend", "platform:users:create_admin", "platform:billing:manage", "platform:billing:read"].filter(has);
  const returnSearch = params.toString() ? `?${params.toString()}` : "";

  return <>
    <PlatformTenantsView rows={organizations.rows} status={organizations.status} stale={organizations.stale} density={table.density} sectionRef={table.sectionRef} query={query} groupId={groupId} statusFilter={statusFilter} order={order} expandedId={expandedId} canCreate={has("platform:tenants:create")} onCreate={() => setCreateOpen(true)} onQueryChange={(value) => write("q", value)} onGroupChange={(value) => write("grupo", value)} onStatusFilterChange={(value) => write("situacao", value === "all" ? "" : value)} onOrderChange={(value) => write("ordem", value ?? "")} onExpandedIdChange={changeExpanded} onRetry={() => void organizations.refresh(false)} renderDetail={(row) => <OrganizationDetailPanel organization={row} returnSearch={returnSearch} permissions={actionPermissions} onRefreshList={() => void organizations.refresh(false)} />} />
    {createOpen ? <NewOrganizationDialog onClose={() => setCreateOpen(false)} onCreated={() => void organizations.refresh(false)} permissions={actionPermissions} /> : null}
  </>;
}

export default PlatformTenantsPage;
