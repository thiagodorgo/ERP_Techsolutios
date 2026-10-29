import { AlertTriangle, Plus } from "lucide-react";
import { useState } from "react";

import { BalanceBridge, ReconcileDonut, TrendChart, type ReconcileDonutFilter } from "../../../../components/charts";
import { PageHeader } from "../../../../components/patterns";
import { StaleDataBanner } from "../../../work-orders/components/StaleDataBanner";
import { StatePanel, StatePanelAction } from "../../../work-orders/components/StatePanel";
import { EntryDetail } from "../../entries/components/EntryDetail";
import { TitleDetail } from "../../entries/components/TitleDetail";
import { getAccountKindLabel } from "../../accounts/financial-accounts.adapter";
import { formatBRL } from "../../titles/financial-titles.adapter";
import { isOpenTitle, targetLabel, titleMatchesTarget } from "../financeiro.state";
import { AGGREGATE_KEYS, EntriesTable, TitlesTable, titleMatchesSearch, type FinanceiroViewModel } from "./FinanceiroViewA";

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
  const [openKey, setOpenKey] = useState<string | null>(() => model.payPanel?.titleId ?? null);
  const [titleSearch, setTitleSearch] = useState("");
  const selected = model.accounts.items.find((account) => account.id === model.state.accountId) ?? model.accounts.items.find((account) => account.active) ?? null;
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
  const titlesMode = model.state.tab === "rec" || model.state.tab === "pag";
  const visibleEntries = model.entries.items.filter((entry) => entry.accountId === selected.id);
  const loadedTitles = [...model.receivables.items, ...model.payables.items].filter(isOpenTitle);
  const visibleTitles = loadedTitles
    .filter((title) => titleMatchesTarget(title, model.state.target) && titleMatchesSearch(title, titleSearch))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const toggle = (key: string) => setOpenKey((current) => (current === key ? null : key));

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
          <p>{[getAccountKindLabel(selected.kind), selected.bankName, selected.currency].filter(Boolean).join(" · ")}</p>
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
      <section className="pat-table financeiro-b__list" aria-label={titlesMode ? "Títulos a baixar da organização" : "Extrato da conta"}>
        <div className="pat-os-tabs" role="tablist" aria-label="Dados da conta em foco">
          <button type="button" role="tab" className={!titlesMode ? "pat-os-tab pat-os-tab--active" : "pat-os-tab"} aria-selected={!titlesMode} onClick={() => { setOpenKey(null); go({ tab: "ext", accountId: selected.id, target: null }); }}>
            {`Extrato da conta · ${visibleEntries.length}`}
          </button>
          <button type="button" role="tab" className={titlesMode ? "pat-os-tab pat-os-tab--active" : "pat-os-tab"} aria-selected={titlesMode} onClick={() => { setOpenKey(null); go({ tab: "rec", accountId: selected.id, target: null }); }}>
            {`Títulos a baixar · ${loadedTitles.length}`}
          </button>
        </div>
        {titlesMode ? (
          !model.access.readTitles ? (
            <StatePanel tone="forbidden" embedded title="Acesso não permitido" detail="Seu perfil não inclui os títulos desta organização." />
          ) : model.receivables.loading || model.payables.loading ? (
            <div aria-busy="true" aria-label="Carregando títulos"><span className="pat-skel" style={{ display: "block", height: 120 }} /></div>
          ) : model.receivables.failed || model.payables.failed ? (
            <StatePanel tone="error" embedded title="Não foi possível carregar os títulos" detail="A consulta falhou. Nada foi alterado." actions={<StatePanelAction label="Tentar novamente" onClick={model.onRetry} />} />
          ) : (
            <>
              <div className="financeiro-b__list-tools">
                <p>{`A baixa já abre com ${selected.name} escolhida; você ainda pode trocar a conta.`}</p>
                <label className="pat-field">
                  <span>Buscar nos títulos carregados</span>
                  <input type="search" value={titleSearch} placeholder="Documento, cliente, fornecedor ou descrição" onChange={(event) => { setOpenKey(null); setTitleSearch(event.currentTarget.value); }} />
                </label>
              </div>
              {titleSearch.trim() ? <div className="pat-filtro-chip-bar"><span className="pat-filtro-chip">{`Filtro: Busca: ${titleSearch.trim()}`}<button type="button" aria-label="Limpar a busca de títulos" onClick={() => setTitleSearch("")}>✕</button></span></div> : null}
              {visibleTitles.length === 0 ? (
                <StatePanel tone="empty" embedded title={loadedTitles.length ? "Nada para este filtro" : "Nenhum título em aberto"} detail={loadedTitles.length ? "Limpe a busca ou o filtro para ver os títulos carregados." : "Tudo baixado por enquanto."} />
              ) : (
                <TitlesTable
                  rows={visibleTitles}
                  receivable={null}
                  openKey={openKey}
                  onToggle={toggle}
                  renderDetail={(title) => (
                    <div>
                      <TitleDetail title={title} canPay={model.access.pay} onPay={() => model.onPay(title, selected.id)} />
                      {model.payPanel?.titleId === title.id ? <div className="financeiro-b__inline-form">{model.payPanel.node}</div> : null}
                    </div>
                  )}
                />
              )}
              <p className="pat-cell-muted">{`${visibleTitles.length} resultados entre ${loadedTitles.length} títulos carregados · ${model.receivables.total + model.payables.total} títulos no servidor (sem esta busca)`}</p>
              {model.receivables.hasMore || model.payables.hasMore ? (
                <div className="pat-ab-detail-actions">
                  {model.receivables.hasMore ? <button type="button" className="pat-btn" disabled={model.receivables.loadingMore} onClick={() => void model.receivables.loadMore()}>Carregar mais a receber</button> : null}
                  {model.payables.hasMore ? <button type="button" className="pat-btn" disabled={model.payables.loadingMore} onClick={() => void model.payables.loadMore()}>Carregar mais a pagar</button> : null}
                </div>
              ) : null}
            </>
          )
        ) : model.entries.loading ? (
          <div aria-busy="true" aria-label="Carregando extrato"><span className="pat-skel" style={{ display: "block", height: 120 }} /></div>
        ) : model.entries.failed ? (
          <StatePanel tone="error" embedded title="Não foi possível carregar o extrato" detail="A consulta falhou. Nada foi alterado." actions={<StatePanelAction label="Tentar novamente" onClick={model.onRetry} />} />
        ) : visibleEntries.length === 0 ? (
          <StatePanel tone="empty" embedded title="Nenhum lançamento nesta conta" detail="As baixas e os lançamentos desta conta aparecem aqui." />
        ) : (
          <EntriesTable
            rows={visibleEntries}
            accountName={() => selected.name}
            openKey={openKey}
            onToggle={toggle}
            renderDetail={(entry) => (
              <EntryDetail
                entry={entry}
                accountName={selected.name}
                canReconcile={model.access.reconcile}
                canUnreconcile={model.policy.canUnreconcile}
                busy={model.entryBusyId === entry.id}
                message={model.entryMessage?.entryId === entry.id ? model.entryMessage.text : null}
                onReconcile={() => model.onReconcile(entry)}
                onUnreconcile={() => model.onUnreconcile(entry)}
              />
            )}
          />
        )}
      </section>
      {balance === null ? <div className="pat-banner pat-banner--warning"><AlertTriangle size={14} aria-hidden="true" /> Saldo indisponível: nenhum valor foi substituído por zero.</div> : null}
    </div>
  );
}
