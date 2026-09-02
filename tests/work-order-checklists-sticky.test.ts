import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "memory";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

import { InMemoryWorkOrderRepository } from "../src/modules/work-orders/work-order.repository.js";
import { WorkOrderService, type WorkOrderReferenceResolvers } from "../src/modules/work-orders/work-order.service.js";
import { WorkOrderError, type WorkOrderActorContext } from "../src/modules/work-orders/work-order.types.js";
import type { ChecklistApplicabilityMatch } from "../src/modules/checklists/applicability/checklist-applicability.resolution.js";

// CHECKLIST P1 PR-04c-A — O STICKY, O ESPELHO E O AJUSTE DO OPERADOR (em memória).
//
// O que esta suíte existe para pegar, e cada caso nasceu de um cenário concreto da revisão adversarial:
//  · a ordem resolve o conjunto de vistorias UMA vez, na criação, e NADA o re-resolve depois (o dono cravou
//    isso com todas as letras: trocar o cliente ou o serviço não muda a vistoria de uma ordem em campo);
//  · o campo antigo `checklistId` no update não apaga a segunda vistoria em silêncio (ALTA 7a);
//  · o conjunto tem PORTA ÚNICA (P1 da verificação): `checklists` no update genérico é 409 sempre — o update
//    roda sob `work_orders:update`, que o técnico de campo tem, e aceitá-lo ali anulava o gate da rota dedicada;
//  · requisição RECUSADA não escreve (P3): 400 de validação nunca sai com a junção já reescrita;
//  · acrescentar vistoria numa ordem legada não faz a vistoria que ela já tinha desaparecer (ALTA 6);
//  · o duplicate copia o CONJUNTO da origem, e não uma vistoria com a etapa e a proveniência perdidas (ALTA 7b);
//  · `work_orders.checklist_id` é ESPELHO da linha primária, sempre — é o que o app de campo e o dossiê leem;
//  · o operador ajusta antes do envio, mas não retira vistoria já enviada ao técnico nem sem motivo.

test("[sticky] o conjunto resolve na CRIAÇÃO e nenhuma edição posterior re-resolve", async () => {
  const { service, actor, resolveCalls, templateA } = setup({
    matches: [{ role: "collection", templateId: "TPL-A", ruleId: "RULE-1" }],
  });

  const workOrder = await service.create(actor, { title: "Guincho com regra" });

  assert.equal(resolveCalls.length, 1, "a resolução roda uma única vez, na criação");
  const created = await service.listChecklistSet(actor, workOrder.id);
  assert.deepEqual(
    created.map((line) => [line.checklistId, line.role, line.source, line.ruleId]),
    [[templateA, "collection", "resolved", "RULE-1"]],
    "a linha nasce com a PROVENIÊNCIA: qual regra a escolheu",
  );
  assert.equal(workOrder.checklistId, templateA, "o espelho legado aponta a primária desde a criação");

  // O ataque: trocar o cliente e o serviço da ordem. Se algo re-resolvesse, a ordem em campo mudaria de
  // exigência por baixo de quem está trabalhando nela — e a vistoria já respondida ficaria órfã.
  await service.update(actor, workOrder.id, { title: "Guincho com regra (editado)" });
  await service.update(actor, workOrder.id, { customerId: randomUUID(), serviceCatalogId: randomUUID() });

  assert.equal(resolveCalls.length, 1, "o update NUNCA re-resolve o conjunto (ponto 4 da decisão do dono)");
  const afterUpdate = await service.listChecklistSet(actor, workOrder.id);
  assert.deepEqual(afterUpdate.map((line) => line.checklistId), [templateA]);
});

test("[tri-state] ausente resolve · null limpa · lista sobrescreve · conjunto+campo antigo juntos = 400", async () => {
  const { service, actor, templateA, templateB } = setup({
    matches: [{ role: "collection", templateId: "TPL-A", ruleId: "RULE-1" }],
  });

  const resolvida = await service.create(actor, { title: "Resolvida" });
  assert.equal((await service.listChecklistSet(actor, resolvida.id)).length, 1);

  // `null` é a LIMPEZA deliberada — não existia caminho REST para deixar uma ordem sem vistoria.
  const vazia = await service.create(actor, { title: "Sem vistoria", checklists: null });
  assert.deepEqual(await service.listChecklistSet(actor, vazia.id), []);
  assert.equal(vazia.checklistId, undefined, "conjunto vazio ⇒ espelho vazio");

  // Override manual explícito: o operador manda o conjunto, a regra não decide.
  const manual = await service.create(actor, {
    title: "Override",
    checklists: [
      { checklistId: templateB, role: "collection" },
      { checklistId: templateA, role: "delivery" },
    ],
  });
  const manualSet = await service.listChecklistSet(actor, manual.id);
  assert.deepEqual(
    manualSet.map((line) => [line.checklistId, line.role, line.source, line.ruleId]),
    [
      [templateB, "collection", "manual", undefined],
      [templateA, "delivery", "manual", undefined],
    ],
  );
  assert.equal(manual.checklistId, templateB, "a primária é a de menor posição na fila");

  // Corpo contraditório: um id só não expressa um conjunto. Recusa explícita em vez de um lado vencer calado.
  await assertRejectsWithReason(
    () => service.create(actor, { title: "Contraditória", checklistId: templateA, checklists: [{ checklistId: templateB }] }),
    "checklist_set_conflict",
    400,
  );
});

