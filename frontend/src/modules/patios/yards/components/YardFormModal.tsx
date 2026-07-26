import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";

import { Alert, Button, Checkbox, Input, Modal } from "../../../../components/ui";
import { ApiError } from "../../../../services/api/client";
import { validateYard } from "../yards.adapter";
import { createYard, updateYard } from "../yards.service";
import type { YardCreatePayload, YardField, YardItem, YardsApiContext } from "../yards.types";

const DEFAULT_TIMEZONE = "America/Sao_Paulo";

const FIELD_ID: Record<string, string> = {
  name: "yard-field-name",
  address: "yard-field-address",
  timezone: "yard-field-timezone",
  capacityHint: "yard-field-capacity",
};

const gridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--space-12)" };
const fullWidth: CSSProperties = { gridColumn: "1 / -1" };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };

export function YardFormModal({
  yard,
  context,
  onClose,
  onSaved,
}: {
  readonly yard: YardItem | null;
  readonly context: YardsApiContext;
  readonly onClose: () => void;
  readonly onSaved: (saved?: YardItem) => void;
}) {
  const isEdit = Boolean(yard);
  const [name, setName] = useState(yard?.name ?? "");
  const [address, setAddress] = useState(yard?.address ?? "");
  const [timezone, setTimezone] = useState(yard?.timezone ?? DEFAULT_TIMEZONE);
  const [capacityHint, setCapacityHint] = useState(yard?.capacityHint != null ? String(yard.capacityHint) : "");
  const [active, setActive] = useState(yard?.active ?? true);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<YardField, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function buildPayload(): YardCreatePayload {
    return {
      name: name.trim(),
      address: address.trim(),
      timezone: timezone.trim() || DEFAULT_TIMEZONE,
      capacityHint: capacityHint.trim() ? Number(capacityHint.trim()) : undefined,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const payload = buildPayload();
    const errors = validateYard(payload);
    if (errors.length > 0) {
      setFieldErrors(Object.fromEntries(errors.map((error) => [error.field, error.message])) as Partial<Record<YardField, string>>);
      focusField(errors[0].field);
      return;
    }
    setFieldErrors({});

    setSaving(true);
    try {
      if (isEdit && yard) {
        const updated = await updateYard(context, yard.id, {
          name: payload.name,
          address: payload.address,
          timezone: payload.timezone,
          capacityHint: capacityHint.trim() ? Number(capacityHint.trim()) : null,
          active,
        });
        onSaved(updated ?? undefined);
      } else {
        const created = await createYard(context, payload);
        onSaved(created ?? undefined);
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setServerError("Já existe um pátio com estes dados nesta organização.");
      } else {
        setServerError(error instanceof Error ? error.message : "Não foi possível salvar o pátio.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Editar pátio" : "Novo pátio"} open onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <Alert title="Não foi possível salvar" tone="danger">
            {serverError}
          </Alert>
        ) : null}

        <div style={gridStyle}>
          <div style={fullWidth}>
            <Field id={FIELD_ID.name} label="Nome" required value={name} onChange={setName} error={fieldErrors.name} maxLength={160} autoComplete="off" helper="Ex.: Pátio Central" />
          </div>
          <div style={fullWidth}>
            <Field id={FIELD_ID.address} label="Endereço" required value={address} onChange={setAddress} error={fieldErrors.address} maxLength={240} autoComplete="off" helper="Ex.: Av. das Indústrias, 1000" />
          </div>
          <Field id={FIELD_ID.timezone} label="Fuso horário" value={timezone} onChange={setTimezone} error={fieldErrors.timezone} maxLength={64} autoComplete="off" helper="Base do cálculo de diárias. Ex.: America/Sao_Paulo" />
          <Field id={FIELD_ID.capacityHint} label="Capacidade prevista" value={capacityHint} onChange={setCapacityHint} error={fieldErrors.capacityHint} maxLength={7} inputMode="numeric" helper="Referência (a capacidade real é a soma das vagas)." />
          {isEdit ? (
            <div style={fullWidth}>
              <Checkbox label="Pátio ativo" checked={active} onChange={(event) => setActive(event.target.checked)} />
            </div>
          ) : null}
        </div>

        <footer style={footerStyle}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar pátio"}
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
  autoComplete,
  helper,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string;
  readonly required?: boolean;
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

function focusField(field: YardField) {
  if (typeof document === "undefined" || typeof document.getElementById !== "function") return;
  const element = document.getElementById(FIELD_ID[field]);
  if (element && typeof (element as HTMLElement).focus === "function") {
    (element as HTMLElement).focus();
  }
}
