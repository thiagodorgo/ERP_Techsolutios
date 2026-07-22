import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";

import { Alert, Button, Checkbox, Input, Modal, Select } from "../../../../components/ui";
import {
  MAINTENANCE_ITEM_TYPE_OPTIONS,
  computeLineTotalPreview,
  formatCost,
  parsePtBrNumber,
  validateMaintenanceItem,
} from "../maintenance-orders.adapter";
import type {
  MaintenanceItemDraft,
  MaintenanceItemField,
  MaintenanceItemPayload,
  MaintenanceItemType,
  MaintenanceOrderItem,
} from "../maintenance-orders.types";

const FIELD_ID: Record<string, string> = {
  itemType: "maintenance-item-type",
  description: "maintenance-item-description",
  unitValue: "maintenance-item-unit-value",
  quantity: "maintenance-item-quantity",
  notes: "maintenance-item-notes",
};

const gridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--space-12)" };
const fullWidth: CSSProperties = { gridColumn: "1 / -1" };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };
const totalStyle: CSSProperties = { ...fullWidth, margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)" };
const stockNoteStyle: CSSProperties = { ...fullWidth, margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)" };
// Diferenciação visual do AutEM: registro-principal (azul) × registro-filho (item = laranja/âmbar). Faixa de
// destaque no topo do sub-modal, sem tocar o componente Modal compartilhado.
const childAccentStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-8)",
  marginBottom: "var(--space-12)",
  padding: "var(--space-8) var(--space-10)",
  borderLeft: "3px solid var(--color-status-warning)",
  borderRadius: "var(--radius-4)",
  background: "var(--surface-panel-muted)",
  fontSize: "var(--text-sm)",
  color: "var(--color-status-warning)",
  fontWeight: 700,
};

export function MaintenanceItemModal({
  item,
  saving = false,
  serverError = null,
  onSubmit,
  onClose,
}: {
  readonly item: MaintenanceOrderItem | null;
  readonly saving?: boolean;
  readonly serverError?: string | null;
  readonly onSubmit: (payload: MaintenanceItemPayload, continueAdding: boolean) => void;
  readonly onClose: () => void;
}) {
  const isEdit = Boolean(item);
  const [itemType, setItemType] = useState<MaintenanceItemType>(item?.itemType ?? "service");
  const [description, setDescription] = useState(item?.description ?? "");
  const [unitValue, setUnitValue] = useState(
    item?.unitValue != null ? item.unitValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "",
  );
  const [quantity, setQuantity] = useState(
    item?.quantity != null ? item.quantity.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 }) : "1",
  );
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [continueAdding, setContinueAdding] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<MaintenanceItemField, string>>>({});

  const parsedUnit = parsePtBrNumber(unitValue);
  const parsedQty = parsePtBrNumber(quantity);
  // PREVIEW client-side (unit × qty). O valor autoritativo é DERIVADO no backend e reexibido no grid.
  const totalPreview = computeLineTotalPreview(parsedUnit, parsedQty);

  function buildDraft(): MaintenanceItemDraft {
    return {
      itemType,
      description: description.trim(),
      unitValue: parsedUnit,
      quantity: parsedQty,
      notes: notes.trim() || undefined,
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const draft = buildDraft();
    const errors = validateMaintenanceItem(draft);
    if (errors.length > 0) {
      setFieldErrors(Object.fromEntries(errors.map((error) => [error.field, error.message])) as Partial<Record<MaintenanceItemField, string>>);
      focusField(errors[0].field);
      return;
    }
    setFieldErrors({});

    onSubmit(
      {
        itemType: draft.itemType,
        description: draft.description,
        unitValue: draft.unitValue as number,
        quantity: draft.quantity as number,
        notes: draft.notes,
      },
      !isEdit && continueAdding,
    );
  }

  return (
    <Modal title={isEdit ? "Editar item" : "Cadastrar item"} open onClose={onClose}>
      <div style={childAccentStyle}>Item da manutenção</div>

      <form onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <Alert title="Não foi possível salvar o item" tone="danger">
            {serverError}
          </Alert>
        ) : null}

        <div style={gridStyle}>
          <div>
            <Select
              id={FIELD_ID.itemType}
              label="Tipo *"
              value={itemType}
              aria-required
              aria-invalid={fieldErrors.itemType ? true : undefined}
              aria-describedby={fieldErrors.itemType ? `${FIELD_ID.itemType}-error` : undefined}
              onChange={(event) => setItemType(event.target.value as MaintenanceItemType)}
            >
              {MAINTENANCE_ITEM_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            {fieldErrors.itemType ? (
              <small className="form-error" id={`${FIELD_ID.itemType}-error`}>
                {fieldErrors.itemType}
              </small>
            ) : null}
          </div>

          <ItemField
            id={FIELD_ID.description}
            label="Item *"
            value={description}
            onChange={setDescription}
            error={fieldErrors.description}
            maxLength={2000}
            autoComplete="off"
            helper="Descrição do serviço ou da peça."
          />

          <ItemField
            id={FIELD_ID.unitValue}
            label="Valor unitário *"
            value={unitValue}
            onChange={setUnitValue}
            error={fieldErrors.unitValue}
            maxLength={16}
            inputMode="decimal"
            helper="Em reais (R$). Ex.: 120,00"
          />
          <ItemField
            id={FIELD_ID.quantity}
            label="Quantidade *"
            value={quantity}
            onChange={setQuantity}
            error={fieldErrors.quantity}
            maxLength={12}
            inputMode="decimal"
            helper="Ex.: 1 ou 2,5"
          />

          {/* Valor Total — preview no cliente; o backend confirma o valor derivado (unit × qty). */}
          <p style={totalStyle} aria-live="polite">
            Valor total: <strong>{totalPreview !== undefined ? formatCost(totalPreview) : "—"}</strong>
          </p>

          {itemType === "stock" ? (
            <p style={stockNoteStyle}>
              O item de estoque é registrado aqui; a baixa na custódia entra na etapa de estoque.
            </p>
          ) : null}

          <label className="ui-field" style={fullWidth}>
            <span>Observações</span>
            <textarea
              id={FIELD_ID.notes}
              className="ui-input"
              style={{ minHeight: 72, padding: "var(--space-10)", resize: "vertical" }}
              rows={2}
              value={notes}
              maxLength={2000}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
        </div>

        {!isEdit ? (
          <div style={{ marginTop: "var(--space-12)" }}>
            <Checkbox
              label="Continuar cadastrando"
              checked={continueAdding}
              disabled={saving}
              onChange={(event) => setContinueAdding(event.target.checked)}
            />
          </div>
        ) : null}

        <footer style={footerStyle}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando…" : isEdit ? "Salvar item" : "Adicionar"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

function ItemField({
  id,
  label,
  value,
  onChange,
  error,
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
  readonly maxLength?: number;
  readonly inputMode?: "numeric" | "decimal" | "tel";
  readonly autoComplete?: string;
  readonly helper?: string;
}) {
  return (
    <div>
      <Input
        id={id}
        label={label}
        value={value}
        maxLength={maxLength}
        inputMode={inputMode}
        autoComplete={autoComplete}
        helper={helper}
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

function focusField(field: MaintenanceItemField) {
  if (typeof document === "undefined" || typeof document.getElementById !== "function") return;
  const element = document.getElementById(FIELD_ID[field]);
  if (element && typeof (element as HTMLElement).focus === "function") {
    (element as HTMLElement).focus();
  }
}

export default MaintenanceItemModal;
