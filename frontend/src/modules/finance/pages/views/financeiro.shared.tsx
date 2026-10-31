import { Search } from "lucide-react";
import { useState, type ReactNode } from "react";

import { TablePager } from "../../../../components/patterns";
import { EntryDetail } from "../../entries/components/EntryDetail";
import type { FinancialEntry } from "../../entries/financial-entries.types";
import type { FinanceiroViewModel } from "./FinanceiroViewA";

// B-SAN3-12c — peças das aparências B e C (`financeiro-baixa-conta-conciliacao-3opcoes.reference.html`): a barra de
// ferramentas do painel, os blocos que filtram, o cartão analítico e a paginação das linhas já carregadas. Só composição:
// nenhuma consulta, nenhuma regra e nenhuma soma de dinheiro nascem aqui.

export type FinanceToolbarTab = {
  readonly id: string;
  readonly label: string;
  readonly count?: number | null;
  readonly active: boolean;
  readonly onClick: () => void;
};

export function FinanceToolbar({
  label,
  tabs,
  search,
  onSearch,
  searchLabel,
  count,
}: {
  readonly label: string;
  readonly tabs: readonly FinanceToolbarTab[];
  readonly search: string;
  readonly onSearch: (value: string) => void;
  readonly searchLabel: string;
  readonly count: string;
}) {
  return (
    <div className="financeiro-bc__toolbar">
      <div className="pat-os-tabs" role="tablist" aria-label={label}>
        {tabs.map((tab) => (
          <button key={tab.id} type="button" role="tab" aria-selected={tab.active} className={tab.active ? "pat-os-tab pat-os-tab--active" : "pat-os-tab"} onClick={tab.onClick}>
            {tab.label}
            {tab.count !== undefined && tab.count !== null ? <span className="financeiro-bc__tab-count">{tab.count}</span> : null}
          </button>
        ))}
      </div>
      <label className="pat-os-search">
        <Search size={14} aria-hidden="true" />
        <span className="sr-only">{searchLabel}</span>
        <input type="search" value={search} placeholder="Buscar documento, cliente ou descrição" onChange={(event) => onSearch(event.currentTarget.value)} />
      </label>
      <span className="pat-os-count">{count}</span>
    </div>
  );
}

export function AnalyticCard({ title, hint, className, children }: { readonly title: string; readonly hint?: string; readonly className?: string; readonly children: ReactNode }) {
  return (
    <article className={className ? `pat-an-card ${className}` : "pat-an-card"}>
      <div className="pat-an-card__title">
        <span>{title}</span>
        {hint ? <small>{hint}</small> : null}
      </div>
      {children}
    </article>
  );
}

export function FilterBlock({ label, count, unavailableLabel = "contagem indisponível", pressed, onClick }: { readonly label: string; readonly count: number | null; readonly unavailableLabel?: string; readonly pressed: boolean; readonly onClick: () => void }) {
  return (
    <button type="button" className="financeiro-bc__block" aria-pressed={pressed} aria-label={`${label}: ${count ?? unavailableLabel} — filtrar a lista`} onClick={onClick}>
      {label}
      {count !== null ? <b>{count}</b> : null}
    </button>
  );
}

/** Paginação das linhas JÁ carregadas (TablePager da biblioteca, como na tela-modelo); trocar de página fecha o detalhe. */
export function PagedRows<T>({
  rows,
  resetKey,
  onPageChange,
  rangeLabel,
  children,
}: {
  readonly rows: readonly T[];
  /** Mudou o recorte (filtro, busca, aba, conta): a lista volta à primeira página. */
  readonly resetKey: string;
  readonly onPageChange: () => void;
  readonly rangeLabel: (start: number, end: number, total: number) => string;
  readonly children: (pageRows: readonly T[]) => ReactNode;
}) {
  const [position, setPosition] = useState({ resetKey, page: 0 });
  const [pageSize, setPageSize] = useState(20);
  const requested = position.resetKey === resetKey ? position.page : 0;
  const maxPage = Math.max(0, Math.ceil(rows.length / pageSize) - 1);
  const page = Math.min(requested, maxPage);
  const start = page * pageSize;
  const end = Math.min(start + pageSize, rows.length);
  const go = (next: number) => {
    onPageChange();
    setPosition({ resetKey, page: next });
  };
  return (
    <>
      {children(rows.slice(start, end))}
      <TablePager
        pageSize={pageSize}
        onPageSize={(size) => {
          onPageChange();
          setPageSize(size);
          setPosition({ resetKey, page: 0 });
        }}
        rangeLabel={rangeLabel(start + 1, end, rows.length)}
        onPrev={() => go(Math.max(0, page - 1))}
        onNext={() => go(Math.min(maxPage, page + 1))}
        canPrev={page > 0}
        canNext={end < rows.length}
      />
    </>
  );
}

/** Detalhe do lançamento com o formulário de conciliação DENTRO do detalhe (B e C), reutilizando os componentes da A. */
export function EntryPanel({
  model,
  entry,
  accountName,
  onReconcile,
  children,
}: {
  readonly model: FinanceiroViewModel;
  readonly entry: FinancialEntry;
  readonly accountName: string | null;
  readonly onReconcile: () => void;
  readonly children?: ReactNode;
}) {
  const panel = model.reconcilePanel?.entryId === entry.id ? model.reconcilePanel.node : null;
  return (
    <div className={panel ? "financeiro-bc__entry financeiro-bc__entry--form" : "financeiro-bc__entry"}>
      <EntryDetail
        entry={entry}
        accountName={accountName}
        canReconcile={model.access.reconcile}
        canUnreconcile={model.policy.canUnreconcile}
        busy={model.entryBusyId === entry.id}
        message={model.entryMessage?.entryId === entry.id ? model.entryMessage.text : null}
        onReconcile={onReconcile}
        onUnreconcile={() => model.onUnreconcile(entry)}
      />
      {panel ? <div className="financeiro-bc__inline-form">{panel}</div> : null}
      {children}
    </div>
  );
}
