// B-ASS-08c1b — o cancelamento de cobrança: a ROTA (`POST …/statements/:statementId/charge/cancel`, F3) e o HANDLER do
// `charge_cancel` no despacho (F6), no PostgreSQL, sob papel efêmero NOSUPERUSER NOBYPASSRLS (drill do B-O6R-06).
//
// O app real (`createApp`) roda no modo `prisma` sobre uma base PRÓPRIA (template0 + `migrate deploy`), com o singleton do
// Prisma apontado para o cliente do papel. Os testes de banco constroem o cliente pela fábrica `createPgAdapter` (#554).
//
// A rota (abertura §4.3), sob a trava do demonstrativo (`[CANCEL-LOCK]`); vale a 1ª linha que casar:
//   CC3 — `charge_create` PROCESSING → 409 `charge_in_flight`, nada gravado;
//   CC4 — dois cancelamentos concorrentes (barreira pelo `pg_stat_activity`) → 1 linha `charge_cancel`, o outro 409
//         `charge_cancel_in_progress` (`[CANCEL-ONE]`);
//   CC5 — `charge_create` PENDING → SKIPPED, `skip_reason` NULL, `last_error = charge_cancel_requested`, 0 rede;
//   CC7 — só `charge_create` em NEEDS_REVIEW → 422 `outbox_needs_review`;
//   CC-NADA — nada vivo → 422 `no_live_charge`.
// Mutação M-CC4: apagar a linha `[CANCEL-ONE]` → CC4 vermelho (2 linhas `charge_cancel`).
import "dotenv/config";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createRequire } from "node:module";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// O vencimento que ainda vale: a data de negócio de hoje em São Paulo + 30 dias (nunca a data UTC, nunca um literal que envelhece).
const DUE_FUTURA = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
const PLATFORM = { "x-user-id": "usr_platform", "x-role": "super_admin" } as const;
const REASON = "cliente pediu o cancelamento da cobrança";

type Json = Record<string, any>;

