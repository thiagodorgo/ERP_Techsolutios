import assert from "node:assert/strict";
import test from "node:test";

import { classifyOperatorsAtFixTime } from "../src/modules/field-dispatch/field-dispatch.repository.js";
import type { OperatorAtFixTimeCandidate } from "../src/modules/field-dispatch/field-dispatch.types.js";

const acceptedAt = new Date("2026-10-16T12:00:00.000Z");
const assignedAt = new Date("2026-10-16T11:59:00.000Z");
const vehicleAssignedAt = new Date("2026-10-16T11:58:00.000Z");

function candidate(overrides: Partial<OperatorAtFixTimeCandidate> = {}): OperatorAtFixTimeCandidate {
  return {
    operatorUserId: "operator-a",
    operatorAssignedAt: assignedAt,
    acceptedAt,
    vehicleAssignedAt,
    ...overrides,
  };
}

test("operador no instante: viatura sem data torna o histórico ambíguo", () => {
  assert.deepEqual(
    classifyOperatorsAtFixTime([candidate(), candidate({ operatorUserId: "operator-b", vehicleAssignedAt: null })]),
    { kind: "history_ambiguous" },
  );
});

test("operador no instante: candidatos datados preservam none, single e ambiguous", () => {
  assert.deepEqual(classifyOperatorsAtFixTime([]), { kind: "none" });
  assert.deepEqual(classifyOperatorsAtFixTime([candidate(), candidate()]), {
    kind: "single",
    operatorUserId: "operator-a",
  });
  assert.deepEqual(classifyOperatorsAtFixTime([candidate(), candidate({ operatorUserId: "operator-b" })]), {
    kind: "ambiguous",
  });
});

test("operador no instante: operador sem data torna o histórico ambíguo", () => {
  assert.deepEqual(classifyOperatorsAtFixTime([candidate({ operatorAssignedAt: null })]), {
    kind: "history_ambiguous",
  });
});

test("operador no instante: atribuição do operador posterior ao aceite torna o histórico ambíguo", () => {
  assert.deepEqual(
    classifyOperatorsAtFixTime([
      candidate({ operatorAssignedAt: new Date(acceptedAt.getTime() + 1) }),
    ]),
    { kind: "history_ambiguous" },
  );
});
