import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";

import { createEphemeralRole } from "./helpers/auth-identity-fixture.js";
import {
  buildApplicationName,
  captureSettled,
  dropHarnessObjects,
  runHarnessDdl,
  waitForOwnBlockedOrSettled,
  withApplicationName,
  type SettledOutcome,
} from "./helpers/pg-barrier.js";

// B-APROVACOES-DURAVEIS (item 67 do portão; plano §4.1 T3 e emenda 1 §3.4) — O PEDIDO DE VALIDAÇÃO NASCE NA MESMA
// TRANSAÇÃO DA CONCLUSÃO, NO POSTGRES REAL:
//   (a) concluir pelas 2 portas (a rota de status e a fila do app chamam o mesmo `WorkOrderService.changeStatus`) → 1 linha
//       pendente e 1 linha `approval.requested` em audit_logs por OS, achada pelo filtro da aba "Logs da OS"
//       (organização, 'work_order', id da OS);
//   (b) status e pedido na mesma transação: o `xmin` da linha da OS é igual ao da linha da aprovação;
//   (c) falha forçada na inserção do pedido (gatilho criado e removido pelo próprio teste) → a OS continua em
//       `in_progress`, `completed_at` nulo, 0 aprovação, 0 auditoria;
//   (d) corrida de 2 conclusões da mesma OS → 1 pendente;
//   (g) o lado do 67 da fronteira com o B-SAN3-16, pela porta pública que o 16 usa
//       (`createDefaultApprovalService().request` com `entityId = 'pedido-app:<32 hex>'` e `workOrderId`): 1 linha com o
//       id devolvido; a repetição devolve o mesmo id, 1 linha, 1 auditoria; a auditoria é achada pelo filtro da aba e
//       tem o id da aprovação nos metadados; falha forçada → rejeita, 0 linha, 0 auditoria; concluir a OS em seguida →
//       2 pendentes e a linha do pedido não muda.
//   (e) [F4c, com o B-SAN3-16 na main] o T2b na tabela: com o pedido do técnico pendente (pelo lote
//       `work_order.approval_request`), concluir a OS por cada uma das 2 portas → 2 linhas `pending_approval` com o mesmo
//       `work_order_id`, e a transação da conclusão não toca a linha do pedido do técnico (`xmin` e `updated_at` iguais);
//   (f) [F4c] o pedido do técnico pelo lote com `CORE_SAAS_PERSISTENCE=prisma` e a fila de Aprovações PADRÃO (a do banco):
//       1 linha e 1 `approval.requested`; reenvio do mesmo `client_action_id` com serviço novo e recibo zerado → continua
//       1 linha, 1 evento e 1 `approval.requested`; o `approval_id` do evento é o `id` da linha.
//   (e)/(f) [Emenda 3, E-67-TRAVA] cada `pedirPeloLote` responde em menos de 1000 ms (a fila fora da unidade esperava a
//       própria trava da OS por 5 s);
//   (h) [Emenda 3] a atomicidade: com um gatilho que derruba o INSERT do evento do pedido, o envio sai recusado em menos
//       de 1000 ms e deixa 0 aprovação, 0 `approval.requested` e 0 evento; sem o gatilho, o reenvio grava 1/1/1; o gestor
//       aprova, o reenvio com recibo zerado continua 1 (aprovada)/1/1: a pendência decidida não renasce;
//   (i) [Emenda 3] o [D5] do B-SAN3-16 com a fila do BANCO (sem injetar): pelo papel NOSUPERUSER NOBYPASSRLS, 10 envios
//       do mesmo `client_action_id` + 1 de outro atrás da trava da OS → 1 evento de cada, 2 aprovações, 2
//       `approval.requested`, todo envio aceito, e a barreira viu o `FOR UPDATE`; 5 rodadas.
//   (j) [conserto da J-586, L2-01] o caminho de ERRO da fila da unidade, pelo lote: um gatilho derruba UMA vez o INSERT
//       em `operational_approvals` (os seguintes passam) → o envio sai 503 `approval_unavailable` em menos de 1000 ms,
//       sem o texto do banco na resposta, com 0 aprovação, 0 `approval.requested` e 0 evento, e a inserção foi tentada
//       1 vez só; o reenvio da MESMA ação grava 1/1/1. Uma fila que, no erro, tentasse de novo por outra conexão
//       passaria no 2º INSERT e deixaria a aprovação órfã: este caso fica vermelho.
//
// Organização descartável por caso; teardown escopado pelo id dela. Gatilho TEMPORÁRIO escopado pela organização (nome
// único, DROP no finally, catálogo limpo provado), sempre pelo `runHarnessDdl`. Sem DATABASE_URL, o arquivo se declara
// pulado.

const connection = process.env.DATABASE_URL;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MOTIVO_DA_CONCLUSAO = "Ordem de servico concluida e pronta para validacao operacional.";

