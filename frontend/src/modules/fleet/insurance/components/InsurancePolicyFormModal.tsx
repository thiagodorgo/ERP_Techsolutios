import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";

import { Alert, Button, Chip, Input, Modal, Select } from "../../../../components/ui";
import { PayableToggle, launchPayable } from "../../../finance/payable-source";
import type { Vehicle } from "../../../registry/vehicles/vehicles.types";
import {
  getPolicyStatusLabel,
  getPolicyStatusTone,
  interpretInsuranceSubmitError,
  parsePtBrNumber,
  validateInsurancePolicy,
} from "../insurance.adapter";
import { createInsurancePolicy, updateInsurancePolicy } from "../insurance.service";
import type {
  InsuranceApiContext,
  InsurancePolicy,
  InsurancePolicyCreatePayload,
  InsurancePolicyDraft,
  InsurancePolicyField,
} from "../insurance.types";

const FIELD_ID: Record<string, string> = {
  vehicleId: "insurance-field-vehicle",
  seguradora: "insurance-field-seguradora",
  numeroApolice: "insurance-field-numero-apolice",
  vigenciaInicio: "insurance-field-vigencia-inicio",
  vigenciaFim: "insurance-field-vigencia-fim",
  valor: "insurance-field-valor",
  cobertura: "insurance-field-cobertura",
};

const gridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--space-12)" };
const fullWidth: CSSProperties = { gridColumn: "1 / -1" };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };
const readOnlyRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)" };
const mutedStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)" };

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

