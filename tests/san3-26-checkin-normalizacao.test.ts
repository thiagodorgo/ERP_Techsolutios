import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

// B-SAN3-26 (C26-07 e C26R2-03) — a normalização da placa, escrita e fechada.
//
// Regra (emenda do dev, `docs/revisoes/SAN3/B-SAN3-26-dev.md`, E-03):
//   * só string conta; número, booleano e null = sem referência (nunca 500);
//   * a referência é a placa BRASILEIRA (antiga LLL NNNN ou Mercosul LLL N L NN), procurada como PALAVRA (sem letra
//     ou dígito colado antes ou depois), com hífen, ponto ou espaço opcional entre as letras e os números;
//   * exatamente UMA placa no texto; nenhuma ou mais de uma (ex.: "Uno 2010 ABC1234") = sem referência, fail-closed;
//   * não há mais o ramo "5 a 8 alfanuméricos" do plano v2: ele transformava "SEM PLACA", "ZERO KM" e "A DEFINIR"
//     em placa (C26R2-03). Placa estrangeira passa a contar como sem referência (a base registra a chegada);
//   * o digitado normalizado tem de ter exatamente 2 caracteres.
//
// VERMELHO-CONTROLE: as funções nascem neste bloco; na base o import falha (o motivo declarado no plano, A10).

const CAMPO = { tenantId: randomUUID(), userId: randomUUID(), roles: ["field_technician"], permissions: [] } as never;

type Esperado = "aceita" | "checkin_reference_missing" | "checkin_confirmation_required" | "checkin_confirmation_mismatch";

const TABELA: ReadonlyArray<readonly [unknown, string, Esperado]> = [
  // A10 do plano v2
  ["ABC1D23", "23", "aceita"],
  ["abc-1d23", "23", "aceita"],
  ["ABC1D23/SP", "23", "aceita"],
  ["ABC-1234 (Gol prata)", "34", "aceita"],
  ["-", "", "checkin_reference_missing"],
  ["   ", "", "checkin_reference_missing"],
  ["A", "A", "checkin_reference_missing"],
  [1234, "34", "checkin_reference_missing"],
  [true, "UE", "checkin_reference_missing"],
  ["ABC1D23", "2", "checkin_confirmation_required"],
  ["ABC1D23", "123", "checkin_confirmation_required"],
  // Emenda E-03 (C26R2-03): placa estrangeira deixou de ser referência.
  ["AB 123 CD", "CD", "checkin_reference_missing"],
  // C26R2-03: o que a base digita quando o veículo NÃO tem placa nunca vira placa.
  ["SEM PLACA", "CA", "checkin_reference_missing"],
  ["S/PLACA", "CA", "checkin_reference_missing"],
  ["ZERO KM", "KM", "checkin_reference_missing"],
  ["A DEFINIR", "IR", "checkin_reference_missing"],
  ["NAO TEM", "EM", "checkin_reference_missing"],
  ["NOVO 0KM", "KM", "checkin_reference_missing"],
  ["XXXXXXX", "XX", "checkin_reference_missing"],
  ["0000000", "00", "checkin_reference_missing"],
  // C26R2-03: modelo e ano antes da placa não roubam a referência.
  ["Onix 2019 ABC1D23", "23", "aceita"],
  ["Onix 2019 ABC1D23", "19", "checkin_confirmation_mismatch"],
  ["HB20 ABC1D23", "23", "aceita"],
  ["Placa ABC1D23", "23", "aceita"],
  [" ABC 1D23 ", "23", "aceita"],
  ["ABC.1D23", "23", "aceita"],
  // C26R2-03: duas placas possíveis no texto = ambíguo = sem referência (a base registra).
  ["Uno 2010 ABC1234", "34", "checkin_reference_missing"],
  ["Uno 2010 ABC1234", "10", "checkin_reference_missing"],
  // A mesma placa repetida não é ambígua.
  ["ABC1D23 (ABC-1D23)", "23", "aceita"],
  // Residual declarado: "GOL 2010" tem a forma exata de uma placa antiga e é indistinguível dela.
  ["GOL 2010", "10", "aceita"],
];

