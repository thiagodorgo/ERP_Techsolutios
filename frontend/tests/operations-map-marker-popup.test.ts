import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { renderToString } from "react-dom/server";

import { OperationsOsMarkerPopup } from "../src/modules/operations/map/components/OperationsOsMarkerPopup";
import { buildAllocationCandidates } from "../src/modules/operations/map/allocation";
import { getFieldLocationGroup, TECH_GROUP_HEX } from "../src/modules/operations/map/map/mapMarkers";
import type { FieldLocationItem, OperationsMapWorkOrderPin } from "../src/modules/operations/map/operations-map.types";

// J-MAPAS-10 (D5.2) — POPUP do marker de OS (verbatim do protótipo): título "{código} —
// {prioridade}", sub "{cliente} · {endereço}", 3 técnicos REAIS mais próximos (exclui "off",
// km asc, slice 3) com dot/nome/eta/Alocar; OS em atendimento → "Em atendimento por {nome}".
// Adição registrada: "Abrir OS". LGPD: NENHUMA coordenada crua no HTML.

const NOW = new Date("2026-07-20T12:00:00.000Z");
const PAGE_SRC = readFileSync(
  fileURLToPath(new URL("../src/modules/operations/map/pages/OperationsMapPage.tsx", import.meta.url)),
  "utf8",
);

function makeLocation(overrides: Partial<FieldLocationItem> = {}): FieldLocationItem {
  return {
    id: "loc-1",
    operatorId: "op-1",
    userId: "user-1",
    displayName: "Diego Ferreira",
    status: "available",
    latitude: -25.4284,
    longitude: -49.2733,
    capturedAt: NOW.toISOString(),
    isStale: false,
    ...overrides,
  };
}

function makePin(overrides: Partial<OperationsMapWorkOrderPin> = {}): OperationsMapWorkOrderPin {
  return {
    id: "wo-101",
    code: "OS-2026-0101",
    title: "Guincho",
    priority: "urgent",
    status: "open",
    customerName: "Indústria Alfa Ltda",
    serviceAddress: "CIC, Curitiba - PR",
    latitude: -25.475,
    longitude: -49.348,
    ...overrides,
  };
}

const TECHS = [
  makeLocation({ id: "t1", userId: "u1", displayName: "Diego Ferreira", latitude: -25.4284, longitude: -49.2733 }),
  makeLocation({ id: "t2", userId: "u2", displayName: "Ana Beatriz Rocha", latitude: -25.443, longitude: -49.292 }),
  makeLocation({ id: "t3", userId: "u3", displayName: "Rafael Mendes", latitude: -25.452, longitude: -49.228 }),
  makeLocation({ id: "t4", userId: "u4", displayName: "Camila Nunes", latitude: -25.493, longitude: -49.245, status: "in_service" }),
];

// Candidatos como a PÁGINA monta: buildAllocationCandidates real, exclui "off", km asc, slice 3.
function nearestCandidates(pin: OperationsMapWorkOrderPin, locations: readonly FieldLocationItem[]) {
  return buildAllocationCandidates(
    locations.filter((location) => getFieldLocationGroup(location.status) !== "off"),
    { lat: pin.latitude, lng: pin.longitude },
    new Map(),
    NOW.getTime(),
  )
    .filter((candidate) => candidate.distanceKm !== null)
    .sort((a, b) => a.distanceKm! - b.distanceKm!)
    .slice(0, 3);
}

function renderPopup(props: Partial<Parameters<typeof OperationsOsMarkerPopup>[0]> = {}): string {
  const pin = makePin();
  return renderToString(
    createElement(OperationsOsMarkerPopup, {
      pin,
      phase: "rec",
      candidates: nearestCandidates(pin, TECHS),
      canAllocate: true,
      onAllocate: () => undefined,
      onOpenWorkOrder: () => undefined,
      ...props,
    }),
  );
}

// 1 — cabeçalho verbatim: "{código} — {prioridade}" + sub "{cliente} · {endereço}".
test("popup: título '{código} — {prioridade}' e sub '{cliente} · {endereço}'", () => {
  const html = renderPopup();
  assert.match(html, /OS-2026-0101/);
  assert.match(html, /— (<!-- -->)?Urgente/);
  assert.match(html, /Indústria Alfa Ltda/);
  assert.match(html, /· CIC, Curitiba - PR/);
});