test("[identidade com fase] o MESMO modelo serve coleta E entrega; repetir a mesma etapa é recusado", async () => {
  const { service, actor, templateA } = setup({ matches: [] });

  // É o par que alimenta a tela de comparação do app — um schema, duas execuções, um resumo de divergências.
  const workOrder = await service.create(actor, {
    title: "Coleta e entrega do mesmo formulário",
    checklists: [
      { checklistId: templateA, role: "collection" },
      { checklistId: templateA, role: "delivery" },
    ],
  });
  assert.deepEqual(
    (await service.listChecklistSet(actor, workOrder.id)).map((line) => line.role),
    ["collection", "delivery"],
  );

  await assertRejectsWithReason(
    () =>
      service.create(actor, {
        title: "Duas vezes a mesma etapa",
        checklists: [
          { checklistId: templateA, role: "collection" },
          { checklistId: templateA, role: "collection" },
        ],
      }),
    "duplicate_checklist_phase",
    409,
  );
});

test("[ALTA 7a] o campo antigo no UPDATE não apaga a segunda vistoria: 409 com 2 linhas, reescreve a primária com 1", async () => {
  const { service, actor, templateA, templateB, templateC } = setup({ matches: [] });

  // CENÁRIO DO ATAQUE: ordem com duas vistorias; um corpo de update que reenvia a ordem inteira (formulário
  // antigo, integração legada, o app) carrega `checklistId`. Antes, isso substituía o conjunto por uma linha
  // manual e a segunda vistoria sumia — em silêncio, sem volta.
  const duas = await service.create(actor, {
    title: "Coleta + entrega",
    checklists: [
      { checklistId: templateA, role: "collection" },
      { checklistId: templateB, role: "delivery" },
    ],
  });

  await assertRejectsWithReason(
    () => service.update(actor, duas.id, { checklistId: templateC }),
    "checklist_set_requires_endpoint",
    409,
  );
  assert.deepEqual(
    (await service.listChecklistSet(actor, duas.id)).map((line) => line.checklistId),
    [templateA, templateB],
    "a recusa não pode deixar rastro: o conjunto continua intacto",
  );

  // Com ≤1 vistoria (o caso de 100% das ordens de hoje) o campo antigo continua funcionando como sempre.
  const uma = await service.create(actor, { title: "Uma vistoria", checklistId: templateA });
  const reescrita = await service.update(actor, uma.id, { checklistId: templateC });
  assert.equal(reescrita.checklistId, templateC, "o espelho acompanha a troca");
  assert.deepEqual(
    (await service.listChecklistSet(actor, uma.id)).map((line) => [line.checklistId, line.role]),
    [[templateC, "generic"]],
  );
});

