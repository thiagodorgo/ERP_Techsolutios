import assert from "node:assert/strict";
import test from "node:test";

// CHECKLIST P1 PR-04c (BLOQUEANTE 1 + ALTA 2 da verificação) — O PORTO LIGADO NA COMPOSIÇÃO DE VERDADE.
//
// A suíte irmã (`field-dispatch-multi-checklist`) prova o que o despacho FAZ com o conjunto, usando um dublê do
// porto. Ela não podia provar — e não provava — a única coisa que decide se o dano chega ao cliente: se as
// RAÍZES DE COMPOSIÇÃO ligam o porto. Não ligavam. A verificação mediu, pelas rotas desta fatia:
//
//   linha de junção com etapa `collection` → execução nascida `generic`
//
// …e `generic` é permanente, porque o carimbo de etapa nunca sobrescreve etapa já gravada. Proveniência errada,
// irreversível, em cima do documento que vira prova do estado do veículo. No dia em que o porto fosse ligado, a
// linha de coleta pediria a própria chave, daria miss, e nasceria uma SEGUNDA execução — e como a métrica
// FATURADA `checklist_runs_count` deduplica por id de evento, uma emissão nova é uma unidade COBRADA nova:
// `1 → 2` na frota inteira de ordens em voo, de uma vez.
//
// Por isso NENHUM caso aqui injeta porto: tudo passa por `createMemoryFieldDispatchService(core)`, exatamente
// como a raiz de produção (`createPrismaFieldDispatchService`) monta o serviço. O que estes testes leem é o
// estado real — a junção persistida, as execuções do repositório de vistorias, a métrica faturada e a timeline
// da ORDEM (a que o aplicativo de campo baixa).

test("[BLOQ 1 · composição real] o porto ligado faz a execução nascer com a ETAPA da linha, e cobra UMA vez", async () => {
  await withRealComposition(async (ctx) => {
    const tpl = await ctx.publishTemplate("Vistoria do Veículo");
    // O caso central do aplicativo: um modelo servindo as duas pontas da mesma ordem.
    const workOrder = await ctx.createWorkOrder([
      { checklistId: tpl.id, role: "collection" },
      { checklistId: tpl.id, role: "delivery" },
    ]);

    await ctx.dispatch(workOrder.id);

    // 1) A ETAPA. Sem o porto ligado esta linha seria `generic` — e ficaria `generic` para sempre.
    const runs = await ctx.listRuns();
    assert.equal(runs.length, 1);
    assert.equal(runs[0].role, "collection");
    assert.notEqual(await ctx.findRunByKey(`dispatch:${workOrder.id}:${tpl.id}:collection`), null);
    // 2) A CHAVE ÓRFÃ que o porto solto criaria — a que, no dia da ligação, viraria a segunda execução.
    assert.equal(await ctx.findRunByKey(`dispatch:${workOrder.id}:${tpl.id}:generic`), null);

    // 3) UMA unidade FATURADA. É a asserção de cabeceira: o dano do porto solto se multiplica por ordem em voo.
    await ctx.flushCloudUsage();
    assert.equal(await ctx.billedRuns(), 1);
  });
});

// MÉDIA 3 (a) — o comentário do `create` afirma, sem condição, que o despacho "congela TODAS as vistorias vivas
// da ordem". Com o porto solto, `freeze` NUNCA era chamado e a afirmação era falsa em produção. Aqui ela é
// verificada por EXECUÇÃO, contra a junção persistida — não contra uma chamada a um dublê.
test("[MÉDIA 3a · composição real] o despacho congela TODAS as linhas vivas, não só a que vai a campo", async () => {
  await withRealComposition(async (ctx) => {
    const coleta = await ctx.publishTemplate("Vistoria de coleta");
    const entrega = await ctx.publishTemplate("Vistoria de entrega");
    const workOrder = await ctx.createWorkOrder([
      { checklistId: coleta.id, role: "collection" },
      { checklistId: entrega.id, role: "delivery" },
    ]);

    // Antes do despacho, nenhuma linha tem formulário congelado.
    assert.deepEqual((await ctx.links(workOrder.id)).map((link) => link.checklistSnapshot), [null, null]);

    await ctx.dispatch(workOrder.id);

    const links = await ctx.links(workOrder.id);
    assert.equal(links.length, 2);
    for (const link of links) {
      assert.notEqual(link.checklistSnapshot, null, `a linha ${link.role} ficou sem formulário congelado`);
    }
    // A primária vai pelo espelho da ordem; a coluna e a linha contam a mesma história.
    assert.deepEqual((await ctx.getWorkOrder(workOrder.id)).checklistSnapshot, links[0].checklistSnapshot);
  });
});

