import assert from "node:assert/strict";
import test from "node:test";

import type { WorkOrderChecklistLink } from "../src/modules/work-orders/work-order-checklists.types.js";

// CHECKLIST P1 PR-04c — O DESPACHO COM UM CONJUNTO DE VISTORIAS.
//
// A ordem de serviço deixou de ter "o checklist" e passou a ter um conjunto (coleta, entrega, genérica). Este
// arquivo cobre o que o despacho faz com esse conjunto, e as três decisões da junta que mais custam se forem
// silenciadas:
//
//  · §7.2  — congela TODAS as vistorias vivas, não só a que vai a campo;
//  · §7.3  — provisiona SÓ a primária (escolha (b)), e registra as demais em vez de as esconder;
//  · BLOQ 3 — nunca provisiona linha que o congelamento não viu;
//  · ALTA 9 — vistoria prometida que não foi (modelo despublicado) vira linha de auditoria, não silêncio.

test("[conjunto] duas fases do MESMO modelo → congela as 2, provisiona SÓ a primária, registra a diferida", async () => {
  await withDispatch(async (ctx) => {
    const tpl = await ctx.publishTemplate("Vistoria do Veículo");
    const workOrder = await ctx.createWorkOrder(tpl.id);
    // A configuração que a junta 04c decidiu PERMITIR: um modelo só, servindo coleta e entrega da mesma ordem.
    // É esse par que a tela de comparação do app confronta contra um schema único.
    ctx.setLinks(workOrder.id, [
      ctx.link(workOrder.id, tpl.id, "collection", 0),
      ctx.link(workOrder.id, tpl.id, "delivery", 1),
    ]);

    const dispatch = await ctx.dispatch(workOrder.id);
    assert.equal(dispatch.status, "assigned");

    // §7.2 — o congelamento cobre o conjunto INTEIRO. A primária vai pelo espelho da ordem
    // (`freezeChecklistSnapshot`, que grava a linha primária junto); a de entrega vai pelo porto.
    assert.deepEqual(
      ctx.frozen.map((entry) => `${entry.checklistId}:${entry.role}`),
      [`${tpl.id}:delivery`],
    );
    assert.notEqual((await ctx.getWorkOrder(workOrder.id)).checklistSnapshot, null);

    // §7.3 — UMA execução, a da primária. Provisionar as duas entregaria uma unidade FATURADA que ninguém no
    // app consegue abrir hoje, e uma vistoria vazia dentro do dossiê de custódia (prova jurídica).
    assert.equal(ctx.provisioned.length, 1);
    assert.equal(ctx.provisioned[0].checklistId, tpl.id);
    assert.equal(ctx.provisioned[0].role, "collection");

    // …e a que ficou para depois NÃO some: vira linha na história da ordem, que o app de campo lê.
    assert.deepEqual(
      ctx.deferred.map((entry) => `${entry.checklistId}:${entry.role}`),
      [`${tpl.id}:delivery`],
    );
  });
});

// A fase entra na CHAVE de idempotência: `dispatch:<ordem>:<modelo>:<fase>`. Sem isso, a vistoria de entrega
// do mesmo modelo colidiria com a de coleta e nunca existiria — o caso de uso central do app.
test("[fase na chave] a execução nasce com a fase da linha, e a chave de idempotência carrega a fase", async () => {
  await withDispatch(async (ctx) => {
    const tpl = await ctx.publishTemplate("Vistoria");
    const workOrder = await ctx.createWorkOrder(tpl.id);
    ctx.setLinks(workOrder.id, [ctx.link(workOrder.id, tpl.id, "delivery", 0)]);

    await ctx.dispatch(workOrder.id);

    const run = await ctx.findRunByKey(`dispatch:${workOrder.id}:${tpl.id}:delivery`);
    assert.notEqual(run, null);
    assert.equal(run?.role, "delivery");
    // Re-despacho: mesma chave, mesma execução — a idempotência de hoje continua de pé com a fase dentro.
    await ctx.dispatch(workOrder.id);
    assert.equal((await ctx.listRuns()).length, 1);
  });
});

// BLOQ 3 — o achado mais silencioso do ataque: o `reassign` roda o provisionamento SEMPRE e é declaradamente
// READ-only sobre snapshots (não re-congela). Uma vistoria acrescentada ao conjunto DEPOIS do despacho tem
// `checklist_snapshot` nulo; provisioná-la mandaria ao técnico um formulário que o congelamento nunca viu —
// e ainda FATURARIA por isso.
test("[BLOQ 3] linha de junção SEM congelamento nunca vira execução, nem no reassign", async () => {
  await withDispatch(async (ctx) => {
    const tpl = await ctx.publishTemplate("Vistoria");
    const workOrder = await ctx.createWorkOrder(tpl.id);
    // Estado que só a junção produz: linha viva, primária, e sem freeze nenhum.
    ctx.setLinks(workOrder.id, [{ ...ctx.link(workOrder.id, tpl.id, "collection", 0), checklistSnapshot: null }]);

    const dispatch = await ctx.dispatch(workOrder.id);
    // O `create` congela antes de provisionar, então ele PODE provisionar — o que o teste tranca é o caminho
    // que NÃO congela. Zera o rastro do create e força a linha de volta ao estado sem freeze.
    ctx.provisioned.length = 0;
    ctx.setLinks(workOrder.id, [{ ...ctx.link(workOrder.id, tpl.id, "collection", 0), checklistSnapshot: null }]);

    await ctx.reassign(dispatch.id);

    assert.equal(ctx.provisioned.length, 0);
  });
});

