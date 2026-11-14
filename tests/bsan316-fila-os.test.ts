import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant } from "../src/modules/core-saas/types/core-saas.types.js";

// B-SAN3-16 (item 5 do portão, `P-MOBILE-FILA-OS-NAO-DRENADA`) — o lote de OS do app passa a aceitar "pedir aprovação"
// (`work_order.approval_request`) e "não consegui iniciar" (`work_order.unable_to_start`), só do técnico da OS.
//
// Lei: `plano-B-SAN3-16.md` + Emendas 1, 1.1 e 1.1.1 da abertura (fora do repositório, `erp-pausa-2026-10-03/planos/`).
// O que este arquivo prende, pelo app HTTP real em memória (o molde do laço G do 07c):
//   - P2: permissão por ação (`work_orders:update` no pedido, `work_orders:status` no "não iniciou"), escopo por objeto
//     antes de ler o corpo, validação, OS terminal → 422, evento na linha do tempo, status da OS intocado;
//   - P3: a repetição durável pelo evento (organização + usuário + `client_action_id`, na OS e no tipo), também depois
//     de zerar o recibo em memória do lote (o reinício);
//   - a identidade própria do pedido na fila de Aprovações (`pedido-app:<hash>`), a fila antes do evento, e a falha
//     reenviável (503 `approval_unavailable`, Emenda 1.1 §2);
//   - P8 (P2 = B): o aviso a quem atribuiu a OS por último, com chave durável e falha reenviável
//     (503 `notification_unavailable`), e os motivos rotulados em PT-BR;
//   - P6: o fixture de contrato que o codec do app produz (`bsan316_lote_os_contrato.json`) sai `accepted`.
// Os casos que precisam de falha injetada (B5e, B5f, B10e) chamam `syncMobileWorkOrderActions` direto, com o 4º
// parâmetro `deps`, sobre os MESMOS serviços em memória que a rota usa.
//
// VERMELHO-CONTROLE (F1a, em `eeac48a3`): os dois tipos saem `rejected` `unsupported_action_type`; o diário do dev
// (`erp-pausa-2026-10-03/revisoes/b-san3-16/dev-16-cl.md`) cola a saída.

const LOTE_OS = "/api/v1/mobile/sync/work-order-actions";
const PEDIDO = "work_order.approval_request";
const NAO_INICIOU = "work_order.unable_to_start";
const EVENTO_PEDIDO = "work_order_approval_requested";
const EVENTO_NAO_INICIOU = "work_order_unable_to_start";
const AVISO = "work_order.unable_to_start";
const MENSAGEM_FILA_FORA = "Não foi possível registrar o pedido de aprovação agora. O aplicativo tenta de novo.";
const MENSAGEM_AVISO_FORA = "Não foi possível avisar quem despachou a OS agora. O aplicativo tenta de novo.";
const CHAVE_DO_PEDIDO = /^pedido-app:[0-9a-f]{32}$/;
const CONTRATO = JSON.parse(
  fs.readFileSync(new URL("../mobile/flutter_app/test/core/sync/bsan316_lote_os_contrato.json", import.meta.url), "utf8"),
) as { readonly id_modelo_da_os: string; readonly lote: { readonly client_batch_id: string; readonly actions: readonly Record<string, unknown>[] } };

function pedido(workOrderId: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    work_order_id: workOrderId,
    reason: "Troca de peça fora do orçamento",
    impact: "O serviço atrasa dois dias sem a peça.",
    urgency: "high",
    metadata: { source: "mobile_offline", local_id: "wo-local-bsan316", requested_at: "2026-11-14T15:00:00.000Z" },
    ...extra,
  };
}

function naoIniciou(workOrderId: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    work_order_id: workOrderId,
    reason: "Cliente ausente no local",
    note: "Portão fechado; ninguém atendeu.",
    metadata: { source: "mobile_offline", local_id: "wo-local-bsan316", occurred_at: "2026-11-14T15:05:00.000Z" },
    ...extra,
  };
}

// ------------------------------------------------------------------------------------------------
// P2 — o técnico da OS, a permissão por ação, a OS terminal e o status intocado
// ------------------------------------------------------------------------------------------------

test("B1 — o técnico da OS pede aprovação: accepted; a fila do gestor mostra a pendência com o motivo; o evento guarda o approval_id dela", async () => {
  await withApi(async (ctx) => {
    const os = await ctx.osDoTecnico(ctx.seed.tecnicoA);
    const r = await ctx.acao(ctx.hTecnicoA, PEDIDO, pedido(os));
    assert.equal(r.acao, "accepted", JSON.stringify(r));

    const pendentes = await ctx.pendentes(os);
    assert.equal(pendentes.length, 1, JSON.stringify(pendentes));
    assert.equal(pendentes[0].pending_reason, "Troca de peça fora do orçamento");
    assert.equal(pendentes[0].entity_type, "work_order");
    assert.match(pendentes[0].entity_id, CHAVE_DO_PEDIDO, "o pedido do técnico tem identidade própria na fila");
    assert.equal(pendentes[0].work_order_id, os);
    assert.equal(pendentes[0].requested_by, ctx.seed.tecnicoA.id);

    const eventos = await ctx.eventos(os, EVENTO_PEDIDO);
    assert.equal(eventos.length, 1, "a linha do tempo da OS tem o pedido");
    assert.equal(eventos[0].actorUserId, ctx.seed.tecnicoA.id);
    assert.equal(eventos[0].message, "Aprovação solicitada pelo técnico: Troca de peça fora do orçamento");
    assert.equal(eventos[0].metadata.approval_id, pendentes[0].id, "o evento aponta a pendência que a fila criou");
    assert.equal(eventos[0].metadata.client_action_id, r.clientActionId);
    assert.equal(eventos[0].metadata.urgency, "high");
  });
});