test("[P1 da verificação] `checklists` no UPDATE genérico é 409 SEMPRE — o conjunto tem porta única", async () => {
  const { service, actor, templateA, templateB } = setup({ matches: [] });

  // O ATAQUE provado por HTTP na verificação: o update genérico roda sob `work_orders:update` — permissão que o
  // técnico de campo TEM — enquanto a rota dedicada exige `field_dispatch:create`. Se `checklists[]` passasse
  // por aqui, o guincheiro apagava a vistoria de ENTREGA (a que alimenta a comparação coleta×entrega, prova
  // jurídica do estado do veículo) e depois zerava o conjunto com `checklists: null`.
  const workOrder = await service.create(actor, {
    title: "Coleta + entrega",
    checklists: [
      { checklistId: templateA, role: "collection" },
      { checklistId: templateB, role: "delivery" },
    ],
  });

  // Passo 1 do ataque: reduzir o conjunto à coleta (a entrega sumiria).
  await assertRejectsWithReason(
    () => service.update(actor, workOrder.id, { checklists: [{ checklistId: templateA, role: "collection" }] }),
    "checklist_set_requires_endpoint",
    409,
  );
  // Passo 2 do ataque: zerar o conjunto.
  await assertRejectsWithReason(
    () => service.update(actor, workOrder.id, { checklists: null }),
    "checklist_set_requires_endpoint",
    409,
  );

  assert.deepEqual(
    (await service.listChecklistSet(actor, workOrder.id)).map((line) => [line.checklistId, line.role]),
    [
      [templateA, "collection"],
      [templateB, "delivery"],
    ],
    "o conjunto atravessa o ataque intacto",
  );

  // O 409 NÃO depende do tamanho do conjunto (a fábrica do campo legado fala em "2+"; esta porta fecha sempre):
  // com UMA vistoria a resposta é a mesma.
  const uma = await service.create(actor, { title: "Uma", checklists: [{ checklistId: templateA, role: "collection" }] });
  await assertRejectsWithReason(
    () => service.update(actor, uma.id, { checklists: [] }),
    "checklist_set_requires_endpoint",
    409,
  );

  // E a recusa não vira evento: nem limpeza, nem retirada, nem "ordem atualizada".
  const eventos = await service.timeline(actor, workOrder.id);
  assert.deepEqual(
    eventos.map((event) => event.eventType),
    ["work_order_created"],
    "a porta fechada não deixa rastro na linha do tempo",
  );
});

test("[P3 da verificação] update RECUSADO por validação não escreve nada: conjunto, espelho e timeline intactos", async () => {
  const { service, actor, templateA, templateC } = setup({ matches: [] });

  const workOrder = await service.create(actor, { title: "Atômica", checklistId: templateA });
  assert.equal(workOrder.checklistId, templateA);

  // O CENÁRIO EXATO do relatório: o corpo carrega a troca de vistoria (campo legado) E um campo inválido.
  // Antes da correção a troca já estava persistida quando o 400 saía — o cliente lia "nada mudou" e a vistoria
  // tinha sido trocada por baixo. Antes deste PR tudo viajava numa transação só; a recusa TEM de ser sem efeito.
  await assertRejectsWithReason(
    () => service.update(actor, workOrder.id, { checklistId: templateC, priority: "urgentíssima" }),
    "invalid_priority",
    400,
  );
  await assertRejectsWithReason(
    () => service.update(actor, workOrder.id, { checklistId: templateC, title: "" }),
    "required_field",
    400,
  );
  await assertRejectsWithReason(
    () => service.update(actor, workOrder.id, { checklistId: templateC, scheduledFor: "não é data" }),
    "invalid_date",
    400,
  );

  assert.deepEqual(
    (await service.listChecklistSet(actor, workOrder.id)).map((line) => line.checklistId),
    [templateA],
    "a troca recusada NÃO foi persistida",
  );
  assert.equal((await service.get(actor, workOrder.id)).checklistId, templateA, "o espelho continua na vistoria original");

  const eventos = await service.timeline(actor, workOrder.id);
  assert.deepEqual(
    eventos.map((event) => event.eventType),
    ["work_order_created"],
    "requisição recusada não gera evento nenhum — nem de vistoria, nem de atualização",
  );

  // Guard de regressão do próprio fix: a MESMA troca, sem campo inválido, continua passando e espelhando.
  const trocada = await service.update(actor, workOrder.id, { checklistId: templateC });
  assert.equal(trocada.checklistId, templateC);
});

test("[ALTA 6] promoção preguiçosa: acrescentar vistoria numa ordem LEGADA não apaga a que ela já tinha", async () => {
  const { service, actor, repository, templateA, templateB } = setup({ matches: [] });

  // Ordem ANTERIOR ao 04c: `checklist_id` preenchido e junção vazia (não há backfill, por decisão do dono).
  const legacy = await repository.create({
    tenantId: actor.tenantId,
    code: "OS-LEGADA",
    title: "Ordem legada",
    priority: "medium",
    checklistId: templateA,
    checklistSnapshot: { template: { name: "Vistoria congelada" } },
    createdBy: actor.userId,
    updatedBy: actor.userId,
  });
  assert.deepEqual(await repository.listChecklists(actor.tenantId, legacy.id), [], "a ordem legada nasce sem junção");

  const result = await service.adjustChecklists(actor, legacy.id, {
    add: [{ checklistId: templateB, role: "delivery" }],
  });

  // Sem a promoção, a junção viraria [B], o espelho re-apontaria para B e A DESAPARECERIA — com a vistoria de
  // A possivelmente já respondida, pendurada numa ordem que não a referencia mais.
  assert.deepEqual(
    result.checklists.map((line) => [line.checklistId, line.role, line.orderIndex]),
    [
      [templateA, "generic", 0],
      [templateB, "delivery", 1],
    ],
  );
  assert.equal(result.workOrder.checklistId, templateA, "a primária (e o espelho) continua sendo a vistoria legada");
  const promoted = (await repository.listChecklists(actor.tenantId, legacy.id))[0];
  assert.equal(promoted?.source, "manual");
  assert.equal(promoted?.ruleId, undefined);
  assert.deepEqual(
    promoted?.checklistSnapshot,
    { template: { name: "Vistoria congelada" } },
    "a promoção copia o formulário congelado: a ordem despachada não perde o que o freeze prometeu",
  );
});

