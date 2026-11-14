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
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createRequire } from "node:module";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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
       VALUES ($1::uuid, '2026-10', 'closed', '[]'::jsonb, 0,0,0, 0,0,0, 0, 31,31, 0,0, 123.45,0,0,0,0,0,123.45, '2026-12-10', now(),
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
       VALUES ($1::uuid, $2::uuid, 'charge_create', 'asaas', $3, gen_random_uuid(), '{"amountCents":12345,"dueDate":"2026-12-10","method":"pix"}'::jsonb, now(), $4, 1,
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
         VALUES ($1::uuid, $2::uuid, 'asaas', $3, 'pending', '2026-12-10', now())`,
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
}
