// B-ASS-08c2 (Emenda 1 §4.1, §4.2) · a retentativa da emissão RECONSULTA antes de reenviar (NOTA-RETRY).
//
// O provedor CRIOU a nota e a resposta se perdeu (o falso Focus grava e derruba o socket, sem responder): o 1º despacho termina em
// erro transitório (backoff, `attempts = 1`, a nota `pending` sem `provider_invoice_id`). No 2º despacho, com o relógio INJETADO
// além do backoff (nunca espera), a linha da nota é de uma tentativa anterior (`beginIssue` → `created: false`) e o despacho
// reconsulta pela `ref` antes de qualquer POST.
//   NR1 (N = 10): 1 `GET /nfsen/<ref>` e 0 POST novo; a linha `SENT`; a nota `pending`.
//   NR2: o mesmo, com o 2º POST (se houvesse) recebendo um 422 de duplicidade com texto que o adaptador não reconhece →
//        a nota NUNCA fica `rejected`; 0 linha nova de `invoice_issue`; o backlog não a mostra como `needs_review`.
// Vermelho-controle: M-RETRY (tirar ` || !begun.created`) → NR1 com 2 POST e 0 GET; NR2 com a nota `rejected`.
//
// Roda no BANCO, numa base própria (template0 + `migrate deploy`), sob papel efêmero NOSUPERUSER NOBYPASSRLS (conferido no
// setup), com o adaptador real do Focus NFe contra o falso de `tests/helpers/fake-providers/` em 127.0.0.1:0.
import "dotenv/config";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";
import { startFocusNfeFake } from "./helpers/fake-providers/focusnfe.js";

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FISCAL = { cnpj: "11222333000181", regimeTributario: "lucro_presumido", municipioIbge: "3550308", cTribNac: "010301", tributacaoIss: "1", regimeEspecialTributacao: "0", codigoOpcaoSimplesNacional: "1", serieDps: 7, nfseRoute: "nacional" };
const MINUTE = 60 * 1000;
const ROUNDS = 10;