test("B2 — o técnico registra que não iniciou: accepted; evento com motivo e observação; o status da OS não muda", async () => {
  await withApi(async (ctx) => {
    const os = await ctx.osDoTecnico(ctx.seed.tecnicoA);
    const antes = await ctx.os(os);
    const r = await ctx.acao(ctx.hTecnicoA, NAO_INICIOU, naoIniciou(os));
    assert.equal(r.acao, "accepted", JSON.stringify(r));

    const eventos = await ctx.eventos(os, EVENTO_NAO_INICIOU);
    assert.equal(eventos.length, 1);
    assert.equal(eventos[0].actorUserId, ctx.seed.tecnicoA.id);
    assert.equal(eventos[0].message, "Não foi possível iniciar: Cliente ausente no local");
    assert.equal(eventos[0].metadata.reason, "Cliente ausente no local");
    assert.equal(eventos[0].metadata.note, "Portão fechado; ninguém atendeu.");
    assert.equal(eventos[0].metadata.occurred_at, "2026-11-14T15:05:00.000Z");
    assert.equal((await ctx.os(os)).status, antes.status, "o \"não iniciou\" não muda o status da OS");
    assert.equal((await ctx.pendentes(os)).length, 0, "o \"não iniciou\" não abre aprovação");
  });
});

test("B2b — o motivo sem acento vem rotulado em PT-BR no evento e no aviso; motivo fora do mapa segue como veio", async () => {
  await withApi(async (ctx) => {
    const os = await ctx.osDoTecnico(ctx.seed.tecnicoA);
    const r = await ctx.acao(ctx.hTecnicoA, NAO_INICIOU, naoIniciou(os, { reason: "Endereco nao localizado" }));
    assert.equal(r.acao, "accepted", JSON.stringify(r));
    const [evento] = await ctx.eventos(os, EVENTO_NAO_INICIOU);
    assert.equal(evento.metadata.reason, "Endereço não localizado");
    assert.equal(evento.message, "Não foi possível iniciar: Endereço não localizado");
    const [aviso] = await ctx.avisos(ctx.seed.gestorA);
    assert.ok(aviso, "quem atribuiu a OS recebeu o aviso");
    assert.match(aviso.message, /: Endereço não localizado\.$/);
    assert.equal(aviso.metadata.reason, "Endereço não localizado");

    const outra = await ctx.osDoTecnico(ctx.seed.tecnicoA);
    const livre = await ctx.acao(ctx.hTecnicoA, NAO_INICIOU, naoIniciou(outra, { reason: "Motivo livre do técnico" }));
    assert.equal(livre.acao, "accepted", JSON.stringify(livre));
    const [eventoLivre] = await ctx.eventos(outra, EVENTO_NAO_INICIOU);
    assert.equal(eventoLivre.metadata.reason, "Motivo livre do técnico");
  });
});

test("B3 — Operação de Campo (tem work_orders:status, não tem :update) pede aprovação: rejected permission_required, nada gravado", async () => {
  await withApi(async (ctx) => {
    const os = await ctx.osDoTecnico(ctx.seed.tecnicoA);
    const r = await ctx.acao(ctx.h(ctx.seed.despachanteA, "field_dispatcher"), PEDIDO, pedido(os));
    assert.equal(r.status, 200, "a porta do lote passa: a recusa é POR AÇÃO");
    assert.equal(r.acao, "rejected", JSON.stringify(r));
    assert.equal(r.reason, "permission_required");
    assert.equal((await ctx.eventos(os, EVENTO_PEDIDO)).length, 0);
    assert.equal((await ctx.pendentes(os)).length, 0);
  });
});

test("B4 — OS concluída: os dois saem rejected 422 work_order_closed, e nada é gravado", async () => {
  await withApi(async (ctx) => {
    const os = await ctx.osDoTecnico(ctx.seed.tecnicoA);
    await ctx.concluir(os);
    const pendentesAntes = await ctx.pendentes(os);
    assert.equal(pendentesAntes.length, 1, "a conclusão abriu a pendência dela");

    for (const [tipo, payload] of [[PEDIDO, pedido(os)], [NAO_INICIOU, naoIniciou(os)]] as const) {
      const r = await ctx.acao(ctx.hTecnicoA, tipo, payload);
      assert.equal(r.acao, "rejected", `${tipo}: ${JSON.stringify(r)}`);
      assert.equal(r.reason, "work_order_closed", tipo);
      assert.equal(r.code, "WORK_ORDER_UNPROCESSABLE", tipo);
    }
    assert.equal((await ctx.eventos(os, EVENTO_PEDIDO)).length, 0);
    assert.equal((await ctx.eventos(os, EVENTO_NAO_INICIOU)).length, 0);
    assert.deepEqual((await ctx.pendentes(os)).map((p: any) => p.id), pendentesAntes.map((p: any) => p.id));
    assert.equal((await ctx.avisos(ctx.seed.gestorA)).length, 0);
  });
});

// ------------------------------------------------------------------------------------------------
// P3 — a repetição durável (o recibo do lote zerado faz o papel do reinício)
// ------------------------------------------------------------------------------------------------

test("B5 — o mesmo client_action_id, reenviado com o recibo zerado: 1 evento e 1 aprovação (e 1 \"não iniciou\")", async () => {
  await withApi(async (ctx) => {
    const os = await ctx.osDoTecnico(ctx.seed.tecnicoA);
    const cidPedido = randomUUID();
    const cidNaoIniciou = randomUUID();
    assert.equal((await ctx.acao(ctx.hTecnicoA, PEDIDO, pedido(os), cidPedido)).acao, "accepted");
    assert.equal((await ctx.acao(ctx.hTecnicoA, NAO_INICIOU, naoIniciou(os), cidNaoIniciou)).acao, "accepted");

    ctx.zerarRecibo();
    const denovo = await ctx.acao(ctx.hTecnicoA, PEDIDO, pedido(os), cidPedido);
    assert.equal(denovo.acao, "accepted", JSON.stringify(denovo));
    const denovo2 = await ctx.acao(ctx.hTecnicoA, NAO_INICIOU, naoIniciou(os), cidNaoIniciou);
    assert.equal(denovo2.acao, "accepted", JSON.stringify(denovo2));

    assert.equal((await ctx.eventos(os, EVENTO_PEDIDO)).length, 1, "o reenvio não duplicou o pedido");
    assert.equal((await ctx.eventos(os, EVENTO_NAO_INICIOU)).length, 1, "o reenvio não duplicou o \"não iniciou\"");
    assert.equal((await ctx.pendentes(os)).length, 1, "o reenvio não duplicou a aprovação");
  });
});

