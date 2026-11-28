import { Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { Alert, Badge, Button, Card, Checkbox, EmptyState, Skeleton } from "../../../components/ui";
import { ApiError } from "../../../services/api/client";
import { getPlatformTenantById, listPlatformTenantModules, updatePlatformTenantModules } from "../platform.service";
import type { PlatformModule, PlatformTenant } from "../platform.types";
import { usePlatformTenantDetail } from "../usePlatformTenantDetail";

export function PlatformTenantModulesPage() {
  const { tenantId = "" } = useParams();
  const [tenant, setTenant] = useState<PlatformTenant | null>(null);
  const [modules, setModules] = useState<PlatformModule[]>([]);
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingError, setSavingError] = useState<string | null>(null);
  const detailState = usePlatformTenantDetail(tenantId);

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

  function applyServerModules(next: PlatformModule[]) {
    setModules(next);
    setEnabledModules(next.filter((module) => module.status === "enabled").map((module) => module.key));
  }

  async function saveModules() {
    setSavingError(null);
    try {
      applyServerModules(await updatePlatformTenantModules(tenantId, enabledModules));
    } catch (item) {
      applyServerModules(modules);
      const refused = item instanceof ApiError && item.status >= 400 && item.status < 500;
      setSavingError(item instanceof ApiError && item.status === 409 && item.reason === "module_change_requires_subscription" ? "Os módulos são definidos pela assinatura. Altere o plano para mudar este conjunto." : refused ? "Não foi possível salvar os módulos. Nada foi alterado." : "Não foi possível confirmar se os módulos foram salvos. Recarregue a página para ver a situação atual.");
    }
  }

  function toggleModule(module: PlatformModule) {
    if (!module.availableInPlan) return;
    setEnabledModules((current) =>
      current.includes(module.key) ? current.filter((key) => key !== module.key) : [...current, module.key],
    );
  }

  if (loading || detailState.loading) return <Skeleton lines={8} />;
  if (error || !tenant) return <EmptyState title="Módulos não encontrados" detail={error ?? "Não foi possível carregar os módulos."} />;

  const subscription = detailState.data.detail?.subscription;
  const planName = subscription === null ? "Sem plano contratado" : subscription?.planName;
  if (!planName) return <EmptyState title="Plano indisponível" detail="Não foi possível consultar o plano desta organização. Tente novamente." />;

  return (
    <section className="page-stack">
      <header className="page-heading page-heading--row">
        <div>
          <h1>Módulos da Organização</h1>
          <p>{tenant.name} · plano {planName}</p>
        </div>
        <Button onClick={saveModules}>
          <Save size={16} />
          Salvar alterações
        </Button>
      </header>

      {savingError ? <Alert title="Alteração não concluída" tone="warning">{savingError}</Alert> : null}

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
                  label={module.availableInPlan ? "Habilitar módulo" : "Bloqueado pelo plano"}
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
