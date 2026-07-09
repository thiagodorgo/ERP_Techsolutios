import { Info } from "lucide-react";
import type { CSSProperties, FormEvent } from "react";
import { useMemo, useState } from "react";

import { Alert, Button, Input, Modal, Select } from "../../../components/ui";
import type { Vehicle } from "../../registry/vehicles/vehicles.types";
import type { WorkOrderListItem } from "../../work-orders/work-orders.types";
import {
  STOCK_MOVEMENT_TYPE_OPTIONS,
  buildStockMovementPayload,
  formatQuantity,
  interpretStockMovementSubmitError,
  parsePtBrNumber,
  validateStockMovement,
} from "../inventory.adapter";
import { createStockMovement } from "../inventory.service";
import type {
  InventoryApiContext,
  InventoryItem,
  StockMovement,
  StockMovementAjusteDirection,
  StockMovementDraft,
  StockMovementField,
  StockMovementType,
} from "../inventory.types";

// F7a — registro de movimento (IMUTÁVEL após criado: sem edição/exclusão).
// A quantidade é sempre positiva; o SINAL vem do tipo. Para AJUSTE usamos um
// seletor explícito de direção (entrada/saída de ajuste) em vez de quantidade
// negativa: mantém uma única regra de digitação (decimal positivo) em todos os
// tipos e evita erro de sinal com decimais pt-BR.
const FIELD_ID: Record<string, string> = {
  type: "stock-movement-field-type",
  itemId: "stock-movement-field-item",
  ajusteDirection: "stock-movement-field-ajuste-direction",
  quantidade: "stock-movement-field-quantidade",
  unitCost: "stock-movement-field-unit-cost",
  workOrderId: "stock-movement-field-work-order",
  vehicleId: "stock-movement-field-vehicle",
  reason: "stock-movement-field-reason",
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

function quantityHelper(type: StockMovementType | "", ajusteDirection: StockMovementAjusteDirection | ""): string {
  if (type === "entrada") return "Entrada credita no saldo (+).";
  if (type === "saida" || type === "consumo") return "Saída e consumo debitam do saldo (−).";
  if (type === "ajuste") {
    if (ajusteDirection === "entrada") return "Ajuste de entrada credita no saldo (+).";
    if (ajusteDirection === "saida") return "Ajuste de saída debita do saldo (−).";
    return "O sinal do ajuste segue a direção escolhida acima.";
  }
  return "Sempre positiva — o sinal vem do tipo do movimento.";
}

export function StockMovementFormModal({
  items,
  workOrders,
  vehicles,
  context,
  initialItemId,
  onClose,
  onSaved,
}: {
  readonly items: readonly InventoryItem[];
  readonly workOrders: readonly WorkOrderListItem[];
  readonly vehicles: readonly Vehicle[];
  readonly context: InventoryApiContext;
  readonly initialItemId?: string;
  readonly onClose: () => void;
  readonly onSaved: (saved?: StockMovement) => void;
}) {
  const [type, setType] = useState<StockMovementType | "">("");
  const [itemId, setItemId] = useState(initialItemId ?? "");
  const [ajusteDirection, setAjusteDirection] = useState<StockMovementAjusteDirection | "">("");
  const [quantidade, setQuantidade] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [workOrderId, setWorkOrderId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [reason, setReason] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<StockMovementField, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Apenas itens ativos são movimentáveis; o item pré-selecionado (detalhe) entra mesmo se inativo.
  const selectableItems = useMemo(
    () => items.filter((item) => item.isActive || item.id === initialItemId),
    [items, initialItemId],
  );
  const selectedItem = useMemo(() => items.find((item) => item.id === itemId), [items, itemId]);

  function buildDraft(): StockMovementDraft {
    return {
      type,
      itemId: itemId.trim(),
      quantidade: parsePtBrNumber(quantidade),
      ajusteDirection,
      unitCost: parsePtBrNumber(unitCost),
      workOrderId: workOrderId.trim() || undefined,
      vehicleId: vehicleId.trim() || undefined,
      reason: reason.trim() || undefined,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const draft = buildDraft();
    // Validação condicional por tipo (entrada→custo; consumo→OS; ajuste→motivo+direção).
    const errors = validateStockMovement(draft);
    if (errors.length > 0) {
      setFieldErrors(Object.fromEntries(errors.map((error) => [error.field, error.message])) as Partial<Record<StockMovementField, string>>);
      focusField(errors[0].field);
      return;
    }
    setFieldErrors({});

    setSaving(true);
    try {
      const created = await createStockMovement(context, buildStockMovementPayload(draft));
      onSaved(created ?? undefined);
    } catch (error) {
      // 409 insufficient_balance → mensagem sob a Quantidade com o saldo atual conhecido (+ Alerta).
      const feedback = interpretStockMovementSubmitError(error, {
        currentSaldo: selectedItem?.saldo,
        unit: selectedItem?.unit,
      });
      if (feedback.field) {
        setFieldErrors((prev) => ({ ...prev, [feedback.field as StockMovementField]: feedback.message }));
        focusField(feedback.field as StockMovementField);
      }
      setServerError(feedback.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Novo movimento" open onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <Alert title="Não foi possível registrar" tone="danger">
            {serverError}
          </Alert>
        ) : null}

        <div style={gridStyle}>
          <div>
            <Select
              id={FIELD_ID.type}
              label="Tipo *"
              value={type}
              aria-required
              aria-invalid={fieldErrors.type ? true : undefined}
              aria-describedby={fieldErrors.type ? `${FIELD_ID.type}-error` : undefined}
              onChange={(event) => setType(event.target.value as StockMovementType | "")}
            >
              <option value="">Selecione o tipo…</option>
              {STOCK_MOVEMENT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            {fieldErrors.type ? (
              <small className="form-error" id={`${FIELD_ID.type}-error`}>
                {fieldErrors.type}
              </small>
            ) : null}
          </div>

          <div>
            <Select
              id={FIELD_ID.itemId}
              label="Item *"
              value={itemId}
              aria-required
              aria-invalid={fieldErrors.itemId ? true : undefined}
              aria-describedby={fieldErrors.itemId ? `${FIELD_ID.itemId}-error` : undefined}
              onChange={(event) => setItemId(event.target.value)}
            >
              <option value="">Selecione o item…</option>
              {selectableItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.sku} — {item.name}
                </option>
              ))}
            </Select>
            {selectedItem ? (
              <small style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
                Saldo atual: {formatQuantity(selectedItem.saldo, selectedItem.unit)}
              </small>
            ) : null}
            {fieldErrors.itemId ? (
              <small className="form-error" id={`${FIELD_ID.itemId}-error`}>
                {fieldErrors.itemId}
              </small>
            ) : null}
          </div>

          {type === "ajuste" ? (
            <div>
              <Select
                id={FIELD_ID.ajusteDirection}
                label="Direção do ajuste *"
                value={ajusteDirection}
                aria-required
                aria-invalid={fieldErrors.ajusteDirection ? true : undefined}
                aria-describedby={fieldErrors.ajusteDirection ? `${FIELD_ID.ajusteDirection}-error` : undefined}
                onChange={(event) => setAjusteDirection(event.target.value as StockMovementAjusteDirection | "")}
              >
                <option value="">Selecione a direção…</option>
                <option value="entrada">Entrada de ajuste (credita +)</option>
                <option value="saida">Saída de ajuste (debita −)</option>
              </Select>
              {fieldErrors.ajusteDirection ? (
                <small className="form-error" id={`${FIELD_ID.ajusteDirection}-error`}>
                  {fieldErrors.ajusteDirection}
                </small>
              ) : null}
            </div>
          ) : null}

          <Field
            id={FIELD_ID.quantidade}
            label="Quantidade"
            required
            value={quantidade}
            onChange={setQuantidade}
            error={fieldErrors.quantidade}
            maxLength={16}
            inputMode="decimal"
            helper={quantityHelper(type, ajusteDirection)}
          />

          <Field
            id={FIELD_ID.unitCost}
            label={type === "entrada" ? "Custo unitário (R$) *" : "Custo unitário (R$)"}
            value={unitCost}
            onChange={setUnitCost}
            error={fieldErrors.unitCost}
            maxLength={16}
            inputMode="decimal"
            helper={type === "entrada" ? "Obrigatório na entrada — atualiza o custo médio do item." : "Opcional. Ex.: 12,50"}
            ariaRequired={type === "entrada"}
          />

          <div>
            <Select
              id={FIELD_ID.workOrderId}
              label={type === "consumo" ? "OS *" : "OS"}
              value={workOrderId}
              aria-required={type === "consumo" || undefined}
              aria-invalid={fieldErrors.workOrderId ? true : undefined}
              aria-describedby={fieldErrors.workOrderId ? `${FIELD_ID.workOrderId}-error` : undefined}
              onChange={(event) => setWorkOrderId(event.target.value)}
            >
              <option value="">{type === "consumo" ? "Selecione a OS…" : "Sem OS vinculada"}</option>
              {workOrders.map((workOrder) => (
                <option key={workOrder.id} value={workOrder.id}>
                  {workOrder.code}
                  {workOrder.title ? ` — ${workOrder.title}` : ""}
                </option>
              ))}
            </Select>
            {fieldErrors.workOrderId ? (
              <small className="form-error" id={`${FIELD_ID.workOrderId}-error`}>
                {fieldErrors.workOrderId}
              </small>
            ) : null}
          </div>

          <div>
            <Select
              id={FIELD_ID.vehicleId}
              label="Viatura"
              value={vehicleId}
              aria-invalid={fieldErrors.vehicleId ? true : undefined}
              aria-describedby={fieldErrors.vehicleId ? `${FIELD_ID.vehicleId}-error` : undefined}
              onChange={(event) => setVehicleId(event.target.value)}
            >
              <option value="">Sem viatura</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.plate}
                  {vehicle.model ? ` — ${vehicle.model}` : ""}
                </option>
              ))}
            </Select>
            {fieldErrors.vehicleId ? (
              <small className="form-error" id={`${FIELD_ID.vehicleId}-error`}>
                {fieldErrors.vehicleId}
              </small>
            ) : null}
          </div>

          <div style={fullWidth}>
            <label className="ui-field">
              <span>{type === "ajuste" ? "Motivo *" : "Motivo"}</span>
              <textarea
                id={FIELD_ID.reason}
                className="ui-input"
                style={{ minHeight: 72, padding: "var(--space-10)", resize: "vertical" }}
                rows={3}
                value={reason}
                maxLength={500}
                aria-required={type === "ajuste" || undefined}
                aria-invalid={fieldErrors.reason ? true : undefined}
                aria-describedby={fieldErrors.reason ? `${FIELD_ID.reason}-error` : undefined}
                onChange={(event) => setReason(event.target.value)}
              />
              <small>{type === "ajuste" ? "Obrigatório no ajuste — ex.: inventário cíclico, avaria, perda." : "Opcional."}</small>
            </label>
            {fieldErrors.reason ? (
              <small className="form-error" id={`${FIELD_ID.reason}-error`}>
                {fieldErrors.reason}
              </small>
            ) : null}
          </div>

          <p style={noteStyle}>
            <Info size={16} aria-hidden /> Movimentações são definitivas: não podem ser editadas nem excluídas. Corrija com um ajuste
            compensatório.
          </p>
        </div>

        <footer style={footerStyle}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Registrando…" : "Registrar movimento"}
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
  ariaRequired,
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
  readonly ariaRequired?: boolean;
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
        aria-required={required || ariaRequired || undefined}
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

function focusField(field: StockMovementField) {
  if (typeof document === "undefined" || typeof document.getElementById !== "function") return;
  const element = document.getElementById(FIELD_ID[field]);
  if (element && typeof (element as HTMLElement).focus === "function") {
    (element as HTMLElement).focus();
  }
}
