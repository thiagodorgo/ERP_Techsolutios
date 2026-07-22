import type { CSSProperties, FormEvent } from "react";
import { useMemo, useState } from "react";

import { Alert, Button, Checkbox, Input, Modal, Select } from "../../../../components/ui";
import { PayableToggle, launchPayable } from "../../../finance/payable-source";
import { useSuppliers } from "../../../registry/suppliers/useSuppliers";
import type { SuppliersFilters } from "../../../registry/suppliers/suppliers.types";
import type { Vehicle } from "../../../registry/vehicles/vehicles.types";
import {
  FUEL_TYPE_OPTIONS,
  STATION_TYPE_OPTIONS,
  formatUnitValue,
  interpretFuelLogSubmitError,
  parseIntStrict,
  parsePtBrNumber,
  validateFuelLog,
} from "../fuel-logs.adapter";
import { createFuelLog, updateFuelLog } from "../fuel-logs.service";
import type { FuelLog, FuelLogCreatePayload, FuelLogDraft, FuelLogField, FuelLogsApiContext, StationType } from "../fuel-logs.types";

const FIELD_ID: Record<string, string> = {
  vehicleId: "fuel-field-vehicle",
  fueledAt: "fuel-field-fueled-at",
  fuelType: "fuel-field-type",
  liters: "fuel-field-liters",
  totalValue: "fuel-field-total-value",
  odometer: "fuel-field-odometer",
  station: "fuel-field-station",
  stationType: "fuel-field-station-type",
  supplierId: "fuel-field-supplier",
  notes: "fuel-field-notes",
};

// Janela estável de fornecedores ATIVOS para o seletor (evita refetch a cada render do modal).
const SUPPLIER_FILTERS: SuppliersFilters = { search: "", isActive: "active", limit: 100 };

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "var(--space-12)",
};

const fullWidth: CSSProperties = { gridColumn: "1 / -1" };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };
const mutedNoteStyle: CSSProperties = { display: "block", marginTop: "var(--space-4)", fontSize: "var(--text-sm)", color: "var(--text-secondary)" };
const unitValueStyle: CSSProperties = { ...fullWidth, margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)" };
const sectionTitleStyle: CSSProperties = {
  ...fullWidth,
  margin: "var(--space-8) 0 0",
  paddingTop: "var(--space-8)",
  borderTop: "1px solid var(--border-subtle)",
  fontSize: "var(--text-sm)",
  fontWeight: 700,
  color: "var(--text-secondary)",
};

// ISO -> valor de <input type="datetime-local"> (YYYY-MM-DDTHH:mm) na hora local.
function toDateTimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return defaultDateTimeLocal();
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return defaultDateTimeLocal();
  return formatLocal(date);
}

function defaultDateTimeLocal(): string {
  return formatLocal(new Date());
}

