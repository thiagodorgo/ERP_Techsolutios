import { ArrowUpRight, ClipboardList, Users } from "lucide-react";
import type { ReactNode } from "react";

import { ClickableKpiCard } from "../../../components/kpi";
import type { GroupPanelCoverage, GroupPanelOrganization } from "../group-panel.types";
import { blockStatusLabel, formatCount, formatMinutes, formatMoney, isOrganizationFailed, monthName, profileLabel, variationText } from "../group-panel.state";

// B-GRUPO-GESTOR-1b — o detalhe do pátio, aberto logo abaixo da linha (lote item 6, Emenda 2 §2.4; molde do
// `finance/entries/components/TitleDetail.tsx`: `.pat-ab-detail-grid` com colunas de propriedades e a fila de ações).
// Só mostra campos do servidor. Pátio em erro sai SEM número nenhum (K1); bloco sem acesso diz o porquê.

export type GroupPanelShortcut = "finance" | "work-orders" | "users";

function Field({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="pat-ab-detail-field">
      <span className="pat-ab-detail-label">{label}</span>
      <span className="pat-ab-detail-val">{children}</span>
    </div>
  );
}

function ColumnTitle({ children }: { readonly children: ReactNode }) {
  return <h4 style={{ fontSize: 11, fontWeight: 800, color: "#64748B", letterSpacing: ".06em", textTransform: "uppercase", margin: 0 }}>{children}</h4>;
}

function Unavailable({ children }: { readonly children: ReactNode }) {
  return <span className="pat-cell-muted" style={{ fontSize: 12 }}>{children}</span>;
}

