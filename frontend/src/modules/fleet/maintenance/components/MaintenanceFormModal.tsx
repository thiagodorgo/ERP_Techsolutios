import type { CSSProperties, FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";

import { Alert, Button, Chip, Input, Modal, Select, Tabs } from "../../../../components/ui";
import { EntityAttachmentsTab } from "../../../attachments";
import { PayableToggle } from "../../../finance/payable-source";
import type { Vehicle } from "../../../registry/vehicles/vehicles.types";
import {
  MAINTENANCE_TYPE_OPTIONS,
  formatMaintenanceDate,
  getMaintenanceStatusLabel,
  getMaintenanceStatusTone,
  getMaintenanceTypeLabel,
  interpretMaintenanceSubmitError,
  parseIntStrict,
  validateMaintenanceOrder,
} from "../maintenance-orders.adapter";
import {
  addMaintenanceOrderItem,
  createMaintenanceOrder,
  getMaintenanceOrderDetail,
  getOdometerSuggestion,
  removeMaintenanceOrderItem,
  updateMaintenanceOrder,
  updateMaintenanceOrderItem,
} from "../maintenance-orders.service";
import type {
  MaintenanceItemPayload,
  MaintenanceOrder,
  MaintenanceOrderCreatePayload,
  MaintenanceOrderDraft,
  MaintenanceOrderField,
  MaintenanceOrderItem,
  MaintenanceOrderTotals,
  MaintenanceOrdersApiContext,
  MaintenanceType,
  OdometerSuggestion,
} from "../maintenance-orders.types";
import { MaintenanceItemModal } from "./MaintenanceItemModal";
import { MaintenanceItemsSection } from "./MaintenanceItemsSection";
import { PrintMaintenanceOrderModal } from "./PrintMaintenanceOrderModal";

const FIELD_ID: Record<string, string> = {
  vehicleId: "maintenance-field-vehicle",
  type: "maintenance-field-type",
  description: "maintenance-field-description",
  scheduledFor: "maintenance-field-scheduled-for",
  odometer: "maintenance-field-odometer",
  supplier: "maintenance-field-supplier",
  nextDueAt: "maintenance-field-next-due-at",
};

const EMPTY_TOTALS: MaintenanceOrderTotals = { totalServices: 0, totalProducts: 0, total: 0, itemCount: 0 };

const gridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--space-12)" };
const fullWidth: CSSProperties = { gridColumn: "1 / -1" };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };
const readOnlyRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)" };
const mutedStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)" };
const sectionTitleStyle: CSSProperties = {
  ...fullWidth,
  margin: "var(--space-8) 0 0",
  paddingTop: "var(--space-8)",
  borderTop: "1px solid var(--border-subtle)",
  fontSize: "var(--text-sm)",
  fontWeight: 700,
  color: "var(--text-secondary)",
};
const suggestionStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-8)",
  marginTop: "var(--space-6)",
  padding: "var(--space-6) var(--space-8)",
  borderRadius: "var(--radius-4)",
  background: "var(--surface-panel-muted)",
  fontSize: "var(--text-sm)",
  color: "var(--text-secondary)",
};

// ISO -> valor de <input type="datetime-local"> (YYYY-MM-DDTHH:mm) na hora local.
function toDateTimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// ISO -> valor de <input type="date"> (YYYY-MM-DD) na hora local.
function toDateValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatOdometer(value: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value);
}

function suggestionSourceLabel(source: OdometerSuggestion["source"]): string {
  return source === "fuel_log" ? "em um abastecimento" : "em uma manutenção anterior";
}

