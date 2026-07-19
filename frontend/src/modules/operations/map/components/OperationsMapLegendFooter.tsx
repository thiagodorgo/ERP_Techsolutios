import { MAP_LEGEND_ITEMS } from "../map/mapMarkers";

/**
 * M-2 (J-MAPAS-6) — Rodapé de legenda UNIFICADO do Mapa Operacional.
 *
 * Substitui as legendas soltas/flutuantes que viviam DENTRO de cada canvas (a antiga
 * `<ul.operations-map-libre__legend>` sobreposta ao mapa). Agora existe UM único rodapé
 * horizontal ancorado à BASE do container do mapa — status de técnico + frescor + prioridade
 * de OS num só bloco. Consumido pelos DOIS canvases (MapLibre e Google) para paridade total
 * (regra do espelho): a fonte é a MESMA constante `MAP_LEGEND_ITEMS`, então a cor de cada
 * swatch vem SEMPRE de `item.color` (derivado de getStatusColor / STALE_*_COLOR /
 * WORK_ORDER_PRIORITY_HEX) — nunca um hex solto duplicado aqui.
 */
export function OperationsMapLegendFooter() {
  return (
    <ul className="operations-map-legend-footer" aria-label="Legenda do mapa">
      {MAP_LEGEND_ITEMS.map((item, index) =>
        item.kind === "sep" ? (
          <li key={`sep-${index}`} className="operations-map-legend-footer__sep" aria-hidden="true" />
        ) : (
          <li key={item.label} className="operations-map-legend-footer__item">
            <span
              className={
                item.kind === "pin"
                  ? "operations-map-legend-footer__pin"
                  : "operations-map-legend-footer__dot"
              }
              style={{ background: item.color }}
            />{" "}
            {item.label}
          </li>
        ),
      )}
    </ul>
  );
}
