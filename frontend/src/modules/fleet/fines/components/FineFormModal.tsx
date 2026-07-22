import { Printer } from "lucide-react";
import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";

import { Alert, Button, Chip, Input, Modal, Select } from "../../../../components/ui";
import { PayableToggle } from "../../../finance/payable-source";
import { usePayableSource } from "../../../finance/payable-source/usePayableSource";
import type { OperatorProfileItem } from "../../../registry/operator-profiles/operator-profiles.types";
import type { TenantUser } from "../../../registry/teams/teams.types";
import type { Vehicle } from "../../../registry/vehicles/vehicles.types";
import {
  getFineDispositionLabel,
  getFineDispositionTone,
  getFineStatusLabel,
  getFineStatusTone,
  interpretFineSubmitError,
  parseIntStrict,
  parsePtBrNumber,
  resolveFineDisposition,
  validateFine,
} from "../fines.adapter";
import type { FineDispositionIntent } from "../fines.adapter";
import { createFine, updateFine } from "../fines.service";
import type { Fine, FineCreatePayload, FineDraft, FineField, FinesApiContext, FineUpdatePayload } from "../fines.types";
import { PrintFineModal } from "./PrintFineModal";

const FIELD_ID: Record<string, string> = {
  vehicleId: "fine-field-vehicle",
  driverId: "fine-field-driver",
  responsibleOperatorProfileId: "fine-field-responsible",
  responsibleInstallmentTotal: "fine-field-responsible-installments",
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
const footerSplitStyle: CSSProperties = { ...footerStyle, justifyContent: "space-between" };
const readOnlyRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)" };
const mutedStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)" };
const sectionStyle: CSSProperties = {
  marginTop: "var(--space-16)",
  paddingTop: "var(--space-12)",
  borderTop: "1px solid var(--border-subtle)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-10)",
};
const sectionTitleStyle: CSSProperties = { fontSize: "var(--text-sm)", fontWeight: 700, margin: 0 };
const dispositionRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)", flexWrap: "wrap" };

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

function resolveResponsibleName(operatorProfiles: readonly OperatorProfileItem[], id: string | null): string | null {
  if (!id) return null;
  const profile = operatorProfiles.find((item) => item.id === id);
  return profile?.fullName?.trim() || null;
}

