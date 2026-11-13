import { AlertTriangle, CheckCircle2, ClipboardList, Lock } from "lucide-react";
import type { ReactNode } from "react";

import { ColumnBars, type ColumnBarsItem } from "../../../../components/charts";
import { periodMonthName, periodName } from "../period-keys";
import { daysOpen, daysToClose, endedAndNotClosed, SLOW_CLOSE_DAYS } from "../period-rows";
import { BlockSkeleton, FechamentoBlocking, FechamentoHeader, FechamentoStates, FilterBlocks, focusedMonth, formatBRL, isBlocking, type FechamentoViewModel } from "./fechamento.shared";
import { PeriodListPanel } from "./FechamentoViewA";

// B-SAN3-24 (24b) — APARÊNCIA B "Visão analítica" (referência aprovada
// `screen-refs/fechamento-periodo-3opcoes.reference.html`, opção B). Mesma camada de dados e mesmas ações da A. Blocos
// que filtram · "Entradas × saídas por competência" (o mês FECHADO pelo retrato congelado; o aberto e o reaberto AO VIVO,
// do `summary.cashFlow` do servidor, 6 meses) · "Dias para fechar depois do fim do mês" (`closedAt` menos o fim da
// competência, e há quantos dias o que terminou segue aberto) · "Mês a fechar" (checklist ao vivo e o botão de fechar) ·
// "Exceções" (reabertos e fechados mesmo assim) · lista. Toda coluna e toda exceção abre o mês (D-PADRAO-BLOCOS-CLICAVEIS);
// as colunas são as da biblioteca (`ColumnBars`).

const card = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 16 } as const;

function Card({ title, hint, children }: { readonly title: string; readonly hint?: string; readonly children: ReactNode }) {
  return (
    <article style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <b style={{ fontSize: 14 }}>{title}</b>
        {hint ? <small style={{ color: "#94A3B8", fontSize: 11.5 }}>{hint}</small> : null}
      </div>
      {children}
    </article>
  );
}

export function MonthToCloseCard({ model, period }: { readonly model: FechamentoViewModel; readonly period: string }) {
  if (model.list.loading) {
    // J-547 C3-07 — antes da lista, o mês a fechar ainda não é conhecido: esqueleto, nunca o botão de fechar o mês corrente.
    return (
      <div style={{ display: "grid", gap: 8 }} aria-busy="true">
        <BlockSkeleton height={38} />
        <BlockSkeleton height={38} />
        <BlockSkeleton height={38} />
      </div>
    );
  }
  const row = model.list.rows.find((item) => item.period === period) ?? { period, status: "open" as const, closedAt: null, reopenedAt: null };
  const state = model.details[period];
  const checklist = state?.detail?.checklist ?? null;
  const status = state?.detail?.status ?? row.status;
  const actions = model.actionsFor({ status });
  const line = (icon: ReactNode, label: string, hint: string, value: number | null, danger: boolean) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: `1px solid ${danger ? "#FECACA" : "#E2E8F0"}`, background: danger ? "#FEF2F2" : "#fff", borderRadius: 10 }}>
      {icon}
      <span style={{ flex: 1, fontSize: 12.5 }}>
        <b>{label}</b> <small style={{ color: "#64748B" }}>{hint}</small>
      </span>
      <b style={{ color: danger ? "#B91C1C" : "#0F172A" }}>{value ?? "—"}</b>
    </div>
  );
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {state?.loading && !checklist ? <p className="pat-cell-muted" style={{ margin: 0, fontSize: 12 }}>Carregando o checklist…</p> : null}
      {line(<AlertTriangle size={15} color="#DC2626" aria-hidden="true" />, `${periodName(period)} · contestações`, "impede", checklist?.inDisputeTitles ?? null, (checklist?.inDisputeTitles ?? 0) > 0)}
      {line(<ClipboardList size={15} color="#475569" aria-hidden="true" />, "Títulos não liquidados", "não impede", checklist?.unpaidTitles ?? null, false)}
      {line(<CheckCircle2 size={15} color="#475569" aria-hidden="true" />, "Lançamentos a conciliar", "não impede", checklist?.unreconciledEntries ?? null, false)}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
        <small style={{ color: "#64748B", flex: 1 }}>Com contestação, fechar pede um 2º passo com motivo.</small>
        {actions.includes("close") ? (
          <button type="button" className="pat-btn pat-btn--primary" onClick={() => model.onAction(period, "close")}>
            <Lock size={14} aria-hidden="true" />
            {`Fechar ${periodName(period).toLocaleLowerCase("pt-BR")}…`}
          </button>
        ) : null}
        {actions.includes("reopen") ? (
          <button type="button" className="pat-btn" onClick={() => model.onAction(period, "reopen")}>
            {`Reabrir ${periodName(period).toLocaleLowerCase("pt-BR")}…`}
          </button>
        ) : null}
      </div>
    </div>
  );
}