// MÉDIA 3 (b) + ALTA 2 — o comentário do `recordDeferred` afirma que "o guincheiro vê que existe uma segunda
// vistoria". Ver, para o guincheiro, é a timeline da ORDEM: o aplicativo busca `GET /work-orders/:id/timeline` e
// renderiza a `message` do evento. Com o porto solto o verbo nunca era chamado; e a auditoria da vistoria que
// sumiu era gravada na timeline do DESPACHO, que o aplicativo não lê.
test("[MÉDIA 3b · composição real] a vistoria diferida vira linha na história da ORDEM, em PT-BR e sob a allowlist", async () => {
  await withRealComposition(async (ctx) => {
    const tpl = await ctx.publishTemplate("Vistoria do Veículo");
    const workOrder = await ctx.createWorkOrder([
      { checklistId: tpl.id, role: "collection" },
      { checklistId: tpl.id, role: "delivery" },
    ]);

    await ctx.dispatch(workOrder.id);

    const evento = (await ctx.orderTimeline(workOrder.id)).find(
      (item) => item.eventType === "work_order_checklist_run_deferred",
    );
    assert.notEqual(evento, undefined);
    assert.equal(
      evento?.message,
      'A vistoria "Vistoria do Veículo" da entrega foi registrada nesta ordem de serviço e ainda não foi enviada ao técnico.',
    );
    // §3 — nenhum termo técnico atravessa para a tela do campo.
    for (const termo of ["collection", "delivery", "generic", "dispatch", "checklist"]) {
      assert.equal(evento?.message.includes(termo), false, `a mensagem vazou o termo técnico "${termo}"`);
    }
    // §2.8 — allowlist ESTRITA. Chave a mais aqui é chave que ninguém revisou.
    assert.deepEqual(Object.keys(evento?.metadata ?? {}).sort(), [
      "checklistId",
      "checklistLabel",
      "role",
      "ruleId",
      "source",
    ]);
    assert.equal(evento?.metadata.checklistId, tpl.id);
    assert.equal(evento?.metadata.role, "delivery");
    assert.equal(evento?.metadata.source, "manual");
    assert.equal(evento?.metadata.ruleId, null);
    assert.equal(JSON.stringify(evento?.metadata).includes(ctx.tenantId), false);
    assert.equal(JSON.stringify(evento?.metadata).includes(workOrder.id), false);
  });
});

