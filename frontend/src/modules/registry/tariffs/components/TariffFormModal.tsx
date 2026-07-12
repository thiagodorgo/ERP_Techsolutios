import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";

import { Alert, Button, Checkbox, Input, Modal, Select } from "../../../../components/ui";
import { validateTariff } from "../tariffs.adapter";
import { createTariff, updateTariff } from "../tariffs.service";
import type { TariffCreatePayload, TariffField, TariffItem, TariffReferenceOption, TariffsApiContext } from "../tariffs.types";

const FIELD_ID: Record<string, string> = {
  priceTableId: "tariff-field-price-table",
  name: "tariff-field-name",
  serviceCatalogId: "tariff-field-service",
  customerId: "tariff-field-customer",
  unitPrice: "tariff-field-unit-price",
  currency: "tariff-field-currency",
  origin: "tariff-field-origin",
  rule: "tariff-field-rule",
  validFrom: "tariff-field-valid-from",
  validTo: "tariff-field-valid-to",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "var(--space-12)",
};

const fullWidth: CSSProperties = { gridColumn: "1 / -1" };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };

// Recorta uma data ISO ("2026-07-01T00:00:00.000Z") para o formato de <input type="date"> ("2026-07-01").
function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

// Aceita vírgula ou ponto como separador decimal (usuário PT-BR digita "12,50").
function parseUnitPrice(value: string): number {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  // Se já veio com ponto (input type=number), a limpeza acima não deve corromper — testa ambos.
  const direct = Number(value.trim());
  if (Number.isFinite(direct) && !value.includes(",")) return direct;
  return Number(normalized);
}

