import { RefreshCw } from "lucide-react";
import type { CSSProperties } from "react";

import { Alert, Badge, Button, EmptyState, Skeleton } from "../../../components/ui";
import { useAutoRefresh } from "../../../hooks/useAutoRefresh";
import { usePermissions } from "../../../providers/PermissionProvider";
import { TenantSettingsGroups } from "../components/TenantSettingsGroups";
import { useTenantSettings } from "../useTenantSettings";

// Configurações da Organização (Ω2-e) — DATA-BACKED por parâmetros key-value reais
// (`GET /api/v1/tenant-settings`). Os parâmetros são agrupados por `category` (apresentação só
// decora com título/ícone). Página gated por `tenant_settings:read`; edição por
// `tenant_settings:update` (o botão Salvar some para quem só lê). D-007: nada é fabricado.

const retryRowStyle: CSSProperties = { display: "flex", justifyContent: "flex-start" };

export function TenantSettingsPage() {
  const { items, loading, error, refresh, context } = useTenantSettings();
  // WS-UI-REFRESH — o sistema recarrega sozinho em segundo plano (sem botão "Atualizar").
  useAutoRefresh(refresh, { enabled: Boolean(context.tenantId) });
  const { can } = usePermissions();

  const canUpdate = can("tenant_settings:update");

  return (
    <section className="page-stack tenant-settings-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>Administrador</span>
          <h1>Configurações</h1>
          <p>Parâmetros da organização — valores reais, agrupados por categoria.</p>
        </div>
        {canUpdate ? null : (
          <div className="work-orders-actions">
            <Badge tone="info">Somente leitura</Badge>
          </div>
        )}
      </header>

      {error ? (
        <>
          <Alert title="Não foi possível carregar os parâmetros" tone="warning">
            {error}
          </Alert>
          <div style={retryRowStyle}>
            <Button type="button" variant="secondary" onClick={() => void refresh()}>
              <RefreshCw size={16} aria-hidden /> Tentar novamente
            </Button>
          </div>
        </>
      ) : null}

      {loading && items.length === 0 ? <Skeleton lines={6} /> : null}

      {!loading && !error && items.length === 0 ? (
        <EmptyState
          title="Nenhum parâmetro configurado"
          detail="Os parâmetros da organização aparecem aqui assim que forem provisionados. A tela atualiza automaticamente."
        />
      ) : null}

      {items.length > 0 ? (
        <TenantSettingsGroups items={items} canUpdate={canUpdate} context={context} onSaved={() => void refresh()} />
      ) : null}
    </section>
  );
}

export default TenantSettingsPage;
