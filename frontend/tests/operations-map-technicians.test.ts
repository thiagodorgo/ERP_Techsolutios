import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { renderToString } from "react-dom/server";

import { OperationsOperatorList } from "../src/modules/operations/map/components/OperationsOperatorList";
import {
  AVATAR_COLORS,
  buildFieldLocationsFeatureCollection,
  getAvatarColor,
  getFieldLocationGroup,
  getFieldLocationGroupColor,
  getTechnicianBorderColor,
  TECH_GROUP_HEX,
  TECH_STALE_HEX,
} from "../src/modules/operations/map/map/mapMarkers";
import { etaToneForMinutes, formatCompactKm, formatCompactMinutes } from "../src/modules/operations/map/allocation";
import type { FieldLocationItem, FieldLocationStatus } from "../src/modules/operations/map/operations-map.types";

// J-MAPAS-10 (D5/D6) — painel "Técnicos de campo" no formato trow VERBATIM do protótipo + a base
// visual do marcador (avatar AVC estável por id, borda por grupo de status, "antiga" pelo limiar
// de 15 min EXISTENTE). Substitui a tabela + cartões do M-3.

const NOW = new Date("2026-07-20T12:00:00.000Z");

function makeLocation(overrides: Partial<FieldLocationItem> = {}): FieldLocationItem {
  return {
    id: "loc-1",
    operatorId: "op-1",
    userId: "user-1",
    displayName: "Ana Souza",
    status: "available",
    latitude: -23.5,
    longitude: -46.6,
    capturedAt: NOW.toISOString(),
    isStale: false,
    teamName: "Equipe Sul",
    ...overrides,
  };
}

function renderList(props: Partial<Parameters<typeof OperationsOperatorList>[0]> = {}): string {
  return renderToString(
    createElement(OperationsOperatorList, {
      locations: [makeLocation()],
      onOpenDetail: () => undefined,
      now: NOW,
      ...props,
    }),
  );
}

// 1 — grupos de status do protótipo (D-MAPA-PIXEL div. 3): disp/rota/atend/off; unknown cai em off.
test("getFieldLocationGroup: available→disp, on_route→rota, on_site/in_service→atend, resto→off", () => {
  const expectations: Array<[FieldLocationStatus, string]> = [
    ["available", "disp"],
    ["on_route", "rota"],
    ["on_site", "atend"],
    ["in_service", "atend"],
    ["paused", "off"],
    ["offline", "off"],
    ["blocked", "off"],
    ["unknown", "off"],
  ];
  for (const [status, group] of expectations) {
    assert.equal(getFieldLocationGroup(status), group, `status ${status}`);
  }
});

// 2 — cores do protótipo por grupo (rota #3b82f6, atend #a855f7 — divergência 3 registrada).
test("cores de grupo verbatim: disp #22c55e · rota #3b82f6 · atend #a855f7 · off #64748b", () => {
  assert.equal(TECH_GROUP_HEX.disp, "#22c55e");
  assert.equal(TECH_GROUP_HEX.rota, "#3b82f6");
  assert.equal(TECH_GROUP_HEX.atend, "#a855f7");
  assert.equal(TECH_GROUP_HEX.off, "#64748b");
  assert.equal(getFieldLocationGroupColor("on_route"), "#3b82f6");
  assert.equal(getFieldLocationGroupColor("in_service"), "#a855f7");
});

// 3 — borda do marcador: âmbar quando ANTIGA (isStale, limiar existente de 15 min); senão cor do grupo.
test("getTechnicianBorderColor: isStale → âmbar #f59e0b; fresco → cor do grupo de status", () => {
  assert.equal(TECH_STALE_HEX, "#f59e0b");
  assert.equal(getTechnicianBorderColor({ status: "available", isStale: true }), TECH_STALE_HEX);
  assert.equal(getTechnicianBorderColor({ status: "available", isStale: false }), TECH_GROUP_HEX.disp);
  assert.equal(getTechnicianBorderColor({ status: "offline", isStale: false }), TECH_GROUP_HEX.off);
});

