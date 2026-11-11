import { ArrowDownRight, ArrowUpRight, Landmark, Link2, Plus, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { KpiStatCard, PageHeader } from "../../../../components/patterns";
import { StaleDataBanner } from "../../../work-orders/components/StaleDataBanner";
import { StatePanel, StatePanelAction } from "../../../work-orders/components/StatePanel";
import { CHEQUE_STATUS_LABELS } from "../cheque-actions";
import { formatMoney } from "../cheque-cash-impact";
import { CHEQUE_STATUSES, type Cheque, type ChequeDirection, type ChequeStatus } from "../cheques.types";
import { EMPTY_FILTER, type ChequeListFilter } from "../useCheques";
import { ChequeDetail, ChequesTable, filterLabel, ListStates, PendingCaption, ServerPager, type ChequesViewModel } from "./cheques.shared";

// B-SAN3-24 (24a) — APARÊNCIA A "Abas do Financeiro" (referência aprovada `screen-refs/cheques-3opcoes.reference.html`,
// opção A; tela-modelo `FinanceiroViewA`, padrão D-PADRAO-BLOCOS-CLICAVEIS). VIEW PURA: dados e ações chegam do
// `ChequesPage`. Cabeçalho · indicadores do servidor que filtram (a receber e a pagar pendentes, vinculados, devolvidos)
// · abas de direção, conta e blocos por situação (contagem do servidor) · lista de uma linha que abre o detalhe embaixo.
// Os indicadores marcados "falta no backend" na referência ("para depositar até hoje", a série de devolvidos) não
// existem no servidor e não entram (nenhum número inventado).

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function ChequesHeader({ model }: { readonly model: ChequesViewModel }) {
  return (
    <PageHeader
      kicker="FINANCEIRO"
      title="Cheques"
      subtitle="Registre, deposite, compense e devolva os cheques recebidos e emitidos. O dinheiro só se move na compensação."
      actions={
        <>
          {model.canRegister ? (
            <button type="button" className="pat-btn pat-btn--primary" onClick={model.onRegister}>
              <Plus size={15} aria-hidden="true" />
              Registrar cheque
            </button>
          ) : null}
          <Link className="pat-btn" to="/finance">
            <Landmark size={15} aria-hidden="true" />
            Ir ao Financeiro
          </Link>
        </>
      }
    />
  );
}

/** Erro sem dado anterior, acesso não permitido, mensagem da última ação e dado desatualizado (estados §7). */
export function ChequesStates({ model }: { readonly model: ChequesViewModel }) {
  const { list } = model;
  return (
    <>
      {model.message ? (
        <div role={model.message.tone === "error" ? "alert" : "status"} className={model.message.tone === "error" ? "pat-banner pat-banner--error" : "pat-banner pat-banner--info"} style={{ marginBottom: 12 }}>
          <span>{model.message.text}</span>
          <button type="button" className="pat-link" onClick={model.onDismissMessage}>
            Fechar
          </button>
        </div>
      ) : null}
      {list.stale ? <StaleDataBanner lastUpdatedAt={list.lastUpdatedAt} onRetry={model.onRetry} /> : null}
    </>
  );
}

export function ChequesBlocking({ model }: { readonly model: ChequesViewModel }) {
  if (model.list.forbidden) {
    return <StatePanel tone="forbidden" title="Acesso não permitido" detail="Seu perfil não pode consultar os cheques desta organização. Fale com o administrador da sua organização." />;
  }
  if (model.list.failed) {
    return (
      <StatePanel
        tone="error"
        title="Não foi possível carregar os cheques"
        detail="A consulta ao servidor falhou. Nada foi alterado. Tente de novo em instantes."
        actions={<StatePanelAction label="Tentar novamente" onClick={model.onRetry} />}
      />
    );
  }
  return null;
}

export function ChequesKpis({ model, columns = 4 }: { readonly model: ChequesViewModel; readonly columns?: 4 | 5 }) {
  const { summary, filter } = model;
  const pressed = (next: Partial<ChequeListFilter>) =>
    filter.status === (next.status ?? null) && filter.direction === (next.direction ?? null) && filter.linkedOnly === (next.linkedOnly ?? false);
  const go = (next: Partial<ChequeListFilter>) => model.onFilter({ ...EMPTY_FILTER, accountId: filter.accountId, ...next });
  if (model.summaryLoading) {
    return (
      <div className={`pat-kpi-row pat-kpi-row--${columns}`} aria-busy="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="pat-kpi" aria-hidden="true">
            <div className="pat-skel" style={{ width: 30, height: 30, borderRadius: 9 }} />
            <div className="pat-skel" style={{ width: "70%", height: 22, marginTop: 12 }} />
          </div>
        ))}
      </div>
    );
  }
  const bounced = model.counts.bounced;
  return (
    <div className={`pat-kpi-row pat-kpi-row--${columns}`}>
      <KpiStatCard
        icon={ArrowUpRight}
        iconColor="#15803D"
        iconBg="#DCFCE7"
        value={summary ? formatMoney(summary.pendingReceivedAmount) : "Indisponível"}
        label="A receber pendentes"
        hint={summary ? plural(summary.pendingReceivedCount, "cheque", "cheques") : "o servidor não respondeu"}
        tag={{ label: "entra ao compensar", bg: "#DCFCE7", fg: "#15803D" }}
        pressed={pressed({ status: "pending", direction: "received" })}
        onClick={() => go({ status: "pending", direction: "received" })}
        ariaLabel={`A receber pendentes: ${summary ? formatMoney(summary.pendingReceivedAmount) : "indisponível"} — filtrar a lista`}
      />
      <KpiStatCard
        icon={ArrowDownRight}
        iconColor="#B91C1C"
        iconBg="#FEF2F2"
        value={summary ? formatMoney(summary.pendingIssuedAmount) : "Indisponível"}
        label="A pagar pendentes"
        hint={summary ? plural(summary.pendingIssuedCount, "cheque emitido", "cheques emitidos") : "o servidor não respondeu"}
        tag={{ label: "sai ao compensar", bg: "#FEF2F2", fg: "#B91C1C" }}
        pressed={pressed({ status: "pending", direction: "issued" })}
        onClick={() => go({ status: "pending", direction: "issued" })}
        ariaLabel={`A pagar pendentes: ${summary ? formatMoney(summary.pendingIssuedAmount) : "indisponível"} — filtrar a lista`}
      />
      <KpiStatCard
        icon={Link2}
        iconColor="#1D4ED8"
        iconBg="#EFF6FF"
        value={summary ? formatMoney(summary.linkedPendingAmount) : "Indisponível"}
        label="Vinculados a título"
        hint={summary ? `${plural(summary.linkedPendingCount, "cheque baixa", "cheques baixam")} título ao compensar` : "o servidor não respondeu"}
        pressed={pressed({ status: "pending", linkedOnly: true })}
        onClick={() => go({ status: "pending", linkedOnly: true })}
        ariaLabel={`Vinculados a título: ${summary ? formatMoney(summary.linkedPendingAmount) : "indisponível"} — filtrar a lista`}
      />
      <KpiStatCard
        icon={RotateCcw}
        iconColor="#DC2626"
        iconBg="#FEF2F2"
        value={bounced ?? "Indisponível"}
        label="Devolvidos"
        hint={bounced === null ? "o servidor não respondeu" : "todos os devolvidos"}
        pressed={pressed({ status: "bounced" })}
        onClick={() => go({ status: "bounced" })}
        ariaLabel={`Devolvidos: ${bounced ?? "indisponível"} — filtrar a lista`}
      />
    </div>
  );
}