// ALTA 2 — A VISTORIA PROMETIDA QUE NÃO ACONTECEU, do lado de quem está com o veículo.
//
// O plano escolheu `work_order_events` PORQUE é a tabela que o aplicativo de campo lê. A implementação gravava
// só `field_dispatch_checklist_run_failed` em `field_dispatch_events`, e `WorkOrderService.timeline` lê apenas a
// timeline da ordem — resultado medido pela verificação: o guincheiro não via nada.
test("[ALTA 2 · composição real] modelo não publicado no despacho chega à timeline da ORDEM, e a do despacho continua", async () => {
  await withRealComposition(async (ctx) => {
    // O cenário REAL do plano §7.5: a vistoria foi prometida na criação da ordem (modelo publicado) e o modelo
    // saiu de circulação ANTES do despacho. A porta de entrada exige publicação — por isso o estado só é
    // alcançável assim, e não escrevendo uma linha inválida à mão.
    const tpl = await ctx.publishTemplate("Vistoria do Veículo");
    const workOrder = await ctx.createWorkOrder([{ checklistId: tpl.id, role: "collection" }]);
    await ctx.archiveTemplate(tpl.id);

    const dispatch = await ctx.dispatch(workOrder.id);

    // O lado do CAMPO (novo): a ausência aparece na história da ordem.
    const evento = (await ctx.orderTimeline(workOrder.id)).find(
      (item) => item.eventType === "work_order_checklist_missing_at_dispatch",
    );
    assert.notEqual(evento, undefined);
    // O rótulo sai VAZIO, e é o comportamento certo: o modelo foi arquivado, o resolvedor de rótulo não o
    // alcança mais, e a alternativa seria inventar um nome (D-007) sobre um documento que pode virar prova. A
    // frase perde o nome, não o fato — que é o que o guincheiro precisa saber.
    assert.equal(evento?.message, "Uma vistoria da coleta não foi enviada ao técnico: o modelo não está publicado.");
    assert.equal(evento?.metadata.checklistLabel, null);
    assert.equal(evento?.metadata.checklistId, tpl.id);
    assert.equal(evento?.metadata.role, "collection");
    assert.equal(JSON.stringify(evento?.metadata).includes(ctx.tenantId), false);

    // O lado do ESCRITÓRIO (que já existia): a falha segue registrada na timeline do despacho, com a mesma
    // razão. Os dois não são redundantes — são dois públicos, e a verificação reprovou justamente por só
    // existir o segundo.
    const falha = (await ctx.dispatchTimeline(dispatch.id)).find(
      (item) => item.eventType === "field_dispatch_checklist_run_failed",
    );
    assert.equal(falha?.metadata.reason, "template_not_published");

    // FAIL-OPEN preservado: o despacho segue de pé e nenhuma execução (nem unidade faturada) nasceu.
    assert.equal(dispatch.status, "assigned");
    assert.equal((await ctx.listRuns()).length, 0);
    await ctx.flushCloudUsage();
    assert.equal(await ctx.billedRuns(), 0);
  });
});

// ─────────────────── CICLO 2 DA REVISÃO — O RE-DESPACHO ───────────────────
//
// Nada impede um segundo despacho da mesma ordem: não há unique em `field_dispatches(work_order_id)` e o
// comentário do `create` diz literalmente "re-despacho re-congela". Os dois casos abaixo são o que acontece
// quando esse segundo despacho encontra o modelo fora de circulação — o fluxo NORMAL do editor de vistorias.

// BLOQUEANTE 1 — O RE-DESPACHO APAGAVA O FORMULÁRIO CONGELADO.
//
// `resolveChecklistSnapshot` devolve `null` para modelo arquivado, e esse `null` era ESCRITO POR CIMA do
// congelamento do primeiro despacho: no espelho da ordem, na linha primária (que o PR-04c-A passou a gravar na
// mesma escrita) e em cada linha secundária. O formulário que o técnico recebeu deixava de existir, sem cópia em
// lugar nenhum — perda de prova irrecuperável, e a invariante Ω3-c (E1/E3) que o docblock do porto promete
// virando mentira. O freeze é MONOTÔNICO: grava quando há o que gravar, preserva quando não há.
test("[BLOQ 1 · composição real] o re-despacho com o modelo fora de circulação PRESERVA o formulário congelado", async () => {
  await withRealComposition(async (ctx) => {
    const coleta = await ctx.publishTemplate("Vistoria de coleta");
    const entrega = await ctx.publishTemplate("Vistoria de entrega");
    const workOrder = await ctx.createWorkOrder([
      { checklistId: coleta.id, role: "collection" },
      { checklistId: entrega.id, role: "delivery" },
    ]);

    await ctx.dispatch(workOrder.id);
    const congeladoNoPrimeiroDespacho = (await ctx.links(workOrder.id)).map((link) => link.checklistSnapshot);
    const espelhoNoPrimeiroDespacho = (await ctx.getWorkOrder(workOrder.id)).checklistSnapshot;
    assert.equal(congeladoNoPrimeiroDespacho.filter((snapshot) => snapshot !== null).length, 2);
    assert.notEqual(espelhoNoPrimeiroDespacho, null);

    // A organização arquiva os dois modelos. Não é anomalia: é o botão que o editor de vistorias oferece.
    await ctx.archiveTemplate(coleta.id);
    await ctx.archiveTemplate(entrega.id);

    await ctx.dispatch(workOrder.id);

    // A prova sobrevive ao segundo despacho — as DUAS linhas e o espelho seguem com o formulário do primeiro.
    assert.deepEqual(
      (await ctx.links(workOrder.id)).map((link) => link.checklistSnapshot),
      congeladoNoPrimeiroDespacho,
    );
    assert.deepEqual((await ctx.getWorkOrder(workOrder.id)).checklistSnapshot, espelhoNoPrimeiroDespacho);

    // E o re-despacho não cobrou de novo: a execução da primária continua sendo a mesma.
    await ctx.flushCloudUsage();
    assert.equal(await ctx.billedRuns(), 1);
  });
});

