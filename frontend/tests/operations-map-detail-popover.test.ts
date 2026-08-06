import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { OperationsTechnicianDetailPopover } from "../src/modules/operations/map/components/OperationsTechnicianDetailPopover";
import { getAvatarColor, TECH_GROUP_HEX } from "../src/modules/operations/map/map/mapMarkers";
import type { FieldLocationItem } from "../src/modules/operations/map/operations-map.types";

// J-MAPAS-10 — DETAIL POPOVER do técnico (verbatim): header av+nome+"{equipe} · {status}", aviso
// âmbar de localização antiga e grade 2×3 (Status · Último visto · Bateria · Precisão ·
// Coordenadas · OS atual). LGPD/plano §6(e): a coordenada numérica aparece SOMENTE AQUI.

const NOW = new Date("2026-07-20T12:00:00.000Z");
const SRC = new URL("../src/modules/operations/map/", import.meta.url);
const POPOVER_SRC = readFileSync(fileURLToPath(new URL("components/OperationsTechnicianDetailPopover.tsx", SRC)), "utf8");
const PAGE_SRC = readFileSync(fileURLToPath(new URL("pages/OperationsMapPage.tsx", SRC)), "utf8");
const CSS = readFileSync(fileURLToPath(new URL("../src/styles/app.css", import.meta.url)), "utf8");

function makeLocation(overrides: Partial<FieldLocationItem> = {}): FieldLocationItem {
  return {
    id: "loc-1",
    operatorId: "op-1",
    userId: "user-1",
    displayName: "Diego Ferreira",
    teamName: "Equipe Sul",
    status: "available",
    latitude: -25.4284,
    longitude: -49.2733,
    accuracyMeters: 9,
    batteryLevel: 84,
    capturedAt: new Date(NOW.getTime() - 2 * 60_000).toISOString(),
    isStale: false,
    ...overrides,
  };
}

function renderPopover(props: Partial<Parameters<typeof OperationsTechnicianDetailPopover>[0]> = {}): string {
  return renderToString(
    createElement(
      MemoryRouter,
      null,
      createElement(OperationsTechnicianDetailPopover, {
        location: makeLocation(),
        onClose: () => undefined,
        now: NOW,
        ...props,
      }),
    ),
  );
}

// 1 — as 6 CÉLULAS VERBATIM da grade 2×3 do protótipo.
test("grade 2×3 com os rótulos verbatim: Status · Último visto · Bateria · Precisão · Coordenadas · OS atual", () => {
  const html = renderPopover();
  for (const label of ["Status", "Último visto", "Bateria", "Precisão", "Coordenadas", "OS atual"]) {
    assert.ok(html.includes(`>${label}<`), `célula ausente: ${label}`);
  }
  assert.match(html, /84%/); // bateria real
  assert.match(html, /9 m/); // precisão real
  assert.match(html, /há 2 min/); // último visto real
});

// 2 — header verbatim: avatar AVC estável + nome + "{equipe} · {status REAL}" + ✕ acessível.
test("header: avatar na cor AVC do id, nome, 'Equipe Sul · Disponível' e botão ✕", () => {
  const html = renderPopover();
  assert.match(html, /Diego Ferreira/);
  assert.match(html, /Equipe Sul(<!-- -->)? · (<!-- -->)?Disponível/);
  assert.match(html, new RegExp(`background:${getAvatarColor("loc-1")}`));
  assert.match(html, /aria-label="Fechar detalhes do técnico"/);
  assert.match(html, /✕/);
});

// 3 — COORDENADAS: aparecem SÓ AQUI, no formato do protótipo (5 casas, "lat, lng").
test("coordenadas com 5 casas no formato '{lat}, {lng}' — única superfície com coordenada", () => {
  const html = renderPopover();
  assert.match(html, /-25\.42840(<!-- -->)?, (<!-- -->)?-49\.27330/);
  // O popover NÃO loga coordenada (LGPD: exibir aqui é paridade com o protótipo; log jamais).
  assert.doesNotMatch(POPOVER_SRC, /console\./);
});

