import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { renderToString } from "react-dom/server";

import {
  AVATAR_COLORS,
  TECH_GROUP_HEX,
  TECH_STALE_HEX,
  WORK_ORDER_PRIORITY_HEX,
  getAvatarColor,
  getInitials,
  getTechnicianBorderColor,
  getWorkOrderPriorityColor,
  isValidMapCoordinate,
} from "../src/modules/operations/map/map/mapMarkers";
import {
  WORK_ORDER_ROUTE_COLOR,
  WORK_ORDER_ROUTE_DASHARRAY,
  WORK_ORDER_ROUTE_OPACITY,
  WORK_ORDER_ROUTE_WIDTH,
} from "../src/modules/operations/map/map/routeLines";
import {
  OPERATIONAL_MAP_DEFAULT_CENTER,
  OPERATIONAL_MAP_DEFAULT_ZOOM,
} from "../src/modules/operations/map/map/mapStyle";
import { GoogleMapsCanvas } from "../src/modules/operations/map/components/GoogleMapsCanvas";
import type {
  FieldLocationItem,
  FieldLocationStatus,
  OperationsMapWorkOrderPin,
} from "../src/modules/operations/map/operations-map.types";

/**
 * J-MAPAS-10 PR-2 — ESPELHO Google. Fecha a pendência declarada no PR-1: o canvas Google passou a
 * consumir os MESMOS deltas do protótipo (avatar/borda, losango, rotas tracejadas, memória da
 * visão, pan imperativo, popup do marker, hover/clique) das MESMAS fontes únicas do MapLibre.
 * As três diretivas do dono (2026-08-06) valem aqui: nenhum movimento automático de câmera,
 * memória da visão por organização, detalhe do técnico por hover (efêmero) e por clique (fixo).
 */

const COMPONENTS = new URL("../src/modules/operations/map/components/", import.meta.url);
const GOOGLE_SRC = readFileSync(fileURLToPath(new URL("GoogleMapsCanvas.tsx", COMPONENTS)), "utf8");
const LIBRE_SRC = readFileSync(fileURLToPath(new URL("OperationsMapLibreCanvas.tsx", COMPONENTS)), "utf8");
const WRAPPER_SRC = readFileSync(fileURLToPath(new URL("OperationsMapCanvas.tsx", COMPONENTS)), "utf8");

const NOW = new Date("2026-08-06T12:00:00.000Z").getTime();

function makeLocation(overrides: Partial<FieldLocationItem> = {}): FieldLocationItem {
  return {
    id: "loc-1",
    operatorId: "op-1",
    displayName: "Ana Souza",
    status: "on_route",
    latitude: -23.55052,
    longitude: -46.633308,
    capturedAt: new Date(NOW).toISOString(),
    isStale: false,
    ...overrides,
  };
}

function makePin(overrides: Partial<OperationsMapWorkOrderPin> = {}): OperationsMapWorkOrderPin {
  return {
    id: "wo-1",
    code: "OS-1",
    title: "Guincho",
    priority: "high",
    status: "open",
    latitude: -23.5,
    longitude: -46.6,
    ...overrides,
  };
}

function renderCanvas(props: Partial<Parameters<typeof GoogleMapsCanvas>[0]> = {}): string {
  return renderToString(
    createElement(GoogleMapsCanvas, {
      loadState: "ready",
      locations: [],
      onSelect: () => undefined,
      ...props,
    }),
  );
}

/** Nomes das props declaradas num bloco `type Props = { … }` (guard de paridade do espelho). */
function propNamesOf(source: string): string[] {
  const block = /type Props = \{([\s\S]*?)\n\};/.exec(source);
  assert.ok(block, "bloco `type Props` não encontrado");
  return [...block![1]!.matchAll(/^\s*readonly (\w+)\??:/gm)].map((match) => match[1]!);
}

