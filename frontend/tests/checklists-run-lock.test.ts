import assert from "node:assert/strict";
import test from "node:test";

import { describeChecklistRunLock, isChecklistRunLocked } from "../src/modules/checklists/checklist-run-lock";

// CHECKLIST P1 PR-03 (D-CHK-P1-RUN-LIFECYCLE) — a vistoria trava ao concluir/assinar. A tela de execução não
// pode só desabilitar o botão: o backend responde 409 e o técnico ficaria olhando para um formulário mudo.
// Estes testes travam a REGRA (quais estados travam) e a HONESTIDADE da cópia.

test("vistoria em andamento (e aguardando ciência) continua editável", () => {
  assert.equal(describeChecklistRunLock("in_progress"), null);
  assert.equal(describeChecklistRunLock("pending_acknowledgement"), null);
  assert.equal(describeChecklistRunLock(undefined), null);
  assert.equal(isChecklistRunLocked("in_progress"), false);
});

test("vistoria concluída (com ou sem divergência) fica somente leitura, e a cópia explica a saída", () => {
  for (const status of ["completed", "completed_with_divergence"] as const) {
    const lock = describeChecklistRunLock(status);
    assert.ok(lock, `${status} tem de travar a escrita`);
    assert.equal(lock?.title, "Vistoria concluída — somente leitura");
    assert.ok(lock!.notice.includes("prova do estado do veículo"), "diz POR QUE não pode mais alterar");
    assert.ok(lock!.notice.includes("reabertura"), "aponta a saída (pedir reabertura ao gestor)");
    assert.ok(lock!.notice.includes("preservada no histórico"), "garante que o registro original não se perde");
    assert.equal(isChecklistRunLocked(status), true);
  }
});

test("vistoria cancelada trava com cópia própria (não fala em reabertura)", () => {
  const lock = describeChecklistRunLock("cancelled");
  assert.ok(lock);
  assert.equal(lock?.title, "Vistoria cancelada — somente leitura");
  assert.ok(lock!.notice.includes("nova vistoria pela ordem de serviço"));
  assert.equal(lock!.notice.includes("reabertura"), false, "cancelada não se reabre — a saída é outra");
});

// §3 do contrato: a UI nunca mostra termo técnico. Nem código de erro, nem nome de entidade do backend.
test("as mensagens de trava não vazam termo técnico nem código de erro", () => {
  const copies = (["completed", "completed_with_divergence", "cancelled"] as const).flatMap((status) => {
    const lock = describeChecklistRunLock(status);
    return lock ? [lock.title, lock.notice] : [];
  });

  assert.equal(copies.length, 6);

  for (const copy of copies) {
    for (const forbidden of ["409", "run", "status", "tenant", "checklist_run", "HTTP", "API", "endpoint"]) {
      assert.equal(
        copy.toLowerCase().includes(forbidden.toLowerCase()),
        false,
        `a cópia "${copy}" não pode conter o termo técnico "${forbidden}"`,
      );
    }
  }
});