function formatLocal(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function FuelLogFormModal({
  log,
  vehicles,
  context,
  canLaunchPayable = false,
  canRemovePayable = false,
  onClose,
  onSaved,
}: {
  readonly log: FuelLog | null;
  readonly vehicles: readonly Vehicle[];
  readonly context: FuelLogsApiContext;
  readonly canLaunchPayable?: boolean;
  readonly canRemovePayable?: boolean;
  readonly onClose: () => void;
  readonly onSaved: (saved?: FuelLog) => void;
}) {
  // Ω4C PR-02 — "Gerar lançamento em contas a pagar" (AutEM): checkbox no cadastro; na edição, o registro
  // já criado mostra o badge/ações. `savedLog` guarda a fonte recém-criada quando o lançamento pós-create
  // falha, para o usuário retomar pelo painel de edição (sem recriar o abastecimento).
  const [payableChecked, setPayableChecked] = useState(false);
  const [savedLog, setSavedLog] = useState<FuelLog | null>(null);
  const activeLog = log ?? savedLog;
  const isEdit = Boolean(activeLog);
  const [vehicleId, setVehicleId] = useState(log?.vehicleId ?? "");
  const [fueledAt, setFueledAt] = useState(toDateTimeLocalValue(log?.fueledAt));
  const [fuelType, setFuelType] = useState(log?.fuelType && FUEL_TYPE_OPTIONS.some((o) => o.value === log.fuelType) ? log.fuelType : "gasolina");
  const [liters, setLiters] = useState(log?.liters != null ? log.liters.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "");
  const [totalValue, setTotalValue] = useState(
    log?.totalValue != null ? log.totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "",
  );
  const [odometer, setOdometer] = useState(log?.odometer != null ? String(log.odometer) : "");
  const [station, setStation] = useState(log?.station ?? "");
  // Ω4C PR-05 — Posto (interno/externo) + fornecedor condicional + "desconsiderar último KM".
  const [stationType, setStationType] = useState<StationType>(log?.stationType ?? "external");
  const [supplierId, setSupplierId] = useState(log?.supplierId ?? "");
  const [ignorePreviousOdometer, setIgnorePreviousOdometer] = useState(false);
  const [notes, setNotes] = useState(log?.notes ?? "");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FuelLogField, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { items: suppliers } = useSuppliers(SUPPLIER_FILTERS);
  // Opções do seletor de fornecedor: ativos do tenant + o fornecedor já vinculado (se estiver inativo/fora
  // da janela, ainda assim aparece para não perder o vínculo na edição). Só o NOME como label (§2.8).
  const supplierOptions = useMemo(() => {
    const options = suppliers.map((supplier) => ({ id: supplier.id, name: supplier.name }));
    const currentId = log?.supplierId;
    if (currentId && !options.some((option) => option.id === currentId)) {
      options.unshift({ id: currentId, name: log?.supplierName ?? "Fornecedor vinculado" });
    }
    return options;
  }, [suppliers, log?.supplierId, log?.supplierName]);

  const isExternal = stationType === "external";
  const unitValue = formatUnitValue(parsePtBrNumber(totalValue), parsePtBrNumber(liters));

  function handleStationTypeChange(next: StationType) {
    setStationType(next);
    // INTERNO nunca leva fornecedor — limpa o campo e o erro ao alternar (espelho do backend 422).
    if (next === "internal") {
      setSupplierId("");
      setFieldErrors((prev) => ({ ...prev, supplierId: undefined }));
    }
  }

  function buildDraft(): FuelLogDraft {
    return {
      vehicleId: vehicleId.trim(),
      // datetime-local não carrega fuso; convertemos para ISO na fronteira.
      fueledAt: fueledAt.trim() ? new Date(fueledAt).toISOString() : "",
      fuelType,
      liters: parsePtBrNumber(liters),
      totalValue: parsePtBrNumber(totalValue),
      odometer: parseIntStrict(odometer),
      station: station.trim() || undefined,
      stationType,
      supplierId: isExternal ? supplierId.trim() || undefined : undefined,
      notes: notes.trim() || undefined,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const draft = buildDraft();
    const errors = validateFuelLog(draft);
    if (errors.length > 0) {
      setFieldErrors(Object.fromEntries(errors.map((error) => [error.field, error.message])) as Partial<Record<FuelLogField, string>>);
      focusField(errors[0].field);
      return;
    }
    setFieldErrors({});

    // Números já validados como definidos acima.
    const payload: FuelLogCreatePayload = {
      vehicleId: draft.vehicleId,
      fueledAt: draft.fueledAt,
      fuelType: draft.fuelType,
      liters: draft.liters as number,
      totalValue: draft.totalValue as number,
      odometer: draft.odometer as number,
      station: draft.station,
      // Ω4C PR-05 — posto/fornecedor; INTERNO não envia supplier (o backend rejeita com 422).
      stationType: draft.stationType,
      supplierId: draft.supplierId,
      // Flag transiente: só vai ao backend quando marcada (override do guard de odômetro).
      ignorePreviousOdometer: ignorePreviousOdometer || undefined,
      notes: draft.notes,
    };

    setSaving(true);
    try {
      if (isEdit && activeLog) {
        const updated = await updateFuelLog(context, activeLog.id, payload);
        onSaved(updated ?? undefined);
      } else {
        const created = await createFuelLog(context, payload);
        // Após o create devolver o id, se marcado, dispara o lançamento em contas a pagar (o id só existe
        // aqui). Best-effort: falha NÃO desfaz o abastecimento — mantém o modal aberto para lançar na edição.
        if (created && payableChecked) {
          try {
            // Fornecedor do abastecimento externo é o favorecido natural do título; posto/observação
            // são fallback quando não há fornecedor (interno / legado).
            const supplierName = supplierOptions.find((option) => option.id === draft.supplierId)?.name;
            await launchPayable(context, "fuel-logs", created.id, {
              partyName: supplierName || draft.station || "Abastecimento",
              amount: payload.totalValue,
              dueDate: payload.fueledAt,
            });
          } catch {
            setSavedLog(created);
            setServerError("Abastecimento salvo, mas não foi possível gerar o título em contas a pagar. Use o painel abaixo para lançar.");
            return;
          }
        }
        onSaved(created ?? undefined);
      }
    } catch (error) {
      // R1.2 — 422 odometer_regressive: mensagem sob o campo Odômetro + Alerta de perigo.
      const feedback = interpretFuelLogSubmitError(error);
      if (feedback.field) {
        setFieldErrors((prev) => ({ ...prev, [feedback.field as FuelLogField]: feedback.message }));
        focusField(feedback.field);
      }
      setServerError(feedback.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Editar abastecimento" : "Novo lançamento"} open onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <Alert title="Não foi possível salvar" tone="danger">
            {serverError}
          </Alert>
        ) : null}

        <div style={gridStyle}>
          <div style={fullWidth}>
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
            id={FIELD_ID.fueledAt}
            label="Data e hora"
            required
            type="datetime-local"
            value={fueledAt}
            onChange={setFueledAt}
            error={fieldErrors.fueledAt}
          />

          <div>
            <Select
              id={FIELD_ID.fuelType}
              label="Combustível *"
              value={fuelType}
              aria-required
              aria-invalid={fieldErrors.fuelType ? true : undefined}
              aria-describedby={fieldErrors.fuelType ? `${FIELD_ID.fuelType}-error` : undefined}
              onChange={(event) => setFuelType(event.target.value)}
            >
              {FUEL_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            {fieldErrors.fuelType ? (
              <small className="form-error" id={`${FIELD_ID.fuelType}-error`}>
                {fieldErrors.fuelType}
              </small>
            ) : null}
          </div>

          <Field
            id={FIELD_ID.liters}
            label="Litros"
            required
            value={liters}
            onChange={setLiters}
            error={fieldErrors.liters}
            maxLength={12}
            inputMode="decimal"
            helper="Ex.: 58,50"
          />
          <Field
            id={FIELD_ID.totalValue}
            label="Valor total"
            required
            value={totalValue}
            onChange={setTotalValue}
            error={fieldErrors.totalValue}
            maxLength={14}
            inputMode="decimal"
            helper="Em reais (R$). Ex.: 312,90"
          />

          {/* Valor Unitário (R$/L) — derivado de valor ÷ litros, read-only; nunca persistido (como o km/L). */}
          <p style={unitValueStyle} aria-live="polite">
            Valor unitário: <strong>{unitValue}</strong>
          </p>

          <div>
            <Field
              id={FIELD_ID.odometer}
              label="Odômetro"
              required
              value={odometer}
              onChange={setOdometer}
              error={fieldErrors.odometer}
              maxLength={9}
              inputMode="numeric"
              helper="Leitura em km, número inteiro."
            />
            <Checkbox
              label="Desconsiderar último KM"
              checked={ignorePreviousOdometer}
              onChange={(event) => setIgnorePreviousOdometer(event.target.checked)}
              disabled={saving}
              aria-describedby={`${FIELD_ID.odometer}-ignore-help`}
            />
            <small id={`${FIELD_ID.odometer}-ignore-help`} style={mutedNoteStyle}>
              Aceita uma leitura menor que a anterior (1º abastecimento ou correção); o consumo (km/L) fica em “—”.
            </small>
          </div>

          {/* Seção: Posto e fornecedor. */}
          <h3 style={sectionTitleStyle}>Posto e fornecedor</h3>

          <div>
            <Select
              id={FIELD_ID.stationType}
              label="Posto *"
              value={stationType}
              aria-required
              onChange={(event) => handleStationTypeChange(event.target.value as StationType)}
            >
              {STATION_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          {isExternal ? (
            <div>
              <Select
                id={FIELD_ID.supplierId}
                label="Fornecedor *"
                value={supplierId}
                aria-required
                aria-invalid={fieldErrors.supplierId ? true : undefined}
                aria-describedby={fieldErrors.supplierId ? `${FIELD_ID.supplierId}-error` : undefined}
                onChange={(event) => setSupplierId(event.target.value)}
              >
                <option value="">Selecione o fornecedor…</option>
                {supplierOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Select>
              {fieldErrors.supplierId ? (
                <small className="form-error" id={`${FIELD_ID.supplierId}-error`}>
                  {fieldErrors.supplierId}
                </small>
              ) : (
                <small style={mutedNoteStyle}>Abastecimento externo gera um título em contas a pagar para o fornecedor.</small>
              )}
            </div>
          ) : (
            <p style={{ ...mutedNoteStyle, alignSelf: "center" }}>
              Posto próprio da base. A baixa de combustível do estoque entra na etapa de custódia de estoque.
            </p>
          )}

          <Field
            id={FIELD_ID.station}
            label="Identificação do posto"
            value={station}
            onChange={setStation}
            error={fieldErrors.station}
            maxLength={120}
            autoComplete="off"
            helper="Opcional: nome/rede do posto."
          />

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

        <div style={{ marginTop: "var(--space-16)" }}>
          {isEdit && activeLog ? (
            <PayableToggle
              mode="edit"
              module="fuel-logs"
              id={activeLog.id}
              canLaunch={canLaunchPayable}
              canRemove={canRemovePayable}
              defaults={{ partyName: activeLog.supplierName ?? activeLog.station ?? "Abastecimento", amount: activeLog.totalValue }}
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
            {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Registrar abastecimento"}
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

function focusField(field: FuelLogField) {
  if (typeof document === "undefined" || typeof document.getElementById !== "function") return;
  const element = document.getElementById(FIELD_ID[field]);
  if (element && typeof (element as HTMLElement).focus === "function") {
    (element as HTMLElement).focus();
  }
}