// CICLO 3 (MÉDIA) — A TRAVA DO FILTRO POR ENTRADA.
//
// O caso acima arquiva os DOIS modelos, então `freezable` fica vazio e o `if (freezable.length > 0)` sai antes
// de chegar no filtro por entrada — trocar `freezable.map` por `secondary.map` não derrubava nada. O caso que
// discrimina é o MISTO, e é o realista: a organização aposenta UMA vistoria e mantém a outra. Aí a chamada de
// congelamento sai de verdade, e a linha aposentada só preserva o formulário se o filtro por entrada existir.
test("[BLOQ 1 · composição real] com uma vistoria aposentada e outra viva, a aposentada PRESERVA o formulário", async () => {
  await withRealComposition(async (ctx) => {
    const coleta = await ctx.publishTemplate("Vistoria de coleta");
    const entrega = await ctx.publishTemplate("Vistoria de entrega");
    const geral = await ctx.publishTemplate("Vistoria geral");
    const workOrder = await ctx.createWorkOrder([
      { checklistId: coleta.id, role: "collection" },
      { checklistId: entrega.id, role: "delivery" },
      { checklistId: geral.id, role: "generic" },
    ]);

    await ctx.dispatch(workOrder.id);
    const congelados = new Map(
      (await ctx.links(workOrder.id)).map((link) => [link.checklistId, link.checklistSnapshot]),
    );
    assert.equal([...congelados.values()].filter((snapshot) => snapshot !== null).length, 3);

    // Só a vistoria geral sai de circulação. As outras duas continuam publicadas.
    await ctx.archiveTemplate(geral.id);
    await ctx.dispatch(workOrder.id);

    const depois = new Map((await ctx.links(workOrder.id)).map((link) => [link.checklistId, link.checklistSnapshot]));
    // A secundária ainda viva é recongelada normalmente…
    assert.notEqual(depois.get(entrega.id), null);
    // …e a aposentada NÃO perde a prova. É esta asserção que morre se o filtro por entrada sumir.
    assert.deepEqual(depois.get(geral.id), congelados.get(geral.id));
    assert.notEqual(depois.get(geral.id), null);
  });
});

