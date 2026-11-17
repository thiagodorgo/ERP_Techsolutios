import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";

// B-APROVACOES-DURAVEIS (item 67 do portão; plano §4.1 T7, §3.5, e emenda 1 §3.6) — A SEGREGAÇÃO DE FUNÇÃO E A
// AUDITORIA DA DECISÃO, DURÁVEIS, NO POSTGRES REAL, pela porta do controller (a que extrai o contexto da requisição):
//   - o solicitante tenta aprovar e tenta reprovar → 403 nas 2; 2 linhas `approval.self_decision_denied` em audit_logs,
//     com o par da aba "Logs da OS" (entity = 'work_order', entity_id = id da OS); a linha continua pendente;
//   - com a aprovação já decidida, o solicitante ainda recebe 403 (não 409);
//   - decisão aceita → 1 linha de auditoria (não 2), com os campos de contexto da requisição (id, correlação, IP, agente)
//     e o par da aba; a reprovação idem;
//   - `UPDATE` direto com decisor = solicitante → 23514 (a 2ª barreira, no banco).
// Organização descartável por caso; teardown escopado pelo id dela. Sem DATABASE_URL, o arquivo se declara pulado.

const connection = process.env.DATABASE_URL;

if (!connection) {
  test("o B-APROVACOES-DURAVEIS (segregação e auditoria) no Postgres exige DATABASE_URL", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrações para executar este teste.",
  });
} else {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "prisma";

  after(async () => {
    const { prisma } = await import("../src/database/prisma.js");
    await prisma.$disconnect();
  });

  test("T7 · o solicitante recebe 403 ao aprovar e ao reprovar, e cada recusa deixa 1 linha durável com o par da OS", async () => {
    await comCenario(async (c) => {
      const { os, aprovacao } = await c.pedidoDaConclusao();
      const aprova = await c.decidir("approve", c.gestorId, aprovacao, { note: "Eu mesmo confiro." });
      const reprova = await c.decidir("reject", c.gestorId, aprovacao, { reason: "Eu mesmo recuso." });
      assert.deepEqual([aprova.status, aprova.reason], [403, "self_decision"]);
      assert.deepEqual([reprova.status, reprova.reason], [403, "self_decision"]);

      const recusas = await c.auditoria("approval.self_decision_denied");
      assert.equal(recusas.length, 2, `esperava 2 linhas approval.self_decision_denied em audit_logs, veio ${recusas.length}`);
      for (const recusa of recusas) {
        assert.deepEqual({ entity: recusa.entity, entity_id: recusa.entity_id, actor: recusa.actor_user_id }, { entity: "work_order", entity_id: os, actor: c.gestorId });
        assert.equal(recusa.metadata?.approvalId, aprovacao);
        assert.equal(recusa.metadata?.outcome, "denied");
        const serializado = JSON.stringify(recusa.metadata).toLowerCase();
        for (const proibido of ["token", "bearer", "authorization", "base64", "storage_key", "bucket", "local_path", "password", "eu mesmo"]) {
          assert.equal(serializado.includes(proibido), false, `a recusa vazou "${proibido}"`);
        }
      }
      assert.deepEqual(
        (await c.recusasPorDecisao()).sort(),
        ["approved", "rejected"],
        "as 2 recusas registram a decisão tentada (approved e rejected)",
      );
      assert.equal((await c.linha(aprovacao)).status, "pending_approval", "a recusa mexeu na aprovação");
    });
  });

  test("T7 · já decidida: o solicitante ainda recebe 403 (não 409), e a recusa é gravada", async () => {
    await comCenario(async (c) => {
      const { aprovacao } = await c.pedidoDaConclusao();
      assert.equal((await c.decidir("approve", c.decisorId, aprovacao, { note: "Conferido." })).status, 200);
      const tentativa = await c.decidir("approve", c.gestorId, aprovacao, { note: "E agora?" });
      assert.deepEqual([tentativa.status, tentativa.reason], [403, "self_decision"], "o solicitante descobriu o estado pelo código de erro");
      assert.equal((await c.auditoria("approval.self_decision_denied")).length, 1);
    });
  });

  test("T7 · decisão aceita → 1 linha de auditoria (não 2) com o contexto da requisição e o par da OS; reprovação idem", async () => {
    await comCenario(async (c) => {
      const { os, aprovacao } = await c.pedidoDaConclusao();
      const requisicao = `req-${randomUUID()}`;
      const aprovada = await c.decidir("approve", c.decisorId, aprovacao, { note: "Conferido com evidências." }, requisicao);
      assert.equal(aprovada.status, 200);
      const linhas = await c.auditoria("approval.approved");
      assert.equal(linhas.length, 1, `esperava 1 linha approval.approved, veio ${linhas.length}`);
      assert.deepEqual({ entity: linhas[0].entity, entity_id: linhas[0].entity_id, actor: linhas[0].actor_user_id }, { entity: "work_order", entity_id: os, actor: c.decisorId });
      assert.deepEqual(
        {
          requestId: linhas[0].metadata?.requestId,
          correlationId: linhas[0].metadata?.correlationId,
          ipAddress: linhas[0].metadata?.ipAddress,
          userAgent: linhas[0].metadata?.userAgent,
          approvalId: linhas[0].metadata?.approvalId,
          status: linhas[0].metadata?.status,
          note_provided: linhas[0].metadata?.note_provided,
        },
        { requestId: requisicao, correlationId: requisicao, ipAddress: "203.0.113.7", userAgent: "b-aprov-t7/1.0", approvalId: aprovacao, status: "approved", note_provided: true },
      );
      assert.equal(JSON.stringify(linhas[0].metadata).includes("Conferido com evid"), false, "o texto da nota entrou na auditoria");

      const outra = await c.pedidoDaConclusao();
      const reprovada = await c.decidir("reject", c.decisorId, outra.aprovacao, { reason: "Foto obrigatória ausente." }, `req-${randomUUID()}`);
      assert.equal(reprovada.status, 200);
      const reprovacoes = await c.auditoria("approval.rejected");
      assert.equal(reprovacoes.length, 1, `esperava 1 linha approval.rejected, veio ${reprovacoes.length}`);
      assert.deepEqual({ entity: reprovacoes[0].entity, entity_id: reprovacoes[0].entity_id }, { entity: "work_order", entity_id: outra.os });
      assert.equal(reprovacoes[0].metadata?.reason_provided, true);
      assert.equal(JSON.stringify(reprovacoes[0].metadata).includes("Foto obrigat"), false, "o texto do motivo entrou na auditoria");
    });
  });

  test("T7 · UPDATE direto com decisor = solicitante → 23514 (a 2ª barreira, no banco)", async () => {
    await comCenario(async (c) => {
      const { aprovacao } = await c.pedidoDaConclusao();
      await assert.rejects(
        c.sql(
          "UPDATE operational_approvals SET status = 'approved', decided_by_user_id = requested_by_user_id, decided_at = now() WHERE tenant_id = $1::uuid AND id = $2::uuid",
          [c.tenantId, aprovacao],
        ),
        (erro: unknown) => {
          assert.match(String((erro as Error).message), /23514|operational_approvals_decider_differs_check/);
          return true;
        },
      );
    });
  });
}

