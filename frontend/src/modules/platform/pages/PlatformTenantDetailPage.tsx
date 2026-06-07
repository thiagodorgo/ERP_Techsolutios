import { Power, RotateCcw, Settings, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { KpiCard } from "../../../components/erp";
import { Badge, Button, Card, EmptyState, Skeleton } from "../../../components/ui";
import { createTenantAdminUser, getPlatformTenantById, updatePlatformTenantStatus } from "../platform.service";
import type { PlatformTenant } from "../platform.types";

export function PlatformTenantDetailPage() {
  const navigate = useNavigate();
  const { tenantId = "" } = useParams();
  const [tenant, setTenant] = useState<PlatformTenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPlatformTenantById(tenantId)
      .then(setTenant)
      .catch((item: Error) => setError(item.message))
      .finally(() => setLoading(false));
  }, [tenantId]);

  async function toggleStatus() {
    if (!tenant) return;
    const updated = await updatePlatformTenantStatus(tenant.id, tenant.status === "suspended" ? "active" : "suspended");
    setTenant(updated);
  }

  async function createInitialAdmin() {
    if (!tenant) return;
    const updated = await createTenantAdminUser(tenant.id, {
      name: "Administrador Inicial",
      email: `admin.${tenant.slug}@example.com`,
    });
    setTenant(updated);
  }

  if (loading) return <Skeleton lines={7} />;
  if (error || !tenant) return <EmptyState title="Tenant nao encontrado" detail={error ?? "Nao foi possivel carregar este tenant."} />;

  return (
    <section className="page-stack">
      <header className="page-heading page-heading--row">
        <div>
          <span>P02 Console da Plataforma</span>
          <h1>{tenant.name}</h1>
          <p>{tenant.slug}</p>
        </div>
        <div className="platform-actions">
          <Button variant="secondary">
            <Settings size={16} />
            Editar tenant
          </Button>
          <Button variant={tenant.status === "suspended" ? "secondary" : "danger"} onClick={toggleStatus}>
            {tenant.status === "suspended" ? <RotateCcw size={16} /> : <Power size={16} />}
            {tenant.status === "suspended" ? "Reativar" : "Suspender"}
          </Button>
        </div>
      </header>

      <section className="kpi-grid">
        <KpiCard label="Usuarios ativos" value={String(tenant.activeUsers)} delta="tenant atual" tone="info" />
        <KpiCard label="Modulos" value={String(tenant.enabledModules.length)} delta="habilitados" tone="success" />
        <KpiCard label="OS registradas" value={String(tenant.usageSummary?.workOrders ?? 0)} delta="resumo de uso" tone="default" />
        <KpiCard label="API calls" value={String(tenant.usageSummary?.apiCalls ?? 0)} delta="ultimos ciclos" tone="warning" />
      </section>

      <section className="detail-grid">
        <div className="detail-main">
          <Card title="Dados do tenant">
            <div className="platform-detail-list">
              <span>Plano</span>
              <strong>{tenant.plan}</strong>
              <span>Status</span>
              <Badge tone={tenant.status === "active" ? "success" : tenant.status === "suspended" ? "danger" : "pending"}>{tenant.status}</Badge>
              <span>Criado em</span>
              <strong>{new Date(tenant.createdAt).toLocaleString("pt-BR")}</strong>
              <span>Ultima atividade</span>
              <strong>{tenant.lastActivityAt ? new Date(tenant.lastActivityAt).toLocaleString("pt-BR") : "Sem atividade"}</strong>
            </div>
          </Card>
          <Card title="Resumo de uso">
            <div className="platform-usage-grid">
              <KpiCard label="Armazenamento" value={`${tenant.usageSummary?.storageGb ?? 0} GB`} delta="mock MVP" tone="info" />
              <KpiCard label="Modulos ativos" value={tenant.enabledModules.join(", ")} delta="tenant" tone="default" />
            </div>
          </Card>
        </div>
        <aside className="detail-aside">
          <Card title="Admin principal">
            {tenant.adminUser ? (
              <div className="platform-admin-card">
                <strong>{tenant.adminUser.name}</strong>
                <span>{tenant.adminUser.email}</span>
              </div>
            ) : (
              <EmptyState title="Admin pendente" detail="Crie o administrador inicial do tenant." />
            )}
            <Button variant="secondary" onClick={createInitialAdmin}>
              <UserPlus size={16} />
              Criar admin inicial
            </Button>
          </Card>
          <Card title="Modulos do tenant">
            <p className="platform-muted">{tenant.enabledModules.length} modulos habilitados para este tenant.</p>
            <Button onClick={() => navigate(`/platform/tenants/${tenant.id}/modules`)}>
              Gerenciar modulos
            </Button>
          </Card>
        </aside>
      </section>
    </section>
  );
}