// A trava acima é ESTREITA: ela vale para linha de junção sem freeze, não para a ordem antiga (que não tem
// linha nenhuma). Confundir as duas quebraria a auto-recuperação do reassign — o único retry de quem teve a
// provisão inicial falhando.
test("[não é trava demais] ordem antiga (sem junção) segue alcançando o provisionamento no reassign", async () => {
  await withDispatch(async (ctx) => {
    const tpl = await ctx.publishTemplate("Vistoria");
    const workOrder = await ctx.createWorkOrder(tpl.id);
    // Nenhuma linha de junção: é a visão sintética do §5.3.
    const dispatch = await ctx.dispatch(workOrder.id);
    ctx.provisioned.length = 0;

    await ctx.reassign(dispatch.id);

    assert.equal(ctx.provisioned.length, 1);
    // Visão sintética ⇒ fase genérica: a ordem antiga não declarou fase nenhuma, e inventar uma seria fabricar
    // proveniência (D-007).
    assert.equal(ctx.provisioned[0].role, "generic");
  });
});

// ALTA 9 — o modelo despublicado entre a criação da ordem e o despacho. Antes desta fatia era um `if` que não
// entrava: a vistoria prometida pela regra sumia sem uma linha na história, e ninguém descobria até o litígio.
test("[ALTA 9] modelo não publicado no despacho → falha AUDITADA com razão `template_not_published`", async () => {
  await withDispatch(async (ctx) => {
    const draft = await ctx.createTemplate("Rascunho");
    const workOrder = await ctx.createWorkOrder(draft.id);

    const dispatch = await ctx.dispatch(workOrder.id);
    // FAIL-OPEN: o despacho segue de pé; o que muda é que a ausência da vistoria passa a ser visível.
    assert.equal(dispatch.status, "assigned");
    assert.equal(ctx.provisioned.length, 0);

    const timeline = await ctx.timeline(dispatch.id);
    const failure = timeline.find((event) => event.eventType === "field_dispatch_checklist_run_failed");
    assert.notEqual(failure, undefined);
    assert.equal(failure?.metadata.reason, "template_not_published");
    assert.equal(failure?.metadata.checklistId, draft.id);
    // §3 — a mensagem é de negócio, em PT-BR, e diz o motivo real em vez de "falha ao provisionar".
    assert.equal(failure?.message, "A vistoria não foi enviada ao técnico: o modelo não está publicado.");
    // §2.8 — auditoria sem tenant externo.
    assert.equal(JSON.stringify(failure?.metadata).includes(ctx.tenantId), false);
  });
});

test("[ALTA 9 no conjunto] a vistoria despublicada é auditada mesmo quando NÃO é a primária", async () => {
  await withDispatch(async (ctx) => {
    const published = await ctx.publishTemplate("Publicada");
    const draft = await ctx.createTemplate("Rascunho");
    const workOrder = await ctx.createWorkOrder(published.id);
    ctx.setLinks(workOrder.id, [
      ctx.link(workOrder.id, published.id, "collection", 0),
      ctx.link(workOrder.id, draft.id, "delivery", 1),
    ]);

    const dispatch = await ctx.dispatch(workOrder.id);

    // A primária vai a campo…
    assert.equal(ctx.provisioned.length, 1);
    assert.equal(ctx.provisioned[0].checklistId, published.id);
    // …e a de entrega, que perdeu a publicação, é auditada em vez de virar linha diferida silenciosa.
    assert.deepEqual(ctx.deferred, []);
    const failures = (await ctx.timeline(dispatch.id)).filter(
      (event) => event.eventType === "field_dispatch_checklist_run_failed",
    );
    assert.equal(failures.length, 1);
    assert.equal(failures[0].metadata.checklistId, draft.id);
    assert.equal(failures[0].metadata.reason, "template_not_published");
  });
});

// ─────────── O REASSIGN QUANDO O MODELO SAIU DE CIRCULAÇÃO (resíduo não declarado do 1º ciclo) ───────────
//
// O código entregue trocava a resolução AO VIVO do reassign por `snapshotCongelado ?? resolveAoVivo()`. Com um
// snapshot congelado na linha, a pergunta "este modelo ainda pode ser executado?" deixava de ser feita: o
// provisionamento seguia, o `createRun` estourava lá dentro e a razão auditada saía pela taxonomia interna do
// módulo de vistorias (`checklist_not_published` no despublicado, `checklist_not_found` no arquivado) — dois
// códigos para o MESMO fato que o `create` chama de `template_not_published`. Sem nenhum teste.
//
// O comportamento decidido, e o que cada um dos dois casos abaixo tranca:
//   · execução JÁ existe  ⇒ NADA acontece. É o caso normal (o despacho a criou) e um aviso aqui afirmaria um
//     fato negativo FALSO: a vistoria FOI enviada, o guincheiro está com ela na mão.
//   · execução NÃO existe e o modelo saiu de circulação ⇒ falha AUDITADA com o MESMO código do `create`, mais
//     a linha na história da ORDEM — porque quem acabou de RECEBER a reatribuição é exatamente quem precisa
//     saber que a vistoria prometida não vem. O `return` mudo de antes era a doença que a ALTA 9 matou.
test("[reassign · modelo fora de circulação] execução JÁ existente não vira alarme falso", async () => {
  await withDispatch(async (ctx) => {
    const tpl = await ctx.publishTemplate("Vistoria");
    const workOrder = await ctx.createWorkOrder(tpl.id);
    ctx.setLinks(workOrder.id, [ctx.link(workOrder.id, tpl.id, "collection", 0)]);

    const dispatch = await ctx.dispatch(workOrder.id);
    assert.equal(ctx.provisioned.length, 1);

    // O modelo sai de circulação DEPOIS do despacho — a vistoria já está com o técnico.
    await ctx.archiveTemplate(tpl.id);
    await ctx.reassign(dispatch.id);

    // O provisionamento é tentado (é idempotente e a execução existe), e é justamente por ser tentado que ele
    // sabe que não há nada a relatar. Zero falhas, zero linhas na ordem.
    const failures = (await ctx.timeline(dispatch.id)).filter(
      (event) => event.eventType === "field_dispatch_checklist_run_failed",
    );
    assert.equal(failures.length, 0);
    assert.deepEqual(ctx.missing, []);
    assert.equal((await ctx.listRuns()).length, 1);
  });
});