test("[ALTA 7b] o duplicate copia o CONJUNTO VIVO da origem; copy_checklist=false produz conjunto VAZIO", async () => {
  const { service, actor, templateA, templateB } = setup({ matches: [] });

  const source = await service.create(actor, {
    title: "Origem com duas vistorias",
    checklists: [
      { checklistId: templateA, role: "collection" },
      { checklistId: templateB, role: "delivery" },
    ],
  });
  await service.freezeChecklistSnapshot(actor, source.id, { template: { name: "Congelado da origem" } });

  const copia = await service.duplicate(actor, source.id, { copy_checklist: true });
  const copiaSet = await service.listChecklistSet(actor, copia.id);

  // Antes, a cópia nascia com `checklist_id` e ZERO linha: duas vistorias viravam uma, a etapa virava genérica
  // e a proveniência sumia — no caminho feliz, sem erro nenhum.
  assert.deepEqual(
    copiaSet.map((line) => [line.checklistId, line.role, line.source]),
    [
      [templateA, "collection", "manual"],
      [templateB, "delivery", "manual"],
    ],
  );
  assert.equal(copia.checklistId, templateA);
  assert.deepEqual(copia.checklistSnapshot, { template: { name: "Congelado da origem" } });

  const semVistoria = await service.duplicate(actor, source.id, {});
  assert.deepEqual(await service.listChecklistSet(actor, semVistoria.id), [], "não copiar nunca vira resolver de novo");
  assert.equal(semVistoria.checklistId, undefined);
});

test("[espelho] a coluna legada segue a primária: retirar a primária re-aponta; esvaziar o conjunto zera", async () => {
  const { service, actor, templateA, templateB } = setup({ matches: [] });

  const workOrder = await service.create(actor, {
    title: "Espelho",
    checklists: [
      { checklistId: templateA, role: "collection" },
      { checklistId: templateB, role: "delivery" },
    ],
  });
  assert.equal(workOrder.checklistId, templateA);

  const semPrimaria = await service.adjustChecklists(actor, workOrder.id, {
    remove: [{ checklistId: templateA, role: "collection", reason: "cliente dispensou a coleta" }],
  });
  assert.equal(semPrimaria.workOrder.checklistId, templateB, "com a primária retirada, a próxima da fila assume");

  // P1: esvaziar o conjunto é pelo ENDPOINT de vistorias, com motivo por linha — a porta genérica está fechada.
  const limpa = await service.adjustChecklists(actor, workOrder.id, {
    remove: [{ checklistId: templateB, role: "delivery", reason: "cliente dispensou também a entrega" }],
  });
  assert.equal(limpa.workOrder.checklistId, undefined, "conjunto vivo vazio ⇒ espelho vazio");
  assert.equal(limpa.workOrder.checklistSnapshot, null);
});

