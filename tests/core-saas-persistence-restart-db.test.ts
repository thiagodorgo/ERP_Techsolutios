import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

// B-O6R-05 (Ω6R-DAT-001) — a PROVA do dano: com `CORE_SAAS_PERSISTENCE=memory`, o agregado
// core-saas (organizações, usuários, papéis/vínculos e a auditoria desse agregado) não sobrevive
// a um reinício do processo. Em produção isso é perda de identidade e de autorização.
//
// A primitiva: INSTÂNCIA NOVA DE SERVIÇO = PROCESSO NOVO (mesmo molde de `health-routes.test.ts`).
// Grava com uma instância, lê com outra, construída do zero.
//
// DUAS DECISÕES DE DESENHO QUE A JUNTA EXIGIU E QUE NÃO PODEM SER "SIMPLIFICADAS":
//
// 1. NÃO usar `createCoreSaasService()`. Este arquivo roda em DOIS lugares — no job `backend`, onde
//    `CORE_SAAS_PERSISTENCE=memory` está CONGELADO no ambiente (ci.yml), e no subconjunto contra o
//    Postgres. A fábrica devolveria o adapter de MEMÓRIA no job `backend` e a metade prisma
//    quebraria. Por isso as metades instanciam `PrismaCoreSaasService` e `MemoryCoreSaasAdapter`
//    DIRETAMENTE, sem consultar a variável de ambiente.
//
// 2. TEARDOWN EM ORDEM DE CHAVE ESTRANGEIRA. `PrismaCoreSaasStore.createTenant` grava a auditoria
//    `tenant.created` DENTRO da mesma transação. Apagar a organização primeiro deixaria a FK viva e
//    o `finally` falharia. Ordem: audit_logs → vínculos → usuários → organizações, tudo ESCOPADO
//    pelos ids criados aqui, com asserção de contagem. NUNCA `deleteMany` por curinga.

const connectionString = process.env.DATABASE_URL;

test("memória: uma instância NOVA de serviço não enxerga a organização gravada (Ω6R-DAT-001)", async () => {
  const [{ CoreSaasRegistry }, { MemoryCoreSaasAdapter }, { InMemoryCoreSaasStore }] =
    await Promise.all([
      import("../src/modules/core-saas/services/core-saas.service.js"),
      import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
      import("../src/modules/core-saas/store/core-saas.store.js"),
    ]);

  const before = new MemoryCoreSaasAdapter(new CoreSaasRegistry(new InMemoryCoreSaasStore()));
  const tenant = await before.createTenant({ name: `Reinício Memória ${randomUUID()}` });

  assert.ok(tenant.id);
  // Mesmo processo, mesma classe, estado novo — é exatamente o que um restart faz com `memory`.
  const afterRestart = new MemoryCoreSaasAdapter(new CoreSaasRegistry(new InMemoryCoreSaasStore()));

  await assert.rejects(
    () => afterRestart.getTenantForActor(tenant.id, tenant.id),
    (error: unknown) => {
      const failure = error as { statusCode?: number; reason?: string };
      assert.equal(failure.statusCode, 404);
      assert.equal(failure.reason, "tenant_not_found");

      return true;
    },
  );
});

