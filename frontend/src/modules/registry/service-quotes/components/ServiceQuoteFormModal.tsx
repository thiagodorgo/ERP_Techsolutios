import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";

import { Alert, Button, Input, Modal } from "../../../../components/ui";
import { ApiError } from "../../../../services/api/client";
import { validateServiceQuote } from "../service-quotes.adapter";
import { createServiceQuote } from "../service-quotes.service";
import type {
  ServiceQuoteCreatePayload,
  ServiceQuoteField,
  ServiceQuotePriceSource,
  ServiceQuoteReferenceOption,
  ServiceQuotesApiContext,
} from "../service-quotes.types";

const FIELD_ID: Record<string, string> = {
  serviceCatalogId: "quote-field-service",
  workOrderId: "quote-field-work-order",
  customerId: "quote-field-customer",
  unitPrice: "quote-field-unit-price",
  quantity: "quote-field-quantity",
};

const gridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--space-12)" };
const fullWidth: CSSProperties = { gridColumn: "1 / -1" };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };

// Ω3-a — Novo orçamento. O preço é CONGELADO no backend: origem "Tarifa" resolve a Tarifa publicada
// vigente; "Manual" congela o valor informado. Não há edição de orçamento aprovado (anti-refaturamento).
export function ServiceQuoteFormModal({
  context,
  services = [],
  customers = [],
  workOrders = [],
  onClose,
  onSaved,
}: {
  readonly context: ServiceQuotesApiContext;
  readonly services?: readonly ServiceQuoteReferenceOption[];
  readonly customers?: readonly ServiceQuoteReferenceOption[];
  readonly workOrders?: readonly ServiceQuoteReferenceOption[];
  readonly onClose: () => void;
  readonly onSaved: () => void;
}) {
  const [serviceCatalogId, setServiceCatalogId] = useState("");
  const [workOrderId, setWorkOrderId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [priceSource, setPriceSource] = useState<ServiceQuotePriceSource>("tariff");
  const [unitPrice, setUnitPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ServiceQuoteField, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function buildPayload(): ServiceQuoteCreatePayload {
    const parsedPrice = unitPrice.trim() ? Number(unitPrice.replace(",", ".")) : undefined;
    const parsedQty = quantity.trim() ? Number(quantity.replace(",", ".")) : undefined;
    return {
      serviceCatalogId: serviceCatalogId.trim(),
      workOrderId: workOrderId.trim() || undefined,
      customerId: customerId.trim() || undefined,
      priceSource,
      unitPrice: priceSource === "manual" ? parsedPrice : undefined,
      quantity: parsedQty,
      notes: notes.trim() || undefined,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const payload = buildPayload();
    const errors = validateServiceQuote(payload);
    if (errors.length > 0) {
      setFieldErrors(Object.fromEntries(errors.map((error) => [error.field, error.message])) as Partial<Record<ServiceQuoteField, string>>);
      focusField(errors[0].field);
      return;
    }
    setFieldErrors({});

    setSaving(true);
    try {
      await createServiceQuote(context, payload);
      onSaved();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setServerError("Já existe um orçamento ativo para esta OS e este serviço.");
      } else if (error instanceof ApiError && error.status === 422) {
        setServerError("Nenhuma tarifa publicada aplicável a este serviço. Publique uma Tabela de Valores com a tarifa ou use preço manual.");
      } else {
        setServerError(error instanceof Error ? error.message : "Não foi possível criar o orçamento.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Novo orçamento" open onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <Alert title="Não foi possível salvar" tone="danger">
            {serverError}
          </Alert>
        ) : null}

        <div style={gridStyle}>
          <div style={fullWidth}>
            <RefSelect
              id={FIELD_ID.serviceCatalogId}
              label="Serviço"
              required
              value={serviceCatalogId}
              onChange={setServiceCatalogId}
              options={services}
              placeholder="Selecione o serviço a orçar"
              error={fieldErrors.serviceCatalogId}
            />
          </div>

          <RefSelect
            id={FIELD_ID.workOrderId}
            label="Ordem de Serviço"
            value={workOrderId}
            onChange={setWorkOrderId}
            options={workOrders}
            placeholder="Sem OS (orçamento avulso)"
          />
          <RefSelect
            id={FIELD_ID.customerId}
            label="Cliente"
            value={customerId}
            onChange={setCustomerId}
            options={customers}
            placeholder="Sem cliente (tarifa padrão)"
          />

          <label className="ui-field">
            <span>Origem do preço</span>
            <select
              className="ui-input"
              value={priceSource}
              onChange={(event) => setPriceSource(event.target.value as ServiceQuotePriceSource)}
            >
              <option value="tariff">Tarifa publicada (congela a vigente)</option>
              <option value="manual">Manual (informar valor)</option>
            </select>
          </label>

          {priceSource === "manual" ? (
            <Field
              id={FIELD_ID.unitPrice}
              label="Valor unitário"
              required
              value={unitPrice}
              onChange={setUnitPrice}
              error={fieldErrors.unitPrice}
              helper="Congelado no orçamento (não muda depois)."
            />
          ) : (
            <div />
          )}

          <Field id={FIELD_ID.quantity} label="Quantidade" value={quantity} onChange={setQuantity} error={fieldErrors.quantity} helper="Maior que zero." />

          <label className="ui-field" style={fullWidth}>
            <span>Observações</span>
            <textarea
              className="ui-input"
              style={{ minHeight: 84, padding: "var(--space-10)", resize: "vertical" }}
              rows={3}
              value={notes}
              maxLength={2000}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
        </div>

        <footer style={footerStyle}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Congelando…" : "Criar orçamento"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  required,
  helper,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string;
  readonly required?: boolean;
  readonly helper?: string;
}) {
  return (
    <div>
      <Input
        id={id}
        label={required ? `${label} *` : label}
        value={value}
        helper={helper}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? (
        <small className="form-error" id={`${id}-error`}>
          {error}
        </small>
      ) : null}
    </div>
  );
}

function RefSelect({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  required,
  error,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly options: readonly ServiceQuoteReferenceOption[];
  readonly placeholder: string;
  readonly required?: boolean;
  readonly error?: string;
}) {
  return (
    <label className="ui-field">
      <span>{required ? `${label} *` : label}</span>
      <select
        id={id}
        className="ui-input"
        value={value}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <small className="form-error" id={`${id}-error`}>
          {error}
        </small>
      ) : null}
    </label>
  );
}

function focusField(field: ServiceQuoteField) {
  if (typeof document === "undefined" || typeof document.getElementById !== "function") return;
  const element = document.getElementById(FIELD_ID[field]);
  if (element && typeof (element as HTMLElement).focus === "function") {
    (element as HTMLElement).focus();
  }
}
