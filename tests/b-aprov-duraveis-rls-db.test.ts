import "dotenv/config";

import assert from "node:assert/strict";
import test, { after } from "node:test";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";

// B-APROVACOES-DURAVEIS (item 67 do portão; plano §4.1 T5; critério 3) — 0 LEITURA E 0 ESCRITA ENTRE ORGANIZAÇÕES, sob
// um papel de banco SEM privilégio de contornar o isolamento (papel efêmero NOSUPERUSER NOBYPASSRLS do
// `createEphemeralRole`, com os privilégios de tabela que o papel de execução recebe):
//   - no SQL: sem contexto → 0 linhas; contexto da organização A → 0 linhas de B; `INSERT` com `tenant_id` de B sob A →
//     42501; `UPDATE` e `DELETE` de linha de B sob A → 0 linhas afetadas; catálogo com `relrowsecurity`,
//     `relforcerowsecurity`, `USING` e `WITH CHECK`;
//   - pelo serviço (com o repositório em banco sobre o cliente do papel): `get` de aprovação de B com ator de A → 404;
//     `listPending` de A não traz B; decidir aprovação de B com ator de A → 404 e a linha de B intacta; o controle
//     positivo — o mesmo papel pede, lê e decide a aprovação de A.
// Duas organizações descartáveis; teardown escopado pelos ids delas. Sem DATABASE_URL, o arquivo se declara pulado.

const connection = process.env.DATABASE_URL;