test("B5b — outro ator (gerente) com o mesmo client_action_id na mesma OS grava o próprio evento", async () => {
  await withApi(async (ctx) => {
    const os = await ctx.osDoTecnico(ctx.seed.tecnicoA);
    const cid = randomUUID();
    assert.equal((await ctx.acao(ctx.hTecnicoA, PEDIDO, pedido(os), cid)).acao, "accepted");
    const doGerente = await ctx.acao(ctx.hGestorA, PEDIDO, pedido(os, { reason: "Pedido do gerente" }), cid);
    assert.equal(doGerente.acao, "accepted", JSON.stringify(doGerente));

    const eventos = await ctx.eventos(os, EVENTO_PEDIDO);
    assert.deepEqual(eventos.map((e: any) => e.actorUserId).sort(), [ctx.seed.gestorA.id, ctx.seed.tecnicoA.id].sort());
    assert.equal((await ctx.pendentes(os)).length, 2, "cada ator tem o próprio pedido na fila");
  });
});

test("B5c — grava, zera o recibo, cancela a OS, reenvia o mesmo client_action_id: accepted e 1 evento (a repetição vem antes da OS terminal)", async () => {
  await withApi(async (ctx) => {
    const os = await ctx.osDoTecnico(ctx.seed.tecnicoA);
    const cidPedido = randomUUID();
    const cidNaoIniciou = randomUUID();
    assert.equal((await ctx.acao(ctx.hTecnicoA, PEDIDO, pedido(os), cidPedido)).acao, "accepted");
    assert.equal((await ctx.acao(ctx.hTecnicoA, NAO_INICIOU, naoIniciou(os), cidNaoIniciou)).acao, "accepted");
    ctx.zerarRecibo();
    await ctx.cancelar(os);

    const r1 = await ctx.acao(ctx.hTecnicoA, PEDIDO, pedido(os), cidPedido);
    assert.equal(r1.acao, "accepted", `o reenvio do já gravado não cai na OS terminal: ${JSON.stringify(r1)}`);
    const r2 = await ctx.acao(ctx.hTecnicoA, NAO_INICIOU, naoIniciou(os), cidNaoIniciou);
    assert.equal(r2.acao, "accepted", JSON.stringify(r2));
    assert.equal((await ctx.eventos(os, EVENTO_PEDIDO)).length, 1);
    assert.equal((await ctx.eventos(os, EVENTO_NAO_INICIOU)).length, 1);
  });
});

test("B5d — pede, um gerente aprova, recibo zerado, reenvio do mesmo client_action_id: 0 pendência nova e 1 evento", async () => {
  await withApi(async (ctx) => {
    const os = await ctx.osDoTecnico(ctx.seed.tecnicoA);
    const cid = randomUUID();
    assert.equal((await ctx.acao(ctx.hTecnicoA, PEDIDO, pedido(os), cid)).acao, "accepted");
    const [pendente] = await ctx.pendentes(os);
    const aprovada = await ctx.req(`/api/v1/approvals/${pendente.id}/approve`, { method: "POST", headers: ctx.hGestorA, body: {} });
    assert.equal(aprovada.status, 200, JSON.stringify(aprovada.body));
    assert.equal((await ctx.pendentes(os)).length, 0);

    ctx.zerarRecibo();
    const r = await ctx.acao(ctx.hTecnicoA, PEDIDO, pedido(os), cid);
    assert.equal(r.acao, "accepted", JSON.stringify(r));
    assert.equal((await ctx.pendentes(os)).length, 0, "o reenvio não recriou a aprovação já decidida");
    assert.equal((await ctx.eventos(os, EVENTO_PEDIDO)).length, 1);
  });
});

test("B5e — a fila de Aprovações falha sem gravar no 1º envio: 503 approval_unavailable com a mensagem fixa, 0 evento, 0 pendência; no 2º: accepted, 1 e 1", async () => {
  await withApi(async (ctx) => {
    const os = await ctx.osDoTecnico(ctx.seed.tecnicoA);
    const cid = randomUUID();
    const foraDoAr = async () => ({
      request: async () => {
        throw new Error("fila de aprovações fora do ar (simulado, texto interno)");
      },
    });
    const r1 = await ctx.direto(ctx.seed.tecnicoA, "field_technician", PEDIDO, pedido(os), cid, { approvals: foraDoAr });
    assert.equal(r1.acao, "rejected", JSON.stringify(r1));
    assert.equal(r1.code, "SERVICE_UNAVAILABLE");
    assert.equal(r1.reason, "approval_unavailable");
    assert.equal(r1.message, MENSAGEM_FILA_FORA, "a mensagem é fixa");
    assert.doesNotMatch(JSON.stringify(r1), /simulado|texto interno/, "o texto do erro nunca sai");
    assert.equal((await ctx.eventos(os, EVENTO_PEDIDO)).length, 0);
    assert.equal((await ctx.pendentes(os)).length, 0);

    const r2 = await ctx.direto(ctx.seed.tecnicoA, "field_technician", PEDIDO, pedido(os), cid);
    assert.equal(r2.acao, "accepted", JSON.stringify(r2));
    assert.equal((await ctx.eventos(os, EVENTO_PEDIDO)).length, 1);
    assert.equal((await ctx.pendentes(os)).length, 1);
  });
});

