// B-ASS-08c2 (item 60) · `P-BILLING-P2028-COMO-400` (plano §4.14, §5.5): PB-2, o C2-05 da J-579 no BANCO. Dez
// `POST …/statements/close` concorrentes do MESMO demonstrativo: toda resposta é 200 ou 409 `statement_busy` (repetível), nenhuma
// 400. Duas formas: (a) a corrida solta, 3 rodadas; (b) a corrida FORÇADA — uma conexão do dono segura o demonstrativo com
// `FOR UPDATE` além do prazo da transação interativa (5 s), e as transações que esperam expiram (o P2028 do C2-05): aí ao menos
// uma resposta é 409 (o controle positivo de que a forma aconteceu).
//
// Roda numa base própria (template0 + `migrate deploy`), sob papel efêmero NOSUPERUSER NOBYPASSRLS (conferido no setup), com o
// app real em 127.0.0.1:0 (plataforma, `super_admin`). O canal fica DESLIGADO: o fechamento não pede cobrança.
import "dotenv/config";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { createRequire } from "node:module";
import type { AddressInfo } from "node:net";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLATFORM = { "x-user-id": "usr_platform", "x-role": "super_admin" } as const;
const OCT_1 = new Date("2026-10-01T00:00:00-03:00");
const N = 10;

