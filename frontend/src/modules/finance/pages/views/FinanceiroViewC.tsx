import { AlertTriangle, Banknote, CheckCircle2, Play, Receipt, SkipForward } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ColumnBars, DayBars, type ColumnBarTone, type DayBar } from "../../../../components/charts";
import { KpiStatCard, PageHeader } from "../../../../components/patterns";
import { StaleDataBanner } from "../../../work-orders/components/StaleDataBanner";
import { StatePanel, StatePanelAction } from "../../../work-orders/components/StatePanel";
import { TitleDetail } from "../../entries/components/TitleDetail";
import type { FinancialEntry } from "../../entries/financial-entries.types";
import { formatBRL, formatCompactBRL, formatDueDate } from "../../titles/financial-titles.adapter";
import type { FinancialTitle } from "../../titles/financial-titles.types";
import { daysUntil, fourteenDayDates, isOpenTitle, localIsoDate, targetLabel, titleMatchesTarget, type PendingAgeKey } from "../financeiro.state";
import { AGGREGATE_KEYS, EntriesTable, FilterChips, TitlesTable, entryMatchesSearch, titleMatchesSearch, type FilterChipItem, type FinanceiroViewModel } from "./FinanceiroViewA";
import { AnalyticCard, EntryPanel, FilterBlock, FinanceToolbar, PagedRows } from "./financeiro.shared";

// B-SAN3-12c — APARÊNCIA C "Conferência do caixa" (referência aprovada: `financeiro-baixa-conta-conciliacao-3opcoes.reference.html`,
// `renderC`; tela-modelo imediata: FinanceiroViewA). Cabeçalho com "Começar a conferência" · 4 indicadores (3 passos + cheques) ·
// 14 dias + idade das pendências · painel com os 4 passos, busca e lista organizada por vencimento ou por dia. VIEW PURA: todo
// dinheiro vem do servidor; títulos e lançamentos contados aqui são o SUBCONJUNTO carregado e o texto diz isso (R-C, R-P6).

const WEEKDAYS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

const AGES: readonly { readonly key: PendingAgeKey; readonly label: string; readonly tone: ColumnBarTone }[] = [
  { key: "0-2", label: "até 2 dias", tone: "age-recent" },
  { key: "3-7", label: "3 a 7 dias", tone: "age-week" },
  { key: "8-15", label: "8 a 15 dias", tone: "age-old" },
  { key: "16+", label: "mais de 15", tone: "age-critical" },
];

type Step = "baixar" | "conciliar" | "ressalvas" | "extrato";