// 4 — avatar DETERMINÍSTICO por hash do id (paleta AVC verbatim): mesmo id = mesma cor, sempre;
//     nunca por posição do array (a ordem muda entre refreshes).
test("getAvatarColor: estável por id, dentro da paleta AVC de 10 cores do protótipo", () => {
  assert.equal(AVATAR_COLORS.length, 10);
  assert.deepEqual(AVATAR_COLORS.slice(0, 3), ["#2563eb", "#7c3aed", "#0891b2"]);
  const a1 = getAvatarColor("tech-abc");
  const a2 = getAvatarColor("tech-abc");
  assert.equal(a1, a2); // determinístico
  assert.ok(AVATAR_COLORS.includes(a1));
  // ids diferentes tendem a cores diferentes (hash espalha); ao menos não são todos iguais.
  const distinct = new Set(["a", "b", "c", "d", "e", "f"].map((id) => getAvatarColor(id)));
  assert.ok(distinct.size > 1);
});

// 5 — as props do GeoJSON carregam avatarColor/borderColor/group/off (o canvas pinta SÓ por props).
test("feature do técnico carrega avatarColor + borderColor + group + off (fonte única)", () => {
  const fc = buildFieldLocationsFeatureCollection(
    [
      makeLocation({ id: "a", status: "available" }),
      makeLocation({ id: "b", status: "offline" }),
      makeLocation({ id: "c", status: "on_route", isStale: true }),
    ],
    undefined,
    NOW.getTime(),
  );
  const byId = new Map(fc.features.map((feature) => [feature.properties.id, feature.properties]));
  assert.equal(byId.get("a")!.avatarColor, getAvatarColor("a"));
  assert.equal(byId.get("a")!.borderColor, TECH_GROUP_HEX.disp);
  assert.equal(byId.get("a")!.off, false);
  assert.equal(byId.get("b")!.group, "off");
  assert.equal(byId.get("b")!.off, true);
  assert.equal(byId.get("c")!.borderColor, TECH_STALE_HEX); // antiga vence o grupo na borda
});

// 6 — trow verbatim: dot com a cor do grupo, nome, selo "antiga", visto (sem OS selecionada).
test("trow: dot na cor do grupo, nome, selo 'antiga' e 'há X' sem OS selecionada", () => {
  const stale = new Date(NOW.getTime() - 20 * 60_000).toISOString();
  const html = renderList({
    locations: [
      makeLocation({ id: "a", displayName: "Diego Ferreira", status: "available" }),
      makeLocation({ id: "b", displayName: "Otávio Lima", status: "offline", capturedAt: stale, isStale: true }),
    ],
  });
  assert.match(html, /opmap-trow/);
  assert.match(html, /Diego Ferreira/);
  assert.match(html, new RegExp(`background:${TECH_GROUP_HEX.disp}`));
  assert.match(html, /opmap-trow__old/);
  assert.match(html, />antiga</);
  assert.match(html, new RegExp(`background:${TECH_STALE_HEX}`)); // dot âmbar para antiga
  assert.match(html, /há 20 min/); // visto real (formatLastSeen)
  assert.match(html, /opmap-trow off|opmap-trow" |class="opmap-trow/); // linha off esmaecida presente
  assert.match(html, /class="opmap-trow off"/);
});

// 7 — fchips verbatim (Todos/Ativos/Fora de serviço) + select com as 4 ordenações do protótipo.
test("filtros do painel: fchips Todos/Ativos/Fora de serviço + select Distância/Tempo/Nome/Status", () => {
  const html = renderList();
  assert.match(html, />Todos</);
  assert.match(html, />Ativos</);
  assert.match(html, />Fora de serviço</);
  for (const option of ["Distância", "Tempo", "Nome", "Status"]) {
    assert.ok(html.includes(`>${option}<`), `opção ausente: ${option}`);
  }
  // Sem permissão de alocar, a 5ª opção (índice) NÃO aparece.
  assert.doesNotMatch(html, /Índice de conclusão/);
});

