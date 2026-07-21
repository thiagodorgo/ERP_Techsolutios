import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";

import { Alert, Button, Input, Modal, Select } from "../../../../components/ui";
import { interpretAdjustmentSubmitError, parseIntStrict, parsePtBrMoney, validateAdjustment } from "../statement.adapter";
import { createStatementAdjustment } from "../statement.service";
import type {
  ProfessionalStatementGroup,
  StatementAdjustmentDraft,
  StatementAdjustmentField,
  StatementApiContext,
  StatementDirection,
} from "../statement.types";

const FIELD_ID: Record<string, string> = {
  direction: "statement-adj-direction",
  amount: "statement-adj-amount",
  installmentTotal: "statement-adj-installments",
  firstDueDate: "statement-adj-first-due",
  description: "statement-adj-description",
};

const sectionTitleStyle: CSSProperties = {
  fontSize: "var(--text-xs)",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: ".06em",
  color: "var(--text-secondary)",
  margin: "var(--space-16) 0 var(--space-8)",
};
const gridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--space-12)" };
const fullWidth: CSSProperties = { gridColumn: "1 / -1" };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };

function todayLocalDate(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// AJUSTE manual no extrato (D-Ω4C-EXTRATO-CREATE-SCOPE): tipo é sempre "Ajuste"; a organização escolhe a
// direção (crédito = provento / débito = desconto), o valor total, o parcelamento e o 1º vencimento.
export function StatementAdjustmentModal({
  operatorProfileId,
  professionalName,
  context,
  onClose,
  onSaved,
}: {
  readonly operatorProfileId: string;
  readonly professionalName: string | null;
  readonly context: StatementApiContext;
  readonly onClose: () => void;
  readonly onSaved: (created: ProfessionalStatementGroup) => void;
}) {
  const [direction, setDirection] = useState<StatementDirection>("debit");
  const [amount, setAmount] = useState("");
  const [installmentTotal, setInstallmentTotal] = useState("1");
  const [firstDueDate, setFirstDueDate] = useState(todayLocalDate());
  const [description, setDescription] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<StatementAdjustmentField, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function buildDraft(): StatementAdjustmentDraft {
    return {
      operatorProfileId,
      direction,
      description: description.trim(),
      amount: parsePtBrMoney(amount),
      installmentTotal: parseIntStrict(installmentTotal),
      firstDueDate: firstDueDate.trim(),
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const draft = buildDraft();
    const errors = validateAdjustment(draft);
    if (errors.length > 0) {
      setFieldErrors(Object.fromEntries(errors.map((error) => [error.field, error.message])) as Partial<Record<StatementAdjustmentField, string>>);
      focusField(errors[0].field);
      return;
    }
    setFieldErrors({});

    setSaving(true);
    try {
      const created = await createStatementAdjustment(context, {
        operatorProfileId,
        direction: draft.direction,
        description: draft.description,
        amount: draft.amount as number,
        installmentTotal: draft.installmentTotal as number,
        // O backend deriva a competência no fuso de negócio a partir da data (parseBusinessDate).
        firstDueDate: draft.firstDueDate,
      });
      if (created) onSaved(created);
      else setServerError("Não foi possível registrar o ajuste. Tente novamente.");
    } catch (error) {
      setServerError(interpretAdjustmentSubmitError(error));
    } finally {
      setSaving(false);
    }
  }

  const professionalLabel = professionalName ?? "profissional selecionado";

  return (
    <Modal title="Novo ajuste no extrato" open onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <Alert title="Não foi possível registrar o ajuste" tone="danger">
            {serverError}
          </Alert>
        ) : null}

        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", margin: 0 }}>
          Lançamento manual de <strong>Ajuste</strong> no extrato de <strong>{professionalLabel}</strong>.
        </p>

        <h3 style={sectionTitleStyle}>Dados do ajuste</h3>
        <div style={gridStyle}>
          <div>
            <Select
              id={FIELD_ID.direction}
              label="Natureza *"
              value={direction}
              aria-required
              onChange={(event) => setDirection(event.target.value as StatementDirection)}
            >
              <option value="debit">Débito (desconto do profissional)</option>
              <option value="credit">Crédito (provento ao profissional)</option>
            </Select>
            {fieldErrors.direction ? (
              <small className="form-error" id={`${FIELD_ID.direction}-error`}>
                {fieldErrors.direction}
              </small>
            ) : null}
          </div>

          <Field
            id={FIELD_ID.amount}
            label="Valor total"
            required
            value={amount}
            onChange={setAmount}
            error={fieldErrors.amount}
            maxLength={14}
            inputMode="decimal"
            helper="Em reais (R$). Ex.: 250,00"
          />

          <label className="ui-field" style={fullWidth}>
            <span>Descrição *</span>
            <textarea
              id={FIELD_ID.description}
              className="ui-input"
              style={{ minHeight: 80, padding: "var(--space-10)", resize: "vertical" }}
              rows={3}
              value={description}
              maxLength={2000}
              onChange={(event) => setDescription(event.target.value)}
              aria-required
              aria-invalid={fieldErrors.description ? true : undefined}
              aria-describedby={fieldErrors.description ? `${FIELD_ID.description}-error` : undefined}
            />
            {fieldErrors.description ? (
              <small className="form-error" id={`${FIELD_ID.description}-error`}>
                {fieldErrors.description}
              </small>
            ) : null}
          </label>
        </div>

        <h3 style={sectionTitleStyle}>Parcelamento</h3>
        <div style={gridStyle}>
          <Field
            id={FIELD_ID.installmentTotal}
            label="Parcelas"
            required
            value={installmentTotal}
            onChange={setInstallmentTotal}
            error={fieldErrors.installmentTotal}
            maxLength={3}
            inputMode="numeric"
            helper="Número de parcelas (1 a 240)."
          />
          <Field
            id={FIELD_ID.firstDueDate}
            label="1º vencimento"
            required
            type="date"
            value={firstDueDate}
            onChange={setFirstDueDate}
            error={fieldErrors.firstDueDate}
            helper="As demais parcelas vencem mensalmente."
          />
        </div>

        <footer style={footerStyle}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Registrando…" : "Registrar ajuste"}
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

function focusField(field: StatementAdjustmentField) {
  if (typeof document === "undefined" || typeof document.getElementById !== "function") return;
  const element = document.getElementById(FIELD_ID[field]);
  if (element && typeof (element as HTMLElement).focus === "function") {
    (element as HTMLElement).focus();
  }
}
