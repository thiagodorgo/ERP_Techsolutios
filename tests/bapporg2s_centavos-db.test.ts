// B-APP-ORG-2S, fatia S2e (Emenda 1.8.3 §3 e §5.1; Emenda 1.8.3.1 §5) — os centavos exatos da comissão, do banco à rota.
//
// O app real (`createApp`) roda no modo `prisma` sobre uma base PRÓPRIA (template0 + `migrate deploy`), com o singleton do
// Prisma apontado para um papel efêmero NOSUPERUSER NOBYPASSRLS (o RLS vale de verdade). As linhas de
// `commission_calculations` são gravadas pelo dono da base com o valor EXATO em `numeric` (6 casas) e lidas pelas rotas
// que já existem. A credencial é a legada de teste (cabeçalhos `x-tenant-id`/`x-user-id`/`x-role`, aceita só em dev e
// test); a cadeia de token já foi provada na U3 do plano e não é o objeto desta fatia.
//
// Casos:
//   CS1       — `GET /commissions/calculations/mine`: `amountCents` de `1.005000`, `2.675000`, `10.075000`, `5.555555`,
//               `0.333333` e `99999999999999.995000` = "101", "268", "1008", "556", "33" e "10000000000000000", sempre texto.
//   CS2       — `GET /commissions/statements/my-summary`: `totalCents` do ITEM = "1008" (só `10.075000`), "1376"
//               (`1.005000` + `2.675000` + `10.075000` = 13,755 exato) e "100" (3 × `0.333333`).
//   CS2-total — o mesmo resumo, o `totalCents` do TOTAL geral: "1008", "1376" e "100".
//   CS2b      — `GET /commissions/statements/summary` (visão do pátio) com dois beneficiários de `0.005000`: itens "1" e "1";
//               total "1" (a soma exata arredondada uma vez).
// Mutações que estes testes matam (plano, literais): MN1, MN2 (CS1); MN3 (CS2); MN4, MN5 (CS2-total); MN4b (CS2b).
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

type Json = Record<string, any>;

