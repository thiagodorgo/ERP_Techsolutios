import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";

import { Alert, Button, Checkbox, Input, Modal } from "../../../../components/ui";
import { validateCustomer } from "../customers.adapter";
import { createCustomer, updateCustomer } from "../customers.service";
import type { Customer, CustomerCreatePayload, CustomerField, CustomersApiContext } from "../customers.types";

const FIELD_ID: Record<string, string> = {
  name: "customer-field-name",
  document: "customer-field-document",
  phone: "customer-field-phone",
  email: "customer-field-email",
  address: "customer-field-address",
  city: "customer-field-city",
  state: "customer-field-state",
  zipCode: "customer-field-zipcode",
  notes: "customer-field-notes",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "var(--space-12)",
};

const fullWidth: CSSProperties = { gridColumn: "1 / -1" };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };

export function CustomerFormModal({
  customer,
  context,
  onClose,
  onSaved,
}: {
  readonly customer: Customer | null;
  readonly context: CustomersApiContext;
  readonly onClose: () => void;
  // B2: devolve o cadastro salvo para quem abriu o modal (ex.: seleção rápida na OS).
  // Callers legados (`() => void`) seguem válidos — o argumento extra é ignorado.
  readonly onSaved: (created?: Customer) => void;
}) {
  const isEdit = Boolean(customer);
  const [name, setName] = useState(customer?.name ?? "");
  const [documentValue, setDocumentValue] = useState(customer?.document ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [address, setAddress] = useState(customer?.address ?? "");
  const [city, setCity] = useState(customer?.city ?? "");
  const [state, setState] = useState(customer?.state ?? "");
  const [zipCode, setZipCode] = useState(customer?.zipCode ?? "");
  const [notes, setNotes] = useState(customer?.notes ?? "");
  const [isActive, setIsActive] = useState(customer?.isActive ?? true);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<CustomerField, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function buildPayload(): CustomerCreatePayload {
    return {
      name: name.trim(),
      document: documentValue.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      zipCode: zipCode.trim() || undefined,
      notes: notes.trim() || undefined,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const payload = buildPayload();
    const errors = validateCustomer(payload);
    if (errors.length > 0) {
      setFieldErrors(Object.fromEntries(errors.map((error) => [error.field, error.message])) as Partial<Record<CustomerField, string>>);
      focusField(errors[0].field);
      return;
    }
    setFieldErrors({});

    setSaving(true);
    try {
      if (isEdit && customer) {
        const updated = await updateCustomer(context, customer.id, { ...payload, isActive });
        onSaved(updated ?? undefined);
      } else {
        const created = await createCustomer(context, payload);
        onSaved(created ?? undefined);
      }
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Não foi possível salvar o cliente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Editar cliente" : "Novo cliente"} open onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <Alert title="Não foi possível salvar" tone="danger">
            {serverError}
          </Alert>
        ) : null}

        <div style={gridStyle}>
          <div style={fullWidth}>
            <Field id={FIELD_ID.name} label="Nome" required value={name} onChange={setName} error={fieldErrors.name} maxLength={160} autoComplete="off" />
          </div>
          <Field id={FIELD_ID.document} label="Documento (CPF/CNPJ)" value={documentValue} onChange={setDocumentValue} error={fieldErrors.document} maxLength={18} inputMode="numeric" />
          <Field id={FIELD_ID.phone} label="Telefone" value={phone} onChange={setPhone} error={fieldErrors.phone} maxLength={20} inputMode="tel" />
          <div style={fullWidth}>
            <Field id={FIELD_ID.email} label="E-mail" type="email" value={email} onChange={setEmail} error={fieldErrors.email} autoComplete="off" />
          </div>
          <div style={fullWidth}>
            <Field id={FIELD_ID.address} label="Endereço" value={address} onChange={setAddress} error={fieldErrors.address} />
          </div>
          <Field id={FIELD_ID.city} label="Cidade" value={city} onChange={setCity} error={fieldErrors.city} />
          <Field id={FIELD_ID.state} label="UF" value={state} onChange={(next) => setState(next.toUpperCase())} error={fieldErrors.state} maxLength={2} />
          <Field id={FIELD_ID.zipCode} label="CEP" value={zipCode} onChange={setZipCode} error={fieldErrors.zipCode} maxLength={9} inputMode="numeric" />
          {isEdit ? (
            <div style={fullWidth}>
              <Checkbox label="Cliente ativo" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            </div>
          ) : null}
          <label className="ui-field" style={fullWidth}>
            <span>Observações</span>
            <textarea
              id={FIELD_ID.notes}
              className="ui-input"
              style={{ minHeight: 92, padding: "var(--space-10)", resize: "vertical" }}
              rows={3}
              value={notes}
              maxLength={2000}
              onChange={(event) => setNotes(event.target.value)}
              aria-invalid={fieldErrors.notes ? true : undefined}
              aria-describedby={fieldErrors.notes ? `${FIELD_ID.notes}-error` : undefined}
            />
            {fieldErrors.notes ? (
              <small className="form-error" id={`${FIELD_ID.notes}-error`}>
                {fieldErrors.notes}
              </small>
            ) : null}
          </label>
        </div>

        <footer style={footerStyle}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar cliente"}
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
  type,
  maxLength,
  inputMode,
  autoComplete,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string;
  readonly required?: boolean;
  readonly type?: string;
  readonly maxLength?: number;
  readonly inputMode?: "numeric" | "tel";
  readonly autoComplete?: string;
}) {
  return (
    <div>
      <Input
        id={id}
        label={required ? `${label} *` : label}
        type={type}
        value={value}
        maxLength={maxLength}
        inputMode={inputMode}
        autoComplete={autoComplete}
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

function focusField(field: CustomerField) {
  if (typeof document === "undefined" || typeof document.getElementById !== "function") return;
  const element = document.getElementById(FIELD_ID[field]);
  if (element && typeof (element as HTMLElement).focus === "function") {
    (element as HTMLElement).focus();
  }
}