function stepOf(state: FinanceiroViewModel["state"]): Step {
  if (state.tab === "rec" || state.tab === "pag") return "baixar";
  if (state.tab === "ext") return "extrato";
  if (state.target === "conc:valor" || state.target === "conc:data") return "ressalvas";
  return state.target === "conc:conciliado" ? "extrato" : "conciliar";
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function countOf(model: FinanceiroViewModel, key: string): number | null {
  const aggregate = model.aggregates[key];
  return aggregate && aggregate.items.length === 1 ? aggregate.items[0].count : null;
}

function longToday(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${WEEKDAYS[now.getDay()]}, ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
}

function entryDayLabel(entry: FinancialEntry): string {
  const instant = new Date(entry.occurredAt);
  if (Number.isNaN(instant.getTime())) return "Data indisponível";
  return `${WEEKDAYS[instant.getUTCDay()]}, ${formatDueDate(entry.occurredAt)}/${instant.getUTCFullYear()}`;
}

function groupEntries(rows: readonly FinancialEntry[]): readonly { readonly label: string; readonly rows: readonly FinancialEntry[] }[] {
  const groups = new Map<string, FinancialEntry[]>();
  for (const entry of rows) {
    const label = entryDayLabel(entry);
    const group = groups.get(label);
    if (group) group.push(entry);
    else groups.set(label, [entry]);
  }
  return [...groups].map(([label, entries]) => ({ label, rows: entries }));
}

export function FinanceiroViewC(model: FinanceiroViewModel) {
  const [chequeInfo, setChequeInfo] = useState(false);
  const [openEntryId, setOpenEntryId] = useState<string | null>(null);
  const [openTitleId, setOpenTitleId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [confirmed, setConfirmed] = useState(0);
  const [starting, setStarting] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const openRef = useRef<string | null>(null);
  const startSawLoading = useRef(false);
  const startFromPending = useRef(false);
  const focusForm = useRef(false);
  openRef.current = openEntryId;

  const state = model.state;
  const accountId = state.accountId;
  const step = stepOf(state);
  const accountName = (id: string) => model.accounts.items.find((account) => account.id === id)?.name ?? null;
  const pendingCount = countOf(model, AGGREGATE_KEYS.pending);
  const valueCount = countOf(model, AGGREGATE_KEYS.value);
  const dateCount = countOf(model, AGGREGATE_KEYS.date);

  const closeRows = () => {
    setOpenEntryId(null);
    setOpenTitleId(null);
    model.onCloseReconcile?.();
  };
  const go = (next: Partial<FinanceiroViewModel["state"]>) => {
    closeRows();
    model.onState({ ...state, ...next });
  };

  const entryRows = model.entries.items.filter((entry) => entryMatchesSearch(entry, search));
  const queue = step === "conciliar" ? entryRows.filter((entry) => !entry.reconciled) : entryRows;

  const openConference = (entry: FinancialEntry) => {
    setOpenEntryId(entry.id);
    model.onReconcile(entry, () => afterConference(entry), true);
  };
  // R-C: avança só depois do sucesso da ação existente, e só se o usuário continua na mesma linha.
  const nextOf = (entry: FinancialEntry) => {
    const index = queue.findIndex((row) => row.id === entry.id);
    return queue.slice(index + 1).find((row) => !row.reconciled) ?? null;
  };
  const afterConference = (entry: FinancialEntry) => {
    setConfirmed((current) => current + 1);
    if (openRef.current !== entry.id) return;
    const next = nextOf(entry);
    if (next) {
      focusForm.current = true;
      openConference(next);
    } else {
      setOpenEntryId(null);
    }
  };
  const skip = (entry: FinancialEntry) => {
    const next = nextOf(entry);
    if (next) {
      focusForm.current = true;
      openConference(next);
    } else {
      closeRows();
    }
  };
  const toggleEntry = (entry: FinancialEntry) => {
    if (openEntryId === entry.id) {
      closeRows();
    } else if (step === "conciliar" && model.access.reconcile && !entry.reconciled) {
      openConference(entry);
    } else {
      model.onCloseReconcile?.();
      setOpenEntryId(entry.id);
    }
  };
  const startConference = () => {
    setSearch("");
    closeRows();
    startFromPending.current = state.tab === "conc" && state.target === "conc:pendente";
    startSawLoading.current = false;
    setStarting(true);
    if (!startFromPending.current) model.onState({ ...state, tab: "conc", target: "conc:pendente" });
  };

  // "Começar a conferência" espera a lista de pendências chegar antes de abrir a primeira linha: nunca abre linha de outro recorte.
  useEffect(() => {
    if (!starting) return;
    if (model.entries.loading) {
      startSawLoading.current = true;
      return;
    }
    if (!startFromPending.current && !startSawLoading.current) return;
    setStarting(false);
    const first = model.entries.items.find((entry) => !entry.reconciled);
    if (first) {
      focusForm.current = true;
      openConference(first);
    } else {
      rootRef.current?.querySelector<HTMLElement>(".pat-os-tab--active")?.focus();
    }
    // openConference muda a cada render; o gatilho é a chegada da lista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [starting, model.entries.loading, model.entries.items]);

  // O botão principal do formulário já vem com o foco, como na referência.
  const reconcileEntryId = model.reconcilePanel?.entryId ?? null;
  useEffect(() => {
    if (!focusForm.current || !reconcileEntryId) return;
    focusForm.current = false;
    rootRef.current?.querySelector<HTMLElement>('.financeiro-bc__inline-form button[type="submit"]')?.focus();
  }, [reconcileEntryId]);

  const canStart = model.access.reconcile && !model.summaryLoading;
  const header = (
    <PageHeader
      kicker="FINANCEIRO · ROTINA DO DIA"
      title="Conferência do caixa"
      subtitle={`${longToday()} · baixe o que venceu, confira o que entrou e saiu e concilie com o banco.`}
      actions={
        canStart && !model.failed && model.access.readEntries && model.access.readTitles ? (
          <button type="button" className="pat-btn pat-btn--primary" onClick={startConference}>
            <Play size={14} aria-hidden="true" />
            Começar a conferência
          </button>
        ) : undefined
      }
    />
  );

  if (model.failed) {
    return (
      <div data-aparencia="C" className="financeiro-c" ref={rootRef}>
        {header}
        <StatePanel tone="error" title="Não foi possível carregar a rotina" detail="A consulta falhou. Nada foi alterado." actions={<StatePanelAction label="Tentar novamente" onClick={model.onRetry} />} />
      </div>
    );
  }
  if (!model.access.readEntries || !model.access.readTitles) {
    return (
      <div data-aparencia="C" className="financeiro-c" ref={rootRef}>
        {header}
        <StatePanel tone="forbidden" title="Acesso não permitido" detail="Seu perfil não inclui os lançamentos e títulos desta organização." />
      </div>
    );
  }
  if (model.summaryLoading) {
    return (
      <div data-aparencia="C" className="financeiro-c" ref={rootRef}>
        {header}
        <div className="financeiro-c__loading" aria-busy="true" aria-label="Carregando a rotina do dia">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="pat-kpi" aria-hidden="true">
              <span className="pat-skel" style={{ display: "block", width: 28, height: 28 }} />
              <span className="pat-skel" style={{ display: "block", width: "70%", height: 18, marginTop: 8 }} />
              <span className="pat-skel" style={{ display: "block", width: "50%", height: 11, marginTop: 6 }} />
            </div>
          ))}
        </div>
        <div className="pat-table">
          <span className="pat-skel" style={{ display: "block", height: 180, margin: 18 }} />
        </div>
      </div>
    );
  }

  const today = localIsoDate();
  const allTitles = [...model.receivables.items, ...model.payables.items].filter((title) => isOpenTitle(title) && title.active);
  const titlesLoaded = model.receivables.items.length + model.payables.items.length;
  const titlesTotal = model.receivables.total + model.payables.total;
  const titlesComplete = titlesLoaded >= titlesTotal;
  const isOverdue = (title: FinancialTitle) => titleMatchesTarget(title, "venc", today) || daysUntil(title.dueDate, today) < 0;
  const dueToday = (title: FinancialTitle) => !isOverdue(title) && titleMatchesTarget(title, "hoje", today);
  const upcoming = (title: FinancialTitle) => titleMatchesTarget(title, "sem7", today);
  const toSettle = allTitles.filter((title) => isOverdue(title) || dueToday(title));
  const routineTitles = allTitles.filter((title) => isOverdue(title) || dueToday(title) || upcoming(title));
  const matchesRoutineTarget = (title: FinancialTitle) => (state.target === "venc" ? isOverdue(title) : state.target === "hoje" ? dueToday(title) : state.target === "sem7" ? upcoming(title) : true);
  const visibleTitles = routineTitles.filter((title) => matchesRoutineTarget(title) && titleMatchesSearch(title, search)).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const daily = model.aggregates[AGGREGATE_KEYS.routineDays(accountId)];
  const pendingDaily = model.aggregates[AGGREGATE_KEYS.routineDaysPending(accountId)];
  const pendingByDay = new Map(pendingDaily?.items.map((item) => [item.bucket, item.count]) ?? []);
  const days: DayBar[] | null =
    daily === null || daily === undefined
      ? null
      : daily.items.flatMap((item) => (item.bucket ? [{ date: item.bucket, inflow: item.inflow, outflow: item.outflow, count: item.count, pendingCount: pendingDaily === null || pendingDaily === undefined ? null : (pendingByDay.get(item.bucket) ?? 0) }] : []));
  const ageItems = AGES.map((age) => {
    const n = countOf(model, AGGREGATE_KEYS.routineAge(age.key, accountId));
    return {
      key: `idade:${age.key}`,
      label: age.label,
      value: n,
      ariaLabel: n === null ? `Contagem indisponível dos lançamentos a conciliar há ${age.label}` : `${n} lançamentos a conciliar há ${age.label} — filtrar`,
      bars: [{ tone: age.tone, value: n }],
    };
  });
  const agesUnavailable = ageItems.every((item) => item.value === null);

  const chips: FilterChipItem[] = [];
  const selectedName = accountId ? (accountName(accountId) ?? "Conta selecionada") : null;
  if (selectedName && step !== "baixar") chips.push({ key: "account", label: `Conta: ${selectedName}`, clearLabel: "Remover o filtro de conta", onClear: () => go({ accountId: null }) });
  if (state.target && state.target !== "conc:pendente" && state.target !== "conc:valor" && state.target !== "conc:data") {
    const label = targetLabel(state.target);
    chips.push({ key: "target", label, clearLabel: `Remover o filtro ${label}`, onClear: () => go({ target: step === "conciliar" ? "conc:pendente" : null }) });
  }
  if (search.trim()) {
    chips.push({
      key: "search",
      label: `Busca: ${search.trim()}`,
      clearLabel: step === "baixar" ? "Limpar a busca de títulos" : "Limpar a busca do extrato",
      onClear: () => {
        closeRows();
        setSearch("");
      },
    });
  }

  const tabs = [
    { id: "baixar", label: "1 · Baixar", count: toSettle.length, active: step === "baixar", target: { tab: "rec", target: null } },
    { id: "conciliar", label: "2 · Conciliar", count: pendingCount, active: step === "conciliar", target: { tab: "conc", target: "conc:pendente" } },
    { id: "ressalvas", label: "3 · Ressalvas", count: valueCount !== null && dateCount !== null ? valueCount + dateCount : null, active: step === "ressalvas", target: { tab: "conc", target: "conc:valor" } },
    { id: "extrato", label: "Extrato completo", count: null, active: step === "extrato", target: { tab: "ext", target: null } },
  ] as const;
  const selectTab = (tab: (typeof tabs)[number]) => {
    setSearch("");
    go(tab.target);
  };

  const renderEntry = (entry: FinancialEntry) => {
    const name = accountName(entry.accountId);
    const conferring = step === "conciliar" && model.reconcilePanel?.entryId === entry.id;
    return (
      <EntryPanel model={model} entry={entry} accountName={name} onReconcile={() => (step === "conciliar" ? openConference(entry) : model.onReconcile(entry))}>
        {conferring ? (
          <div className="pat-ab-detail-actions">
            <button type="button" className="pat-btn" onClick={() => skip(entry)}>
              <SkipForward size={14} aria-hidden="true" />
              Pular
            </button>
            <span className="financeiro-bc__muted">Ao conciliar, o próximo lançamento abre sozinho.</span>
          </div>
        ) : null}
      </EntryPanel>
    );
  };

  const titleGroups: readonly { readonly key: string; readonly label: string; readonly className: string; readonly rows: readonly FinancialTitle[] }[] = [
    { key: "venc", label: "Vencidos", className: "financeiro-bc__group-head--overdue", rows: visibleTitles.filter(isOverdue) },
    { key: "hoje", label: "Vencem hoje", className: "financeiro-bc__group-head--today", rows: visibleTitles.filter(dueToday) },
    { key: "sem7", label: "Próximos dias", className: "", rows: visibleTitles.filter(upcoming) },
  ];

  const titlesBody =
    model.receivables.loading || model.payables.loading ? (
      <div aria-busy="true" aria-label="Carregando títulos">
        <span className="pat-skel" style={{ display: "block", height: 120, margin: 18 }} />
      </div>
    ) : model.receivables.failed || model.payables.failed ? (
      <StatePanel tone="error" embedded title="Não foi possível carregar os títulos" detail="A consulta falhou. Nada foi alterado." actions={<StatePanelAction label="Tentar novamente" onClick={model.onRetry} />} />
    ) : visibleTitles.length === 0 ? (
      <StatePanel tone="empty" embedded title={routineTitles.length ? "Nada para este filtro" : "Nada para baixar"} detail={routineTitles.length ? "Remova o filtro ou ajuste a busca para ver mais." : titlesComplete ? "Nenhum título vence até a próxima semana." : "Nenhum título carregado vence até a próxima semana; carregue a próxima página antes de concluir."} />
    ) : (
      <PagedRows
        rows={visibleTitles}
        resetKey={`${state.target}|${search}`}
        onPageChange={closeRows}
        rangeLabel={(start, end, total) => `${start}–${end} de ${total} ${titlesComplete ? "títulos" : "resultados carregados"}`}
      >
        {(rows) => (
          <>
            <TitlesTable rows={[]} receivable={null} openKey={null} onToggle={() => undefined} renderDetail={() => null} />
            {titleGroups.map((group) => {
            const groupRows = rows.filter((title) => group.rows.includes(title));
            if (groupRows.length === 0) return null;
            return (
              <div key={group.key} className="financeiro-bc__group">
                <button type="button" className={`financeiro-bc__group-head ${group.className}`} aria-pressed={state.target === group.key} aria-label={`${group.label}: ${plural(group.rows.length, "título carregado", "títulos carregados")} — filtrar a lista`} onClick={() => go({ target: state.target === group.key ? null : group.key })}>
                  {group.label}
                  <small>{plural(group.rows.length, "título", "títulos")}</small>
                </button>
                <TitlesTable rows={groupRows} receivable={null} openKey={openTitleId} onToggle={(id) => setOpenTitleId((current) => (current === id ? null : id))} renderDetail={(title) => <TitleDetail title={title} canPay={model.access.pay} onPay={() => model.onPay(title)} />} />
              </div>
            );
            })}
          </>
        )}
      </PagedRows>
    );

  const entriesPanel = (rows: readonly FinancialEntry[]) => <EntriesTable rows={rows} accountName={accountName} openKey={openEntryId} onToggle={(id) => { const entry = rows.find((row) => row.id === id); if (entry) toggleEntry(entry); }} renderDetail={renderEntry} />;
  const entriesBody = model.entries.loading ? (
    <div aria-busy="true" aria-label="Carregando extrato">
      <span className="pat-skel" style={{ display: "block", height: 120, margin: 18 }} />
    </div>
  ) : model.entries.failed ? (
    <StatePanel tone="error" embedded title="Não foi possível carregar o extrato" detail="A consulta falhou. Nada foi alterado." actions={<StatePanelAction label="Tentar novamente" onClick={model.onRetry} />} />
  ) : queue.length === 0 ? (
    <StatePanel
      tone="empty"
      embedded
      title={search.trim() || (state.target && step === "extrato") ? "Nada para este filtro" : step === "conciliar" ? "Nenhum lançamento a conciliar nesta página" : step === "ressalvas" ? "Nenhuma ressalva" : "Nenhum lançamento"}
      detail={model.entries.total > model.entries.items.length ? "Há mais lançamentos no servidor; carregue a próxima página antes de concluir." : step === "ressalvas" ? "Nenhum lançamento foi conciliado com esta ressalva." : "A página carregada não tem pendências."}
    />
  ) : (
    <PagedRows rows={queue} resetKey={`${step}|${state.target}|${accountId}|${search}`} onPageChange={closeRows} rangeLabel={(start, end, total) => `${start}–${end} de ${total} lançamentos${model.entries.total > model.entries.items.length ? ` carregados · ${model.entries.total} no servidor` : ""}`}>
      {(rows) =>
        step === "conciliar" ? (
          <>
            <EntriesTable rows={[]} accountName={accountName} openKey={null} onToggle={() => undefined} renderDetail={() => null} />
            {groupEntries(rows).map((group) => (
              <div key={group.label} className="financeiro-bc__group">
                <div className="financeiro-bc__group-head financeiro-bc__group-head--static">
                  {group.label}
                  <small>{plural(group.rows.length, "lançamento", "lançamentos")}</small>
                </div>
                {entriesPanel(group.rows)}
              </div>
            ))}
          </>
        ) : (
          entriesPanel(rows)
        )
      }
    </PagedRows>
  );

  const conferenceTotal = pendingCount === null ? null : confirmed + pendingCount;
  const intro =
    step === "baixar" ? (
      <div className="financeiro-bc__intro">
        <Receipt size={14} aria-hidden="true" />
        <span>
          Títulos vencidos, de hoje e dos próximos 7 dias, a receber e a pagar juntos. <b className="financeiro-bc__in">↑ a receber</b> · <b className="financeiro-bc__out">↓ a pagar</b>. Abra a linha para registrar a baixa.
        </span>
      </div>
    ) : step === "conciliar" ? (
      <div className="financeiro-bc__intro">
        {conferenceTotal === null ? null : (
          <span className="financeiro-c__progress">
            {`Conferidos nesta sessão: ${confirmed} de ${conferenceTotal}`}
            <span className="financeiro-c__progress-bar" aria-hidden="true">
              <b style={{ width: `${conferenceTotal ? (confirmed / conferenceTotal) * 100 : 0}%` }} />
            </span>
          </span>
        )}
        <span>Abra o lançamento, compare com o extrato do banco e concilie: o próximo abre sozinho.</span>
      </div>
    ) : step === "ressalvas" ? (
      <>
        <div className="financeiro-bc__intro">
          <AlertTriangle size={14} aria-hidden="true" />
          <span>Conciliados com ressalva: bateram no extrato, mas com valor ou data diferentes. Confira e, se for o caso, desfaça a conciliação.</span>
        </div>
        <div className="financeiro-bc__blocks" role="group" aria-label="Tipo de ressalva — o servidor filtra um tipo por vez">
          <FilterBlock label="Ressalva de valor" count={valueCount} pressed={state.target === "conc:valor"} onClick={() => go({ target: "conc:valor" })} />
          <FilterBlock label="Ressalva de data" count={dateCount} pressed={state.target === "conc:data"} onClick={() => go({ target: "conc:data" })} />
        </div>
      </>
    ) : null;

  const scoped = accountId !== null;
  const hintLoaded = `nos ${plural(titlesLoaded, "título carregado", "títulos carregados")} de ${titlesTotal}`;

  return (
    <div data-aparencia="C" className="financeiro-c" ref={rootRef}>
      {header}
      {model.stale ? <StaleDataBanner lastUpdatedAt={model.lastUpdatedAt} onRetry={model.onRetry} /> : null}
      <section className="pat-kpi-row pat-kpi-row--4" aria-label="Passos da rotina do dia">
        <KpiStatCard
          icon={Receipt}
          iconColor="#DC2626"
          iconBg="#FEF2F2"
          value={toSettle.length}
          label="Baixar o que venceu"
          hint={titlesComplete ? `${formatCompactBRL(model.summary.receivable.overdueAmount)} a receber · ${formatCompactBRL(model.summary.payable.overdueAmount)} a pagar vencidos` : hintLoaded}
          tag={{ label: "Passo 1", bg: "#EFF6FF", fg: "#1D4ED8" }}
          pressed={step === "baixar" && !state.target && !chequeInfo}
          onClick={() => go({ tab: "rec", target: null })}
          ariaLabel={`Baixar o que venceu: ${plural(toSettle.length, "título", "títulos")}${titlesComplete ? "" : " carregados"} — abrir o passo 1`}
        />
        <KpiStatCard
          icon={CheckCircle2}
          iconColor="#2563EB"
          iconBg="#EFF6FF"
          value={pendingCount ?? "Indisponível"}
          label="Conciliar com o banco"
          hint={pendingCount === null ? "o servidor não respondeu a contagem" : "entradas e saídas ainda sem conferência"}
          tag={{ label: "Passo 2", bg: "#EFF6FF", fg: "#1D4ED8" }}
          pressed={!scoped && step === "conciliar" && state.target === "conc:pendente"}
          onClick={() => go({ tab: "conc", target: "conc:pendente" })}
          ariaLabel={`Conciliar com o banco: ${pendingCount === null ? "contagem indisponível" : plural(pendingCount, "lançamento", "lançamentos")} — abrir o passo 2`}
        />
        <KpiStatCard
          icon={AlertTriangle}
          iconColor="#B45309"
          iconBg="#FFFBEB"
          value={valueCount !== null && dateCount !== null ? valueCount + dateCount : "Indisponível"}
          label="Revisar ressalvas"
          hint={valueCount !== null && dateCount !== null ? `${valueCount} de valor · ${dateCount} de data` : "o servidor não respondeu a contagem"}
          tag={{ label: "Passo 3", bg: "#EFF6FF", fg: "#1D4ED8" }}
          pressed={!scoped && step === "ressalvas"}
          onClick={() => go({ tab: "conc", target: "conc:valor" })}
          ariaLabel={`Revisar ressalvas: ${valueCount !== null && dateCount !== null ? plural(valueCount + dateCount, "lançamento", "lançamentos") : "contagem indisponível"} — abrir o passo 3`}
        />
        <KpiStatCard
          icon={Banknote}
          iconColor="#7C3AED"
          iconBg="#F5F3FF"
          value={model.summary.cheques.pendingReceivedCount}
          label="Cheques a compensar"
          hint={`${formatBRL(model.summary.cheques.pendingReceivedAmount)} · baixam os títulos sozinhos`}
          tag={{ label: `${model.summary.cheques.pendingIssuedCount} ${model.summary.cheques.pendingIssuedCount === 1 ? "emitido" : "emitidos"}`, bg: "#F1F5F9", fg: "#475569" }}
          pressed={chequeInfo}
          onClick={() => setChequeInfo((current) => !current)}
          ariaLabel={`Cheques a compensar: ${plural(model.summary.cheques.pendingReceivedCount, "cheque", "cheques")} — como conferir`}
        />
      </section>
      {chequeInfo ? (
        <div className="pat-banner pat-banner--info" role="status">
          <Banknote size={14} aria-hidden="true" />
          <span>{`Como conferir: ${plural(model.summary.cheques.pendingReceivedCount, "cheque recebido", "cheques recebidos")} (${formatBRL(model.summary.cheques.pendingReceivedAmount)}) e ${plural(model.summary.cheques.linkedPendingCount, "vinculado", "vinculados")} a títulos (${formatBRL(model.summary.cheques.linkedPendingAmount)}). Abra um título para ver se ele tem cheque aguardando compensação; o resumo não lista os títulos de cada cheque.`}</span>
        </div>
      ) : null}
      <div className="financeiro-c__grid">
        <AnalyticCard title="Últimos 14 dias: entradas e saídas por dia" hint="clique no dia para ver o extrato">
          <DayBars days={days} rangeDates={fourteenDayDates()} today={today} pressedDate={state.target?.startsWith("dia:") ? state.target.slice(4) : null} onDay={(date) => go({ tab: "ext", target: `dia:${date}` })} valueFormat={formatBRL} />
          <div className="financeiro-bc__reading">
            <span>
              <i className="financeiro-bc__swatch financeiro-bc__swatch--in" aria-hidden="true" /> Entradas
            </span>
            <span>
              <i className="financeiro-bc__swatch financeiro-bc__swatch--out" aria-hidden="true" /> Saídas
            </span>
            <span>
              <b className="financeiro-bc__pending-dot">●</b> lançamentos a conciliar no dia
            </span>
          </div>
        </AnalyticCard>
        <AnalyticCard title="Há quanto tempo cada lançamento espera a conciliação" hint="contagem">
          {agesUnavailable ? (
            <p className="financeiro-bc__unavailable">Contagem por idade indisponível.</p>
          ) : (
            <ColumnBars ariaLabel="Lançamentos a conciliar por idade" items={ageItems} pressedKey={state.target} onSelect={(target) => go({ tab: "conc", target })} />
          )}
          <div className="financeiro-bc__reading">
            <span>Quanto mais à direita, mais antigo e mais difícil de achar no extrato do banco.</span>
          </div>
        </AnalyticCard>
      </div>
      <div className="financeiro-bc__panel" aria-label="Conferência individual">
        <FinanceToolbar
          label="Passos da conferência"
          tabs={tabs.map((tab) => ({ id: tab.id, label: tab.label, count: tab.count, active: tab.active, onClick: () => selectTab(tab) }))}
          search={search}
          onSearch={(next) => {
            closeRows();
            setSearch(next);
          }}
          searchLabel={step === "baixar" ? "Buscar nos títulos carregados" : "Buscar nos lançamentos carregados"}
          count={step === "baixar" ? plural(visibleTitles.length, "título", "títulos") : plural(queue.length, "lançamento", "lançamentos")}
        />
        {intro}
        {chips.length > 0 ? <FilterChips items={chips} /> : null}
        {step === "baixar" ? titlesBody : entriesBody}
        {(step === "baixar" && !titlesComplete) || (step !== "baixar" && model.entries.total > model.entries.items.length) ? (
          <p className="financeiro-bc__note">
            {step === "baixar"
              ? `${plural(titlesLoaded, "título carregado", "títulos carregados")} de ${titlesTotal} no servidor`
              : `${plural(model.entries.items.length, "lançamento carregado", "lançamentos carregados")} de ${model.entries.total} no servidor`}
          </p>
        ) : null}
        {step === "baixar" && (model.receivables.hasMore || model.payables.hasMore) ? (
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
      </div>
    </div>
  );
}