if (!connection) {
  test("o B-APROVACOES-DURAVEIS (atomicidade) no Postgres exige DATABASE_URL", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrações para executar este teste.",
  });
} else {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "prisma";

  after(async () => {
    const { prisma } = await import("../src/database/prisma.js");
    await prisma.$disconnect();
  });

  test("T3(a) · rota de status e fila do app: 1 pendente e 1 approval.requested por OS, achada pelo filtro da aba", async () => {
    await comCenario(async (c) => {
      const pelaRota = await c.criarOsEmAtendimento();
      const pelaFila = await c.criarOsEmAtendimento();
      await c.concluirPelaRota(pelaRota);
      const lote = await c.concluirPelaFila(pelaFila);
      assert.equal(lote.accepted.length, 1, JSON.stringify(lote));

      for (const os of [pelaRota, pelaFila]) {
        assert.equal((await c.os(os)).status, "completed");
        const linhas = await c.aprovacoesDaOs(os);
        assert.equal(linhas.length, 1, `esperava 1 linha de aprovação para a OS, veio ${linhas.length}`);
        assert.deepEqual(
          { status: linhas[0].status, entity_type: linhas[0].entity_type, entity_id: linhas[0].entity_id, requested_by: linhas[0].requested_by_user_id, motivo: linhas[0].pending_reason },
          { status: "pending_approval", entity_type: "work_order", entity_id: os, requested_by: c.gestorId, motivo: MOTIVO_DA_CONCLUSAO },
        );
        const auditoria = await c.auditoriaDaAba(os, "approval.requested");
        assert.equal(auditoria.length, 1, "a linha approval.requested da conclusão não está no filtro da aba (organização, 'work_order', id da OS)");
        assert.equal(auditoria[0].metadata?.approvalId, linhas[0].id, "o id da aprovação nos metadados");
      }
    });
  });

  test("T3(b) · status e pedido na MESMA transação: xmin da OS = xmin da aprovação", async () => {
    await comCenario(async (c) => {
      const os = await c.criarOsEmAtendimento();
      await c.concluirPelaRota(os);
      const [{ xmin: daOs }] = await c.sql("SELECT xmin::text AS xmin FROM work_orders WHERE tenant_id = $1::uuid AND id = $2::uuid", [c.tenantId, os]);
      const [aprovacao] = await c.sql("SELECT xmin::text AS xmin FROM operational_approvals WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid", [c.tenantId, os]);
      assert.ok(aprovacao, "nenhuma linha de aprovação para a OS");
      assert.equal(aprovacao.xmin, daOs, "a aprovação nasceu numa transação diferente da conclusão");
    });
  });

  test("T3(c) · falha forçada na inserção do pedido → a OS não conclui: in_progress, completed_at nulo, 0 aprovação, 0 auditoria", async () => {
    await comCenario(async (c) => {
      const os = await c.criarOsEmAtendimento();
      await c.comGatilhoNaAprovacao("B_APROV_INJ_PEDIDO", async () => {
        await assert.rejects(c.concluirPelaRota(os), injetado("B_APROV_INJ_PEDIDO"));
        const lote = await c.concluirPelaFila(os);
        assert.equal(lote.accepted.length, 0, "a fila aceitou a conclusão sem o pedido");
      });
      const linha = await c.os(os);
      assert.deepEqual({ status: linha.status, completed_at: linha.completed_at }, { status: "in_progress", completed_at: null });
      assert.equal((await c.aprovacoesDaOs(os)).length, 0);
      assert.equal((await c.auditoriaDaAba(os, "approval.requested")).length, 0);
      assert.equal(await c.eventosDaOs(os, "work_order_completed"), 0, "sobrou o evento de conclusão");
    });
  });

  test("T3(d) · corrida de 2 conclusões da mesma OS → 1 pendente (5 repetições)", async () => {
    await comCenario(async (c) => {
      for (let rodada = 0; rodada < 5; rodada += 1) {
        const os = await c.criarOsEmAtendimento();
        const resultados = await Promise.allSettled([c.concluirPelaRota(os), c.concluirPelaRota(os)]);
        assert.ok(resultados.some((r) => r.status === "fulfilled"), `rodada ${rodada}: nenhuma conclusão passou`);
        assert.equal((await c.os(os)).status, "completed");
        const pendentes = (await c.aprovacoesDaOs(os)).filter((l) => l.status === "pending_approval");
        assert.equal(pendentes.length, 1, `rodada ${rodada}: ${pendentes.length} pendentes`);
        assert.equal((await c.auditoriaDaAba(os, "approval.requested")).length, 1, `rodada ${rodada}: auditoria do pedido duplicada`);
      }
    });
  });

  test("T3(g) · o pedido do técnico pela porta pública do 67 (sem o B-SAN3-16): linha, repetição, auditoria pela OS, falha forçada e convivência com a conclusão", async () => {
    await comCenario(async (c) => {
      const os = await c.criarOsEmAtendimento();
      const chave = `pedido-app:${randomUUID().replaceAll("-", "")}`;
      const pedir = () =>
        c.aprovacoes().then((s) =>
          s.request({ tenantId: c.tenantId, entityType: "work_order", entityId: chave, workOrderId: os, requestedByUserId: c.tecnicoId, pendingReason: "Pedido do técnico em campo." }),
        );

      // (1) 1 linha, e o id devolvido é o da linha.
      const primeiro = await pedir();
      const linhas = await c.sql("SELECT id::text, entity_id, xmin::text AS xmin, updated_at FROM operational_approvals WHERE tenant_id = $1::uuid AND entity_id = $2", [c.tenantId, chave]);
      assert.equal(linhas.length, 1, `(1) esperava 1 linha do pedido do técnico, veio ${linhas.length}`);
      assert.match(primeiro.id, UUID);
      assert.equal(primeiro.id, linhas[0].id, "(1) o id devolvido não é o da linha");

      // (2) a repetição devolve o mesmo id, 1 linha, 1 auditoria.
      const repetido = await pedir();
      assert.equal(repetido.id, primeiro.id, "(2) a repetição devolveu outro id");
      const [{ n }] = await c.sql("SELECT count(*)::int AS n FROM operational_approvals WHERE tenant_id = $1::uuid AND entity_id = $2", [c.tenantId, chave]);
      assert.equal(n, 1, "(2) a repetição criou linha nova");

      // (3) a auditoria é achada pelo filtro da aba e tem o id da aprovação; 0 linha com entity_id = a chave.
      const daAba = await c.auditoriaDaAba(os, "approval.requested");
      assert.equal(daAba.length, 1, "(3) a auditoria do pedido não está no filtro da aba, ou foi gravada 2 vezes");
      assert.equal(daAba[0].metadata?.approvalId, primeiro.id, "(3) o id da aprovação nos metadados");
      const [{ pelaChave }] = await c.sql("SELECT count(*)::int AS \"pelaChave\" FROM audit_logs WHERE tenant_id = $1::uuid AND entity_id = $2", [c.tenantId, chave]);
      assert.equal(pelaChave, 0, "(3) a auditoria usou a chave do pedido como entity_id");

      // (4) falha forçada na inserção → a chamada rejeita, 0 linha, 0 auditoria (outra chave, para não casar a pendente).
      const outraChave = `pedido-app:${randomUUID().replaceAll("-", "")}`;
      await c.comGatilhoNaAprovacao("B_APROV_INJ_TECNICO", async () => {
        await assert.rejects(
          c.aprovacoes().then((s) =>
            s.request({ tenantId: c.tenantId, entityType: "work_order", entityId: outraChave, workOrderId: os, requestedByUserId: c.tecnicoId, pendingReason: "Outro pedido." }),
          ),
          injetado("B_APROV_INJ_TECNICO"),
        );
      });
      const [{ falhou }] = await c.sql("SELECT count(*)::int AS falhou FROM operational_approvals WHERE tenant_id = $1::uuid AND entity_id = $2", [c.tenantId, outraChave]);
      assert.equal(falhou, 0, "(4) sobrou linha do pedido que falhou");
      assert.equal((await c.auditoriaDaAba(os, "approval.requested")).length, 1, "(4) sobrou auditoria do pedido que falhou");

      // (5) concluir a OS em seguida → 2 pendentes, e a linha do pedido do técnico não muda.
      await c.concluirPelaRota(os);
      const pendentes = (await c.aprovacoesDaOs(os)).filter((l) => l.status === "pending_approval");
      assert.deepEqual(pendentes.map((l) => l.entity_id).sort(), [chave, os].sort(), "(5) esperava o pedido do técnico e o da conclusão");
      const [depois] = await c.sql("SELECT xmin::text AS xmin, updated_at FROM operational_approvals WHERE tenant_id = $1::uuid AND entity_id = $2", [c.tenantId, chave]);
      assert.deepEqual({ xmin: depois.xmin, updated_at: depois.updated_at?.toISOString?.() }, { xmin: linhas[0].xmin, updated_at: linhas[0].updated_at?.toISOString?.() }, "(5) a conclusão tocou a linha do pedido do técnico");
    });
  });
  test("T3(e) · o T2b na tabela: com o pedido do técnico pendente, concluir por cada porta → 2 pendentes, e a conclusão não toca a linha do técnico", async (t) => {
    await comCenario(async (c) => {
      for (const porta of ["rota", "fila"] as const) {
        const os = await c.criarOsDoTecnico();
        const inicio = performance.now();
        const lote = await c.pedirPeloLote(os, randomUUID());
        const ms = performance.now() - inicio;
        t.diagnostic(`T3(e) ${porta}: pedirPeloLote ${ms.toFixed(1)} ms`);
        assert.equal(lote.accepted.length, 1, `${porta}: o lote recusou o pedido do técnico: ${JSON.stringify(lote)}`);
        assert.ok(ms < 1000, `${porta}: o pedido do técnico pelo lote levou ${ms.toFixed(1)} ms (limite 1000 ms)`);
        const [antes] = await c.sql(
          "SELECT id::text, entity_id, xmin::text AS xmin, updated_at FROM operational_approvals WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid AND entity_id LIKE 'pedido-app:%'",
          [c.tenantId, os],
        );
        assert.ok(antes, `${porta}: o pedido do técnico não está na tabela`);

        if (porta === "rota") await c.concluirPelaRota(os);
        else assert.equal((await c.concluirPelaFila(os)).accepted.length, 1, `${porta}: a fila não concluiu`);

        assert.equal((await c.os(os)).status, "completed", `${porta}: a OS não concluiu`);
        const pendentes = (await c.aprovacoesDaOs(os)).filter((l) => l.status === "pending_approval");
        assert.equal(pendentes.length, 2, `${porta}: esperava 2 pendentes com o mesmo work_order_id, veio ${pendentes.length}`);
        assert.deepEqual(pendentes.map((l) => l.entity_id).sort(), [antes.entity_id, os].sort(), `${porta}: esperava o pedido do técnico e o da conclusão`);
        const daConclusao = pendentes.find((l) => l.entity_id === os);
        assert.equal(daConclusao?.pending_reason, MOTIVO_DA_CONCLUSAO, `${porta}: o motivo da conclusão`);
        const [depois] = await c.sql(
          "SELECT xmin::text AS xmin, updated_at FROM operational_approvals WHERE tenant_id = $1::uuid AND id = $2::uuid",
          [c.tenantId, antes.id],
        );
        assert.deepEqual(
          { xmin: depois.xmin, updated_at: depois.updated_at?.toISOString?.() },
          { xmin: antes.xmin, updated_at: antes.updated_at?.toISOString?.() },
          `${porta}: a transação da conclusão tocou a linha do pedido do técnico`,
        );
      }
    });
  });

  test("T3(f) · o pedido do técnico pelo lote, na fila de Aprovações do banco: 1 linha e 1 auditoria; o reenvio com serviço novo e recibo zerado não duplica", async (t) => {
    await comCenario(async (c) => {
      const os = await c.criarOsDoTecnico();
      const cid = randomUUID();
      const inicio = performance.now();
      const primeiro = await c.pedirPeloLote(os, cid);
      const ms = performance.now() - inicio;
      t.diagnostic(`T3(f) 1º envio: pedirPeloLote ${ms.toFixed(1)} ms`);
      assert.equal(primeiro.accepted.length, 1, `o lote recusou o pedido do técnico: ${JSON.stringify(primeiro)}`);
      assert.ok(ms < 1000, `1º envio: o pedido do técnico pelo lote levou ${ms.toFixed(1)} ms (limite 1000 ms)`);

      const conferir = async (quando: string) => {
        const linhas = await c.sql(
          "SELECT id::text, status, entity_type, entity_id, requested_by_user_id::text AS requested_by FROM operational_approvals WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid",
          [c.tenantId, os],
        );
        assert.equal(linhas.length, 1, `${quando}: esperava 1 linha de aprovação, veio ${linhas.length}`);
        assert.deepEqual(
          { status: linhas[0].status, entity_type: linhas[0].entity_type, requested_by: linhas[0].requested_by },
          { status: "pending_approval", entity_type: "work_order", requested_by: c.tecnicoId },
          `${quando}: a linha do pedido do técnico`,
        );
        assert.match(linhas[0].entity_id, /^pedido-app:[0-9a-f]{32}$/, `${quando}: a chave do pedido do técnico`);
        const auditoria = await c.auditoriaDaAba(os, "approval.requested");
        assert.equal(auditoria.length, 1, `${quando}: esperava 1 approval.requested no filtro da aba, veio ${auditoria.length}`);
        assert.equal(auditoria[0].metadata?.approvalId, linhas[0].id, `${quando}: o id da aprovação nos metadados da auditoria`);
        const eventos = await c.sql(
          "SELECT metadata FROM work_order_events WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid AND event_type = 'work_order_approval_requested'",
          [c.tenantId, os],
        );
        assert.equal(eventos.length, 1, `${quando}: esperava 1 evento do pedido, veio ${eventos.length}`);
        assert.equal(eventos[0].metadata?.approval_id, linhas[0].id, `${quando}: o approval_id do evento não é o id da linha`);
        return linhas[0].id as string;
      };

      const id = await conferir("1º envio");
      c.zerarRecibos();
      const inicioReenvio = performance.now();
      const reenvio = await c.pedirPeloLote(os, cid, { servicoNovo: true });
      const msReenvio = performance.now() - inicioReenvio;
      t.diagnostic(`T3(f) reenvio: pedirPeloLote ${msReenvio.toFixed(1)} ms`);
      assert.equal(reenvio.accepted.length, 1, `o reenvio foi recusado: ${JSON.stringify(reenvio)}`);
      assert.ok(msReenvio < 1000, `reenvio: o pedido do técnico pelo lote levou ${msReenvio.toFixed(1)} ms (limite 1000 ms)`);
      assert.equal(await conferir("reenvio com serviço novo e recibo zerado"), id, "o reenvio apontou outra linha");
    });
  });

  test("T3(h) · atomicidade: o evento do pedido falha → 0 aprovação, 0 auditoria, 0 evento; o reenvio grava 1/1/1; a pendência decidida não renasce", async (t) => {
    await comCenario(async (c) => {
      const os = await c.criarOsDoTecnico();
      const cid = randomUUID();
      const contar = async () => {
        const linhas = await c.sql("SELECT id::text, status FROM operational_approvals WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid", [c.tenantId, os]);
        const auditoria = await c.auditoriaDaAba(os, "approval.requested");
        const eventos = await c.sql(
          "SELECT metadata FROM work_order_events WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid AND event_type = 'work_order_approval_requested'",
          [c.tenantId, os],
        );
        return { linhas, auditoria, eventos };
      };

      // (1) Com o gatilho no INSERT do evento: o envio sai recusado, depressa, e nada fica gravado.
      await c.comGatilhoNoEventoDoPedido("B_APROV_INJ_EVENTO", async () => {
        const inicio = performance.now();
        const lote = await c.pedirPeloLote(os, cid);
        const ms = performance.now() - inicio;
        t.diagnostic(`T3(h) (1) envio com o evento derrubado: pedirPeloLote ${ms.toFixed(1)} ms`);
        assert.deepEqual({ aceitos: lote.accepted.length, recusados: lote.rejected.length }, { aceitos: 0, recusados: 1 }, `(1) ${JSON.stringify(lote)}`);
        assert.ok(ms < 1000, `(1) o envio com o evento derrubado levou ${ms.toFixed(1)} ms (limite 1000 ms)`);
      });
      const falha = await contar();
      assert.deepEqual(
        { aprovacoes: falha.linhas.length, auditoria: falha.auditoria.length, eventos: falha.eventos.length },
        { aprovacoes: 0, auditoria: 0, eventos: 0 },
        "(1) o evento caiu e a aprovação (ou a auditoria) ficou: o pedido não é atômico",
      );

      // (2) Sem o gatilho, recibo zerado, a MESMA ação: 1 linha, 1 auditoria, 1 evento, e o evento aponta a linha.
      c.zerarRecibos();
      const segundo = await c.pedirPeloLote(os, cid);
      assert.equal(segundo.accepted.length, 1, `(2) o reenvio foi recusado: ${JSON.stringify(segundo)}`);
      const gravado = await contar();
      assert.deepEqual(
        { aprovacoes: gravado.linhas.length, auditoria: gravado.auditoria.length, eventos: gravado.eventos.length },
        { aprovacoes: 1, auditoria: 1, eventos: 1 },
        "(2) o reenvio não gravou 1 aprovação, 1 auditoria e 1 evento",
      );
      const id = gravado.linhas[0].id as string;
      assert.equal(gravado.eventos[0].metadata?.approval_id, id, "(2) o approval_id do evento não é o id da linha");

      // (3) O gestor aprova; recibo zerado; a MESMA ação: continua 1 linha (aprovada), 1 auditoria e 1 evento.
      await (await c.aprovacoes()).approve(c.gestao, id, { note: "Conferido pelo gestor." });
      c.zerarRecibos();
      const terceiro = await c.pedirPeloLote(os, cid);
      assert.equal(terceiro.accepted.length, 1, `(3) o reenvio depois da decisão foi recusado: ${JSON.stringify(terceiro)}`);
      const decidido = await contar();
      assert.deepEqual(
        {
          aprovacoes: decidido.linhas.map((l) => l.status),
          auditoria: decidido.auditoria.length,
          eventos: decidido.eventos.length,
        },
        { aprovacoes: ["approved"], auditoria: 1, eventos: 1 },
        "(3) a pendência decidida renasceu: o reenvio criou outra aprovação, auditoria ou evento",
      );
    });
  });

  test("T3(i) · o [D5] do 16 com a fila do BANCO: 10 envios do mesmo client_action_id + 1 de outro atrás da trava da OS → 1 evento de cada e 2 aprovações; 5 rodadas", async (t) => {
    await comCenario(async (c) => {
      const rajada = await c.papelDaRajada();
      try {
        const [papel] = await rajada.role.client.$queryRawUnsafe(
          "SELECT rolsuper AS super, rolbypassrls AS bypass FROM pg_roles WHERE rolname = current_user",
        ) as Array<{ super: boolean; bypass: boolean }>;
        assert.deepEqual(papel, { super: false, bypass: false }, "o papel da rajada não é NOSUPERUSER NOBYPASSRLS");

        for (let rodada = 1; rodada <= 5; rodada += 1) {
          const os = await c.criarOsDoTecnico();
          c.zerarRecibos();
          const cid = randomUUID();
          const outro = randomUUID();
          const segurador = await c.segurarOs(os);
          const envios = [
            ...Array.from({ length: 10 }, () => captureSettled(rajada.pedir(os, cid))),
            captureSettled(rajada.pedir(os, outro)),
          ];
          let barreira = "";
          try {
            barreira = await waitForOwnBlockedOrSettled(c.admin, {
              applicationName: rajada.applicationName,
              minBlocked: envios.length - 1,
              loser: Promise.all(envios),
              label: `T3(i) rodada ${rodada}`,
              timeoutMs: 20_000,
            });
          } finally {
            segurador.release();
          }
          const desfechoDoSegurador = await segurador.done;
          assert.equal(desfechoDoSegurador.status, "fulfilled", `rodada ${rodada}: o segurador falhou: ${JSON.stringify(desfechoDoSegurador)}`);
          const resultados = await Promise.all(envios);

          const eventos = await c.sql(
            "SELECT metadata FROM work_order_events WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid AND event_type = 'work_order_approval_requested'",
            [c.tenantId, os],
          );
          const doMesmo = eventos.filter((e) => e.metadata?.client_action_id === cid).length;
          const doOutro = eventos.filter((e) => e.metadata?.client_action_id === outro).length;
          const aprovacoes = (await c.aprovacoesDaOs(os)).length;
          const auditoria = (await c.auditoriaDaAba(os, "approval.requested")).length;
          const desfechos: Record<string, number> = {};
          for (const resultado of resultados) {
            const chave =
              resultado.status === "rejected"
                ? `lançou:${String((resultado.reason as { message?: unknown })?.message ?? resultado.reason).slice(0, 80)}`
                : resultado.value.accepted.length === 1
                  ? "accepted"
                  : `${JSON.stringify(resultado.value.rejected?.[0]?.error?.reason ?? resultado.value)}`.slice(0, 80);
            desfechos[chave] = (desfechos[chave] ?? 0) + 1;
          }
          t.diagnostic(
            `T3(i) rodada ${rodada}: eventos do mesmo=${doMesmo} do outro=${doOutro} aprovacoes=${aprovacoes} auditoria=${auditoria} ` +
              `desfechos=${JSON.stringify(desfechos)} barreira=${barreira.slice(0, 120)}`,
          );

          assert.equal(doMesmo, 1, `rodada ${rodada}: 10 envios do mesmo client_action_id gravaram ${doMesmo} eventos`);
          assert.equal(doOutro, 1, `rodada ${rodada}: a ação distinta gravou ${doOutro} eventos`);
          assert.equal(aprovacoes, 2, `rodada ${rodada}: esperava 2 aprovações (1 por ação), veio ${aprovacoes}`);
          assert.equal(auditoria, 2, `rodada ${rodada}: esperava 2 approval.requested, veio ${auditoria}`);
          assert.deepEqual(desfechos, { accepted: 11 }, `rodada ${rodada}: nem todo envio foi aceito`);
          assert.match(barreira, /^bloqueado: /, `rodada ${rodada}: a barreira não viu os envios bloqueados (${barreira})`);
          assert.match(barreira, /FOR UPDATE/, `rodada ${rodada}: os envios não esperaram na trava da OS (${barreira.slice(0, 200)})`);
        }
      } finally {
        await rajada.role.drop();
      }
    });
  });

  test("T3(j) · a fila da unidade falha UMA vez pelo lote → 503 approval_unavailable em menos de 1000 ms, 0 aprovação, 0 auditoria, 0 evento; o reenvio grava 1/1/1", async (t) => {
    await comCenario(async (c) => {
      const os = await c.criarOsDoTecnico();
      const cid = randomUUID();
      const marca = "B_APROV_INJ_UMA_VEZ";
      const contar = async () => {
        const linhas = await c.sql(
          "SELECT id::text, status, requested_by_user_id::text AS requested_by FROM operational_approvals WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid",
          [c.tenantId, os],
        );
        const auditoria = await c.auditoriaDaAba(os, "approval.requested");
        const eventos = await c.sql(
          "SELECT metadata FROM work_order_events WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid AND event_type = 'work_order_approval_requested'",
          [c.tenantId, os],
        );
        return { linhas, auditoria, eventos };
      };

      // (1) O gatilho derruba o 1º INSERT da aprovação; o envio sai 503, depressa, e nada fica gravado.
      const tentativas = await c.comGatilhoUmaVezNaAprovacao(marca, async () => {
        const inicio = performance.now();
        const lote = await c.pedirPeloLote(os, cid);
        const ms = performance.now() - inicio;
        t.diagnostic(
          `T3(j) (1) envio com a aprovação derrubada: pedirPeloLote ${ms.toFixed(1)} ms ` +
            `${JSON.stringify({ aceitos: lote.accepted.length, recusados: lote.rejected.map((r: any) => r.error?.reason) })}`,
        );
        assert.deepEqual({ aceitos: lote.accepted.length, recusados: lote.rejected.length }, { aceitos: 0, recusados: 1 }, `(1) ${JSON.stringify(lote)}`);
        const erro = (lote.rejected[0] as any).error;
        assert.deepEqual(
          { code: erro?.code, reason: erro?.reason },
          { code: "SERVICE_UNAVAILABLE", reason: "approval_unavailable" },
          `(1) a falha da fila não saiu 503 approval_unavailable: ${JSON.stringify(erro)}`,
        );
        assert.ok(!String(erro?.message ?? "").includes(marca), "(1) o texto do erro do banco saiu na resposta");
        assert.ok(ms < 1000, `(1) o envio com a aprovação derrubada levou ${ms.toFixed(1)} ms (limite 1000 ms)`);
      });
      const falha = await contar();
      assert.deepEqual(
        { aprovacoes: falha.linhas.length, auditoria: falha.auditoria.length, eventos: falha.eventos.length },
        { aprovacoes: 0, auditoria: 0, eventos: 0 },
        "(1) a fila falhou e sobrou aprovação, auditoria ou evento: a aprovação ficou órfã (ou o evento nasceu sem ela)",
      );
      assert.equal(tentativas, 1, `(1) a aprovação foi tentada ${tentativas} vez(es): a fila tentou de novo fora da unidade`);

      // (2) Sem o gatilho, a MESMA ação (o recibo só guarda o aceito): 1 linha, 1 auditoria, 1 evento, e o evento aponta a linha.
      const inicioReenvio = performance.now();
      const reenvio = await c.pedirPeloLote(os, cid);
      const msReenvio = performance.now() - inicioReenvio;
      t.diagnostic(`T3(j) (2) reenvio: pedirPeloLote ${msReenvio.toFixed(1)} ms`);
      assert.equal(reenvio.accepted.length, 1, `(2) o reenvio foi recusado: ${JSON.stringify(reenvio)}`);
      assert.ok(msReenvio < 1000, `(2) o reenvio levou ${msReenvio.toFixed(1)} ms (limite 1000 ms)`);
      const gravado = await contar();
      assert.deepEqual(
        { aprovacoes: gravado.linhas.length, auditoria: gravado.auditoria.length, eventos: gravado.eventos.length },
        { aprovacoes: 1, auditoria: 1, eventos: 1 },
        "(2) o reenvio não gravou 1 aprovação, 1 auditoria e 1 evento",
      );
      assert.deepEqual(
        { status: gravado.linhas[0].status, requested_by: gravado.linhas[0].requested_by },
        { status: "pending_approval", requested_by: c.tecnicoId },
        "(2) a linha do pedido do técnico",
      );
      assert.equal(gravado.eventos[0].metadata?.approval_id, gravado.linhas[0].id, "(2) o approval_id do evento não é o id da linha");
      assert.equal(gravado.auditoria[0].metadata?.approvalId, gravado.linhas[0].id, "(2) o id da aprovação nos metadados da auditoria");
    });
  });

}

