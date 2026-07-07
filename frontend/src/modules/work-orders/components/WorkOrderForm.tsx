import { type FormEvent, useState } from "react";

import { Alert, Button, Card, Input, Select } from "../../../components/ui";
import { buildRegistryLinksPayload, getWorkOrderPriorityLabel, toApiDateTime, validateWorkOrderForm } from "../work-orders.adapter";
import { useRegistryLinkOptions } from "../useRegistryLinkOptions";
import { WORK_ORDER_PRIORITIES, type WorkOrderCreatePayload } from "../work-orders.types";

type FormState = {
  readonly title: string;
  readonly description: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly serviceAddress: string;
  readonly serviceCity: string;
  readonly serviceState: string;
  readonly serviceZipCode: string;
  readonly serviceLatitude: string;
  readonly serviceLongitude: string;
  readonly priority: WorkOrderCreatePayload["priority"];
  readonly scheduledFor: string;
  readonly customerId: string;
  readonly vehicleId: string;
  readonly teamId: string;
  readonly serviceCatalogId: string;
};

const initialState: FormState = {
  title: "",
  description: "",
  customerName: "",
  customerPhone: "",
  serviceAddress: "",
  serviceCity: "",
  serviceState: "",
  serviceZipCode: "",
  serviceLatitude: "",
  serviceLongitude: "",
  priority: "medium",
  scheduledFor: "",
  customerId: "",
  vehicleId: "",
  teamId: "",
  serviceCatalogId: "",
};

export function WorkOrderForm({
  saving,
  onCancel,
  onSubmit,
}: {
  readonly saving?: boolean;
  readonly onCancel: () => void;
  readonly onSubmit: (payload: WorkOrderCreatePayload) => Promise<void>;
}) {
  const [state, setState] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<string[]>([]);
  const { customers, vehicles, teams, services } = useRegistryLinkOptions();

  const selectedCustomer = state.customerId ? customers.find((customer) => customer.id === state.customerId) : undefined;
  const customerLinked = Boolean(state.customerId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateWorkOrderForm(state);
    setErrors(nextErrors);
    if (nextErrors.length > 0) return;

    await onSubmit({
      title: state.title.trim(),
      description: state.description.trim() || undefined,
      // Com cliente vinculado, o backend deriva o snapshot (nome/documento/telefone).
      // Sem vínculo, os campos livres seguem valendo como antes.
      customerName: customerLinked ? undefined : state.customerName.trim() || undefined,
      customerPhone: customerLinked ? undefined : state.customerPhone.trim() || undefined,
      serviceAddress: state.serviceAddress.trim() || undefined,
      serviceCity: state.serviceCity.trim() || undefined,
      serviceState: state.serviceState.trim() || undefined,
      serviceZipCode: state.serviceZipCode.trim() || undefined,
      serviceLatitude: state.serviceLatitude ? Number(state.serviceLatitude) : null,
      serviceLongitude: state.serviceLongitude ? Number(state.serviceLongitude) : null,
      priority: state.priority,
      scheduledFor: toApiDateTime(state.scheduledFor),
      ...buildRegistryLinksPayload({
        customerId: state.customerId,
        vehicleId: state.vehicleId,
        teamId: state.teamId,
        serviceCatalogId: state.serviceCatalogId,
      }),
    });
  }

  return (
    <form className="page-stack" onSubmit={submit}>
      {errors.length ? (
        <Alert title="Revise os campos obrigatorios" tone="warning">
          {errors.join(" ")}
        </Alert>
      ) : null}
      <section className="work-order-form-grid">
        <Card title="Identificacao">
          <div className="form-section">
            <Input label="Titulo" value={state.title} onChange={(event) => setState({ ...state, title: event.target.value })} />
            <label className="ui-field">
              <span>Descricao</span>
              <textarea value={state.description} onChange={(event) => setState({ ...state, description: event.target.value })} />
            </label>
            <Select label="Prioridade" value={state.priority} onChange={(event) => setState({ ...state, priority: event.target.value as WorkOrderCreatePayload["priority"] })}>
              {WORK_ORDER_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>{getWorkOrderPriorityLabel(priority)}</option>
              ))}
            </Select>
          </div>
        </Card>
        <Card title="Vínculos de cadastro">
          <div className="form-section">
            <Select
              label="Cliente"
              value={state.customerId}
              onChange={(event) => setState({ ...state, customerId: event.target.value })}
            >
              <option value="">Sem cliente vinculado</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))}
            </Select>
            <Select
              label="Viatura"
              value={state.vehicleId}
              onChange={(event) => setState({ ...state, vehicleId: event.target.value })}
            >
              <option value="">Sem viatura</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>{`${vehicle.plate} - ${vehicle.model}`}</option>
              ))}
            </Select>
            <Select
              label="Equipe"
              value={state.teamId}
              onChange={(event) => setState({ ...state, teamId: event.target.value })}
            >
              <option value="">Sem equipe</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </Select>
            <Select
              label="Serviço"
              value={state.serviceCatalogId}
              onChange={(event) => setState({ ...state, serviceCatalogId: event.target.value })}
            >
              <option value="">Sem serviço</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>{service.name}</option>
              ))}
            </Select>
          </div>
        </Card>
        <Card title="Cliente">
          <div className="form-section">
            {customerLinked ? (
              <>
                <Input label="Nome do cliente" value={selectedCustomer?.name ?? ""} readOnly helper="Copiado do cadastro ao salvar." />
                <Input label="Documento" value={selectedCustomer?.document ?? ""} placeholder="Não informado" readOnly helper="Copiado do cadastro ao salvar." />
                <Input label="Telefone do cliente" value={selectedCustomer?.phone ?? ""} placeholder="Não informado" readOnly helper="Copiado do cadastro ao salvar." />
              </>
            ) : (
              <>
                <Input label="Nome do cliente" value={state.customerName} onChange={(event) => setState({ ...state, customerName: event.target.value })} />
                <Input label="Telefone do cliente" value={state.customerPhone} onChange={(event) => setState({ ...state, customerPhone: event.target.value })} inputMode="tel" />
              </>
            )}
          </div>
        </Card>
        <Card title="Atendimento">
          <div className="form-section">
            <Input label="Endereco do atendimento" value={state.serviceAddress} onChange={(event) => setState({ ...state, serviceAddress: event.target.value })} />
            <Input label="Cidade" value={state.serviceCity} onChange={(event) => setState({ ...state, serviceCity: event.target.value })} />
            <Input label="Estado" value={state.serviceState} onChange={(event) => setState({ ...state, serviceState: event.target.value })} maxLength={2} />
            <Input label="CEP" value={state.serviceZipCode} onChange={(event) => setState({ ...state, serviceZipCode: event.target.value })} />
            <Input label="Latitude" value={state.serviceLatitude} onChange={(event) => setState({ ...state, serviceLatitude: event.target.value })} inputMode="decimal" />
            <Input label="Longitude" value={state.serviceLongitude} onChange={(event) => setState({ ...state, serviceLongitude: event.target.value })} inputMode="decimal" />
            <Input label="Agendada para" type="datetime-local" value={state.scheduledFor} onChange={(event) => setState({ ...state, scheduledFor: event.target.value })} />
          </div>
        </Card>
      </section>
      <div className="erp-sticky-action-bar">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar OS"}</Button>
      </div>
    </form>
  );
}
