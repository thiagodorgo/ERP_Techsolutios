import type { CSSProperties, FormEvent } from "react";
import { useMemo, useState } from "react";

import { Alert, Button, Input, Modal, Select } from "../../../components/ui";
import { USER_ROLE_OPTIONS, interpretUserSubmitError, roleLabel, validateUser } from "../users.adapter";
import { createUser, updateUser } from "../users.service";
import type { User, UserField, UsersApiContext, UserWritableStatus } from "../users.types";

const FIELD_ID: Record<string, string> = {
  name: "user-field-name",
  email: "user-field-email",
  roles: "user-field-roles",
  status: "user-field-status",
};

const gridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--space-12)" };
const fullWidth: CSSProperties = { gridColumn: "1 / -1" };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };
const hintStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)" };
const fieldsetStyle: CSSProperties = { border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-6)", padding: "var(--space-10)", margin: 0 };
const legendStyle: CSSProperties = { fontSize: "var(--text-sm)", fontWeight: 700, padding: "0 var(--space-6)" };
const roleGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "var(--space-6)", marginTop: "var(--space-6)" };
// Alvo de toque ≥44px (a11y).
const roleOptionStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)", minHeight: 44, cursor: "pointer" };

export function UserFormModal({
  user,
  context,
  onClose,
  onSaved,
}: {
  readonly user: User | null;
  readonly context: UsersApiContext;
  readonly onClose: () => void;
  readonly onSaved: (saved?: User) => void;
}) {
  const isEdit = Boolean(user);
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [roles, setRoles] = useState<string[]>(user?.roles ?? []);
  const [status, setStatus] = useState<UserWritableStatus>(user?.status === "inactive" ? "inactive" : "active");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<UserField, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Opções = papéis canônicos + eventuais papéis já atribuídos ao usuário fora da lista padrão
  // (para não descartá-los silenciosamente ao editar).
  const roleOptions = useMemo(() => {
    const options = [...USER_ROLE_OPTIONS];
    for (const role of user?.roles ?? []) {
      if (!options.some((option) => option.value === role)) options.push({ value: role, label: roleLabel(role) });
    }
    return options;
  }, [user]);

  function toggleRole(role: string) {
    setRoles((current) => (current.includes(role) ? current.filter((value) => value !== role) : [...current, role]));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const draft = { name: name.trim(), email: email.trim(), roles };
    const errors = validateUser(draft, { isEdit });
    if (errors.length > 0) {
      setFieldErrors(Object.fromEntries(errors.map((error) => [error.field, error.message])) as Partial<Record<UserField, string>>);
      focusField(errors[0].field);
      return;
    }
    setFieldErrors({});

    setSaving(true);
    try {
      if (isEdit && user) {
        const updated = await updateUser(context, user.id, { name: draft.name, roles: draft.roles, status });
        onSaved(updated ?? undefined);
      } else {
        const created = await createUser(context, { name: draft.name, email: draft.email, roles: draft.roles, status });
        onSaved(created ?? undefined);
      }
    } catch (error) {
      // 400 invalid_role → sob o campo Papéis; 404 → Alerta. Foca o primeiro campo inválido.
      const feedback = interpretUserSubmitError(error, isEdit ? "update" : "create");
      if (feedback.field) {
        setFieldErrors((prev) => ({ ...prev, [feedback.field as UserField]: feedback.message }));
        focusField(feedback.field as UserField);
      }
      setServerError(feedback.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Editar usuário" : "Novo usuário"} open onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <Alert title="Não foi possível salvar" tone="danger">
            {serverError}
          </Alert>
        ) : null}

        <div style={gridStyle}>
          <Field id={FIELD_ID.name} label="Nome" required value={name} onChange={setName} error={fieldErrors.name} maxLength={160} autoComplete="off" />
          <Field
            id={FIELD_ID.email}
            label="E-mail"
            required
            type="email"
            value={email}
            onChange={setEmail}
            error={fieldErrors.email}
            maxLength={254}
            autoComplete="off"
            disabled={isEdit}
            helper={isEdit ? "O e-mail não pode ser alterado." : undefined}
          />

          <fieldset
            style={{ ...fieldsetStyle, ...fullWidth }}
            aria-invalid={fieldErrors.roles ? true : undefined}
            aria-describedby={fieldErrors.roles ? `${FIELD_ID.roles}-error` : undefined}
          >
            <legend style={legendStyle}>Papéis *</legend>
            <div style={roleGridStyle}>
              {roleOptions.map((option, index) => (
                <label key={option.value} style={roleOptionStyle}>
                  <input
                    id={index === 0 ? FIELD_ID.roles : undefined}
                    type="checkbox"
                    checked={roles.includes(option.value)}
                    onChange={() => toggleRole(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
            {fieldErrors.roles ? (
              <small className="form-error" id={`${FIELD_ID.roles}-error`}>
                {fieldErrors.roles}
              </small>
            ) : (
              <small style={hintStyle}>Selecione um ou mais perfis de acesso.</small>
            )}
          </fieldset>

          <div>
            <Select
              id={FIELD_ID.status}
              label="Situação"
              value={status}
              onChange={(event) => setStatus(event.target.value === "inactive" ? "inactive" : "active")}
            >
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </Select>
            {fieldErrors.status ? (
              <small className="form-error" id={`${FIELD_ID.status}-error`}>
                {fieldErrors.status}
              </small>
            ) : null}
          </div>
        </div>

        <footer style={footerStyle}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar usuário"}
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
  autoComplete,
  disabled,
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
  readonly autoComplete?: string;
  readonly disabled?: boolean;
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
        autoComplete={autoComplete}
        disabled={disabled}
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

function focusField(field: UserField) {
  if (typeof document === "undefined" || typeof document.getElementById !== "function") return;
  const element = document.getElementById(FIELD_ID[field]);
  if (element && typeof (element as HTMLElement).focus === "function") {
    (element as HTMLElement).focus();
  }
}
