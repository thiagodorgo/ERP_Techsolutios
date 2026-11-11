import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

// B-SAN3-26 (C26-07 e C26R2-03) — a normalização da placa, escrita e fechada.
//
// Regra (emenda do dev, `docs/revisoes/SAN3/B-SAN3-26-dev.md`, E-03):
//   * só string conta; número, booleano e null = sem referência (nunca 500);
//   * a referência é a placa BRASILEIRA (antiga LLL NNNN ou Mercosul LLL N L NN), procurada como PALAVRA (sem letra
//     ou dígito colado antes ou depois), com hífen, ponto ou espaço opcional entre as letras e os números;
//   * C2-01 (junta do PR #534): um separador entre dois caracteres quaisquer da placa e até três entre as letras e os
//     números (espaço, NBSP, ponto, sublinhado, hífen, traços/travessões U+2010–U+2015 e U+2212); a UF colada no fim
//     ("ABC1D23SP") só se for uma das 27; o texto passa por NFKC (largura total); o código da OS nunca vira placa;
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
  // PR534-02 (mutação própria da pré-revisão, a guarda da DIREITA): letra ou dígito colado DEPOIS da placa faz o
  // texto deixar de ser placa. Sem a guarda, "ABC12345" daria ABC1234 e "ABC1D234" daria ABC1D23.
  ["ABC12345", "34", "checkin_reference_missing"],
  ["ABC12345", "45", "checkin_reference_missing"],
  ["ABC1D234", "23", "checkin_reference_missing"],
  ["ABC1D234", "34", "checkin_reference_missing"],
  ["ABC1D23X", "23", "checkin_reference_missing"],
  // C2-01 (junta do PR #534): os casos da sonda da cadeira C2, com o desfecho que a placa pede.
  ["ABC1D23", "23", "aceita"],
  ["abc1d23", "23", "aceita"],
  ["ABC-1D23", "23", "aceita"],
  ["ABC 1D23", "23", "aceita"],
  ["ABC.1D23", "23", "aceita"],
  ["ABC1234", "34", "aceita"],
  ["abc-1234", "34", "aceita"],
  ["ABC1D23/SP", "23", "aceita"],
  ["Placa: ABC1D23", "23", "aceita"],
  ["ABC - 1234", "34", "aceita"],
  ["ABC\u20131234", "34", "aceita"],
  ["ABC\u20141D23", "23", "aceita"],
  ["ABC\u22121234", "34", "aceita"],
  ["A B C 1 D 2 3", "23", "aceita"],
  ["a b c 1 2 3 4", "34", "aceita"],
  ["ABC_1D23", "23", "aceita"],
  ["ABC1D23SP", "23", "aceita"],
  ["ABC1D23-RJ", "23", "aceita"],
  ["ABC1D23 sp", "23", "aceita"],
  ["\uFF21\uFF22\uFF23\uFF11\uFF24\uFF12\uFF13", "23", "aceita"],
  ["ABC\u00A01D23", "23", "aceita"],
  ["ABC1D23 abc-1d23", "23", "aceita"],
  ["ABC1D23 XYZ9876", "23", "checkin_reference_missing"],
  ["", "23", "checkin_reference_missing"],
  ["A", "A", "checkin_reference_missing"],
  // C2-01: o que não é placa continua sem referência.
  ["ABC1D23XY", "23", "checkin_reference_missing"],
  ["ABC1D23S", "23", "checkin_reference_missing"],
  ["ABC1D23SPX", "23", "checkin_reference_missing"],
  ["OS-000041", "41", "checkin_reference_missing"],
  ["os 000041", "41", "checkin_reference_missing"],
  ["OS-000041/SP", "41", "checkin_reference_missing"],
  ["AB - C 1234", "34", "checkin_reference_missing"],
  ["ABC -  - 1234", "34", "checkin_reference_missing"],
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
  // PR534-02: a placa é procurada como PALAVRA também à direita.
  assert.equal(resolveCheckinReference({ plate: "ABC12345" }), null);
  assert.equal(resolveCheckinReference({ plate: "ABC1D234" }), null);
  assert.equal(resolveCheckinReference({ plate: "ABC1D23X" }), null);
  // C2-01: separadores, UF colada e largura total chegam à mesma placa; o código da OS não vira placa.
  assert.equal(resolveCheckinReference({ plate: "ABC - 1234" }), "ABC1234");
  assert.equal(resolveCheckinReference({ plate: "ABC\u20131234" }), "ABC1234");
  assert.equal(resolveCheckinReference({ plate: "A B C 1 D 2 3" }), "ABC1D23");
  assert.equal(resolveCheckinReference({ plate: "ABC_1D23" }), "ABC1D23");
  assert.equal(resolveCheckinReference({ plate: "ABC1D23SP" }), "ABC1D23");
  assert.equal(resolveCheckinReference({ plate: "\uFF21\uFF22\uFF23\uFF11\uFF24\uFF12\uFF13" }), "ABC1D23");
  assert.equal(resolveCheckinReference({ plate: "OS-000041" }), null);
  assert.equal(resolveCheckinReference({ plate: "ABC1D23XY" }), null);
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

test("C1-A1 — withoutReservedOfficeMark: a mensagem do cliente que imita a marca da base cai; as outras ficam", async () => {
  const { withoutReservedOfficeMark } = await import("../src/modules/work-orders/work-order.checkin.js");
  const forjadas = [
    "Chegada ao local registrada pela base.",
    "chegada ao local REGISTRADA PELA BASE",
    "Chegada registrado pela base",
    "Chegada ao local registrada  pela\tbase!!",
    "Chegada ao local registrada pela\u200b base.",
    "Chegada ao local registrada pelá base.",
    "Ｃｈｅｇａｄａ ａｏ ｌｏｃａｌ ｒｅｇｉｓｔｒａｄａ ｐｅｌａ ｂａｓｅ",
    "obs: registrada-pela-base",
    // Invisível e acento NO MEIO da palavra: só caem porque a comparação tira os dois antes de separar as palavras.
    "Chegada ao local regis\u200btrada pela base.",
    "Chegada ao local regístrada pela base.",
  ];
  for (const mensagem of forjadas) assert.equal(withoutReservedOfficeMark(mensagem), undefined, JSON.stringify(mensagem));
  for (const mensagem of ["Saindo do pátio agora.", "Base avisada", "Chegada ao local.", "registrada pelo cliente"]) {
    assert.equal(withoutReservedOfficeMark(mensagem), mensagem, JSON.stringify(mensagem));
  }
  assert.equal(withoutReservedOfficeMark(undefined), undefined);
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

test("OS de remoção da autoridade nasce com a placa da solicitação como referência do check-in", async () => {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const { InMemoryWorkOrderRepository, originateSystemRemovalWorkOrder } = await import("../src/modules/work-orders/work-order.repository.js");
  const { describeCheckinMode } = await import("../src/modules/work-orders/work-order.checkin.js");
  const os = await originateSystemRemovalWorkOrder(new InMemoryWorkOrderRepository(), {
    tenantId: randomUUID(),
    plate: "ABC1D23",
    serviceCatalogId: randomUUID(),
  });
  assert.equal(os.serviceDetails?.plate, "ABC1D23");
  assert.deepEqual(describeCheckinMode(os.serviceDetails, { serviceType: "reboque" }), { mode: "plate", plateTail: "23" });
});
