import { ImagePlus, Printer } from "lucide-react";
import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";

import { Alert, Button, Chip, Input, Modal, Select } from "../../../../components/ui";
import type { OperatorProfileItem } from "../../../registry/operator-profiles/operator-profiles.types";
import type { Vehicle } from "../../../registry/vehicles/vehicles.types";
import type { WorkOrderListItem } from "../../../work-orders/work-orders.types";
import {
  DAMAGE_GRAVIDADE_OPTIONS,
  DAMAGE_TIPO_OPTIONS,
  getDamageDispositionLabel,
  getDamageDispositionTone,
  getDamageStatusLabel,
  getDamageStatusTone,
  interpretDamageSubmitError,
  parseIntStrict,
  parsePtBrNumber,
  formatValor,
  validateDamage,
} from "../damages.adapter";
import type { DamageDispositionIntent } from "../damages.adapter";
import { createDamage, updateDamage } from "../damages.service";
import type {
  Damage,
  DamageApiContext,
  DamageCreatePayload,
  DamageDraft,
  DamageField,
  DamageGravidade,
  DamageTipo,
  DamageUpdatePayload,
} from "../damages.types";
import { PrintDamageModal } from "./PrintDamageModal";

const FIELD_ID: Record<string, string> = {
  vehicleId: "damage-field-vehicle",
  gravidade: "damage-field-gravidade",
  data: "damage-field-data",
  descricao: "damage-field-descricao",
  workOrderId: "damage-field-work-order",
  tipo: "damage-field-tipo",
  origem: "damage-field-origem",
  objeto: "damage-field-objeto",
  identificacaoObjeto: "damage-field-identificacao-objeto",
  analiseInterna: "damage-field-analise-interna",
  custoEstimado: "damage-field-custo-estimado",
  custoReal: "damage-field-custo-real",
  responsibleOperatorProfileId: "damage-field-responsible",
  responsibleAmount: "damage-field-responsible-amount",
  responsibleInstallmentTotal: "damage-field-responsible-installments",
  responsibleFirstDueDate: "damage-field-responsible-first-due",
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
const badgeRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)", flexWrap: "wrap" };
const noteStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-8)",
  marginTop: "var(--space-12)",
  padding: "var(--space-10)",
  borderRadius: "var(--radius-6)",
  background: "var(--surface-panel-muted)",
  border: "1px solid var(--border-subtle)",
  color: "var(--text-secondary)",
  fontSize: "var(--text-sm)",
};

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

function toMoneyInput(value: number | null | undefined): string {
  return value != null ? value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
}

function resolveResponsibleName(operatorProfiles: readonly OperatorProfileItem[], id: string | null | undefined): string | null {
  if (!id) return null;
  const profile = operatorProfiles.find((item) => item.id === id);
  return profile?.fullName?.trim() || null;
}

