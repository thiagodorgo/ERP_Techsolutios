import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { DOSSIE_PARAM } from "../../../processes/dossieDeepLink";
import type { YardItem, YardsApiContext, YardSpotItem, YardSpotStatus } from "../../yards.types";
import { useYardSpotBoard } from "./useYardSpotBoard";

// B-APARENCIA-USUARIO — vagas de um pátio em duas formas da referência (`patios-3opcoes.reference.html`):
// "mini" = mapa resumido do detalhe da linha (B, `miniMapa`); "board" = quadro ao lado da lista (C, `renderBoard`).
// A vaga OCUPADA leva ao dossiê do veículo na página do pátio (`?dossie=`, o mesmo deep-link do OccupancyMap).
// As ações da vaga (alocar, mover, liberar, editar) ficam na página completa do pátio, como a referência anota.

const STATUS_LABEL: Readonly<Record<YardSpotStatus, string>> = { FREE: "Livre", OCCUPIED: "Ocupada", BLOCKED: "Bloqueada" };
const STATUS_CLASS: Readonly<Record<YardSpotStatus, string>> = { FREE: "livre", OCCUPIED: "ocupada", BLOCKED: "bloqueada" };

function dossieHref(yardId: string, processId: string): string {
  return `/patios/patios/${yardId}?${DOSSIE_PARAM}=${encodeURIComponent(processId)}`;
}

function spotsByArea(spots: readonly YardSpotItem[]): Map<string, YardSpotItem[]> {
  const index = new Map<string, YardSpotItem[]>();
  for (const spot of spots) {
    const list = index.get(spot.areaId) ?? [];
    list.push(spot);
    index.set(spot.areaId, list);
  }
  for (const list of index.values()) list.sort((a, b) => a.code.localeCompare(b.code, "pt-BR", { numeric: true }));
  return index;
}

export function YardSpotMiniMap({ yard, apiContext }: { readonly yard: YardItem; readonly apiContext: YardsApiContext }) {
  const { state, retry } = useYardSpotBoard(apiContext, yard.id);
  const grouped = useMemo(() => (state.status === "success" ? spotsByArea(state.spots) : new Map<string, YardSpotItem[]>()), [state]);

  return (
    <div className="pat-minimapa" role="group" aria-label={`Mapa resumido das vagas do ${yard.name}`}>
      <div className="pat-minimapa__titulo">
        <span>Vagas do pátio · clique numa ocupada para abrir o dossiê</span>
        <span className="pat-minimapa__legenda" aria-hidden="true">
          <span>
            <i className="pat-mini pat-mini--livre" /> Livre
          </span>
          <span>
            <i className="pat-mini pat-mini--ocupada" /> Ocupada
          </span>
          <span>
            <i className="pat-mini pat-mini--bloqueada" /> Bloqueada
          </span>
        </span>
      </div>
      {state.status === "loading" || state.status === "idle" ? <div className="pat-skel" style={{ height: 40 }} aria-hidden="true" /> : null}
      {state.status === "error" ? (
        <div className="pat-cell-muted">
          {state.message}{" "}
          <button type="button" className="pat-link" onClick={retry}>
            Tentar novamente
          </button>
        </div>
      ) : null}
      {state.status === "success" && state.areas.length === 0 ? <div className="pat-cell-muted">Nenhuma área cadastrada neste pátio.</div> : null}
      {state.status === "success"
        ? state.areas.map((area) => (
            <div key={area.id} className="pat-minimapa__linha">
              <span className="pat-minimapa__area" title={`${area.name} · ${area.vehicleClassLabel}`}>
                {area.name}
              </span>
              <span className="pat-minimapa__quadros">
                {(grouped.get(area.id) ?? []).length === 0 ? <span className="pat-cell-muted">sem vagas</span> : null}
                {(grouped.get(area.id) ?? []).map((spot) => {
                  const plate = spot.currentProcessId ? state.plateByProcess.get(spot.currentProcessId) : undefined;
                  const title = `${spot.code} · ${plate ?? STATUS_LABEL[spot.status]}`;
                  return spot.status === "OCCUPIED" && spot.currentProcessId ? (
                    <Link
                      key={spot.id}
                      to={dossieHref(yard.id, spot.currentProcessId)}
                      className="pat-mini pat-mini--ocupada"
                      title={title}
                      aria-label={`Vaga ${spot.code} ocupada${plate ? ` — ${plate}` : ""}, abrir o dossiê`}
                    />
                  ) : (
                    <i key={spot.id} className={`pat-mini pat-mini--${STATUS_CLASS[spot.status]}`} title={title} />
                  );
                })}
              </span>
            </div>
          ))
        : null}
    </div>
  );
}

type LegendFilter = YardSpotStatus | null;

