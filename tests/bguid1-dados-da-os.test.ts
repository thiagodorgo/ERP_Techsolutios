import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

// B-GUI-D1 — os dados da OS que faltam chegam ao app: o destino (endereço e coordenada) e o veículo atendido
// (`attendedVehicle = { plateMasked, model, color }`) entram, ADITIVOS, no item da lista de OS.
// Plano: `plano-APP-GUINCHO-emenda1.md` §5.4 + `plano-B-GUI-D1-emenda1.md` + `-emenda1.1.md` (prevalece).
//
// Invariantes que este arquivo prova, SEMPRE pelo app real (`createApp`, molde de `san3-26-checkin-conferencia`), no
// item servido por `GET /work-orders?scope=assigned&openOnly=true` (só o controller passa o mapa do check-in; §3.1 da
// emenda 1.1):
//   - a lista de `serviceDetails` é FECHADA (3 chaves); a senha do residencial e o resto nunca saem (D2);
//   - `plateMasked` nasce da MESMA referência do check-in, sem os 2 finais, e existe se e só se `checkinMode = "plate"`
//     (D3); o fim da placa desta OS nunca chega por `model`/`color` (D3c, conferido por DOBRA, campo a campo);
//   - conserto da J-597: a OS residencial real não manda nenhum dos 4 valores por campo nenhum (D2b, C1-01), e o fim da
//     placa não chega por `destinationAddress` nem pelos campos de veículo de uma OS com placa e sem destino (D3d, C1-02).
//
// VERMELHO-CONTROLE: o arquivo não importa o auxiliar novo no topo. Na base (sem o produto do bloco) ele carrega e cada
// teste novo falha pelo motivo declarado (chave ausente no item). O F0 é a caracterização da forma de hoje: nasce verde
// e fica verde. Registro em `docs/revisoes/GUI/B-GUI-D1-dev.md`.

const PLACA = "ABC1D23";

type Resposta = { status: number; body: any };
type Ctx = {
  readonly seed: { tenantA: Tenant; tenantB: Tenant; gestor: User; tecnico: User; outroTecnico: User; gestorB: User };
  h(tenant: Tenant, user: User, role: string): Record<string, string>;
  req(caminho: string, opcoes?: { method?: string; headers?: Record<string, string>; body?: unknown }): Promise<Resposta>;
  /** Cria a OS como gestor e a despacha ao técnico. */
  osDoTecnico(corpo?: Record<string, unknown>): Promise<string>;
  /** A lista do técnico (`scope=assigned&openOnly=true`), indexada por id. */
  listaDoTecnico(): Promise<{ resposta: Resposta; porId: Map<string, any> }>;
};

