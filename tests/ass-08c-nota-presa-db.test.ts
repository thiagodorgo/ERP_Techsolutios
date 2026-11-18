// B-ASS-08c2 (item 60) · TESTE-DONO da `P-ASS08C-NOTA-PRESA-EM-PROCESSAMENTO` (plano de abertura §4.10 e §5.5, NP1).
//
// [FATO, leitura] a saída já existe desde o 08c1b: `/resolve` (`NEEDS_REVIEW` → `FAILED`, com motivo) e `/retry` (`FAILED` →
// `PENDING`) não filtram por `kind`, e o despacho de um `invoice_cancel` parado além do teto de 72 h RECONSULTA antes de qualquer
// revisão (`[INTX-11e]`): com a nota autorizada no provedor depois do teto, ele cancela (`#decideOverduePending` → `#cancelLive`).
// O 08c2 não muda código aqui; este arquivo é a prova (medida na F0, verde na `main`) e a mutação M19 o deixa vermelho.
//
// Roda no BANCO, numa base própria (template0 + `migrate deploy`), sob papel efêmero NOSUPERUSER NOBYPASSRLS (conferido no
// setup), com o app real no modo `prisma` sobre o papel e o falso Focus NFe de `tests/helpers/fake-providers/` em 127.0.0.1:0.
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
import { startFocusNfeFake } from "./helpers/fake-providers/focusnfe.js";

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLATFORM = { "x-user-id": "usr_platform", "x-role": "super_admin" } as const;
const FISCAL = { cnpj: "11222333000181", regimeTributario: "lucro_presumido", municipioIbge: "3550308", cTribNac: "010301", tributacaoIss: "1", regimeEspecialTributacao: "0", codigoOpcaoSimplesNacional: "1", serieDps: 7, nfseRoute: "nacional" };
const REASON = "conferido no painel do provedor: a nota foi autorizada depois do teto";
const HOUR = 60 * 60 * 1000;

type Json = Record<string, any>;

