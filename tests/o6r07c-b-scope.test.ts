import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";
import { JPEG_BYTES } from "./helpers/upload-fixtures.js";

// B-O6R-07c-b1 (Ω6R-SEC-002, o último P0) — O DESPACHO GRAVA A ATRIBUIÇÃO; AS 23 VIAS GANHAM ESCOPO; O SERVIDOR
// RESPONDE COM CONFLITO.
//
// Decisões do dono que este arquivo prova (agent-orchestration/controle/decisoes.md):
//   `D1-07c` = (c)  — despachar é atribuir; reatribuir o despacho reatribui a OS; um critério só para escrever na
//                     OS (o casamento duplo do 07a, `assertMutationObjectScope`).
//   `D2-07c` = (d)  — quem JÁ FOI técnico da OS e deixou de ser vê o trabalho offline voltar em `conflicts[]`
//                     (`assignment_changed_pending_review`), sem ser aplicado; quem NUNCA foi recebe `rejected`/403
//                     `not_assigned_to_actor`. Vale para vistoria, evidência, status e km.
//   `D-07c-DESPACHO-ALVO` — o status do despacho segue recortado pelo ALVO do despacho (Traccar).
// Crítica `B-O6R-07c-b1-critica.md`: ordem e compensação declaradas e testadas por falha injetada (ajuste 2);
// rascunho e OS encerrada (ajuste 3); cancelar/falhar e dois despachos ativos (ajuste 4); fonte de "ex-técnico"
// (ajuste 5, `work_order_assignments`); upload pela OS do RECIBO, com o campo do formulário omitido (ajuste 5).
// CA6/CA7 (o superior decide) são do `B-O6R-07c-b2` (crítica, ajuste 6): não estão aqui.
//
// VERMELHO-CONTROLE: cada teste de recusa/atribuição foi executado contra a base `4fe7524e` (sem o produto deste
// bloco) e contra mutações do produto, numa cópia descartável; registro em docs/revisoes/SAN3/B-O6R-07c-b1-dev.md.

const DIR_ANEXOS = fs.mkdtempSync(path.join(os.tmpdir(), "o6r07cb-anexos-"));
const DIR_EVIDENCIAS = fs.mkdtempSync(path.join(os.tmpdir(), "o6r07cb-evid-"));
process.env.CHECKLIST_STORAGE_LOCAL_DIR = DIR_ANEXOS;
after(() => {
  fs.rmSync(DIR_ANEXOS, { recursive: true, force: true });
  fs.rmSync(DIR_EVIDENCIAS, { recursive: true, force: true });
});

const LOTE_VISTORIA = "/api/v1/mobile/sync/checklist-actions";
const LOTE_EVIDENCIA = "/api/v1/mobile/sync/evidence-actions";
const LOTE_OS = "/api/v1/mobile/sync/work-order-actions";
const CONFLITO = "assignment_changed_pending_review";

// ------------------------------------------------------------------------------------------------
// LAÇO G — as 23 vias que eram `·07c-b`, LIDAS DO INSTANTÂNEO pelas classes que as guardam agora. O laço nunca pula
// uma entrada: chave sem receita FALHA.
// ------------------------------------------------------------------------------------------------
const INSTANTANEO: Record<string, { classe: string; n: number }> = JSON.parse(
  fs.readFileSync(new URL("./fixtures/o6r07c-classificacao-vias.json", import.meta.url), "utf8"),
);
const CLASSES_07CB1 = new Set(["VISTORIA·ESCOPO", "EVIDENCIA-OS·ESCOPO", "DESPACHO·ALVO"]);
const ENTRADAS_G = Object.entries(INSTANTANEO)
  .filter(([, v]) => CLASSES_07CB1.has(v.classe))
  .map(([chave, v]) => ({ chave, classe: v.classe }))
  .sort((a, b) => a.chave.localeCompare(b.chave));

test("laço G — o instantâneo tem as 23 vias do 07c-b1 nas três classes (nunca vazio, nunca a menos)", () => {
  assert.equal(ENTRADAS_G.length, 23, ENTRADAS_G.map((e) => e.chave).join("\n"));
  for (const classe of CLASSES_07CB1) {
    assert.ok(ENTRADAS_G.some((e) => e.classe === classe), `nenhuma entrada ${classe}`);
  }
});

// Papéis tenant_wide, na ordem da sonda do G-WIDE (plano 07c-b.5, A5): o primeiro que NÃO recebe
// `permission_required` naquela via é o que prova que o escopo não pega a gestão.
const SONDA_WIDE = ["operator", "tenant_admin", "manager", "field_dispatcher"] as const;

for (const entrada of ENTRADAS_G) {
  test(`laço G [${entrada.classe}] ${entrada.chave} — G-NEG, G-EX, G-POS e G-WIDE`, async () => {
    await withApi(async (ctx) => {
      const { seed } = ctx;

      // G-NEG: o técnico B NUNCA foi técnico desta OS → 403 (REST) ou `rejected` por ação (lote 200).
      // Exceção declarada: o upload binário só existe depois de um recibo de metadado, e só quem passou pelo
      // escopo tem recibo — o caminho de recusa que sobra é o do ex-técnico (G-EX abaixo).
      if (entrada.chave !== "ROTA POST /api/v1/mobile/evidence-uploads") {
        const neg = await executar(ctx, entrada.chave, seed.tecnicoB, "field_technician", await ctx.semente(seed.tecnicoA));
        if (neg.lote) {
          assert.equal(neg.status, 200, `G-NEG ${entrada.chave}: o lote responde 200 (recusa é POR AÇÃO)`);
          assert.equal(neg.acao, "rejected", `G-NEG ${entrada.chave}: ação ${neg.acao} ${neg.reason}`);
        } else {
          assert.equal(neg.status, 403, `G-NEG ${entrada.chave}: status ${neg.status} ${neg.reason}`);
        }
        assert.equal(neg.reason, "not_assigned_to_actor", `G-NEG ${entrada.chave}: reason ${neg.reason}`);
      }

      // G-EX: o técnico A FOI o técnico (o despacho o atribuiu) e o despacho passou ao técnico C.
      //   lote → `conflicts[]` com `assignment_changed_pending_review`; upload → 409 do mesmo tipo;
      //   REST de vistoria → 403 (o REST não muda: só os lotes leem a marca); despacho → 403 (o alvo agora é C).
      const sementeEx = await ctx.semente(seed.tecnicoA);
      const ex = await executar(ctx, entrada.chave, seed.tecnicoA, "field_technician", sementeEx, async () => {
        await ctx.reatribuir(sementeEx.dispatchId, seed.tecnicoC);
      });
      if (ex.lote) {
        assert.equal(ex.acao, "conflict", `G-EX ${entrada.chave}: ação ${ex.acao} ${ex.reason}`);
        assert.equal(ex.conflictType, CONFLITO, `G-EX ${entrada.chave}: conflict_type ${ex.conflictType}`);
        assert.equal(ex.reason, "not_assigned_to_actor");
      } else if (entrada.chave === "ROTA POST /api/v1/mobile/evidence-uploads") {
        assert.equal(ex.status, 409, `G-EX upload: status ${ex.status} ${ex.reason}`);
        assert.equal(ex.reason, CONFLITO);
      } else {
        assert.equal(ex.status, 403, `G-EX ${entrada.chave}: status ${ex.status} ${ex.reason}`);
        assert.equal(ex.reason, "not_assigned_to_actor");
      }

      // G-POS: o técnico A, atribuído pelo despacho, não é recusado por escopo.
      const pos = await executar(ctx, entrada.chave, seed.tecnicoA, "field_technician", await ctx.semente(seed.tecnicoA));
      assert.notEqual(pos.reason, "not_assigned_to_actor", `G-POS ${entrada.chave}: o atribuído foi recusado`);
      // Conflito de ESTADO (ex.: dar ciência numa vistoria que não pede ciência) é regra da vistoria, não escopo.
      assert.notEqual(pos.conflictType, CONFLITO, `G-POS ${entrada.chave}: o atribuído caiu no conflito de troca de técnico`);

      // G-WIDE: o primeiro papel tenant_wide que alcança a via não cai no escopo. Nenhum alcança → falha.
      let provado = false;
      for (const papel of SONDA_WIDE) {
        const wide = await executar(ctx, entrada.chave, seed.gestorA, papel, await ctx.semente(seed.tecnicoA));
        if (wide.reason === "permission_required") continue;
        assert.notEqual(wide.reason, "not_assigned_to_actor", `G-WIDE ${entrada.chave} (${papel}): caiu no escopo`);
        assert.notEqual(wide.conflictType, CONFLITO, `G-WIDE ${entrada.chave} (${papel}): caiu no conflito de troca de técnico`);
        provado = true;
        break;
      }
      assert.ok(provado, `G-WIDE vazio em ${entrada.chave} — nenhum papel tenant_wide alcança a via`);
    });
  });
}

// ------------------------------------------------------------------------------------------------
// CRITÉRIOS DE ACEITE DO b1 (emenda, CA1–CA5, CA8–CA10) e os ajustes da crítica
// ------------------------------------------------------------------------------------------------