// ALTA 2 — O FATO NEGATIVO FALSO NA TELA DE QUEM ESTÁ COM O VEÍCULO.
//
// Ordem despachada, execução criada, guincheiro respondendo; o modelo é arquivado DEPOIS. No re-despacho, o
// pré-gate ingênuo do `create` (`snapshot === null` ⇒ "não foi enviada") mandava para a timeline da ORDEM — a
// que o aplicativo baixa — o aviso de que a vistoria da coleta não tinha sido enviada. Ela FOI. É a classe que o
// comentário do `provisionChecklistRunForDispatch` condena, e que o `reassign` já evitava tentando antes de
// acusar.
test("[ALTA 2 · composição real] o re-despacho não afirma ao campo que uma vistoria JÁ enviada não foi", async () => {
  await withRealComposition(async (ctx) => {
    const tpl = await ctx.publishTemplate("Vistoria do Veículo");
    const workOrder = await ctx.createWorkOrder([{ checklistId: tpl.id, role: "collection" }]);

    await ctx.dispatch(workOrder.id);
    assert.equal((await ctx.listRuns()).length, 1);

    await ctx.archiveTemplate(tpl.id);
    const segundo = await ctx.dispatch(workOrder.id);

    // A timeline da ORDEM segue sem o fato negativo falso…
    assert.deepEqual(
      (await ctx.orderTimeline(workOrder.id))
        .map((item) => item.eventType)
        .filter((type) => type === "work_order_checklist_missing_at_dispatch"),
      [],
    );
    // …e a timeline do SEGUNDO despacho também: não houve falha nenhuma para relatar.
    assert.deepEqual(
      (await ctx.dispatchTimeline(segundo.id))
        .map((item) => item.eventType)
        .filter((type) => type === "field_dispatch_checklist_run_failed"),
      [],
    );

    // A vistoria que o guincheiro tem na mão continua única, e continua cobrada uma vez.
    assert.equal((await ctx.listRuns()).length, 1);
    await ctx.flushCloudUsage();
    assert.equal(await ctx.billedRuns(), 1);
  });
});

// A ordem ANTERIOR a esta fatia tem de atravessar a composição real exatamente como atravessava antes: uma
// vistoria, etapa genérica, uma unidade faturada. É o contrapeso do caso de cabeceira — ligar o porto não pode
// ter mudado o que já estava em campo.
//
// MÉDIA 4 (ciclo 4 da revisão) — ESTE TESTE NÃO PERCORRIA O CAMINHO QUE O NOME PROMETIA.
//
// Ele dizia cobrir "só o campo legado `checklistId`, junção vazia", e o `createLegacyWorkOrder` chamava
// `WorkOrderService.create({ checklistId })` — que, desde esta fatia, escreve uma linha de junção SEMPRE
// (`work-order.service.ts`, o tri-state `legacy` do conjunto). Ou seja: a ordem nascia COM junção, o despacho
// a lia pela junção, e a VISÃO SINTÉTICA — o caminho de 100% das ordens que existem hoje, porque a decisão do
// dono é sem backfill — ficava sem nenhuma cobertura, sob a aparência de coberta. A ordem legada de verdade só
// se escreve pelo repositório, que é como o banco a tem.
test("[sem regressão · composição real] ordem legada (junção VAZIA) segue com UMA execução genérica e nenhum evento novo", async () => {
  await withRealComposition(async (ctx) => {
    const tpl = await ctx.publishTemplate("Vistoria");
    const workOrder = await ctx.createLegacyWorkOrder(tpl.id);
    // A pré-condição que o nome do teste afirma, agora verificada em vez de suposta.
    assert.deepEqual(await ctx.links(workOrder.id), []);

    await ctx.dispatch(workOrder.id);

    const runs = await ctx.listRuns();
    assert.equal(runs.length, 1);
    assert.equal(runs[0].role, "generic");
    assert.notEqual(await ctx.findRunByKey(`dispatch:${workOrder.id}:${tpl.id}:generic`), null);
    await ctx.flushCloudUsage();
    assert.equal(await ctx.billedRuns(), 1);

    // Nada diferido, nada ausente: a ordem legada tem uma vistoria só, e ela foi.
    assert.deepEqual(
      (await ctx.orderTimeline(workOrder.id))
        .map((item) => item.eventType)
        .filter((type) => type.startsWith("work_order_checklist")),
      [],
    );
    // A junção continua vazia: despachar uma ordem antiga NÃO a materializa (a promoção preguiçosa é disparada
    // por ESCRITA no conjunto, não por leitura). Sem isto, o caminho sintético deixaria de existir no 2º
    // despacho e este teste voltaria a medir a junção.
    assert.deepEqual(await ctx.links(workOrder.id), []);
  });
});

