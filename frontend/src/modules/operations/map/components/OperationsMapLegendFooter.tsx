import type { LegendGroupKey } from "../map/mapMarkers";
import type { LegendFilterEntry } from "../hooks/useLegendFilter";

/**
 * J-MAPAS-10 (PLANO-MAPA-PIXEL, D6) — a legenda do rodapé VIRA LEGENDA-FILTRO interativa
 * (verbatim do protótipo): 8 itens com contagem REAL no tooltip (data-tip) e toggle que esconde a
 * camada correspondente no mapa (aplicado page-level — MapLibre, Google e o fallback esquemático
 * obedecem sem código de canvas). Item de OS usa o quadrado 8px rotacionado (losango); item OFF
 * fica esmaecido (opacity .4). À direita, o hint verbatim do protótipo + o disclaimer curto das
 * estimativas (honestidade D6).
 *
 * Fonte única: as entries derivam de MAP_LEGEND_FILTER_ITEMS (cores das paletas únicas de
 * mapMarkers) + contagens reais do useLegendFilter — nenhum hex solto aqui.
 */
export function OperationsMapLegendFooter({
  entries,
  onToggle,
}: {
  readonly entries: readonly LegendFilterEntry[];
  readonly onToggle: (key: LegendGroupKey) => void;
}) {
  return (
    <div className="opmap-legend">
      <span className="opmap-legend__items" role="group" aria-label="Legenda e filtros do mapa">
        {entries.map((entry) => (
          <button
            key={entry.key}
            type="button"
            className={`opmap-lg${entry.active ? "" : " off"}`}
            data-key={entry.key}
            data-tip={entry.tip}
            aria-pressed={entry.active}
            aria-label={`${entry.label} — ${entry.tip}. ${entry.active ? "Clique para esconder no mapa" : "Clique para mostrar no mapa"}`}
            onClick={() => onToggle(entry.key)}
          >
            <i className={entry.kind === "square" ? "sq" : ""} style={{ background: entry.color }} aria-hidden="true" />
            {entry.label}
          </button>
        ))}
      </span>
      <span className="opmap-legend__right">
        <span className="opmap-legend__disclaimer">distâncias em linha reta · tempo estimado sem trânsito</span>
        <span className="opmap-legend__hint" title="distâncias em linha reta · tempo estimado sem trânsito">
          Esc limpa a seleção · arraste uma OS até um técnico para alocar
        </span>
      </span>
    </div>
  );
}
