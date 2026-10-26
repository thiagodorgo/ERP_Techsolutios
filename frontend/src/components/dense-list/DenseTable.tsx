import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { ReactNode } from "react";

import { DenseExpandableRow } from "./DenseExpandableRow";
import type { DenseColumn, DenseListSort, SortDir } from "./types";

// Tabela densa e ordenável — reaproveita as classes .ui-table do design system,
// acrescentando cabeçalhos clicáveis com aria-sort e colunas de valor tabulares.
//
// B-SAN3-12b (§6.2) — com `renderDetail`, a tabela vira a lista do padrão D-PADRAO-BLOCOS-CLICAVEIS (`.pat-ab-table`):
// cada linha é um `DenseExpandableRow` (uma altura, sem botão, clique/Enter/Espaço alternam, Escape fecha) e o detalhe
// da linha `expandedKey` abre logo abaixo dela — um por vez, porque a chave é uma só. `onRowClick` recebe a linha
// clicada (quem controla decide abrir ou fechar). `cellTitle` dá o texto inteiro para o hover da célula que corta.
// Sem `renderDetail`, nada muda para as telas que já a usam.
export function DenseTable<T>({
  columns,
  rows,
  keyForRow,
  sort,
  onSort,
  onRowClick,
  expandedKey = null,
  renderDetail,
  cellTitle,
}: {
  columns: readonly DenseColumn<T>[];
  rows: readonly T[];
  keyForRow: (row: T) => string;
  sort: DenseListSort | null;
  onSort: (key: string) => void;
  onRowClick?: (row: T) => void;
  expandedKey?: string | null;
  renderDetail?: (row: T) => ReactNode;
  cellTitle?: (row: T, columnKey: string) => string | undefined;
}) {
  if (renderDetail) {
    return (
      <table className="pat-ab-table">
        <colgroup>
          {columns.map((column) => (
            <col key={column.key} style={column.width ? { width: column.width } : undefined} />
          ))}
          <col style={{ width: 40 }} />
        </colgroup>
        <thead>
          <tr>
            {columns.map((column) => (
              <DenseHeaderCell key={column.key} column={column} sort={sort} onSort={onSort} />
            ))}
            <th scope="col" aria-label="Abrir detalhe" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = keyForRow(row);
            return (
              <DenseExpandableRow
                key={key}
                rowKey={key}
                expanded={expandedKey === key}
                colSpan={columns.length + 1}
                onToggle={() => onRowClick?.(row)}
                cells={columns.map((column) => ({ key: column.key, content: column.render(row), className: cellClassName(column), title: cellTitle?.(row, column.key) }))}
                detail={expandedKey === key ? renderDetail(row) : null}
              />
            );
          })}
        </tbody>
      </table>
    );
  }

  return (
    <div className="ui-table-wrap">
      <table className="ui-table dense-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <DenseHeaderCell key={column.key} column={column} sort={sort} onSort={onSort} />
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={keyForRow(row)} onClick={onRowClick ? () => onRowClick(row) : undefined}>
              {columns.map((column) => (
                <td key={column.key} className={cellClassName(column)}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DenseHeaderCell<T>({
  column,
  sort,
  onSort,
}: {
  column: DenseColumn<T>;
  sort: DenseListSort | null;
  onSort: (key: string) => void;
}) {
  const active = Boolean(sort && sort.key === column.key);
  const ariaSort = !column.sortable ? undefined : active ? (sort?.dir === "desc" ? "descending" : "ascending") : "none";

  const content: ReactNode = column.sortable ? (
    <button type="button" className="dense-sort-btn" onClick={() => onSort(column.key)} aria-label={`Ordenar por ${column.header}`}>
      <span>{column.header}</span>
      {renderSortIcon(active, sort?.dir)}
    </button>
  ) : (
    column.header
  );

  return (
    <th scope="col" aria-sort={ariaSort} className={cellClassName(column)}>
      {content}
    </th>
  );
}

function renderSortIcon(active: boolean, dir: SortDir | undefined) {
  if (!active) return <ArrowUpDown size={13} aria-hidden className="dense-sort-icon dense-sort-icon--idle" />;
  return dir === "desc" ? (
    <ArrowDown size={13} aria-hidden className="dense-sort-icon" />
  ) : (
    <ArrowUp size={13} aria-hidden className="dense-sort-icon" />
  );
}

function cellClassName<T>(column: DenseColumn<T>): string | undefined {
  const classes: string[] = [];
  if (column.align === "right") classes.push("dense-col-right");
  if (column.tabular) classes.push("dense-col-tabular");
  return classes.length ? classes.join(" ") : undefined;
}
