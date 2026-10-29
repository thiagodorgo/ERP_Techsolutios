import { AlertTriangle, Plus } from "lucide-react";

import { BalanceBridge, ReconcileDonut, TrendChart, type ReconcileDonutFilter } from "../../../../components/charts";
import { PageHeader } from "../../../../components/patterns";
import { StaleDataBanner } from "../../../work-orders/components/StaleDataBanner";
import { StatePanel, StatePanelAction } from "../../../work-orders/components/StatePanel";
import { formatBRL } from "../../titles/financial-titles.adapter";
import { targetLabel } from "../financeiro.state";
import { AGGREGATE_KEYS, type FinanceiroViewModel } from "./FinanceiroViewA";

function count(model: FinanceiroViewModel, key: string): number | null {
  const aggregate = model.aggregates[key];
  return aggregate && aggregate.items.length === 1 ? aggregate.items[0].count : null;
}

const donutTarget: Record<ReconcileDonutFilter, string> = {
  pending: "conc:pendente",
  value: "conc:valor",
  date: "conc:data",
  reconciled: "conc:conciliado",
};

export function FinanceiroViewB(model: FinanceiroViewModel) {
  const active = model.accounts.items.filter((account) => account.active);
  const selected = active.find((account) => account.id === model.state.accountId) ?? active[0] ?? null;
  const go = (next: Partial<FinanceiroViewModel["state"]>) => model.onState({ ...model.state, ...next });
  const header = (
    <PageHeader
      kicker="FINANCEIRO · CONTA EM FOCO"
      title="Conta, saldo e conciliação"
      subtitle="Acompanhe uma conta por vez e filtre o extrato sem misturar o saldo da organização."
      actions={
        model.access.createAccount ? (
          <button type="button" className="pat-btn pat-btn--primary" onClick={model.onNewAccount}>
            <Plus size={15} aria-hidden="true" /> Nova conta
          </button>
        ) : undefined
      }
    />
  );

  if (model.failed) {
    return (
      <div data-aparencia="B" className="financeiro-b">
        {header}
        <StatePanel tone="error" title="Não foi possível carregar as contas" detail="A consulta falhou. Nada foi alterado." actions={<StatePanelAction label="Tentar novamente" onClick={model.onRetry} />} />
      </div>
    );
  }
  if (!model.access.readAccounts || !model.access.readEntries) {
    return (
      <div data-aparencia="B" className="financeiro-b">
        {header}
        <StatePanel tone="forbidden" title="Acesso não permitido" detail="Seu perfil não inclui as contas e os lançamentos desta organização." />
      </div>
    );
  }
  if (model.accounts.loading) {
    return (
      <div data-aparencia="B" className="financeiro-b">
        {header}
        <div className="pat-table" aria-busy="true" aria-label="Carregando a conta em foco"><span className="pat-skel" style={{ display: "block", height: 180 }} /></div>
      </div>
    );
  }
  if (!selected) {
    return (
      <div data-aparencia="B" className="financeiro-b">
        {header}
        <StatePanel
          tone="empty"
          title="Cadastre a primeira conta"
          detail="Banco, caixa ou carteira digital: escolha uma conta para acompanhar o saldo e a conciliação."
          actions={model.access.createAccount ? <StatePanelAction label="Cadastrar a primeira conta" onClick={model.onNewAccount} /> : undefined}
        />
      </div>
    );
  }

  const balance = model.balances[selected.id] ?? null;
  const pending = count(model, AGGREGATE_KEYS.account(selected.id));
  const reconciled = count(model, AGGREGATE_KEYS.accountReconciled(selected.id));
  const value = count(model, AGGREGATE_KEYS.accountValue(selected.id));
  const date = count(model, AGGREGATE_KEYS.accountDate(selected.id));
  const months = model.aggregates[AGGREGATE_KEYS.accountMonths(selected.id)];
  const pressed = (Object.entries(donutTarget).find(([, target]) => model.state.target === target)?.[0] as ReconcileDonutFilter | undefined) ?? null;

  return (
    <div data-aparencia="B" className="financeiro-b">
      {header}
      {model.stale ? <StaleDataBanner lastUpdatedAt={model.lastUpdatedAt} onRetry={model.onRetry} /> : null}
      <nav className="financeiro-b__accounts" aria-label="Contas em foco">
        {model.accounts.items.map((account) => (
          <button
            key={account.id}
            type="button"
            className={account.id === selected.id ? "pat-os-tab pat-os-tab--active" : "pat-os-tab"}
            aria-pressed={account.id === selected.id}
            onClick={() => go({ accountId: account.id, tab: "ext", target: null })}
          >
            {account.name}
            {!account.active ? " · inativa" : ""}
          </button>
        ))}
      </nav>
      <section className="financeiro-b__focus" aria-label={`Conta em foco: ${selected.name}`}>
        <div>
          <span className="pat-kicker">CONTA EM FOCO</span>
          <h2>{selected.name}</h2>
          <p>{[selected.kind, selected.bankName, selected.currency].filter(Boolean).join(" · ")}</p>
        </div>
        <strong className="dense-col-tabular">{balance ? formatBRL(balance.balance) : "Saldo indisponível"}</strong>
      </section>
      {model.state.target ? (
        <div className="pat-filtro-chip-bar">
          <span className="pat-filtro-chip">{`Filtro: ${targetLabel(model.state.target)}`}<button type="button" aria-label="Remover o filtro" onClick={() => go({ target: null })}>✕</button></span>
        </div>
      ) : null}
      <div className="financeiro-b__analytics">
        <article className="pat-table">
          <h3>De onde vem o saldo</h3>
          <BalanceBridge
            openingBalance={balance?.openingBalance ?? null}
            inflow={balance?.inflow ?? null}
            outflow={balance?.outflow ?? null}
            balance={balance?.balance ?? null}
            valueFormat={formatBRL}
            pressedDirection={model.state.target === "dir:in" ? "in" : model.state.target === "dir:out" ? "out" : null}
            onDirection={(direction) => go({ tab: "ext", accountId: selected.id, target: `dir:${direction}` })}
          />
        </article>
        <article className="pat-table">
          <h3>Conciliação desta conta</h3>
          <ReconcileDonut
            pending={pending}
            reconciled={reconciled}
            valueDivergence={value}
            dateDivergence={date}
            pressed={pressed}
            onFilter={(filter) => go({ tab: "conc", accountId: selected.id, target: donutTarget[filter] })}
          />
        </article>
      </div>
      <article className="pat-table">
        <h3>Movimento da conta · 6 meses</h3>
        {months === null || months === undefined ? (
          <StatePanel tone="error" embedded title="Movimento indisponível" detail="O servidor não respondeu a série desta conta." actions={<StatePanelAction label="Tentar novamente" onClick={model.onRetry} />} />
        ) : (
          <TrendChart
            type="bar"
            height={120}
            labels={months.items.map((item) => item.bucket ?? "")}
            valueFormat={formatBRL}
            series={[
              { id: "in", label: "Entradas", color: "var(--color-chart-inflow)", values: months.items.map((item) => item.inflow) },
              { id: "out", label: "Saídas", color: "var(--color-chart-outflow)", values: months.items.map((item) => item.outflow) },
            ]}
          />
        )}
      </article>
      {balance === null ? <div className="pat-banner pat-banner--warning"><AlertTriangle size={14} aria-hidden="true" /> Saldo indisponível: nenhum valor foi substituído por zero.</div> : null}
    </div>
  );
}
