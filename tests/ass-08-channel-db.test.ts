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
import { chargeCreateClaimVerdict } from "../src/modules/subscription-billing/outbox/outbox.dispatcher.js";
import type { ClaimResult } from "../src/modules/subscription-billing/outbox/outbox.repository.js";
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

  /** Demonstrativo `closed` (R$ 100, fechado agora): é o estado em que uma `charge_create` É elegível — o claim relê o
   * demonstrativo (R-OBX-5) e só libera `closed` sem cobrança viva. Os testes de R-OBX-5 mudam o estado DEPOIS, como
   * arnês admin. */
  async function seedStatement(tenantSlug: string): Promise<{ tenantId: string; statementId: string }> {
    const tenants = (await db.$queryRawUnsafe(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, tenantSlug)) as Array<{ id: string }>;
    const tenantId = tenants[0]!.id;
    const statements = (await db.$queryRawUnsafe(
      `INSERT INTO subscription_statements
         (tenant_id, period, status, segments, users_included, users_peak, users_extra, storage_included_gb, storage_peak_gb,
          storage_extra_gb, tracked_vehicles, days_in_month, days_measured, extra_user_price, extra_gb_price,
          base_amount, users_extra_amount, storage_extra_amount, tracking_amount, adjustments_amount,
          credits_applied_amount, total_amount, due_date, closed_at, snapshot)
       VALUES ($1::uuid, '2026-10', 'closed', '[]'::jsonb, 0,0,0, 0,0,0, 0, 31,31, 0,0, 100,0,0,0,0,0,100, '2026-11-10', now(), '{"latest":null,"history":[]}'::jsonb)
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
      const params = { enabledProviders: ["asaas"], now: new Date(), orphanMs: OUTBOX_ORPHAN_MS, verdict: chargeCreateClaimVerdict } as const;
      const [a, b] = await Promise.all([
        r1.claimNext({ ...params, claimedBy: "w1" }),
        r2.claimNext({ ...params, claimedBy: "w2" }),
      ]);
      assert.ok(a && b, "ambos reclamam uma linha");
      assert.equal(a!.kind, "claimed", "demonstrativo closed sem cobrança viva → elegível");
      assert.equal(b!.kind, "claimed");
      assert.notEqual(a!.row.id, b!.row.id, "SKIP LOCKED: linhas distintas, nunca a mesma");
      assert.equal(a!.row.status, "PROCESSING");
      assert.equal(b!.row.status, "PROCESSING");
    } finally {
      await w1.drop();
      await w2.drop();
    }
  });

  test("T-OBX-db-3 (R-OBX-5): o claim RELÊ o demonstrativo na MESMA transação, sob papel sem bypass — pago → SKIPPED statement_paid (attempts 0); refechado → statement_reopened; cobrança viva → NEEDS_REVIEW charge_already_exists; nenhuma volta a ser reclamada", async () => {
    // Três demonstrativos `closed` com uma `charge_create` PENDING cada; o ARNÊS ADMIN muda o demonstrativo DEPOIS de
    // enfileirada — exatamente o que a baixa manual, o refechamento e a criação de cobrança fazem (conserto J-522, C2-01).
    const paid = await seedStatement(`ass08-obx5a-${randomUUID().slice(0, 8)}`);
    const paidRow = await seedOutboxRow(paid.tenantId, paid.statementId, 1);
    await db.$executeRawUnsafe(`UPDATE subscription_statements SET status = 'paid', paid_amount = total_amount, paid_at = now() WHERE id = $1::uuid`, paid.statementId);

    const reclosed = await seedStatement(`ass08-obx5b-${randomUUID().slice(0, 8)}`);
    const reclosedRow = await seedOutboxRow(reclosed.tenantId, reclosed.statementId, 1);
    // Refechado DEPOIS de enfileirada: `reopened_at` (preservado pelo fechamento) é posterior ao `occurred_at` da linha.
    await db.$executeRawUnsafe(
      `UPDATE subscription_statements s SET status = 'closed', reopened_at = o.occurred_at + interval '1 second'
         FROM billing_outbox o WHERE o.id = $1::uuid AND s.id = o.statement_id`,
      reclosedRow,
    );

    const live = await seedStatement(`ass08-obx5c-${randomUUID().slice(0, 8)}`);
    const liveRow = await seedOutboxRow(live.tenantId, live.statementId, 1);
    await db.$executeRawUnsafe(
      `INSERT INTO subscription_statement_charges (tenant_id, statement_id, provider, external_charge_id, status)
         VALUES ($1::uuid, $2::uuid, 'asaas', $3, 'pending')`,
      live.tenantId,
      live.statementId,
      `pay_live_${randomUUID().slice(0, 8)}`,
    );

    const role = await createEphemeralRole(db, targetUrl);
    try {
      const repo = new PrismaOutboxRepository(role.client);
      const params = { enabledProviders: ["asaas"], now: new Date(), claimedBy: "w-obx5", orphanMs: OUTBOX_ORPHAN_MS, verdict: chargeCreateClaimVerdict } as const;
      // O claim é por organização (ordem de `billing_statement_refs`) e devolve UMA linha por chamada; esgotamos a fila e
      // indexamos por linha — linhas de outros testes desta base (se elegíveis) são ignoradas.
      const drain = async (): Promise<Map<string, ClaimResult>> => {
        const seen = new Map<string, ClaimResult>();
        for (let i = 0; i < 50; i += 1) {
          const result = await repo.claimNext(params);
          if (!result) break;
          seen.set(result.row.id, result);
        }
        return seen;
      };
      const first = await drain();

      const paidClaim = first.get(paidRow);
      assert.equal(paidClaim?.kind, "skipped", "demonstrativo pago depois de enfileirada → a linha é pulada, não reclamada");
      assert.equal(paidClaim?.kind === "skipped" ? paidClaim.skipReason : null, "statement_paid");
      const paidDb = (await db.$queryRawUnsafe(`SELECT status, skip_reason, attempts, claimed_at FROM billing_outbox WHERE id = $1::uuid`, paidRow)) as Array<{ status: string; skip_reason: string | null; attempts: number; claimed_at: Date | null }>;
      assert.deepEqual(paidDb[0], { status: "SKIPPED", skip_reason: "statement_paid", attempts: 0, claimed_at: null }, "SKIPPED sem tentativa e sem claim");

      const reclosedClaim = first.get(reclosedRow);
      assert.equal(reclosedClaim?.kind, "skipped");
      assert.equal(reclosedClaim?.kind === "skipped" ? reclosedClaim.skipReason : null, "statement_reopened", "refechado depois de enfileirada → payload velho nunca sai");

      const liveClaim = first.get(liveRow);
      assert.equal(liveClaim?.kind, "needs_review", "cobrança viva já existente → revisão, nunca 2ª cobrança");
      assert.equal(liveClaim?.kind === "needs_review" ? liveClaim.code : null, "charge_already_exists");
      const liveDb = (await db.$queryRawUnsafe(`SELECT status, last_error, skip_reason FROM billing_outbox WHERE id = $1::uuid`, liveRow)) as Array<{ status: string; last_error: string | null; skip_reason: string | null }>;
      assert.deepEqual(liveDb[0], { status: "NEEDS_REVIEW", last_error: "charge_already_exists", skip_reason: null }, "sem skip_reason novo: a lista da M5 é fechada");

      // 2ª passada: nenhuma das três volta a ser reclamada (SKIPPED/NEEDS_REVIEW são terminais para o claim).
      const second = await drain();
      for (const id of [paidRow, reclosedRow, liveRow]) assert.equal(second.has(id), false, `linha ${id} não é reclamada de novo`);
    } finally {
      await role.drop();
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
