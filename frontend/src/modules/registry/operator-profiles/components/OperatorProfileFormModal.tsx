import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";

import { Alert, Button, Checkbox, Input, Modal } from "../../../../components/ui";
import { ApiError } from "../../../../services/api/client";
import { validateOperatorProfile } from "../operator-profiles.adapter";
import { createOperatorProfile, updateOperatorProfile } from "../operator-profiles.service";
import type { OperatorProfileCreatePayload, OperatorProfileField, OperatorProfileItem, OperatorProfilesApiContext } from "../operator-profiles.types";

const FIELD_ID: Record<string, string> = {
  userId: "operator-profile-field-user-id",
  fullName: "operator-profile-field-full-name",
  cnhNumber: "operator-profile-field-cnh-number",
  cnhCategory: "operator-profile-field-cnh-category",
  cnhExpiresAt: "operator-profile-field-cnh-expires-at",
  phone: "operator-profile-field-phone",
  notes: "operator-profile-field-notes",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "var(--space-12)",
};

const fullWidth: CSSProperties = { gridColumn: "1 / -1" };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };

// Recorta uma data ISO ("2026-07-01T00:00:00.000Z") para o formato de <input type="date"> ("2026-07-01").
function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function OperatorProfileFormModal({
  profile,
  context,
  onClose,
  onSaved,
}: {
  readonly profile: OperatorProfileItem | null;
  readonly context: OperatorProfilesApiContext;
  readonly onClose: () => void;
  readonly onSaved: (saved?: OperatorProfileItem) => void;
}) {
  const isEdit = Boolean(profile);
  // O `userId` é a chave natural (1-1) e é IMUTÁVEL: na edição fica desabilitado e FORA do payload
  // PATCH (lição do veto B2 de Tarifas — enviá-lo dava falso sucesso). Para trocar, crie outro perfil.
  const [userId, setUserId] = useState(profile?.userId ?? "");
  const [fullName, setFullName] = useState(profile?.fullName ?? "");
  const [cnhNumber, setCnhNumber] = useState(profile?.cnhNumber ?? "");
  const [cnhCategory, setCnhCategory] = useState(profile?.cnhCategory ?? "");
  const [cnhExpiresAt, setCnhExpiresAt] = useState(toDateInput(profile?.cnhExpiresAt));
  const [trackingConsent, setTrackingConsent] = useState(profile?.trackingConsent ?? false);
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [notes, setNotes] = useState(profile?.notes ?? "");
  const [isActive, setIsActive] = useState(profile?.isActive ?? true);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<OperatorProfileField, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function buildPayload(): OperatorProfileCreatePayload {
    return {
      userId: userId.trim(),
      fullName: fullName.trim() || undefined,
      cnhNumber: cnhNumber.trim() || undefined,
      cnhCategory: cnhCategory.trim().toUpperCase() || undefined,
      cnhExpiresAt: cnhExpiresAt.trim() || undefined,
      trackingConsent,
      phone: phone.trim() || undefined,
      notes: notes.trim() || undefined,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const payload = buildPayload();
    const errors = validateOperatorProfile(payload);
    if (errors.length > 0) {
      setFieldErrors(Object.fromEntries(errors.map((error) => [error.field, error.message])) as Partial<Record<OperatorProfileField, string>>);
      focusField(errors[0].field);
      return;
    }
    setFieldErrors({});

    setSaving(true);
    try {
      if (isEdit && profile) {
        // `userId` é imutável no backend — na edição ele fica FORA do payload PATCH.
        const { userId: _userId, ...editable } = payload;
        const updated = await updateOperatorProfile(context, profile.id, { ...editable, isActive });
        onSaved(updated ?? undefined);
      } else {
        const created = await createOperatorProfile(context, payload);
        onSaved(created ?? undefined);
      }
    } catch (error) {
      // Erros de domínio do contrato → mensagens PT-BR específicas (linguagem de negócio).
      if (error instanceof ApiError && error.status === 409) {
        setServerError("Este usuário já tem um perfil profissional.");
      } else if (error instanceof ApiError && error.status === 400) {
        setServerError("Usuário não encontrado nesta organização.");
      } else {
        setServerError(error instanceof Error ? error.message : "Não foi possível salvar o profissional.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Editar profissional" : "Novo profissional"} open onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <Alert title="Não foi possível salvar" tone="danger">
            {serverError}
          </Alert>
        ) : null}

        <div style={gridStyle}>
          <div style={fullWidth}>
            <Field
              id={FIELD_ID.userId}
              label="Usuário"
              required
              value={userId}
              onChange={setUserId}
              error={fieldErrors.userId}
              maxLength={64}
              autoComplete="off"
              disabled={isEdit}
              helper={isEdit ? "Fixo após a criação — para trocar, crie outro perfil." : "ID do usuário na organização."}
            />
          </div>

          <div style={fullWidth}>
            <Field id={FIELD_ID.fullName} label="Nome" value={fullName} onChange={setFullName} error={fieldErrors.fullName} maxLength={160} autoComplete="off" helper="Opcional. Nome do profissional." />
          </div>

          <Field id={FIELD_ID.cnhNumber} label="Número da CNH" value={cnhNumber} onChange={setCnhNumber} error={fieldErrors.cnhNumber} maxLength={20} inputMode="numeric" autoComplete="off" />
          <Field id={FIELD_ID.cnhCategory} label="Categoria da CNH" value={cnhCategory} onChange={setCnhCategory} error={fieldErrors.cnhCategory} maxLength={8} autoComplete="off" helper="Ex.: B, D, AE" />
          <Field id={FIELD_ID.cnhExpiresAt} label="Validade da CNH" type="date" value={cnhExpiresAt} onChange={setCnhExpiresAt} error={fieldErrors.cnhExpiresAt} />
          <Field id={FIELD_ID.phone} label="Telefone" value={phone} onChange={setPhone} error={fieldErrors.phone} maxLength={20} inputMode="tel" autoComplete="off" />

          <div style={fullWidth}>
            <Checkbox
              label="Operador consentiu com o rastreamento de localização"
              checked={trackingConsent}
              onChange={(event) => setTrackingConsent(event.target.checked)}
            />
            <small style={{ display: "block", marginTop: "var(--space-4)", color: "var(--text-secondary)" }}>
              Registro do consentimento do próprio operador (LGPD). Marque apenas quando houver consentimento efetivo.
            </small>
          </div>

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

          {isEdit ? (
            <div style={fullWidth}>
              <Checkbox label="Profissional ativo" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            </div>
          ) : null}
        </div>

        <footer style={footerStyle}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar profissional"}
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
  disabled,
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
  readonly helper?: string;
  readonly disabled?: boolean;
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
        disabled={disabled}
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

function focusField(field: OperatorProfileField) {
  if (typeof document === "undefined" || typeof document.getElementById !== "function") return;
  const element = document.getElementById(FIELD_ID[field]);
  if (element && typeof (element as HTMLElement).focus === "function") {
    (element as HTMLElement).focus();
  }
}
