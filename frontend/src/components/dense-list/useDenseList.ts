import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  buildDenseListSearchParams,
  paginate,
  parseDenseListSearchParams,
  sortItems,
} from "./logic";
import type { DenseColumn, DenseListConfig, DenseListSort, DenseListState, DenseListStatusFilter } from "./types";

// Assinatura compatível com os `filter<Entity>` já existentes em cada módulo de Cadastro.
type DenseListFilter<T> = (items: readonly T[], filters: { search: string; isActive: DenseListStatusFilter }) => T[];

export type UseDenseListOptions<T> = {
  readonly items: readonly T[];
  readonly columns: readonly DenseColumn<T>[];
  readonly filter: DenseListFilter<T>;
  readonly defaultSort?: DenseListSort | null;
  readonly defaultPageSize?: number;
  readonly pageSizeOptions?: readonly number[];
};

// Estado da lista denso: busca/situação/ordenação/página lidos e escritos na URL
// (useSearchParams) para sobreviver à navegação de volta. Ordenação e paginação
// são client-side sobre a janela carregada (ver DENSE_LIST_FETCH_LIMIT).
export function useDenseList<T>(options: UseDenseListOptions<T>) {
  const { items, columns, filter } = options;
  const [searchParams, setSearchParams] = useSearchParams();

  const sortableKeys = useMemo(() => columns.filter((col) => col.sortable).map((col) => col.key).join("|"), [columns]);

  const config = useMemo<DenseListConfig>(
    () => ({
      sortableKeys: sortableKeys ? sortableKeys.split("|") : [],
      defaultSort: options.defaultSort ?? null,
      defaultPageSize: options.defaultPageSize ?? DEFAULT_PAGE_SIZE,
      pageSizeOptions: options.pageSizeOptions ? [...options.pageSizeOptions] : [...PAGE_SIZE_OPTIONS],
    }),
    [sortableKeys, options.defaultSort, options.defaultPageSize, options.pageSizeOptions],
  );

  const state = useMemo(() => parseDenseListSearchParams(searchParams, config), [searchParams, config]);

  const update = useCallback(
    (patch: Partial<DenseListState>) => {
      const next = { ...state, ...patch };
      // replace: mantém os parâmetros na URL sem poluir o histórico a cada tecla.
      setSearchParams(buildDenseListSearchParams(next, config), { replace: true });
    },
    [state, config, setSearchParams],
  );

  const setSearch = useCallback((value: string) => update({ search: value, page: 1 }), [update]);
  const setStatus = useCallback((value: DenseListStatusFilter) => update({ status: value, page: 1 }), [update]);
  const setPage = useCallback((page: number) => update({ page }), [update]);
  const setPageSize = useCallback((pageSize: number) => update({ pageSize, page: 1 }), [update]);
  const toggleSort = useCallback(
    (key: string) => {
      const dir = state.sort && state.sort.key === key && state.sort.dir === "asc" ? "desc" : "asc";
      update({ sort: { key, dir }, page: 1 });
    },
    [state.sort, update],
  );

  const filtered = useMemo(
    () => filter(items, { search: state.search, isActive: state.status }),
    [filter, items, state.search, state.status],
  );
  const sorted = useMemo(() => sortItems(filtered, columns, state.sort), [filtered, columns, state.sort]);
  const pageResult = useMemo(() => paginate(sorted, state.page, state.pageSize), [sorted, state.page, state.pageSize]);

  const hasActiveFilters = state.search.trim().length > 0 || state.status !== "all";

  return {
    search: state.search,
    status: state.status,
    sort: state.sort,
    page: pageResult.page,
    pageSize: state.pageSize,
    pageSizeOptions: config.pageSizeOptions,
    visibleItems: pageResult.slice,
    total: pageResult.total,
    totalPages: pageResult.totalPages,
    pageStart: pageResult.pageStart,
    pageEnd: pageResult.pageEnd,
    hasActiveFilters,
    setSearch,
    setStatus,
    setPage,
    setPageSize,
    toggleSort,
  };
}
