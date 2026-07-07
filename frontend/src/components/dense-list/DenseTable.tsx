import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { ReactNode } from "react";

import type { DenseColumn, DenseListSort, SortDir } from "./types";

// Tabela densa e ordenável — reaproveita as classes .ui-table do design system,
// acrescentando cabeçalhos clicáveis com aria-sort e colunas de valor tabulares.
export function DenseTable<T>({
  columns,
  rows,
  keyForRow,
  sort,
  onSort,
  onRowClick,
}: {
  columns: readonly DenseColumn<T>[];
  rows: readonly T[];
  keyForRow: (row: T) => string;
  sort: DenseListSort | null;
  onSort: (key: string) => void;
  onRowClick?: (row: T) => void;
}) {
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
