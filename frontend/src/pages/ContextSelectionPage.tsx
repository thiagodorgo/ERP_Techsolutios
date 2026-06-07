import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { BranchBadge, RoleBadge, SecurityNotice, TenantBadge } from "../components/erp";
import { Button, Card, Chip, EmptyState, Skeleton } from "../components/ui";
import { listAvailableContexts } from "../modules/context/repository";
import type { TenantContext } from "../modules/context/types";
import { useAuth } from "../providers/AuthProvider";
import { useTenantContext } from "../providers/TenantProvider";

export function ContextSelectionPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, session } = useAuth();
  const { setActiveContext } = useTenantContext();
  const [contexts, setContexts] = useState<TenantContext[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listAvailableContexts().then((items) => {
      setContexts(items);
      setLoading(false);
    });
  }, [session]);

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

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
                disabled={context.tenantStatus === "blocked"}
                onClick={() => {
                  setActiveContext(context);
                  navigate("/dashboard");
                }}
              >
                Ativar contexto
              </Button>
            </article>
          </Card>
        ))}
      </div>
    </main>
  );
}
