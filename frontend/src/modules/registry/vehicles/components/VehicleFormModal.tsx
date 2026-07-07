import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";

import { Alert, Button, Checkbox, Input, Modal, Select } from "../../../../components/ui";
import { VEHICLE_STATUS_OPTIONS, validateVehicle } from "../vehicles.adapter";
import { createVehicle, updateVehicle } from "../vehicles.service";
import type { Vehicle, VehicleCreatePayload, VehicleField, VehiclesApiContext } from "../vehicles.types";

const FIELD_ID: Record<string, string> = {
  plate: "vehicle-field-plate",
  model: "vehicle-field-model",
  type: "vehicle-field-type",
  year: "vehicle-field-year",
  status: "vehicle-field-status",
  notes: "vehicle-field-notes",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "var(--space-12)",
};

const fullWidth: CSSProperties = { gridColumn: "1 / -1" };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };

export function VehicleFormModal({
  vehicle,
  context,
  onClose,
  onSaved,
}: {
  readonly vehicle: Vehicle | null;
  readonly context: VehiclesApiContext;
  readonly onClose: () => void;
  // B2: devolve o cadastro salvo para quem abriu o modal (ex.: seleção rápida na OS).
  // Callers legados (`() => void`) seguem válidos — o argumento extra é ignorado.
  readonly onSaved: (created?: Vehicle) => void;
}) {
  const isEdit = Boolean(vehicle);
  const [plate, setPlate] = useState(vehicle?.plate ?? "");
  const [model, setModel] = useState(vehicle?.model ?? "");
  const [type, setType] = useState(vehicle?.type ?? "");
  const [year, setYear] = useState(vehicle?.year ? String(vehicle.year) : "");
  const [status, setStatus] = useState(vehicle?.status && VEHICLE_STATUS_OPTIONS.some((o) => o.value === vehicle.status) ? vehicle.status : "active");
  const [notes, setNotes] = useState(vehicle?.notes ?? "");
  const [isActive, setIsActive] = useState(vehicle?.isActive ?? true);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<VehicleField, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function buildPayload(): VehicleCreatePayload {
    const trimmedYear = year.trim();
    return {
      plate: plate.trim(),
      model: model.trim(),
      type: type.trim() || undefined,
      year: trimmedYear ? Number(trimmedYear) : undefined,
      status: status.trim() || undefined,
      notes: notes.trim() || undefined,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const payload = buildPayload();
    const errors = validateVehicle(payload);
    if (errors.length > 0) {
      setFieldErrors(Object.fromEntries(errors.map((error) => [error.field, error.message])) as Partial<Record<VehicleField, string>>);
      focusField(errors[0].field);
      return;
    }
    setFieldErrors({});

    setSaving(true);
    try {
      if (isEdit && vehicle) {
        const updated = await updateVehicle(context, vehicle.id, { ...payload, isActive });
        onSaved(updated ?? undefined);
      } else {
        const created = await createVehicle(context, payload);
        onSaved(created ?? undefined);
      }
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Não foi possível salvar a viatura.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Editar viatura" : "Nova viatura"} open onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <Alert title="Não foi possível salvar" tone="danger">
            {serverError}
          </Alert>
        ) : null}

        <div style={gridStyle}>
          <Field id={FIELD_ID.plate} label="Placa" required value={plate} onChange={(next) => setPlate(next.toUpperCase())} error={fieldErrors.plate} maxLength={10} autoComplete="off" />
          <Field id={FIELD_ID.model} label="Modelo" required value={model} onChange={setModel} error={fieldErrors.model} maxLength={120} autoComplete="off" />
          <Field id={FIELD_ID.type} label="Tipo" value={type} onChange={setType} error={fieldErrors.type} maxLength={60} />
          <Field id={FIELD_ID.year} label="Ano" value={year} onChange={setYear} error={fieldErrors.year} maxLength={4} inputMode="numeric" />
          <div>
            <Select
              id={FIELD_ID.status}
              label="Situação operacional"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              {VEHICLE_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          {isEdit ? (
            <div style={fullWidth}>
              <Checkbox label="Viatura ativa" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            </div>
          ) : null}
          <label className="ui-field" style={fullWidth}>
            <span>Observações</span>
            <textarea
              id={FIELD_ID.notes}
              className="ui-input"
              style={{ minHeight: 92, padding: "var(--space-10)", resize: "vertical" }}
              rows={3}
              value={notes}
              maxLength={2000}
              onChange={(event) => setNotes(event.target.value)}
              aria-invalid={fieldErrors.notes ? true : undefined}
              aria-describedby={fieldErrors.notes ? `${FIELD_ID.notes}-error` : undefined}
            />
            {fieldErrors.notes ? (
              <small className="form-error" id={`${FIELD_ID.notes}-error`}>
                {fieldErrors.notes}
              </small>
            ) : null}
          </label>
        </div>

        <footer style={footerStyle}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar viatura"}
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
  autoComplete,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string;
  readonly required?: boolean;
  readonly type?: string;
  readonly maxLength?: number;
  readonly inputMode?: "numeric" | "tel";
  readonly autoComplete?: string;
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

function focusField(field: VehicleField) {
  if (typeof document === "undefined" || typeof document.getElementById !== "function") return;
  const element = document.getElementById(FIELD_ID[field]);
  if (element && typeof (element as HTMLElement).focus === "function") {
    (element as HTMLElement).focus();
  }
}
