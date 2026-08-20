import "dotenv/config";

import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

const connectionString = process.env.DATABASE_URL;

// -----------------------------------------------------------------------------------------------
// B-O6R-02 (Ω6R-DIN-008 / QUA-003) — a corrida CLOSE × WRITER sob Postgres REAL, duas conexões e
// barreira determinística (fila do advisory lock observada em pg_locks, não sleep cego).
//
// O defeito medido: o fechamento tomava advisory lock exclusivo, mas os writers financeiros só
// consultavam isPeriodClosed NOUTRA transação — um writer aprovado podia commitar DEPOIS do
// snapshot, e o período "fechado" continha dinheiro que o snapshot assinado não viu.
// A cura (F1/F2): todo writer toma a MESMA chave em modo SHARED e re-valida o período DENTRO da
// transação que grava (assertPeriodOpenSharedInTx). Este arquivo prova as duas ordens:
//   · G10 — exclusivo na frente: o writer (payTitle REAL, por HTTP com JWT real) BLOQUEIA na trava,
//     o close commita primeiro, o writer sai 422 period_closed e NADA dele sobrevive
//     (snapshot == re-derivação, zero vazado).
//   · G11 — shared na frente (conexão crua segurando a trava + INSERT na mesma tx): o close ESPERA;
//     ao liberar, o snapshot INCLUI o commit do writer.
//
// A LIÇÃO DO #357 (R-B-O6R-01-ci-vermelha): o job `backend` da CI TEM DATABASE_URL e roda com
// CORE_SAAS_PERSISTENCE=memory — pular só por DATABASE_URL faria esta suíte rodar contra os
// internals de MEMÓRIA (onde advisory lock não existe) e "passar". Por isso a suíte FIXA o modo ela
// mesma, antes de qualquer import da aplicação, e CADA teste asserta o modo (drill D7: remover a
// fixação TEM de deixar a suíte vermelha no assert, nunca silenciosamente verde).
//
// Disciplina (lição do ciclo 3 do B-O6R-01): tenant descartável por teste, asserções ESCOPADAS aos
// ids do próprio teste, teardown escopado em ordem de FK — nenhuma sentença sobre a base inteira.
// -----------------------------------------------------------------------------------------------