test("[ajuste do operador] retirar exige motivo; vistoria já enviada ao técnico não sai (409); ordem encerrada não ajusta", async () => {
  const dispatched = new Set<string>();
  const { service, actor, templateA, templateB } = setup({
    matches: [],
    references: {
      hasProvisionedChecklistRun: async (_actor, { checklistId, role }) => dispatched.has(`${checklistId}:${role}`),
    },
  });

  const workOrder = await service.create(actor, {
    title: "Ajuste",
    checklists: [{ checklistId: templateA, role: "collection" }],
  });

  await assertRejectsWithReason(
    () => service.adjustChecklists(actor, workOrder.id, { remove: [{ checklistId: templateA, role: "collection" }] }),
    "checklist_removal_reason_required",
    400,
  );

  // A etapa é obrigatória: `(ordem, modelo)` deixou de apontar uma linha só, e adivinhar apagaria a errada.
  await assertRejectsWithReason(
    () => service.adjustChecklists(actor, workOrder.id, { remove: [{ checklistId: templateA, reason: "qualquer" }] }),
    "checklist_role_required",
    400,
  );

  // O despacho provisionou a run desta vistoria: ela pode estar sendo respondida em campo, às vezes offline.
  dispatched.add(`${templateA}:collection`);
  await assertRejectsWithReason(
    () =>
      service.adjustChecklists(actor, workOrder.id, {
        remove: [{ checklistId: templateA, role: "collection", reason: "engano do escritório" }],
      }),
    "checklist_already_dispatched",
    409,
  );

  // Acrescentar segue permitido numa ordem despachada — e a linha nova NUNCA vira primária (BLOQ 3).
  const acrescentada = await service.adjustChecklists(actor, workOrder.id, {
    add: [{ checklistId: templateB, role: "delivery" }],
  });
  assert.equal(acrescentada.workOrder.checklistId, templateA, "a vistoria acrescentada não desloca a que o freeze viu");
  assert.deepEqual(acrescentada.checklists.map((line) => line.orderIndex), [0, 1]);

  // Duplicar o par modelo+etapa deixaria indefinido qual vistoria o técnico recebe.
  await assertRejectsWithReason(
    () => service.adjustChecklists(actor, workOrder.id, { add: [{ checklistId: templateB, role: "delivery" }] }),
    "duplicate_checklist_phase",
    409,
  );

  await service.changeStatus(actor, workOrder.id, { status: "assigned" });
  await service.changeStatus(actor, workOrder.id, { status: "accepted" });
  await service.changeStatus(actor, workOrder.id, { status: "on_route" });
  await service.changeStatus(actor, workOrder.id, { status: "on_site" });
  await service.changeStatus(actor, workOrder.id, { status: "in_progress" });
  await service.changeStatus(actor, workOrder.id, { status: "completed" });
  await assertRejectsWithReason(
    () => service.adjustChecklists(actor, workOrder.id, { add: [{ checklistId: templateA, role: "delivery" }] }),
    "work_order_terminal",
    409,
  );
});

test("[ajuste do operador] o modelo precisa estar PUBLICADO; a inclusão de modelo não publicado é recusada", async () => {
  const naoPublicado = randomUUID();
  const { service, actor, templateA } = setup({
    matches: [],
    references: {
      assertChecklistsPublished: async (_actor, ids) => ids.filter((id) => id === naoPublicado),
    },
  });

  const workOrder = await service.create(actor, {
    title: "Publicação",
    checklists: [{ checklistId: templateA, role: "collection" }],
  });

  await assertRejectsWithReason(
    () => service.adjustChecklists(actor, workOrder.id, { add: [{ checklistId: naoPublicado, role: "delivery" }] }),
    "checklist_not_published",
    400,
  );
  await assertRejectsWithReason(
    () => service.create(actor, { title: "Override inválido", checklists: [{ checklistId: naoPublicado }] }),
    "checklist_not_published",
    400,
  );
});

test("[ALTA 8 · §2.8] retirar vistoria exigida por CONTRATO exige confirmação distinta e registra o FATO, nunca o cliente", async () => {
  const ruleId = randomUUID();
  const customerId = randomUUID();
  const { service, actor, repository, templateA } = setup({
    matches: [{ role: "collection", templateId: "TPL-A", ruleId }],
    references: {
      // A regra que produziu a linha nomeia um cliente — é exigência contratada, não convenção interna.
      isApplicabilityRuleCustomerScoped: async (_actor, id) => id === ruleId,
    },
  });

  const workOrder = await service.create(actor, { title: "Exigência do contrato" });

  await assertRejectsWithReason(
    () =>
      service.adjustChecklists(actor, workOrder.id, {
        remove: [{ checklistId: templateA, role: "collection", reason: "cliente autorizou por telefone" }],
      }),
    "checklist_customer_scoped_confirmation_required",
    409,
  );

  const removida = await service.adjustChecklists(actor, workOrder.id, {
    remove: [
      {
        checklistId: templateA,
        role: "collection",
        reason: "cliente autorizou por telefone",
        confirmCustomerScoped: true,
      },
    ],
  });
  assert.deepEqual(removida.checklists, []);

  const timeline = await service.timeline(actor, workOrder.id);
  const evento = timeline.find((event) => event.eventType === "work_order_checklist_removed");
  assert.ok(evento, "a retirada precisa chegar à timeline que o guincheiro lê");
  assert.match(evento.message, /retirada desta ordem de serviço pelo escritório/);
  assert.match(evento.message, /cliente autorizou por telefone/);
  assert.equal(evento.metadata.ruleCustomerScoped, true);
  assert.equal(evento.metadata.role, "collection");
  assert.equal(evento.metadata.source, "resolved");
  // §2.8 — o id do cliente NUNCA atravessa para a auditoria; vai só o fato de a exigência ser contratual.
  const serializado = JSON.stringify(evento.metadata);
  assert.equal(serializado.includes(customerId), false);
  assert.equal(serializado.includes(actor.tenantId), false);
});