test("CA1 · S-DESPACHADO — despachar grava a atribuição; o técnico despachado responde e conclui a vistoria e muda o status da OS", async () => {
  await withApi(async (ctx) => {
    const { seed } = ctx;
    const s = await ctx.semente(seed.tecnicoA);

    const os = await ctx.os(s.workOrderId);
    assert.equal(os.assignedUserId, seed.tecnicoA.id, "o despacho não gravou assigned_user_id");
    assert.equal(os.assignedOperatorId, seed.tecnicoA.id, "sem perfil, o operador é o user id (forma do app)");
    assert.equal(os.status, "assigned", "OS em open vai a assigned no despacho");

    const linha = (await ctx.timeline(s.workOrderId)).find((e: any) => e.eventType === "work_order_assigned");
    assert.ok(linha, "a atribuição pelo despacho não entrou na linha do tempo da OS");
    assert.equal(linha.metadata.source, "field_dispatch");
    assert.equal(linha.metadata.dispatchId, s.dispatchId);

    const h = ctx.h(seed.tecnicoA, "field_technician");
    const resposta = await ctx.lote(LOTE_VISTORIA, h, "checklist.item_answer", ctx.payloadVistoria("checklist.item_answer", s));
    assert.equal(resposta.acao, "accepted", `${resposta.acao} ${resposta.reason}`);
    const concluir = await ctx.req(`/api/v1/mobile/checklist-runs/${s.runId}/complete`, { method: "POST", headers: h, body: { hasDivergence: false } });
    assert.equal(concluir.status, 200, JSON.stringify(concluir.body));
    const status = await ctx.req(`/api/v1/work-orders/${s.workOrderId}/status`, { method: "PATCH", headers: h, body: { status: "accepted" } });
    assert.equal(status.status, 200, `o despachado não muda o status da OS: ${JSON.stringify(status.body)}`);
  });
});

test("CA2 — reatribuir o despacho move a atribuição: o antigo cai em conflito, o novo escreve", async () => {
  await withApi(async (ctx) => {
    const { seed } = ctx;
    const s = await ctx.semente(seed.tecnicoA);
    await ctx.reatribuir(s.dispatchId, seed.tecnicoC);

    const os = await ctx.os(s.workOrderId);
    assert.equal(os.assignedUserId, seed.tecnicoC.id);
    const fontes = (await ctx.timeline(s.workOrderId))
      .filter((e: any) => e.eventType === "work_order_assigned")
      .map((e: any) => e.metadata.source);
    assert.deepEqual(fontes.sort(), ["field_dispatch", "field_dispatch_reassign"]);

    const antigo = await ctx.lote(LOTE_VISTORIA, ctx.h(seed.tecnicoA, "field_technician"), "checklist.item_answer", ctx.payloadVistoria("checklist.item_answer", s));
    assert.equal(antigo.acao, "conflict", `${antigo.acao} ${antigo.reason}`);
    assert.equal(antigo.conflictType, CONFLITO);
    const novo = await ctx.lote(LOTE_VISTORIA, ctx.h(seed.tecnicoC, "field_technician"), "checklist.item_answer", ctx.payloadVistoria("checklist.item_answer", s));
    assert.equal(novo.acao, "accepted", `${novo.acao} ${novo.reason}`);
  });
});

test("CA3 — despachar uma OS que não está em open não dá 409 e preserva o status; OS encerrada é recusada; rascunho passa", async () => {
  await withApi(async (ctx) => {
    const { seed } = ctx;
    const s = await ctx.semente(seed.tecnicoA);
    const aceitar = await ctx.req(`/api/v1/work-orders/${s.workOrderId}/status`, {
      method: "PATCH",
      headers: ctx.h(seed.tecnicoA, "field_technician"),
      body: { status: "accepted" },
    });
    assert.equal(aceitar.status, 200, JSON.stringify(aceitar.body));

    const segundo = await ctx.despachar(s.workOrderId, seed.tecnicoC);
    assert.equal(segundo.status, 201, `segundo despacho de OS em accepted: ${JSON.stringify(segundo.body)}`);
    const os = await ctx.os(s.workOrderId);
    assert.equal(os.status, "accepted", "o despacho rebaixou o status da OS");
    assert.equal(os.assignedUserId, seed.tecnicoC.id);

    // OS encerrada: o despacho que atribuiria é recusado ANTES de qualquer escrita; o rascunho não atribui e passa.
    const encerrada = await ctx.criarOs();
    const cancelar = await ctx.req(`/api/v1/work-orders/${encerrada}/cancel`, {
      method: "POST",
      headers: ctx.h(seed.gestorA, "manager"),
      body: { reason: "teste", financial_decision: "keep" },
    });
    assert.equal(cancelar.status, 200, JSON.stringify(cancelar.body));
    const recusado = await ctx.despachar(encerrada, seed.tecnicoA);
    assert.equal(recusado.status, 409, JSON.stringify(recusado.body));
    assert.equal(recusado.body.error.code, "FIELD_DISPATCH_WORK_ORDER_TERMINAL");
    assert.equal((await ctx.despachos(encerrada)).length, 0, "o despacho recusado ficou gravado");
    const rascunho = await ctx.despachar(encerrada, seed.tecnicoA, "draft");
    assert.equal(rascunho.status, 201, JSON.stringify(rascunho.body));
    assert.equal((await ctx.os(encerrada)).assignedUserId ?? null, null, "o rascunho atribuiu a OS");
  });
});

test("CA4 — o ex-técnico cai em conflicts[] nas 4 famílias (vistoria, evidência, status, km) e nada é aplicado", async () => {
  await withApi(async (ctx) => {
    const { seed } = ctx;
    const s = await ctx.semente(seed.tecnicoA);
    await ctx.reatribuir(s.dispatchId, seed.tecnicoC);
    const h = ctx.h(seed.tecnicoA, "field_technician");

    const vistoria = await ctx.lote(LOTE_VISTORIA, h, "checklist.item_answer", ctx.payloadVistoria("checklist.item_answer", s));
    const evidencia = await ctx.lote(LOTE_EVIDENCIA, h, "evidence.work_order_observation", ctx.payloadEvidencia("evidence.work_order_observation", s));
    const status = await ctx.lote(LOTE_OS, h, "work_order.status_change", { work_order_id: s.workOrderId, status: "accepted" });
    const km = await ctx.lote(LOTE_OS, h, "work_order.mileage", { work_order_id: s.workOrderId, mileage_start: 4242 });
    for (const [nome, r] of Object.entries({ vistoria, evidencia, status, km })) {
      assert.equal(r.status, 200, `${nome}: o lote responde 200`);
      assert.equal(r.acao, "conflict", `${nome}: ${r.acao} ${r.reason}`);
      assert.equal(r.conflictType, CONFLITO, `${nome}: conflict_type ${r.conflictType}`);
      assert.equal(r.reason, "not_assigned_to_actor", `${nome}: reason ${r.reason}`);
    }

    const os = await ctx.os(s.workOrderId);
    assert.equal(os.status, "assigned", "o status do ex-técnico foi aplicado");
    assert.equal(os.mileageStart ?? null, null, "a km do ex-técnico foi aplicada");
    assert.equal((await ctx.respostas(s.runId)).length, 0, "a resposta do ex-técnico foi gravada");
  });
});

test("CA5 — quem nunca foi técnico recebe rejected (não conflito) nas 4 famílias", async () => {
  await withApi(async (ctx) => {
    const { seed } = ctx;
    const s = await ctx.semente(seed.tecnicoA);
    const h = ctx.h(seed.tecnicoB, "field_technician");

    const r = {
      vistoria: await ctx.lote(LOTE_VISTORIA, h, "checklist.item_answer", ctx.payloadVistoria("checklist.item_answer", s)),
      evidencia: await ctx.lote(LOTE_EVIDENCIA, h, "evidence.work_order_photo", ctx.payloadEvidencia("evidence.work_order_photo", s)),
      status: await ctx.lote(LOTE_OS, h, "work_order.status_change", { work_order_id: s.workOrderId, status: "accepted" }),
      km: await ctx.lote(LOTE_OS, h, "work_order.mileage", { work_order_id: s.workOrderId, mileage_start: 9 }),
    };
    for (const [nome, x] of Object.entries(r)) {
      assert.equal(x.acao, "rejected", `${nome}: ${x.acao} ${x.reason}`);
      assert.equal(x.reason, "not_assigned_to_actor", `${nome}: reason ${x.reason}`);
    }
  });
});

test("CA8 — o alvo de um despacho ativo segue mudando o PRÓPRIO despacho mesmo quando a OS passou a outro (Traccar)", async () => {
  await withApi(async (ctx) => {
    const { seed } = ctx;
    const s = await ctx.semente(seed.tecnicoA);
    // Segundo despacho ativo da mesma OS, para C: a OS passa a C; o despacho de A continua dele.
    const segundo = await ctx.despachar(s.workOrderId, seed.tecnicoC);
    assert.equal(segundo.status, 201);
    assert.equal((await ctx.os(s.workOrderId)).assignedUserId, seed.tecnicoC.id);

    const hA = ctx.h(seed.tecnicoA, "field_technician");
    const aceitar = await ctx.req(`/api/v1/operations/dispatches/${s.dispatchId}/status`, { method: "PATCH", headers: hA, body: { status: "accepted" } });
    assert.equal(aceitar.status, 200, `o alvo não aceitou o próprio despacho: ${JSON.stringify(aceitar.body)}`);
    assert.ok(aceitar.body.data.acceptedAt, "accepted_at não gravado (é o que o Traccar lê)");

    // Mas na OS ele já não escreve: é ex-técnico.
    const vistoria = await ctx.lote(LOTE_VISTORIA, hA, "checklist.item_answer", ctx.payloadVistoria("checklist.item_answer", s));
    assert.equal(vistoria.acao, "conflict");
    // E o despacho de C não é dele.
    const alheio = await ctx.req(`/api/v1/operations/dispatches/${segundo.body.data.id}/status`, { method: "PATCH", headers: hA, body: { status: "accepted" } });
    assert.equal(alheio.status, 403);
    assert.equal(alheio.body.error.reason, "not_assigned_to_actor");
  });
});

test("CA9 — a união manager+field_technician não sofre o recorte (vistoria e despacho alheios)", async () => {
  await withApi(async (ctx) => {
    const { seed } = ctx;
    const s = await ctx.semente(seed.tecnicoA);
    const duplo = ctx.h(seed.tecnicoB, "field_technician,manager");
    const vistoria = await ctx.req(`/api/v1/mobile/checklist-runs/${s.runId}/complete`, { method: "POST", headers: duplo, body: { hasDivergence: false } });
    assert.notEqual(vistoria.body?.error?.reason, "not_assigned_to_actor", JSON.stringify(vistoria.body));
    const despacho = await ctx.req(`/api/v1/operations/dispatches/${s.dispatchId}/status`, { method: "PATCH", headers: duplo, body: { status: "accepted" } });
    assert.equal(despacho.status, 200, JSON.stringify(despacho.body));
  });
});

