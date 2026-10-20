import "dotenv/config";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import type { Prisma, PrismaClient } from "@prisma/client";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";

// -----------------------------------------------------------------------------------------------
// B-TRC-02 · suíte G — o banco POR CONSTRUÇÃO (plano v2 §6.1, §9.2; C-17, C-24): ENABLE + FORCE RLS e a política do GUC,
// FK compostas tenant-first (inclusive a de 4 colunas para o recibo), UNIQUE por recibo, CHECKs, catálogo sem JSON nem
// coordenada, nenhuma regra/função elevada nova, CHECK do recibo alargado E validado, e o DRILL da migração numa base própria
// (sobe, rollback na ordem executável do rodapé, `_prisma_migrations` limpo, DROP DATABASE). Sob o papel efêmero
// NOSUPERUSER NOBYPASSRLS do arnês; semeadura e limpeza pela conexão administrativa, escopadas pelas organizações desta rodada.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATION_A = "20260879000000_vehicle_telemetry_events";
const MIGRATION_B = "20260880000000_validate_receipt_message_kind_check";

/** O SQLSTATE de um erro do Prisma (o `code` de topo é `P20xx`; o real fica na causa do adapter). */
function sqlState(error: unknown): string | undefined {
  const found: string[] = [];
  const walk = (value: unknown, depth: number) => {
    if (depth > 5 || typeof value !== "object" || value === null) return;
    const record = value as Record<string, unknown>;
    for (const key of ["originalCode", "code"]) {
      const code = record[key];
      if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code) && !code.startsWith("P")) found.push(code);
    }
    for (const key of ["cause", "meta", "driverAdapterError"]) walk(record[key], depth + 1);
  };
  walk(error, 0);
  if (found.length > 0) return found[0];
  const text = error instanceof Error ? error.message : String(error);
  return /\b(2[0-9A-Z]{4}|4[0-9A-Z]{4})\b/.exec(text)?.[1];
}

async function expectSqlState(promise: Promise<unknown>, expected: string, label: string): Promise<void> {
  try {
    await promise;
  } catch (error) {
    assert.equal(sqlState(error), expected, `${label}: SQLSTATE`);
    return;
  }
  assert.fail(`${label}: deveria falhar com ${expected}`);
}