export function TariffFormModal({
  tariff,
  context,
  priceTables,
  services,
  customers,
  onClose,
  onSaved,
}: {
  readonly tariff: TariffItem | null;
  readonly context: TariffsApiContext;
  readonly priceTables: readonly TariffReferenceOption[];
  readonly services: readonly TariffReferenceOption[];
  readonly customers: readonly TariffReferenceOption[];
  readonly onClose: () => void;
  readonly onSaved: (saved?: TariffItem) => void;
}) {
  const isEdit = Boolean(tariff);
  const [priceTableId, setPriceTableId] = useState(tariff?.priceTableId ?? "");
  const [name, setName] = useState(tariff?.name ?? "");
  const [serviceCatalogId, setServiceCatalogId] = useState(tariff?.serviceCatalogId ?? "");
  const [customerId, setCustomerId] = useState(tariff?.customerId ?? "");
  const [unitPrice, setUnitPrice] = useState(tariff?.unitPrice != null ? String(tariff.unitPrice) : "");
  const [currency, setCurrency] = useState(tariff?.currency ?? "BRL");
  const [origin, setOrigin] = useState(tariff?.origin ?? "");
  const [rule, setRule] = useState(tariff?.rule ?? "");
  const [validFrom, setValidFrom] = useState(toDateInput(tariff?.validFrom));
  const [validTo, setValidTo] = useState(toDateInput(tariff?.validTo));
  const [isActive, setIsActive] = useState(tariff?.isActive ?? true);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<TariffField, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function buildPayload(): TariffCreatePayload {
    return {
      priceTableId: priceTableId.trim(),
      unitPrice: parseUnitPrice(unitPrice),
      origin: origin.trim(),
      name: name.trim() || undefined,
      serviceCatalogId: serviceCatalogId.trim() || undefined,
      customerId: customerId.trim() || undefined,
      currency: currency.trim() ? currency.trim().toUpperCase() : undefined,
      rule: rule.trim() || undefined,
      validFrom: validFrom.trim() || undefined,
      validTo: validTo.trim() || undefined,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const payload = buildPayload();
    const errors = validateTariff(payload);
    if (errors.length > 0) {
      setFieldErrors(Object.fromEntries(errors.map((error) => [error.field, error.message])) as Partial<Record<TariffField, string>>);
      focusField(errors[0].field);
      return;
    }
    setFieldErrors({});

    setSaving(true);
    try {
      if (isEdit && tariff) {
        // Veto junta Ω2-a.2 (B2): as referências (tabela/serviço/cliente) são IMUTÁVEIS no backend —
        // enviá-las dava falso sucesso (200 sem efeito). Na edição elas ficam desabilitadas e FORA
        // do payload; para trocar a referência, crie outra tarifa.
        const { priceTableId: _pt, serviceCatalogId: _sc, customerId: _cu, ...editable } = payload;
        const updated = await updateTariff(context, tariff.id, { ...editable, isActive });
        onSaved(updated ?? undefined);
      } else {
        const created = await createTariff(context, payload);
        onSaved(created ?? undefined);
      }
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Não foi possível salvar a tarifa.");
    } finally {
      setSaving(false);
    }
  }

  const noPriceTables = priceTables.length === 0;

  return (
    <Modal title={isEdit ? "Editar tarifa" : "Nova tarifa"} open onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <Alert title="Não foi possível salvar" tone="danger">
            {serverError}
          </Alert>
        ) : null}

        {noPriceTables ? (
          <Alert title="Nenhuma Tabela de Valores disponível" tone="warning">
            Cadastre uma Tabela de Valores antes de criar tarifas — toda tarifa pertence a uma tabela.
          </Alert>
        ) : null}

        <div style={gridStyle}>
          <div style={fullWidth}>
            <label className="ui-field">
              <span>Tabela de Valores *</span>
              <Select
                id={FIELD_ID.priceTableId}
                value={priceTableId}
                aria-required
                aria-invalid={fieldErrors.priceTableId ? true : undefined}
                aria-describedby={fieldErrors.priceTableId ? `${FIELD_ID.priceTableId}-error` : undefined}
                onChange={(event) => setPriceTableId(event.target.value)}
                disabled={isEdit}
              >
                <option value="">Selecione a tabela…</option>
                {priceTables.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Select>
              {isEdit ? <small>Fixa após a criação — para trocar, crie outra tarifa.</small> : null}
              {fieldErrors.priceTableId ? (
                <small className="form-error" id={`${FIELD_ID.priceTableId}-error`}>
                  {fieldErrors.priceTableId}
                </small>
              ) : null}
            </label>
          </div>

          <div style={fullWidth}>
            <Field id={FIELD_ID.name} label="Nome" value={name} onChange={setName} error={fieldErrors.name} maxLength={160} autoComplete="off" helper="Opcional. Ex.: Guincho 0–50 km" />
          </div>

          <label className="ui-field">
            <span>Serviço</span>
            <Select id={FIELD_ID.serviceCatalogId} value={serviceCatalogId} onChange={(event) => setServiceCatalogId(event.target.value)} disabled={isEdit}>
              <option value="">Todos os serviços</option>
              {services.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
            <small>{isEdit ? "Fixo após a criação — para trocar, crie outra tarifa." : "Opcional. Vazio = vale para qualquer serviço."}</small>
          </label>

          <label className="ui-field">
            <span>Cliente</span>
            <Select id={FIELD_ID.customerId} value={customerId} onChange={(event) => setCustomerId(event.target.value)} disabled={isEdit}>
              <option value="">Todos os clientes</option>
              {customers.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
            <small>{isEdit ? "Fixo após a criação — para trocar, crie outra tarifa." : "Opcional. Vazio = vale para qualquer cliente."}</small>
          </label>

          <Field
            id={FIELD_ID.unitPrice}
            label="Valor unitário"
            required
            type="number"
            value={unitPrice}
            onChange={setUnitPrice}
            error={fieldErrors.unitPrice}
            inputMode="decimal"
            step="0.01"
            min="0"
            helper="Em moeda, 2 casas. Ex.: 150,00"
          />
          <Field id={FIELD_ID.currency} label="Moeda" value={currency} onChange={setCurrency} error={fieldErrors.currency} maxLength={3} helper="Código de 3 letras. Ex.: BRL" />

          <div style={fullWidth}>
            <Field id={FIELD_ID.origin} label="Origem" required value={origin} onChange={setOrigin} error={fieldErrors.origin} maxLength={120} autoComplete="off" helper="Origem/tabela de referência do preço. Ex.: Tabela DNIT 2026" />
          </div>

          <div style={fullWidth}>
            <label className="ui-field">
              <span>Regra</span>
              <textarea
                id={FIELD_ID.rule}
                className="ui-input"
                style={{ minHeight: 76, padding: "var(--space-10)", resize: "vertical" }}
                rows={2}
                value={rule}
                maxLength={500}
                onChange={(event) => setRule(event.target.value)}
                aria-invalid={fieldErrors.rule ? true : undefined}
                aria-describedby={fieldErrors.rule ? `${FIELD_ID.rule}-error` : undefined}
              />
              {fieldErrors.rule ? (
                <small className="form-error" id={`${FIELD_ID.rule}-error`}>
                  {fieldErrors.rule}
                </small>
              ) : (
                <small>Opcional. Condição de aplicação da tarifa.</small>
              )}
            </label>
          </div>

          <Field id={FIELD_ID.validFrom} label="Início da vigência" type="date" value={validFrom} onChange={setValidFrom} error={fieldErrors.validFrom} />
          <Field id={FIELD_ID.validTo} label="Fim da vigência" type="date" value={validTo} onChange={setValidTo} error={fieldErrors.validTo} />

          {isEdit ? (
            <div style={fullWidth}>
              <Checkbox label="Tarifa ativa" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            </div>
          ) : null}
        </div>

        <footer style={footerStyle}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving || noPriceTables}>
            {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar tarifa"}
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
  step,
  min,
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
  readonly step?: string;
  readonly min?: string;
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
        step={step}
        min={min}
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

function focusField(field: TariffField) {
  if (typeof document === "undefined" || typeof document.getElementById !== "function") return;
  const element = document.getElementById(FIELD_ID[field]);
  if (element && typeof (element as HTMLElement).focus === "function") {
    (element as HTMLElement).focus();
  }
}
