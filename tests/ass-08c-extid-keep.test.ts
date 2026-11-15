// B-ASS-08c1b (F9, abertura §4.9; Emenda 2 §7.3) — as pré-condições da régua U, que lê o `external_id` das intenções
// ANTERIORES do demonstrativo:
//
//   EK1 (sem banco, censo por TEXTO) — nenhum escritor de `src/**` zera o `external_id` de `billing_outbox`: nem por SQL
//       (`external_id = NULL`), nem pelo Prisma (`external_id: null`), nem pelo dublê da fila (`externalId: null` fora do
//       nascimento da linha). A lista dos escritores fica CONGELADA aqui: escritor novo, ou um dos de hoje mudado, = vermelho.
//   C9-fixo (banco) — fixa o comportamento de hoje e a saída dele. Depois de uma recobrança cuja resposta se perdeu, a cobrança
//       criada fica viva no provedor e desconhecida aqui, e a linha vai à conferência (`charge_found_for_previous_intent`).
//       Sem o `cancel-unknown`, `/resolve` + `/retry` devolve a linha à MESMA conferência (0 POST). A saída é o F7: o
//       `cancel-unknown` dessa cobrança (1 DELETE), depois `/resolve` + `/retry` da linha, que então cria (1 POST novo) e
//       termina com 1 cobrança viva.
// Mutação M-EK: um escritor grava `external_id = NULL` → EK1 vermelho.
import "dotenv/config";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createRequire } from "node:module";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DUBLE = "src/modules/subscription-billing/outbox/outbox.repository.ts";

// ------------------------------------------------------------------------------------------------------------- EK1
type Writer = { readonly file: string; readonly form: "sql" | "prisma" | "duble"; readonly value: string };

/** Os escritores de HOJE, congelados, com o porquê de cada um. Nenhum grava nulo, salvo o nascimento da linha no dublê. */
const FROZEN_WRITERS: ReadonlyArray<Writer & { readonly why: string }> = [
  { file: "src/modules/subscription-billing/outbox/outbox.prisma.ts", form: "prisma", value: "externalId", why: "markSent: o id que o provedor devolveu" },
  { file: "src/modules/subscription-billing/outbox/outbox.prisma.ts", form: "sql", value: "$4", why: "recordChargeOutcome: a cobrança criada ou adotada" },
  { file: "src/modules/subscription-billing/outbox/outbox.prisma.ts", form: "sql", value: "$5", why: "recordChargeCancelOutcome: a cobrança cancelada" },
  { file: DUBLE, form: "duble", value: "null", why: "o NASCIMENTO da linha (enqueue): ainda não há id do provedor" },
  { file: DUBLE, form: "duble", value: "externalId", why: "markSent do dublê" },
  { file: DUBLE, form: "duble", value: "chargeId", why: "recordChargeCancelOutcome do dublê" },
];

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sources(full);
    return full.endsWith(".ts") ? [full] : [];
  });
}

/** O código da linha sem comentário: a linha que é só comentário (`//`, `*`, `/*`) some; o `// …` do fim também. */
function codeOf(line: string): string {
  const trimmed = line.trim();
  if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return "";
  return line.replace(/\s\/\/ .*$/, "");
}

/** Um valor que é TIPO (`string | null`), e não escrita: a declaração da linha do banco e os parâmetros dos métodos. */
const isType = (value: string): boolean => /^(string|number|boolean)\b/.test(value.trim());

function census(): Writer[] {
  const found: Writer[] = [];
  for (const full of sources(path.join(ROOT, "src"))) {
    const file = path.relative(ROOT, full).replaceAll("\\", "/");
    for (const raw of readFileSync(full, "utf8").split(/\r?\n/)) {
      const line = codeOf(raw);
      if (!line) continue;
      for (const match of line.matchAll(/\bexternal_id\s*=\s*([^\s,)]+)/g)) found.push({ file, form: "sql", value: match[1]! });
      for (const match of line.matchAll(/\bexternal_id:\s*([^,}]+)/g)) if (!isType(match[1]!)) found.push({ file, form: "prisma", value: match[1]!.trim() });
      if (file !== DUBLE) continue;
      // O dublê da fila: a propriedade `externalId` num objeto (com valor, ou abreviada), fora das assinaturas tipadas.
      for (const match of line.matchAll(/\bexternalId\b(?:\s*:\s*([^,}]+))?\s*[,}]/g)) {
        const value = match[1]?.trim() ?? "externalId";
        if (!isType(value)) found.push({ file, form: "duble", value });
      }
    }
  }
  return found;
}

const key = (writer: Writer): string => `${writer.file} :: ${writer.form} :: ${writer.value}`;

