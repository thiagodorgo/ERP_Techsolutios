import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";

import { Alert, Button, Chip, Input, Modal, Select } from "../../../../components/ui";
import type { TenantUser } from "../../../registry/teams/teams.types";
import type { Vehicle } from "../../../registry/vehicles/vehicles.types";
import {
  getFineStatusLabel,
  getFineStatusTone,
  interpretFineSubmitError,
  parseIntStrict,
  parsePtBrNumber,
  validateFine,
} from "../fines.adapter";
import { createFine, updateFine } from "../fines.service";
import type { Fine, FineCreatePayload, FineDraft, FineField, FinesApiContext } from "../fines.types";

const FIELD_ID: Record<string, string> = {
  vehicleId: "fine-field-vehicle",
  driverId: "fine-field-driver",
  numeroAuto: "fine-field-numero-auto",
  orgao: "fine-field-orgao",
  dataInfracao: "fine-field-data-infracao",
  descricao: "fine-field-descricao",
  valor: "fine-field-valor",
  pontos: "fine-field-pontos",
  prazoRecurso: "fine-field-prazo-recurso",
  prazoPagamento: "fine-field-prazo-pagamento",
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

export function FineFormModal({
  fine,
  vehicles,
  drivers,
  context,
  onClose,
  onSaved,
}: {
  readonly fine: Fine | null;
  readonly vehicles: readonly Vehicle[];
  readonly drivers: readonly TenantUser[];
  readonly context: FinesApiContext;
  readonly onClose: () => void;
  readonly onSaved: (saved?: Fine) => void;
}) {
  const isEdit = Boolean(fine);
  const [vehicleId, setVehicleId] = useState(fine?.vehicleId ?? "");
  const [driverId, setDriverId] = useState(fine?.driverId ?? "");
  const [numeroAuto, setNumeroAuto] = useState(fine?.numeroAuto ?? "");
  const [orgao, setOrgao] = useState(fine?.orgao ?? "");
  const [dataInfracao, setDataInfracao] = useState(toDateInputValue(fine?.dataInfracao));
  const [descricao, setDescricao] = useState(fine?.descricao ?? "");
  const [valor, setValor] = useState(fine?.valor != null ? fine.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "");
  const [pontos, setPontos] = useState(fine?.pontos != null ? String(fine.pontos) : "");
  const [prazoRecurso, setPrazoRecurso] = useState(toDateInputValue(fine?.prazoRecurso));
  const [prazoPagamento, setPrazoPagamento] = useState(toDateInputValue(fine?.prazoPagamento));
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FineField, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function buildDraft(): FineDraft {
    return {
      vehicleId: vehicleId.trim(),
      driverId: driverId.trim() || undefined,
      numeroAuto: numeroAuto.trim(),
      orgao: orgao.trim(),
      dataInfracao: dataInfracao.trim(),
      descricao: descricao.trim() || undefined,
      valor: parsePtBrNumber(valor),
      pontos: parseIntStrict(pontos),
      prazoRecurso: prazoRecurso.trim() || undefined,
      prazoPagamento: prazoPagamento.trim() || undefined,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const draft = buildDraft();
    const errors = validateFine(draft);
    if (errors.length > 0) {
      setFieldErrors(Object.fromEntries(errors.map((error) => [error.field, error.message])) as Partial<Record<FineField, string>>);
      focusField(errors[0].field);
      return;
    }
    setFieldErrors({});

    const payload: FineCreatePayload = {
      vehicleId: draft.vehicleId,
      driverId: draft.driverId,
      numeroAuto: draft.numeroAuto,
      orgao: draft.orgao,
      dataInfracao: draft.dataInfracao,
      descricao: draft.descricao,
      valor: draft.valor as number,
      pontos: draft.pontos,
      prazoRecurso: draft.prazoRecurso,
      prazoPagamento: draft.prazoPagamento,
    };

    setSaving(true);
    try {
      if (isEdit && fine) {
        const updated = await updateFine(context, fine.id, payload);
        onSaved(updated ?? undefined);
      } else {
        const created = await createFine(context, payload);
        onSaved(created ?? undefined);
      }
    } catch (error) {
      // 409 duplicate_numero_auto → sob o Nº do auto; invalid_driver_reference → sob o Condutor;
      // invalid_vehicle_reference → sob a Viatura. Sempre acompanha Alerta.
      const feedback = interpretFineSubmitError(error, "form");
      if (feedback.field) {
        setFieldErrors((prev) => ({ ...prev, [feedback.field as FineField]: feedback.message }));
        focusField(feedback.field as FineField);
      }
      setServerError(feedback.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Editar multa" : "Nova multa"} open onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <Alert title="Não foi possível salvar" tone="danger">
            {serverError}
          </Alert>
        ) : null}

        {isEdit && fine ? (
          <div style={{ ...fullWidth, marginBottom: "var(--space-12)" }}>
            <span style={mutedStyle}>Situação atual</span>
            <div style={readOnlyRowStyle}>
              <Chip tone={getFineStatusTone(fine.status)}>{getFineStatusLabel(fine.status)}</Chip>
              <span style={mutedStyle}>A situação avança pelas ações da linha (Avançar situação).</span>
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

          <div>
            <Select
              id={FIELD_ID.driverId}
              label="Condutor"
              value={driverId}
              aria-invalid={fieldErrors.driverId ? true : undefined}
              aria-describedby={fieldErrors.driverId ? `${FIELD_ID.driverId}-error` : undefined}
              onChange={(event) => setDriverId(event.target.value)}
            >
              <option value="">Sem condutor identificado</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name}
                </option>
              ))}
            </Select>
            {fieldErrors.driverId ? (
              <small className="form-error" id={`${FIELD_ID.driverId}-error`}>
                {fieldErrors.driverId}
              </small>
            ) : (
              <small style={mutedStyle}>Opcional — quem conduzia a viatura.</small>
            )}
          </div>

          <Field
            id={FIELD_ID.numeroAuto}
            label="Nº do auto"
            required
            value={numeroAuto}
            onChange={setNumeroAuto}
            error={fieldErrors.numeroAuto}
            maxLength={60}
            autoComplete="off"
            helper="Número do auto de infração (único na organização)."
          />

          <Field
            id={FIELD_ID.orgao}
            label="Órgão"
            required
            value={orgao}
            onChange={setOrgao}
            error={fieldErrors.orgao}
            maxLength={160}
            autoComplete="off"
            helper="Órgão autuador (ex.: DETRAN-SP)."
          />

          <Field
            id={FIELD_ID.dataInfracao}
            label="Data da infração"
            required
            type="date"
            value={dataInfracao}
            onChange={setDataInfracao}
            error={fieldErrors.dataInfracao}
          />

          <Field
            id={FIELD_ID.valor}
            label="Valor (R$)"
            required
            value={valor}
            onChange={setValor}
            error={fieldErrors.valor}
            maxLength={14}
            inputMode="decimal"
            helper="Em reais. Ex.: 293,47"
          />

          <Field
            id={FIELD_ID.pontos}
            label="Pontos"
            value={pontos}
            onChange={setPontos}
            error={fieldErrors.pontos}
            maxLength={2}
            inputMode="numeric"
            helper="Pontos na carteira (inteiro, opcional)."
          />

          <Field
            id={FIELD_ID.prazoRecurso}
            label="Prazo de recurso"
            type="date"
            value={prazoRecurso}
            onChange={setPrazoRecurso}
            error={fieldErrors.prazoRecurso}
            helper="Data-limite para recorrer (opcional)."
          />

          <Field
            id={FIELD_ID.prazoPagamento}
            label="Prazo de pagamento"
            type="date"
            value={prazoPagamento}
            onChange={setPrazoPagamento}
            error={fieldErrors.prazoPagamento}
            helper="Data-limite para pagar (opcional)."
          />

          <div style={fullWidth}>
            <label className="ui-field">
              <span>Descrição</span>
              <textarea
                id={FIELD_ID.descricao}
                className="ui-input"
                style={{ minHeight: 84, padding: "var(--space-10)", resize: "vertical" }}
                rows={3}
                value={descricao}
                maxLength={2000}
                aria-invalid={fieldErrors.descricao ? true : undefined}
                aria-describedby={fieldErrors.descricao ? `${FIELD_ID.descricao}-error` : undefined}
                onChange={(event) => setDescricao(event.target.value)}
              />
              <small>Natureza da infração (opcional).</small>
            </label>
            {fieldErrors.descricao ? (
              <small className="form-error" id={`${FIELD_ID.descricao}-error`}>
                {fieldErrors.descricao}
              </small>
            ) : null}
          </div>
        </div>

        <footer style={footerStyle}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Registrar multa"}
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

function focusField(field: FineField) {
  if (typeof document === "undefined" || typeof document.getElementById !== "function") return;
  const element = document.getElementById(FIELD_ID[field]);
  if (element && typeof (element as HTMLElement).focus === "function") {
    (element as HTMLElement).focus();
  }
}
