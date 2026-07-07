import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "../ui";

// Controles de paginação client-side: tamanho de página + "X–Y de N" + anterior/próxima.
export function DenseListPagination({
  page,
  pageSize,
  pageSizeOptions,
  total,
  totalPages,
  pageStart,
  pageEnd,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  pageSizeOptions: readonly number[];
  total: number;
  totalPages: number;
  pageStart: number;
  pageEnd: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  if (total === 0) return null;

  return (
    <nav className="dense-pagination" aria-label="Paginação da lista">
      <label className="dense-pagination__size">
        <span>Itens por página</span>
        <span className="ui-select">
          <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))} aria-label="Itens por página">
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <ChevronDown size={16} aria-hidden />
        </span>
      </label>

      <div className="dense-pagination__nav">
        <span className="dense-pagination__range" aria-live="polite">
          {pageStart}–{pageEnd} de {total}
        </span>
        <Button type="button" size="sm" variant="secondary" disabled={page <= 1} aria-label="Página anterior" onClick={() => onPageChange(page - 1)}>
          <ChevronLeft size={16} aria-hidden /> Anterior
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={page >= totalPages}
          aria-label="Próxima página"
          onClick={() => onPageChange(page + 1)}
        >
          Próxima <ChevronRight size={16} aria-hidden />
        </Button>
      </div>
    </nav>
  );
}
