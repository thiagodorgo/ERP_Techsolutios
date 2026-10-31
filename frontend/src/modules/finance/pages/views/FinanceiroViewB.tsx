import { Lock, Plus, Wallet } from "lucide-react";
import { useState, type ReactNode } from "react";

import { BalanceBridge, ColumnBars, ReconcileDonut, type ReconcileDonutFilter } from "../../../../components/charts";
import { PageHeader, StatusPill } from "../../../../components/patterns";
import { StaleDataBanner } from "../../../work-orders/components/StaleDataBanner";
import { StatePanel, StatePanelAction } from "../../../work-orders/components/StatePanel";
import { TitleDetail } from "../../entries/components/TitleDetail";
import { getAccountKindLabel } from "../../accounts/financial-accounts.adapter";
import type { FinancialAccount } from "../../accounts/financial-accounts.types";
import { formatBRL, formatCompactBRL } from "../../titles/financial-titles.adapter";
import { isOpenTitle, monthName, sixMonthCompetencias, targetLabel, titleMatchesTarget } from "../financeiro.state";
import { AGGREGATE_KEYS, EntriesTable, FilterChips, TitlesTable, entryMatchesSearch, titleMatchesSearch, type FilterChipItem, type FinanceiroViewModel } from "./FinanceiroViewA";
import { AnalyticCard, EntryPanel, FilterBlock, FinanceToolbar, PagedRows } from "./financeiro.shared";

// B-SAN3-12c — APARÊNCIA B "Conta em foco" (referência aprovada: `financeiro-baixa-conta-conciliacao-3opcoes.reference.html`,
// `renderB`; tela-modelo imediata: FinanceiroViewA). Cabeçalho · trilho vertical de contas (total + cartões + Nova conta) ·
// conta e saldo no topo · ponte do saldo e rosca da conciliação · 6 meses que filtram o extrato · painel com abas, busca e
// lista de uma linha. VIEW PURA: todo dinheiro chega pronto do servidor (`/financial-summary`, `/balance`, `/aggregate`).

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

const MONTH_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function accountIdentity(account: FinancialAccount): string {
  const currency = account.currency === "BRL" ? "real (BRL)" : account.currency;
  return account.bankName ? `${account.bankName} · ${currency}` : `${getAccountKindLabel(account.kind)} · ${currency}`;
}

function BFrame({ header, children }: { readonly header: ReactNode; readonly children: ReactNode }) {
  return (
    <div data-aparencia="B" className="financeiro-b">
      {header}
      {children}
    </div>
  );
}