export function AccountSelect({ model }: { readonly model: ChequesViewModel }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center" }}>
      <span className="sr-only">Conta</span>
      <select className="pat-select" value={model.filter.accountId ?? ""} onChange={(event) => model.onFilter({ ...model.filter, accountId: event.currentTarget.value || null })}>
        <option value="">Todas as contas</option>
        {model.accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.active ? account.name : `${account.name} (desativada)`}
          </option>
        ))}
      </select>
    </label>
  );
}

export function StatusBlocks({ model }: { readonly model: ChequesViewModel }) {
  const { filter } = model;
  const setStatus = (status: ChequeStatus | null) => model.onFilter({ ...filter, status, linkedOnly: false });
  return (
    <div className="pat-os-tabs" role="group" aria-label="Situação do cheque" style={{ padding: "10px 18px 0", flexWrap: "wrap" }}>
      {CHEQUE_STATUSES.map((status) => {
        const count = model.counts[status];
        const pressed = filter.status === status;
        return (
          <button
            key={status}
            type="button"
            className={pressed ? "pat-os-tab pat-os-tab--active" : "pat-os-tab"}
            aria-pressed={pressed}
            aria-label={`${CHEQUE_STATUS_LABELS[status]}: ${count ?? "contagem indisponível"} — filtrar a lista`}
            onClick={() => setStatus(pressed ? null : status)}
          >
            {`${CHEQUE_STATUS_LABELS[status]}s`}
            {count !== null ? <b style={{ marginLeft: 6 }}>{count}</b> : null}
          </button>
        );
      })}
    </div>
  );
}

