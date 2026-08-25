import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

import {
  assertApplicationNamePropagated,
  buildApplicationName,
  captureSettled,
  waitForOwnBlockedStatement,
  withApplicationName,
} from "./helpers/pg-barrier.js";

const connectionString = process.env.DATABASE_URL;
const applicationName = buildApplicationName("delete-reverse-race");

// -----------------------------------------------------------------------------------------------
// B-O6R-02 ciclo 4 · C1 (P9, Ω6R-DIN-002 concorrente) — a corrida delete×reverse sob Postgres REAL,
// e a INVARIANTE DE BANCO contra a metade órfã (migration add_reversal_pair_atomicity).
//
// A propriedade: as portas delete e reverse do MESMO par nunca comprometem ambas sob concorrência —
// efeito líquido 0, perdedor com o erro do controle sequencial. Duas defesas, medidas separadamente:
//   · SERVIÇO — delete e reverse serializam no FOR UPDATE do original dentro de uow.run; o perdedor
//     re-checa sob o lock e sai 422 reversal_pair_immutable / 404 (não a RAISE do trigger).
//   · BANCO — para o escritor que NÃO passa pelo serviço (SQL cru, corrida, bug), o par de triggers
//     recusa a metade órfã. O FOR SHARE do Trigger B serializa os dois caminhos no row lock do
//     original, no próprio Postgres.
//
// Disciplina (§C7.5, lição do PR-05 Ω5P): tenant descartável por teste, asserções ESCOPADAS aos ids
// do próprio teste, teardown em ordem de FK — nenhuma sentença sobre a base inteira. Cluster
// descartável (NUNCA a base viva). O DELETE em massa por wildcard na base viva foi um incidente; aqui
// todo delete é por tenant_id do próprio teste.
// -----------------------------------------------------------------------------------------------

const RACE_N = 20;

function isDomainError(error: unknown, statusCode: number, reason: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { statusCode?: unknown }).statusCode === statusCode &&
    (error as { reason?: unknown }).reason === reason
  );
}