test("[timeline] incluir grava o evento com o rótulo do modelo; a porta genérica fechada não grava limpeza", async () => {
  const { service, actor, templateA, templateB } = setup({
    matches: [],
    references: {
      resolveChecklistLabel: async (_actor, checklistId) =>
        checklistId === templateB ? "Vistoria de Entrega" : "Vistoria de Coleta",
    },
  });

  const workOrder = await service.create(actor, {
    title: "Eventos",
    checklists: [{ checklistId: templateA, role: "collection" }],
  });

  await service.adjustChecklists(actor, workOrder.id, { add: [{ checklistId: templateB, role: "delivery" }] });
  const incluida = (await service.timeline(actor, workOrder.id)).find(
    (event) => event.eventType === "work_order_checklist_added",
  );
  assert.ok(incluida);
  assert.match(incluida.message, /Vistoria "Vistoria de Entrega" incluída/);

  // P1: `checklists: []` no update genérico é recusado ANTES de qualquer escrita — o conjunto fica, e a
  // timeline NÃO ganha evento de limpeza (rastro de uma limpeza que não aconteceu seria mentira de auditoria).
  await assertRejectsWithReason(
    () => service.update(actor, workOrder.id, { checklists: [] }),
    "checklist_set_requires_endpoint",
    409,
  );
  const eventos = await service.timeline(actor, workOrder.id);
  assert.equal(
    eventos.filter((event) => event.eventType === "work_order_checklists_cleared").length,
    0,
    "a recusa não pode deixar rastro de limpeza",
  );
  assert.deepEqual(
    (await service.listChecklistSet(actor, workOrder.id)).map((line) => line.checklistId),
    [templateA, templateB],
    "o conjunto sobrevive intacto à porta fechada",
  );
});

test("[linha preservada] acrescentar pelo ajuste não toca a linha que fica: proveniência, posição e formulário congelado", async () => {
  const ruleId = randomUUID();
  const { service, actor, repository, templateA, templateB } = setup({
    matches: [{ role: "collection", templateId: "TPL-A", ruleId }],
  });

  const workOrder = await service.create(actor, { title: "Substituição" });
  await service.freezeChecklistSnapshot(actor, workOrder.id, { template: { name: "Congelado" } });

  // P1: declarar o conjunto pelo update genérico é porta FECHADA — mesmo um conjunto "inofensivo" que apenas
  // acrescenta. Se passasse, regravar A do zero a transformaria em `manual`, apagaria a regra que a explica e
  // jogaria fora o formulário que o despacho congelou.
  await assertRejectsWithReason(
    () =>
      service.update(actor, workOrder.id, {
        checklists: [
          { checklistId: templateA, role: "collection" },
          { checklistId: templateB, role: "delivery" },
        ],
      }),
    "checklist_set_requires_endpoint",
    409,
  );

  // O caminho legítimo (ajuste do operador) acrescenta B SEM regravar A.
  await service.adjustChecklists(actor, workOrder.id, { add: [{ checklistId: templateB, role: "delivery" }] });

  const links = await repository.listChecklists(actor.tenantId, workOrder.id);
  const preservada = links.find((link) => link.checklistId === templateA);
  assert.equal(preservada?.source, "resolved");
  assert.equal(preservada?.ruleId, ruleId);
  assert.deepEqual(preservada?.checklistSnapshot, { template: { name: "Congelado" } });
});

// ---------- a rota, com o gate real e a fiação real ----------

