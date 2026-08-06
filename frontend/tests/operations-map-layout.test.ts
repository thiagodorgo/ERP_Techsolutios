import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { renderToString } from "react-dom/server";

import { OperationsMapPanelsStack } from "../src/modules/operations/map/components/OperationsMapPanelsStack";
import { OperationsIncomingCallsList } from "../src/modules/operations/map/components/OperationsIncomingCallsList";
import { OperationsInServiceList } from "../src/modules/operations/map/components/OperationsInServiceList";
import type { OperationsInServiceCall, OperationsIncomingCall } from "../src/modules/operations/map/operations-map.types";

// J-MAPAS-10 (PLANO-MAPA-PIXEL, PR-1) — LAYOUT pixel do protótipo do dono: stage full-viewport,
// STACK de 3 painéis de vidro navy à direita (348px, tokens §8 verbatim), pills de colapso,
// savenote e hint da legenda. O modelo J-MAPAS-6 (page-heading + SummaryCards + Filters + rails
// esquerda/direita + faixa de detalhe) MORREU por decisão do dono (D-MAPA-PIXEL).

const SRC = new URL("../src/modules/operations/map/", import.meta.url);
const CSS = readFileSync(fileURLToPath(new URL("../src/styles/app.css", import.meta.url)), "utf8");
const PAGE = readFileSync(fileURLToPath(new URL("pages/OperationsMapPage.tsx", SRC)), "utf8");
const STACK = readFileSync(fileURLToPath(new URL("components/OperationsMapPanelsStack.tsx", SRC)), "utf8");

function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = CSS.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `regra CSS não encontrada: ${selector}`);
  return match![1];
}

const SAMPLE_CALLS: OperationsIncomingCall[] = [
  {
    id: "wo-1",
    code: "OS-1",
    title: "Guincho",
    priority: "urgent",
    customerName: "Cliente A",
    serviceAddress: "CIC, Curitiba - PR",
    scheduledFor: null,
    createdAt: "2026-07-19T11:00:00.000Z",
    slaDueAt: null,
    hasLocation: true,
  },
];

const SAMPLE_ATD: OperationsInServiceCall[] = [
  {
    id: "wo-9",
    code: "OS-9",
    title: "Reboque",
    priority: "high",
    customerName: "Hospital Santa Clara",
    technicianName: "Camila Nunes",
    hasLocation: true,
  },
];

function renderStack(overrides: Partial<Parameters<typeof OperationsMapPanelsStack>[0]> = {}): string {
  return renderToString(
    createElement(OperationsMapPanelsStack, {
      calls: createElement(OperationsIncomingCallsList, {
        calls: SAMPLE_CALLS,
        onSelect: () => undefined,
        now: new Date("2026-07-19T12:00:00.000Z"),
      }),
      inService: createElement(OperationsInServiceList, { calls: SAMPLE_ATD, onPan: () => undefined }),
      technicians: createElement("div", null, "TECHS_SLOT"),
      recCount: 1,
      atdCount: 1,
      tecCount: 3,
      ...overrides,
    }),
  );
}

// 1 — stage full-viewport: position relative + isolation + altura por viewport; o mapa é absolute inset 0.
test("stage é full-viewport (relative/isolate/altura por vh) e o slot do mapa cobre inset:0", () => {
  const stage = ruleBody(".opmap-stage");
  assert.match(stage, /position:\s*relative/);
  assert.match(stage, /isolation:\s*isolate/);
  assert.match(stage, /flex:\s*1 1 auto/);
  const mapSlot = ruleBody(".opmap-stage__map");
  assert.match(mapSlot, /position:\s*absolute/);
  assert.match(mapSlot, /inset:\s*0/);
});

// 2 — STACK verbatim §8: width 348, top 12, right 12, bottom 30, gap 8, à direita do mapa.
test("stack de painéis: 348px, top/right 12, bottom 30, gap 8 (tokens verbatim do protótipo)", () => {
  const stack = ruleBody(".opmap-stack");
  assert.match(stack, /width:\s*348px/);
  assert.match(stack, /top:\s*12px/);
  assert.match(stack, /right:\s*12px/);
  assert.match(stack, /bottom:\s*30px/);
  assert.match(stack, /gap:\s*8px/);
  assert.match(stack, /position:\s*absolute/);
});

