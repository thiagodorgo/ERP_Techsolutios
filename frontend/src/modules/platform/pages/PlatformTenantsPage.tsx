import { Building2, Info, Search, Users, type LucideIcon } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";

import { Alert, EmptyState, ErrorState, Skeleton } from "../../../components/ui";
import {
  customerOverviewMetrics,
  isPlatformSystemOrg,
  type PlatformOverviewData,
  type PlatformOverviewOrg,
} from "../platform-overview.types";
import { usePlatformOverview } from "../usePlatformOverview";

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 13 };
const th: CSSProperties = { fontSize: 10.5, fontWeight: 700, color: "#94A3B8", letterSpacing: ".06em" };
const NUMBER_FORMAT = new Intl.NumberFormat("pt-BR");
const DATE_FORMAT = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

export type OrganizationStatusFilter = "all" | "active" | "suspended" | "pending";

function formatCount(value: number): string {
  return NUMBER_FORMAT.format(value);
}

function formatDate(value: string): string {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime()) ? DATE_FORMAT.format(date) : "—";
}

function statusView(status: string): { label: string; color: string; dot: string } {
  if (status === "active") return { label: "Ativa", color: "#059669", dot: "#22C55E" };
  if (status === "suspended") return { label: "Suspensa", color: "#DC2626", dot: "#EF4444" };
  if (status === "pending") return { label: "Pendente", color: "#D97706", dot: "#F59E0B" };
  return { label: "Indefinida", color: "#64748B", dot: "#94A3B8" };
}

function PageHeader() {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid #F1F5F9", gap: 10 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.3px" }}>Organizações</div>
        <div style={{ fontSize: 13, color: "#64748B", marginTop: 3, fontWeight: 500 }}>cadastros e situação das organizações clientes</div>
      </div>
    </div>
  );
}

type KpiCardProps = {
  readonly icon: LucideIcon;
  readonly value: string;
  readonly label: string;
  readonly sub: string;
  readonly tone?: "default" | "warning";
};

function KpiCard({ icon: Icon, value, label, sub, tone = "default" }: KpiCardProps) {
  const warning = tone === "warning";
  return (
    <div style={{ ...card, padding: 18 }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: warning ? "#FFFBEB" : "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", color: warning ? "#D97706" : "#2563EB", marginBottom: 14 }}>
        <Icon size={18} />
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.5px", marginBottom: 3, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: "#475569", marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#64748B" }}>{sub}</div>
    </div>
  );
}

type PlatformTenantsViewProps = {
  readonly data: PlatformOverviewData;
  readonly query?: string;
  readonly statusFilter?: OrganizationStatusFilter;
  readonly onQueryChange?: (value: string) => void;
  readonly onStatusFilterChange?: (value: OrganizationStatusFilter) => void;
};