if (!connectionString) {
  test("Close × writer sob Postgres exige DATABASE_URL e um banco migrado", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suíte.",
  });
} else {
  // ANTES de qualquer import da aplicação (todos abaixo são dinâmicos; o primeiro deles congela
  // src/config/env.ts). Drill D7 remove ESTA linha → o assert de modo em cada teste fica vermelho.
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL = "silent";
  process.env.JWT_SECRET ??= "dev-only-change-me";
  process.env.JWT_EXPIRES_IN ??= "15m";

  test("G10 — close na frente: writer bloqueia na trava, sai 422 period_closed e o snapshot == re-derivação (zero vazado)", async () => {
    const h = await bootstrap(connectionString);
    const { client } = h;
    try {
      const seed = await seedTenant(h, "g10");
      const { tenantId, titleId, accountId, headers } = seed;
      const occurredAt = new Date();
      const period = h.deriveCompetencia(occurredAt);
      const lockKey = `${tenantId}:${period}`;

      // Barreira: uma transação do teste SEGURA o EXCLUSIVO da chave (via o MESMO helper do produto —
      // qualquer drift de expressão quebraria o conflito e este teste), emulando o close parado no
      // meio do evaluate. O close REAL entra na fila ANTES do writer (ordem de fila do Postgres).
      let releaseHold!: () => void;
      const holdReleased = new Promise<void>((resolve) => {
        releaseHold = resolve;
      });
      let signalHeld!: () => void;
      const held = new Promise<void>((resolve) => {
        signalHeld = resolve;
      });
      const holder = client.$transaction(
        async (tx) => {
          await h.setTenantRlsContext(tx, tenantId);
          await h.acquirePeriodLockExclusive(tx, tenantId, period);
          signalHeld();
          await holdReleased;
        },
        { timeout: 30000, maxWait: 10000 },
      );
      await held;

      // O CLOSE REAL (service + store de produção) entra na fila do exclusivo.
      let closeSettled = false;
      const closePromise = h.closeService
        .close(seed.actor, period, {})
        .finally(() => {
          closeSettled = true;
        });
      await waitForAdvisoryWaiters(client, lockKey, 1, "close na fila do exclusivo");

      // O WRITER REAL — payTitle por HTTP com JWT real — passa os pré-checks (o período AINDA não está
      // fechado) e BLOQUEIA na trava SHARED, atrás do exclusivo do close (fila do Postgres).
      let writerSettled = false;
      const writerPromise = fetch(`${seed.baseUrl}/api/v1/financial-titles/${titleId}/pay`, {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({ account_id: accountId, amount: 40, payment_method: "pix", occurred_at: occurredAt.toISOString() }),
      }).finally(() => {
        writerSettled = true;
      });
      await waitForAdvisoryWaiters(client, lockKey, 2, "writer na fila, atrás do close");

      // Com a barreira segura: NENHUM dos dois commitou — o writer está provadamente BLOQUEADO (era
      // exatamente o que o DIN-008 dizia não acontecer: antes, ele commitava sem esperar ninguém).
      assert.equal(closeSettled, false, "o close não pode ter commitado com o exclusivo ainda seguro");
      assert.equal(writerSettled, false, "o writer TEM de estar bloqueado na trava de período");

      releaseHold();
      await holder;

      // Ordem obrigatória: o close commita PRIMEIRO; o writer acorda, re-valida DENTRO da própria
      // transação, vê o período fechado e morre 422 — com rollback do lançamento.
      const closeResult = await closePromise;
      assert.equal(closeResult.record.status, "closed");

      const writerResponse = await writerPromise;
      assert.equal(writerResponse.status, 422, "o writer que acordou num período fechado sai 422");
      const writerBody = (await writerResponse.json()) as { error: { reason: string } };
      assert.equal(writerBody.error.reason, "period_closed");

      // ZERO vazado — escopado ao tenant descartável deste teste.
      assert.equal(
        await client.financialEntry.count({ where: { tenant_id: tenantId } }),
        0,
        "nenhum lançamento do writer perdedor pode sobreviver ao rollback",
      );
      const title = await client.financialTitle.findFirst({ where: { tenant_id: tenantId, id: titleId } });
      assert.ok(title);
      assert.equal(Number(title.paid_amount), 0, "paid_amount intocado (applyPayment nunca rodou)");
      assert.equal(title.status, "open");

      // SNAPSHOT == RE-DERIVAÇÃO: o material congelado bate com o que as linhas vivas re-derivam.
      const material = await loadSnapshotMaterial(h, tenantId, period);
      assert.deepEqual(material.snapshot, material.rederived, "snapshot material == re-derivação das linhas vivas");
      assert.equal(material.snapshot.entries.in.count, 0, "o snapshot não pode conter o lançamento do perdedor");
    } finally {
      await teardown(h);
    }
  });

  test("G11 — shared na frente: o close ESPERA o writer em voo e o snapshot INCLUI o commit dele", async () => {
    const h = await bootstrap(connectionString);
    const { client } = h;
    try {
      const seed = await seedTenant(h, "g11");
      const { tenantId, accountId } = seed;
      const now = new Date();
      const period = h.deriveCompetencia(now);
      const lockKey = `${tenantId}:${period}`;

      // Writer em voo por CONEXÃO CRUA: a transação toma a trava SHARED (mesmo helper do produto,
      // mesma ordem do write-path: advisory ANTES do INSERT), grava o lançamento e SEGURA a transação
      // aberta — invisível em READ COMMITTED até o commit.
      let releaseWriter!: () => void;
      const writerReleased = new Promise<void>((resolve) => {
        releaseWriter = resolve;
      });
      let signalWriterHolding!: () => void;
      const writerHolding = new Promise<void>((resolve) => {
        signalWriterHolding = resolve;
      });
      const writerTx = client.$transaction(
        async (tx) => {
          await h.setTenantRlsContext(tx, tenantId);
          await h.acquirePeriodLockShared(tx, tenantId, period);
          await tx.$executeRaw`
            INSERT INTO financial_entries (tenant_id, account_id, direction, amount, currency, payment_method, occurred_at, competencia)
            VALUES (${tenantId}::uuid, ${accountId}::uuid, 'in', 55.50, 'BRL', 'pix', ${now}, ${period})
          `;
          signalWriterHolding();
          await writerReleased;
        },
        { timeout: 30000, maxWait: 10000 },
      );
      await writerHolding;

      // O close REAL chega com o writer em voo → o exclusivo conflita com o shared → ESPERA.
      let closeSettled = false;
      const closePromise = h.closeService
        .close(seed.actor, period, {})
        .finally(() => {
          closeSettled = true;
        });
      await waitForAdvisoryWaiters(client, lockKey, 1, "close esperando o shared do writer");
      assert.equal(closeSettled, false, "o close TEM de esperar o writer em voo — nunca fotografar por baixo dele");

      // Libera o writer → commit do lançamento + soltura do shared → o close prossegue e o snapshot
      // INCLUI o commit do writer.
      releaseWriter();
      await writerTx;
      const closeResult = await closePromise;
      assert.equal(closeResult.record.status, "closed");

      const material = await loadSnapshotMaterial(h, tenantId, period);
      assert.equal(material.snapshot.entries.in.count, 1, "o snapshot inclui o lançamento commitado do writer");
      assert.equal(material.snapshot.entries.in.sumAmount, 55.5);
      assert.deepEqual(material.snapshot, material.rederived, "snapshot material == re-derivação das linhas vivas");
    } finally {
      await teardown(h);
    }
  });
}

