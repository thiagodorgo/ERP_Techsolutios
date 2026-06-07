import {
  Activity,
  AlertTriangle,
  Bell,
  Boxes,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Gauge,
  LayoutDashboard,
  LockKeyhole,
  Map,
  Menu,
  Radio,
  Route,
  ShieldCheck,
  Truck,
  UserRoundCog,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { NavLink } from "react-router-dom";

import { Accordion, Alert, Badge, Button, Card, Chip, SearchBar, Select, Table, Tooltip } from "../ui";
import type { DomainEvent } from "../../modules/events/types";
import type { LogisticsAsset } from "../../modules/logistics/types";
import type { WorkOrder, WorkOrderEvidence, WorkOrderTimelineItem } from "../../modules/work-orders/types";
import type { TenantContext } from "../../modules/context/types";
import { tenantNavigation } from "../../navigation/tenantNavigation";
import { canShowNavigationItem } from "../../navigation/types";
import { usePermissions } from "../../providers/PermissionProvider";

export function TenantBadge({ context }: { context: TenantContext }) {
  return <Badge tone={context.tenantStatus === "blocked" ? "danger" : "info"}>{context.tenantName}</Badge>;
}

export function BranchBadge({ context }: { context: TenantContext }) {
  return <Badge tone="default">{context.branchName}</Badge>;
}

export function RoleBadge({ context }: { context: TenantContext }) {
  return <Badge tone="audit">{context.role}</Badge>;
}

export function ActiveContextBar({ context }: { context: TenantContext }) {
  return (
    <div className="erp-context-bar">
      <TenantBadge context={context} />
      <BranchBadge context={context} />
      <RoleBadge context={context} />
      <span>Escopo: {context.scope}</span>
    </div>
  );
}

export function SecurityNotice() {
  return (
    <Alert title="Acesso auditavel" tone="info">
      Autenticacao compativel com Cognito, isolamento por tenant e autorizacao final no backend.
    </Alert>
  );
}

const iconByModule = {
  dashboard: LayoutDashboard,
  "work-orders": ClipboardList,
  logistics: Truck,
  users: UserRoundCog,
  "tenant-admin": ShieldCheck,
  tenant_checklist: ClipboardList,
};

export function Sidebar({ context }: { context?: TenantContext | null }) {
  const { permissions } = usePermissions();
  const visibleItems = tenantNavigation.filter((item) =>
    canShowNavigationItem(item, {
      permissions,
      enabledModules: ["dashboard", "work-orders", "logistics", "users", "tenant-admin", "tenant_checklist"],
      tenantStatus: context?.tenantStatus,
    }),
  );

  return (
    <aside className="erp-sidebar">
      <div className="erp-sidebar__brand">
        <Building2 size={22} />
        <div>
          <strong>ERP Techsolutions</strong>
          <span>Operacao multi-tenant</span>
        </div>
      </div>
      <nav>
        {visibleItems.map((item) => {
          const Icon = iconByModule[item.module as keyof typeof iconByModule] ?? LayoutDashboard;
          return item.disabled ? (
            <span key={item.path} className="erp-nav-disabled">
              <Icon size={18} />
              <span>{item.label}</span>
            </span>
          ) : (
            <NavLink key={item.path} to={item.path}>
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

export function Topbar({ context }: { context: TenantContext }) {
  return (
    <header className="erp-topbar">
      <ActiveContextBar context={context} />
      <div className="erp-topbar__actions">
        <ProcessingChip state="processing" label="Polling ativo" />
        <Tooltip label="Notificacoes operacionais">
          <button type="button" className="erp-icon-button" aria-label="Notificacoes">
            <Bell size={18} />
          </button>
        </Tooltip>
      </div>
    </header>
  );
}

export function MobileHeader({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="erp-mobile-header">
      <button type="button" onClick={onMenu} aria-label="Abrir navegacao">
        <Menu size={20} />
      </button>
      <strong>ERP Techsolutions</strong>
      <Radio size={18} />
    </header>
  );
}

export function StatusChip({ status }: { status: WorkOrder["status"] }) {
  const toneByStatus: Record<WorkOrder["status"], "default" | "success" | "warning" | "danger" | "info" | "pending"> = {
    draft: "default",
    scheduled: "info",
    waiting_approval: "pending",
    dispatched: "info",
    in_transit: "info",
    in_service: "success",
    blocked: "danger",
    completed: "success",
    cancelled: "default",
  };
  return <Chip tone={toneByStatus[status]}>{status.replace("_", " ")}</Chip>;
}

export function PriorityChip({ priority }: { priority: WorkOrder["priority"] }) {
  const tone = priority === "critical" ? "danger" : priority === "high" ? "warning" : priority === "medium" ? "info" : "default";
  return <Chip tone={tone}>{priority}</Chip>;
}

export function SlaChip({ state }: { state: WorkOrder["slaState"] }) {
  const tone = state === "breached" ? "danger" : state === "attention" ? "warning" : "success";
  return <Chip tone={tone}>SLA {state.replace("_", " ")}</Chip>;
}

export function BlockedBanner({ reason }: { reason: string }) {
  return (
    <section className="erp-blocked-banner">
      <LockKeyhole size={18} />
      <div>
        <strong>Acao bloqueada</strong>
        <p>{reason}</p>
      </div>
    </section>
  );
}

export function ProcessingChip({ state, label }: { state: "queued" | "processing" | "reconciled" | "failed"; label: string }) {
  const tone = state === "failed" ? "danger" : state === "reconciled" ? "success" : state === "queued" ? "pending" : "info";
  return <Chip tone={tone}>{label}</Chip>;
}

export function KpiCard({ label, value, delta, tone }: { label: string; value: string; delta: string; tone: "default" | "success" | "warning" | "danger" | "info" }) {
  return (
    <Card>
      <div className="erp-kpi-card">
        <span>{label}</span>
        <strong>{value}</strong>
        <Chip tone={tone}>{delta}</Chip>
      </div>
    </Card>
  );
}

export function AlertPanel({ alerts }: { alerts: Array<{ id: string; title: string; detail: string; severity: "info" | "warning" | "danger" }> }) {
  return (
    <Card title="Alertas operacionais">
      <div className="erp-alert-list">
        {alerts.map((alert) => (
          <Alert key={alert.id} title={alert.title} tone={alert.severity}>
            {alert.detail}
          </Alert>
        ))}
      </div>
    </Card>
  );
}

export function TimelineRow({ item }: { item: WorkOrderTimelineItem | DomainEvent }) {
  const title = "title" in item ? item.title : item.name;
  const detail = "detail" in item ? item.detail : `${item.aggregateType} ${item.aggregateId}`;
  const actor = "actor" in item ? item.actor : item.state;
  const at = "at" in item ? item.at : item.occurredAt;
  return (
    <article className="erp-timeline-row">
      <span />
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
        <small>
          {actor} · {new Date(at).toLocaleString("pt-BR")}
        </small>
      </div>
    </article>
  );
}

export function WorkOrderGrid({ workOrders, onOpen }: { workOrders: WorkOrder[]; onOpen: (workOrder: WorkOrder) => void }) {
  return (
    <Table
      rows={workOrders}
      keyForRow={(row) => row.id}
      onRowClick={onOpen}
      columns={[
        { key: "code", header: "OS", render: (row) => <strong>{row.code}</strong> },
        { key: "customer", header: "Cliente / local", render: (row) => <span>{row.customer}<br /><small>{row.location}</small></span> },
        { key: "status", header: "Status", render: (row) => <StatusChip status={row.status} /> },
        { key: "sla", header: "SLA", render: (row) => <SlaChip state={row.slaState} /> },
        { key: "priority", header: "Prioridade", render: (row) => <PriorityChip priority={row.priority} /> },
        { key: "team", header: "Equipe / viatura", render: (row) => <span>{row.team}<br /><small>{row.vehicle}</small></span> },
        { key: "audit", header: "Auditoria", render: (row) => <ProcessingChip state={row.blocked ? "queued" : "reconciled"} label={row.blocked ? "pendente" : "ok"} /> },
      ]}
    />
  );
}

export function WorkOrderCard({ workOrder, onOpen }: { workOrder: WorkOrder; onOpen: (workOrder: WorkOrder) => void }) {
  return (
    <button type="button" className="erp-work-order-card" onClick={() => onOpen(workOrder)}>
      <header>
        <strong>{workOrder.code}</strong>
        <SlaChip state={workOrder.slaState} />
      </header>
      <p>{workOrder.customer}</p>
      <span>{workOrder.serviceType}</span>
      <footer>
        <StatusChip status={workOrder.status} />
        <PriorityChip priority={workOrder.priority} />
      </footer>
    </button>
  );
}

export function WorkOrderHeader({ workOrder }: { workOrder: WorkOrder }) {
  return (
    <section className="erp-work-order-header">
      <div>
        <span>{workOrder.code}</span>
        <h1>{workOrder.customer}</h1>
        <p>{workOrder.serviceType} · {workOrder.location}</p>
      </div>
      <div className="erp-chip-row">
        <StatusChip status={workOrder.status} />
        <PriorityChip priority={workOrder.priority} />
        <SlaChip state={workOrder.slaState} />
      </div>
    </section>
  );
}

export function EvidencePanel({ evidence }: { evidence: WorkOrderEvidence[] }) {
  return (
    <Card title="Evidencias">
      <div className="erp-evidence-list">
        {evidence.map((item) => (
          <article key={item.id}>
            <Boxes size={18} />
            <div>
              <strong>{item.title}</strong>
              <span>{item.type} · {item.capturedBy}</span>
              <small>{item.auditHash}</small>
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}

export function ApprovalPanel({ state }: { state: WorkOrder["approvalState"] }) {
  return (
    <Card title="Aprovacao">
      <div className="erp-approval-panel">
        <ShieldCheck size={22} />
        <div>
          <strong>{state === "requested" ? "Aprovacao pendente" : "Estado de aprovacao"}</strong>
          <p>Solicitante, impacto, limite e proximo aprovador preparados para contrato backend.</p>
        </div>
        <Chip tone={state === "requested" ? "pending" : "success"}>{state}</Chip>
      </div>
    </Card>
  );
}

export function LogisticsKpiStrip({ assets }: { assets: LogisticsAsset[] }) {
  const blocked = assets.filter((asset) => asset.status === "blocked").length;
  const available = assets.filter((asset) => asset.status === "available").length;
  return (
    <div className="erp-logistics-strip">
      <KpiCard label="Equipes rastreadas" value={String(assets.length)} delta="tempo real" tone="info" />
      <KpiCard label="Disponiveis" value={String(available)} delta="para despacho" tone="success" />
      <KpiCard label="Bloqueios" value={String(blocked)} delta="exigem acao" tone={blocked ? "danger" : "success"} />
    </div>
  );
}

export function DispatchPanel({ workOrders }: { workOrders: WorkOrder[] }) {
  return (
    <Card title="Despacho assistido" action={<Button size="sm">Redistribuir</Button>}>
      <div className="erp-dispatch-list">
        {workOrders.slice(0, 4).map((workOrder) => (
          <article key={workOrder.id}>
            <Route size={18} />
            <div>
              <strong>{workOrder.code}</strong>
              <span>{workOrder.team} · {workOrder.vehicle}</span>
            </div>
            <SlaChip state={workOrder.slaState} />
          </article>
        ))}
      </div>
    </Card>
  );
}

export function QueueAccordion({ title, count, items }: { title: string; count: number; items: string[] }) {
  return (
    <Accordion title={`${title} (${count})`}>
      <div className="erp-queue-items">
        {items.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </Accordion>
  );
}

export function MapPanel({ assets }: { assets: LogisticsAsset[] }) {
  return (
    <Card title="Mapa operacional">
      <div className="erp-map-panel" aria-label="Mapa operacional sintetico">
        {assets.map((asset, index) => (
          <article key={asset.id} style={{ "--x": `${18 + index * 22}%`, "--y": `${24 + (index % 2) * 34}%` } as CSSProperties}>
            <Truck size={18} />
            <strong>{asset.vehicle}</strong>
            <span>{asset.location}</span>
          </article>
        ))}
      </div>
    </Card>
  );
}

export function FilterBar({ children }: { children?: ReactNode }) {
  return (
    <section className="erp-filter-bar">
      <Select aria-label="Periodo" defaultValue="today">
        <option value="today">Hoje</option>
        <option value="week">Semana</option>
      </Select>
      <Select aria-label="Filial" defaultValue="fil-sp-01">
        <option value="fil-sp-01">Sao Paulo - Campo</option>
      </Select>
      <Select aria-label="Status" defaultValue="all">
        <option value="all">Todos status</option>
        <option value="blocked">Bloqueadas</option>
        <option value="breached">SLA vencido</option>
      </Select>
      {children}
    </section>
  );
}

export function ERPSearchBar({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <SearchBar value={value} onChange={onChange} placeholder="Buscar OS, cliente, equipe ou viatura" />;
}

export function StickyActionBar({ children }: { children: ReactNode }) {
  return <footer className="erp-sticky-action-bar">{children}</footer>;
}

export function ValidationToggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button type="button" className={`erp-validation-toggle ${checked ? "is-active" : ""}`} onClick={() => onChange(!checked)}>
      {checked ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
      <span>Validacao operacional</span>
    </button>
  );
}

export function AuditMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="erp-audit-metric">
      <Gauge size={16} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function DomainRail() {
  return (
    <div className="erp-domain-rail">
      <span><Activity size={14} /> Eventos</span>
      <span><CalendarClock size={14} /> SLA</span>
      <span><UserRoundCog size={14} /> Usuarios</span>
      <span><Map size={14} /> Logistica</span>
    </div>
  );
}