test("B5f — a fila grava e a resposta se perde no 1º envio: 503, 0 evento, 1 pendência; no 2º: accepted, 1 evento, 1 pendência, e o approval_id é o dela", async () => {
  await withApi(async (ctx) => {
    const os = await ctx.osDoTecnico(ctx.seed.tecnicoA);
    const cid = randomUUID();
    const gravaELanca = async () => {
      const real = await ctx.aprovacoes();
      return {
        request: async (input: never) => {
          await real.request(input);
          throw new Error("a resposta da fila se perdeu (simulado)");
        },
      };
    };
    const r1 = await ctx.direto(ctx.seed.tecnicoA, "field_technician", PEDIDO, pedido(os), cid, { approvals: gravaELanca });
    assert.equal(r1.acao, "rejected", JSON.stringify(r1));
    assert.equal(r1.reason, "approval_unavailable");
    assert.equal((await ctx.eventos(os, EVENTO_PEDIDO)).length, 0);
    const pendentes1 = await ctx.pendentes(os);
    assert.equal(pendentes1.length, 1);

    const r2 = await ctx.direto(ctx.seed.tecnicoA, "field_technician", PEDIDO, pedido(os), cid);
    assert.equal(r2.acao, "accepted", JSON.stringify(r2));
    const pendentes2 = await ctx.pendentes(os);
    assert.equal(pendentes2.length, 1, "a chave determinística devolveu a mesma pendência");
    assert.equal(pendentes2[0].id, pendentes1[0].id);
    const eventos = await ctx.eventos(os, EVENTO_PEDIDO);
    assert.equal(eventos.length, 1);
    assert.equal(eventos[0].metadata.approval_id, pendentes1[0].id);
  });
});

test("B5g — recibo zerado, o mesmo client_action_id em outra OS do mesmo técnico: 2 eventos, 1 por OS (caracterização)", async () => {
  await withApi(async (ctx) => {
    const os1 = await ctx.osDoTecnico(ctx.seed.tecnicoA);
    const os2 = await ctx.osDoTecnico(ctx.seed.tecnicoA);
    const cid = randomUUID();
    assert.equal((await ctx.acao(ctx.hTecnicoA, PEDIDO, pedido(os1), cid)).acao, "accepted");
    ctx.zerarRecibo();
    const r = await ctx.acao(ctx.hTecnicoA, PEDIDO, pedido(os2), cid);
    assert.equal(r.acao, "accepted", JSON.stringify(r));
    assert.equal((await ctx.eventos(os1, EVENTO_PEDIDO)).length, 1);
    assert.equal((await ctx.eventos(os2, EVENTO_PEDIDO)).length, 1);
  });
});

// ------------------------------------------------------------------------------------------------
// P2 — validação e lista fechada
// ------------------------------------------------------------------------------------------------

test("B6 — motivo ausente, urgência fora da lista ou texto acima do limite: required_field, invalid_urgency ou field_too_long, nada gravado", async () => {
  await withApi(async (ctx) => {
    const os = await ctx.osDoTecnico(ctx.seed.tecnicoA);
    const casos: readonly [string, Record<string, unknown>, string][] = [
      [PEDIDO, pedido(os, { reason: undefined }), "required_field"],
      [PEDIDO, pedido(os, { reason: "   " }), "required_field"],
      [PEDIDO, pedido(os, { urgency: "urgentissima" }), "invalid_urgency"],
      [PEDIDO, pedido(os, { reason: "a".repeat(501) }), "field_too_long"],
      [PEDIDO, pedido(os, { impact: "b".repeat(1001) }), "field_too_long"],
      [NAO_INICIOU, naoIniciou(os, { reason: undefined }), "required_field"],
      [NAO_INICIOU, naoIniciou(os, { reason: "c".repeat(201) }), "field_too_long"],
      [NAO_INICIOU, naoIniciou(os, { note: "d".repeat(1001) }), "field_too_long"],
    ];
    for (const [tipo, payload, motivo] of casos) {
      const r = await ctx.acao(ctx.hTecnicoA, tipo, payload);
      assert.equal(r.acao, "rejected", `${tipo} ${motivo}: ${JSON.stringify(r)}`);
      assert.equal(r.reason, motivo, `${tipo}: esperado ${motivo}, veio ${r.reason}`);
    }
    assert.equal((await ctx.eventos(os, EVENTO_PEDIDO)).length, 0);
    assert.equal((await ctx.eventos(os, EVENTO_NAO_INICIOU)).length, 0);
    assert.equal((await ctx.pendentes(os)).length, 0);
    assert.equal((await ctx.avisos(ctx.seed.gestorA)).length, 0);
  });
});

test("B7 — os metadados do evento têm só a lista fechada; nada de requested_by_user_id, reported_by_user_id nem tenant_id", async () => {
  await withApi(async (ctx) => {
    const os = await ctx.osDoTecnico(ctx.seed.tecnicoA);
    const intruso = {
      requested_by_user_id: ctx.seed.gestorA.id,
      reported_by_user_id: ctx.seed.gestorA.id,
      tenant_id: ctx.seed.tenantB.id,
      local_path: "/data/user/0/app/arquivo.jpg",
    };
    assert.equal((await ctx.acao(ctx.hTecnicoA, PEDIDO, pedido(os, intruso))).acao, "accepted");
    assert.equal((await ctx.acao(ctx.hTecnicoA, NAO_INICIOU, naoIniciou(os, intruso))).acao, "accepted");

    const [doPedido] = await ctx.eventos(os, EVENTO_PEDIDO);
    assert.deepEqual(
      Object.keys(doPedido.metadata).sort(),
      ["approval_id", "client_action_id", "impact", "requested_at", "source", "urgency"],
    );
    const [doNaoIniciou] = await ctx.eventos(os, EVENTO_NAO_INICIOU);
    assert.deepEqual(Object.keys(doNaoIniciou.metadata).sort(), ["client_action_id", "note", "occurred_at", "reason", "source"]);
    for (const evento of [doPedido, doNaoIniciou]) {
      const texto = JSON.stringify(evento.metadata);
      assert.ok(!texto.includes(ctx.seed.gestorA.id), "o id do usuário do corpo não entra");
      assert.ok(!texto.includes(ctx.seed.tenantB.id), "a organização do corpo não entra");
      assert.ok(!texto.includes("/data/user"), "caminho do aparelho não entra");
      assert.equal(evento.actorUserId, ctx.seed.tecnicoA.id, "o ator vem do token, nunca do corpo");
    }
  });
});

test("B8 — o fixture de contrato que o codec do app produz, enviado pelo técnico da OS, sai accepted em todos os casos, inclusive o do limite", async () => {
  await withApi(async (ctx) => {
    const os = await ctx.osDoTecnico(ctx.seed.tecnicoA);
    const lote = JSON.parse(JSON.stringify(CONTRATO.lote).replaceAll(CONTRATO.id_modelo_da_os, os));
    assert.ok(lote.actions.length >= 4, "o fixture tem os 2 tipos e os 2 casos no limite");
    const r = await ctx.req(LOTE_OS, { method: "POST", headers: ctx.hTecnicoA, body: lote });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.data.summary.accepted, lote.actions.length, JSON.stringify(r.body.data));
    assert.equal(r.body.data.summary.rejected, 0, JSON.stringify(r.body.data.rejected));
  });
});