if (!connectionString) {
  test("Corrida delete×reverse sob Postgres exige DATABASE_URL e um banco migrado", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suíte.",
  });
} else {
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL = "silent";

  const connection = withApplicationName(connectionString, applicationName);
  process.env.DATABASE_URL = connection;

  for (const order of ["reverse-first", "delete-first"] as const) {
    test(`[C1/P9][db][${order}] corrida REAL delete×reverse (serviço, ${RACE_N}×): saldo líquido 0, nunca ambas, perdedor 422/404, zero deadlock`, async () => {
      const h = await bootstrap(connection);
      const { client } = h;
      try {
        for (let it = 0; it < RACE_N; it++) {
          const seed = await seedTenant(h, `race-${order}`);
          const entry = await h.entryService.create(seed.actor, {
            account_id: seed.accountId,
            direction: "out",
            amount: 100,
            payment_method: "pix",
          });

          const reverse = () => captureSettled(h.entryService.reverse(seed.actor, entry.id));
          const del = () => captureSettled(h.entryService.delete(seed.actor, entry.id));
          const [a, b] = await Promise.all(order === "reverse-first" ? [reverse(), del()] : [del(), reverse()]);

          const bothAccepted = a.status === "fulfilled" && b.status === "fulfilled";
          assert.equal(bothAccepted, false, `it=${it}: as duas portas commitaram — saldo fabricado`);

          const balance = await h.entryService.balance(seed.actor, seed.accountId);
          assert.equal(balance.balance, 0, `it=${it}: saldo líquido tem de ser 0, veio ${balance.balance}`);

          const loser = [a, b].find((r) => r.status === "rejected");
          assert.ok(loser, `it=${it}: uma porta tem de recusar`);
          const reason = (loser as { reason: unknown }).reason;
          // deadlock (40P01) NUNCA é aceitável — a ordem única de locks (advisory → row → escrita) o impede.
          assert.notEqual((reason as { code?: string })?.code, "40P01", `it=${it}: deadlock 40P01`);
          assert.equal(
            isDomainError(reason, 422, "reversal_pair_immutable") || isDomainError(reason, 404, "entry_not_found"),
            true,
            `it=${it}: perdedor tem de ser 422 reversal_pair_immutable ou 404 entry_not_found`,
          );

          // No máximo UMA contrapartida ATIVA; o original NUNCA fica órfão (deletado com contrapartida viva).
          const counters = await client.financialEntry.count({
            where: { tenant_id: seed.tenantId, reversal_of: entry.id, deleted_at: null },
          });
          const originalRow = await client.financialEntry.findFirst({ where: { tenant_id: seed.tenantId, id: entry.id } });
          const originalDeleted = originalRow?.deleted_at != null;
          assert.equal(counters <= 1, true, `it=${it}: no máximo 1 contrapartida ativa`);
          assert.equal(
            counters === 1 && originalDeleted,
            false,
            `it=${it}: metade órfã — contrapartida viva com original deletado`,
          );
          await teardownTenant(h, seed.tenantId);
        }
      } finally {
        await teardown(h);
      }
    });
  }

  test("[C1/P9][db][trigger B] SQL cru: INSERT de estorno vivo apontando original APAGADO → RAISE Ω6R-DIN-002", async () => {
    const h = await bootstrap(connection);
    const { client } = h;
    try {
      const seed = await seedTenant(h, "orphan-insert");
      const original = await h.entryService.create(seed.actor, {
        account_id: seed.accountId,
        direction: "out",
        amount: 100,
        payment_method: "pix",
      });
      // apaga o original (avulso, sem estorno → delete permitido)
      await h.entryService.delete(seed.actor, original.id);

      // SQL CRU: cria a metade órfã diretamente, contornando o serviço. O trigger tem de recusar.
      await assert.rejects(
        client.$executeRawUnsafe(
          `INSERT INTO financial_entries (tenant_id, account_id, direction, amount, payment_method, competencia, reversal_of)
           VALUES ($1::uuid, $2::uuid, 'in', 100, 'pix', '2026-05', $3::uuid)`,
          seed.tenantId,
          seed.accountId,
          original.id,
        ),
        (error: unknown) => /Ω6R-DIN-002/.test(String((error as { message?: unknown })?.message ?? error)),
      );

      // Nenhuma contrapartida órfã ficou no banco.
      assert.equal(
        await client.financialEntry.count({ where: { tenant_id: seed.tenantId, reversal_of: original.id } }),
        0,
      );
      await teardownTenant(h, seed.tenantId);
    } finally {
      await teardown(h);
    }
  });

  test("[C1/P9][db][trigger A] SQL cru: UPDATE soft-delete de original com contrapartida VIVA → RAISE Ω6R-DIN-002", async () => {
    const h = await bootstrap(connection);
    const { client } = h;
    try {
      const seed = await seedTenant(h, "orphan-delete");
      const original = await h.entryService.create(seed.actor, {
        account_id: seed.accountId,
        direction: "out",
        amount: 100,
        payment_method: "pix",
      });
      const counter = await h.entryService.reverse(seed.actor, original.id); // par vivo, atômico

      // SQL CRU: soft-delete do original por baixo do serviço (o serviço recusaria com reversal_pair).
      await assert.rejects(
        client.$executeRawUnsafe(
          `UPDATE financial_entries SET deleted_at = now() WHERE tenant_id = $1::uuid AND id = $2::uuid`,
          seed.tenantId,
          original.id,
        ),
        (error: unknown) => /Ω6R-DIN-002/.test(String((error as { message?: unknown })?.message ?? error)),
      );

      // O original continua VIVO (a RAISE abortou o UPDATE); o par segue íntegro.
      const originalRow = await client.financialEntry.findFirst({ where: { tenant_id: seed.tenantId, id: original.id } });
      assert.equal(originalRow?.deleted_at, null, "a RAISE tem de ter abortado o soft-delete");
      const counterRow = await client.financialEntry.findFirst({ where: { tenant_id: seed.tenantId, id: counter.id } });
      assert.equal(counterRow?.deleted_at, null);
      await teardownTenant(h, seed.tenantId);
    } finally {
      await teardown(h);
    }
  });

  test("[C1/P9][db][barrier · FOR SHARE] SQL cru: estorno-insert e soft-delete concorrentes SERIALIZAM no row lock do original; nunca ambos", async () => {
    const h = await bootstrap(connection);
    const { client } = h;
    try {
      const seed = await seedTenant(h, "barrier-forshare");
      const original = await h.entryService.create(seed.actor, {
        account_id: seed.accountId,
        direction: "out",
        amount: 100,
        payment_method: "pix",
      });

      // VENCEDOR emulado: tx crua que INSERE a contrapartida (Trigger B toma FOR SHARE do original) e
      // segura a transação aberta. O soft-delete do original vai encontrar esse lock.
      let releaseWinner!: () => void;
      const winnerMayCommit = new Promise<void>((resolve) => {
        releaseWinner = resolve;
      });
      let signalWinnerReady!: () => void;
      const winnerReady = new Promise<void>((resolve) => {
        signalWinnerReady = resolve;
      });
      const winnerTx = client.$transaction(
        async (tx) => {
          await h.setTenantRlsContext(tx, seed.tenantId);
          await tx.$executeRawUnsafe(
            `INSERT INTO financial_entries (tenant_id, account_id, direction, amount, payment_method, competencia, reversal_of)
             VALUES ($1::uuid, $2::uuid, 'in', 100, 'pix', '2026-05', $3::uuid)`,
            seed.tenantId,
            seed.accountId,
            original.id,
          );
          signalWinnerReady();
          await winnerMayCommit;
        },
        { timeout: 30000, maxWait: 10000 },
      );
      const winnerOutcome = captureSettled(winnerTx);
      await winnerReady;

      // PERDEDOR REAL: soft-delete cru do original. Conflita com o FOR SHARE do vencedor → BLOQUEIA.
      let loserSettled = false;
      const loserOutcome = captureSettled(
        client.$executeRawUnsafe(
          `UPDATE financial_entries SET deleted_at = now() WHERE tenant_id = $1::uuid AND id = $2::uuid`,
          seed.tenantId,
          original.id,
        ),
      ).then((outcome) => {
        loserSettled = true;
        return outcome;
      });
      await waitForOwnBlockedStatement(client, {
        applicationName,
        fragment: "financial_entries",
        label: "soft-delete do original bloqueado no FOR SHARE do estorno",
      });
      assert.equal(loserSettled, false, "o soft-delete TEM de estar bloqueado no row lock do original");

      releaseWinner();
      const winner = await winnerOutcome;
      assert.equal(winner.status, "fulfilled", "o vencedor (insert do estorno) tem de commitar");

      // Ao destravar, o Trigger A re-avalia sob READ COMMITTED e vê a contrapartida commitada → RAISE.
      const loser = await loserOutcome;
      assert.equal(loser.status, "rejected", "o perdedor (soft-delete) tem de ser recusado pelo Trigger A");
      assert.match(String((loser as { reason: unknown }).reason), /Ω6R-DIN-002/);

      // Exatamente 1 contrapartida ativa; original VIVO. Par íntegro, nunca órfão.
      assert.equal(
        await client.financialEntry.count({ where: { tenant_id: seed.tenantId, reversal_of: original.id, deleted_at: null } }),
        1,
      );
      const originalRow = await client.financialEntry.findFirst({ where: { tenant_id: seed.tenantId, id: original.id } });
      assert.equal(originalRow?.deleted_at, null);
      await teardownTenant(h, seed.tenantId);
    } finally {
      await teardown(h);
    }
  });

  test("[C1/P9][db][RLS] estorno LEGÍTIMO sob o contexto RLS do app: trigger enxerga o original vivo e o par commita", async () => {
    const h = await bootstrap(connection);
    const { client } = h;
    try {
      const seed = await seedTenant(h, "rls-legit");
      const original = await h.entryService.create(seed.actor, {
        account_id: seed.accountId,
        direction: "out",
        amount: 100,
        payment_method: "pix",
      });
      // reverse passa pelo setTenantRlsContext + repositório: se o Trigger B (FOR SHARE) não enxergasse
      // o original sob RLS, este estorno legítimo falharia. Prova que o trigger não é falso-positivo.
      const counter = await h.entryService.reverse(seed.actor, original.id);
      assert.equal(counter.reversalOf, original.id);
      const balance = await h.entryService.balance(seed.actor, seed.accountId);
      assert.equal(balance.balance, 0, "original out 100 + contrapartida in 100 = 0");
      await teardownTenant(h, seed.tenantId);
    } finally {
      await teardown(h);
    }
  });
}

