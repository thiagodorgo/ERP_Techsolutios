import type { FormEvent } from "react";
import { useState } from "react";

import { Alert, Button, Modal, Select } from "../../../components/ui";
import { CUSTODY_TARGET_OPTIONS, formatQuantity, parsePtBrNumber, validateStockTransfer } from "../inventory.adapter";
import type { CustodyMovementField, CustodyOption, InventoryItem, StockTransferPayload } from "../inventory.types";
import { CustodyAccent, CustodyField, custodyFooterStyle, custodyFullWidth, custodyGridStyle, focusCustodyField } from "./custody-modal-kit";

// Ω4C PR-08 — Vincular (LINK, Base→custódia) / Desvincular (UNLINK, custódia→Base). O destino/origem é
// um Profissional ou uma Viatura (a Base é a contraparte fixa). "Desvincular devolve à Base."

const FIELD_ID: Record<string, string> = {
  custodyType: "stock-transfer-field-custody-type",
  custodyRef: "stock-transfer-field-custody-ref",
  quantidade: "stock-transfer-field-quantidade",
  reason: "stock-transfer-field-reason",
};

export function StockTransferModal({
  mode,
  item,
  operatorOptions,
  vehicleOptions,
  saving = false,
  serverError = null,
  onSubmit,
  onClose,
}: {
  readonly mode: "link" | "unlink";
  readonly item: InventoryItem;
  readonly operatorOptions: readonly CustodyOption[];
  readonly vehicleOptions: readonly CustodyOption[];
  readonly saving?: boolean;
  readonly serverError?: string | null;
  readonly onSubmit: (payload: StockTransferPayload) => void;
  readonly onClose: () => void;
}) {
  const [custodyType, setCustodyType] = useState<"professional" | "vehicle" | "">("");
  const [custodyRef, setCustodyRef] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [reason, setReason] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<CustodyMovementField, string>>>({});

  const isLink = mode === "link";
  const title = isLink ? "Vincular a uma custódia" : "Desvincular de uma custódia";
  const custodyLabel = isLink ? "Vincular por" : "Desvincular de";
  const refLabel = custodyType === "vehicle" ? "Viatura" : "Profissional";
  const refOptions = custodyType === "vehicle" ? vehicleOptions : operatorOptions;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedQty = parsePtBrNumber(quantidade);
    const errors = validateStockTransfer({
      quantidade: parsedQty,
      custodyType: custodyType || "",
      custodyOperatorProfileId: custodyType === "professional" ? custodyRef : undefined,
      custodyVehicleId: custodyType === "vehicle" ? custodyRef : undefined,
    });
    if (errors.length > 0) {
      setFieldErrors(Object.fromEntries(errors.map((error) => [error.field, error.message])) as Partial<Record<CustodyMovementField, string>>);
      focusCustodyField(FIELD_ID, errors[0].field);
      return;
    }
    setFieldErrors({});
    onSubmit({
      itemId: item.id,
      type: mode,
      quantidade: parsedQty as number,
      custodyType: custodyType as "professional" | "vehicle",
      custodyOperatorProfileId: custodyType === "professional" ? custodyRef : undefined,
      custodyVehicleId: custodyType === "vehicle" ? custodyRef : undefined,
      reason: reason.trim() || undefined,
    });
  }

  return (
    <Modal title={title} open onClose={onClose}>
      <CustodyAccent>{isLink ? "Vincular — Base para a custódia" : "Desvincular — custódia devolve à Base"}</CustodyAccent>
      <form onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <Alert title={isLink ? "Não foi possível vincular" : "Não foi possível desvincular"} tone="danger">
            {serverError}
          </Alert>
        ) : null}

        <div style={custodyGridStyle}>
          <div>
            <Select
              id={FIELD_ID.custodyType}
              label={`${custodyLabel} *`}
              value={custodyType}
              aria-required
              aria-invalid={fieldErrors.custodyType ? true : undefined}
              aria-describedby={fieldErrors.custodyType ? `${FIELD_ID.custodyType}-error` : undefined}
              onChange={(event) => {
                setCustodyType(event.target.value as "professional" | "vehicle" | "");
                setCustodyRef("");
              }}
            >
              <option value="">Selecione a custódia…</option>
              {CUSTODY_TARGET_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            {fieldErrors.custodyType ? (
              <small className="form-error" id={`${FIELD_ID.custodyType}-error`}>
                {fieldErrors.custodyType}
              </small>
            ) : null}
          </div>

          <div>
            <Select
              id={FIELD_ID.custodyRef}
              label={`${refLabel} *`}
              value={custodyRef}
              disabled={!custodyType}
              aria-required
              aria-invalid={fieldErrors.custodyOperatorProfileId || fieldErrors.custodyVehicleId ? true : undefined}
              aria-describedby={fieldErrors.custodyOperatorProfileId || fieldErrors.custodyVehicleId ? `${FIELD_ID.custodyRef}-error` : undefined}
              onChange={(event) => setCustodyRef(event.target.value)}
            >
              <option value="">{custodyType ? `Selecione ${custodyType === "vehicle" ? "a viatura" : "o profissional"}…` : "Escolha a custódia primeiro"}</option>
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

          <CustodyField
            id={FIELD_ID.quantidade}
            label="Quantidade"
            required
            value={quantidade}
            onChange={setQuantidade}
            error={fieldErrors.quantidade}
            maxLength={16}
            inputMode="decimal"
            helper={isLink ? `Base: ${formatQuantity(item.saldo, item.unit)} (saldo global).` : "Devolve à Base a quantidade informada."}
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
            {saving ? "Registrando…" : isLink ? "Vincular" : "Desvincular"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

export default StockTransferModal;