test("CA10 · S-XT — outra organização segue 404 (vistoria e despacho), nunca 403", async () => {
  await withApi(async (ctx) => {
    const { seed } = ctx;
    const s = await ctx.semente(seed.tecnicoA);
    const hX = ctx.h(seed.tecnicoX, "field_technician", seed.tenantB);
    const vistoria = await ctx.req(`/api/v1/mobile/checklist-runs/${s.runId}/complete`, { method: "POST", headers: hX, body: {} });
    assert.equal(vistoria.status, 404, JSON.stringify(vistoria.body));
    const despacho = await ctx.req(`/api/v1/operations/dispatches/${s.dispatchId}/status`, { method: "PATCH", headers: hX, body: { status: "accepted" } });
    assert.equal(despacho.status, 404, JSON.stringify(despacho.body));
  });
});

test("S-ORFA — vistoria sem OS: o técnico é recusado (fail-closed); o operator responde", async () => {
  await withApi(async (ctx) => {
    const { seed } = ctx;
    const criada = await ctx.req("/api/v1/mobile/checklist-runs", {
      method: "POST",
      headers: ctx.h(seed.gestorA, "operator"),
      body: { checklistId: await ctx.modelo() },
    });
    assert.equal(criada.status, 201, JSON.stringify(criada.body));
    const runId = criada.body.data.id as string;
    const tecnico = await ctx.req(`/api/v1/mobile/checklist-runs/${runId}/complete`, { method: "POST", headers: ctx.h(seed.tecnicoA, "field_technician"), body: { hasDivergence: false } });
    assert.equal(tecnico.status, 403, JSON.stringify(tecnico.body));
    assert.equal(tecnico.body.error.reason, "not_assigned_to_actor");
    const operador = await ctx.req(`/api/v1/mobile/checklist-runs/${runId}/complete`, { method: "POST", headers: ctx.h(seed.gestorA, "operator"), body: { hasDivergence: false } });
    assert.notEqual(operador.status, 403, JSON.stringify(operador.body));
  });
});

test("S-ORDEM — o escopo vem ANTES do parse no REST de vistoria (corpo inválido do não atribuído → 403, não 400)", async () => {
  await withApi(async (ctx) => {
    const { seed } = ctx;
    const s = await ctx.semente(seed.tecnicoA);
    const hB = ctx.h(seed.tecnicoB, "field_technician");
    for (const sufixo of ["", "/attachments", "/markers", "/divergence", "/acknowledgement"]) {
      const r = await ctx.req(`/api/v1/mobile/checklist-runs/${s.runId}${sufixo}`, {
        method: sufixo === "" ? "PATCH" : "POST",
        headers: hB,
        body: { lixo: true, answers: "não é lista" },
      });
      assert.equal(r.status, 403, `${sufixo || "PATCH"}: ${r.status} ${JSON.stringify(r.body)}`);
    }
  });
});

test("S-IDEMP — por client_action_id o already_applied vem antes do escopo; por ESTADO o escopo vem antes", async () => {
  await withApi(async (ctx) => {
    const { seed } = ctx;
    const s = await ctx.semente(seed.tecnicoA);
    const hA = ctx.h(seed.tecnicoA, "field_technician");
    const acao = randomUUID();
    const primeira = await ctx.lote(LOTE_VISTORIA, hA, "checklist.item_answer", ctx.payloadVistoria("checklist.item_answer", s), acao);
    assert.equal(primeira.acao, "accepted");
    await ctx.reatribuir(s.dispatchId, seed.tecnicoC);
    ctx.reiniciarLotes(); // o recibo em memória some; a idempotência durável (metadado) continua
    const reenvio = await ctx.lote(LOTE_VISTORIA, hA, "checklist.item_answer", ctx.payloadVistoria("checklist.item_answer", s), acao);
    assert.equal(reenvio.acao, "already_applied", `mesma ação já gravada: ${reenvio.acao} ${reenvio.reason}`);

    // Por estado: C conclui; B (nunca técnico) manda "concluir" — o estado não diz quem agiu, então o escopo vem antes.
    const concluir = await ctx.lote(LOTE_VISTORIA, ctx.h(seed.tecnicoC, "field_technician"), "checklist.complete", ctx.payloadVistoria("checklist.complete", s));
    assert.equal(concluir.acao, "accepted", `${concluir.acao} ${concluir.reason}`);
    const intruso = await ctx.lote(LOTE_VISTORIA, ctx.h(seed.tecnicoB, "field_technician"), "checklist.complete", ctx.payloadVistoria("checklist.complete", s));
    assert.equal(intruso.acao, "rejected", `por estado, o não atribuído recebeu ${intruso.acao}`);
    assert.equal(intruso.reason, "not_assigned_to_actor");
  });
});

test("E-UP — o upload decide pela OS do RECIBO: sem o campo work_order_id no formulário, o ex-técnico recebe 409 e nada é gravado", async () => {
  await withApi(async (ctx) => {
    const { seed } = ctx;
    const s = await ctx.semente(seed.tecnicoA);
    const hA = ctx.h(seed.tecnicoA, "field_technician");
    const cliente = `evid-${randomUUID()}`;
    const meta = await ctx.lote(LOTE_EVIDENCIA, hA, "evidence.work_order_photo", ctx.payloadEvidencia("evidence.work_order_photo", s), cliente);
    assert.equal(meta.acao, "accepted", `${meta.acao} ${meta.reason}`);
    await ctx.reatribuir(s.dispatchId, seed.tecnicoC);

    const up = await ctx.upload(hA, seed.tenantA, cliente, { omitirWorkOrderId: true });
    assert.equal(up.status, 409, JSON.stringify(up.body));
    assert.equal(up.body.error.reason, CONFLITO);
    const eventos = ctx.eventosEvidencia().filter((e: any) => e.metadata?.client_evidence_id === cliente);
    assert.equal(eventos.some((e: any) => e.action === "evidence.upload.stored"), false, "o binário do ex-técnico foi gravado");

    // Controle: o atribuído sobe o binário da própria evidência, também sem o campo.
    const s2 = await ctx.semente(seed.tecnicoA);
    const cliente2 = `evid-${randomUUID()}`;
    const meta2 = await ctx.lote(LOTE_EVIDENCIA, hA, "evidence.work_order_photo", ctx.payloadEvidencia("evidence.work_order_photo", s2), cliente2);
    assert.equal(meta2.acao, "accepted");
    const up2 = await ctx.upload(hA, seed.tenantA, cliente2, { omitirWorkOrderId: true });
    assert.equal(up2.status, 201, JSON.stringify(up2.body));
  });
});

test("rascunho — não atribui; quem despacha o ativa (atribui); o técnico NÃO ativa o próprio rascunho", async () => {
  await withApi(async (ctx) => {
    const { seed } = ctx;
    const osId = await ctx.criarOs();
    const rascunho = await ctx.despachar(osId, seed.tecnicoA, "draft");
    assert.equal(rascunho.status, 201);
    assert.equal((await ctx.os(osId)).assignedUserId ?? null, null, "o rascunho atribuiu");

    const proprio = await ctx.req(`/api/v1/operations/dispatches/${rascunho.body.data.id}/status`, {
      method: "PATCH",
      headers: ctx.h(seed.tecnicoA, "field_technician"),
      body: { status: "assigned" },
    });
    assert.equal(proprio.status, 403, JSON.stringify(proprio.body));
    assert.equal(proprio.body.error.reason, "dispatch_activation_requires_dispatcher");
    assert.equal((await ctx.os(osId)).assignedUserId ?? null, null);

    const ativar = await ctx.req(`/api/v1/operations/dispatches/${rascunho.body.data.id}/status`, {
      method: "PATCH",
      headers: ctx.h(seed.gestorA, "field_dispatcher"),
      body: { status: "assigned" },
    });
    assert.equal(ativar.status, 200, JSON.stringify(ativar.body));
    assert.equal((await ctx.os(osId)).assignedUserId, seed.tecnicoA.id);
  });
});

test("cancelar/falhar (crítica, ajuste 4) — a OS volta ao despacho ativo que sobrou; cancelar o de quem não é o técnico não mexe", async () => {
  await withApi(async (ctx) => {
    const { seed } = ctx;
    const s = await ctx.semente(seed.tecnicoA);
    const segundo = await ctx.despachar(s.workOrderId, seed.tecnicoC);
    assert.equal((await ctx.os(s.workOrderId)).assignedUserId, seed.tecnicoC.id);

    // Cancelar o de A (que não é mais o técnico da OS): nada muda.
    const hG = ctx.h(seed.gestorA, "manager");
    const cancA = await ctx.req(`/api/v1/operations/dispatches/${s.dispatchId}/status`, { method: "PATCH", headers: hG, body: { status: "cancelled", reason: "teste" } });
    assert.equal(cancA.status, 200, JSON.stringify(cancA.body));
    assert.equal((await ctx.os(s.workOrderId)).assignedUserId, seed.tecnicoC.id);

    // Terceiro despacho para B; cancelar o de B (técnico atual) devolve a OS a C, o ativo que sobrou.
    const terceiro = await ctx.despachar(s.workOrderId, seed.tecnicoB);
    assert.equal((await ctx.os(s.workOrderId)).assignedUserId, seed.tecnicoB.id);
    const cancB = await ctx.req(`/api/v1/operations/dispatches/${terceiro.body.data.id}/status`, { method: "PATCH", headers: hG, body: { status: "failed", reason: "teste" } });
    assert.equal(cancB.status, 200, JSON.stringify(cancB.body));
    assert.equal((await ctx.os(s.workOrderId)).assignedUserId, seed.tecnicoC.id, "a OS não voltou ao despacho ativo restante");

    // Cancelar o último ativo: a atribuição FICA (ninguém tira o técnico da OS por um cancelamento).
    const cancC = await ctx.req(`/api/v1/operations/dispatches/${segundo.body.data.id}/status`, { method: "PATCH", headers: hG, body: { status: "cancelled", reason: "teste" } });
    assert.equal(cancC.status, 200);
    assert.equal((await ctx.os(s.workOrderId)).assignedUserId, seed.tecnicoC.id);
  });
});

