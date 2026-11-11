import "dotenv/config";

import assert from "node:assert/strict";
import test, { after } from "node:test";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { buildApplicationName, withApplicationName } from "./helpers/pg-barrier.js";

// B-O6R-09 · T15, REESCRITA pela Emenda 4 (P6) — enquanto a transação-mãe do despacho está aberta, nenhuma ida ao banco
// do caminho usa outra conexão: o despacho conclui com o cliente GLOBAL de 1 conexão. A versão anterior media o semáforo
// das mães (a mãe segurava 1 conexão e a atribuição pedia OUTRA); a Emenda 4 pôs a atribuição na própria `tx` da mãe, e
// o semáforo saiu junto com o motivo dele.
//
// A técnica é a da T24: este arquivo roda no seu próprio processo e instala, ANTES de carregar qualquer módulo de
// `src/`, o cliente global `new PrismaPg({ connectionString, max: 1 })`; o autocontrole confere que o `prisma` exportado
// é o instalado e que uma 2ª transação, com a 1ª presa, recusa com P2028. Sem DDL no arquivo.
//
// A preparação de cada caso (a OS, o rascunho ou o despacho de partida) usa um cliente de administração à parte, com o
// pool padrão, para que uma recusa só possa nascer no passo medido (C4E-01: no caso reatribuir, o not ok tem de vir da
// REATRIBUIÇÃO, não do preparo). Mutações: M26 (criar e ativar) e M27b ou M26t (reatribuir), P2028 em cerca de 2 s.

const connectionString = process.env.DATABASE_URL;
const APP = buildApplicationName("b-o6r-09-pool");
const POOL_MAX = 1;