async function withApi(callback: (ctx: Ctx) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const [
    { createApp },
    workOrders,
    fieldDispatch,
    workOrderSync,
    serviceCatalog,
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/work-orders/index.js"),
    import("../src/modules/field-dispatch/index.js"),
    import("../src/modules/mobile/mobile-work-order-sync.js"),
    import("../src/modules/service-catalog/service-catalog.service.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);
  workOrders.resetWorkOrderRuntimeForTests();
  fieldDispatch.resetFieldDispatchRuntimeForTests();
  workOrderSync.resetMobileWorkOrderSyncRuntimeForTests();
  serviceCatalog.resetServiceCatalogRuntimeForTests();

  const modulos = ["work_orders", "field_operations", "tenant_checklist", "checklists", "service_catalog", "registry"];
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenantA = core.createTenant({ name: "GUI-D1 A", modules: modulos });
  const tenantB = core.createTenant({ name: "GUI-D1 B", modules: modulos });
  const sufixo = randomUUID().slice(0, 8);
  const usuario = (tenant: Tenant, nome: string, roles: string[]) =>
    core.createUser({ tenantId: tenant.id, name: nome, email: `${nome}-${sufixo}@guid1.example.com`, roles: roles as never });
  const seed = {
    tenantA,
    tenantB,
    gestor: usuario(tenantA, "gestor", ["manager"]),
    tecnico: usuario(tenantA, "tecnico", ["field_technician"]),
    outroTecnico: usuario(tenantA, "outro-tecnico", ["field_technician"]),
    gestorB: usuario(tenantB, "gestor-b", ["manager"]),
  };

  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server: Server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const h = (tenant: Tenant, user: User, role: string) => ({ "x-tenant-id": tenant.id, "x-user-id": user.id, "x-role": role });
  const hGestor = h(tenantA, seed.gestor, "manager");
  const hTecnico = h(tenantA, seed.tecnico, "field_technician");
  const req: Ctx["req"] = async (caminho, opcoes = {}) => {
    const response = await fetch(`${baseUrl}${caminho}`, {
      method: opcoes.method ?? "GET",
      headers: { "content-type": "application/json", ...opcoes.headers },
      body: opcoes.body === undefined ? undefined : JSON.stringify(opcoes.body),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };

  const ctx: Ctx = {
    seed,
    h,
    req,
    async osDoTecnico(corpo = {}) {
      const criada = await req("/api/v1/work-orders", { method: "POST", headers: hGestor, body: { title: "OS GUI-D1", ...corpo } });
      assert.equal(criada.status, 201, JSON.stringify(criada.body));
      const id = criada.body.data.id as string;
      const despacho = await req("/api/v1/operations/dispatches", {
        method: "POST",
        headers: hGestor,
        body: { workOrderId: id, operatorUserId: seed.tecnico.id },
      });
      assert.equal(despacho.status, 201, JSON.stringify(despacho.body));
      return id;
    },
    async listaDoTecnico() {
      const resposta = await req("/api/v1/work-orders?scope=assigned&openOnly=true&limit=100", { headers: hTecnico });
      assert.equal(resposta.status, 200, JSON.stringify(resposta.body));
      const itens = (resposta.body?.items ?? resposta.body?.data?.items ?? []) as any[];
      return { resposta, porId: new Map(itens.map((item) => [item.id as string, item])) };
    },
  };

  try {
    await callback(ctx);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

/** A dobra de TELA da emenda 1.1 (§1.3): NFKC, maiúsculas e só `[A-Z0-9]`. A conferência do D3c é por ela. */
function dobra(texto: string): string {
  return texto.normalize("NFKC").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Todo valor de texto do item, a qualquer profundidade (o que a tela poderia mostrar). */
function textosDoItem(valor: unknown, saida: string[] = []): string[] {
  if (typeof valor === "string") saida.push(valor);
  else if (valor !== null && typeof valor === "object") for (const v of Object.values(valor)) textosDoItem(v, saida);
  return saida;
}

/**
 * O D3c: nenhum texto do item, dobrado, contém a referência desta OS — salvo o próprio `checkinPlateTail` (2 caracteres).
 * Conserto da J-597 (C1-02): o FIM (`checkinPlateTail`) também não chega por outro campo da lista. Procurado, dobrado, nos
 * campos novos e nos de veículo (`destinationAddress`, `attendedVehicle.model`, `attendedVehicle.color`); no
 * `plateMasked`, por POSIÇÃO (os 2 finais são `**`), porque o prefixo pode conter o fim como texto (`ABC23**`).
 * `title` e `serviceAddress` ficam FORA desta trava: é a `P-OS-PLACA-NO-TEXTO-LIVRE` (pré-existente, C1-03).
 */
function assertFimNaoChegaPorTexto(item: any, referencia: string, rotulo: string) {
  const { checkinPlateTail: fim, ...resto } = item;
  for (const texto of textosDoItem(resto)) {
    assert.equal(dobra(texto).includes(referencia), false, `${rotulo}: o texto ${JSON.stringify(texto)} traz a placa da OS`);
  }
  if (typeof fim !== "string" || fim.length === 0) return;
  const camposDeTexto: ReadonlyArray<[string, unknown]> = [
    ["destinationAddress", item.destinationAddress],
    ["attendedVehicle.model", item.attendedVehicle?.model],
    ["attendedVehicle.color", item.attendedVehicle?.color],
  ];
  for (const [campo, valor] of camposDeTexto) {
    if (typeof valor !== "string") continue;
    assert.equal(dobra(valor).includes(fim), false, `${rotulo}: ${campo} ${JSON.stringify(valor)} traz o fim da placa (${fim})`);
  }
  const mascara = item.attendedVehicle?.plateMasked;
  if (typeof mascara === "string") {
    assert.equal(mascara.slice(-2), "**", `${rotulo}: plateMasked ${JSON.stringify(mascara)} traz o fim da placa`);
  }
}

// As chaves que o item da lista tem HOJE (medido em `77f0df07`), e as 4 que o B-GUI-D1 acrescenta.
const CHAVES_DE_HOJE = [
  "id",
  "code",
  "title",
  "status",
  "priority",
  "customerName",
  "serviceAddress",
  "serviceLatitude",
  "serviceLongitude",
  "assignedOperatorId",
  "assignedUserId",
  "vehicleId",
  "scheduledFor",
  "slaDueAt",
  "createdAt",
  "checkinMode",
  "checkinPlateTail",
  "serviceKind",
];
const CHAVES_NOVAS = ["destinationAddress", "destinationLatitude", "destinationLongitude", "attendedVehicle"];

const OS_COMPLETA = {
  customerName: "Cliente GUI-D1",
  serviceAddress: "Rua da Coleta, 10",
  serviceLatitude: -23.55,
  serviceLongitude: -46.63,
  destinationAddress: "Pátio Central, 200",
  destinationLatitude: -23.6,
  destinationLongitude: -46.7,
  slaDueAt: "2026-12-01T15:00:00.000Z",
  service_details: { plate: PLACA, vehicle: "Onix", color: "Prata" },
};

// ------------------------------------------------------------------------------------------------
// F0 — a caracterização da forma de hoje: as chaves e os valores que o item já tinha continuam (a mudança é aditiva).
// ------------------------------------------------------------------------------------------------
test("F0 — as 18 chaves de hoje continuam no item, com os mesmos valores (aditivo)", async () => {
  await withApi(async (ctx) => {
    const id = await ctx.osDoTecnico(OS_COMPLETA);
    const { porId } = await ctx.listaDoTecnico();
    const item = porId.get(id);
    assert.ok(item, "a OS do técnico não veio na lista dele");
    for (const chave of CHAVES_DE_HOJE) assert.equal(chave in item, true, `a chave ${chave} sumiu do item`);
    assert.equal(item.customerName, OS_COMPLETA.customerName);
    assert.equal(item.serviceAddress, OS_COMPLETA.serviceAddress);
    assert.equal(item.serviceLatitude, OS_COMPLETA.serviceLatitude);
    assert.equal(item.serviceLongitude, OS_COMPLETA.serviceLongitude);
    assert.equal(item.slaDueAt, OS_COMPLETA.slaDueAt);
    assert.deepEqual([item.checkinMode, item.checkinPlateTail], ["plate", "23"]);
    assert.equal("serviceDetails" in item, false, "a lista expôs serviceDetails");
  });
});

// ------------------------------------------------------------------------------------------------
// D1 — a lista do técnico traz o destino e o veículo atendido; a OS sem destino traz as 3 chaves nulas.
// ------------------------------------------------------------------------------------------------
test("D1 — a lista do técnico traz destino, veículo atendido, prazo e coleta; a OS sem destino traz as 3 chaves null", async () => {
  await withApi(async (ctx) => {
    const completa = await ctx.osDoTecnico(OS_COMPLETA);
    const semDestino = await ctx.osDoTecnico({ serviceAddress: "Rua Só Coleta, 1" });
    const { porId } = await ctx.listaDoTecnico();
    const item = porId.get(completa);
    assert.ok(item);
    assert.deepEqual(Object.keys(item).sort(), [...CHAVES_DE_HOJE, ...CHAVES_NOVAS].sort(), "o item não tem exatamente as chaves de hoje + as 4 novas");
    assert.equal(item.destinationAddress, OS_COMPLETA.destinationAddress);
    assert.equal(item.destinationLatitude, OS_COMPLETA.destinationLatitude);
    assert.equal(item.destinationLongitude, OS_COMPLETA.destinationLongitude);
    assert.deepEqual(item.attendedVehicle, { plateMasked: "ABC1D**", model: "Onix", color: "Prata" });
    assert.equal(item.slaDueAt, OS_COMPLETA.slaDueAt);
    assert.equal(item.serviceLatitude, OS_COMPLETA.serviceLatitude);

    const vazio = porId.get(semDestino);
    assert.ok(vazio);
    for (const chave of ["destinationAddress", "destinationLatitude", "destinationLongitude"]) {
      assert.equal(chave in vazio, true, `a chave ${chave} não está presente na OS sem destino`);
      assert.equal(vazio[chave], null, `${chave} deveria ser null na OS sem destino`);
    }
    assert.equal("attendedVehicle" in vazio, true);
    assert.equal(vazio.attendedVehicle, null);
  });
});

// ------------------------------------------------------------------------------------------------
// D1b — o escopo não muda: o outro técnico não recebe o item, e o detalhe de outra organização dá 404.
// ------------------------------------------------------------------------------------------------
test("D1b — escopo inalterado: outro técnico recebe 0 itens; outra organização recebe 404 no detalhe", async () => {
  await withApi(async (ctx) => {
    const id = await ctx.osDoTecnico(OS_COMPLETA);
    const outro = await ctx.req("/api/v1/work-orders?scope=assigned&openOnly=true", {
      headers: ctx.h(ctx.seed.tenantA, ctx.seed.outroTecnico, "field_technician"),
    });
    assert.equal(outro.status, 200, JSON.stringify(outro.body));
    assert.equal((outro.body?.items ?? []).length, 0);
    const deB = await ctx.req(`/api/v1/work-orders/${id}`, { headers: ctx.h(ctx.seed.tenantB, ctx.seed.gestorB, "manager") });
    assert.equal(deB.status, 404, JSON.stringify(deB.body));
  });
});

// ------------------------------------------------------------------------------------------------
// D2 — a lista de `serviceDetails` é fechada: a senha do residencial e o resto nunca saem.
// ------------------------------------------------------------------------------------------------
test("D2 — só as 3 chaves saem de serviceDetails: nada de access_code, object, description nem extra", async () => {
  await withApi(async (ctx) => {
    const id = await ctx.osDoTecnico({
      service_details: {
        plate: PLACA,
        vehicle: "Onix",
        color: "Prata",
        access_code: "SENHA-ZQ9",
        object: "Portao-ZQ",
        description: "x",
        extra: "y",
      },
    });
    const { resposta, porId } = await ctx.listaDoTecnico();
    const corpo = JSON.stringify(resposta.body);
    assert.doesNotMatch(corpo, /SENHA-ZQ9/);
    assert.doesNotMatch(corpo, /Portao-ZQ/);
    const item = porId.get(id);
    assert.ok(item?.attendedVehicle, "attendedVehicle não veio");
    assert.deepEqual(Object.keys(item.attendedVehicle), ["plateMasked", "model", "color"]);
    for (const it of porId.values()) assert.equal("serviceDetails" in it, false, "a lista expôs serviceDetails");
  });
});

// ------------------------------------------------------------------------------------------------
// D2b — conserto da J-597 (C1-01): a forma RESIDENCIAL real, sem `plate`, `vehicle` nem `color` e sem destino. Nenhum
// dos 4 valores sai por campo nenhum do item (mata MYA: a senha no `model`; MYB: a descrição no `destinationAddress`).
// ------------------------------------------------------------------------------------------------
test("D2b — OS residencial real (access_code, object, description, extra): attendedVehicle e destinationAddress null; nenhum dos 4 valores no item", async () => {
  await withApi(async (ctx) => {
    const residencial = { access_code: "SENHA-RZ7Q", object: "Portao-RZ4W", description: "Portao azul, interfone RZ12", extra: "EXTRA-RZ5K" };
    const id = await ctx.osDoTecnico({ serviceAddress: "Rua Residencial, 7", service_details: residencial });
    const { porId } = await ctx.listaDoTecnico();
    const item = porId.get(id);
    assert.ok(item, "a OS residencial não veio na lista do técnico");
    assert.equal("attendedVehicle" in item, true, "attendedVehicle ausente");
    assert.equal(item.attendedVehicle, null, "a OS residencial não tem veículo atendido");
    assert.equal("destinationAddress" in item, true, "destinationAddress ausente");
    assert.equal(item.destinationAddress, null, "a OS residencial não tem destino");
    assert.equal("serviceDetails" in item, false, "a lista expôs serviceDetails");
    const json = JSON.stringify(item);
    for (const [chave, valor] of Object.entries(residencial)) {
      assert.equal(json.includes(valor), false, `o valor de ${chave} (${valor}) saiu no item da lista`);
    }
  });
});

// ------------------------------------------------------------------------------------------------
// D3 — a máscara nasce da referência do check-in; existe se e só se o modo é `plate`; o fim sai por POSIÇÃO.
// ------------------------------------------------------------------------------------------------
const CASOS_DE_PLACA: ReadonlyArray<{ plate: unknown; mascara: string | null; fim: string | null; referencia: string | null }> = [
  { plate: "ABC1234", mascara: "ABC12**", fim: "34", referencia: "ABC1234" },
  { plate: "ABC1D23", mascara: "ABC1D**", fim: "23", referencia: "ABC1D23" },
  { plate: "abc-1d23", mascara: "ABC1D**", fim: "23", referencia: "ABC1D23" },
  { plate: "ABC 1D23", mascara: "ABC1D**", fim: "23", referencia: "ABC1D23" },
  { plate: "ＡＢＣ１Ｄ２３", mascara: "ABC1D**", fim: "23", referencia: "ABC1D23" },
  { plate: "Onix 2019 ABC1D23", mascara: "ABC1D**", fim: "23", referencia: "ABC1D23" },
  { plate: "ABC1D23SP", mascara: "ABC1D**", fim: "23", referencia: "ABC1D23" },
  // O prefixo contém o fim como texto ("ABC23" tem "23"): a conferência é por POSIÇÃO, nunca por busca de texto.
  { plate: "ABC2323", mascara: "ABC23**", fim: "23", referencia: "ABC2323" },
  { plate: "SEM PLACA", mascara: null, fim: null, referencia: null },
  { plate: "ABC1234 XYZ9876", mascara: null, fim: null, referencia: null },
  { plate: "OS-000041", mascara: null, fim: null, referencia: null },
  { plate: 1234, mascara: null, fim: null, referencia: null },
  { plate: null, mascara: null, fim: null, referencia: null },
  { plate: "", mascara: null, fim: null, referencia: null },
  { plate: "  ", mascara: null, fim: null, referencia: null },
];

test("D3 — plateMasked caso a caso: a referência do check-in sem os 2 finais; existe se e só se checkinMode = plate", async () => {
  await withApi(async (ctx) => {
    const ids: string[] = [];
    // `vehicle` garante um `attendedVehicle` não nulo também nos casos sem placa (o D3 olha o `plateMasked`).
    for (const caso of CASOS_DE_PLACA) ids.push(await ctx.osDoTecnico({ service_details: { plate: caso.plate, vehicle: "Gol" } }));
    const { porId } = await ctx.listaDoTecnico();
    CASOS_DE_PLACA.forEach((caso, i) => {
      const rotulo = JSON.stringify(caso.plate);
      const item = porId.get(ids[i] as string);
      assert.ok(item, `${rotulo}: a OS não veio`);
      assert.ok(item.attendedVehicle && typeof item.attendedVehicle === "object", `${rotulo}: attendedVehicle não veio`);
      const mascara = item.attendedVehicle.plateMasked as string | null;
      assert.equal(mascara, caso.mascara, `${rotulo}: plateMasked`);
      assert.equal(item.checkinPlateTail, caso.fim, `${rotulo}: checkinPlateTail`);
      // O invariante, no item servido.
      assert.equal(mascara !== null, item.checkinMode === "plate", `${rotulo}: máscara × modo (${item.checkinMode})`);
      if (mascara !== null) {
        assert.equal(mascara.length, 7, `${rotulo}: tamanho da máscara`);
        assert.equal(mascara.slice(-2), "**", `${rotulo}: os 2 finais não estão escondidos`);
        assert.equal(mascara.slice(0, 5) + item.checkinPlateTail, caso.referencia, `${rotulo}: prefixo + fim ≠ referência`);
      }
    });
  });
});

// ------------------------------------------------------------------------------------------------
// D3b — sem nada, `attendedVehicle` é null; valor que não é texto vira null; o texto é aparado.
// ------------------------------------------------------------------------------------------------
test("D3b — sem placa/veículo/cor → null; vehicle:2019 e color:true → null no campo; '  Onix  ' → 'Onix'", async () => {
  await withApi(async (ctx) => {
    const semNada = await ctx.osDoTecnico({});
    const soNaoTexto = await ctx.osDoTecnico({ service_details: { vehicle: 2019, color: true } });
    const comPlacaNaoTexto = await ctx.osDoTecnico({ service_details: { plate: PLACA, vehicle: 2019, color: true } });
    const aparado = await ctx.osDoTecnico({ service_details: { vehicle: "  Onix  " } });
    const { porId } = await ctx.listaDoTecnico();
    assert.equal(porId.get(semNada)?.attendedVehicle, null);
    assert.equal(porId.get(soNaoTexto)?.attendedVehicle, null);
    assert.deepEqual(porId.get(comPlacaNaoTexto)?.attendedVehicle, { plateMasked: "ABC1D**", model: null, color: null });
    assert.deepEqual(porId.get(aparado)?.attendedVehicle, { plateMasked: null, model: "Onix", color: null });
  });
});

// ------------------------------------------------------------------------------------------------
// D3c — o fim da placa desta OS não chega à tela pelo texto livre de modelo e cor (emenda 1.1, A1).
// ------------------------------------------------------------------------------------------------
test("D3c — a placa no modelo ou na cor anula o campo (regra do check-in + dobra); modelo e cor legítimos ficam", async () => {
  await withApi(async (ctx) => {
    const casos: ReadonlyArray<{ detalhes: Record<string, unknown>; esperado: unknown; referencia: string | null }> = [
      { detalhes: { plate: PLACA, vehicle: "Onix Prata ABC-1D23" }, esperado: { plateMasked: "ABC1D**", model: null, color: null }, referencia: PLACA },
      { detalhes: { plate: PLACA, color: "prata abc1d23" }, esperado: { plateMasked: "ABC1D**", model: null, color: null }, referencia: PLACA },
      // OS sem placa que sirva: a placa no modelo some pela regra do check-in (MD12).
      { detalhes: { plate: "SEM PLACA", vehicle: "Gol ABC1D23" }, esperado: null, referencia: null },
      // Separadores que o check-in não aceita: só a dobra pega (MD11).
      { detalhes: { plate: PLACA, vehicle: "Onix ABC1D2​3" }, esperado: { plateMasked: "ABC1D**", model: null, color: null }, referencia: PLACA },
      { detalhes: { plate: PLACA, vehicle: "Onix ABC.1D/23" }, esperado: { plateMasked: "ABC1D**", model: null, color: null }, referencia: PLACA },
      // Duas placas no texto: o check-in não acha UMA; a dobra acha a desta OS (MD11).
      { detalhes: { plate: PLACA, vehicle: "Uno XYZ9876 e ABC1D23" }, esperado: { plateMasked: "ABC1D**", model: null, color: null }, referencia: PLACA },
      // A-PR1 (pré-revisão do #597) — 2 placas, e a dobra tem de MAIUSCULAR (MP1) e aplicar NFKC (MP2) antes de comparar.
      { detalhes: { plate: PLACA, vehicle: "uno xyz9876 e abc1d23" }, esperado: { plateMasked: "ABC1D**", model: null, color: null }, referencia: PLACA },
      { detalhes: { plate: PLACA, vehicle: "Uno XYZ9876 e ＡＢＣ１Ｄ２３" }, esperado: { plateMasked: "ABC1D**", model: null, color: null }, referencia: PLACA },
      // Modelo e cor legítimos ficam intactos.
      { detalhes: { vehicle: "Onix", color: "Prata" }, esperado: { plateMasked: null, model: "Onix", color: "Prata" }, referencia: null },
      { detalhes: { plate: PLACA, vehicle: "Ka SE 1.5 2019", color: "Prata" }, esperado: { plateMasked: "ABC1D**", model: "Ka SE 1.5 2019", color: "Prata" }, referencia: PLACA },
    ];
    const ids: string[] = [];
    for (const caso of casos) ids.push(await ctx.osDoTecnico({ service_details: caso.detalhes }));
    const { porId } = await ctx.listaDoTecnico();
    casos.forEach((caso, i) => {
      const rotulo = JSON.stringify(caso.detalhes);
      const item = porId.get(ids[i] as string);
      assert.ok(item, `${rotulo}: a OS não veio`);
      assert.equal("attendedVehicle" in item, true, `${rotulo}: attendedVehicle ausente`);
      assert.deepEqual(item.attendedVehicle, caso.esperado, rotulo);
      // Conserto da J-597 (C1-02): nenhum caso tem destino; o destino não nasce de outro dado da OS.
      assert.equal(item.destinationAddress, null, `${rotulo}: destinationAddress sem destino`);
      // A conferência é por dobra, campo a campo (a busca crua no JSON não conta).
      assertFimNaoChegaPorTexto(item, PLACA, rotulo);
      if (caso.referencia !== null) assertFimNaoChegaPorTexto(item, caso.referencia, rotulo);
    });
  });
});

// ------------------------------------------------------------------------------------------------
// D3d — conserto da J-597 (C1-02): OS COM placa e SEM destino. O `destinationAddress` é null e o fim da placa não chega
// por campo novo nem de veículo (mata MYD: `final <fim>` no `destinationAddress`).
// ------------------------------------------------------------------------------------------------
test("D3d — OS com placa e sem destino: destinationAddress null e o fim da placa não chega por outro campo do item", async () => {
  await withApi(async (ctx) => {
    const id = await ctx.osDoTecnico({ serviceAddress: "Rua Só Coleta, 2", service_details: { plate: PLACA, vehicle: "Onix", color: "Prata" } });
    const { porId } = await ctx.listaDoTecnico();
    const item = porId.get(id);
    assert.ok(item, "a OS não veio na lista do técnico");
    assert.deepEqual([item.checkinMode, item.checkinPlateTail], ["plate", "23"]);
    for (const chave of ["destinationAddress", "destinationLatitude", "destinationLongitude"]) {
      assert.equal(chave in item, true, `a chave ${chave} não está presente`);
      assert.equal(item[chave], null, `${chave} deveria ser null na OS sem destino`);
    }
    assert.deepEqual(item.attendedVehicle, { plateMasked: "ABC1D**", model: "Onix", color: "Prata" });
    assertFimNaoChegaPorTexto(item, PLACA, "D3d");
  });
});

// O fuzz é PROPRIEDADE (N = 5 000, semente fixa), sobre o auxiliar; não é controle de mutação (§1.4 da emenda 1.1):
// cada regra sozinha já cobre as 5 decorações. Quem mata a MD11 e a MD12 são os casos nomeados acima.
test("D3c (fuzz) — 5 000 placas desta OS embutidas no modelo com 5 decorações: nenhuma sobrevive", async () => {
  const { toAttendedVehicleDto } = await import("../src/modules/work-orders/work-order.attended-vehicle.js");
  let semente = 20261117;
  const aleatorio = () => {
    semente = (semente * 1103515245 + 12345) % 2147483648;
    return semente / 2147483648;
  };
  const letra = () => "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(aleatorio() * 26)] as string;
  const digito = () => String(Math.floor(aleatorio() * 10));
  const decoracoes = [
    (p: string) => `Onix ${p}`,
    (p: string) => `Onix ${p.slice(0, 3)}-${p.slice(3)}`,
    (p: string) => `onix ${p.toLowerCase()}`,
    (p: string) => `Onix ${p.slice(0, 3)}.${p.slice(3, 5)}/${p.slice(5)}`,
    (p: string) => `Onix ${p.slice(0, 6)}​${p.slice(6)}`,
  ];
  let vazou = 0;
  for (let i = 0; i < 5000; i += 1) {
    const placa = aleatorio() < 0.5 ? `${letra()}${letra()}${letra()}${digito()}${digito()}${digito()}${digito()}` : `${letra()}${letra()}${letra()}${digito()}${letra()}${digito()}${digito()}`;
    const decorar = decoracoes[i % decoracoes.length] as (p: string) => string;
    const dto = toAttendedVehicleDto({ plate: placa, vehicle: decorar(placa), color: decorar(placa) });
    for (const texto of textosDoItem(dto)) if (dobra(texto).includes(placa)) vazou += 1;
  }
  assert.equal(vazou, 0, `${vazou} textos trouxeram a placa da OS`);
});