export function GroupPanelOrganizationDetail({
  organization,
  coverage,
  busy,
  message,
  onShortcut,
}: {
  readonly organization: GroupPanelOrganization;
  readonly coverage: GroupPanelCoverage;
  /** Troca de pátio em andamento (o atalho usa o `POST /auth/active-tenant` que já existe). */
  readonly busy: boolean;
  readonly message: string | null;
  readonly onShortcut: (organization: GroupPanelOrganization, destination: GroupPanelShortcut) => void;
}) {
  const failed = isOrganizationFailed(organization, coverage);
  const finance = !failed && organization.finance.status === "ok" ? organization.finance.summary : null;
  const operations = !failed && organization.operations.status === "ok" ? organization.operations.summary : null;
  const staff = !failed && organization.staff.status === "ok" ? organization.staff.summary : null;
  const competencia = finance?.settledThisMonth.competencia ?? "";
  const mes = competencia ? monthName(competencia) : "o mês";

  const actions = (
    <div className="pat-ab-detail-actions">
      {organization.finance.status === "ok" || organization.finance.status === "erro" ? (
        <button type="button" className="pat-btn pat-btn--primary" disabled={busy} onClick={() => onShortcut(organization, "finance")}>
          <ArrowUpRight size={14} aria-hidden="true" /> Abrir o Financeiro deste pátio
        </button>
      ) : null}
      {organization.operations.status === "ok" || organization.operations.status === "erro" ? (
        <button type="button" className="pat-btn" disabled={busy} onClick={() => onShortcut(organization, "work-orders")}>
          <ClipboardList size={14} aria-hidden="true" /> Ver os chamados
        </button>
      ) : null}
      {organization.staff.status === "ok" || organization.staff.status === "erro" ? (
        <button type="button" className="pat-btn" disabled={busy} onClick={() => onShortcut(organization, "users")}>
          <Users size={14} aria-hidden="true" /> Ver os usuários
        </button>
      ) : null}
      {busy ? <Unavailable>Abrindo o pátio…</Unavailable> : null}
      {message ? (
        <span role="alert" style={{ fontSize: 12, color: "#B91C1C", fontWeight: 600 }}>
          {message}
        </span>
      ) : null}
    </div>
  );

  if (failed) {
    return (
      <div className="pat-ab-detail-content" data-state="patio-em-erro">
        <div className="pat-banner pat-banner--error" role="status" style={{ marginBottom: 0 }}>
          A leitura de {organization.name} falhou nesta atualização. Nenhum número deste pátio foi mostrado, e o total do grupo não foi somado.
        </div>
        {actions}
      </div>
    );
  }

  return (
    <div className="pat-ab-detail-content">
      <div className="pat-ab-detail-grid" style={{ gridTemplateColumns: "1.2fr 1fr 1fr 1fr" }}>
        <div className="pat-ab-detail-col">
          <ColumnTitle>Financeiro</ColumnTitle>
          {finance ? (
            <>
              <Field label="Vencidos a receber">
                <b style={{ color: finance.receivable.overdueAmount > 0 ? "#B91C1C" : "#0F172A" }}>{formatMoney(finance.receivable.overdueAmount)}</b>
                {` · ${formatCount(finance.receivable.overdueCount)} ${finance.receivable.overdueCount === 1 ? "título" : "títulos"}`}
              </Field>
              <Field label="Vencidos a pagar">{`${formatMoney(finance.payable.overdueAmount)} · ${formatCount(finance.payable.overdueCount)} ${finance.payable.overdueCount === 1 ? "título" : "títulos"}`}</Field>
              <Field label={`Recebido em ${mes}`}>{`${formatMoney(finance.settledThisMonth.inflow)} (${variationText(organization.finance.receivedVariationPct, competencia)})`}</Field>
              <Field label={`Pago em ${mes}`}>{`${formatMoney(finance.settledThisMonth.outflow)} (${variationText(organization.finance.paidVariationPct, competencia)})`}</Field>
              <Field label="Cheques a compensar">{`${formatMoney(finance.cheques.pendingReceivedAmount)} · ${formatCount(finance.cheques.pendingReceivedCount)} recebidos`}</Field>
              <Field label="Caixa">{`${formatMoney(finance.cash.totalBalance)} · ${formatCount(finance.cash.accountCount)} ${finance.cash.accountCount === 1 ? "conta" : "contas"}`}</Field>
            </>
          ) : (
            <Unavailable>{`Financeiro ${blockStatusLabel(organization.finance.status)} neste pátio.`}</Unavailable>
          )}
        </div>
        <div className="pat-ab-detail-col">
          <ColumnTitle>Chamados</ColumnTitle>
          {operations ? (
            <>
              <Field label="No mês">{formatCount(operations.openedThisMonth)}</Field>
              <Field label="Concluídos">{operations.completionRatePct === null ? "sem chamado no mês" : `${operations.completionRatePct}% (${formatCount(operations.completedThisMonth)})`}</Field>
              <Field label="Mês anterior">{formatCount(operations.openedPreviousMonth)}</Field>
              <Field label="Em andamento">{formatCount(operations.inProgress)}</Field>
              <Field label="Atrasados">
                <b style={{ color: operations.overdue > 0 ? "#B91C1C" : "#0F172A" }}>{formatCount(operations.overdue)}</b>
              </Field>
              <Field label="Abertos hoje">{formatCount(operations.openedToday)}</Field>
            </>
          ) : (
            <Unavailable>{`Chamados ${blockStatusLabel(organization.operations.status)} neste pátio.`}</Unavailable>
          )}
        </div>
        <div className="pat-ab-detail-col">
          <ColumnTitle>Tempo de atendimento</ColumnTitle>
          {operations ? (
            <>
              <Field label="Até a chegada">{operations.arrivalAvgMinutes === null ? "sem chegada no mês" : formatMinutes(operations.arrivalAvgMinutes)}</Field>
              <Field label="Chamados na média">{formatCount(operations.arrivalCount)}</Field>
              <Field label="Sem chegada registrada">{formatCount(operations.arrivalMissingCount)}</Field>
              <Field label="Até a conclusão">{operations.completionAvgMinutes === null ? "sem conclusão no mês" : formatMinutes(operations.completionAvgMinutes)}</Field>
            </>
          ) : (
            <Unavailable>{`Tempo ${blockStatusLabel(organization.operations.status)} neste pátio.`}</Unavailable>
          )}
        </div>
        <div className="pat-ab-detail-col">
          <ColumnTitle>Funcionários</ColumnTitle>
          {staff ? (
            <>
              <ClickableKpiCard
                detail={{
                  title: `Funcionários de ${organization.name}`,
                  value: `${formatCount(staff.activeUsers)} ${staff.activeUsers === 1 ? "ativo" : "ativos"}`,
                  caption: "Quem tem dois perfis conta em cada perfil; o total de ativos conta a pessoa uma vez.",
                  source: "api",
                  body: {
                    kind: "breakdown",
                    parts: staff.byProfile.map((item) => ({ label: profileLabel(item.profile), value: formatCount(item.count) })),
                  },
                }}
                style={{ borderRadius: 8, padding: "2px 0" }}
              >
                <Field label="Ativos">
                  <span className="pat-link" style={{ fontWeight: 700 }}>{`${formatCount(staff.activeUsers)} · ver por perfil`}</span>
                </Field>
              </ClickableKpiCard>
              <Field label="Em atendimento agora">{formatCount(staff.inServiceNow)}</Field>
            </>
          ) : (
            <Unavailable>{`Funcionários ${blockStatusLabel(organization.staff.status)} neste pátio.`}</Unavailable>
          )}
        </div>
      </div>
      {actions}
    </div>
  );
}