test("compensação (crítica, ajuste 2) — falha injetada na atribuição: o create não deixa despacho; o reassign volta ao alvo anterior", async () => {
  await withApi(async (ctx) => {
    const { seed } = ctx;
    const { WorkOrderService } = await import("../src/modules/work-orders/work-order.service.js");
    const { WorkOrderError } = await import("../src/modules/work-orders/work-order.types.js");
    const original = WorkOrderService.prototype.assignFromDispatch;

    const s = await ctx.semente(seed.tecnicoA);
    const osNova = await ctx.criarOs();
    WorkOrderService.prototype.assignFromDispatch = async () => {
      throw new WorkOrderError(503, "WORK_ORDER_UNAVAILABLE", "injected_failure", "falha injetada");
    };
    try {
      const criar = await ctx.despachar(osNova, seed.tecnicoA);
      assert.equal(criar.status, 503, JSON.stringify(criar.body));
      assert.equal((await ctx.despachos(osNova)).length, 0, "o create deixou despacho sem atribuição");

      const reatribuir = await ctx.req(`/api/v1/operations/dispatches/${s.dispatchId}/reassign`, {
        method: "PATCH",
        headers: ctx.h(seed.gestorA, "manager"),
        body: { operatorUserId: seed.tecnicoC.id },
      });
      assert.equal(reatribuir.status, 503, JSON.stringify(reatribuir.body));
    } finally {
      WorkOrderService.prototype.assignFromDispatch = original;
    }
    const despacho = await ctx.req(`/api/v1/operations/dispatches/${s.dispatchId}`, { headers: ctx.h(seed.gestorA, "manager") });
    assert.equal(despacho.body.data.operatorUserId, seed.tecnicoA.id, "o reassign não foi desfeito");
    assert.equal(despacho.body.data.status, "assigned");
    assert.equal((await ctx.os(s.workOrderId)).assignedUserId, seed.tecnicoA.id);
  });
});

test("D-07CB1-TRAVA-ATE-B2 — antes de No local a troca de técnico vale na hora (inclusive A caminho)", async () => {
  await withApi(async (ctx) => {
    const { seed } = ctx;
    const s = await ctx.semente(seed.tecnicoA);
    const hA = ctx.h(seed.tecnicoA, "field_technician");
    const aCaminho = await ctx.req(`/api/v1/operations/dispatches/${s.dispatchId}/status`, { method: "PATCH", headers: hA, body: { status: "on_route" } });
    assert.equal(aCaminho.status, 200, JSON.stringify(aCaminho.body));
    await ctx.reatribuir(s.dispatchId, seed.tecnicoC);
    assert.equal((await ctx.os(s.workOrderId)).assignedUserId, seed.tecnicoC.id);
  });
});

test("D-07CB1-TRAVA-ATE-B2 — a partir de No local (despacho `arrived`/`in_service` ou OS `on_site` em diante) a troca é RECUSADA com o pedido de autorização", async () => {
  await withApi(async (ctx) => {
    const { seed } = ctx;
    const hA = ctx.h(seed.tecnicoA, "field_technician");
    const hG = ctx.h(seed.gestorA, "manager");
    const recusada = (r: { status: number; body: any }, via: string) => {
      assert.equal(r.status, 409, `${via}: ${r.status} ${JSON.stringify(r.body)}`);
      assert.equal(r.body.error.reason, "technician_change_requires_authorization", via);
      assert.match(r.body.error.message, /autoriza/i, `${via}: a mensagem não diz que precisa de autorização`);
    };

    // (1) DESPACHO em "No local" (`arrived`), OS ainda em `assigned`: o reassign é recusado; nada muda.
    const s1 = await ctx.semente(seed.tecnicoA);
    for (const etapa of ["on_route", "arrived"]) {
      const r = await ctx.req(`/api/v1/operations/dispatches/${s1.dispatchId}/status`, { method: "PATCH", headers: hA, body: { status: etapa } });
      assert.equal(r.status, 200, `${etapa}: ${JSON.stringify(r.body)}`);
    }
    const r1 = await ctx.req(`/api/v1/operations/dispatches/${s1.dispatchId}/reassign`, { method: "PATCH", headers: hG, body: { operatorUserId: seed.tecnicoC.id } });
    recusada(r1, "reassign com o despacho em arrived");
    const d1 = await ctx.req(`/api/v1/operations/dispatches/${s1.dispatchId}`, { headers: hG });
    assert.equal(d1.body.data.operatorUserId, seed.tecnicoA.id, "o despacho mudou de alvo apesar da recusa");
    assert.equal(d1.body.data.status, "arrived");
    assert.equal((await ctx.os(s1.workOrderId)).assignedUserId, seed.tecnicoA.id, "a OS mudou de técnico apesar da recusa");
    // Reatribuir à MESMA pessoa não troca ninguém: segue permitido — e (ciclo 2, via X1) não escreve nada: o despacho
    // CONTINUA em "No local" (antes ia a `reassigned` e a marca de atendimento iniciado sumia).
    const mesma = await ctx.req(`/api/v1/operations/dispatches/${s1.dispatchId}/reassign`, { method: "PATCH", headers: hG, body: { operatorUserId: seed.tecnicoA.id } });
    assert.equal(mesma.status, 200, JSON.stringify(mesma.body));
    const d1Mesma = await ctx.req(`/api/v1/operations/dispatches/${s1.dispatchId}`, { headers: hG });
    assert.equal(d1Mesma.body.data.status, "arrived", "reatribuir à mesma pessoa tirou o despacho de No local");

    // (2) OS em "No local" (`on_site`), despacho ainda em `assigned`: reassign, despacho novo e rascunho ativado para
    // OUTRO técnico são recusados; o despacho novo para o MESMO técnico passa.
    const s2 = await ctx.semente(seed.tecnicoA);
    for (const etapa of ["accepted", "on_route", "on_site"]) {
      const r = await ctx.req(`/api/v1/work-orders/${s2.workOrderId}/status`, { method: "PATCH", headers: hA, body: { status: etapa } });
      assert.equal(r.status, 200, `${etapa}: ${JSON.stringify(r.body)}`);
    }
    recusada(await ctx.req(`/api/v1/operations/dispatches/${s2.dispatchId}/reassign`, { method: "PATCH", headers: hG, body: { operatorUserId: seed.tecnicoC.id } }), "reassign com a OS em on_site");
    const antes = (await ctx.despachos(s2.workOrderId)).length;
    recusada(await ctx.despachar(s2.workOrderId, seed.tecnicoC), "despacho novo para outro técnico com a OS em on_site");
    assert.equal((await ctx.despachos(s2.workOrderId)).length, antes, "o despacho recusado ficou gravado");
    const rascunho = await ctx.despachar(s2.workOrderId, seed.tecnicoC, "draft");
    assert.equal(rascunho.status, 201, "rascunho não troca ninguém");
    recusada(
      await ctx.req(`/api/v1/operations/dispatches/${rascunho.body.data.id}/status`, { method: "PATCH", headers: hG, body: { status: "assigned" } }),
      "ativar rascunho de outro técnico com a OS em on_site",
    );
    assert.equal((await ctx.os(s2.workOrderId)).assignedUserId, seed.tecnicoA.id);
    const mesmoTecnico = await ctx.despachar(s2.workOrderId, seed.tecnicoA);
    assert.equal(mesmoTecnico.status, 201, `despacho novo para o mesmo técnico: ${JSON.stringify(mesmoTecnico.body)}`);
    const os2 = await ctx.os(s2.workOrderId);
    assert.equal(os2.status, "on_site", "o despacho rebaixou o status da OS");
    assert.equal(os2.assignedUserId, seed.tecnicoA.id);
  });
});

// ------------------------------------------------------------------------------------------------
// CICLO 2 (plano `B-O6R-07c-b1-ciclo2-auditoria-e-plano.md`, Parte 2, §2.4) — as propriedades P-TRAVA, P-ALOCA,
// P-ATOMICA e o "um critério só" da evidência, cada teste com o vermelho-controle contra o objeto do ciclo 1
// (`b198fe35`) e a mutação nomeada; registro em docs/revisoes/SAN3/B-O6R-07c-b1-dev.md, seção CICLO 2.
// ------------------------------------------------------------------------------------------------

// T-TRAVA — estados (atendimento iniciado) × vias que escrevem o técnico × papéis que alocam = 120 células.
// Cenário de cada célula: OS com DOIS despachos ativos — d2 do técnico C (antes) e d1 do técnico A (depois, a OS é
// de A) — e então o atendimento começa pelo DESPACHO de A (`arrived`/`in_service`, a OS segue `assigned`) ou pela OS
// (`on_site`/`in_progress`/`paused`, o despacho segue `assigned`). O d2 ativo é o que dá às vias V4/V5 (cancelar/falhar
// o d1) um despacho restante para onde a OS seria devolvida.
const ESTADOS_TRAVA = ["d1 arrived", "d1 in_service", "OS on_site", "OS in_progress", "OS paused"] as const;
const VIAS_TRAVA = [
  "reassign direto",
  "X1 mesma pessoa e depois outra",
  "V2 despacho novo",
  "V3 ativar rascunho",
  "V4 cancelar d1",
  "V5 falhar d1",
  "web POST /assign",
  "lote work_order.assign",
] as const;
const PAPEIS_QUE_ALOCAM = ["manager", "field_dispatcher", "tenant_admin"] as const;
const ESTADO_PRE_NO_LOCAL = "d1 on_route";

