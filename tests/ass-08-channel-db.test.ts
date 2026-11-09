// B-ASS-08 · F11 — repositórios Prisma sob o papel de runtime NOSUPERUSER NOBYPASSRLS (nunca superusuário, senão o RLS
// seria bypassado e o isolamento não seria provado). T-OBX-db-1 (SKIP LOCKED), T-WH-db-1 (UNIQUE do evento), RLS das
// tabelas FORCE com VERMELHO-CONTROLE (sem o contexto de organização a linha é invisível).
import "dotenv/config";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";
import { PrismaOutboxRepository } from "../src/modules/subscription-billing/outbox/outbox.prisma.js";
import { PrismaWebhookEventRepository } from "../src/modules/subscription-billing/webhooks/webhook-events.prisma.js";
import { PrismaStatementChargeRepository } from "../src/modules/subscription-billing/charges/charges.prisma.js";
import { OUTBOX_ORPHAN_MS } from "../src/modules/subscription-billing/outbox/outbox.types.js";
import { nextDpsNumber, nextDpsNumberInTx } from "../src/modules/subscription-billing/invoice-sequence.service.js";

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (!connectionString) {
  test("B-ASS-08 · -db do canal exige DATABASE_URL", { skip: "Defina DATABASE_URL para os testes -db." });
} else {
  let admin: any; // conexão na BASE: CREATE/DROP DATABASE
  let db: any; // conexão no banco ALVO: seeding e criação dos papéis efêmeros
  let databaseName: string;
  let targetUrl: string;

  async function seedStatement(tenantSlug: string): Promise<{ tenantId: string; statementId: string }> {
    const tenants = (await db.$queryRawUnsafe(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, tenantSlug)) as Array<{ id: string }>;
    const tenantId = tenants[0]!.id;
    const statements = (await db.$queryRawUnsafe(
      `INSERT INTO subscription_statements
         (tenant_id, period, segments, users_included, users_peak, users_extra, storage_included_gb, storage_peak_gb,
          storage_extra_gb, tracked_vehicles, days_in_month, days_measured, extra_user_price, extra_gb_price,
          base_amount, users_extra_amount, storage_extra_amount, tracking_amount, adjustments_amount,
          credits_applied_amount, total_amount, snapshot)
       VALUES ($1::uuid, '2026-10', '[]'::jsonb, 0,0,0, 0,0,0, 0, 31,31, 0,0, 0,0,0,0,0,0,0, '{"latest":null,"history":[]}'::jsonb)
       RETURNING id`,
      tenantId,
    )) as Array<{ id: string }>;
    const statementId = statements[0]!.id;
    await db.$executeRawUnsafe(`INSERT INTO billing_statement_refs (statement_id, tenant_id, provider) VALUES ($1::uuid, $2::uuid, 'asaas')`, statementId, tenantId);
    return { tenantId, statementId };
  }

  async function seedOutboxRow(tenantId: string, statementId: string, seq: number): Promise<string> {
    const rows = (await db.$queryRawUnsafe(
      `INSERT INTO billing_outbox (tenant_id, statement_id, kind, provider, idempotency_key, provider_idempotency_key, occurred_at)
       VALUES ($1::uuid, $2::uuid, 'charge_create', 'asaas', $3, gen_random_uuid(), now()) RETURNING id`,
      tenantId,
      statementId,
      `charge_create:${statementId}:${seq}`,
    )) as Array<{ id: string }>;
    return rows[0]!.id;
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
    databaseName = `${base}_ass08_db_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}" TEMPLATE template0`);
    const url = new URL(connectionString!);
    url.pathname = `/${databaseName}`;
    targetUrl = url.toString();
    const prismaCli = createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");
    execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], { cwd: ROOT, env: { ...process.env, DATABASE_URL: targetUrl }, stdio: "pipe" });
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString: targetUrl }) });
  });

  test("T-WH-db-1: UNIQUE (provider, external_event_id) — insertIfAbsent dedupe, 1 linha", async () => {
    const role = await createEphemeralRole(db, targetUrl);
    try {
      const repo = new PrismaWebhookEventRepository(role.client);
      const now = new Date();
      const first = await repo.insertIfAbsent({ provider: "asaas", externalEventId: "evt_db_1", bodyDigest: "d", signatureOk: true, externalResourceId: "pay_1", externalReference: "stmt_1" }, now);
      const second = await repo.insertIfAbsent({ provider: "asaas", externalEventId: "evt_db_1", bodyDigest: "d2", signatureOk: true, externalResourceId: "pay_1", externalReference: "stmt_1" }, now);
      assert.equal(first.created, true);
      assert.equal(second.created, false, "replay do mesmo evento não cria 2ª linha");
      assert.equal((await repo.listByProvider("asaas")).length, 1);
    } finally {
      await role.drop();
    }
  });

  test("T-OBX-db-1: dois workers com FOR UPDATE SKIP LOCKED pegam linhas DISTINTAS (papel sem bypass)", async () => {
    const { tenantId, statementId } = await seedStatement(`ass08-obx-${randomUUID().slice(0, 8)}`);
    await seedOutboxRow(tenantId, statementId, 1);
    await seedOutboxRow(tenantId, statementId, 2);
    const w1 = await createEphemeralRole(db, targetUrl);
    const w2 = await createEphemeralRole(db, targetUrl);
    try {
      const r1 = new PrismaOutboxRepository(w1.client);
      const r2 = new PrismaOutboxRepository(w2.client);
      const params = { enabledProviders: ["asaas"], now: new Date(), orphanMs: OUTBOX_ORPHAN_MS } as const;
      const [a, b] = await Promise.all([
        r1.claimNext({ ...params, claimedBy: "w1" }),
        r2.claimNext({ ...params, claimedBy: "w2" }),
      ]);
      assert.ok(a && b, "ambos reclamam uma linha");
      assert.notEqual(a!.row.id, b!.row.id, "SKIP LOCKED: linhas distintas, nunca a mesma");
      assert.equal(a!.row.status, "PROCESSING");
      assert.equal(b!.row.status, "PROCESSING");
    } finally {
      await w1.drop();
      await w2.drop();
    }
  });

  test("RLS: outbox é invisível sem o contexto de organização (vermelho-controle) e findById respeita o tenant", async () => {
    const a = await seedStatement(`ass08-rlsa-${randomUUID().slice(0, 8)}`);
    const b = await seedStatement(`ass08-rlsb-${randomUUID().slice(0, 8)}`);
    const idA = await seedOutboxRow(a.tenantId, a.statementId, 1);
    const role = await createEphemeralRole(db, targetUrl);
    try {
      // VERMELHO-CONTROLE: sem GUC, o papel sem bypass vê ZERO (se o repo NÃO usasse withTenantRls, o claim/find falhariam).
      const semGuc = (await role.client.$queryRawUnsafe(`SELECT count(*)::int AS n FROM billing_outbox`)) as Array<{ n: number }>;
      assert.equal(semGuc[0]!.n, 0, "sem contexto de organização, a tabela FORCE devolve zero");

      const repo = new PrismaOutboxRepository(role.client);
      const viaA = await repo.findById(a.tenantId, idA);
      assert.equal(viaA?.id, idA, "sob o contexto de A, a linha de A é visível");
      const viaB = await repo.findById(b.tenantId, idA);
      assert.equal(viaB, undefined, "sob o contexto de B, a linha de A é inexistente (RLS)");
    } finally {
      await role.drop();
    }
  });

  test("RLS: charges — contexto de A vê a cobrança de A, nunca a de B", async () => {
    const a = await seedStatement(`ass08-cha-${randomUUID().slice(0, 8)}`);
    const b = await seedStatement(`ass08-chb-${randomUUID().slice(0, 8)}`);
    const role = await createEphemeralRole(db, targetUrl);
    try {
      const repo = new PrismaStatementChargeRepository(role.client);
      await repo.insert({ tenantId: a.tenantId, statementId: a.statementId, provider: "asaas", externalChargeId: `pay_${randomUUID().slice(0, 8)}`, status: "pending", payUrl: "https://pay/x", dueDate: "2026-12-10" }, new Date());
      const listA = await repo.listByStatement(a.tenantId, a.statementId);
      assert.equal(listA.length, 1);
      assert.equal(listA[0]?.payUrl, "https://pay/x");
      const listB = await repo.listByStatement(b.tenantId, a.statementId);
      assert.equal(listB.length, 0, "B nunca vê a cobrança de A");
    } finally {
      await role.drop();
    }
  });

  test("T-NF-db-1: numeração da DPS com FOR UPDATE — concorrentes recebem números DISTINTOS e CONSECUTIVOS", async () => {
    const serie = 1 + Math.floor(Math.random() * 100000);
    const key = { provider: "focusnfe", environment: "sandbox" as const, serie };
    const w1 = await createEphemeralRole(db, targetUrl);
    const w2 = await createEphemeralRole(db, targetUrl);
    try {
      const [a, b] = await Promise.all([nextDpsNumber(w1.client, key), nextDpsNumber(w2.client, key)]);
      assert.deepEqual([a, b].sort((x, y) => x - y), [1, 2], "dois concorrentes → 1 e 2, nunca repetido");
    } finally {
      await w1.drop();
      await w2.drop();
    }
  });

  test("T-NF-db-1: rollback da transação NÃO consome número", async () => {
    const serie = 1 + Math.floor(Math.random() * 100000);
    const key = { provider: "focusnfe", environment: "sandbox" as const, serie };
    // Reserva dentro de uma transação que FALHA: o número não deve ser consumido.
    await assert.rejects(
      db.$transaction(async (tx: any) => {
        const n = await nextDpsNumberInTx(tx, key);
        assert.equal(n, 1);
        throw new Error("rollback proposital");
      }),
    );
    // A próxima reserva (commitada) ainda recebe 1.
    assert.equal(await nextDpsNumber(db, key), 1, "o rollback devolveu o número");
  });
}