export function PlatformTenantsView({
  data,
  query = "",
  statusFilter = "all",
  onQueryChange = () => undefined,
  onStatusFilterChange = () => undefined,
}: PlatformTenantsViewProps) {
  const navigate = useNavigate();
  const metrics = customerOverviewMetrics(data);
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  const suspendedCount = metrics.customerOrgs.filter((org) => org.status === "suspended").length;
  const pendingCount = metrics.customerOrgs.filter((org) => org.status === "pending").length;
  const filtered = data.orgs.filter((org) => {
    if (statusFilter !== "all" && (isPlatformSystemOrg(org) || org.status !== statusFilter)) return false;
    if (!normalizedQuery) return true;
    return `${org.name} ${org.slug ?? ""}`.toLocaleLowerCase("pt-BR").includes(normalizedQuery);
  });

  const filters: readonly { value: OrganizationStatusFilter; label: string; count: number }[] = [
    { value: "all", label: "Todas", count: metrics.customerOrgs.length },
    { value: "active", label: "Ativas", count: metrics.activeOrgs },
    { value: "suspended", label: "Suspensas", count: suspendedCount },
    { value: "pending", label: "Pendentes", count: pendingCount },
  ];

  return (
    <div style={{ color: "#0F172A" }}>
      <PageHeader />
      {data.stale ? (
        <div style={{ marginBottom: 14 }}>
          <Alert title="Dados desatualizados" tone="warning">
            A atualização mais recente falhou. A última lista confirmada continua visível enquanto a plataforma tenta novamente.
          </Alert>
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 16 }}>
        <KpiCard icon={Building2} value={formatCount(metrics.activeOrgs)} label="Organizações ativas" sub={metrics.systemOrg ? "sem a organização de sistema" : "clientes com cadastro ativo"} />
        <KpiCard icon={Building2} value={formatCount(suspendedCount)} label="Organizações suspensas" sub="clientes com operação suspensa" tone={suspendedCount > 0 ? "warning" : "default"} />
        <KpiCard icon={Users} value={formatCount(metrics.totalUsers)} label="Usuários totais" sub={metrics.systemOrg ? "sem usuários da organização de sistema" : "nas organizações clientes"} />
        <div style={{ ...card, padding: 18, background: "#F8FAFC", borderStyle: "dashed", display: "flex", alignItems: "center", gap: 13 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: "#F5F3FF", display: "flex", alignItems: "center", justifyContent: "center", color: "#7C3AED", flexShrink: 0 }}><Info size={18} /></div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>Receita por organização</div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 3, lineHeight: 1.45 }}>Disponível após a ativação da medição cloud.</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 13px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 9, flex: 1, minWidth: 220, maxWidth: 340 }}>
          <Search size={14} aria-hidden="true" style={{ color: "#94A3B8" }} />
          <span className="sr-only">Buscar organização</span>
          <input
            aria-label="Buscar organização"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Buscar organização…"
            style={{ width: "100%", border: 0, outline: 0, background: "transparent", font: "inherit", fontSize: 13, color: "#334155" }}
          />
        </label>
        {filters.map((filter) => {
          const selected = filter.value === statusFilter;
          return (
            <button
              key={filter.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onStatusFilterChange(filter.value)}
              style={{ minHeight: 44, padding: "8px 13px", background: selected ? "#EFF6FF" : "#fff", border: `1px solid ${selected ? "#BFDBFE" : "#E2E8F0"}`, borderRadius: 9, fontSize: 12.5, fontWeight: selected ? 700 : 600, color: selected ? "#2563EB" : "#475569", cursor: "pointer", fontFamily: "inherit" }}
            >
              {filter.label} ({filter.count})
            </button>
          );
        })}
      </div>

      <div style={{ ...card, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "9px 18px", background: "#F8FAFC", borderBottom: "1px solid #F1F5F9", gap: 8 }}>
          <span style={{ ...th, flex: 2.1 }}>ORGANIZAÇÃO</span><span style={{ ...th, flex: 1 }}>STATUS</span><span style={{ ...th, flex: 0.8, textAlign: "right" }}>USUÁRIOS</span><span style={{ ...th, flex: 0.8, textAlign: "right" }}>MÓDULOS</span><span style={{ ...th, flex: 1, textAlign: "right" }}>CRIADA EM</span><span style={{ ...th, flex: 0.6, textAlign: "right" }}>AÇÃO</span>
        </div>
        {filtered.length === 0 ? (
          <EmptyState title="Nenhuma organização encontrada" detail="Ajuste a busca ou os filtros para consultar outras organizações." />
        ) : filtered.map((org: PlatformOverviewOrg, index) => {
          const status = statusView(org.status);
          const isSystemOrg = isPlatformSystemOrg(org);
          const openDetail = () => navigate(`/platform/tenants/${org.id}`);
          return (
            <div
              key={org.id}
              role={isSystemOrg ? undefined : "button"}
              tabIndex={isSystemOrg ? undefined : 0}
              onClick={isSystemOrg ? undefined : openDetail}
              onKeyDown={isSystemOrg ? undefined : (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openDetail(); } }}
              style={{ display: "flex", alignItems: "center", padding: "12px 18px", borderBottom: index === filtered.length - 1 ? "none" : "1px solid #F8FAFC", cursor: isSystemOrg ? "default" : "pointer", gap: 8, minHeight: 44 }}
            >
              <div style={{ flex: 2.1, display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "#EFF6FF", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#2563EB" }}><Building2 size={14} /></div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{org.name}</div>
                  {isSystemOrg ? <div style={{ fontSize: 10.5, fontWeight: 700, color: "#2563EB", marginTop: 2 }}>Organização de sistema</div> : null}
                </div>
              </div>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: status.dot }} /><span style={{ fontSize: 12.5, fontWeight: 600, color: status.color }}>{status.label}</span></div>
              <span style={{ flex: 0.8, fontSize: 12.5, color: "#475569", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{formatCount(org.userCount)}</span>
              <span style={{ flex: 0.8, fontSize: 12.5, color: "#475569", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{formatCount(org.moduleCount)}</span>
              <span style={{ flex: 1, fontSize: 12.5, color: "#64748B", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{formatDate(org.createdAt)}</span>
              <div style={{ flex: 0.6, display: "flex", justifyContent: "flex-end" }}><span style={{ fontSize: 12, fontWeight: 700, color: isSystemOrg ? "#64748B" : "#2563EB" }}>{isSystemOrg ? "Sistema" : "Ver"}</span></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Estados §7 da tela, separados do hook para serem renderizáveis no teste (B-SAN3-06b E8): carregando, acesso não
// permitido, falha sem dado anterior, vazio e, por fim, a lista.
export function PlatformTenantsScreen({ loading, ...viewProps }: PlatformTenantsViewProps & { readonly loading: boolean }) {
  const { data } = viewProps;
  const hasRows = data.orgs.length > 0;
  if (loading) return <div style={{ color: "#0F172A" }}><PageHeader /><div style={{ ...card, padding: 20 }}><Skeleton lines={7} /></div></div>;
  if (data.forbidden) return <div style={{ color: "#0F172A" }}><PageHeader /><ErrorState title="Acesso não permitido" detail="Seu perfil não tem permissão para consultar as organizações da plataforma." /></div>;
  if (data.source === "fallback" && !hasRows) return <div style={{ color: "#0F172A" }}><PageHeader /><Alert title="Não foi possível carregar as organizações" tone="warning">A plataforma tentará novamente em alguns instantes. Nenhuma contagem é exibida enquanto não houver uma resposta confirmada.</Alert></div>;
  if (!hasRows) return <div style={{ color: "#0F172A" }}><PageHeader /><div style={{ ...card, padding: 8 }}><EmptyState title="Nenhuma organização" detail="Ainda não há organizações cadastradas na plataforma." /></div></div>;
  return <PlatformTenantsView {...viewProps} />;
}

export function PlatformTenantsPage() {
  const { data, loading } = usePlatformOverview();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrganizationStatusFilter>("all");
  return <PlatformTenantsScreen data={data} loading={loading} query={query} statusFilter={statusFilter} onQueryChange={setQuery} onStatusFilterChange={setStatusFilter} />;
}

export default PlatformTenantsPage;