export function FinanceiroViewB(model: FinanceiroViewModel) {
  const [openKey, setOpenKey] = useState<string | null>(() => model.payPanel?.titleId ?? null);
  const [search, setSearch] = useState("");
  const selected = model.accounts.items.find((account) => account.id === model.state.accountId) ?? model.accounts.items.find((account) => account.active) ?? null;
  const go = (next: Partial<FinanceiroViewModel["state"]>) => {
    setOpenKey(null);
    model.onCloseReconcile?.();
    model.onState({ ...model.state, ...next });
  };
  const header = <PageHeader kicker="FINANCEIRO · CONTAS" title="Contas e caixa" subtitle="Uma conta por vez: saldo, extrato, baixas e conciliação no mesmo lugar." />;

  if (model.failed) {
    return (
      <BFrame header={header}>
        <StatePanel tone="error" title="Não foi possível carregar as contas" detail="A consulta falhou. Nada foi alterado." actions={<StatePanelAction label="Tentar novamente" onClick={model.onRetry} />} />
      </BFrame>
    );
  }
  if (!model.access.readAccounts || !model.access.readEntries) {
    return (
      <BFrame header={header}>
        <StatePanel tone="forbidden" title="Acesso não permitido" detail="Seu perfil não inclui as contas e os lançamentos desta organização." />
      </BFrame>
    );
  }
  if (model.accounts.loading) {
    return (
      <BFrame header={header}>
        <div className="financeiro-b__grid" aria-busy="true" aria-label="Carregando a conta em foco">
          <div className="financeiro-b__rail">
            {[60, 56, 56, 56].map((height, index) => (
              <span key={index} className="pat-skel" style={{ display: "block", height }} />
            ))}
          </div>
          <div className="pat-table">
            <span className="pat-skel" style={{ display: "block", height: 180, margin: 18 }} />
          </div>
        </div>
      </BFrame>
    );
  }
  if (!selected) {
    return (
      <BFrame header={header}>
        <StatePanel
          tone="empty"
          title="Cadastre a primeira conta"
          detail="Banco, caixa ou carteira digital: escolha uma conta para acompanhar o saldo e a conciliação."
          actions={model.access.createAccount ? <StatePanelAction label="Cadastrar a primeira conta" onClick={model.onNewAccount} /> : undefined}
        />
      </BFrame>
    );
  }

  const balance = model.balances[selected.id] ?? null;
  const pending = count(model, AGGREGATE_KEYS.account(selected.id));
  const reconciled = count(model, AGGREGATE_KEYS.accountReconciled(selected.id));
  const value = count(model, AGGREGATE_KEYS.accountValue(selected.id));
  const date = count(model, AGGREGATE_KEYS.accountDate(selected.id));
  const months = model.aggregates[AGGREGATE_KEYS.accountMonths(selected.id)];
  const orgPending = count(model, AGGREGATE_KEYS.pending);
  const pressed = (Object.entries(donutTarget).find(([, target]) => model.state.target === target)?.[0] as ReconcileDonutFilter | undefined) ?? null;
  const titlesMode = model.state.tab === "rec" || model.state.tab === "pag";
  const toggle = (key: string) => setOpenKey((current) => (current === key ? null : key));

  const monthByBucket = new Map((months?.items ?? []).map((item) => [item.bucket, item]));
  const monthColumns = sixMonthCompetencias().map((competencia) => {
    const item = monthByBucket.get(competencia);
    const name = monthName(competencia);
    return {
      key: `mes:${competencia}`,
      label: MONTH_SHORT[Number(competencia.slice(5)) - 1] ?? competencia,
      ariaLabel: item ? `${name}: entradas ${formatBRL(item.inflow)}, saídas ${formatBRL(item.outflow)} — ver o extrato do mês nesta conta` : `${name}: o servidor não retornou lançamentos nesta conta — ver o extrato do mês`,
      bars: [
        { tone: "inflow" as const, value: item ? item.inflow : null },
        { tone: "outflow" as const, value: item ? item.outflow : null },
      ],
    };
  });

  const rail = (
    <aside className="financeiro-b__rail" aria-label="Contas">
      <div className="financeiro-b__total">
        <span>Total em caixa</span>
        {model.summaryLoading ? <i className="pat-skel" aria-hidden="true" /> : <b>{formatBRL(model.summary.cash.totalBalance)}</b>}
        <small>{`${plural(model.summary.cash.accountCount, "conta ativa", "contas ativas")}${orgPending === null ? "" : ` · ${plural(orgPending, "lançamento", "lançamentos")} a conciliar`}`}</small>
      </div>
      <nav className="financeiro-b__accounts" aria-label="Contas em foco">
        {model.accounts.items.map((account) => {
          const accountBalance = model.balances[account.id] ?? null;
          const accountPending = count(model, AGGREGATE_KEYS.account(account.id));
          return (
            <button key={account.id} type="button" className={account.active ? "financeiro-b__account" : "financeiro-b__account financeiro-b__account--inactive"} aria-pressed={account.id === selected.id} onClick={() => go({ accountId: account.id, tab: "ext", target: null })}>
              <span className="financeiro-b__account-name" title={account.name}>{account.name}</span>
              <span className="financeiro-b__account-line">
                {accountBalance ? <b>{formatBRL(accountBalance.balance)}</b> : <em>Saldo indisponível</em>}
                {!account.active ? <StatusPill sm label="Inativa" bg="#F1F5F9" fg="#64748B" dot="#94A3B8" /> : null}
              </span>
              <small>{`${getAccountKindLabel(account.kind)} · ${accountPending === null ? "contagem indisponível" : accountPending > 0 ? `${accountPending} a conciliar` : "tudo conciliado"}`}</small>
            </button>
          );
        })}
      </nav>
      {model.access.createAccount ? (
        <button type="button" className="pat-btn financeiro-b__new-account" onClick={model.onNewAccount}>
          <Plus size={15} aria-hidden="true" />
          Nova conta
        </button>
      ) : null}
    </aside>
  );

  const loadedTitles = [...model.receivables.items, ...model.payables.items].filter(isOpenTitle);
  const titlesComplete = model.receivables.items.length >= model.receivables.total && model.payables.items.length >= model.payables.total;
  const titlesLoading = model.receivables.loading || model.payables.loading;
  const titlesFailed = model.receivables.failed || model.payables.failed;
  const visibleTitles = loadedTitles.filter((title) => titleMatchesTarget(title, model.state.target) && titleMatchesSearch(title, search)).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const visibleEntries = model.entries.items.filter((entry) => entry.accountId === selected.id && entryMatchesSearch(entry, search));
  const entriesOfAccount = pending !== null && reconciled !== null ? pending + reconciled : null;
  const openTitlesCount = model.summaryLoading ? null : model.summary.receivable.openCount + model.summary.payable.openCount;
  const hasFilter = Boolean(model.state.target || search.trim());

  const chips: FilterChipItem[] = [];
  if (model.state.target) {
    const label = targetLabel(model.state.target);
    chips.push({ key: "target", label, clearLabel: `Remover o filtro ${label}`, onClear: () => go({ target: null }) });
  }
  if (search.trim()) {
    chips.push({
      key: "search",
      label: `Busca: ${search.trim()}`,
      clearLabel: titlesMode ? "Limpar a busca de títulos" : "Limpar a busca do extrato",
      onClear: () => {
        setOpenKey(null);
        setSearch("");
      },
    });
  }

  const tabs = [
    {
      id: "ext",
      label: "Extrato da conta",
      count: entriesOfAccount,
      active: !titlesMode,
      onClick: () => {
        setSearch("");
        go({ tab: "ext", accountId: selected.id, target: null });
      },
    },
    {
      id: "tit",
      label: "Títulos a baixar",
      count: openTitlesCount,
      active: titlesMode,
      onClick: () => {
        setSearch("");
        go({ tab: "rec", accountId: selected.id, target: null });
      },
    },
  ];

  const titlesBody = titlesLoading ? (
    <div aria-busy="true" aria-label="Carregando títulos">
      <span className="pat-skel" style={{ display: "block", height: 120, margin: 18 }} />
    </div>
  ) : titlesFailed ? (
    <StatePanel tone="error" embedded title="Não foi possível carregar os títulos" detail="A consulta falhou. Nada foi alterado." actions={<StatePanelAction label="Tentar novamente" onClick={model.onRetry} />} />
  ) : (
    <>
      <div className="financeiro-bc__intro">
        <Wallet size={14} aria-hidden="true" />
        <span>
          {selected.active ? (
            <>
              A baixa feita aqui já vem com a conta <b>{selected.name}</b> escolhida (dá para trocar).{" "}
            </>
          ) : (
            "Esta conta está desativada: a baixa abre para você escolher uma conta ativa. "
          )}
          <b className="financeiro-bc__in">↑ a receber</b> · <b className="financeiro-bc__out">↓ a pagar</b>.
        </span>
      </div>
      <div className="financeiro-bc__blocks" role="group" aria-label="Blocos de resumo — clique para filtrar">
        {(
          [
            ["venc", "Vencidos", model.summaryLoading ? null : model.summary.receivable.overdueCount + model.summary.payable.overdueCount],
            ["hoje", "Vencem hoje", titlesComplete ? loadedTitles.filter((title) => titleMatchesTarget(title, "hoje")).length : null],
            ["sem7", "Próximos 7 dias", titlesComplete ? loadedTitles.filter((title) => titleMatchesTarget(title, "sem7")).length : null],
            ["parcial", "Recebidos ou pagos em parte", titlesComplete ? loadedTitles.filter((title) => titleMatchesTarget(title, "parcial")).length : null],
          ] as const
        ).map(([target, label, value]) => (
          <FilterBlock
            key={target}
            label={label}
            count={value}
            unavailableLabel={target === "venc" || titlesComplete ? "contagem indisponível" : "contagem disponível depois de carregar todos os títulos"}
            pressed={model.state.target === target}
            onClick={() => go({ target: model.state.target === target ? null : target })}
          />
        ))}
      </div>
      {chips.length > 0 ? <FilterChips items={chips} /> : null}
      {visibleTitles.length === 0 ? (
        <StatePanel tone="empty" embedded title={loadedTitles.length ? "Nada para este filtro" : "Nenhum título em aberto"} detail={loadedTitles.length ? "Remova o filtro ou ajuste a busca para ver mais." : "Tudo baixado por enquanto."} />
      ) : (
        <PagedRows rows={visibleTitles} resetKey={`${model.state.target}|${search}`} onPageChange={() => setOpenKey(null)} rangeLabel={(start, end, total) => `${start}–${end} de ${total} ${titlesComplete ? "títulos" : "resultados carregados"}`}>
          {(rows) => (
            <TitlesTable
              rows={rows}
              receivable={null}
              openKey={openKey}
              onToggle={toggle}
              renderDetail={(title) => (
                <div>
                  <TitleDetail title={title} canPay={model.access.pay} onPay={() => (selected.active ? model.onPay(title, selected.id) : model.onPay(title))} />
                  {model.payPanel?.titleId === title.id ? <div className="financeiro-bc__inline-form">{model.payPanel.node}</div> : null}
                </div>
              )}
            />
          )}
        </PagedRows>
      )}
      {!titlesComplete || hasFilter ? <p className="financeiro-bc__note">{`${visibleTitles.length} resultados entre ${loadedTitles.length} títulos carregados · ${model.receivables.total + model.payables.total} títulos no servidor (sem este filtro)`}</p> : null}
      {model.receivables.hasMore || model.payables.hasMore ? (
        <div className="financeiro-bc__more">
          {model.receivables.hasMore ? (
            <button type="button" className="pat-btn" disabled={model.receivables.loadingMore} onClick={() => void model.receivables.loadMore()}>
              Carregar mais a receber
            </button>
          ) : null}
          {model.payables.hasMore ? (
            <button type="button" className="pat-btn" disabled={model.payables.loadingMore} onClick={() => void model.payables.loadMore()}>
              Carregar mais a pagar
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );

  const entriesBody = model.entries.loading ? (
    <div aria-busy="true" aria-label="Carregando extrato">
      <span className="pat-skel" style={{ display: "block", height: 120, margin: 18 }} />
    </div>
  ) : model.entries.failed ? (
    <StatePanel tone="error" embedded title="Não foi possível carregar o extrato" detail="A consulta falhou. Nada foi alterado." actions={<StatePanelAction label="Tentar novamente" onClick={model.onRetry} />} />
  ) : (
    <>
      {chips.length > 0 ? <FilterChips items={chips} /> : null}
      {visibleEntries.length === 0 ? (
        <StatePanel
          tone="empty"
          embedded
          title={hasFilter ? "Nada para este filtro" : "Nenhum lançamento nesta conta"}
          detail={hasFilter ? "Remova o filtro ou ajuste a busca para ver mais." : "As baixas e os lançamentos desta conta aparecem aqui."}
        />
      ) : (
        <PagedRows
          rows={visibleEntries}
          resetKey={`${selected.id}|${model.state.tab}|${model.state.target}|${search}`}
          onPageChange={() => setOpenKey(null)}
          rangeLabel={(start, end, total) => `${start}–${end} de ${total} lançamentos${model.entries.total > model.entries.items.length ? ` carregados · ${model.entries.total} no servidor` : ""}`}
        >
          {(rows) => (
            <EntriesTable
              rows={rows}
              accountName={() => selected.name}
              openKey={openKey}
              onToggle={toggle}
              renderDetail={(entry) => <EntryPanel model={model} entry={entry} accountName={selected.name} onReconcile={() => model.onReconcile(entry, undefined, true)} />}
            />
          )}
        </PagedRows>
      )}
    </>
  );

  return (
    <BFrame header={header}>
      {model.stale ? <StaleDataBanner lastUpdatedAt={model.lastUpdatedAt} onRetry={model.onRetry} /> : null}
      <div className="financeiro-b__grid">
        {rail}
        <section className="financeiro-b__main" aria-label={`Conta em foco: ${selected.name}`}>
          <div className="financeiro-b__head">
            <div>
              <h2>{selected.name}</h2>
              <p>{accountIdentity(selected)}</p>
            </div>
            <div className="financeiro-b__balance">
              <span>Saldo atual</span>
              {balance ? <b className={balance.balance < 0 ? "financeiro-b__balance-value--negative" : undefined}>{formatBRL(balance.balance)}</b> : <em>Saldo indisponível</em>}
            </div>
          </div>
          {!selected.active ? (
            <div className="pat-banner pat-banner--info" role="status">
              <Lock size={14} aria-hidden="true" />
              Conta desativada: só consulta. Ela não aparece na baixa.
            </div>
          ) : null}
          <div className="financeiro-b__top">
            <AnalyticCard title="De onde vem o saldo" hint="desde a abertura da conta">
              <BalanceBridge
                openingBalance={balance?.openingBalance ?? null}
                inflow={balance?.inflow ?? null}
                outflow={balance?.outflow ?? null}
                balance={balance?.balance ?? null}
                valueFormat={formatBRL}
                labelFormat={formatCompactBRL}
                pressedDirection={model.state.target === "dir:in" ? "in" : model.state.target === "dir:out" ? "out" : null}
                onDirection={(direction) => go({ tab: "ext", accountId: selected.id, target: `dir:${direction}` })}
              />
              {balance ? (
                <div className="financeiro-bc__reading">
                  <span>
                    Abertura <b>{formatBRL(balance.openingBalance)}</b> + entradas <b className="financeiro-bc__in">{formatBRL(balance.inflow)}</b> − saídas <b className="financeiro-bc__out">{formatBRL(balance.outflow)}</b> = <b>{formatBRL(balance.balance)}</b>
                  </span>
                  <span className="financeiro-bc__muted">Clique em Entradas ou Saídas para filtrar o extrato.</span>
                </div>
              ) : null}
            </AnalyticCard>
            <AnalyticCard title="Conciliação desta conta" hint="contagem de lançamentos">
              <ReconcileDonut pending={pending} reconciled={reconciled} valueDivergence={value} dateDivergence={date} pressed={pressed} onFilter={(filter) => go({ tab: "conc", accountId: selected.id, target: donutTarget[filter] })} />
            </AnalyticCard>
          </div>
          <AnalyticCard className="financeiro-b__months" title="Movimento por mês nesta conta" hint="clique no mês para filtrar o extrato">
            {months === null || months === undefined ? (
              <StatePanel tone="error" embedded title="Movimento indisponível" detail="O servidor não respondeu a série desta conta." actions={<StatePanelAction label="Tentar novamente" onClick={model.onRetry} />} />
            ) : (
              <>
                <ColumnBars ariaLabel="Movimento por mês nesta conta" items={monthColumns} height={96} barHeight={60} pressedKey={model.state.target} onSelect={(target) => go({ tab: "ext", accountId: selected.id, target })} />
                <div className="financeiro-bc__reading">
                  <span>
                    <i className="financeiro-bc__swatch financeiro-bc__swatch--in" aria-hidden="true" /> Entradas
                  </span>
                  <span>
                    <i className="financeiro-bc__swatch financeiro-bc__swatch--out" aria-hidden="true" /> Saídas
                  </span>
                  <span className="financeiro-bc__muted">Clique no mês para ver o extrato daquele mês.</span>
                </div>
              </>
            )}
          </AnalyticCard>
          <div className="financeiro-bc__panel" aria-label={titlesMode ? "Títulos a baixar da organização" : "Extrato da conta"}>
            <FinanceToolbar
              label="Dados da conta em foco"
              tabs={tabs}
              search={search}
              onSearch={(next) => {
                setOpenKey(null);
                setSearch(next);
              }}
              searchLabel={titlesMode ? "Buscar nos títulos carregados" : "Buscar nos lançamentos carregados"}
              count={titlesMode ? plural(visibleTitles.length, "título", "títulos") : plural(visibleEntries.length, "lançamento", "lançamentos")}
            />
            {titlesMode ? titlesBody : entriesBody}
          </div>
        </section>
      </div>
    </BFrame>
  );
}
