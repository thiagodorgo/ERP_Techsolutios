import { ArrowDownRight, ArrowUpRight, Link2, Lock } from "lucide-react";
import type { ReactNode } from "react";

import { formatBRL, formatDueDate, getTitleStatusLabel } from "../../titles/financial-titles.adapter";
import type { FinancialTitle } from "../../titles/financial-titles.types";
import { titleOpenBalance } from "../useFinanceActions";

// B-SAN3-12b — detalhe do TÍTULO, aberto logo abaixo da linha (D-PADRAO-BLOCOS-CLICAVEIS): propriedades + a ação da
// baixa. A baixa SAIU do menu ⋮ e vive aqui (B2 do plano v2). "Registrar recebimento/pagamento" só com
// `financial_entries:create` e em título que não está quitado nem cancelado (F7). Campo sem dado não é renderizado (F19).

function Field({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="pat-ab-detail-field">
      <span className="pat-ab-detail-label">{label}</span>
      <span className="pat-ab-detail-val">{children}</span>
    </div>
  );
}

export function TitleDetail({ title, canPay, onPay }: { readonly title: FinancialTitle; readonly canPay: boolean; readonly onPay: () => void }) {
  const receivable = title.direction === "receivable";
  const open = titleOpenBalance(title);
  const terminal = title.status === "paid" || title.status === "cancelled";
  const ActionIcon = receivable ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="pat-ab-detail-content">
      <div className="pat-ab-detail-grid pat-ab-detail-grid--2">
        <div className="pat-ab-detail-col">
          <h4 style={{ fontSize: 11, fontWeight: 800, color: "#64748B", letterSpacing: ".06em", textTransform: "uppercase" }}>Título</h4>
          {title.document ? <Field label="Documento">{title.document}</Field> : null}
          <Field label={receivable ? "Cliente" : "Fornecedor"}>{title.partyName}</Field>
          {title.category ? <Field label="Categoria">{title.category}</Field> : null}
          {title.description ? <Field label="Descrição">{title.description}</Field> : null}
          <Field label="Vencimento">{formatDueDate(title.dueDate)}</Field>
          <Field label="Situação">{title.overdue && !terminal ? "Vencido" : getTitleStatusLabel(title.status)}</Field>
        </div>
        <div className="pat-ab-detail-col">
          <h4 style={{ fontSize: 11, fontWeight: 800, color: "#64748B", letterSpacing: ".06em", textTransform: "uppercase" }}>Valores</h4>
          <Field label="Valor">{formatBRL(title.amount)}</Field>
          <Field label={receivable ? "Já recebido" : "Já pago"}>{formatBRL(title.paidAmount)}</Field>
          <Field label="Saldo em aberto">
            <b style={{ color: open > 0 ? "#0F172A" : "#059669" }}>{formatBRL(open)}</b>
          </Field>
        </div>
      </div>
      <div className="pat-ab-detail-actions">
        {canPay && !terminal ? (
          <button type="button" className="pat-btn pat-btn--primary" onClick={onPay}>
            <ActionIcon size={14} aria-hidden="true" />
            {receivable ? "Registrar recebimento" : "Registrar pagamento"}
          </button>
        ) : null}
        {title.workOrderId ? (
          <a className="pat-btn" href={`/work-orders/${encodeURIComponent(title.workOrderId)}`}>
            <Link2 size={14} aria-hidden="true" /> Ver a ordem de serviço
          </a>
        ) : null}
        {!canPay ? (
          <span className="pat-cell-muted" style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Lock size={13} aria-hidden="true" /> Seu perfil só consulta os títulos e o extrato.
          </span>
        ) : terminal ? (
          <span className="pat-cell-muted" style={{ fontSize: 12 }}>
            {title.status === "paid" ? "Título quitado." : "Título cancelado."}
          </span>
        ) : null}
      </div>
    </div>
  );
}
