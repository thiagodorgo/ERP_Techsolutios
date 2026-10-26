import { AlertTriangle, ArrowDownRight, ArrowUpRight, Banknote, CheckCircle2, Clock, Plus, Wallet } from "lucide-react";
import { useState, type ReactNode } from "react";

import { TrendChart } from "../../../../components/charts";
import { DenseTable } from "../../../../components/dense-list";
import type { DenseColumn } from "../../../../components/dense-list/types";
import { KpiStatCard, PageHeader, StatusPill } from "../../../../components/patterns";
import { StaleDataBanner } from "../../../work-orders/components/StaleDataBanner";
import { StatePanel, StatePanelAction } from "../../../work-orders/components/StatePanel";
import { AccountCard } from "../../accounts/components/AccountCard";
import type { FinancialAccount, FinancialAccountBalance } from "../../accounts/financial-accounts.types";
import type { FinancialSummary } from "../../dashboard/financial-summary.types";
import { EntryDetail, reconciliationPill } from "../../entries/components/EntryDetail";
import { TitleDetail } from "../../entries/components/TitleDetail";
import type { EntriesAggregate, FinancialEntry, ReconciliationPolicy } from "../../entries/financial-entries.types";
import { paymentMethodLabel, titleOpenBalance } from "../../entries/useFinanceActions";
import { formatBRL, formatCompactBRL, formatDueDate, getTitleStatusLabel, getTitleStatusTone } from "../../titles/financial-titles.adapter";
import type { FinancialTitle } from "../../titles/financial-titles.types";
import { daysUntil, isOpenTitle, monthName, targetLabel, titleMatchesTarget, type FinanceState, type FinanceTab } from "../financeiro.state";

// B-SAN3-12b — APARÊNCIA A "Abas do Financeiro" (referência aprovada pelo dono, "Aprovo as 3":
// `docs/claude-code-handoff/screen-refs/financeiro-baixa-conta-conciliacao-3opcoes.reference.html`, opção A; padrão
// D-PADRAO-BLOCOS-CLICAVEIS de `financeiro-ab.reference.html`). VIEW PURA: os dados e as ações chegam por props do
// `FinanceiroPage`, que chama cada rota UMA vez (F14) — as aparências B e C (B-SAN3-12c) usam a mesma camada.
// Cabeçalho · 6 indicadores clicáveis (Saldo em caixa, Entradas/Saídas do mês, A receber/pagar vencido, A conciliar) ·
// faixa "Entradas × saídas · 6 meses" + "Conciliação por conta" · abas A receber / A pagar / Contas e extrato /
// Conciliação, cada uma com blocos que filtram e a lista de uma linha que abre o detalhe embaixo, um por vez.
// Todo dinheiro mostrado vem do servidor (`/financial-summary`, `/aggregate`, `/balance`); o front não soma (F8).

export type FinanceListState<T> = {
  readonly items: readonly T[];
  readonly loading: boolean;
  /** A primeira carga falhou e não há dado anterior: a lista é ERRO, nunca vazio (F9). */
  readonly failed: boolean;
  readonly total: number;
};

export type FinanceiroViewModel = {
  readonly state: FinanceState;
  readonly onState: (next: FinanceState) => void;
  readonly summary: FinancialSummary;
  readonly summaryLoading: boolean;
  readonly accounts: FinanceListState<FinancialAccount>;
  readonly balances: Readonly<Record<string, FinancialAccountBalance | null>>;
  readonly receivables: FinanceListState<FinancialTitle>;
  readonly payables: FinanceListState<FinancialTitle>;
  readonly entries: FinanceListState<FinancialEntry>;
  readonly aggregates: Readonly<Record<string, EntriesAggregate | null>>;
  readonly policy: ReconciliationPolicy;
  readonly access: {
    readonly readTitles: boolean;
    readonly readAccounts: boolean;
    readonly pay: boolean;
    readonly reconcile: boolean;
    readonly createAccount: boolean;
  };
  /** Erro de carga sem dado anterior no resumo ou nas contas: a tela inteira vira o painel de erro. */
  readonly failed: boolean;
  readonly stale: boolean;
  readonly lastUpdatedAt: string | null;
  readonly entryBusyId: string | null;
  readonly entryMessage: { readonly entryId: string; readonly text: string } | null;
  readonly onRetry: () => void;
  readonly onNewAccount: () => void;
  readonly onPay: (title: FinancialTitle) => void;
  readonly onReconcile: (entry: FinancialEntry) => void;
  readonly onUnreconcile: (entry: FinancialEntry) => void;
};

