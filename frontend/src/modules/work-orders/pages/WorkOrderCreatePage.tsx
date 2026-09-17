import { ClipboardList } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Alert } from "../../../components/ui";
import { useAuth } from "../../../providers/AuthProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { runCreateWorkOrder } from "../work-orders-create.handlers";
import type { WorkOrderCreatePayload } from "../work-orders.types";
import { WorkOrderForm } from "../components/WorkOrderForm";

export function WorkOrderCreatePage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // B-SAN3-01 (P-008) — o envio vai pelo handler de efeito com deps injetadas (runCreateWorkOrder, testado em
  // work-orders-honest-errors C1-C6; fiação conferida por S1). Recusa do backend → mensagem AQUI, sem navegar;
  // o WorkOrderForm continua montado na mesma posição da árvore, então o que o operador digitou fica onde está.
  function submit(payload: WorkOrderCreatePayload): Promise<void> {
    if (!activeContext) return Promise.resolve();

    return runCreateWorkOrder(
      {
        context: {
          token: session?.accessToken,
          tenantId: activeContext.tenantId,
          branchId: activeContext.branchId,
          role: activeContext.role,
          permissions: activeContext.permissions,
        },
        navigate,
        setSaving,
        setError,
      },
      payload,
    );
  }

  return (
    <section className="page-stack work-orders-page">
      <header className="page-heading">
        <span>Ordens de Servico</span>
        <h1><ClipboardList size={24} /> Nova OS</h1>
        <p>Crie uma ordem operacional para despacho, checklist futuro e acompanhamento no mapa.</p>
      </header>
      {error ? (
        <div role="alert" data-state="error">
          <Alert title="Não foi possível salvar a OS" tone="danger">{error}</Alert>
        </div>
      ) : null}
      <WorkOrderForm saving={saving} onCancel={() => navigate("/work-orders")} onSubmit={submit} />
    </section>
  );
}
