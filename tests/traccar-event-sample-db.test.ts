import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import type { PrismaClient } from "@prisma/client";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";

// -----------------------------------------------------------------------------------------------
// B-TRC-02 · suíte F — a AMOSTRA veicular no passo 7 da posição, contra o PostgreSQL real, sob o papel efêmero (plano v2 §5.3,
// §6.3; emenda v2.1 R4-1..R4-5; C-13, C-14, C-16, C-19, C-26, C-27). A amostra nasce na transação da posição, pendurada no
// recibo da POSIÇÃO, dentro de um savepoint: domínio (23514/22003) é descartado e a posição segue; qualquer outro erro falha
// fechado (503, nada gravado). Semeadura e limpeza pela conexão administrativa, escopadas por organização e instância.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = JSON.parse(
  readFileSync(path.join(ROOT, "infra", "traccar", "fixtures", "6.16.0", "position-osmand.json"), "utf8"),
) as { position: Record<string, unknown>; device: Record<string, unknown> };
const MAX = 9007199254740991;

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
  return found[0];
}

if (!connectionString) {
  test("B-TRC-02 traccar-event-sample-db exige DATABASE_URL e um banco migrado", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suíte.",
  });
} else {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "prisma";

  const INSTANCE = `trc-smp-${randomUUID().slice(0, 8)}`;
  const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const STEP_MS = 60;
  const RELAXED_BUDGETS = { phaseTwo: { maxWait: 5_000, timeout: 10_000 }, discovery: { maxWait: 5_000, timeout: 10_000 } };

  type LogLine = { level: "info" | "warn" | "error"; fields: Record<string, unknown>; message: string };
  type Harness = Awaited<ReturnType<typeof bootstrap>>;
  let harnessPromise: Promise<Harness> | undefined;
  const harness = (): Promise<Harness> => (harnessPromise ??= bootstrap());

  async function bootstrap() {
    const [{ PrismaPg }, { PrismaClient }, rls, dispatch, service, schema, adapter, app, telemetry] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
      import("../src/database/rls.js"),
      import("../src/modules/field-dispatch/field-dispatch-prisma.repository.js"),
      import("../src/integrations/traccar/traccar-ingestion.service.js"),
      import("../src/integrations/traccar/traccar-position.schema.js"),
      import("../src/integrations/traccar/traccar-position.adapter.js"),
      import("../src/integrations/traccar/traccar-ingest.app.js"),
      import("../src/modules/telemetry/vehicle-telemetry-prisma.repository.js"),
    ]);
    const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });
    const role: EphemeralRole = await createEphemeralRole(admin, connectionString!);
    const makeService = (options: { hooks?: Record<string, unknown> } = {}) => {
      const lines: LogLine[] = [];
      const ingestion = service.createTraccarIngestionService({
        client: role.client as PrismaClient,
        timeoutMs: 3_000,
        resolver: { maxTenants: 500, hintTtlMs: 600_000, negativeTtlMs: 60_000, cacheMax: 10_000 },
        budgets: RELAXED_BUDGETS,
        hooks: (options.hooks ?? {}) as never,
        logger: {
          info: (fields, message) => lines.push({ level: "info", fields, message }),
          warn: (fields, message) => lines.push({ level: "warn", fields, message }),
          error: (fields, message) => lines.push({ level: "error", fields, message }),
        },
        publish: (async () => ({ event: {} as never, published: true })) as never,
      });
      return { ingestion, lines };
    };
    return {
      admin,
      role,
      rls,
      dispatch,
      schema,
      adapter,
      app,
      repo: new telemetry.PrismaVehicleTelemetryRepository(),
      makeService,
      main: makeService(),
      tenants: [] as string[],
    };
  }

  after(async () => {
    if (!harnessPromise) return;
    const h = await harnessPromise;
    try {
      const ids = [...h.tenants];
      if (ids.length > 0) {
        for (const table of [
          "vehicle_telemetry_events",
          "traccar_ingress_receipts",
          "field_operator_locations",
          "vehicle_tracking_bindings",
          "field_dispatches",
          "work_orders",
          "vehicles",
          "users",
        ]) {
          await h.admin.$executeRawUnsafe(`DELETE FROM ${table} WHERE tenant_id = ANY($1::uuid[])`, ids);
        }
        await h.admin.$executeRawUnsafe(`DELETE FROM tenants WHERE id = ANY($1::uuid[])`, ids);
      }
      await h.admin.$executeRawUnsafe(`DELETE FROM traccar_quarantine_items WHERE instance_key = $1`, INSTANCE);
    } finally {
      await h.role.drop();
      await h.admin.$disconnect();
    }
  });

  // ---------------------------------------------------------------- semeadura (como no arnês do B-TRC-01)
  async function newTenant(h: Harness, tag: string): Promise<string> {
    const slug = `trc-smp-${tag}-${randomUUID().slice(0, 8)}`;
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, slug);
    h.tenants.push(rows[0]!.id);
    return rows[0]!.id;
  }
  async function newUser(h: Harness, tenantId: string, label: string): Promise<string> {
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO users (tenant_id, name, email) VALUES ($1::uuid, $2, $3) RETURNING id`,
      tenantId,
      `Técnico ${label}`,
      `smp-${label}-${randomUUID().slice(0, 8)}@example.com`,
    );
    return rows[0]!.id;
  }
  async function newVehicle(h: Harness, tenantId: string): Promise<string> {
    const id = randomUUID();
    await h.admin.$executeRawUnsafe(
      `INSERT INTO vehicles (id, tenant_id, plate, model) VALUES ($1::uuid, $2::uuid, $3, 'Viatura sintética')`,
      id,
      tenantId,
      `SMP${id.slice(0, 5).toUpperCase()}`,
    );
    return id;
  }
  async function newWorkOrder(h: Harness, tenantId: string, vehicleId: string): Promise<string> {
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO work_orders (tenant_id, code, title, vehicle_id) VALUES ($1::uuid, $2, 'OS sintética', $3::uuid) RETURNING id`,
      tenantId,
      `SMP-${randomUUID().slice(0, 8)}`,
      vehicleId,
    );
    return rows[0]!.id;
  }
  function dispatchRepo<T>(h: Harness, tenantId: string, work: (repo: InstanceType<Harness["dispatch"]["PrismaFieldDispatchRepository"]>) => Promise<T>) {
    return h.rls.withTenantRls(h.role.client as PrismaClient, tenantId, (tx) => work(new h.dispatch.PrismaFieldDispatchRepository(tx)));
  }
  async function bind(h: Harness, tenantId: string, vehicleId: string, device: string): Promise<void> {
    await h.rls.withTenantRls(h.role.client as PrismaClient, tenantId, (tx) =>
      tx.$executeRaw`INSERT INTO vehicle_tracking_bindings (tenant_id, vehicle_id, instance_key, external_device_key)
        VALUES (${tenantId}::uuid, ${vehicleId}::uuid, ${INSTANCE}, ${device})`,
    );
    await pause(STEP_MS);
  }
  /** Organização com viatura vinculada e técnico com despacho ACEITO (a posição vira localização). */
  async function world(h: Harness, tag: string, options: { dispatch?: boolean } = {}) {
    const tenantId = await newTenant(h, tag);
    const vehicleId = await newVehicle(h, tenantId);
    const tech = await newUser(h, tenantId, tag);
    const workOrderId = await newWorkOrder(h, tenantId, vehicleId);
    const device = `smp${randomUUID().slice(0, 8)}`;
    await bind(h, tenantId, vehicleId, device);
    if (options.dispatch !== false) {
      const created = await dispatchRepo(h, tenantId, (repo) => repo.create({ tenantId, workOrderId, operatorUserId: tech, status: "assigned" }));
      await pause(STEP_MS);
      await dispatchRepo(h, tenantId, (repo) => repo.changeStatus({ tenantId, dispatchId: created.id, status: "accepted" as never }));
      await pause(STEP_MS);
    }
    return { tenantId, vehicleId, device, workOrderId };
  }
  async function fixNow(): Promise<Date> {
    await pause(STEP_MS);
    const at = new Date();
    await pause(STEP_MS);
    return at;
  }
  function envelope(device: string, fixAt: Date, attributes: Record<string, unknown> | undefined) {
    const body = structuredClone(FIXTURE);
    body.device.uniqueId = device;
    body.position.fixTime = fixAt.toISOString();
    body.position.deviceTime = fixAt.toISOString();
    if (attributes === undefined) delete body.position.attributes;
    else body.position.attributes = attributes;
    return body;
  }
  function command(h: Harness, device: string, fixAt: Date, attributes: Record<string, unknown> | undefined) {
    return h.adapter.buildTraccarPositionCommand(h.schema.parseTraccarPositionEnvelope(envelope(device, fixAt, attributes)), {
      instanceKey: INSTANCE,
      receivedAt: new Date(),
    });
  }
  async function count(h: Harness, sql: string, ...values: unknown[]): Promise<number> {
    return Number((await h.admin.$queryRawUnsafe<Array<{ n: bigint }>>(sql, ...values))[0]!.n);
  }
  const samplesOf = (h: Harness, tenantId: string) =>
    count(h, `SELECT count(*)::bigint AS n FROM vehicle_telemetry_events WHERE tenant_id = $1::uuid AND kind = 'sample'`, tenantId);
  const receiptsOf = (h: Harness, tenantId: string, kind = "position") =>
    count(h, `SELECT count(*)::bigint AS n FROM traccar_ingress_receipts WHERE tenant_id = $1::uuid AND message_kind = $2`, tenantId, kind);
  const locationsOf = (h: Harness, tenantId: string) =>
    count(h, `SELECT count(*)::bigint AS n FROM field_operator_locations WHERE tenant_id = $1::uuid AND source = 'traccar'`, tenantId);
  const tally = (h: Harness, tenantId: string) => Promise.all([receiptsOf(h, tenantId), locationsOf(h, tenantId), samplesOf(h, tenantId)]);
  const status = (h: Harness, outcome: Parameters<Harness["app"]["traccarIngestResponse"]>[0]) => h.app.traccarIngestResponse(outcome).status;
  const discarded = (lines: LogLine[]) => lines.filter((line) => line.fields.outcome === "sample_discarded");
  const failedBeforeCommit = (lines: LogLine[]) => lines.filter((line) => line.message === "Traccar ingestion failed before commit");
  async function sampleRow(h: Harness, tenantId: string) {
    const rows = await h.admin.$queryRawUnsafe<
      Array<{ receipt_id: string; occurred_at: Date; vehicle_id: string; binding_id: string; odometer_m: string | null; total_distance_m: string | null; engine_hours_s: string | null; power_mv: number | null; battery_level_pct: number | null; ignition: boolean | null; motion: boolean | null; md5: string }>
    >(
      `SELECT receipt_id::text, occurred_at, vehicle_id::text, binding_id::text, odometer_m::text, total_distance_m::text,
              engine_hours_s::text, power_mv, battery_level_pct, ignition, motion, md5(v::text) AS md5
         FROM vehicle_telemetry_events v WHERE tenant_id = $1::uuid AND kind = 'sample'`,
      tenantId,
    );
    return rows;
  }

  // ------------------------------------------------------------------------------------------------------- casos
  test("amostra: posição com atributos — 1 recibo, 1 localização, 1 amostra pendurada no recibo da POSIÇÃO", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "f1");
    const at = await fixNow();
    const cmd = command(h, w.device, at, { ignition: true, odometer: 1000, motion: false });
    assert.deepEqual(await h.main.ingestion.ingest(cmd), { kind: "stored" });
    assert.deepEqual(await tally(h, w.tenantId), [1, 1, 1]);
    const receipt = (await h.admin.$queryRawUnsafe<Array<{ id: string; vehicle_id: string; binding_id: string }>>(
      `SELECT id::text, vehicle_id::text, binding_id::text FROM traccar_ingress_receipts WHERE tenant_id = $1::uuid`,
      w.tenantId,
    ))[0]!;
    const sample = (await sampleRow(h, w.tenantId))[0]!;
    assert.equal(sample.receipt_id, receipt.id);
    assert.equal(sample.occurred_at.toISOString(), at.toISOString());
    assert.equal(sample.vehicle_id, receipt.vehicle_id);
    assert.equal(sample.binding_id, receipt.binding_id);
    assert.ok(cmd.externalEventKey, "o comando tem chave");
  });

  test("amostra: reenvio idêntico e reenvio com atributo diferente — 204 e a amostra da 1ª gravação, inalterada", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "f2");
    const at = await fixNow();
    await h.main.ingestion.ingest(command(h, w.device, at, { ignition: true, odometer: 10 }));
    const before = (await sampleRow(h, w.tenantId))[0]!.md5;
    assert.deepEqual(await h.main.ingestion.ingest(command(h, w.device, at, { ignition: true, odometer: 10 })), { kind: "duplicate" });
    assert.deepEqual(await h.main.ingestion.ingest(command(h, w.device, at, { ignition: false, odometer: 99 })), { kind: "duplicate" });
    assert.equal(await samplesOf(h, w.tenantId), 1);
    assert.equal((await sampleRow(h, w.tenantId))[0]!.md5, before);
  });

  test("amostra: posição em quarentena por operador — 0 recibo, 0 localização, 0 amostra (Q1 = NÃO)", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "f3", { dispatch: false });
    const outcome = await h.main.ingestion.ingest(command(h, w.device, await fixNow(), { ignition: true }));
    assert.deepEqual(outcome, { kind: "quarantined", reason: "no_operator_at_fix_time" });
    assert.equal(await receiptsOf(h, w.tenantId), 0);
    assert.equal(await locationsOf(h, w.tenantId), 0);
    assert.equal(await samplesOf(h, w.tenantId), 0, "Q1 = NÃO: a quarentena nunca guarda amostra");
    assert.equal(await count(h, `SELECT count(*)::bigint AS n FROM traccar_ingress_receipts WHERE tenant_id = $1::uuid`, w.tenantId), 0);
  });

  test("amostra: sem atributo allowlisted — nenhuma linha sample", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "f4");
    const svc = h.makeService();
    assert.deepEqual(await svc.ingestion.ingest(command(h, w.device, await fixNow(), { rpm: 900, distance: 3 })), { kind: "stored" });
    assert.deepEqual(await tally(h, w.tenantId), [1, 1, 0]);
    assert.equal(discarded(svc.lines).length, 0, "nenhuma tentativa de amostra (nem descartada)");
  });

  test("amostra: falha injetada DEPOIS da amostra (beforeCommit) — 503 e nada gravado, nem a amostra", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "f5");
    const failing = h.makeService({
      hooks: {
        beforeCommit: () => {
          throw new Error("falha injetada antes do commit");
        },
      },
    });
    const outcome = await failing.ingestion.ingest(command(h, w.device, await fixNow(), { ignition: true }));
    assert.equal(status(h, outcome), 503);
    assert.deepEqual(await tally(h, w.tenantId), [0, 0, 0]);
  });

  test("amostra: nenhuma escrita em work_orders (md5 da OS igual antes e depois)", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "f6");
    const md5 = () => h.admin.$queryRawUnsafe<Array<{ md5: string }>>(`SELECT md5(w::text) AS md5 FROM work_orders w WHERE id = $1::uuid`, w.workOrderId);
    const before = (await md5())[0]!.md5;
    await h.main.ingestion.ingest(command(h, w.device, await fixNow(), { odometer: 12345, totalDistance: 500 }));
    assert.equal(await samplesOf(h, w.tenantId), 1);
    assert.equal((await md5())[0]!.md5, before);
  });

  test("amostra: unidades gravadas — odometer_m 12345, power_mv 12600, engine_hours_s 3600", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "f7");
    await h.main.ingestion.ingest(command(h, w.device, await fixNow(), { odometer: 12345.2, power: 12.6, hours: 3_600_000, batteryLevel: 87.4 }));
    const row = (await sampleRow(h, w.tenantId))[0]!;
    assert.equal(row.odometer_m, "12345");
    assert.equal(row.power_mv, 12600);
    assert.equal(row.engine_hours_s, "3600");
    assert.equal(row.battery_level_pct, 87);
  });

  test("amostra: canário — B semeada e nunca ingerida fica 0/0", { timeout: 120_000 }, async () => {
    const h = await harness();
    const a = await world(h, "f8a");
    const b = await world(h, "f8b");
    await h.main.ingestion.ingest(command(h, a.device, await fixNow(), { ignition: true }));
    assert.equal(await samplesOf(h, a.tenantId), 1);
    assert.deepEqual([await receiptsOf(h, b.tenantId), await samplesOf(h, b.tenantId)], [0, 0]);
  });

  /** Um recibo de posição novo (a amostra exige um recibo próprio: UNIQUE (tenant_id, receipt_id)). */
  async function freshReceipt(h: Harness, w: { tenantId: string; vehicleId: string }) {
    const binding = (await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id::text FROM vehicle_tracking_bindings WHERE tenant_id = $1::uuid AND valid_to IS NULL`,
      w.tenantId,
    ))[0]!.id;
    const key = randomUUID().replace(/-/g, "").padEnd(64, "0");
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO traccar_ingress_receipts (tenant_id, instance_key, message_kind, external_event_key, payload_digest, binding_id, vehicle_id, traccar_device_id, fix_time)
       VALUES ($1::uuid, $2, 'position', $3, $3, $4::uuid, $5::uuid, '1', now()) RETURNING id::text AS id`,
      w.tenantId,
      INSTANCE,
      key,
      binding,
      w.vehicleId,
    );
    return { receiptId: rows[0]!.id, bindingId: binding };
  }

  const BORDERS = [
    { column: "odometer_m", field: "odometerM", min: 0, max: MAX, overflow: "22003" },
    { column: "total_distance_m", field: "totalDistanceM", min: 0, max: MAX, overflow: "22003" },
    { column: "engine_hours_s", field: "engineHoursS", min: 0, max: MAX, overflow: "22003" },
    { column: "power_mv", field: "powerMv", min: 0, max: 1_000_000, overflow: "23514" },
    { column: "battery_level_pct", field: "batteryLevelPct", min: 0, max: 100, overflow: "23514" },
  ] as const;

  test("amostra: parser ⊆ banco nas bordas — o aceito entra pelo SQL de produção e sai igual; o recusado, direto, é 23514", { timeout: 180_000 }, async () => {
    const h = await harness();
    const w = await world(h, "f9", { dispatch: false });
    const { VEHICLE_TELEMETRY_COLUMN_DOMAIN } = await import("../src/modules/telemetry/vehicle-telemetry.bounds.js");
    for (const border of BORDERS) {
      const domain = VEHICLE_TELEMETRY_COLUMN_DOMAIN[border.column];
      assert.deepEqual([domain.min, domain.max], [border.min, border.max], `${border.column}: a fonte única diz o mesmo`);
      for (const value of [border.min, border.max]) {
        const r = await freshReceipt(h, w);
        const id = await h.rls.withTenantRls(h.role.client as PrismaClient, w.tenantId, (tx) =>
          h.repo.insertSample(tx, {
            tenantId: w.tenantId,
            vehicleId: w.vehicleId,
            bindingId: r.bindingId,
            receiptId: r.receiptId,
            occurredAt: new Date(),
            [border.field]: value,
          }),
        );
        assert.ok(id, `${border.column}=${value}: id devolvido`);
        const back = await h.admin.$queryRawUnsafe<Array<{ v: string }>>(`SELECT ${border.column}::text AS v FROM vehicle_telemetry_events WHERE id = $1::uuid`, id);
        assert.equal(back[0]!.v, String(value), `${border.column}=${value}: releitura exata`);
      }
      for (const value of [border.min - 1, border.column.endsWith("_m") || border.column === "engine_hours_s" ? "9007199254740992" : border.max + 1]) {
        const r = await freshReceipt(h, w);
        try {
          await h.admin.$executeRawUnsafe(
            `INSERT INTO vehicle_telemetry_events (tenant_id, vehicle_id, binding_id, receipt_id, kind, occurred_at, ${border.column})
             VALUES ('${w.tenantId}', '${w.vehicleId}', '${r.bindingId}', '${r.receiptId}', 'sample', now(), ${value})`,
          );
          assert.fail(`${border.column}=${value} deveria ser recusado`);
        } catch (error) {
          if (error instanceof assert.AssertionError) throw error;
          assert.equal(sqlState(error), "23514", `${border.column}=${value}`);
        }
      }
    }
    // power_mv acima de int4: o tipo recusa antes do CHECK.
    const r = await freshReceipt(h, w);
    try {
      await h.admin.$executeRawUnsafe(
        `INSERT INTO vehicle_telemetry_events (tenant_id, vehicle_id, binding_id, receipt_id, kind, occurred_at, power_mv)
         VALUES ('${w.tenantId}', '${w.vehicleId}', '${r.bindingId}', '${r.receiptId}', 'sample', now(), 3000000000)`,
      );
      assert.fail("power_mv > int4 deveria ser recusado");
    } catch (error) {
      if (error instanceof assert.AssertionError) throw error;
      assert.equal(sqlState(error), "22003");
    }
  });

  test("amostra: a borda aceita sobrevive ao caminho INTEIRO (parser → serviço → savepoint), sem descarte", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "f9b");
    const svc = h.makeService();
    const outcome = await svc.ingestion.ingest(
      command(h, w.device, await fixNow(), { odometer: MAX, totalDistance: MAX, power: 1000, batteryLevel: 100, ignition: true, motion: false }),
    );
    assert.deepEqual(outcome, { kind: "stored" });
    const base = command(h, w.device, await fixNow(), { ignition: true });
    const manual = { ...base, telemetry: { engineHoursS: MAX, ignition: true } };
    assert.deepEqual(await svc.ingestion.ingest(manual), { kind: "stored" });
    const rows = await sampleRow(h, w.tenantId);
    assert.equal(rows.length, 2);
    const full = rows.find((row) => row.odometer_m !== null)!;
    assert.deepEqual(
      [full.odometer_m, full.total_distance_m, full.power_mv, full.battery_level_pct, full.ignition, full.motion],
      [String(MAX), String(MAX), 1_000_000, 100, true, false],
    );
    assert.equal(rows.find((row) => row.engine_hours_s !== null)!.engine_hours_s, String(MAX));
    assert.equal(discarded(svc.lines).length, 0);
    assert.equal(failedBeforeCommit(svc.lines).length, 0);
  });

  test("amostra: valor que o banco recusa por DOMÍNIO (powerMv −1 montado à mão) — 204, posição gravada, 0 amostra, sample_discarded 23514", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "f10");
    const svc = h.makeService();
    const base = command(h, w.device, await fixNow(), { ignition: true });
    const outcome = await svc.ingestion.ingest({ ...base, telemetry: { powerMv: -1 } });
    assert.equal(status(h, outcome), 204);
    assert.deepEqual(await tally(h, w.tenantId), [1, 1, 0]);
    const lines = discarded(svc.lines);
    assert.equal(lines.length, 1);
    assert.equal(lines[0]!.fields.code, "23514");
    assert.equal(lines[0]!.level, "warn");
    assert.deepEqual(Object.keys(lines[0]!.fields).sort(), ["code", "outcome"], "sem valor de atributo");
    assert.equal(failedBeforeCommit(svc.lines).length, 0);
  });

  test("amostra: attributes.tenantId = B com dispositivo de A — amostra em A, B 0/0", { timeout: 120_000 }, async () => {
    const h = await harness();
    const a = await world(h, "f11a");
    const b = await world(h, "f11b");
    assert.deepEqual(await h.main.ingestion.ingest(command(h, a.device, await fixNow(), { tenantId: b.tenantId, ignition: true })), { kind: "stored" });
    assert.equal(await samplesOf(h, a.tenantId), 1);
    assert.deepEqual([await receiptsOf(h, b.tenantId), await samplesOf(h, b.tenantId)], [0, 0]);
  });

  test("amostra: recusa por integridade/isolamento ou erro sem SQLSTATE falha FECHADO — 503, nada gravado, nenhum descarte", { timeout: 120_000 }, async () => {
    const h = await harness();
    const canary = await world(h, "f12-canary");
    // (a) erro de programação na hora da amostra.
    const a = await world(h, "f12a");
    const throwing = h.makeService({
      hooks: {
        beforeSampleInsert: () => {
          throw new Error("injected");
        },
      },
    });
    assert.equal(status(h, await throwing.ingestion.ingest(command(h, a.device, await fixNow(), { ignition: true }))), 503);
    assert.deepEqual(await tally(h, a.tenantId), [0, 0, 0]);
    assert.deepEqual(failedBeforeCommit(throwing.lines).map((line) => line.fields.code), ["Error"]);
    assert.equal(discarded(throwing.lines).length, 0);
    // (b) a amostra aponta o vínculo de OUTRA viatura da mesma organização → a FK de 4 colunas recusa (23503).
    const b = await world(h, "f12b");
    const otherVehicle = await newVehicle(h, b.tenantId);
    await bind(h, b.tenantId, otherVehicle, `smp${randomUUID().slice(0, 8)}`);
    const otherBinding = (await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id::text FROM vehicle_tracking_bindings WHERE tenant_id = $1::uuid AND vehicle_id = $2::uuid`,
      b.tenantId,
      otherVehicle,
    ))[0]!.id;
    const crossing = h.makeService({ hooks: { beforeSampleInsert: (sample: Record<string, unknown>) => ({ ...sample, bindingId: otherBinding }) } });
    assert.equal(status(h, await crossing.ingestion.ingest(command(h, b.device, await fixNow(), { ignition: true }))), 503);
    assert.deepEqual(await tally(h, b.tenantId), [0, 0, 0]);
    assert.deepEqual(failedBeforeCommit(crossing.lines).map((line) => line.fields.code), ["23503"]);
    assert.equal(discarded(crossing.lines).length, 0);
    assert.deepEqual(await tally(h, canary.tenantId), [0, 0, 0]);
  });
}
