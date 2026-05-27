import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { SecurityNotice, StickyActionBar, ValidationToggle } from "../components/erp";
import { Button, Card, Checkbox, Input, Select } from "../components/ui";
import { createWorkOrderDraft } from "../modules/work-orders/repository";
import { useEvents } from "../providers/EventProvider";
import { useTenantContext } from "../providers/TenantProvider";

export function WorkOrderFormPage() {
  const navigate = useNavigate();
  const { activeContext } = useTenantContext();
  const { enqueueCommand } = useEvents();
  const [validated, setValidated] = useState(true);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeContext) return;
    setSaving(true);
    await createWorkOrderDraft({ customer: "Novo cliente operacional" });
    enqueueCommand({
      id: `cmd-${Date.now()}`,
      commandName: "CreateWorkOrder",
      tenantId: activeContext.tenantId,
      branchId: activeContext.branchId,
      requestedBy: "usr-ops-01",
      requestedAt: new Date().toISOString(),
      state: "queued",
      payload: { source: "W18", validation: validated },
    });
    setSaving(false);
    navigate("/work-orders/wo-10021");
  }

  return (
    <form className="page-stack" onSubmit={handleSubmit}>
      <header className="page-heading">
        <span>W18 Ordem de Servico</span>
        <h1>Criacao e edicao com validacoes obrigatorias</h1>
      </header>
      <SecurityNotice />
      <section className="form-grid">
        <Card title="Identificacao">
          <div className="form-section">
            <Input label="Cliente" defaultValue="Atlas Refrigeração" />
            <Input label="Local de atendimento" defaultValue="Barueri / SP" />
            <Select label="Tipo de servico" defaultValue="hvac">
              <option value="hvac">Manutencao corretiva HVAC</option>
              <option value="generator">Gerador em contingencia</option>
              <option value="electrical">Painel eletrico</option>
            </Select>
            <Select label="Prioridade" defaultValue="critical">
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="critical">Critica</option>
            </Select>
          </div>
        </Card>
        <Card title="Despacho e SLA">
          <div className="form-section">
            <Select label="Equipe" defaultValue="alfa">
              <option value="alfa">Equipe Alfa</option>
              <option value="beta">Equipe Beta</option>
              <option value="delta">Equipe Delta</option>
            </Select>
            <Select label="Viatura" defaultValue="vtr-042">
              <option value="vtr-042">VTR-042</option>
              <option value="vtr-018">VTR-018</option>
            </Select>
            <Input label="SLA limite" type="datetime-local" defaultValue="2026-05-26T17:00" />
            <Checkbox label="Exigir evidencia antes da conclusao" defaultChecked />
          </div>
        </Card>
        <Card title="Controle financeiro e auditoria">
          <div className="form-section">
            <Input label="Custo estimado" defaultValue="4820" inputMode="decimal" />
            <Input label="Valor faturavel" defaultValue="7350" inputMode="decimal" />
            <Checkbox label="Requer aprovacao se exceder limite da filial" defaultChecked />
            <ValidationToggle checked={validated} onChange={setValidated} />
          </div>
        </Card>
      </section>
      <StickyActionBar>
        <Button type="button" variant="secondary" onClick={() => navigate("/work-orders")}>Cancelar</Button>
        <Button type="submit" disabled={saving}>{saving ? "Enfileirando..." : "Salvar e enfileirar comando"}</Button>
      </StickyActionBar>
    </form>
  );
}