test("[rota] o ajuste exige a permissão de ENVIAR ao técnico e o detalhe passa a mostrar o conjunto", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const coleta = await publishTemplate(baseUrl, headers(seed, "tenant_admin"), "Vistoria de Coleta");
    const entrega = await publishTemplate(baseUrl, headers(seed, "tenant_admin"), "Vistoria de Entrega");
    const workOrder = await createWO(baseUrl, seed, { title: "OS do envio", checklistId: coleta.id });

    // Quem não despacha não redefine o que vai a campo — o backend é a autoridade, a UI só molda.
    // O papel escolhido é DELIBERADO: o técnico de campo TEM `work_orders:read` e `work_orders:update` e não
    // tem `field_dispatch:create`. Se o gate afrouxasse para a permissão de editar a ordem, quem está em campo
    // passaria a redefinir a própria prova — e este caso cairia.
    const semPermissao = await req(baseUrl, `/api/v1/work-orders/${workOrder.id}/checklists`, {
      method: "PATCH",
      headers: headers(seed, "field_technician"),
      body: { add: [{ checklistId: entrega.id, role: "delivery" }] },
    });
    assert.equal(semPermissao.status, 403);

    const ajuste = await req(baseUrl, `/api/v1/work-orders/${workOrder.id}/checklists`, {
      method: "PATCH",
      headers: headers(seed, "tenant_admin"),
      body: { add: [{ checklistId: entrega.id, role: "delivery" }] },
    });
    assert.equal(ajuste.status, 200);
    assert.deepEqual(
      ajuste.body.data.checklists.map((line: { checklistId: string; role: string }) => [line.checklistId, line.role]),
      [
        [coleta.id, "generic"],
        [entrega.id, "delivery"],
      ],
    );

    // P1 da verificação — o DESVIO pela rota genérica, com os papéis REAIS do catálogo: o técnico de campo TEM
    // `work_orders:update`, então `PATCH /work-orders/:id` passa pelo gate da rota; é o serviço que fecha a
    // porta do conjunto. Antes da correção estes DOIS requests devolviam 200 — o primeiro apagava a vistoria de
    // entrega (a prova jurídica da comparação), o segundo zerava o conjunto.
    const desvio = await req(baseUrl, `/api/v1/work-orders/${workOrder.id}`, {
      method: "PATCH",
      headers: headers(seed, "field_technician"),
      body: { checklists: [{ checklistId: coleta.id, role: "generic" }] },
    });
    assert.equal(desvio.status, 403, "o desvio pelo update genérico é porta fechada, não 200");
    assert.equal(desvio.body.error?.reason ?? desvio.body.reason, "not_assigned_to_actor");

    const zeragem = await req(baseUrl, `/api/v1/work-orders/${workOrder.id}`, {
      method: "PATCH",
      headers: headers(seed, "field_technician"),
      body: { checklists: null },
    });
    assert.equal(zeragem.status, 409, "zerar com `checklists: null` também é porta fechada");

    // O 409 é do CAMPO, não da rota: o técnico segue editando o que a permissão dele cobre.
    const edicaoComum = await req(baseUrl, `/api/v1/work-orders/${workOrder.id}`, {
      method: "PATCH",
      headers: headers(seed, "field_technician"),
      body: { description: "Atualizado do campo" },
    });
    assert.equal(edicaoComum.status, 200);

    const detalhe = await req(baseUrl, `/api/v1/work-orders/${workOrder.id}`, { headers: headers(seed, "tenant_admin") });
    assert.equal(detalhe.status, 200);
    assert.equal(detalhe.body.data.checklists.length, 2, "o conjunto sobreviveu intacto ao ataque");
    // RETROCOMPAT: o app de campo e as integrações antigas continuam lendo as mesmas duas chaves.
    assert.equal(detalhe.body.data.checklistId, coleta.id);
    assert.equal("checklistSnapshot" in detalhe.body.data, true);

    // Modelo em rascunho não vai a campo — a mesma disciplina do congelamento do despacho, na porta de entrada.
    const rascunho = await createTemplate(baseUrl, headers(seed, "tenant_admin"), "Rascunho");
    const naoPublicado = await req(baseUrl, `/api/v1/work-orders/${workOrder.id}/checklists`, {
      method: "PATCH",
      headers: headers(seed, "tenant_admin"),
      body: { add: [{ checklistId: rascunho.id, role: "collection" }] },
    });
    assert.equal(naoPublicado.status, 400);
    assert.equal(naoPublicado.body.error?.reason ?? naoPublicado.body.reason, "checklist_not_published");

    // A retirada chega à timeline REMOTA da ordem — que é a que o aplicativo do guincheiro renderiza.
    const retirada = await req(baseUrl, `/api/v1/work-orders/${workOrder.id}/checklists`, {
      method: "PATCH",
      headers: headers(seed, "tenant_admin"),
      body: { remove: [{ checklistId: entrega.id, role: "delivery", reason: "cliente não quis a entrega vistoriada" }] },
    });
    assert.equal(retirada.status, 200);

    const timeline = await req(baseUrl, `/api/v1/work-orders/${workOrder.id}/timeline`, {
      headers: headers(seed, "tenant_admin"),
    });
    const evento = (timeline.body.data as Array<{ eventType: string; message: string }>).find(
      (item) => item.eventType === "work_order_checklist_removed",
    );
    assert.ok(evento, "o campo precisa VER que o escritório retirou a vistoria");
    assert.match(evento.message, /Vistoria "Vistoria de Entrega" foi retirada/);
  });
});

