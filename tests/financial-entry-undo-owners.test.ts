import assert from "node:assert/strict";
import test from "node:test";

import {
  assertUndoOrdersCoverEveryRefusal,
  buildUndoOwnerPolicies,
  DELETE_UNDO_ORDER,
  entryHasOwnerField,
  FINANCIAL_ENTRY_FIELD_CLASS,
  REVERSE_UNDO_ORDER,
  UNDO_OWNER_FIELDS,
  UNDO_OWNER_IDS,
  refuse,
  type UndoOwnerId,
  type UndoOwnerPolicyTable,
} from "../src/modules/financial-entries/financial-entry-undo-owners.js";
import type { FinancialEntry } from "../src/modules/financial-entries/financial-entry.types.js";
import { FinancialEntryError } from "../src/modules/financial-entries/financial-entry.types.js";

// -----------------------------------------------------------------------------------------------
// B-O6R-02 ciclo 4 · C2 (P5-v2) — o VALOR da classificação tem CONSUMIDOR.
//
// Estes testes provam a CONCORDÂNCIA derivação × detector: `UNDO_OWNER_FIELDS` nasce de
// `FINANCIAL_ENTRY_FIELD_CLASS`, e `entryHasOwnerField` decide por ele. Se o mapa e a derivação
// divergirem, ou se o detector deixar de ler o mapa, alguém aqui fica vermelho. É o que faltava no
// ciclo 3: lá o valor do mapa não tinha consumidor e classificar errado não movia teste (D22).
// -----------------------------------------------------------------------------------------------

function entry(overrides: Partial<FinancialEntry> = {}): FinancialEntry {
  return {
    id: "e1",
    tenantId: "t1",
    accountId: "a1",
    direction: "out",
    amount: 100,
    currency: "BRL",
    paymentMethod: "pix",
    occurredAt: new Date("2026-05-10T12:00:00.000Z"),
    competencia: "2026-05",
    reconciled: false,
    createdAt: new Date("2026-05-10T12:00:00.000Z"),
    updatedAt: new Date("2026-05-10T12:00:00.000Z"),
    ...overrides,
  };
}

const errorFactories = {
  reversalPairImmutable: () => new FinancialEntryError(422, "X", "reversal_pair_immutable", "x"),
  settlementEntryImmutable: () => new FinancialEntryError(422, "X", "settlement_entry_immutable", "x"),
  chequeEntryImmutable: () => new FinancialEntryError(422, "X", "cheque_entry_immutable", "x"),
};

test("[C2/P5-v2] UNDO_OWNER_FIELDS DERIVA de FINANCIAL_ENTRY_FIELD_CLASS: reversalOf→reversal_pair, titleId→title_settlement, cheque_link vazio", () => {
  assert.deepEqual([...UNDO_OWNER_FIELDS.reversal_pair], ["reversalOf"]);
  assert.deepEqual([...UNDO_OWNER_FIELDS.title_settlement], ["titleId"]);
  assert.deepEqual([...UNDO_OWNER_FIELDS.cheque_link], []);
  // todo dono conhecido tem entrada (nunca undefined que o [owner] leria como buraco)
  for (const id of UNDO_OWNER_IDS) {
    assert.ok(Array.isArray(UNDO_OWNER_FIELDS[id]), `dono ${id} sem lista derivada`);
  }
});

test("[C2/P5-v2] CONCORDÂNCIA total: cada owner:<id> do mapa aparece na derivação, e vice-versa", () => {
  // mapa → derivação
  for (const [field, klass] of Object.entries(FINANCIAL_ENTRY_FIELD_CLASS)) {
    if (klass !== "plain") {
      const ownerId = klass.slice("owner:".length) as UndoOwnerId;
      assert.ok(
        UNDO_OWNER_FIELDS[ownerId].includes(field as keyof FinancialEntry),
        `campo ${field} classificado ${klass} tem de estar em UNDO_OWNER_FIELDS[${ownerId}]`,
      );
    }
  }
  // derivação → mapa
  for (const id of UNDO_OWNER_IDS) {
    for (const field of UNDO_OWNER_FIELDS[id]) {
      assert.equal(
        FINANCIAL_ENTRY_FIELD_CLASS[field as keyof typeof FINANCIAL_ENTRY_FIELD_CLASS],
        `owner:${id}`,
        `UNDO_OWNER_FIELDS[${id}] contém ${String(field)} mas o mapa não o classifica assim`,
      );
    }
  }
});

test("[C2/P5-v2] entryHasOwnerField: titleId→title_settlement; reversalOf→reversal_pair; avulso→nenhum; cheque_link nunca por campo", () => {
  const liquidacao = entry({ titleId: "title-1" });
  const contrapartida = entry({ reversalOf: "orig-1" });
  const avulso = entry();

  assert.equal(entryHasOwnerField("title_settlement", liquidacao), true);
  assert.equal(entryHasOwnerField("reversal_pair", liquidacao), false);

  assert.equal(entryHasOwnerField("reversal_pair", contrapartida), true);
  assert.equal(entryHasOwnerField("title_settlement", contrapartida), false);

  assert.equal(entryHasOwnerField("title_settlement", avulso), false);
  assert.equal(entryHasOwnerField("reversal_pair", avulso), false);

  // cheque_link não tem campo NO lançamento → sempre falso por campo (o detector real usa o extra/reader)
  assert.equal(entryHasOwnerField("cheque_link", liquidacao), false);
  assert.equal(entryHasOwnerField("cheque_link", contrapartida), false);
});

test("[C2/P5] buildUndoOwnerPolicies célula a célula: par/cheque recusam nas duas rotas; liquidação recusa delete, PERMITE reverse", () => {
  const table = buildUndoOwnerPolicies(errorFactories);
  assert.equal(table.reversal_pair.delete.kind, "refuse");
  assert.equal(table.reversal_pair.reverse.kind, "refuse");
  assert.equal(table.title_settlement.delete.kind, "refuse");
  assert.equal(table.title_settlement.reverse.kind, "allow");
  assert.equal(table.cheque_link.delete.kind, "refuse");
  assert.equal(table.cheque_link.reverse.kind, "refuse");
});

test("[C2/P5] a tabela REAL cobre toda recusa (não lança); DELETE_UNDO_ORDER e REVERSE_UNDO_ORDER conhecidos", () => {
  assert.doesNotThrow(() => assertUndoOrdersCoverEveryRefusal(buildUndoOwnerPolicies(errorFactories)));
  assert.deepEqual([...DELETE_UNDO_ORDER], ["reversal_pair", "title_settlement", "cheque_link"]);
  assert.deepEqual([...REVERSE_UNDO_ORDER], ["reversal_pair", "cheque_link"]);
});

test("[C2/P5][parecer #2] dono que RECUSA numa rota mas está FORA da ordem dela → assertUndoOrdersCoverEveryRefusal LANÇA", () => {
  const real = buildUndoOwnerPolicies(errorFactories);
  // title_settlement está FORA de REVERSE_UNDO_ORDER (é allow no reverse). Forçá-lo a refuse no reverse
  // cria exatamente a recusa-que-ninguém-percorre que o guard existe para pegar.
  const bad = {
    ...real,
    title_settlement: { delete: real.title_settlement.delete, reverse: refuse(errorFactories.settlementEntryImmutable) },
  } as UndoOwnerPolicyTable;
  assert.throws(() => assertUndoOrdersCoverEveryRefusal(bad), /RECUSA na rota 'reverse'|fora da ordem/);
});
