import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";

import { openPrismaKit, type PrismaKit } from "./helpers/ass-08c3-prisma-kit.js";

import { daysInPeriod } from "../src/modules/subscription-billing/statements/statement.engine.js";
import { InMemoryStatementRepository } from "../src/modules/subscription-billing/statements/statement.repository.js";
import { StatementService, type StatementInputs } from "../src/modules/subscription-billing/statements/statement.service.js";
import { source } from "./helpers/ass-08c3-test-kit.js";

const WHEN = new Date("2026-11-02T12:00:00Z");
function ready(): StatementInputs {
  const days = daysInPeriod("2026-10");
  return { kind: "ready", subscriptionId: "sub", planVersionId: "plan-v1", addonPlanVersionId: null, computation: { daysInMonth: days, segments: [{ subscriptionId: "sub", planVersionId: "plan-v1", fromDay: 1, toDay: days, monthlyPriceCents: 10_000 }], terms: { includedUsers: 0, includedStorageMilliGb: 0, extraUserPriceCents: 0, extraGbPriceCents: 0 }, measurements: { usersPeak: 0, storagePeakMilliGb: 0, trackedVehicles: 0 }, perVehiclePriceCents: null }, daysMeasured: days, gaps: [], dueDays: 10 };
}
function world() {
  const repository = new InMemoryStatementRepository(() => WHEN);
  const pins: unknown[] = [];
  const service = new StatementService(repository, { async resolve(_tenant, _period, options) { pins.push(options.pin); return ready(); } }, { async record() {} });
  return { repository, service, pins };
}

test("CP1: dez fechamentos concorrentes terminam em um closed e nove already_closed", async () => {
  for (let round = 0; round < 3; round += 1) {
    const w = world();
    const results = await Promise.all(Array.from({ length: 10 }, () => w.service.close({ tenantId: `tenant-${round}`, period: "2026-10", now: WHEN, actorId: "usr", source: "manual" })));
    assert.equal(results.filter((x) => x.kind === "closed").length, 1);
    assert.equal(results.filter((x) => x.kind === "already_closed").length, 9);
    assert.equal((await w.repository.listStatements(`tenant-${round}`)).length, 1);
  }
});

test("CP2: close resolve fora da transação recebe o pin do demonstrativo reaberto", () => {
  const text = source("src/modules/subscription-billing/statements/statement.service.ts");
  const close = text.slice(text.indexOf("async close("), text.indexOf("async reopen(", text.indexOf("async close(")));
  const resolve = close.indexOf("[CLOSE-RESOLVE-OUT]");
  const transaction = close.indexOf("this.repository.transaction");
  assert.ok(resolve > 0 && resolve < transaction);
  assert.match(close.slice(resolve - 300, resolve + 200), /prePin/);
});

test("CP2b: mudança do pin entre leitura e trava falha com statement_busy antes de salvar", () => {
  const text = source("src/modules/subscription-billing/statements/statement.service.ts");
  const guard = text.indexOf("[CLOSE-PIN-CHECK]");
  const save = text.indexOf("tx.saveStatement", guard);
  assert.ok(guard > 0 && save > guard);
  assert.match(text.slice(guard - 250, guard + 180), /statement_busy/);
});

test("M-CP1/M-CP2: as duas âncoras são únicas", () => {
  const text = source("src/modules/subscription-billing/statements/statement.service.ts");
  assert.equal(text.split("[CLOSE-RESOLVE-OUT]").length - 1, 1);
  assert.equal(text.split("[CLOSE-PIN-CHECK]").length - 1, 1);
});


