import { CheckCircle2, X } from "lucide-react";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import { useOperatorProfiles } from "../../registry/operator-profiles/useOperatorProfiles";
import type { OperatorProfilesFilters } from "../../registry/operator-profiles/operator-profiles.types";
import { useVehicles } from "../../registry/vehicles/useVehicles";
import type { VehiclesFilters } from "../../registry/vehicles/vehicles.types";
import { DENSE_LIST_FETCH_LIMIT } from "../../../components/dense-list";
import { interpretCustodyMovementError, interpretStockReverseError } from "../inventory.adapter";
import type { MovementLedgerRow } from "../inventory.adapter";
import { createStockEntry, createStockExit, createStockTransfer, reverseStockMovement } from "../inventory.service";
import type { CustodyMovementField, CustodyOption, InventoryApiContext, InventoryItem, StockEntryPayload, StockExitPayload, StockMovementsFilters, StockTransferPayload } from "../inventory.types";
import { useStockMovements } from "../useStockMovements";
import { ItemMovementsPanel } from "./ItemMovementsPanel";
import { StockEntryModal } from "./StockEntryModal";
import { StockExitModal } from "./StockExitModal";
import { StockTransferModal } from "./StockTransferModal";

const OPERATOR_FILTERS: OperatorProfilesFilters = { search: "", isActive: "active", hasConsent: "all", limit: DENSE_LIST_FETCH_LIMIT };
const VEHICLE_FILTERS: VehiclesFilters = { search: "", isActive: "active", limit: DENSE_LIST_FETCH_LIMIT };

const successBannerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: "var(--space-12)",
  padding: "10px 12px",
  borderRadius: "var(--radius-8)",
  background: "#F0FDF4",
  border: "1px solid #BBF7D0",
  color: "#166534",
  fontSize: "var(--text-sm)",
  fontWeight: 600,
};

type SubModal = "entry" | "link" | "unlink" | "exit" | null;

