import { Check, Lock, Undo2 } from "lucide-react";
import type { ReactNode } from "react";

import { StatusPill } from "../../../../components/patterns";
import { formatBRL, formatDueDate } from "../../titles/financial-titles.adapter";
import type { FinancialEntry } from "../financial-entries.types";
import { paymentMethodLabel } from "../useFinanceActions";

// B-SAN3-12b — detalhe do LANÇAMENTO, aberto logo abaixo da linha do extrato/conciliação: propriedades e a ação de
// conciliar (F7: só com `financial_entries:update`) ou de DESFAZER (só com `canUnreconcile`, a política calculada pelo
// servidor para o ator). F20: no lançamento conciliado, "Estornar" e "Excluir" aparecem desabilitados com a frase — o
// servidor já recusa estorno/exclusão de conciliado (422 entry_reconciled), e o estorno pela tela é do B-SAN3-24.

export const RECONCILED_LOCK_PHRASE =
  "Este lançamento está conciliado. Para estornar ou excluir, um administrador (ou o Financeiro, se a organização permitir) precisa desfazer a conciliação.";

export function reconciliationPill(entry: Pick<FinancialEntry, "reconciled" | "divergenceType">) {
  if (!entry.reconciled) return <StatusPill label="A conciliar" bg="#EFF6FF" fg="#2563EB" dot="#60A5FA" />;
  if (entry.divergenceType === "value") return <StatusPill label="Com ressalva · valor" bg="#FFFBEB" fg="#B45309" dot="#F59E0B" />;
  if (entry.divergenceType === "date") return <StatusPill label="Com ressalva · data" bg="#FFFBEB" fg="#B45309" dot="#F59E0B" />;
  return <StatusPill label="Conciliado" bg="#ECFDF5" fg="#059669" dot="#22C55E" />;
}

function Field({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="pat-ab-detail-field">
      <span className="pat-ab-detail-label">{label}</span>
      <span className="pat-ab-detail-val">{children}</span>
    </div>
  );
}

const heading = { fontSize: 11, fontWeight: 800, color: "#64748B", letterSpacing: ".06em", textTransform: "uppercase" } as const;

export function EntryDetail({
  entry,
  accountName,
  canReconcile,
  canUnreconcile,
  busy,
  message,
  onReconcile,
  onUnreconcile,
}: {
  readonly entry: FinancialEntry;
  readonly accountName: string | null;
  readonly canReconcile: boolean;
  readonly canUnreconcile: boolean;
  readonly busy: boolean;
  readonly message: string | null;
  readonly onReconcile: () => void;
  readonly onUnreconcile: () => void;
}) {
  const incoming = entry.direction === "in";
  return (
    <div className="pat-ab-detail-content">
      <div className="pat-ab-detail-grid">
        <div className="pat-ab-detail-col">
          <h4 style={heading}>Lançamento</h4>
          <Field label="Data">{formatDueDate(entry.occurredAt)}</Field>
          {entry.description ? <Field label="Descrição">{entry.description}</Field> : null}
          {entry.category ? <Field label="Categoria">{entry.category}</Field> : null}
          <Field label="Origem">{entry.titleId ? "Baixa de título" : "Lançamento sem título vinculado"}</Field>
        </div>
        <div className="pat-ab-detail-col">
          <h4 style={heading}>Conta e valor</h4>
          {accountName ? <Field label="Conta">{accountName}</Field> : null}
          <Field label="Meio">{paymentMethodLabel(entry.paymentMethod)}</Field>
          <Field label="Valor">
            <b style={{ color: incoming ? "#059669" : "#B91C1C" }}>{`${incoming ? "entrada +" : "saída −"}${formatBRL(entry.amount)}`}</b>
          </Field>
        </div>
        <div className="pat-ab-detail-col">
          <h4 style={heading}>Conciliação</h4>
          <Field label="Situação">{reconciliationPill(entry)}</Field>
          {entry.reconciliationRef ? <Field label="Ref. do extrato">{entry.reconciliationRef}</Field> : null}
          {entry.reconciledAt ? <Field label="Conciliado em">{formatDueDate(entry.reconciledAt)}</Field> : null}
        </div>
      </div>

      {message ? (
        <div className="ui-alert ui-alert--danger" role="alert">
          {message}
        </div>
      ) : null}

      <div className="pat-ab-detail-actions">
        {!entry.reconciled && canReconcile ? (
          <button type="button" className="pat-btn pat-btn--primary" onClick={onReconcile} disabled={busy}>
            <Check size={14} aria-hidden="true" />
            Conciliar
          </button>
        ) : null}
        {entry.reconciled && canReconcile && canUnreconcile ? (
          <button type="button" className="pat-btn pat-btn--primary" onClick={onUnreconcile} disabled={busy}>
            <Undo2 size={14} aria-hidden="true" />
            Desfazer conciliação
          </button>
        ) : null}
        {entry.reconciled ? (
          <>
            <button type="button" className="pat-btn" disabled aria-describedby={`trava-${entry.id}`}>
              Estornar
            </button>
            <button type="button" className="pat-btn" disabled aria-describedby={`trava-${entry.id}`}>
              Excluir
            </button>
          </>
        ) : null}
        {!canReconcile ? (
          <span className="pat-cell-muted" style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Lock size={13} aria-hidden="true" /> Seu perfil só consulta o extrato.
          </span>
        ) : null}
      </div>
      {entry.reconciled ? (
        <p id={`trava-${entry.id}`} style={{ fontSize: 12, color: "#64748B", margin: 0 }}>
          {RECONCILED_LOCK_PHRASE}
        </p>
      ) : null}
    </div>
  );
}