// 3 — painel de VIDRO NAVY verbatim: rgba(13,21,38,0.78) + blur 12 + radius 12 + borda 18% + sombra.
test("painel de vidro navy: bg rgba(13,21,38,0.78), blur(12px), radius 12, borda rgba(148,163,184,0.18)", () => {
  const panel = ruleBody(".opmap-panel");
  assert.match(panel, /background:\s*rgb\(13 21 38 \/ 78%\)/);
  assert.match(panel, /backdrop-filter:\s*blur\(12px\)/);
  assert.match(panel, /border-radius:\s*12px/);
  assert.match(panel, /border:\s*1px solid rgb\(148 163 184 \/ 18%\)/);
  assert.match(panel, /box-shadow:\s*0 8px 28px rgb\(2 6 23 \/ 45%\)/);
  // Fallback honesto sem backdrop-filter (navy quase opaco).
  assert.match(CSS, /@supports not \(\(backdrop-filter: blur\(1px\)\)/);
});

// 4 — phead/cnt/pbody com as medidas do protótipo (9px 12px · 12.5px · cnt azul · pbody 8/6).
test("phead 9px 12px + título 12.5px + cnt azul 99px; pbody padding 8 gap 6 com scrollbar fina", () => {
  const phead = ruleBody(".opmap-phead");
  assert.match(phead, /padding:\s*9px 12px/);
  assert.match(ruleBody(".opmap-phead b"), /font-size:\s*12\.5px/);
  const cnt = ruleBody(".opmap-cnt");
  assert.match(cnt, /background:\s*rgb\(59 130 246 \/ 22%\)/);
  assert.match(cnt, /color:\s*#93c5fd/);
  assert.match(cnt, /border-radius:\s*99px/);
  const pbody = ruleBody(".opmap-pbody");
  assert.match(pbody, /padding:\s*8px/);
  assert.match(pbody, /gap:\s*6px/);
  assert.match(CSS, /\.opmap-pbody::-webkit-scrollbar\s*\{[^}]*width:\s*6px/);
});

// 5 — os 3 painéis renderizam com os TÍTULOS VERBATIM e contadores reais; colapso acessível.
test("títulos verbatim (Chamados recebidos / Em Atendimento / Técnicos de campo) + cnt real + botão recolher acessível", () => {
  const html = renderStack();
  assert.match(html, /Chamados recebidos/);
  assert.match(html, /Em Atendimento/);
  assert.match(html, /Técnicos de campo/);
  assert.match(html, /aria-expanded="true"/);
  assert.match(html, /title="Recolher"/);
  assert.match(html, />—</); // botão de recolher do protótipo
  assert.match(html, /aria-label="Recolher Chamados recebidos"/);
  // contadores reais (não fabricados): 1 rec, 1 atd, 3 técnicos
  assert.match(html, />3</);
});

// 6 — pills verbatim ("🛠 Atendimento" · "📥 Recebidas" · "👤 Técnicos") no CSS + fonte do componente.
test("pills de colapso: labels verbatim no componente + estilo de pílula (radius 99, 11.5px/600)", () => {
  assert.match(STACK, /🛠 Atendimento/);
  assert.match(STACK, /📥 Recebidas/);
  assert.match(STACK, /👤 Técnicos/);
  const pill = ruleBody(".opmap-pill");
  assert.match(pill, /border-radius:\s*99px/);
  assert.match(pill, /padding:\s*6px 12px/);
  assert.match(pill, /font-size:\s*11\.5px/);
  assert.match(pill, /font-weight:\s*600/);
});

// 7 — gating §2/RBAC: sem work_orders:read os DOIS painéis de OS somem; o de técnicos permanece.
test("sem work_orders:read: painéis Recebidas/Em Atendimento não renderizam; Técnicos permanece", () => {
  const html = renderStack({ showWorkOrderPanels: false });
  assert.doesNotMatch(html, /Chamados recebidos/);
  assert.doesNotMatch(html, /Em Atendimento/);
  assert.match(html, /Técnicos de campo/);
});

// 8 — card de OS verbatim: borda-esquerda 3px por prioridade, radius 9, bg, seleção com anel azul.
test("card .opmap-os: border-left 3px por prioridade, radius 9, seleção box-shadow azul, dragging .45", () => {
  const os = ruleBody(".opmap-os");
  assert.match(os, /border-left:\s*3px solid/);
  assert.match(os, /border-radius:\s*9px/);
  assert.match(os, /background:\s*rgb\(30 41 59 \/ 50%\)/);
  assert.match(CSS, /\.opmap-os\.p-urgente\s*\{\s*border-left-color:\s*#ef4444/);
  assert.match(CSS, /\.opmap-os\.p-media\s*\{\s*border-left-color:\s*#38bdf8/);
  const sel = ruleBody(".opmap-os.sel");
  assert.match(sel, /box-shadow:\s*0 0 0 1px #3b82f6/);
  assert.match(sel, /background:\s*rgb\(37 99 235 \/ 18%\)/);
  assert.match(ruleBody(".opmap-os.dragging"), /opacity:\s*0\.45/);
});

// 9 — savenote verbatim (verde, top 48/right 376, fade) + hint da legenda verbatim.
test("savenote '✓ Visão do mapa salva' (posição/cores verbatim) e hint 'Esc limpa a seleção · arraste…'", () => {
  const savenote = ruleBody(".opmap-savenote");
  assert.match(savenote, /top:\s*48px/);
  assert.match(savenote, /right:\s*376px/);
  assert.match(savenote, /background:\s*rgb\(34 197 94 \/ 16%\)/);
  assert.match(savenote, /color:\s*#4ade80/);
  assert.match(PAGE, /✓ Visão do mapa salva/);
  const legendFooterSrc = readFileSync(
    fileURLToPath(new URL("components/OperationsMapLegendFooter.tsx", SRC)),
    "utf8",
  );
  assert.match(legendFooterSrc, /Esc limpa a seleção · arraste uma OS até um técnico para alocar/);
});

// 10 — a PÁGINA supersede o modelo antigo: sem page-heading/SummaryCards/Filters/Stage/rails; monta
//      stage + chips + stack + legenda-filtro + popover + toast; deep-link ?workOrderId preservado.
test("página: modelo antigo removido (heading/SummaryCards/Filters/Stage) e composição nova completa", () => {
  for (const dead of [
    "OperationsMapSummaryCards",
    "OperationsMapFilters",
    "OperationsMapStage",
    "OperationsOperatorDetailPanel",
    "OperationsWorkOrderPinPanel",
    "OperationsWorkOrdersWithoutLocationPanel",
    "OperationsCallAllocationPopup",
    "OperationsTechnicianAllocationPopup",
    "page-heading",
  ]) {
    assert.ok(!PAGE.includes(dead), `resíduo do modelo antigo na página: ${dead}`);
  }
  for (const alive of [
    "OperationsMapPanelsStack",
    "OperationsMapLegendFooter",
    "OperationsTechnicianDetailPopover",
    "OperationsAllocationToast",
    "OperationsOsMarkerPopup",
    "useLegendFilter",
    "useMapViewMemory",
    "workOrderId",
    "opmap-stage",
  ]) {
    assert.ok(PAGE.includes(alive), `composição nova ausente na página: ${alive}`);
  }
});

// 11 — preservação Ω1/M-5: SSE/poll (useOperationsMap), alerta de OS nova e estados obrigatórios.
test("página preserva useOperationsMap + useNewWorkOrderAlert + estados (skeleton/empty/erro §7)", () => {
  for (const marker of [
    "useOperationsMap",
    "useNewWorkOrderAlert",
    "Skeleton",
    "EmptyState",
    "Nenhum técnico ou chamado no mapa",
    "Tentar novamente", // banner honesto de erro (só quando o carregamento falha)
  ]) {
    if (marker === "Tentar novamente") {
      const chips = readFileSync(fileURLToPath(new URL("components/OperationsMapChips.tsx", SRC)), "utf8");
      assert.ok(chips.includes(marker), `banner de retry ausente: ${marker}`);
      continue;
    }
    assert.ok(PAGE.includes(marker), `marcador de preservação ausente: ${marker}`);
  }
});

// 12 — CSS antigo do modelo J-MAPAS-6 saiu de cena (sem regras órfãs de rails/kpis/alloc).
test("CSS: classes do modelo antigo (rails/kpis/filters/alloc/detail) não existem mais", () => {
  for (const dead of [
    ".operations-map-rail {",
    ".operations-map-kpis {",
    ".operations-map-filters {",
    ".operations-alloc-dialog {",
    ".operations-map-stage {",
    ".operations-operator-detail {",
    ".operations-calls-list {",
  ]) {
    assert.ok(!CSS.includes(dead), `regra morta ainda no CSS: ${dead}`);
  }
});