// 1 — técnico: avatar com a cor AVC ESTÁVEL por id + borda 3px na cor do grupo de status.
//     MESMAS funções puras do MapLibre (getAvatarColor/getTechnicianBorderColor) — fonte única.
test("técnico: avatar AVC estável por id + borda na cor do grupo (mesma fonte única do MapLibre)", () => {
  const location = makeLocation({ id: "tec-77", status: "on_route" });
  const html = renderCanvas({ locations: [location] });
  assert.match(html, /class="opmap-gtech"/);
  assert.match(html, new RegExp(`background:${getAvatarColor("tec-77")}`));
  assert.match(html, new RegExp(`border-color:${TECH_GROUP_HEX.rota}`));
  // Determinismo: a cor não muda entre renders nem com a ordem do array.
  assert.equal(getAvatarColor("tec-77"), getAvatarColor("tec-77"));
  assert.ok(AVATAR_COLORS.includes(getAvatarColor("tec-77")));
});

// 2 — "localização antiga" = 1 faixa única (isStale, 15 min): a borda vira âmbar mesmo com status vivo.
test("localização antiga pinta a borda de âmbar (limiar único isStale; sem faixas 3/10 min)", () => {
  const stale = makeLocation({ id: "tec-2", status: "available", isStale: true });
  const html = renderCanvas({ locations: [stale] });
  assert.match(html, new RegExp(`border-color:${TECH_STALE_HEX}`));
  assert.equal(getTechnicianBorderColor(stale), TECH_STALE_HEX);
  // O fundo continua sendo o avatar (a cor de status vive na BORDA, como no protótipo).
  assert.match(html, new RegExp(`background:${getAvatarColor("tec-2")}`));
});

// 3 — grupo "fora de serviço" esmaece; a SELEÇÃO não repinta o marcador (espelho do MapLibre, que
//     também não usa `selected` na camada de técnico) — cor nunca mente sobre o status real.
test("grupo fora de serviço marca data-off; seleção não troca a pintura do técnico", () => {
  for (const status of ["offline", "blocked", "paused"] as FieldLocationStatus[]) {
    const html = renderCanvas({ locations: [makeLocation({ id: `off-${status}`, status })] });
    assert.match(html, /data-off="true"/, `status ${status} deveria cair no grupo fora de serviço`);
  }
  const active = makeLocation({ id: "tec-3", status: "in_service" });
  const plain = renderCanvas({ locations: [active] });
  const selected = renderCanvas({ locations: [active], selectedId: active.id });
  assert.doesNotMatch(plain, /data-off/);
  assert.equal(selected, plain); // seleção não muda a pintura
  assert.match(plain, new RegExp(`border-color:${TECH_GROUP_HEX.atend}`));
});

// 4 — iniciais do miolo: mesma função pura do MapLibre (1–2 letras).
test("iniciais do avatar usam getInitials (mesma regra do MapLibre)", () => {
  const html = renderCanvas({ locations: [makeLocation({ displayName: "Camila Nunes Prado" })] });
  assert.equal(getInitials("Camila Nunes Prado"), "CP");
  assert.match(html, />CP</);
});