// ---------- harness ----------

type Harness = Awaited<ReturnType<typeof bootstrap>>;

async function bootstrap(connection: string) {
  const [
    { PrismaPg },
    { PrismaClient },
    { env },
    { setTenantRlsContext, withTenantRls },
    { acquirePeriodLockExclusive, acquirePeriodLockShared },
    { deriveCompetencia },
    { FinancialPeriodCloseService },
    { PrismaFinancialPeriodCloseStore },
    { computeMaterialSnapshot },
  ] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("@prisma/client"),
    import("../src/config/env.js"),
    import("../src/database/rls.js"),
    import("../src/database/financial-period-lock.js"),
    import("../src/modules/financial-titles/index.js"),
    import("../src/modules/financial-period-closes/financial-period-close.service.js"),
    import("../src/modules/financial-period-closes/financial-period-close-prisma.repository.js"),
    import("../src/modules/financial-period-closes/financial-period-close.snapshot.js"),
  ]);

  // ASSERT DO MODO (lição do #357): esta suíte só é prova no caminho prisma. Se a fixação lá em cima
  // sumir (drill D7) e o processo estiver em memory (job `backend`), este assert reprova — a suíte
  // NUNCA "passa" exercitando os internals de memória.
  assert.equal(
    env.CORE_SAAS_PERSISTENCE,
    "prisma",
    "assert do modo: a suíte fixa CORE_SAAS_PERSISTENCE=prisma ela mesma; rodar em memory é verde-cego",
  );

  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  const closeService = new FinancialPeriodCloseService(new PrismaFinancialPeriodCloseStore(client));

  return {
    client,
    closeService,
    computeMaterialSnapshot,
    deriveCompetencia,
    setTenantRlsContext,
    withTenantRls,
    acquirePeriodLockExclusive,
    acquirePeriodLockShared,
    servers: [] as Server[],
    tenantIds: [] as string[],
  };
}