// ─────────────── CICLO 4 — BLOQUEANTE 1: A ORDEM LEGADA COM EXECUÇÃO E SEM CONGELAMENTO ───────────────
//
// O cenário que derrubou o ciclo 3, na composição real e no universo que existe hoje (ordem legada, junção
// vazia, sem backfill). Ele existe porque CONGELAR e PROVISIONAR são caminhos diferentes:
//
//   1. modelo em rascunho, despacho #1  → a vistoria realmente não foi: `missing` = 1 (verdadeiro)
//   2. a organização PUBLICA o modelo
//   3. reatribuição                     → a execução NASCE (auto-recuperação documentada no `reassign`), e o
//                                         `reassign` é read-only sobre snapshots: o congelado segue NULL
//   4. a organização arquiva o modelo
//   5. re-despacho pelo `create`        → snapshot nulo E congelado nulo
//
// No passo 5 o ciclo 3 lia "congelado === null" como "nunca foi ao campo" e DECLARAVA a ausência de uma
// vistoria que o guincheiro tem aberta no aparelho — na timeline da ORDEM, que é o dossiê que vira prova. E
// acumulava: nada muda de estado, então cada re-despacho gravava outro evento falso. O guard do BLOQ 3 não
// alcança este caso, e não deve: ele é explicitamente só para linha de JUNÇÃO (`fromJunction`).
test("[BLOQ 1 · ciclo 4] ordem legada com execução criada no reassign NÃO é declarada ausente no re-despacho", async () => {
  await withRealComposition(async (ctx) => {
    // O modelo ainda é RASCUNHO quando a ordem nasce e é despachada.
    const tpl = await ctx.createTemplate("Vistoria");
    const workOrder = await ctx.createLegacyWorkOrder(tpl.id);
    assert.deepEqual(await ctx.links(workOrder.id), []);

    const primeiro = await ctx.dispatch(workOrder.id);
    // Passo 1 — a ausência aqui é VERDADEIRA e tem de aparecer.
    assert.equal(await ctx.missingCount(workOrder.id), 1);
    assert.equal((await ctx.listRuns()).length, 0);

    // Passo 2/3 — a organização publica, e a reatribuição recupera a execução. É o caminho que o próprio
    // `reassign` documenta como retry; note que ele NÃO congela nada.
    await ctx.publishExisting(tpl.id);
    await ctx.reassign(primeiro.id);
    assert.equal((await ctx.listRuns()).length, 1, "a reatribuição criou a execução");
    assert.equal((await ctx.getWorkOrder(workOrder.id)).checklistSnapshot ?? null, null, "e não congelou nada");

    // Passo 4/5 — o modelo sai de circulação e a ordem é despachada de novo.
    await ctx.archiveTemplate(tpl.id);
    await ctx.dispatch(workOrder.id);

    // A vistoria está com o guincheiro. Nenhum evento NOVO de ausência — o contador continua no 1 verdadeiro
    // do passo 1. Com o discriminador do ciclo 3 este número vira 2, e cresce a cada re-despacho.
    assert.equal(await ctx.missingCount(workOrder.id), 1);
    // E o re-despacho não cobrou de novo.
    await ctx.flushCloudUsage();
    assert.equal(await ctx.billedRuns(), 1);
  });
});

// ---------- harness ----------

type LinkInput = { readonly checklistId: string; readonly role: "collection" | "delivery" | "generic" };