// 5 — OS = LOSANGO por prioridade nas 4 cores do protótipo (+ fallback "média" fora do enum).
test("OS vira losango .opmap-gos colorido por prioridade (4 cores + fallback média)", () => {
  assert.equal(getWorkOrderPriorityColor("low"), WORK_ORDER_PRIORITY_HEX.low);
  assert.equal(getWorkOrderPriorityColor("xpto"), WORK_ORDER_PRIORITY_HEX.medium);
  for (const [priority, hex] of Object.entries(WORK_ORDER_PRIORITY_HEX)) {
    const html = renderCanvas({ workOrderPins: [makePin({ priority: priority as "low" })] });
    assert.match(html, /class="opmap-gos/);
    assert.match(html, new RegExp(`background:${hex}`), `losango sem a cor de ${priority}`);
  }
  // Teardrop da era anterior morreu (o protótipo nunca teve gota).
  assert.doesNotMatch(GOOGLE_SRC, /teardrop/i);
  assert.doesNotMatch(GOOGLE_SRC, /gmp-workorder-pin|gmp-operator-pin/);
});

// 6 — losango selecionado ganha anel; urgente/recém-chegada pulsam (M-5 preservado).
test("losango: selecionado ganha anel e urgente/nova pulsam (M-5 com reduced-motion no hook)", () => {
  const selected = renderCanvas({
    workOrderPins: [makePin({ priority: "medium" })],
    selectedWorkOrderId: "wo-1",
  });
  assert.match(selected, /opmap-gos--selected/);
  const urgent = renderCanvas({ workOrderPins: [makePin({ priority: "urgent" })] });
  assert.match(urgent, /opmap-gos--pulse/);
  const novel = renderCanvas({
    workOrderPins: [makePin({ priority: "low" })],
    pulsingWorkOrderIds: new Set(["wo-1"]),
  });
  assert.match(novel, /opmap-gos--pulse/);
  const calm = renderCanvas({ workOrderPins: [makePin({ priority: "low" })] });
  assert.doesNotMatch(calm, /opmap-gos--pulse/);
});

// 7 — chamado com coordenada 0/0 (não geocodificado) é descartado — nunca a "OS fantasma".
test("pin com coordenada 0/0 é filtrado (isValidMapCoordinate) e não renderiza", () => {
  assert.equal(isValidMapCoordinate(0, 0), false);
  const html = renderCanvas({
    workOrderPins: [makePin({ id: "ok" }), makePin({ id: "zero", latitude: 0, longitude: 0 })],
  });
  assert.equal((html.match(/class="opmap-gos"/g) ?? []).length, 1);
});

// 8 — código da OS só a partir do zoom 12 (espelho do `wo-label` minzoom 12 do MapLibre).
test("código da OS aparece só do zoom 12 para cima (espelho do wo-label minzoom 12)", () => {
  const far = renderCanvas({
    workOrderPins: [makePin({ code: "OS-4242" })],
    initialView: { lat: -15.5, lng: -52.5, z: 4 },
  });
  assert.doesNotMatch(far, /OS-4242</);
  const near = renderCanvas({
    workOrderPins: [makePin({ code: "OS-4242" })],
    initialView: { lat: -23.5, lng: -46.6, z: 14 },
  });
  assert.match(near, /class="opmap-gcode">OS-4242</);
});

// 9 — DIRETIVA (a): NENHUM movimento automático de câmera. O focus-city, o fitBounds e o pan por
//     mudança de seleção morreram; sobra só o `panTarget` (clique explícito do operador).
test("câmera: sem fitBounds/focus-city/cluster; o único movimento é o panTarget explícito", () => {
  for (const dead of [
    "fitBounds",
    "LatLngBounds",
    "pickFocusCluster",
    "clusterByProximity",
    "fitInnerMapToWinner",
    "winnerPointsRef",
    "fittedRef",
    "MarkerClusterer",
  ]) {
    assert.ok(!GOOGLE_SRC.includes(dead), `movimento/agrupamento automático ressuscitado: ${dead}`);
  }
  assert.match(GOOGLE_SRC, /panTarget/);
  assert.equal((GOOGLE_SRC.match(/\.panTo\(/g) ?? []).length, 1); // um único pan, o do panTarget
  // O deslocamento do stack (348px) é aplicado em pixels — o Google não tem padding de câmera.
  assert.match(GOOGLE_SRC, /panBy\(\(padding\.right - padding\.left\) \/ 2/);
});

// 10 — DIRETIVA (b): memória da visão. Câmera inicial = visão salva > Brasil z4 (fonte única do
//      estilo); `idle` é o equivalente do `moveend` e reporta a câmera — o 1º idle (assentamento
//      do mount) e views repetidas são descartados para o savenote não mentir.
test("memória da visão: initialView no mount, default Brasil z4 e `idle` reportando a câmera", () => {
  assert.match(GOOGLE_SRC, /initialViewRef\.current = initialView \?\? DEFAULT_VIEW/);
  assert.match(GOOGLE_SRC, /element\.center = \{ lat: view\.lat, lng: view\.lng \}/);
  assert.match(GOOGLE_SRC, /element\.zoom = view\.z/);
  // Junta PR-2 (ALTA, provada em runtime): React 19 re-invoca ref callback INLINE a cada
  // re-render — sem guard de aplicação única, cada polling/hover estalava a câmera do operador
  // de volta à visão inicial. O flag abaixo é obrigatório.
  assert.match(GOOGLE_SRC, /initialCameraAppliedRef/);
  assert.match(GOOGLE_SRC, /!initialCameraAppliedRef\.current/);
  assert.match(GOOGLE_SRC, /addListener\("idle"/);
  assert.match(GOOGLE_SRC, /onMoveEndRef\.current\?\.\(view\)/);
  assert.match(GOOGLE_SRC, /if \(!settled\)/); // 1º idle ignorado
  assert.match(GOOGLE_SRC, /if \(key === lastKey\) return/); // dedupe
  // O default vem das MESMAS constantes do MapLibre (Brasil z4), não de um hex/centro solto.
  assert.match(GOOGLE_SRC, /OPERATIONAL_MAP_DEFAULT_CENTER/);
  assert.deepEqual(OPERATIONAL_MAP_DEFAULT_CENTER, [-52.5, -15.5]);
  assert.equal(OPERATIONAL_MAP_DEFAULT_ZOOM, 4);
  // O fallback "São Paulo z12" da era anterior morreu (era um enquadramento inventado).
  assert.doesNotMatch(GOOGLE_SRC, /-46\.633308/);
});

// 11 — rotas tracejadas: Polyline com strokeOpacity 0 + símbolo repetido (padrão oficial de dashed
//      line). Dash/vão derivados da MESMA constante do MapLibre — nada de número mágico paralelo.
test("rotas: Polyline tracejada (strokeOpacity 0 + icons) com dash derivado do WORK_ORDER_ROUTE_DASHARRAY", () => {
  assert.match(GOOGLE_SRC, /new google\.maps\.Polyline\(/);
  assert.match(GOOGLE_SRC, /strokeOpacity: 0,/);
  assert.match(GOOGLE_SRC, /path: "M 0,-1 0,1"/);
  assert.match(GOOGLE_SRC, /WORK_ORDER_ROUTE_DASHARRAY\[0\] \* WORK_ORDER_ROUTE_WIDTH/);
  assert.match(GOOGLE_SRC, /WORK_ORDER_ROUTE_DASHARRAY\[1\] \* WORK_ORDER_ROUTE_WIDTH/);
  assert.match(GOOGLE_SRC, /repeat: `\$\{ROUTE_DASH_PX \+ ROUTE_GAP_PX\}px`/);
  assert.match(GOOGLE_SRC, /WORK_ORDER_ROUTE_COLOR/);
  assert.match(GOOGLE_SRC, /WORK_ORDER_ROUTE_OPACITY/);
  // O dash resultante é o "6 7" do protótipo (2.4×2.5 = 6px de traço, 2.8×2.5 = 7px de vão).
  assert.equal(WORK_ORDER_ROUTE_DASHARRAY[0] * WORK_ORDER_ROUTE_WIDTH, 6);
  assert.equal(WORK_ORDER_ROUTE_DASHARRAY[1] * WORK_ORDER_ROUTE_WIDTH, 7);
  assert.equal(WORK_ORDER_ROUTE_COLOR, "#3b82f6");
  assert.equal(WORK_ORDER_ROUTE_OPACITY, 0.8);
});

// 12 — popup do marker: InfoWindow ancorada no AdvancedMarkerElement com conteúdo React em root
//      dedicado + unmount adiado (leak guard) + fechamento por sinal da página.
test("popup do marker: InfoWindow ancorada + createRoot/unmount + closePopupSignal (sem leak)", () => {
  assert.match(GOOGLE_SRC, /new google\.maps\.InfoWindow\(/);
  assert.match(GOOGLE_SRC, /infoWindow\.open\(\{ map: innerMap, anchor/);
  assert.match(GOOGLE_SRC, /createRoot\(container\)/);
  assert.match(GOOGLE_SRC, /root\.unmount\(\)/);
  assert.match(GOOGLE_SRC, /addListener\("closeclick"/);
  assert.match(GOOGLE_SRC, /closePopupSignal/);
  assert.match(GOOGLE_SRC, /renderWorkOrderPopupRef/);
});

// 13 — DIRETIVA (c): detalhe do técnico por HOVER (efêmero) e por CLIQUE (fixo). O canvas Google
//      chama onHoverTechnician/onSelect igual ao MapLibre — e o hover NÃO move a câmera.
test("hover/clique do técnico: mouseenter/mouseleave chamam onHoverTechnician; gmp-click chama onSelect", () => {
  assert.match(GOOGLE_SRC, /marker\.addEventListener\("mouseenter", handleEnter\)/);
  assert.match(GOOGLE_SRC, /marker\.addEventListener\("mouseleave", handleLeave\)/);
  assert.match(GOOGLE_SRC, /const handleEnter = \(\) => onHover\?\.\(location\)/);
  assert.match(GOOGLE_SRC, /const handleLeave = \(\) => onHover\?\.\(null\)/);
  assert.match(GOOGLE_SRC, /marker\.addEventListener\("gmp-click", handleClick\)/);
  assert.match(GOOGLE_SRC, /const handleClick = \(\) => onSelect\(location\)/);
  // Listeners removidos no unmount (sem leak) — mesma disciplina do MapLibre.
  assert.match(GOOGLE_SRC, /removeEventListener\("mouseenter", handleEnter\)/);
  assert.match(GOOGLE_SRC, /removeEventListener\("mouseleave", handleLeave\)/);
});

// 14 — sem chrome passivo: o header/Chip "Google Maps"/subtítulo saíram (diretiva do dono sobre os
//      objetos do topo) e a legenda continua page-level (D6) — nenhum canvas desenha legenda própria.
test("sem chrome passivo no canvas: nada de header/chip/subtítulo/legenda dentro do mapa", () => {
  const html = renderCanvas({ locations: [makeLocation()], workOrderPins: [makePin()] });
  assert.doesNotMatch(html, /Google Maps/);
  assert.doesNotMatch(html, /no mapa\./); // o antigo subtítulo "N técnicos e M chamados no mapa."
  assert.doesNotMatch(html, /operations-map-legend-footer|operations-map-libre__legend/);
  assert.doesNotMatch(GOOGLE_SRC, /lucide-react/);
  assert.doesNotMatch(GOOGLE_SRC, /<Chip/);
  // Controles: só o zoom no canto inferior direito (o fullscreen saiu junto com o do MapLibre).
  assert.match(GOOGLE_SRC, /zoomControl: true/);
  assert.match(GOOGLE_SRC, /fullscreenControl: false/);
});

// 15 — LGPD §2.8/§12: nenhuma coordenada crua no HTML do canvas nem em log/console.
test("LGPD: canvas Google não imprime coordenada no HTML nem loga posição", () => {
  const html = renderCanvas({
    locations: [makeLocation({ latitude: -25.4284, longitude: -49.2733 })],
    workOrderPins: [makePin({ latitude: -25.43, longitude: -49.27 })],
  });
  assert.doesNotMatch(html, /-25\.4284|-49\.2733|-25\.43|-49\.27/);
  assert.doesNotMatch(GOOGLE_SRC, /console\.[a-z]+\([^)]*(latitude|longitude|coordinates|\blat\b|\blng\b)/i);
});

// 16 — PARIDADE DE CONTRATO: toda prop do canvas MapLibre (menos onInitError, que é o fallback
//      esquemático) existe no espelho Google, e o wrapper repassa as seis novas para os DOIS.
test("paridade de contrato: o espelho Google aceita todas as props do MapLibre e o wrapper repassa", () => {
  const libreProps = propNamesOf(LIBRE_SRC).filter((name) => name !== "onInitError");
  const googleProps = propNamesOf(GOOGLE_SRC);
  for (const prop of libreProps) {
    assert.ok(googleProps.includes(prop), `prop sem espelho no canvas Google: ${prop}`);
  }
  assert.ok(googleProps.includes("loadState")); // única prop exclusiva do Google
  // O wrapper entrega os deltas do protótipo aos dois canvases (o PR-1 só entregava ao MapLibre).
  const googleBlock = /<GoogleMapsCanvas([\s\S]*?)\/>/.exec(WRAPPER_SRC);
  assert.ok(googleBlock, "bloco <GoogleMapsCanvas> não encontrado no wrapper");
  for (const prop of [
    "routes",
    "initialView",
    "onMoveEnd",
    "panTarget",
    "renderWorkOrderPopup",
    "closePopupSignal",
    "onHoverTechnician",
  ]) {
    assert.match(googleBlock![1]!, new RegExp(`${prop}=\\{`), `wrapper não repassa ${prop} ao Google`);
  }
  // O opt-in FICA (custo do SKU tarifado + cartografia do Map ID): decisão registrada no PR-2.
  assert.match(WRAPPER_SRC, /VITE_MAPS_PROVIDER"\) === "google"/);
});
