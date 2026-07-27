import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { OccupancyMap } from "../src/modules/patios/processes/components/OccupancyMap";
import type { ProcessListItem } from "../src/modules/patios/processes/processes.types";
import type { YardSpotItem } from "../src/modules/patios/yards/yards.types";

const OCCUPIED_PROCESS_ID = "9f0c2b1a-aaaa-bbbb-cccc-1234567890ab";

const SPOTS: YardSpotItem[] = [
  { id: "spot-free", areaId: "a1", code: "A-01", covered: true, vehicleClass: "ANY", vehicleClassLabel: "Qualquer veículo", status: "FREE", statusLabel: "Livre", currentProcessId: null },
  { id: "spot-occ", areaId: "a1", code: "A-02", covered: false, vehicleClass: "HEAVY", vehicleClassLabel: "Pesado", status: "OCCUPIED", statusLabel: "Ocupada", currentProcessId: OCCUPIED_PROCESS_ID },
  { id: "spot-blk", areaId: "a1", code: "A-03", covered: false, vehicleClass: "ANY", vehicleClassLabel: "Qualquer veículo", status: "BLOCKED", statusLabel: "Bloqueada", currentProcessId: null },
];

const PROCESS: ProcessListItem = {
  id: OCCUPIED_PROCESS_ID,
  vehiclePlate: "XYZ-9876",
  vehicleUnidentified: false,
  yardId: "yard-1",
  profileId: "prof-1",
  status: "ACTIVE_CUSTODY",
  statusLabel: "Custódia ativa",
  enteredAt: "2026-07-20T10:00:00.000Z",
  frozenAt: null,
  originAuthority: "Órgão solicitante",
  custodySeqHead: 3,
  createdAt: "2026-07-20T10:00:00.000Z",
};

function resolveProcess(id: string) {
  return id === OCCUPIED_PROCESS_ID ? PROCESS : undefined;
}

function renderMap(canAllocate: boolean, canEdit = false): string {
  return renderToString(
    <MemoryRouter>
      <OccupancyMap
        spots={SPOTS}
        resolveProcess={resolveProcess}
        canAllocate={canAllocate}
        canEdit={canEdit}
        onAllocate={() => undefined}
        onMove={() => undefined}
        onVacate={() => undefined}
        onEdit={() => undefined}
      />
    </MemoryRouter>,
  );
}

test("mapa: vaga OCUPADA vira link ao dossiê com a placa resolvida por join", () => {
  const html = renderMap(false);

  // Link ao dossiê do processo desta vaga.
  assert.match(html, new RegExp(`/patios/processos/${OCCUPIED_PROCESS_ID}`));
  // Placa exibida (join client-side), NÃO o id do processo.
  assert.match(html, /XYZ-9876/);
  assert.match(html, /Custódia ativa/);
  // Situação de cada vaga.
  assert.match(html, /Livre/);
  assert.match(html, /Ocupada/);
  assert.match(html, /Bloqueada/);
});

test("mapa: §allowlist — currentProcessId NUNCA renderizado cru (só no href do dossiê)", () => {
  const html = renderMap(false);
  const totalOccurrences = html.split(OCCUPIED_PROCESS_ID).length - 1;
  const hrefOccurrences = html.split(`/patios/processos/${OCCUPIED_PROCESS_ID}`).length - 1;
  assert.ok(hrefOccurrences >= 1, "o id deve aparecer no href do dossiê");
  assert.equal(totalOccurrences, hrefOccurrences, "o id do processo só pode aparecer dentro do href, nunca como texto cru");
  assert.doesNotMatch(html, /\btenant\b/i);
  assert.doesNotMatch(html, /pol[íi]cia/i);
});

test("mapa: ações allocate/move/vacate aparecem SÓ com impound:allocate", () => {
  const withPerm = renderMap(true);
  assert.match(withPerm, /Alocar/); // vaga livre
  assert.match(withPerm, /Mover/); // vaga ocupada
  assert.match(withPerm, /Liberar/); // vaga ocupada

  const withoutPerm = renderMap(false);
  assert.doesNotMatch(withoutPerm, /Alocar/);
  assert.doesNotMatch(withoutPerm, /Mover/);
  assert.doesNotMatch(withoutPerm, /Liberar/);
  // Mesmo sem a permissão de escrita, a leitura (link ao dossiê) permanece.
  assert.match(withoutPerm, new RegExp(`/patios/processos/${OCCUPIED_PROCESS_ID}`));
});

test("mapa: 'Editar' vaga (config + bloqueio Livre⇄Bloqueada) aparece SÓ com yard:update — sem regredir o PR-04", () => {
  // Com yard:update: botão Editar por vaga (inclui a vaga FREE, que é bloqueável) — capacidade do PR-04 preservada.
  const withEdit = renderMap(false, true);
  assert.match(withEdit, /Editar a vaga A-01/); // vaga FREE editável/bloqueável
  assert.match(withEdit, /Editar a vaga A-02/); // vaga OCUPADA (edição de config)
  assert.match(withEdit, /Editar a vaga A-03/); // vaga BLOQUEADA (desbloqueio)

  // Sem yard:update: nenhuma ação de editar/bloquear vaga.
  const withoutEdit = renderMap(false, false);
  assert.doesNotMatch(withoutEdit, /Editar a vaga/);
});
