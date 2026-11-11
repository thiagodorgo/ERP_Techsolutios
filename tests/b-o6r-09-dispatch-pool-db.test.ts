import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";

import { buildApplicationName, captureSettled, withApplicationName } from "./helpers/pg-barrier.js";

// B-O6R-09 · T15 (R-POOL do plano v2; R2-04 e R2-07 da crítica r2) — a transação-mãe segura 1 conexão do pool
// enquanto a atribuição da OS pede OUTRA. Sem limite, N ≥ `max` mães simultâneas esgotariam o pool: o fato medido pela
// crítica r2 (Prisma 7.8 + PrismaPg) é que a `$transaction` que não acha conexão falha com P2028 em cerca de 2 s
// (`maxWait` padrão) — a recusa é limpa, não órfã. O semáforo do repositório (capacidade injetável) mantém k < `max`.
//
// O caso: um `PrismaClient` PRÓPRIO com `max: 3`, os repositórios de despacho e de OS ligados a ele e capacidade 1; 5
// criações simultâneas em 5 OS distintas, com 5 técnicos distintos (R2-07: nenhum caso afirma dois despachos ativos do
// mesmo técnico na mesma OS, `D-PORTAO-7`). Uma trava consultiva segura a 1ª atribuição que chegar (o "atraso" da T14),
// para as mães se sobreporem de verdade. A barreira espera a 1ª atribuição presa OU a 1ª recusa (que só nasce do pool
// esgotado) — com tempo limite e mensagem. Esperado: as 5 concluem, 5 despachos, 5 atribuições, 0 atribuição cujo
// `metadata.dispatchId` não exista em `field_dispatches`. Sob a M15 (sem o semáforo), nem todas concluem, com P2028.

const baseConnection = process.env.DATABASE_URL;
const APP = buildApplicationName("b-o6r-09-pool");
if (baseConnection) process.env.DATABASE_URL = withApplicationName(baseConnection, APP);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POOL_MAX = 3;
const CRIACOES = 5;

