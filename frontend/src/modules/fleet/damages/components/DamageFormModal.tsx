import { ImagePlus } from "lucide-react";
import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";

import { Alert, Button, Chip, Input, Modal, Select } from "../../../../components/ui";
import type { Vehicle } from "../../../registry/vehicles/vehicles.types";
import type { WorkOrderListItem } from "../../../work-orders/work-orders.types";
import {
  DAMAGE_GRAVIDADE_OPTIONS,
  getDamageStatusLabel,
  getDamageStatusTone,
  interpretDamageSubmitError,
  parsePtBrNumber,
  validateDamage,
} from "../damages.adapter";
import { createDamage, updateDamage } from "../damages.service";
import type {
  Damage,
  DamageApiContext,
  DamageCreatePayload,
  DamageDraft,
  DamageField,
  DamageGravidade,
} from "../damages.types";

const FIELD_ID: Record<string, string> = {
  vehicleId: "damage-field-vehicle",
  gravidade: "damage-field-gravidade",
  data: "damage-field-data",
  descricao: "damage-field-descricao",
  workOrderId: "damage-field-work-order",
  custoEstimado: "damage-field-custo-estimado",
  custoReal: "damage-field-custo-real",
};

const gridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--space-12)" };
const fullWidth: CSSProperties = { gridColumn: "1 / -1" };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };
const readOnlyRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)" };
const mutedStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)" };
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