// ---------------------------------------------------------------------------------------------------------------------------
// Conserto único do #608 (fix-608b-cl), A-2 (grave): o `[CLOSE-PIN-CHECK]` roda SEMPRE sob a trava. A cena da sonda
// `sonda-close-pin`, agora no PRISMA (papel NOSUPERUSER NOBYPASSRLS): o 2º operador lê `closed` sem trava (pin nulo); ENTRE a
// leitura e a trava, o 1º reabre o demonstrativo e COMMITA (a barreira é o estado do banco: a reabertura roda e termina dentro do
// `inputs.resolve`, que fica entre as duas). Plano §4.9 passo 2: status relido sob a trava ≠ o do passo 1 → 409 `statement_busy`,
// nada gravado; o `close` seguinte usa o pin do fechamento original.
// ---------------------------------------------------------------------------------------------------------------------------
const connectionString = process.env.DATABASE_URL;
function readyAt(planVersionId: string, price: number): StatementInputs {
  const base = ready();
  if (base.kind !== "ready") throw new Error("ready");
  // Sem FK: `subscriptionId`/`planVersionId` nulos na linha; o pin vem do plano de cada segmento do retrato (`pinOf`).
  return { ...base, subscriptionId: null, planVersionId: null, computation: { ...base.computation, segments: [{ ...base.computation.segments[0]!, planVersionId, monthlyPriceCents: price }] } } as StatementInputs;
}
if (!connectionString) {
  test("CP2b-db exige DATABASE_URL", { skip: "Defina DATABASE_URL para os testes -db." });
} else {
  let kit: PrismaKit;
  let M: any = {};
  after(async () => {
    await kit?.close();
  });

  test("setup -db: base própria, papel NOSUPERUSER NOBYPASSRLS", async () => {
    kit = await openPrismaKit(connectionString, "c08c3_cp");
    M = {
      runtime: await import("../src/modules/subscription-billing/statements/statement.prisma-runtime.js"),
      inputs: await import("../src/modules/subscription-billing/statements/statement.inputs-provider.js"),
      plans: await import("../src/modules/subscription-billing/plans/plans-prisma.repository.js"),
      subscriptions: await import("../src/modules/subscription-billing/plans/subscriptions-prisma.repository.js"),
      tenants: await import("../src/modules/subscription-billing/plans/tenant-lookup.prisma.js"),
    };
  });

  test("CP2b-db (A-2): a reabertura entre a leitura sem trava e a trava dá 409 statement_busy; nada gravado; o close seguinte usa o pin", async () => {
    const slug = `c08c3-cp2b-${randomUUID().slice(0, 8)}`;
    const tenantId = (await kit.one(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, slug)).id as string;
    const actor = (await kit.one(`INSERT INTO users (tenant_id, name, email) VALUES ($1::uuid, 'op', $2) RETURNING id`, tenantId, `${slug}@teste.invalid`)).id as string;
    const repository = new M.runtime.PrismaStatementRepository(kit.role.client);
    const audit = new M.runtime.PrismaStatementAuditSink(kit.role.client);
    // O fechamento original: plan-v1, 100,00.
    const first = new StatementService(repository, { async resolve() { return readyAt("plan-v1", 10_000); } }, audit);
    const closed = await first.close({ tenantId, period: "2026-10", now: WHEN, actorId: actor, source: "manual" });
    assert.equal(closed.kind, "closed");
    const statementId = (await kit.one(`SELECT id FROM subscription_statements WHERE tenant_id = $1::uuid AND period = '2026-10'`, tenantId)).id as string;
    // Desde o original, o preço de HOJE é plan-v2 (150,00); o pin do original é plan-v1.
    const pins: unknown[] = [];
    let interleave: (() => Promise<void>) | null = async () => {
      await first.reopen({ tenantId, statementId, reason: "ajuste do operador A", actorId: actor, now: WHEN });
    };
    const second = new StatementService(
      repository,
      {
        async resolve(_t, _p, options) {
          pins.push(options.pin);
          if (interleave) {
            const run = interleave;
            interleave = null;
            await run();
          }
          return options.pin ? readyAt("plan-v1", 10_000) : readyAt("plan-v2", 15_000);
        },
      },
      audit,
    );
    let error: any;
    try {
      await second.close({ tenantId, period: "2026-10", now: WHEN, actorId: actor, source: "manual" });
    } catch (caught) {
      error = caught;
    }
    // A barreira aconteceu pelo banco: a reabertura do operador A está gravada.
    assert.equal(pins.length, 1);
    assert.equal(pins[0], null, "o passo 1 leu `closed` sem trava: pin nulo");
    assert.equal(error?.statusCode, 409, `esperado 409, veio ${error?.statusCode ?? "sucesso"}`);
    assert.equal(error?.reason, "statement_busy");
    const afterBusy = await kit.one(`SELECT status, total_amount::text AS total, snapshot FROM subscription_statements WHERE id = $1::uuid`, statementId);
    assert.equal(afterBusy.status, "reopened", "nada gravado pelo close recusado");
    assert.equal(Number(afterBusy.total), 100);
    assert.equal(afterBusy.snapshot.history.filter((entry: { event: string }) => entry.event === "closed").length, 1);
    // O close seguinte (o operador repete): lê `reopened` com o pin do original e refecha a 100,00.
    const again = await second.close({ tenantId, period: "2026-10", now: WHEN, actorId: actor, source: "manual" });
    assert.equal(again.kind, "closed");
    assert.ok(pins[1] && (pins[1] as { planVersionIds: string[] }).planVersionIds.includes("plan-v1"), "o refechamento usa o pin do original");
    const final = await kit.one(`SELECT status, total_amount::text AS total FROM subscription_statements WHERE id = $1::uuid`, statementId);
    assert.deepEqual({ status: final.status, total: Number(final.total) }, { status: "closed", total: 100 });
  });

  // Conserto da junta do #608 (fix-608c-cl): o CP1 no Prisma, o critério da `P-08C2-CLOSE-POOL-PRESO` (o CP1 acima roda no dublê,
  // sem pool, e não fica vermelho com a M-CP1). O provedor de entradas é o REAL (`RepositoryStatementInputsProvider` sobre o
  // cliente do papel efêmero), para que o `inputs.resolve` peça conexões ao MESMO pool das 10 transações. 3 rodadas, cada uma com
  // um demonstrativo NOVO: 1 `closed`, 9 `already_closed`, 0 erro (nem 409 por expiração, nem 500).
  test("CP1-db (P-08C2-CLOSE-POOL-PRESO): dez fechamentos concorrentes no Prisma, 3 rodadas → 1 closed e 9 already_closed, 0 erro", async () => {
    const client = kit.role.client;
    const repository = new M.runtime.PrismaStatementRepository(client);
    const audit = new M.runtime.PrismaStatementAuditSink(client);
    const inputs = new M.inputs.RepositoryStatementInputsProvider(
      new M.subscriptions.PrismaSubscriptionsRepository(client),
      new M.plans.PrismaPlansRepository(client),
      new M.tenants.PrismaTenantLookup(client),
      new M.runtime.PrismaUsageSource(client),
      new M.runtime.PrismaBindingsSource(client),
    );
    const service = new StatementService(repository, inputs, audit);
    const OCT_1 = new Date("2026-10-01T00:00:00-03:00");
    for (let round = 1; round <= 3; round += 1) {
      const slug = `c08c3-cp1db-${round}-${randomUUID().slice(0, 8)}`;
      const tenantId = (await kit.one(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, slug)).id as string;
      const planId = (await kit.one(`INSERT INTO subscription_plans (code, kind, name) VALUES ($1, 'base', $1) RETURNING id`, `cp1db_${randomUUID().replaceAll("-", "").slice(0, 10)}`)).id as string;
      await kit.owner.$executeRawUnsafe(
        `INSERT INTO subscription_plan_versions (plan_id, version, valid_from, monthly_price, included_users, included_storage_gb, extra_user_price, extra_gb_price, per_vehicle_price, pricing_unit, modules)
         VALUES ($1::uuid, 1, $2::timestamptz, 100.00, 10, 10.000, 5.00, 2.00, NULL, 'flat', ARRAY['dashboard']::text[])`,
        planId,
        OCT_1,
      );
      await kit.owner.$executeRawUnsafe(`INSERT INTO tenant_subscriptions (tenant_id, plan_id, valid_from) VALUES ($1::uuid, $2::uuid, $3::timestamptz)`, tenantId, planId, OCT_1);
      const results = await Promise.allSettled(Array.from({ length: 10 }, () => service.close({ tenantId, period: "2026-10", now: WHEN, actorId: null, source: "job" })));
      const tally: Record<string, number> = {};
      for (const result of results) {
        const key = result.status === "fulfilled" ? result.value.kind : `erro ${(result.reason as { statusCode?: number })?.statusCode ?? "?"} ${(result.reason as { reason?: string })?.reason ?? (result.reason as Error)?.message ?? ""}`;
        tally[key] = (tally[key] ?? 0) + 1;
      }
      assert.deepEqual(tally, { closed: 1, already_closed: 9 }, `rodada ${round}: ${JSON.stringify(tally)}`);
      const statements = await kit.rows(`SELECT status, total_amount::text AS total FROM subscription_statements WHERE tenant_id = $1::uuid AND period = '2026-10'`, tenantId);
      assert.deepEqual(statements.map((row) => ({ status: row.status, total: Number(row.total) })), [{ status: "closed", total: 100 }], `rodada ${round}`);
    }
  });
}
