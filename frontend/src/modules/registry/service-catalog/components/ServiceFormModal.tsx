import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";

import { Alert, Button, Checkbox, Input, Modal, Select } from "../../../../components/ui";
import { SERVICE_STATUS_OPTIONS, validateServiceItem } from "../service-catalog.adapter";
import { createServiceItem, updateServiceItem } from "../service-catalog.service";
import type { ServiceCatalogApiContext, ServiceItem, ServiceItemCreatePayload, ServiceItemField } from "../service-catalog.types";

const FIELD_ID: Record<string, string> = {
  name: "service-field-name",
  category: "service-field-category",
  status: "service-field-status",
  estimatedDurationMinutes: "service-field-duration",
  basePrice: "service-field-base-price",
  description: "service-field-description",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "var(--space-12)",
};

const fullWidth: CSSProperties = { gridColumn: "1 / -1" };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };

export function ServiceFormModal({
  service,
  context,
  onClose,
  onSaved,
}: {
  readonly service: ServiceItem | null;
  readonly context: ServiceCatalogApiContext;
  readonly onClose: () => void;
  // B2: devolve o cadastro salvo para quem abriu o modal (ex.: seleção rápida na OS).
  // Callers legados (`() => void`) seguem válidos — o argumento extra é ignorado.
  readonly onSaved: (created?: ServiceItem) => void;
}) {
  const isEdit = Boolean(service);
  const [name, setName] = useState(service?.name ?? "");
  const [category, setCategory] = useState(service?.category ?? "");
  // Ω3F-2b — discriminador de tipo (C4): dirige os campos dinâmicos e a exigência de destino no form de OS.
  const [serviceType, setServiceType] = useState(service?.serviceType ?? "");
  const [requiresDestination, setRequiresDestination] = useState(service?.requiresDestination ?? false);
  const [status, setStatus] = useState(service?.status && SERVICE_STATUS_OPTIONS.some((o) => o.value === service.status) ? service.status : "active");
  const [duration, setDuration] = useState(service?.estimatedDurationMinutes != null ? String(service.estimatedDurationMinutes) : "");
  const [basePrice, setBasePrice] = useState(
    service?.basePrice != null ? service.basePrice.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "",
  );
  const [description, setDescription] = useState(service?.description ?? "");
  const [isActive, setIsActive] = useState(service?.isActive ?? true);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ServiceItemField, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function buildPayload(): ServiceItemCreatePayload {
    const trimmedDuration = duration.trim();
    // pt-BR money: remove separador de milhar (ponto antes de 3 dígitos) e usa vírgula como decimal.
    const trimmedPrice = basePrice.trim().replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
    return {
      name: name.trim(),
      category: category.trim() || undefined,
      serviceType: serviceType.trim() || undefined,
      requiresDestination,
      status: status.trim() || undefined,
      estimatedDurationMinutes: trimmedDuration ? Number(trimmedDuration) : undefined,
      basePrice: trimmedPrice ? Number(trimmedPrice) : undefined,
      description: description.trim() || undefined,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const payload = buildPayload();
    const errors = validateServiceItem(payload);
    if (errors.length > 0) {
      setFieldErrors(Object.fromEntries(errors.map((error) => [error.field, error.message])) as Partial<Record<ServiceItemField, string>>);
      focusField(errors[0].field);
      return;
    }
    setFieldErrors({});

    setSaving(true);
    try {
      if (isEdit && service) {
        const updated = await updateServiceItem(context, service.id, { ...payload, isActive });
        onSaved(updated ?? undefined);
      } else {
        const created = await createServiceItem(context, payload);
        onSaved(created ?? undefined);
      }
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Não foi possível salvar o serviço.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Editar serviço" : "Novo serviço"} open onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <Alert title="Não foi possível salvar" tone="danger">
            {serverError}
          </Alert>
        ) : null}

        <div style={gridStyle}>
          <div style={fullWidth}>
            <Field id={FIELD_ID.name} label="Nome" required value={name} onChange={setName} error={fieldErrors.name} maxLength={120} autoComplete="off" />
          </div>
          <Field id={FIELD_ID.category} label="Categoria" value={category} onChange={setCategory} error={fieldErrors.category} maxLength={60} />
          <div>
            <Select id={FIELD_ID.status} label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
              {SERVICE_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          {/* Ω3F-2b — tipo de serviço (dirige campos dinâmicos + exigência de destino no form de OS) */}
          <div>
            <Select id="service-field-type" label="Tipo de serviço" value={serviceType} onChange={(event) => setServiceType(event.target.value)}>
              <option value="">Sem tipo definido</option>
              <option value="reboque">Reboque</option>
              <option value="socorro">Socorro mecânico</option>
              <option value="residencial">Reparo residencial</option>
              <option value="outro">Outro</option>
            </Select>
          </div>
          <div style={{ alignSelf: "end" }}>
            <Checkbox label="Exige endereço de destino" checked={requiresDestination} onChange={(event) => setRequiresDestination(event.target.checked)} />
          </div>
          <Field
            id={FIELD_ID.estimatedDurationMinutes}
            label="Duração estimada (min)"
            value={duration}
            onChange={setDuration}
            error={fieldErrors.estimatedDurationMinutes}
            maxLength={6}
            inputMode="numeric"
          />
          <Field
            id={FIELD_ID.basePrice}
            label="Preço base"
            value={basePrice}
            onChange={setBasePrice}
            error={fieldErrors.basePrice}
            maxLength={12}
            inputMode="decimal"
            helper="Em reais (R$). Ex.: 150,00"
          />
          {isEdit ? (
            <div style={fullWidth}>
              <Checkbox label="Serviço ativo" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            </div>
          ) : null}
          <label className="ui-field" style={fullWidth}>
            <span>Descrição</span>
            <textarea
              id={FIELD_ID.description}
              className="ui-input"
              style={{ minHeight: 92, padding: "var(--space-10)", resize: "vertical" }}
              rows={3}
              value={description}
              maxLength={2000}
              onChange={(event) => setDescription(event.target.value)}
              aria-invalid={fieldErrors.description ? true : undefined}
              aria-describedby={fieldErrors.description ? `${FIELD_ID.description}-error` : undefined}
            />
            {fieldErrors.description ? (
              <small className="form-error" id={`${FIELD_ID.description}-error`}>
                {fieldErrors.description}
              </small>
            ) : null}
          </label>
        </div>

        <footer style={footerStyle}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar serviço"}
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
  helper,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string;
  readonly required?: boolean;
  readonly type?: string;
  readonly maxLength?: number;
  readonly inputMode?: "numeric" | "decimal" | "tel";
  readonly autoComplete?: string;
  readonly helper?: string;
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

function focusField(field: ServiceItemField) {
  if (typeof document === "undefined" || typeof document.getElementById !== "function") return;
  const element = document.getElementById(FIELD_ID[field]);
  if (element && typeof (element as HTMLElement).focus === "function") {
    (element as HTMLElement).focus();
  }
}
