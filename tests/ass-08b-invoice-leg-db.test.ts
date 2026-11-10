// B-ASS-08b · (c2) + G14 — no BANCO, sob o papel de runtime NOSUPERUSER NOBYPASSRLS (nunca superusuário): a nota
// (`subscription_statement_invoices`, FORCE RLS) nasce com `numero_dps` da sequência NA MESMA transação da linha e espelha
// `subscription_statements.invoice_status`; RLS com VERMELHO-CONTROLE (sem o contexto de organização a tabela devolve zero e
// o UPDATE não alcança linha); o UNIQUE parcial "uma nota viva por demonstrativo" é a última palavra do banco; e o índice
// G14 (`D-ASS08B-INDICE-G14`: um provedor LIGADO por kind) recusa o 2º com 23505 mesmo sem passar pelo gate em código.
import "dotenv/config";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createEphemeralRole } from "./helpers/auth-identity-fixture.js";
import { PrismaStatementInvoiceRepository } from "../src/modules/subscription-billing/invoices/invoices.prisma.js";
import { InvoiceProviderError } from "../src/modules/subscription-billing/providers/invoice/invoice-errors.js";

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Violação de unicidade do PostgreSQL (23505) na constraint nomeada — como o Prisma a reporta (P2010 + meta). */
async function expectUniqueViolation(promise: Promise<unknown>, constraint: string): Promise<void> {
  await assert.rejects(promise, (error: unknown) => {
    const e = error as { code?: string; message?: string; meta?: { code?: string; message?: string } };
    const text = `${e.meta?.message ?? ""} ${e.message ?? ""}`;
    assert.ok(e.meta?.code === "23505" || /23505/.test(text), `esperava 23505, veio ${e.meta?.code ?? e.code}: ${text.slice(0, 200)}`);
    assert.ok(text.includes(constraint), `esperava a constraint ${constraint}: ${text.slice(0, 200)}`);
    return true;
  });
}