type EstadoTrava = (typeof ESTADOS_TRAVA)[number] | typeof ESTADO_PRE_NO_LOCAL;
type ViaTrava = (typeof VIAS_TRAVA)[number];
type CenarioTrava = { osId: string; d1: string; d2: string };

async function cenarioTrava(ctx: Ctx, estado: EstadoTrava): Promise<CenarioTrava> {
  const { seed } = ctx;
  const osId = await ctx.criarOs();
  const d2 = await ctx.despachar(osId, seed.tecnicoC);
  assert.equal(d2.status, 201, JSON.stringify(d2.body));
  const d1 = await ctx.despachar(osId, seed.tecnicoA);
  assert.equal(d1.status, 201, JSON.stringify(d1.body));
  assert.equal((await ctx.os(osId)).assignedUserId, seed.tecnicoA.id, "cenário: a OS tinha de ser do técnico A");
  const hA = ctx.h(seed.tecnicoA, "field_technician");
  const etapasDespacho: Record<string, string[]> = {
    "d1 on_route": ["on_route"],
    "d1 arrived": ["on_route", "arrived"],
    "d1 in_service": ["on_route", "arrived", "in_service"],
  };
  const etapasOs: Record<string, string[]> = {
    "OS on_site": ["accepted", "on_route", "on_site"],
    "OS in_progress": ["accepted", "on_route", "on_site", "in_progress"],
    "OS paused": ["accepted", "on_route", "on_site", "in_progress", "paused"],
  };
  for (const etapa of etapasDespacho[estado] ?? []) {
    const r = await ctx.req(`/api/v1/operations/dispatches/${d1.body.data.id}/status`, { method: "PATCH", headers: hA, body: { status: etapa } });
    assert.equal(r.status, 200, `cenário ${estado} (${etapa}): ${JSON.stringify(r.body)}`);
  }
  for (const etapa of etapasOs[estado] ?? []) {
    const r = await ctx.req(`/api/v1/work-orders/${osId}/status`, { method: "PATCH", headers: hA, body: { status: etapa } });
    assert.equal(r.status, 200, `cenário ${estado} (${etapa}): ${JSON.stringify(r.body)}`);
  }
  return { osId, d1: d1.body.data.id as string, d2: d2.body.data.id as string };
}

// O retrato que tem de ficar INTACTO depois de uma recusa: técnico (as duas colunas), status, linhas de atribuição e
// cada despacho (alvo e status).
async function retrato(ctx: Ctx, osId: string) {
  const os = await ctx.os(osId);
  const despachos = (await ctx.despachos(osId)).map((d: any) => `${d.id}:${d.operatorUserId}:${d.status}`).sort();
  return {
    tecnico: os.assignedUserId ?? null,
    operador: os.assignedOperatorId ?? null,
    status: os.status,
    atribuicoes: ctx.atribuicoes(osId),
    despachos,
  };
}

function recusadaPelaTrava(r: { status: number; body: any }, via: string): void {
  assert.equal(r.status, 409, `${via}: ${r.status} ${JSON.stringify(r.body)}`);
  assert.equal(r.body.error.reason, "technician_change_requires_authorization", via);
  assert.match(r.body.error.message, /autoriza/i, `${via}: a mensagem não diz que precisa de autorização`);
}

async function despachoDe(ctx: Ctx, dispatchId: string): Promise<any> {
  const r = await ctx.req(`/api/v1/operations/dispatches/${dispatchId}`, { headers: ctx.h(ctx.seed.gestorA, "manager") });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body.data;
}

for (const estado of ESTADOS_TRAVA) {
  for (const via of VIAS_TRAVA) {
    for (const papel of PAPEIS_QUE_ALOCAM) {
      test(`T-TRAVA [${estado}] ${via} · ${papel} — a troca de técnico a partir de No local é recusada e nada é gravado`, async () => {
        await withApi(async (ctx) => {
          const { seed } = ctx;
          const c = await cenarioTrava(ctx, estado);
          const hP = ctx.h(seed.gestorA, papel);
          const statusD1 = (await despachoDe(ctx, c.d1)).status as string;

          if (via === "reassign direto") {
            const antes = await retrato(ctx, c.osId);
            recusadaPelaTrava(await ctx.req(`/api/v1/operations/dispatches/${c.d1}/reassign`, { method: "PATCH", headers: hP, body: { operatorUserId: seed.tecnicoC.id } }), via);
            assert.deepEqual(await retrato(ctx, c.osId), antes, `${via}: algo foi gravado apesar da recusa`);
            return;
          }

          if (via === "X1 mesma pessoa e depois outra") {
            const antes = await retrato(ctx, c.osId);
            const mesma = await ctx.req(`/api/v1/operations/dispatches/${c.d1}/reassign`, { method: "PATCH", headers: hP, body: { operatorUserId: seed.tecnicoA.id } });
            assert.equal(mesma.status, 200, JSON.stringify(mesma.body));
            const d1 = await despachoDe(ctx, c.d1);
            assert.equal(d1.status, statusD1, `X1: reatribuir à MESMA pessoa mudou o status do despacho (${statusD1} → ${d1.status})`);
            assert.deepEqual(await retrato(ctx, c.osId), antes, "X1: reatribuir à mesma pessoa gravou alguma coisa");
            recusadaPelaTrava(await ctx.req(`/api/v1/operations/dispatches/${c.d1}/reassign`, { method: "PATCH", headers: hP, body: { operatorUserId: seed.tecnicoC.id } }), via);
            assert.deepEqual(await retrato(ctx, c.osId), antes, `${via}: algo foi gravado apesar da recusa`);
            return;
          }

          if (via === "V2 despacho novo") {
            const antes = await retrato(ctx, c.osId);
            recusadaPelaTrava(
              await ctx.req("/api/v1/operations/dispatches", { method: "POST", headers: hP, body: { workOrderId: c.osId, operatorUserId: seed.tecnicoB.id } }),
              via,
            );
            assert.deepEqual(await retrato(ctx, c.osId), antes, `${via}: algo foi gravado apesar da recusa`);
            return;
          }

          if (via === "V3 ativar rascunho") {
            const rascunho = await ctx.despachar(c.osId, seed.tecnicoB, "draft");
            assert.equal(rascunho.status, 201, `o rascunho não troca ninguém: ${JSON.stringify(rascunho.body)}`);
            const antes = await retrato(ctx, c.osId);
            recusadaPelaTrava(
              await ctx.req(`/api/v1/operations/dispatches/${rascunho.body.data.id}/status`, { method: "PATCH", headers: hP, body: { status: "assigned" } }),
              via,
            );
            assert.deepEqual(await retrato(ctx, c.osId), antes, `${via}: algo foi gravado apesar da recusa (o rascunho tem de seguir draft)`);
            return;
          }

          if (via === "V4 cancelar d1" || via === "V5 falhar d1") {
            const destino = via === "V4 cancelar d1" ? "cancelled" : "failed";
            const antes = await retrato(ctx, c.osId);
            const r = await ctx.req(`/api/v1/operations/dispatches/${c.d1}/status`, { method: "PATCH", headers: hP, body: { status: destino, reason: "teste da trava" } });
            assert.equal(r.status, 200, `${via}: fechar o despacho é permitido: ${JSON.stringify(r.body)}`);
            const depois = await retrato(ctx, c.osId);
            assert.equal(depois.tecnico, seed.tecnicoA.id, `${via}: a OS saiu do técnico que está no cliente (foi para ${depois.tecnico})`);
            assert.equal(depois.operador, antes.operador, `${via}: a OS mudou de operador`);
            assert.equal(depois.status, antes.status, `${via}: a OS mudou de status`);
            assert.equal(depois.atribuicoes, antes.atribuicoes, `${via}: uma atribuição nova foi gravada`);
            assert.equal((await despachoDe(ctx, c.d1)).status, destino);
            const d2 = await despachoDe(ctx, c.d2);
            assert.equal(`${d2.operatorUserId}:${d2.status}`, `${seed.tecnicoC.id}:assigned`, `${via}: o despacho restante mudou`);
            return;
          }

          if (via === "web POST /assign") {
            const antes = await retrato(ctx, c.osId);
            recusadaPelaTrava(await ctx.req(`/api/v1/work-orders/${c.osId}/assign`, { method: "POST", headers: hP, body: { operatorId: randomUUID() } }), via);
            assert.deepEqual(await retrato(ctx, c.osId), antes, `${via}: algo foi gravado apesar da recusa`);
            return;
          }

          // lote work_order.assign — o 409 da trava vira conflito por ação (a forma que o lote já dá a todo 409).
          const antes = await retrato(ctx, c.osId);
          const lote = await ctx.lote(LOTE_OS, hP, "work_order.assign", { work_order_id: c.osId, operator_id: randomUUID() });
          assert.equal(lote.status, 200, `${via}: o lote responde 200 (a recusa é POR AÇÃO)`);
          assert.equal(lote.acao, "conflict", `${via}: ação ${lote.acao} ${lote.reason}`);
          assert.equal(lote.reason, "technician_change_requires_authorization", `${via}: reason ${lote.reason}`);
          assert.equal(lote.conflictType, "technician_change_requires_authorization", `${via}: conflict_type ${lote.conflictType}`);
          assert.deepEqual(await retrato(ctx, c.osId), antes, `${via}: algo foi gravado apesar da recusa`);
        });
      });
    }
  }
}