test("B9 — o técnico não decide a própria aprovação: POST /approvals/:id/approve → 403", async () => {
  await withApi(async (ctx) => {
    const os = await ctx.osDoTecnico(ctx.seed.tecnicoA);
    assert.equal((await ctx.acao(ctx.hTecnicoA, PEDIDO, pedido(os))).acao, "accepted");
    const [pendente] = await ctx.pendentes(os);
    assert.ok(pendente, "o pedido do app abriu a pendência");
    const r = await ctx.req(`/api/v1/approvals/${pendente.id}/approve`, { method: "POST", headers: ctx.hTecnicoA, body: {} });
    assert.equal(r.status, 403, JSON.stringify(r.body));
    assert.equal(r.body.error.reason, "permission_required", "o técnico não tem work_orders:approve");
    assert.equal((await ctx.pendentes(os)).length, 1, "a pendência continua aberta");
  });
});

// ------------------------------------------------------------------------------------------------
// P8 (P2 = B) — o aviso a quem atribuiu a OS
// ------------------------------------------------------------------------------------------------

test("B10 — o gerente despacha a OS para o técnico; o técnico marca não iniciou: 1 aviso para o gerente, com título, motivo rotulado e link; o técnico não recebe", async () => {
  await withApi(async (ctx) => {
    const os = await ctx.criarOs();
    // O despacho exige o técnico cadastrado na organização (`FIELD_OPERATOR_NOT_FOUND` sem ele): o técnico do despacho
    // nasce no cadastro, com o id que o cadastro dá.
    const despachado = ctx.seed.tecnicoDespachado;
    await ctx.despachar(os, despachado);
    const r = await ctx.acao(ctx.h(despachado, "field_technician"), NAO_INICIOU, naoIniciou(os, { reason: "Condicoes de seguranca" }));
    assert.equal(r.acao, "accepted", JSON.stringify(r));

    const avisos = await ctx.avisos(ctx.seed.gestorA);
    assert.equal(avisos.length, 1, JSON.stringify(avisos));
    const codigo = (await ctx.os(os)).code;
    assert.equal(avisos[0].title, "Não foi possível iniciar a OS");
    assert.equal(avisos[0].message, `O técnico informou que não foi possível iniciar a OS ${codigo}: Condições de segurança.`);
    assert.equal(avisos[0].severity, "warning");
    assert.equal(avisos[0].sourceType, "work_order");
    assert.equal(avisos[0].sourceId, os);
    assert.equal(avisos[0].actionUrl, `/work-orders/${os}`);
    assert.ok(!JSON.stringify(avisos[0]).includes("Portão fechado"), "a observação livre não vai no aviso (Q7)");
    assert.equal((await ctx.avisos(despachado)).length, 0, "o técnico não é avisado do próprio registro");
  });
});

test("B10b — reenvio com o recibo zerado: continua 1 aviso", async () => {
  await withApi(async (ctx) => {
    const os = await ctx.osDoTecnico(ctx.seed.tecnicoA);
    const cid = randomUUID();
    assert.equal((await ctx.acao(ctx.hTecnicoA, NAO_INICIOU, naoIniciou(os), cid)).acao, "accepted");
    ctx.zerarRecibo();
    assert.equal((await ctx.acao(ctx.hTecnicoA, NAO_INICIOU, naoIniciou(os), cid)).acao, "accepted");
    assert.equal((await ctx.avisos(ctx.seed.gestorA)).length, 1, "o aviso duplicou");
    assert.equal((await ctx.eventos(os, EVENTO_NAO_INICIOU)).length, 1);
  });
});

test("B10c — OS que o próprio ator atribuiu a si (gerente com :assign e :status): accepted, evento gravado, 0 aviso", async () => {
  await withApi(async (ctx) => {
    const os = await ctx.criarOs();
    await ctx.atribuir(os, ctx.seed.gestorA, ctx.hGestorA);
    const r = await ctx.acao(ctx.hGestorA, NAO_INICIOU, naoIniciou(os));
    assert.equal(r.acao, "accepted", JSON.stringify(r));
    assert.equal((await ctx.eventos(os, EVENTO_NAO_INICIOU)).length, 1);
    assert.equal((await ctx.avisos(ctx.seed.gestorA)).length, 0, "ninguém se avisa do que fez");
  });
});

test("B10d — dois gerentes atribuíram em sequência: só o último recebe", async () => {
  await withApi(async (ctx) => {
    const os = await ctx.criarOs();
    await ctx.atribuir(os, ctx.seed.tecnicoA, ctx.hGestorA);
    await ctx.atribuir(os, ctx.seed.tecnicoA, ctx.hGestorA2);
    assert.equal((await ctx.acao(ctx.hTecnicoA, NAO_INICIOU, naoIniciou(os))).acao, "accepted");
    assert.equal((await ctx.avisos(ctx.seed.gestorA2)).length, 1, "o último que atribuiu recebe");
    assert.equal((await ctx.avisos(ctx.seed.gestorA)).length, 0, "o primeiro não recebe");
  });
});