// 4 — aviso de LOCALIZAÇÃO ANTIGA (dwarn) SÓ quando isStale; copy verbatim do protótipo.
test("dwarn só para posição antiga: '⚠ Localização antiga — última posição {visto}. Confirme…'", () => {
  const fresh = renderPopover();
  assert.doesNotMatch(fresh, /Localização antiga —/);
  const staleHtml = renderPopover({
    location: makeLocation({ isStale: true, capturedAt: new Date(NOW.getTime() - 23 * 60_000).toISOString() }),
  });
  assert.match(
    staleHtml,
    /⚠ Localização antiga — última posição (<!-- -->)?há 23 min(<!-- -->)?\. Confirme por despacho ou contato direto\./,
  );
  // Status colorido âmbar quando antiga (borda do marcador idem — fonte única).
  assert.match(staleHtml, /#f59e0b/);
});

// 5 — "OS atual": link para a OS quando resolvida; "—" honesto sem vínculo (nunca inventa).
test("OS atual: link /work-orders/{id} quando existe; '—' sem vínculo", () => {
  const withOs = renderPopover({ currentWorkOrder: { id: "wo-9", code: "OS-2026-0096" } });
  assert.match(withOs, /OS-2026-0096/);
  assert.match(withOs, /href="\/work-orders\/wo-9"/);
  const without = renderPopover({ currentWorkOrder: null });
  assert.match(without, />—</);
});

// 6 — status REAL preservado (rótulo "Pausado" etc.) colorido pelo GRUPO do mapa (div. 3).
test("status real no rótulo (Pausado) com a cor do grupo 'off' do mapa", () => {
  const html = renderPopover({ location: makeLocation({ status: "paused" }) });
  assert.match(html, /Pausado/);
  assert.match(html, new RegExp(TECH_GROUP_HEX.off));
});

// 7 — CSS verbatim: 270px, right 372, top 64, blur 14, grade 2 colunas gap 1px, células navy.
test("CSS do popover: width 270 / right 372 / top 64 / blur(14px) / grade 1fr 1fr gap 1px", () => {
  const detail = CSS.match(/(?:^|\n)\.opmap-detail\s*\{([^}]*)\}/);
  assert.ok(detail);
  assert.match(detail![1], /width:\s*270px/);
  assert.match(detail![1], /right:\s*372px/);
  assert.match(detail![1], /top:\s*64px/);
  assert.match(detail![1], /backdrop-filter:\s*blur\(14px\)/);
  const grid = CSS.match(/(?:^|\n)\.opmap-detail__dg\s*\{([^}]*)\}/);
  assert.ok(grid);
  assert.match(grid![1], /grid-template-columns:\s*1fr 1fr/);
  assert.match(grid![1], /gap:\s*1px/);
});

// 8 — página: abre no clique da linha/marker, fecha no ✕ e no Esc (atalho verbatim).
test("página: popover abre por openTechnicianDetail e Esc limpa seleção + fecha popover", () => {
  assert.match(PAGE_SRC, /openTechnicianDetail/);
  assert.match(PAGE_SRC, /onOpenDetail=\{openTechnicianDetail\}/);
  assert.match(PAGE_SRC, /onSelect=\{openTechnicianDetail\}/); // marker do técnico
  assert.match(PAGE_SRC, /event\.key !== "Escape"/);
  assert.match(PAGE_SRC, /setDetailId\(undefined\)/);
  // Diretiva do dono (2026-08-06): o detalhe abre por HOVER (efêmero) e por CLIQUE (fixo, fecha
  // manual). O fechamento passa pelo handler que desfixa; o hover nunca rouba um detalhe fixado.
  assert.match(PAGE_SRC, /onClose=\{closeTechnicianDetail\}/);
  assert.match(PAGE_SRC, /onHoverTechnician=\{hoverTechnicianDetail\}/);
  assert.match(PAGE_SRC, /detailPinnedRef/);
});