// T-TRAVA controle positivo — ANTES de No local (d1 `on_route`, a OS `assigned`) as 8 vias trocam (ou movem) o técnico.
for (const via of VIAS_TRAVA) {
  test(`T-TRAVA controle positivo [${ESTADO_PRE_NO_LOCAL}] ${via} — antes de No local a troca vale na hora`, async () => {
    await withApi(async (ctx) => {
      const { seed } = ctx;
      const c = await cenarioTrava(ctx, ESTADO_PRE_NO_LOCAL);
      const hG = ctx.h(seed.gestorA, "manager");
      const tecnico = async () => (await ctx.os(c.osId)).assignedUserId ?? null;

      if (via === "reassign direto" || via === "X1 mesma pessoa e depois outra") {
        if (via === "X1 mesma pessoa e depois outra") {
          const mesma = await ctx.req(`/api/v1/operations/dispatches/${c.d1}/reassign`, { method: "PATCH", headers: hG, body: { operatorUserId: seed.tecnicoA.id } });
          assert.equal(mesma.status, 200, JSON.stringify(mesma.body));
          assert.equal((await despachoDe(ctx, c.d1)).status, "on_route", "X1: reatribuir à mesma pessoa mudou o status do despacho");
        }
        const r = await ctx.req(`/api/v1/operations/dispatches/${c.d1}/reassign`, { method: "PATCH", headers: hG, body: { operatorUserId: seed.tecnicoC.id } });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(await tecnico(), seed.tecnicoC.id);
      } else if (via === "V2 despacho novo") {
        const r = await ctx.despachar(c.osId, seed.tecnicoB);
        assert.equal(r.status, 201, JSON.stringify(r.body));
        assert.equal(await tecnico(), seed.tecnicoB.id);
      } else if (via === "V3 ativar rascunho") {
        const rascunho = await ctx.despachar(c.osId, seed.tecnicoB, "draft");
        assert.equal(rascunho.status, 201);
        const r = await ctx.req(`/api/v1/operations/dispatches/${rascunho.body.data.id}/status`, { method: "PATCH", headers: hG, body: { status: "assigned" } });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(await tecnico(), seed.tecnicoB.id);
      } else if (via === "V4 cancelar d1" || via === "V5 falhar d1") {
        const destino = via === "V4 cancelar d1" ? "cancelled" : "failed";
        const r = await ctx.req(`/api/v1/operations/dispatches/${c.d1}/status`, { method: "PATCH", headers: hG, body: { status: destino, reason: "controle" } });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(await tecnico(), seed.tecnicoC.id, `${via}: a OS não voltou ao despacho ativo restante (d2, técnico C)`);
      } else if (via === "web POST /assign") {
        const novo = randomUUID();
        const r = await ctx.req(`/api/v1/work-orders/${c.osId}/assign`, { method: "POST", headers: hG, body: { operatorId: novo } });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal((await ctx.os(c.osId)).assignedOperatorId, novo);
      } else {
        const novo = randomUUID();
        const lote = await ctx.lote(LOTE_OS, hG, "work_order.assign", { work_order_id: c.osId, operator_id: novo });
        assert.equal(lote.acao, "accepted", `${lote.acao} ${lote.reason}`);
        assert.equal((await ctx.os(c.osId)).assignedOperatorId, novo);
      }
    });
  });
}

// T-COMPOSICAO — a composição única tem o resolver da trava, e ele responde pelo despacho real.
test("T-COMPOSICAO — a composição padrão do WorkOrderService tem `hasActiveDispatchAtSite`, que lê o despacho em No local", async () => {
  await withApi(async (ctx) => {
    const { seed } = ctx;
    const { createMemoryWorkOrderService, createDefaultWorkOrderService } = await import("../src/modules/work-orders/work-order.service.js");
    for (const servico of [createMemoryWorkOrderService(), await createDefaultWorkOrderService()]) {
      assert.equal(typeof (servico as any).references?.hasActiveDispatchAtSite, "function", "a composição não injeta o resolver da trava");
    }
    const resolver = (createMemoryWorkOrderService() as any).references.hasActiveDispatchAtSite as (t: string, o: string) => Promise<boolean>;
    const s = await ctx.semente(seed.tecnicoA);
    assert.equal(await resolver(seed.tenantA.id, s.workOrderId), false, "despacho `assigned` não está em No local");
    const hA = ctx.h(seed.tecnicoA, "field_technician");
    for (const etapa of ["on_route", "arrived"]) {
      const r = await ctx.req(`/api/v1/operations/dispatches/${s.dispatchId}/status`, { method: "PATCH", headers: hA, body: { status: etapa } });
      assert.equal(r.status, 200, JSON.stringify(r.body));
    }
    assert.equal(await resolver(seed.tenantA.id, s.workOrderId), true, "despacho `arrived` está em No local");
    assert.equal(await resolver(seed.tenantB.id, s.workOrderId), false, "outra organização não enxerga o despacho");
  });
});

test("T-COMPOSICAO — WorkOrderService montado SEM o resolver recusa toda troca de técnico (fail-closed); com o resolver, troca", async () => {
  const { WorkOrderService } = await import("../src/modules/work-orders/work-order.service.js");
  const { InMemoryWorkOrderRepository } = await import("../src/modules/work-orders/work-order.repository.js");
  const { resolvePermissionsForRoles } = await import("../src/modules/core-saas/permissions/catalog.js");
  const ator = { tenantId: randomUUID(), userId: randomUUID(), roles: ["manager"], permissions: resolvePermissionsForRoles(["manager"]) } as never;

  const semResolver = new WorkOrderService(new InMemoryWorkOrderRepository(), {});
  const os1 = await semResolver.create(ator, { title: "fail-closed" });
  await semResolver.assign(ator, os1.id, { operatorId: randomUUID() }); // sem técnico: não há troca
  await assert.rejects(semResolver.assign(ator, os1.id, { operatorId: randomUUID() }), (e: any) => e.statusCode === 409 && e.reason === "technician_change_requires_authorization");
  await assert.rejects(
    semResolver.assignFromDispatch(ator, { workOrderId: os1.id, operatorUserId: randomUUID(), dispatchId: randomUUID(), source: "field_dispatch" }),
    (e: any) => e.statusCode === 409 && e.reason === "technician_change_requires_authorization",
  );

  const comResolver = new WorkOrderService(new InMemoryWorkOrderRepository(), { hasActiveDispatchAtSite: async () => false });
  const os2 = await comResolver.create(ator, { title: "controle" });
  await comResolver.assign(ator, os2.id, { operatorId: randomUUID() });
  const novo = randomUUID();
  const trocada = await comResolver.assign(ator, os2.id, { operatorId: novo });
  assert.equal(trocada.assignedOperatorId, novo, "controle: com o resolver dizendo 'ninguém no local', a troca vale");
});

// T-ALOCA — ativar rascunho atribui a OS: só quem tem `field_dispatch:create`.
for (const caso of [
  { papel: "operator", permite: false },
  { papel: "field_technician", permite: false },
  { papel: "manager", permite: true },
  { papel: "field_dispatcher", permite: true },
  { papel: "tenant_admin", permite: true },
] as const) {
  test(`T-ALOCA — ativar rascunho como ${caso.papel}: ${caso.permite ? "200 e a OS atribuída" : "403 dispatch_activation_requires_dispatcher e a OS intacta"}`, async () => {
    await withApi(async (ctx) => {
      const { seed } = ctx;
      const osId = await ctx.criarOs();
      const rascunho = await ctx.despachar(osId, seed.tecnicoA, "draft");
      assert.equal(rascunho.status, 201);
      const ator = caso.papel === "field_technician" ? seed.tecnicoA : seed.gestorA; // o técnico tenta o PRÓPRIO rascunho
      const r = await ctx.req(`/api/v1/operations/dispatches/${rascunho.body.data.id}/status`, {
        method: "PATCH",
        headers: ctx.h(ator, caso.papel),
        body: { status: "assigned" },
      });
      if (caso.permite) {
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal((await ctx.os(osId)).assignedUserId, seed.tecnicoA.id);
      } else {
        assert.equal(r.status, 403, JSON.stringify(r.body));
        assert.equal(r.body.error.reason, "dispatch_activation_requires_dispatcher");
        assert.equal((await ctx.os(osId)).assignedUserId ?? null, null, "a OS foi atribuída por quem não aloca");
        assert.equal((await despachoDe(ctx, rascunho.body.data.id)).status, "draft");
      }
    });
  });
}

// T-ATOMICA-MEM — o evento `work_order_assigned` nasce DENTRO do método que grava a OS e a linha: nenhum caminho de
// atribuição chama `createEvent` (a escrita avulsa) para ele, e a linha do tempo tem o evento.
for (const caminho of ["create", "reassign", "ativação", "web"] as const) {
  test(`T-ATOMICA-MEM [${caminho}] — o evento da atribuição é gravado com a OS e a linha, não por createEvent avulso`, async () => {
    await withApi(async (ctx) => {
      const { seed } = ctx;
      const { InMemoryWorkOrderRepository } = await import("../src/modules/work-orders/work-order.repository.js");
      const original = InMemoryWorkOrderRepository.prototype.createEvent;
      const avulsos: string[] = [];
      InMemoryWorkOrderRepository.prototype.createEvent = function (this: unknown, input: any) {
        if (input.eventType === "work_order_assigned") avulsos.push(input.workOrderId);
        return original.call(this as never, input);
      };
      let osId: string;
      let fonte: string | undefined;
      try {
        osId = await ctx.criarOs();
        if (caminho === "create") {
          const d = await ctx.despachar(osId, seed.tecnicoA);
          assert.equal(d.status, 201, JSON.stringify(d.body));
          fonte = "field_dispatch";
        } else if (caminho === "reassign") {
          const d = await ctx.despachar(osId, seed.tecnicoA);
          assert.equal(d.status, 201);
          await ctx.reatribuir(d.body.data.id, seed.tecnicoC);
          fonte = "field_dispatch_reassign";
        } else if (caminho === "ativação") {
          const d = await ctx.despachar(osId, seed.tecnicoA, "draft");
          const r = await ctx.req(`/api/v1/operations/dispatches/${d.body.data.id}/status`, { method: "PATCH", headers: ctx.h(seed.gestorA, "manager"), body: { status: "assigned" } });
          assert.equal(r.status, 200, JSON.stringify(r.body));
          fonte = "field_dispatch";
        } else {
          const r = await ctx.req(`/api/v1/work-orders/${osId}/assign`, { method: "POST", headers: ctx.h(seed.gestorA, "manager"), body: { operatorId: randomUUID() } });
          assert.equal(r.status, 200, JSON.stringify(r.body));
        }
      } finally {
        InMemoryWorkOrderRepository.prototype.createEvent = original;
      }
      assert.deepEqual(avulsos, [], `[${caminho}] o evento da atribuição foi gravado por createEvent avulso (fora da escrita da OS)`);
      const eventos = (await ctx.timeline(osId)).filter((e: any) => e.eventType === "work_order_assigned");
      assert.ok(eventos.length >= 1, `[${caminho}] a linha do tempo não tem o evento da atribuição`);
      const ultimo = eventos[eventos.length - 1];
      assert.equal(typeof ultimo.metadata.assignmentId, "string", `[${caminho}] o evento não aponta a linha de atribuição`);
      assert.equal(ultimo.metadata.source, fonte);
      assert.equal(eventos.length, ctx.atribuicoes(osId), `[${caminho}] número de eventos ≠ número de linhas de atribuição`);
    });
  });
}

