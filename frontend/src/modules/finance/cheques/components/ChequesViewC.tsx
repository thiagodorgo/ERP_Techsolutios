import { useState, type ReactNode } from "react";

import { formatMoney } from "../cheque-cash-impact";
import type { Cheque } from "../cheques.types";
import { EMPTY_FILTER } from "../useCheques";
import { ChequeDetail, ChequesTable, daysUntilDue, filterLabel, ListStates, ServerPager, type ChequesViewModel } from "./cheques.shared";
import { AccountSelect, ChequesBlocking, ChequesHeader, ChequesStates, FilterChipBar } from "./ChequesViewA";

// B-SAN3-24 (24a) — APARÊNCIA C "Agenda do bom para" (referência aprovada `screen-refs/cheques-3opcoes.reference.html`,
// opção C). Mesma camada de dados e mesmas ações da A. Blocos que filtram (a depositar, já passou, hoje, próximos 7 dias,
// depositados), a agenda de 15 dias, a mesa de hoje e a lista por prazo. A situação vem do servidor; o prazo ("bom
// para") é uma DATA de calendário que o servidor não agrupa: a agenda, a mesa e os blocos de prazo contam os cheques
// pendentes CARREGADOS (até 100 por situação) e dizem isso na tela quando a lista não veio inteira (nenhum dinheiro é
// somado no navegador).

type Bucket = "passed" | "today" | "week" | "later";

function bucketOf(cheque: Cheque, today: Date): Bucket | null {
  if (cheque.status !== "registered") return null;
  const days = daysUntilDue(cheque.dueDate, today);
  if (days === null || days > 7) return "later";
  if (days < 0) return "passed";
  if (days === 0) return "today";
  return "week";
}

const BUCKET_LABELS: Readonly<Record<Bucket, string>> = {
  passed: "Bom para já passou — depositar",
  today: "Bom para hoje",
  week: "Próximos 7 dias",
  later: "Mais adiante ou sem data",
};

const WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

function dayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function Block({ label, count, pressed, onClick }: { readonly label: string; readonly count: number | null; readonly pressed: boolean; readonly onClick: () => void }) {
  return (
    <button type="button" className={pressed ? "pat-os-tab pat-os-tab--active" : "pat-os-tab"} aria-pressed={pressed} aria-label={`${label}: ${count ?? "contagem indisponível"} — filtrar a lista`} onClick={onClick}>
      {label}
      {count !== null ? <b style={{ marginLeft: 6 }}>{count}</b> : null}
    </button>
  );
}

function GroupHead({ label, count, tone }: { readonly label: string; readonly count: number; readonly tone?: "overdue" | "today" }) {
  const color = tone === "overdue" ? "#B91C1C" : tone === "today" ? "#1D4ED8" : "#334155";
  return (
    <div style={{ padding: "10px 18px", fontSize: 11.5, fontWeight: 800, letterSpacing: ".04em", color, textTransform: "uppercase", borderTop: "1px solid #F1F5F9", background: "#F8FAFC" }}>
      {label} <span style={{ fontWeight: 600, color: "#94A3B8", textTransform: "none", marginLeft: 6 }}>{`${count} ${count === 1 ? "cheque" : "cheques"}`}</span>
    </div>
  );
}

function MesaItem({ model, cheque, open, onToggle }: { readonly model: ChequesViewModel; readonly cheque: Cheque; readonly open: boolean; readonly onToggle: () => void }) {
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        style={{ display: "flex", gap: 10, alignItems: "center", width: "100%", font: "inherit", fontSize: 12.5, textAlign: "left", background: "#fff", borderTop: "1px solid #E2E8F0", borderRight: "1px solid #E2E8F0", borderBottom: "1px solid #E2E8F0", borderLeft: `3px solid ${cheque.direction === "received" ? "#7C3AED" : "#F59E0B"}`, borderRadius: 8, padding: "8px 12px", minHeight: 40, cursor: "pointer" }}
      >
        <b style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>{cheque.chequeNumber}</b>
        <span style={{ flex: 1, color: "#334155" }}>{cheque.titleId ? "Vinculado a título" : "Sem título"}</span>
        <b style={{ color: cheque.direction === "received" ? "#047857" : "#B91C1C" }}>{formatMoney(cheque.amount)}</b>
      </button>
      {open ? <ChequeDetail model={model} cheque={cheque} /> : null}
    </>
  );
}

