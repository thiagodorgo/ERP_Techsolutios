import { useState } from "react";

import { DayBars, type DayBar } from "../../../../components/charts";
import { PageHeader } from "../../../../components/patterns";
import { StaleDataBanner } from "../../../work-orders/components/StaleDataBanner";
import { StatePanel, StatePanelAction } from "../../../work-orders/components/StatePanel";
import { formatBRL } from "../../titles/financial-titles.adapter";
import { targetLabel } from "../financeiro.state";
import { AGGREGATE_KEYS, type FinanceiroViewModel } from "./FinanceiroViewA";

const isoToday = () => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

export function FinanceiroViewC(model: FinanceiroViewModel) {
  const [chequeInfo, setChequeInfo] = useState(false);
  const accountId = model.state.accountId;
  const go = (next: Partial<FinanceiroViewModel["state"]>) => model.onState({ ...model.state, ...next });
  const header = <PageHeader kicker="FINANCEIRO · ROTINA DO DIA" title="Conferência do caixa" subtitle="Baixe, concilie e trate ressalvas sem transformar a página carregada em total da organização." />;

  if (model.failed) return <div data-aparencia="C" className="financeiro-c">{header}<StatePanel tone="error" title="Não foi possível carregar a rotina" detail="A consulta falhou. Nada foi alterado." actions={<StatePanelAction label="Tentar novamente" onClick={model.onRetry} />} /></div>;
  if (!model.access.readEntries || !model.access.readTitles) return <div data-aparencia="C" className="financeiro-c">{header}<StatePanel tone="forbidden" title="Acesso não permitido" detail="Seu perfil não inclui os lançamentos e títulos desta organização." /></div>;
  if (model.summaryLoading || model.entries.loading) return <div data-aparencia="C" className="financeiro-c">{header}<div className="pat-table" aria-busy="true" aria-label="Carregando a rotina do dia"><span className="pat-skel" style={{ display: "block", height: 180 }} /></div></div>;

  const allTitles = [...model.receivables.items, ...model.payables.items].filter((title) => title.status !== "paid" && title.active);
  const today = isoToday();
  const overdue = allTitles.filter((title) => title.dueDate < today);
  const dueToday = allTitles.filter((title) => title.dueDate === today);
  const upcoming = allTitles.filter((title) => title.dueDate > today);
  const daily = model.aggregates[AGGREGATE_KEYS.routineDays(accountId)];
  const pendingDaily = model.aggregates[AGGREGATE_KEYS.routineDaysPending(accountId)];
  const pendingByDay = new Map(pendingDaily?.items.map((item) => [item.bucket, item.count]) ?? []);
  const days: DayBar[] | null = daily === null || daily === undefined ? null : daily.items.flatMap((item) => item.bucket ? [{ date: item.bucket, inflow: item.inflow, outflow: item.outflow, count: item.count, pendingCount: pendingDaily === null || pendingDaily === undefined ? null : pendingByDay.get(item.bucket) ?? 0 }] : []);

  return (
    <div data-aparencia="C" className="financeiro-c">
      {header}
      {model.stale ? <StaleDataBanner lastUpdatedAt={model.lastUpdatedAt} onRetry={model.onRetry} /> : null}
      <nav className="pat-os-tabs" aria-label="Etapas da conferência">
        <button type="button" className="pat-os-tab" onClick={() => go({ tab: "rec", target: null })}>1 · Baixar</button>
        <button type="button" className="pat-os-tab" onClick={() => go({ tab: "conc", target: "conc:pendente" })}>2 · Conciliar</button>
        <button type="button" className="pat-os-tab" onClick={() => go({ tab: "conc", target: "conc:valor" })}>3 · Ressalvas</button>
        <button type="button" className="pat-os-tab" onClick={() => go({ tab: "ext", target: null })}>Extrato completo</button>
      </nav>
      {model.state.target ? <div className="pat-filtro-chip-bar"><span className="pat-filtro-chip">{`Filtro: ${targetLabel(model.state.target)}`}<button type="button" aria-label="Remover o filtro" onClick={() => go({ target: null })}>✕</button></span></div> : null}
      <section className="pat-kpi-row" aria-label="Títulos carregados por vencimento">
        {[["Vencidos", overdue, "venc"], ["Vencem hoje", dueToday, "hoje"], ["Próximos dias", upcoming, "sem7"]] .map(([label, rows, target]) => (
          <button key={String(label)} type="button" className="pat-kpi" onClick={() => go({ tab: "rec", target: String(target) })}><span>{String(label)}</span><strong>{(rows as typeof allTitles).length}</strong><small>nos títulos carregados</small></button>
        ))}
      </section>
      <section className="financeiro-c__grid">
        <article className="pat-table"><h3>Movimento diário · 14 dias</h3><DayBars days={days} pressedDate={model.state.target?.startsWith("dia:") ? model.state.target.slice(4) : null} onDay={(date) => go({ tab: "ext", target: `dia:${date}` })} valueFormat={formatBRL} /></article>
        <article className="pat-table"><h3>Cheques a compensar</h3><p className="dense-col-tabular">{`${model.summary.cheques.pendingReceivedCount} recebidos · ${formatBRL(model.summary.cheques.pendingReceivedAmount)}`}</p><p>{`${model.summary.cheques.linkedPendingCount} vinculados a títulos · ${formatBRL(model.summary.cheques.linkedPendingAmount)}`}</p><button type="button" className="pat-btn" onClick={() => setChequeInfo((value) => !value)}>Como conferir</button>{chequeInfo ? <p className="pat-cell-muted">O resumo é global e real. Escolha um título para consultar seu cheque; esta tela não inventa uma lista inversa.</p> : null}</article>
      </section>
      {allTitles.length === 0 && model.entries.items.length === 0 ? <StatePanel tone="empty" embedded title="Nenhum item na página carregada" detail="Não há títulos nem lançamentos carregados para esta rotina." /> : <p className="pat-cell-muted">{`${allTitles.length} títulos carregados de ${model.receivables.total + model.payables.total} no servidor · ${model.entries.items.length} lançamentos carregados de ${model.entries.total}`}</p>}
    </div>
  );
}
