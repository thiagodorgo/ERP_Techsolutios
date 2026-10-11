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
// B-TRC-01 · idempotência da ingestão contra o PostgreSQL real (plano v2.1 §4.4; B-04, A2-11; MUT-10–MUT-12,
// MUT-23, MUT-35). Papel efêmero NOSUPERUSER NOBYPASSRLS; semeadura e limpeza administrativas, escopadas por
// organização e pela chave de instância desta rodada. Publicador de evento falso (conta), nada vai ao Redis.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = JSON.parse(
  readFileSync(path.join(ROOT, "infra", "traccar", "fixtures", "6.16.0", "position-osmand.json"), "utf8"),
) as { position: Record<string, unknown>; device: Record<string, unknown> };

if (!connectionString) {
  test("B-TRC-01 traccar-idempotency-db exige DATABASE_URL e um banco migrado", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suíte.",
  });
} else {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "prisma";

  const INSTANCE = `trc-idem-${randomUUID().slice(0, 8)}`;
  const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const STEP_MS = 60;
  // Orçamento de tempo RELAXADO só para a suíte paralela (dezenas de arquivos no mesmo cluster, no Windows): com o
  // `maxWait` de 250 ms do plano, a transação às vezes nem começa (P2028) e o caso vira 503, que não é o que ele mede.
  // O orçamento do plano é provado no `traccar-resolution-race-db` (503 antes de 3 s; MUT-40), que usa o default.
  const RELAXED_BUDGETS = { phaseTwo: { maxWait: 5_000, timeout: 10_000 }, discovery: { maxWait: 5_000, timeout: 10_000 } };

  type Harness = Awaited<ReturnType<typeof bootstrap>>;
  let harnessPromise: Promise<Harness> | undefined;
  const harness = (): Promise<Harness> => (harnessPromise ??= bootstrap());

  async function bootstrap() {
    const [{ PrismaPg }, { PrismaClient }, rls, dispatch, service, schema, adapter, app] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
      import("../src/database/rls.js"),
      import("../src/modules/field-dispatch/field-dispatch-prisma.repository.js"),
      import("../src/integrations/traccar/traccar-ingestion.service.js"),
      import("../src/integrations/traccar/traccar-position.schema.js"),
      import("../src/integrations/traccar/traccar-position.adapter.js"),
      import("../src/integrations/traccar/traccar-ingest.app.js"),
    ]);
    const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });
    const role: EphemeralRole = await createEphemeralRole(admin, connectionString!);
    const events: Array<{ tenantId?: string }> = [];
    const makeService = (hooks: Record<string, () => unknown> = {}) =>
      service.createTraccarIngestionService({
        client: role.client as PrismaClient,
        timeoutMs: 3_000,
        resolver: { maxTenants: 500, hintTtlMs: 600_000, negativeTtlMs: 60_000, cacheMax: 10_000 },
        budgets: RELAXED_BUDGETS,
        hooks: hooks as never,
        publish: (async (_name: string, _payload: unknown, context: { tenantId?: string } = {}) => {
          events.push({ tenantId: context.tenantId });
          return { event: {} as never, published: true };
        }) as never,
      });
    return { admin, role, rls, dispatch, schema, adapter, app, events, makeService, ingestion: makeService(), tenants: [] as string[] };
  }

  after(async () => {
    if (!harnessPromise) return;
    const h = await harnessPromise;
    try {
      const ids = [...h.tenants];
      if (ids.length > 0) {
        for (const table of ["traccar_ingress_receipts", "field_operator_locations", "vehicle_tracking_bindings", "field_dispatches", "work_orders", "vehicles", "users"]) {
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

  async function adminId(h: Harness, sql: string, ...values: unknown[]): Promise<string> {
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(sql, ...values);
    return rows[0]!.id;
  }

  /** Organização + viatura vinculada + técnico com despacho aceito. */
  async function world(h: Harness, tag: string, device = `dev${randomUUID().slice(0, 8)}`) {
    const tenantId = await adminId(h, `INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, `trc-idem-${tag}-${randomUUID().slice(0, 8)}`);
    h.tenants.push(tenantId);
    const vehicleId = await adminId(
      h,
      `INSERT INTO vehicles (tenant_id, plate, model) VALUES ($1::uuid, $2, 'Viatura sintética') RETURNING id`,
      tenantId,
      `TRC${randomUUID().slice(0, 5).toUpperCase()}`,
    );
    const techId = await adminId(
      h,
      `INSERT INTO users (tenant_id, name, email) VALUES ($1::uuid, 'Técnico', $2) RETURNING id`,
      tenantId,
      `trc-idem-${randomUUID().slice(0, 8)}@example.com`,
    );
    const workOrderId = await adminId(
      h,
      `INSERT INTO work_orders (tenant_id, code, title, vehicle_id) VALUES ($1::uuid, $2, 'OS sintética', $3::uuid) RETURNING id`,
      tenantId,
      `TRC-${randomUUID().slice(0, 8)}`,
      vehicleId,
    );
    await h.rls.withTenantRls(h.role.client as PrismaClient, tenantId, (tx) =>
      tx.$executeRaw`INSERT INTO vehicle_tracking_bindings (tenant_id, vehicle_id, instance_key, external_device_key)
        VALUES (${tenantId}::uuid, ${vehicleId}::uuid, ${INSTANCE}, ${device})`,
    );
    await pause(STEP_MS);
    const created = await h.rls.withTenantRls(h.role.client as PrismaClient, tenantId, (tx) =>
      new h.dispatch.PrismaFieldDispatchRepository(tx).create({ tenantId, workOrderId, operatorUserId: techId, status: "assigned" }),
    );
    await pause(STEP_MS);
    await h.rls.withTenantRls(h.role.client as PrismaClient, tenantId, (tx) =>
      new h.dispatch.PrismaFieldDispatchRepository(tx).changeStatus({ tenantId, dispatchId: created.id, status: "accepted" }),
    );
    await pause(STEP_MS);
    return { tenantId, vehicleId, techId, device };
  }

  function command(h: Harness, device: string, fixAt: Date, extra: Record<string, unknown> = {}) {
    const body = structuredClone(FIXTURE);
    body.device.uniqueId = device;
    body.position.fixTime = fixAt.toISOString();
    body.position.latitude = -23.5;
    body.position.longitude = -46.6;
    Object.assign(body.position, extra);
    return h.adapter.buildTraccarPositionCommand(h.schema.parseTraccarPositionEnvelope(body), { instanceKey: INSTANCE, receivedAt: new Date() });
  }
  async function fixNow(): Promise<Date> {
    await pause(STEP_MS);
    const at = new Date();
    await pause(STEP_MS);
    return at;
  }
  async function counts(h: Harness, tenantId: string) {
    const rows = await h.admin.$queryRawUnsafe<Array<{ receipts: bigint; locations: bigint; conflicts: bigint | null }>>(
      `SELECT (SELECT count(*) FROM traccar_ingress_receipts WHERE tenant_id = $1::uuid)::bigint AS receipts,
              (SELECT count(*) FROM field_operator_locations WHERE tenant_id = $1::uuid AND source = 'traccar')::bigint AS locations,
              (SELECT sum(conflict_count) FROM traccar_ingress_receipts WHERE tenant_id = $1::uuid)::bigint AS conflicts`,
      tenantId,
    );
    const row = rows[0]!;
    return { receipts: Number(row.receipts), locations: Number(row.locations), conflicts: Number(row.conflicts ?? 0) };
  }
  const eventsOf = (h: Harness, tenantId: string) => h.events.filter((event) => event.tenantId === tenantId).length;
  /**
   * Barreira de DUAS partes logo depois do `FOR SHARE` do vínculo: as duas entregas passam juntas pelo passo 4
   * (nenhuma vê recibo ainda) e só então correm para o INSERT do passo 6 — é a corrida que o `ON CONFLICT` resolve.
   */
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
  const status = (h: Harness, outcome: Parameters<Harness["app"]["traccarIngestResponse"]>[0]) => h.app.traccarIngestResponse(outcome).status;

  test("idempotência: primeira entrega — 204, 1 recibo, 1 localização, 1 evento", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "first");
    assert.equal(status(h, await h.ingestion.ingest(command(h, w.device, await fixNow()))), 204);
    assert.deepEqual(await counts(h, w.tenantId), { receipts: 1, locations: 1, conflicts: 0 });
    assert.equal(eventsOf(h, w.tenantId), 1);
  });

  test("idempotência: reenvio idêntico — 204, nada novo, nenhum evento", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "same");
    const fix = await fixNow();
    await h.ingestion.ingest(command(h, w.device, fix));
    const again = await h.ingestion.ingest(command(h, w.device, fix, { id: 4242 })); // o retry do Traccar leva position.id
    assert.equal(status(h, again), 204);
    assert.deepEqual(again, { kind: "duplicate" });
    assert.deepEqual(await counts(h, w.tenantId), { receipts: 1, locations: 1, conflicts: 0 });
    assert.equal(eventsOf(h, w.tenantId), 1);
  });

  test("idempotência: mesma chave com digest diferente — 409, `conflict_count = 1`, nenhuma localização nova", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "diff");
    const fix = await fixNow();
    await h.ingestion.ingest(command(h, w.device, fix, { speed: 3 }));
    const divergent = await h.ingestion.ingest(command(h, w.device, fix, { speed: 30 }));
    assert.equal(status(h, divergent), 409);
    assert.deepEqual(await counts(h, w.tenantId), { receipts: 1, locations: 1, conflicts: 1 });
    assert.equal(eventsOf(h, w.tenantId), 1);
  });

  test("idempotência: duas entregas idênticas concorrentes — ambas 2xx, 1 recibo, 1 localização", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "twin");
    const fix = await fixNow();
    const racing = h.makeService(twoPartyBarrier());
    await h.ingestion.ingest(command(h, w.device, new Date(fix.getTime() - 30)));
    const outcomes = await Promise.all([racing.ingest(command(h, w.device, fix)), racing.ingest(command(h, w.device, fix))]);
    assert.deepEqual(outcomes.map((outcome) => status(h, outcome)).sort(), [204, 204]);
    assert.deepEqual(outcomes.map((outcome) => outcome.kind).sort(), ["duplicate", "stored"]);
    assert.deepEqual(await counts(h, w.tenantId), { receipts: 2, locations: 2, conflicts: 0 });
  });

  test("idempotência: duas divergentes concorrentes — uma 204 e uma 409", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "race");
    const fix = await fixNow();
    const racing = h.makeService(twoPartyBarrier());
    await h.ingestion.ingest(command(h, w.device, new Date(fix.getTime() - 30)));
    const outcomes = await Promise.all([
      racing.ingest(command(h, w.device, fix, { speed: 1 })),
      racing.ingest(command(h, w.device, fix, { speed: 99 })),
    ]);
    assert.deepEqual(outcomes.map((outcome) => status(h, outcome)).sort(), [204, 409]);
    assert.deepEqual(await counts(h, w.tenantId), { receipts: 2, locations: 2, conflicts: 1 });
  });

  test("idempotência: chave já registrada em outra organização — 409 e quarentena `idempotency_key_owned_elsewhere`, nada na segunda", { timeout: 120_000 }, async () => {
    const h = await harness();
    const device = `dev${randomUUID().slice(0, 8)}`;
    const a = await world(h, "owna", device);
    // O dispositivo sai de A e entra em B; um recibo com a MESMA chave da próxima posição já existe em A.
    await h.rls.withTenantRls(h.role.client as PrismaClient, a.tenantId, (tx) =>
      tx.$executeRaw`UPDATE vehicle_tracking_bindings SET valid_to = now(), updated_at = now()
        WHERE instance_key = ${INSTANCE} AND external_device_key = ${device} AND valid_to IS NULL`,
    );
    await pause(STEP_MS);
    const b = await world(h, "ownb", device);
    const cmd = command(h, device, await fixNow());
    const bindingOfA = await adminId(h, `SELECT id FROM vehicle_tracking_bindings WHERE tenant_id = $1::uuid`, a.tenantId);
    await h.admin.$executeRawUnsafe(
      `INSERT INTO traccar_ingress_receipts (tenant_id, instance_key, message_kind, external_event_key, payload_digest, binding_id, vehicle_id, traccar_device_id, fix_time)
       VALUES ($1::uuid, $2, 'position', $3, $4, $5::uuid, $6::uuid, '1', $7)`,
      a.tenantId,
      INSTANCE,
      cmd.externalEventKey,
      cmd.payloadDigest,
      bindingOfA,
      a.vehicleId,
      cmd.fixedAt,
    );
    const outcome = await h.ingestion.ingest(cmd);
    assert.deepEqual(outcome, { kind: "conflict", reason: "owned_elsewhere" });
    assert.equal(status(h, outcome), 409);
    assert.deepEqual(await counts(h, b.tenantId), { receipts: 0, locations: 0, conflicts: 0 });
    const quarantine = await h.admin.$queryRawUnsafe<Array<{ n: bigint }>>(
      `SELECT count(*)::bigint AS n FROM traccar_quarantine_items WHERE instance_key = $1 AND external_device_key = $2 AND reason = 'idempotency_key_owned_elsewhere' AND resolved_at IS NULL`,
      INSTANCE,
      device,
    );
    assert.equal(Number(quarantine[0]!.n), 1);
  });

  test("idempotência: falha antes do commit — 503 e nada gravado; a nova entrega dá 204", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "fail");
    const fix = await fixNow();
    const failing = h.makeService({ beforeCommit: () => { throw new Error("falha injetada antes do commit"); } });
    assert.equal(status(h, await failing.ingest(command(h, w.device, fix))), 503);
    assert.deepEqual(await counts(h, w.tenantId), { receipts: 0, locations: 0, conflicts: 0 });
    assert.equal(status(h, await h.ingestion.ingest(command(h, w.device, fix))), 204);
    assert.deepEqual(await counts(h, w.tenantId), { receipts: 1, locations: 1, conflicts: 0 });
  });

  test("idempotência: falha depois do INSERT do recibo e antes do da localização — nem recibo nem localização ficam", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "mid");
    const failing = h.makeService({ afterReceiptInsert: () => { throw new Error("falha injetada entre o recibo e a localização"); } });
    assert.equal(status(h, await failing.ingest(command(h, w.device, await fixNow()))), 503);
    assert.deepEqual(await counts(h, w.tenantId), { receipts: 0, locations: 0, conflicts: 0 });
  });
}
