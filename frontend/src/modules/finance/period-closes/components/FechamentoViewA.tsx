import { AlertTriangle, CalendarClock, Clock, Lock, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

import { KpiStatCard } from "../../../../components/patterns";
import type { PeriodRow } from "../period-closes.types";
import { periodName } from "../period-keys";
import { closedDays, medianDays, SLOW_CLOSE_DAYS } from "../period-rows";
import {
  countRows,
  FechamentoBlocking,
  FechamentoHeader,
  FechamentoStates,
  FilterBlocks,
  FilterChip,
  focusedMonth,
  isBlocking,
  KpiSkeleton,
  MonthToCloseBanner,
  PeriodsListState,
  PeriodsTable,
  rowMatches,
  type FechamentoViewModel,
} from "./fechamento.shared";

// B-SAN3-24 (24b) — APARÊNCIA A "Lista de competências" (referência aprovada
// `screen-refs/fechamento-periodo-3opcoes.reference.html`, opção A; tela-modelo `FinanceiroViewA`). VIEW PURA. Aviso do
// mês que terminou e não fechou · indicadores que filtram (fechados, terminaram e não fecharam, contestação que impede,
// reabertos, tempo típico para fechar) · lista com os blocos por situação, de uma linha que abre o detalhe embaixo, com o
// checklist ao vivo e as ações. O tempo para fechar é `closedAt` menos o fim da competência (a referência o põe em "o que
// já tem dado"); o indicador é a MEDIANA, não a média, para não acumular no navegador (C-J547-1). Ficam de fora o que a referência marca "falta no backend" (o resultado do mês na linha, que aparece no
// detalhe, do retrato congelado) e os blocos "com contestação que impede" e "fechados com pendência", que pedem a leitura
// mês a mês do retrato (pendência `P-SAN3-24-BLOCOS-CONTESTACAO-E-PENDENCIA`).

export function PeriodListPanel({ model, title, withBlocks = false }: { readonly model: FechamentoViewModel; readonly title: string; readonly withBlocks?: boolean }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const rows = model.list.rows.filter((row) => rowMatches(row, model.filter, model.list.currentKey));
  const focus = focusedMonth(model.filter);
  // J-547 C3-10 — o mês aberto pelo gráfico ou pela exceção aparece com o detalhe aberto.
  useEffect(() => {
    if (focus) setOpenKey(focus);
  }, [focus]);
  const toggle = (row: PeriodRow) => {
    setOpenKey((current) => (current === row.period ? null : row.period));
    if (openKey !== row.period) model.onOpen(row.period);
  };
  return (
    <section className="financeiro-bc__panel" aria-label={title}>
      <div className="financeiro-bc__toolbar">
        <b style={{ fontSize: 14 }}>{title}</b>
        <span className="pat-cell-muted" style={{ fontSize: 12 }}>
          a corrente aparece sempre, mesmo sem fechamento
        </span>
        <span className="pat-os-count" style={{ marginLeft: "auto" }}>
          {model.list.loading ? <span className="pat-skel" aria-hidden="true" data-state="loading" style={{ display: "inline-block", width: 56, height: 11 }} /> : `${rows.length} ${rows.length === 1 ? "mês" : "meses"}`}
        </span>
      </div>
      {withBlocks ? <FilterBlocks model={model} framed /> : null}
      <FilterChip model={model} />
      <PeriodsListState model={model}>
        {rows.length === 0 ? (
          <p data-state="empty" style={{ padding: "24px 18px", textAlign: "center", color: "#64748B", fontSize: 13, margin: 0 }}>
            Nenhuma competência com este filtro.
          </p>
        ) : (
          <PeriodsTable model={model} rows={rows} openKey={openKey} onToggle={toggle} />
        )}
      </PeriodsListState>
    </section>
  );
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function FechamentoViewA(model: FechamentoViewModel) {
  if (isBlocking(model)) {
    return (
      <div data-aparencia="A" style={{ color: "#0F172A" }}>
        <FechamentoHeader />
        <FechamentoBlocking model={model} />
      </div>
    );
  }
  const loading = model.list.loading;
  const closed = countRows(model.list, "closed");
  const endedOpen = countRows(model.list, "ended-open");
  const reopened = countRows(model.list, "reopened");
  const slow = countRows(model.list, "slow");
  const typical = medianDays(closedDays(model.list.rows));
  const typicalText = typical === null ? null : `${typical.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${typical === 1 ? "dia" : "dias"}`;
  const toCloseState = model.details[model.monthToClose];
  const toClose = toCloseState?.detail?.checklist?.inDisputeTitles ?? null;
  const toCloseLoading = toClose === null && (toCloseState === undefined || toCloseState.loading);
  const toggle = (filter: FechamentoViewModel["filter"]) => model.onFilter(model.filter === filter ? "all" : filter);
  return (
    <div data-aparencia="A" style={{ color: "#0F172A" }}>
      <FechamentoHeader />
      <FechamentoStates model={model} />
      <MonthToCloseBanner model={model} />
      {loading ? (
        // J-547 C3-07 — esqueleto no lugar dos indicadores: nenhum "nenhum mês fechado" nem mês a fechar antes da lista.
        <div className="pat-kpi-row pat-kpi-row--5" aria-busy="true">
          {Array.from({ length: 5 }).map((_, index) => (
            <KpiSkeleton key={index} />
          ))}
        </div>
      ) : (
        <div className="pat-kpi-row pat-kpi-row--5">
          <KpiStatCard
            icon={Lock}
            iconColor="#047857"
            iconBg="#ECFDF5"
            value={closed}
            label="Meses fechados"
            hint={closed === 0 ? "nenhum mês fechado ainda" : "competências travadas"}
            pressed={model.filter === "closed"}
            onClick={() => toggle("closed")}
            ariaLabel={`Meses fechados: ${closed} — filtrar a lista`}
          />
          <KpiStatCard
            icon={CalendarClock}
            iconColor="#1D4ED8"
            iconBg="#EFF6FF"
            value={endedOpen}
            label="Terminaram e não fecharam"
            hint="abertos ou reabertos"
            tag={endedOpen > 0 ? { label: "a fazer", bg: "#EFF6FF", fg: "#1D4ED8" } : undefined}
            pressed={model.filter === "ended-open"}
            onClick={() => toggle("ended-open")}
            ariaLabel={`Terminaram e não fecharam: ${endedOpen} — filtrar a lista`}
          />
          {toCloseLoading ? (
            <KpiSkeleton />
          ) : (
            <KpiStatCard
              icon={AlertTriangle}
              iconColor="#DC2626"
              iconBg="#FEF2F2"
              value={toClose === null ? "—" : `${toClose} ${toClose === 1 ? "título" : "títulos"}`}
              label="Contestação que impede"
              hint={`em ${periodName(model.monthToClose).toLocaleLowerCase("pt-BR")}`}
              tag={toClose ? { label: "impede", bg: "#FEF2F2", fg: "#B91C1C" } : undefined}
              pressed={model.filter === `month:${model.monthToClose}`}
              onClick={() => (model.filter === `month:${model.monthToClose}` ? model.onFilter("all") : model.onFocusMonth(model.monthToClose))}
              ariaLabel={`Contestação que impede o fechamento de ${periodName(model.monthToClose)}: ${toClose ?? "indisponível"} — abrir o mês`}
            />
          )}
          <KpiStatCard
            icon={RotateCcw}
            iconColor="#6D28D9"
            iconBg="#F5F3FF"
            value={reopened}
            label="Reabertos"
            hint="voltaram a aceitar lançamentos"
            pressed={model.filter === "reopened"}
            onClick={() => toggle("reopened")}
            ariaLabel={`Reabertos: ${reopened} — filtrar a lista`}
          />
          <KpiStatCard
            icon={Clock}
            iconColor="#7C3AED"
            iconBg="#F5F3FF"
            value={typicalText ?? "—"}
            label="Tempo típico para fechar"
            hint={typical === null ? "nenhum mês fechado ainda" : `mediana · ${plural(slow, "mês", "meses")} acima de ${SLOW_CLOSE_DAYS} dias`}
            pressed={model.filter === "slow"}
            onClick={() => toggle("slow")}
            ariaLabel={`Tempo típico para fechar (mediana): ${typicalText ?? "sem mês fechado"} — ver os meses que passaram de ${SLOW_CLOSE_DAYS} dias`}
          />
        </div>
      )}
      <PeriodListPanel model={model} title="Competências" withBlocks />
    </div>
  );
}
