import "dotenv/config";

import assert from "node:assert/strict";
import test, { after } from "node:test";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { buildApplicationName, withApplicationName } from "./helpers/pg-barrier.js";

// B-O6R-09 · T24 (emenda 1 §1.5; EM1-05 da crítica da emenda 1, texto da emenda 1.1) — dentro da transação da aprovação
// só há escritas pela própria `tx`: as leituras de validação ficam ANTES, em `prepareCreate`. A guarda tem de medir o
// pool que importa — o do cliente GLOBAL (`src/database/prisma.ts`), que o repositório de orçamento e as leituras do
// `prepareCreate` usam. Por isso este arquivo roda no seu próprio processo e instala, ANTES de carregar qualquer módulo
// do sistema, um cliente global de 2 conexões. Todo módulo de `src/` entra por import dinâmico, depois desta linha.
//
// Autocontrole do arnês (antes do caso): o `prisma` exportado é o instalado; e, com 2 transações presas nele, uma 3ª
// recusa com P2028 (o fato medido pelo R2-04). O caso: 4 orçamentos em 4 organizações, aprovados juntos → 4 OS, 0 P2028.
// Sob a MQ7 (as leituras do `prepareCreate` dentro da transação), espera-se P2028 em cerca de 2 s — HIPÓTESE do plano,
// medida no diário do dev.

const connectionString = process.env.DATABASE_URL;
const POOL_MAX = 2;
const ORCAMENTOS = 4;
const PRAZO_MS = 20_000;
const APP = buildApplicationName("b-o6r-09-quote-pool");

if (!connectionString) {
  test("o B-O6R-09 (pool do orçamento) exige DATABASE_URL", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrações para executar este teste.",
  });
} else {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  (globalThis as unknown as { prisma?: PrismaClient }).prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: withApplicationName(connectionString, APP), max: POOL_MAX }),
  });
  const instalado = (globalThis as unknown as { prisma: PrismaClient }).prisma;
  const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  after(async () => {
    await instalado.$disconnect();
    await admin.$disconnect();
  });

  test("[arnês] o cliente global é o de 2 conexões, e a 3ª transação presa recusa com P2028", async () => {
    const { prisma } = await import("../src/database/prisma.js");
    assert.equal(prisma, instalado, "arnês: src/database/prisma.ts não devolveu o cliente instalado (o caso mediria outro pool)");
    const gate = { release: () => {} };
    const solta = new Promise<void>((resolve) => {
      gate.release = resolve;
    });
    // As presas esperam conexão até 15 s (`maxWait`): sob carga, abrir a conexão do pool passou dos 2 s padrão (medido no
    // R-ARN-5 da Emenda 4), e a recusa medida tem de ser a da 3ª transação, não a de uma presa.
    const presas = [0, 1].map(() => instalado.$transaction(async () => solta, { timeout: PRAZO_MS, maxWait: 15_000 }));
    try {
      await esperarTransacoesAbertas(2);
      const inicio = Date.now();
      await assert.rejects(
        () => instalado.$transaction(async () => undefined),
        (error: any) => error?.code === "P2028",
        "arnês: a 3ª transação não recusou com P2028 com o pool esgotado",
      );
      console.log(`[T24] arnês: a 3ª transação recusou com P2028 em ${Date.now() - inicio} ms`);
    } finally {
      gate.release();
      await Promise.all(presas);
    }
  });

  test("[pool] cliente global max:2; 4 orçamentos em 4 organizações, aprovados juntos → 4 OS, 0 P2028", { timeout: PRAZO_MS * 3 }, async () => {
    const [{ resolvePermissionsForRoles }, sq] = await Promise.all([
      import("../src/modules/core-saas/permissions/catalog.js"),
      import("../src/modules/service-quotes/service-quote.service.js"),
    ]);
    sq.resetServiceQuoteRuntimeForTests();
    const svc = await sq.createDefaultServiceQuoteService();
    const sufixo = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const organizacoes: Array<{ tenantId: string; quoteId: string; ator: never }> = [];
    try {
      for (let i = 0; i < ORCAMENTOS; i += 1) {
        const tenant = await admin.tenant.create({ data: { name: `B-O6R-09 pool q ${i} ${sufixo}`, slug: `b-o6r-09-poolq-${i}-${sufixo}` } });
        const user = await admin.user.create({ data: { tenant_id: tenant.id, name: `Gestor ${i}`, email: `b-o6r-09-poolq-${i}-${sufixo}@example.com` } });
        const [{ id: catalogId }] = (await admin.$queryRawUnsafe(
          "INSERT INTO service_catalog (tenant_id, name, requires_destination) VALUES ($1::uuid, $2, false) RETURNING id::text",
          tenant.id,
          `Serviço ${i}`,
        )) as Array<{ id: string }>;
        const [{ id: quoteId }] = (await admin.$queryRawUnsafe(
          `INSERT INTO service_quotes (tenant_id, service_catalog_id, frozen_unit_price, frozen_total, quantity, price_source, status)
           VALUES ($1::uuid, $2::uuid, 100, 100, 1, 'manual', 'draft') RETURNING id::text`,
          tenant.id,
          catalogId,
        )) as Array<{ id: string }>;
        organizacoes.push({
          tenantId: tenant.id,
          quoteId,
          ator: { tenantId: tenant.id, userId: user.id, roles: ["manager"], permissions: resolvePermissionsForRoles(["manager"]) } as never,
        });
      }

      const inicio = Date.now();
      const desfechos = await Promise.allSettled(organizacoes.map((o) => svc.approve(o.ator, o.quoteId, {})));
      const duracao = Date.now() - inicio;
      const recusas = desfechos
        .filter((d): d is PromiseRejectedResult => d.status === "rejected")
        .map((d) => `${String(d.reason?.code ?? "")} ${String(d.reason?.message ?? d.reason).slice(0, 140)}`);
      console.log(`[T24] ${ORCAMENTOS} aprovações em ${duracao} ms; recusas = ${recusas.length}`);
      assert.deepEqual(recusas, [], "aprovação recusada com o pool de 2 conexões (a transação pediu uma 2ª conexão?)");
      assert.ok(duracao < PRAZO_MS, `as aprovações passaram do prazo (${duracao} ms)`);
      for (const o of organizacoes) {
        const [{ n }] = (await admin.$queryRawUnsafe("SELECT count(*)::int AS n FROM work_orders WHERE tenant_id = $1::uuid", o.tenantId)) as Array<{ n: number }>;
        assert.equal(n, 1, `a organização ${o.tenantId} ficou com ${n} OS`);
      }
    } finally {
      for (const o of organizacoes) await teardown(admin, o.tenantId);
    }
  });

  // As transações presas são do cliente global deste processo: contadas pelo `application_name` dele (as suítes irmãs
  // rodam em paralelo no mesmo banco), no estado `idle in transaction`.
  async function esperarTransacoesAbertas(minimo: number, limiteMs = 10_000): Promise<void> {
    const inicio = Date.now();
    for (;;) {
      const [{ n }] = (await admin.$queryRawUnsafe(
        "SELECT count(*)::int AS n FROM pg_stat_activity WHERE application_name = $1 AND state = 'idle in transaction'",
        APP,
      )) as Array<{ n: number }>;
      if (n >= minimo) return;
      if (Date.now() - inicio > limiteMs) assert.fail(`arnês: esperando ${minimo} transações abertas no cliente global há ${Date.now() - inicio} ms (vistas: ${n})`);
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
