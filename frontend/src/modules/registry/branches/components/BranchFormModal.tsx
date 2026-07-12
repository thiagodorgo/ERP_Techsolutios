import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";

import { Alert, Button, Checkbox, Input, Modal } from "../../../../components/ui";
import { ApiError } from "../../../../services/api/client";
import { isBranchActive, validateBranch } from "../branches.adapter";
import { createBranch, updateBranch } from "../branches.service";
import type { BranchCreatePayload, BranchField, BranchItem, BranchesApiContext } from "../branches.types";

const FIELD_ID: Record<string, string> = {
  name: "branch-field-name",
  code: "branch-field-code",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "var(--space-12)",
};

const fullWidth: CSSProperties = { gridColumn: "1 / -1" };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };

export function BranchFormModal({
  branch,
  context,
  onClose,
  onSaved,
}: {
  readonly branch: BranchItem | null;
  readonly context: BranchesApiContext;
  readonly onClose: () => void;
  readonly onSaved: (saved?: BranchItem) => void;
}) {
  const isEdit = Boolean(branch);
  const [name, setName] = useState(branch?.name ?? "");
  const [code, setCode] = useState(branch?.code ?? "");
  const [isActive, setIsActive] = useState(isBranchActive(branch?.status ?? "active"));
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<BranchField, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function buildPayload(): BranchCreatePayload {
    return {
      name: name.trim(),
      code: code.trim(),
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const payload = buildPayload();
    const errors = validateBranch(payload);
    if (errors.length > 0) {
      setFieldErrors(Object.fromEntries(errors.map((error) => [error.field, error.message])) as Partial<Record<BranchField, string>>);
      focusField(errors[0].field);
      return;
    }
    setFieldErrors({});

    setSaving(true);
    try {
      if (isEdit && branch) {
        // Lição do veto B2 (Ω2-a.2): `code` é chave natural IMUTÁVEL no backend — enviá-lo
        // daria falso sucesso. Na edição o campo fica desabilitado com dica e FORA do payload;
        // desativar/reativar vai pela transição de `status` (não existe is_active em Filiais).
        const updated = await updateBranch(context, branch.id, {
          name: payload.name,
          status: isActive ? "active" : "inactive",
        });
        onSaved(updated ?? undefined);
      } else {
        const created = await createBranch(context, payload);
        onSaved(created ?? undefined);
      }
    } catch (error) {
      // 409 = código duplicado (chave natural por organização) — mensagem específica PT-BR.
      if (error instanceof ApiError && error.status === 409) {
        setServerError("Já existe uma filial com este código nesta organização. Informe outro código.");
      } else {
        setServerError(error instanceof Error ? error.message : "Não foi possível salvar a filial.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Editar filial" : "Nova filial"} open onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <Alert title="Não foi possível salvar" tone="danger">
            {serverError}
          </Alert>
        ) : null}

        <div style={gridStyle}>
          <div style={fullWidth}>
            <Field id={FIELD_ID.name} label="Nome" required value={name} onChange={setName} error={fieldErrors.name} maxLength={160} autoComplete="off" helper="Ex.: São Paulo — Zona Sul" />
          </div>
          <div style={fullWidth}>
            <Field
              id={FIELD_ID.code}
              label="Código"
              required
              value={code}
              onChange={(next) => setCode(next.toUpperCase())}
              error={fieldErrors.code}
              maxLength={40}
              autoComplete="off"
              disabled={isEdit}
              helper={isEdit ? "Fixo após a criação — o código identifica a filial na organização." : "Identificador único da filial. Ex.: SP-01"}
            />
          </div>
          {isEdit ? (
            <div style={fullWidth}>
              <Checkbox label="Filial ativa" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            </div>
          ) : null}
        </div>

        <footer style={footerStyle}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar filial"}
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
  disabled,
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
  readonly disabled?: boolean;
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

function focusField(field: BranchField) {
  if (typeof document === "undefined" || typeof document.getElementById !== "function") return;
  const element = document.getElementById(FIELD_ID[field]);
  if (element && typeof (element as HTMLElement).focus === "function") {
    (element as HTMLElement).focus();
  }
}
