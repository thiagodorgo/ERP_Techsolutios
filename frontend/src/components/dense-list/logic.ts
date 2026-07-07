import type { DenseColumn, DenseListConfig, DenseListSort, DenseListState, DenseListStatusFilter } from "./types";

// Janela de busca no backend: usa o parâmetro `limit` EXISTENTE (máx. 100 no servidor).
// Ordenação/paginação são client-side sobre essa janela carregada.
export const DENSE_LIST_FETCH_LIMIT = 100;

export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

// Nomes curtos dos parâmetros de URL (preservam busca/filtro/ordenação/página ao voltar).
export const DENSE_LIST_PARAM = {
  search: "q",
  status: "status",
  sort: "sort",
  dir: "dir",
  page: "page",
  size: "size",
} as const;

function isStatus(value: string | null): value is DenseListStatusFilter {
  return value === "active" || value === "inactive" || value === "all";
}

function isEmpty(value: string | number | null | undefined): boolean {
  return value === null || value === undefined || value === "";
}

// Ordena preservando estabilidade; valores vazios sempre ao fim (independente da direção).
export function sortItems<T>(items: readonly T[], columns: readonly DenseColumn<T>[], sort: DenseListSort | null): T[] {
  const copy = [...items];
  if (!sort) return copy;

  const column = columns.find((col) => col.key === sort.key && col.sortable);
  if (!column || !column.sortValue) return copy;

  const accessor = column.sortValue;
  const direction = sort.dir === "desc" ? -1 : 1;

  return copy.sort((a, b) => compareValues(accessor(a), accessor(b), direction));
}

function compareValues(a: string | number | null | undefined, b: string | number | null | undefined, direction: number): number {
  const aEmpty = isEmpty(a);
  const bEmpty = isEmpty(b);
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;

  const base =
    typeof a === "number" && typeof b === "number"
      ? a - b
      : String(a).localeCompare(String(b), "pt-BR", { sensitivity: "base", numeric: true });

  return direction * base;
}

export type PageResult<T> = {
  readonly slice: T[];
  readonly page: number; // página efetiva (clamped)
  readonly totalPages: number;
  readonly total: number;
  readonly pageStart: number; // 1-based (0 quando vazio)
  readonly pageEnd: number; // 1-based (0 quando vazio)
};

export function paginate<T>(items: readonly T[], page: number, pageSize: number): PageResult<T> {
  const total = items.length;
  const size = pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(Math.max(1, Math.trunc(page) || 1), totalPages);
  const start = (safePage - 1) * size;

  return {
    slice: items.slice(start, start + size),
    page: safePage,
    totalPages,
    total,
    pageStart: total === 0 ? 0 : start + 1,
    pageEnd: Math.min(start + size, total),
  };
}

function parseSort(params: URLSearchParams, config: DenseListConfig): DenseListSort | null {
  const key = params.get(DENSE_LIST_PARAM.sort);
  if (!key || !config.sortableKeys.includes(key)) return config.defaultSort;
  const dir = params.get(DENSE_LIST_PARAM.dir) === "desc" ? "desc" : "asc";
  return { key, dir };
}

export function parseDenseListSearchParams(params: URLSearchParams, config: DenseListConfig): DenseListState {
  const search = params.get(DENSE_LIST_PARAM.search) ?? "";

  const statusRaw = params.get(DENSE_LIST_PARAM.status);
  const status: DenseListStatusFilter = isStatus(statusRaw) ? statusRaw : "all";

  const sort = parseSort(params, config);

  const pageRaw = Number(params.get(DENSE_LIST_PARAM.page));
  const page = Number.isInteger(pageRaw) && pageRaw >= 1 ? pageRaw : 1;

  const sizeRaw = Number(params.get(DENSE_LIST_PARAM.size));
  const pageSize = config.pageSizeOptions.includes(sizeRaw) ? sizeRaw : config.defaultPageSize;

  return { search, status, sort, page, pageSize };
}

function isDefaultSort(sort: DenseListSort, def: DenseListSort | null): boolean {
  return def != null && sort.key === def.key && sort.dir === def.dir;
}

// Só grava parâmetros não-default → URLs limpas na carga inicial, com round-trip preservado.
export function buildDenseListSearchParams(state: DenseListState, config: DenseListConfig): URLSearchParams {
  const params = new URLSearchParams();

  if (state.search.trim()) params.set(DENSE_LIST_PARAM.search, state.search);
  if (state.status !== "all") params.set(DENSE_LIST_PARAM.status, state.status);

  if (state.sort && !isDefaultSort(state.sort, config.defaultSort)) {
    params.set(DENSE_LIST_PARAM.sort, state.sort.key);
    params.set(DENSE_LIST_PARAM.dir, state.sort.dir);
  }

  if (state.page > 1) params.set(DENSE_LIST_PARAM.page, String(state.page));
  if (state.pageSize !== config.defaultPageSize) params.set(DENSE_LIST_PARAM.size, String(state.pageSize));

  return params;
}