// ISO/date -> valor de <input type="date"> (YYYY-MM-DD).
function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const trimmed = iso.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function DamageFormModal({
  damage,
  vehicles,
  workOrders,
  context,
  onClose,
  onSaved,
}: {
  readonly damage: Damage | null;
  readonly vehicles: readonly Vehicle[];
  readonly workOrders: readonly WorkOrderListItem[];
  readonly context: DamageApiContext;
  readonly onClose: () => void;
  readonly onSaved: (saved?: Damage) => void;
}) {
  const isEdit = Boolean(damage);
  const [vehicleId, setVehicleId] = useState(damage?.vehicleId ?? "");
  const [gravidade, setGravidade] = useState<DamageGravidade | "">(damage?.gravidade ?? "");
  const [data, setData] = useState(toDateInputValue(damage?.data));
  const [descricao, setDescricao] = useState(damage?.descricao ?? "");
  const [workOrderId, setWorkOrderId] = useState(damage?.workOrderId ?? "");
  const [custoEstimado, setCustoEstimado] = useState(
    damage?.custoEstimado != null ? damage.custoEstimado.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "",
  );
  const [custoReal, setCustoReal] = useState(
    damage?.custoReal != null ? damage.custoReal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "",
  );
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<DamageField, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function buildDraft(): DamageDraft {
    return {
      vehicleId: vehicleId.trim(),
      gravidade,
      data: data.trim(),
      descricao: descricao.trim(),
      workOrderId: workOrderId.trim() || undefined,
      custoEstimado: parsePtBrNumber(custoEstimado),
      custoReal: parsePtBrNumber(custoReal),
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const draft = buildDraft();
    const errors = validateDamage(draft);
    if (errors.length > 0) {
      setFieldErrors(Object.fromEntries(errors.map((error) => [error.field, error.message])) as Partial<Record<DamageField, string>>);
      focusField(errors[0].field);
      return;
    }
    setFieldErrors({});

    const payload: DamageCreatePayload = {
      vehicleId: draft.vehicleId,
      gravidade: draft.gravidade as DamageGravidade,
      data: draft.data,
      descricao: draft.descricao,
      workOrderId: draft.workOrderId,
      custoEstimado: draft.custoEstimado,
      custoReal: draft.custoReal,
    };

    setSaving(true);
    try {
      if (isEdit && damage) {
        const updated = await updateDamage(context, damage.id, payload);
        onSaved(updated ?? undefined);
      } else {
        const created = await createDamage(context, payload);
        onSaved(created ?? undefined);
      }
    } catch (error) {
      // 400 invalid_vehicle_reference → sob a Viatura; invalid_work_order_reference → sob a OS. Sempre acompanha Alerta.
      const feedback = interpretDamageSubmitError(error, "form");
      if (feedback.field) {
        setFieldErrors((prev) => ({ ...prev, [feedback.field as DamageField]: feedback.message }));
        focusField(feedback.field as DamageField);
      }
      setServerError(feedback.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Editar dano" : "Registrar dano"} open onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <Alert title="Não foi possível salvar" tone="danger">
            {serverError}
          </Alert>
        ) : null}

        {isEdit && damage ? (
          <div style={{ ...fullWidth, marginBottom: "var(--space-12)" }}>
            <span style={mutedStyle}>Situação atual</span>
            <div style={readOnlyRowStyle}>
              <Chip tone={getDamageStatusTone(damage.status)}>{getDamageStatusLabel(damage.status)}</Chip>
              <span style={mutedStyle}>Avance a situação pelas ações da linha.</span>
            </div>
          </div>
        ) : null}

        <div style={gridStyle}>
          <div>
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
              id={FIELD_ID.gravidade}
              label="Gravidade *"
              value={gravidade}
              aria-required
              aria-invalid={fieldErrors.gravidade ? true : undefined}
              aria-describedby={fieldErrors.gravidade ? `${FIELD_ID.gravidade}-error` : undefined}
              onChange={(event) => setGravidade(event.target.value as DamageGravidade | "")}
            >
              <option value="">Selecione a gravidade…</option>
              {DAMAGE_GRAVIDADE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            {fieldErrors.gravidade ? (
              <small className="form-error" id={`${FIELD_ID.gravidade}-error`}>
                {fieldErrors.gravidade}
              </small>
            ) : null}
          </div>

          <Field
            id={FIELD_ID.data}
            label="Data do dano"
            required
            type="date"
            value={data}
            onChange={setData}
            error={fieldErrors.data}
            helper="Data em que o dano foi identificado."
          />

          <div>
            <Select
              id={FIELD_ID.workOrderId}
              label="OS de origem"
              value={workOrderId}
              aria-invalid={fieldErrors.workOrderId ? true : undefined}
              aria-describedby={fieldErrors.workOrderId ? `${FIELD_ID.workOrderId}-error` : undefined}
              onChange={(event) => setWorkOrderId(event.target.value)}
            >
              <option value="">Sem OS de origem</option>
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

          <Field
            id={FIELD_ID.custoEstimado}
            label="Custo estimado (R$)"
            value={custoEstimado}
            onChange={setCustoEstimado}
            error={fieldErrors.custoEstimado}
            maxLength={16}
            inputMode="decimal"
            helper="Opcional. Ex.: 1.200,00"
          />

          <Field
            id={FIELD_ID.custoReal}
            label="Custo real (R$)"
            value={custoReal}
            onChange={setCustoReal}
            error={fieldErrors.custoReal}
            maxLength={16}
            inputMode="decimal"
            helper="Opcional. Preencha após o reparo."
          />

          <div style={fullWidth}>
            <label className="ui-field">
              <span>Descrição *</span>
              <textarea
                id={FIELD_ID.descricao}
                className="ui-input"
                style={{ minHeight: 96, padding: "var(--space-10)", resize: "vertical" }}
                rows={4}
                value={descricao}
                maxLength={2000}
                aria-required
                aria-invalid={fieldErrors.descricao ? true : undefined}
                aria-describedby={fieldErrors.descricao ? `${FIELD_ID.descricao}-error` : undefined}
                onChange={(event) => setDescricao(event.target.value)}
              />
              <small>Descreva o dano, a parte da viatura e as circunstâncias.</small>
            </label>
            {fieldErrors.descricao ? (
              <small className="form-error" id={`${FIELD_ID.descricao}-error`}>
                {fieldErrors.descricao}
              </small>
            ) : null}
          </div>

          {!isEdit ? (
            <p style={noteStyle}>
              <ImagePlus size={16} aria-hidden /> Salve o dano primeiro para anexar fotos. As fotos ficam disponíveis em “Detalhes”.
            </p>
          ) : null}
        </div>

        <footer style={footerStyle}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Registrar dano"}
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

function focusField(field: DamageField) {
  if (typeof document === "undefined" || typeof document.getElementById !== "function") return;
  const element = document.getElementById(FIELD_ID[field]);
  if (element && typeof (element as HTMLElement).focus === "function") {
    (element as HTMLElement).focus();
  }
}