if (!baseConnection) {
  test("o B-O6R-09 no Postgres exige DATABASE_URL", {
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

  test("[R-POOL] pool max 3, semáforo 1: 5 criações simultâneas em 5 OS e 5 técnicos distintos → as 5 concluem; 5 despachos, 5 atribuições, 0 atribuição órfã", async () => {
    const [{ PrismaPg }, { PrismaClient }, { resolvePermissionsForRoles }, wo, fd, woRepo, fdRepo, { Client }] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
      import("../src/modules/core-saas/permissions/catalog.js"),
      import("../src/modules/work-orders/work-order.service.js"),
      import("../src/modules/field-dispatch/field-dispatch.service.js"),
      import("../src/modules/work-orders/work-order-prisma.repository.js"),
      import("../src/modules/field-dispatch/field-dispatch-prisma.repository.js"),
      import("pg"),
    ]);
    const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: withApplicationName(connection, `${APP}-adm`) }) });
    const adapter = new PrismaPg({ connectionString: withApplicationName(connection, APP), max: POOL_MAX });
    const pequeno = new PrismaClient({ adapter });
    const sufixo = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const tenant = await admin.tenant.create({ data: { name: `B-O6R-09 pool ${sufixo}`, slug: `b-o6r-09-pool-${sufixo}` } });
    const tenantId = tenant.id;
    assert.match(tenantId, UUID);
    const chave = `b-o6r-09-pool-${randomUUID()}`;
    const nome = `b_o6r_09_pool_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const trava = new Client({ connectionString: withApplicationName(connection, `${APP}-trava`) });
    await trava.connect();
    let solta = false;
    const soltar = async () => {
      if (solta) return;
      solta = true;
      await trava.query("SELECT pg_advisory_unlock(hashtext($1))", [chave]);
    };
    try {
      const [{ max_connections }] = (await admin.$queryRawUnsafe("SHOW max_connections")) as Array<{ max_connections: string }>;
      console.log(`[T15] max_connections do servidor = ${max_connections}; pool do teste max = ${POOL_MAX}; semáforo = 1`);
      const usuario = (n: string) =>
        admin.user.create({ data: { tenant_id: tenantId, name: `${n} ${sufixo}`, email: `b-o6r-09-pool-${n}-${sufixo}@example.com` } });
      const gestor = await usuario("gestor");
      const tecnicos = [];
      for (let i = 0; i < CRIACOES; i += 1) tecnicos.push(await usuario(`tecnico-${i}`));

      wo.resetWorkOrderRuntimeForTests();
      fd.resetFieldDispatchRuntimeForTests();
      const padrao = await wo.createDefaultWorkOrderService();
      const ordens = new wo.WorkOrderService(new woRepo.RlsPrismaWorkOrderRepository(pequeno as never), (padrao as any).references);
      const nucleo = { getUserForTenant: async (id: string, tid: string) => ({ id, tenantId: tid, roles: ["field_technician"] }) };
      const despachos = new fd.FieldDispatchService(
        new (fdRepo.RlsPrismaFieldDispatchRepository as any)(pequeno, { heldTxMaxConcurrency: 1 }),
        ordens,
        nucleo as never,
        async () => null,
        async () => {},
        async () => {},
        fd.buildWorkOrderChecklistSetPort(ordens),
        async () => false,
      );
      const gestao = { tenantId, userId: gestor.id, roles: ["manager"], permissions: resolvePermissionsForRoles(["manager"]), explicitPermissions: true } as never;
      const oss: string[] = [];
      for (let i = 0; i < CRIACOES; i += 1) oss.push((await ordens.create(gestao, { title: `OS pool ${i}` })).id);

      await trava.query("SELECT pg_advisory_lock(hashtext($1))", [chave]);
      await admin.$executeRawUnsafe(
        `CREATE FUNCTION ${nome}() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN PERFORM pg_advisory_xact_lock(hashtext('${chave}')); RETURN NEW; END $f$`,
      );
      try {
        await admin.$executeRawUnsafe(
          `CREATE TRIGGER ${nome} BEFORE INSERT ON work_order_assignments FOR EACH ROW WHEN (NEW.tenant_id = '${tenantId}'::uuid) EXECUTE FUNCTION ${nome}()`,
        );
        const inicio = Date.now();
        const pedidos = oss.map((workOrderId, i) => captureSettled(despachos.create(gestao, { workOrderId, operatorUserId: tecnicos[i]!.id })));
        let recusas = 0;
        void Promise.all(pedidos.map(async (p) => ((await p).status === "rejected" ? (recusas += 1) : undefined)));
        await esperar(
          async () => (await atribuicoesPresas(admin, chave)) >= 1 || recusas > 0,
          "a 1ª atribuição presa na trava consultiva, ou a 1ª recusa por pool esgotado",
        );
        await soltar();
        const desfechos = await Promise.all(pedidos);
        const duracaoMs = Date.now() - inicio;
        console.log(`[T15] ${CRIACOES} criações em ${duracaoMs} ms; recusas = ${desfechos.filter((d) => d.status === "rejected").length}`);
        const motivos = desfechos
          .filter((d): d is { status: "rejected"; reason: unknown } => d.status === "rejected")
          .map((d) => String((d.reason as { code?: unknown })?.code ?? "") + " " + String((d.reason as Error)?.message ?? d.reason).slice(0, 160));
        assert.deepEqual(motivos, [], "nem todas as criações concluíram (pool esgotado pela transação-mãe?)");
      } finally {
        await soltar().catch(() => undefined);
        await admin.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${nome} ON work_order_assignments`);
        await admin.$executeRawUnsafe(`DROP FUNCTION IF EXISTS ${nome}()`);
      }
      const [{ gatilhos }] = (await admin.$queryRawUnsafe("SELECT count(*)::int AS gatilhos FROM pg_trigger WHERE tgname = $1", nome)) as Array<{ gatilhos: number }>;
      assert.equal(gatilhos, 0, "o gatilho sobrou no catálogo");

      const [totais] = (await admin.$queryRawUnsafe(
        `SELECT (SELECT count(*)::int FROM field_dispatches WHERE tenant_id = $1::uuid) AS despachos,
                (SELECT count(DISTINCT work_order_id)::int FROM field_dispatches WHERE tenant_id = $1::uuid) AS oss,
                (SELECT count(DISTINCT operator_user_id)::int FROM field_dispatches WHERE tenant_id = $1::uuid) AS tecnicos,
                (SELECT count(*)::int FROM work_order_assignments WHERE tenant_id = $1::uuid) AS atribuicoes,
                (SELECT count(*)::int FROM work_order_assignments a
                  WHERE a.tenant_id = $1::uuid
                    AND NOT EXISTS (SELECT 1 FROM field_dispatches d WHERE d.tenant_id = a.tenant_id AND d.id::text = a.metadata->>'dispatchId')) AS orfas`,
        tenantId,
      )) as Array<Record<string, number>>;
      assert.deepEqual(totais, { despachos: CRIACOES, oss: CRIACOES, tecnicos: CRIACOES, atribuicoes: CRIACOES, orfas: 0 });
    } finally {
      await trava.end();
      await pequeno.$disconnect();
      await teardown(admin, tenantId);
      await admin.$disconnect();
    }
  });
}

