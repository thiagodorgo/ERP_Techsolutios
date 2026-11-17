import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";

import {
  assertApplicationNamePropagated,
  buildApplicationName,
  countBlockedStatements,
  dropHarnessObjects,
  runHarnessDdl,
  waitForOwnAdvisoryWaiters,
  withApplicationName,
} from "./helpers/pg-barrier.js";

// B-APROVACOES-DURAVEIS (item 67 do portão; plano §4.1 T4; critério 5) — DUAS DECISÕES SIMULTÂNEAS SOBRE A MESMA
// APROVAÇÃO: exatamente 1 aceita e 1 recusada com 409 `approval_already_decided`; 1 decisão na linha; 1 linha de
// auditoria de decisão. 20 repetições.
//
// A barreira é determinística, sem relógio: um gatilho TEMPORÁRIO `BEFORE UPDATE` na tabela, escopado pela organização
// descartável, pede uma trava consultiva que o teste segura. Quem chega 1º à linha a trava (o Postgres trava a tupla antes
// do gatilho de linha) e fica preso no gatilho; o 2º fica preso na trava da linha. Só então o teste solta: o 1º commita,
// e o 2º re-avalia o predicado do CAS (`status = 'pending_approval'`) contra a linha já decidida (READ COMMITTED) e casa
// 0 linhas. Sem o CAS (mutação M2), o 2º também grava: 2 sucessos. Esperas só pelo `pg-barrier.ts`, pelo
// `application_name` desta suíte. Sem DATABASE_URL, o arquivo se declara pulado.

const baseConnection = process.env.DATABASE_URL;
const APP = buildApplicationName("b-aprov-concorrencia");
if (baseConnection) process.env.DATABASE_URL = withApplicationName(baseConnection, APP);
const REPETICOES = 20;

if (!baseConnection) {
  test("o B-APROVACOES-DURAVEIS (decisão em corrida) no Postgres exige DATABASE_URL", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrações para executar este teste.",
  });
} else {
  const connection = baseConnection;
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "prisma";

  after(async () => {
    const { prisma } = await import("../src/database/prisma.js");
    await prisma.$disconnect();
  });

  test("[arnês] o application_name da suíte chega ao backend", async () => {
    const { prisma } = await import("../src/database/prisma.js");
    await assertApplicationNamePropagated(prisma, APP);
  });

  test(`T4 · aprovar × reprovar ao mesmo tempo, 2 decisores: 1 sucesso e 1 409 approval_already_decided, ${REPETICOES} repetições`, async () => {
    await comCenario(connection, async (c) => {
      await c.comBarreiraNaDecisao(async (prender) => {
        for (let rodada = 0; rodada < REPETICOES; rodada += 1) {
          const aprovacao = await c.pedido();
          const { soltar } = await prender();
          const aprovar = captura(c.servico.approve(c.ator(c.decisorA), aprovacao, { note: "Conferido." }));
          const reprovar = captura(c.servico.reject(c.ator(c.decisorB), aprovacao, { reason: "Foto obrigatória ausente." }));
          await waitForOwnAdvisoryWaiters(c.admin, { applicationName: APP, lockKey: c.chave, minWaiters: 1, label: `rodada ${rodada}: o 1º preso no gatilho` });
          // Os DOIS UPDATE da suíte presos: o 1º na trava consultiva (dentro do gatilho), o 2º na trava da linha.
          await esperarBloqueados(c.admin, 2, `rodada ${rodada}: o 2º preso na linha`);
          await soltar();
          const desfechos = [await aprovar, await reprovar];

          const sucessos = desfechos.filter((d) => d.ok);
          const recusas = desfechos.filter((d) => !d.ok);
          assert.equal(sucessos.length, 1, `rodada ${rodada}: ${sucessos.length} sucessos (${JSON.stringify(desfechos.map((d) => d.resumo))})`);
          assert.equal(recusas.length, 1);
          assert.deepEqual(
            { status: recusas[0].statusCode, reason: recusas[0].reason },
            { status: 409, reason: "approval_already_decided" },
            `rodada ${rodada}: a recusa não foi o 409 da decisão já gravada`,
          );

          const [linha] = await c.sql("SELECT status, decided_by_user_id::text AS decisor FROM operational_approvals WHERE tenant_id = $1::uuid AND id = $2::uuid", [c.tenantId, aprovacao]);
          assert.deepEqual({ status: linha.status, decisor: linha.decisor }, { status: sucessos[0].status, decisor: sucessos[0].decisor }, `rodada ${rodada}: a linha não é a do vencedor`);
          const [{ n }] = await c.sql(
            "SELECT count(*)::int AS n FROM audit_logs WHERE tenant_id = $1::uuid AND action IN ('approval.approved', 'approval.rejected') AND metadata->>'approvalId' = $2",
            [c.tenantId, aprovacao],
          );
          assert.equal(n, 1, `rodada ${rodada}: ${n} linhas de auditoria de decisão para 1 decisão`);
        }
      });
    });
  });
}

// ---------------------------------------------------------------------------------------------------------------------