test("B10e — o serviço de avisos falha no 1º envio: 503 notification_unavailable, 1 evento; no 2º: accepted, 1 evento, 1 aviso", async () => {
  await withApi(async (ctx) => {
    const os = await ctx.osDoTecnico(ctx.seed.tecnicoA);
    const cid = randomUUID();
    const foraDoAr = async () => ({
      createNotification: async () => {
        throw new Error("sino fora do ar (simulado, texto interno)");
      },
    });
    const r1 = await ctx.direto(ctx.seed.tecnicoA, "field_technician", NAO_INICIOU, naoIniciou(os), cid, { notifications: foraDoAr });
    assert.equal(r1.acao, "rejected", JSON.stringify(r1));
    assert.equal(r1.code, "SERVICE_UNAVAILABLE");
    assert.equal(r1.reason, "notification_unavailable");
    assert.equal(r1.message, MENSAGEM_AVISO_FORA);
    assert.doesNotMatch(JSON.stringify(r1), /simulado|texto interno/);
    assert.equal((await ctx.eventos(os, EVENTO_NAO_INICIOU)).length, 1, "o registro na OS já está gravado");
    assert.equal((await ctx.avisos(ctx.seed.gestorA)).length, 0);

    const r2 = await ctx.direto(ctx.seed.tecnicoA, "field_technician", NAO_INICIOU, naoIniciou(os), cid);
    assert.equal(r2.acao, "accepted", JSON.stringify(r2));
    assert.equal((await ctx.eventos(os, EVENTO_NAO_INICIOU)).length, 1, "o reenvio não duplicou o registro");
    assert.equal((await ctx.avisos(ctx.seed.gestorA)).length, 1, "o aviso saiu no reenvio");
  });
});

test("B10f — reatribuição entre o 1º envio e o reenvio: 2 avisos, 1 por gerente, e 1 evento (caracterização)", async () => {
  await withApi(async (ctx) => {
    const os = await ctx.criarOs();
    await ctx.atribuir(os, ctx.seed.tecnicoA, ctx.hGestorA);
    const cid = randomUUID();
    assert.equal((await ctx.acao(ctx.hTecnicoA, NAO_INICIOU, naoIniciou(os), cid)).acao, "accepted");
    await ctx.atribuir(os, ctx.seed.tecnicoA, ctx.hGestorA2);
    ctx.zerarRecibo();
    assert.equal((await ctx.acao(ctx.hTecnicoA, NAO_INICIOU, naoIniciou(os), cid)).acao, "accepted");
    assert.equal((await ctx.avisos(ctx.seed.gestorA)).length, 1);
    assert.equal((await ctx.avisos(ctx.seed.gestorA2)).length, 1);
    assert.equal((await ctx.eventos(os, EVENTO_NAO_INICIOU)).length, 1);
  });
});

// ------------------------------------------------------------------------------------------------
// Isolamento e escopo
// ------------------------------------------------------------------------------------------------

test("B11 — OS de outra organização: os dois saem rejected not_found, igual a OS inexistente; nada gravado e nenhum aviso em nenhuma das duas", async () => {
  await withApi(async (ctx) => {
    const osA = await ctx.osDoTecnico(ctx.seed.tecnicoA);
    const hX = ctx.h(ctx.seed.tecnicoX, "field_technician", ctx.seed.tenantB);
    const inexistente = randomUUID();
    for (const [tipo, montar] of [[PEDIDO, pedido], [NAO_INICIOU, naoIniciou]] as const) {
      const alheia = await ctx.acao(hX, tipo, montar(osA));
      const sumida = await ctx.acao(hX, tipo, montar(inexistente));
      assert.equal(alheia.acao, "rejected", `${tipo}: ${JSON.stringify(alheia)}`);
      assert.equal(alheia.reason, "not_found", tipo);
      assert.deepEqual(
        { acao: alheia.acao, code: alheia.code, reason: alheia.reason, message: alheia.message },
        { acao: sumida.acao, code: sumida.code, reason: sumida.reason, message: sumida.message },
        "a OS de outra organização responde igual à inexistente",
      );
    }
    assert.equal((await ctx.eventos(osA, EVENTO_PEDIDO)).length, 0);
    assert.equal((await ctx.eventos(osA, EVENTO_NAO_INICIOU)).length, 0);
    assert.equal((await ctx.pendentes(osA)).length, 0);
    assert.equal((await ctx.avisos(ctx.seed.gestorA)).length, 0);
    assert.equal((await ctx.avisos(ctx.seed.gestorB, ctx.seed.tenantB)).length, 0);
  });
});

test("B12 — o técnico A é desatribuído e a OS vai para o B: A envia os 2 tipos → conflict assignment_changed_pending_review, nada gravado; o reenvio do já gravado também é conflito", async () => {
  await withApi(async (ctx) => {
    const os = await ctx.osDoTecnico(ctx.seed.tecnicoA);
    const cidGravado = randomUUID();
    assert.equal((await ctx.acao(ctx.hTecnicoA, PEDIDO, pedido(os), cidGravado)).acao, "accepted");
    await ctx.atribuir(os, ctx.seed.tecnicoB, ctx.hGestorA);
    const avisosAntes = (await ctx.avisos(ctx.seed.gestorA)).length;

    for (const [tipo, payload] of [[PEDIDO, pedido(os, { reason: "Outro pedido" })], [NAO_INICIOU, naoIniciou(os)]] as const) {
      const r = await ctx.acao(ctx.hTecnicoA, tipo, payload);
      assert.equal(r.acao, "conflict", `${tipo}: ${JSON.stringify(r)}`);
      assert.equal(r.conflictType, "assignment_changed_pending_review", tipo);
    }
    ctx.zerarRecibo();
    const reenvio = await ctx.acao(ctx.hTecnicoA, PEDIDO, pedido(os), cidGravado);
    assert.equal(reenvio.acao, "conflict", `o ex-técnico não recebe server_state pelo reenvio: ${JSON.stringify(reenvio)}`);
    assert.equal(reenvio.conflictType, "assignment_changed_pending_review");

    assert.equal((await ctx.eventos(os, EVENTO_PEDIDO)).length, 1, "só o pedido de antes da troca");
    assert.equal((await ctx.eventos(os, EVENTO_NAO_INICIOU)).length, 0);
    assert.equal((await ctx.pendentes(os)).length, 1, "nenhuma aprovação nova");
    assert.equal((await ctx.avisos(ctx.seed.gestorA)).length, avisosAntes, "nenhum aviso");
  });
});

// ------------------------------------------------------------------------------------------------
// A identidade do pedido na fila de Aprovações (Emenda 1.1 §2.3)
// ------------------------------------------------------------------------------------------------

