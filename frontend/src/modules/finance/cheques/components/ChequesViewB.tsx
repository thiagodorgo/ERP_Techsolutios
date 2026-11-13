import { ArrowDownRight, ArrowUpRight, Link2 } from "lucide-react";
import type { ReactNode } from "react";

import { CHEQUE_STATUS_LABELS, CHEQUE_STATUS_TONES } from "../cheque-actions";
import { formatMoney } from "../cheque-cash-impact";
import { CHEQUE_STATUSES, type ChequeStatus } from "../cheques.types";
import { EMPTY_FILTER, type ChequeListFilter } from "../useCheques";
import type { ChequesViewModel } from "./cheques.shared";
import { ChequeListPanel, ChequesBlocking, ChequesHeader, ChequesStates } from "./ChequesViewA";

// B-SAN3-24 (24a) — APARÊNCIA B "Visão analítica" (referência aprovada `screen-refs/cheques-3opcoes.reference.html`,
// opção B). Mesma camada de dados e mesmas ações da A. Cartões: pendentes por direção (valores do `/financial-summary`),
// esteira por situação (contagens do servidor) e pendentes por conta (registrados e depositados de cada conta, cada
// número do servidor); todos os blocos filtram a lista "Todos os cheques", com a direção de cada linha. Os cartões que a
// referência marca "falta no backend" (bom para nas próximas 6 semanas; compensados × devolvidos por mês) não existem
// no servidor e não entram.

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

function Bar({ value, max, color }: { readonly value: number | null; readonly max: number; readonly color: string }) {
  const width = value !== null && max > 0 ? Math.max(3, Math.round((value / max) * 100)) : 0;
  return (
    <span aria-hidden="true" style={{ flex: 1, height: 7, background: "#F1F5F9", borderRadius: 99, overflow: "hidden" }}>
      <span style={{ display: "block", width: `${width}%`, height: "100%", background: color, borderRadius: 99 }} />
    </span>
  );
}

// J-547 C3-11 — o botão de linha usa o cartão clicável da biblioteca (`financeiro-b__account`: borda, passar o mouse,
// pressionado e o anel de foco de 2 px #2563EB do sistema), deitado em linha; nada de anel padrão do navegador.
function RowButton({ pressed, label, onClick, children }: { readonly pressed: boolean; readonly label: string; readonly onClick: () => void; readonly children: ReactNode }) {
  return (
    <button
      type="button"
      className="financeiro-b__account"
      aria-pressed={pressed}
      aria-label={label}
      onClick={onClick}
      style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: "9px 12px", fontSize: 12.5, color: "#0F172A", minHeight: 40 }}
    >
      {children}
    </button>
  );
}