if (!connectionString) {
  test("B-ASS-08c2 · nota presa em processamento (-db) exige DATABASE_URL", { skip: "Defina DATABASE_URL para os testes -db." });
} else {
  let admin: any;
  let db: any;
  let role: EphemeralRole;
  let databaseName = "";
  let server: Server | undefined;
  let baseUrl = "";
  let focus: any;

  after(async () => {
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    await focus?.close();
    await role?.drop();
    await db?.$disconnect();
    if (admin && databaseName) await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    await admin?.$disconnect();
  });

  async function api(method: string, route: string, body?: unknown): Promise<{ status: number; body: Json }> {
    const response = await fetch(baseUrl + route, { method, headers: { "content-type": "application/json", ...PLATFORM }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, body: (await response.json()) as Json };
  }

  /** Organização + demonstrativo `paid` de R$ 100,00 (o pagamento depois é estornado: a nota viva fica sobre dinheiro devolvido). */
  async function seedPaid(tag: string): Promise<{ tenantId: string; statementId: string }> {
    const slug = `c2-np-${tag}-${randomUUID().slice(0, 8)}`;
    const tenantId = ((await db.$queryRawUnsafe(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, slug)) as Array<{ id: string }>)[0]!.id;
    const statementId = ((await db.$queryRawUnsafe(
      `INSERT INTO subscription_statements (tenant_id, period, status, charge_status, segments, users_included, users_peak, users_extra, storage_included_gb, storage_peak_gb,
         storage_extra_gb, tracked_vehicles, days_in_month, days_measured, extra_user_price, extra_gb_price, base_amount, users_extra_amount, storage_extra_amount,
         tracking_amount, adjustments_amount, credits_applied_amount, total_amount, paid_amount, snapshot, due_date, closed_at, paid_at)
       VALUES ($1::uuid,'2026-10','paid','none','[]'::jsonb,0,0,0,0,0,0,0,31,31,0,0,100,0,0,0,0,0,100,100,'{"latest":null,"history":[]}'::jsonb,'2026-11-10',now(),now()) RETURNING id`,
      tenantId,
    )) as Array<{ id: string }>)[0]!.id;
    // O índice do demonstrativo (sem provedor de cobrança): o claim do Prisma só enumera organizações de `billing_statement_refs`.
    await db.$executeRawUnsafe(`INSERT INTO billing_statement_refs (statement_id, tenant_id, provider) VALUES ($1::uuid, $2::uuid, NULL)`, statementId, tenantId);
    return { tenantId, statementId };
  }

  async function outboxRow(id: string): Promise<{ status: string; last_error: string | null; attempts: number }> {
    return ((await db.$queryRawUnsafe(`SELECT status, last_error, attempts FROM billing_outbox WHERE id = $1::uuid`, id)) as any[])[0];
  }
  async function invoiceStatus(statementId: string): Promise<string> {
    return ((await db.$queryRawUnsafe(`SELECT status FROM subscription_statement_invoices WHERE statement_id = $1::uuid ORDER BY seq DESC LIMIT 1`, statementId)) as any[])[0]?.status;
  }

  async function dispatch(tenantId: string, now: () => Date) {
    const [dispatcher, outboxPrisma, invoicePrisma, statementPrisma, http, focusAdapter, invoiceDispatch] = await Promise.all([
      import("../src/modules/subscription-billing/outbox/outbox.dispatcher.js"),
      import("../src/modules/subscription-billing/outbox/outbox.prisma.js"),
      import("../src/modules/subscription-billing/invoices/invoices.prisma.js"),
      import("../src/modules/subscription-billing/statements/statement.prisma-runtime.js"),
      import("../src/modules/subscription-billing/providers/http/billing-http.client.js"),
      import("../src/modules/subscription-billing/providers/invoice/focusnfe/focusnfe.adapter.js"),
      import("../src/modules/subscription-billing/outbox/invoice.dispatch.js"),
    ]);
    const port = new focusAdapter.FocusNfeInvoiceAdapter(
      new http.BillingHttpClient({ provider: "focusnfe", environment: "sandbox", channelEnabled: true, allowLocalHosts: true, nodeEnv: "test", baseUrl: `${focus.baseUrl}/v2` }),
      async (kind) => (kind === "api_token" ? "TOK-f" : "WHK-f"),
    );
    const invoices = new invoiceDispatch.InvoiceOutboxHandler({
      ports: { focusnfe: port },
      invoices: new invoicePrisma.PrismaStatementInvoiceRepository(role.client),
      statements: new statementPrisma.PrismaStatementRepository(role.client),
      resolveIssueContext: async ({ statement }) => ({
        environment: "sandbox",
        serie: 7,
        emitter: { cnpj: FISCAL.cnpj },
        borrower: { document: "99888777000166", name: "Tomadora", municipalityCode: "3550308" },
        taxProfile: invoiceDispatch.taxProfileFromSettings(FISCAL),
        serviceDescription: `Assinatura — competência ${statement.period}`,
      }),
    });
    return dispatcher.runDispatchOutbox({
      repo: new outboxPrisma.PrismaOutboxRepository(role.client, { tenantIds: [tenantId] }),
      ports: {},
      resolveCustomer: async () => ({ ok: true as const, customerId: "cus_np" }),
      invoices,
      now,
    });
  }

  test("setup: base própria migrada, papel NOSUPERUSER NOBYPASSRLS, o app real no modo prisma e o falso Focus", async () => {
    const { PrismaClient } = await import("@prisma/client");
    admin = new PrismaClient({ adapter: (await import("../src/database/pg-connection.js")).createPgAdapter(connectionString!) });
    const base = decodeURIComponent(new URL(connectionString!).pathname.replace(/^\//, "")) || "postgres";
    databaseName = `${base}_c2_np_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}" TEMPLATE template0`);
    const url = new URL(connectionString!);
    url.pathname = `/${databaseName}`;
    const targetUrl = url.toString();
    const prismaCli = createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");
    execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], { cwd: ROOT, env: { ...process.env, DATABASE_URL: targetUrl }, stdio: "pipe" });
    db = new PrismaClient({ adapter: (await import("../src/database/pg-connection.js")).createPgAdapter(targetUrl) });
    role = await createEphemeralRole(db, targetUrl);
    const [posture] = (await db.$queryRawUnsafe(`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = $1`, role.roleName)) as Array<{ rolsuper: boolean; rolbypassrls: boolean }>;
    assert.deepEqual(posture, { rolsuper: false, rolbypassrls: false }, "o papel de runtime é NOSUPERUSER NOBYPASSRLS");

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
    // O falso no roteiro `authorized`: a reconsulta da nota diz `autorizado` (a prefeitura decidiu DEPOIS do teto de 72 h).
    focus = await startFocusNfeFake("authorized");
  });

  test("NP1: invoice_cancel em NEEDS_REVIEW invoice_stuck_processing → /resolve → FAILED → /retry → PENDING → o despacho reconsulta, acha a nota autorizada e a cancela", async () => {
    const fixture = await seedPaid("np1");
    const { PrismaStatementInvoiceRepository } = await import("../src/modules/subscription-billing/invoices/invoices.prisma.js");
    const invoices = new PrismaStatementInvoiceRepository(role.client);
    // A nota `pending`, emitida no provedor (com o id dele) e existente no falso; depois o estorno total devolveu o dinheiro.
    const begun = await invoices.beginIssue({ tenantId: fixture.tenantId, statementId: fixture.statementId, seq: 1, provider: "focusnfe", environment: "sandbox", serie: 7 }, new Date());
    const created = await fetch(`${focus.baseUrl}/v2/nfsen?ref=${encodeURIComponent(begun.invoice.externalRef)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ serie_dps: 7, numero_dps: begun.invoice.numeroDps }) });
    const providerInvoiceId = ((await created.json()) as { id: string }).id;
    await invoices.markIssued(fixture.tenantId, begun.invoice.id, providerInvoiceId, new Date());
    await db.$executeRawUnsafe(`UPDATE subscription_statements SET status = 'closed', paid_amount = 0, paid_at = NULL WHERE id = $1::uuid`, fixture.statementId);
    // O `invoice_cancel` nasceu há 80 h e foi à conferência com a nota ainda processando (`#decideOverduePending`).
    const lineId = ((await db.$queryRawUnsafe(
      `INSERT INTO billing_outbox (tenant_id, statement_id, kind, provider, idempotency_key, provider_idempotency_key, payload, occurred_at, created_at, status, attempts, last_error)
       VALUES ($1::uuid, $2::uuid, 'invoice_cancel', 'focusnfe', $3, gen_random_uuid(), '{"reason":"payment_reversed"}'::jsonb, now() - interval '80 hours', now() - interval '80 hours', 'NEEDS_REVIEW', 1, 'invoice_stuck_processing') RETURNING id`,
      fixture.tenantId,
      fixture.statementId,
      `invoice_cancel:${fixture.statementId}:1`,
    )) as Array<{ id: string }>)[0]!.id;
    assert.equal(await invoiceStatus(fixture.statementId), "pending", "pré-condição: a nota está viva (pending) sobre o dinheiro devolvido");

    const resolved = await api("POST", `/api/v1/platform/billing/outbox/${lineId}/resolve`, { tenantId: fixture.tenantId, reason: REASON });
    assert.equal(resolved.status, 200, JSON.stringify(resolved.body));
    assert.equal((await outboxRow(lineId)).status, "FAILED", "o /resolve leva o invoice_cancel a FAILED, sem filtro de kind");
    const retried = await api("POST", `/api/v1/platform/billing/outbox/${lineId}/retry`, { tenantId: fixture.tenantId });
    assert.equal(retried.status, 200, JSON.stringify(retried.body));
    assert.equal((await outboxRow(lineId)).status, "PENDING", "o /retry devolve a linha à fila");

    const deletesBefore = focus.recorded.filter((r: { method: string; path: string }) => r.method === "DELETE" && decodeURIComponent(r.path).includes(fixture.statementId)).length;
    const run = await dispatch(fixture.tenantId, () => new Date(Date.now() + HOUR));
    const deletes = focus.recorded.filter((r: { method: string; path: string }) => r.method === "DELETE" && decodeURIComponent(r.path).includes(fixture.statementId)).length - deletesBefore;
    assert.equal(deletes, 1, `1 cancelamento no provedor (rodada: ${JSON.stringify(run)})`);
    assert.equal((await outboxRow(lineId)).status, "SENT", "a linha do cancelamento terminou");
    assert.ok(["cancel_pending", "cancelled"].includes(await invoiceStatus(fixture.statementId)), "a nota saiu de viva-sobre-estorno para cancelamento");
  });
}