// ---------------------------------------------------------------------------------------------------------------------

async function montarCenario(conexao: string) {
  const [{ createPrismaClient }, { resolvePermissionsForRoles }, wo, approvals, { ApprovalController }] = await Promise.all([
    import("../src/database/pg-connection.js"),
    import("../src/modules/core-saas/permissions/catalog.js"),
    import("../src/modules/work-orders/work-order.service.js"),
    import("../src/modules/work-orders/approval.service.js"),
    import("../src/modules/work-orders/approval.controller.js"),
  ]);
  const admin: any = createPrismaClient(conexao);
  const sufixo = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const tenant = await admin.tenant.create({ data: { name: `B-APROV sod ${sufixo}`, slug: `b-aprov-sod-${sufixo}` } });
  const tenantId: string = tenant.id;
  const usuario = (nome: string) =>
    admin.user.create({ data: { tenant_id: tenantId, name: `${nome} ${sufixo}`, email: `b-aprov-sod-${nome}-${sufixo}@example.com` } });
  const [gestor, decisor] = [await usuario("gestor"), await usuario("decisor")];

  wo.resetWorkOrderRuntimeForTests();
  approvals.resetApprovalRuntimeForTests();
  const controller = new ApprovalController();
  const sql = async (texto: string, params: readonly unknown[] = []): Promise<any[]> => admin.$queryRawUnsafe(texto, ...params);
  const permissoes = resolvePermissionsForRoles(["manager"]);
  let sequencia = 0;

  // A requisição que o middleware de RBAC deixaria pronta: o contexto da organização e o ator, com id, IP e agente.
  const requisicaoDe = (userId: string, approvalId: string, body: Record<string, unknown>, requestId: string) => {
    const cabecalhos: Record<string, string> = { "user-agent": "b-aprov-t7/1.0", "x-request-id": requestId };
    return {
      tenantContext: { tenantId, userId, roles: ["manager"], permissions: permissoes, explicitPermissions: true },
      actor: { tenantId, userId, roles: ["manager"] },
      params: { approvalId },
      body,
      query: {},
      ip: "203.0.113.7",
      header: (nome: string) => cabecalhos[nome.toLowerCase()],
    } as never;
  };

  return {
    admin,
    tenantId,
    gestorId: gestor.id as string,
    decisorId: decisor.id as string,
    sql,
    // O pedido nasce pela porta pública do serviço de aprovações, com o gestor como solicitante, sobre uma OS concluída
    // desta organização (entity_id = work_order_id = a OS), como o pedido da conclusão.
    async pedidoDaConclusao(): Promise<{ os: string; aprovacao: string }> {
      sequencia += 1;
      const os = await admin.workOrder.create({
        data: { tenant_id: tenantId, code: `WO-BAPROV-SOD-${sufixo}-${sequencia}`, title: "OS B-APROV sod", customer_name: "Cliente B-APROV", status: "completed" },
      });
      const aprovacao = await (await approvals.createDefaultApprovalService()).request({
        tenantId,
        entityType: "work_order",
        entityId: os.id,
        workOrderId: os.id,
        requestedByUserId: gestor.id,
        pendingReason: "Ordem de servico concluida e pronta para validacao operacional.",
      });
      return { os: os.id, aprovacao: aprovacao.id };
    },
    async decidir(acao: "approve" | "reject", userId: string, approvalId: string, body: Record<string, unknown>, requestId = `req-${randomUUID()}`) {
      try {
        const resposta = await controller[acao](requisicaoDe(userId, approvalId, body, requestId));
        return { status: 200, reason: undefined as string | undefined, body: resposta };
      } catch (erro) {
        const e = erro as { statusCode?: number; reason?: string };
        return { status: e.statusCode ?? 500, reason: e.reason, body: undefined };
      }
    },
    auditoria: (acao: string) =>
      sql("SELECT entity, entity_id, actor_user_id::text, metadata FROM audit_logs WHERE tenant_id = $1::uuid AND action = $2 ORDER BY created_at", [tenantId, acao]),
    async recusasPorDecisao(): Promise<string[]> {
      const linhas = await sql("SELECT metadata->>'decision' AS decisao FROM audit_logs WHERE tenant_id = $1::uuid AND action = 'approval.self_decision_denied'", [tenantId]);
      return linhas.map((l: { decisao: string }) => l.decisao);
    },
    async linha(approvalId: string): Promise<Record<string, any>> {
      const [linha] = await sql("SELECT status, decided_by_user_id::text FROM operational_approvals WHERE tenant_id = $1::uuid AND id = $2::uuid", [tenantId, approvalId]);
      assert.ok(linha, "a aprovação não está no banco");
      return linha;
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