if (!connection) {
  test("o B-APROVACOES-DURAVEIS (isolamento) no Postgres exige DATABASE_URL", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrações para executar este teste.",
  });
} else {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "prisma";

  let admin: any;
  let papel: EphemeralRole | undefined;
  const organizacoes: string[] = [];

  after(async () => {
    try {
      await papel?.drop();
      for (const tenantId of organizacoes) await teardown(admin, tenantId);
    } finally {
      await admin?.$disconnect();
      const { prisma } = await import("../src/database/prisma.js");
      await prisma.$disconnect();
    }
  });

  test("T5 · sob papel NOSUPERUSER NOBYPASSRLS: SQL, catálogo e serviço não atravessam organizações", async () => {
    const [{ createPrismaClient }, { resolvePermissionsForRoles }, { ApprovalService }, { RlsPrismaApprovalRepository }] = await Promise.all([
      import("../src/database/pg-connection.js"),
      import("../src/modules/core-saas/permissions/catalog.js"),
      import("../src/modules/work-orders/approval.service.js"),
      import("../src/modules/work-orders/approval-prisma.repository.js"),
    ]);
    admin = createPrismaClient(connection);
    const sufixo = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const organizacao = async (rotulo: string) => {
      const tenant = await admin.tenant.create({ data: { name: `B-APROV rls ${rotulo} ${sufixo}`, slug: `b-aprov-rls-${rotulo}-${sufixo}` } });
      organizacoes.push(tenant.id);
      const usuario = (nome: string) =>
        admin.user.create({ data: { tenant_id: tenant.id, name: `${nome} ${sufixo}`, email: `b-aprov-rls-${rotulo}-${nome}-${sufixo}@example.com` } });
      const [solicitante, decisor] = [await usuario("solicitante"), await usuario("decisor")];
      const os = await admin.workOrder.create({
        data: { tenant_id: tenant.id, code: `WO-BAPROV-RLS-${rotulo}-${sufixo}`, title: "OS B-APROV rls", customer_name: "Cliente B-APROV", status: "completed" },
      });
      const [{ id: aprovacao }] = await admin.$queryRawUnsafe(
        `INSERT INTO operational_approvals (tenant_id, entity_type, entity_id, work_order_id, requested_by_user_id, pending_reason)
         VALUES ($1::uuid, 'work_order', $2, $3::uuid, $4::uuid, 'semente do T5') RETURNING id::text`,
        tenant.id,
        os.id,
        os.id,
        solicitante.id,
      );
      return { tenantId: tenant.id as string, solicitante: solicitante.id as string, decisor: decisor.id as string, os: os.id as string, aprovacao: aprovacao as string };
    };
    const a = await organizacao("a");
    const b = await organizacao("b");

    papel = await createEphemeralRole(admin as never, connection);
    const [atributos] = await admin.$queryRawUnsafe("SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = $1", papel.roleName);
    assert.deepEqual({ rolsuper: atributos.rolsuper, rolbypassrls: atributos.rolbypassrls }, { rolsuper: false, rolbypassrls: false }, "o papel do teste contorna o isolamento");
    const doPapel: any = papel.client;

    // Catálogo: ENABLE + FORCE, política com USING e WITH CHECK sobre o contexto da organização.
    const [catalogo] = await admin.$queryRawUnsafe(
      `SELECT c.relrowsecurity, c.relforcerowsecurity,
              (SELECT count(*)::int FROM pg_policies p WHERE p.tablename = 'operational_approvals' AND p.qual LIKE '%app.current_tenant_id%') AS using_ok,
              (SELECT count(*)::int FROM pg_policies p WHERE p.tablename = 'operational_approvals' AND p.with_check LIKE '%app.current_tenant_id%') AS check_ok
         FROM pg_class c WHERE c.relname = 'operational_approvals' AND c.relkind = 'r'`,
    );
    assert.deepEqual(
      { rls: catalogo.relrowsecurity, force: catalogo.relforcerowsecurity, using: catalogo.using_ok, withCheck: catalogo.check_ok },
      { rls: true, force: true, using: 1, withCheck: 1 },
      "o catálogo da tabela não tem o isolamento completo",
    );

    // Sem contexto: 0 linhas (nem de A, nem de B).
    const [{ semContexto }] = await doPapel.$queryRawUnsafe(
      "SELECT count(*)::int AS \"semContexto\" FROM operational_approvals WHERE tenant_id = ANY($1::uuid[])",
      [a.tenantId, b.tenantId],
    );
    assert.equal(semContexto, 0, "sem o contexto da organização, o papel leu aprovações");

    const sobA = <T>(corpo: (tx: any) => Promise<T>): Promise<T> =>
      doPapel.$transaction(async (tx: any) => {
        await tx.$executeRawUnsafe("SELECT set_config('app.current_tenant_id', $1, true)", a.tenantId);
        return corpo(tx);
      });

    // Contexto de A: vê a própria, 0 de B.
    const visiveis = await sobA((tx) => tx.$queryRawUnsafe("SELECT tenant_id::text FROM operational_approvals WHERE tenant_id = ANY($1::uuid[])", [a.tenantId, b.tenantId]));
    assert.deepEqual(visiveis.map((l: { tenant_id: string }) => l.tenant_id), [a.tenantId], "o contexto de A leu linha de B (ou não leu a própria)");

    // INSERT com tenant_id de B sob A → 42501 (WITH CHECK).
    await assert.rejects(
      sobA((tx) =>
        tx.$executeRawUnsafe(
          `INSERT INTO operational_approvals (tenant_id, entity_type, entity_id, work_order_id, requested_by_user_id, pending_reason)
           VALUES ($1::uuid, 'evidence', 'ev-t5', NULL, $2::uuid, 'invasão')`,
          b.tenantId,
          b.solicitante,
        ),
      ),
      (erro: unknown) => {
        assert.match(String((erro as Error).message), /42501|row-level security/i, "a escrita em B sob A não foi recusada pelo isolamento");
        return true;
      },
    );

    // UPDATE e DELETE de linha de B sob A → 0 linhas afetadas.
    const atualizadas = await sobA((tx) =>
      tx.$executeRawUnsafe("UPDATE operational_approvals SET pending_reason = 'adulterada' WHERE tenant_id = $1::uuid AND id = $2::uuid", b.tenantId, b.aprovacao),
    );
    const apagadas = await sobA((tx) => tx.$executeRawUnsafe("DELETE FROM operational_approvals WHERE tenant_id = $1::uuid AND id = $2::uuid", b.tenantId, b.aprovacao));
    assert.deepEqual({ atualizadas, apagadas }, { atualizadas: 0, apagadas: 0 });

    // Pelo serviço, com o repositório em banco sobre o cliente do PAPEL.
    const servico = new ApprovalService(new RlsPrismaApprovalRepository(doPapel));
    const permissoes = resolvePermissionsForRoles(["manager"]);
    const atorDeA = { tenantId: a.tenantId, userId: a.decisor, roles: ["manager"], permissions: permissoes, explicitPermissions: true } as never;
    const naoAchou = (erro: unknown) => {
      const e = erro as { statusCode?: number; reason?: string };
      assert.deepEqual({ status: e.statusCode, reason: e.reason }, { status: 404, reason: "not_found" });
      return true;
    };
    await assert.rejects(servico.get(atorDeA, b.aprovacao), naoAchou);
    const pendentesDeA = await servico.listPending(atorDeA);
    assert.deepEqual(pendentesDeA.map((p) => p.tenantId), [a.tenantId], "listPending de A trouxe linha de B");
    await assert.rejects(servico.approve(atorDeA, b.aprovacao, { note: "invasão" }), naoAchou);
    await assert.rejects(servico.reject(atorDeA, b.aprovacao, { reason: "invasão" }), naoAchou);

    // A linha de B continua intacta (lida pelo admin).
    const [linhaDeB] = await admin.$queryRawUnsafe("SELECT status, pending_reason, decided_by_user_id FROM operational_approvals WHERE id = $1::uuid", b.aprovacao);
    assert.deepEqual(
      { status: linhaDeB.status, motivo: linhaDeB.pending_reason, decisor: linhaDeB.decided_by_user_id },
      { status: "pending_approval", motivo: "semente do T5", decisor: null },
    );

    // Controle positivo: o MESMO papel pede, lê e decide a aprovação de A (sem ele, um papel que não lê nada passaria).
    assert.equal((await servico.get(atorDeA, a.aprovacao)).id, a.aprovacao);
    const nova = await servico.request({
      tenantId: a.tenantId,
      entityType: "evidence",
      entityId: "evidencia-t5",
      workOrderId: a.os,
      requestedByUserId: a.solicitante,
      pendingReason: "Evidência pronta para conferência.",
    });
    assert.equal((await servico.approve(atorDeA, nova.id, { note: "Conferido." })).status, "approved");
    assert.equal((await servico.approve(atorDeA, a.aprovacao, {})).status, "approved");
  });
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