test("B13 — 2 pedidos do técnico na mesma OS, com 2 client_action_id: 2 eventos e 2 pendências, cada uma com o próprio motivo", async () => {
  await withApi(async (ctx) => {
    const os = await ctx.osDoTecnico(ctx.seed.tecnicoA);
    assert.equal((await ctx.acao(ctx.hTecnicoA, PEDIDO, pedido(os, { reason: "Primeiro pedido" }))).acao, "accepted");
    assert.equal((await ctx.acao(ctx.hTecnicoA, PEDIDO, pedido(os, { reason: "Segundo pedido" }))).acao, "accepted");
    assert.equal((await ctx.eventos(os, EVENTO_PEDIDO)).length, 2);
    const pendentes = await ctx.pendentes(os);
    assert.deepEqual(pendentes.map((p: any) => p.pending_reason).sort(), ["Primeiro pedido", "Segundo pedido"]);
    assert.notEqual(pendentes[0].entity_id, pendentes[1].entity_id);
  });
});

test("B13b — com o pedido do técnico pendente, a OS é concluída: 2 pendências; aprovar a do técnico deixa a da conclusão pendente", async () => {
  await withApi(async (ctx) => {
    const os = await ctx.osDoTecnico(ctx.seed.tecnicoA);
    assert.equal((await ctx.acao(ctx.hTecnicoA, PEDIDO, pedido(os))).acao, "accepted");
    await ctx.concluir(os);

    const pendentes = await ctx.pendentes(os);
    assert.equal(pendentes.length, 2, JSON.stringify(pendentes));
    const doTecnico = pendentes.find((p: any) => p.pending_reason === "Troca de peça fora do orçamento");
    const daConclusao = pendentes.find((p: any) => p.entity_id === os);
    assert.ok(doTecnico, "o pedido do técnico continua na fila");
    assert.ok(daConclusao, "a conclusão tem a própria pendência");
    assert.notEqual(doTecnico.id, daConclusao.id);

    const aprovada = await ctx.req(`/api/v1/approvals/${doTecnico.id}/approve`, { method: "POST", headers: ctx.hGestorA, body: {} });
    assert.equal(aprovada.status, 200, JSON.stringify(aprovada.body));
    const restantes = await ctx.pendentes(os);
    assert.deepEqual(restantes.map((p: any) => p.id), [daConclusao.id], "aprovar o pedido não valida a conclusão");
  });
});

// ------------------------------------------------------------------------------------------------
// ARNÊS
// ------------------------------------------------------------------------------------------------
type User = { readonly id: string; readonly tenantId: string };
type Resposta = { readonly status: number; readonly body: any };
type Resultado = {
  readonly status: number;
  readonly clientActionId: string;
  readonly acao?: string;
  readonly code?: string;
  readonly reason?: string;
  readonly message?: string;
  readonly conflictType?: string;
};
type Seed = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly gestorA: User;
  readonly gestorA2: User;
  readonly despachanteA: User;
  readonly tecnicoA: User;
  readonly tecnicoB: User;
  readonly tecnicoX: User;
  readonly tecnicoDespachado: User;
  readonly gestorB: User;
};
type Deps = { readonly approvals?: () => Promise<unknown>; readonly notifications?: () => Promise<unknown> };
type Ctx = {
  readonly seed: Seed;
  readonly hTecnicoA: Record<string, string>;
  readonly hGestorA: Record<string, string>;
  readonly hGestorA2: Record<string, string>;
  h(user: User, role: string, tenant?: Tenant): Record<string, string>;
  req(caminho: string, opcoes?: { method?: string; headers?: Record<string, string>; body?: unknown }): Promise<Resposta>;
  acao(headers: Record<string, string>, tipo: string, payload: Record<string, unknown>, clientActionId?: string): Promise<Resultado>;
  direto(user: User, role: string, tipo: string, payload: Record<string, unknown>, clientActionId: string, deps?: Deps): Promise<Resultado>;
  criarOs(): Promise<string>;
  atribuir(workOrderId: string, tecnico: User, headers: Record<string, string>): Promise<void>;
  despachar(workOrderId: string, tecnico: User): Promise<void>;
  osDoTecnico(tecnico: User): Promise<string>;
  concluir(workOrderId: string): Promise<void>;
  cancelar(workOrderId: string): Promise<void>;
  os(workOrderId: string): Promise<any>;
  eventos(workOrderId: string, tipo: string): Promise<any[]>;
  pendentes(workOrderId: string): Promise<any[]>;
  avisos(user: User, tenant?: Tenant): Promise<any[]>;
  aprovacoes(): Promise<{ request(input: never): Promise<unknown> }>;
  zerarRecibo(): void;
};

function resultadoDo(data: any, status: number, clientActionId: string): Resultado {
  const todas = [...(data?.accepted ?? []), ...(data?.rejected ?? []), ...(data?.conflicts ?? []), ...(data?.already_applied ?? [])];
  const acao = todas.find((a: any) => a.client_action_id === clientActionId);
  return {
    status,
    clientActionId,
    acao: acao?.status,
    code: acao?.error?.code,
    reason: acao?.error?.reason,
    message: acao?.error?.message,
    conflictType: acao?.conflict?.conflict_type,
  };
}

