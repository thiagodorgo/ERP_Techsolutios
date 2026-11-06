// B-ASS-03 · F3 — medidor contra Postgres sob papel NOSUPERUSER NOBYPASSRLS. T-MED-db-1..4, 6, 7, 9, 10, 11.
import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";

import type { Prisma, PrismaClient } from "@prisma/client";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";
import { withTenantRlsBudget } from "../src/database/rls.js";
import {
  TenantContextMissingError,
  measureTenantUsageInTx,
  type TenantUsageDaily,
} from "../src/modules/subscription-billing/metering/index.js";

const connectionString = process.env.DATABASE_URL;
const DAY = { date: "2026-11-06", start: new Date("2026-11-06T00:00:00.000Z"), end: new Date("2026-11-06T23:59:59.999Z") };
const NO_TABLES: readonly string[] = [];

if (!connectionString) {
  test("B-ASS-03 · banco exige DATABASE_URL e um PostgreSQL migrado", {
    skip: "Defina DATABASE_URL para executar T-MED-db-1..4, 6, 7, 9, 10, 11.",
  });
} else {
  type Harness = Awaited<ReturnType<typeof bootstrap>>;
  let harnessPromise: Promise<Harness> | undefined;
  const harness = (): Promise<Harness> => (harnessPromise ??= bootstrap());

  async function bootstrap() {
    const [{ PrismaPg }, { PrismaClient: Client }] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
    ]);
    const admin = new Client({ adapter: new PrismaPg({ connectionString: connectionString! }) });
    const role: EphemeralRole = await createEphemeralRole(admin, connectionString!);
    return { admin, role, tenantIds: [] as string[] };
  }

  after(async () => {
    if (!harnessPromise) return;
    const h = await harnessPromise;
    try {
      if (h.tenantIds.length > 0) {
        const ids = h.tenantIds;
        await h.admin.$executeRawUnsafe(`DELETE FROM tenant_usage_daily WHERE tenant_id = ANY($1::uuid[])`, ids);
        await h.admin.$executeRawUnsafe(`DELETE FROM audit_logs WHERE tenant_id = ANY($1::uuid[])`, ids);
        await h.admin.$executeRawUnsafe(`DELETE FROM work_order_attachments WHERE tenant_id = ANY($1::uuid[])`, ids);
        await h.admin.$executeRawUnsafe(`DELETE FROM damage_attachments WHERE tenant_id = ANY($1::uuid[])`, ids);
        await h.admin.$executeRawUnsafe(`DELETE FROM attachments WHERE tenant_id = ANY($1::uuid[])`, ids);
        await h.admin.$executeRawUnsafe(`DELETE FROM damages WHERE tenant_id = ANY($1::uuid[])`, ids);
        await h.admin.$executeRawUnsafe(`DELETE FROM work_orders WHERE tenant_id = ANY($1::uuid[])`, ids);
        await h.admin.$executeRawUnsafe(`DELETE FROM vehicles WHERE tenant_id = ANY($1::uuid[])`, ids);
        await h.admin.$executeRawUnsafe(`DELETE FROM user_role_assignments WHERE tenant_id = ANY($1::uuid[])`, ids);
        await h.admin.$executeRawUnsafe(`DELETE FROM roles WHERE tenant_id = ANY($1::uuid[])`, ids);
        await h.admin.$executeRawUnsafe(`DELETE FROM users WHERE tenant_id = ANY($1::uuid[])`, ids);
        await h.admin.$executeRawUnsafe(`DELETE FROM tenants WHERE id = ANY($1::uuid[])`, ids);
      }
    } finally {
      await h.role.drop();
      await h.admin.$disconnect();
    }
  });

  async function newTenant(h: Harness, tag: string): Promise<string> {
    const slug = `ass03-${tag}-${randomUUID().slice(0, 8)}`;
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`,
      slug,
    );
    const id = rows[0]!.id;
    h.tenantIds.push(id);
    return id;
  }

  async function newUser(h: Harness, tenantId: string, status: string): Promise<string> {
    const email = `u-${randomUUID().slice(0, 8)}@ass03.test`;
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO users (tenant_id, name, email, status) VALUES ($1::uuid, $2, $3, $4) RETURNING id`,
      tenantId,
      email,
      email,
      status,
    );
    return rows[0]!.id;
  }

  // Achado M-2 do revisor sênior do #505: o técnico de campo precisa EXISTIR no teste (papel atribuído), senão a
  // mutação "filtrar papel" sobrevive.
  async function assignFieldTechnician(h: Harness, tenantId: string, userId: string): Promise<void> {
    const role = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO roles (tenant_id, key, name, scope) VALUES ($1::uuid, 'field_technician', 'Técnico de Campo', 'tenant') RETURNING id`,
      tenantId,
    );
    await h.admin.$executeRawUnsafe(
      `INSERT INTO user_role_assignments (tenant_id, user_id, role_id) VALUES ($1::uuid, $2::uuid, $3::uuid)`,
      tenantId,
      userId,
      role[0]!.id,
    );
  }

  async function newAuditLogs(h: Harness, tenantId: string, count: number): Promise<void> {
    await h.admin.$executeRawUnsafe(
      `INSERT INTO audit_logs (tenant_id, action, entity)
       SELECT $1::uuid, 'ass03.audit', 'metering'
         FROM generate_series(1, $2::int)`,
      tenantId,
      count,
    );
  }

  async function newVehicle(h: Harness, tenantId: string): Promise<string> {
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO vehicles (tenant_id, plate, model) VALUES ($1::uuid, $2, $3) RETURNING id`,
      tenantId,
      `PL-${randomUUID().slice(0, 8)}`,
      "ass03",
    );
    return rows[0]!.id;
  }

  async function newWorkOrder(h: Harness, tenantId: string): Promise<string> {
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO work_orders (tenant_id, code, title) VALUES ($1::uuid, $2, $3) RETURNING id`,
      tenantId,
      `WO-${randomUUID().slice(0, 8)}`,
      "ass03",
    );
    return rows[0]!.id;
  }

  async function newDamage(h: Harness, tenantId: string, vehicleId: string): Promise<string> {
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO damages (tenant_id, vehicle_id, data, gravidade, descricao)
       VALUES ($1::uuid, $2::uuid, now(), 'media', 'ass03') RETURNING id`,
      tenantId,
      vehicleId,
    );
    return rows[0]!.id;
  }

  async function measure(
    h: Harness,
    tenantId: string,
    tables: readonly string[],
    budget?: { statementTimeoutMs?: number },
  ): Promise<TenantUsageDaily> {
    return withTenantRlsBudget(
      h.role.client,
      tenantId,
      {
        maxWait: 5_000,
        timeout: 60_000,
        lockTimeoutMs: 5_000,
        statementTimeoutMs: budget?.statementTimeoutMs ?? 30_000,
      },
      (tx) => measureTenantUsageInTx(tx as Prisma.TransactionClient, tenantId, DAY, tables),
    );
  }

  test("T-MED-db-1 · usuários ativos contam por organização sem filtro de papel (A=3 com 1 inativo; B=2)", async () => {
    const h = await harness();
    const a = await newTenant(h, "a");
    const b = await newTenant(h, "b");
    await newUser(h, a, "active");
    await newUser(h, a, "active");
    const technician = await newUser(h, a, "active");
    await assignFieldTechnician(h, a, technician); // técnico de campo também conta (sem filtro de papel)
    await newUser(h, a, "inactive");
    await newUser(h, b, "active");
    await newUser(h, b, "active");

    const rowA = await measure(h, a, NO_TABLES);
    const rowB = await measure(h, b, NO_TABLES);
    assert.equal(rowA.activeUsers, 3);
    assert.equal(rowB.activeUsers, 2);
  });

  test("T-MED-db-2/9 · arquivos: tamanhos somam, sem tamanho conta, deletado/rejeitado não conta", async () => {
    const h = await harness();
    const a = await newTenant(h, "a");
    const entityId = randomUUID();
    const vehicleId = await newVehicle(h, a);
    const workOrderId = await newWorkOrder(h, a);
    const damageId = await newDamage(h, a, vehicleId);

    await h.admin.$executeRawUnsafe(
      `INSERT INTO attachments (tenant_id, entity_type, entity_id, file_url, size_bytes, status, deleted_at, metadata)
       VALUES ($1::uuid, 'metering', $2::uuid, 'f1', 100, 'stored', NULL, '{}'::jsonb),
              ($1::uuid, 'metering', $2::uuid, 'f2', 200, 'stored', NULL, '{}'::jsonb),
              ($1::uuid, 'metering', $2::uuid, 'f3', NULL, 'stored', NULL, '{}'::jsonb),
              ($1::uuid, 'metering', $2::uuid, 'f4', 999, 'rejected', NULL, '{}'::jsonb),
              ($1::uuid, 'metering', $2::uuid, 'f5', 888, 'stored', now(), '{}'::jsonb)`,
      a,
      entityId,
    );
    await h.admin.$executeRawUnsafe(
      `INSERT INTO work_order_attachments (tenant_id, work_order_id, file_url, size_bytes, status, deleted_at, metadata)
       VALUES ($1::uuid, $2::uuid, 'wo1', 50, 'stored', NULL, '{}'::jsonb)`,
      a,
      workOrderId,
    );
    await h.admin.$executeRawUnsafe(
      `INSERT INTO damage_attachments (tenant_id, damage_id, file_url, size_bytes, metadata)
       VALUES ($1::uuid, $2::uuid, 'dmg1', 40, '{}'::jsonb)`,
      a,
      damageId,
    );

    const row = await measure(h, a, NO_TABLES);
    assert.equal(row.filesBytes, 100n + 200n + 50n + 40n);
    assert.equal(row.filesWithoutSize, 1);
  });

  test("T-MED-db-3/10 · banco mede SÓ a própria organização; apagar em B não muda A (byte a byte, sem ANALYZE)", async () => {
    const h = await harness();
    const a = await newTenant(h, "a");
    const b = await newTenant(h, "b");
    await newAuditLogs(h, a, 900);
    await newAuditLogs(h, b, 100);

    const firstA = await measure(h, a, ["audit_logs"]);
    const firstB = await measure(h, b, ["audit_logs"]);
    assert.ok(firstA.dbBytesEstimated !== null && firstB.dbBytesEstimated !== null);
    assert.ok(firstA.dbBytesEstimated > firstB.dbBytesEstimated, "A tem 90% das linhas");

    await h.admin.$executeRawUnsafe(
      `DELETE FROM audit_logs WHERE ctid IN (
         SELECT ctid FROM audit_logs WHERE tenant_id = $1::uuid LIMIT 90)`,
      b,
    );

    const secondA = await measure(h, a, ["audit_logs"]);
    assert.equal(secondA.dbBytesEstimated, firstA.dbBytesEstimated, "apagar em B não muda A (byte a byte)");

    const total = await h.admin.$queryRawUnsafe<Array<{ bytes: bigint }>>(
      `SELECT pg_total_relation_size('audit_logs')::bigint AS bytes`,
    );
    assert.ok(
      (secondA.dbBytesEstimated ?? 0n) + (firstB.dbBytesEstimated ?? 0n) <= total[0]!.bytes,
      "a soma das medidas por organização não excede o tamanho físico total",
    );
  });

  test("T-MED-db-6 · sem GUC a leitura dá 0 e o medidor lança ANTES de gravar", async () => {
    const h = await harness();
    const a = await newTenant(h, "a");
    await newUser(h, a, "active");

    await assert.rejects(
      () => h.role.client.$transaction((tx) => measureTenantUsageInTx(tx, a, DAY, NO_TABLES)),
      TenantContextMissingError,
    );
    const rows = await h.admin.$queryRawUnsafe<Array<{ n: number }>>(
      `SELECT count(*)::int AS n FROM tenant_usage_daily WHERE tenant_id = $1::uuid`,
      a,
    );
    assert.equal(rows[0]!.n, 0, "nenhuma linha é gravada sem GUC");
  });

  test("T-MED-db-7 · tenant_usage_daily está com RLS ENABLE + FORCE", async () => {
    const h = await harness();
    const rows = await h.admin.$queryRawUnsafe<Array<{ force: boolean }>>(
      `SELECT c.relforcerowsecurity AS force FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'tenant_usage_daily'`,
    );
    assert.equal(rows[0]?.force, true);
  });

  test("T-MED-db-11 · tabela com timeout vai para tables_timed_out e a linha do dia é gravada", async () => {
    const h = await harness();
    const a = await newTenant(h, "a");
    await newUser(h, a, "active");
    await newAuditLogs(h, a, 300_000);

    const row = await measure(h, a, ["audit_logs"], { statementTimeoutMs: 10 });
    assert.ok(row.metadata.tablesTimedOut.includes("audit_logs"), `tabela nomeada: ${JSON.stringify(row.metadata.tablesTimedOut)}`);
    assert.equal(row.dbBytesEstimated, null);
    assert.equal(row.activeUsers, 1, "active_users presente mesmo com timeout de uma tabela");

    const saved = await h.admin.$queryRawUnsafe<Array<{ active_users: number; metadata: { tablesTimedOut: string[] } }>>(
      `SELECT active_users, metadata FROM tenant_usage_daily WHERE tenant_id = $1::uuid AND date = $2::date`,
      a,
      DAY.date,
    );
    assert.equal(saved.length, 1, "a linha do dia foi gravada");
    assert.equal(saved[0]!.active_users, 1);
    assert.ok(saved[0]!.metadata.tablesTimedOut.includes("audit_logs"));
  });

  test("T-MED-db-12 · o maior do dia vence: 3 ativos e depois 2 → a linha fica com 3 (GREATEST no SQL real)", async () => {
    // Achado M-3 do revisor sênior do #505: sem este teste, trocar GREATEST por EXCLUDED.active_users passava.
    const h = await harness();
    const a = await newTenant(h, "greatest");
    await newUser(h, a, "active");
    await newUser(h, a, "active");
    const third = await newUser(h, a, "active");
    const first = await measure(h, a, NO_TABLES);
    assert.equal(first.activeUsers, 3);
    await h.admin.$executeRawUnsafe(`UPDATE users SET status = 'inactive' WHERE id = $1::uuid`, third);
    const second = await measure(h, a, NO_TABLES);
    assert.equal(second.activeUsers, 3, "a 2ª amostra (2) não rebaixa o maior do dia (3)");
  });

  test("T-MED-db-13 · uma tabela estourada deixa o banco do dia NULL, nunca a soma parcial das que couberam", async () => {
    // Achado G-2 do revisor sênior do #505 (plano §4.3: "nunca um número parcial calado"). Duas tabelas: `users`
    // (pequena, mede) e `audit_logs` (300 mil linhas, estoura 10 ms). Antes do conserto, gravava a soma de `users`.
    const h = await harness();
    const a = await newTenant(h, "partial");
    await newUser(h, a, "active");
    await newAuditLogs(h, a, 300_000);
    const row = await measure(h, a, ["users", "audit_logs"], { statementTimeoutMs: 10 });
    assert.ok(row.metadata.tablesTimedOut.includes("audit_logs"));
    assert.equal(row.dbBytesEstimated, null, `banco do dia sem medida; veio ${String(row.dbBytesEstimated)}`);
    assert.equal(row.activeUsers, 1);
  });

  test("T-MED-db-14 · amostra estourada não apaga a medida completa já gravada no mesmo dia (COALESCE)", async () => {
    const h = await harness();
    const a = await newTenant(h, "coalesce");
    await newUser(h, a, "active");
    const complete = await measure(h, a, ["users"]);
    assert.ok(complete.dbBytesEstimated !== null && complete.dbBytesEstimated > 0n);
    await newAuditLogs(h, a, 300_000);
    const partial = await measure(h, a, ["users", "audit_logs"], { statementTimeoutMs: 10 });
    assert.ok(partial.metadata.tablesTimedOut.includes("audit_logs"));
    assert.equal(partial.dbBytesEstimated, complete.dbBytesEstimated, "a medida completa das 12:00 fica");
  });
}
