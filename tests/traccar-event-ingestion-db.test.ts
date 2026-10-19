import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import type { PrismaClient } from "@prisma/client";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";

// -----------------------------------------------------------------------------------------------
// B-TRC-02 · suíte E — a ingestão de EVENTO inteira contra o PostgreSQL real, sob o papel efêmero NOSUPERUSER NOBYPASSRLS
// (plano v2 §5.3, §5.4, §6.4, §9.2; C-09..C-12). Semeadura e limpeza pela conexão administrativa, escopadas pelas
// organizações e pela chave de instância DESTA rodada; `vehicle_telemetry_events` sai PRIMEIRO (FK RESTRICT).
// O comando nasce da fixture REAL `event-ignition-on.json` pelo parser e pelo adaptador, como na vida real.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
type Body = Record<string, unknown> & {
  event: Record<string, unknown>;
  device: Record<string, unknown>;
  position?: Record<string, unknown>;
};
const FIXTURE = JSON.parse(
  readFileSync(path.join(ROOT, "infra", "traccar", "fixtures", "6.16.0", "event-ignition-on.json"), "utf8"),
) as Body;

if (!connectionString) {
  test("B-TRC-02 traccar-event-ingestion-db exige DATABASE_URL e um banco migrado", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suíte.",
  });
} else {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "prisma";

  const INSTANCE = `trc-evt-${randomUUID().slice(0, 8)}`;
  const SECRET = `event-ingestion-db-secret-${randomUUID()}`;
  const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const STEP_MS = 60;
  const RELAXED_BUDGETS = { phaseTwo: { maxWait: 5_000, timeout: 10_000 }, discovery: { maxWait: 5_000, timeout: 10_000 } };

  type Harness = Awaited<ReturnType<typeof bootstrap>>;
  let harnessPromise: Promise<Harness> | undefined;
  const harness = (): Promise<Harness> => (harnessPromise ??= bootstrap());

  async function bootstrap() {
    const [{ PrismaPg }, { PrismaClient }, rls, service, schema, adapter, app, auth, limit, telemetry] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
      import("../src/database/rls.js"),
      import("../src/integrations/traccar/traccar-ingestion.service.js"),
      import("../src/integrations/traccar/traccar-event.schema.js"),
      import("../src/integrations/traccar/traccar-event.adapter.js"),
      import("../src/integrations/traccar/traccar-ingest.app.js"),
      import("../src/integrations/traccar/traccar-forward-auth.js"),
      import("../src/integrations/traccar/traccar-rate-limit.js"),
      import("../src/modules/telemetry/vehicle-telemetry-prisma.repository.js"),
    ]);
    const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });
    const role: EphemeralRole = await createEphemeralRole(admin, connectionString!);
    const errorCodes: string[] = [];
    const makeService = (options: { hooks?: Record<string, unknown>; maxTenants?: number } = {}) =>
      service.createTraccarIngestionService({
        client: role.client as PrismaClient,
        timeoutMs: 3_000,
        resolver: { maxTenants: options.maxTenants ?? 500, hintTtlMs: 600_000, negativeTtlMs: 60_000, cacheMax: 10_000 },
        budgets: RELAXED_BUDGETS,
        hooks: (options.hooks ?? {}) as never,
        logger: { info: () => undefined, warn: () => undefined, error: (fields) => errorCodes.push(String(fields.code)) },
        publish: (async () => {
          throw new Error("o evento veicular não publica nada");
        }) as never,
      });
    return {
      admin,
      role,
      rls,
      schema,
      adapter,
      app,
      auth,
      limit,
      repo: new telemetry.PrismaVehicleTelemetryRepository(),
      makeService,
      ingestion: makeService(),
      errorCodes,
      tenants: [] as string[],
    };
  }

  after(async () => {
    if (!harnessPromise) return;
    const h = await harnessPromise;
    if (h.errorCodes.length > 0) console.log(`[traccar-event-ingestion-db] códigos de falha: ${h.errorCodes.join(", ")}`);
    try {
      const ids = [...h.tenants];
      if (ids.length > 0) {
        for (const table of ["vehicle_telemetry_events", "traccar_ingress_receipts", "vehicle_tracking_bindings", "vehicles"]) {
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

  // ---------------------------------------------------------------- semeadura
  async function newTenant(h: Harness, tag: string): Promise<string> {
    const slug = `trc-evt-${tag}-${randomUUID().slice(0, 8)}`;
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
      `EVT${id.slice(0, 5).toUpperCase()}`,
    );
    return id;
  }
  async function bind(h: Harness, tenantId: string, vehicleId: string, device: string): Promise<void> {
    await h.rls.withTenantRls(h.role.client as PrismaClient, tenantId, (tx) =>
      tx.$executeRaw`INSERT INTO vehicle_tracking_bindings (tenant_id, vehicle_id, instance_key, external_device_key)
        VALUES (${tenantId}::uuid, ${vehicleId}::uuid, ${INSTANCE}, ${device})`,
    );
    await pause(STEP_MS);
  }
  /** Organização com viatura vinculada e SEM despacho (o evento é dado da viatura). */
  async function world(h: Harness, tag: string) {
    const tenantId = await newTenant(h, tag);
    const vehicleId = await newVehicle(h, tenantId);
    const device = `evt${randomUUID().slice(0, 8)}`;
    await bind(h, tenantId, vehicleId, device);
    return { tenantId, vehicleId, device };
  }
  async function fixNow(): Promise<Date> {
    await pause(STEP_MS);
    const at = new Date();
    await pause(STEP_MS);
    return at;
  }
  function body(device: string, type: string, at: Date, options: { position?: boolean; alarm?: string; lat?: number; deviceId?: number } = {}): Body {
    const value = structuredClone(FIXTURE);
    value.device.uniqueId = device;
    value.event.type = type;
    value.event.eventTime = at.toISOString();
    value.event.attributes = type === "alarm" ? { alarm: options.alarm ?? "sos" } : {};
    if (options.deviceId !== undefined) {
      value.device.id = options.deviceId;
      value.event.deviceId = options.deviceId;
    }
    if (options.position === false) {
      delete value.position;
      value.event.positionId = 0;
    } else {
      value.position!.fixTime = at.toISOString();
      value.position!.deviceTime = at.toISOString();
      if (options.lat !== undefined) value.position!.latitude = options.lat;
    }
    return value;
  }
  function command(h: Harness, value: Body, source: "forward" | "reconciliation" = "forward") {
    const built = h.adapter.buildTraccarEventCommand(h.schema.parseTraccarEventEnvelope(value), {
      instanceKey: INSTANCE,
      receivedAt: new Date(),
      source,
    });
    assert.equal(built.kind, "command");
    return (built as Extract<typeof built, { kind: "command" }>).command;
  }
  async function count(h: Harness, sql: string, ...values: unknown[]): Promise<number> {
    const rows = await h.admin.$queryRawUnsafe<Array<{ n: bigint }>>(sql, ...values);
    return Number(rows[0]!.n);
  }
  const rowsOf = (h: Harness, tenantId: string) => count(h, `SELECT count(*)::bigint AS n FROM vehicle_telemetry_events WHERE tenant_id = $1::uuid`, tenantId);
  const receiptsOf = (h: Harness, tenantId: string, kind = "event") =>
    count(h, `SELECT count(*)::bigint AS n FROM traccar_ingress_receipts WHERE tenant_id = $1::uuid AND message_kind = $2`, tenantId, kind);
  const allReceiptsOf = (h: Harness, tenantId: string) => count(h, `SELECT count(*)::bigint AS n FROM traccar_ingress_receipts WHERE tenant_id = $1::uuid`, tenantId);
  const locationsOf = (h: Harness, tenantId: string) => count(h, `SELECT count(*)::bigint AS n FROM field_operator_locations WHERE tenant_id = $1::uuid`, tenantId);
  async function quarantine(h: Harness, device: string, reason: string) {
    return h.admin.$queryRawUnsafe<Array<{ delivery_count: number; first_fix_at: Date; resolved_at: Date | null }>>(
      `SELECT delivery_count, first_fix_at, resolved_at FROM traccar_quarantine_items WHERE instance_key = $1 AND external_device_key = $2 AND reason = $3`,
      INSTANCE,
      device,
      reason,
    );
  }
  const asTenant = <T,>(h: Harness, tenantId: string, work: (tx: never) => Promise<T>) =>
    h.rls.withTenantRls(h.role.client as PrismaClient, tenantId, work as never) as Promise<T>;
  const status = (h: Harness, outcome: Parameters<Harness["app"]["traccarIngestResponse"]>[0]) => h.app.traccarIngestResponse(outcome).status;
  function twoPartyBarrier() {
    let arrived = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    return {
      afterBindingLocked: async () => {
        arrived += 1;
        if (arrived >= 2) release();
        await Promise.race([gate, pause(5_000)]);
      },
    };
  }

  // ------------------------------------------------------------------------------------------------------- casos
  test("evento: 1ª entrega — 204, 1 recibo 'event' (sem localização, fix_time = eventTime) e 1 linha da viatura", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "first");
    const at = await fixNow();
    assert.equal(status(h, await h.ingestion.ingestEvent(command(h, body(w.device, "ignitionOn", at)))), 204);
    const receipts = await h.admin.$queryRawUnsafe<Array<{ location_id: string | null; fix_time: Date; vehicle_id: string; binding_id: string }>>(
      `SELECT location_id::text, fix_time, vehicle_id::text, binding_id::text FROM traccar_ingress_receipts WHERE tenant_id = $1::uuid AND message_kind = 'event'`,
      w.tenantId,
    );
    assert.equal(receipts.length, 1);
    assert.equal(receipts[0]!.location_id, null);
    assert.equal(receipts[0]!.fix_time.toISOString(), at.toISOString());
    assert.equal(receipts[0]!.vehicle_id, w.vehicleId);
    const rows = await h.admin.$queryRawUnsafe<Array<{ kind: string; vehicle_id: string; binding_id: string; source: string; traccar_event_id: bigint }>>(
      `SELECT kind, vehicle_id::text, binding_id::text, source, traccar_event_id FROM vehicle_telemetry_events WHERE tenant_id = $1::uuid`,
      w.tenantId,
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.kind, "ignition_on");
    assert.equal(rows[0]!.vehicle_id, w.vehicleId);
    assert.equal(rows[0]!.binding_id, receipts[0]!.binding_id);
    assert.equal(rows[0]!.source, "forward");
    assert.equal(Number(rows[0]!.traccar_event_id), 2);
    assert.equal(await locationsOf(h, w.tenantId), 0, "evento não vira localização");
  });

  test("evento: reenvio idêntico — 204 (duplicate), nada novo", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "same");
    const at = await fixNow();
    await h.ingestion.ingestEvent(command(h, body(w.device, "ignitionOn", at)));
    const again = await h.ingestion.ingestEvent(command(h, body(w.device, "ignitionOn", at)));
    assert.deepEqual(again, { kind: "duplicate" });
    assert.equal(await receiptsOf(h, w.tenantId), 1);
    assert.equal(await rowsOf(h, w.tenantId), 1);
  });

  test("evento: mesma chave com digest diferente — 409, conflict_count = 1, nenhuma linha nova", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "diff");
    const at = await fixNow();
    await h.ingestion.ingestEvent(command(h, body(w.device, "ignitionOn", at)));
    const divergent = await h.ingestion.ingestEvent(command(h, body(w.device, "ignitionOn", at, { deviceId: 9 })));
    assert.equal(status(h, divergent), 409);
    const conflicts = await count(h, `SELECT coalesce(sum(conflict_count), 0)::bigint AS n FROM traccar_ingress_receipts WHERE tenant_id = $1::uuid`, w.tenantId);
    assert.equal(conflicts, 1);
    assert.equal(await rowsOf(h, w.tenantId), 1);
  });

  test("evento: duas entregas idênticas concorrentes com barreira no FOR SHARE — 1 recibo, 1 linha, ambas 204", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "twin");
    const racing = h.makeService({ hooks: twoPartyBarrier() });
    const at = await fixNow();
    const outcomes = await Promise.all([
      racing.ingestEvent(command(h, body(w.device, "ignitionOn", at))),
      racing.ingestEvent(command(h, body(w.device, "ignitionOn", at))),
    ]);
    assert.deepEqual(outcomes.map((outcome) => status(h, outcome)).sort(), [204, 204]);
    assert.deepEqual(outcomes.map((outcome) => outcome.kind).sort(), ["duplicate", "stored"]);
    const ignition = await count(h, `SELECT count(*)::bigint AS n FROM vehicle_telemetry_events WHERE tenant_id = $1::uuid AND kind = 'ignition_on'`, w.tenantId);
    assert.equal(ignition, 1);
  });

  test("evento: dispositivo sem vínculo — 202, 0 recibo, 0 linha e 1 episódio unmapped_device na quarentena", { timeout: 120_000 }, async () => {
    const h = await harness();
    const device = `evtnone${randomUUID().slice(0, 6)}`;
    const at = await fixNow();
    const outcome = await h.ingestion.ingestEvent(command(h, body(device, "ignitionOn", at)));
    assert.deepEqual(outcome, { kind: "quarantined", reason: "unmapped_device" });
    const rows = await quarantine(h, device, "unmapped_device");
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.delivery_count, 1);
    assert.equal(rows[0]!.first_fix_at.toISOString(), at.toISOString(), "first_fix_at = instante do evento");
    assert.equal(rows[0]!.resolved_at, null);
  });

  test("evento: 2ª entrega do mesmo dispositivo sem vínculo — o mesmo episódio, delivery_count = 2", { timeout: 120_000 }, async () => {
    const h = await harness();
    const device = `evtnone${randomUUID().slice(0, 6)}`;
    await h.ingestion.ingestEvent(command(h, body(device, "ignitionOn", await fixNow())));
    await h.ingestion.ingestEvent(command(h, body(device, "ignitionOff", await fixNow())));
    const rows = await quarantine(h, device, "unmapped_device");
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.delivery_count, 2);
  });

  test("evento: antes do vínculo → fix_before_active_binding; no futuro → fix_in_future; nada gravado", { timeout: 120_000 }, async () => {
    const h = await harness();
    const before = new Date(Date.now() - 60 * 60_000);
    const w = await world(h, "window");
    assert.deepEqual(await h.ingestion.ingestEvent(command(h, body(w.device, "ignitionOn", before))), {
      kind: "quarantined",
      reason: "fix_before_active_binding",
    });
    assert.deepEqual(await h.ingestion.ingestEvent(command(h, body(w.device, "ignitionOn", new Date(Date.now() + 6 * 60_000)))), {
      kind: "quarantined",
      reason: "fix_in_future",
    });
    assert.equal(await allReceiptsOf(h, w.tenantId), 0);
    assert.equal(await rowsOf(h, w.tenantId), 0);
  });

  test("evento: organização suspensa com dica válida — tenant_inactive, nada gravado", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "inactive");
    await h.ingestion.ingestEvent(command(h, body(w.device, "deviceOnline", await fixNow(), { position: false })));
    await h.admin.$executeRawUnsafe(`UPDATE tenants SET status = 'suspended' WHERE id = $1::uuid`, w.tenantId);
    try {
      assert.deepEqual(await h.ingestion.ingestEvent(command(h, body(w.device, "ignitionOn", await fixNow()))), {
        kind: "quarantined",
        reason: "tenant_inactive",
      });
      assert.equal(await rowsOf(h, w.tenantId), 1, "só o deviceOnline de antes");
    } finally {
      await h.admin.$executeRawUnsafe(`UPDATE tenants SET status = 'active' WHERE id = $1::uuid`, w.tenantId);
    }
  });

  test("evento: viatura vinculada SEM despacho — 204 e a linha (o evento é dado da viatura, C-10)", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "nodispatch");
    const dispatches = await count(h, `SELECT count(*)::bigint AS n FROM field_dispatches WHERE tenant_id = $1::uuid`, w.tenantId);
    assert.equal(dispatches, 0);
    assert.deepEqual(await h.ingestion.ingestEvent(command(h, body(w.device, "alarm", await fixNow(), { alarm: "powerCut" }))), { kind: "stored" });
    const rows = await h.admin.$queryRawUnsafe<Array<{ kind: string; alarm_code: string }>>(
      `SELECT kind, alarm_code FROM vehicle_telemetry_events WHERE tenant_id = $1::uuid`,
      w.tenantId,
    );
    assert.deepEqual(rows, [{ kind: "alarm", alarm_code: "powerCut" }]);
  });

  test("evento: chave de OUTRA organização — 409 e quarentena idempotency_key_owned_elsewhere; A sem linha", { timeout: 120_000 }, async () => {
    const h = await harness();
    const a = await world(h, "own-a");
    const b = await world(h, "own-b");
    const at = await fixNow();
    const cmd = command(h, body(a.device, "ignitionOn", at));
    const bindingB = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id::text FROM vehicle_tracking_bindings WHERE tenant_id = $1::uuid AND valid_to IS NULL`,
      b.tenantId,
    );
    await h.admin.$executeRawUnsafe(
      `INSERT INTO traccar_ingress_receipts (tenant_id, instance_key, message_kind, external_event_key, payload_digest, binding_id, vehicle_id, traccar_device_id, fix_time)
       VALUES ($1::uuid, $2, 'event', $3, $4, $5::uuid, $6::uuid, '1', now())`,
      b.tenantId,
      INSTANCE,
      cmd.externalEventKey,
      cmd.payloadDigest,
      bindingB[0]!.id,
      b.vehicleId,
    );
    const outcome = await h.ingestion.ingestEvent(cmd);
    assert.deepEqual(outcome, { kind: "conflict", reason: "owned_elsewhere" });
    assert.equal(status(h, outcome), 409);
    assert.equal((await quarantine(h, a.device, "idempotency_key_owned_elsewhere")).length, 1);
    assert.equal(await rowsOf(h, a.tenantId), 0);
    assert.equal(await allReceiptsOf(h, a.tenantId), 0);
  });

  const latestStatus = (h: Harness, tenantId: string, vehicleId: string) =>
    asTenant(h, tenantId, (tx) => h.repo.latestDeviceStatus(tx, tenantId, vehicleId));
  const latestIgnition = (h: Harness, tenantId: string, vehicleId: string) =>
    asTenant(h, tenantId, (tx) => h.repo.latestIgnition(tx, tenantId, vehicleId));

  test("evento: ordem atrasada — online(t2) e depois unknown(t1 < t2) → o status continua online", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "late");
    const t1 = await fixNow();
    const t2 = await fixNow();
    await h.ingestion.ingestEvent(command(h, body(w.device, "deviceOnline", t2, { position: false })));
    await h.ingestion.ingestEvent(command(h, body(w.device, "deviceUnknown", t1, { position: false })));
    assert.equal(await rowsOf(h, w.tenantId), 2, "a linha atrasada é gravada");
    assert.equal(await latestStatus(h, w.tenantId, w.vehicleId), "device_online");
  });

  test("evento: deviceOffline (fixture sintética) é aceito e vira o status derivado", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "offline");
    const offline = JSON.parse(readFileSync(path.join(ROOT, "infra", "traccar", "fixtures", "6.16.0", "event-device-offline.json"), "utf8")) as Body;
    offline.device.uniqueId = w.device;
    offline.event.eventTime = (await fixNow()).toISOString();
    assert.deepEqual(await h.ingestion.ingestEvent(command(h, offline)), { kind: "stored" });
    assert.equal(await latestStatus(h, w.tenantId, w.vehicleId), "device_offline");
  });

  test("evento: comando de reconciliação pela função pura grava; o forward do mesmo evento depois é duplicate (determinismo)", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "recon");
    const at = await fixNow();
    const reconciliation = command(h, body(w.device, "ignitionOn", at), "reconciliation");
    const forward = command(h, body(w.device, "ignitionOn", at));
    assert.equal(reconciliation.externalEventKey, forward.externalEventKey, "mesmas entradas → mesma chave");
    assert.deepEqual(await h.ingestion.ingestEvent(reconciliation), { kind: "stored" });
    assert.deepEqual(await h.ingestion.ingestEvent(forward), { kind: "duplicate" });
    const rows = await h.admin.$queryRawUnsafe<Array<{ source: string }>>(`SELECT source FROM vehicle_telemetry_events WHERE tenant_id = $1::uuid`, w.tenantId);
    assert.deepEqual(rows, [{ source: "reconciliation" }]);
  });

  test("evento: canário — B semeada e nunca ingerida fica 0/0/0; nenhuma linha guarda coordenada ou JSON", { timeout: 120_000 }, async () => {
    const h = await harness();
    const a = await world(h, "can-a");
    const b = await world(h, "can-b");
    await h.ingestion.ingestEvent(command(h, body(a.device, "ignitionOn", await fixNow())));
    await h.ingestion.ingestEvent(command(h, body(a.device, "alarm", await fixNow())));
    assert.equal(await rowsOf(h, a.tenantId), 2);
    assert.deepEqual([await allReceiptsOf(h, b.tenantId), await rowsOf(h, b.tenantId), await locationsOf(h, b.tenantId)], [0, 0, 0]);
    const leaked = await h.admin.$queryRawUnsafe<Array<{ row: string }>>(
      `SELECT row_to_json(v)::text AS row FROM vehicle_telemetry_events v WHERE tenant_id = $1::uuid`,
      a.tenantId,
    );
    for (const { row } of leaked) {
      assert.doesNotMatch(row, /-23\.55|-46\.63|latitude|longitude|Sintetic/);
    }
  });

  test("evento: tenantId no event → 422 sem escrita; tipo forjado → 204 sem escrita (pela rota do listener)", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "forge");
    const app = h.app.createTraccarIngestApp({
      authenticator: h.auth.createTraccarForwardAuthenticator({ current: SECRET }),
      limiter: h.limit.createTraccarIngestLimiter({ ratePerSecond: 20, burst: 100, maxConcurrency: 10 }),
      eventLimiter: h.limit.createTraccarIngestLimiter({ ratePerSecond: 20, burst: 100, maxConcurrency: 10 }),
      ingest: () => Promise.reject(new Error("posição não é deste caso")),
      ingestEvent: (cmd, deadline) => h.ingestion.ingestEvent(cmd, deadline),
      instanceKey: INSTANCE,
      timeoutMs: 3_000,
      logger: (await import("pino")).default({ level: "silent" }),
    });
    const server: Server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    try {
      const { port } = server.address() as AddressInfo;
      const post = async (payload: unknown) => {
        const response = await fetch(`http://127.0.0.1:${port}/ingest/traccar/v1/events`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-traccar-forward-token": SECRET },
          body: JSON.stringify(payload),
        });
        await response.arrayBuffer();
        return response.status;
      };
      const reserved = body(w.device, "ignitionOn", await fixNow());
      reserved.event.tenantId = w.tenantId;
      assert.equal(await post(reserved), 422);
      assert.equal(await post(body(w.device, "geofenceEnter", await fixNow())), 204);
      assert.equal(await post(body(w.device, "tipoForjado", await fixNow())), 204);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    assert.equal(await allReceiptsOf(h, w.tenantId), 0);
    assert.equal(await rowsOf(h, w.tenantId), 0);
  });

  test("evento: falha injetada antes do commit — 503 e nada gravado", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "fail");
    const failing = h.makeService({
      hooks: {
        beforeCommit: () => {
          throw new Error("falha injetada antes do commit");
        },
      },
    });
    const outcome = await failing.ingestEvent(command(h, body(w.device, "ignitionOn", await fixNow())));
    assert.equal(status(h, outcome), 503);
    assert.equal(await allReceiptsOf(h, w.tenantId), 0);
    assert.equal(await rowsOf(h, w.tenantId), 0);
  });

  test("evento: online e unknown no MESMO ms → status unknown, em qualquer ordem de chegada (precedência fechada)", { timeout: 120_000 }, async () => {
    const h = await harness();
    for (const order of [["deviceOnline", "deviceUnknown"], ["deviceUnknown", "deviceOnline"]] as const) {
      const w = await world(h, `tie-${order[0]}`);
      const at = await fixNow();
      for (const type of order) await h.ingestion.ingestEvent(command(h, body(w.device, type, at, { position: false })));
      assert.equal(await rowsOf(h, w.tenantId), 2);
      assert.equal(await latestStatus(h, w.tenantId, w.vehicleId), "device_unknown", `ordem ${order.join("→")}`);
    }
  });

  test("evento: ignition_on(t2) e depois ignition_off(t1 < t2) → última ignição on; empate no ms → off", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "ign");
    const t1 = await fixNow();
    const t2 = await fixNow();
    await h.ingestion.ingestEvent(command(h, body(w.device, "ignitionOn", t2)));
    await h.ingestion.ingestEvent(command(h, body(w.device, "ignitionOff", t1)));
    assert.equal(await latestIgnition(h, w.tenantId, w.vehicleId), "ignition_on");
    const tie = await world(h, "ign-tie");
    const at = await fixNow();
    await h.ingestion.ingestEvent(command(h, body(tie.device, "ignitionOff", at)));
    await h.ingestion.ingestEvent(command(h, body(tie.device, "ignitionOn", at)));
    assert.equal(await latestIgnition(h, tie.tenantId, tie.vehicleId), "ignition_off");
  });

  test("evento: teto de organizações (maxTenants 1, várias ativas) — 202 resolution_budget_exceeded, nada gravado", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "budget");
    await newTenant(h, "budget-other");
    const capped = h.makeService({ maxTenants: 1 });
    const outcome = await capped.ingestEvent(command(h, body(w.device, "ignitionOn", await fixNow())));
    assert.deepEqual(outcome, { kind: "quarantined", reason: "resolution_budget_exceeded" });
    assert.equal(status(h, outcome), 202);
    assert.equal((await quarantine(h, w.device, "resolution_budget_exceeded")).length, 1);
    assert.equal(await allReceiptsOf(h, w.tenantId), 0);
    assert.equal(await rowsOf(h, w.tenantId), 0);
  });

  test("evento: attributes.tenantId = B no event e na position, dispositivo de A → linha em A, B 0/0/0", { timeout: 120_000 }, async () => {
    const h = await harness();
    const a = await world(h, "hint-a");
    const b = await world(h, "hint-b");
    const forged = body(a.device, "ignitionOn", await fixNow());
    forged.event.attributes = { tenantId: b.tenantId };
    (forged.position!.attributes as Record<string, unknown>).tenantId = b.tenantId;
    assert.deepEqual(await h.ingestion.ingestEvent(command(h, forged)), { kind: "stored" });
    assert.equal(await rowsOf(h, a.tenantId), 1);
    assert.deepEqual([await allReceiptsOf(h, b.tenantId), await rowsOf(h, b.tenantId), await locationsOf(h, b.tenantId)], [0, 0, 0]);
  });
}