async function esperarBloqueados(admin: any, minimo: number, rotulo: string): Promise<void> {
  const prazo = Date.now() + 15_000;
  for (;;) {
    const n = await countBlockedStatements(admin, { fragment: "operational_approvals", applicationName: APP });
    if (n >= minimo) return;
    if (Date.now() > prazo) assert.fail(`timeout esperando ${minimo} UPDATE presos em operational_approvals — ${rotulo} (presos: ${n})`);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

type Desfecho = {
  readonly ok: boolean;
  readonly status?: string;
  readonly decisor?: string;
  readonly statusCode?: number;
  readonly reason?: string;
  readonly resumo: string;
};

function captura(promessa: Promise<{ status: string; decidedByUserId?: string }>): Promise<Desfecho> {
  return promessa.then(
    (a) => ({ ok: true, status: a.status, decisor: a.decidedByUserId, resumo: `ok ${a.status}` }),
    (erro: { statusCode?: number; reason?: string; message?: string }) => ({
      ok: false,
      statusCode: erro.statusCode,
      reason: erro.reason,
      resumo: `erro ${erro.statusCode ?? "?"} ${erro.reason ?? String(erro.message ?? "").slice(0, 120)}`,
    }),
  );
}

async function montarCenario(connection: string) {
  const [{ createPrismaClient }, { resolvePermissionsForRoles }, approvals, { Client }] = await Promise.all([
    import("../src/database/pg-connection.js"),
    import("../src/modules/core-saas/permissions/catalog.js"),
    import("../src/modules/work-orders/approval.service.js"),
    import("pg"),
  ]);
  const admin: any = createPrismaClient(withApplicationName(connection, `${APP}-adm`));
  const sufixo = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const tenant = await admin.tenant.create({ data: { name: `B-APROV corrida ${sufixo}`, slug: `b-aprov-race-${sufixo}` } });
  const tenantId: string = tenant.id;
  const usuario = (nome: string) =>
    admin.user.create({ data: { tenant_id: tenantId, name: `${nome} ${sufixo}`, email: `b-aprov-race-${nome}-${sufixo}@example.com` } });
  const [solicitante, decisorA, decisorB] = [await usuario("solicitante"), await usuario("decisor-a"), await usuario("decisor-b")];

  approvals.resetApprovalRuntimeForTests();
  const servico = await approvals.createDefaultApprovalService();
  const permissoes = resolvePermissionsForRoles(["manager"]);
  const sql = async (texto: string, params: readonly unknown[] = []): Promise<any[]> => admin.$queryRawUnsafe(texto, ...params);
  const chave = `b-aprov-decisao-${tenantId}`;
  let sequencia = 0;

  // O gatilho fica de pé o caso inteiro (1 DDL de cada lado, não 1 por rodada); a trava consultiva é segura e solta a cada
  // rodada por uma conexão do TESTE. A trava é solta ANTES de o gatilho cair: um DROP TRIGGER com alguém preso dentro dele
  // esperaria por quem está preso, e quem está preso espera a trava.
  async function comBarreiraNaDecisao(corpo: (prender: () => Promise<{ soltar: () => Promise<void> }>) => Promise<void>): Promise<void> {
    const nome = `b_aprov_bar_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const trava = new Client({ connectionString: withApplicationName(connection, `${APP}-trava`) });
    await trava.connect();
    let presa = false;
    const soltar = async () => {
      if (!presa) return;
      presa = false;
      await trava.query("SELECT pg_advisory_unlock(hashtext($1))", [chave]);
    };
    await runHarnessDdl(admin, `CREATE FUNCTION ${nome}() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN PERFORM pg_advisory_xact_lock(hashtext('${chave}')); RETURN NEW; END $f$`);
    let erroDoCorpo: unknown;
    try {
      await runHarnessDdl(
        admin,
        `CREATE TRIGGER ${nome} BEFORE UPDATE ON operational_approvals FOR EACH ROW WHEN (NEW.tenant_id = '${tenantId}'::uuid) EXECUTE FUNCTION ${nome}()`,
      );
      await corpo(async () => {
        await trava.query("SELECT pg_advisory_lock(hashtext($1))", [chave]);
        presa = true;
        return { soltar };
      });
    } catch (error) {
      erroDoCorpo = error;
    } finally {
      await soltar().catch(() => undefined);
      await trava.end();
      await dropHarnessObjects(admin, erroDoCorpo, [`DROP TRIGGER IF EXISTS ${nome} ON operational_approvals`, `DROP FUNCTION IF EXISTS ${nome}()`]);
    }
    if (erroDoCorpo !== undefined) throw erroDoCorpo;
    const [{ gatilhos }] = await sql("SELECT count(*)::int AS gatilhos FROM pg_trigger WHERE tgname = $1", [nome]);
    assert.equal(gatilhos, 0, `o gatilho ${nome} sobrou no catálogo`);
  }

  return {
    admin,
    tenantId,
    decisorA: decisorA.id as string,
    decisorB: decisorB.id as string,
    chave,
    servico,
    sql,
    comBarreiraNaDecisao,
    ator: (userId: string) => ({ tenantId, userId, roles: ["manager"], permissions: permissoes, explicitPermissions: true }) as never,
    async pedido(): Promise<string> {
      sequencia += 1;
      const os = await admin.workOrder.create({
        data: { tenant_id: tenantId, code: `WO-BAPROV-RACE-${sufixo}-${sequencia}`, title: "OS B-APROV corrida", customer_name: "Cliente B-APROV", status: "completed" },
      });
      const aprovacao = await servico.request({
        tenantId,
        entityType: "work_order",
        entityId: os.id,
        workOrderId: os.id,
        requestedByUserId: solicitante.id,
        pendingReason: "Ordem de servico concluida e pronta para validacao operacional.",
      });
      return aprovacao.id;
    },
  };
}

type Cenario = Awaited<ReturnType<typeof montarCenario>>;

async function comCenario(connection: string, callback: (c: Cenario) => Promise<void>): Promise<void> {
  const c = await montarCenario(connection);
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