export function MaintenanceFormModal({
  order,
  vehicles,
  context,
  canUploadAttachments = false,
  canDeleteAttachments = false,
  canLaunchPayable = false,
  canRemovePayable = false,
  onClose,
  onSaved,
}: {
  readonly order: MaintenanceOrder | null;
  readonly vehicles: readonly Vehicle[];
  readonly context: MaintenanceOrdersApiContext;
  readonly canUploadAttachments?: boolean;
  readonly canDeleteAttachments?: boolean;
  readonly canLaunchPayable?: boolean;
  readonly canRemovePayable?: boolean;
  readonly onClose: () => void;
  readonly onSaved: (saved?: MaintenanceOrder) => void;
}) {
  const isEdit = Boolean(order);
  // AutEM: no modo edição o registro ganha as abas "Editar" | "Arquivos" (a aba de anexos só existe
  // depois que a ordem tem id). Na criação, só o formulário.
  const [activeTab, setActiveTab] = useState<"form" | "arquivos">("form");
  const [vehicleId, setVehicleId] = useState(order?.vehicleId ?? "");
  const [type, setType] = useState<MaintenanceType>(order?.type ?? "preventiva");
  const [description, setDescription] = useState(order?.description ?? "");
  const [scheduledFor, setScheduledFor] = useState(toDateTimeLocalValue(order?.scheduledFor));
  const [odometer, setOdometer] = useState(order?.odometer != null ? String(order.odometer) : "");
  const [supplier, setSupplier] = useState(order?.supplier ?? "");
  // Ω4C PR-06 — próxima manutenção (por tempo → nextDueAt). A notificação agendada é SEMPRE privada (decidido no
  // backend): não há seletor de visibilidade — broadcast tenant-wide exige notifications:create pela rota do motor.
  const [nextDueAt, setNextDueAt] = useState(toDateValue(order?.nextDueAt));
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<MaintenanceOrderField, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Ω4C PR-06 — sugestão de hodômetro (maior leitura conhecida). Buscada ao escolher a viatura; null → sem sugestão.
  const [odometerSuggestion, setOdometerSuggestion] = useState<OdometerSuggestion | null>(null);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);

  // Ω4C PR-06 — itens + totais DERIVADOS do backend (só no modo edição, após o cabeçalho existir).
  const [items, setItems] = useState<readonly MaintenanceOrderItem[]>([]);
  const [totals, setTotals] = useState<MaintenanceOrderTotals>(EMPTY_TOTALS);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemModalKey, setItemModalKey] = useState(0);
  const [editingItem, setEditingItem] = useState<MaintenanceOrderItem | null>(null);
  const [itemSaving, setItemSaving] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [printOpen, setPrintOpen] = useState(false);

  const canEditItems = canUploadAttachments; // reusa a permissão de criar/editar manutenção (RBAC do agregado)

  const reloadDetail = useCallback(async () => {
    if (!order) return;
    setItemsLoading(true);
    setItemsError(null);
    try {
      const detail = await getMaintenanceOrderDetail(context, order.id);
      if (detail) {
        setItems(detail.items);
        setTotals(detail.totals);
      } else {
        setItems([]);
        setTotals(EMPTY_TOTALS);
      }
    } catch {
      setItemsError("Não foi possível carregar os itens desta manutenção.");
    } finally {
      setItemsLoading(false);
    }
  }, [context, order]);

  // Modo edição: carrega itens + totais ao abrir.
  useEffect(() => {
    void reloadDetail();
  }, [reloadDetail]);

  // Sugestão de hodômetro ao escolher a viatura (null → nenhum hint). Só quando há viatura selecionada.
  useEffect(() => {
    let alive = true;
    setOdometerSuggestion(null);
    setSuggestionDismissed(false);
    if (!vehicleId) return;
    void getOdometerSuggestion(context, vehicleId).then((suggestion) => {
      if (alive) setOdometerSuggestion(suggestion);
    });
    return () => {
      alive = false;
    };
  }, [context, vehicleId]);

  function buildDraft(): MaintenanceOrderDraft {
    return {
      vehicleId: vehicleId.trim(),
      type,
      description: description.trim(),
      // datetime-local não carrega fuso; convertemos para ISO na fronteira.
      scheduledFor: scheduledFor.trim() ? new Date(scheduledFor).toISOString() : undefined,
      odometer: parseIntStrict(odometer),
      supplier: supplier.trim() || undefined,
      nextDueAt: nextDueAt.trim() ? new Date(nextDueAt).toISOString() : undefined,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const draft = buildDraft();
    const errors = validateMaintenanceOrder(draft);
    if (errors.length > 0) {
      setFieldErrors(Object.fromEntries(errors.map((error) => [error.field, error.message])) as Partial<Record<MaintenanceOrderField, string>>);
      focusField(errors[0].field);
      return;
    }
    setFieldErrors({});

    const payload: MaintenanceOrderCreatePayload = {
      vehicleId: draft.vehicleId,
      type: draft.type,
      description: draft.description,
      scheduledFor: draft.scheduledFor,
      odometer: draft.odometer,
      supplier: draft.supplier,
      // Próxima manutenção: com data, o backend cria a notificação agendada (sempre PRIVADA — sem visibilidade no payload).
      nextDueAt: draft.nextDueAt,
    };

    setSaving(true);
    try {
      if (isEdit && order) {
        const updated = await updateMaintenanceOrder(context, order.id, payload);
        onSaved(updated ?? undefined);
      } else {
        const created = await createMaintenanceOrder(context, payload);
        onSaved(created ?? undefined);
      }
    } catch (error) {
      // 422 odometer_regressive: mensagem sob o campo Odômetro + Alerta de perigo.
      const feedback = interpretMaintenanceSubmitError(error, "form");
      if (feedback.field === "odometer") {
        setFieldErrors((prev) => ({ ...prev, odometer: feedback.message }));
        focusField("odometer");
      }
      setServerError(feedback.message);
    } finally {
      setSaving(false);
    }
  }

  function openAddItem() {
    setEditingItem(null);
    setItemError(null);
    setItemModalOpen(true);
  }

  function openEditItem(item: MaintenanceOrderItem) {
    setEditingItem(item);
    setItemError(null);
    setItemModalOpen(true);
  }

  function closeItemModal() {
    setItemModalOpen(false);
    setEditingItem(null);
    setItemError(null);
  }

  async function handleItemSubmit(payload: MaintenanceItemPayload, continueAdding: boolean) {
    if (!order) return;
    setItemSaving(true);
    setItemError(null);
    try {
      if (editingItem) {
        await updateMaintenanceOrderItem(context, order.id, editingItem.id, payload);
      } else {
        await addMaintenanceOrderItem(context, order.id, payload);
      }
      await reloadDetail();
      if (continueAdding && !editingItem) {
        // "Continuar cadastrando": mantém o sub-modal aberto e o reinicia (remonta com key nova).
        setItemModalKey((key) => key + 1);
      } else {
        closeItemModal();
      }
    } catch (error) {
      const feedback = interpretMaintenanceSubmitError(error, "form");
      setItemError(feedback.message);
    } finally {
      setItemSaving(false);
    }
  }

  async function handleRemoveItem(item: MaintenanceOrderItem) {
    if (!order) return;
    setBusyItemId(item.id);
    setItemsError(null);
    try {
      await removeMaintenanceOrderItem(context, order.id, item.id);
      await reloadDetail();
    } catch {
      setItemsError("Não foi possível excluir o item. Tente novamente.");
    } finally {
      setBusyItemId(null);
    }
  }

  const selectedVehicle = order ? vehicles.find((vehicle) => vehicle.id === order.vehicleId) : undefined;
  const vehicleLabel = selectedVehicle ? `${selectedVehicle.plate}${selectedVehicle.model ? ` — ${selectedVehicle.model}` : ""}` : "—";
  const attachmentSummary = order
    ? [
        { label: "Data e Hora", value: formatMaintenanceDate(order.scheduledFor) },
        { label: "Tipo", value: getMaintenanceTypeLabel(order.type) },
        { label: "Objeto", value: vehicleLabel },
        { label: "Situação", value: getMaintenanceStatusLabel(order.status) },
      ]
    : [];

  // PayableToggle: amount default = total derivado (Σ itens); fallback ao custo legado quando não há item.
  const payableAmount = totals.total > 0 ? totals.total : order?.cost ?? undefined;
  const showSuggestion = odometerSuggestion !== null && !suggestionDismissed && !odometer.trim();

  return (
    <Modal title={isEdit ? "Editar manutenção" : "Nova manutenção"} open onClose={onClose}>
      {isEdit ? (
        <div style={{ marginBottom: "var(--space-16)" }}>
          <Tabs
            tabs={[
              { id: "form", label: "Editar" },
              { id: "arquivos", label: "Arquivos" },
            ]}
            active={activeTab}
            onChange={(id) => setActiveTab(id as "form" | "arquivos")}
          />
        </div>
      ) : null}

      {isEdit && order && activeTab === "arquivos" ? (
        <EntityAttachmentsTab
          entityType="maintenance_order"
          entityId={order.id}
          summary={attachmentSummary}
          canUpload={canUploadAttachments}
          canDelete={canDeleteAttachments}
        />
      ) : (
        <form onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <Alert title="Não foi possível salvar" tone="danger">
            {serverError}
          </Alert>
        ) : null}

        {isEdit && order ? (
          <div style={{ ...fullWidth, marginBottom: "var(--space-12)" }}>
            <span style={mutedStyle}>Situação atual</span>
            <div style={readOnlyRowStyle}>
              <Chip tone={getMaintenanceStatusTone(order.status)}>{getMaintenanceStatusLabel(order.status)}</Chip>
              <span style={mutedStyle}>A situação avança pelas ações da linha (Iniciar, Concluir, Cancelar).</span>
            </div>
          </div>
        ) : null}

        <div style={gridStyle}>
          <div style={fullWidth}>
            <Select
              id={FIELD_ID.vehicleId}
              label="Viatura *"
              value={vehicleId}
              aria-required
              aria-invalid={fieldErrors.vehicleId ? true : undefined}
              aria-describedby={fieldErrors.vehicleId ? `${FIELD_ID.vehicleId}-error` : undefined}
              onChange={(event) => setVehicleId(event.target.value)}
            >
              <option value="">Selecione a viatura…</option>
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

          <div>
            <Select
              id={FIELD_ID.type}
              label="Tipo *"
              value={type}
              aria-required
              aria-invalid={fieldErrors.type ? true : undefined}
              aria-describedby={fieldErrors.type ? `${FIELD_ID.type}-error` : undefined}
              onChange={(event) => setType(event.target.value as MaintenanceType)}
            >
              {MAINTENANCE_TYPE_OPTIONS.map((option) => (
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

          <Field
            id={FIELD_ID.scheduledFor}
            label="Agendada para"
            type="datetime-local"
            value={scheduledFor}
            onChange={setScheduledFor}
            error={fieldErrors.scheduledFor}
            helper={type === "preventiva" ? "Data prevista da manutenção preventiva." : "Opcional para corretivas."}
          />

          <div style={fullWidth}>
            <label className="ui-field">
              <span>Descrição *</span>
              <textarea
                id={FIELD_ID.description}
                className="ui-input"
                style={{ minHeight: 92, padding: "var(--space-10)", resize: "vertical" }}
                rows={3}
                value={description}
                maxLength={2000}
                aria-required
                aria-invalid={fieldErrors.description ? true : undefined}
                aria-describedby={fieldErrors.description ? `${FIELD_ID.description}-error` : undefined}
                onChange={(event) => setDescription(event.target.value)}
              />
              <small>O que será feito (serviço, item, sintoma).</small>
            </label>
            {fieldErrors.description ? (
              <small className="form-error" id={`${FIELD_ID.description}-error`}>
                {fieldErrors.description}
              </small>
            ) : null}
          </div>

          <div>
            <Field
              id={FIELD_ID.odometer}
              label="Odômetro"
              value={odometer}
              onChange={setOdometer}
              error={fieldErrors.odometer}
              maxLength={9}
              inputMode="numeric"
              helper="Leitura em km, número inteiro (opcional)."
            />
            {showSuggestion && odometerSuggestion ? (
              <div style={suggestionStyle} aria-live="polite">
                <span>
                  Encontramos uma leitura de <strong>{formatOdometer(odometerSuggestion.suggestedOdometer)} km</strong>{" "}
                  {suggestionSourceLabel(odometerSuggestion.source)}. Deseja preencher?
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setOdometer(String(odometerSuggestion.suggestedOdometer));
                    setSuggestionDismissed(true);
                  }}
                >
                  Preencher
                </Button>
                <Button type="button" size="sm" variant="ghost" aria-label="Dispensar sugestão de hodômetro" onClick={() => setSuggestionDismissed(true)}>
                  Dispensar
                </Button>
              </div>
            ) : null}
          </div>
          <Field
            id={FIELD_ID.supplier}
            label="Fornecedor"
            value={supplier}
            onChange={setSupplier}
            error={fieldErrors.supplier}
            maxLength={160}
            autoComplete="off"
            helper="Oficina/prestador (opcional)."
          />

          {/* Seção: Próxima manutenção (por tempo). Por-KM (hodômetro-alvo) é PR-16 — não há campo de KM aqui. */}
          <h3 style={sectionTitleStyle}>Próxima manutenção</h3>

          <Field
            id={FIELD_ID.nextDueAt}
            label="Data da próxima manutenção"
            type="date"
            value={nextDueAt}
            onChange={setNextDueAt}
            error={fieldErrors.nextDueAt}
            helper="Ao salvar com data, um lembrete privado é agendado para a próxima manutenção."
          />
        </div>

        {isEdit && order ? (
          <MaintenanceItemsSection
            items={items}
            totals={totals}
            loading={itemsLoading}
            error={itemsError}
            canEdit={canEditItems}
            busyItemId={busyItemId}
            onAdd={openAddItem}
            onEditItem={openEditItem}
            onRemoveItem={(item) => void handleRemoveItem(item)}
            onPrint={() => setPrintOpen(true)}
          />
        ) : null}

        {isEdit && order ? (
          <div style={{ marginTop: "var(--space-16)" }}>
            <PayableToggle
              mode="edit"
              module="maintenance-orders"
              id={order.id}
              canLaunch={canLaunchPayable}
              canRemove={canRemovePayable}
              defaults={{ partyName: order.supplier ?? "Fornecedor", amount: payableAmount }}
            />
          </div>
        ) : null}

        <footer style={footerStyle}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Registrar manutenção"}
          </Button>
        </footer>
        </form>
      )}

      {itemModalOpen && order ? (
        <MaintenanceItemModal
          key={editingItem?.id ?? `new-${itemModalKey}`}
          item={editingItem}
          saving={itemSaving}
          serverError={itemError}
          onSubmit={(payload, continueAdding) => void handleItemSubmit(payload, continueAdding)}
          onClose={closeItemModal}
        />
      ) : null}

      {printOpen && order ? (
        <PrintMaintenanceOrderModal
          order={order}
          items={items}
          totals={totals}
          vehicleLabel={vehicleLabel}
          onClose={() => setPrintOpen(false)}
        />
      ) : null}
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

function focusField(field: MaintenanceOrderField) {
  if (typeof document === "undefined" || typeof document.getElementById !== "function") return;
  const element = document.getElementById(FIELD_ID[field]);
  if (element && typeof (element as HTMLElement).focus === "function") {
    (element as HTMLElement).focus();
  }
}