const MONTH3 = (period: string) => periodMonthName(period).slice(0, 3).toLocaleLowerCase("pt-BR");

export type ResultColumn = {
  readonly period: string;
  readonly label: string;
  /** Mês não fechado: o valor é o do resumo AO VIVO (barras mais claras). */
  readonly live: boolean;
  readonly inflow: number;
  readonly outflow: number;
  /** O resultado do retrato (fechado) ou `null` no ao vivo (o servidor não o dá; a tela não subtrai). */
  readonly net: number | null;
  readonly ariaLabel: string;
  readonly title: string;
};

/**
 * As colunas de "Entradas × saídas" (J-547 C3-03): o mês FECHADO pelo retrato congelado do servidor; o mês aberto ou
 * reaberto AO VIVO, pelo `summary.cashFlow` (6 meses) — o rótulo diz "ao vivo" e as barras ficam mais claras, como na
 * referência. Mês fechado sem retrato lido, ou mês aberto fora dos 6 meses, não entra: nada de R$ 0,00 inventado.
 * Nenhum valor é somado nem subtraído aqui.
 */
export function resultColumns(model: Pick<FechamentoViewModel, "list" | "details" | "liveCashFlow">): ResultColumn[] {
  const live = new Map((model.liveCashFlow ?? []).map((point) => [point.competencia, point]));
  const items: ResultColumn[] = [];
  for (const row of model.list.rows) {
    if (row.period > model.list.currentKey) continue;
    if (row.status === "closed") {
      const snapshot = model.details[row.period]?.detail?.snapshot;
      if (!snapshot) continue;
      const values = `entradas ${formatBRL(snapshot.entriesIn.sumAmount)}, saídas ${formatBRL(snapshot.entriesOut.sumAmount)}, resultado ${formatBRL(snapshot.net)}`;
      items.push({
        period: row.period,
        label: MONTH3(row.period),
        live: false,
        inflow: snapshot.entriesIn.sumAmount,
        outflow: snapshot.entriesOut.sumAmount,
        net: snapshot.net,
        ariaLabel: `${periodName(row.period)}, fechado: ${values} — abrir o mês`,
        title: `${periodName(row.period)} (retrato do fechamento) — ${values}`,
      });
      continue;
    }
    const point = live.get(row.period);
    if (!point) continue;
    const values = `entradas ${formatBRL(point.inflow)}, saídas ${formatBRL(point.outflow)}`;
    items.push({
      period: row.period,
      label: `${MONTH3(row.period)} · ao vivo`,
      live: true,
      inflow: point.inflow,
      outflow: point.outflow,
      net: null,
      ariaLabel: `${periodName(row.period)}, ${row.status === "reopened" ? "reaberto" : "aberto"}, ao vivo: ${values} — abrir o mês`,
      title: `${periodName(row.period)} (ao vivo, ainda não fechado) — ${values}`,
    });
  }
  return items.sort((a, b) => a.period.localeCompare(b.period)).slice(-12);
}

const RESULT_BAR_MAX = 96;

/**
 * O gráfico de "Entradas × saídas": colunas da biblioteca (as classes de `ColumnBars`: foco, passar o mouse e pressionado
 * do sistema), cada uma um botão que abre o mês, com o valor exato ao passar o mouse (`title`) e no rótulo acessível. O
 * `ColumnBars` não aceita `title` nem a barra mais clara do ao vivo, por isso a composição é feita aqui com as mesmas
 * classes, sem estilo novo.
 */
