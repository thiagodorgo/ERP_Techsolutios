// B-ASS-08c1b (F7, abertura §4.7; Emenda 1 §2.1 e §3.6.5) — o `cancel-unknown`: a ação do operador que cancela no provedor uma
// cobrança DESCONHECIDA daqui (a recobrança cuja resposta se perdeu), pela mesma fila e pelo mesmo handler do `charge_cancel`,
// no PostgreSQL, sob papel efêmero NOSUPERUSER NOBYPASSRLS (drill do B-O6R-06).
//
// O app real (`createApp`) roda no modo `prisma` sobre uma base PRÓPRIA (template0 + `migrate deploy`), com o singleton do
// Prisma apontado para o cliente do papel; o despacho REAL (`runDispatchOutbox` + `PrismaOutboxRepository` do papel) fala com o
// falso do Asaas pelo adaptador real. Os clientes de banco nascem pela fábrica `createPgAdapter` (#554).
//
//   UC1 — a desconhecida VIVA desta referência: o `cancel-unknown` faz 1 DELETE e registra; a linha que estava em conferência
//         (`charge_found_for_previous_intent`), depois de `/resolve` + `/retry`, cria (1 POST) e termina com 1 cobrança viva;
//   UC2 — `chargeId` de OUTRA referência → `NEEDS_REVIEW unknown_charge_not_in_reference`, 0 DELETE (o marcador UNKNOWN-REF);
//         o 2º pedido da mesma cobrança, com o 1º vivo → 409 `charge_cancel_in_progress`;
//   UC3 — `chargeId` CONHECIDO → 422 `charge_is_known`, nada gravado;
//   UC4 — a desconhecida está PAGA → `NEEDS_REVIEW charge_already_paid`, 0 DELETE;
//   UC5 — `chargeId` fora de `^[A-Za-z0-9_-]{1,64}$` → 400 `invalid_charge_id`, nada gravado.
// Mutações: M-UC2 (apagar a linha UNKNOWN-REF) → UC2 vermelho; M-UC3 (apagar a recusa `charge_is_known`) → UC3 vermelho.
import "dotenv/config";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
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
const REASON = "cobrança achada no painel do provedor";
// O vencimento do demonstrativo: a data de negócio de hoje em São Paulo + 30 dias (nunca a data UTC, nunca um literal que envelhece).
const DUE_FUTURA = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

type Json = Record<string, any>;

