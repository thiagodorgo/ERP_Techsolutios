import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { BranchBadge, RoleBadge, SecurityNotice, TenantBadge } from "../components/erp";
import { Button, Card, Chip, EmptyState, Skeleton } from "../components/ui";
import { listAvailableContexts, switchTenantContext } from "../modules/context/repository";
import type { TenantContext } from "../modules/context/types";
import { useAuth } from "../providers/AuthProvider";
import { useTenantContext } from "../providers/TenantProvider";

export function ContextSelectionPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, session } = useAuth();
  const { setActiveContext } = useTenantContext();
  const [contexts, setContexts] = useState<TenantContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);
  const [activateError, setActivateError] = useState<string | null>(null);

  useEffect(() => {
    listAvailableContexts().then((items) => {
      setContexts(items);
      setLoading(false);
    });
  }, [session]);

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  async function handleActivate(context: TenantContext) {
    setActivateError(null);
    setActivating(context.tenantId);

    try {
      if (context.tenantId !== session?.tenant?.id) {
        await switchTenantContext(context.tenantId);
      }

      setActiveContext(context);
      navigate("/dashboard");
    } catch (err) {
      setActivateError(err instanceof Error ? err.message : "Não foi possível ativar o contexto.");
      setActivating(null);
    }
  }

  return (
    <main className="context-page">
      <section className="page-heading">
        <span>W01 Selecao de contexto</span>
        <h1>Definir tenant, filial e papel ativo</h1>
        <p>{session?.user.name} · {session?.user.email}</p>
      </section>
      <SecurityNotice />
      {loading ? <Skeleton lines={4} /> : null}
      {!loading && contexts.length === 0 ? <EmptyState title="Nenhum contexto liberado" detail="Solicite vinculo de tenant, filial e papel ao administrador." /> : null}
      {activateError ? <p className="context-page__error">{activateError}</p> : null}
      <div className="context-grid">
        {contexts.map((context) => (
          <Card key={`${context.tenantId}-${context.branchId}-${context.role}`}>
            <article className="context-option">
              <header>
                <TenantBadge context={context} />
                <Chip tone={context.tenantStatus === "blocked" ? "danger" : "success"}>{context.tenantStatus}</Chip>
              </header>
              <h2>{context.tenantName}</h2>
              <div className="erp-chip-row">
                <BranchBadge context={context} />
                <RoleBadge context={context} />
              </div>
              <p>Permissoes: {context.permissions.join(", ")}</p>
              <Button
                type="button"
                disabled={context.tenantStatus === "blocked" || activating !== null}
                onClick={() => void handleActivate(context)}
              >
                {activating === context.tenantId ? "Ativando..." : "Ativar contexto"}
              </Button>
            </article>
          </Card>
        ))}
      </div>
    </main>
  );
}