function ResultChart({ items, pressed, onSelect }: { readonly items: readonly ResultColumn[]; readonly pressed: string | null; readonly onSelect: (period: string) => void }) {
  const max = Math.max(1, ...items.flatMap((item) => [Math.abs(item.inflow), Math.abs(item.outflow)]));
  return (
    <div className="ui-column-bars" role="group" aria-label="Entradas e saídas por competência — clique no mês para abrir" style={{ height: 150 }}>
      {items.map((item) => (
        <button key={item.period} type="button" className="ui-column-bars__column" aria-pressed={pressed === item.period} aria-label={item.ariaLabel} title={item.title} onClick={() => onSelect(item.period)}>
          <b className="ui-column-bars__value" style={{ color: item.net === null ? "#64748B" : item.net < 0 ? "#B91C1C" : "#047857" }}>
            {item.net === null ? "ao vivo" : item.net < 0 ? "−" : "+"}
          </b>
          <span className="ui-column-bars__bars" aria-hidden="true">
            <i className="ui-column-bars__bar ui-column-bars__bar--inflow" style={{ height: `${Math.max(3, (Math.abs(item.inflow) / max) * RESULT_BAR_MAX)}px`, opacity: item.live ? 0.55 : 1 }} />
            <i className="ui-column-bars__bar ui-column-bars__bar--outflow" style={{ height: `${Math.max(3, (Math.abs(item.outflow) / max) * RESULT_BAR_MAX)}px`, opacity: item.live ? 0.55 : 1 }} />
          </span>
          <span className="ui-column-bars__label">{MONTH3(item.period)}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * As colunas de "Dias para fechar" (J-547 C3-01): os fechados com os dias até fechar; os que terminaram e seguem abertos,
 * há quantos dias. Como na referência, a barra do que segue aberto é cortada na maior dos fechados (o número acima diz
 * os dias de verdade), para um mês esquecido não achatar a leitura dos fechados.
 */
export function closeDaysColumns(model: Pick<FechamentoViewModel, "list">, today: Date = new Date()): ColumnBarsItem[] {
  const items: { readonly period: string; readonly item: ColumnBarsItem }[] = [];
  const closedMax = Math.max(1, ...model.list.rows.filter((row) => row.status === "closed").map((row) => daysToClose(row.period, row.closedAt) ?? 0));
  for (const row of model.list.rows) {
    if (row.status === "closed") {
      const days = daysToClose(row.period, row.closedAt);
      if (days === null) continue;
      items.push({
        period: row.period,
        item: {
          key: row.period,
          label: MONTH3(row.period),
          value: days,
          ariaLabel: `${periodName(row.period)}: fechou ${days} ${days === 1 ? "dia" : "dias"} depois do fim do mês — abrir o mês`,
          bars: [{ tone: days > SLOW_CLOSE_DAYS ? "age-old" : "age-week", value: days }],
        },
      });
    } else if (endedAndNotClosed(row, model.list.currentKey)) {
      const days = daysOpen(row.period, today) ?? 0;
      const state = row.status === "reopened" ? "reaberto" : "aberto";
      items.push({
        period: row.period,
        item: {
          key: row.period,
          label: `${MONTH3(row.period)} · ${state}`,
          value: days,
          ariaLabel: `${periodName(row.period)}: ${state}, ${days} ${days === 1 ? "dia" : "dias"} depois do fim do mês — abrir o mês`,
          bars: [{ tone: "age-critical", value: Math.min(days, closedMax) }],
        },
      });
    }
  }
  return items.sort((a, b) => a.period.localeCompare(b.period)).slice(-12).map((entry) => entry.item);
}

export function FechamentoViewB(model: FechamentoViewModel) {
  if (isBlocking(model)) {
    return (
      <div data-aparencia="B" style={{ color: "#0F172A" }}>
        <FechamentoHeader />
        <FechamentoBlocking model={model} />
      </div>
    );
  }
  const loading = model.list.loading;
  const focus = focusedMonth(model.filter);
  const open = (period: string) => (focus === period ? model.onFilter("all") : model.onFocusMonth(period));
  const results = loading ? [] : resultColumns(model);
  const closeDays = loading ? [] : closeDaysColumns(model);
  const exceptions = model.list.rows
    .map((row) => ({ row, detail: model.details[row.period]?.detail ?? null }))
    .filter((item) => item.row.status === "reopened" || item.detail?.snapshot?.forced === true);
  return (
    <div data-aparencia="B" style={{ color: "#0F172A" }}>
      <FechamentoHeader />
      <FechamentoStates model={model} />
      <div style={{ ...card, padding: "12px 16px", marginBottom: 16 }}>
        <FilterBlocks model={model} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginBottom: 16 }}>
        <Card title="Entradas × saídas por competência" hint="o mês fechado pelo retrato; o aberto, ao vivo">
          {loading || (model.liveLoading && results.length === 0) ? (
            <BlockSkeleton height={132} />
          ) : results.length === 0 ? (
            <p style={{ margin: 0, fontSize: 12.5, color: "#64748B" }}>{model.liveCashFlow === null ? "Nenhum mês fechado ainda, e o movimento ao vivo não veio do servidor." : "Nenhum movimento no período."}</p>
          ) : (
            <ResultChart items={results} pressed={focus} onSelect={open} />
          )}
          <p className="financeiro-bc__reading">
            <span>
              <i className="financeiro-bc__swatch financeiro-bc__swatch--in" aria-hidden="true" /> 1ª barra: entradas
            </span>
            <span>
              <i className="financeiro-bc__swatch financeiro-bc__swatch--out" aria-hidden="true" /> 2ª barra: saídas
            </span>
            <span className="financeiro-bc__muted">Acima de cada mês, o sinal do resultado do retrato; “ao vivo” (barras mais claras) = mês ainda não fechado. O valor aparece ao passar o mouse e no detalhe. Clique no mês para abrir.</span>
          </p>
        </Card>
        <Card title="Dias para fechar depois do fim do mês" hint={`meta sugerida: até ${SLOW_CLOSE_DAYS}`}>
          {loading ? (
            <BlockSkeleton height={132} />
          ) : closeDays.length === 0 ? (
            <p style={{ margin: 0, fontSize: 12.5, color: "#64748B" }}>Nenhum mês fechado ainda.</p>
          ) : (
            <ColumnBars items={closeDays} ariaLabel="Dias para fechar cada competência — clique no mês para abrir" pressedKey={focus} onSelect={open} />
          )}
          <p className="financeiro-bc__reading">
            <span className="financeiro-bc__muted">{`Azul: até ${SLOW_CLOSE_DAYS} dias · âmbar: mais de ${SLOW_CLOSE_DAYS} · vermelho: terminou e segue aberto (há quantos dias).`}</span>
          </p>
        </Card>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginBottom: 16 }}>
        <Card title="Mês a fechar" hint="pendências ao vivo">
          <MonthToCloseCard model={model} period={model.monthToClose} />
        </Card>
        <Card title="Exceções" hint="reabertos e fechados mesmo assim">
          {loading ? (
            <BlockSkeleton height={38} />
          ) : exceptions.length === 0 ? (
            <p style={{ margin: 0, fontSize: 12.5, color: "#64748B" }}>Nenhuma exceção.</p>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {exceptions.map(({ row, detail }) => {
                const text = row.status === "reopened" ? `reaberto${detail?.reopenReason ? `: ${detail.reopenReason}` : ""}` : `fechado mesmo assim${detail?.snapshot?.forcedReason ? `: ${detail.snapshot.forcedReason}` : ""}`;
                return (
                  <button
                    key={row.period}
                    type="button"
                    className="financeiro-b__account"
                    aria-pressed={focus === row.period}
                    aria-label={`${periodName(row.period)}: ${text} — abrir o mês`}
                    onClick={() => open(row.period)}
                    style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 40, fontSize: 12.5, color: "#0F172A", borderLeft: `3px solid ${row.status === "reopened" ? "#7C3AED" : "#F59E0B"}` }}
                  >
                    <b style={{ whiteSpace: "nowrap" }}>{periodName(row.period)}</b>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={text}>{` · ${text}`}</span>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>
      <PeriodListPanel model={model} title="Competências" />
    </div>
  );
}