type RealCompositionContext = {
  readonly tenantId: string;
  readonly publishTemplate: (name: string) => Promise<{ id: string }>;
  readonly createTemplate: (name: string) => Promise<{ id: string }>;
  /** Publica um modelo que já existe (o rascunho que a organização decide liberar depois). */
  readonly publishExisting: (checklistId: string) => Promise<void>;
  readonly createWorkOrder: (checklists: readonly LinkInput[]) => Promise<{ id: string }>;
  readonly archiveTemplate: (checklistId: string) => Promise<void>;
  readonly createLegacyWorkOrder: (checklistId: string) => Promise<{ id: string }>;
  readonly getWorkOrder: (workOrderId: string) => Promise<{ checklistSnapshot?: Record<string, unknown> | null }>;
  readonly links: (
    workOrderId: string,
  ) => Promise<readonly { role: string; checklistSnapshot?: Record<string, unknown> | null }[]>;
  readonly dispatch: (workOrderId: string) => Promise<{ id: string; status: string }>;
  readonly reassign: (dispatchId: string) => Promise<void>;
  /** Quantos eventos de "vistoria não enviada" a história da ORDEM acumulou. Contar, e não só existir: o defeito do ciclo 3 grava um a CADA re-despacho. */
  readonly missingCount: (workOrderId: string) => Promise<number>;
  readonly orderTimeline: (
    workOrderId: string,
  ) => Promise<readonly { eventType: string; message: string; metadata: Record<string, unknown> }[]>;
  readonly dispatchTimeline: (
    dispatchId: string,
  ) => Promise<readonly { eventType: string; message: string; metadata: Record<string, unknown> }[]>;
  readonly listRuns: () => Promise<readonly { role?: string }[]>;
  readonly findRunByKey: (key: string) => Promise<unknown>;
  readonly flushCloudUsage: () => Promise<void>;
  readonly billedRuns: () => Promise<number>;
};