// T-EVID-EXISTE — `evidence.work_order_*` exige a OS desta organização para TODOS os papéis (`D1-07c`, um critério só).
const TIPOS_EVIDENCIA_OS = ["evidence.work_order_photo", "evidence.work_order_observation", "evidence.work_order_signature"] as const;
for (const papel of ["tenant_admin", "manager"] as const) {
  for (const caso of ["inexistente", "de outra organização", "real"] as const) {
    test(`T-EVID-EXISTE [${papel}] OS ${caso} — ${caso === "real" ? "accepted" : "rejected not_found"} nos 3 tipos`, async () => {
      await withApi(async (ctx) => {
        const { seed } = ctx;
        let workOrderId: string;
        if (caso === "inexistente") {
          workOrderId = randomUUID();
        } else if (caso === "de outra organização") {
          const criada = await ctx.req("/api/v1/work-orders", { method: "POST", headers: ctx.h(seed.tecnicoX, "manager", seed.tenantB), body: { title: "OS da outra organização" } });
          assert.equal(criada.status, 201, JSON.stringify(criada.body));
          workOrderId = criada.body.data.id as string;
        } else {
          workOrderId = await ctx.criarOs();
        }
        for (const tipo of TIPOS_EVIDENCIA_OS) {
          const r = await ctx.lote(LOTE_EVIDENCIA, ctx.h(seed.gestorA, papel), tipo, ctx.payloadEvidencia(tipo, { workOrderId } as Semente));
          assert.equal(r.status, 200);
          if (caso === "real") {
            assert.equal(r.acao, "accepted", `${tipo}: ${r.acao} ${r.reason}`);
          } else {
            assert.equal(r.acao, "rejected", `${tipo}: ${r.acao} ${r.reason}`);
            assert.equal(r.reason, "not_found", `${tipo}: reason ${r.reason}`);
          }
        }
      });
    });
  }
}

test("T-EVID-EXISTE [field_technician não atribuído] — rejected not_assigned_to_actor nos 3 tipos (inalterado)", async () => {
  await withApi(async (ctx) => {
    const { seed } = ctx;
    const s = await ctx.semente(seed.tecnicoA);
    for (const tipo of TIPOS_EVIDENCIA_OS) {
      const r = await ctx.lote(LOTE_EVIDENCIA, ctx.h(seed.tecnicoB, "field_technician"), tipo, ctx.payloadEvidencia(tipo, s));
      assert.equal(r.acao, "rejected", `${tipo}: ${r.acao} ${r.reason}`);
      assert.equal(r.reason, "not_assigned_to_actor");
    }
  });
});

// ------------------------------------------------------------------------------------------------
// Receitas e arnês
// ------------------------------------------------------------------------------------------------

type Semente = { workOrderId: string; dispatchId: string; runId: string; componentId: string };
type Execucao = { lote: boolean; status: number; acao?: string; reason?: string; conflictType?: string };

const CANONICO: Record<string, string> = {
  "checklist_marker.create": "checklist.marker_create",
  "checklist_divergence.create": "checklist.divergence_create",
  "checklist_acknowledgement.create": "checklist.acknowledgement_create",
  "checklist_attachment.attach": "checklist.attachment_attach",
  "checklist_run.complete": "checklist.complete",
};

async function executar(
  ctx: Ctx,
  chave: string,
  ator: User,
  papel: string,
  s: Semente,
  antes?: () => Promise<void>,
): Promise<Execucao> {
  const h = ctx.h(ator, papel);
  if (chave === "ROTA POST /api/v1/mobile/evidence-uploads") {
    // O metadado é registrado pelo próprio ator enquanto ele pode; `antes` (a troca de técnico) roda entre os dois.
    const cliente = `evid-${randomUUID()}`;
    const meta = await ctx.lote(LOTE_EVIDENCIA, h, "evidence.work_order_photo", ctx.payloadEvidencia("evidence.work_order_photo", s), cliente);
    if (meta.acao !== "accepted") return meta;
    await antes?.();
    const up = await ctx.upload(h, ctx.seed.tenantA, cliente, { omitirWorkOrderId: true });
    return { lote: false, status: up.status, reason: up.body?.error?.reason };
  }
  await antes?.();
  if (chave.startsWith("ROTA ")) {
    const [, metodo, caminho] = chave.split(" ");
    const url = caminho.replace(/:([A-Za-z0-9_]+)/g, (_, nome: string) => {
      const valor = nome === "runId" ? s.runId : nome === "dispatchId" ? s.dispatchId : undefined;
      if (!valor) throw new Error(`laço G: parâmetro :${nome} sem semente em "${chave}" — o laço nunca pula uma entrada`);
      return valor;
    });
    const corpo = url.includes("/dispatches/") ? { status: "accepted" } : {};
    const r = await ctx.req(url, { method: metodo, headers: h, body: corpo });
    return { lote: false, status: r.status, reason: r.body?.error?.reason };
  }
  if (chave.startsWith("PAR ")) {
    const [lote, tipo] = chave.slice("PAR ".length).split(" · ");
    if (lote === LOTE_VISTORIA) return ctx.lote(lote, h, tipo, ctx.payloadVistoria(CANONICO[tipo] ?? tipo, s));
    if (lote === LOTE_EVIDENCIA) return ctx.lote(lote, h, tipo, ctx.payloadEvidencia(tipo, s));
  }
  throw new Error(`laço G: chave sem receita "${chave}" — o laço nunca pula uma entrada`);
}

type Seed = {
  tenantA: Tenant;
  tenantB: Tenant;
  gestorA: User;
  tecnicoA: User;
  tecnicoB: User;
  tecnicoC: User;
  tecnicoX: User;
};

type Ctx = {
  seed: Seed;
  h(user: User, role: string, tenant?: Tenant): Record<string, string>;
  req(caminho: string, opcoes?: { method?: string; headers?: Record<string, string>; body?: unknown }): Promise<{ status: number; body: any }>;
  lote(lote: string, headers: Record<string, string>, tipo: string, payload: Record<string, unknown>, id?: string): Promise<Execucao>;
  upload(headers: Record<string, string>, tenant: Tenant, clientEvidenceId: string, opcoes: { omitirWorkOrderId: boolean }): Promise<{ status: number; body: any }>;
  payloadVistoria(tipoCanonico: string, s: Semente): Record<string, unknown>;
  payloadEvidencia(tipo: string, s: Semente): Record<string, unknown>;
  modelo(): Promise<string>;
  criarOs(): Promise<string>;
  despachar(workOrderId: string, tecnico: User, status?: string): Promise<{ status: number; body: any }>;
  reatribuir(dispatchId: string, tecnico: User): Promise<void>;
  semente(tecnico: User): Promise<Semente>;
  os(workOrderId: string): Promise<any>;
  timeline(workOrderId: string): Promise<any[]>;
  despachos(workOrderId: string): Promise<any[]>;
  eventosEvidencia(): readonly any[];
  respostas(runId: string): Promise<readonly unknown[]>;
  reiniciarLotes(): void;
  atribuicoes(workOrderId: string): number;
};