test("EK1: nenhum escritor de src/** zera o external_id de billing_outbox; os escritores são os congelados", () => {
  const found = census().map(key).sort();
  assert.deepEqual(found, FROZEN_WRITERS.map(key).sort(), "escritor de external_id novo, sumido ou mudado: atualize a lista congelada só com motivo");
  const nulls = census().filter((writer) => /^(null|NULL)$/.test(writer.value) && !(writer.file === DUBLE && writer.form === "duble"));
  assert.deepEqual(nulls.map(key), [], "um escritor grava external_id nulo");
  assert.equal(census().filter((writer) => writer.file === DUBLE && /^(null|NULL)$/.test(writer.value)).length, 1, "o dublê só nasce a linha com externalId nulo, uma vez");
});

// --------------------------------------------------------------------------------------------------------- C9-fixo
const PLATFORM = { "x-user-id": "usr_platform", "x-role": "super_admin" } as const;
const REASON = "cobrança achada no painel do provedor";
// O vencimento do demonstrativo: a data de negócio de hoje em São Paulo + 30 dias (nunca a data UTC, nunca um literal que envelhece).
const DUE_FUTURA = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

type Json = Record<string, any>;

if (!connectionString) {
  test("B-ASS-08c1b · o C9-fixo exige DATABASE_URL", { skip: "Defina DATABASE_URL para os testes -db." });
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

  async function seedClosed(tag: string): Promise<{ tenantId: string; statementId: string }> {
    const slug = `c1b-ek-${tag}-${randomUUID().slice(0, 8)}`;
    const tenantId = ((await db.$queryRawUnsafe(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, slug)) as Array<{ id: string }>)[0]!.id;
    const statementId = ((await db.$queryRawUnsafe(
      `INSERT INTO subscription_statements
         (tenant_id, period, status, segments, users_included, users_peak, users_extra, storage_included_gb, storage_peak_gb,
          storage_extra_gb, tracked_vehicles, days_in_month, days_measured, extra_user_price, extra_gb_price,
          base_amount, users_extra_amount, storage_extra_amount, tracking_amount, adjustments_amount,
          credits_applied_amount, total_amount, due_date, closed_at, snapshot)
       VALUES ($1::uuid, '2026-10', 'closed', '[]'::jsonb, 0,0,0, 0,0,0, 0, 31,31, 0,0, 123.45,0,0,0,0,0,123.45, $2::date, now(),
               '{"latest":null,"history":[]}'::jsonb)
       RETURNING id`,
      tenantId,
      DUE_FUTURA,
    )) as Array<{ id: string }>)[0]!.id;
    await db.$executeRawUnsafe(`INSERT INTO billing_statement_refs (statement_id, tenant_id, provider) VALUES ($1::uuid, $2::uuid, 'asaas')`, statementId, tenantId);
    return { tenantId, statementId };
  }

  async function line(id: string): Promise<{ status: string; last_error: string | null; external_id: string | null }> {
    return ((await db.$queryRawUnsafe(`SELECT status, last_error, external_id FROM billing_outbox WHERE id = $1::uuid`, id)) as any[])[0];
  }

  test("setup: base própria migrada, papel NOSUPERUSER NOBYPASSRLS e o app real no modo prisma sobre o papel", async () => {
    const { PrismaClient } = await import("@prisma/client");
    admin = new PrismaClient({ adapter: (await import("../src/database/pg-connection.js")).createPgAdapter(connectionString!) });
    const base = decodeURIComponent(new URL(connectionString!).pathname.replace(/^\//, "")) || "postgres";
    databaseName = `${base}_c1b_ek_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
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

  test("C9-fixo: a recobrança com a resposta perdida vai à conferência; sem o cancel-unknown, /resolve + /retry volta a ela; com ele, cria 1 e fica 1 viva", async () => {
    const [{ startAsaasFake }, dispatcher, outboxPrisma, http, asaas] = await Promise.all([
      import("./helpers/fake-providers/asaas.js"),
      import("../src/modules/subscription-billing/outbox/outbox.dispatcher.js"),
      import("../src/modules/subscription-billing/outbox/outbox.prisma.js"),
      import("../src/modules/subscription-billing/providers/http/billing-http.client.js"),
      import("../src/modules/subscription-billing/providers/payment/asaas/index.js"),
    ]);
    const fake = await startAsaasFake("ok");
    try {
      const client = new http.BillingHttpClient({ provider: "asaas", environment: "sandbox", channelEnabled: true, allowLocalHosts: true, nodeEnv: "test", baseUrl: `${fake.baseUrl}/v3` });
      const port = new asaas.AsaasPaymentAdapter(client, async (kind) => (kind === "api_token" ? "TOKEN-FAKE" : "WEBHOOK-FAKE"));
      const fixture = await seedClosed("c9");
      const dispatch = (target: unknown, at: Date = new Date()) =>
        dispatcher.runDispatchOutbox({
          repo: new outboxPrisma.PrismaOutboxRepository(role.client, { tenantIds: [fixture.tenantId] }),
          ports: { asaas: target as never },
          resolveCustomer: async () => ({ ok: true as const, customerId: "cus_fake_ek" }),
          now: () => at,
        });
      const posts = () => fake.recorded.filter((request) => request.method === "POST" && request.path.split("?")[0] === "/v3/payments").length;
      const deletes = () => fake.recorded.filter((request) => request.method === "DELETE").length;
      const live = async () =>
        ((await db.$queryRawUnsafe(`SELECT external_charge_id FROM subscription_statement_charges WHERE statement_id = $1::uuid AND status = 'pending'`, fixture.statementId)) as Array<{ external_charge_id: string }>).map((row) => row.external_charge_id);
      const statementRoute = `/api/v1/platform/billing/statements/${fixture.statementId}`;

      // R0: cobrada e cancelada pelo caminho de sempre. A linha velha fica SKIPPED e MANTÉM o external_id (a régua U o lê).
      const r0 = await api("POST", `${statementRoute}/charge`, { tenantId: fixture.tenantId });
      assert.equal(r0.status, 201, JSON.stringify(r0.body));
      assert.equal((await dispatch(port)).outcomes.sent, 1);
      const r0Charge = (await line(String(r0.body.data.id))).external_id!;
      assert.equal((await api("POST", `${statementRoute}/charge/cancel`, { tenantId: fixture.tenantId, reason: REASON })).status, 200);
      assert.equal((await dispatch(port)).outcomes.sent, 1);
      assert.deepEqual(await line(String(r0.body.data.id)), { status: "SKIPPED", last_error: "charge_cancelled", external_id: r0Charge });

      // R1: a recobrança. O POST chega ao provedor e a resposta se perde (o adaptador real cria; a porta lança depois).
      const r1 = await api("POST", `${statementRoute}/charge`, { tenantId: fixture.tenantId });
      assert.equal(r1.status, 201, JSON.stringify(r1.body));
      const r1Id = String(r1.body.data.id);
      let lost = "";
      const losing = Object.create(port) as typeof port;
      losing.createCharge = async (input) => {
        lost = (await port.createCharge(input)).chargeId;
        throw Object.assign(new Error("a resposta do POST se perdeu"), { code: "provider_timeout" });
      };
      assert.equal((await dispatch(losing)).outcomes.retry, 1);
      assert.ok(lost, "a cobrança de R1 existe no provedor");
      assert.deepEqual(await line(r1Id), { status: "PENDING", last_error: "provider_timeout", external_id: null });

      // O comportamento de HOJE: a retentativa acha a cobrança perdida, mas existe outra intenção (R0) → conferência.
      const later = new Date(Date.now() + 2 * 60 * 60 * 1000);
      assert.equal((await dispatch(port, later)).outcomes.needs_review, 1);
      assert.equal((await line(r1Id)).last_error, "charge_found_for_previous_intent");

      // Sem o cancel-unknown: /resolve + /retry devolve a linha à MESMA conferência, com 0 POST.
      const postsBefore = posts();
      assert.equal((await api("POST", `/api/v1/platform/billing/outbox/${r1Id}/resolve`, { tenantId: fixture.tenantId, reason: "tentativa sem cancelar a perdida" })).status, 200);
      assert.equal((await api("POST", `/api/v1/platform/billing/outbox/${r1Id}/retry`, { tenantId: fixture.tenantId })).status, 200);
      assert.equal((await dispatch(port, later)).outcomes.needs_review, 1);
      assert.deepEqual({ status: (await line(r1Id)).status, last_error: (await line(r1Id)).last_error }, { status: "NEEDS_REVIEW", last_error: "charge_found_for_previous_intent" });
      assert.equal(posts() - postsBefore, 0, "0 POST sem a saída");

      // A saída (F7): cancel-unknown da perdida → 1 DELETE; depois /resolve + /retry de R1 → cria (1 POST novo), 1 viva.
      const deletesBefore = deletes();
      const unknown = await api("POST", `${statementRoute}/charge/cancel-unknown`, { tenantId: fixture.tenantId, chargeId: lost, reason: REASON });
      assert.equal(unknown.status, 200, JSON.stringify(unknown.body));
      assert.equal((await dispatch(port, later)).outcomes.sent, 1);
      assert.equal(deletes() - deletesBefore, 1, "1 DELETE da cobrança perdida");
      assert.equal((await api("POST", `/api/v1/platform/billing/outbox/${r1Id}/resolve`, { tenantId: fixture.tenantId, reason: "a perdida foi cancelada no provedor" })).status, 200);
      assert.equal((await api("POST", `/api/v1/platform/billing/outbox/${r1Id}/retry`, { tenantId: fixture.tenantId })).status, 200);
      const created = await dispatch(port, later);
      assert.equal(created.outcomes.sent, 1, JSON.stringify(created.outcomes));
      assert.equal(posts() - postsBefore, 1, "1 POST novo");
      const final = await line(r1Id);
      assert.equal(final.status, "SENT");
      assert.ok(final.external_id && final.external_id !== lost && final.external_id !== r0Charge);
      assert.deepEqual(await live(), [final.external_id], "1 cobrança viva no fim, a nova");
      // As intenções anteriores mantêm o id do provedor (EK1 na prática).
      assert.equal((await line(String(r0.body.data.id))).external_id, r0Charge);
    } finally {
      await fake.close();
    }
  });
}