// MÉDIA 4 — ESTES DOIS CASOS PASSAVAM PELO MOTIVO ERRADO, e o dublê honesto os derrubou.
//
// O estado que ambos declaravam — "linha de junção CONGELADA cujo modelo nunca chegou a publicar" (e, no caso
// do arquivado, uma linha `collection` nascida DEPOIS do despacho já vindo congelada) — é INALCANÇÁVEL na
// produção: o congelamento é o snapshot do modelo PUBLICADO, então nenhuma linha de um modelo que nunca
// publicou pode carregá-lo, e linha acrescentada depois do despacho nasce sem formulário. Era só o
// `checklistSnapshot: { frozen: true }` que o `link()` forçava. Com o dublê corrigido, os dois caem em
// `checklist_not_frozen` (o guard do BLOQ 3, agora com voz — MÉDIA 3), não em `template_not_published`.
//
// O estado REAL em que o reassign encosta num modelo fora de circulação SEM execução é o caminho de
// RECUPERAÇÃO que o próprio código documenta: o despacho congelou a linha (o modelo estava publicado) e a
// provisão da execução FALHOU (fail-open); só depois a organização tirou o modelo de circulação.
test("[reassign · modelo inativado] sem execução → falha auditada com `template_not_published` e linha na ordem", async () => {
  await withDispatch(async (ctx) => {
    const tpl = await ctx.publishTemplate("Vistoria");
    const workOrder = await ctx.createWorkOrder(tpl.id);
    ctx.setLinks(workOrder.id, [ctx.link(workOrder.id, tpl.id, "collection", 0)]);
    ctx.failProvisionOnce();

    const dispatch = await ctx.dispatch(workOrder.id);
    // O despacho congelou a linha…
    assert.notEqual(ctx.links(workOrder.id)[0].checklistSnapshot, null);
    // …e a execução não nasceu. É exatamente para isto que o reassign reprovisiona.
    assert.equal((await ctx.listRuns()).length, 0);
    // O create já auditou a falha (com `unexpected`, que é o que ela foi). Este caso mede o DELTA do reassign —
    // contar o total esconderia se o reassign parou de registrar.
    const antes = (await ctx.timeline(dispatch.id)).filter(
      (event) => event.eventType === "field_dispatch_checklist_run_failed",
    ).length;
    assert.equal(antes, 1);
    ctx.missing.length = 0;

    // A organização tira o modelo das novas ordens (fluxo do editor). `createRun` passa a recusar com
    // `checklist_not_published`.
    await ctx.inactivateTemplate(tpl.id);
    await ctx.reassign(dispatch.id);

    // A razão é a MESMA do create — um fato, um código. Sem a normalização sairia `checklist_not_published`
    // aqui e `template_not_published` lá, e ninguém somaria as duas seis meses depois.
    const failures = (await ctx.timeline(dispatch.id)).filter(
      (event) => event.eventType === "field_dispatch_checklist_run_failed",
    );
    assert.equal(failures.length, antes + 1);
    assert.equal(failures[failures.length - 1].metadata.reason, "template_not_published");
    // …e o campo fica sabendo: a ausência também vai para a história da ORDEM, que o aplicativo baixa.
    assert.deepEqual(
      ctx.missing.map((entry) => `${entry.checklistId}:${entry.role}`),
      [`${tpl.id}:collection`],
    );
    assert.equal((await ctx.listRuns()).length, 0);
  });
});

// O mesmo caminho com o modelo ARQUIVADO — a taxonomia interna devolve `checklist_not_found` aqui, e é o
// segundo nome que a normalização colapsa. Sem ele, a mesma ocorrência apareceria com duas grafias conforme o
// modelo tivesse sido inativado ou arquivado.
test("[reassign · modelo arquivado] a razão auditada é `template_not_published`, não o código interno do módulo", async () => {
  await withDispatch(async (ctx) => {
    const tpl = await ctx.publishTemplate("Vistoria");
    const workOrder = await ctx.createWorkOrder(tpl.id);
    ctx.setLinks(workOrder.id, [ctx.link(workOrder.id, tpl.id, "delivery", 0)]);
    ctx.failProvisionOnce();

    const dispatch = await ctx.dispatch(workOrder.id);
    assert.notEqual(ctx.links(workOrder.id)[0].checklistSnapshot, null);
    assert.equal((await ctx.listRuns()).length, 0);
    ctx.missing.length = 0;

    await ctx.archiveTemplate(tpl.id);
    await ctx.reassign(dispatch.id);

    const failures = (await ctx.timeline(dispatch.id)).filter(
      (event) => event.eventType === "field_dispatch_checklist_run_failed",
    );
    // 1 do create (`unexpected`, a falha simulada) + 1 do reassign.
    assert.equal(failures.length, 2);
    assert.equal(failures[1].metadata.reason, "template_not_published");
    assert.deepEqual(
      ctx.missing.map((entry) => `${entry.checklistId}:${entry.role}`),
      [`${tpl.id}:delivery`],
    );
  });
});

