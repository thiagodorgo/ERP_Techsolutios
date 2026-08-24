import "dotenv/config";

import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { ensurePermission, TEST_PROVISIONED_DESCRIPTION } from "./helpers/db-permissions.js";
import {
  assertApplicationNamePropagated,
  buildApplicationName,
  captureSettled,
  expectAllFulfilled,
  waitForOwnAdvisoryWaiters,
  withApplicationName,
} from "./helpers/pg-barrier.js";

const connectionString = process.env.DATABASE_URL;
// Nome unico desta suite (um processo por arquivo no `node --test`) - escopo da barreira (B-5).
const applicationName = buildApplicationName("period-close-write-race");

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

  // B-5 (ciclo 2 · C3): esta suite ja observava a FILA do proprio advisory (o padrao certo), mas
  // `hashtext` colide entre pares (tenant,period) distintos e a fila e do cluster. A tag fecha
  // tambem essa porta, e entra na URL ANTES de `src/database/prisma.ts` le-la no import.
  const connection = withApplicationName(connectionString, applicationName);
  process.env.DATABASE_URL = connection;

  test("G10 — close na frente: writer bloqueia na trava, sai 422 period_closed e o snapshot == re-derivação (zero vazado)", async () => {
    const h = await bootstrap(connection);
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
      // CAPTURA-LIQUIDADA (C3.1): handler no mesmo tique da criacao — a promessa e segurada por
      // varios `await`s abaixo, e sem isto uma rejeicao vira `unhandledRejection` e mata o processo.
      const holderOutcome = captureSettled(holder);
      await held;

      // O CLOSE REAL (service + store de produção) entra na fila do exclusivo.
      let closeSettled = false;
      const closeOutcome = captureSettled(h.closeService.close(seed.actor, period, {})).then((outcome) => {
        closeSettled = true;
        return outcome;
      });
      await waitForAdvisoryWaiters(client, lockKey, 1, "close na fila do exclusivo");

      // O WRITER REAL — payTitle por HTTP com JWT real — passa os pré-checks (o período AINDA não está
      // fechado) e BLOQUEIA na trava SHARED, atrás do exclusivo do close (fila do Postgres).
      let writerSettled = false;
      const writerOutcome = captureSettled(fetch(`${seed.baseUrl}/api/v1/financial-titles/${titleId}/pay`, {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({ account_id: accountId, amount: 40, payment_method: "pix", occurred_at: occurredAt.toISOString() }),
      })).then((outcome) => {
        writerSettled = true;
        return outcome;
      });
      await waitForAdvisoryWaiters(client, lockKey, 2, "writer na fila, atrás do close");

      // Com a barreira segura: NENHUM dos dois commitou — o writer está provadamente BLOQUEADO (era
      // exatamente o que o DIN-008 dizia não acontecer: antes, ele commitava sem esperar ninguém).
      assert.equal(closeSettled, false, "o close não pode ter commitado com o exclusivo ainda seguro");
      assert.equal(writerSettled, false, "o writer TEM de estar bloqueado na trava de período");

      releaseHold();
      expectAllFulfilled([await holderOutcome], "transacao que segura o exclusivo");

      // Ordem obrigatória: o close commita PRIMEIRO; o writer acorda, re-valida DENTRO da própria
      // transação, vê o período fechado e morre 422 — com rollback do lançamento.
      const closeSettledOutcome = await closeOutcome;
      expectAllFulfilled([closeSettledOutcome], "close real");
      const closeResult = (closeSettledOutcome as { status: "fulfilled"; value: { record: { status: string } } }).value;
      assert.equal(closeResult.record.status, "closed");

      const writerSettledOutcome = await writerOutcome;
      expectAllFulfilled([writerSettledOutcome], "writer real por HTTP");
      const writerResponse = (writerSettledOutcome as { status: "fulfilled"; value: Response }).value;
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
    const h = await bootstrap(connection);
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
      const writerTxOutcome = captureSettled(writerTx);
      await writerHolding;

      // O close REAL chega com o writer em voo → o exclusivo conflita com o shared → ESPERA.
      let closeSettled = false;
      const closeOutcome = captureSettled(h.closeService.close(seed.actor, period, {})).then((outcome) => {
        closeSettled = true;
        return outcome;
      });
      await waitForAdvisoryWaiters(client, lockKey, 1, "close esperando o shared do writer");
      assert.equal(closeSettled, false, "o close TEM de esperar o writer em voo — nunca fotografar por baixo dele");

      // Libera o writer → commit do lançamento + soltura do shared → o close prossegue e o snapshot
      // INCLUI o commit do writer.
      releaseWriter();
      expectAllFulfilled([await writerTxOutcome], "writer em voo");
      const closeSettledOutcome = await closeOutcome;
      expectAllFulfilled([closeSettledOutcome], "close real");
      assert.equal((closeSettledOutcome as { status: "fulfilled"; value: { record: { status: string } } }).value.record.status, "closed");

      const material = await loadSnapshotMaterial(h, tenantId, period);
      assert.equal(material.snapshot.entries.in.count, 1, "o snapshot inclui o lançamento commitado do writer");
      assert.equal(material.snapshot.entries.in.sumAmount, 55.5);
      assert.deepEqual(material.snapshot, material.rederived, "snapshot material == re-derivação das linhas vivas");
    } finally {
      await teardown(h);
    }
  });

  test("G10 — close na frente bloqueia PATCH real; após fechar retorna period_closed e não altera título", async () => {
    const h = await bootstrap(connection);
    const { client } = h;
    try {
      const seed = await seedTenant(h, "g10-patch");
      const period = h.deriveCompetencia(new Date());
      const lockKey = `${seed.tenantId}:${period}`;
      let release!: () => void;
      let signalHeld!: () => void;
      const held = new Promise<void>((resolveHeld) => { signalHeld = resolveHeld; });
      const holder = client.$transaction(async (tx) => {
          await h.setTenantRlsContext(tx, seed.tenantId);
          await h.acquirePeriodLockExclusive(tx, seed.tenantId, period);
          signalHeld();
          await new Promise<void>((resolve) => { release = resolve; });
        }, { timeout: 30000, maxWait: 10000 });
      const holderOutcome = captureSettled(holder);
      await held;
      const close = captureSettled(h.closeService.close(seed.actor, period, {}));
      await waitForAdvisoryWaiters(client, lockKey, 1, "close antes do PATCH");
      const patch = captureSettled(fetch(`${seed.baseUrl}/api/v1/financial-titles/${seed.titleId}`, {
        method: "PATCH", headers: { ...seed.headers, "content-type": "application/json" },
        body: JSON.stringify({ amount: 90, party_name: "Não persiste" }),
      }));
      await waitForAdvisoryWaiters(client, lockKey, 2, "PATCH atrás do close");
      release!();
      expectAllFulfilled([await holderOutcome], "transacao que segura o exclusivo");
      expectAllFulfilled([await close], "close real");
      const patchOutcome = await patch;
      expectAllFulfilled([patchOutcome], "PATCH real por HTTP");
      const response = (patchOutcome as { status: "fulfilled"; value: Response }).value;
      assert.equal(response.status, 422);
      assert.equal(((await response.json()) as { error: { reason: string } }).error.reason, "period_closed");
      const title = await client.financialTitle.findUnique({ where: { id: seed.titleId } });
      assert.equal(Number(title?.amount), 100);
      assert.notEqual(title?.party_name, "Não persiste");
    } finally { await teardown(h); }
  });

  test("G11 — PATCH/shared na frente faz o close esperar e o snapshot inclui o novo nominal", async () => {
    const h = await bootstrap(connection);
    const { client } = h;
    try {
      const seed = await seedTenant(h, "g11-patch");
      const period = h.deriveCompetencia(new Date());
      const lockKey = `${seed.tenantId}:${period}`;
      let release!: () => void;
      let ready!: () => void;
      const writerReady = new Promise<void>((resolve) => { ready = resolve; });
      const writer = client.$transaction(async (tx) => {
        await h.setTenantRlsContext(tx, seed.tenantId);
        await h.acquirePeriodLockShared(tx, seed.tenantId, period);
        const result = await new h.PrismaFinancialTitleRepository(tx).update({
          tenantId: seed.tenantId, financialTitleId: seed.titleId, amount: 90, updatedBy: seed.userId,
        });
        assert.equal(result.outcome, "updated");
        ready();
        await new Promise<void>((resolve) => { release = resolve; });
      }, { timeout: 30000, maxWait: 10000 });
      const writerOutcome = captureSettled(writer);
      await writerReady;
      const close = captureSettled(h.closeService.close(seed.actor, period, {}));
      await waitForAdvisoryWaiters(client, lockKey, 1, "close esperando PATCH/shared");
      release!();
      expectAllFulfilled([await writerOutcome], "PATCH/shared em voo");
      expectAllFulfilled([await close], "close real");
      const material = await loadSnapshotMaterial(h, seed.tenantId, period);
      assert.equal(material.snapshot.titles.receivable.sumAmount, 90);
      assert.deepEqual(material.snapshot, material.rederived);
    } finally { await teardown(h); }
  });

  // ------------------------------------------------------------------ B-O6R-02 ciclo 3 · C4 (P8)
  // A pré-condição de catálogo é da SUÍTE, não do job — e as duas propriedades que fazem isso ser
  // seguro na tabela GLOBAL `permissions` são provadas aqui, não prometidas em comentário.

  test("P8 — ensurePermission é IDEMPOTENTE e NÃO sobrescreve linha existente (zero escrita em regime seeded)", async () => {
    const h = await bootstrap(connection);
    const { client } = h;
    // Chave sintética desta execução: a prova precisa do ramo CREATE, que só existe se a linha
    // faltar — em banco seeded nenhuma chave real cairia nele.
    const key = `o6r_c3_probe_idem:${suffix()}`;
    try {
      const created = await ensurePermission(client, key);
      assert.equal(created.key, key);
      assert.equal(
        (await client.permission.findUnique({ where: { key } }))?.description,
        TEST_PROVISIONED_DESCRIPTION,
        "linha nascida de teste é rotulada como tal",
      );

      // Sem clobber: mexemos na descrição como o seed oficial faria, e o helper NÃO pode desfazer.
      const oficial = "descricao do catalogo oficial";
      await client.permission.update({ where: { key }, data: { description: oficial } });

      // Idempotência: N chamadas = 1 chamada. Nem cria linha nova, nem altera a existente.
      const again = await ensurePermission(client, key);
      const third = await ensurePermission(client, key);
      assert.equal(again.id, created.id, "a mesma linha é devolvida, nunca uma nova");
      assert.equal(third.id, created.id);
      assert.equal(
        (await client.permission.findUnique({ where: { key } }))?.description,
        oficial,
        "ensurePermission NUNCA sobrescreve catálogo — se a linha existe, ela é a verdade",
      );
      assert.equal(await client.permission.count({ where: { key } }), 1, "exatamente UMA linha para a chave");
    } finally {
      await client.permission.deleteMany({ where: { key } });
      await teardown(h);
    }
  });

  test("P8 — corrida create × create na MESMA chave: o índice único arbitra, ninguém explode, sobra UMA linha", async () => {
    const h = await bootstrap(connection);
    const { client } = h;
    const key = `o6r_c3_probe_race:${suffix()}`;
    try {
      // O caminho que o job `backend` percorre quando duas suítes do lote provisionam a mesma chave
      // ausente ao mesmo tempo. Quem perde recebe P2002, relê e segue — sem `upsert`, logo sem o
      // `XX000 tuple concurrently updated` que o ciclo 2 fechou (e sem reabri-lo).
      const [a, b, c] = await Promise.all([
        ensurePermission(client, key),
        ensurePermission(client, key),
        ensurePermission(client, key),
      ]);
      assert.equal(a.id, b.id, "os três concorrentes convergem para a linha do vencedor");
      assert.equal(b.id, c.id);
      assert.equal(await client.permission.count({ where: { key } }), 1, "a corrida não pode deixar duas linhas");
    } finally {
      await client.permission.deleteMany({ where: { key } });
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
    { PrismaFinancialTitleRepository },
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
    import("../src/modules/financial-titles/financial-title-prisma.repository.js"),
  ]);

  // ASSERT DO MODO (lição do #357): esta suíte só é prova no caminho prisma. Se a fixação lá em cima
  // sumir (drill D7) e o processo estiver em memory (job `backend`), este assert reprova — a suíte
  // NUNCA "passa" exercitando os internals de memória.
  assert.equal(
    env.CORE_SAAS_PERSISTENCE,
    "prisma",
    "assert do modo: a suíte fixa CORE_SAAS_PERSISTENCE=prisma ela mesma; rodar em memory é verde-cego",
  );

  // A suíte roda no mesmo processo concorrente das demais provas DB no job. O timeout maior é
  // somente do cliente descartável de teste: impede que contenção legítima entre arquivos transforme
  // a espera deliberada da barreira em expiração de 5 s da interactive transaction.
  const client = new PrismaClient({
    adapter: new PrismaPg({ connectionString: connection }),
    transactionOptions: { maxWait: 10000, timeout: 30000 },
  });
  // A tag TEM de ter chegado ao backend: barreira escopada que nunca casa nada é cegueira nova.
  await assertApplicationNamePropagated(client, applicationName);
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
    PrismaFinancialTitleRepository,
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
    { FINANCIAL_TITLE_PERMISSIONS },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
    import("../src/modules/core-saas/store/prisma-core-saas.store.js"),
    import("../src/modules/core-saas/repositories/index.js"),
    import("../src/modules/auth/index.js"),
    import("../src/modules/financial-entries/financial-entry.routes.js"),
    import("../src/modules/financial-titles/financial-title.routes.js"),
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
  // B-O6R-02 ciclo 3 · C4 (P8) — a tabela `permissions` e GLOBAL (sem tenant_id). O `upsert` de
  // antes ESCREVIA mesmo com a linha presente (classe `XX000 tuple concurrently updated`,
  // P-O6R-ARNES-ISOLAMENTO); o `findUnique`+assert que o substituiu passou a EXIGIR seed, e o job
  // `backend` da CI nao seeda — era o B-3. `ensurePermission` fecha as duas: le primeiro (zero
  // escrita em regime seeded) e so cria o que faltar, sem nunca sobrescrever catalogo.
  const permission = await ensurePermission(client, FINANCIAL_ENTRY_PERMISSIONS.create);
  await client.rolePermission.create({ data: { role_id: papel.id, permission_id: permission.id } });
  const titlePermission = await ensurePermission(client, FINANCIAL_TITLE_PERMISSIONS.update);
  await client.rolePermission.create({ data: { role_id: papel.id, permission_id: titlePermission.id } });
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
// hashtext(tenant:period)) — o padrão que esta suíte já fazia certo. O ciclo 2 acrescenta o escopo
// por `application_name` (helper único em tests/helpers/pg-barrier.ts): a fila é do CLUSTER e
// `hashtext` colide entre pares distintos, então sem escopo um waiter alheio contaria como meu.
async function waitForAdvisoryWaiters(
  client: { $queryRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown> },
  lockKey: string,
  minWaiters: number,
  label: string,
): Promise<void> {
  await waitForOwnAdvisoryWaiters(client, { applicationName, lockKey, minWaiters, label });
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