export function InsurancePolicyFormModal({
  policy,
  vehicles,
  context,
  canLaunchPayable = false,
  canRemovePayable = false,
  onClose,
  onSaved,
}: {
  readonly policy: InsurancePolicy | null;
  readonly vehicles: readonly Vehicle[];
  readonly context: InsuranceApiContext;
  readonly canLaunchPayable?: boolean;
  readonly canRemovePayable?: boolean;
  readonly onClose: () => void;
  readonly onSaved: (saved?: InsurancePolicy) => void;
}) {
  // Ω4C PR-02 — "Gerar lançamento em contas a pagar" (AutEM): checkbox no cadastro; na edição, badge/ações.
  // `savedPolicy` guarda a apólice recém-criada se o lançamento pós-create falhar, para retomar na edição.
  const [payableChecked, setPayableChecked] = useState(false);
  const [savedPolicy, setSavedPolicy] = useState<InsurancePolicy | null>(null);
  const activePolicy = policy ?? savedPolicy;
  const isEdit = Boolean(activePolicy);
  const [vehicleId, setVehicleId] = useState(policy?.vehicleId ?? "");
  const [seguradora, setSeguradora] = useState(policy?.seguradora ?? "");
  const [numeroApolice, setNumeroApolice] = useState(policy?.numeroApolice ?? "");
  const [vigenciaInicio, setVigenciaInicio] = useState(toDateInputValue(policy?.vigenciaInicio));
  const [vigenciaFim, setVigenciaFim] = useState(toDateInputValue(policy?.vigenciaFim));
  const [valor, setValor] = useState(policy?.valor != null ? policy.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "");
  const [cobertura, setCobertura] = useState(policy?.cobertura ?? "");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<InsurancePolicyField, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function buildDraft(): InsurancePolicyDraft {
    return {
      vehicleId: vehicleId.trim(),
      seguradora: seguradora.trim(),
      numeroApolice: numeroApolice.trim(),
      vigenciaInicio: vigenciaInicio.trim(),
      vigenciaFim: vigenciaFim.trim(),
      valor: parsePtBrNumber(valor),
      cobertura: cobertura.trim() || undefined,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const draft = buildDraft();
    const errors = validateInsurancePolicy(draft);
    if (errors.length > 0) {
      setFieldErrors(Object.fromEntries(errors.map((error) => [error.field, error.message])) as Partial<Record<InsurancePolicyField, string>>);
      focusField(errors[0].field);
      return;
    }
    setFieldErrors({});

    const payload: InsurancePolicyCreatePayload = {
      vehicleId: draft.vehicleId,
      seguradora: draft.seguradora,
      numeroApolice: draft.numeroApolice,
      vigenciaInicio: draft.vigenciaInicio,
      vigenciaFim: draft.vigenciaFim,
      valor: draft.valor as number,
      cobertura: draft.cobertura,
    };

    setSaving(true);
    try {
      if (isEdit && activePolicy) {
        const updated = await updateInsurancePolicy(context, activePolicy.id, payload);
        onSaved(updated ?? undefined);
      } else {
        const created = await createInsurancePolicy(context, payload);
        // Após o create devolver o id, se marcado, dispara o lançamento em contas a pagar. Best-effort:
        // falha NÃO desfaz a apólice — mantém o modal aberto para lançar pelo painel de edição.
        if (created && payableChecked) {
          try {
            await launchPayable(context, "insurance-policies", created.id, {
              partyName: draft.seguradora || "Seguradora",
              amount: payload.valor,
              dueDate: new Date(draft.vigenciaInicio).toISOString(),
            });
          } catch {
            setSavedPolicy(created);
            setServerError("Apólice salva, mas não foi possível gerar o título em contas a pagar. Use o painel abaixo para lançar.");
            return;
          }
        }
        onSaved(created ?? undefined);
      }
    } catch (error) {
      // 409 duplicate_numero_apolice → sob o Nº da apólice; invalid_vehicle_reference → sob a Viatura.
      // Sempre acompanha Alerta.
      const feedback = interpretInsuranceSubmitError(error, "form");
      if (feedback.field) {
        setFieldErrors((prev) => ({ ...prev, [feedback.field as InsurancePolicyField]: feedback.message }));
        focusField(feedback.field as InsurancePolicyField);
      }
      setServerError(feedback.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Editar apólice" : "Nova apólice"} open onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <Alert title="Não foi possível salvar" tone="danger">
            {serverError}
          </Alert>
        ) : null}

        {isEdit && policy ? (
          <div style={{ ...fullWidth, marginBottom: "var(--space-12)" }}>
            <span style={mutedStyle}>Situação atual</span>
            <div style={readOnlyRowStyle}>
              <Chip tone={getPolicyStatusTone(policy.status)}>{getPolicyStatusLabel(policy.status)}</Chip>
              <span style={mutedStyle}>A situação é derivada das datas de vigência; cancele ou reative pelas ações da linha.</span>
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

          <Field
            id={FIELD_ID.seguradora}
            label="Seguradora"
            required
            value={seguradora}
            onChange={setSeguradora}
            error={fieldErrors.seguradora}
            maxLength={160}
            autoComplete="off"
            helper="Companhia seguradora (ex.: Porto Seguro)."
          />

          <Field
            id={FIELD_ID.numeroApolice}
            label="Nº da apólice"
            required
            value={numeroApolice}
            onChange={setNumeroApolice}
            error={fieldErrors.numeroApolice}
            maxLength={80}
            autoComplete="off"
            helper="Número da apólice (único na organização)."
          />

          <Field
            id={FIELD_ID.valor}
            label="Valor (R$)"
            required
            value={valor}
            onChange={setValor}
            error={fieldErrors.valor}
            maxLength={16}
            inputMode="decimal"
            helper="Prêmio da apólice, em reais. Ex.: 2.480,00"
          />

          <Field
            id={FIELD_ID.vigenciaInicio}
            label="Vigência início"
            required
            type="date"
            value={vigenciaInicio}
            onChange={setVigenciaInicio}
            error={fieldErrors.vigenciaInicio}
            helper="Data de início da cobertura."
          />

          <Field
            id={FIELD_ID.vigenciaFim}
            label="Vencimento (vigência fim)"
            required
            type="date"
            value={vigenciaFim}
            onChange={setVigenciaFim}
            error={fieldErrors.vigenciaFim}
            helper="Data de término da cobertura (posterior ao início)."
          />

          <div style={fullWidth}>
            <label className="ui-field">
              <span>Cobertura</span>
              <textarea
                id={FIELD_ID.cobertura}
                className="ui-input"
                style={{ minHeight: 84, padding: "var(--space-10)", resize: "vertical" }}
                rows={3}
                value={cobertura}
                maxLength={2000}
                aria-invalid={fieldErrors.cobertura ? true : undefined}
                aria-describedby={fieldErrors.cobertura ? `${FIELD_ID.cobertura}-error` : undefined}
                onChange={(event) => setCobertura(event.target.value)}
              />
              <small>Escopo da cobertura (opcional).</small>
            </label>
            {fieldErrors.cobertura ? (
              <small className="form-error" id={`${FIELD_ID.cobertura}-error`}>
                {fieldErrors.cobertura}
              </small>
            ) : null}
          </div>
        </div>

        {/* Ω4C PR-07 (D-Ω4C-SEG-EXPIRY-NOTIF, lição PR-06) — ao salvar, um lembrete PRIVADO de vencimento é
            agendado para o próprio usuário. Aviso honesto, SEM seletor de visibilidade público (não vira
            broadcast da organização). */}
        <div style={{ marginTop: "var(--space-12)" }}>
          <Alert title="Lembrete de vencimento" tone="info">
            Ao salvar, agendamos um lembrete privado do vencimento desta apólice para você — visível apenas ao seu usuário.
          </Alert>
        </div>

        <div style={{ marginTop: "var(--space-16)" }}>
          {isEdit && activePolicy ? (
            <PayableToggle
              mode="edit"
              module="insurance-policies"
              id={activePolicy.id}
              canLaunch={canLaunchPayable}
              canRemove={canRemovePayable}
              defaults={{ partyName: activePolicy.seguradora, amount: activePolicy.valor }}
            />
          ) : (
            <PayableToggle mode="create" checked={payableChecked} onChange={setPayableChecked} disabled={saving} />
          )}
        </div>

        <footer style={footerStyle}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Registrar apólice"}
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
  readonly inputMode?: "numeric" | "decimal" | "tel";
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

function focusField(field: InsurancePolicyField) {
  if (typeof document === "undefined" || typeof document.getElementById !== "function") return;
  const element = document.getElementById(FIELD_ID[field]);
  if (element && typeof (element as HTMLElement).focus === "function") {
    (element as HTMLElement).focus();
  }
}