export function FineFormModal({
  fine,
  vehicles,
  drivers,
  operatorProfiles,
  context,
  canLaunchPayable = false,
  canRemovePayable = false,
  onClose,
  onSaved,
}: {
  readonly fine: Fine | null;
  readonly vehicles: readonly Vehicle[];
  readonly drivers: readonly TenantUser[];
  readonly operatorProfiles: readonly OperatorProfileItem[];
  readonly context: FinesApiContext;
  readonly canLaunchPayable?: boolean;
  readonly canRemovePayable?: boolean;
  readonly onClose: () => void;
  readonly onSaved: (saved?: Fine) => void;
}) {
  const isEdit = Boolean(fine);
  const [vehicleId, setVehicleId] = useState(fine?.vehicleId ?? "");
  const [driverId, setDriverId] = useState(fine?.driverId ?? "");
  // Ω4C PR-07 — condutor responsável (Profissional) + parcelas do desconto no extrato.
  const [responsibleId, setResponsibleId] = useState(fine?.responsibleOperatorProfileId ?? "");
  const [installmentTotal, setInstallmentTotal] = useState("1");
  const [numeroAuto, setNumeroAuto] = useState(fine?.numeroAuto ?? "");
  const [orgao, setOrgao] = useState(fine?.orgao ?? "");
  const [dataInfracao, setDataInfracao] = useState(toDateInputValue(fine?.dataInfracao));
  const [descricao, setDescricao] = useState(fine?.descricao ?? "");
  const [valor, setValor] = useState(fine?.valor != null ? fine.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "");
  const [pontos, setPontos] = useState(fine?.pontos != null ? String(fine.pontos) : "");
  const [prazoRecurso, setPrazoRecurso] = useState(toDateInputValue(fine?.prazoRecurso));
  const [prazoPagamento, setPrazoPagamento] = useState(toDateInputValue(fine?.prazoPagamento));
  // Either/or: intenção de gerar contas a pagar (empresa paga) — só disponível quando NÃO há responsável.
  const [payableChecked, setPayableChecked] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FineField, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  const hasResponsible = responsibleId.trim().length > 0;

  function chooseResponsible(next: string) {
    setResponsibleId(next);
    // Either/or (D-Ω4C-MULSEG-DISPOSITION): escolher um responsável desmarca a intenção de contas a pagar.
    if (next.trim()) setPayableChecked(false);
  }

  function buildDraft(): FineDraft {
    return {
      vehicleId: vehicleId.trim(),
      driverId: driverId.trim() || undefined,
      responsibleOperatorProfileId: responsibleId.trim() || undefined,
      responsibleInstallmentTotal: hasResponsible ? parseIntStrict(installmentTotal) : undefined,
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

  // Intenção da disposição (só EDIÇÃO) — desambigua o 409 sem corpo (o ApiError esconde o motivo):
  //  - SETAR/TROCAR responsável → either/or (fine_disposition_conflict)
  //  - LIMPAR responsável já lançado → trava do extrato (statement_entry_locked)
  function dispositionIntent(): FineDispositionIntent | undefined {
    if (!isEdit || !fine) return undefined;
    const original = fine.responsibleOperatorProfileId ?? "";
    const next = responsibleId.trim();
    if (next && next !== original) return "set";
    if (!next && original) return "clear";
    return undefined;
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

    setSaving(true);
    try {
      if (isEdit && fine) {
        // Edição: envia o responsável SEMPRE (null limpa; string seta/troca) para respeitar a disposição.
        const patch: FineUpdatePayload = {
          vehicleId: draft.vehicleId,
          driverId: draft.driverId,
          responsibleOperatorProfileId: draft.responsibleOperatorProfileId ?? null,
          responsibleInstallmentTotal: draft.responsibleInstallmentTotal,
          numeroAuto: draft.numeroAuto,
          orgao: draft.orgao,
          dataInfracao: draft.dataInfracao,
          descricao: draft.descricao,
          valor: draft.valor as number,
          pontos: draft.pontos,
          prazoRecurso: draft.prazoRecurso,
          prazoPagamento: draft.prazoPagamento,
        };
        const updated = await updateFine(context, fine.id, patch);
        onSaved(updated ?? undefined);
      } else {
        const payload: FineCreatePayload = {
          vehicleId: draft.vehicleId,
          driverId: draft.driverId,
          responsibleOperatorProfileId: draft.responsibleOperatorProfileId,
          responsibleInstallmentTotal: draft.responsibleOperatorProfileId ? draft.responsibleInstallmentTotal : undefined,
          numeroAuto: draft.numeroAuto,
          orgao: draft.orgao,
          dataInfracao: draft.dataInfracao,
          descricao: draft.descricao,
          valor: draft.valor as number,
          pontos: draft.pontos,
          prazoRecurso: draft.prazoRecurso,
          prazoPagamento: draft.prazoPagamento,
        };
        const created = await createFine(context, payload);
        onSaved(created ?? undefined);
      }
    } catch (error) {
      // 409: duplicate_numero_auto / fine_disposition_conflict / statement_entry_locked (desambiguado pela
      // intenção da disposição); invalid_operator_profile_reference → sob o Condutor responsável; etc.
      const feedback = interpretFineSubmitError(error, "form", dispositionIntent());
      if (feedback.field) {
        setFieldErrors((prev) => ({ ...prev, [feedback.field as FineField]: feedback.message }));
        focusField(feedback.field as FineField);
      }
      setServerError(feedback.message);
    } finally {
      setSaving(false);
    }
  }

  const responsibleName = resolveResponsibleName(operatorProfiles, fine?.responsibleOperatorProfileId ?? null);
  const vehicleLabel = (() => {
    const vehicle = vehicles.find((item) => item.id === fine?.vehicleId);
    return vehicle ? `${vehicle.plate}${vehicle.model ? ` — ${vehicle.model}` : ""}` : "—";
  })();

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

        {/* Ω4C PR-07 — seção titulada "Disposição": condutor responsável (extrato) × contas a pagar (empresa). */}
        <section style={sectionStyle} aria-label="Disposição da multa">
          <h4 style={sectionTitleStyle}>Disposição</h4>

          <div style={gridStyle}>
            <div>
              <Select
                id={FIELD_ID.responsibleOperatorProfileId}
                label="Condutor responsável"
                value={responsibleId}
                aria-invalid={fieldErrors.responsibleOperatorProfileId ? true : undefined}
                aria-describedby={
                  fieldErrors.responsibleOperatorProfileId ? `${FIELD_ID.responsibleOperatorProfileId}-error` : undefined
                }
                onChange={(event) => chooseResponsible(event.target.value)}
              >
                <option value="">— Sem responsável (empresa paga) —</option>
                {operatorProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.fullName?.trim() || "Profissional sem nome"}
                  </option>
                ))}
              </Select>
              {fieldErrors.responsibleOperatorProfileId ? (
                <small className="form-error" id={`${FIELD_ID.responsibleOperatorProfileId}-error`}>
                  {fieldErrors.responsibleOperatorProfileId}
                </small>
              ) : (
                <small style={mutedStyle}>Ao escolher, a multa é lançada como desconto no extrato do profissional.</small>
              )}
            </div>

            {hasResponsible ? (
              <Field
                id={FIELD_ID.responsibleInstallmentTotal}
                label="Parcelas do desconto"
                value={installmentTotal}
                onChange={setInstallmentTotal}
                error={fieldErrors.responsibleInstallmentTotal}
                maxLength={3}
                inputMode="numeric"
                helper="Em quantas parcelas o desconto entra no extrato (padrão 1)."
              />
            ) : null}
          </div>

          {isEdit && fine ? (
            <FineEditDisposition
              fine={fine}
              orgao={orgao}
              valor={parsePtBrNumber(valor) ?? fine.valor}
              canLaunchPayable={canLaunchPayable}
              canRemovePayable={canRemovePayable}
            />
          ) : hasResponsible ? (
            <Alert title="Lançamento no extrato do condutor" tone="info">
              A multa será descontada no extrato do condutor responsável. Não é possível, ao mesmo tempo, lançá-la em contas a
              pagar (empresa paga) — retire o responsável para essa opção.
            </Alert>
          ) : (
            <PayableToggle mode="create" checked={payableChecked} onChange={setPayableChecked} disabled={saving} />
          )}
        </section>

        <footer style={isEdit ? footerSplitStyle : footerStyle}>
          {isEdit && fine ? (
            <Button type="button" variant="secondary" onClick={() => setPrintOpen(true)} aria-label={`Imprimir multa ${fine.numeroAuto}`}>
              <Printer size={16} aria-hidden /> Imprimir multa
            </Button>
          ) : null}
          <div style={{ display: "flex", gap: "var(--space-8)" }}>
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Registrar multa"}
            </Button>
          </div>
        </footer>
      </form>

      {isEdit && fine && printOpen ? (
        <PrintFineModal fine={fine} vehicleLabel={vehicleLabel} responsibleName={responsibleName} onClose={() => setPrintOpen(false)} />
      ) : null}
    </Modal>
  );
}

