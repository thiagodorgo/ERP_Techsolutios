import { Maximize2, Minimize2, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";

import type { OperationsMapPadding } from "../operations-map.types";

/**
 * J-MAPAS-6 (redesign) — Stage do Mapa Operacional: o MAPA é o herói.
 *
 * Supersede o grid de 3 colunas do M-1 (que espremia a largura do mapa). Aqui o mapa é FULL-BLEED
 * (100% da largura útil) e os painéis viram OVERLAYS DE VIDRO NAVY ancorados às bordas do mapa —
 * não colunas que subtraem largura:
 *   - `calls`  → rail de vidro à ESQUERDA, ABERTO por default ("Chamados que chegam");
 *   - `techs`  → rail de vidro à DIREITA, COLAPSADO por default (o status já vive nos marcadores);
 *   - Maximizar → o stage vira `position:fixed;inset:0` (mesma instância do mapa, não remonta),
 *     colapsa os dois rails e mostra os chamados como card de vidro no 4º QUADRANTE (canto inf. dir.).
 *
 * O slot `map` é uma RENDER PROP: recebe `resizeSignal` (incrementa a cada colapso/maximização) e
 * `mapPadding` (área reservada dos rails). O MapLibre/Google não redimensionam sozinhos quando só o
 * container muda de tamanho — os canvases usam `resizeSignal` para chamar `map.resize()`/trigger e
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
  const [maximized, setMaximized] = useState(false);
  // Incrementa a cada mudança de layout que altera o tamanho do container do mapa.
  const [resizeSignal, setResizeSignal] = useState(0);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const maximizeButtonRef = useRef<HTMLButtonElement | null>(null);
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
  const toggleMaximized = useCallback(() => {
    setMaximized((value) => !value);
    bumpResize();
  }, [bumpResize]);

  // Padding de câmera (px) = área ocupada pelos rails de vidro / card do 4º quadrante, para os pins
  // não caírem sob eles. Muda junto com o estado de colapso/maximização (mesma origem do resize).
  const mapPadding = useMemo<OperationsMapPadding>(() => {
    if (maximized) {
      // Rails colapsados; card de chamados no canto inferior direito → reserva direita + base.
      return { top: 24, right: 360, bottom: 220, left: 72 };
    }
    return {
      top: 24,
      bottom: 72, // não cobrir a legenda ancorada na base do mapa
      left: callsCollapsed ? 72 : 372,
      right: techsCollapsed ? 72 : 372,
    };
  }, [callsCollapsed, techsCollapsed, maximized]);

  // Maximizado = diálogo modal: Esc restaura e o foco fica preso (focus-trap) dentro do stage.
  useEffect(() => {
    if (!maximized) return;
    const node = stageRef.current;
    if (!node) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusable = () =>
      Array.from(
        node.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null || element === node);

    (maximizeButtonRef.current ?? focusable()[0] ?? node).focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMaximized(false);
        bumpResize();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    node.addEventListener("keydown", handleKeyDown);
    return () => {
      node.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [maximized, bumpResize]);

  return (
    <section
      ref={stageRef}
      className={`operations-map-stage${maximized ? " operations-map-stage--maximized" : ""}`}
      tabIndex={-1}
      {...(maximized
        ? { role: "dialog" as const, "aria-modal": true, "aria-label": "Mapa Operacional em tela cheia" }
        : {})}
    >
      <div className="operations-map-stage__map">{map({ resizeSignal, mapPadding })}</div>

      <button
        ref={maximizeButtonRef}
        type="button"
        className="operations-map-stage__maximize"
        onClick={toggleMaximized}
        aria-pressed={maximized}
        aria-label={maximized ? "Restaurar tamanho do mapa" : "Maximizar mapa"}
      >
        {maximized ? <Minimize2 size={16} aria-hidden="true" /> : <Maximize2 size={16} aria-hidden="true" />}
        <span>{maximized ? "Restaurar" : "Maximizar"}</span>
      </button>

      {/* Rail ESQUERDO — chamados que chegam (aberto por default). Colapsado vira faixa de 56px. */}
      {!maximized ? (
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
      ) : null}

      {/* Rail DIREITO — Técnicos de Campo (colapsado por default: status já nos marcadores). */}
      {!maximized ? (
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
      ) : null}

      {/* 4º QUADRANTE — só no maximizado: os chamados que chegam como card de vidro, canto inf. dir. */}
      {maximized ? (
        <div className="operations-map-quadrant" aria-label="Chamados que chegam">
          {calls}
        </div>
      ) : null}
    </section>
  );
}
