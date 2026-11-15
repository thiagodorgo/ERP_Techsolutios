// B-ASS-10b (T5) — barras horizontais de PROPORÇÃO, para a tela de custo e margem da plataforma ("Para onde vai o
// custo", "Maior custo por organização" e a mini-barra da coluna "%"). A tela passa só GEOMETRIA (`value`, o número de
// desenho) e o texto já formatado (`displayValue`, o literal do servidor); a proporção nasce aqui dentro (L8 do plano),
// nunca na tela. Com `onSelect`, cada linha é um botão que filtra a lista (D-PADRAO-BLOCOS-CLICAVEIS), com `aria-pressed`.
// J-567 (CV-14): `kind: "list"` desenha as mesmas barras SEM interação (a composição por serviço do detalhe, `.serv` da
// referência): linhas de texto, com o `title` levando o nome técnico quando a tela o passa (`title` do item).

export type ProportionBarItem = {
  readonly key: string;
  readonly label: string;
  /** Geometria; `null` = sem valor (barra vazia, nunca zero inventado). O tamanho usa o valor absoluto. */
  readonly value: number | null;
  /** O valor exibido, já formatado pela tela (o literal do servidor). */
  readonly displayValue: string;
  readonly color: string;
  readonly ariaLabel?: string;
  /** O texto ao passar o mouse; sem ele, "<rótulo>: <valor>". */
  readonly title?: string;
};

export type ProportionBarsProps = {
  readonly items: readonly ProportionBarItem[];
  readonly ariaLabel: string;
  readonly pressedKey?: string | null;
  readonly onSelect?: (key: string) => void;
  /** `"filter"` (padrão): cada linha é um botão que filtra. `"list"`: só leitura, sem botão. */
  readonly kind?: "filter" | "list";
};

function widthOf(value: number | null, peak: number): string {
  if (value === null || !Number.isFinite(value) || peak <= 0) return "0%";
  return `${Math.max(1.5, Math.min(100, (Math.abs(value) / peak) * 100))}%`;
}

export function ProportionBars({ items, ariaLabel, pressedKey = null, onSelect, kind = "filter" }: ProportionBarsProps) {
  const peak = Math.max(0, ...items.map((item) => (item.value !== null && Number.isFinite(item.value) ? Math.abs(item.value) : 0)));
  const parts = (item: ProportionBarItem) => (
    <>
      <span className="ui-proportion-bars__label">
        <span className="ui-proportion-bars__dot" style={{ background: item.color }} aria-hidden="true" />
        <span className="ui-proportion-bars__text">{item.label}</span>
      </span>
      <span className="ui-proportion-bars__track" aria-hidden="true">
        <span className="ui-proportion-bars__fill" style={{ width: widthOf(item.value, peak), background: item.color }} />
      </span>
      <span className="ui-proportion-bars__value">{item.displayValue}</span>
    </>
  );
  if (kind === "list") {
    return (
      <div className="ui-proportion-bars ui-proportion-bars--list" role="list" aria-label={ariaLabel}>
        {items.map((item) => (
          <div key={item.key} role="listitem" className="ui-proportion-bars__row ui-proportion-bars__row--static" title={item.title ?? `${item.label}: ${item.displayValue}`}>
            {parts(item)}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="ui-proportion-bars" role="group" aria-label={ariaLabel}>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className="ui-proportion-bars__row"
          title={item.title ?? `${item.label}: ${item.displayValue}`}
          aria-pressed={pressedKey === item.key}
          aria-label={item.ariaLabel ?? `${item.label}: ${item.displayValue} — filtrar a lista`}
          data-alvo={item.key}
          onClick={() => onSelect?.(item.key)}
        >
          {parts(item)}
        </button>
      ))}
    </div>
  );
}

/** Mini-barra inline (a coluna "%" da lista): `value` em relação a `max`, com piso visível e cor por faixa. */
export function ProportionBar({ value, max, color, label }: { readonly value: number | null; readonly max: number; readonly color: string; readonly label: string }) {
  const width = value === null || !Number.isFinite(value) ? "0%" : `${Math.max(4, Math.min(100, (Math.abs(value) / Math.max(1, max)) * 100))}%`;
  return (
    <span className="ui-proportion-bar" aria-hidden="true" title={label}>
      <i style={{ width, background: color }} />
    </span>
  );
}