// 8 — "Índice de conclusão" (feature J-MAPAS-7 preservada) só aparece para quem PODE alocar.
test("select ganha 'Índice de conclusão' apenas com canAllocate (gating por field_dispatch:create)", () => {
  const html = renderList({ canAllocate: true });
  assert.match(html, /Índice de conclusão/);
});

// 9 — SELEÇÃO→ALOCAR: com OS selecionada + permissão, cada linha ganha "Alocar" e a célula km/min
//     honesta (bold, tom good ≤15/mid ≤40); linha off tem o botão desabilitado.
test("os-selected: botão Alocar por linha + '~km · ~min' com tons good/mid; off desabilitado", () => {
  const html = renderList({
    locations: [
      makeLocation({ id: "perto", displayName: "Perto", latitude: -23.51, longitude: -46.6 }),
      makeLocation({ id: "medio", displayName: "Medio", latitude: -23.62, longitude: -46.6 }),
      makeLocation({ id: "off", displayName: "Longe Off", status: "offline", latitude: -23.9, longitude: -46.6 }),
    ],
    canAllocate: true,
    selectedCallId: "wo-1",
    selectedCallCoordinate: { lat: -23.5, lng: -46.6 },
  });
  assert.match(html, />Alocar</);
  assert.match(html, /opmap-trow__eta good/); // ~1.1km → ~2min (good)
  assert.match(html, /opmap-trow__eta mid/); // ~13km → ~29min (mid)
  assert.match(html, /~\d+(,\d+)? km/);
  assert.match(html, /~\d+ min/);
  assert.match(html, /disabled/); // off não recebe
});

// 10 — SEM permissão (field_dispatch:create): nenhum botão Alocar, mesmo com OS selecionada.
test("gating: sem canAllocate não há botão Alocar nem com OS selecionada", () => {
  const html = renderList({
    canAllocate: false,
    selectedCallId: "wo-1",
    selectedCallCoordinate: { lat: -23.5, lng: -46.6 },
  });
  assert.doesNotMatch(html, />Alocar</);
});

// 11 — formatadores compactos honestos: "~1,2 km"/"~30 min" (disclaimer vive na barra da legenda)
//      e limiares visuais good ≤15 / mid ≤40 sobre a NOSSA estimativa (28 km/h).
test("formatCompactKm/Minutes honestos + etaToneForMinutes (good ≤15, mid ≤40, far acima)", () => {
  assert.equal(formatCompactKm(1.23), "~1,2 km");
  assert.equal(formatCompactKm(120), "~120 km");
  assert.equal(formatCompactKm(null), "—");
  assert.equal(formatCompactMinutes(7), "~15 min"); // 7 km a 28 km/h
  assert.equal(formatCompactMinutes(null), "—");
  assert.equal(etaToneForMinutes(10), "good");
  assert.equal(etaToneForMinutes(15), "good");
  assert.equal(etaToneForMinutes(16), "mid");
  assert.equal(etaToneForMinutes(40), "mid");
  assert.equal(etaToneForMinutes(41), "far");
});

// 12 — empty verbatim + LGPD: linha nunca expõe coordenada crua.
test("empty 'Nenhum técnico neste filtro' + nenhuma coordenada crua no HTML do painel", () => {
  const empty = renderList({ locations: [] });
  assert.match(empty, /Nenhum técnico neste filtro/);
  const html = renderList({
    canAllocate: true,
    selectedCallId: "wo-1",
    selectedCallCoordinate: { lat: -23.5, lng: -46.6 },
  });
  assert.doesNotMatch(html, /-23\.5|-46\.6|latitude|longitude/i);
});

// 13 — a11y: linha inteira é botão com aria-label "Abrir detalhes de {nome}" (abre o popover).
test("a11y: cada trow expõe botão 'Abrir detalhes de {nome}' (caminho de teclado para o popover)", () => {
  const html = renderList({ locations: [makeLocation({ displayName: "Ana Souza" })] });
  assert.match(html, /aria-label="Abrir detalhes de Ana Souza"/);
});