if (!connectionString) {
  test("B-ASS-08c2 · a retentativa da nota (-db) exige DATABASE_URL", { skip: "Defina DATABASE_URL para os testes -db." });
} else {
  let admin: any;
  let db: any;
  let role: EphemeralRole;
  let databaseName = "";
  const servers: Array<{ close(): Promise<void> }> = [];

  after(async () => {
    for (const server of servers) await server.close();
    await role?.drop();
    await db?.$disconnect();
    if (admin && databaseName) await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    await admin?.$disconnect();
  });

  /** Organização + demonstrativo `paid` de R$ 100,00, o índice (o claim do Prisma enumera por ele) e a `invoice_issue` seq 1. */
  async function seedPaidWithIntent(tag: string, at: Date): Promise<{ tenantId: string; statementId: string; lineId: string }> {
    const slug = `c2-nr-${tag}-${randomUUID().slice(0, 8)}`;
    const tenantId = ((await db.$queryRawUnsafe(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, slug)) as Array<{ id: string }>)[0]!.id;
    const statementId = ((await db.$queryRawUnsafe(
      `INSERT INTO subscription_statements (tenant_id, period, status, charge_status, segments, users_included, users_peak, users_extra, storage_included_gb, storage_peak_gb,
         storage_extra_gb, tracked_vehicles, days_in_month, days_measured, extra_user_price, extra_gb_price, base_amount, users_extra_amount, storage_extra_amount,
         tracking_amount, adjustments_amount, credits_applied_amount, total_amount, paid_amount, snapshot, due_date, closed_at, paid_at)
       VALUES ($1::uuid,'2026-10','paid','none','[]'::jsonb,0,0,0,0,0,0,0,31,31,0,0,100,0,0,0,0,0,100,100,'{"latest":null,"history":[]}'::jsonb,'2026-11-10',$2,$2) RETURNING id`,
      tenantId,
      at,
    )) as Array<{ id: string }>)[0]!.id;
    await db.$executeRawUnsafe(`INSERT INTO billing_statement_refs (statement_id, tenant_id, provider) VALUES ($1::uuid, $2::uuid, NULL)`, statementId, tenantId);
    const lineId = ((await db.$queryRawUnsafe(
      `INSERT INTO billing_outbox (tenant_id, statement_id, kind, provider, idempotency_key, provider_idempotency_key, payload, status, attempts, occurred_at, created_at, updated_at)
       VALUES ($1::uuid, $2::uuid, 'invoice_issue', 'focusnfe', $3, gen_random_uuid(), '{"seq":1}'::jsonb, 'PENDING', 0, $4, $4, $4) RETURNING id`,
      tenantId,
      statementId,
      `invoice_issue:${statementId}:1`,
      at,
    )) as Array<{ id: string }>)[0]!.id;
    return { tenantId, statementId, lineId };
  }

  async function line(id: string): Promise<{ status: string; attempts: number; last_error: string | null }> {
    return ((await db.$queryRawUnsafe(`SELECT status, attempts, last_error FROM billing_outbox WHERE id = $1::uuid`, id)) as any[])[0];
  }
  async function notes(statementId: string): Promise<Array<{ seq: number; status: string; provider_invoice_id: string | null; error: string | null }>> {
    return (await db.$queryRawUnsafe(`SELECT seq, status, provider_invoice_id, error FROM subscription_statement_invoices WHERE statement_id = $1::uuid ORDER BY seq`, statementId)) as any[];
  }
  async function issueLines(statementId: string): Promise<number> {
    return Number(((await db.$queryRawUnsafe(`SELECT count(*)::int AS n FROM billing_outbox WHERE statement_id = $1::uuid AND kind = 'invoice_issue'`, statementId)) as any[])[0].n);
  }

  function requestsFor(focus: any, statementId: string) {
    const ref = encodeURIComponent(`${statementId}:1`);
    const recorded = focus.recorded as Array<{ method: string; path: string }>;
    return {
      posts: recorded.filter((r) => r.method === "POST" && r.path === `/v2/nfsen?ref=${ref}`).length,
      gets: recorded.filter((r) => r.method === "GET" && r.path === `/v2/nfsen/${ref}`).length,
    };
  }

  async function dispatch(focus: any, tenantId: string, now: Date) {
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
      resolveCustomer: async () => ({ ok: true as const, customerId: "cus_nr" }),
      invoices,
      now: () => now,
    });
  }

  /** O "criou e a resposta se perdeu": o 1º despacho cai em transitório; devolve o instante para o 2º. */
  async function firstAttemptLost(focus: any, seeded: { tenantId: string; statementId: string; lineId: string }, t0: Date) {
    const first = await dispatch(focus, seeded.tenantId, t0);
    assert.equal(first.outcomes.retry, 1, `o 1º despacho é transitório: ${JSON.stringify(first.outcomes)}`);
    const after1 = await line(seeded.lineId);
    assert.deepEqual([after1.status, after1.attempts], ["PENDING", 1], "a linha volta pelo backoff, 1 tentativa");
    assert.deepEqual((await notes(seeded.statementId)).map((n) => [n.seq, n.status, n.provider_invoice_id]), [[1, "pending", null]], "a nota pendente, sem id do provedor");
    assert.deepEqual(requestsFor(focus, seeded.statementId), { posts: 1, gets: 0 }, "o 1º POST chegou (e o falso gravou a nota)");
  }

  test("setup: base própria migrada e papel NOSUPERUSER NOBYPASSRLS", async () => {
    const { PrismaClient } = await import("@prisma/client");
    admin = new PrismaClient({ adapter: (await import("../src/database/pg-connection.js")).createPgAdapter(connectionString!) });
    const base = decodeURIComponent(new URL(connectionString!).pathname.replace(/^\//, "")) || "postgres";
    databaseName = `${base}_c2_nr_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
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
  });

  test(`NR1 (N = ${ROUNDS}): o provedor criou e a resposta se perdeu → o 2º despacho faz 1 GET e 0 POST novo; a linha SENT; a nota pending`, async () => {
    const focus = await startFocusNfeFake("create_then_drop");
    servers.push(focus);
    for (let round = 1; round <= ROUNDS; round += 1) {
      const t0 = new Date();
      const seeded = await seedPaidWithIntent(`nr1-${round}`, t0);
      await firstAttemptLost(focus, seeded, t0);
      const second = await dispatch(focus, seeded.tenantId, new Date(t0.getTime() + 2 * MINUTE));
      assert.equal(second.outcomes.recovered, 1, `rodada ${round}: ${JSON.stringify(second.outcomes)}`);
      assert.deepEqual(requestsFor(focus, seeded.statementId), { posts: 1, gets: 1 }, `rodada ${round}: 1 GET de reconsulta e nenhum POST novo`);
      assert.equal((await line(seeded.lineId)).status, "SENT", `rodada ${round}: a linha SENT`);
      assert.deepEqual((await notes(seeded.statementId)).map((n) => [n.seq, n.status]), [[1, "pending"]], `rodada ${round}: a nota segue pendente (até o webhook ou o poll)`);
      // Emenda 5 §1 / Emenda 7 §2 (C1-NG1): DEPOIS da reconsulta o id da nota no provedor segue nulo (P-08C2-LOOKUP-SEM-PROVIDER-ID).
      assert.deepEqual((await notes(seeded.statementId)).map((n) => n.provider_invoice_id), [null], `rodada ${round}: provider_invoice_id segue nulo depois da reconsulta`);
    }
  });

  test("NR2: o 2º POST receberia um 422 de duplicidade com texto não reconhecido → a nota NUNCA fica rejected; 0 linha nova; fora do backlog needs_review", async () => {
    const focus = await startFocusNfeFake("duplicate_ref_unrecognized");
    servers.push(focus);
    const t0 = new Date();
    const seeded = await seedPaidWithIntent("nr2", t0);
    await firstAttemptLost(focus, seeded, t0);
    await dispatch(focus, seeded.tenantId, new Date(t0.getTime() + 2 * MINUTE));
    const [statementPrisma, rules] = await Promise.all([
      import("../src/modules/subscription-billing/statements/statement.prisma-runtime.js"),
      import("../src/modules/subscription-billing/invoices/invoice-intent-rules.js"),
    ]);
    const state = await notes(seeded.statementId);
    assert.deepEqual(state.map((n) => n.status).filter((s) => s === "rejected"), [], `a nota nunca rejeitada: ${JSON.stringify(state)}`);
    assert.ok(["pending", "authorized"].includes(state[0]!.status), JSON.stringify(state));
    assert.equal(await issueLines(seeded.statementId), 1, "0 linha nova de invoice_issue");
    const facts = await new statementPrisma.PrismaStatementRepository(role.client).listInvoiceBacklog(seeded.tenantId);
    const categories = facts.map((row: any) =>
      rules.backlogCategory({ statement: row.statement, live: row.live, ...(row.lastLine ? { lastLine: row.lastLine } : {}), ...(row.lastInvoice ? { lastInvoice: row.lastInvoice } : {}), cutoff: rules.INVOICE_BACKFILL_CUTOFF }),
    );
    assert.equal(categories.includes("needs_review"), false, `o backlog não a mostra como needs_review: ${JSON.stringify(categories)}`);
    assert.equal(facts.length, 1, "o backlog leu o demonstrativo (controle: a leitura alcança a organização)");
  });
}