if (!connectionString) {
  test("B-ASS-08c1b · o cancel-unknown exige DATABASE_URL", { skip: "Defina DATABASE_URL para os testes -db." });
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
    const slug = `c1b-uc-${tag}-${randomUUID().slice(0, 8)}`;
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

  type Line = { id: string; kind: string; status: string; skip_reason: string | null; last_error: string | null; payload: Json; external_id: string | null; idempotency_key: string };

  async function lines(statementId: string): Promise<Line[]> {
    return (await db.$queryRawUnsafe(
      `SELECT id, kind, status, skip_reason, last_error, payload, external_id, idempotency_key FROM billing_outbox WHERE statement_id = $1::uuid ORDER BY created_at, idempotency_key`,
      statementId,
    )) as Line[];
  }

  async function chargeRows(statementId: string): Promise<Array<{ external_charge_id: string; status: string }>> {
    return (await db.$queryRawUnsafe(`SELECT external_charge_id, status FROM subscription_statement_charges WHERE statement_id = $1::uuid ORDER BY created_at`, statementId)) as any[];
  }

  test("setup: base própria migrada, papel NOSUPERUSER NOBYPASSRLS e o app real no modo prisma sobre o papel", async () => {
    const { PrismaClient } = await import("@prisma/client");
    admin = new PrismaClient({ adapter: (await import("../src/database/pg-connection.js")).createPgAdapter(connectionString!) });
    const base = decodeURIComponent(new URL(connectionString!).pathname.replace(/^\//, "")) || "postgres";
    databaseName = `${base}_c1b_uc_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
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
    // O Asaas LIGADO na base descartável (a fixture), com chave de cofre de teste gerada agora: as cobranças nascem pela rota
    // `/charge` e pelo despacho real.
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

  type Fake = Awaited<ReturnType<typeof import("./helpers/fake-providers/asaas.js").startAsaasFake>>;

  // UM falso para o arquivo inteiro: os ids `pay_NNNN` recomeçam a cada `startAsaasFake`, e a tabela de cobranças é UNIQUE por
  // (provedor, id externo). `recorded` é a fatia do próprio caso.
  let sharedFake: Fake | undefined;
  after(async () => {
    await sharedFake?.close();
  });

  async function withFake<T>(fn: (fake: Fake) => Promise<T>): Promise<T> {
    if (!sharedFake) {
      const { startAsaasFake } = await import("./helpers/fake-providers/asaas.js");
      sharedFake = await startAsaasFake("ok");
    }
    const shared = sharedFake;
    const from = shared.recorded.length;
    const view = { ...shared, get recorded() { return shared.recorded.slice(from); } } as Fake;
    return fn(view);
  }

  async function portOver(fake: Fake) {
    const [http, asaas] = await Promise.all([
      import("../src/modules/subscription-billing/providers/http/billing-http.client.js"),
      import("../src/modules/subscription-billing/providers/payment/asaas/index.js"),
    ]);
    const client = new http.BillingHttpClient({ provider: "asaas", environment: "sandbox", channelEnabled: true, allowLocalHosts: true, nodeEnv: "test", baseUrl: `${fake.baseUrl}/v3` });
    return new asaas.AsaasPaymentAdapter(client, async (kind) => (kind === "api_token" ? "TOKEN-FAKE" : "WEBHOOK-FAKE"));
  }

  async function dispatch(tenantId: string, port: unknown) {
    const [dispatcher, outboxPrisma] = await Promise.all([
      import("../src/modules/subscription-billing/outbox/outbox.dispatcher.js"),
      import("../src/modules/subscription-billing/outbox/outbox.prisma.js"),
    ]);
    return dispatcher.runDispatchOutbox({
      repo: new outboxPrisma.PrismaOutboxRepository(role.client, { tenantIds: [tenantId] }),
      ports: { asaas: port as never },
      resolveCustomer: async () => ({ ok: true as const, customerId: "cus_fake_uc" }),
      now: () => new Date(),
    });
  }

  const deletes = (fake: Fake) => fake.recorded.filter((request) => request.method === "DELETE").length;
  const posts = (fake: Fake) => fake.recorded.filter((request) => request.method === "POST" && request.path.split("?")[0] === "/v3/payments").length;
  const chargeRoute = (fixture: Fixture) => `/api/v1/platform/billing/statements/${fixture.statementId}/charge`;
  const unknownRoute = (fixture: Fixture) => `/api/v1/platform/billing/statements/${fixture.statementId}/charge/cancel-unknown`;

  /** A cobrança CONHECIDA, criada de verdade: `/charge` pela rota → despacho → SENT + `pending` na tabela. */
  async function charged(tag: string, port: unknown): Promise<{ fixture: Fixture; chargeId: string; createId: string }> {
    const fixture = await seedClosed(tag);
    const response = await api("POST", chargeRoute(fixture), { tenantId: fixture.tenantId });
    assert.equal(response.status, 201, JSON.stringify(response.body));
    const created = await dispatch(fixture.tenantId, port);
    assert.equal(created.outcomes.sent, 1, JSON.stringify(created.outcomes));
    const create = (await lines(fixture.statementId)).find((line) => line.kind === "charge_create")!;
    assert.equal(create.status, "SENT");
    return { fixture, chargeId: create.external_id!, createId: create.id };
  }

  /** Uma cobrança que existe SÓ no provedor (o sistema não a conhece), criada no falso pelo adaptador real. */
  async function providerOnlyCharge(port: { createCharge: (input: never) => Promise<{ chargeId: string }> }, externalReference: string): Promise<string> {
    const created = await port.createCharge({ customerId: "cus_fake_uc", amountCents: 12345, dueDate: DUE_FUTURA, description: "Assinatura", externalReference, method: "pix" } as never);
    return created.chargeId;
  }

  test("UC5: chargeId fora de ^[A-Za-z0-9_-]{1,64}$ → 400 invalid_charge_id, nada gravado", async () => {
    const fixture = await seedClosed("uc5");
    for (const chargeId of ["pay 1", "pay/../1", "x".repeat(65), "", 123, null]) {
      const response = await api("POST", unknownRoute(fixture), { tenantId: fixture.tenantId, chargeId, reason: REASON });
      assert.equal(response.status, 400, `${JSON.stringify(chargeId)}: ${JSON.stringify(response.body)}`);
      assert.equal(response.body.error?.reason, "invalid_charge_id");
    }
    assert.deepEqual(await lines(fixture.statementId), [], "nada gravado");
    const limit = await api("POST", unknownRoute(fixture), { tenantId: fixture.tenantId, chargeId: "a".repeat(64), reason: REASON });
    assert.equal(limit.status, 422, JSON.stringify(limit.body));
    assert.equal(limit.body.error?.reason, "no_live_charge", "64 caracteres passam a forma; sem pedido de cobrança no demonstrativo não há o que cancelar");
  });

  test("UC3: chargeId CONHECIDO (external_id de uma linha, ou cobrança da tabela) → 422 charge_is_known, nada gravado", async () => {
    await withFake(async (fake) => {
      const port = await portOver(fake);
      const { fixture, chargeId } = await charged("uc3", port);
      const before = await lines(fixture.statementId);
      const response = await api("POST", unknownRoute(fixture), { tenantId: fixture.tenantId, chargeId, reason: REASON });
      assert.equal(response.status, 422, JSON.stringify(response.body));
      assert.equal(response.body.error?.reason, "charge_is_known");
      assert.deepEqual(await lines(fixture.statementId), before, "nada gravado");
      assert.equal(deletes(fake), 0);
    });
  });

  test("UC2: chargeId de OUTRA referência → NEEDS_REVIEW unknown_charge_not_in_reference, 0 DELETE; o 2º pedido com o 1º vivo → 409", async () => {
    await withFake(async (fake) => {
      const port = await portOver(fake);
      const { fixture } = await charged("uc2", port);
      const foreign = await providerOnlyCharge(port as never, randomUUID());
      const response = await api("POST", unknownRoute(fixture), { tenantId: fixture.tenantId, chargeId: foreign, reason: REASON });
      assert.equal(response.status, 200, JSON.stringify(response.body));
      assert.equal(response.body.data.result, "cancel_enqueued");
      assert.equal(response.body.data.outbox.kind, "charge_cancel");
      assert.equal("payload" in response.body.data.outbox, false);
      const cancel = (await lines(fixture.statementId)).find((line) => line.kind === "charge_cancel")!;
      assert.deepEqual(cancel.payload, { chargeId: foreign, chargeCreateId: null, unknown: true });
      assert.equal(cancel.idempotency_key, `charge_cancel:${fixture.statementId}:1`);
      const trail = (await db.$queryRawUnsafe(
        `SELECT entity, entity_id, metadata FROM audit_logs WHERE tenant_id = $1::uuid AND action = 'billing_outbox.unknown_charge_cancel_requested'`,
        fixture.tenantId,
      )) as Array<{ entity: string; entity_id: string; metadata: Json }>;
      assert.equal(trail.length, 1, "a trilha no mesmo tx");
      assert.deepEqual({ entity: trail[0]!.entity, entity_id: trail[0]!.entity_id, code: trail[0]!.metadata.code, chargeId: trail[0]!.metadata.chargeId, reason: trail[0]!.metadata.reason }, { entity: "billing_outbox", entity_id: cancel.id, code: "cancel_enqueued", chargeId: foreign, reason: REASON });

      const again = await api("POST", unknownRoute(fixture), { tenantId: fixture.tenantId, chargeId: foreign, reason: REASON });
      assert.equal(again.status, 409, JSON.stringify(again.body));
      assert.equal(again.body.error?.reason, "charge_cancel_in_progress");

      const result = await dispatch(fixture.tenantId, port);
      assert.equal(result.outcomes.needs_review, 1, JSON.stringify(result.outcomes));
      assert.equal(deletes(fake), 0, "0 DELETE: a lista desta referência não traz a cobrança");
      const after = (await lines(fixture.statementId)).find((line) => line.id === cancel.id)!;
      assert.deepEqual({ status: after.status, last_error: after.last_error }, { status: "NEEDS_REVIEW", last_error: "unknown_charge_not_in_reference" });
    });
  });

  test("UC4: a desconhecida está PAGA → NEEDS_REVIEW charge_already_paid, 0 DELETE", async () => {
    await withFake(async (fake) => {
      const port = await portOver(fake);
      const { fixture } = await charged("uc4", port);
      const unknown = await providerOnlyCharge(port as never, fixture.statementId);
      fake.setPaymentStatus(unknown, "RECEIVED");
      const response = await api("POST", unknownRoute(fixture), { tenantId: fixture.tenantId, chargeId: unknown, reason: REASON });
      assert.equal(response.status, 200, JSON.stringify(response.body));
      const result = await dispatch(fixture.tenantId, port);
      assert.equal(result.outcomes.needs_review, 1, JSON.stringify(result.outcomes));
      assert.equal(deletes(fake), 0, "0 DELETE");
      const cancel = (await lines(fixture.statementId)).find((line) => line.kind === "charge_cancel")!;
      assert.deepEqual({ status: cancel.status, last_error: cancel.last_error }, { status: "NEEDS_REVIEW", last_error: "charge_already_paid" });
    });
  });

  test("UC1: a desconhecida VIVA desta referência → 1 DELETE; a linha em conferência, depois de /resolve + /retry, cria (1 POST) e fica 1 viva", async () => {
    await withFake(async (fake) => {
      const port = await portOver(fake);
      // R0: a 1ª cobrança, cancelada pelo caminho de sempre (`charge/cancel` → despacho → 1 DELETE).
      const { fixture, chargeId: r0 } = await charged("uc1", port);
      const cancelR0 = await api("POST", `/api/v1/platform/billing/statements/${fixture.statementId}/charge/cancel`, { tenantId: fixture.tenantId, reason: REASON });
      assert.equal(cancelR0.status, 200, JSON.stringify(cancelR0.body));
      assert.equal((await dispatch(fixture.tenantId, port)).outcomes.sent, 1);
      // R1: a recobrança. O POST dela chegou ao provedor e a resposta se perdeu: a cobrança existe lá e o sistema não a conhece.
      const lost = await providerOnlyCharge(port as never, fixture.statementId);
      const r1 = await api("POST", chargeRoute(fixture), { tenantId: fixture.tenantId });
      assert.equal(r1.status, 201, JSON.stringify(r1.body));
      const r1Id = String(r1.body.data.id);
      assert.equal((await dispatch(fixture.tenantId, port)).outcomes.needs_review, 1);
      const reviewed = (await lines(fixture.statementId)).find((line) => line.id === r1Id)!;
      assert.deepEqual({ status: reviewed.status, last_error: reviewed.last_error }, { status: "NEEDS_REVIEW", last_error: "charge_found_for_previous_intent" });

      // A saída: o `cancel-unknown` da cobrança perdida → 1 DELETE, e o registro (sem cobrança na tabela, sem linha alvo).
      const deletesBefore = deletes(fake);
      const unknown = await api("POST", unknownRoute(fixture), { tenantId: fixture.tenantId, chargeId: lost, reason: REASON });
      assert.equal(unknown.status, 200, JSON.stringify(unknown.body));
      const unknownCancel = await dispatch(fixture.tenantId, port);
      assert.equal(unknownCancel.outcomes.sent, 1, JSON.stringify(unknownCancel.outcomes));
      assert.equal(deletes(fake) - deletesBefore, 1, "1 DELETE da desconhecida");
      const cancelLine = (await lines(fixture.statementId)).find((line) => line.kind === "charge_cancel" && line.payload.unknown === true)!;
      assert.deepEqual({ status: cancelLine.status, external_id: cancelLine.external_id }, { status: "SENT", external_id: lost });

      // Depois, `/resolve` + `/retry` da linha em conferência: o despacho cria (1 POST novo) e fica 1 cobrança viva.
      const resolved = await api("POST", `/api/v1/platform/billing/outbox/${r1Id}/resolve`, { tenantId: fixture.tenantId, reason: "a cobrança perdida foi cancelada no provedor" });
      assert.equal(resolved.status, 200, JSON.stringify(resolved.body));
      const retried = await api("POST", `/api/v1/platform/billing/outbox/${r1Id}/retry`, { tenantId: fixture.tenantId });
      assert.equal(retried.status, 200, JSON.stringify(retried.body));
      const postsBefore = posts(fake);
      const created = await dispatch(fixture.tenantId, port);
      assert.equal(created.outcomes.sent, 1, JSON.stringify(created.outcomes));
      assert.equal(posts(fake) - postsBefore, 1, "1 POST /v3/payments novo");
      const final = (await lines(fixture.statementId)).find((line) => line.id === r1Id)!;
      assert.equal(final.status, "SENT");
      assert.notEqual(final.external_id, lost);
      assert.notEqual(final.external_id, r0);
      const live = (await chargeRows(fixture.statementId)).filter((row) => row.status === "pending");
      assert.deepEqual(live.map((row) => row.external_charge_id), [final.external_id], "1 cobrança viva no fim, a nova");
    });
  });
}
