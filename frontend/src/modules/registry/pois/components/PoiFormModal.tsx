import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";

import { Alert, Button, Checkbox, Input, Modal } from "../../../../components/ui";
import { ApiError } from "../../../../services/api/client";
import { validatePoi } from "../pois.adapter";
import { createPoi, updatePoi } from "../pois.service";
import type { PoiCreatePayload, PoiField, PoiItem, PoisApiContext } from "../pois.types";

const FIELD_ID: Record<string, string> = {
  name: "poi-field-name",
  category: "poi-field-category",
  latitude: "poi-field-latitude",
  longitude: "poi-field-longitude",
  address: "poi-field-address",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "var(--space-12)",
};

const fullWidth: CSSProperties = { gridColumn: "1 / -1" };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };

// Aceita vírgula ou ponto como separador decimal (usuário PT-BR pode digitar "-23,55052"); NaN quando vazio.
function parseCoordinate(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return Number.NaN;
  const direct = Number(trimmed);
  if (Number.isFinite(direct) && !trimmed.includes(",")) return direct;
  return Number(trimmed.replace(",", "."));
}

export function PoiFormModal({
  poi,
  context,
  onClose,
  onSaved,
}: {
  readonly poi: PoiItem | null;
  readonly context: PoisApiContext;
  readonly onClose: () => void;
  readonly onSaved: (saved?: PoiItem) => void;
}) {
  const isEdit = Boolean(poi);
  // O NOME é a chave natural do 409, mas o backend aceita renomear — na edição ele
  // permanece EDITÁVEL (diferente do `code` de Filiais, que é imutável).
  const [name, setName] = useState(poi?.name ?? "");
  const [category, setCategory] = useState(poi?.category ?? "");
  const [latitude, setLatitude] = useState(poi?.latitude != null ? String(poi.latitude) : "");
  const [longitude, setLongitude] = useState(poi?.longitude != null ? String(poi.longitude) : "");
  const [address, setAddress] = useState(poi?.address ?? "");
  const [isActive, setIsActive] = useState(poi?.isActive ?? true);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<PoiField, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function buildPayload(): PoiCreatePayload {
    return {
      name: name.trim(),
      latitude: parseCoordinate(latitude),
      longitude: parseCoordinate(longitude),
      category: category.trim() || undefined,
      address: address.trim() || undefined,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const payload = buildPayload();
    const errors = validatePoi(payload);
    if (errors.length > 0) {
      setFieldErrors(Object.fromEntries(errors.map((error) => [error.field, error.message])) as Partial<Record<PoiField, string>>);
      focusField(errors[0].field);
      return;
    }
    setFieldErrors({});

    setSaving(true);
    try {
      if (isEdit && poi) {
        const updated = await updatePoi(context, poi.id, { ...payload, isActive });
        onSaved(updated ?? undefined);
      } else {
        const created = await createPoi(context, payload);
        onSaved(created ?? undefined);
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        // 409 = nome duplicado (chave natural por organização).
        setServerError("Já existe um ponto de interesse com este nome nesta organização.");
      } else if (error instanceof ApiError && error.status === 400) {
        // 400 invalid_coordinate — o backend rejeitou latitude/longitude.
        setServerError("Coordenada inválida (verifique latitude/longitude).");
      } else {
        setServerError(error instanceof Error ? error.message : "Não foi possível salvar o ponto de interesse.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Editar ponto de interesse" : "Novo ponto de interesse"} open onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <Alert title="Não foi possível salvar" tone="danger">
            {serverError}
          </Alert>
        ) : null}

        <div style={gridStyle}>
          <div style={fullWidth}>
            <Field id={FIELD_ID.name} label="Nome" required value={name} onChange={setName} error={fieldErrors.name} maxLength={160} autoComplete="off" helper="Nome único do ponto na organização." />
          </div>
          <div style={fullWidth}>
            <Field id={FIELD_ID.category} label="Categoria" value={category} onChange={setCategory} error={fieldErrors.category} maxLength={80} autoComplete="off" helper="Ex.: Base, Pátio, Cliente" />
          </div>
          <Field
            id={FIELD_ID.latitude}
            label="Latitude"
            required
            type="number"
            value={latitude}
            onChange={setLatitude}
            error={fieldErrors.latitude}
            inputMode="decimal"
            step="any"
            min="-90"
            max="90"
            helper="Entre -90 e 90. Ex.: -23.55052"
          />
          <Field
            id={FIELD_ID.longitude}
            label="Longitude"
            required
            type="number"
            value={longitude}
            onChange={setLongitude}
            error={fieldErrors.longitude}
            inputMode="decimal"
            step="any"
            min="-180"
            max="180"
            helper="Entre -180 e 180. Ex.: -46.63331"
          />
          <div style={fullWidth}>
            <Field id={FIELD_ID.address} label="Endereço" value={address} onChange={setAddress} error={fieldErrors.address} maxLength={240} helper="Opcional. Endereço de referência do ponto." />
          </div>
          {isEdit ? (
            <div style={fullWidth}>
              <Checkbox label="Ponto ativo" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            </div>
          ) : null}
        </div>

        <footer style={footerStyle}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar ponto"}
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
  helper,
  step,
  min,
  max,
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
  readonly step?: string;
  readonly min?: string;
  readonly max?: string;
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
        step={step}
        min={min}
        max={max}
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

function focusField(field: PoiField) {
  if (typeof document === "undefined" || typeof document.getElementById !== "function") return;
  const element = document.getElementById(FIELD_ID[field]);
  if (element && typeof (element as HTMLElement).focus === "function") {
    (element as HTMLElement).focus();
  }
}
