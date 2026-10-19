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
// B-TRC-02 · suíte I [Q1=SIM] — a amostra veicular SEM operador (D-TRC02-RESPOSTAS; plano v2 §Q1; emenda v2.1 §1, §2, §4).
// A posição vai à quarentena por falta/ambiguidade de operador e o ERP conserva os atributos veiculares para a VIATURA
// (recibo `position_sample` + amostra, num savepoint). Um fix → uma amostra por ORGANIZAÇÃO (índice parcial (tenant_id,
// fix_key)); só os 3 motivos de operador guardam; o gate único é a closure `quarantined(reason)`; a reversão da Q1 é uma
// constante. Sob o papel efêmero; semeadura e limpeza pela conexão administrativa, escopadas por organização e instância.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = JSON.parse(
  readFileSync(path.join(ROOT, "infra", "traccar", "fixtures", "6.16.0", "position-osmand.json"), "utf8"),
) as { position: Record<string, unknown>; device: Record<string, unknown> };
const ATTRIBUTES = { ignition: true, odometer: 12345, motion: false, power: 13.1, batteryLevel: 80 };

if (!connectionString) {
  test("B-TRC-02 traccar-event-sample-quarantine-db exige DATABASE_URL e um banco migrado", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suíte.",
  });
} else {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "prisma";

  const INSTANCE = `trc-sq-${randomUUID().slice(0, 8)}`;
  const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const STEP_MS = 60;
  const RELAXED_BUDGETS = { phaseTwo: { maxWait: 5_000, timeout: 10_000 }, discovery: { maxWait: 5_000, timeout: 10_000 } };

  type LogLine = { level: string; fields: Record<string, unknown>; message: string };
  type Harness = Awaited<ReturnType<typeof bootstrap>>;
  let harnessPromise: Promise<Harness> | undefined;
  const harness = (): Promise<Harness> => (harnessPromise ??= bootstrap());

  async function bootstrap() {
    const [{ PrismaPg }, { PrismaClient }, rls, dispatch, workOrders, service, schema, adapter, app, telemetry] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
      import("../src/database/rls.js"),
      import("../src/modules/field-dispatch/field-dispatch-prisma.repository.js"),
      import("../src/modules/work-orders/work-order-prisma.repository.js"),
      import("../src/integrations/traccar/traccar-ingestion.service.js"),
      import("../src/integrations/traccar/traccar-position.schema.js"),
      import("../src/integrations/traccar/traccar-position.adapter.js"),
      import("../src/integrations/traccar/traccar-ingest.app.js"),
      import("../src/modules/telemetry/vehicle-telemetry-prisma.repository.js"),
    ]);
    const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });
    const role: EphemeralRole = await createEphemeralRole(admin, connectionString!);
    const makeService = (options: { hooks?: Record<string, unknown>; maxTenants?: number; reasons?: ReadonlySet<string> } = {}) => {
      const lines: LogLine[] = [];
      const ingestion = service.createTraccarIngestionService({
        client: role.client as PrismaClient,
        timeoutMs: 3_000,
        resolver: { maxTenants: options.maxTenants ?? 500, hintTtlMs: 600_000, negativeTtlMs: 60_000, cacheMax: 10_000 },
        budgets: RELAXED_BUDGETS,
        hooks: (options.hooks ?? {}) as never,
        sampleOnQuarantineReasons: options.reasons as never,
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
      workOrders,
      schema,
      adapter,
      app,
      service,
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
    const slug = `trc-sq-${tag}-${randomUUID().slice(0, 8)}`;
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, slug);
    h.tenants.push(rows[0]!.id);
    return rows[0]!.id;
  }
  async function newUser(h: Harness, tenantId: string, label: string): Promise<string> {
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO users (tenant_id, name, email) VALUES ($1::uuid, $2, $3) RETURNING id`,
      tenantId,
      `Técnico ${label}`,
      `sq-${label}-${randomUUID().slice(0, 8)}@example.com`,
    );
    return rows[0]!.id;
  }
  async function newVehicle(h: Harness, tenantId: string): Promise<string> {
    const id = randomUUID();
    await h.admin.$executeRawUnsafe(
      `INSERT INTO vehicles (id, tenant_id, plate, model) VALUES ($1::uuid, $2::uuid, $3, 'Viatura sintética')`,
      id,
      tenantId,
      `SQ${id.slice(0, 6).toUpperCase()}`,
    );
    return id;
  }
  async function newWorkOrder(h: Harness, tenantId: string, vehicleId: string): Promise<string> {
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO work_orders (tenant_id, code, title, vehicle_id) VALUES ($1::uuid, $2, 'OS sintética', $3::uuid) RETURNING id`,
      tenantId,
      `SQ-${randomUUID().slice(0, 8)}`,
      vehicleId,
    );
    return rows[0]!.id;
  }
  function dispatchRepo<T>(h: Harness, tenantId: string, work: (repo: InstanceType<Harness["dispatch"]["PrismaFieldDispatchRepository"]>) => Promise<T>) {
    return h.rls.withTenantRls(h.role.client as PrismaClient, tenantId, (tx) => work(new h.dispatch.PrismaFieldDispatchRepository(tx)));
  }
  async function acceptedDispatch(h: Harness, tenantId: string, workOrderId: string, operatorUserId: string): Promise<string> {
    const created = await dispatchRepo(h, tenantId, (repo) => repo.create({ tenantId, workOrderId, operatorUserId, status: "assigned" }));
    await pause(STEP_MS);
    await dispatchRepo(h, tenantId, (repo) => repo.changeStatus({ tenantId, dispatchId: created.id, status: "accepted" as never }));
    await pause(STEP_MS);
    return created.id;
  }
  async function assignVehicle(h: Harness, tenantId: string, workOrderId: string, operatorId: string, vehicleId: string): Promise<void> {
    const repo = new h.workOrders.RlsPrismaWorkOrderRepository(h.role.client as PrismaClient);
    const current = await repo.findById(tenantId, workOrderId);
    if (!current) throw new Error("OS não encontrada sob o RLS da organização");
    const message = "B-TRC-02 — troca sintética da viatura";
    await repo.assign({
      tenantId,
      workOrderId,
      operatorId,
      vehicleId,
      message,
      assignedBy: operatorId,
      event: { fromStatus: current.status, actorUserId: operatorId, message, metadata: {} },
    });
    await pause(STEP_MS);
  }
  async function bind(h: Harness, tenantId: string, vehicleId: string, device: string): Promise<void> {
    await h.rls.withTenantRls(h.role.client as PrismaClient, tenantId, (tx) =>
      tx.$executeRaw`INSERT INTO vehicle_tracking_bindings (tenant_id, vehicle_id, instance_key, external_device_key)
        VALUES (${tenantId}::uuid, ${vehicleId}::uuid, ${INSTANCE}, ${device})`,
    );
    await pause(STEP_MS);
  }
  async function world(h: Harness, tag: string, options: { dispatch?: boolean; device?: string } = {}) {
    const tenantId = await newTenant(h, tag);
    const vehicleId = await newVehicle(h, tenantId);
    const tech = await newUser(h, tenantId, tag);
    const workOrderId = await newWorkOrder(h, tenantId, vehicleId);
    const device = options.device ?? `sq${randomUUID().slice(0, 8)}`;
    await bind(h, tenantId, vehicleId, device);
    const dispatchId = options.dispatch ? await acceptedDispatch(h, tenantId, workOrderId, tech) : undefined;
    return { tenantId, vehicleId, tech, workOrderId, device, dispatchId };
  }
  async function fixNow(): Promise<Date> {
    await pause(STEP_MS);
    const at = new Date();
    await pause(STEP_MS);
    return at;
  }
  function command(h: Harness, device: string, fixAt: Date, extra: Record<string, unknown> = {}, attributes: Record<string, unknown> | null = ATTRIBUTES) {
    const body = structuredClone(FIXTURE);
    body.device.uniqueId = device;
    body.position.fixTime = fixAt.toISOString();
    body.position.deviceTime = fixAt.toISOString();
    if (attributes === null) delete body.position.attributes;
    else body.position.attributes = { ...attributes };
    Object.assign(body.position, extra);
    return h.adapter.buildTraccarPositionCommand(h.schema.parseTraccarPositionEnvelope(body), { instanceKey: INSTANCE, receivedAt: new Date() });
  }
  async function count(h: Harness, sql: string, ...values: unknown[]): Promise<number> {
    return Number((await h.admin.$queryRawUnsafe<Array<{ n: bigint }>>(sql, ...values))[0]!.n);
  }
  const receipts = (h: Harness, tenantId: string, kind: string) =>
    count(h, `SELECT count(*)::bigint AS n FROM traccar_ingress_receipts WHERE tenant_id = $1::uuid AND message_kind = $2`, tenantId, kind);
  const samples = (h: Harness, tenantId: string) =>
    count(h, `SELECT count(*)::bigint AS n FROM vehicle_telemetry_events WHERE tenant_id = $1::uuid AND kind = 'sample'`, tenantId);
  const locations = (h: Harness, tenantId: string) =>
    count(h, `SELECT count(*)::bigint AS n FROM field_operator_locations WHERE tenant_id = $1::uuid`, tenantId);
  /** [recibos position, recibos position_sample, localizações, amostras] */
  const state = async (h: Harness, tenantId: string) =>
    [await receipts(h, tenantId, "position"), await receipts(h, tenantId, "position_sample"), await locations(h, tenantId), await samples(h, tenantId)];
  async function quarantine(h: Harness, device: string, reason: string) {
    return h.admin.$queryRawUnsafe<Array<{ delivery_count: number }>>(
      `SELECT delivery_count FROM traccar_quarantine_items WHERE instance_key = $1 AND external_device_key = $2 AND reason = $3`,
      INSTANCE,
      device,
      reason,
    );
  }
  const quarantineRowsOf = (h: Harness, device: string) =>
    count(h, `SELECT count(*)::bigint AS n FROM traccar_quarantine_items WHERE instance_key = $1 AND external_device_key = $2`, INSTANCE, device);
  const allSamplesWithKey = (h: Harness, fixKey: string) =>
    count(h, `SELECT count(*)::bigint AS n FROM vehicle_telemetry_events WHERE fix_key = $1`, fixKey);
  const status = (h: Harness, outcome: Parameters<Harness["app"]["traccarIngestResponse"]>[0]) => h.app.traccarIngestResponse(outcome).status;
  const linesOf = (lines: LogLine[], outcome: string) => lines.filter((line) => line.fields.outcome === outcome);
  const failed = (lines: LogLine[]) => lines.filter((line) => line.message === "Traccar ingestion failed before commit");
  async function seedReceipt(h: Harness, w: { tenantId: string; vehicleId: string }, kind: string, key: string, digest = key) {
    const binding = (await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id::text FROM vehicle_tracking_bindings WHERE tenant_id = $1::uuid ORDER BY created_at DESC LIMIT 1`,
      w.tenantId,
    ))[0]!.id;
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO traccar_ingress_receipts (tenant_id, instance_key, message_kind, external_event_key, payload_digest, binding_id, vehicle_id, traccar_device_id, fix_time)
       VALUES ($1::uuid, $2, $3, $4, $5, $6::uuid, $7::uuid, '1', now()) RETURNING id::text AS id`,
      w.tenantId,
      INSTANCE,
      kind,
      key,
      digest,
      binding,
      w.vehicleId,
    );
    return { receiptId: rows[0]!.id, bindingId: binding };
  }
  async function seedSample(h: Harness, w: { tenantId: string; vehicleId: string }, receipt: { receiptId: string; bindingId: string }, fixKey: string) {
    return h.rls.withTenantRls(h.role.client as PrismaClient, w.tenantId, (tx) =>
      h.repo.insertSample(tx, {
        tenantId: w.tenantId,
        vehicleId: w.vehicleId,
        bindingId: receipt.bindingId,
        receiptId: receipt.receiptId,
        occurredAt: new Date(),
        fixKey,
        odometerM: 1,
      }),
    );
  }

  // ------------------------------------------------------------------------------------------------------- casos
  test("Q1: viatura sem despacho — 202, quarentena no_operator, 1 recibo position_sample e 1 amostra; 0 position, 0 localização", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "i1");
    const canary = await world(h, "i1-canary");
    const at = await fixNow();
    const cmd = command(h, w.device, at);
    assert.deepEqual(await h.main.ingestion.ingest(cmd), { kind: "quarantined", reason: "no_operator_at_fix_time" });
    assert.equal((await quarantine(h, w.device, "no_operator_at_fix_time")).length, 1);
    assert.deepEqual(await state(h, w.tenantId), [0, 1, 0, 1]);
    const receipt = (await h.admin.$queryRawUnsafe<Array<{ id: string; location_id: string | null; fix_time: Date; vehicle_id: string }>>(
      `SELECT id::text, location_id::text, fix_time, vehicle_id::text FROM traccar_ingress_receipts WHERE tenant_id = $1::uuid`,
      w.tenantId,
    ))[0]!;
    assert.equal(receipt.location_id, null);
    assert.equal(receipt.fix_time.toISOString(), at.toISOString());
    assert.equal(receipt.vehicle_id, w.vehicleId);
    const sample = (await h.admin.$queryRawUnsafe<Array<{ fix_key: string; receipt_id: string; odometer_m: string; ignition: boolean }>>(
      `SELECT fix_key, receipt_id::text, odometer_m::text, ignition FROM vehicle_telemetry_events WHERE tenant_id = $1::uuid`,
      w.tenantId,
    ))[0]!;
    assert.deepEqual(sample, { fix_key: cmd.externalEventKey, receipt_id: receipt.id, odometer_m: "12345", ignition: true });
    assert.deepEqual(await state(h, canary.tenantId), [0, 0, 0, 0]);
  });

  test("Q1: reentrega idêntica — 202, delivery_count 2, ainda 1 recibo e 1 amostra, conflict_count 0", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "i2");
    const at = await fixNow();
    await h.main.ingestion.ingest(command(h, w.device, at));
    assert.deepEqual(await h.main.ingestion.ingest(command(h, w.device, at)), { kind: "quarantined", reason: "no_operator_at_fix_time" });
    assert.equal((await quarantine(h, w.device, "no_operator_at_fix_time"))[0]!.delivery_count, 2);
    assert.deepEqual(await state(h, w.tenantId), [0, 1, 0, 1]);
    assert.equal(await count(h, `SELECT coalesce(sum(conflict_count),0)::bigint AS n FROM traccar_ingress_receipts WHERE tenant_id = $1::uuid`, w.tenantId), 0);
  });

  test("Q1: reentrega com conteúdo diferente (velocidade) — 202, conflict_count 1 no recibo da amostra, amostra inalterada", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "i3");
    const at = await fixNow();
    await h.main.ingestion.ingest(command(h, w.device, at, { speed: 3 }));
    const md5 = async () =>
      (await h.admin.$queryRawUnsafe<Array<{ md5: string }>>(`SELECT md5(v::text) AS md5 FROM vehicle_telemetry_events v WHERE tenant_id = $1::uuid`, w.tenantId))[0]!.md5;
    const before = await md5();
    assert.deepEqual(await h.main.ingestion.ingest(command(h, w.device, at, { speed: 30 }, { ignition: false, odometer: 99 })), {
      kind: "quarantined",
      reason: "no_operator_at_fix_time",
    });
    assert.equal(
      await count(h, `SELECT conflict_count::bigint AS n FROM traccar_ingress_receipts WHERE tenant_id = $1::uuid AND message_kind = 'position_sample'`, w.tenantId),
      1,
    );
    assert.equal(await md5(), before);
    assert.deepEqual(await state(h, w.tenantId), [0, 1, 0, 1]);
  });

  test("Q1: os 3 motivos de operador guardam amostra — sem despacho, dois despachos, viatura trocada depois do fix", { timeout: 180_000 }, async () => {
    const h = await harness();
    const none = await world(h, "i4a");
    assert.deepEqual(await h.main.ingestion.ingest(command(h, none.device, await fixNow())), { kind: "quarantined", reason: "no_operator_at_fix_time" });
    assert.equal(await samples(h, none.tenantId), 1);

    const two = await world(h, "i4b", { dispatch: true });
    const otherTech = await newUser(h, two.tenantId, "i4b-2");
    const otherOrder = await newWorkOrder(h, two.tenantId, two.vehicleId);
    await acceptedDispatch(h, two.tenantId, otherOrder, otherTech);
    assert.deepEqual(await h.main.ingestion.ingest(command(h, two.device, await fixNow())), { kind: "quarantined", reason: "ambiguous_operator_at_fix_time" });
    assert.equal(await samples(h, two.tenantId), 1);

    const moved = await world(h, "i4c", { dispatch: true });
    const fix = await fixNow();
    const otherVehicle = await newVehicle(h, moved.tenantId);
    await assignVehicle(h, moved.tenantId, moved.workOrderId, moved.tech, otherVehicle);
    assert.deepEqual(await h.main.ingestion.ingest(command(h, moved.device, fix)), { kind: "quarantined", reason: "operator_history_ambiguous" });
    assert.equal(await samples(h, moved.tenantId), 1);
  });

  test("Q1: nos 7 motivos sem amostra nada é gravado em organização nenhuma (o 7º, chave alheia, é 409)", { timeout: 240_000 }, async () => {
    const h = await harness();
    // (1) dispositivo sem vínculo.
    const unmapped = `sqnone${randomUUID().slice(0, 6)}`;
    assert.deepEqual(await h.main.ingestion.ingest(command(h, unmapped, await fixNow())), { kind: "quarantined", reason: "unmapped_device" });
    assert.equal(await allSamplesWithKey(h, command(h, unmapped, new Date(0)).externalEventKey), 0);
    // (2) organização suspensa (dica aquecida por uma posição sem atributos).
    const inactive = await world(h, "i5-2");
    await h.main.ingestion.ingest(command(h, inactive.device, await fixNow(), {}, null));
    await h.admin.$executeRawUnsafe(`UPDATE tenants SET status = 'suspended' WHERE id = $1::uuid`, inactive.tenantId);
    try {
      assert.deepEqual(await h.main.ingestion.ingest(command(h, inactive.device, await fixNow())), { kind: "quarantined", reason: "tenant_inactive" });
    } finally {
      await h.admin.$executeRawUnsafe(`UPDATE tenants SET status = 'active' WHERE id = $1::uuid`, inactive.tenantId);
    }
    assert.deepEqual(await state(h, inactive.tenantId), [0, 0, 0, 0]);
    // (3) fix antes do vínculo.
    const early = await world(h, "i5-3");
    assert.deepEqual(await h.main.ingestion.ingest(command(h, early.device, new Date(Date.now() - 60 * 60_000))), {
      kind: "quarantined",
      reason: "fix_before_active_binding",
    });
    assert.deepEqual(await state(h, early.tenantId), [0, 0, 0, 0]);
    // (4) fix no futuro.
    const future = await world(h, "i5-4");
    assert.deepEqual(await h.main.ingestion.ingest(command(h, future.device, new Date(Date.now() + 6 * 60_000))), {
      kind: "quarantined",
      reason: "fix_in_future",
    });
    assert.deepEqual(await state(h, future.tenantId), [0, 0, 0, 0]);
    // (5) fix sem GPS válido.
    const invalid = await world(h, "i5-5");
    assert.deepEqual(await h.main.ingestion.ingest(command(h, invalid.device, await fixNow(), { valid: false })), {
      kind: "quarantined",
      reason: "invalid_fix",
    });
    assert.deepEqual(await state(h, invalid.tenantId), [0, 0, 0, 0]);
    // (6) teto de organizações.
    const capped = await world(h, "i5-6");
    const cappedService = h.makeService({ maxTenants: 1 });
    assert.deepEqual(await cappedService.ingestion.ingest(command(h, capped.device, await fixNow())), {
      kind: "quarantined",
      reason: "resolution_budget_exceeded",
    });
    assert.deepEqual(await state(h, capped.tenantId), [0, 0, 0, 0]);
    // (7) a chave da amostra já é de OUTRA organização (recibo position_sample K em B) → 409 visível.
    const a = await world(h, "i5-7a");
    const b = await world(h, "i5-7b");
    const cmd = command(h, a.device, await fixNow());
    await seedReceipt(h, b, "position_sample", cmd.externalEventKey);
    const outcome = await h.main.ingestion.ingest(cmd);
    assert.deepEqual(outcome, { kind: "conflict", reason: "owned_elsewhere" });
    assert.equal(status(h, outcome), 409);
    assert.equal((await quarantine(h, a.device, "idempotency_key_owned_elsewhere")).length, 1);
    assert.equal((await quarantine(h, a.device, "no_operator_at_fix_time")).length, 0);
    assert.deepEqual(await state(h, a.tenantId), [0, 0, 0, 0]);
    assert.deepEqual(await state(h, b.tenantId), [0, 1, 0, 0]);
  });

  test("Q1: um fix → uma amostra — a 2ª amostra com o mesmo fix_key pelo repositório não entra (0 linhas)", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "i6");
    const cmd = command(h, w.device, await fixNow());
    await h.main.ingestion.ingest(cmd);
    const position = await seedReceipt(h, w, "position", randomUUID().replace(/-/g, "").padEnd(64, "0"));
    assert.equal(await seedSample(h, w, position, cmd.externalEventKey), undefined);
    assert.equal(await samples(h, w.tenantId), 1);
  });

  test("Q1: corrida — a mesma posição sem despacho entregue 2× com barreira → 1 position_sample, 1 amostra, delivery_count 2", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "i6r");
    let arrived = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const racing = h.makeService({
      hooks: {
        afterBindingLocked: async () => {
          arrived += 1;
          if (arrived >= 2) release();
          await Promise.race([gate, pause(5_000)]);
        },
      },
    });
    const at = await fixNow();
    const outcomes = await Promise.all([racing.ingestion.ingest(command(h, w.device, at)), racing.ingestion.ingest(command(h, w.device, at))]);
    assert.deepEqual(outcomes.map((outcome) => status(h, outcome)), [202, 202]);
    assert.deepEqual(await state(h, w.tenantId), [0, 1, 0, 1]);
    assert.equal((await quarantine(h, w.device, "no_operator_at_fix_time"))[0]!.delivery_count, 2);
  });

  test("Q1: falha de DOMÍNIO na amostra (bateria 101 à mão) — 202, a quarentena fica, 0 amostra, 0 position_sample, sample_discarded 23514", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "i7");
    const svc = h.makeService();
    const base = command(h, w.device, await fixNow());
    const outcome = await svc.ingestion.ingest({ ...base, telemetry: { batteryLevelPct: 101 } });
    assert.deepEqual(outcome, { kind: "quarantined", reason: "no_operator_at_fix_time" });
    assert.equal((await quarantine(h, w.device, "no_operator_at_fix_time")).length, 1);
    assert.deepEqual(await state(h, w.tenantId), [0, 0, 0, 0]);
    assert.deepEqual(linesOf(svc.lines, "sample_discarded").map((line) => line.fields.code), ["23514"]);
    assert.equal(failed(svc.lines).length, 0);
  });

  test("Q1: quarentena primeiro, aceita depois — 204 stored e a amostra continua a da 1ª gravação (sample_skipped)", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "i6b", { dispatch: true });
    const svc = h.makeService();
    const at = await fixNow();
    const accepted = (await h.admin.$queryRawUnsafe<Array<{ accepted_at: Date }>>(`SELECT accepted_at FROM field_dispatches WHERE id = $1::uuid`, w.dispatchId))[0]!
      .accepted_at;
    // O despacho "ainda não aceito" na 1ª entrega (arranjo pela conexão administrativa), aceito antes do fix na 2ª.
    await h.admin.$executeRawUnsafe(`UPDATE field_dispatches SET accepted_at = NULL WHERE id = $1::uuid`, w.dispatchId);
    const cmd = command(h, w.device, at);
    assert.deepEqual(await svc.ingestion.ingest(cmd), { kind: "quarantined", reason: "no_operator_at_fix_time" });
    await h.admin.$executeRawUnsafe(`UPDATE field_dispatches SET accepted_at = $2 WHERE id = $1::uuid`, w.dispatchId, accepted);
    assert.deepEqual(await svc.ingestion.ingest(command(h, w.device, at)), { kind: "stored" });
    assert.deepEqual(await state(h, w.tenantId), [1, 1, 1, 1]);
    const sample = (await h.admin.$queryRawUnsafe<Array<{ fix_key: string; message_kind: string }>>(
      `SELECT v.fix_key, r.message_kind FROM vehicle_telemetry_events v JOIN traccar_ingress_receipts r ON r.id = v.receipt_id WHERE v.tenant_id = $1::uuid`,
      w.tenantId,
    ))[0]!;
    assert.deepEqual(sample, { fix_key: cmd.externalEventKey, message_kind: "position_sample" });
    assert.deepEqual(linesOf(svc.lines, "sample_skipped").map((line) => line.fields.reason), ["fix_already_sampled"]);
  });

  test("Q1: fix contestado entre kinds (position K em B, vínculo trocado para A) — declarado: A guarda a sua amostra, B intacta (P-TRC02-FIX-CONTESTADO-ENTRE-KINDS)", { timeout: 180_000 }, async () => {
    const h = await harness();
    const device = `sq${randomUUID().slice(0, 8)}`;
    const b = await world(h, "i8b", { dispatch: true, device });
    const at = await fixNow();
    const cmd = command(h, device, at);
    assert.deepEqual(await h.main.ingestion.ingest(cmd), { kind: "stored" });
    assert.deepEqual(await state(h, b.tenantId), [1, 0, 1, 1]);
    await h.rls.withTenantRls(h.role.client as PrismaClient, b.tenantId, (tx) =>
      tx.$executeRaw`UPDATE vehicle_tracking_bindings SET valid_to = now(), updated_at = now() WHERE instance_key = ${INSTANCE} AND external_device_key = ${device} AND valid_to IS NULL`,
    );
    await pause(STEP_MS);
    const a = await world(h, "i8a", { device });
    // O vínculo de A passa a valer desde antes do fix (a troca "dentro da janela"), pela conexão administrativa.
    await h.admin.$executeRawUnsafe(
      `UPDATE vehicle_tracking_bindings SET valid_from = $2 WHERE tenant_id = $1::uuid AND valid_to IS NULL`,
      a.tenantId,
      new Date(at.getTime() - 60_000),
    );
    const svc = h.makeService();
    assert.deepEqual(await svc.ingestion.ingest(command(h, device, at)), { kind: "quarantined", reason: "no_operator_at_fix_time" });
    assert.deepEqual(await state(h, a.tenantId), [0, 1, 0, 1]);
    assert.deepEqual(await state(h, b.tenantId), [1, 0, 1, 1]);
    assert.equal(linesOf(svc.lines, "sample_skipped").length, 0);
  });

  test("Q1: 0 linhas na amostra desfaz o recibo position_sample — recibo órfão impossível (sample_skipped)", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "i9");
    const cmd = command(h, w.device, await fixNow());
    const other = await seedReceipt(h, w, "position", randomUUID().replace(/-/g, "").padEnd(64, "0"));
    assert.ok(await seedSample(h, w, other, cmd.externalEventKey), "estado forçado: amostra K já existe em A");
    const svc = h.makeService();
    assert.deepEqual(await svc.ingestion.ingest(cmd), { kind: "quarantined", reason: "no_operator_at_fix_time" });
    assert.equal((await quarantine(h, w.device, "no_operator_at_fix_time")).length, 1);
    assert.equal(await receipts(h, w.tenantId, "position_sample"), 0);
    assert.equal(await samples(h, w.tenantId), 1);
    assert.deepEqual(linesOf(svc.lines, "sample_skipped").map((line) => line.fields.reason), ["fix_already_sampled"]);
  });

  test("Q1: a reversão é uma constante — com o conjunto vazio o sistema é Q1 = NÃO e o índice segue servindo o caminho aceito", { timeout: 180_000 }, async () => {
    const h = await harness();
    const off = h.makeService({ reasons: new Set() });
    const a = await world(h, "i10a");
    assert.deepEqual(await off.ingestion.ingest(command(h, a.device, await fixNow())), { kind: "quarantined", reason: "no_operator_at_fix_time" });
    assert.deepEqual(await state(h, a.tenantId), [0, 0, 0, 0]);
    assert.equal(await quarantineRowsOf(h, a.device), 1);
    const b = await world(h, "i10b", { dispatch: true });
    const cmd = command(h, b.device, await fixNow());
    assert.deepEqual(await off.ingestion.ingest(cmd), { kind: "stored" });
    assert.equal(
      await count(h, `SELECT count(*)::bigint AS n FROM vehicle_telemetry_events WHERE tenant_id = $1::uuid AND fix_key = $2`, b.tenantId, cmd.externalEventKey),
      1,
    );
    const position = await seedReceipt(h, b, "position", randomUUID().replace(/-/g, "").padEnd(64, "0"));
    assert.equal(await seedSample(h, b, position, cmd.externalEventKey), undefined);
    assert.equal(await samples(h, b.tenantId), 1);
  });

  test("Q1: erro que NÃO é de domínio na amostra sem operador — 503 e nada gravado, nem a quarentena", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "i11");
    const svc = h.makeService({
      hooks: {
        beforeSampleInsert: () => {
          throw new Error("injected");
        },
      },
    });
    assert.equal(status(h, await svc.ingestion.ingest(command(h, w.device, await fixNow()))), 503);
    assert.equal(await quarantineRowsOf(h, w.device), 0);
    assert.deepEqual(await state(h, w.tenantId), [0, 0, 0, 0]);
    assert.deepEqual(failed(svc.lines).map((line) => line.fields.code), ["Error"]);
    assert.equal(linesOf(svc.lines, "sample_discarded").length, 0);
  });

  test("Q1: o índice da amostra é ÚNICO, parcial e por organização: (tenant_id, fix_key) WHERE kind = 'sample'", { timeout: 60_000 }, async () => {
    const h = await harness();
    const rows = await h.admin.$queryRawUnsafe<Array<{ indexdef: string; indisunique: boolean }>>(
      `SELECT i.indexdef, x.indisunique FROM pg_indexes i JOIN pg_class c ON c.relname = i.indexname JOIN pg_index x ON x.indexrelid = c.oid
        WHERE i.schemaname = 'public' AND i.indexname = 'vehicle_telemetry_events_sample_fix_key'`,
    );
    assert.equal(rows.length, 1);
    assert.match(rows[0]!.indexdef, /\(tenant_id, fix_key\)/);
    assert.match(rows[0]!.indexdef, /WHERE \(kind = 'sample'::text\)/);
    assert.equal(rows[0]!.indisunique, true);
  });
}
