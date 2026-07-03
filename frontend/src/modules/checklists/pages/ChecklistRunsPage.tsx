import { ClipboardList, Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Badge, Button, Card, EmptyState, ErrorState, SearchBar, Skeleton } from "../../../components/ui";
import { useAuth } from "../../../providers/AuthProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { listAvailableChecklists } from "../checklist-runtime.service";
import type { ChecklistApiContext, ChecklistAvailableItem, TenantChecklistType } from "../types";

const typeLabel: Record<TenantChecklistType, string> = {
  towing_collection: "Coleta/Reboque",
  towing_delivery: "Entrega/Reboque",
  technical_evidence: "Evidência técnica",
  custom: "Customizado",
};

export function ChecklistRunsPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const [items, setItems] = useState<ChecklistAvailableItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const context = useMemo(() => buildChecklistContext(session?.accessToken, activeContext), [activeContext, session?.accessToken]);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!context) return;

      setLoading(true);
      setError(null);

      try {
        const available = await listAvailableChecklists(context);
        if (active) setItems(available);
      } catch {
        if (active) setError("Não foi possível carregar checklists disponíveis.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [context]);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;

    return items.filter((item) =>
      [item.name, item.description ?? "", item.type].some((value) => value.toLowerCase().includes(normalized)),
    );
  }, [items, query]);

  if (!context) {
    return <ErrorState title="Contexto operacional indisponível" detail="Selecione uma organização e uma filial antes de executar checklists." />;
  }

  return (
    <div className="page-stack">
      <header className="page-heading page-heading--row">
        <div>
          <span>OPERAÇÃO</span>
          <h1>Checklists Operacionais</h1>
          <p>Execução web de checklists publicados para a operação de campo.</p>
        </div>
      </header>

      <section className="erp-filter-bar">
        <SearchBar value={query} onChange={setQuery} placeholder="Buscar checklist operacional" />
      </section>

      {loading ? <Skeleton lines={4} /> : null}
      {error ? <ErrorState title="Falha ao carregar checklists" detail={error} /> : null}
      {!loading && !error && filteredItems.length === 0 ? (
        <EmptyState title="Nenhum checklist publicado" detail="Publique um checklist no builder para disponibilizar a execução operacional." />
      ) : null}

      {!loading && !error && filteredItems.length > 0 ? (
        <section className="checklist-runtime-list">
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              title={item.name}
              action={<Badge tone="info">{typeLabel[item.type]}</Badge>}
            >
              <article className="checklist-runtime-card">
                <div>
                  <ClipboardList size={20} />
                  <div>
                    <p>{item.description ?? "Checklist operacional publicado para execução."}</p>
                    <span>
                      Versão {item.version} · {item.components.length} componentes · {item.status}
                    </span>
                  </div>
                </div>
                <Button type="button" onClick={() => navigate(`/operations/checklists/${item.id}/run`)}>
                  <Play size={16} />
                  Iniciar execução
                </Button>
              </article>
            </Card>
          ))}
        </section>
      ) : null}
    </div>
  );
}

export function buildChecklistContext(
  token: string | undefined,
  activeContext: ReturnType<typeof useTenantContext>["activeContext"],
): ChecklistApiContext | null {
  if (!activeContext) return null;

  return {
    token,
    tenantId: activeContext.tenantId,
    branchId: activeContext.branchId,
    role: activeContext.role,
    permissions: activeContext.permissions,
  };
}
