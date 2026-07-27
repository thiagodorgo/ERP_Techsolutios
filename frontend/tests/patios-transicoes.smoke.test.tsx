import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

import { TransicaoFsmPanel } from "../src/modules/patios/processes/components/TransicaoFsmPanel";
import { actionsFrom, FSM_ACTIONS, isTransitionSubmitEnabled, transitionErrorMessage } from "../src/modules/patios/processes/fsm";
import type { ImpoundStatus } from "../src/modules/patios/processes/processes.types";

// Espelho de ENABLED_EDGES (src/modules/impound/impound.transitions.ts) — SÓ estas 4 arestas habilitadas hoje.
const EXPECTED_EDGES: ReadonlyArray<readonly [ImpoundStatus, ImpoundStatus]> = [
  ["IN_REMOVAL", "RECEPTION"],
  ["RECEPTION", "ACTIVE_CUSTODY"],
  ["ACTIVE_CUSTODY", "JUDICIAL_HOLD"],
  ["JUDICIAL_HOLD", "ACTIVE_CUSTODY"],
];

function renderPanel(props: { status: ImpoundStatus; inspectionComplete?: boolean; canTransition?: boolean }): string {
  return renderToString(
    <TransicaoFsmPanel
      processId="p1"
      status={props.status}
      inspectionComplete={props.inspectionComplete ?? false}
      canTransition={props.canTransition ?? true}
      context={{}}
      onDone={() => {}}
    />,
  );
}

test("FSM_ACTIONS espelha ENABLED_EDGES: exatamente as 4 arestas custódia-nativas (nada de liberação/leilão)", () => {
  assert.equal(FSM_ACTIONS.length, 4);
  assert.deepEqual(
    FSM_ACTIONS.map((action) => [action.from, action.to]),
    EXPECTED_EDGES,
  );
});

test("actionsFrom devolve SÓ a aresta habilitada a partir do estado (arestas deferidas não viram ação)", () => {
  assert.deepEqual(actionsFrom("IN_REMOVAL").map((a) => a.to), ["RECEPTION"]);
  assert.deepEqual(actionsFrom("RECEPTION").map((a) => a.to), ["ACTIVE_CUSTODY"]);
  // ACTIVE_CUSTODY na FSM tem 5 arestas legais, mas SÓ JUDICIAL_HOLD está habilitada (as outras são deferidas).
  assert.deepEqual(actionsFrom("ACTIVE_CUSTODY").map((a) => a.to), ["JUDICIAL_HOLD"]);
  assert.deepEqual(actionsFrom("JUDICIAL_HOLD").map((a) => a.to), ["ACTIVE_CUSTODY"]);
  // Estado sink / arestas ainda não habilitadas → nenhuma ação.
  assert.deepEqual(actionsFrom("RELEASED").map((a) => a.to), []);
  assert.deepEqual(actionsFrom("RELEASE_IN_PROGRESS").map((a) => a.to), []);
});

test("painel exibe botão SÓ para a aresta habilitada do estado atual", () => {
  const inRemoval = renderPanel({ status: "IN_REMOVAL" });
  assert.match(inRemoval, /Registrar chegada ao pátio/);
  assert.doesNotMatch(inRemoval, /bloqueio judicial/i); // não oferece ação de outro estado

  const active = renderPanel({ status: "ACTIVE_CUSTODY", inspectionComplete: true });
  assert.match(active, /Registrar bloqueio judicial/);
  // As arestas legais-mas-deferidas (liberação/leilão/reciclagem) NÃO viram botão.
  assert.doesNotMatch(active, /Libera[çc]|leil[ãa]o|Reciclagem/i);
});

test("JUDICIAL_HOLD exige fundamento: submit bloqueado no front sem reason (predicado + campo + botão desabilitado)", () => {
  const judicial = FSM_ACTIONS.find((a) => a.to === "JUDICIAL_HOLD");
  assert.ok(judicial);
  assert.equal(isTransitionSubmitEnabled(judicial!, { reason: "", inspectionComplete: true }), false);
  assert.equal(isTransitionSubmitEnabled(judicial!, { reason: "  ", inspectionComplete: true }), false);
  assert.equal(isTransitionSubmitEnabled(judicial!, { reason: "Ordem judicial n. 4521/2026", inspectionComplete: true }), true);

  const active = renderPanel({ status: "ACTIVE_CUSTODY", inspectionComplete: true });
  assert.match(active, /Fundamento/); // campo de fundamento presente
  // O único botão de ação do painel (bloqueio judicial) nasce DESABILITADO (reason vazio no estado inicial).
  assert.match(active, /disabled/);
});

test("graduação RECEPTION→ACTIVE_CUSTODY desabilitada sem vistoria completa (I3) + dica; habilita com complete", () => {
  const grad = FSM_ACTIONS.find((a) => a.from === "RECEPTION" && a.to === "ACTIVE_CUSTODY");
  assert.ok(grad);
  assert.equal(isTransitionSubmitEnabled(grad!, { reason: "", inspectionComplete: false }), false);
  assert.equal(isTransitionSubmitEnabled(grad!, { reason: "", inspectionComplete: true }), true);

  const blocked = renderPanel({ status: "RECEPTION", inspectionComplete: false });
  assert.match(blocked, /Graduar para custódia ativa/);
  assert.match(blocked, /Conclua a vistoria de recepção/); // dica (R4 — 08c ainda não habilita a edição)
  assert.match(blocked, /disabled/);

  const ok = renderPanel({ status: "RECEPTION", inspectionComplete: true });
  assert.doesNotMatch(ok, /Conclua a vistoria de recepção/);
});

test("409/403 defensivo → mensagem PT-BR white-label (nunca corpo cru do backend)", () => {
  assert.equal(transitionErrorMessage("transition_not_enabled_yet"), "Ação ainda não disponível nesta versão.");
  assert.equal(transitionErrorMessage("invalid_transition"), "Transição inválida a partir do estado atual do processo.");
  assert.equal(transitionErrorMessage("reason_required"), "Informe o fundamento desta transição.");
  assert.equal(transitionErrorMessage("reception_inspection_incomplete"), "Conclua a vistoria de recepção antes de graduar para custódia ativa.");
  assert.equal(transitionErrorMessage(null, 409), "O estado do processo mudou. Recarregue o dossiê e tente novamente.");
  assert.equal(transitionErrorMessage(null, 403), "Sessão expirada ou sem permissão para alterar o estado.");
});

test("acesso-negado: sem impound:transition o painel fica somente-leitura (sem botões de escrita)", () => {
  const readonly = renderPanel({ status: "ACTIVE_CUSTODY", inspectionComplete: true, canTransition: false });
  assert.match(readonly, /Somente leitura/);
  assert.doesNotMatch(readonly, /Registrar bloqueio judicial/);
});

test("white-label: sem termo técnico 'tenant' nem 'polícia'", () => {
  const active = renderPanel({ status: "ACTIVE_CUSTODY", inspectionComplete: true });
  assert.doesNotMatch(active, /\btenant\b/i);
  assert.doesNotMatch(active, /pol[íi]cia/i);
});
