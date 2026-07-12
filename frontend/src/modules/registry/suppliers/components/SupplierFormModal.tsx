import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";

import { Alert, Button, Checkbox, Input, Modal } from "../../../../components/ui";
import { ApiError } from "../../../../services/api/client";
import { validateSupplier } from "../suppliers.adapter";
import { createSupplier, updateSupplier } from "../suppliers.service";
import type { SupplierCreatePayload, SupplierField, SupplierItem, SuppliersApiContext } from "../suppliers.types";

const FIELD_ID: Record<string, string> = {
  name: "supplier-field-name",
  document: "supplier-field-document",
  email: "supplier-field-email",
  phone: "supplier-field-phone",
  address: "supplier-field-address",
  category: "supplier-field-category",
  notes: "supplier-field-notes",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "var(--space-12)",
};

const fullWidth: CSSProperties = { gridColumn: "1 / -1" };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };

export function SupplierFormModal({
  supplier,
  context,
  onClose,
  onSaved,
}: {
  readonly supplier: SupplierItem | null;
  readonly context: SuppliersApiContext;
  readonly onClose: () => void;
  readonly onSaved: (saved?: SupplierItem) => void;
}) {
  const isEdit = Boolean(supplier);
  // O NOME é a chave natural do 409, mas o backend aceita renomear — na edição ele
  // permanece EDITÁVEL (diferente do `code` de Filiais, que é imutável).
  const [name, setName] = useState(supplier?.name ?? "");
  const [documentValue, setDocumentValue] = useState(supplier?.document ?? "");
  const [email, setEmail] = useState(supplier?.email ?? "");
  const [phone, setPhone] = useState(supplier?.phone ?? "");
  const [address, setAddress] = useState(supplier?.address ?? "");
  const [category, setCategory] = useState(supplier?.category ?? "");
  const [notes, setNotes] = useState(supplier?.notes ?? "");
  const [isActive, setIsActive] = useState(supplier?.isActive ?? true);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<SupplierField, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function buildPayload(): SupplierCreatePayload {
    return {
      name: name.trim(),
      document: documentValue.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      category: category.trim() || undefined,
      notes: notes.trim() || undefined,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const payload = buildPayload();
    const errors = validateSupplier(payload);
    if (errors.length > 0) {
      setFieldErrors(Object.fromEntries(errors.map((error) => [error.field, error.message])) as Partial<Record<SupplierField, string>>);
      focusField(errors[0].field);
      return;
    }
    setFieldErrors({});

    setSaving(true);
    try {
      if (isEdit && supplier) {
        const updated = await updateSupplier(context, supplier.id, { ...payload, isActive });
        onSaved(updated ?? undefined);
      } else {
        const created = await createSupplier(context, payload);
        onSaved(created ?? undefined);
      }
    } catch (error) {
      // 409 = nome duplicado (chave natural por organização) — mensagem específica PT-BR.
      if (error instanceof ApiError && error.status === 409) {
        setServerError("Já existe um fornecedor com este nome nesta organização. Informe outro nome.");
      } else {
        setServerError(error instanceof Error ? error.message : "Não foi possível salvar o fornecedor.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Editar fornecedor" : "Novo fornecedor"} open onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <Alert title="Não foi possível salvar" tone="danger">
            {serverError}
          </Alert>
        ) : null}

        <div style={gridStyle}>
          <div style={fullWidth}>
            <Field id={FIELD_ID.name} label="Nome" required value={name} onChange={setName} error={fieldErrors.name} maxLength={160} autoComplete="off" helper="Nome único do fornecedor na organização." />
          </div>
          <Field id={FIELD_ID.document} label="CNPJ/CPF" value={documentValue} onChange={setDocumentValue} error={fieldErrors.document} maxLength={18} inputMode="numeric" />
          <Field id={FIELD_ID.category} label="Categoria" value={category} onChange={setCategory} error={fieldErrors.category} maxLength={80} autoComplete="off" helper="Ex.: Peças, Combustível, Serviços" />
          <Field id={FIELD_ID.email} label="E-mail" type="email" value={email} onChange={setEmail} error={fieldErrors.email} autoComplete="off" />
          <Field id={FIELD_ID.phone} label="Telefone" value={phone} onChange={setPhone} error={fieldErrors.phone} maxLength={20} inputMode="tel" />
          <div style={fullWidth}>
            <Field id={FIELD_ID.address} label="Endereço" value={address} onChange={setAddress} error={fieldErrors.address} />
          </div>
          {isEdit ? (
            <div style={fullWidth}>
              <Checkbox label="Fornecedor ativo" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
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
            {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar fornecedor"}
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

function focusField(field: SupplierField) {
  if (typeof document === "undefined" || typeof document.getElementById !== "function") return;
  const element = document.getElementById(FIELD_ID[field]);
  if (element && typeof (element as HTMLElement).focus === "function") {
    (element as HTMLElement).focus();
  }
}
