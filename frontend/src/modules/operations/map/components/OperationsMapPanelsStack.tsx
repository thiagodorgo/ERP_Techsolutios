import { useId, useState, type ReactNode } from "react";

/**
 * J-MAPAS-10 (PLANO-MAPA-PIXEL) — STACK de painéis à direita do mapa (348px), verbatim do
 * protótipo: "Chamados recebidos" / "Em Atendimento" / "Técnicos de campo" (grow), cada um com
 * phead (título + cnt + botão recolher "—") e colapso individual → PILL com contador no topo do
 * stack ("🛠 Atendimento" · "📥 Recebidas" · "👤 Técnicos"). Substitui o OperationsMapStage
 * (rails esquerda/direita) do J-MAPAS-6.
 *
 * Gating: sem work_orders:read os DOIS painéis de OS somem (showWorkOrderPanels=false) — o
 * backend segue a autoridade final. Contagens = length das listas reais (D-007).
 * A11y: colapso com aria-expanded/aria-controls; pill reabre; alvo ≥44px na pill.
 */

type PanelKey = "rec" | "atd" | "tec";

const PILLS: readonly { readonly key: PanelKey; readonly label: string }[] = [
  { key: "atd", label: "🛠 Atendimento" },
  { key: "rec", label: "📥 Recebidas" },
  { key: "tec", label: "👤 Técnicos" },
];

export function OperationsMapPanelsStack({
  calls,
  inService,
  technicians,
  recCount,
  atdCount,
  tecCount,
  newCallsCount = 0,
  showWorkOrderPanels = true,
  osSelected = false,
}: {
  readonly calls: ReactNode;
  readonly inService: ReactNode;
  readonly technicians: ReactNode;
  readonly recCount: number;
  readonly atdCount: number;
  readonly tecCount: number;
  // M-5 — realce "novo" no contador de recebidas (pill e phead) enquanto houver OS em janela de alerta.
  readonly newCallsCount?: number;
  readonly showWorkOrderPanels?: boolean;
  readonly osSelected?: boolean;
}) {
  const [collapsed, setCollapsed] = useState<Record<PanelKey, boolean>>({ rec: false, atd: false, tec: false });
  const idBase = useId();
  const hasNewCalls = newCallsCount > 0;

  const countFor: Record<PanelKey, number> = { rec: recCount, atd: atdCount, tec: tecCount };
  const bodyId = (key: PanelKey) => `${idBase}-${key}`;

  const toggle = (key: PanelKey, next: boolean) => setCollapsed((current) => ({ ...current, [key]: next }));

  const panel = (key: PanelKey, title: string, body: ReactNode, grow = false, filtersInBody = false) =>
    collapsed[key] ? null : (
      <section className={`opmap-panel${grow ? " grow" : ""}`} aria-label={title} data-panel={key}>
        <header className="opmap-phead">
          <b>{title}</b>
          <span
            className={`opmap-cnt${key === "rec" && hasNewCalls ? " opmap-cnt--new" : ""}`}
            aria-label={
              key === "rec" && hasNewCalls
                ? `${countFor[key]} chamados, ${newCallsCount} novo${newCallsCount === 1 ? "" : "s"}`
                : undefined
            }
          >
            {countFor[key]}
          </span>
          <button
            type="button"
            className="opmap-col"
            title="Recolher"
            aria-label={`Recolher ${title}`}
            aria-expanded={true}
            aria-controls={bodyId(key)}
            onClick={() => toggle(key, true)}
          >
            —
          </button>
        </header>
        <div id={bodyId(key)} className={`opmap-pbody${filtersInBody ? " opmap-pbody--with-filters" : ""}`}>
          {body}
        </div>
      </section>
    );

  const visiblePills = PILLS.filter(
    (pill) => collapsed[pill.key] && (pill.key === "tec" || showWorkOrderPanels),
  );

  return (
    <div className="opmap-stack" data-os-selected={osSelected ? "true" : undefined}>
      {visiblePills.length > 0 ? (
        <div className="opmap-pills">
          {visiblePills.map((pill) => (
            <button
              key={pill.key}
              type="button"
              className="opmap-pill"
              aria-expanded={false}
              aria-controls={bodyId(pill.key)}
              onClick={() => toggle(pill.key, false)}
            >
              {pill.label}{" "}
              <span className={`opmap-cnt${pill.key === "rec" && hasNewCalls ? " opmap-cnt--new" : ""}`}>
                {countFor[pill.key]}
              </span>
            </button>
          ))}
        </div>
      ) : null}
      {showWorkOrderPanels ? panel("rec", "Chamados recebidos", calls) : null}
      {showWorkOrderPanels ? panel("atd", "Em Atendimento", inService) : null}
      {panel("tec", "Técnicos de campo", technicians, true, true)}
    </div>
  );
}
