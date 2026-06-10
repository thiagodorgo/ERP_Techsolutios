import { ClipboardList } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Alert } from "../../../components/ui";
import { useAuth } from "../../../providers/AuthProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { createWorkOrder } from "../work-orders.service";
import type { WorkOrderCreatePayload } from "../work-orders.types";
import { WorkOrderForm } from "../components/WorkOrderForm";

export function WorkOrderCreatePage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(payload: WorkOrderCreatePayload) {
    if (!activeContext) return;

    setSaving(true);
    setError(null);
    try {
      const workOrder = await createWorkOrder(
        {
          token: session?.accessToken,
          tenantId: activeContext.tenantId,
          branchId: activeContext.branchId,
          role: activeContext.role,
          permissions: activeContext.permissions,
        },
        payload,
      );
      navigate(workOrder.id ? `/work-orders/${workOrder.id}` : "/work-orders");
    } catch {
      setError("Nao foi possivel salvar a OS.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page-stack work-orders-page">
      <header className="page-heading">
        <span>Ordens de Servico</span>
        <h1><ClipboardList size={24} /> Nova OS</h1>
        <p>Crie uma ordem operacional para despacho, checklist futuro e acompanhamento no mapa.</p>
      </header>
      {error ? <Alert title="Falha ao criar OS" tone="warning">{error}</Alert> : null}
      <WorkOrderForm saving={saving} onCancel={() => navigate("/work-orders")} onSubmit={submit} />
    </section>
  );
}