async function withApi(callback: (ctx: Ctx) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const [
    { createApp },
    workOrders,
    fieldDispatch,
    checklists,
    checklistSync,
    evidenceSync,
    evidenceUpload,
    workOrderSync,
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/work-orders/index.js"),
    import("../src/modules/field-dispatch/index.js"),
    import("../src/modules/checklists/index.js"),
    import("../src/modules/mobile/mobile-checklist-sync.js"),
    import("../src/modules/mobile/mobile-evidence-sync.js"),
    import("../src/modules/mobile/mobile-evidence-upload.js"),
    import("../src/modules/mobile/mobile-work-order-sync.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);
  const resetAll = async () => {
    workOrders.resetWorkOrderRuntimeForTests();
    fieldDispatch.resetFieldDispatchRuntimeForTests();
    checklists.resetChecklistRuntimeForTests();
    checklistSync.resetMobileChecklistSyncRuntimeForTests();
    evidenceSync.resetMobileEvidenceSyncRuntimeForTests();
    workOrderSync.resetMobileWorkOrderSyncRuntimeForTests();
    evidenceUpload.configureMobileEvidenceUploadStorageForTests(DIR_EVIDENCIAS);
    await evidenceUpload.resetMobileEvidenceUploadRuntimeForTests();
  };
  await resetAll();

  const modulos = ["work_orders", "field_operations", "tenant_checklist", "checklists"];
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenantA = core.createTenant({ name: "O6R07cb A", modules: modulos });
  const tenantB = core.createTenant({ name: "O6R07cb B", modules: modulos });
  const sufixo = randomUUID().slice(0, 8);
  const usuario = (tenant: Tenant, nome: string, roles: string[]) =>
    core.createUser({ tenantId: tenant.id, name: nome, email: `${nome}-${sufixo}@o6r07cb.example.com`, roles: roles as never });
  const seed: Seed = {
    tenantA,
    tenantB,
    gestorA: usuario(tenantA, "gestor", ["manager"]),
    tecnicoA: usuario(tenantA, "tecnico-a", ["field_technician"]),
    tecnicoB: usuario(tenantA, "tecnico-b", ["field_technician"]),
    tecnicoC: usuario(tenantA, "tecnico-c", ["field_technician"]),
    tecnicoX: usuario(tenantB, "tecnico-x", ["field_technician"]),
  };

  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  const h = (user: User, role: string, tenant: Tenant = tenantA) => ({ "x-tenant-id": tenant.id, "x-user-id": user.id, "x-role": role });
  const hGestor = h(seed.gestorA, "manager");
  const hAdmin = h(seed.gestorA, "tenant_admin");
  const req: Ctx["req"] = async (caminho, opcoes = {}) => {
    const response = await fetch(`${baseUrl}${caminho}`, {
      method: opcoes.method ?? "GET",
      headers: { "content-type": "application/json", ...opcoes.headers },
      body: opcoes.body === undefined ? undefined : JSON.stringify(opcoes.body),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };

  let modeloId: string | undefined;
  let componentId: string | undefined;
  const modelo = async () => {
    if (modeloId) return modeloId;
    const criado = await req("/api/v1/tenant/checklists", {
      method: "POST",
      headers: hAdmin,
      body: {
        name: "Vistoria 07c-b1",
        type: "technical_evidence",
        schema: { source: "o6r07cb1" },
        components: [{ componentKey: "estado", type: "observation", label: "Estado do veículo", required: true, config: {}, validationRules: {}, visibilityRules: {} }],
      },
    });
    assert.equal(criado.status, 201, JSON.stringify(criado.body));
    const publicado = await req(`/api/v1/tenant/checklists/${criado.body.data.id}/publish`, { method: "POST", headers: hAdmin, body: {} });
    assert.equal(publicado.status, 200, JSON.stringify(publicado.body));
    modeloId = criado.body.data.id as string;
    componentId = publicado.body.data.components[0].id as string;
    return modeloId;
  };
  const criarOs = async (extra: Record<string, unknown> = {}) => {
    const criada = await req("/api/v1/work-orders", { method: "POST", headers: hGestor, body: { title: "OS 07c-b1", ...extra } });
    assert.equal(criada.status, 201, JSON.stringify(criada.body));
    return criada.body.data.id as string;
  };
  const despachar: Ctx["despachar"] = (workOrderId, tecnico, status) =>
    req("/api/v1/operations/dispatches", {
      method: "POST",
      headers: hGestor,
      body: { workOrderId, operatorUserId: tecnico.id, ...(status ? { status } : {}) },
    });

  const ctx: Ctx = {
    seed,
    h,
    req,
    async lote(lote, headers, tipo, payload, id = randomUUID()) {
      const idKey = lote === LOTE_EVIDENCIA ? "client_evidence_id" : "client_action_id";
      const r = await req(lote, {
        method: "POST",
        headers,
        body: { client_batch_id: randomUUID(), actions: [{ [idKey]: id, type: tipo, local_created_at: new Date().toISOString(), payload }] },
      });
      const data = r.body?.data ?? {};
      const todas = [...(data.accepted ?? []), ...(data.rejected ?? []), ...(data.conflicts ?? []), ...(data.already_applied ?? [])];
      const acao = todas.find((a: any) => a[idKey] === id);
      return {
        lote: true,
        status: r.status,
        acao: acao?.status,
        reason: acao?.error?.reason ?? r.body?.error?.reason,
        conflictType: acao?.conflict?.conflict_type,
      };
    },
    async upload(headers, tenant, clientEvidenceId, opcoes) {
      const form = new FormData();
      form.set("evidence_id", `evidence:${tenant.id}:${clientEvidenceId}`);
      form.set("client_evidence_id", clientEvidenceId);
      form.set("sha256", createHash("sha256").update(JPEG_BYTES).digest("hex"));
      form.set("size_bytes", String(JPEG_BYTES.length));
      form.set("content_type", "image/jpeg");
      if (!opcoes.omitirWorkOrderId) form.set("work_order_id", "ignorado");
      form.set("file", new Blob([JPEG_BYTES], { type: "image/jpeg" }), "foto.jpg");
      const response = await fetch(`${baseUrl}/api/v1/mobile/evidence-uploads`, { method: "POST", headers, body: form });
      const text = await response.text();
      return { status: response.status, body: text ? JSON.parse(text) : null };
    },
    payloadVistoria(tipo, s) {
      const base = { run_id: s.runId };
      switch (tipo) {
        case "checklist.item_answer":
          return { ...base, component_id: s.componentId, value: "Sem avarias." };
        case "checklist.item_note":
          return { ...base, component_id: s.componentId, note: "Observação de campo." };
        case "checklist.marker_create":
          return { ...base, component_id: s.componentId, marker_type: "scratch", position_label: "Porta" };
        case "checklist.divergence_create":
          return { ...base, component_id: s.componentId, observation: "Avaria não constava." };
        case "checklist.acknowledgement_create":
          return { ...base, message: "Motorista ciente." };
        case "checklist.attachment_attach":
          return { ...base, local_att_id: `att-${randomUUID()}`, field_id: s.componentId, file_name: "avaria.jpg", mime_type: "image/jpeg", size_bytes: 1000, checksum: "abc" };
        case "checklist.complete":
          return { ...base, has_divergence: false };
        default:
          throw new Error(`receita de vistoria ausente para ${tipo} — o laço nunca pula uma entrada`);
      }
    },
    payloadEvidencia(tipo, s) {
      const base = { work_order_id: s.workOrderId };
      const arquivo = { file_name: "foto.jpg", content_type: "image/jpeg", size_bytes: JPEG_BYTES.length, sha256: createHash("sha256").update(JPEG_BYTES).digest("hex") };
      switch (tipo) {
        case "evidence.work_order_observation":
          return { ...base, note: "Equipamento isolado." };
        case "evidence.work_order_photo":
          return { ...base, ...arquivo };
        case "evidence.work_order_signature":
          return { ...base, ...arquivo, signer_name: "Cliente" };
        default:
          throw new Error(`receita de evidência ausente para ${tipo} — o laço nunca pula uma entrada`);
      }
    },
    modelo,
    criarOs,
    despachar,
    async reatribuir(dispatchId, tecnico) {
      const r = await req(`/api/v1/operations/dispatches/${dispatchId}/reassign`, {
        method: "PATCH",
        headers: hGestor,
        body: { operatorUserId: tecnico.id },
      });
      assert.equal(r.status, 200, `reatribuição falhou: ${JSON.stringify(r.body)}`);
    },
    async semente(tecnico) {
      const workOrderId = await criarOs({ checklistId: await modelo() });
      const d = await despachar(workOrderId, tecnico);
      assert.equal(d.status, 201, `despacho falhou: ${JSON.stringify(d.body)}`);
      const runs = await req(`/api/v1/mobile/checklist-runs?workOrderId=${workOrderId}`, { headers: hAdmin });
      assert.equal(runs.status, 200, JSON.stringify(runs.body));
      assert.equal(runs.body.data.length, 1, "o despacho não provisionou a vistoria");
      return { workOrderId, dispatchId: d.body.data.id as string, runId: runs.body.data[0].id as string, componentId: componentId as string };
    },
    async os(workOrderId) {
      const r = await req(`/api/v1/work-orders/${workOrderId}`, { headers: hGestor });
      assert.equal(r.status, 200, JSON.stringify(r.body));
      return r.body.data;
    },
    async timeline(workOrderId) {
      const r = await req(`/api/v1/work-orders/${workOrderId}/timeline`, { headers: hGestor });
      assert.equal(r.status, 200, JSON.stringify(r.body));
      return (r.body.data ?? r.body.items) as any[];
    },
    async despachos(workOrderId) {
      const r = await req(`/api/v1/operations/dispatches?workOrderId=${workOrderId}`, { headers: hGestor });
      assert.equal(r.status, 200, JSON.stringify(r.body));
      return (r.body.items ?? r.body.data) as any[];
    },
    eventosEvidencia() {
      return evidenceUpload.getMobileEvidenceUploadAuditEventsForTests();
    },
    async respostas(runId) {
      // Não há GET de uma execução no REST; lê pelo serviço do mesmo processo (modo memória).
      const service = await checklists.createDefaultChecklistService();
      return (await service.getRun({ tenantId: tenantA.id, userId: seed.gestorA.id }, runId)).answers;
    },
    reiniciarLotes() {
      checklistSync.resetMobileChecklistSyncRuntimeForTests();
      evidenceSync.resetMobileEvidenceSyncRuntimeForTests();
      workOrderSync.resetMobileWorkOrderSyncRuntimeForTests();
    },
    // Ciclo 2 — linhas de `work_order_assignments` da OS, lidas do repositório em memória do mesmo processo (o REST não
    // expõe a tabela). É o que a T-TRAVA usa para provar que a recusa não gravou atribuição nenhuma.
    atribuicoes(workOrderId) {
      const repositorio = workOrders.getMemoryWorkOrderRepositoryForTests() as unknown as { assignments: Map<string, { workOrderId: string }> };
      return [...repositorio.assignments.values()].filter((a) => a.workOrderId === workOrderId).length;
    },
  };

  try {
    await callback(ctx);
  } finally {
    await closeServer(server);
    await resetAll();
  }
}

async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");
  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}