async function atribuicoesPresas(client: { $queryRaw: any }, chave: string): Promise<number> {
  const rows = (await client.$queryRaw`
    SELECT count(*)::int AS waiting
      FROM pg_locks l JOIN pg_stat_activity a ON a.pid = l.pid
     WHERE l.locktype = 'advisory' AND l.granted = false AND l.objsubid = 1
       AND l.classid::bigint = ((hashtext(${chave})::bigint >> 32) & 4294967295)
       AND l.objid::bigint = (hashtext(${chave})::bigint & 4294967295)
       AND a.application_name = ${APP}
  `) as Array<{ waiting: number }>;
  return rows[0]?.waiting ?? 0;
}

async function esperar(condicao: () => Promise<boolean>, rotulo: string, limiteMs = 15_000): Promise<void> {
  const inicio = Date.now();
  for (;;) {
    if (await condicao()) return;
    if (Date.now() - inicio > limiteMs) assert.fail(`barreira: esperando ${rotulo} há ${Date.now() - inicio} ms (suíte ${APP})`);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

async function teardown(client: { $queryRawUnsafe: any; $transaction: any }, tenantId: string): Promise<void> {
  const tabelas: Array<{ table_name: string }> = await client.$queryRawUnsafe(
    `SELECT c.table_name FROM information_schema.columns c
       JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
      WHERE c.table_schema = 'public' AND c.column_name = 'tenant_id' AND c.data_type = 'uuid' AND t.table_type = 'BASE TABLE'
      ORDER BY c.table_name`,
  );
  await client.$transaction(async (tx: { $executeRawUnsafe: (sql: string, ...p: unknown[]) => Promise<number> }) => {
    await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
    for (const { table_name } of tabelas) {
      await tx.$executeRawUnsafe(`DELETE FROM "${table_name}" WHERE tenant_id = $1::uuid`, tenantId);
    }
    await tx.$executeRawUnsafe("DELETE FROM tenants WHERE id = $1::uuid", tenantId);
  });
  for (const { table_name } of tabelas) {
    const [{ n }]: Array<{ n: number }> = await client.$queryRawUnsafe(`SELECT count(*)::int AS n FROM "${table_name}" WHERE tenant_id = $1::uuid`, tenantId);
    assert.equal(n, 0, `teardown deixou ${n} linha(s) em ${table_name} da organização descartável`);
  }
}