// CICLO 3 — CONGELADO NÃO É PROVA DE ENVIO.
//
// É o gêmeo do caso acima pelo caminho do CREATE, que era o buraco: o ciclo 2 discriminou por "a linha já tem
// congelamento", lendo isso como "a vistoria foi ao campo". Como o create é fail-open, existe o estado em que a
// linha está congelada e a execução NUNCA nasceu — e aí arquivar o modelo e re-despachar produzia silêncio nas
// duas linhas do tempo, sobre uma vistoria inexistente que este ramo jamais tentaria criar de novo.
test("[ciclo 3 · re-despacho] linha congelada SEM execução não vira silêncio: o create declara a vistoria que não foi", async () => {
  await withDispatch(async (ctx) => {
    const tpl = await ctx.publishTemplate("Vistoria");
    const workOrder = await ctx.createWorkOrder(tpl.id);
    ctx.setLinks(workOrder.id, [ctx.link(workOrder.id, tpl.id, "collection", 0)]);
    ctx.failProvisionOnce();

    const primeiro = await ctx.dispatch(workOrder.id);
    // O estado exato que o ciclo 2 confundia com "foi ao campo": congelada, e com ZERO execução.
    assert.notEqual(ctx.links(workOrder.id)[0].checklistSnapshot, null);
    assert.equal((await ctx.listRuns()).length, 0);
    assert.equal(primeiro.status, "assigned");
    ctx.missing.length = 0;

    // A organização arquiva o modelo, e a ordem é despachada DE NOVO — pelo create, não pelo reassign.
    await ctx.archiveTemplate(tpl.id);
    const segundo = await ctx.dispatch(workOrder.id);

    // O congelamento anterior sobrevive (BLOQ 1: o freeze é monotônico, nunca zera o que já congelou)…
    assert.notEqual(ctx.links(workOrder.id)[0].checklistSnapshot, null);
    // …e a ausência é DECLARADA nas duas superfícies em vez de sumir.
    const failures = (await ctx.timeline(segundo.id)).filter(
      (event) => event.eventType === "field_dispatch_checklist_run_failed",
    );
    assert.equal(failures.length, 1);
    assert.equal(failures[0].metadata.reason, "template_not_published");
    assert.deepEqual(
      ctx.missing.map((entry) => `${entry.checklistId}:${entry.role}`),
      [`${tpl.id}:collection`],
    );
    // E a leitura não fabricou execução nenhuma: ela só respondeu a pergunta.
    assert.equal((await ctx.listRuns()).length, 0);
  });
});

// CICLO 4 (BLOQUEANTE 2) — A TENTATIVA PODIA CRIAR, E CRIAVA UMA SECUNDÁRIA.
//
// O ciclo 3 respondia "esta vistoria foi ao campo?" TENTANDO provisionar, com o argumento de que a tentativa
// "não pode criar nada aqui, porque o modelo já não é executável". A invariante era TOCTOU, não estrutural:
// `resolveChecklistSnapshot` roda no começo do `create` e o laço roda depois de DUAS escritas de banco. Uma
// publicação concorrente nessa janela — a rota `POST /tenant/checklists/:id/publish`, um clique de outro
// operador — fazia o `createRun` ter sucesso. E o laço percorre TODAS as linhas, inclusive secundárias: a
// escolha (b) do §7.3 (persistir N, provisionar 1) caía por uma corrida, com execução vazia entrando no
// dossiê de custódia e uma UNIDADE FATURADA nova.
//
// A asserção é por `billedRuns()`, e isso é deliberado: contar TENTATIVAS mede o instrumento errado (foi
// medindo tentativas que a trava `[ALTA 9]` forçou o remendo estreito do ciclo 3). O que a §7.3 proíbe é
// CRIAR — então mede-se criação.
test("[BLOQ 2 · TOCTOU] o laço não cria execução nem com o modelo voltando a ser publicado no meio do despacho", async () => {
  await withDispatch(async (ctx) => {
    const coleta = await ctx.publishTemplate("Vistoria de coleta");
    const entrega = await ctx.publishTemplate("Vistoria de entrega");
    const geral = await ctx.publishTemplate("Vistoria geral");
    const workOrder = await ctx.createWorkOrder(coleta.id);
    ctx.setLinks(workOrder.id, [
      ctx.link(workOrder.id, coleta.id, "collection", 0),
      ctx.link(workOrder.id, entrega.id, "delivery", 1),
      ctx.link(workOrder.id, geral.id, "generic", 2),
    ]);

    // Despacho #1: congela as três, provisiona só a primária. UMA unidade faturada.
    await ctx.dispatch(workOrder.id);
    assert.equal(ctx.provisioned.length, 1);
    await ctx.flushCloudUsage();
    assert.equal(await ctx.billedRuns(), 1);

    // A organização tira a "geral" de circulação…
    await ctx.inactivateTemplate(geral.id);
    // …e a republica DENTRO da janela do próximo despacho: o snapshot dela já foi resolvido como nulo, mas
    // quando o laço perguntar o modelo estará executável de novo. É a corrida exata do achado.
    ctx.publishOnNextFreeze(geral.id);

    const segundo = await ctx.dispatch(workOrder.id);

    // A trava: nenhuma execução NOVA — nem a secundária que a tentativa criava, nem qualquer outra.
    await ctx.flushCloudUsage();
    assert.equal(await ctx.billedRuns(), 1, "o laço de auditoria emitiu uma unidade faturada");
    assert.equal((await ctx.listRuns()).length, 1);
    // O provisionador SÓ foi consultado sobre a primária (o re-despacho a re-pede, e a idempotência devolve a
    // mesma execução). Nenhuma secundária chegou perto dele — a §7.3 não depende de quem ganhou a corrida.
    assert.deepEqual(
      [...new Set(ctx.provisioned.map((entry) => `${entry.checklistId}:${entry.role}`))],
      [`${coleta.id}:collection`],
    );
    // E a pergunta foi feita por LEITURA, sobre a linha certa.
    assert.deepEqual(
      ctx.lookups.map((entry) => `${entry.checklistId}:${entry.role}`),
      [`${geral.id}:generic`],
    );

    // …e o fato declarado continua verdadeiro: a vistoria geral não foi ao técnico neste despacho (a §7.3
    // reserva a execução à primária), então ela APARECE nas duas superfícies em vez de sumir.
    assert.deepEqual(
      ctx.missing.map((entry) => `${entry.checklistId}:${entry.role}`),
      [`${geral.id}:generic`],
    );
    const failures = (await ctx.timeline(segundo.id)).filter(
      (event) => event.eventType === "field_dispatch_checklist_run_failed",
    );
    assert.equal(failures.length, 1);
    assert.equal(failures[0].metadata.checklistId, geral.id);
  });
});