function suffix(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

async function seedTenant(h: Harness, tag: string) {
  const { client } = h;
  const [
    { createApp },
    { PrismaCoreSaasService },
    { PrismaCoreSaasStore },
    { AuditLogRepository, RoleRepository, TenantRepository, UserRepository, UserRoleRepository },
    { signAccessToken },
    { FINANCIAL_ENTRY_PERMISSIONS },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
    import("../src/modules/core-saas/store/prisma-core-saas.store.js"),
    import("../src/modules/core-saas/repositories/index.js"),
    import("../src/modules/auth/index.js"),
    import("../src/modules/financial-entries/financial-entry.routes.js"),
  ]);

  const marca = `${tag}-${suffix()}`;
  const tenant = await client.tenant.create({
    data: { name: `Write-race ${marca}`, slug: `write-race-${marca}` },
  });
  h.tenantIds.push(tenant.id);

  const user = await h.withTenantRls(client, tenant.id, (tx) =>
    tx.user.create({
      data: { tenant_id: tenant.id, name: "Financeiro write-race", email: `write-race-${marca}@example.com` },
    }),
  );

  // Permissão VEM DA TABELA (middleware persistente): papel de gestão com financial_entries:create.
  const papel = await client.role.create({
    data: { tenant_id: tenant.id, key: "manager", name: `Gestão ${marca}`, scope: "tenant" },
  });
  const permission = await client.permission.upsert({
    where: { key: FINANCIAL_ENTRY_PERMISSIONS.create },
    update: {},
    create: { key: FINANCIAL_ENTRY_PERMISSIONS.create, description: `Permissão ${FINANCIAL_ENTRY_PERMISSIONS.create}` },
  });
  await client.rolePermission.create({ data: { role_id: papel.id, permission_id: permission.id } });
  await client.userRoleAssignment.create({
    data: { tenant_id: tenant.id, user_id: user.id, role_id: papel.id },
  });

  const account = await h.withTenantRls(client, tenant.id, (tx) =>
    tx.financialAccount.create({
      data: { tenant_id: tenant.id, name: `Conta ${marca}`, kind: "cash", currency: "BRL", is_active: true },
    }),
  );
  const title = await h.withTenantRls(client, tenant.id, (tx) =>
    tx.financialTitle.create({
      data: {
        tenant_id: tenant.id,
        direction: "receivable",
        party_type: "customer",
        party_name: `Cliente ${marca}`,
        amount: 100,
        currency: "BRL",
        issue_date: new Date(),
        due_date: new Date(),
        paid_amount: 0,
        status: "open",
        competencia: h.deriveCompetencia(new Date()),
      },
    }),
  );

  const service = new PrismaCoreSaasService(
    new PrismaCoreSaasStore(
      client,
      new TenantRepository(client),
      new UserRepository(client),
      new RoleRepository(client),
      new UserRoleRepository(client),
      new AuditLogRepository(client),
    ),
  );
  const app = createApp(service);
  const server = app.listen(0);
  h.servers.push(server);
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const token = await signAccessToken({
    user_id: user.id,
    tenant_id: tenant.id,
    email: user.email,
    roles: ["manager"],
  });

  const actor = { tenantId: tenant.id, userId: user.id, roles: [], permissions: [] };

  return {
    tenantId: tenant.id,
    userId: user.id,
    accountId: account.id,
    titleId: title.id,
    baseUrl,
    headers: { authorization: `Bearer ${token}` },
    actor,
  };
}