export function ChequesViewB(model: ChequesViewModel) {
  const { summary, filter, counts } = model;
  const blocking = model.list.forbidden || (model.list.failed && !model.list.stale);
  const go = (next: Partial<ChequeListFilter>) => model.onFilter({ ...EMPTY_FILTER, accountId: filter.accountId, ...next });
  const isPressed = (next: Partial<ChequeListFilter>) =>
    filter.status === (next.status ?? null) && filter.direction === (next.direction ?? null) && filter.link === (next.link ?? null) && filter.accountId === (next.accountId ?? filter.accountId);
  const knownCounts = CHEQUE_STATUSES.map((status) => counts[status]).filter((value): value is number => value !== null);
  const maxCount = Math.max(1, ...knownCounts);
  const maxReceived = summary ? Math.max(summary.pendingReceivedAmount, summary.pendingIssuedAmount, 1) : 1;
  const accounts = model.accounts.filter((account) => account.active || model.accountCounts[account.id]);
  const accountMax = Math.max(
    1,
    ...accounts.map((account) => Math.max(model.accountCounts[account.id]?.registered ?? 0, model.accountCounts[account.id]?.deposited ?? 0)),
  );

  return (
    <div data-aparencia="B" style={{ color: "#0F172A" }}>
      <ChequesHeader model={model} />
      <ChequesStates model={model} />
      {blocking ? (
        <ChequesBlocking model={model} />
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 16 }}>
            <Card title="Pendentes por direção" hint="resumo do servidor">
              <div style={{ display: "grid", gap: 8 }}>
                <RowButton
                  pressed={isPressed({ status: "pending", direction: "received" })}
                  label={`A receber pendentes: ${summary ? formatMoney(summary.pendingReceivedAmount) : "indisponível"} — filtrar a lista`}
                  onClick={() => go({ status: "pending", direction: "received" })}
                >
                  <ArrowUpRight size={14} color="#15803D" aria-hidden="true" />
                  <span style={{ minWidth: 120 }}>{summary ? `A receber · ${summary.pendingReceivedCount} cheques` : "A receber"}</span>
                  <Bar value={summary?.pendingReceivedAmount ?? null} max={maxReceived} color="#10B981" />
                  <b style={{ color: "#047857" }}>{summary ? formatMoney(summary.pendingReceivedAmount) : "—"}</b>
                </RowButton>
                <RowButton
                  pressed={isPressed({ status: "pending", direction: "issued" })}
                  label={`A pagar pendentes: ${summary ? formatMoney(summary.pendingIssuedAmount) : "indisponível"} — filtrar a lista`}
                  onClick={() => go({ status: "pending", direction: "issued" })}
                >
                  <ArrowDownRight size={14} color="#B91C1C" aria-hidden="true" />
                  <span style={{ minWidth: 120 }}>{summary ? `A pagar · ${summary.pendingIssuedCount} cheques` : "A pagar"}</span>
                  <Bar value={summary?.pendingIssuedAmount ?? null} max={maxReceived} color="#F87171" />
                  <b style={{ color: "#B91C1C" }}>{summary ? formatMoney(summary.pendingIssuedAmount) : "—"}</b>
                </RowButton>
                <RowButton
                  pressed={isPressed({ status: "pending", link: "linked" })}
                  label={`Vinculados a título: ${summary ? formatMoney(summary.linkedPendingAmount) : "indisponível"} — filtrar a lista`}
                  onClick={() => go({ status: "pending", link: "linked" })}
                >
                  <Link2 size={14} color="#1D4ED8" aria-hidden="true" />
                  <span style={{ flex: 1, color: "#1D4ED8", fontWeight: 700 }}>{summary ? `Vinculados a título · ${summary.linkedPendingCount}` : "Vinculados a título"}</span>
                  <b style={{ color: "#1D4ED8" }}>{summary ? formatMoney(summary.linkedPendingAmount) : "—"}</b>
                </RowButton>
              </div>
            </Card>
            <Card title="Esteira por situação" hint="contagem de cheques">
              <div style={{ display: "grid", gap: 6 }}>
                {CHEQUE_STATUSES.map((status: ChequeStatus) => (
                  <RowButton
                    key={status}
                    pressed={isPressed({ status })}
                    label={`${CHEQUE_STATUS_LABELS[status]}: ${counts[status] ?? "contagem indisponível"} — filtrar a lista`}
                    onClick={() => go({ status })}
                  >
                    <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 99, background: CHEQUE_STATUS_TONES[status].fg }} />
                    <span style={{ minWidth: 92 }}>{CHEQUE_STATUS_LABELS[status]}</span>
                    <Bar value={counts[status]} max={maxCount} color={CHEQUE_STATUS_TONES[status].fg} />
                    <b>{counts[status] ?? "—"}</b>
                  </RowButton>
                ))}
              </div>
              <p style={{ margin: "10px 0 0", fontSize: 11.5, color: "#64748B" }}>
                Registrado → Depositado → <b>Compensado</b>; a devolução pode vir depois do depósito ou da compensação.
              </p>
            </Card>
            <Card title="Pendentes por conta" hint="contagem">
              {accounts.length === 0 ? (
                <p style={{ margin: 0, fontSize: 12.5, color: "#64748B" }}>Nenhuma conta para mostrar.</p>
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  {accounts.map((account) => {
                    const pair = model.accountCounts[account.id];
                    return (
                      <RowButton
                        key={account.id}
                        pressed={filter.status === "pending" && filter.accountId === account.id && filter.direction === null && filter.link === null}
                        label={`${account.name}: ${pair?.registered ?? "—"} registrados e ${pair?.deposited ?? "—"} depositados — filtrar a lista`}
                        onClick={() => model.onFilter({ ...EMPTY_FILTER, status: "pending", accountId: account.id })}
                      >
                        <span style={{ minWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={account.name}>
                          {account.name}
                        </span>
                        <Bar value={pair ? Math.max(pair.registered ?? 0, pair.deposited ?? 0) : null} max={accountMax} color="#3B82F6" />
                        <small style={{ color: "#475569", whiteSpace: "nowrap" }}>{pair ? `${pair.registered ?? "—"} reg. · ${pair.deposited ?? "—"} dep.` : "—"}</small>
                      </RowButton>
                    );
                  })}
                </div>
              )}
              <p style={{ margin: "10px 0 0", fontSize: 11.5, color: "#64748B" }}>A conta é onde o dinheiro entra ou sai quando o cheque compensar.</p>
            </Card>
          </div>
          <ChequeListPanel model={model} title="Todos os cheques" withDirection />
        </>
      )}
    </div>
  );
}