if (!connectionString) {
  test("B-ASS-08c1b · o cancelamento de cobrança exige DATABASE_URL", { skip: "Defina DATABASE_URL para os testes -db." });
} else {
  let admin: any;
  let db: any;
  let role: EphemeralRole;
  let databaseName = "";
  let server: Server | undefined;
  let baseUrl = "";

  after(async () => {
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    await role?.drop();
    await db?.$disconnect();
    if (admin && databaseName) await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    await admin?.$disconnect();
  });

  async function api(method: string, route: string, body?: unknown): Promise<{ status: number; body: Json }> {
    const response = await fetch(baseUrl + route, {
      method,
      headers: { "content-type": "application/json", ...PLATFORM },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: (await response.json()) as Json };
  }

  type Fixture = { readonly tenantId: string; readonly statementId: string };

  async function seedClosed(tag: string): Promise<Fixture> {
    const slug = `c1b-cc-${tag}-${randomUUID().slice(0, 8)}`;
    const tenantId = ((await db.$queryRawUnsafe(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, slug)) as Array<{ id: string }>)[0]!.id;
    const statementId = ((await db.$queryRawUnsafe(
      `INSERT INTO subscription_statements
         (tenant_id, period, status, segments, users_included, users_peak, users_extra, storage_included_gb, storage_peak_gb,
          storage_extra_gb, tracked_vehicles, days_in_month, days_measured, extra_user_price, extra_gb_price,
          base_amount, users_extra_amount, storage_extra_amount, tracking_amount, adjustments_amount,
          credits_applied_amount, total_amount, due_date, closed_at, snapshot)
       VALUES ($1::uuid, '2026-10', 'closed', '[]'::jsonb, 0,0,0, 0,0,0, 0, 31,31, 0,0, 123.45,0,0,0,0,0,123.45, '${DUE_FUTURA}', now(),
               '{"latest":null,"history":[]}'::jsonb)
       RETURNING id`,
      tenantId,
    )) as Array<{ id: string }>)[0]!.id;
    await db.$executeRawUnsafe(`INSERT INTO billing_statement_refs (statement_id, tenant_id, provider) VALUES ($1::uuid, $2::uuid, 'asaas')`, statementId, tenantId);
    return { tenantId, statementId };
  }

  /** Uma linha `charge_create` no estado pedido; `SENT` ganha `external_id` e a cobrança `pending` na tabela. */
  async function seedChargeCreate(fixture: Fixture, status: string, options: { readonly seq?: number; readonly chargeId?: string } = {}): Promise<{ id: string; chargeId: string | null }> {
    const chargeId = status === "SENT" ? (options.chargeId ?? `pay_cc_${randomUUID().slice(0, 8)}`) : null;
    const rows = (await db.$queryRawUnsafe(
      `INSERT INTO billing_outbox (tenant_id, statement_id, kind, provider, idempotency_key, provider_idempotency_key, payload, occurred_at, status, attempts,
                                  external_id, claimed_by, claimed_at, attempt_started_at, last_error)
       VALUES ($1::uuid, $2::uuid, 'charge_create', 'asaas', $3, gen_random_uuid(), '{"amountCents":12345,"dueDate":"${DUE_FUTURA}","method":"pix"}'::jsonb, now(), $4, 1,
               $5, CASE WHEN $4 = 'PROCESSING' THEN 'dispatch-outbox:cc' END, CASE WHEN $4 = 'PROCESSING' THEN now() END, CASE WHEN $4 = 'PROCESSING' THEN now() END,
               CASE WHEN $4 = 'NEEDS_REVIEW' THEN 'charge_found_no_candidate' END)
       RETURNING id`,
      fixture.tenantId,
      fixture.statementId,
      `charge_create:${fixture.statementId}:${options.seq ?? 1}`,
      status,
      chargeId,
    )) as Array<{ id: string }>;
    if (chargeId) {
      await db.$executeRawUnsafe(
        `INSERT INTO subscription_statement_charges (tenant_id, statement_id, provider, external_charge_id, status, due_date, created_at)
         VALUES ($1::uuid, $2::uuid, 'asaas', $3, 'pending', '${DUE_FUTURA}', now())`,
        fixture.tenantId,
        fixture.statementId,
        chargeId,
      );
    }
    return { id: rows[0]!.id, chargeId };
  }

  async function lines(statementId: string): Promise<Array<{ id: string; kind: string; status: string; skip_reason: string | null; last_error: string | null; payload: Json; external_id: string | null; idempotency_key: string }>> {
    return (await db.$queryRawUnsafe(
      `SELECT id, kind, status, skip_reason, last_error, payload, external_id, idempotency_key FROM billing_outbox WHERE statement_id = $1::uuid ORDER BY created_at, idempotency_key`,
      statementId,
    )) as any[];
  }

  test("setup: base própria migrada, papel NOSUPERUSER NOBYPASSRLS e o app real no modo prisma sobre o papel", async () => {
    const { PrismaClient } = await import("@prisma/client");
    admin = new PrismaClient({ adapter: (await import("../src/database/pg-connection.js")).createPgAdapter(connectionString!) });
    const base = decodeURIComponent(new URL(connectionString!).pathname.replace(/^\//, "")) || "postgres";
    databaseName = `${base}_c1b_cc_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}" TEMPLATE template0`);
    const url = new URL(connectionString!);
    url.pathname = `/${databaseName}`;
    const targetUrl = url.toString();
    const prismaCli = createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");
    execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], { cwd: ROOT, env: { ...process.env, DATABASE_URL: targetUrl }, stdio: "pipe" });
    db = new PrismaClient({ adapter: (await import("../src/database/pg-connection.js")).createPgAdapter(targetUrl) });
    role = await createEphemeralRole(db, targetUrl);
    const [posture] = (await db.$queryRawUnsafe(`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = $1`, role.roleName)) as Array<{ rolsuper: boolean; rolbypassrls: boolean }>;
    assert.deepEqual(posture, { rolsuper: false, rolbypassrls: false });

    (globalThis as { prisma?: unknown }).prisma = role.client;
    process.env.DATABASE_URL = targetUrl;
    process.env.CORE_SAAS_PERSISTENCE = "prisma";
    process.env.LOG_LEVEL = "silent";
    process.env.JWT_SECRET = "dev-only-change-me";
    process.env.JWT_EXPIRES_IN = "15m";
    const [{ env }, { createApp }, { MemoryCoreSaasAdapter }, { CoreSaasRegistry }, { InMemoryCoreSaasStore }, { resetStatementRuntimeForTests }] = await Promise.all([
      import("../src/config/env.js"),
      import("../src/app.js"),
      import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
      import("../src/modules/core-saas/services/core-saas.service.js"),
      import("../src/modules/core-saas/store/core-saas.store.js"),
      import("../src/modules/subscription-billing/statements/statement.factory.js"),
    ]);
    (env as unknown as { CORE_SAAS_PERSISTENCE: string }).CORE_SAAS_PERSISTENCE = "prisma";
    resetStatementRuntimeForTests();
    // F6: o Asaas LIGADO na base descartável (a fixture; o código de produção só liga por `setEnabled`), com chave de cofre de
    // teste gerada agora — o CC1 pede um novo `/charge` pela rota no fim.
    await db.$executeRawUnsafe(`INSERT INTO billing_provider_configs (provider, kind, environment, enabled, enabled_environment) VALUES ('asaas', 'payment', 'sandbox', true, 'sandbox')`);
    (env as unknown as { BILLING_PROVIDERS_ENABLED: boolean }).BILLING_PROVIDERS_ENABLED = true;
    const [vaultFactory, { EnvVaultKeyProvider }] = await Promise.all([import("../src/modules/subscription-billing/vault/vault.factory.js"), import("../src/modules/subscription-billing/vault/vault-keys.js")]);
    vaultFactory.resetVaultRuntimeForTests();
    vaultFactory.setVaultKeysForTests(new EnvVaultKeyProvider({ BILLING_VAULT_KEY: randomBytes(32).toString("base64"), BILLING_VAULT_KEY_VERSION: "1" }));
    const app = createApp(new MemoryCoreSaasAdapter(new CoreSaasRegistry(new InMemoryCoreSaasStore())));
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server!.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  const cancelRoute = (fixture: Fixture) => `/api/v1/platform/billing/statements/${fixture.statementId}/charge/cancel`;

  test("CC3: charge_create PROCESSING → 409 charge_in_flight, nada gravado", async () => {
    const fixture = await seedClosed("cc3");
    await seedChargeCreate(fixture, "PROCESSING");
    const before = await lines(fixture.statementId);
    const response = await api("POST", cancelRoute(fixture), { tenantId: fixture.tenantId, reason: REASON });
    assert.equal(response.status, 409, JSON.stringify(response.body));
    assert.equal(response.body.error?.reason, "charge_in_flight");
    assert.deepEqual(await lines(fixture.statementId), before);
  });

  test("CC4: dois cancelamentos concorrentes → 1 linha charge_cancel, o outro 409 charge_cancel_in_progress", async () => {
    const fixture = await seedClosed("cc4");
    const sent = await seedChargeCreate(fixture, "SENT");
    const { Client } = (await import("pg")) as any;
    const holder = new Client({ connectionString: process.env.DATABASE_URL });
    await holder.connect();
    await holder.query("BEGIN");
    await holder.query(`SELECT id FROM subscription_statements WHERE id = $1::uuid FOR UPDATE`, [fixture.statementId]);
    const body = { tenantId: fixture.tenantId, reason: REASON };
    const both = Promise.all([api("POST", cancelRoute(fixture), body), api("POST", cancelRoute(fixture), body)]);
    const deadline = Date.now() + 4_000;
    let waiting = 0;
    while (Date.now() < deadline) {
      const rows = (await db.$queryRawUnsafe(`SELECT count(*)::int AS n FROM pg_stat_activity WHERE usename = $1 AND wait_event_type = 'Lock'`, role.roleName)) as Array<{ n: number }>;
      waiting = rows[0]!.n;
      if (waiting >= 2) break;
      await new Promise((resolve) => setTimeout(resolve, 15));
    }
    await holder.query("ROLLBACK");
    await holder.end();
    assert.equal(waiting, 2, "os dois cancelamentos esperaram a trava do demonstrativo");
    const results = await both;
    assert.deepEqual(results.map((result) => result.status).sort(), [200, 409], JSON.stringify(results.map((result) => result.body)));
    assert.equal(results.find((result) => result.status === 409)!.body.error?.reason, "charge_cancel_in_progress");
    const cancels = (await lines(fixture.statementId)).filter((line) => line.kind === "charge_cancel");
    assert.equal(cancels.length, 1, "uma linha charge_cancel só");
    assert.equal(cancels[0]!.status, "PENDING");
    assert.deepEqual(cancels[0]!.payload, { chargeId: sent.chargeId, chargeCreateId: sent.id });
    assert.equal(cancels[0]!.idempotency_key, `charge_cancel:${fixture.statementId}:1`);
    const ok = results.find((result) => result.status === 200)!.body.data;
    assert.equal(ok.result, "cancel_enqueued");
    assert.equal(ok.outbox.kind, "charge_cancel");
    assert.equal("payload" in ok.outbox, false);
  });

  test("CC5: charge_create PENDING → SKIPPED, skip_reason NULL, last_error charge_cancel_requested, 0 rede", async () => {
    const fixture = await seedClosed("cc5");
    const pending = await seedChargeCreate(fixture, "PENDING");
    const response = await api("POST", cancelRoute(fixture), { tenantId: fixture.tenantId, reason: REASON });
    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.equal(response.body.data.result, "skipped");
    const after = await lines(fixture.statementId);
    assert.equal(after.length, 1, "nenhuma linha nova: não há cobrança no provedor a cancelar");
    assert.deepEqual(
      { id: after[0]!.id, status: after[0]!.status, skip_reason: after[0]!.skip_reason, last_error: after[0]!.last_error },
      { id: pending.id, status: "SKIPPED", skip_reason: null, last_error: "charge_cancel_requested" },
    );
    // A trilha, na MESMA transação: só ids, kind, código e o motivo.
    const trail = (await db.$queryRawUnsafe(
      `SELECT action, entity, entity_id, metadata FROM audit_logs WHERE tenant_id = $1::uuid AND action = 'billing_outbox.charge_cancel_requested'`,
      fixture.tenantId,
    )) as Array<{ action: string; entity: string; entity_id: string; metadata: Json }>;
    assert.equal(trail.length, 1);
    assert.equal(trail[0]!.entity, "billing_outbox");
    assert.equal(trail[0]!.entity_id, pending.id);
    assert.equal(trail[0]!.metadata.code, "skipped");
    assert.equal(trail[0]!.metadata.kind, "charge_create");
    assert.equal(trail[0]!.metadata.reason, REASON);
  });

  test("CC7: só charge_create em NEEDS_REVIEW → 422 outbox_needs_review (a saída é o /resolve)", async () => {
    const fixture = await seedClosed("cc7");
    await seedChargeCreate(fixture, "NEEDS_REVIEW");
    const before = await lines(fixture.statementId);
    const response = await api("POST", cancelRoute(fixture), { tenantId: fixture.tenantId, reason: REASON });
    assert.equal(response.status, 422, JSON.stringify(response.body));
    assert.equal(response.body.error?.reason, "outbox_needs_review");
    assert.deepEqual(await lines(fixture.statementId), before);
  });

  test("CC-NADA: nada vivo → 422 no_live_charge; motivo curto → 400", async () => {
    const fixture = await seedClosed("cc-nada");
    const response = await api("POST", cancelRoute(fixture), { tenantId: fixture.tenantId, reason: REASON });
    assert.equal(response.status, 422, JSON.stringify(response.body));
    assert.equal(response.body.error?.reason, "no_live_charge");
    const short = await api("POST", cancelRoute(fixture), { tenantId: fixture.tenantId, reason: "curto" });
    assert.equal(short.status, 400, JSON.stringify(short.body));
    assert.equal(short.body.error?.reason, "reason_too_short");
  });

  /** Uma linha `charge_cancel` no estado pedido, para a cobrança `chargeId`. */
  async function seedChargeCancel(fixture: Fixture, status: string, chargeId: string, seq: number, chargeCreateId: string): Promise<string> {
    const rows = (await db.$queryRawUnsafe(
      `INSERT INTO billing_outbox (tenant_id, statement_id, kind, provider, idempotency_key, provider_idempotency_key, payload, occurred_at, status, attempts, last_error)
       VALUES ($1::uuid, $2::uuid, 'charge_cancel', 'asaas', $3, gen_random_uuid(), $4::jsonb, now(), $5, 1, CASE WHEN $5 = 'FAILED' THEN 'provider_unavailable' END) RETURNING id`,
      fixture.tenantId,
      fixture.statementId,
      `charge_cancel:${fixture.statementId}:${seq}`,
      JSON.stringify({ chargeId, chargeCreateId }),
      status,
    )) as Array<{ id: string }>;
    return rows[0]!.id;
  }

  test("CC8: o /retry não contorna o [CANCEL-ONE] — um 2º charge_cancel da mesma cobrança, e uma charge_create com charge_cancel vivo → 409", async () => {
    const fixture = await seedClosed("cc8");
    const sent = await seedChargeCreate(fixture, "SENT");
    const failedCancel = await seedChargeCancel(fixture, "FAILED", sent.chargeId!, 1, sent.id);
    await seedChargeCancel(fixture, "PENDING", sent.chargeId!, 2, sent.id);
    const first = await api("POST", `/api/v1/platform/billing/outbox/${failedCancel}/retry`, { tenantId: fixture.tenantId });
    assert.equal(first.status, 409, JSON.stringify(first.body));
    assert.equal(first.body.error?.reason, "charge_cancel_in_progress");

    const other = await seedClosed("cc8-create");
    const failedCreate = (await db.$queryRawUnsafe(
      `INSERT INTO billing_outbox (tenant_id, statement_id, kind, provider, idempotency_key, provider_idempotency_key, payload, occurred_at, status, attempts, last_error)
       VALUES ($1::uuid, $2::uuid, 'charge_create', 'asaas', $3, gen_random_uuid(), '{"amountCents":12345,"dueDate":"2099-12-10","method":"pix"}'::jsonb, now(), 'FAILED', 8, 'provider_unavailable') RETURNING id`,
      other.tenantId,
      other.statementId,
      `charge_create:${other.statementId}:1`,
    )) as Array<{ id: string }>;
    await seedChargeCancel(other, "NEEDS_REVIEW", "pay_cc8_unknown", 1, failedCreate[0]!.id);
    const second = await api("POST", `/api/v1/platform/billing/outbox/${failedCreate[0]!.id}/retry`, { tenantId: other.tenantId });
    assert.equal(second.status, 409, JSON.stringify(second.body));
    assert.equal(second.body.error?.reason, "charge_cancel_in_progress");

    const statuses = (await lines(fixture.statementId)).filter((line) => line.kind === "charge_cancel").map((line) => line.status).sort();
    assert.deepEqual(statuses, ["FAILED", "PENDING"], "nada reaberto: 1 charge_cancel vivo");
    assert.equal((await lines(other.statementId)).find((line) => line.kind === "charge_create")!.status, "FAILED");
  });

  // --------------------------------------------------------------------------------- F6: o handler do `charge_cancel`
  // O despacho REAL (`runDispatchOutbox` + `PrismaOutboxRepository` do papel) sobre o falso do Asaas pelo adaptador real.
  // A cobrança nasce de verdade: `/charge` pela rota → despacho (POST /v3/payments) → SENT + cobrança `pending` na tabela.

  type Fake = Awaited<ReturnType<typeof import("./helpers/fake-providers/asaas.js").startAsaasFake>>;

  // UM falso para o arquivo inteiro: os ids `pay_NNNN` recomeçam a cada `startAsaasFake`, e a tabela de cobranças é UNIQUE por
  // (provedor, id externo) — com um falso por caso, o 2º caso repetiria o id do 1º. As opções do cancelamento são lidas a cada
  // requisição do MESMO objeto, que cada caso preenche e esvazia; `recorded` é a fatia do próprio caso.
  const fakeOptions: Record<string, unknown> = {};
  let sharedFake: Fake | undefined;
  after(async () => {
    await sharedFake?.close();
  });

  async function withFake<T>(options: Record<string, unknown>, fn: (fake: Fake) => Promise<T>): Promise<T> {
    if (!sharedFake) {
      const { startAsaasFake } = await import("./helpers/fake-providers/asaas.js");
      sharedFake = await startAsaasFake("ok", fakeOptions as never);
    }
    const shared = sharedFake;
    const from = shared.recorded.length;
    Object.assign(fakeOptions, options);
    const view = { ...shared, get recorded() { return shared.recorded.slice(from); } } as Fake;
    try {
      return await fn(view);
    } finally {
      for (const key of Object.keys(fakeOptions)) delete fakeOptions[key];
    }
  }

  async function portOver(fake: Fake) {
    const [http, asaas] = await Promise.all([
      import("../src/modules/subscription-billing/providers/http/billing-http.client.js"),
      import("../src/modules/subscription-billing/providers/payment/asaas/index.js"),
    ]);
    const client = new http.BillingHttpClient({ provider: "asaas", environment: "sandbox", channelEnabled: true, allowLocalHosts: true, nodeEnv: "test", baseUrl: `${fake.baseUrl}/v3` });
    return new asaas.AsaasPaymentAdapter(client, async (kind) => (kind === "api_token" ? "TOKEN-FAKE" : "WEBHOOK-FAKE"));
  }

  async function dispatch(tenantId: string, port: unknown, options: { readonly at?: Date; readonly failRecord?: boolean } = {}) {
    const [dispatcher, outboxPrisma] = await Promise.all([
      import("../src/modules/subscription-billing/outbox/outbox.dispatcher.js"),
      import("../src/modules/subscription-billing/outbox/outbox.prisma.js"),
    ]);
    const at = options.at ?? new Date();
    return dispatcher.runDispatchOutbox({
      repo: new outboxPrisma.PrismaOutboxRepository(role.client, {
        tenantIds: [tenantId],
        ...(options.failRecord ? { afterChargeCancelRecord: async () => { throw new Error("falha_injetada_do_registro_do_cancelamento"); } } : {}),
      }),
      ports: { asaas: port as never },
      resolveCustomer: async () => ({ ok: true as const, customerId: "cus_fake_cc" }),
      now: () => at,
    });
  }

  const deletes = (fake: Fake) => fake.recorded.filter((request) => request.method === "DELETE").length;
  const chargeRoute = (fixture: Fixture) => `/api/v1/platform/billing/statements/${fixture.statementId}/charge`;

  /** A cobrança criada de verdade: `/charge` pela rota → despacho → SENT + `pending` na tabela; depois o `charge/cancel`. */
  async function chargeThenCancel(tag: string, fake: Fake, port: unknown): Promise<{ fixture: Fixture; chargeId: string; createId: string; cancelId: string }> {
    const fixture = await seedClosed(tag);
    const charged = await api("POST", chargeRoute(fixture), { tenantId: fixture.tenantId });
    assert.equal(charged.status, 201, JSON.stringify(charged.body));
    const created = await dispatch(fixture.tenantId, port);
    assert.equal(created.outcomes.sent, 1, JSON.stringify(created.outcomes));
    const create = (await lines(fixture.statementId)).find((line) => line.kind === "charge_create")!;
    assert.equal(create.status, "SENT");
    const cancel = await api("POST", cancelRoute(fixture), { tenantId: fixture.tenantId, reason: REASON });
    assert.equal(cancel.status, 200, JSON.stringify(cancel.body));
    assert.equal(cancel.body.data.result, "cancel_enqueued");
    return { fixture, chargeId: create.external_id!, createId: create.id, cancelId: cancel.body.data.outbox.id };
  }

  async function chargeRow(statementId: string): Promise<{ status: string; cancelled_at: Date | null }> {
    return ((await db.$queryRawUnsafe(`SELECT status, cancelled_at FROM subscription_statement_charges WHERE statement_id = $1::uuid`, statementId)) as any[])[0];
  }

  test("CC1: SENT → charge_cancel → despacho → 1 DELETE, cobrança cancelled, a velha SKIPPED COM external_id (skip_reason NULL, last_error charge_cancelled), e um novo /charge passa", async () => {
    await withFake({}, async (fake) => {
      const port = await portOver(fake);
      const { fixture, chargeId, createId, cancelId } = await chargeThenCancel("cc1", fake, port);
      const result = await dispatch(fixture.tenantId, port);
      assert.equal(result.outcomes.sent, 1, JSON.stringify(result.outcomes));
      assert.equal(deletes(fake), 1, "1 DELETE");
      const all = await lines(fixture.statementId);
      const create = all.find((line) => line.id === createId)!;
      assert.deepEqual(
        { status: create.status, skip_reason: create.skip_reason, last_error: create.last_error, external_id: create.external_id },
        { status: "SKIPPED", skip_reason: null, last_error: "charge_cancelled", external_id: chargeId },
      );
      assert.equal(all.find((line) => line.id === cancelId)!.status, "SENT");
      const charge = await chargeRow(fixture.statementId);
      assert.equal(charge.status, "cancelled");
      assert.ok(charge.cancelled_at);
      const again = await api("POST", chargeRoute(fixture), { tenantId: fixture.tenantId });
      assert.equal(again.status, 201, JSON.stringify(again.body));
    });
  });

  test("CC2: a lista diz PAGA → NEEDS_REVIEW charge_already_paid, 0 DELETE", async () => {
    await withFake({}, async (fake) => {
      const port = await portOver(fake);
      const { fixture, chargeId, cancelId } = await chargeThenCancel("cc2", fake, port);
      fake.setPaymentStatus(chargeId, "RECEIVED");
      const result = await dispatch(fixture.tenantId, port);
      assert.equal(result.outcomes.needs_review, 1, JSON.stringify(result.outcomes));
      assert.equal(deletes(fake), 0, "0 DELETE");
      const cancel = (await lines(fixture.statementId)).find((line) => line.id === cancelId)!;
      assert.deepEqual({ status: cancel.status, last_error: cancel.last_error }, { status: "NEEDS_REVIEW", last_error: "charge_already_paid" });
      assert.equal((await chargeRow(fixture.statementId)).status, "pending", "nada registrado como cancelado");
    });
  });

  test("CC2b: paga ENTRE a consulta e o DELETE (o falso recusa com 400) → a reconsulta diz paga → conferência, 1 DELETE recusado, nada registrado", async () => {
    await withFake({ refuseDeleteWhenReceived: true }, async (fake) => {
      const port = await portOver(fake);
      const { fixture, chargeId, cancelId } = await chargeThenCancel("cc2b", fake, port);
      let calls = 0;
      const racing = Object.create(port) as typeof port;
      racing.listChargesByExternalReference = async (ref: string) => {
        const listed = await port.listChargesByExternalReference(ref);
        calls += 1;
        if (calls === 1) fake.setPaymentStatus(chargeId, "RECEIVED");
        return listed;
      };
      const result = await dispatch(fixture.tenantId, racing);
      assert.equal(result.outcomes.needs_review, 1, JSON.stringify(result.outcomes));
      assert.equal(deletes(fake), 1, "1 DELETE, recusado");
      assert.equal(calls, 2, "a reconsulta veio depois do DELETE recusado");
      const cancel = (await lines(fixture.statementId)).find((line) => line.id === cancelId)!;
      assert.deepEqual({ status: cancel.status, last_error: cancel.last_error }, { status: "NEEDS_REVIEW", last_error: "charge_already_paid" });
      assert.equal((await chargeRow(fixture.statementId)).status, "pending");
    });
  });

  /** A falha do registro DEPOIS do DELETE deixa a linha PROCESSING; a órfã (11 min depois) termina pelo passo 1. */
  async function failThenOrphan(tag: string, options: Record<string, unknown>) {
    return withFake(options, async (fake) => {
      const port = await portOver(fake);
      const { fixture, cancelId, createId } = await chargeThenCancel(tag, fake, port);
      const t0 = new Date();
      const first = await dispatch(fixture.tenantId, port, { at: t0, failRecord: true });
      assert.equal(first.outcomes.record_failed, 1, JSON.stringify(first.outcomes));
      const afterFailure = (await lines(fixture.statementId)).find((line) => line.id === cancelId)!;
      assert.equal(afterFailure.status, "PROCESSING", "a falha do registro não passa por registerFailure");
      const rounds: string[] = [];
      for (let round = 1; round <= 8; round += 1) {
        await dispatch(fixture.tenantId, port, { at: new Date(t0.getTime() + round * 11 * 60 * 1000) });
        rounds.push((await lines(fixture.statementId)).find((line) => line.id === cancelId)!.status);
      }
      const all = await lines(fixture.statementId);
      return { fake, fixture, cancel: all.find((line) => line.id === cancelId)!, create: all.find((line) => line.id === createId)!, rounds };
    });
  }

  test("CC6-falso: a falha do registro depois do DELETE → PROCESSING; a órfã vê a removida como cancelled e registra; 1 DELETE no total", async () => {
    const outcome = await failThenOrphan("cc6-falso", {});
    assert.equal(deletes(outcome.fake), 1, "1 DELETE no total");
    assert.equal(outcome.cancel.status, "SENT");
    assert.equal(outcome.create.status, "SKIPPED");
    assert.equal((await chargeRow(outcome.fixture.statementId)).status, "cancelled");
  });

  test("CC6-doc: a mesma falha na forma DOCUMENTADA do DELETE (status mantido + deleted: true) → a órfã registra; 1 DELETE no total", async () => {
    const outcome = await failThenOrphan("cc6-doc", { deleteDocumented: true });
    assert.equal(deletes(outcome.fake), 1, "1 DELETE no total");
    assert.equal(outcome.cancel.status, "SENT");
    assert.equal((await chargeRow(outcome.fixture.statementId)).status, "cancelled");
  });

  test("CC6c: removida entre a consulta e o DELETE, e o DELETE responde 404 → a reconsulta registra; 0 FAILED, 0 reagendamento", async () => {
    await withFake({ deleteRemoved404: true }, async (fake) => {
      const port = await portOver(fake);
      const { fixture, chargeId, cancelId } = await chargeThenCancel("cc6c", fake, port);
      let calls = 0;
      const racing = Object.create(port) as typeof port;
      racing.listChargesByExternalReference = async (ref: string) => {
        const listed = await port.listChargesByExternalReference(ref);
        calls += 1;
        if (calls === 1) fake.patchPayment(chargeId, { status: "DELETED", deleted: true });
        return listed;
      };
      const result = await dispatch(fixture.tenantId, racing);
      assert.equal(result.outcomes.sent, 1, JSON.stringify(result.outcomes));
      assert.equal(result.outcomes.retry + result.outcomes.failed, 0, "0 reagendamento, 0 FAILED");
      assert.equal(deletes(fake), 1);
      assert.equal((await lines(fixture.statementId)).find((line) => line.id === cancelId)!.status, "SENT");
      assert.equal((await chargeRow(fixture.statementId)).status, "cancelled");
    });
  });

  test("CC6d: removida com status PAGO e sem data → charge_already_paid, nunca registrada como cancelada; 0 DELETE", async () => {
    await withFake({}, async (fake) => {
      const port = await portOver(fake);
      const { fixture, chargeId, cancelId } = await chargeThenCancel("cc6d", fake, port);
      fake.patchPayment(chargeId, { deleted: true, status: "RECEIVED" });
      const result = await dispatch(fixture.tenantId, port);
      assert.equal(result.outcomes.needs_review, 1, JSON.stringify(result.outcomes));
      assert.equal(deletes(fake), 0);
      const cancel = (await lines(fixture.statementId)).find((line) => line.id === cancelId)!;
      assert.deepEqual({ status: cancel.status, last_error: cancel.last_error }, { status: "NEEDS_REVIEW", last_error: "charge_already_paid" });
      assert.equal((await chargeRow(fixture.statementId)).status, "pending");
    });
  });

  test("CC6e: cobrança conhecida AUSENTE da lista completa → NEEDS_REVIEW charge_not_listed, 0 DELETE, e nunca FAILED em 8 rodadas", async () => {
    await withFake({ omitRemoved: true }, async (fake) => {
      const port = await portOver(fake);
      const { fixture, chargeId, cancelId } = await chargeThenCancel("cc6e", fake, port);
      fake.patchPayment(chargeId, { status: "DELETED", deleted: true });
      const t0 = new Date();
      for (let round = 0; round < 8; round += 1) await dispatch(fixture.tenantId, port, { at: new Date(t0.getTime() + round * 11 * 60 * 1000) });
      assert.equal(deletes(fake), 0, "nenhum DELETE às cegas");
      const cancel = (await lines(fixture.statementId)).find((line) => line.id === cancelId)!;
      assert.deepEqual({ status: cancel.status, last_error: cancel.last_error }, { status: "NEEDS_REVIEW", last_error: "charge_not_listed" });
    });
  });

  test("CC6f: na forma da 5ª opção (status mantido + deleted + estimatedCreditDate), com a falha do registro → a órfã termina charge_state_unknown; 1 DELETE; nunca FAILED; nada registrado", async () => {
    const outcome = await failThenOrphan("cc6f", { deleteDocumentedWithEstimate: true });
    assert.equal(deletes(outcome.fake), 1, "1 DELETE no total, nunca um 2º");
    assert.deepEqual({ status: outcome.cancel.status, last_error: outcome.cancel.last_error }, { status: "NEEDS_REVIEW", last_error: "charge_state_unknown" });
    assert.ok(!outcome.rounds.includes("FAILED"), `nunca FAILED: ${outcome.rounds.join(",")}`);
    assert.equal(outcome.create.status, "SENT", "a charge_create não foi registrada como cancelada");
    assert.equal((await chargeRow(outcome.fixture.statementId)).status, "pending", "a cobrança da tabela continua pending");
  });
}

// CC9 (puro, sem banco; Emenda 2 §1.3): o veredito exige EXATAMENTE 1 entrada do `chargeId` — conta com `filter`.
test("CC9: duas entradas do mesmo chargeId, nas duas ordens → charge_listed_twice; uma pending ao lado de outra cobrança → seguir", async () => {
  const { cancelTargetVerdict } = await import("../src/modules/subscription-billing/outbox/outbox.dispatcher.js");
  const entry = (chargeId: string, status: string) => ({ chargeId, status, amountCents: 12345, createdAt: "2026-11-14" }) as never;
  assert.deepEqual(cancelTargetVerdict([entry("pay_1", "pending"), entry("pay_1", "cancelled")], "pay_1", false), { kind: "review", code: "charge_listed_twice" });
  assert.deepEqual(cancelTargetVerdict([entry("pay_1", "cancelled"), entry("pay_1", "pending")], "pay_1", false), { kind: "review", code: "charge_listed_twice" });
  assert.deepEqual(cancelTargetVerdict([entry("pay_2", "paid"), entry("pay_1", "pending")], "pay_1", false), { kind: "proceed" });
  assert.deepEqual(cancelTargetVerdict([entry("pay_2", "pending")], "pay_1", false), { kind: "review", code: "charge_not_listed" });
  assert.deepEqual(cancelTargetVerdict([entry("pay_2", "pending")], "pay_1", true), { kind: "review", code: "unknown_charge_not_in_reference" });
  assert.deepEqual(cancelTargetVerdict([entry("pay_1", "unknown")], "pay_1", false), { kind: "review", code: "charge_state_unknown" });
  assert.deepEqual(cancelTargetVerdict([entry("pay_1", "cancelled")], "pay_1", false), { kind: "register" });
  for (const paid of ["paid", "partially_paid", "refunded", "partially_refunded", "chargeback_disputed", "charged_back"]) {
    assert.deepEqual(cancelTargetVerdict([entry("pay_1", paid)], "pay_1", false), { kind: "review", code: "charge_already_paid" }, paid);
  }
  for (const live of ["pending", "overdue"]) assert.deepEqual(cancelTargetVerdict([entry("pay_1", live)], "pay_1", false), { kind: "proceed" }, live);
});

// GT-GET (guarda de texto, Emenda 1 §2.4): dentro do handler do `charge_cancel`, `getCharge` aparece 0 vezes — o veredito
// vem SÓ da lista por referência.
test("GT-GET · guarda: o handler do charge_cancel não chama getCharge", () => {
  const source = readFileSync(path.join(ROOT, "src/modules/subscription-billing/outbox/outbox.dispatcher.ts"), "utf8");
  const start = source.indexOf("async function dispatchChargeCancel(");
  assert.ok(start > 0, "o handler existe");
  const rest = source.slice(start + 1);
  const end = rest.search(/\n(async )?function |\nexport /);
  const body = rest.slice(0, end < 0 ? undefined : end);
  assert.equal(body.split("getCharge").length - 1, 0, "getCharge no handler do cancelamento");
  assert.ok(body.includes("cancelTargetVerdict("), "o handler decide pela lista");
});