// Barreira DETERMINÍSTICA: observa a FILA do advisory lock em pg_locks (granted=false na chave
// hashtext(tenant:period), int8 → classid=32 bits altos, objid=32 baixos, objsubid=1) em vez de
// sleep cego. `minWaiters` atingido = quem tinha de bloquear ESTÁ bloqueado.
async function waitForAdvisoryWaiters(
  client: { $queryRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown> },
  lockKey: string,
  minWaiters: number,
  label: string,
): Promise<void> {
  const deadline = Date.now() + 15000;
  for (;;) {
    const rows = (await client.$queryRaw`
      SELECT count(*)::int AS waiting
      FROM pg_locks
      WHERE locktype = 'advisory'
        AND granted = false
        AND objsubid = 1
        AND classid::bigint = ((hashtext(${lockKey})::bigint >> 32) & 4294967295)
        AND objid::bigint = (hashtext(${lockKey})::bigint & 4294967295)
    `) as Array<{ waiting: number }>;
    if ((rows[0]?.waiting ?? 0) >= minWaiters) return;
    if (Date.now() > deadline) {
      assert.fail(`timeout (15s) esperando ${minWaiters} waiter(s) na trava de período — ${label}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

// Snapshot material CONGELADO na linha do fechamento × RE-DERIVAÇÃO das linhas vivas da competência
// (mesma função pura computeMaterialSnapshot do produto, mesmos filtros do readCompetencia: ativos).
async function loadSnapshotMaterial(h: Harness, tenantId: string, period: string) {
  const { client } = h;
  const closeRow = await client.financialPeriodClose.findFirst({ where: { tenant_id: tenantId, period } });
  assert.ok(closeRow, "a linha do fechamento tem de existir");
  const stored = closeRow.snapshot as {
    latest: { material: ReturnType<Harness["computeMaterialSnapshot"]>; entries: { in: { count: number; sumAmount: number } } };
  };

  const [titleRows, entryRows] = await Promise.all([
    client.financialTitle.findMany({
      where: { tenant_id: tenantId, competencia: period, deleted_at: null },
      select: { id: true, direction: true, amount: true, paid_amount: true, status: true },
    }),
    client.financialEntry.findMany({
      where: { tenant_id: tenantId, competencia: period, deleted_at: null },
      select: { direction: true, amount: true, reconciled: true },
    }),
  ]);
  const rederived = h.computeMaterialSnapshot(
    titleRows.map((row) => ({
      id: row.id,
      direction: row.direction,
      amount: Number(row.amount),
      paidAmount: Number(row.paid_amount),
      status: row.status,
    })),
    entryRows.map((row) => ({ direction: row.direction, amount: Number(row.amount), reconciled: row.reconciled })),
  );

  return { snapshot: stored.latest.material, rederived };
}

// Teardown ESCOPADO aos tenants descartáveis desta execução, em ordem de FK — nunca sentença sobre a
// base inteira (lição do ciclo 3 do B-O6R-01 / P-JUNTA-LIMPEZA-BASE-VIVA).
async function teardown(h: Harness): Promise<void> {
  const { client } = h;
  try {
    for (const server of h.servers) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    for (const tenantId of h.tenantIds) {
      await client.$executeRawUnsafe("delete from financial_entries where tenant_id = $1::uuid", tenantId);
      await client.$executeRawUnsafe("delete from financial_titles where tenant_id = $1::uuid", tenantId);
      await client.$executeRawUnsafe("delete from financial_period_closes where tenant_id = $1::uuid", tenantId);
      await client.$executeRawUnsafe("delete from financial_accounts where tenant_id = $1::uuid", tenantId);
      await client.$executeRawUnsafe("delete from audit_logs where tenant_id = $1::uuid", tenantId);
      await client.$executeRawUnsafe("delete from cloud_usage_events where tenant_id = $1::uuid", tenantId);
      await client.$executeRawUnsafe(
        "delete from role_permissions where role_id in (select id from roles where tenant_id = $1::uuid)",
        tenantId,
      );
      await client.$executeRawUnsafe("delete from user_role_assignments where tenant_id = $1::uuid", tenantId);
      await client.$executeRawUnsafe("delete from roles where tenant_id = $1::uuid", tenantId);
      await client.$executeRawUnsafe("delete from users where tenant_id = $1::uuid", tenantId);
      await client.$executeRawUnsafe("delete from tenants where id = $1::uuid", tenantId);
    }
  } finally {
    await client.$disconnect();
  }
}
