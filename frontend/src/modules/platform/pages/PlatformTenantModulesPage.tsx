import { Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { Badge, Button, Card, Checkbox, EmptyState, Skeleton } from "../../../components/ui";
import { getPlatformTenantById, listPlatformTenantModules, updatePlatformTenantModules } from "../platform.service";
import type { PlatformModule, PlatformTenant } from "../platform.types";

export function PlatformTenantModulesPage() {
  const { tenantId = "" } = useParams();
  const [tenant, setTenant] = useState<PlatformTenant | null>(null);
  const [modules, setModules] = useState<PlatformModule[]>([]);
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getPlatformTenantById(tenantId), listPlatformTenantModules(tenantId)])
      .then(([tenantData, moduleData]) => {
        setTenant(tenantData);
        setModules(moduleData);
        setEnabledModules(moduleData.filter((module) => module.status === "enabled").map((module) => module.key));
      })
      .catch((item: Error) => setError(item.message))
      .finally(() => setLoading(false));
  }, [tenantId]);

  const groupedModules = useMemo(
    () => ({
      MVP: modules.filter((module) => module.category === "MVP"),
      "Fase 2": modules.filter((module) => module.category === "Fase 2"),
      Enterprise: modules.filter((module) => module.category === "Enterprise"),
    }),
    [modules],
  );

  async function saveModules() {
    const updated = await updatePlatformTenantModules(tenantId, enabledModules);
    setModules(updated);
  }

  function toggleModule(module: PlatformModule) {
    if (!module.availableInPlan) return;
    setEnabledModules((current) =>
      current.includes(module.key) ? current.filter((key) => key !== module.key) : [...current, module.key],
    );
  }

  if (loading) return <Skeleton lines={8} />;
  if (error || !tenant) return <EmptyState title="Modulos nao encontrados" detail={error ?? "Nao foi possivel carregar os modulos."} />;

  return (
    <section className="page-stack">
      <header className="page-heading page-heading--row">
        <div>
          <span>P03 Console da Plataforma</span>
          <h1>Modulos do Tenant</h1>
          <p>{tenant.name} · plano {tenant.plan}</p>
        </div>
        <Button onClick={saveModules}>
          <Save size={16} />
          Salvar alteracoes
        </Button>
      </header>

      {Object.entries(groupedModules).map(([category, items]) => (
        <Card key={category} title={category}>
          <div className="platform-module-grid">
            {items.map((module) => (
              <article key={module.key} className="platform-module-card">
                <header>
                  <div>
                    <strong>{module.name}</strong>
                    <p>{module.description}</p>
                  </div>
                  <Badge tone={!module.availableInPlan ? "danger" : enabledModules.includes(module.key) ? "success" : "default"}>
                    {!module.availableInPlan ? "bloqueado" : enabledModules.includes(module.key) ? "habilitado" : "desabilitado"}
                  </Badge>
                </header>
                <Checkbox
                  label={module.availableInPlan ? "Habilitar modulo" : "Bloqueado pelo plano"}
                  checked={module.availableInPlan && enabledModules.includes(module.key)}
                  disabled={!module.availableInPlan}
                  onChange={() => toggleModule(module)}
                />
              </article>
            ))}
          </div>
        </Card>
      ))}
    </section>
  );
}
