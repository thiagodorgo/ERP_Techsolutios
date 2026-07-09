import { Info } from "lucide-react";
import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";

import { Alert, Button, Input, Modal } from "../../../components/ui";
import { interpretInventoryItemSubmitError, parsePtBrNumber, validateInventoryItem } from "../inventory.adapter";
import { createInventoryItem, updateInventoryItem } from "../inventory.service";
import type {
  InventoryApiContext,
  InventoryItem,
  InventoryItemCreatePayload,
  InventoryItemDraft,
  InventoryItemField,
} from "../inventory.types";

// F7a — cadastro/edição de item de estoque.
// SEM campo de saldo (derivado das movimentações — R7.1) e SEM classe ABC (populada pelo F7b).
const FIELD_ID: Record<string, string> = {
  sku: "inventory-item-field-sku",
  name: "inventory-item-field-name",
  unit: "inventory-item-field-unit",
  minQuantity: "inventory-item-field-min",
  maxQuantity: "inventory-item-field-max",
  leadTimeDays: "inventory-item-field-lead-time",
  safetyStock: "inventory-item-field-safety-stock",
};

const gridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--space-12)" };
const fullWidth: CSSProperties = { gridColumn: "1 / -1" };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };
const noteStyle: CSSProperties = {
  ...fullWidth,
  display: "flex",
  alignItems: "center",
  gap: "var(--space-8)",
  marginTop: "var(--space-12)",
  padding: "var(--space-10)",
  borderRadius: "var(--radius-6)",
  background: "var(--surface-panel-muted)",
  border: "1px solid var(--border-subtle)",
  color: "var(--text-secondary)",
  fontSize: "var(--text-sm)",
};

function toNumberInputValue(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "";
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

export function InventoryItemFormModal({
  item,
  context,
  onClose,
  onSaved,
}: {
  readonly item: InventoryItem | null;
  readonly context: InventoryApiContext;
  readonly onClose: () => void;
  readonly onSaved: (saved?: InventoryItem) => void;
}) {
  const isEdit = Boolean(item);
  const [sku, setSku] = useState(item?.sku ?? "");
  const [name, setName] = useState(item?.name ?? "");
  const [unit, setUnit] = useState(item?.unit ?? "");
  const [minQuantity, setMinQuantity] = useState(toNumberInputValue(item?.minQuantity));
  const [maxQuantity, setMaxQuantity] = useState(toNumberInputValue(item?.maxQuantity));
  const [leadTimeDays, setLeadTimeDays] = useState(item?.leadTimeDays != null ? String(item.leadTimeDays) : "");
  const [safetyStock, setSafetyStock] = useState(toNumberInputValue(item?.safetyStock));
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<InventoryItemField, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function buildDraft(): InventoryItemDraft {
    return {
      sku: sku.trim(),
      name: name.trim(),
      unit: unit.trim(),
      minQuantity: parsePtBrNumber(minQuantity),
      maxQuantity: parsePtBrNumber(maxQuantity),
      leadTimeDays: parsePtBrNumber(leadTimeDays),
      safetyStock: parsePtBrNumber(safetyStock),
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const draft = buildDraft();
    const errors = validateInventoryItem(draft);
    if (errors.length > 0) {
      setFieldErrors(Object.fromEntries(errors.map((error) => [error.field, error.message])) as Partial<Record<InventoryItemField, string>>);
      focusField(errors[0].field);
      return;
    }
    setFieldErrors({});

    const payload: InventoryItemCreatePayload = {
      sku: draft.sku,
      name: draft.name,
      unit: draft.unit,
      minQuantity: draft.minQuantity,
      maxQuantity: draft.maxQuantity,
      leadTimeDays: draft.leadTimeDays,
      safetyStock: draft.safetyStock,
    };

    setSaving(true);
    try {
      if (isEdit && item) {
        const updated = await updateInventoryItem(context, item.id, payload);
        onSaved(updated ?? undefined);
      } else {
        const created = await createInventoryItem(context, payload);
        onSaved(created ?? undefined);
      }
    } catch (error) {
      // 409 duplicate_sku → mensagem sob o SKU (+ Alerta).
      const feedback = interpretInventoryItemSubmitError(error);
      if (feedback.field) {
        setFieldErrors((prev) => ({ ...prev, [feedback.field as InventoryItemField]: feedback.message }));
        focusField(feedback.field as InventoryItemField);
      }
      setServerError(feedback.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Editar item" : "Novo item"} open onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <Alert title="Não foi possível salvar" tone="danger">
            {serverError}
          </Alert>
        ) : null}

        <div style={gridStyle}>
          <Field
            id={FIELD_ID.sku}
            label="SKU"
            required
            value={sku}
            onChange={setSku}
            error={fieldErrors.sku}
            maxLength={60}
            helper="Código único do item nesta organização. Ex.: ELE-0021"
          />

          <Field
            id={FIELD_ID.unit}
            label="Unidade"
            required
            value={unit}
            onChange={setUnit}
            error={fieldErrors.unit}
            maxLength={12}
            helper="Ex.: un, m, kg, L"
          />

          <div style={fullWidth}>
            <Field
              id={FIELD_ID.name}
              label="Nome"
              required
              value={name}
              onChange={setName}
              error={fieldErrors.name}
              maxLength={160}
              helper="Nome do item como aparece nas listas e movimentações."
            />
          </div>

          <Field
            id={FIELD_ID.minQuantity}
            label="Estoque mínimo"
            value={minQuantity}
            onChange={setMinQuantity}
            error={fieldErrors.minQuantity}
            maxLength={16}
            inputMode="decimal"
            helper="Abaixo deste saldo o item entra em reposição."
          />

          <Field
            id={FIELD_ID.maxQuantity}
            label="Estoque máximo"
            value={maxQuantity}
            onChange={setMaxQuantity}
            error={fieldErrors.maxQuantity}
            maxLength={16}
            inputMode="decimal"
            helper="Opcional. Teto de armazenagem."
          />

          <Field
            id={FIELD_ID.leadTimeDays}
            label="Lead time (dias)"
            value={leadTimeDays}
            onChange={setLeadTimeDays}
            error={fieldErrors.leadTimeDays}
            maxLength={5}
            inputMode="numeric"
            helper="Opcional. Prazo médio de reposição."
          />

          <Field
            id={FIELD_ID.safetyStock}
            label="Estoque de segurança"
            value={safetyStock}
            onChange={setSafetyStock}
            error={fieldErrors.safetyStock}
            maxLength={16}
            inputMode="decimal"
            helper="Opcional. Reserva contra variação de demanda."
          />

          <p style={noteStyle}>
            <Info size={16} aria-hidden /> O saldo é calculado pelas movimentações (não é editável aqui) e o custo médio é atualizado a cada
            entrada.
          </p>
        </div>

        <footer style={footerStyle}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar item"}
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
  maxLength,
  inputMode,
  helper,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string;
  readonly required?: boolean;
  readonly maxLength?: number;
  readonly inputMode?: "numeric" | "decimal";
  readonly helper?: string;
}) {
  return (
    <div>
      <Input
        id={id}
        label={required ? `${label} *` : label}
        value={value}
        maxLength={maxLength}
        inputMode={inputMode}
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

function focusField(field: InventoryItemField) {
  if (typeof document === "undefined" || typeof document.getElementById !== "function") return;
  const element = document.getElementById(FIELD_ID[field]);
  if (element && typeof (element as HTMLElement).focus === "function") {
    (element as HTMLElement).focus();
  }
}