export function ChequesViewC(model: ChequesViewModel) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [mesaKey, setMesaKey] = useState<string | null>(null);
  const [bucket, setBucket] = useState<Bucket | null>(null);
  const blocking = model.list.forbidden || (model.list.failed && !model.list.stale);
  const today = new Date();
  const pendingItems = model.pending?.items ?? [];
  const registered = pendingItems.filter((cheque) => cheque.status === "registered");
  const bucketCount = (target: Bucket) => registered.filter((cheque) => bucketOf(cheque, today) === target).length;
  const loadedAll = model.pending?.complete ?? true;
  const toggle = (cheque: Cheque) => {
    setOpenKey((current) => (current === cheque.id ? null : cheque.id));
    if (openKey !== cheque.id) model.onOpen(cheque);
  };
  const toggleMesa = (cheque: Cheque) => {
    setMesaKey((current) => (current === cheque.id ? null : cheque.id));
    if (mesaKey !== cheque.id) model.onOpen(cheque);
  };
  const setStatusFilter = (status: "registered" | "deposited" | null) => {
    setBucket(null);
    model.onFilter({ ...EMPTY_FILTER, accountId: model.filter.accountId, status });
  };
  const chooseBucket = (target: Bucket) => {
    const next = bucket === target ? null : target;
    setBucket(next);
    model.onFilter({ ...EMPTY_FILTER, accountId: model.filter.accountId, status: next ? "registered" : null });
  };

  const days = Array.from({ length: 15 }, (_, index) => new Date(today.getTime() + (index - 2) * 86_400_000));
  const todayKey = dayKey(today);

  const listItems = bucket ? model.list.items.filter((cheque) => bucketOf(cheque, today) === bucket) : model.list.items;
  const groups: { readonly key: string; readonly label: string; readonly rows: readonly Cheque[]; readonly tone?: "overdue" | "today" }[] = [
    ...(["passed", "today", "week", "later"] as const).map((target) => ({
      key: target,
      label: BUCKET_LABELS[target],
      rows: listItems.filter((cheque) => bucketOf(cheque, today) === target),
      ...(target === "passed" ? { tone: "overdue" as const } : target === "today" ? { tone: "today" as const } : {}),
    })),
    { key: "deposited", label: "Depositados · aguardando o banco", rows: listItems.filter((cheque) => cheque.status === "deposited") },
    { key: "closed", label: "Encerrados", rows: listItems.filter((cheque) => cheque.status === "cleared" || cheque.status === "bounced" || cheque.status === "cancelled") },
  ];
  const mesa: { readonly label: string; readonly rows: readonly Cheque[] }[] = [
    { label: "Depositar hoje · bom para chegou", rows: registered.filter((cheque) => (daysUntilDue(cheque.dueDate, today) ?? 1) <= 0) },
    { label: "Entram quando o banco compensar", rows: pendingItems.filter((cheque) => cheque.status === "deposited" && cheque.direction === "received") },
    { label: "Saem quando o banco compensar", rows: pendingItems.filter((cheque) => cheque.status === "deposited" && cheque.direction === "issued") },
  ];
  const card = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 16 } as const;
  const panelNode = (children: ReactNode) => (
    <section aria-label="Cheques por prazo" style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px 10px", flexWrap: "wrap" }}>
        <b style={{ fontSize: 14 }}>Cheques por prazo</b>
        <AccountSelect model={model} />
        <span className="pat-os-count" style={{ marginLeft: "auto" }}>
          {`${model.list.total ?? listItems.length} cheques`}
        </span>
      </div>
      <FilterChipBar model={model} />
      {bucket ? (
        <p style={{ margin: "8px 18px 0", fontSize: 12, color: "#475569" }}>{`Prazo: ${BUCKET_LABELS[bucket].toLocaleLowerCase("pt-BR")}, entre os cheques registrados carregados.`}</p>
      ) : null}
      {children}
    </section>
  );

  return (
    <div data-aparencia="C" style={{ color: "#0F172A" }}>
      <ChequesHeader model={model} />
      <ChequesStates model={model} />
      {blocking ? (
        <ChequesBlocking model={model} />
      ) : (
        <>
          <div className="pat-os-tabs" role="group" aria-label="Prazo e situação" style={{ ...card, padding: "12px 16px", marginBottom: 16, flexWrap: "wrap" }}>
            <Block label="A depositar ou apresentar" count={model.counts.registered} pressed={model.filter.status === "registered" && bucket === null} onClick={() => setStatusFilter(model.filter.status === "registered" && bucket === null ? null : "registered")} />
            <Block label="Bom para já passou" count={model.pending ? bucketCount("passed") : null} pressed={bucket === "passed"} onClick={() => chooseBucket("passed")} />
            <Block label="Bom para hoje" count={model.pending ? bucketCount("today") : null} pressed={bucket === "today"} onClick={() => chooseBucket("today")} />
            <Block label="Próximos 7 dias" count={model.pending ? bucketCount("week") : null} pressed={bucket === "week"} onClick={() => chooseBucket("week")} />
            <Block label="Depositados aguardando o banco" count={model.counts.deposited} pressed={model.filter.status === "deposited"} onClick={() => setStatusFilter(model.filter.status === "deposited" ? null : "deposited")} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.25fr) minmax(0, 1fr)", gap: 16, marginBottom: 16 }}>
            <article style={card}>
              <b style={{ fontSize: 14 }}>{`Agenda do bom para · ${days[0].toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" })} a ${days[14].toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" })}`}</b>
              <div role="list" aria-label="Cheques registrados por dia do bom para" style={{ display: "grid", gridTemplateColumns: "repeat(15, minmax(0, 1fr))", gap: 4, marginTop: 12 }}>
                {days.map((day) => {
                  const key = dayKey(day);
                  const onDay = registered.filter((cheque) => cheque.dueDate === key);
                  const isToday = key === todayKey;
                  const past = key < todayKey;
                  return (
                    <div
                      role="listitem"
                      key={key}
                      aria-label={`${key.slice(8, 10)}/${key.slice(5, 7)}: ${onDay.length} cheques`}
                      style={{ textAlign: "center", borderRadius: 8, padding: "6px 2px", border: `1px solid ${isToday ? "#2563EB" : past && onDay.length > 0 ? "#FCA5A5" : "#E2E8F0"}`, background: past && onDay.length > 0 ? "#FEF2F2" : "#fff" }}
                    >
                      <div style={{ fontSize: 9.5, fontWeight: 800, color: isToday ? "#2563EB" : "#64748B" }}>{isToday ? "HOJE" : WEEKDAYS[new Date(`${key}T12:00:00Z`).getUTCDay()]}</div>
                      <div style={{ fontSize: 14, fontWeight: 800 }}>{key.slice(8, 10)}</div>
                      <div style={{ fontSize: 10, color: "#475569" }}>{onDay.length > 0 ? `${onDay.length} chq` : "—"}</div>
                    </div>
                  );
                })}
              </div>
              <p style={{ margin: "10px 0 0", fontSize: 11.5, color: "#64748B" }}>
                Cada dia mostra os cheques registrados com bom para naquela data.
                {loadedAll ? "" : " A agenda conta os 100 primeiros pendentes de cada situação."}
              </p>
              {model.summary ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 12 }}>
                  <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 10, padding: 10, fontSize: 11 }}>
                    <b style={{ color: "#047857" }}>A RECEBER PENDENTES</b>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#047857" }}>{formatMoney(model.summary.pendingReceivedAmount)}</div>
                    {`${model.summary.pendingReceivedCount} cheques · entram ao compensar`}
                  </div>
                  <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: 10, fontSize: 11 }}>
                    <b style={{ color: "#B45309" }}>A PAGAR PENDENTES</b>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#B45309" }}>{formatMoney(model.summary.pendingIssuedAmount)}</div>
                    {`${model.summary.pendingIssuedCount} cheques · saem ao compensar`}
                  </div>
                  <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: 10, fontSize: 11 }}>
                    <b style={{ color: "#1D4ED8" }}>VINCULADOS A TÍTULO</b>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#1D4ED8" }}>{`${model.summary.linkedPendingCount} cheques`}</div>
                    baixam título ao compensar
                  </div>
                </div>
              ) : null}
            </article>
            <article style={card}>
              <b style={{ fontSize: 14 }}>Mesa de hoje</b>
              <small style={{ color: "#94A3B8", marginLeft: 8 }}>clique para abrir o cheque</small>
              {mesa.map((section) => (
                <div key={section.label} style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".05em", color: "#64748B", textTransform: "uppercase", marginBottom: 6 }}>{section.label}</div>
                  {section.rows.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 12, color: "#94A3B8" }}>Nenhum cheque.</p>
                  ) : (
                    <div style={{ display: "grid", gap: 6 }}>
                      {section.rows.slice(0, 6).map((cheque) => (
                        <MesaItem key={cheque.id} model={model} cheque={cheque} open={mesaKey === cheque.id} onToggle={() => toggleMesa(cheque)} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </article>
          </div>
          {panelNode(
            <ListStates model={model} emptyText={filterLabel(model.filter) ? "Nenhum cheque com este filtro." : "Nenhum cheque registrado ainda."}>
              {groups
                .filter((group) => group.rows.length > 0)
                .map((group) => (
                  <div key={group.key}>
                    <GroupHead label={group.label} count={group.rows.length} tone={group.tone} />
                    <ChequesTable rows={group.rows} accounts={model.accounts} openKey={openKey} onToggle={toggle} withDirection renderDetail={(cheque) => <ChequeDetail model={model} cheque={cheque} />} />
                  </div>
                ))}
              {model.list.total !== null && model.list.total > model.list.items.length ? <ServerPager model={model} shown={model.list.items.length} /> : null}
            </ListStates>,
          )}
        </>
      )}
    </div>
  );
}