if (!connectionString) {
  test("As metades prisma exigem DATABASE_URL e um PostgreSQL migrado", {
    skip: "Defina DATABASE_URL e rode as migrations para executar as metades prisma deste arquivo.",
  });
} else {
  test("prisma: uma instância NOVA de serviço LÊ a organização gravada", async () => {
    await withPrismaCoreSaas(async (context) => {
      const name = `Reinício Prisma ${randomUUID()}`;
      const created = await context.writer.createTenant({ name });
      context.track(created.id);

      // Serviço novo, store novo, PrismaClient novo — nada de estado compartilhado em processo.
      const reader = await context.newReaderService();
      const read = await reader.getTenantForActor(created.id, created.id);

      assert.equal(read.id, created.id);
      assert.equal(read.name, name);
      assert.equal(read.status, created.status);
    });
  });

  test("prisma: a criação grava a auditoria na MESMA transação (o motivo da ordem do teardown)", async () => {
    await withPrismaCoreSaas(async (context) => {
      const created = await context.writer.createTenant({ name: `Auditoria ${randomUUID()}` });
      context.track(created.id);

      const auditRows = await context.client.auditLog.count({
        where: { tenant_id: created.id },
      });

      assert.ok(auditRows >= 1, "criar organização precisa deixar trilha de auditoria persistida");
    });
  });

  test("prisma: ler um id inexistente devolve 404 — a leitura vai mesmo ao banco", async () => {
    await withPrismaCoreSaas(async (context) => {
      const reader = await context.newReaderService();
      const absentId = randomUUID();

      await assert.rejects(
        () => reader.getTenantForActor(absentId, absentId),
        (error: unknown) => {
          const failure = error as { statusCode?: number; reason?: string };
          assert.equal(failure.statusCode, 404);
          assert.equal(failure.reason, "tenant_not_found");

          return true;
        },
      );
    });
  });

  test("o MESMO roteiro separa as duas persistências: prisma mantém, memória perde", async () => {
    const [{ CoreSaasRegistry }, { MemoryCoreSaasAdapter }, { InMemoryCoreSaasStore }] =
      await Promise.all([
        import("../src/modules/core-saas/services/core-saas.service.js"),
        import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
        import("../src/modules/core-saas/store/core-saas.store.js"),
      ]);

    const survived: Record<string, boolean> = {};

    await withPrismaCoreSaas(async (context) => {
      const created = await context.writer.createTenant({ name: `Roteiro Prisma ${randomUUID()}` });
      context.track(created.id);
      const reader = await context.newReaderService();
      survived.prisma = await tenantSurvives(() => reader.getTenantForActor(created.id, created.id));
    });

    const memoryWriter = new MemoryCoreSaasAdapter(new CoreSaasRegistry(new InMemoryCoreSaasStore()));
    const memoryTenant = await memoryWriter.createTenant({ name: `Roteiro Memória ${randomUUID()}` });
    const memoryReader = new MemoryCoreSaasAdapter(new CoreSaasRegistry(new InMemoryCoreSaasStore()));
    survived.memory = await tenantSurvives(() =>
      memoryReader.getTenantForActor(memoryTenant.id, memoryTenant.id),
    );

    // É ESTA linha que o gate G1 protege em produção.
    assert.deepEqual(survived, { prisma: true, memory: false });
  });

  test("o teardown remove EXATAMENTE o que este arquivo criou, e nada além", async () => {
    const client = await newPrismaClient();
    let sentinelId = "";
    let createdId = "";

    try {
      // VIZINHO DE BANCADA: gravado de propósito FORA do conjunto rastreado. É ele que prova o
      // "e nada além" — um teardown por curinga o levaria junto. Contagem GLOBAL não serviria:
      // outras suítes escrevem nesta mesma base em paralelo, e o repo já foi mordido por
      // sentinela global poluída por paralelismo.
      await withPrismaCoreSaas(async (context) => {
        const sentinel = await context.writer.createTenant({ name: `Vizinho ${randomUUID()}` });
        sentinelId = sentinel.id;
      });

      await withPrismaCoreSaas(async (context) => {
        const created = await context.writer.createTenant({ name: `Faxina ${randomUUID()}` });
        context.track(created.id);
        createdId = created.id;

        assert.equal(await client.tenant.count({ where: { id: created.id } }), 1);
        assert.ok((await client.auditLog.count({ where: { tenant_id: created.id } })) >= 1);
      });

      // Depois do `finally` do helper: resíduo zero do que foi rastreado…
      assert.equal(await client.tenant.count({ where: { id: createdId } }), 0);
      assert.equal(await client.auditLog.count({ where: { tenant_id: createdId } }), 0);
      // …e o vizinho intocado, com a auditoria dele.
      assert.equal(await client.tenant.count({ where: { id: sentinelId } }), 1);
      assert.ok((await client.auditLog.count({ where: { tenant_id: sentinelId } })) >= 1);
    } finally {
      if (sentinelId) {
        await client.auditLog.deleteMany({ where: { tenant_id: sentinelId } });
        await client.userRoleAssignment.deleteMany({ where: { tenant_id: sentinelId } });
        await client.user.deleteMany({ where: { tenant_id: sentinelId } });
        await client.tenant.deleteMany({ where: { id: sentinelId } });
        assert.equal(await client.tenant.count({ where: { id: sentinelId } }), 0);
      }

      await client.$disconnect();
    }
  });
}