async function withRealComposition(cb: (ctx: RealCompositionContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createMemoryFieldDispatchService, resetFieldDispatchRuntimeForTests },
    { createMemoryWorkOrderService, resetWorkOrderRuntimeForTests, getMemoryWorkOrderRepositoryForTests },
    { createMemoryChecklistService, resetChecklistRuntimeForTests },
    { resetCloudUsageRuntimeForTests, getMemoryCloudUsageRepositoryForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/modules/field-dispatch/field-dispatch.service.js"),
    import("../src/modules/work-orders/work-order.service.js"),
    import("../src/modules/checklists/checklist.service.js"),
    import("../src/modules/cloud-usage/cloud-usage.service.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  resetFieldDispatchRuntimeForTests();
  resetWorkOrderRuntimeForTests();
  resetChecklistRuntimeForTests();
  resetCloudUsageRuntimeForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenant = core.createTenant({
    name: "T Porto",
    modules: ["work_orders", "field_operations", "tenant_checklist", "checklists"],
  });
  const manager = core.createUser({ tenantId: tenant.id, name: "Mgr", email: "porto-mgr@example.com", roles: ["manager"] });
  const tech = core.createUser({ tenantId: tenant.id, name: "Tec", email: "porto-tec@example.com", roles: ["field_technician"] });
  const techB = core.createUser({ tenantId: tenant.id, name: "Tec B", email: "porto-tec-b@example.com", roles: ["field_technician"] });
  let legacySequence = 1;

  // A COMPOSIÇÃO REAL, sem porto injetado: é ela que estava montando o despacho sem o conjunto de vistorias.
  // Os serviços abaixo falam com os MESMOS repositórios singleton (modo memória), então o que os testes leem é
  // o estado que o despacho gravou — não um espião.
  const dispatchService = createMemoryFieldDispatchService(new MemoryCoreSaasAdapter(core));
  const workOrderService = createMemoryWorkOrderService();
  const checklistService = createMemoryChecklistService();

  const actorContext = { tenantId: tenant.id, userId: manager.id };
  const workOrderActor = {
    tenantId: tenant.id,
    userId: manager.id,
    roles: ["manager"],
    permissions: ["work_orders:read", "work_orders:create", "work_orders:update"],
  } as never;
  const dispatchActor = {
    tenantId: tenant.id,
    userId: manager.id,
    roles: ["manager"],
    permissions: ["field_dispatch:read", "field_dispatch:create", "field_dispatch:reassign"],
  } as never;

  const ctx: RealCompositionContext = {
    tenantId: tenant.id,
    createTemplate: async (name) => {
      const template = await checklistService.createTemplate(actorContext, {
        name,
        type: "technical_evidence",
        description: undefined,
        schema: { source: "chk-p1-pr04c" },
        components: [
          {
            componentKey: "safety_ok",
            type: "observation",
            label: "O local esta seguro?",
            required: true,
            orderIndex: 0,
            config: {},
            validationRules: {},
            visibilityRules: {},
          },
        ],
      });
      return { id: template.id };
    },
    publishTemplate: async (name) => {
      const created = await ctx.createTemplate(name);
      await checklistService.publishTemplate(actorContext, created.id);
      return created;
    },
    publishExisting: async (checklistId) => {
      await checklistService.publishTemplate(actorContext, checklistId);
    },
    archiveTemplate: async (checklistId) => {
      await checklistService.archiveTemplate(actorContext, checklistId);
    },
    createWorkOrder: async (checklists) => {
      const workOrder = await workOrderService.create(workOrderActor, {
        title: "OS com conjunto de vistorias",
        checklists: checklists.map((link) => ({ checklistId: link.checklistId, role: link.role })),
      });
      return { id: workOrder.id };
    },
    // MÉDIA 4 (ciclo 4) — A ORDEM LEGADA DE VERDADE, escrita como o banco a tem: `checklist_id` preenchido e
    // junção VAZIA. `WorkOrderService.create({ checklistId })` NÃO produz esse estado desde esta fatia — o
    // tri-state `legacy` materializa uma linha de junção — então usar o serviço aqui media o caminho novo com
    // o nome do antigo. Escrever pelo repositório não é atalho: é a única forma de reproduzir as ordens que
    // existem hoje, já que a decisão do dono é SEM backfill.
    createLegacyWorkOrder: async (checklistId) => {
      const workOrder = await getMemoryWorkOrderRepositoryForTests().create({
        tenantId: tenant.id,
        code: `OS-LEGADA-${legacySequence++}`,
        title: "OS legada",
        priority: "medium",
        checklistId,
        createdBy: manager.id,
        updatedBy: manager.id,
      });
      return { id: workOrder.id };
    },
    getWorkOrder: async (workOrderId) => workOrderService.get(workOrderActor, workOrderId),
    links: async (workOrderId) => workOrderService.listChecklistLinks(tenant.id, workOrderId),
    dispatch: async (workOrderId) => {
      const created = await dispatchService.create(dispatchActor, { workOrderId, operatorUserId: tech.id });
      return { id: created.id, status: created.status };
    },
    reassign: async (dispatchId) => {
      await dispatchService.reassign(dispatchActor, dispatchId, { operatorUserId: techB.id });
    },
    missingCount: async (workOrderId) =>
      (await ctx.orderTimeline(workOrderId)).filter(
        (item) => item.eventType === "work_order_checklist_missing_at_dispatch",
      ).length,
    orderTimeline: async (workOrderId) => workOrderService.timeline(workOrderActor, workOrderId),
    dispatchTimeline: async (dispatchId) => dispatchService.timeline(dispatchActor, dispatchId),
    listRuns: async () => checklistService.listRuns(actorContext),
    findRunByKey: async (key) => checklistService.findRunByClientKey(actorContext, key),
    // `recordCloudUsageBestEffort` é fire-and-forget; drena antes de inspecionar a métrica FATURADA.
    flushCloudUsage: async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    },
    billedRuns: async () => {
      const events = await getMemoryCloudUsageRepositoryForTests().listEvents({ tenantId: tenant.id });
      return events.filter((event: { metricKey: string }) => event.metricKey === "checklist_runs_count").length;
    },
  };

  try {
    await cb(ctx);
  } finally {
    resetFieldDispatchRuntimeForTests();
    resetWorkOrderRuntimeForTests();
    resetChecklistRuntimeForTests();
    resetCloudUsageRuntimeForTests();
  }
}
