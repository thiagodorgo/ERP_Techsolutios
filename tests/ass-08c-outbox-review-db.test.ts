// B-ASS-08c1b — a fila operável pela ROTA REAL, no PostgreSQL, sob papel efêmero NOSUPERUSER NOBYPASSRLS (drill do B-O6R-06).
//
// O app real (`createApp`) roda no modo `prisma` sobre uma base PRÓPRIA (template0 + `migrate deploy`), com o singleton do
// Prisma apontado para o cliente do papel efêmero: toda leitura e escrita das rotas passa pelo RLS da organização. A base é
// apagada no fim (`DROP DATABASE … WITH (FORCE)`), e o papel pelo teardown resiliente.
//
// Casos (abertura §5.1 e Emendas 1 e 2):
//   RO1 (F1, P8) — reopen com linha NEEDS_REVIEW → 422 `outbox_needs_review` pela rota, com a leitura no MESMO `tx`: o papel
//   abre UMA conexão só durante o pedido (com o guard numa transação à parte seriam duas, porque a do reopen segura a
//   sua). Mutação M9: apagar a linha `[GUARD-01]` → 200.
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

type Json = Record<string, any>;

if (!connectionString) {
  test("B-ASS-08c1b · a fila operável exige DATABASE_URL", { skip: "Defina DATABASE_URL para os testes -db." });
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

  async function roleBackends(): Promise<number> {
    const rows = (await db.$queryRawUnsafe(`SELECT count(*)::int AS n FROM pg_stat_activity WHERE usename = $1`, role.roleName)) as Array<{ n: number }>;
    return rows[0]!.n;
  }

  /** Organização + demonstrativo `closed` sem pagamento, sem cobrança e sem nota (o reopen passa, salvo o guard). */
  async function seedClosed(tag: string): Promise<{ tenantId: string; statementId: string }> {
    const slug = `c1b-rv-${tag}-${randomUUID().slice(0, 8)}`;
    const tenantId = ((await db.$queryRawUnsafe(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, slug)) as Array<{ id: string }>)[0]!.id;
    const statementId = ((await db.$queryRawUnsafe(
      `INSERT INTO subscription_statements
         (tenant_id, period, status, segments, users_included, users_peak, users_extra, storage_included_gb, storage_peak_gb,
          storage_extra_gb, tracked_vehicles, days_in_month, days_measured, extra_user_price, extra_gb_price,
          base_amount, users_extra_amount, storage_extra_amount, tracking_amount, adjustments_amount,
          credits_applied_amount, total_amount, due_date, closed_at, snapshot)
       VALUES ($1::uuid, '2026-10', 'closed', '[]'::jsonb, 0,0,0, 0,0,0, 0, 31,31, 0,0, 123.45,0,0,0,0,0,123.45, '2026-11-20', now(),
               '{"latest":null,"history":[]}'::jsonb)
       RETURNING id`,
      tenantId,
    )) as Array<{ id: string }>)[0]!.id;
    await db.$executeRawUnsafe(`INSERT INTO billing_statement_refs (statement_id, tenant_id, provider) VALUES ($1::uuid, $2::uuid, 'asaas')`, statementId, tenantId);
    return { tenantId, statementId };
  }

  async function seedOutbox(
    fixture: { tenantId: string; statementId: string },
    kind: string,
    status: string,
    extra: { readonly seq?: number; readonly lastError?: string | null; readonly payload?: Record<string, unknown> } = {},
  ): Promise<string> {
    const rows = (await db.$queryRawUnsafe(
      `INSERT INTO billing_outbox (tenant_id, statement_id, kind, provider, idempotency_key, provider_idempotency_key, payload, occurred_at, status, attempts, last_error)
       VALUES ($1::uuid, $2::uuid, $3, 'asaas', $4, gen_random_uuid(), $5::jsonb, now(), $6, 1, $7) RETURNING id`,
      fixture.tenantId,
      fixture.statementId,
      kind,
      `${kind}:${fixture.statementId}:${extra.seq ?? 1}`,
      JSON.stringify(extra.payload ?? { amountCents: 12345, dueDate: "2026-11-20", method: "pix" }),
      status,
      extra.lastError ?? null,
    )) as Array<{ id: string }>;
    return rows[0]!.id;
  }

  async function statementStatus(statementId: string): Promise<string> {
    const rows = (await db.$queryRawUnsafe(`SELECT status FROM subscription_statements WHERE id = $1::uuid`, statementId)) as Array<{ status: string }>;
    return rows[0]!.status;
  }

  test("setup: base própria migrada, papel NOSUPERUSER NOBYPASSRLS e o app real no modo prisma sobre o papel", async () => {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    admin = new PrismaClient({ adapter: (await import("../src/database/pg-connection.js")).createPgAdapter(connectionString!) });
    const base = decodeURIComponent(new URL(connectionString!).pathname.replace(/^\//, "")) || "postgres";
    databaseName = `${base}_c1b_rv_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
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

    // O singleton do Prisma do app passa a ser o cliente do papel (src/database/prisma.ts honra `globalThis.prisma`).
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

  test("RO1: reopen com linha NEEDS_REVIEW → 422 outbox_needs_review pela rota, a leitura no mesmo tx (1 conexão do papel)", async () => {
    const fixture = await seedClosed("ro1");
    await seedOutbox(fixture, "charge_create", "NEEDS_REVIEW", { lastError: "charge_found_no_candidate" });
    assert.equal(await roleBackends(), 0, "premissa: o papel ainda não abriu conexão (o RO1 é o 1º pedido do arquivo)");

    const response = await api("POST", `/api/v1/platform/billing/statements/${fixture.statementId}/reopen`, { tenantId: fixture.tenantId, reason: "reabrir para conferir o fechamento" });
    assert.equal(response.status, 422, JSON.stringify(response.body));
    assert.equal(response.body.error?.reason, "outbox_needs_review");
    assert.equal(await statementStatus(fixture.statementId), "closed", "nada gravado");
    assert.equal(await roleBackends(), 1, "a leitura da fila roda no MESMO tx do reopen: o papel nunca precisou de 2 conexões");

    // Controle positivo: sem linha em revisão, a mesma rota reabre.
    const free = await seedClosed("ro1-livre");
    await seedOutbox(free, "charge_create", "FAILED", { lastError: "provider_unavailable" });
    const ok = await api("POST", `/api/v1/platform/billing/statements/${free.statementId}/reopen`, { tenantId: free.tenantId, reason: "reabrir para conferir o fechamento" });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.equal(await statementStatus(free.statementId), "reopened");
  });
}
