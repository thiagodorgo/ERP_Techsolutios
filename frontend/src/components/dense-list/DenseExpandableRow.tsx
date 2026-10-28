import { ChevronDown } from "lucide-react";
import type { KeyboardEvent, ReactNode } from "react";

// B-SAN3-12b (§6.2 do plano) — linha que abre o detalhe logo abaixo, no padrão D-PADRAO-BLOCOS-CLICAVEIS
// (`screen-refs/financeiro-ab.reference.html`): a linha tem UMA altura (classes `.pat-ab-row`, 40 px, texto longo corta
// com reticências e leva o texto inteiro no `title`), não tem botão; clique, Enter ou Espaço alternam; Escape fecha a
// linha aberta. O detalhe (propriedades + ações) vai na `.pat-ab-detail-row`. "Um aberto por vez" é de quem controla
// `expanded` (o `DenseTable` com `expandedKey`). Classes já existentes em app.css — nenhuma regra nova.

export type DenseCell = {
  readonly key: string;
  readonly content: ReactNode;
  readonly className?: string;
  /** Texto inteiro para o hover quando a célula corta com reticências. */
  readonly title?: string;
};

export function DenseExpandableRow({
  rowKey,
  expanded,
  colSpan,
  onToggle,
  cells,
  detail,
}: {
  readonly rowKey: string;
  readonly expanded: boolean;
  /** Colunas da tabela, contando a do chevron. */
  readonly colSpan: number;
  readonly onToggle: () => void;
  readonly cells: readonly DenseCell[];
  readonly detail: ReactNode;
}) {
  const onKeyDown = (event: Pick<KeyboardEvent<HTMLTableRowElement>, "key" | "preventDefault">) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggle();
    } else if (event.key === "Escape" && expanded) {
      event.preventDefault();
      onToggle();
    }
  };

  return (
    <>
      <tr className="pat-ab-row" tabIndex={0} aria-expanded={expanded} data-row-key={rowKey} onClick={() => onToggle()} onKeyDown={onKeyDown}>
        {cells.map((cell) => (
          <td key={cell.key} className={cell.className} title={cell.title}>
            {cell.content}
          </td>
        ))}
        <td style={{ textAlign: "right" }}>
          <span className="pat-chevron-icon" aria-hidden="true">
            <ChevronDown size={15} />
          </span>
        </td>
      </tr>
      {expanded ? (
        <tr className="pat-ab-detail-row">
          <td colSpan={colSpan} className="pat-ab-detail-cell">
            {detail}
          </td>
        </tr>
      ) : null}
    </>
  );
}
