import type { ReactNode } from "react";

// Tipos compartilhados das listas densas de Cadastros (C1).
// Mantidos separados da lógica/hook para permitir teste puro (sem React/DOM).

export type SortDir = "asc" | "desc";

export type DenseListSort = {
  readonly key: string;
  readonly dir: SortDir;
};

// Reaproveita o vocabulário de situação já usado pelos filtros de cada módulo.
export type DenseListStatusFilter = "all" | "active" | "inactive";

export type DenseColumnAlign = "left" | "right";

export type DenseColumn<T> = {
  readonly key: string;
  readonly header: string;
  readonly render: (row: T) => ReactNode;
  // Colunas sem `sortable` renderizam cabeçalho estático (ex.: Ações).
  readonly sortable?: boolean;
  // `right` alinha valores numéricos/moeda; padrão é `left`.
  readonly align?: DenseColumnAlign;
  // `tabular` aplica font-variant-numeric: tabular-nums (colunas de valor/data).
  readonly tabular?: boolean;
  // Valor usado para ordenar (número → numérico; string → localeCompare pt-BR).
  readonly sortValue?: (row: T) => string | number | null | undefined;
};

export type DenseListState = {
  readonly search: string;
  readonly status: DenseListStatusFilter;
  readonly sort: DenseListSort | null;
  readonly page: number; // 1-based
  readonly pageSize: number;
};

export type DenseListConfig = {
  readonly sortableKeys: readonly string[];
  readonly defaultSort: DenseListSort | null;
  readonly defaultPageSize: number;
  readonly pageSizeOptions: readonly number[];
};