if (!connectionString) {
  test("B-ASS-08b · -db da nota exige DATABASE_URL", { skip: "Defina DATABASE_URL para os testes -db." });
} else {
  let admin: any; // conexão na BASE: CREATE/DROP DATABASE
  let db: any; // conexão no banco ALVO: seeding, leituras de controle e criação dos papéis efêmeros
  let databaseName: string;
  let targetUrl: string;

  async function seedStatement(tenantSlug: string): Promise<{ tenantId: string; statementId: string }> {
    const tenants = (await db.$queryRawUnsafe(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, tenantSlug)) as Array<{ id: string }>;
    const tenantId = tenants[0]!.id;
    const statements = (await db.$queryRawUnsafe(
      `INSERT INTO subscription_statements
         (tenant_id, period, status, segments, users_included, users_peak, users_extra, storage_included_gb, storage_peak_gb,
          storage_extra_gb, tracked_vehicles, days_in_month, days_measured, extra_user_price, extra_gb_price,
          base_amount, users_extra_amount, storage_extra_amount, tracking_amount, adjustments_amount,
          credits_applied_amount, total_amount, paid_amount, snapshot)
       VALUES ($1::uuid, '2026-10', 'paid', '[]'::jsonb, 0,0,0, 0,0,0, 0, 31,31, 0,0, 100,0,0,0,0,0,100,100, '{"latest":null,"history":[]}'::jsonb)
       RETURNING id`,
      tenantId,
    )) as Array<{ id: string }>;
    return { tenantId, statementId: statements[0]!.id };
  }

  async function invoiceStatusOf(statementId: string): Promise<string> {
    const rows = (await db.$queryRawUnsafe(`SELECT invoice_status FROM subscription_statements WHERE id = $1::uuid`, statementId)) as Array<{ invoice_status: string }>;
    return rows[0]!.invoice_status;
  }

  after(async () => {
    await db?.$disconnect();
    if (admin && databaseName) await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    await admin?.$disconnect();
  });

  test("setup: base própria + migrate deploy", async () => {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });
    const base = decodeURIComponent(new URL(connectionString!).pathname.replace(/^\//, "")) || "postgres";
    databaseName = `${base}_ass08b_db_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}" TEMPLATE template0`);
    const url = new URL(connectionString!);
    url.pathname = `/${databaseName}`;
    targetUrl = url.toString();
    const prismaCli = createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");
    execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], { cwd: ROOT, env: { ...process.env, DATABASE_URL: targetUrl }, stdio: "pipe" });
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString: targetUrl }) });
  });

  test("T-INV-db-1: beginIssue reserva numero_dps e grava a linha na MESMA transação, espelha invoice_status; idempotente; RLS com vermelho-controle", async () => {
    const a = await seedStatement(`ass08b-inv-${randomUUID().slice(0, 8)}`);
    const b = await seedStatement(`ass08b-invb-${randomUUID().slice(0, 8)}`);
    const role = await createEphemeralRole(db, targetUrl);
    try {
      const postura = (await role.client.$queryRawUnsafe(`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`)) as Array<{ rolsuper: boolean; rolbypassrls: boolean }>;
      assert.deepEqual(postura, [{ rolsuper: false, rolbypassrls: false }], "o papel é NOSUPERUSER NOBYPASSRLS");

      const serie = 1 + Math.floor(Math.random() * 100000);
      const repo = new PrismaStatementInvoiceRepository(role.client);
      const now = new Date();
      const first = await repo.beginIssue({ tenantId: a.tenantId, statementId: a.statementId, seq: 1, provider: "focusnfe", environment: "sandbox", serie }, now);
      assert.equal(first.created, true);
      assert.equal(first.invoice.status, "pending");
      assert.equal(first.invoice.numeroDps, 1, "o 1º número da série");
      assert.equal(first.invoice.serieDps, serie);
      assert.equal(first.invoice.externalRef, `${a.statementId}:1`);
      assert.equal(await invoiceStatusOf(a.statementId), "pending", "o demonstrativo espelha a nota na MESMA transação");
      const sequence = (await db.$queryRawUnsafe(`SELECT next_number FROM billing_invoice_sequences WHERE provider = 'focusnfe' AND environment = 'sandbox' AND serie = $1`, serie)) as Array<{ next_number: number }>;
      assert.equal(sequence[0]?.next_number, 2, "a sequência avançou junto com a linha");

      // Idempotente: a retentativa do dispatcher reusa a linha e NÃO consome número.
      const again = await repo.beginIssue({ tenantId: a.tenantId, statementId: a.statementId, seq: 1, provider: "focusnfe", environment: "sandbox", serie }, new Date());
      assert.equal(again.created, false);
      assert.equal(again.invoice.id, first.invoice.id);
      const sequenceAfter = (await db.$queryRawUnsafe(`SELECT next_number FROM billing_invoice_sequences WHERE provider = 'focusnfe' AND environment = 'sandbox' AND serie = $1`, serie)) as Array<{ next_number: number }>;
      assert.equal(sequenceAfter[0]?.next_number, 2, "retentativa não consome número");

      // RLS: sob o contexto de B, a nota de A é inexistente; e o VERMELHO-CONTROLE — sem GUC, zero linhas e UPDATE sem alcance.
      assert.equal(await repo.findLive(b.tenantId, a.statementId), undefined, "B nunca vê a nota de A");
      assert.equal((await repo.findLive(a.tenantId, a.statementId))?.id, first.invoice.id);
      const semGuc = (await role.client.$queryRawUnsafe(`SELECT count(*)::int AS n FROM subscription_statement_invoices`)) as Array<{ n: number }>;
      assert.equal(semGuc[0]!.n, 0, "sem contexto de organização, a tabela FORCE devolve zero");
      const updated = (await role.client.$executeRawUnsafe(`UPDATE subscription_statements SET invoice_status = 'authorized' WHERE id = $1::uuid`, a.statementId)) as number;
      assert.equal(updated, 0, "sem GUC o espelho não alcança linha nenhuma (se o repositório não abrisse withTenantRls, nada mudaria)");
      assert.equal(await invoiceStatusOf(a.statementId), "pending");

      // Cada mudança de estado espelha o demonstrativo.
      await repo.markIssued(a.tenantId, first.invoice.id, "nfse_db_1", new Date());
      await repo.markAuthorized(a.tenantId, first.invoice.id, { number: "NFSE-DB-1", verificationCode: "V1", pdfUrl: "https://documentos.invalid/1.pdf", pdfSource: "public_url" }, new Date());
      const authorized = await repo.findByRef(a.tenantId, "focusnfe", first.invoice.externalRef);
      assert.equal(authorized?.status, "authorized");
      assert.equal(authorized?.providerInvoiceId, "nfse_db_1");
      assert.equal(authorized?.number, "NFSE-DB-1");
      assert.equal(await invoiceStatusOf(a.statementId), "authorized");
      await repo.markCancelPending(a.tenantId, first.invoice.id, { reason: "Pagamento estornado", code: "9" }, new Date());
      assert.equal(await invoiceStatusOf(a.statementId), "cancel_pending");
      assert.equal((await repo.findLive(a.tenantId, a.statementId))?.cancelCode, "9");
      await repo.markCancelled(a.tenantId, first.invoice.id, new Date());
      assert.equal(await invoiceStatusOf(a.statementId), "cancelled");
      assert.equal(await repo.findLive(a.tenantId, a.statementId), undefined, "cancelada não é viva");
    } finally {
      await role.drop();
    }
  });

  test("T-INV-db-2: UMA nota viva por demonstrativo — o código recusa (invoice_already_live) e o UNIQUE parcial do banco é a última palavra (23505); rejeitada libera seq + 1 com número novo", async () => {
    const a = await seedStatement(`ass08b-live-${randomUUID().slice(0, 8)}`);
    const role = await createEphemeralRole(db, targetUrl);
    try {
      const serie = 1 + Math.floor(Math.random() * 100000);
      const repo = new PrismaStatementInvoiceRepository(role.client);
      const first = await repo.beginIssue({ tenantId: a.tenantId, statementId: a.statementId, seq: 1, provider: "focusnfe", environment: "sandbox", serie }, new Date());
      await assert.rejects(
        repo.beginIssue({ tenantId: a.tenantId, statementId: a.statementId, seq: 2, provider: "focusnfe", environment: "sandbox", serie }, new Date()),
        (error: unknown) => error instanceof InvoiceProviderError && error.code === "invoice_already_live",
      );
      // Sem o gate em código (INSERT direto): o banco recusa a 2ª viva.
      await expectUniqueViolation(
        db.$executeRawUnsafe(
          `INSERT INTO subscription_statement_invoices (tenant_id, statement_id, seq, provider, external_ref, status) VALUES ($1::uuid, $2::uuid, 2, 'focusnfe', $3, 'pending')`,
          a.tenantId,
          a.statementId,
          `${a.statementId}:2`,
        ),
        "subscription_statement_invoices_live_per_statement_key",
      );
      // Rejeitada → não é viva → a reemissão (seq 2) ganha ref e número novos (G10).
      await repo.markRejected(a.tenantId, first.invoice.id, "rejeição simulada", new Date());
      assert.equal(await invoiceStatusOf(a.statementId), "rejected");
      const second = await repo.beginIssue({ tenantId: a.tenantId, statementId: a.statementId, seq: 2, provider: "focusnfe", environment: "sandbox", serie }, new Date());
      assert.equal(second.created, true);
      assert.equal(second.invoice.numeroDps, 2);
      assert.equal(second.invoice.externalRef, `${a.statementId}:2`);
      assert.equal(await invoiceStatusOf(a.statementId), "pending");
      assert.deepEqual((await repo.listByStatement(a.tenantId, a.statementId)).map((row) => [row.seq, row.status]), [[1, "rejected"], [2, "pending"]]);
    } finally {
      await role.drop();
    }
  });

  test("G14 (D-ASS08B-INDICE-G14): o índice único parcial recusa o 2º provedor LIGADO do mesmo kind (23505), sem depender do gate em código", async () => {
    const index = (await db.$queryRawUnsafe(`SELECT indexdef FROM pg_indexes WHERE indexname = 'billing_provider_configs_one_enabled_per_kind'`)) as Array<{ indexdef: string }>;
    assert.equal(index.length, 1, "a migração 20260901000000_ass08b_provider_one_enabled_per_kind criou o índice");
    assert.match(index[0]!.indexdef, /UNIQUE INDEX .* ON public\.billing_provider_configs USING btree \(kind\) WHERE \(enabled = true\)/);

    await db.$executeRawUnsafe(`DELETE FROM billing_provider_configs`);
    const insert = (provider: string, kind: string, enabled: boolean) =>
      db.$executeRawUnsafe(`INSERT INTO billing_provider_configs (provider, kind, enabled) VALUES ($1, $2, $3)`, provider, kind, enabled);
    await insert("focusnfe", "invoice", true);
    // O 2º de NOTA ligado — gravado DIRETO, sem passar por evaluateEnablePreconditions — é recusado pelo banco.
    await expectUniqueViolation(insert("nfeio", "invoice", true), "billing_provider_configs_one_enabled_per_kind");
    await insert("asaas", "payment", true); // kind diferente: um de cada
    await insert("plugnotas", "invoice", false); // desligado não conta
    await expectUniqueViolation(db.$executeRawUnsafe(`UPDATE billing_provider_configs SET enabled = true WHERE provider = 'plugnotas'`), "billing_provider_configs_one_enabled_per_kind");
    // A troca exige desligar o ligado antes (G14) — e então o outro pode ligar.
    await db.$executeRawUnsafe(`UPDATE billing_provider_configs SET enabled = false WHERE provider = 'focusnfe'`);
    await db.$executeRawUnsafe(`UPDATE billing_provider_configs SET enabled = true WHERE provider = 'plugnotas'`);
    const enabled = (await db.$queryRawUnsafe(`SELECT kind, count(*)::int AS n FROM billing_provider_configs WHERE enabled GROUP BY kind ORDER BY kind`)) as Array<{ kind: string; n: number }>;
    assert.deepEqual(enabled, [{ kind: "invoice", n: 1 }, { kind: "payment", n: 1 }], "no máximo um ligado por kind");
  });
}
