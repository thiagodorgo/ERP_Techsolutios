import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";

import { Alert, Button, Checkbox, Input, Modal, Select } from "../../../../components/ui";
import { validatePriceTable } from "../price-tables.adapter";
import { createPriceTable, updatePriceTable } from "../price-tables.service";
import type { PriceTableCreatePayload, PriceTableField, PriceTableItem, PriceTableScope, PriceTablesApiContext } from "../price-tables.types";

// Ω5P PR-04 — Categoria de veículo: Select CURADO (conveniência PT-BR, NÃO enum de domínio; o backend aceita
// qualquer app-code [A-Z0-9_], catálogo por perfil deferido — D-Ω5P-TAR-05/UI-05). "Todas" ("") = NULL curinga.
const VEHICLE_CATEGORY_OPTIONS: readonly { readonly value: string; readonly label: string }[] = [
  { value: "MOTORCYCLE", label: "Motocicleta" },
  { value: "CAR", label: "Automóvel" },
  { value: "TRUCK", label: "Caminhão / Pesado" },
];

const FIELD_ID: Record<string, string> = {
  name: "price-table-field-name",
  currency: "price-table-field-currency",
  version: "price-table-field-version",
  validFrom: "price-table-field-valid-from",
  validTo: "price-table-field-valid-to",
  description: "price-table-field-description",
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

export function PriceTableFormModal({
  priceTable,
  context,
  onClose,
  onSaved,
}: {
  readonly priceTable: PriceTableItem | null;
  readonly context: PriceTablesApiContext;
  readonly onClose: () => void;
  readonly onSaved: (saved?: PriceTableItem) => void;
}) {
  const isEdit = Boolean(priceTable);
  const [name, setName] = useState(priceTable?.name ?? "");
  const [currency, setCurrency] = useState(priceTable?.currency ?? "BRL");
  const [version, setVersion] = useState(priceTable?.version != null ? String(priceTable.version) : "1");
  const [validFrom, setValidFrom] = useState(toDateInput(priceTable?.validFrom));
  const [validTo, setValidTo] = useState(toDateInput(priceTable?.validTo));
  const [description, setDescription] = useState(priceTable?.description ?? "");
  const [isActive, setIsActive] = useState(priceTable?.isActive ?? true);
  const [scope, setScope] = useState<string>(priceTable?.scope ?? "");
  const [vehicleCategory, setVehicleCategory] = useState<string>(priceTable?.vehicleCategory ?? "");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<PriceTableField, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function buildPayload(): PriceTableCreatePayload {
    return {
      name: name.trim(),
      currency: currency.trim() ? currency.trim().toUpperCase() : undefined,
      version: version.trim() ? Number(version.trim()) : undefined,
      validFrom: validFrom.trim() || undefined,
      validTo: validTo.trim() || undefined,
      description: description.trim() || undefined,
      // Escopo/categoria omitidos ("") = NULL curinga no backend (vale para os dois / todas as categorias).
      scope: scope ? (scope as PriceTableScope) : undefined,
      vehicleCategory: vehicleCategory.trim() ? vehicleCategory.trim().toUpperCase() : undefined,
    };
  }

  // Preserva a categoria atual na edição mesmo que fora do conjunto curado (o backend aceita app-code livre).
  const categoryOptions =
    vehicleCategory && !VEHICLE_CATEGORY_OPTIONS.some((option) => option.value === vehicleCategory)
      ? [{ value: vehicleCategory, label: vehicleCategory }, ...VEHICLE_CATEGORY_OPTIONS]
      : VEHICLE_CATEGORY_OPTIONS;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const payload = buildPayload();
    const errors = validatePriceTable(payload);
    if (errors.length > 0) {
      setFieldErrors(Object.fromEntries(errors.map((error) => [error.field, error.message])) as Partial<Record<PriceTableField, string>>);
      focusField(errors[0].field);
      return;
    }
    setFieldErrors({});

    setSaving(true);
    try {
      if (isEdit && priceTable) {
        const updated = await updatePriceTable(context, priceTable.id, { ...payload, isActive });
        onSaved(updated ?? undefined);
      } else {
        const created = await createPriceTable(context, payload);
        onSaved(created ?? undefined);
      }
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Não foi possível salvar a tabela de valores.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Editar tabela de valores" : "Nova tabela de valores"} open onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <Alert title="Não foi possível salvar" tone="danger">
            {serverError}
          </Alert>
        ) : null}

        {!isEdit ? (
          <p style={{ margin: "0 0 var(--space-12)", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
            A tabela é criada como <strong>Rascunho</strong>. Publique-a depois pela lista, quando estiver pronta.
          </p>
        ) : null}

        <div style={gridStyle}>
          <div style={fullWidth}>
            <Field id={FIELD_ID.name} label="Nome" required value={name} onChange={setName} error={fieldErrors.name} maxLength={160} autoComplete="off" />
          </div>
          <Field
            id={FIELD_ID.currency}
            label="Moeda"
            value={currency}
            onChange={setCurrency}
            error={fieldErrors.currency}
            maxLength={3}
            helper="Código de 3 letras. Ex.: BRL"
          />
          <Field
            id={FIELD_ID.version}
            label="Versão"
            value={version}
            onChange={setVersion}
            error={fieldErrors.version}
            maxLength={6}
            inputMode="numeric"
            helper="Número inteiro. Ex.: 1"
          />
          <Field id={FIELD_ID.validFrom} label="Início da vigência" type="date" value={validFrom} onChange={setValidFrom} error={fieldErrors.validFrom} />
          <Field id={FIELD_ID.validTo} label="Fim da vigência" type="date" value={validTo} onChange={setValidTo} error={fieldErrors.validTo} />
          <Select id="price-table-field-scope" label="Escopo" value={scope} onChange={(event) => setScope(event.target.value)}>
            <option value="">Todos (público e privado)</option>
            <option value="PUBLIC_AGREEMENT">Convênio público</option>
            <option value="PRIVATE_CONTRACT">Contrato privado</option>
          </Select>
          <Select id="price-table-field-category" label="Categoria de veículo" value={vehicleCategory} onChange={(event) => setVehicleCategory(event.target.value)}>
            <option value="">Todas as categorias</option>
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          {isEdit ? (
            <div style={fullWidth}>
              <Checkbox label="Tabela ativa" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
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
            {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar tabela"}
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

function focusField(field: PriceTableField) {
  if (typeof document === "undefined" || typeof document.getElementById !== "function") return;
  const element = document.getElementById(FIELD_ID[field]);
  if (element && typeof (element as HTMLElement).focus === "function") {
    (element as HTMLElement).focus();
  }
}
