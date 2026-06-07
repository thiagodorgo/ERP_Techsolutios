import { Building2, CirclePlus, Power, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { KpiCard } from "../../../components/erp";
import { Badge, Button, Card, EmptyState, Skeleton, Table } from "../../../components/ui";
import { listPlatformTenants, updatePlatformTenantStatus } from "../platform.service";
import type { PlatformTenant } from "../platform.types";

export function PlatformTenantsPage() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listPlatformTenants()
      .then(setTenants)
      .catch((item: Error) => setError(item.message))
      .finally(() => setLoading(false));
  }, []);

  const summary = useMemo(
    () => ({
      active: tenants.filter((tenant) => tenant.status === "active").length,
      suspended: tenants.filter((tenant) => tenant.status === "suspended").length,
      users: tenants.reduce((total, tenant) => total + tenant.activeUsers, 0),
      modules: tenants.reduce((total, tenant) => total + tenant.enabledModules.length, 0),
    }),
    [tenants],
  );

  async function toggleStatus(tenant: PlatformTenant) {
    const nextStatus = tenant.status === "suspended" ? "active" : "suspended";
    const updated = await updatePlatformTenantStatus(tenant.id, nextStatus);
    setTenants((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  }

  return (
    <section className="page-stack">
      <header className="page-heading page-heading--row">
        <div>
          <span>P01 Console da Plataforma</span>
          <h1>Tenants</h1>
          <p>Crie, acompanhe e controle clientes da plataforma sem misturar escopo tenant.</p>
        </div>
        <Button>
          <CirclePlus size={16} />
          Criar tenant
        </Button>
      </header>

      <section className="kpi-grid">
        <KpiCard label="Tenants ativos" value={String(summary.active)} delta="operacionais" tone="success" />
        <KpiCard label="Suspensos" value={String(summary.suspended)} delta="acao critica" tone={summary.suspended ? "warning" : "success"} />
        <KpiCard label="Usuarios ativos" value={String(summary.users)} delta="todos tenants" tone="info" />
        <KpiCard label="Modulos habilitados" value={String(summary.modules)} delta="catalogo global" tone="default" />
      </section>

      {loading ? <Skeleton lines={6} /> : null}
      {error ? <EmptyState title="Falha ao carregar tenants" detail={error} /> : null}
      {!loading && !error && tenants.length === 0 ? (
        <EmptyState title="Nenhum tenant cadastrado" detail="Crie o primeiro tenant para iniciar a operacao." />
      ) : null}

      {!loading && !error && tenants.length > 0 ? (
        <Card title="Tenants cadastrados">
          <Table
            rows={tenants}
            keyForRow={(tenant) => tenant.id}
            onRowClick={(tenant) => navigate(`/platform/tenants/${tenant.id}`)}
            columns={[
              {
                key: "name",
                header: "Empresa",
                render: (tenant) => (
                  <span>
                    <strong>{tenant.name}</strong>
                    <br />
                    <small>{tenant.slug}</small>
                  </span>
                ),
              },
              { key: "plan", header: "Plano", render: (tenant) => <Badge tone="info">{tenant.plan}</Badge> },
              { key: "status", header: "Status", render: (tenant) => <TenantStatusBadge tenant={tenant} /> },
              { key: "users", header: "Usuarios ativos", render: (tenant) => tenant.activeUsers },
              { key: "modules", header: "Modulos", render: (tenant) => tenant.enabledModules.length },
              { key: "created", header: "Criado em", render: (tenant) => new Date(tenant.createdAt).toLocaleDateString("pt-BR") },
              {
                key: "actions",
                header: "Acoes",
                render: (tenant) => (
                  <div className="platform-actions">
                    <Button size="sm" variant="secondary" onClick={() => navigate(`/platform/tenants/${tenant.id}`)}>
                      <Building2 size={14} />
                      Detalhes
                    </Button>
                    <Button size="sm" variant={tenant.status === "suspended" ? "secondary" : "danger"} onClick={() => toggleStatus(tenant)}>
                      {tenant.status === "suspended" ? <RotateCcw size={14} /> : <Power size={14} />}
                      {tenant.status === "suspended" ? "Reativar" : "Suspender"}
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </Card>
      ) : null}
    </section>
  );
}

function TenantStatusBadge({ tenant }: { tenant: PlatformTenant }) {
  const tone = tenant.status === "active" ? "success" : tenant.status === "suspended" ? "danger" : "pending";
  return <Badge tone={tone}>{tenant.status}</Badge>;
}