if (!connectionString) {
  test("B-ASS-08c2 · PB-2 (-db) exige DATABASE_URL", { skip: "Defina DATABASE_URL para os testes -db." });
} else {
  const H: { admin: any; db: any; role: EphemeralRole; databaseName: string; server?: Server; baseUrl: string } = {
    admin: undefined,
    db: undefined,
    role: undefined as unknown as EphemeralRole,
    databaseName: "",
    baseUrl: "",
  };

  after(async () => {
    if (H.server) await new Promise<void>((resolve) => H.server!.close(() => resolve()));
    await H.role?.drop();
    await H.db?.$disconnect();
    if (H.admin && H.databaseName) await H.admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${H.databaseName}" WITH (FORCE)`);
    await H.admin?.$disconnect();
  });

  const q = (sql: string, ...args: unknown[]) => H.db.$queryRawUnsafe(sql, ...args) as Promise<any[]>;

  async function close(tenantId: string): Promise<{ status: number; reason: string | null; message: string | null }> {
    const response = await fetch(`${H.baseUrl}/api/v1/platform/billing/statements/close`, {
      method: "POST",
      headers: { "content-type": "application/json", ...PLATFORM },
      body: JSON.stringify({ tenantId, period: "2026-10" }),
    });
    const body = (await response.json()) as { error?: { reason?: string; message?: string } };
    return { status: response.status, reason: body.error?.reason ?? null, message: body.error?.message ?? null };
  }

  /** Organização com plano de R$ 100,00 desde 1º/10 (o fechamento real calcula o total). */
  async function seedSubscribed(tag: string): Promise<string> {
    const slug = `c2-pb-${tag}-${randomUUID().slice(0, 8)}`;
    const tenantId = (await q(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, slug))[0].id as string;
    const planId = (await q(`INSERT INTO subscription_plans (code, kind, name) VALUES ($1, 'base', $1) RETURNING id`, `c2pb_${randomUUID().replaceAll("-", "").slice(0, 10)}`))[0].id as string;
    await H.db.$executeRawUnsafe(
      `INSERT INTO subscription_plan_versions (plan_id, version, valid_from, monthly_price, included_users, included_storage_gb, extra_user_price, extra_gb_price, per_vehicle_price, pricing_unit, modules)
       VALUES ($1::uuid, 1, $2::timestamptz, 100.00, 10, 10.000, 5.00, 2.00, NULL, 'flat', ARRAY['dashboard']::text[])`,
      planId,
      OCT_1,
    );
    await H.db.$executeRawUnsafe(`INSERT INTO tenant_subscriptions (tenant_id, plan_id, valid_from) VALUES ($1::uuid, $2::uuid, $3::timestamptz)`, tenantId, planId, OCT_1);
    return tenantId;
  }

  const describe = (results: readonly { status: number; reason: string | null; message?: string | null }[]) => results.map((r) => `${r.status}${r.reason ? ` ${r.reason}` : ""}${r.message && r.status >= 400 ? ` (${r.message})` : ""}`).sort();
  const onlyOkOrBusy = (results: readonly { status: number; reason: string | null }[]) =>
    results.every((r) => r.status === 200 || (r.status === 409 && r.reason === "statement_busy"));

  test("setup: base própria migrada, papel NOSUPERUSER NOBYPASSRLS, o app real, o canal desligado", async () => {
    const { PrismaClient } = await import("@prisma/client");
    const { createPgAdapter } = await import("../src/database/pg-connection.js");
    H.admin = new PrismaClient({ adapter: createPgAdapter(connectionString!) });
    const base = decodeURIComponent(new URL(connectionString!).pathname.replace(/^\//, "")) || "postgres";
    H.databaseName = `${base}_c2_pb_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
    await H.admin.$executeRawUnsafe(`CREATE DATABASE "${H.databaseName}" TEMPLATE template0`);
    const url = new URL(connectionString!);
    url.pathname = `/${H.databaseName}`;
    const targetUrl = url.toString();
    const prismaCli = createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");
    execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], { cwd: ROOT, env: { ...process.env, DATABASE_URL: targetUrl }, stdio: "pipe" });
    H.db = new PrismaClient({ adapter: createPgAdapter(targetUrl) });
    H.role = await createEphemeralRole(H.db, targetUrl);
    const [posture] = (await H.db.$queryRawUnsafe(`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = $1`, H.role.roleName)) as Array<{ rolsuper: boolean; rolbypassrls: boolean }>;
    assert.deepEqual(posture, { rolsuper: false, rolbypassrls: false }, "o papel de runtime é NOSUPERUSER NOBYPASSRLS");
    (globalThis as { prisma?: unknown }).prisma = H.role.client;
    process.env.DATABASE_URL = targetUrl;
    process.env.CORE_SAAS_PERSISTENCE = "prisma";
    process.env.LOG_LEVEL = "silent";
    process.env.JWT_SECRET = "dev-only-change-me";
    process.env.JWT_EXPIRES_IN = "15m";
    const [envModule, { createApp }, { MemoryCoreSaasAdapter }, { CoreSaasRegistry }, { InMemoryCoreSaasStore }, statementFactory, vaultFactory, vaultKeys] = await Promise.all([
      import("../src/config/env.js"),
      import("../src/app.js"),
      import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
      import("../src/modules/core-saas/services/core-saas.service.js"),
      import("../src/modules/core-saas/store/core-saas.store.js"),
      import("../src/modules/subscription-billing/statements/statement.factory.js"),
      import("../src/modules/subscription-billing/vault/vault.factory.js"),
      import("../src/modules/subscription-billing/vault/vault-keys.js"),
    ]);
    envModule.env.CORE_SAAS_PERSISTENCE = "prisma";
    (envModule.env as { BILLING_PROVIDERS_ENABLED: boolean }).BILLING_PROVIDERS_ENABLED = false;
    statementFactory.resetStatementRuntimeForTests();
    vaultFactory.resetVaultRuntimeForTests();
    vaultFactory.setVaultKeysForTests(new vaultKeys.EnvVaultKeyProvider({ BILLING_VAULT_KEY: randomBytes(32).toString("base64"), BILLING_VAULT_KEY_VERSION: "1" }));
    const app = createApp(new MemoryCoreSaasAdapter(new CoreSaasRegistry(new InMemoryCoreSaasStore())));
    H.server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => H.server!.once("listening", resolve));
    H.baseUrl = `http://127.0.0.1:${(H.server.address() as AddressInfo).port}`;
  });

  test("PB-2 (a): 10 POST …/statements/close concorrentes do mesmo demonstrativo, 3 rodadas → toda resposta é 200 ou 409 statement_busy, nenhuma 400; o 409 é repetível (o fechamento seguinte responde 200 e há 1 demonstrativo closed)", async () => {
    for (let round = 1; round <= 3; round += 1) {
      const tenantId = await seedSubscribed(`a${round}`);
      const results = await Promise.all(Array.from({ length: N }, () => close(tenantId)));
      assert.ok(onlyOkOrBusy(results), `rodada ${round}: ${JSON.stringify(describe(results))}`);
      // Repetível: o fechamento seguinte, sozinho, responde 200 (fechado agora ou já fechado).
      assert.equal((await close(tenantId)).status, 200, `rodada ${round}: o fechamento repetido responde 200`);
      const rows = await q(`SELECT status FROM subscription_statements WHERE tenant_id = $1::uuid AND period = '2026-10'`, tenantId);
      assert.deepEqual(rows.map((row) => row.status), ["closed"], `rodada ${round}: 1 demonstrativo, fechado`);
    }
  });

  test("PB-2 (b): o demonstrativo travado pelo dono além do prazo da transação (5 s) → as 10 que esperam expiram: toda resposta é 200 ou 409 statement_busy (ao menos um 409), nenhuma 400; o demonstrativo continua closed", async () => {
    const tenantId = await seedSubscribed("b");
    assert.equal((await close(tenantId)).status, 200, "o fechamento que cria o demonstrativo");
    const [{ id: statementId }] = await q(`SELECT id FROM subscription_statements WHERE tenant_id = $1::uuid AND period = '2026-10'`, tenantId);
    let release!: () => void;
    const released = new Promise<void>((resolve) => (release = resolve));
    let locked!: () => void;
    const holding = new Promise<void>((resolve) => (locked = resolve));
    const owner = H.db.$transaction(
      async (tx: any) => {
        await tx.$queryRawUnsafe(`SELECT id FROM subscription_statements WHERE id = $1::uuid FOR UPDATE`, statementId);
        locked();
        await released;
      },
      { timeout: 60_000, maxWait: 10_000 },
    );
    await holding;
    const started = Date.now();
    const pending = Array.from({ length: N }, () => close(tenantId));
    // Barreira: ao menos uma requisição está ESPERANDO a trava do dono (não é relógio: é o estado do banco).
    for (let i = 0; i < 400; i += 1) {
      const [{ n }] = await q(`SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND pid <> pg_backend_pid()`);
      if (n > 0) break;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    const [{ n: waiting }] = await q(`SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock'`);
    assert.ok(waiting > 0, "controle: alguém espera a trava do dono");
    // Segura além do prazo da transação interativa (5 s, o padrão do Prisma) contado do disparo.
    await new Promise((resolve) => setTimeout(resolve, Math.max(0, 6_500 - (Date.now() - started))));
    release();
    await owner;
    const results = await Promise.all(pending);
    assert.ok(onlyOkOrBusy(results), `nenhuma 400: ${JSON.stringify(describe(results))}`);
    assert.ok(results.some((r) => r.status === 409), `controle positivo: ao menos uma transação expirou e respondeu 409 (${JSON.stringify(describe(results))})`);
    const rows = await q(`SELECT status FROM subscription_statements WHERE tenant_id = $1::uuid AND period = '2026-10'`, tenantId);
    assert.deepEqual(rows.map((row) => row.status), ["closed"], "o demonstrativo continua 1 e fechado");
  });
}
