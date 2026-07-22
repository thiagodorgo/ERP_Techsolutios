import type { FormEvent } from "react";
import { useState } from "react";

import { Alert, Button, Modal } from "../../../components/ui";
import { formatQuantity, parsePtBrNumber, validateStockEntry } from "../inventory.adapter";
import type { CustodyMovementField, InventoryItem, StockEntryPayload } from "../inventory.types";
import { CustodyAccent, CustodyField, custodyFooterStyle, custodyFullWidth, custodyGridStyle, focusCustodyField } from "./custody-modal-kit";

// Ω4C PR-08 — Entrada (ENTRY): compra/recebimento que SEMPRE credita na custódia BASE. Exige custo
// unitário (custo médio móvel). A Nota/Fornecedor é registrada no motivo (sem coluna nova nesta fatia).

const FIELD_ID: Record<string, string> = {
  quantidade: "stock-entry-field-quantidade",
  unitCost: "stock-entry-field-unit-cost",
  reason: "stock-entry-field-reason",
};

export function StockEntryModal({
  item,
  saving = false,
  serverError = null,
  serverErrorField = null,
  onSubmit,
  onClose,
}: {
  readonly item: InventoryItem;
  readonly saving?: boolean;
  readonly serverError?: string | null;
  readonly serverErrorField?: CustodyMovementField | null;
  readonly onSubmit: (payload: StockEntryPayload) => void;
  readonly onClose: () => void;
}) {
  const [quantidade, setQuantidade] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [reason, setReason] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<CustodyMovementField, string>>>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedQty = parsePtBrNumber(quantidade);
    const parsedCost = parsePtBrNumber(unitCost);
    const errors = validateStockEntry({ quantidade: parsedQty, unitCost: parsedCost });
    if (errors.length > 0) {
      setFieldErrors(Object.fromEntries(errors.map((error) => [error.field, error.message])) as Partial<Record<CustodyMovementField, string>>);
      focusCustodyField(FIELD_ID, errors[0].field);
      return;
    }
    setFieldErrors({});
    onSubmit({
      itemId: item.id,
      quantidade: parsedQty as number,
      unitCost: parsedCost as number,
      reason: reason.trim() || undefined,
    });
  }

  return (
    <Modal title="Entrada de estoque" open onClose={onClose}>
      <CustodyAccent>Entrada — credita na Base</CustodyAccent>
      <form onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <Alert title="Não foi possível registrar a entrada" tone="danger">
            {serverError}
          </Alert>
        ) : null}

        <div style={custodyGridStyle}>
          <CustodyField
            id={FIELD_ID.quantidade}
            label="Quantidade"
            required
            value={quantidade}
            onChange={setQuantidade}
            error={fieldErrors.quantidade}
            maxLength={16}
            inputMode="decimal"
            helper={`Saldo global atual: ${formatQuantity(item.saldo, item.unit)}.`}
          />
          <CustodyField
            id={FIELD_ID.unitCost}
            label="Valor unitário (R$)"
            required
            value={unitCost}
            onChange={setUnitCost}
            error={fieldErrors.unitCost ?? (serverErrorField === "unitCost" ? serverError ?? undefined : undefined)}
            maxLength={16}
            inputMode="decimal"
            helper="Atualiza o custo médio do item. Ex.: 12,50"
          />
          <div style={custodyFullWidth}>
            <label className="ui-field">
              <span>Nota / Fornecedor</span>
              <textarea
                id={FIELD_ID.reason}
                className="ui-input"
                style={{ minHeight: 64, padding: "var(--space-10)", resize: "vertical" }}
                rows={2}
                value={reason}
                maxLength={500}
                onChange={(event) => setReason(event.target.value)}
              />
              <small>Opcional. Ex.: NF-e 4471 — Fornecedor Alfa.</small>
            </label>
          </div>
        </div>

        <footer style={custodyFooterStyle}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Registrando…" : "Registrar entrada"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

export default StockEntryModal;
