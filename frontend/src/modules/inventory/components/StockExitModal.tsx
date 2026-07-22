import type { FormEvent } from "react";
import { useState } from "react";

import { Alert, Button, Modal, Select } from "../../../components/ui";
import { CUSTODY_ORIGIN_OPTIONS, STOCK_EXIT_REASON_OPTIONS, parsePtBrNumber, validateStockExit } from "../inventory.adapter";
import type { CustodyMovementField, CustodyOption, InventoryItem, StockCustodyType, StockExitPayload, StockExitReason } from "../inventory.types";
import { CustodyAccent, CustodyField, custodyFooterStyle, custodyFullWidth, custodyGridStyle, focusCustodyField } from "./custody-modal-kit";

// Ω4C PR-08 — Saída (EXIT): baixa por VENDA/consumo direto a partir de uma custódia de origem
// (Base/Profissional/Viatura) + "Tipo de Saída" (allowlist v1: Venda direta). Saldo da origem nunca
// fica negativo (o backend responde 409 saldo insuficiente).

const FIELD_ID: Record<string, string> = {
  custodyType: "stock-exit-field-custody-type",
  custodyRef: "stock-exit-field-custody-ref",
  exitReason: "stock-exit-field-exit-reason",
  quantidade: "stock-exit-field-quantidade",
  unitCost: "stock-exit-field-unit-cost",
  reason: "stock-exit-field-reason",
};

export function StockExitModal({
  item,
  operatorOptions,
  vehicleOptions,
  saving = false,
  serverError = null,
  onSubmit,
  onClose,
}: {
  readonly item: InventoryItem;
  readonly operatorOptions: readonly CustodyOption[];
  readonly vehicleOptions: readonly CustodyOption[];
  readonly saving?: boolean;
  readonly serverError?: string | null;
  readonly onSubmit: (payload: StockExitPayload) => void;
  readonly onClose: () => void;
}) {
  const [custodyType, setCustodyType] = useState<StockCustodyType>("base");
  const [custodyRef, setCustodyRef] = useState("");
  const [exitReason, setExitReason] = useState<StockExitReason | "">("direct_sale");
  const [quantidade, setQuantidade] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [reason, setReason] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<CustodyMovementField, string>>>({});

  const needsRef = custodyType === "professional" || custodyType === "vehicle";
  const refLabel = custodyType === "vehicle" ? "Viatura" : "Profissional";
  const refOptions = custodyType === "vehicle" ? vehicleOptions : operatorOptions;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedQty = parsePtBrNumber(quantidade);
    const parsedCost = parsePtBrNumber(unitCost);
    const errors = validateStockExit({
      quantidade: parsedQty,
      custodyType,
      custodyOperatorProfileId: custodyType === "professional" ? custodyRef : undefined,
      custodyVehicleId: custodyType === "vehicle" ? custodyRef : undefined,
      unitCost: parsedCost,
    });
    if (errors.length > 0) {
      setFieldErrors(Object.fromEntries(errors.map((error) => [error.field, error.message])) as Partial<Record<CustodyMovementField, string>>);
      focusCustodyField(FIELD_ID, errors[0].field);
      return;
    }
    setFieldErrors({});
    onSubmit({
      itemId: item.id,
      quantidade: parsedQty as number,
      custodyType,
      custodyOperatorProfileId: custodyType === "professional" ? custodyRef : undefined,
      custodyVehicleId: custodyType === "vehicle" ? custodyRef : undefined,
      exitReason: exitReason || undefined,
      unitCost: parsedCost,
      reason: reason.trim() || undefined,
    });
  }

  return (
    <Modal title="Saída de estoque" open onClose={onClose}>
      <CustodyAccent>Saída — debita da custódia de origem</CustodyAccent>
      <form onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <Alert title="Não foi possível registrar a saída" tone="danger">
            {serverError}
          </Alert>
        ) : null}

        <div style={custodyGridStyle}>
          <div>
            <Select
              id={FIELD_ID.custodyType}
              label="Origem (custódia) *"
              value={custodyType}
              onChange={(event) => {
                setCustodyType(event.target.value as StockCustodyType);
                setCustodyRef("");
              }}
            >
              {CUSTODY_ORIGIN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          {needsRef ? (
            <div>
              <Select
                id={FIELD_ID.custodyRef}
                label={`${refLabel} *`}
                value={custodyRef}
                aria-required
                aria-invalid={fieldErrors.custodyOperatorProfileId || fieldErrors.custodyVehicleId ? true : undefined}
                aria-describedby={fieldErrors.custodyOperatorProfileId || fieldErrors.custodyVehicleId ? `${FIELD_ID.custodyRef}-error` : undefined}
                onChange={(event) => setCustodyRef(event.target.value)}
              >
                <option value="">{custodyType === "vehicle" ? "Selecione a viatura…" : "Selecione o profissional…"}</option>
                {refOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Select>
              {fieldErrors.custodyOperatorProfileId || fieldErrors.custodyVehicleId ? (
                <small className="form-error" id={`${FIELD_ID.custodyRef}-error`}>
                  {fieldErrors.custodyOperatorProfileId ?? fieldErrors.custodyVehicleId}
                </small>
              ) : null}
            </div>
          ) : null}

          <div>
            <Select
              id={FIELD_ID.exitReason}
              label="Tipo de Saída"
              value={exitReason}
              onChange={(event) => setExitReason(event.target.value as StockExitReason | "")}
            >
              {STOCK_EXIT_REASON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <CustodyField
            id={FIELD_ID.quantidade}
            label="Quantidade"
            required
            value={quantidade}
            onChange={setQuantidade}
            error={fieldErrors.quantidade}
            maxLength={16}
            inputMode="decimal"
            helper="Debita da custódia de origem. Saldo nunca fica negativo."
          />

          <CustodyField
            id={FIELD_ID.unitCost}
            label="Valor unitário (R$)"
            value={unitCost}
            onChange={setUnitCost}
            error={fieldErrors.unitCost}
            maxLength={16}
            inputMode="decimal"
            helper="Opcional. Ex.: 15,00"
          />

          <div style={custodyFullWidth}>
            <label className="ui-field">
              <span>Nota / Observação</span>
              <textarea
                id={FIELD_ID.reason}
                className="ui-input"
                style={{ minHeight: 64, padding: "var(--space-10)", resize: "vertical" }}
                rows={2}
                value={reason}
                maxLength={500}
                onChange={(event) => setReason(event.target.value)}
              />
              <small>Opcional.</small>
            </label>
          </div>
        </div>

        <footer style={custodyFooterStyle}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Registrando…" : "Registrar saída"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

export default StockExitModal;