if (!connectionString) {
  test("B-TRC-02 traccar-event-rls-db exige DATABASE_URL e um banco migrado", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suíte.",
  });
} else {
  process.env.LOG_LEVEL = "silent";

  const INSTANCE = `trc-vte-rls-${randomUUID().slice(0, 8)}`;
  type Harness = Awaited<ReturnType<typeof bootstrap>>;
  let harnessPromise: Promise<Harness> | undefined;
  const harness = (): Promise<Harness> => (harnessPromise ??= bootstrap());
  let drillDatabase: string | undefined;

  async function bootstrap() {
    const [{ PrismaPg }, { PrismaClient }, rls] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
      import("../src/database/rls.js"),
    ]);
    const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });
    const role: EphemeralRole = await createEphemeralRole(admin, connectionString!);
    return { admin, role, rls, tenants: [] as string[], PrismaPg, PrismaClient };
  }

  after(async () => {
    if (!harnessPromise) return;
    const h = await harnessPromise;
    try {
      const ids = [...h.tenants];
      if (ids.length > 0) {
        for (const table of ["vehicle_telemetry_events", "traccar_ingress_receipts", "vehicle_tracking_bindings", "vehicles"]) {
          await h.admin.$executeRawUnsafe(`DELETE FROM ${table} WHERE tenant_id = ANY($1::uuid[])`, ids);
        }
        await h.admin.$executeRawUnsafe(`DELETE FROM tenants WHERE id = ANY($1::uuid[])`, ids);
      }
      if (drillDatabase) await h.admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${drillDatabase}" WITH (FORCE)`);
    } finally {
      await h.role.drop();
      await h.admin.$disconnect();
    }
  });

  // ---------------------------------------------------------------- semeadura (conexão administrativa)
  async function newTenant(h: Harness, tag: string): Promise<string> {
    const slug = `trc-vte-${tag}-${randomUUID().slice(0, 8)}`;
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, slug);
    h.tenants.push(rows[0]!.id);
    return rows[0]!.id;
  }
  async function newVehicle(h: Harness, tenantId: string): Promise<string> {
    const id = randomUUID();
    await h.admin.$executeRawUnsafe(
      `INSERT INTO vehicles (id, tenant_id, plate, model) VALUES ($1::uuid, $2::uuid, $3, 'Viatura sintética')`,
      id,
      tenantId,
      `VTE${id.slice(0, 5).toUpperCase()}`,
    );
    return id;
  }
  async function newBinding(h: Harness, tenantId: string, vehicleId: string): Promise<string> {
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO vehicle_tracking_bindings (tenant_id, vehicle_id, instance_key, external_device_key)
       VALUES ($1::uuid, $2::uuid, $3, $4) RETURNING id`,
      tenantId,
      vehicleId,
      INSTANCE,
      `dev${randomUUID().slice(0, 8)}`,
    );
    return rows[0]!.id;
  }
  async function newReceipt(h: Harness, tenantId: string, vehicleId: string, bindingId: string, kind = "event"): Promise<string> {
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO traccar_ingress_receipts
         (tenant_id, instance_key, message_kind, external_event_key, payload_digest, binding_id, vehicle_id, traccar_device_id, fix_time)
       VALUES ($1::uuid, $2, $3, $4, $5, $6::uuid, $7::uuid, '1', now()) RETURNING id`,
      tenantId,
      INSTANCE,
      kind,
      randomUUID().replace(/-/g, "").padEnd(64, "0"),
      randomUUID().replace(/-/g, "").padEnd(64, "0"),
      bindingId,
      vehicleId,
    );
    return rows[0]!.id;
  }
  /** Organização com viatura, vínculo e recibo de evento. */
  async function world(h: Harness, tag: string) {
    const tenantId = await newTenant(h, tag);
    const vehicleId = await newVehicle(h, tenantId);
    const bindingId = await newBinding(h, tenantId, vehicleId);
    const receiptId = await newReceipt(h, tenantId, vehicleId, bindingId);
    return { tenantId, vehicleId, bindingId, receiptId };
  }
  function asTenant<T>(h: Harness, tenantId: string, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return h.rls.withTenantRls(h.role.client as PrismaClient, tenantId, work);
  }
  /** INSERT de linha de evento sob o GUC da organização, pelo papel efêmero. */
  function insertRow(
    h: Harness,
    guc: string,
    row: { tenantId: string; vehicleId: string; bindingId: string; receiptId: string; kind?: string; alarmCode?: string | null; extra?: string },
  ) {
    const kind = row.kind ?? "ignition_on";
    return asTenant(h, guc, (tx) =>
      tx.$executeRawUnsafe(
        `INSERT INTO vehicle_telemetry_events (tenant_id, vehicle_id, binding_id, receipt_id, kind, alarm_code, occurred_at${row.extra ? `, ${row.extra.split("=")[0]}` : ""})
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, $6, now()${row.extra ? `, ${row.extra.split("=")[1]}` : ""})`,
        row.tenantId,
        row.vehicleId,
        row.bindingId,
        row.receiptId,
        kind,
        row.alarmCode ?? null,
      ),
    );
  }
  const countRows = async (h: Harness, tenantId: string) =>
    Number(
      (await h.admin.$queryRawUnsafe<Array<{ n: bigint }>>(`SELECT count(*)::bigint AS n FROM vehicle_telemetry_events WHERE tenant_id = $1::uuid`, tenantId))[0]!.n,
    );

  // ------------------------------------------------------------------------------------------------------- casos
  test("banco: vehicle_telemetry_events com ENABLE + FORCE RLS e a política do GUC app.current_tenant_id", { timeout: 120_000 }, async () => {
    const h = await harness();
    const rows = await h.admin.$queryRawUnsafe<Array<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>>(
      `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE oid = 'public.vehicle_telemetry_events'::regclass`,
    );
    assert.deepEqual(rows, [{ relrowsecurity: true, relforcerowsecurity: true }]);
    const policies = await h.admin.$queryRawUnsafe<Array<{ policyname: string; qual: string; with_check: string }>>(
      `SELECT policyname, qual, with_check FROM pg_policies WHERE schemaname = 'public' AND tablename = 'vehicle_telemetry_events'`,
    );
    assert.equal(policies.length, 1);
    assert.equal(policies[0]!.policyname, "vehicle_telemetry_events_tenant_isolation");
    for (const text of [policies[0]!.qual, policies[0]!.with_check]) {
      assert.match(text, /tenant_id = \(NULLIF\(current_setting\('app\.current_tenant_id'::text, true\), ''::text\)\)::uuid/);
    }
  });

  test("banco: sem GUC nada é visível; sob o GUC de B nada de A; UPDATE cross-tenant afeta 0 linhas", { timeout: 120_000 }, async () => {
    const h = await harness();
    const a = await world(h, "g2a");
    const b = await newTenant(h, "g2b");
    await insertRow(h, a.tenantId, a);
    assert.equal(await countRows(h, a.tenantId), 1);
    const noGuc = await (h.role.client as PrismaClient).$queryRawUnsafe<Array<{ n: bigint }>>(`SELECT count(*)::bigint AS n FROM vehicle_telemetry_events`);
    assert.equal(Number(noGuc[0]!.n), 0, "sem GUC: zero linhas");
    const underB = await asTenant(h, b, (tx) =>
      tx.$queryRawUnsafe<Array<{ n: bigint }>>(`SELECT count(*)::bigint AS n FROM vehicle_telemetry_events WHERE tenant_id = $1::uuid`, a.tenantId),
    );
    assert.equal(Number(underB[0]!.n), 0, "sob B: nenhuma linha de A");
    const updated = await asTenant(h, b, (tx) =>
      tx.$executeRawUnsafe(`UPDATE vehicle_telemetry_events SET source = 'reconciliation' WHERE tenant_id = $1::uuid`, a.tenantId),
    );
    assert.equal(updated, 0, "UPDATE cross-tenant afeta 0 linhas");
  });

  test("banco: FK composta tenant-first — vehicle_id de B sob o GUC de A → 23503", { timeout: 120_000 }, async () => {
    const h = await harness();
    const a = await world(h, "g3a");
    const b = await world(h, "g3b");
    // O recibo do 01 não tem FK para vehicles (P-TRC02-RECIBO-VINCULO-VIATURA-FK): um recibo de A com a viatura de B passa a
    // FK de 4 colunas — só a FK COMPOSTA (tenant_id, vehicle_id) → vehicles pode recusar a linha.
    const crossReceipt = await newReceipt(h, a.tenantId, b.vehicleId, a.bindingId);
    await expectSqlState(
      insertRow(h, a.tenantId, { tenantId: a.tenantId, vehicleId: b.vehicleId, bindingId: a.bindingId, receiptId: crossReceipt }),
      "23503",
      "viatura de outra organização",
    );
    assert.equal(await countRows(h, a.tenantId), 0);
  });

  test("banco: uma linha por recibo — a 2ª linha para o mesmo receipt_id → 23505", { timeout: 120_000 }, async () => {
    const h = await harness();
    const a = await world(h, "g4");
    await insertRow(h, a.tenantId, a);
    await expectSqlState(insertRow(h, a.tenantId, { ...a, kind: "ignition_off" }), "23505", "2ª linha no mesmo recibo");
    assert.equal(await countRows(h, a.tenantId), 1);
  });

  test("banco: CHECKs — alarme sem código, amostra sem medida, evento com medida, bateria 101, power_mv 1000001 → 23514", { timeout: 120_000 }, async () => {
    const h = await harness();
    const a = await world(h, "g5");
    const cases: Array<[string, Parameters<typeof insertRow>[2]]> = [
      ["alarm sem código", { ...a, kind: "alarm", alarmCode: null }],
      ["ignition_on com código", { ...a, kind: "ignition_on", alarmCode: "sos" }],
      ["código fora da forma", { ...a, kind: "alarm", alarmCode: "sos,powerCut" }],
      ["amostra sem medida", { ...a, kind: "sample" }],
      ["ignition_on com medida", { ...a, kind: "ignition_on", extra: "odometer_m=10" }],
      ["bateria 101", { ...a, kind: "sample", extra: `battery_level_pct=101` }],
      ["power_mv 1000001", { ...a, kind: "sample", extra: `power_mv=1000001` }],
      ["kind fora da lista", { ...a, kind: "geofence_enter" }],
    ];
    for (const [label, row] of cases) {
      const statement = insertRow(h, a.tenantId, row);
      await expectSqlState(statement, "23514", label);
    }
    assert.equal(await countRows(h, a.tenantId), 0);
  });

  test("banco: catálogo sem JSON, sem ponto flutuante e sem coluna de coordenada", { timeout: 120_000 }, async () => {
    const h = await harness();
    const columns = await h.admin.$queryRawUnsafe<Array<{ column_name: string; data_type: string }>>(
      `SELECT column_name, data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'vehicle_telemetry_events' ORDER BY ordinal_position`,
    );
    assert.deepEqual(
      columns.map((row) => row.column_name),
      [
        "id",
        "tenant_id",
        "vehicle_id",
        "binding_id",
        "receipt_id",
        "kind",
        "alarm_code",
        "source",
        "occurred_at",
        "received_at",
        "traccar_event_id",
        "traccar_position_id",
        "ignition",
        "motion",
        "odometer_m",
        "total_distance_m",
        "engine_hours_s",
        "power_mv",
        "battery_level_pct",
      ],
      "allowlist FECHADA de colunas",
    );
    for (const { column_name, data_type } of columns) {
      assert.ok(!/json|double|real|numeric/i.test(data_type), `${column_name} é ${data_type}`);
      assert.ok(!/lat|lon|coord|name|phone|contact|payload/i.test(column_name), `${column_name} parece coordenada/dado pessoal`);
    }
  });

  test("banco: zero pg_rules, nenhuma função elevada nova e o guard do runtime limpo sob o papel efêmero", { timeout: 120_000 }, async () => {
    const h = await harness();
    const rules = await h.admin.$queryRawUnsafe<Array<{ n: bigint }>>(
      `SELECT count(*)::bigint AS n FROM pg_rules WHERE schemaname = 'public' AND tablename IN ('vehicle_telemetry_events', 'traccar_ingress_receipts')`,
    );
    assert.equal(Number(rules[0]!.n), 0);
    const elevated = await h.admin.$queryRawUnsafe<Array<{ proname: string }>>(
      `SELECT p.proname FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.prosecdef ORDER BY p.proname`,
    );
    assert.deepEqual(elevated.map((row) => row.proname), ["auth_login_candidates"], "a única função elevada continua a de antes");
    const { RUNTIME_ROLE_GUARD_SQL } = await import("../src/database/runtime-role.js");
    const escapes = await (h.role.client as PrismaClient).$queryRawUnsafe<Array<{ via: string }>>(RUNTIME_ROLE_GUARD_SQL);
    assert.deepEqual(escapes, [], "o papel efêmero não escapa de FORCE por atributo, posse nem view");
  });

  test("banco: o CHECK de message_kind do recibo aceita event, recusa position_sample (Q1 = NÃO) e foo, e está VALIDADO", { timeout: 120_000 }, async () => {
    const h = await harness();
    const a = await world(h, "g8");
    await newReceipt(h, a.tenantId, a.vehicleId, a.bindingId, "event");
    await expectSqlState(newReceipt(h, a.tenantId, a.vehicleId, a.bindingId, "position_sample"), "23514", "message_kind position_sample (Q1 = NÃO)");
    await expectSqlState(newReceipt(h, a.tenantId, a.vehicleId, a.bindingId, "foo"), "23514", "message_kind foo");
    const checks = await h.admin.$queryRawUnsafe<Array<{ convalidated: boolean; def: string }>>(
      `SELECT convalidated, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'traccar_ingress_receipts_message_kind_check'`,
    );
    assert.equal(checks.length, 1);
    assert.equal(checks[0]!.convalidated, true, "a migração B validou o CHECK");
    for (const kind of ["position", "event"]) assert.ok(checks[0]!.def.includes(`'${kind}'`), kind);
    assert.ok(!checks[0]!.def.includes("position_sample"), "Q1 = NÃO: sem position_sample");
  });

  test("banco: drill — migrate deploy numa base própria, rollback do rodapé na ordem executável, _prisma_migrations limpo", { timeout: 300_000 }, async () => {
    const h = await harness();
    const source = new URL(connectionString!);
    const baseName = decodeURIComponent(source.pathname.replace(/^\//, "")) || "postgres";
    const name = `${baseName}_trc02_drill_${randomUUID().replace(/-/g, "").slice(0, 10)}`.slice(0, 63);
    assert.match(name, /^[a-z0-9_]+$/);
    await h.admin.$executeRawUnsafe(`CREATE DATABASE "${name}" TEMPLATE template0`);
    drillDatabase = name;
    const target = new URL(connectionString!);
    target.pathname = `/${name}`;
    const prismaCli = createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");
    execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], { cwd: ROOT, env: { ...process.env, DATABASE_URL: target.toString() }, stdio: "pipe" });
    const db = new h.PrismaClient({ adapter: new h.PrismaPg({ connectionString: target.toString() }) });
    try {
      const applied = await db.$queryRawUnsafe<Array<{ migration_name: string }>>(
        `SELECT migration_name FROM _prisma_migrations WHERE migration_name IN ($1, $2) AND finished_at IS NOT NULL ORDER BY 1`,
        MIGRATION_A,
        MIGRATION_B,
      );
      assert.deepEqual(applied.map((row) => row.migration_name), [MIGRATION_A, MIGRATION_B]);

      const sql = readFileSync(path.join(ROOT, "prisma", "migrations", MIGRATION_A, "migration.sql"), "utf8").replace(/\r\n/g, "\n");
      const footer = sql.slice(sql.indexOf("-- ROLLBACK (manual"));
      const statements = [...footer.matchAll(/^--\s+(?:\d\.\s+)?((?:DROP|SELECT|ALTER|DELETE)\b[^;]*;)/gm)].map((match) => match[1]!);
      assert.deepEqual(
        statements.map((statement) => statement.split(/\s+/).slice(0, 2).join(" ")),
        ["DROP TABLE", "DROP INDEX", "SELECT count(*)", "ALTER TABLE", "ALTER TABLE", "DELETE FROM"],
        "o rodapé traz os 6 comandos na ordem 1→5",
      );
      for (const statement of statements) {
        if (statement.startsWith("SELECT")) {
          const rows = await db.$queryRawUnsafe<Array<{ count: bigint }>>(statement);
          assert.equal(Number(rows[0]!.count), 0, "passo 3: nenhum recibo ≠ position (senão o rollback PARA)");
        } else {
          await db.$executeRawUnsafe(statement);
        }
      }
      const table = await db.$queryRawUnsafe<Array<{ reg: string | null }>>(`SELECT to_regclass('public.vehicle_telemetry_events')::text AS reg`);
      assert.equal(table[0]!.reg, null, "tabela removida");
      const index = await db.$queryRawUnsafe<Array<{ n: bigint }>>(
        `SELECT count(*)::bigint AS n FROM pg_indexes WHERE indexname = 'traccar_ingress_receipts_tenant_id_id_vehicle_binding_key'`,
      );
      assert.equal(Number(index[0]!.n), 0, "índice do recibo removido");
      const check = await db.$queryRawUnsafe<Array<{ def: string }>>(
        `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'traccar_ingress_receipts_message_kind_check'`,
      );
      assert.match(check[0]!.def, /'position'/);
      assert.doesNotMatch(check[0]!.def, /'event'/, "CHECK re-estreitado a 'position'");
      const left = await db.$queryRawUnsafe<Array<{ n: bigint }>>(
        `SELECT count(*)::bigint AS n FROM _prisma_migrations WHERE migration_name IN ($1, $2)`,
        MIGRATION_A,
        MIGRATION_B,
      );
      assert.equal(Number(left[0]!.n), 0, "_prisma_migrations sem as duas");
    } finally {
      await db.$disconnect();
      await h.admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
      drillDatabase = undefined;
    }
  });

  test("banco: a linha e o recibo concordam em viatura e vínculo — recibo de V1 com a viatura V2 → 23503 (FK de 4 colunas)", { timeout: 120_000 }, async () => {
    const h = await harness();
    const one = await world(h, "g10");
    const vehicleTwo = await newVehicle(h, one.tenantId);
    const bindingTwo = await newBinding(h, one.tenantId, vehicleTwo);
    await expectSqlState(
      insertRow(h, one.tenantId, { tenantId: one.tenantId, vehicleId: vehicleTwo, bindingId: bindingTwo, receiptId: one.receiptId }),
      "23503",
      "recibo de V1 com viatura V2",
    );
    assert.equal(await countRows(h, one.tenantId), 0);
    await insertRow(h, one.tenantId, one);
    assert.equal(await countRows(h, one.tenantId), 1, "controle: o recibo com a SUA viatura entra");
  });
}
