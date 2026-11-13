import { useEffect, useState } from "react";

import { PERIOD_STATUS_LABELS, PERIOD_STATUS_TONES } from "../period-actions";
import type { PeriodRow } from "../period-closes.types";
import { periodMonthName, periodName } from "../period-keys";
import { closeTimeText } from "../period-rows";
import { BlockSkeleton, FechamentoBlocking, FechamentoHeader, FechamentoStates, FilterBlocks, FilterChip, focusedMonth, isBlocking, PeriodsListState, PeriodsTable, rowMatches, type FechamentoViewModel } from "./fechamento.shared";
import { MonthToCloseCard } from "./FechamentoViewB";

// B-SAN3-24 (24b) — APARÊNCIA C "O ano e o checklist" (referência aprovada
// `screen-refs/fechamento-periodo-3opcoes.reference.html`, opção C). Mesma camada de dados e mesmas ações da A. O ano
// corrente mês a mês (situação de cada competência e o tempo para fechar ou há quantos dias está aberta; mês futuro =
// ainda não começou), clicar num mês abre o checklist dele ao lado, com as ações; e a lista agrupada por trimestre. O
// calendário lê as MESMAS linhas dos blocos e da lista (J-547 C3-12, `periodRowsFor`): o mês sem fechamento no servidor
// está aberto em todo lugar e conta em "Terminaram e não estão fechados".

function quarterLabel(period: string): string {
  const month = Number(period.slice(5, 7));
  return `${Math.ceil(month / 3)}º trimestre de ${period.slice(0, 4)}`;
}

export function FechamentoViewC(model: FechamentoViewModel) {
  const [selected, setSelected] = useState<string | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const focus = focusedMonth(model.filter);
  useEffect(() => {
    if (focus) setOpenKey(focus);
  }, [focus]);
  if (isBlocking(model)) {
    return (
      <div data-aparencia="C" style={{ color: "#0F172A" }}>
        <FechamentoHeader />
        <FechamentoBlocking model={model} />
      </div>
    );
  }
  const year = model.list.currentKey.slice(0, 4);
  const months = Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, "0")}`);
  const target = selected ?? model.monthToClose;
  const rows = model.list.rows.filter((row) => rowMatches(row, model.filter, model.list.currentKey));
  const groups = new Map<string, PeriodRow[]>();
  for (const row of rows) groups.set(quarterLabel(row.period), [...(groups.get(quarterLabel(row.period)) ?? []), row]);
  const choose = (period: string) => {
    setSelected(period);
    model.onOpen(period);
  };
  const toggle = (row: PeriodRow) => {
    setOpenKey((current) => (current === row.period ? null : row.period));
    if (openKey !== row.period) model.onOpen(row.period);
  };
  const card = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 16 } as const;
  return (
    <div data-aparencia="C" style={{ color: "#0F172A" }}>
      <FechamentoHeader />
      <FechamentoStates model={model} />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.15fr) minmax(0, 1fr)", gap: 16, marginBottom: 16 }}>
        <article style={card}>
          <b style={{ fontSize: 14 }}>{`${year} mês a mês`}</b>
          <small style={{ color: "#94A3B8", marginLeft: 8 }}>clique no mês para abrir</small>
          <div style={{ margin: "12px 0" }}>
            <FilterBlocks model={model} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }} aria-busy={model.list.loading ? true : undefined}>
            {months.map((period) => {
              if (model.list.loading) return <BlockSkeleton key={period} height={56} />;
              const row = model.list.rows.find((item) => item.period === period);
              const future = period > model.list.currentKey;
              const status = row?.status ?? "open";
              const tone = PERIOD_STATUS_TONES[status];
              const label = future ? "ainda não começou" : period === model.list.currentKey && status === "open" ? "em andamento" : PERIOD_STATUS_LABELS[status].toLocaleLowerCase("pt-BR");
              const time = future || !row ? null : closeTimeText(row, model.list.currentKey);
              return (
                <button
                  key={period}
                  type="button"
                  disabled={future}
                  aria-pressed={target === period}
                  aria-label={`${periodName(period)}: ${label}${future ? "" : " — abrir o checklist"}`}
                  onClick={() => choose(period)}
                  style={{
                    textAlign: "left",
                    font: "inherit",
                    minHeight: 56,
                    padding: "8px 10px",
                    borderRadius: 10,
                    borderTop: `1px solid ${target === period ? "#2563EB" : "#E2E8F0"}`,
                    borderRight: `1px solid ${target === period ? "#2563EB" : "#E2E8F0"}`,
                    borderBottom: `1px solid ${target === period ? "#2563EB" : "#E2E8F0"}`,
                    borderLeft: `3px solid ${future ? "#E2E8F0" : tone.fg}`,
                    background: future ? "#F8FAFC" : "#fff",
                    color: future ? "#94A3B8" : "#0F172A",
                    cursor: future ? "default" : "pointer",
                  }}
                >
                  <b style={{ fontSize: 12.5, display: "block" }}>{periodMonthName(period)}</b>
                  <small style={{ fontSize: 11, color: future ? "#94A3B8" : tone.fg, display: "block" }}>{label}</small>
                  {time && time.text !== "em andamento" && time.text !== "—" ? (
                    <small style={{ fontSize: 10.5, color: time.tone === "late" ? "#B91C1C" : time.tone === "slow" ? "#B45309" : "#64748B", display: "block" }}>
                      {time.tone === "done" || time.tone === "slow" ? `em ${time.text}` : time.text}
                    </small>
                  ) : null}
                </button>
              );
            })}
          </div>
        </article>
        <article style={card}>
          <b style={{ fontSize: 14, display: "block", marginBottom: 12 }}>{model.list.loading ? "Checklist" : `Checklist de ${periodName(target).toLocaleLowerCase("pt-BR")}`}</b>
          <MonthToCloseCard model={model} period={target} />
        </article>
      </div>
      <section aria-label="Competências por trimestre" style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "14px 18px" }}>
          <b style={{ fontSize: 14 }}>Competências por trimestre</b>
          <span className="pat-os-count" style={{ marginLeft: "auto" }}>
            {model.list.loading ? <span className="pat-skel" aria-hidden="true" data-state="loading" style={{ display: "inline-block", width: 56, height: 11 }} /> : `${rows.length} ${rows.length === 1 ? "mês" : "meses"}`}
          </span>
        </div>
        <FilterChip model={model} />
        <PeriodsListState model={model}>
          {rows.length === 0 ? (
            <p data-state="empty" style={{ padding: "24px 18px", textAlign: "center", color: "#64748B", fontSize: 13, margin: 0 }}>
              Nenhuma competência com este filtro.
            </p>
          ) : (
            [...groups.entries()].map(([label, groupRows]) => (
              <div key={label}>
                <div style={{ padding: "10px 18px", fontSize: 11.5, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "#334155", borderTop: "1px solid #F1F5F9", background: "#F8FAFC" }}>
                  {label} <span style={{ fontWeight: 600, color: "#94A3B8", textTransform: "none", marginLeft: 6 }}>{`${groupRows.length} ${groupRows.length === 1 ? "mês" : "meses"}`}</span>
                </div>
                <PeriodsTable model={model} rows={groupRows} openKey={openKey} onToggle={toggle} />
              </div>
            ))
          )}
        </PeriodsListState>
      </section>
    </div>
  );
}