if (!connectionString) {
  test("o B-O6R-09 (1 conexão) exige DATABASE_URL", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrações para executar este teste.",
  });
} else {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.DATABASE_URL = withApplicationName(connectionString, APP);
  (globalThis as unknown as { prisma?: PrismaClient }).prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: withApplicationName(connectionString, APP), max: POOL_MAX }),
  });
  const instalado = (globalThis as unknown as { prisma: PrismaClient }).prisma;
  const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: withApplicationName(connectionString, `${APP}-adm`) }) });
  const organizacoes: string[] = [];

  after(async () => {
    for (const tenantId of organizacoes) await teardown(admin, tenantId);
    await instalado.$disconnect();
    await admin.$disconnect();
  });

  test("[arnês] o cliente global é o de 1 conexão, e a 2ª transação presa recusa com P2028", async () => {
    const { prisma } = await import("../src/database/prisma.js");
    assert.equal(prisma, instalado, "arnês: src/database/prisma.ts não devolveu o cliente instalado (o caso mediria outro pool)");
    const gate = { release: () => {} };
    const solta = new Promise<void>((resolve) => {
      gate.release = resolve;
    });
    // A transação presa espera conexão até 15 s (`maxWait`): sob carga, abrir a conexão do pool passou dos 2 s padrão, e
    // a recusa medida tem de ser a da 2ª transação, não a da presa.
    const presa = instalado.$transaction(async () => solta, { timeout: 20_000, maxWait: 15_000 });
    try {
      await esperarTransacaoAberta();
      const inicio = Date.now();
      await assert.rejects(
        () => instalado.$transaction(async () => undefined),
        (error: any) => error?.code === "P2028",
        "arnês: a 2ª transação não recusou com P2028 com o pool de 1 conexão esgotado",
      );
      console.log(`[T15] arnês: a 2ª transação recusou com P2028 em ${Date.now() - inicio} ms`);
    } finally {
      gate.release();
      await presa;
    }
  });

  async function montar(tag: string) {
    const [{ resolvePermissionsForRoles }, wo, fd, woRepo, fdRepo] = await Promise.all([
      import("../src/modules/core-saas/permissions/catalog.js"),
      import("../src/modules/work-orders/work-order.service.js"),
      import("../src/modules/field-dispatch/field-dispatch.service.js"),
      import("../src/modules/work-orders/work-order-prisma.repository.js"),
      import("../src/modules/field-dispatch/field-dispatch-prisma.repository.js"),
    ]);
    wo.resetWorkOrderRuntimeForTests();
    fd.resetFieldDispatchRuntimeForTests();
    const nucleo = { getUserForTenant: async (id: string, tid: string) => ({ id, tenantId: tid, roles: ["field_technician"] }) };
    // Os serviços MEDIDOS: os padrões, no cliente global de 1 conexão.
    const ordens = await wo.createDefaultWorkOrderService();
    const despachos = await fd.createDefaultFieldDispatchService(nucleo as never);
    // Os serviços da PREPARAÇÃO: os mesmos, ligados ao cliente de administração (pool padrão).
    const ordensPrep = new wo.WorkOrderService(new woRepo.RlsPrismaWorkOrderRepository(admin as never), (ordens as any).references);
    const despachosPrep = new fd.FieldDispatchService(
      new fdRepo.RlsPrismaFieldDispatchRepository(admin as never),
      ordensPrep,
      nucleo as never,
      async () => null,
      async () => {},
      async () => {},
      fd.buildWorkOrderChecklistSetPort(ordensPrep),
      async () => false,
    );
    const sufixo = `${tag}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const tenant = await admin.tenant.create({ data: { name: `B-O6R-09 pool ${sufixo}`, slug: `b-o6r-09-pool-${sufixo}` } });
    organizacoes.push(tenant.id);
    const usuario = async (n: string) =>
      (await admin.user.create({ data: { tenant_id: tenant.id, name: `${n} ${sufixo}`, email: `b-o6r-09-pool-${n}-${sufixo}@example.com` } })).id;
    const gestorId = await usuario("gestor");
    const tecA = await usuario("tec-a");
    const tecB = await usuario("tec-b");
    const gestao = { tenantId: tenant.id, userId: gestorId, roles: ["manager"], permissions: resolvePermissionsForRoles(["manager"]), explicitPermissions: true } as never;
    const os = (await ordensPrep.create(gestao, { title: `OS pool ${tag}` })).id;
    return { tenantId: tenant.id, gestao, despachos, despachosPrep, os, tecA, tecB };
  }

  async function totais(tenantId: string, os: string) {
    const [linha] = (await admin.$queryRawUnsafe(
      `SELECT (SELECT count(*)::int FROM field_dispatches WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid) AS despachos,
              (SELECT assigned_user_id::text FROM work_orders WHERE tenant_id = $1::uuid AND id = $2::uuid) AS tecnico,
              (SELECT count(*)::int FROM work_order_assignments a
                WHERE a.tenant_id = $1::uuid AND a.work_order_id = $2::uuid
                  AND NOT EXISTS (SELECT 1 FROM field_dispatches d WHERE d.tenant_id = a.tenant_id AND d.id::text = a.metadata->>'dispatchId')) AS orfas`,
      tenantId,
      os,
    )) as Array<{ despachos: number; tecnico: string | null; orfas: number }>;
    return { despachos: linha.despachos, tecnico: linha.tecnico, orfas: linha.orfas };
  }

  const medir = async <T>(rotulo: string, passo: () => Promise<T>): Promise<T> => {
    const inicio = Date.now();
    try {
      const valor = await passo();
      console.log(`[T15] ${rotulo}: concluiu em ${Date.now() - inicio} ms`);
      return valor;
    } catch (error) {
      const e = error as { code?: unknown; message?: unknown };
      assert.fail(`${rotulo} recusou com 1 conexão em ${Date.now() - inicio} ms (a mãe pediu uma 2ª conexão?): ${String(e?.code ?? "")} ${String(e?.message ?? error).slice(0, 200)}`);
    }
  };

  test("[P6 · 1 conexão] criar: conclui; 1 despacho, a OS com o técnico, 0 atribuição órfã", { timeout: 30_000 }, async () => {
    const f = await montar("criar");
    await medir("criar", () => f.despachos.create(f.gestao, { workOrderId: f.os, operatorUserId: f.tecA }));
    assert.deepEqual(await totais(f.tenantId, f.os), { despachos: 1, tecnico: f.tecA, orfas: 0 });
  });

  test("[P6 · 1 conexão] ativar rascunho: conclui; 1 despacho, a OS com o técnico, 0 atribuição órfã", { timeout: 30_000 }, async () => {
    const f = await montar("ativar");
    const rascunho = await f.despachosPrep.create(f.gestao, { workOrderId: f.os, operatorUserId: f.tecA, status: "draft" });
    assert.deepEqual(await totais(f.tenantId, f.os), { despachos: 1, tecnico: null, orfas: 0 }, "preparo: o rascunho não atribui");
    await medir("ativar rascunho", () => f.despachos.changeStatus(f.gestao, rascunho.id, { status: "assigned" }));
    assert.deepEqual(await totais(f.tenantId, f.os), { despachos: 1, tecnico: f.tecA, orfas: 0 });
  });

  test("[P6 · 1 conexão] reatribuir: conclui; 1 despacho, a OS com o técnico novo, 0 atribuição órfã", { timeout: 30_000 }, async () => {
    const f = await montar("reatribuir");
    const d = await f.despachosPrep.create(f.gestao, { workOrderId: f.os, operatorUserId: f.tecA });
    assert.deepEqual(await totais(f.tenantId, f.os), { despachos: 1, tecnico: f.tecA, orfas: 0 }, "preparo: o despacho de partida com A");
    await medir("reatribuir", () => f.despachos.reassign(f.gestao, d.id, { operatorUserId: f.tecB }));
    assert.deepEqual(await totais(f.tenantId, f.os), { despachos: 1, tecnico: f.tecB, orfas: 0 });
  });

  // A transação presa é do cliente global deste processo: contada pelo `application_name` dele (as suítes irmãs rodam
  // em paralelo no mesmo banco), no estado `idle in transaction`.
  async function esperarTransacaoAberta(limiteMs = 10_000): Promise<void> {
    const inicio = Date.now();
    for (;;) {
      const [{ n }] = (await admin.$queryRawUnsafe(
        "SELECT count(*)::int AS n FROM pg_stat_activity WHERE application_name = $1 AND state = 'idle in transaction'",
        APP,
      )) as Array<{ n: number }>;
      if (n >= 1) return;
      if (Date.now() - inicio > limiteMs) assert.fail(`arnês: esperando a transação aberta no cliente global há ${Date.now() - inicio} ms`);
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
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
}
