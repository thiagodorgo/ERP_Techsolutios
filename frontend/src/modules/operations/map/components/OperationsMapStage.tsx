import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";
import { useCallback, useId, useMemo, useState, type ReactNode } from "react";

import type { OperationsMapPadding } from "../operations-map.types";

/**
 * J-MAPAS-6 (redesign) — Stage do Mapa Operacional: o MAPA é o herói.
 *
 * Supersede o grid de 3 colunas do M-1 (que espremia a largura do mapa). Aqui o mapa é FULL-BLEED
 * (100% da largura útil) e os painéis viram OVERLAYS DE VIDRO NAVY ancorados às bordas do mapa —
 * não colunas que subtraem largura:
 *   - `calls`  → rail de vidro à ESQUERDA, ABERTO por default ("Chamados que chegam");
 *   - `techs`  → rail de vidro à DIREITA, COLAPSADO por default (o status já vive nos marcadores).
 *
 * SPRINT POLISH (feedback do dono):
 *   - Fullscreen é NATIVO do mapa (FullscreenControl do MapLibre / fullscreenControl do Google no
 *     canto inferior direito) — o Stage não tem mais o botão "Maximizar" nem o modo tela-cheia
 *     próprio (que caía numa tela tosca). Aqui ficam só o mapa + os 2 rails.
 *   - Rail COLAPSADO deixou de ser faixa full-height (que cobria o mapa) e virou uma pílula fina
 *     ancorada ao topo (ícone + badge); o `mapPadding` do lado colapsado cai para só afastar os
 *     pins da pílula.
 *
 * O slot `map` é uma RENDER PROP: recebe `resizeSignal` (incrementa a cada colapso) e `mapPadding`
 * (área reservada dos rails). O MapLibre/Google não redimensionam sozinhos quando só o container
 * muda de tamanho — os canvases usam `resizeSignal` para chamar `map.resize()`/trigger e
 * `mapPadding` no fitBounds/setPadding para os pins não ficarem escondidos sob os rails.
 */

export type OperationsMapStageRenderState = {
  readonly resizeSignal: number;
  readonly mapPadding: OperationsMapPadding;
};

type Props = {
  readonly map: (state: OperationsMapStageRenderState) => ReactNode;
  readonly calls: ReactNode;
  readonly techs: ReactNode;
  // Contagens honestas para o badge do rail colapsado; `undefined` = sem contagem (nada fabricado).
  readonly callsCount?: number;
  readonly techsCount?: number;
  // M-5 (J-MAPAS-6) — quantos chamados estão em janela de "novo" (diff de useNewWorkOrderAlert). >0 realça
  // o badge de chamados (mesmo colapsado o operador percebe a chegada). Realce estático; a pulsação do
  // badge é desligada por @media reduced-motion no CSS.
  readonly newCallsCount?: number;
};

export function OperationsMapStage({ map, calls, techs, callsCount, techsCount, newCallsCount }: Props) {
  const hasNewCalls = typeof newCallsCount === "number" && newCallsCount > 0;
  // M-4 entregou a fila REAL de chamados → voltamos ao default do plano: CHAMADOS ABERTO (master/triagem
  // do operador de despacho) e TÉCNICOS COLAPSADO (o status já vive nos marcadores do mapa; o rail abre sob
  // demanda). O badge do rail colapsado mostra a contagem real (callsCount/techsCount) quando disponível.
  const [callsCollapsed, setCallsCollapsed] = useState(false);
  const [techsCollapsed, setTechsCollapsed] = useState(true);
  // Incrementa a cada mudança de layout que altera o tamanho do container do mapa.
  const [resizeSignal, setResizeSignal] = useState(0);

  const callsBodyId = useId();
  const techsBodyId = useId();

  const bumpResize = useCallback(() => setResizeSignal((value) => value + 1), []);
  const toggleCalls = useCallback(() => {
    setCallsCollapsed((value) => !value);
    bumpResize();
  }, [bumpResize]);
  const toggleTechs = useCallback(() => {
    setTechsCollapsed((value) => !value);
    bumpResize();
  }, [bumpResize]);

  // Padding de câmera (px) = área ocupada pelos rails de vidro, para os pins não caírem sob eles.
  // Muda junto com o estado de colapso (mesma origem do resize). Rail COLAPSADO agora é uma pílula
  // fina ancorada ao topo → basta ~24px para afastar os pins da pílula (era 72px da faixa cheia).
  const mapPadding = useMemo<OperationsMapPadding>(
    () => ({
      top: 24,
      bottom: 72, // não cobrir a legenda ancorada na base do mapa
      left: callsCollapsed ? 24 : 372,
      right: techsCollapsed ? 24 : 372,
    }),
    [callsCollapsed, techsCollapsed],
  );

  return (
    <section className="operations-map-stage">
      <div className="operations-map-stage__map">{map({ resizeSignal, mapPadding })}</div>

      {/* Rail ESQUERDO — chamados que chegam (aberto por default). Colapsado vira pílula fina no topo. */}
      <aside
        className="operations-map-rail operations-map-rail--calls"
        data-collapsed={callsCollapsed}
        aria-label="Chamados que chegam"
      >
        <div className="operations-map-rail__header">
          <button
            type="button"
            className="operations-map-rail__toggle"
            onClick={toggleCalls}
            aria-expanded={!callsCollapsed}
            aria-controls={callsBodyId}
            aria-label={callsCollapsed ? "Expandir chamados que chegam" : "Recolher chamados que chegam"}
          >
            {callsCollapsed ? <PanelLeftOpen size={18} aria-hidden="true" /> : <PanelLeftClose size={18} aria-hidden="true" />}
          </button>
          {!callsCollapsed ? <span className="operations-map-rail__title">Chamados que chegam</span> : null}
        </div>
        {callsCollapsed ? (
          typeof callsCount === "number" ? (
            <span
              className={`operations-map-rail__badge${hasNewCalls ? " operations-map-rail__badge--new" : ""}`}
              aria-label={
                hasNewCalls
                  ? `${callsCount} chamados, ${newCallsCount} novo${newCallsCount === 1 ? "" : "s"}`
                  : undefined
              }
            >
              {callsCount}
            </span>
          ) : null
        ) : (
          <div id={callsBodyId} className="operations-map-rail__body">
            {calls}
          </div>
        )}
      </aside>

      {/* Rail DIREITO — Técnicos de Campo (colapsado por default: status já nos marcadores). */}
      <aside
        className="operations-map-rail operations-map-rail--techs"
        data-collapsed={techsCollapsed}
        aria-label="Técnicos de Campo"
      >
        <div className="operations-map-rail__header">
          {!techsCollapsed ? <span className="operations-map-rail__title">Técnicos de Campo</span> : null}
          <button
            type="button"
            className="operations-map-rail__toggle"
            onClick={toggleTechs}
            aria-expanded={!techsCollapsed}
            aria-controls={techsBodyId}
            aria-label={techsCollapsed ? "Expandir Técnicos de Campo" : "Recolher Técnicos de Campo"}
          >
            {techsCollapsed ? <PanelRightOpen size={18} aria-hidden="true" /> : <PanelRightClose size={18} aria-hidden="true" />}
          </button>
        </div>
        {techsCollapsed ? (
          typeof techsCount === "number" ? (
            <span className="operations-map-rail__badge">{techsCount}</span>
          ) : null
        ) : (
          <div id={techsBodyId} className="operations-map-rail__body">
            {techs}
          </div>
        )}
      </aside>
    </section>
  );
}