// Disposição na EDIÇÃO: badge derivado (statement/payable/none) + o caminho da empresa (PayableToggle) OU o
// aviso honesto do either/or quando já está no extrato. O estado de contas a pagar vem do backend (D-007).
function FineEditDisposition({
  fine,
  orgao,
  valor,
  canLaunchPayable,
  canRemovePayable,
}: {
  readonly fine: Fine;
  readonly orgao: string;
  readonly valor: number;
  readonly canLaunchPayable: boolean;
  readonly canRemovePayable: boolean;
}) {
  const { title } = usePayableSource("fines", fine.id);
  const view = resolveFineDisposition(fine.disposition, title != null);

  return (
    <>
      <div style={dispositionRowStyle}>
        <span style={mutedStyle}>Disposição atual</span>
        <Chip tone={getFineDispositionTone(view)}>{getFineDispositionLabel(view)}</Chip>
      </div>

      {fine.disposition === "statement" ? (
        <Alert title="Lançado no extrato do condutor" tone="info">
          A multa é descontada da folha do condutor responsável. Para a empresa pagar em contas a pagar, retire o condutor
          responsável (deixe o campo acima em branco) e salve.
        </Alert>
      ) : (
        <PayableToggle
          mode="edit"
          module="fines"
          id={fine.id}
          canLaunch={canLaunchPayable}
          canRemove={canRemovePayable}
          defaults={{ partyName: orgao || "Órgão autuador", amount: valor }}
        />
      )}
    </>
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
