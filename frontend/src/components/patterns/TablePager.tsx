import { ChevronLeft, ChevronRight } from "lucide-react";

// PR-A TELAS PADRONIZADAS — paginação padronizada das listas
// (fonte: "ERP Web - Telas Padronizadas.dc.html", rodapé das tabelas de OS/Usuários).
// "Itens por página [select]" à esquerda; "1–8 de 18" + Anterior/Próxima à direita.
// O rangeLabel vem pronto do chamador (contagem REAL da lista — nunca fabricado aqui).

export type TablePagerProps = {
  pageSize: number;
  onPageSize: (size: number) => void;
  pageSizeOptions?: readonly number[];
  /** Ex.: "1–8 de 18" (contagem real da fonte de dados). */
  rangeLabel: string;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
};

export function TablePager({ pageSize, onPageSize, pageSizeOptions = [20, 50], rangeLabel, onPrev, onNext, canPrev, canNext }: TablePagerProps) {
  return (
    <div className="pat-pager">
      <label className="pat-pager__size">
        Itens por página
        <select value={pageSize} onChange={(event) => onPageSize(Number(event.target.value))}>
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>
      <div className="pat-pager__nav">
        <span className="pat-pager__range">{rangeLabel}</span>
        <button type="button" className="pat-pager__btn" onClick={onPrev} disabled={!canPrev}>
          <ChevronLeft size={12} aria-hidden="true" />
          Anterior
        </button>
        <button type="button" className="pat-pager__btn" onClick={onNext} disabled={!canNext}>
          Próxima
          <ChevronRight size={12} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