async function tenantSurvives(read: () => Promise<unknown>): Promise<boolean> {
  try {
    await read();

    return true;
  } catch {
    return false;
  }
}

type PrismaCoreSaasContext = {
  readonly client: Awaited<ReturnType<typeof newPrismaClient>>;
  readonly writer: { createTenant(input: { name: string }): Promise<{ id: string; name: string; status: string }> };
  readonly newReaderService: () => Promise<{
    getTenantForActor(tenantId: string, actorTenantId: string): Promise<{ id: string; name: string; status: string }>;
  }>;
  readonly track: (tenantId: string) => void;
};

async function newPrismaClient() {
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { PrismaClient } = await import("@prisma/client");

  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

/**
 * Constrói o serviço prisma DIRETAMENTE (sem `createCoreSaasService()`, que obedeceria à variável
 * de ambiente) e garante o teardown escopado em ordem de FK.
 */
async function withPrismaCoreSaas(
  callback: (context: PrismaCoreSaasContext) => Promise<void>,
): Promise<void> {
  process.env.LOG_LEVEL = "silent";

  const [{ PrismaCoreSaasService }, { PrismaCoreSaasStore }, repositories] = await Promise.all([
    import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
    import("../src/modules/core-saas/store/prisma-core-saas.store.js"),
    import("../src/modules/core-saas/repositories/index.js"),
  ]);

  const buildService = async () => {
    const client = await newPrismaClient();
    const service = new PrismaCoreSaasService(
      new PrismaCoreSaasStore(
        client,
        new repositories.TenantRepository(client),
        new repositories.UserRepository(client),
        new repositories.RoleRepository(client),
        new repositories.UserRoleRepository(client),
        new repositories.AuditLogRepository(client),
      ),
    );

    return { client, service };
  };

  const writerSide = await buildService();
  const readerClients: Awaited<ReturnType<typeof newPrismaClient>>[] = [];
  const tenantIds: string[] = [];

  try {
    await callback({
      client: writerSide.client,
      writer: writerSide.service as PrismaCoreSaasContext["writer"],
      newReaderService: async () => {
        const readerSide = await buildService();
        readerClients.push(readerSide.client);

        return readerSide.service as Awaited<ReturnType<PrismaCoreSaasContext["newReaderService"]>>;
      },
      track: (tenantId) => {
        tenantIds.push(tenantId);
      },
    });
  } finally {
    if (tenantIds.length > 0) {
      // ORDEM DE CHAVE ESTRANGEIRA, escopada por id. Nunca curinga: esta base é viva.
      await writerSide.client.auditLog.deleteMany({ where: { tenant_id: { in: tenantIds } } });
      await writerSide.client.userRoleAssignment.deleteMany({ where: { tenant_id: { in: tenantIds } } });
      await writerSide.client.user.deleteMany({ where: { tenant_id: { in: tenantIds } } });
      await writerSide.client.tenant.deleteMany({ where: { id: { in: tenantIds } } });

      assert.equal(
        await writerSide.client.tenant.count({ where: { id: { in: tenantIds } } }),
        0,
        "teardown deixou organização para trás",
      );
      assert.equal(
        await writerSide.client.auditLog.count({ where: { tenant_id: { in: tenantIds } } }),
        0,
        "teardown deixou auditoria para trás",
      );
    }

    await Promise.all(readerClients.map((client) => client.$disconnect()));
    await writerSide.client.$disconnect();
  }
}
