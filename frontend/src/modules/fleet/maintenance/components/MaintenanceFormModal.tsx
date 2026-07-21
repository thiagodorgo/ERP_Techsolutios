import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";

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
import { createMaintenanceOrder, updateMaintenanceOrder } from "../maintenance-orders.service";
import type {
  MaintenanceOrder,
  MaintenanceOrderCreatePayload,
  MaintenanceOrderDraft,
  MaintenanceOrderField,
  MaintenanceOrdersApiContext,
  MaintenanceType,
} from "../maintenance-orders.types";

const FIELD_ID: Record<string, string> = {
  vehicleId: "maintenance-field-vehicle",
  type: "maintenance-field-type",
  description: "maintenance-field-description",
  scheduledFor: "maintenance-field-scheduled-for",
  odometer: "maintenance-field-odometer",
  supplier: "maintenance-field-supplier",
};

const gridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--space-12)" };
const fullWidth: CSSProperties = { gridColumn: "1 / -1" };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };
const readOnlyRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)" };
const mutedStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)" };

// ISO -> valor de <input type="datetime-local"> (YYYY-MM-DDTHH:mm) na hora local.
function toDateTimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<MaintenanceOrderField, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function buildDraft(): MaintenanceOrderDraft {
    return {
      vehicleId: vehicleId.trim(),
      type,
      description: description.trim(),
      // datetime-local não carrega fuso; convertemos para ISO na fronteira.
      scheduledFor: scheduledFor.trim() ? new Date(scheduledFor).toISOString() : undefined,
      odometer: parseIntStrict(odometer),
      supplier: supplier.trim() || undefined,
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

  const selectedVehicle = order ? vehicles.find((vehicle) => vehicle.id === order.vehicleId) : undefined;
  const attachmentSummary = order
    ? [
        { label: "Data e Hora", value: formatMaintenanceDate(order.scheduledFor) },
        { label: "Tipo", value: getMaintenanceTypeLabel(order.type) },
        { label: "Objeto", value: selectedVehicle ? `${selectedVehicle.plate}${selectedVehicle.model ? ` — ${selectedVehicle.model}` : ""}` : "—" },
        { label: "Situação", value: getMaintenanceStatusLabel(order.status) },
      ]
    : [];

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
        </div>

        {isEdit && order ? (
          <div style={{ marginTop: "var(--space-16)" }}>
            <PayableToggle
              mode="edit"
              module="maintenance-orders"
              id={order.id}
              canLaunch={canLaunchPayable}
              canRemove={canRemovePayable}
              defaults={{ partyName: order.supplier ?? "Fornecedor", amount: order.cost ?? undefined }}
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