export function ItemMovimentacaoTab({
  item,
  context,
  canCreateMovement,
}: {
  readonly item: InventoryItem;
  readonly context: InventoryApiContext;
  readonly canCreateMovement: boolean;
}) {
  const movementsFilters = useMemo<StockMovementsFilters>(() => ({ itemId: item.id, limit: DENSE_LIST_FETCH_LIMIT }), [item.id]);
  const { items: movements, loading, error, refresh } = useStockMovements(movementsFilters);
  const { items: operatorProfiles } = useOperatorProfiles(OPERATOR_FILTERS);
  const { items: vehicles } = useVehicles(VEHICLE_FILTERS);

  const [subModal, setSubModal] = useState<SubModal>(null);
  const [saving, setSaving] = useState(false);
  const [subError, setSubError] = useState<string | null>(null);
  const [subErrorField, setSubErrorField] = useState<CustodyMovementField | null>(null);
  const [reversingId, setReversingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const operatorOptions = useMemo<CustodyOption[]>(
    () => operatorProfiles.map((profile) => ({ id: profile.id, label: profile.fullName ?? "Profissional" })),
    [operatorProfiles],
  );
  const vehicleOptions = useMemo<CustodyOption[]>(
    () => vehicles.map((vehicle) => ({ id: vehicle.id, label: vehicle.model ? `${vehicle.plate} — ${vehicle.model}` : vehicle.plate })),
    [vehicles],
  );
  const operatorNameById = useMemo(() => new Map(operatorProfiles.map((profile) => [profile.id, profile.fullName ?? "Profissional"])), [operatorProfiles]);
  const vehiclePlateById = useMemo(() => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle.plate])), [vehicles]);

  function openSubModal(next: SubModal) {
    setSubError(null);
    setSubErrorField(null);
    setSubModal(next);
  }

  function closeSubModal() {
    if (saving) return;
    setSubModal(null);
    setSubError(null);
    setSubErrorField(null);
  }

  async function afterChange(message: string) {
    setFeedback(message);
    setActionError(null);
    setSubModal(null);
    setSubError(null);
    setSubErrorField(null);
    await refresh();
  }

  async function handleEntry(payload: StockEntryPayload) {
    setSaving(true);
    setSubError(null);
    try {
      await createStockEntry(context, payload);
      await afterChange("Entrada registrada na Base.");
    } catch (submitError) {
      const feedbackError = interpretCustodyMovementError(submitError, { currentSaldo: item.saldo, unit: item.unit });
      setSubError(feedbackError.message);
      setSubErrorField(feedbackError.field ?? null);
    } finally {
      setSaving(false);
    }
  }

  async function handleTransfer(payload: StockTransferPayload) {
    setSaving(true);
    setSubError(null);
    try {
      await createStockTransfer(context, payload);
      await afterChange(payload.type === "link" ? "Estoque vinculado à custódia." : "Estoque devolvido à Base.");
    } catch (submitError) {
      const feedbackError = interpretCustodyMovementError(submitError);
      setSubError(feedbackError.message);
      setSubErrorField(feedbackError.field ?? null);
    } finally {
      setSaving(false);
    }
  }

  async function handleExit(payload: StockExitPayload) {
    setSaving(true);
    setSubError(null);
    try {
      await createStockExit(context, payload);
      await afterChange("Saída registrada.");
    } catch (submitError) {
      const feedbackError = interpretCustodyMovementError(submitError);
      setSubError(feedbackError.message);
      setSubErrorField(feedbackError.field ?? null);
    } finally {
      setSaving(false);
    }
  }

  async function handleReverse(row: MovementLedgerRow) {
    setReversingId(row.id);
    setActionError(null);
    try {
      await reverseStockMovement(context, row.id);
      setFeedback("Movimento estornado (movimento compensatório).");
      await refresh();
    } catch (reverseError) {
      setActionError(interpretStockReverseError(reverseError).message);
    } finally {
      setReversingId(null);
    }
  }

  return (
    <div>
      {feedback ? (
        <div style={successBannerStyle} role="status" aria-live="polite">
          <CheckCircle2 size={16} aria-hidden style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{feedback}</span>
          <button
            type="button"
            aria-label="Dispensar aviso"
            onClick={() => setFeedback(null)}
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "#166534", display: "inline-flex" }}
          >
            <X size={14} aria-hidden />
          </button>
        </div>
      ) : null}

      <ItemMovementsPanel
        item={item}
        movements={movements}
        loading={loading}
        error={error ?? actionError}
        onRetry={() => void refresh()}
        canCreateMovement={canCreateMovement}
        operatorNameById={operatorNameById}
        vehiclePlateById={vehiclePlateById}
        reversingId={reversingId}
        onReverse={(row) => void handleReverse(row)}
        onOpenEntry={() => openSubModal("entry")}
        onOpenLink={() => openSubModal("link")}
        onOpenExit={() => openSubModal("exit")}
        onOpenUnlink={() => openSubModal("unlink")}
      />

      {subModal === "entry" ? (
        <StockEntryModal
          item={item}
          saving={saving}
          serverError={subError}
          serverErrorField={subErrorField}
          onSubmit={(payload) => void handleEntry(payload)}
          onClose={closeSubModal}
        />
      ) : null}

      {subModal === "link" || subModal === "unlink" ? (
        <StockTransferModal
          mode={subModal}
          item={item}
          operatorOptions={operatorOptions}
          vehicleOptions={vehicleOptions}
          saving={saving}
          serverError={subError}
          onSubmit={(payload) => void handleTransfer(payload)}
          onClose={closeSubModal}
        />
      ) : null}

      {subModal === "exit" ? (
        <StockExitModal
          item={item}
          operatorOptions={operatorOptions}
          vehicleOptions={vehicleOptions}
          saving={saving}
          serverError={subError}
          onSubmit={(payload) => void handleExit(payload)}
          onClose={closeSubModal}
        />
      ) : null}
    </div>
  );
}

export default ItemMovimentacaoTab;