// 2 — chamado RECEBIDO: exatamente os 3 mais próximos REAIS (km asc; grupo off excluído), com dot
//     de status + nome + "~km · ~min" + Alocar por linha.
test("rec: 3 mais próximos reais (off excluído, km asc) com dot/nome/~km · ~min/Alocar", () => {
  const withOff = [...TECHS, makeLocation({ id: "t5", userId: "u5", displayName: "Otávio Lima", status: "offline", latitude: -25.47, longitude: -49.34 })];
  const pin = makePin();
  const candidates = nearestCandidates(pin, withOff);
  assert.equal(candidates.length, 3); // slice 3
  assert.ok(!candidates.some((c) => c.location.displayName === "Otávio Lima"), "grupo off nunca entra");
  // km asc: cada candidato seguinte é mais distante ou igual.
  for (let i = 1; i < candidates.length; i += 1) {
    assert.ok(candidates[i]!.distanceKm! >= candidates[i - 1]!.distanceKm!);
  }
  const html = renderToString(
    createElement(OperationsOsMarkerPopup, {
      pin,
      phase: "rec",
      candidates,
      canAllocate: true,
      onAllocate: () => undefined,
      onOpenWorkOrder: () => undefined,
    }),
  );
  assert.match(html, /~\d+(,\d+)? km/);
  assert.match(html, /~\d+ min/);
  assert.match(html, />Alocar</);
  assert.match(html, new RegExp(`background:${TECH_GROUP_HEX.disp}`)); // dot verde de disponível
});

// 3 — OS EM ATENDIMENTO: "Em atendimento por {nome}" (sem lista de candidatos, sem Alocar).
test("atd: 'Em atendimento por {nome}' no lugar dos candidatos", () => {
  const html = renderPopup({ phase: "atd", technicianName: "Camila Nunes", candidates: [] });
  assert.match(html, /Em atendimento por/);
  assert.match(html, /Camila Nunes/);
  assert.doesNotMatch(html, />Alocar</);
});

// 4 — GATING: sem field_dispatch:create o popup é SÓ informativo (sem botão Alocar).
test("sem canAllocate: popup informativo, sem Alocar (Abrir OS permanece)", () => {
  const html = renderPopup({ canAllocate: false });
  assert.doesNotMatch(html, />Alocar</);
  assert.match(html, /Abrir OS/);
});

// 5 — ação "Abrir OS" (migra o painel do pin removido): clique chama onOpenWorkOrder(id); a página
//     navega para a OS (o popup vive fora do Router num root próprio).
test("'Abrir OS' chama onOpenWorkOrder com o id da OS; página navega via useNavigate", () => {
  const opened: string[] = [];
  const pin = makePin();
  const tree = OperationsOsMarkerPopup({
    pin,
    phase: "rec",
    candidates: [],
    canAllocate: false,
    onAllocate: () => undefined,
    onOpenWorkOrder: (id) => opened.push(id),
  }) as unknown;
  const findButtons = (node: unknown, acc: Array<{ props: Record<string, unknown> }> = []) => {
    if (!node || typeof node !== "object") return acc;
    if (Array.isArray(node)) {
      for (const child of node) findButtons(child, acc);
      return acc;
    }
    const element = node as { type?: unknown; props?: Record<string, unknown> };
    if (element.type === "button") acc.push(element as { props: Record<string, unknown> });
    if (element.props && "children" in element.props) findButtons(element.props.children, acc);
    return acc;
  };
  const buttons = findButtons(tree);
  assert.equal(buttons.length, 1); // só Abrir OS (sem Alocar sem permissão)
  (buttons[0]!.props.onClick as () => void)();
  assert.deepEqual(opened, ["wo-101"]);
  assert.match(PAGE_SRC, /onOpenWorkOrder=\{\(id\) => navigate\(`\/work-orders\/\$\{id\}`\)\}/);
});

// 6 — Alocar em curso: linha pendente mostra "Alocando…" e desabilita (feedback real, sem dublê).
test("alocação pendente: botão vira 'Alocando…' e desabilita para o operatorUserId em curso", () => {
  const pin = makePin();
  const candidates = nearestCandidates(pin, TECHS);
  const html = renderToString(
    createElement(OperationsOsMarkerPopup, {
      pin,
      phase: "rec",
      candidates,
      canAllocate: true,
      pendingOperatorUserId: candidates[0]!.operatorUserId,
      onAllocate: () => undefined,
      onOpenWorkOrder: () => undefined,
    }),
  );
  assert.match(html, /Alocando…/);
  assert.match(html, /disabled/);
});

// 7 — LGPD §12: NENHUMA coordenada crua no HTML do popup (só ~km/~min derivados).
test("LGPD: popup não expõe lat/lng cru", () => {
  const html = renderPopup();
  assert.doesNotMatch(html, /-25\.4|-49\.2|-49\.3|latitude|longitude/i);
});

// 8 — página fornece o conteúdo ao canvas (renderWorkOrderPopup) e fecha por sinal na alocação.
test("página: renderWorkOrderPopup ligado ao canvas + closePopupSignal na alocação/Esc", () => {
  assert.match(PAGE_SRC, /renderWorkOrderPopup=\{renderWorkOrderPopup\}/);
  assert.match(PAGE_SRC, /closePopupSignal=\{closePopupSignal\}/);
  assert.match(PAGE_SRC, /setClosePopupSignal\(\(value\) => value \+ 1\)/);
  // Candidatos do popup = buildAllocationCandidates REAL (exclui off, km asc, slice 3).
  assert.match(PAGE_SRC, /buildAllocationCandidates\(/);
  assert.match(PAGE_SRC, /\.slice\(0, 3\)/);
});