export function DamageFormModal({
  damage,
  vehicles,
  workOrders,
  operatorProfiles,
  context,
  onClose,
  onSaved,
}: {
  readonly damage: Damage | null;
  readonly vehicles: readonly Vehicle[];
  readonly workOrders: readonly WorkOrderListItem[];
  readonly operatorProfiles: readonly OperatorProfileItem[];
  readonly context: DamageApiContext;
  readonly onClose: () => void;
  readonly onSaved: (saved?: Damage) => void;
}) {
  const isEdit = Boolean(damage);
  // Ω4C PR-09 — débito ATIVO derivado do detalhe: trava os campos financeiros e a desativação (alerta amarelo).
  const statementDebit = damage?.statementDebit ?? null;
  const locked = Boolean(statementDebit);

  const [vehicleId, setVehicleId] = useState(damage?.vehicleId ?? "");
  const [gravidade, setGravidade] = useState<DamageGravidade | "">(damage?.gravidade ?? "");
  const [data, setData] = useState(toDateInputValue(damage?.data));
  const [tipo, setTipo] = useState<DamageTipo | "">(damage?.tipo ?? "");
  const [descricao, setDescricao] = useState(damage?.descricao ?? "");
  const [workOrderId, setWorkOrderId] = useState(damage?.workOrderId ?? "");
  const [objeto, setObjeto] = useState(damage?.objeto ?? "");
  const [identificacaoObjeto, setIdentificacaoObjeto] = useState(damage?.identificacaoObjeto ?? "");
  const [origem, setOrigem] = useState(damage?.origem ?? "");
  const [analiseInterna, setAnaliseInterna] = useState(damage?.analiseInterna ?? "");
  const [custoEstimado, setCustoEstimado] = useState(toMoneyInput(damage?.custoEstimado));
  const [custoReal, setCustoReal] = useState(toMoneyInput(damage?.custoReal));
  // Ω4C PR-09 — responsável (Profissional) + desconto no extrato (parcial permitido) + parcelas + 1º venc.
  const [responsibleId, setResponsibleId] = useState(damage?.responsibleOperatorProfileId ?? "");
  const [responsibleAmount, setResponsibleAmount] = useState(toMoneyInput(statementDebit?.totalAmount));
  const [installmentTotal, setInstallmentTotal] = useState(statementDebit ? String(statementDebit.installmentTotal) : "1");
  const [firstDueDate, setFirstDueDate] = useState(toDateInputValue(statementDebit?.firstDueDate));
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<DamageField, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  const hasResponsible = responsibleId.trim().length > 0;

  function buildDraft(): DamageDraft {
    return {
      vehicleId: vehicleId.trim(),
      gravidade,
      data: data.trim(),
      descricao: descricao.trim(),
      workOrderId: workOrderId.trim() || undefined,
      tipo: tipo || undefined,
      origem: origem.trim() || undefined,
      objeto: objeto.trim() || undefined,
      identificacaoObjeto: identificacaoObjeto.trim() || undefined,
      analiseInterna: analiseInterna.trim() || undefined,
      custoEstimado: parsePtBrNumber(custoEstimado),
      custoReal: parsePtBrNumber(custoReal),
      responsibleOperatorProfileId: responsibleId.trim() || undefined,
      // Financeiro travado com débito ativo → não valida/envia amount/parcelas/venc. (alterar exige remover do extrato).
      responsibleAmount: locked ? undefined : parsePtBrNumber(responsibleAmount),
      responsibleInstallmentTotal: hasResponsible && !locked ? parseIntStrict(installmentTotal) : undefined,
      responsibleFirstDueDate: hasResponsible && !locked ? firstDueDate.trim() || undefined : undefined,
    };
  }

  // Intenção da disposição (só EDIÇÃO) — desambigua o 409 sem corpo (o ApiError esconde o motivo):
  //  - SETAR/TROCAR/LIMPAR o responsável com débito settled → trava do extrato (statement_entry_locked).
  //  - Sem mudança de responsável → trava do dano (damage_statement_locked).
  function dispositionIntent(): DamageDispositionIntent | undefined {
    if (!isEdit || !damage) return undefined;
    const original = damage.responsibleOperatorProfileId ?? "";
    const next = responsibleId.trim();
    if (next && next !== original) return "set";
    if (!next && original) return "clear";
    return undefined;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const draft = buildDraft();
    const errors = validateDamage(draft);
    if (errors.length > 0) {
      setFieldErrors(Object.fromEntries(errors.map((error) => [error.field, error.message])) as Partial<Record<DamageField, string>>);
      focusField(errors[0].field);
      return;
    }
    setFieldErrors({});

    setSaving(true);
    try {
      if (isEdit && damage) {
        const patch: DamageUpdatePayload = {
          vehicleId: draft.vehicleId,
          gravidade: draft.gravidade as DamageGravidade,
          data: draft.data,
          descricao: draft.descricao,
          workOrderId: draft.workOrderId,
          tipo: draft.tipo || undefined,
          origem: draft.origem,
          objeto: draft.objeto,
          identificacaoObjeto: draft.identificacaoObjeto,
          analiseInterna: draft.analiseInterna,
          custoEstimado: draft.custoEstimado,
          // Valor Total travado com débito ativo → não reenvia (evita 409 espúrio); sem débito → envia.
          custoReal: locked ? undefined : draft.custoReal,
          // Envia o responsável SEMPRE (null limpa; string seta/troca) para respeitar a disposição.
          responsibleOperatorProfileId: draft.responsibleOperatorProfileId ?? null,
          responsibleAmount: !locked && draft.responsibleOperatorProfileId ? draft.responsibleAmount : undefined,
          responsibleInstallmentTotal: !locked && draft.responsibleOperatorProfileId ? draft.responsibleInstallmentTotal : undefined,
          responsibleFirstDueDate: !locked && draft.responsibleOperatorProfileId ? draft.responsibleFirstDueDate : undefined,
        };
        const updated = await updateDamage(context, damage.id, patch);
        onSaved(updated ?? undefined);
      } else {
        const payload: DamageCreatePayload = {
          vehicleId: draft.vehicleId,
          gravidade: draft.gravidade as DamageGravidade,
          data: draft.data,
          descricao: draft.descricao,
          workOrderId: draft.workOrderId,
          tipo: draft.tipo || undefined,
          origem: draft.origem,
          objeto: draft.objeto,
          identificacaoObjeto: draft.identificacaoObjeto,
          analiseInterna: draft.analiseInterna,
          custoEstimado: draft.custoEstimado,
          custoReal: draft.custoReal,
          responsibleOperatorProfileId: draft.responsibleOperatorProfileId,
          responsibleAmount: draft.responsibleOperatorProfileId ? draft.responsibleAmount : undefined,
          responsibleInstallmentTotal: draft.responsibleOperatorProfileId ? draft.responsibleInstallmentTotal : undefined,
          responsibleFirstDueDate: draft.responsibleOperatorProfileId ? draft.responsibleFirstDueDate : undefined,
        };
        const created = await createDamage(context, payload);
        onSaved(created ?? undefined);
      }
    } catch (error) {
      // 409 damage_statement_locked / statement_entry_locked (desambiguado pela intenção); 400 responsável/viatura/OS;
      // 422 money guards — sempre acompanha o Alerta honesto.
      const feedback = interpretDamageSubmitError(error, "form", dispositionIntent());
      if (feedback.field) {
        setFieldErrors((prev) => ({ ...prev, [feedback.field as DamageField]: feedback.message }));
        focusField(feedback.field as DamageField);
      }
      setServerError(feedback.message);
    } finally {
      setSaving(false);
    }
  }

  const responsibleName = resolveResponsibleName(operatorProfiles, damage?.responsibleOperatorProfileId ?? null);
  const vehicleLabel = (() => {
    const vehicle = vehicles.find((item) => item.id === damage?.vehicleId);
    return vehicle ? `${vehicle.plate}${vehicle.model ? ` — ${vehicle.model}` : ""}` : "—";
  })();
  const showDispositionBadge = locked || damage?.disposition === "statement";

  return (
    <Modal title={isEdit ? "Editar dano" : "Registrar dano"} open onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <Alert title="Não foi possível salvar" tone="danger">
            {serverError}
          </Alert>
        ) : null}

        {isEdit && damage ? (
          <div style={{ ...fullWidth, marginBottom: "var(--space-12)" }}>
            <span style={mutedStyle}>Situação atual</span>
            <div style={readOnlyRowStyle}>
              <Chip tone={getDamageStatusTone(damage.status)}>{getDamageStatusLabel(damage.status)}</Chip>
              {showDispositionBadge ? (
                <Chip tone={getDamageDispositionTone("statement")}>{getDamageDispositionLabel("statement")}</Chip>
              ) : null}
              <span style={mutedStyle}>Avance a situação pelas ações da linha.</span>
            </div>
          </div>
        ) : null}

        {/* ── Seção 1: Identificação do dano ─────────────────────────────────── */}
        <section aria-label="Identificação do dano">
          <h4 style={{ ...sectionTitleStyle, marginBottom: "var(--space-10)" }}>Identificação do dano</h4>
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
                id={FIELD_ID.gravidade}
                label="Gravidade *"
                value={gravidade}
                aria-required
                aria-invalid={fieldErrors.gravidade ? true : undefined}
                aria-describedby={fieldErrors.gravidade ? `${FIELD_ID.gravidade}-error` : undefined}
                onChange={(event) => setGravidade(event.target.value as DamageGravidade | "")}
              >
                <option value="">Selecione a gravidade…</option>
                {DAMAGE_GRAVIDADE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              {fieldErrors.gravidade ? (
                <small className="form-error" id={`${FIELD_ID.gravidade}-error`}>
                  {fieldErrors.gravidade}
                </small>
              ) : null}
            </div>

            <Field
              id={FIELD_ID.data}
              label="Data do dano"
              required
              type="date"
              value={data}
              onChange={setData}
              error={fieldErrors.data}
              helper="Data em que o dano foi identificado."
            />

            <div>
              <Select id={FIELD_ID.tipo} label="Tipo de dano" value={tipo} onChange={(event) => setTipo(event.target.value as DamageTipo | "")}>
                <option value="">Selecione o tipo…</option>
                {DAMAGE_TIPO_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <small style={mutedStyle}>Interno, externo ou ambos.</small>
            </div>

            <div>
              <Select
                id={FIELD_ID.workOrderId}
                label="OS de origem"
                value={workOrderId}
                aria-invalid={fieldErrors.workOrderId ? true : undefined}
                aria-describedby={fieldErrors.workOrderId ? `${FIELD_ID.workOrderId}-error` : undefined}
                onChange={(event) => setWorkOrderId(event.target.value)}
              >
                <option value="">Sem OS de origem</option>
                {workOrders.map((workOrder) => (
                  <option key={workOrder.id} value={workOrder.id}>
                    {workOrder.code}
                    {workOrder.title ? ` — ${workOrder.title}` : ""}
                  </option>
                ))}
              </Select>
              {fieldErrors.workOrderId ? (
                <small className="form-error" id={`${FIELD_ID.workOrderId}-error`}>
                  {fieldErrors.workOrderId}
                </small>
              ) : null}
            </div>

            <Field
              id={FIELD_ID.origem}
              label="Origem"
              value={origem}
              onChange={setOrigem}
              error={fieldErrors.origem}
              maxLength={200}
              helper="Classificação da origem (ex.: Multa, Acidente)."
            />

            <Field
              id={FIELD_ID.objeto}
              label="Objeto"
              value={objeto}
              onChange={setObjeto}
              error={fieldErrors.objeto}
              maxLength={200}
              helper="Parte/objeto danificado."
            />

            <Field
              id={FIELD_ID.identificacaoObjeto}
              label="Identificação do objeto"
              value={identificacaoObjeto}
              onChange={setIdentificacaoObjeto}
              error={fieldErrors.identificacaoObjeto}
              maxLength={200}
              helper="Identificação/patrimônio do objeto."
            />

            <div style={fullWidth}>
              <label className="ui-field">
                <span>Descrição *</span>
                <textarea
                  id={FIELD_ID.descricao}
                  className="ui-input"
                  style={{ minHeight: 96, padding: "var(--space-10)", resize: "vertical" }}
                  rows={4}
                  value={descricao}
                  maxLength={2000}
                  aria-required
                  aria-invalid={fieldErrors.descricao ? true : undefined}
                  aria-describedby={fieldErrors.descricao ? `${FIELD_ID.descricao}-error` : undefined}
                  onChange={(event) => setDescricao(event.target.value)}
                />
                <small>Descreva o dano, a parte da viatura e as circunstâncias.</small>
              </label>
              {fieldErrors.descricao ? (
                <small className="form-error" id={`${FIELD_ID.descricao}-error`}>
                  {fieldErrors.descricao}
                </small>
              ) : null}
            </div>
          </div>
        </section>

        {/* ── Seção 2: Responsável ───────────────────────────────────────────── */}
        <section style={sectionStyle} aria-label="Responsável pelo dano">
          <h4 style={sectionTitleStyle}>Responsável</h4>
          <div>
            <Select
              id={FIELD_ID.responsibleOperatorProfileId}
              label="Responsável"
              value={responsibleId}
              aria-invalid={fieldErrors.responsibleOperatorProfileId ? true : undefined}
              aria-describedby={fieldErrors.responsibleOperatorProfileId ? `${FIELD_ID.responsibleOperatorProfileId}-error` : undefined}
              onChange={(event) => setResponsibleId(event.target.value)}
            >
              <option value="">— Sem responsável (empresa absorve) —</option>
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
              <small style={mutedStyle}>Profissional que sofreu ou causou o dano. Com valor a cobrar, vira desconto no extrato.</small>
            )}
          </div>

          {showDispositionBadge ? (
            <div style={badgeRowStyle}>
              <Chip tone={getDamageDispositionTone("statement")}>{getDamageDispositionLabel("statement")}</Chip>
              {statementDebit ? (
                <span style={mutedStyle}>
                  {formatValor(statementDebit.totalAmount)} em {statementDebit.installmentTotal}x
                </span>
              ) : null}
            </div>
          ) : null}
        </section>

        {/* ── Seção 3: Custos e desconto ─────────────────────────────────────── */}
        <section style={sectionStyle} aria-label="Custos e desconto">
          <h4 style={sectionTitleStyle}>Custos e desconto</h4>

          {locked ? (
            <Alert title="Desconto já lançado no extrato do profissional" tone="warning">
              O valor deste dano já se encontra no extrato do profissional. O Valor Total do dano e a desativação ficam travados
              até que todas as parcelas sejam removidas do extrato.
              {statementDebit?.hasSettled ? " Há parcela já liquidada — a reversão só é possível por ajuste." : ""}
            </Alert>
          ) : null}

          <div style={gridStyle}>
            <Field
              id={FIELD_ID.custoReal}
              label="Valor Total do dano (R$)"
              value={custoReal}
              onChange={setCustoReal}
              error={fieldErrors.custoReal}
              maxLength={16}
              inputMode="decimal"
              disabled={locked}
              helper={locked ? "Travado enquanto há desconto no extrato." : "Base do desconto do profissional. Ex.: 1.200,00"}
            />

            <Field
              id={FIELD_ID.custoEstimado}
              label="Custo estimado (R$)"
              value={custoEstimado}
              onChange={setCustoEstimado}
              error={fieldErrors.custoEstimado}
              maxLength={16}
              inputMode="decimal"
              helper="Opcional. Ex.: 1.200,00"
            />

            {hasResponsible ? (
              <>
                <Field
                  id={FIELD_ID.responsibleAmount}
                  label="Profissional (R$)"
                  value={responsibleAmount}
                  onChange={setResponsibleAmount}
                  error={fieldErrors.responsibleAmount}
                  maxLength={16}
                  inputMode="decimal"
                  disabled={locked}
                  helper="Valor a descontar do profissional (pode ser parcial). Deixe em branco para só identificar."
                />

                <Field
                  id={FIELD_ID.responsibleInstallmentTotal}
                  label="Parcelas do desconto"
                  value={installmentTotal}
                  onChange={setInstallmentTotal}
                  error={fieldErrors.responsibleInstallmentTotal}
                  maxLength={3}
                  inputMode="numeric"
                  disabled={locked}
                  helper="Em quantas parcelas o desconto entra no extrato (padrão 1)."
                />

                <Field
                  id={FIELD_ID.responsibleFirstDueDate}
                  label="Data do 1º desconto"
                  type="date"
                  value={firstDueDate}
                  onChange={setFirstDueDate}
                  error={fieldErrors.responsibleFirstDueDate}
                  disabled={locked}
                  helper="Vencimento da primeira parcela (opcional)."
                />
              </>
            ) : null}
          </div>
        </section>

        {/* ── Seção 4: Análise interna (uso interno — NUNCA impressa) ─────────── */}
        <section style={sectionStyle} aria-label="Análise interna do dano">
          <h4 style={sectionTitleStyle}>Análise interna</h4>
          <label className="ui-field">
            <span>Análise interna</span>
            <textarea
              id={FIELD_ID.analiseInterna}
              className="ui-input"
              style={{ minHeight: 84, padding: "var(--space-10)", resize: "vertical" }}
              rows={3}
              value={analiseInterna}
              maxLength={5000}
              onChange={(event) => setAnaliseInterna(event.target.value)}
            />
            <small style={mutedStyle}>Uso interno da organização — não sai na impressão nem no termo de ciência.</small>
          </label>
        </section>

        {!isEdit ? (
          <p style={noteStyle}>
            <ImagePlus size={16} aria-hidden /> Salve o dano primeiro para anexar fotos. As fotos ficam disponíveis em “Detalhes”.
          </p>
        ) : null}

        <footer style={isEdit ? footerSplitStyle : footerStyle}>
          {isEdit && damage ? (
            <Button type="button" variant="secondary" onClick={() => setPrintOpen(true)} aria-label={`Imprimir dano da viatura ${vehicleLabel}`}>
              <Printer size={16} aria-hidden /> Imprimir dano
            </Button>
          ) : null}
          <div style={{ display: "flex", gap: "var(--space-8)" }}>
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Registrar dano"}
            </Button>
          </div>
        </footer>
      </form>

      {isEdit && damage && printOpen ? (
        <PrintDamageModal damage={damage} vehicleLabel={vehicleLabel} responsibleName={responsibleName} onClose={() => setPrintOpen(false)} />
      ) : null}
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
  readonly inputMode?: "numeric" | "decimal" | "tel";
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
        inputMode={inputMode}
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

function focusField(field: DamageField) {
  if (typeof document === "undefined" || typeof document.getElementById !== "function") return;
  const id = FIELD_ID[field];
  if (!id) return;
  const element = document.getElementById(id);
  if (element && typeof (element as HTMLElement).focus === "function") {
    (element as HTMLElement).focus();
  }
}