export function YardSpotBoardPanel({ yard, apiContext }: { readonly yard: YardItem | null; readonly apiContext: YardsApiContext }) {
  const { state, retry } = useYardSpotBoard(apiContext, yard?.id ?? null);
  const [areaId, setAreaId] = useState<string | null>(null);
  const [legend, setLegend] = useState<LegendFilter>(null);
  const [shownYardId, setShownYardId] = useState<string | null>(yard?.id ?? null);

  // Trocar de pátio volta para a 1ª área e tira o filtro da legenda (referência: `selecionarC`).
  if ((yard?.id ?? null) !== shownYardId) {
    setShownYardId(yard?.id ?? null);
    setAreaId(null);
    setLegend(null);
  }

  const grouped = useMemo(() => (state.status === "success" ? spotsByArea(state.spots) : new Map<string, YardSpotItem[]>()), [state]);

  if (!yard) {
    return (
      <aside className="pat-board" aria-label="Vagas do pátio escolhido">
        <div className="pat-board__title">Vagas</div>
        <div className="pat-board__sub">Escolha um pátio na lista.</div>
      </aside>
    );
  }

  const area = state.status === "success" ? state.areas.find((item) => item.id === areaId) ?? state.areas[0] ?? null : null;
  const areaSpots = area ? grouped.get(area.id) ?? [] : [];
  const count = (status: YardSpotStatus) => areaSpots.filter((spot) => spot.status === status).length;
  const visible = legend ? areaSpots.filter((spot) => spot.status === legend) : areaSpots;
  const legendItems: readonly { value: LegendFilter; label: string; count: number; swatch: string | null }[] = [
    { value: null, label: "Todas", count: areaSpots.length, swatch: null },
    { value: "FREE", label: "Livres", count: count("FREE"), swatch: "pat-lg-livre" },
    { value: "OCCUPIED", label: "Ocupadas", count: count("OCCUPIED"), swatch: "pat-lg-ocupada" },
    { value: "BLOCKED", label: "Bloqueadas", count: count("BLOCKED"), swatch: "pat-lg-bloqueada" },
  ];

  return (
    <aside className="pat-board" aria-label="Vagas do pátio escolhido">
      <div className="pat-board__head">
        <div style={{ minWidth: 0 }}>
          <div className="pat-board__title">{`Vagas · ${yard.name}`}</div>
          <div className="pat-board__sub">{yard.address || "Endereço não informado"}</div>
        </div>
        <Link to={`/patios/patios/${yard.id}`} className="pat-link" style={{ whiteSpace: "nowrap" }}>
          Abrir página do pátio →
        </Link>
      </div>

      {state.status === "loading" || state.status === "idle" ? (
        <div aria-hidden="true">
          <div className="pat-skel" style={{ height: 14, width: "60%", marginBottom: 10 }} />
          <div className="pat-skel" style={{ height: 92 }} />
        </div>
      ) : null}

      {state.status === "error" ? (
        <div className="ui-state">
          <strong>{state.message}</strong>
          <p>
            <button type="button" className="pat-link" onClick={retry}>
              Tentar novamente
            </button>
          </p>
        </div>
      ) : null}

      {state.status === "success" && !area ? (
        <div className="ui-state">
          <strong>Nenhuma área cadastrada</strong>
          <p>Cadastre a primeira área (quadra, corredor ou fileira) na página do pátio para organizar as vagas.</p>
        </div>
      ) : null}

      {state.status === "success" && area ? (
        <>
          <div className="pat-legenda" role="group" aria-label="Filtrar vagas por situação">
            {legendItems.map((item) => (
              <button key={item.label} type="button" aria-pressed={legend === item.value} onClick={() => setLegend(item.value)}>
                {item.swatch ? <i className={item.swatch} aria-hidden="true" /> : null}
                {item.label} <b>{item.count}</b>
              </button>
            ))}
          </div>
          <div className="pat-os-tabs pat-board__tabs" role="group" aria-label="Áreas do pátio">
            {state.areas.map((item) => (
              <button
                key={item.id}
                type="button"
                className={item.id === area.id ? "pat-os-tab pat-os-tab--active" : "pat-os-tab"}
                aria-pressed={item.id === area.id}
                onClick={() => {
                  setAreaId(item.id);
                  setLegend(null);
                }}
              >
                {item.name}
              </button>
            ))}
          </div>
          {visible.length === 0 ? (
            <div className="pat-cell-muted">{areaSpots.length === 0 ? "Nenhuma vaga cadastrada nesta área." : "Nenhuma vaga nesta situação."}</div>
          ) : (
            <div className="pat-c-grid">
              {visible.map((spot) => {
                const plate = spot.currentProcessId ? state.plateByProcess.get(spot.currentProcessId) : undefined;
                const kind = STATUS_CLASS[spot.status];
                return spot.status === "OCCUPIED" && spot.currentProcessId ? (
                  <Link
                    key={spot.id}
                    to={dossieHref(yard.id, spot.currentProcessId)}
                    className={`pat-vaga-c pat-vaga-c--${kind}`}
                    aria-label={`Vaga ${spot.code} ocupada${plate ? ` — ${plate}` : ""}, abrir o dossiê`}
                  >
                    <b>{spot.code}</b>
                    <span>{plate ?? "Ocupada"}</span>
                  </Link>
                ) : (
                  <div key={spot.id} className={`pat-vaga-c pat-vaga-c--${kind}`}>
                    <b>{spot.code}</b>
                    <span>{STATUS_LABEL[spot.status]}</span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="pat-board__hint">
            {`${area.name} · ${area.vehicleClassLabel}${area.covered ? " · Coberta" : ""}. Clique numa vaga ocupada para abrir o dossiê; alocar, mover e liberar ficam na página do pátio.`}
          </div>
        </>
      ) : null}
    </aside>
  );
}
