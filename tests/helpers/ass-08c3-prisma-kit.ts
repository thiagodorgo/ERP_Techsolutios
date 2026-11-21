// B-ASS-08c3 (conserto único do #608): o arnês `-db` DE VERDADE dos testes do conserto. Base PRÓPRIA (template0 +
// `migrate deploy`), papel efêmero NOSUPERUSER NOBYPASSRLS (o drill do B-O6R-06) para o que se mede, e o dono da base só para
// semear e ler. Barreiras pelo estado do banco (`pg_stat_activity`), nunca relógio.
import "dotenv/config";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createEphemeralRole, type EphemeralRole } from "./auth-identity-fixture.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export type PrismaKit = {
  /** O dono da base própria (superusuário do cluster): semeia e lê, nunca é o que se mede. */
  readonly owner: any;
  readonly role: EphemeralRole;
  readonly one: (sql: string, ...args: unknown[]) => Promise<any>;
  readonly rows: (sql: string, ...args: unknown[]) => Promise<any[]>;
  readonly seedTenant: (tag: string, options?: { readonly status?: string; readonly totalCents?: number; readonly paidCents?: number }) => Promise<{ tenantId: string; statementId: string }>;
  readonly seedRow: (
    f: { tenantId: string; statementId: string },
    o: { kind: string; status: string; provider?: string; seq?: number; attempts?: number; lastError?: string | null; externalId?: string | null; claimedBy?: string | null; attemptStartedAt?: Date | null; payload?: object },
  ) => Promise<string>;
  readonly seedCharge: (f: { tenantId: string; statementId: string }, chargeId: string, status: string) => Promise<void>;
  /** Espera até `n` backends do papel aparecerem esperando trava. `false` se não aparecerem até o teto (sem lançar). */
  readonly waitLockWaiters: (n: number, timeoutMs?: number) => Promise<boolean>;
  /** Segura linhas de `table` com `lock` numa transação do dono, até `release()`. */
  readonly hold: (table: string, ids: string[], lock: string) => Promise<{ release: () => void; done: Promise<unknown> }>;
  readonly close: () => Promise<void>;
};

export async function openPrismaKit(connectionString: string, tag: string): Promise<PrismaKit> {
  const { PrismaClient } = await import("@prisma/client");
  const { createPgAdapter } = await import("../../src/database/pg-connection.js");
  const admin = new PrismaClient({ adapter: createPgAdapter(connectionString) });
  const base = decodeURIComponent(new URL(connectionString).pathname.replace(/^\//, "")) || "postgres";
  const databaseName = `${base}_${tag}_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
  await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}" TEMPLATE template0`);
  const url = new URL(connectionString);
  url.pathname = `/${databaseName}`;
  const targetUrl = url.toString();
  const prismaCli = createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");
  execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], { cwd: ROOT, env: { ...process.env, DATABASE_URL: targetUrl }, stdio: "pipe", timeout: 600_000 });
  const owner = new PrismaClient({ adapter: createPgAdapter(targetUrl) });
  const role = await createEphemeralRole(owner, targetUrl);
  const one = async (sql: string, ...args: unknown[]) => ((await owner.$queryRawUnsafe(sql, ...args)) as any[])[0];
  const rows = async (sql: string, ...args: unknown[]) => (await owner.$queryRawUnsafe(sql, ...args)) as any[];
  assert.deepEqual(await one(`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = $1`, role.roleName), { rolsuper: false, rolbypassrls: false });

  const seedTenant: PrismaKit["seedTenant"] = async (label, options = {}) => {
    const slug = `c08c3-${label}-${randomUUID().slice(0, 8)}`;
    const tenantId = (await one(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, slug)).id as string;
    const total = options.totalCents ?? 10_000;
    const statementId = (await one(
      `INSERT INTO subscription_statements
         (tenant_id, period, status, segments, users_included, users_peak, users_extra, storage_included_gb, storage_peak_gb,
          storage_extra_gb, tracked_vehicles, days_in_month, days_measured, extra_user_price, extra_gb_price,
          base_amount, users_extra_amount, storage_extra_amount, tracking_amount, adjustments_amount,
          credits_applied_amount, total_amount, paid_amount, due_date, closed_at, snapshot)
       VALUES ($1::uuid, '2026-10', $2, '[]'::jsonb, 0,0,0, 0,0,0, 0, 31,31, 0,0, $3::numeric/100,0,0,0,0,0,$3::numeric/100, $4::numeric/100, '2099-12-20', now(),
               '{"latest":null,"history":[]}'::jsonb) RETURNING id`,
      tenantId,
      options.status ?? "closed",
      total,
      options.paidCents ?? 0,
    )).id as string;
    await owner.$executeRawUnsafe(`INSERT INTO billing_statement_refs (statement_id, tenant_id, provider) VALUES ($1::uuid, $2::uuid, 'asaas')`, statementId, tenantId);
    return { tenantId, statementId };
  };

  const seedRow: PrismaKit["seedRow"] = async (f, o) =>
    (await one(
      `INSERT INTO billing_outbox (tenant_id, statement_id, kind, provider, idempotency_key, provider_idempotency_key, payload, occurred_at, status, attempts, last_error, external_id, claimed_by, attempt_started_at)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, gen_random_uuid(), $6::jsonb, now(), $7, $8, $9, $10, $11, $12) RETURNING id`,
      f.tenantId,
      f.statementId,
      o.kind,
      o.provider ?? "asaas",
      `${o.kind}:${f.statementId}:${o.seq ?? 1}`,
      JSON.stringify(o.payload ?? {}),
      o.status,
      o.attempts ?? 0,
      o.lastError ?? null,
      o.externalId ?? null,
      o.claimedBy ?? null,
      o.attemptStartedAt ?? null,
    )).id as string;

  const seedCharge: PrismaKit["seedCharge"] = async (f, chargeId, status) => {
    await owner.$executeRawUnsafe(
      `INSERT INTO subscription_statement_charges (tenant_id, statement_id, provider, external_charge_id, status) VALUES ($1::uuid, $2::uuid, 'asaas', $3, $4)`,
      f.tenantId,
      f.statementId,
      chargeId,
      status,
    );
  };

  const waitLockWaiters: PrismaKit["waitLockWaiters"] = async (n, timeoutMs = 10_000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const r = await one(`SELECT count(*)::int AS n FROM pg_stat_activity WHERE usename = $1 AND wait_event_type = 'Lock'`, role.roleName);
      if (r.n >= n) return true;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    return false;
  };

  const hold: PrismaKit["hold"] = async (table, ids, lock) => {
    let release!: () => void;
    const released = new Promise<void>((resolve) => (release = resolve));
    let locked!: () => void;
    const holding = new Promise<void>((resolve) => (locked = resolve));
    const done = owner.$transaction(
      async (tx: any) => {
        await tx.$queryRawUnsafe(`SELECT id FROM ${table} WHERE id = ANY($1::uuid[]) ${lock}`, ids);
        locked();
        await released;
      },
      { timeout: 60_000, maxWait: 10_000 },
    );
    await holding;
    return { release, done };
  };

  return {
    owner,
    role,
    one,
    rows,
    seedTenant,
    seedRow,
    seedCharge,
    waitLockWaiters,
    hold,
    async close() {
      await role.drop();
      await owner.$disconnect();
      await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
      await admin.$disconnect();
    },
  };
}