async function withApi(callback: (ctx: Ctx) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const [
    { createApp },
    workOrders,
    fieldDispatch,
    approvalModule,
    notificationModule,
    syncModule,
    catalog,
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/work-orders/work-order.service.js"),
    import("../src/modules/field-dispatch/field-dispatch.service.js"),
    import("../src/modules/work-orders/approval.service.js"),
    import("../src/modules/notifications/notification.service.js"),
    import("../src/modules/mobile/mobile-work-order-sync.js"),
    import("../src/modules/core-saas/permissions/catalog.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);
  const resetAll = () => {
    workOrders.resetWorkOrderRuntimeForTests();
    fieldDispatch.resetFieldDispatchRuntimeForTests();
    approvalModule.resetApprovalRuntimeForTests();
    notificationModule.resetNotificationRuntimeForTests();
    syncModule.resetMobileWorkOrderSyncRuntimeForTests();
  };
  resetAll();

  const modulos = ["work_orders", "field_operations"];
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenantA = core.createTenant({ name: "BSAN316 A", modules: modulos });
  const tenantB = core.createTenant({ name: "BSAN316 B", modules: modulos });
  // Usuários são UUIDs crus (o formato de produção), como no arnês do 07a e do 07c: o contexto do ator vem do header.
  const usuario = (tenant: Tenant): User => ({ id: randomUUID(), tenantId: tenant.id });
  const seed: Seed = {
    tenantA,
    tenantB,
    gestorA: usuario(tenantA),
    gestorA2: usuario(tenantA),
    despachanteA: usuario(tenantA),
    tecnicoA: usuario(tenantA),
    tecnicoB: usuario(tenantA),
    tecnicoX: usuario(tenantB),
    tecnicoDespachado: core.createUser({
      tenantId: tenantA.id,
      name: "Tecnico despachado",
      email: `despachado-${randomUUID().slice(0, 8)}@bsan316.example.com`,
      roles: ["field_technician"],
    }),
    gestorB: usuario(tenantB),
  };

  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  const h = (user: User, role: string, tenant: Tenant = tenantA) => ({ "x-tenant-id": tenant.id, "x-user-id": user.id, "x-role": role });
  const hGestorA = h(seed.gestorA, "manager");
  const req: Ctx["req"] = async (caminho, opcoes = {}) => {
    const response = await fetch(`${baseUrl}${caminho}`, {
      method: opcoes.method ?? "GET",
      headers: { "content-type": "application/json", ...opcoes.headers },
      body: opcoes.body === undefined ? undefined : JSON.stringify(opcoes.body),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };
  const criarOs = async () => {
    const criada = await req("/api/v1/work-orders", { method: "POST", headers: hGestorA, body: { title: "OS do item 5" } });
    assert.equal(criada.status, 201, JSON.stringify(criada.body));
    return criada.body.data.id as string;
  };
  const atribuir: Ctx["atribuir"] = async (workOrderId, tecnico, headers) => {
    const r = await req(`/api/v1/work-orders/${workOrderId}/assign`, { method: "POST", headers, body: { userId: tecnico.id } });
    assert.equal(r.status, 200, `atribuição falhou: ${JSON.stringify(r.body)}`);
  };

  const ctx: Ctx = {
    seed,
    hTecnicoA: h(seed.tecnicoA, "field_technician"),
    hGestorA,
    hGestorA2: h(seed.gestorA2, "manager"),
    h,
    req,
    async acao(headers, tipo, payload, clientActionId = randomUUID()) {
      const r = await req(LOTE_OS, {
        method: "POST",
        headers,
        body: {
          client_batch_id: randomUUID(),
          actions: [{ client_action_id: clientActionId, type: tipo, local_created_at: new Date().toISOString(), payload }],
        },
      });
      assert.equal(r.status, 200, `o lote tem de responder 200: ${JSON.stringify(r.body)}`);
      return resultadoDo(r.body?.data, r.status, clientActionId);
    },
    async direto(user, role, tipo, payload, clientActionId, deps) {
      const tenant = user.tenantId === tenantB.id ? tenantB : tenantA;
      const actor = {
        tenantId: tenant.id,
        userId: user.id,
        roles: [role],
        permissions: catalog.resolvePermissionsForRoles([role as never]),
      };
      const body = {
        client_batch_id: randomUUID(),
        actions: [{ client_action_id: clientActionId, type: tipo, local_created_at: new Date().toISOString(), payload }],
      };
      // O 4º parâmetro (`deps`) é o desenho da Emenda 1 §4.1; antes da F2a ele é ignorado (e os tipos saem recusados).
      const sync = syncModule.syncMobileWorkOrderActions as unknown as (...args: unknown[]) => Promise<unknown>;
      const resposta = await sync(actor, body, undefined, deps);
      return resultadoDo(resposta, 200, clientActionId);
    },
    criarOs,
    atribuir,
    async despachar(workOrderId, tecnico) {
      const r = await req("/api/v1/operations/dispatches", {
        method: "POST",
        headers: hGestorA,
        body: { workOrderId, operatorUserId: tecnico.id },
      });
      assert.equal(r.status, 201, `despacho falhou: ${JSON.stringify(r.body)}`);
    },
    async osDoTecnico(tecnico) {
      const id = await criarOs();
      await atribuir(id, tecnico, hGestorA);
      return id;
    },
    async concluir(workOrderId) {
      for (const status of ["accepted", "on_route", "on_site", "in_progress", "completed"]) {
        const r = await req(`/api/v1/work-orders/${workOrderId}/status`, { method: "PATCH", headers: hGestorA, body: { status } });
        assert.equal(r.status, 200, `status ${status}: ${JSON.stringify(r.body)}`);
      }
    },
    async cancelar(workOrderId) {
      const r = await req(`/api/v1/work-orders/${workOrderId}/cancel`, {
        method: "POST",
        headers: hGestorA,
        body: { reason: "Cliente desistiu", financial_decision: "keep" },
      });
      assert.equal(r.status, 200, `cancelamento falhou: ${JSON.stringify(r.body)}`);
    },
    async os(workOrderId) {
      const r = await req(`/api/v1/work-orders/${workOrderId}`, { headers: hGestorA });
      assert.equal(r.status, 200, JSON.stringify(r.body));
      return r.body.data;
    },
    async eventos(workOrderId, tipo) {
      const r = await req(`/api/v1/work-orders/${workOrderId}/timeline`, { headers: hGestorA });
      assert.equal(r.status, 200, JSON.stringify(r.body));
      return ((r.body.data ?? r.body.items) as any[]).filter((evento) => evento.eventType === tipo);
    },
    async pendentes(workOrderId) {
      const r = await req(`/api/v1/approvals/pending?work_order_id=${workOrderId}`, { headers: hGestorA });
      assert.equal(r.status, 200, JSON.stringify(r.body));
      return r.body.data as any[];
    },
    async avisos(user, tenant = tenantA) {
      const service = notificationModule.createMemoryNotificationService();
      const lista = await service.listMyNotifications({ tenantId: tenant.id, userId: user.id, roles: [], permissions: [] } as never);
      return lista.filter((aviso: any) => aviso.type === AVISO);
    },
    async aprovacoes() {
      return (await approvalModule.createDefaultApprovalService()) as never;
    },
    zerarRecibo() {
      syncModule.resetMobileWorkOrderSyncRuntimeForTests();
    },
  };

  try {
    await callback(ctx);
  } finally {
    await closeServer(server);
    resetAll();
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
