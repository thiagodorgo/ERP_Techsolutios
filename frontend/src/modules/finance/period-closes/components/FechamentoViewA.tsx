import { AlertTriangle, CalendarClock, Lock, RotateCcw } from "lucide-react";
import { useState } from "react";

import { KpiStatCard } from "../../../../components/patterns";
import type { PeriodRow } from "../period-closes.types";
import { periodName } from "../period-keys";
import {
  countRows,
  FechamentoBlocking,
  FechamentoHeader,
  FechamentoStates,
  FILTER_LABELS,
  FilterBlocks,
  isBlocking,
  MonthToCloseBanner,
  PeriodsListState,
  PeriodsTable,
  rowMatches,
  type FechamentoViewModel,
} from "./fechamento.shared";

// B-SAN3-24 (24b) — APARÊNCIA A "Lista de competências" (referência aprovada
// `screen-refs/fechamento-periodo-3opcoes.reference.html`, opção A; tela-modelo `FinanceiroViewA`). VIEW PURA. Aviso do
// mês que terminou e não fechou · indicadores que filtram (fechados, terminaram e não fecharam, contestação que impede,
// reabertos) · blocos por situação · lista de uma linha que abre o detalhe embaixo, com o checklist ao vivo e as ações.
// "Tempo médio para fechar", "fechados com pendência" e o resultado do mês na linha estão marcados "falta no backend"
// na referência e não entram (o resultado aparece no detalhe, do retrato congelado).

export function PeriodListPanel({ model, title }: { readonly model: FechamentoViewModel; readonly title: string }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const rows = model.list.rows.filter((row) => rowMatches(row, model.filter, model.list.currentKey));
  const toggle = (row: PeriodRow) => {
    setOpenKey((current) => (current === row.period ? null : row.period));
    if (openKey !== row.period) model.onOpen(row.period);
  };
  return (
    <section aria-label={title} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", flexWrap: "wrap" }}>
        <b style={{ fontSize: 14 }}>{title}</b>
        <span className="pat-cell-muted" style={{ fontSize: 12 }}>
          a corrente aparece sempre, mesmo sem fechamento
        </span>
        <span className="pat-os-count" style={{ marginLeft: "auto" }}>{`${rows.length} ${rows.length === 1 ? "mês" : "meses"}`}</span>
      </div>
      {model.filter !== "all" ? (
        <div className="pat-filtro-chip-bar" style={{ padding: "0 18px 10px" }}>
          <span className="pat-filtro-chip">
            {`Filtro: ${FILTER_LABELS[model.filter].toLocaleLowerCase("pt-BR")}`}
            <button type="button" onClick={() => model.onFilter("all")} aria-label="Limpar o filtro da lista">
              ✕
            </button>
          </span>
        </div>
      ) : null}
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

export function FechamentoViewA(model: FechamentoViewModel) {
  if (isBlocking(model)) {
    return (
      <div data-aparencia="A" style={{ color: "#0F172A" }}>
        <FechamentoHeader />
        <FechamentoBlocking model={model} />
      </div>
    );
  }
  const closed = countRows(model.list, "closed");
  const endedOpen = countRows(model.list, "ended-open");
  const reopened = countRows(model.list, "reopened");
  const toClose = model.details[model.monthToClose]?.detail?.checklist?.inDisputeTitles ?? null;
  const loading = model.list.loading;
  return (
    <div data-aparencia="A" style={{ color: "#0F172A" }}>
      <FechamentoHeader />
      <FechamentoStates model={model} />
      <MonthToCloseBanner model={model} />
      <div className="pat-kpi-row pat-kpi-row--4" aria-busy={loading ? true : undefined}>
        <KpiStatCard
          icon={Lock}
          iconColor="#047857"
          iconBg="#ECFDF5"
          value={loading ? "…" : closed}
          label="Meses fechados"
          hint={closed === 0 ? "nenhum mês fechado ainda" : "competências travadas"}
          pressed={model.filter === "closed"}
          onClick={() => model.onFilter(model.filter === "closed" ? "all" : "closed")}
          ariaLabel={`Meses fechados: ${closed} — filtrar a lista`}
        />
        <KpiStatCard
          icon={CalendarClock}
          iconColor="#1D4ED8"
          iconBg="#EFF6FF"
          value={loading ? "…" : endedOpen}
          label="Terminaram e não fecharam"
          hint="abertos ou reabertos"
          tag={endedOpen > 0 ? { label: "a fazer", bg: "#EFF6FF", fg: "#1D4ED8" } : undefined}
          pressed={model.filter === "ended-open"}
          onClick={() => model.onFilter(model.filter === "ended-open" ? "all" : "ended-open")}
          ariaLabel={`Terminaram e não fecharam: ${endedOpen} — filtrar a lista`}
        />
        <KpiStatCard
          icon={AlertTriangle}
          iconColor="#DC2626"
          iconBg="#FEF2F2"
          value={toClose === null ? "—" : `${toClose} ${toClose === 1 ? "título" : "títulos"}`}
          label="Contestação que impede"
          hint={`em ${periodName(model.monthToClose).toLocaleLowerCase("pt-BR")}`}
          tag={toClose ? { label: "impede", bg: "#FEF2F2", fg: "#B91C1C" } : undefined}
          onClick={() => model.onFilter("ended-open")}
          ariaLabel={`Contestação que impede o fechamento de ${periodName(model.monthToClose)}: ${toClose ?? "indisponível"} — filtrar os meses que terminaram e não fecharam`}
        />
        <KpiStatCard
          icon={RotateCcw}
          iconColor="#6D28D9"
          iconBg="#F5F3FF"
          value={loading ? "…" : reopened}
          label="Reabertos"
          hint="voltaram a aceitar lançamentos"
          pressed={model.filter === "reopened"}
          onClick={() => model.onFilter(model.filter === "reopened" ? "all" : "reopened")}
          ariaLabel={`Reabertos: ${reopened} — filtrar a lista`}
        />
      </div>
      <div style={{ margin: "0 0 12px" }}>
        <FilterBlocks model={model} />
      </div>
      <PeriodListPanel model={model} title="Competências" />
    </div>
  );
}