export function FilterChipBar({ model }: { readonly model: ChequesViewModel }) {
  const label = filterLabel(model.filter);
  if (!label) return null;
  return (
    <div className="pat-filtro-chip-bar" style={{ padding: "10px 18px 0" }}>
      <span className="pat-filtro-chip">
        {`Filtro: ${label}`}
        <button type="button" onClick={() => model.onFilter({ ...EMPTY_FILTER, accountId: model.filter.accountId })} aria-label="Limpar o filtro da lista">
          ✕
        </button>
      </span>
    </div>
  );
}

const DIRECTION_TABS: readonly { readonly id: ChequeDirection | null; readonly label: string }[] = [
  { id: "received", label: "A receber" },
  { id: "issued", label: "A pagar" },
  { id: null, label: "Todos" },
];

export function ChequeListPanel({ model, title, withDirection }: { readonly model: ChequesViewModel; readonly title?: string; readonly withDirection: boolean }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const toggle = (cheque: Cheque) => {
    setOpenKey((current) => (current === cheque.id ? null : cheque.id));
    if (openKey !== cheque.id) model.onOpen(cheque);
  };
  const shown = model.list.items.length;
  const countText = model.list.total !== null ? plural(model.list.total, "cheque", "cheques") : plural(shown, "cheque", "cheques");
  return (
    <section className="pat-panel" aria-label={title ?? "Lista de cheques"} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px 0", flexWrap: "wrap" }}>
        {title ? <b style={{ fontSize: 14 }}>{title}</b> : null}
        {!title ? (
          <div className="pat-os-tabs" role="tablist" aria-label="Direção">
            {DIRECTION_TABS.map((tab) => {
              const active = model.filter.direction === tab.id;
              return (
                <button
                  key={tab.label}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={active ? "pat-os-tab pat-os-tab--active" : "pat-os-tab"}
                  onClick={() => model.onFilter({ ...model.filter, direction: tab.id })}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        ) : null}
        <AccountSelect model={model} />
        <span className="pat-os-count" style={{ marginLeft: "auto" }}>
          {countText}
        </span>
      </div>
      {!title ? <StatusBlocks model={model} /> : null}
      <FilterChipBar model={model} />
      <PendingCaption list={model.list} filter={model.filter} />
      <div style={{ marginTop: 10 }}>
        <ListStates model={model} emptyText={filterLabel(model.filter) ? "Nenhum cheque com este filtro." : "Nenhum cheque registrado ainda."}>
          <ChequesTable rows={model.list.items} accounts={model.accounts} openKey={openKey} onToggle={toggle} withDirection={withDirection} renderDetail={(cheque) => <ChequeDetail model={model} cheque={cheque} />} />
        </ListStates>
      </div>
      {model.filter.status !== "pending" && !model.list.loading && shown > 0 ? <ServerPager model={model} shown={shown} /> : null}
    </section>
  );
}

export function ChequesViewA(model: ChequesViewModel) {
  const blocking = model.list.forbidden || (model.list.failed && !model.list.stale);
  return (
    <div data-aparencia="A" style={{ color: "#0F172A" }}>
      <ChequesHeader model={model} />
      <ChequesStates model={model} />
      {blocking ? (
        <ChequesBlocking model={model} />
      ) : (
        <>
          <ChequesKpis model={model} />
          <ChequeListPanel model={model} withDirection={false} />
        </>
      )}
    </div>
  );
}
