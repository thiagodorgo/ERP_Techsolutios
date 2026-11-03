import assert from "node:assert/strict";
import test from "node:test";

import {
  INTENT_TRANSITIONS,
  exitsOf,
  statesWithoutExit,
  transitionsIntoLiveLinkFromElsewhere,
  unconditionalOperatorExits,
} from "../src/modules/impound-payments/impound-payment.state-machine.js";
import { HELD_REASONS, INTENT_STATUSES } from "../src/modules/impound-payments/impound-payment.types.js";

// B-PATIO-REC-01 F1 — a máquina de estados da intenção é uma TABELA DE DADOS (plano v3 §4.4/§4.5). Ambiente [SB].

test("T-MAQ-saidas-1 · P-REC-18/P-REC-15: todo estado tem saída escrita e toda linha cita estado e célula válidos", () => {
  assert.deepEqual(statesWithoutExit(), [], "estado sem saída: dinheiro poderia ficar sem destino");
  const statuses = new Set<string>(INTENT_STATUSES);
  const reasons = new Set<string>(HELD_REASONS);
  for (const row of INTENT_TRANSITIONS) {
    assert.ok(row.from === "created" || statuses.has(row.from), `origem desconhecida: ${row.from}`);
    assert.ok(statuses.has(row.to), `destino desconhecido: ${row.to}`);
    assert.match(row.via, /^(C|M\d{1,2}|E\d{1,2}b?)$/, `célula fora do plano: ${row.via}`);
    for (const reason of row.onlyForHeldReasons ?? []) {
      assert.ok(reasons.has(reason), `motivo desconhecido: ${reason}`);
    }
  }
  // Nenhum estado é terminal para DINHEIRO NOVO: cancelado, vencido e revertido aceitam o pagamento tardio (M4).
  for (const status of ["cancelled", "expired", "reversed"] as const) {
    assert.ok(exitsOf(status).some((row) => row.via === "M4"), `${status} sem a linha M4 (dinheiro novo)`);
  }
});

test("T-MAQ-saidas-2 · funds_held tem saída incondicional do operador: DEVOLVER (E5), que não depende de pergunta nem de motivo", () => {
  const exits = unconditionalOperatorExits("funds_held");
  assert.ok(exits.length >= 1, "funds_held sem saída incondicional");
  assert.ok(
    exits.some((row) => row.via === "E5" && row.to === "reversed"),
    "funds_held sem saída incondicional: a devolução (E5 → reversed) tem de existir para todo motivo",
  );
});

test("T-MAQ-saidas-3 · P-REC-27: nenhuma transição entra no link aberto vinda de outro estado (só a criação e pending → cancel_requested)", () => {
  assert.deepEqual(transitionsIntoLiveLinkFromElsewhere(), []);
  assert.ok(INTENT_TRANSITIONS.some((row) => row.from === "created" && row.to === "pending"));
  assert.ok(INTENT_TRANSITIONS.some((row) => row.from === "pending" && row.to === "cancel_requested"));
});