// ---------- harness ----------

type Harness = Awaited<ReturnType<typeof bootstrap>>;

async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }, { env }, { setTenantRlsContext, withTenantRls }, { deriveCompetencia }, { createDefaultFinancialEntryService }] =
    await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
      import("../src/config/env.js"),
      import("../src/database/rls.js"),
      import("../src/modules/financial-titles/index.js"),
      import("../src/modules/financial-entries/financial-entry.service.js"),
    ]);

  assert.equal(
    env.CORE_SAAS_PERSISTENCE,
    "prisma",
    "assert do modo: a suíte fixa CORE_SAAS_PERSISTENCE=prisma ela mesma; rodar em memory é verde-cego",
  );

  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  await assertApplicationNamePropagated(client, applicationName);
  const entryService = await createDefaultFinancialEntryService();

  return {
    client,
    entryService,
    deriveCompetencia,
    setTenantRlsContext,
    withTenantRls,
    tenantIds: [] as string[],
  };
}

function suffix(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

async function seedTenant(h: Harness, tag: string) {
  const { client } = h;
  const marca = `${tag}-${suffix()}`;
  const tenant = await client.tenant.create({ data: { name: `Race ${marca}`, slug: `race-${marca}` } });
  h.tenantIds.push(tenant.id);

  const user = await h.withTenantRls(client, tenant.id, (tx) =>
    tx.user.create({ data: { tenant_id: tenant.id, name: "Financeiro race", email: `race-${marca}@example.com` } }),
  );
  const account = await h.withTenantRls(client, tenant.id, (tx) =>
    tx.financialAccount.create({
      data: { tenant_id: tenant.id, name: `Conta ${marca}`, kind: "cash", currency: "BRL", is_active: true },
    }),
  );

  return {
    tenantId: tenant.id,
    userId: user.id,
    accountId: account.id,
    actor: { tenantId: tenant.id, userId: user.id, roles: [], permissions: [] },
  };
}

// Teardown ESCOPADO ao tenant do próprio teste (nunca a base inteira), em ordem de FK.
async function teardownTenant(h: Harness, tenantId: string): Promise<void> {
  const { client } = h;
  await client.$executeRawUnsafe("delete from financial_entries where tenant_id = $1::uuid", tenantId);
  await client.$executeRawUnsafe("delete from financial_accounts where tenant_id = $1::uuid", tenantId);
  await client.$executeRawUnsafe("delete from audit_logs where tenant_id = $1::uuid", tenantId);
  await client.$executeRawUnsafe("delete from cloud_usage_events where tenant_id = $1::uuid", tenantId);
  await client.$executeRawUnsafe("delete from users where tenant_id = $1::uuid", tenantId);
  await client.$executeRawUnsafe("delete from tenants where id = $1::uuid", tenantId);
  h.tenantIds = h.tenantIds.filter((id) => id !== tenantId);
}

async function teardown(h: Harness): Promise<void> {
  const { client } = h;
  try {
    for (const tenantId of [...h.tenantIds]) {
      await teardownTenant(h, tenantId);
    }
  } finally {
    await client.$disconnect();
  }
}
