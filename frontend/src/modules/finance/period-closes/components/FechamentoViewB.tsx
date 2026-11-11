import { AlertTriangle, CheckCircle2, ClipboardList, Lock } from "lucide-react";
import type { ReactNode } from "react";

import { periodMonthName, periodName } from "../period-keys";
import { FechamentoBlocking, FechamentoHeader, FechamentoStates, FilterBlocks, formatBRL, isBlocking, type FechamentoViewModel } from "./fechamento.shared";
import { PeriodListPanel } from "./FechamentoViewA";

// B-SAN3-24 (24b) — APARÊNCIA B "Visão analítica" (referência aprovada
// `screen-refs/fechamento-periodo-3opcoes.reference.html`, opção B). Mesma camada de dados e mesmas ações da A. Blocos
// que filtram · "Resultado por competência" (entradas, saídas e resultado de cada mês FECHADO, do retrato congelado do
// servidor) · "Mês a fechar" (checklist ao vivo e o botão de fechar) · "Exceções" (reabertos e fechados mesmo assim) ·
// lista. "Dias para fechar depois do fim do mês" não tem dado no servidor e não entra.

const card = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 16 } as const;

function Card({ title, hint, children }: { readonly title: string; readonly hint?: string; readonly children: ReactNode }) {
  return (
    <article style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
        <b style={{ fontSize: 14 }}>{title}</b>
        {hint ? <small style={{ color: "#94A3B8", fontSize: 11.5 }}>{hint}</small> : null}
      </div>
      {children}
    </article>
  );
}

export function MonthToCloseCard({ model, period }: { readonly model: FechamentoViewModel; readonly period: string }) {
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

export function FechamentoViewB(model: FechamentoViewModel) {
  if (isBlocking(model)) {
    return (
      <div data-aparencia="B" style={{ color: "#0F172A" }}>
        <FechamentoHeader />
        <FechamentoBlocking model={model} />
      </div>
    );
  }
  const closedRows = model.list.rows.filter((row) => row.status === "closed").slice(0, 12);
  const results = closedRows
    .map((row) => ({ row, snapshot: model.details[row.period]?.detail?.snapshot ?? null }))
    .filter((item) => item.snapshot !== null)
    .reverse();
  const maxValue = Math.max(1, ...results.map((item) => Math.max(item.snapshot!.entriesIn.sumAmount, item.snapshot!.entriesOut.sumAmount)));
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
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr)", gap: 16, marginBottom: 16 }}>
        <Card title="Entradas × saídas por competência" hint="retrato de cada mês fechado">
          {results.length === 0 ? (
            <p style={{ margin: 0, fontSize: 12.5, color: "#64748B" }}>Nenhum mês fechado ainda.</p>
          ) : (
            <div role="list" style={{ display: "flex", alignItems: "flex-end", gap: 10, minHeight: 150, overflowX: "auto" }}>
              {results.map(({ row, snapshot }) => (
                <div
                  role="listitem"
                  key={row.period}
                  aria-label={`${periodName(row.period)}: entradas ${formatBRL(snapshot!.entriesIn.sumAmount)}, saídas ${formatBRL(snapshot!.entriesOut.sumAmount)}, resultado ${formatBRL(snapshot!.net)}`}
                  title={`${periodName(row.period)} — entradas ${formatBRL(snapshot!.entriesIn.sumAmount)} · saídas ${formatBRL(snapshot!.entriesOut.sumAmount)} · resultado ${formatBRL(snapshot!.net)}`}
                  style={{ display: "grid", justifyItems: "center", gap: 4, minWidth: 42 }}
                >
                  <small style={{ fontSize: 10, fontWeight: 800, color: snapshot!.net < 0 ? "#B91C1C" : "#047857" }}>{snapshot!.net < 0 ? "−" : "+"}</small>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 110 }}>
                    <span style={{ width: 12, height: `${Math.max(3, Math.round((snapshot!.entriesIn.sumAmount / maxValue) * 100))}%`, background: "#10B981", borderRadius: 3 }} />
                    <span style={{ width: 12, height: `${Math.max(3, Math.round((snapshot!.entriesOut.sumAmount / maxValue) * 100))}%`, background: "#F87171", borderRadius: 3 }} />
                  </div>
                  <small style={{ fontSize: 10.5, color: "#475569" }}>{periodMonthName(row.period).slice(0, 3).toLocaleLowerCase("pt-BR")}</small>
                </div>
              ))}
            </div>
          )}
          <p style={{ margin: "8px 0 0", fontSize: 11.5, color: "#64748B" }}>Em cada mês, a 1ª barra (verde) são as entradas e a 2ª (vermelha) as saídas; o sinal acima é o resultado. O valor de cada mês aparece ao passar o mouse e no detalhe.</p>
        </Card>
        <Card title="Mês a fechar" hint="pendências ao vivo">
          <MonthToCloseCard model={model} period={model.monthToClose} />
        </Card>
      </div>
      <div style={{ ...card, marginBottom: 16 }}>
        <b style={{ fontSize: 14 }}>Exceções</b>
        <small style={{ color: "#94A3B8", marginLeft: 8 }}>reabertos e fechados mesmo assim</small>
        {exceptions.length === 0 ? (
          <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "#64748B" }}>Nenhuma exceção.</p>
        ) : (
          <ul style={{ margin: "10px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
            {exceptions.map(({ row, detail }) => (
              <li key={row.period} style={{ borderLeft: `3px solid ${row.status === "reopened" ? "#7C3AED" : "#F59E0B"}`, background: "#F8FAFC", borderRadius: 8, padding: "8px 12px", fontSize: 12.5 }}>
                <b>{periodName(row.period)}</b>
                {row.status === "reopened" ? ` · reaberto${detail?.reopenReason ? `: ${detail.reopenReason}` : ""}` : ` · fechado mesmo assim${detail?.snapshot?.forcedReason ? `: ${detail.snapshot.forcedReason}` : ""}`}
              </li>
            ))}
          </ul>
        )}
      </div>
      <PeriodListPanel model={model} title="Competências" />
    </div>
  );
}