const card = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 16 } as const;
const cardTitle = { fontSize: 14, fontWeight: 800, color: "#0F172A", marginBottom: 2 } as const;
const cardSub = { fontSize: 11.5, color: "#94A3B8", marginBottom: 12 } as const;
const MONTH_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** Nomes das consultas de agregado que o `FinanceiroPage` pede (chaves do `aggregates`). */
export const AGGREGATE_KEYS = {
  pending: "pendente",
  reconciled: "conciliado",
  value: "valor",
  date: "data",
  account: (accountId: string) => `conta:${accountId}`,
} as const;

function countOf(aggregate: EntriesAggregate | null | undefined): number | null {
  return aggregate && aggregate.items.length === 1 ? aggregate.items[0].count : null;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function SkeletonRows({ columns }: { readonly columns: number }) {
  return (
    <div aria-busy="true" aria-label="Carregando">
      {Array.from({ length: 6 }).map((_, row) => (
        <div key={row} style={{ display: "flex", gap: 14, padding: "12px 18px", borderBottom: "1px solid #F1F5F9" }}>
          {Array.from({ length: columns }).map((__, col) => (
            <span key={col} className="pat-skel" style={{ width: col === 1 ? "30%" : "12%", height: 12 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

function FilterChip({ label, onClear }: { readonly label: string; readonly onClear: () => void }) {
  return (
    <div className="pat-filtro-chip-bar">
      <span className="pat-filtro-chip">
        {`Filtro: ${label}`}
        <button type="button" onClick={onClear} aria-label={`Remover o filtro ${label}`}>
          ✕
        </button>
      </span>
    </div>
  );
}

function BlockGroup({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="pat-os-tabs" role="group" aria-label={label} style={{ padding: "10px 18px 0", flexWrap: "wrap" }}>
      {children}
    </div>
  );
}

function Block({ label, count, pressed, onClick }: { readonly label: string; readonly count: number | null; readonly pressed: boolean; readonly onClick: () => void }) {
  return (
    <button
      type="button"
      className={pressed ? "pat-os-tab pat-os-tab--active" : "pat-os-tab"}
      aria-pressed={pressed}
      aria-label={`${label}: ${count ?? "contagem indisponível"} — filtrar a lista`}
      onClick={onClick}
    >
      {label}
      {count !== null ? <b style={{ marginLeft: 6 }}>{count}</b> : null}
    </button>
  );
}

export function FinanceiroViewA(model: FinanceiroViewModel) {
  const { state, onState, summary, access } = model;
  const [openKey, setOpenKey] = useState<string | null>(null);
  const go = (next: Partial<FinanceState>) => {
    setOpenKey(null);
    onState({ ...state, ...next });
  };
  const toggleRow = (key: string) => setOpenKey((current) => (current === key ? null : key));

  const header = (
    <PageHeader
      kicker="FINANCEIRO"
      title="Baixas, contas e conciliação"
      subtitle="Registre recebimentos e pagamentos, acompanhe o saldo de cada conta e concilie com o extrato do banco."
      actions={
        access.createAccount ? (
          <button type="button" className="pat-btn pat-btn--primary" onClick={model.onNewAccount}>
            <Plus size={15} aria-hidden="true" />
            Nova conta
          </button>
        ) : undefined
      }
    />
  );

  if (model.failed) {
    return (
      <div data-aparencia="A" style={{ color: "#0F172A" }}>
        {header}
        <StatePanel
          tone="error"
          title="Não foi possível carregar as contas e o extrato"
          detail="A consulta ao servidor falhou. Nada foi alterado. Tente de novo em instantes."
          actions={<StatePanelAction label="Tentar novamente" onClick={model.onRetry} />}
        />
      </div>
    );
  }

  const activeAccounts = model.accounts.items.filter((account) => account.active);
  const accountsReady = !model.accounts.loading && !model.accounts.failed;
  const pendingCount = countOf(model.aggregates[AGGREGATE_KEYS.pending]);
  const pendingAgg = model.aggregates[AGGREGATE_KEYS.pending];
  const competencia = summary.settledThisMonth.competencia;
  const mes = competencia ? monthName(competencia) : "o mês";
  const previous = summary.cashFlow.length >= 2 ? summary.cashFlow[summary.cashFlow.length - 2] : null;
  const isPressed = (tab: FinanceTab, target: string | null) => state.tab === tab && state.target === target && (target !== null || state.accountId === null);

  const kpis = (
    <div className="pat-kpi-row" style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }} aria-busy={model.summaryLoading ? true : undefined}>
      {model.summaryLoading ? (
        Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="pat-kpi" aria-hidden="true">
            <div className="pat-skel" style={{ width: 30, height: 30, borderRadius: 9 }} />
            <div className="pat-skel" style={{ width: "70%", height: 22, marginTop: 12 }} />
            <div className="pat-skel" style={{ width: "50%", height: 11, marginTop: 8 }} />
          </div>
        ))
      ) : (
        <>
          <KpiStatCard
            icon={Wallet}
            iconColor="#2563EB"
            iconBg="#EFF6FF"
            value={formatBRL(summary.cash.totalBalance)}
            label="Saldo em caixa"
            hint={plural(summary.cash.accountCount, "conta ativa", "contas ativas")}
            tag={{ label: "agora", bg: "#F1F5F9", fg: "#475569" }}
            pressed={isPressed("ext", null)}
            onClick={() => go({ tab: "ext", target: null, accountId: null })}
            ariaLabel={`Saldo em caixa: ${formatBRL(summary.cash.totalBalance)} — ver as contas e o extrato`}
          />
          <KpiStatCard
            icon={ArrowUpRight}
            iconColor="#15803D"
            iconBg="#DCFCE7"
            value={formatBRL(summary.settledThisMonth.inflow)}
            label={`Entradas em ${mes}`}
            hint={previous ? `${monthName(previous.competencia)}: ${formatCompactBRL(previous.inflow)}` : "lançamentos do mês"}
            pressed={isPressed("ext", `mes:${competencia}:in`)}
            onClick={() => go({ tab: "ext", target: competencia ? `mes:${competencia}:in` : null })}
            ariaLabel={`Entradas em ${mes}: ${formatBRL(summary.settledThisMonth.inflow)} — ver as entradas do mês`}
          />
          <KpiStatCard
            icon={ArrowDownRight}
            iconColor="#B91C1C"
            iconBg="#FEF2F2"
            value={formatBRL(summary.settledThisMonth.outflow)}
            label={`Saídas em ${mes}`}
            hint={previous ? `${monthName(previous.competencia)}: ${formatCompactBRL(previous.outflow)}` : "lançamentos do mês"}
            pressed={isPressed("ext", `mes:${competencia}:out`)}
            onClick={() => go({ tab: "ext", target: competencia ? `mes:${competencia}:out` : null })}
            ariaLabel={`Saídas em ${mes}: ${formatBRL(summary.settledThisMonth.outflow)} — ver as saídas do mês`}
          />
          <KpiStatCard
            icon={AlertTriangle}
            iconColor="#DC2626"
            iconBg="#FEF2F2"
            value={formatBRL(summary.receivable.overdueAmount)}
            label="A receber vencido"
            hint={`${plural(summary.receivable.overdueCount, "título", "títulos")} para cobrar ou baixar`}
            tag={{ label: plural(summary.receivable.overdueCount, "título", "títulos"), bg: "#FEF2F2", fg: "#B91C1C" }}
            pressed={isPressed("rec", "venc")}
            onClick={() => go({ tab: "rec", target: "venc" })}
            ariaLabel={`A receber vencido: ${formatBRL(summary.receivable.overdueAmount)} — filtrar os títulos vencidos`}
          />
          <KpiStatCard
            icon={Clock}
            iconColor="#B45309"
            iconBg="#FFFBEB"
            value={formatBRL(summary.payable.overdueAmount)}
            label="A pagar vencido"
            hint={`${plural(summary.payable.overdueCount, "título", "títulos")} para pagar ou baixar`}
            tag={{ label: plural(summary.payable.overdueCount, "título", "títulos"), bg: "#FFFBEB", fg: "#B45309" }}
            pressed={isPressed("pag", "venc")}
            onClick={() => go({ tab: "pag", target: "venc" })}
            ariaLabel={`A pagar vencido: ${formatBRL(summary.payable.overdueAmount)} — filtrar os títulos vencidos`}
          />
          <KpiStatCard
            icon={CheckCircle2}
            iconColor="#2563EB"
            iconBg="#EFF6FF"
            value={pendingCount ?? "Indisponível"}
            label="A conciliar"
            hint={pendingAgg && pendingCount !== null ? `${formatBRL(pendingAgg.items[0].inflow)} a entrar · ${formatBRL(pendingAgg.items[0].outflow)} a sair` : "o servidor não respondeu a contagem"}
            pressed={isPressed("conc", "conc:pendente")}
            onClick={() => go({ tab: "conc", target: "conc:pendente" })}
            ariaLabel={`A conciliar: ${pendingCount === null ? "contagem indisponível" : plural(pendingCount, "lançamento", "lançamentos")} — ver a conciliação`}
          />
        </>
      )}
    </div>
  );

  const faixa = model.summaryLoading ? null : (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.25fr) minmax(0, 1fr)", gap: 16, marginBottom: 16 }}>
      <div style={card}>
        <div style={cardTitle}>Entradas × saídas · 6 meses</div>
        <div style={cardSub}>Resumo do servidor. Clique no mês para ver o extrato daquele mês.</div>
        <TrendChart
          type="bar"
          height={130}
          showLegend={false}
          labels={summary.cashFlow.map((point) => MONTH_SHORT[Number(point.competencia.slice(5)) - 1] ?? point.competencia)}
          valueFormat={formatBRL}
          emptyLabel="Sem lançamentos no período."
          series={[
            { id: "inflow", label: "Entradas", color: "var(--color-chart-inflow)", values: summary.cashFlow.map((point) => point.inflow) },
            { id: "outflow", label: "Saídas", color: "var(--color-chart-outflow)", values: summary.cashFlow.map((point) => point.outflow) },
          ]}
        />
        {summary.cashFlow.length > 0 ? (
          <div role="group" aria-label="Meses do fluxo de caixa" style={{ display: "flex", gap: 4, marginTop: 6 }}>
            {summary.cashFlow.map((point) => {
              const target = `mes:${point.competencia}`;
              return (
                <button
                  key={point.competencia}
                  type="button"
                  className={state.tab === "ext" && state.target === target ? "pat-os-tab pat-os-tab--active" : "pat-os-tab"}
                  style={{ flex: 1, justifyContent: "center" }}
                  aria-pressed={state.tab === "ext" && state.target === target}
                  aria-label={`${monthName(point.competencia)}: entradas ${formatBRL(point.inflow)}, saídas ${formatBRL(point.outflow)} — ver o extrato do mês`}
                  onClick={() => go({ tab: "ext", target })}
                >
                  {MONTH_SHORT[Number(point.competencia.slice(5)) - 1] ?? point.competencia}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
      <div style={card}>
        <div style={cardTitle}>Conciliação por conta</div>
        <div style={cardSub}>Lançamentos a conciliar em cada conta (contagem do servidor).</div>
        {!access.readAccounts ? (
          <p style={{ fontSize: 12.5, color: "#64748B" }}>Seu perfil não inclui as contas desta organização.</p>
        ) : activeAccounts.length === 0 ? (
          <p style={{ fontSize: 12.5, color: "#64748B" }}>{model.accounts.loading ? "Carregando…" : "Nenhuma conta cadastrada."}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {activeAccounts.map((account) => {
              const count = countOf(model.aggregates[AGGREGATE_KEYS.account(account.id)]);
              const pressed = state.tab === "conc" && state.accountId === account.id && state.target === "conc:pendente";
              return (
                <button
                  key={account.id}
                  type="button"
                  className={pressed ? "pat-os-tab pat-os-tab--active" : "pat-os-tab"}
                  style={{ justifyContent: "space-between", width: "100%" }}
                  aria-pressed={pressed}
                  aria-label={`${account.name}: ${count === null ? "contagem indisponível" : `${count} a conciliar`} — ver a conciliação da conta`}
                  onClick={() => go({ tab: "conc", accountId: account.id, target: "conc:pendente" })}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={account.name}>
                    {account.name}
                  </span>
                  <b>{count === null ? "contagem indisponível" : `${count} a conciliar`}</b>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const openRec = model.receivables.items.filter(isOpenTitle);
  const openPag = model.payables.items.filter(isOpenTitle);
  const tabs: readonly { readonly id: FinanceTab; readonly label: string; readonly count: number | null }[] = [
    { id: "rec", label: "A receber", count: access.readTitles && !model.receivables.failed ? openRec.length : null },
    { id: "pag", label: "A pagar", count: access.readTitles && !model.payables.failed ? openPag.length : null },
    { id: "ext", label: "Contas e extrato", count: null },
    { id: "conc", label: "Conciliação", count: pendingCount },
  ];

  let intro: ReactNode = null;
  let body: ReactNode = null;
  let counter = "";

  if (state.tab === "rec" || state.tab === "pag") {
    const receivable = state.tab === "rec";
    const list = receivable ? model.receivables : model.payables;
    const base = receivable ? openRec : openPag;
    const visible = base.filter((title) => titleMatchesTarget(title, state.target)).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    counter = plural(visible.length, "título", "títulos");
    if (!access.readTitles) {
      body = (
        <StatePanel
          tone="forbidden"
          embedded
          title="Acesso não permitido"
          detail="Seu perfil não inclui os títulos a receber e a pagar nesta organização. Para mais acesso, fale com o administrador da organização."
        />
      );
      counter = "";
    } else if (list.loading) {
      body = <SkeletonRows columns={6} />;
    } else if (list.failed) {
      body = (
        <StatePanel
          tone="error"
          embedded
          title="Não foi possível carregar os títulos"
          detail="A consulta ao servidor falhou. Nada foi alterado."
          actions={<StatePanelAction label="Tentar novamente" onClick={model.onRetry} />}
        />
      );
      counter = "";
    } else {
      const today = new Date();
      const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const count = (target: string) => base.filter((title) => titleMatchesTarget(title, target, todayIso)).length;
      intro = (
        <>
          <BlockGroup label="Blocos de resumo — clique para filtrar">
            {[
              ["venc", "Vencidos"],
              ["hoje", "Vencem hoje"],
              ["sem7", "Próximos 7 dias"],
              ["parcial", receivable ? "Recebidos em parte" : "Pagos em parte"],
            ].map(([target, label]) => (
              <Block key={target} label={label} count={count(target)} pressed={state.target === target} onClick={() => go({ target: state.target === target ? null : target })} />
            ))}
          </BlockGroup>
          {summary.cheques.linkedPendingCount > 0 ? (
            <p style={{ fontSize: 12, color: "#1E40AF", margin: "8px 18px 0", display: "flex", gap: 6, alignItems: "center" }}>
              <Banknote size={14} aria-hidden="true" />
              {`${formatBRL(summary.cheques.linkedPendingAmount)} em ${plural(summary.cheques.linkedPendingCount, "cheque vinculado", "cheques vinculados")} a títulos aguardam compensação: esses títulos baixam sozinhos quando o cheque compensar.`}
            </p>
          ) : null}
        </>
      );
      if (base.length === 0) {
        body = (
          <StatePanel
            tone="empty"
            embedded
            title={list.items.length === 0 ? "Nenhum título em aberto" : "Tudo baixado"}
            detail={list.items.length === 0 ? "Os títulos emitidos aparecem aqui para a baixa." : "Não há título em aberto nesta direção."}
          />
        );
      } else if (visible.length === 0) {
        body = <StatePanel tone="empty" embedded title="Nada para este filtro" detail="Remova o filtro para ver todos os títulos em aberto." actions={<StatePanelAction label="Remover o filtro" variant="secondary" onClick={() => go({ target: null })} />} />;
      } else {
        body = (
          <TitlesTable
            rows={visible}
            receivable={receivable}
            openKey={openKey}
            onToggle={toggleRow}
            renderDetail={(title) => <TitleDetail title={title} canPay={access.pay} onPay={() => model.onPay(title)} />}
          />
        );
      }
    }
  } else {
    const accountName = (id: string) => model.accounts.items.find((account) => account.id === id)?.name ?? null;
    if (state.tab === "ext") {
      intro =
        access.readAccounts && activeAccounts.length > 0 ? (
          <div role="group" aria-label="Contas — clique para ver o extrato da conta" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, padding: "12px 18px 0" }}>
            {activeAccounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                balance={model.balances[account.id]}
                pendingCount={countOf(model.aggregates[AGGREGATE_KEYS.account(account.id)])}
                selected={state.accountId === account.id}
                onSelect={() => go({ accountId: state.accountId === account.id ? null : account.id })}
              />
            ))}
          </div>
        ) : null;
    } else {
      intro = (
        <BlockGroup label="Situação da conciliação — clique para filtrar">
          {[
            ["conc:pendente", "A conciliar", AGGREGATE_KEYS.pending],
            ["conc:valor", "Com ressalva · valor", AGGREGATE_KEYS.value],
            ["conc:data", "Com ressalva · data", AGGREGATE_KEYS.date],
            ["conc:conciliado", "Conciliados", AGGREGATE_KEYS.reconciled],
          ].map(([target, label, key]) => (
            <Block key={target} label={label} count={countOf(model.aggregates[key])} pressed={state.target === target} onClick={() => go({ target: state.target === target ? null : target })} />
          ))}
        </BlockGroup>
      );
    }
    counter = plural(model.entries.items.length, "lançamento", "lançamentos");
    if (state.tab === "ext" && accountsReady && activeAccounts.length === 0) {
      body = (
        <StatePanel
          tone="empty"
          embedded
          title="Cadastre a primeira conta"
          detail={
            access.createAccount
              ? "Banco, caixa ou carteira digital: a baixa precisa de uma conta para lançar o dinheiro e mostrar o extrato."
              : "Banco, caixa ou carteira digital: a baixa precisa de uma conta. Peça ao Financeiro para cadastrar."
          }
          actions={access.createAccount ? <StatePanelAction label="Cadastrar a primeira conta" onClick={model.onNewAccount} /> : undefined}
        />
      );
      counter = "";
    } else if (model.entries.loading) {
      body = <SkeletonRows columns={6} />;
    } else if (model.entries.failed) {
      body = (
        <StatePanel
          tone="error"
          embedded
          title="Não foi possível carregar o extrato"
          detail="A consulta ao servidor falhou. Nada foi alterado."
          actions={<StatePanelAction label="Tentar novamente" onClick={model.onRetry} />}
        />
      );
      counter = "";
    } else if (model.entries.items.length === 0) {
      body =
        state.target || state.accountId ? (
          <StatePanel
            tone="empty"
            embedded
            title="Nada para este filtro"
            detail="Remova o filtro para ver mais lançamentos."
            actions={<StatePanelAction label="Remover o filtro" variant="secondary" onClick={() => go({ target: null, accountId: null })} />}
          />
        ) : (
          <StatePanel tone="empty" embedded title="Nenhum lançamento ainda" detail="As baixas registradas aparecem aqui, no extrato da conta." />
        );
    } else {
      body = (
        <EntriesTable
          rows={model.entries.items}
          accountName={accountName}
          openKey={openKey}
          onToggle={toggleRow}
          renderDetail={(entry) => (
            <EntryDetail
              entry={entry}
              accountName={accountName(entry.accountId)}
              canReconcile={access.reconcile}
              canUnreconcile={model.policy.canUnreconcile}
              busy={model.entryBusyId === entry.id}
              message={model.entryMessage?.entryId === entry.id ? model.entryMessage.text : null}
              onReconcile={() => model.onReconcile(entry)}
              onUnreconcile={() => model.onUnreconcile(entry)}
            />
          )}
        />
      );
    }
    if (model.entries.total > model.entries.items.length && model.entries.items.length > 0) {
      counter = `${model.entries.items.length} mais recentes de ${model.entries.total} lançamentos`;
    }
  }

  const chipLabel = state.target && !(state.tab === "conc" && state.target.startsWith("conc:")) ? targetLabel(state.target) : null;

  return (
    <div data-aparencia="A" style={{ color: "#0F172A" }}>
      {header}
      {model.stale ? <StaleDataBanner lastUpdatedAt={model.lastUpdatedAt} onRetry={model.onRetry} /> : null}
      {access.readAccounts && accountsReady && activeAccounts.length === 0 && state.tab !== "ext" ? (
        <div className="pat-banner pat-banner--warning" role="status">
          <AlertTriangle size={14} aria-hidden="true" />
          <span>Nenhuma conta cadastrada. A baixa precisa de uma conta (banco, caixa ou carteira digital) para lançar o dinheiro.</span>
          {access.createAccount ? (
            <button type="button" className="pat-link" onClick={model.onNewAccount}>
              Cadastrar a primeira conta
            </button>
          ) : (
            <span>Peça ao Financeiro para cadastrar.</span>
          )}
        </div>
      ) : null}
      {kpis}
      {faixa}
      <div className="pat-table">
        <div className="pat-table__topbar">
          <div className="pat-os-tabs" role="tablist" aria-label="Seções do Financeiro">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={state.tab === item.id}
                className={state.tab === item.id ? "pat-os-tab pat-os-tab--active" : "pat-os-tab"}
                onClick={() => go({ tab: item.id, target: null })}
              >
                {item.label}
                {item.count !== null ? <span style={{ marginLeft: 6, fontWeight: 800 }}>{item.count}</span> : null}
              </button>
            ))}
          </div>
          <span className="pat-table__count">{counter}</span>
        </div>
        {intro}
        {chipLabel ? <FilterChip label={chipLabel} onClear={() => go({ target: null })} /> : null}
        {body}
      </div>
    </div>
  );
}

function TitlesTable({
  rows,
  receivable,
  openKey,
  onToggle,
  renderDetail,
}: {
  readonly rows: readonly FinancialTitle[];
  readonly receivable: boolean;
  readonly openKey: string | null;
  readonly onToggle: (key: string) => void;
  readonly renderDetail: (title: FinancialTitle) => ReactNode;
}) {
  const columns: DenseColumn<FinancialTitle>[] = [
    { key: "doc", header: "DOCUMENTO", width: "18%", render: (t) => t.document ?? <span className="pat-cell-muted">sem documento</span> },
    { key: "party", header: receivable ? "CLIENTE" : "FORNECEDOR", render: (t) => <b>{t.partyName}</b> },
    {
      key: "due",
      header: "VENCIMENTO",
      width: "16%",
      render: (t) => {
        const days = daysUntil(t.dueDate);
        const tag = days < 0 ? { text: `vencido · ${-days} d`, color: "#B91C1C" } : days === 0 ? { text: "hoje", color: "#B45309" } : { text: `em ${days} d`, color: "#64748B" };
        return (
          <>
            {formatDueDate(t.dueDate)} <span style={{ fontSize: 10.5, fontWeight: 800, color: tag.color, marginLeft: 6 }}>{tag.text}</span>
          </>
        );
      },
    },
    { key: "amount", header: "VALOR", width: "12%", align: "right", tabular: true, render: (t) => formatBRL(t.amount) },
    {
      key: "open",
      header: "SALDO EM ABERTO",
      width: "13%",
      align: "right",
      tabular: true,
      render: (t) => <b style={{ color: receivable ? "#059669" : "#B91C1C" }}>{formatBRL(titleOpenBalance(t))}</b>,
    },
    {
      key: "status",
      header: "SITUAÇÃO",
      width: "13%",
      render: (t) => {
        const tone = t.overdue ? { bg: "#FEF2F2", color: "#DC2626" } : getTitleStatusTone(t.status);
        return <StatusPill sm label={t.overdue ? "Vencido" : getTitleStatusLabel(t.status)} bg={tone.bg} fg={tone.color} />;
      },
    },
  ];
  return (
    <DenseTable
      columns={columns}
      rows={rows}
      keyForRow={(t) => t.id}
      sort={null}
      onSort={() => undefined}
      onRowClick={(t) => onToggle(t.id)}
      expandedKey={openKey}
      renderDetail={renderDetail}
      cellTitle={(t, key) => (key === "doc" ? (t.document ?? undefined) : key === "party" ? t.partyName : undefined)}
    />
  );
}

function EntriesTable({
  rows,
  accountName,
  openKey,
  onToggle,
  renderDetail,
}: {
  readonly rows: readonly FinancialEntry[];
  readonly accountName: (id: string) => string | null;
  readonly openKey: string | null;
  readonly onToggle: (key: string) => void;
  readonly renderDetail: (entry: FinancialEntry) => ReactNode;
}) {
  const columns: DenseColumn<FinancialEntry>[] = [
    { key: "date", header: "DATA", width: "11%", render: (e) => formatDueDate(e.occurredAt) },
    { key: "desc", header: "DESCRIÇÃO", render: (e) => e.description ?? <span className="pat-cell-muted">sem descrição</span> },
    { key: "account", header: "CONTA", width: "16%", render: (e) => accountName(e.accountId) ?? <span className="pat-cell-muted">conta não listada</span> },
    { key: "method", header: "MEIO", width: "11%", render: (e) => paymentMethodLabel(e.paymentMethod) },
    {
      key: "amount",
      header: "VALOR",
      width: "13%",
      align: "right",
      tabular: true,
      render: (e) => <b style={{ color: e.direction === "in" ? "#059669" : "#B91C1C" }}>{`${e.direction === "in" ? "+" : "−"}${formatBRL(e.amount)}`}</b>,
    },
    { key: "conc", header: "CONCILIAÇÃO", width: "17%", render: (e) => reconciliationPill(e) },
  ];
  return (
    <DenseTable
      columns={columns}
      rows={rows}
      keyForRow={(e) => e.id}
      sort={null}
      onSort={() => undefined}
      onRowClick={(e) => onToggle(e.id)}
      expandedKey={openKey}
      renderDetail={renderDetail}
      cellTitle={(e, key) => (key === "desc" ? (e.description ?? undefined) : key === "account" ? (accountName(e.accountId) ?? undefined) : undefined)}
    />
  );
}