if (!connectionString) {
  test("B-APP-ORG-2S S2e · centavos exatos da comissão pelas rotas exigem DATABASE_URL", { skip: "Defina DATABASE_URL para os testes -db." });
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

  async function api(route: string, headers: Record<string, string>): Promise<{ status: number; body: Json }> {
    const response = await fetch(baseUrl + route, { headers });
    return { status: response.status, body: (await response.json()) as Json };
  }

  function asPayee(tenantId: string, userId: string): Record<string, string> {
    return { "x-tenant-id": tenantId, "x-user-id": userId, "x-role": "field_technician" };
  }

  function asFinance(tenantId: string): Record<string, string> {
    return { "x-tenant-id": tenantId, "x-user-id": randomUUID(), "x-role": "finance" };
  }

  async function seedTenant(tag: string): Promise<{ tenantId: string; policyId: string }> {
    const slug = `s2e-${tag}-${randomUUID().slice(0, 8)}`;
    const tenantId = ((await db.$queryRawUnsafe(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, slug)) as Array<{ id: string }>)[0]!.id;
    const policyId = ((await db.$queryRawUnsafe(
      `INSERT INTO commission_policies (tenant_id, name, scope, vertical, effective_from) VALUES ($1::uuid, $2, 'tenant', 'field_services', now()) RETURNING id`,
      tenantId,
      `S2e ${tag}`,
    )) as Array<{ id: string }>)[0]!.id;
    return { tenantId, policyId };
  }

  async function seedUser(tenantId: string, tag: string): Promise<string> {
    return ((await db.$queryRawUnsafe(
      `INSERT INTO users (tenant_id, name, email) VALUES ($1::uuid, $2, $3) RETURNING id`,
      tenantId,
      `Técnico ${tag}`,
      `s2e-${tag}-${randomUUID().slice(0, 8)}@example.test`,
    )) as Array<{ id: string }>)[0]!.id;
  }

  /** Grava uma linha de comissão com o valor EXATO (texto → numeric). Devolve a chave de idempotência da linha. */
  async function seedCalculation(fixture: { tenantId: string; policyId: string }, payeeId: string, amount: string): Promise<string> {
    const key = `s2e-${randomUUID()}`;
    const basisEventId = ((await db.$queryRawUnsafe(
      `INSERT INTO commission_basis_events (tenant_id, source_type, source_id, source_event_name, idempotency_key, payload, occurred_at, policy_id)
       VALUES ($1::uuid, 'work_order', $2, 'work_order.completed', $2, '{}'::jsonb, now(), $3::uuid) RETURNING id`,
      fixture.tenantId,
      key,
      fixture.policyId,
    )) as Array<{ id: string }>)[0]!.id;
    await db.$executeRawUnsafe(
      `INSERT INTO commission_calculations (tenant_id, basis_event_id, policy_id, payee_id, amount, status, calculation_snapshot, idempotency_key)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::numeric, 'calculated', '{}'::jsonb, $6)`,
      fixture.tenantId,
      basisEventId,
      fixture.policyId,
      payeeId,
      amount,
      key,
    );
    const [stored] = (await db.$queryRawUnsafe(`SELECT amount::text AS amount FROM commission_calculations WHERE idempotency_key = $1`, key)) as Array<{ amount: string }>;
    assert.equal(stored!.amount, amount, "a linha guarda o valor exato de 6 casas");
    return key;
  }

  function assertCentsText(value: unknown, expected: string, label: string): void {
    assert.equal(typeof value, "string", `${label}: centavos em texto, nunca número`);
    assert.match(value as string, /^\d+$/, `${label}: só dígitos`);
    assert.equal(value, expected, label);
  }

  // Cenários (cada beneficiário tem o seu; o `my-summary` fixa o beneficiário no ator).
  let mine: { tenantId: string; userId: string; keys: Map<string, string> };
  let oneLine: { tenantId: string; userId: string };
  let threeLines: { tenantId: string; userId: string };
  let thirds: { tenantId: string; userId: string };
  let halfCents: { tenantId: string; payees: [string, string] };

  test("setup: base própria migrada, papel NOSUPERUSER NOBYPASSRLS, linhas de 6 casas e o app real no modo prisma", async () => {
    const { PrismaClient } = await import("@prisma/client");
    const { createPgAdapter } = await import("../src/database/pg-connection.js");
    admin = new PrismaClient({ adapter: createPgAdapter(connectionString!) });
    const base = decodeURIComponent(new URL(connectionString!).pathname.replace(/^\//, "")) || "postgres";
    databaseName = `${base}_s2e_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}" TEMPLATE template0`);
    const url = new URL(connectionString!);
    url.pathname = `/${databaseName}`;
    const targetUrl = url.toString();
    const prismaCli = createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");
    execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], { cwd: ROOT, env: { ...process.env, DATABASE_URL: targetUrl }, stdio: "pipe" });
    db = new PrismaClient({ adapter: createPgAdapter(targetUrl) });
    role = await createEphemeralRole(db, targetUrl);
    const [posture] = (await db.$queryRawUnsafe(`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = $1`, role.roleName)) as Array<{ rolsuper: boolean; rolbypassrls: boolean }>;
    assert.deepEqual(posture, { rolsuper: false, rolbypassrls: false });

    // CS1: um beneficiário com as 6 linhas.
    const t1 = await seedTenant("t1");
    const mineUser = await seedUser(t1.tenantId, "cs1");
    const keys = new Map<string, string>();
    for (const amount of ["1.005000", "2.675000", "10.075000", "5.555555", "0.333333", "99999999999999.995000"]) {
      keys.set(await seedCalculation(t1, mineUser, amount), amount);
    }
    mine = { tenantId: t1.tenantId, userId: mineUser, keys };

    // CS2 / CS2-total: três beneficiários na mesma organização.
    const one = await seedUser(t1.tenantId, "cs2-um");
    await seedCalculation(t1, one, "10.075000");
    oneLine = { tenantId: t1.tenantId, userId: one };
    const three = await seedUser(t1.tenantId, "cs2-tres");
    for (const amount of ["1.005000", "2.675000", "10.075000"]) await seedCalculation(t1, three, amount);
    threeLines = { tenantId: t1.tenantId, userId: three };
    const third = await seedUser(t1.tenantId, "cs2-terco");
    for (let i = 0; i < 3; i += 1) await seedCalculation(t1, third, "0.333333");
    thirds = { tenantId: t1.tenantId, userId: third };

    // CS2b: organização própria, dois beneficiários de meio centavo.
    const t2 = await seedTenant("t2");
    const q1 = await seedUser(t2.tenantId, "cs2b-a");
    const q2 = await seedUser(t2.tenantId, "cs2b-b");
    await seedCalculation(t2, q1, "0.005000");
    await seedCalculation(t2, q2, "0.005000");
    halfCents = { tenantId: t2.tenantId, payees: [q1, q2] };

    (globalThis as { prisma?: unknown }).prisma = role.client;
    process.env.DATABASE_URL = targetUrl;
    process.env.CORE_SAAS_PERSISTENCE = "prisma";
    process.env.LOG_LEVEL = "silent";
    const [envModule, { createApp }, { MemoryCoreSaasAdapter }, { CoreSaasRegistry }, { InMemoryCoreSaasStore }, { resetCommissionRuntimeForTests }] =
      await Promise.all([
        import("../src/config/env.js"),
        import("../src/app.js"),
        import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
        import("../src/modules/core-saas/services/core-saas.service.js"),
        import("../src/modules/core-saas/store/core-saas.store.js"),
        import("../src/modules/commissions/index.js"),
      ]);
    (envModule.env as unknown as { CORE_SAAS_PERSISTENCE: string }).CORE_SAAS_PERSISTENCE = "prisma";
    resetCommissionRuntimeForTests();
    const app = createApp(new MemoryCoreSaasAdapter(new CoreSaasRegistry(new InMemoryCoreSaasStore())));
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server!.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  test("CS1 · calculations/mine: amountCents exato e em texto para as 6 linhas de 6 casas", async () => {
    const expected: Record<string, string> = {
      "1.005000": "101",
      "2.675000": "268",
      "10.075000": "1008",
      "5.555555": "556",
      "0.333333": "33",
      "99999999999999.995000": "10000000000000000",
    };
    const response = await api("/api/v1/commissions/calculations/mine?limit=50", asPayee(mine.tenantId, mine.userId));
    assert.equal(response.status, 200, JSON.stringify(response.body));
    const items = response.body.items as Json[];
    assert.equal(items.length, 6);
    for (const item of items) {
      const amount = mine.keys.get(item.idempotencyKey as string);
      assert.ok(amount, `linha conhecida: ${item.idempotencyKey}`);
      assertCentsText(item.amountCents, expected[amount!]!, `CS1 amountCents de ${amount}`);
      assert.equal(typeof item.amount, "number", "o `amount` em número segue para a web");
    }
  });

  async function mySummary(scenario: { tenantId: string; userId: string }): Promise<Json> {
    const response = await api("/api/v1/commissions/statements/my-summary", asPayee(scenario.tenantId, scenario.userId));
    assert.equal(response.status, 200, JSON.stringify(response.body));
    return response.body.data as Json;
  }

  test("CS2 · my-summary: totalCents do item = 1008 (10.075000), 1376 (13,755 exato) e 100 (3 × 0.333333)", async () => {
    for (const [scenario, expected, label] of [
      [oneLine, "1008", "uma linha de 10.075000"],
      [threeLines, "1376", "1.005000 + 2.675000 + 10.075000"],
      [thirds, "100", "3 × 0.333333"],
    ] as const) {
      const data = await mySummary(scenario);
      const items = data.items as Json[];
      assert.equal(items.length, 1, label);
      assert.equal(items[0]!.payeeId, scenario.userId, label);
      assertCentsText(items[0]!.totalCents, expected, `CS2 item, ${label}`);
    }
  });

  test("CS2-total · my-summary: totalCents do TOTAL geral = 1008, 1376 e 100", async () => {
    for (const [scenario, expected, label] of [
      [oneLine, "1008", "uma linha de 10.075000"],
      [threeLines, "1376", "1.005000 + 2.675000 + 10.075000"],
      [thirds, "100", "3 × 0.333333"],
    ] as const) {
      const data = await mySummary(scenario);
      assertCentsText(data.totalCents, expected, `CS2-total, ${label}`);
      assert.equal(typeof data.total, "number", "o `total` em número segue para a web");
    }
  });

  test("CS2b · statements/summary com dois beneficiários de 0.005000: itens 1 e 1, total 1 (soma exata arredondada uma vez)", async () => {
    const response = await api("/api/v1/commissions/statements/summary", asFinance(halfCents.tenantId));
    assert.equal(response.status, 200, JSON.stringify(response.body));
    const data = response.body.data as Json;
    const items = data.items as Json[];
    assert.deepEqual(items.map((item) => item.payeeId).sort(), [...halfCents.payees].sort());
    for (const item of items) assertCentsText(item.totalCents, "1", "CS2b item");
    assertCentsText(data.totalCents, "1", "CS2b total");
  });
}