// ---------- harness ----------

type SetupOptions = {
  readonly matches: readonly { readonly role: "collection" | "delivery" | "generic"; readonly templateId: string; readonly ruleId: string }[];
  readonly references?: WorkOrderReferenceResolvers;
};

function setup(options: SetupOptions) {
  const repository = new InMemoryWorkOrderRepository();
  const tenantId = randomUUID();
  const userId = randomUUID();
  const templateA = randomUUID();
  const templateB = randomUUID();
  const templateC = randomUUID();
  const aliases: Record<string, string> = { "TPL-A": templateA, "TPL-B": templateB, "TPL-C": templateC };
  const resolveCalls: unknown[] = [];

  const service = new WorkOrderService(repository, {
    resolveApplicableChecklists: async (_actor, context): Promise<readonly ChecklistApplicabilityMatch[]> => {
      resolveCalls.push(context);

      return options.matches.map((match) => ({
        role: match.role,
        templateId: aliases[match.templateId] ?? match.templateId,
        ruleId: match.ruleId,
      }));
    },
    ...options.references,
  });

  const actor: WorkOrderActorContext = { tenantId, userId, roles: [], permissions: [] };

  return { service, repository, actor, templateA, templateB, templateC, resolveCalls };
}

async function assertRejectsWithReason(run: () => Promise<unknown>, reason: string, statusCode: number): Promise<void> {
  await assert.rejects(run, (error: unknown) => {
    assert.ok(error instanceof WorkOrderError, `esperava WorkOrderError, veio ${String(error)}`);
    assert.equal(error.reason, reason);
    assert.equal(error.statusCode, statusCode);
    return true;
  });
}

// ---------- harness HTTP (convenção medida em tests/checklist-snapshot-dispatch.test.ts) ----------

type SeedData = {
  readonly tenantA: Tenant;
  readonly managerA: User;
};

function headers(seed: SeedData, role: string): Record<string, string> {
  return { "x-tenant-id": seed.tenantA.id, "x-user-id": seed.managerA.id, "x-role": role };
}

async function withApi(cb: (c: { baseUrl: string; seed: SeedData }) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { resetWorkOrderRuntimeForTests },
    { resetChecklistRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/work-orders/index.js"),
    import("../src/modules/checklists/index.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  resetWorkOrderRuntimeForTests();
  resetChecklistRuntimeForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenantA = core.createTenant({
    name: "Org vistorias",
    modules: ["work_orders", "field_operations", "tenant_checklist", "checklists"],
  });
  const managerA = core.createUser({
    tenantId: tenantA.id,
    name: "Gestor",
    email: "wo-chk-rota@example.com",
    roles: ["manager"],
  });

  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await baseUrlOf(server);
  try {
    await cb({ baseUrl, seed: { tenantA, managerA } });
  } finally {
    await close(server);
    resetWorkOrderRuntimeForTests();
    resetChecklistRuntimeForTests();
  }
}

async function createTemplate(baseUrl: string, h: Record<string, string>, name: string): Promise<{ id: string }> {
  const create = await req(baseUrl, "/api/v1/tenant/checklists", {
    method: "POST",
    headers: h,
    body: {
      name,
      type: "technical_evidence",
      schema: { source: "chk-p1-pr04c" },
      components: [
        {
          componentKey: "safety_ok",
          type: "observation",
          label: "O local esta seguro?",
          required: true,
          config: {},
          validationRules: {},
          visibilityRules: {},
        },
      ],
    },
  });
  assert.equal(create.status, 201);
  return { id: create.body.data.id as string };
}

async function publishTemplate(baseUrl: string, h: Record<string, string>, name: string): Promise<{ id: string }> {
  const created = await createTemplate(baseUrl, h, name);
  const publish = await req(baseUrl, `/api/v1/tenant/checklists/${created.id}/publish`, { method: "POST", headers: h, body: {} });
  assert.equal(publish.status, 200);
  return created;
}

async function createWO(baseUrl: string, seed: SeedData, body: Record<string, unknown>): Promise<{ id: string }> {
  const res = await req(baseUrl, "/api/v1/work-orders", { method: "POST", headers: headers(seed, "tenant_admin"), body });
  assert.equal(res.status, 201);
  return { id: res.body.data.id as string };
}

async function req(baseUrl: string, path: string, options: { method?: string; headers?: Record<string, string>; body?: unknown } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json", ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function baseUrlOf(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");
  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
}