// CICLO 4 — A LEITURA CONSULTA AS DUAS CHAVES, COMO O PROVISIONAMENTO GRAVA.
//
// A ordem EM VOO no dia do deploy tem execução gravada com a chave ANTIGA `dispatch:<ordem>:<modelo>`, sem
// fase. Perguntar só pela chave nova daria "não foi ao campo" para a frota inteira — e o guincheiro receberia,
// na timeline da própria ordem, a negação de uma vistoria aberta no aparelho dele. O fallback é restrito a
// `generic` pela MESMA razão que a ADOÇÃO no provisionador: a chave legada nasceu num mundo sem fase, e deixar
// uma linha de coleta enxergá-la calaria uma vistoria que nunca teve fase.
test("[chave legada] execução da ordem em voo (chave sem fase) faz o re-despacho CALAR, e só para a fase genérica", async () => {
  await withDispatch(async (ctx) => {
    const tpl = await ctx.publishTemplate("Vistoria");
    const workOrder = await ctx.createWorkOrder(tpl.id);
    // A ordem em voo: execução criada ANTES desta fatia, com a chave sem fase. Nenhuma linha de junção — é a
    // visão sintética, que é como o despacho lê as ordens de hoje.
    await ctx.createRunWithLegacyKey(workOrder.id, tpl.id);
    await ctx.inactivateTemplate(tpl.id);

    await ctx.dispatch(workOrder.id);

    // A vistoria FOI: nada de fato negativo, em nenhuma das duas superfícies.
    assert.deepEqual(ctx.missing, []);
    assert.equal((await ctx.listRuns()).length, 1);

    // …e o fallback não vale para fase concreta: a mesma execução legada NÃO responde pela coleta.
    ctx.setLinks(workOrder.id, [ctx.link(workOrder.id, tpl.id, "collection", 0, { frozen: true })]);
    ctx.missing.length = 0;
    await ctx.dispatch(workOrder.id);
    assert.deepEqual(
      ctx.missing.map((entry) => `${entry.checklistId}:${entry.role}`),
      [`${tpl.id}:collection`],
    );
  });
});

// CICLO 4 (MÉDIA 3) — INCIDENTE DE SERVIDOR NÃO É DECISÃO DA ORGANIZAÇÃO.
//
// O laço do ciclo 3 tinha um `catch {}` seco e gravava a razão HARDCODED `template_not_published`. Antes dele
// isso era verdadeiro por construção (só se chegava ali sem exceção nenhuma); o ciclo 3 injetou um caminho de
// exceção e não o classificou — então o banco fora do ar virava, na história da ORDEM que o aplicativo baixa,
// a afirmação de que a organização não publicou o modelo. O `reassign` faz o oposto DE PROPÓSITO e escreve a
// regra no próprio comentário: "falha de infraestrutura (`unexpected`) NÃO vira linha na tela do campo".
test("[MÉDIA 3 · leitura indisponível] falha de infraestrutura vira `unexpected` no despacho, e NADA na ordem", async () => {
  await withDispatch(async (ctx) => {
    const tpl = await ctx.publishTemplate("Vistoria");
    const workOrder = await ctx.createWorkOrder(tpl.id);
    ctx.setLinks(workOrder.id, [ctx.link(workOrder.id, tpl.id, "collection", 0)]);

    await ctx.dispatch(workOrder.id);
    await ctx.inactivateTemplate(tpl.id);
    ctx.missing.length = 0;

    // O banco de vistorias não responde no exato momento da pergunta.
    ctx.failLookupOnce();
    const segundo = await ctx.dispatch(workOrder.id);

    // FAIL-OPEN preservado: o despacho segue de pé.
    assert.equal(segundo.status, "assigned");

    // O escritório fica sabendo, com o nome certo do que aconteceu.
    const failures = (await ctx.timeline(segundo.id)).filter(
      (event) => event.eventType === "field_dispatch_checklist_run_failed",
    );
    assert.equal(failures.length, 1);
    assert.equal(failures[0].metadata.reason, "unexpected");
    assert.equal(failures[0].metadata.checklistId, tpl.id);
    assert.equal(
      failures[0].message,
      "Falha ao provisionar a execução do checklist do despacho (despacho mantido).",
    );
    // §2.8 — nem o `message` cru da exceção, nem tenant externo.
    assert.equal(JSON.stringify(failures[0].metadata).includes("simulado"), false);
    assert.equal(JSON.stringify(failures[0].metadata).includes(ctx.tenantId), false);

    // E a tela do campo NÃO recebe um fato de negócio que ninguém decidiu.
    assert.deepEqual(ctx.missing, []);
  });
});

// MÉDIA 3 — O GUARD DO BLOQ 3 TEM VOZ.
//
// A trava que impede uma linha sem congelamento de ir a campo era um `return` seco: a reatribuição saía sem
// provisionar e sem uma linha em nenhuma das duas timelines, e quem reatribuiu ficava achando que a vistoria
// seguiu junto. É o mesmo silêncio que o comentário do `provisionChecklistRunForDispatch` declara eliminado.
test("[MÉDIA 3] a trava da linha sem congelamento AUDITA em vez de sair calada", async () => {
  await withDispatch(async (ctx) => {
    const tpl = await ctx.publishTemplate("Vistoria");
    const outro = await ctx.publishTemplate("Vistoria acrescentada depois");
    const workOrder = await ctx.createWorkOrder(tpl.id);
    ctx.setLinks(workOrder.id, [ctx.link(workOrder.id, tpl.id, "collection", 0)]);

    const dispatch = await ctx.dispatch(workOrder.id);
    ctx.provisioned.length = 0;

    // O operador acrescenta uma vistoria DEPOIS do despacho, e ela entra na frente (menor `order_index`):
    // linha viva, primária, que nenhum despacho congelou.
    ctx.setLinks(workOrder.id, [
      ctx.link(workOrder.id, outro.id, "collection", 0),
      ctx.link(workOrder.id, tpl.id, "delivery", 1, { frozen: true }),
    ]);

    await ctx.reassign(dispatch.id);

    // A trava continua trancando: nada vai a campo sem congelamento (é o BLOQ 3).
    assert.equal(ctx.provisioned.length, 0);

    // …mas agora ela DIZ. Razão própria: o modelo está publicadíssimo, colapsá-la em `template_not_published`
    // afirmaria um fato falso.
    const failures = (await ctx.timeline(dispatch.id)).filter(
      (event) => event.eventType === "field_dispatch_checklist_run_failed",
    );
    assert.equal(failures.length, 1);
    assert.equal(failures[0].metadata.reason, "checklist_not_frozen");
    assert.equal(failures[0].metadata.checklistId, outro.id);
    assert.equal(
      failures[0].message,
      "A vistoria não foi enviada ao técnico: ela entrou nesta ordem de serviço depois do despacho.",
    );
    assert.equal(JSON.stringify(failures[0].metadata).includes(ctx.tenantId), false);

    // NÃO vai para a timeline da ORDEM: a frase de lá diz "o modelo não está publicado", que aqui é falsa. O
    // destinatário é quem despacha (a correção é re-despachar, que congela a linha nova).
    assert.deepEqual(ctx.missing, []);
  });
});

