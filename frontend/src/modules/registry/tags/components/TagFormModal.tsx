import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";

import { Alert, Button, Checkbox, Input, Modal } from "../../../../components/ui";
import { ApiError } from "../../../../services/api/client";
import { normalizeHexColor, validateTag } from "../tags.adapter";
import { createTag, updateTag } from "../tags.service";
import type { TagCreatePayload, TagField, TagItem, TagsApiContext } from "../tags.types";

const FIELD_ID: Record<string, string> = {
  name: "tag-field-name",
  color: "tag-field-color",
  description: "tag-field-description",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "var(--space-12)",
};

const fullWidth: CSSProperties = { gridColumn: "1 / -1" };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };
const colorRowStyle: CSSProperties = { display: "flex", alignItems: "flex-end", gap: "var(--space-8)" };
const swatchStyle: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: "var(--radius-md, 8px)",
  border: "1px solid rgba(15, 23, 42, .18)",
  flexShrink: 0,
};
const pickerStyle: CSSProperties = { width: 44, height: 36, padding: 0, border: "1px solid var(--border-subtle, #E2E8F0)", borderRadius: "var(--radius-md, 8px)", background: "none", cursor: "pointer" };

export function TagFormModal({
  tag,
  context,
  onClose,
  onSaved,
}: {
  readonly tag: TagItem | null;
  readonly context: TagsApiContext;
  readonly onClose: () => void;
  readonly onSaved: (saved?: TagItem) => void;
}) {
  const isEdit = Boolean(tag);
  // O NOME é a chave natural do 409, mas o backend aceita renomear — na edição ele
  // permanece EDITÁVEL (diferente do `code` de Filiais, que é imutável).
  const [name, setName] = useState(tag?.name ?? "");
  const [color, setColor] = useState(tag?.color ?? "");
  const [description, setDescription] = useState(tag?.description ?? "");
  const [isActive, setIsActive] = useState(tag?.isActive ?? true);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<TagField, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const normalizedColor = normalizeHexColor(color);
  const pickerValue = normalizedColor ?? "#3b82f6";

  function buildPayload(): TagCreatePayload {
    return {
      name: name.trim(),
      // Envia a cor normalizada (`#rrggbb`) quando válida; vazio → sem cor.
      color: normalizeHexColor(color) ?? undefined,
      description: description.trim() || undefined,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const payload = buildPayload();
    const errors = validateTag(payload);
    if (errors.length > 0) {
      setFieldErrors(Object.fromEntries(errors.map((error) => [error.field, error.message])) as Partial<Record<TagField, string>>);
      focusField(errors[0].field);
      return;
    }
    setFieldErrors({});

    setSaving(true);
    try {
      if (isEdit && tag) {
        const updated = await updateTag(context, tag.id, { ...payload, isActive });
        onSaved(updated ?? undefined);
      } else {
        const created = await createTag(context, payload);
        onSaved(created ?? undefined);
      }
    } catch (error) {
      // 409 = nome duplicado (chave natural por organização) — mensagem específica PT-BR.
      if (error instanceof ApiError && error.status === 409) {
        setServerError("Já existe uma etiqueta com este nome nesta organização.");
      } else {
        setServerError(error instanceof Error ? error.message : "Não foi possível salvar a etiqueta.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Editar etiqueta" : "Nova etiqueta"} open onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <Alert title="Não foi possível salvar" tone="danger">
            {serverError}
          </Alert>
        ) : null}

        <div style={gridStyle}>
          <div style={fullWidth}>
            <Field id={FIELD_ID.name} label="Nome" required value={name} onChange={setName} error={fieldErrors.name} maxLength={120} autoComplete="off" helper="Nome único da etiqueta na organização." />
          </div>

          <div style={fullWidth}>
            <div style={colorRowStyle}>
              <div style={{ flex: 1 }}>
                <Field
                  id={FIELD_ID.color}
                  label="Cor"
                  value={color}
                  onChange={setColor}
                  error={fieldErrors.color}
                  maxLength={9}
                  autoComplete="off"
                  helper="Hexadecimal. Ex.: #3B82F6"
                />
              </div>
              <label className="ui-field" style={{ width: 44 }} aria-label="Selecionar cor">
                <span style={{ height: 0, overflow: "hidden" }}>Seletor de cor</span>
                <input
                  type="color"
                  style={pickerStyle}
                  value={pickerValue}
                  aria-label="Seletor de cor"
                  onChange={(event) => setColor(event.target.value)}
                />
              </label>
              <span aria-hidden style={{ ...swatchStyle, background: normalizedColor ?? "transparent" }} />
            </div>
          </div>

          <label className="ui-field" style={fullWidth}>
            <span>Descrição</span>
            <textarea
              id={FIELD_ID.description}
              className="ui-input"
              style={{ minHeight: 92, padding: "var(--space-10)", resize: "vertical" }}
              rows={3}
              value={description}
              maxLength={500}
              onChange={(event) => setDescription(event.target.value)}
              aria-invalid={fieldErrors.description ? true : undefined}
              aria-describedby={fieldErrors.description ? `${FIELD_ID.description}-error` : undefined}
            />
            {fieldErrors.description ? (
              <small className="form-error" id={`${FIELD_ID.description}-error`}>
                {fieldErrors.description}
              </small>
            ) : null}
          </label>

          {isEdit ? (
            <div style={fullWidth}>
              <Checkbox label="Etiqueta ativa" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            </div>
          ) : null}
        </div>

        <footer style={footerStyle}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar etiqueta"}
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

function focusField(field: TagField) {
  if (typeof document === "undefined" || typeof document.getElementById !== "function") return;
  const element = document.getElementById(FIELD_ID[field]);
  if (element && typeof (element as HTMLElement).focus === "function") {
    (element as HTMLElement).focus();
  }
}