async function decidir(plate: unknown, digitado: string, serviceType: string | null = "reboque"): Promise<string> {
  const { verifyCheckin } = await import("../src/modules/work-orders/work-order.checkin.js");
  try {
    verifyCheckin(
      CAMPO,
      { code: "OS-1042", serviceDetails: { plate } },
      serviceType === null ? null : { serviceType },
      { checkin_confirmation: { last_digits: digitado } },
      "mobile_sync",
    );
    return "aceita";
  } catch (error: any) {
    if (error?.statusCode !== 422) throw error;
    return error.reason as string;
  }
}

test("A10 — tabela de normalização: referência × digitado × desfecho (plano v2 + C26R2-03)", async () => {
  const falhas: string[] = [];
  for (const [plate, digitado, esperado] of TABELA) {
    const obtido = await decidir(plate, digitado);
    if (obtido !== esperado) falhas.push(`${JSON.stringify(plate)} + ${JSON.stringify(digitado)}: esperado ${esperado}, obtido ${obtido}`);
  }
  assert.deepEqual(falhas, []);
});

test("A10 — resolveCheckinReference devolve a placa normalizada, ou null", async () => {
  const { resolveCheckinReference } = await import("../src/modules/work-orders/work-order.checkin.js");
  assert.equal(resolveCheckinReference({ plate: "abc-1d23" }), "ABC1D23");
  assert.equal(resolveCheckinReference({ plate: "Onix 2019 ABC1D23" }), "ABC1D23");
  assert.equal(resolveCheckinReference({ plate: "ABC-1234 (Gol prata)" }), "ABC1234");
  assert.equal(resolveCheckinReference({ plate: "SEM PLACA" }), null);
  assert.equal(resolveCheckinReference({ plate: 1234 }), null);
  assert.equal(resolveCheckinReference({}), null);
  assert.equal(resolveCheckinReference(undefined), null);
  assert.equal(resolveCheckinReference(null), null);
});

test("A10 — normalizeTypedTail: só string, normalizada, com exatamente 2 caracteres", async () => {
  const { normalizeTypedTail } = await import("../src/modules/work-orders/work-order.checkin.js");
  assert.equal(normalizeTypedTail(" 2 3 "), "23");
  assert.equal(normalizeTypedTail("2-3"), "23");
  assert.equal(normalizeTypedTail("cd"), "CD");
  for (const valor of ["", "--", "2", "123", 23, null, undefined, {}]) {
    assert.equal(normalizeTypedTail(valor), null, JSON.stringify(valor));
  }
});

test("A10 — corpo sem checkin_confirmation, ou com forma errada, dá checkin_confirmation_required", async () => {
  const { verifyCheckin } = await import("../src/modules/work-orders/work-order.checkin.js");
  for (const corpo of [{}, { checkin_confirmation: "23" }, { checkin_confirmation: { last_digits: 23 } }, { checkin_confirmation: null }]) {
    assert.throws(
      () => verifyCheckin(CAMPO, { code: "OS-1042", serviceDetails: { plate: "ABC1D23" } }, null, corpo, "mobile_sync"),
      (error: any) => error.reason === "checkin_confirmation_required",
      JSON.stringify(corpo),
    );
  }
});

test("A6 — isenção: só `residencial`, literal; tipo nulo, sem catálogo e variação de caixa NÃO isentam", async () => {
  assert.equal(await decidir(undefined, "", "residencial"), "aceita");
  for (const tipo of [null, "reboque", "socorro", "outro", "", "Residencial", "residencial "]) {
    assert.equal(await decidir(undefined, "", tipo), "checkin_reference_missing", JSON.stringify(tipo));
  }
  // Com placa, o tipo isento também exige os dígitos.
  assert.equal(await decidir("ABC1D23", "", "residencial"), "checkin_confirmation_required");
});

test("A10 — describeCheckinMode: o modo que a lista do app recebe", async () => {
  const { describeCheckinMode } = await import("../src/modules/work-orders/work-order.checkin.js");
  assert.deepEqual(describeCheckinMode({ plate: "abc-1d23" }, null), { mode: "plate", plateTail: "23" });
  assert.deepEqual(describeCheckinMode(undefined, { serviceType: "residencial" }), { mode: "exempt", plateTail: null });
  assert.deepEqual(describeCheckinMode({ plate: "SEM PLACA" }, { serviceType: "reboque" }), { mode: "reference_missing", plateTail: null });
  assert.deepEqual(describeCheckinMode({ plate: "ABC1D23" }, { serviceType: "residencial" }), { mode: "plate", plateTail: "23" });
});