// ---------------------------------------------------------------------------------------------------------------------

function injetado(marca: string) {
  return (erro: unknown) => {
    const texto = String((erro as { message?: unknown })?.message ?? erro);
    assert.ok(texto.includes(marca), `a recusa não veio da falha injetada (${marca}): ${texto.slice(0, 300)}`);
    return true;
  };
}

async function montarCenario(conexao: string) {
  const [{ createPrismaClient }, { resolvePermissionsForRoles }, wo, approvals, sync, woPrisma] = await Promise.all([
    import("../src/database/pg-connection.js"),
    import("../src/modules/core-saas/permissions/catalog.js"),
    import("../src/modules/work-orders/work-order.service.js"),
    import("../src/modules/work-orders/approval.service.js"),
    import("../src/modules/mobile/mobile-work-order-sync.js"),
    import("../src/modules/work-orders/work-order-prisma.repository.js"),
  ]);
  const admin: any = createPrismaClient(conexao);
  const sufixo = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const tenant = await admin.tenant.create({ data: { name: `B-APROV atomic ${sufixo}`, slug: `b-aprov-atomic-${sufixo}` } });
  const tenantId: string = tenant.id;
  const usuario = (nome: string) =>
    admin.user.create({ data: { tenant_id: tenantId, name: `${nome} ${sufixo}`, email: `b-aprov-atomic-${nome}-${sufixo}@example.com` } });
  const [gestor, tecnico] = [await usuario("gestor"), await usuario("tecnico")];

  wo.resetWorkOrderRuntimeForTests();
  approvals.resetApprovalRuntimeForTests();
  sync.resetMobileWorkOrderSyncRuntimeForTests();
  const ordens = await wo.createDefaultWorkOrderService();
  const gestao = { tenantId, userId: gestor.id, roles: ["manager"], permissions: resolvePermissionsForRoles(["manager"]), explicitPermissions: true } as never;
  // F4c — o técnico da OS, com as permissões do papel (o lote do app confere a permissão da ação e o escopo por objeto).
  const campo = { tenantId, userId: tecnico.id, roles: ["field_technician"], permissions: resolvePermissionsForRoles(["field_technician"]), explicitPermissions: true } as never;
  const sql = async (texto: string, params: readonly unknown[] = []): Promise<any[]> => admin.$queryRawUnsafe(texto, ...params);
  let sequencia = 0;

  async function comGatilhoNaAprovacao(marca: string, corpo: () => Promise<void>): Promise<void> {
    assert.match(tenantId, UUID);
    const nome = `b_aprov_inj_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    await runHarnessDdl(admin, `CREATE FUNCTION ${nome}() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN RAISE EXCEPTION '${marca}'; END $f$`);
    let erroDoCorpo: unknown;
    try {
      await runHarnessDdl(
        admin,
        `CREATE TRIGGER ${nome} BEFORE INSERT ON operational_approvals FOR EACH ROW WHEN (NEW.tenant_id = '${tenantId}'::uuid) EXECUTE FUNCTION ${nome}()`,
      );
      await corpo();
    } catch (error) {
      erroDoCorpo = error;
    } finally {
      await dropHarnessObjects(admin, erroDoCorpo, [`DROP TRIGGER IF EXISTS ${nome} ON operational_approvals`, `DROP FUNCTION IF EXISTS ${nome}()`]);
    }
    if (erroDoCorpo !== undefined) throw erroDoCorpo;
    const [{ gatilhos }] = await sql("SELECT count(*)::int AS gatilhos FROM pg_trigger WHERE tgname = $1", [nome]);
    const [{ funcoes }] = await sql("SELECT count(*)::int AS funcoes FROM pg_proc WHERE proname = $1", [nome]);
    assert.deepEqual([gatilhos, funcoes], [0, 0], `o gatilho ${nome} sobrou no catálogo`);
  }

  // Emenda 3 (T3(h)) — no molde de `comGatilhoNaAprovacao`: derruba o INSERT do evento do pedido do técnico
  // (`work_order_approval_requested`) da organização descartável, DEPOIS da aprovação na mesma unidade.
  async function comGatilhoNoEventoDoPedido(marca: string, corpo: () => Promise<void>): Promise<void> {
    assert.match(tenantId, UUID);
    const nome = `b_aprov_inj_ev_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    await runHarnessDdl(admin, `CREATE FUNCTION ${nome}() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN RAISE EXCEPTION '${marca}'; END $f$`);
    let erroDoCorpo: unknown;
    try {
      await runHarnessDdl(
        admin,
        `CREATE TRIGGER ${nome} BEFORE INSERT ON work_order_events FOR EACH ROW WHEN (NEW.tenant_id = '${tenantId}'::uuid AND NEW.event_type = 'work_order_approval_requested') EXECUTE FUNCTION ${nome}()`,
      );
      await corpo();
    } catch (error) {
      erroDoCorpo = error;
    } finally {
      await dropHarnessObjects(admin, erroDoCorpo, [`DROP TRIGGER IF EXISTS ${nome} ON work_order_events`, `DROP FUNCTION IF EXISTS ${nome}()`]);
    }
    if (erroDoCorpo !== undefined) throw erroDoCorpo;
    const [{ gatilhos }] = await sql("SELECT count(*)::int AS gatilhos FROM pg_trigger WHERE tgname = $1", [nome]);
    const [{ funcoes }] = await sql("SELECT count(*)::int AS funcoes FROM pg_proc WHERE proname = $1", [nome]);
    assert.deepEqual([gatilhos, funcoes], [0, 0], `o gatilho ${nome} sobrou no catálogo`);
  }

  // Conserto da J-586 (L2-01, T3(j)) — no molde de `comGatilhoNaAprovacao`, mas o gatilho derruba só o 1º INSERT em
  // `operational_approvals` da organização descartável; os seguintes passam. A contagem é de uma sequência própria
  // (`nextval` não volta com o rollback da unidade). Devolve quantas vezes a inserção foi tentada com o gatilho no ar.
  async function comGatilhoUmaVezNaAprovacao(marca: string, corpo: () => Promise<void>): Promise<number> {
    assert.match(tenantId, UUID);
    const nome = `b_aprov_inj_1x_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    let erroDoCorpo: unknown;
    let tentativas = -1;
    try {
      await runHarnessDdl(admin, `CREATE SEQUENCE ${nome}_seq`);
      await runHarnessDdl(
        admin,
        `CREATE FUNCTION ${nome}() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN IF nextval('${nome}_seq') = 1 THEN RAISE EXCEPTION '${marca}'; END IF; RETURN NEW; END $f$`,
      );
      await runHarnessDdl(
        admin,
        `CREATE TRIGGER ${nome} BEFORE INSERT ON operational_approvals FOR EACH ROW WHEN (NEW.tenant_id = '${tenantId}'::uuid) EXECUTE FUNCTION ${nome}()`,
      );
      await corpo();
      const [{ valor, chamada }] = await sql(`SELECT last_value::int AS valor, is_called AS chamada FROM ${nome}_seq`);
      tentativas = chamada ? valor : 0;
    } catch (error) {
      erroDoCorpo = error;
    } finally {
      await dropHarnessObjects(admin, erroDoCorpo, [
        `DROP TRIGGER IF EXISTS ${nome} ON operational_approvals`,
        `DROP FUNCTION IF EXISTS ${nome}()`,
        `DROP SEQUENCE IF EXISTS ${nome}_seq`,
      ]);
    }
    if (erroDoCorpo !== undefined) throw erroDoCorpo;
    const [{ gatilhos }] = await sql("SELECT count(*)::int AS gatilhos FROM pg_trigger WHERE tgname = $1", [nome]);
    const [{ funcoes }] = await sql("SELECT count(*)::int AS funcoes FROM pg_proc WHERE proname = $1", [nome]);
    const [{ sequencias }] = await sql("SELECT count(*)::int AS sequencias FROM pg_class WHERE relname = $1", [`${nome}_seq`]);
    assert.deepEqual([gatilhos, funcoes, sequencias], [0, 0, 0], `o gatilho ${nome} (ou a sequência) sobrou no catálogo`);
    return tentativas;
  }

  // Emenda 3 (T3(i)) — o segurador do [D5] do 16: SQL próprio do admin numa transação aberta toma a trava da OS e espera
  // um portão.
  async function segurarOs(workOrderId: string): Promise<{ release: () => void; done: Promise<SettledOutcome<unknown>> }> {
    let release!: () => void;
    const mayGo = new Promise<void>((resolve) => {
      release = resolve;
    });
    let ready!: () => void;
    const isReady = new Promise<void>((resolve) => {
      ready = resolve;
    });
    const done = captureSettled(
      admin.$transaction(
        async (tx: any) => {
          await tx.$queryRawUnsafe("SELECT id FROM work_orders WHERE tenant_id = $1::uuid AND id = $2::uuid FOR UPDATE", tenantId, workOrderId);
          ready();
          await mayGo;
        },
        { maxWait: 10_000, timeout: 60_000 },
      ),
    );
    await Promise.race([
      isReady,
      done.then((outcome) => {
        throw new Error(`o segurador terminou antes da barreira: ${JSON.stringify(outcome)}`);
      }),
    ]);
    return { release, done };
  }

  // Emenda 3 (T3(i)) — o papel da rajada, NOSUPERUSER NOBYPASSRLS, com `application_name` próprio (a barreira conta só
  // as sessões dele) e pool de 16 (11 envios ao mesmo tempo, cada um numa transação da unidade). O serviço de OS roda
  // sobre ele, e o lote usa a fila de Aprovações PADRÃO (sem injetar): a da própria unidade.
  async function papelDaRajada() {
    const applicationName = buildApplicationName("baprov-t3i");
    const role = await createEphemeralRole(admin, withApplicationName(conexao, applicationName), (url) => createPrismaClient(url, { max: 16 }) as never);
    const servico = new wo.WorkOrderService(new woPrisma.RlsPrismaWorkOrderRepository(role.client as never), {
      resolveActorOperatorProfileId: async () => undefined,
    } as never);
    const pedir = (workOrderId: string, clientActionId: string) =>
      sync.syncMobileWorkOrderActions(
        campo,
        {
          client_batch_id: randomUUID(),
          actions: [
            {
              client_action_id: clientActionId,
              type: "work_order.approval_request",
              local_created_at: "2026-11-17T12:00:00.000Z",
              payload: { work_order_id: workOrderId, reason: "Troca de peça fora do orçamento", urgency: "normal" },
            },
          ],
        },
        async () => servico,
      );
    return { role, applicationName, pedir };
  }

  return {
    admin,
    tenantId,
    gestorId: gestor.id as string,
    tecnicoId: tecnico.id as string,
    sql,
    comGatilhoNaAprovacao,
    comGatilhoNoEventoDoPedido,
    comGatilhoUmaVezNaAprovacao,
    segurarOs,
    papelDaRajada,
    gestao,
    aprovacoes: () => approvals.createDefaultApprovalService(),
    async criarOsEmAtendimento(): Promise<string> {
      sequencia += 1;
      const os = await admin.workOrder.create({
        data: { tenant_id: tenantId, code: `WO-BAPROV-${sufixo}-${sequencia}`, title: "OS B-APROV atomic", customer_name: "Cliente B-APROV", status: "in_progress" },
      });
      return os.id;
    },
    // F4c — OS em atendimento atribuída ao técnico (o casamento duplo do escopo aceita o id do usuário em `assigned_operator_id`).
    async criarOsDoTecnico(): Promise<string> {
      sequencia += 1;
      const os = await admin.workOrder.create({
        data: {
          tenant_id: tenantId,
          code: `WO-BAPROV-${sufixo}-${sequencia}`,
          title: "OS B-APROV atomic do técnico",
          customer_name: "Cliente B-APROV",
          status: "in_progress",
          assigned_user_id: tecnico.id,
          assigned_operator_id: tecnico.id,
        },
      });
      return os.id;
    },
    // F4c — o pedido do técnico pelo lote do app (`work_order.approval_request`, do B-SAN3-16), com as dependências
    // PADRÃO da fila: a fila padrão é a da unidade (Emenda 3), a do banco no MESMO `tx` da trava e do evento.
    // `servicoNovo` reconstrói o serviço de OS e o de aprovações, como depois de um reinício.
    async pedirPeloLote(workOrderId: string, clientActionId: string, opcoes: { servicoNovo?: boolean } = {}) {
      let servico = ordens;
      if (opcoes.servicoNovo) {
        wo.resetWorkOrderRuntimeForTests();
        approvals.resetApprovalRuntimeForTests();
        servico = await wo.createDefaultWorkOrderService();
      }
      return sync.syncMobileWorkOrderActions(
        campo,
        {
          client_batch_id: randomUUID(),
          actions: [
            {
              client_action_id: clientActionId,
              type: "work_order.approval_request",
              local_created_at: "2026-11-17T12:00:00.000Z",
              payload: { work_order_id: workOrderId, reason: "Troca de peça fora do orçamento", urgency: "normal" },
            },
          ],
        },
        async () => servico,
      );
    },
    zerarRecibos: () => sync.resetMobileWorkOrderSyncRuntimeForTests(),
    concluirPelaRota: (workOrderId: string) => ordens.changeStatus(gestao, workOrderId, { status: "completed" }, { entry: "http_status_route" }),
    concluirPelaFila: (workOrderId: string) =>
      sync.syncMobileWorkOrderActions(
        gestao,
        { client_batch_id: randomUUID(), actions: [{ client_action_id: randomUUID(), type: "work_order.status_change", payload: { work_order_id: workOrderId, status: "completed" } }] },
        async () => ordens,
      ),
    async os(workOrderId: string): Promise<Record<string, any>> {
      const [linha] = await sql("SELECT status, completed_at FROM work_orders WHERE tenant_id = $1::uuid AND id = $2::uuid", [tenantId, workOrderId]);
      return linha;
    },
    aprovacoesDaOs: (workOrderId: string) =>
      sql(
        "SELECT id::text, status, entity_type, entity_id, requested_by_user_id::text, pending_reason FROM operational_approvals WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid ORDER BY requested_at",
        [tenantId, workOrderId],
      ),
    // O filtro da aba "Logs da OS" (AuditLogRepository.listByEntity): organização, 'work_order', id da OS.
    auditoriaDaAba: (workOrderId: string, acao: string) =>
      sql("SELECT action, metadata FROM audit_logs WHERE tenant_id = $1::uuid AND entity = 'work_order' AND entity_id = $2 AND action = $3", [tenantId, workOrderId, acao]),
    async eventosDaOs(workOrderId: string, tipo: string): Promise<number> {
      const [{ n }] = await sql("SELECT count(*)::int AS n FROM work_order_events WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid AND event_type = $3", [tenantId, workOrderId, tipo]);
      return n;
    },
  };
}

type Cenario = Awaited<ReturnType<typeof montarCenario>>;

async function comCenario(callback: (c: Cenario) => Promise<void>): Promise<void> {
  const c = await montarCenario(connection!);
  try {
    await callback(c);
  } finally {
    await teardown(c.admin, c.tenantId);
    await c.admin.$disconnect();
  }
}

// Teardown ESCOPADO à organização descartável: toda tabela com `tenant_id` uuid, pelo id que o caso semeou, com gatilhos
// de FK em modo réplica; depois, zero linha residual. A notificação da decisão grava o uso de nuvem DEPOIS de responder
// (`recordCloudUsageBestEffort`, sem espera): uma linha pode chegar depois da limpeza. Por isso a limpeza repete até a
// contagem dar zero em todas as tabelas (no máximo 20 voltas de 100 ms), e só então afirma.
async function teardown(client: any, tenantId: string): Promise<void> {
  const tabelas: Array<{ table_name: string }> = await client.$queryRawUnsafe(
    `SELECT c.table_name FROM information_schema.columns c
       JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
      WHERE c.table_schema = 'public' AND c.column_name = 'tenant_id' AND c.data_type = 'uuid' AND t.table_type = 'BASE TABLE'
      ORDER BY c.table_name`,
  );
  const residuo = async (): Promise<string[]> => {
    const sobras: string[] = [];
    for (const { table_name } of tabelas) {
      const [{ n }]: Array<{ n: number }> = await client.$queryRawUnsafe(`SELECT count(*)::int AS n FROM "${table_name}" WHERE tenant_id = $1::uuid`, tenantId);
      if (n > 0) sobras.push(`${table_name}=${n}`);
    }
    return sobras;
  };
  let sobras: string[] = [];
  for (let volta = 0; volta < 20; volta += 1) {
    await client.$transaction(async (tx: any) => {
      await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
      for (const { table_name } of tabelas) {
        await tx.$executeRawUnsafe(`DELETE FROM "${table_name}" WHERE tenant_id = $1::uuid`, tenantId);
      }
      await tx.$executeRawUnsafe("DELETE FROM tenants WHERE id = $1::uuid", tenantId);
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    sobras = await residuo();
    if (sobras.length === 0) break;
  }
  assert.deepEqual(sobras, [], `teardown deixou linha(s) da organização descartável: ${sobras.join(", ")}`);
}