// BLOQ 4 — GUARD DE AUSÊNCIA. O eixo da fase é ENTREGUE (a coluna existe e é carimbada) e NÃO é exposto.
//
// Medido no app: `MobileChecklistRunKind` conhece só `collection|delivery` e manda todo o resto para
// `unknown`; uma execução `unknown` faz a tela de comparação RECUSAR comparar, com "Atualize o aplicativo".
// Expor `role` hoje entregaria `generic` (a configuração default da junta) e `null` (100% das ordens em voo no
// dia do deploy) a um app que não os conhece — e a comparação da organização inteira travaria, num aplicativo
// que já está atualizado, permanentemente.
//
// EXPOR `role` EXIGE, NO MESMO PR:
//  1. mapeamento explícito de `generic` que NÃO seja `unknown`;
//  2. precedência local-first — o `role` do servidor nunca sobrescreve um `kind` conhecido vindo da navegação
//     (`router.dart`, `checklist_repository.dart`);
//  3. `_pickPreCreatedRun` casando por `(checklistId, role)` — hoje casa só por `checklistId` e devolve a
//     primeira não-terminal, então duas execuções pré-criadas do mesmo modelo receberiam o MESMO `serverId`,
//     corrompendo a prova na origem;
//  4. contrato nomeado e versionado (§C6) em `tests/mobile-backend-contracts.test.ts`;
//  5. suíte Flutter cobrindo `generic` e `null`.
// Apagar este guard sem os cinco é reabrir `P-CHK-FLUTTER-KIND-COLAPSA`.
test("[BLOQ 4] a fase é carimbada na execução mas NÃO é exposta pelo DTO", async () => {
  const { toChecklistRunDto } = await import("../src/modules/checklists/checklist.dto.js");

  const now = new Date();
  const dto = toChecklistRunDto({
    id: "11111111-1111-4111-8111-111111111111",
    tenantId: "22222222-2222-4222-8222-222222222222",
    templateId: "33333333-3333-4333-8333-333333333333",
    templateVersion: 1,
    role: "generic",
    status: "in_progress",
    startedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  assert.equal("role" in dto, false);
  assert.equal(JSON.stringify(dto).includes("generic"), false);
});

// ---------- harness ----------

type ProvisionedRun = {
  readonly checklistId: string;
  readonly role: string;
};

type DispatchContext = {
  readonly tenantId: string;
  readonly provisioned: ProvisionedRun[];
  /** O que o despacho PERGUNTOU (leitura pura). Nunca é instrumento de asserção de cobrança — para isso há `billedRuns`. */
  readonly lookups: ProvisionedRun[];
  readonly frozen: { readonly checklistId: string; readonly role: string }[];
  readonly deferred: { readonly checklistId: string; readonly role: string }[];
  readonly missing: { readonly checklistId: string; readonly role: string }[];
  readonly publishTemplate: (name: string) => Promise<{ id: string }>;
  readonly createTemplate: (name: string) => Promise<{ id: string }>;
  readonly archiveTemplate: (checklistId: string) => Promise<void>;
  readonly createWorkOrder: (checklistId?: string) => Promise<{ id: string }>;
  readonly getWorkOrder: (workOrderId: string) => Promise<{ checklistSnapshot?: Record<string, unknown> | null }>;
  readonly setLinks: (workOrderId: string, links: readonly WorkOrderChecklistLink[]) => void;
  readonly links: (workOrderId: string) => readonly WorkOrderChecklistLink[];
  readonly link: (
    workOrderId: string,
    checklistId: string,
    role: WorkOrderChecklistLink["role"],
    orderIndex: number,
    checklistSnapshot?: Record<string, unknown> | null,
  ) => WorkOrderChecklistLink;
  /** Faz a PRÓXIMA chamada ao provisioner estourar — o caminho fail-open que torna o reassign uma recuperação. */
  readonly failProvisionOnce: () => void;
  /** Faz a PRÓXIMA leitura de "esta vistoria foi ao campo?" estourar — o banco fora do ar, não uma decisão. */
  readonly failLookupOnce: () => void;
  /** Publica o modelo DENTRO da janela do despacho (entre a resolução do snapshot e o laço da vistoria ausente). */
  readonly publishOnNextFreeze: (checklistId: string) => void;
  readonly inactivateTemplate: (checklistId: string) => Promise<void>;
  readonly dispatch: (workOrderId: string) => Promise<{ id: string; status: string }>;
  readonly reassign: (dispatchId: string) => Promise<void>;
  readonly timeline: (
    dispatchId: string,
  ) => Promise<readonly { eventType: string; message: string; metadata: Record<string, unknown> }[]>;
  readonly listRuns: () => Promise<readonly unknown[]>;
  readonly findRunByKey: (key: string) => Promise<{ role?: string } | null>;
  /** A execução da ordem EM VOO no dia do deploy: chave `dispatch:<ordem>:<modelo>`, sem fase. */
  readonly createRunWithLegacyKey: (workOrderId: string, checklistId: string) => Promise<void>;
  readonly flushCloudUsage: () => Promise<void>;
  /** As unidades FATURADAS de vistoria. É o instrumento certo para "o laço criou execução?" — ver o caso do TOCTOU. */
  readonly billedRuns: () => Promise<number>;
};

async function withDispatch(cb: (ctx: DispatchContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { FieldDispatchService, buildChecklistRunProvisioner, buildChecklistRunLookup, resetFieldDispatchRuntimeForTests },
    { InMemoryFieldDispatchRepository },
    { createMemoryWorkOrderService, resetWorkOrderRuntimeForTests },
    { createMemoryChecklistService, resetChecklistRuntimeForTests },
    { resetCloudUsageRuntimeForTests, getMemoryCloudUsageRepositoryForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/modules/field-dispatch/field-dispatch.service.js"),
    import("../src/modules/field-dispatch/field-dispatch.repository.js"),
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
    name: "T Conjunto",
    modules: ["work_orders", "field_operations", "tenant_checklist", "checklists"],
  });
  const manager = core.createUser({ tenantId: tenant.id, name: "Mgr", email: "conjunto-mgr@example.com", roles: ["manager"] });
  const tech = core.createUser({ tenantId: tenant.id, name: "Tec", email: "conjunto-tec@example.com", roles: ["field_technician"] });
  const techB = core.createUser({ tenantId: tenant.id, name: "Tec B", email: "conjunto-tec-b@example.com", roles: ["field_technician"] });

  const workOrderService = createMemoryWorkOrderService();
  const checklistService = createMemoryChecklistService();

  // A junção é dublê: nesta fatia o porto do conjunto ainda não está ligado à ordem de serviço, e o que o
  // despacho precisa provar é o que ele FAZ com o conjunto — não como a junção o persiste (isso é a suíte da
  // junção). O dublê devolve exatamente a forma de `WorkOrderRepository.listChecklists`.
  //
  // MÉDIA 4 (ciclo 2 da revisão) — O DUBLÊ DEIXOU DE SER CEGO, e isto é o achado que explicava os outros.
  //
  // Antes, `link()` gravava `checklistSnapshot: { frozen: true, … }` SEMPRE — inclusive numa linha que nenhum
  // despacho tinha tocado — e nenhum dos dois verbos de congelamento mexia no mapa. Duas consequências:
  //
  //  1. o dublê não sabia distinguir "linha congelada por um despacho anterior" de "linha que o congelamento
  //     nunca viu", que é o discriminador EXATO do BLOQUEANTE 1 e da ALTA 2 — por isso os 10 casos seguiam
  //     verdes enquanto os ataques do crítico caíam;
  //  2. o estado não EVOLUÍA com o despacho, então cenários de re-despacho/reassign só existiam se o teste os
  //     declarasse à mão — e um deles declarou um estado IMPOSSÍVEL (ver o caso do modelo fora de circulação).
  //
  // Agora o mapa espelha os dois caminhos de escrita da produção: `freezeChecklistLinkSnapshots` carimba a
  // linha `(modelo, fase)` e `freezeChecklistSnapshot` carimba a PRIMÁRIA junto com a coluna da ordem (é
  // literalmente o que os dois repositórios fazem). O default de `link()` passou a ser `null`, que é o estado
  // real de uma linha antes do primeiro despacho — a suíte de composição real (`field-dispatch-checklist-set-port`)
  // afirma o mesmo com a junção persistida (`[null, null]` antes do despacho).
  const linksByWorkOrder = new Map<string, readonly WorkOrderChecklistLink[]>();
  const frozen: { checklistId: string; role: string }[] = [];
  const deferred: { checklistId: string; role: string }[] = [];
  const missing: { checklistId: string; role: string }[] = [];
  const provisioned: ProvisionedRun[] = [];
  const lookups: ProvisionedRun[] = [];
  let provisionFailures = 0;
  let lookupFailures = 0;
  // CICLO 4 (TOCTOU) — a organização PUBLICA o modelo no meio do despacho. A janela real é entre
  // `resolveChecklistSnapshot` (início do `create`) e o laço da vistoria ausente, e nela cabem duas escritas
  // de banco; o `freeze` do porto é uma delas, então é o gancho honesto para reproduzi-la.
  let publishOnFreeze: string | undefined;

  const carimbaLinha = (
    workOrderId: string,
    matches: (link: WorkOrderChecklistLink) => boolean,
    snapshot: Record<string, unknown> | null,
  ): void => {
    const links = linksByWorkOrder.get(workOrderId);
    if (!links) return;

    linksByWorkOrder.set(
      workOrderId,
      links.map((link) => (matches(link) ? { ...link, checklistSnapshot: snapshot } : link)),
    );
  };

  // O espelho da ordem e a LINHA PRIMÁRIA são gravados na mesma escrita pelos dois repositórios de produção
  // (PR-04c-A). Sem reproduzir isso aqui, a primária ficaria eternamente sem congelamento no dublê — e o guard
  // do BLOQ 3 dispararia em toda reatribuição, que é justamente o falso-positivo que a MÉDIA 3 mede.
  const dispatchWorkOrderService = new Proxy(workOrderService, {
    get(target, property, receiver) {
      if (property !== "freezeChecklistSnapshot") return Reflect.get(target, property, receiver);

      return async (...args: Parameters<typeof target.freezeChecklistSnapshot>) => {
        const [, workOrderId, snapshot] = args;
        const result = await target.freezeChecklistSnapshot(...args);
        const primary = [...(linksByWorkOrder.get(workOrderId) ?? [])].sort(
          (left, right) => left.orderIndex - right.orderIndex,
        )[0];
        if (primary) carimbaLinha(workOrderId, (link) => link.id === primary.id, snapshot);
        return result;
      };
    },
  });

  // Espia o provisionamento sem substituí-lo: a execução continua sendo criada pelo provisioner DE VERDADE
  // (com a chave nova e o fallback legado dentro); o espião só registra o que passou por ele. Testar contra um
  // provisioner dublê provaria só que o despacho chama alguma coisa — não que a vistoria certa vai a campo.
  const realProvision = buildChecklistRunProvisioner(checklistService);
  // CICLO 4 — a LEITURA também é a de verdade, pela mesma razão. Um dublê que devolvesse `false` provaria
  // apenas que o despacho pergunta alguma coisa; o que precisa ficar provado é que a resposta vem das MESMAS
  // duas chaves que o provisionamento grava (a com fase e a legada), sobre o mesmo repositório de vistorias.
  const realLookup = buildChecklistRunLookup(checklistService);
  const dispatchService = new FieldDispatchService(
    new InMemoryFieldDispatchRepository(),
    dispatchWorkOrderService,
    new MemoryCoreSaasAdapter(core),
    (tenantId, checklistId) => checklistService.snapshotPublishedTemplate(tenantId, checklistId),
    async (input) => {
      provisioned.push({ checklistId: input.checklistId, role: input.role });
      if (provisionFailures > 0) {
        provisionFailures -= 1;
        throw new Error("provisionamento indisponivel (simulado)");
      }
      await realProvision(input);
    },
    async () => {},
    {
      load: async (_tenantId, workOrderId) => linksByWorkOrder.get(workOrderId) ?? [],
      freeze: async ({ workOrderId, entries }) => {
        for (const entry of entries) {
          frozen.push({ checklistId: entry.checklistId, role: entry.role });
          carimbaLinha(
            workOrderId,
            (link) => link.checklistId === entry.checklistId && link.role === entry.role,
            entry.snapshot,
          );
        }

        // A publicação concorrente (outro operador clicando "publicar" na mesma janela). Escrita de verdade,
        // no mesmo repositório de modelos — não um flag.
        if (publishOnFreeze) {
          const alvo = publishOnFreeze;
          publishOnFreeze = undefined;
          await checklistService.publishTemplate(actorContext, alvo);
        }
      },
      recordDeferred: async ({ checklistId, role }) => {
        deferred.push({ checklistId, role });
      },
      recordMissingAtDispatch: async ({ checklistId, role }) => {
        missing.push({ checklistId, role });
      },
    },
    async (input) => {
      lookups.push({ checklistId: input.checklistId, role: input.role });
      if (lookupFailures > 0) {
        lookupFailures -= 1;
        throw new Error("consulta de execucao indisponivel (simulado)");
      }

      return realLookup(input);
    },
  );

  const actorContext = { tenantId: tenant.id, userId: manager.id };

  const ctx: DispatchContext = {
    tenantId: tenant.id,
    provisioned,
    lookups,
    frozen,
    deferred,
    missing,
    publishTemplate: async (name) => {
      const created = await ctx.createTemplate(name);
      await checklistService.publishTemplate(actorContext, created.id);
      return created;
    },
    archiveTemplate: async (checklistId) => {
      await checklistService.archiveTemplate(actorContext, checklistId);
    },
    // "Inativar" é o fluxo do editor que tira o modelo das NOVAS ordens sem apagá-lo (P-CHK-INATIVAR-COM-RUN-ATIVA).
    // Para o provisionamento é o mesmo muro que o rascunho: `createRun` recusa com `checklist_not_published`.
    inactivateTemplate: async (checklistId) => {
      await checklistService.updateTemplate(actorContext, checklistId, { status: "inactive" });
    },
    failProvisionOnce: () => {
      provisionFailures += 1;
    },
    failLookupOnce: () => {
      lookupFailures += 1;
    },
    publishOnNextFreeze: (checklistId) => {
      publishOnFreeze = checklistId;
    },
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
    createWorkOrder: async (checklistId) => {
      const workOrder = await workOrderService.create(actor(tenant.id, manager.id), {
        title: "OS com conjunto de vistorias",
        ...(checklistId ? { checklistId } : {}),
      });
      return { id: workOrder.id };
    },
    getWorkOrder: async (workOrderId) => workOrderService.get(actor(tenant.id, manager.id), workOrderId),
    setLinks: (workOrderId, links) => linksByWorkOrder.set(workOrderId, links),
    links: (workOrderId) => linksByWorkOrder.get(workOrderId) ?? [],
    // MÉDIA 4 — o congelamento é PARÂMETRO, e o default é `null`: uma linha recém-criada não tem formulário
    // congelado, e é o despacho que a carimba. Quem precisa de "linha congelada por um despacho anterior" ou
    // deixa o despacho congelar (o caminho normal, agora que o dublê evolui) ou declara o snapshot aqui.
    link: (workOrderId, checklistId, role, orderIndex, checklistSnapshot = null) => ({
      id: `${checklistId}-${role}`,
      tenantId: tenant.id,
      workOrderId,
      checklistId,
      role,
      source: "manual",
      orderIndex,
      checklistSnapshot,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    dispatch: async (workOrderId) => {
      const created = await dispatchService.create(actor(tenant.id, manager.id), {
        workOrderId,
        operatorUserId: tech.id,
      });
      return { id: created.id, status: created.status };
    },
    reassign: async (dispatchId) => {
      await dispatchService.reassign(actor(tenant.id, manager.id), dispatchId, { operatorUserId: techB.id });
    },
    timeline: async (dispatchId) => dispatchService.timeline(actor(tenant.id, manager.id), dispatchId),
    listRuns: async () => checklistService.listRuns(actorContext),
    findRunByKey: async (key) => checklistService.findRunByClientKey(actorContext, key),
    createRunWithLegacyKey: async (workOrderId, checklistId) => {
      await checklistService.createRun(actorContext, {
        checklistId,
        clientRunKey: `dispatch:${workOrderId}:${checklistId}`,
        relatedEntityType: "work_order",
        relatedEntityId: workOrderId,
        answers: [],
      });
    },
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

function actor(tenantId: string, userId: string) {
  return {
    tenantId,
    userId,
    roles: ["manager"],
    permissions: [
      "field_dispatch:read",
      "field_dispatch:create",
      "field_dispatch:update",
      "field_dispatch:cancel",
      "field_dispatch:reassign",
    ],
  } as never;
}
