import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import type { Prisma, PrismaClient } from "@prisma/client";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";

// -----------------------------------------------------------------------------------------------
// B-TRC-01 · a ingestão inteira contra o PostgreSQL real, sob o papel efêmero NOSUPERUSER NOBYPASSRLS do arnês
// (plano v2.1 §4.2, §8.6; A2-12, N2-03, N2-07; MUT-06, MUT-20, MUT-22–MUT-24, MUT-43–MUT-45). Semeadura e limpeza
// pela conexão administrativa, escopadas pelas organizações e pela chave de instância DESTA rodada. Os despachos são
// criados, aceitos e reatribuídos pelo REPOSITÓRIO de despacho (sem evento), como na vida real. O publicador de
// evento é falso (conta e confere o commit), para nada ir ao Redis.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = JSON.parse(
  readFileSync(path.join(ROOT, "infra", "traccar", "fixtures", "6.16.0", "position-osmand.json"), "utf8"),
) as { position: Record<string, unknown>; device: Record<string, unknown> };

if (!connectionString) {
  test("B-TRC-01 traccar-position-ingestion-db exige DATABASE_URL e um banco migrado", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suíte.",
  });
} else {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "prisma";

  const INSTANCE = `trc-ing-${randomUUID().slice(0, 8)}`;
  const SECRET = `ingestion-db-forward-secret-${randomUUID()}`;
  const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const STEP_MS = 60;
  // Orçamento de tempo RELAXADO só para a suíte paralela (dezenas de arquivos no mesmo cluster, no Windows): com o
  // `maxWait` de 250 ms do plano, a transação às vezes nem começa (P2028) e o caso vira 503, que não é o que ele mede.
  // O orçamento do plano é provado no `traccar-resolution-race-db` (503 antes de 3 s; MUT-40), que usa o default.
  const RELAXED_BUDGETS = { phaseTwo: { maxWait: 5_000, timeout: 10_000 }, discovery: { maxWait: 5_000, timeout: 10_000 } };

  type PublishedEvent = { name: string; payload: Record<string, unknown>; tenantId?: string; committed: boolean };
  type Harness = Awaited<ReturnType<typeof bootstrap>>;
  let harnessPromise: Promise<Harness> | undefined;
  const harness = (): Promise<Harness> => (harnessPromise ??= bootstrap());

  async function bootstrap() {
    const [{ PrismaPg }, { PrismaClient }, rls, dispatch, location, service, schema, adapter, app, auth, limit] =
      await Promise.all([
        import("@prisma/adapter-pg"),
        import("@prisma/client"),
        import("../src/database/rls.js"),
        import("../src/modules/field-dispatch/field-dispatch-prisma.repository.js"),
        import("../src/modules/field-location/index.js"),
        import("../src/integrations/traccar/traccar-ingestion.service.js"),
        import("../src/integrations/traccar/traccar-position.schema.js"),
        import("../src/integrations/traccar/traccar-position.adapter.js"),
        import("../src/integrations/traccar/traccar-ingest.app.js"),
        import("../src/integrations/traccar/traccar-forward-auth.js"),
        import("../src/integrations/traccar/traccar-rate-limit.js"),
      ]);
    const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });
    const role: EphemeralRole = await createEphemeralRole(admin, connectionString!);
    const events: PublishedEvent[] = [];
    const errorCodes: string[] = [];
    const ingestion = service.createTraccarIngestionService({
      client: role.client as PrismaClient,
      timeoutMs: 3_000,
      resolver: { maxTenants: 500, hintTtlMs: 600_000, negativeTtlMs: 60_000, cacheMax: 10_000 },
      budgets: RELAXED_BUDGETS,
      logger: { info: () => undefined, warn: () => undefined, error: (fields) => errorCodes.push(String(fields.code)) },
      publish: (async (name: string, payload: Record<string, unknown>, context: { tenantId?: string } = {}) => {
        const entityId = String(payload.entity_id);
        const visible = await admin.$queryRawUnsafe<Array<{ n: bigint }>>(
          `SELECT count(*)::bigint AS n FROM field_operator_locations WHERE id = $1::uuid`,
          entityId,
        );
        events.push({ name, payload, tenantId: context.tenantId, committed: Number(visible[0]!.n) === 1 });
        return { event: {} as never, published: true };
      }) as never,
    });
    return { admin, role, rls, dispatch, location, ingestion, schema, adapter, app, auth, limit, events, errorCodes, tenants: [] as string[] };
  }

  after(async () => {
    if (!harnessPromise) return;
    const h = await harnessPromise;
    if (h.errorCodes.length > 0) {
      // Diagnóstico das entregas que saíram 503 e foram repetidas (só o código, nunca mensagem nem payload).
      console.log(`[traccar-ingestion-db] códigos de falha transitória: ${h.errorCodes.join(", ")}`);
    }
    try {
      const ids = [...h.tenants];
      if (ids.length > 0) {
        for (const table of [
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

  // ---------------------------------------------------------------- semeadura (conexão administrativa + repositório)
  async function newTenant(h: Harness, tag: string): Promise<string> {
    const slug = `trc-ing-${tag}-${randomUUID().slice(0, 8)}`;
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, slug);
    h.tenants.push(rows[0]!.id);
    return rows[0]!.id;
  }
  async function newUser(h: Harness, tenantId: string, label: string): Promise<string> {
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO users (tenant_id, name, email) VALUES ($1::uuid, $2, $3) RETURNING id`,
      tenantId,
      `Técnico ${label}`,
      `trc-${label}-${randomUUID().slice(0, 8)}@example.com`,
    );
    return rows[0]!.id;
  }
  async function newVehicle(h: Harness, tenantId: string): Promise<string> {
    const id = randomUUID();
    await h.admin.$executeRawUnsafe(
      `INSERT INTO vehicles (id, tenant_id, plate, model) VALUES ($1::uuid, $2::uuid, $3, 'Viatura sintética')`,
      id,
      tenantId,
      `TRC${id.slice(0, 5).toUpperCase()}`,
    );
    return id;
  }
  async function newWorkOrder(h: Harness, tenantId: string, vehicleId: string): Promise<string> {
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO work_orders (tenant_id, code, title, vehicle_id) VALUES ($1::uuid, $2, 'OS sintética', $3::uuid) RETURNING id`,
      tenantId,
      `TRC-${randomUUID().slice(0, 8)}`,
      vehicleId,
    );
    return rows[0]!.id;
  }
  function dispatchRepo<T>(h: Harness, tenantId: string, work: (repo: InstanceType<Harness["dispatch"]["PrismaFieldDispatchRepository"]>) => Promise<T>) {
    return h.rls.withTenantRls(h.role.client as PrismaClient, tenantId, (tx) => work(new h.dispatch.PrismaFieldDispatchRepository(tx)));
  }
  async function createDispatch(h: Harness, tenantId: string, workOrderId: string, operatorUserId: string): Promise<string> {
    const dispatch = await dispatchRepo(h, tenantId, (repo) => repo.create({ tenantId, workOrderId, operatorUserId, status: "assigned" }));
    await pause(STEP_MS);
    return dispatch.id;
  }
  async function setStatus(h: Harness, tenantId: string, dispatchId: string, status: string): Promise<void> {
    await dispatchRepo(h, tenantId, (repo) => repo.changeStatus({ tenantId, dispatchId, status: status as never }));
    await pause(STEP_MS);
  }
  async function reassign(h: Harness, tenantId: string, dispatchId: string, operatorUserId: string): Promise<void> {
    await dispatchRepo(h, tenantId, (repo) => repo.reassign({ tenantId, dispatchId, operatorUserId }));
    await pause(STEP_MS);
  }
  async function bind(h: Harness, tenantId: string, vehicleId: string, device: string): Promise<void> {
    await h.rls.withTenantRls(h.role.client as PrismaClient, tenantId, (tx) =>
      tx.$executeRaw`INSERT INTO vehicle_tracking_bindings (tenant_id, vehicle_id, instance_key, external_device_key)
        VALUES (${tenantId}::uuid, ${vehicleId}::uuid, ${INSTANCE}, ${device})`,
    );
    await pause(STEP_MS);
  }
  async function unbind(h: Harness, tenantId: string, device: string): Promise<void> {
    await h.rls.withTenantRls(h.role.client as PrismaClient, tenantId, (tx) =>
      tx.$executeRaw`UPDATE vehicle_tracking_bindings SET valid_to = now(), updated_at = now()
        WHERE instance_key = ${INSTANCE} AND external_device_key = ${device} AND valid_to IS NULL`,
    );
    await pause(STEP_MS);
  }
  /** Organização com viatura vinculada e um técnico com despacho ACEITO; devolve o instante seguro para o fix. */
  async function world(h: Harness, tag: string) {
    const tenantId = await newTenant(h, tag);
    const vehicleId = await newVehicle(h, tenantId);
    const techA = await newUser(h, tenantId, `${tag}-a`);
    const techB = await newUser(h, tenantId, `${tag}-b`);
    const workOrderId = await newWorkOrder(h, tenantId, vehicleId);
    const device = `dev${randomUUID().slice(0, 8)}`;
    await bind(h, tenantId, vehicleId, device);
    const dispatchId = await createDispatch(h, tenantId, workOrderId, techA);
    await setStatus(h, tenantId, dispatchId, "accepted");
    return { tenantId, vehicleId, techA, techB, workOrderId, device, dispatchId };
  }

  function envelope(device: string, fixAt: Date, latitude: number, longitude: number, extra: Record<string, unknown> = {}) {
    const body = structuredClone(FIXTURE);
    body.device.uniqueId = device;
    body.position.fixTime = fixAt.toISOString();
    body.position.deviceTime = fixAt.toISOString();
    body.position.latitude = latitude;
    body.position.longitude = longitude;
    Object.assign(body.position, extra);
    return body;
  }
  function command(h: Harness, device: string, fixAt: Date, latitude = -23.55, longitude = -46.63) {
    return h.adapter.buildTraccarPositionCommand(h.schema.parseTraccarPositionEnvelope(envelope(device, fixAt, latitude, longitude)), {
      instanceKey: INSTANCE,
      receivedAt: new Date(),
    });
  }
  async function fixNow(): Promise<Date> {
    await pause(STEP_MS);
    const at = new Date();
    await pause(STEP_MS);
    return at;
  }

  async function count(h: Harness, table: string, where: string, ...values: unknown[]): Promise<number> {
    const rows = await h.admin.$queryRawUnsafe<Array<{ n: bigint }>>(`SELECT count(*)::bigint AS n FROM ${table} WHERE ${where}`, ...values);
    return Number(rows[0]!.n);
  }
  const locationsOf = (h: Harness, tenantId: string, operator?: string) =>
    operator
      ? count(h, "field_operator_locations", "tenant_id = $1::uuid AND operator_user_id = $2::uuid AND source = 'traccar'", tenantId, operator)
      : count(h, "field_operator_locations", "tenant_id = $1::uuid AND source = 'traccar'", tenantId);
  const quarantineOf = (h: Harness, device: string, reason: string) =>
    count(h, "traccar_quarantine_items", "instance_key = $1 AND external_device_key = $2 AND reason = $3", INSTANCE, device, reason);

  // ------------------------------------------------------------------------------------------------------- casos
  test("ingestão: recibo e localização gravados atomicamente sob o papel efêmero", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "atom");
    const outcome = await h.ingestion.ingest(command(h, w.device, await fixNow()));
    assert.equal(outcome.kind, "stored");
    const rows = await h.admin.$queryRawUnsafe<Array<{ location_id: string | null; operator_user_id: string; source: string }>>(
      `SELECT r.location_id::text, l.operator_user_id::text, l.source FROM traccar_ingress_receipts r
         JOIN field_operator_locations l ON l.tenant_id = r.tenant_id AND l.id = r.location_id
        WHERE r.tenant_id = $1::uuid AND r.instance_key = $2`,
      w.tenantId,
      INSTANCE,
    );
    assert.equal(rows.length, 1, "um recibo apontando para uma localização");
    assert.deepEqual([rows[0]!.operator_user_id, rows[0]!.source], [w.techA, "traccar"]);
  });

  test("ingestão: `source='traccar'` e o latest devolve o técnico na organização certa (também depois de o rastreador mudar de organização)", { timeout: 120_000 }, async () => {
    const h = await harness();
    const a = await world(h, "lata");
    const fix = await fixNow();
    assert.equal((await h.ingestion.ingest(command(h, a.device, fix, -23.111, -46.222))).kind, "stored");
    const service = new h.location.FieldLocationService(new (await import("../src/modules/field-location/field-location-prisma.repository.js")).RlsPrismaFieldLocationRepository(h.role.client as PrismaClient));
    const actor = (tenantId: string) => ({ tenantId, userId: randomUUID(), roles: [], permissions: [] }) as never;
    const latest = await service.listLatest(actor(a.tenantId), {});
    const mine = latest.filter((item) => item.operatorUserId === a.techA);
    assert.equal(mine.length, 1);
    assert.deepEqual([mine[0]!.source, mine[0]!.latitude, mine[0]!.longitude], ["traccar", -23.111, -46.222]);

    // O rastreador passa para a organização B: a dica (A) ficou velha; a confirmação manda na B.
    const bTenant = await newTenant(h, "latb");
    const bVehicle = await newVehicle(h, bTenant);
    const bTech = await newUser(h, bTenant, "latb-t");
    const bWo = await newWorkOrder(h, bTenant, bVehicle);
    await unbind(h, a.tenantId, a.device);
    await bind(h, bTenant, bVehicle, a.device);
    const bDispatch = await createDispatch(h, bTenant, bWo, bTech);
    await setStatus(h, bTenant, bDispatch, "accepted");
    assert.equal((await h.ingestion.ingest(command(h, a.device, await fixNow(), -22.5, -43.2))).kind, "stored");
    assert.equal(await locationsOf(h, bTenant, bTech), 1, "a posição nova foi para a organização que tem o vínculo AGORA");
    assert.equal(await locationsOf(h, a.tenantId), 1, "a organização antiga não ganhou nada");
  });

  test("ingestão: `tenantId` no envelope dá 422 e zero escrita em qualquer organização", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "tid");
    const app = h.app.createTraccarIngestApp({
      authenticator: h.auth.createTraccarForwardAuthenticator({ current: SECRET }),
      limiter: h.limit.createTraccarIngestLimiter({ ratePerSecond: 20, burst: 100, maxConcurrency: 10 }),
      ingest: (cmd) => h.ingestion.ingest(cmd),
      instanceKey: INSTANCE,
      timeoutMs: 3_000,
      logger: (await import("pino")).default({ level: "silent" }),
    });
    const server: Server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    try {
      const { port } = server.address() as AddressInfo;
      const body = envelope(w.device, await fixNow(), -23.5, -46.6, { tenantId: w.tenantId });
      const response = await fetch(`http://127.0.0.1:${port}/ingest/traccar/v1/positions`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-traccar-forward-token": SECRET },
        body: JSON.stringify({ ...body, tenant_id: w.tenantId }),
      });
      assert.equal(response.status, 422);
      await response.arrayBuffer();
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    const receiptsOfDevice = await count(
      h,
      "traccar_ingress_receipts r JOIN vehicle_tracking_bindings b ON b.tenant_id = r.tenant_id AND b.id = r.binding_id",
      "b.instance_key = $1 AND b.external_device_key = $2",
      INSTANCE,
      w.device,
    );
    assert.equal(receiptsOfDevice, 0, "nenhum recibo em organização nenhuma");
    assert.equal(await count(h, "field_operator_locations", "source = 'traccar' AND recorded_at > now() - interval '1 hour' AND tenant_id = $1::uuid", w.tenantId), 0);
    assert.equal(await count(h, "traccar_quarantine_items", "instance_key = $1 AND external_device_key = $2", INSTANCE, w.device), 0);
  });

  test("ingestão: operador que aceitou antes do fix e terminou depois dele recebe a posição", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "done");
    const fix = await fixNow();
    await setStatus(h, w.tenantId, w.dispatchId, "completed");
    assert.equal((await h.ingestion.ingest(command(h, w.device, fix))).kind, "stored");
    assert.equal(await locationsOf(h, w.tenantId, w.techA), 1);
  });

  test("ingestão: despacho só atribuído, ou já terminado no fix — `no_operator_at_fix_time`", { timeout: 120_000 }, async () => {
    const h = await harness();
    const tenantId = await newTenant(h, "noop");
    const vehicleId = await newVehicle(h, tenantId);
    const tech = await newUser(h, tenantId, "noop-t");
    const device = `dev${randomUUID().slice(0, 8)}`;
    await bind(h, tenantId, vehicleId, device);
    await createDispatch(h, tenantId, await newWorkOrder(h, tenantId, vehicleId), tech); // só "assigned"
    const onlyAssigned = await h.ingestion.ingest(command(h, device, await fixNow()));
    assert.deepEqual(onlyAssigned, { kind: "quarantined", reason: "no_operator_at_fix_time" });

    const finished = await createDispatch(h, tenantId, await newWorkOrder(h, tenantId, vehicleId), tech);
    await setStatus(h, tenantId, finished, "accepted");
    await setStatus(h, tenantId, finished, "completed");
    const afterEnd = await h.ingestion.ingest(command(h, device, await fixNow(), -23.6));
    assert.deepEqual(afterEnd, { kind: "quarantined", reason: "no_operator_at_fix_time" });
    assert.equal(await locationsOf(h, tenantId), 0);
  });

  test("ingestão: dois operadores com despacho aceito no fix — `ambiguous_operator_at_fix_time`", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "amb");
    const other = await createDispatch(h, w.tenantId, await newWorkOrder(h, w.tenantId, w.vehicleId), w.techB);
    await setStatus(h, w.tenantId, other, "accepted");
    const outcome = await h.ingestion.ingest(command(h, w.device, await fixNow()));
    assert.deepEqual(outcome, { kind: "quarantined", reason: "ambiguous_operator_at_fix_time" });
    assert.equal(await locationsOf(h, w.tenantId), 0);
  });

  test("ingestão: reatribuição A→B só pelo repositório, sem evento — o fix de A anterior à troca não vai para B", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "swap");
    const fixOfA = await fixNow();
    await reassign(h, w.tenantId, w.dispatchId, w.techB);
    assert.equal(await count(h, "field_dispatch_events", "dispatch_id = $1::uuid", w.dispatchId), 0, "a troca não gerou evento");
    const outcome = await h.ingestion.ingest(command(h, w.device, fixOfA));
    assert.deepEqual(outcome, { kind: "quarantined", reason: "operator_history_ambiguous" });
    assert.equal(await locationsOf(h, w.tenantId, w.techB), 0, "o trajeto de A não foi para B");
    assert.equal(await locationsOf(h, w.tenantId, w.techA), 0);
  });

  test("ingestão: `reassigned → on_route` sem novo aceite — `operator_history_ambiguous`", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "onroute");
    await reassign(h, w.tenantId, w.dispatchId, w.techB);
    await setStatus(h, w.tenantId, w.dispatchId, "on_route");
    const outcome = await h.ingestion.ingest(command(h, w.device, await fixNow()));
    assert.deepEqual(outcome, { kind: "quarantined", reason: "operator_history_ambiguous" });
    assert.equal(await locationsOf(h, w.tenantId), 0);
  });

  test("ingestão: B aceita de novo — os fixes depois do aceite vão para B", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "reacc");
    await reassign(h, w.tenantId, w.dispatchId, w.techB);
    const beforeAccept = await fixNow();
    await setStatus(h, w.tenantId, w.dispatchId, "accepted");
    const afterAccept = await fixNow();
    assert.equal((await h.ingestion.ingest(command(h, w.device, afterAccept))).kind, "stored");
    assert.equal(await locationsOf(h, w.tenantId, w.techB), 1);
    const early = await h.ingestion.ingest(command(h, w.device, beforeAccept, -23.7));
    assert.deepEqual(early, { kind: "quarantined", reason: "no_operator_at_fix_time" }, "antes do novo aceite, ninguém");
  });

  test("ingestão: A→B→A — nenhum fix do período de B vai para A", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "aba");
    await reassign(h, w.tenantId, w.dispatchId, w.techB);
    await setStatus(h, w.tenantId, w.dispatchId, "accepted");
    const fixOfB = await fixNow();
    await reassign(h, w.tenantId, w.dispatchId, w.techA);
    const beforeAReaccepts = await h.ingestion.ingest(command(h, w.device, fixOfB));
    assert.deepEqual(beforeAReaccepts, { kind: "quarantined", reason: "operator_history_ambiguous" });
    await setStatus(h, w.tenantId, w.dispatchId, "accepted");
    const afterAReaccepts = await h.ingestion.ingest(command(h, w.device, fixOfB, -23.8));
    assert.deepEqual(afterAReaccepts, { kind: "quarantined", reason: "no_operator_at_fix_time" });
    assert.equal(await locationsOf(h, w.tenantId, w.techA), 0, "nada do período de B foi para A");
  });

  test("ingestão: organização suspensa com dica válida — `tenant_inactive`", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "susp");
    assert.equal((await h.ingestion.ingest(command(h, w.device, await fixNow()))).kind, "stored"); // cria a dica
    await h.admin.$executeRawUnsafe(`UPDATE tenants SET status = 'suspended' WHERE id = $1::uuid`, w.tenantId);
    try {
      const outcome = await h.ingestion.ingest(command(h, w.device, await fixNow(), -23.9));
      assert.deepEqual(outcome, { kind: "quarantined", reason: "tenant_inactive" });
      assert.equal(await locationsOf(h, w.tenantId), 1, "nada novo depois da suspensão");
    } finally {
      await h.admin.$executeRawUnsafe(`UPDATE tenants SET status = 'active' WHERE id = $1::uuid`, w.tenantId);
    }
  });

  test("ingestão: reenvio de posição já gravada depois de uma reatribuição — duplicata (204), sem quarentena", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "resend");
    const cmd = command(h, w.device, await fixNow());
    assert.equal((await h.ingestion.ingest(cmd)).kind, "stored");
    await reassign(h, w.tenantId, w.dispatchId, w.techB);
    const again = await h.ingestion.ingest(command(h, w.device, cmd.fixedAt));
    assert.deepEqual(again, { kind: "duplicate" });
    assert.equal(h.app.traccarIngestResponse(again).status, 204);
    assert.equal(await count(h, "traccar_quarantine_items", "instance_key = $1 AND external_device_key = $2", INSTANCE, w.device), 0);
  });

  test("ingestão: posição atrasada entra no histórico e não faz o latest voltar no tempo", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "late");
    const earlier = await fixNow();
    const later = await fixNow();
    assert.equal((await h.ingestion.ingest(command(h, w.device, later, -23.4, -46.4))).kind, "stored");
    assert.equal((await h.ingestion.ingest(command(h, w.device, earlier, -23.3, -46.3))).kind, "stored");
    const repo = new (await import("../src/modules/field-location/field-location-prisma.repository.js")).RlsPrismaFieldLocationRepository(h.role.client as PrismaClient);
    const latest = (await repo.listLatest({ tenantId: w.tenantId })).find((item) => item.operatorUserId === w.techA);
    assert.deepEqual([latest?.latitude, latest?.longitude], [-23.4, -46.4], "o latest é o fix mais recente, não o recebido por último");
    const history = await repo.listHistory({ tenantId: w.tenantId, operatorUserId: w.techA });
    assert.equal(history.length, 2, "a posição atrasada está no histórico");
  });

  test("ingestão: o evento sai uma vez, depois do commit, sem coordenada; não sai em quarentena, duplicata nem rollback", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "evt");
    const mine = () => h.events.filter((event) => event.tenantId === w.tenantId);
    const cmd = command(h, w.device, await fixNow());
    await h.ingestion.ingest(cmd);
    assert.equal(mine().length, 1);
    const [event] = mine();
    assert.equal(event!.name, "field_location.updated");
    assert.equal(event!.committed, true, "publicado só depois do commit (a linha já era visível a outra conexão)");
    assert.doesNotMatch(Object.keys(event!.payload).join(","), /lat|lon|lng/i);
    assert.equal(event!.payload.source, "traccar");

    await h.ingestion.ingest(command(h, w.device, cmd.fixedAt)); // duplicata
    await h.ingestion.ingest(command(h, w.device, new Date(Date.now() + 10 * 60_000))); // quarentena fix_in_future
    assert.equal(mine().length, 1, "nem duplicata nem quarentena publicam");

    const rollbackService = (await import("../src/integrations/traccar/traccar-ingestion.service.js")).createTraccarIngestionService({
      client: h.role.client as PrismaClient,
      timeoutMs: 3_000,
      resolver: { maxTenants: 500, hintTtlMs: 600_000, negativeTtlMs: 60_000, cacheMax: 10_000 },
      budgets: RELAXED_BUDGETS,
      hooks: { beforeCommit: () => { throw new Error("falha injetada antes do commit"); } },
      publish: (async () => {
        h.events.push({ name: "rollback", payload: {}, tenantId: w.tenantId, committed: false });
        return { event: {} as never, published: true };
      }) as never,
    });
    const rolledBack = await rollbackService.ingest(command(h, w.device, await fixNow(), -23.95));
    assert.equal(rolledBack.kind, "unavailable");
    assert.equal(mine().length, 1, "rollback não publica");
  });

  // Conserto do 503 (pré-revisão do #426, Achado 1). O trabalho chega ao ponto de commit DEPOIS de o listener desistir
  // (gancho `beforeCommit` lento). Sem o prazo propagado, o listener responde 503 e o trabalho grava mesmo assim: a
  // posição, o recibo e o evento saem depois do 503. A propriedade: 503 = nada gravado, nem agora nem depois.
  test("ingestão: tempo esgotado → 503 e, depois do fim do trabalho, 0 posição, 0 recibo e 0 evento", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "tmo");
    const published: string[] = [];
    let reachedCommitPoint = false;
    const slowService = (await import("../src/integrations/traccar/traccar-ingestion.service.js")).createTraccarIngestionService({
      client: h.role.client as PrismaClient,
      timeoutMs: 3_000,
      resolver: { maxTenants: 500, hintTtlMs: 600_000, negativeTtlMs: 60_000, cacheMax: 10_000 },
      budgets: RELAXED_BUDGETS,
      hooks: {
        beforeCommit: async () => {
          reachedCommitPoint = true;
          await pause(1_500); // o listener desiste aos 400 ms; o trabalho só chega à porta do commit depois
        },
      },
      publish: (async (name: string) => {
        published.push(name);
        return { event: {} as never, published: true };
      }) as never,
    });
    let work: Promise<unknown> | undefined;
    const app = h.app.createTraccarIngestApp({
      authenticator: h.auth.createTraccarForwardAuthenticator({ current: SECRET }),
      limiter: h.limit.createTraccarIngestLimiter({ ratePerSecond: 20, burst: 100, maxConcurrency: 10 }),
      ingest: (cmd, deadline) => {
        const running = slowService.ingest(cmd, deadline);
        work = running;
        return running;
      },
      instanceKey: INSTANCE,
      timeoutMs: 400,
      logger: (await import("pino")).default({ level: "silent" }),
    });
    const fix = await fixNow();
    const server: Server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    try {
      const { port } = server.address() as AddressInfo;
      const response = await fetch(`http://127.0.0.1:${port}/ingest/traccar/v1/positions`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-traccar-forward-token": SECRET },
        body: JSON.stringify(envelope(w.device, fix, -23.51, -46.61)),
      });
      assert.equal(response.status, 503);
      assert.deepEqual(await response.json(), { error: { code: "unavailable" } });
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }

    assert.ok(work, "o serviço foi chamado");
    await work!.catch(() => undefined); // espera o FIM do trabalho, não só a resposta
    assert.equal(reachedCommitPoint, true, "controle: o trabalho chegou à porta do commit depois do 503");
    assert.equal(await locationsOf(h, w.tenantId), 0, "nenhuma posição gravada depois do 503");
    assert.equal(await count(h, "traccar_ingress_receipts", "tenant_id = $1::uuid", w.tenantId), 0, "nenhum recibo gravado depois do 503");
    assert.deepEqual(published, [], "nenhum `field_location.updated` depois do 503");

    // A nova entrega do Traccar grava pela PRIMEIRA vez (não é duplicata): o 503 não deixou nada para trás.
    const retry = await h.ingestion.ingest(command(h, w.device, fix, -23.51, -46.61));
    assert.equal(retry.kind, "stored");
    assert.equal(await locationsOf(h, w.tenantId), 1);
  });

  // Conserto do 503 (Retomada 7, Achado pré-revisão): cobre quarentena DENTRO da organização (ex.: fix inválido) e
  // conflito (markConflict) com prazo esgotado (503). A mutação "claim só vale para value.kind === 'stored'"
  // (service.ts:188) deve quebrar (ficar VERMELHA) em ambos: se o claim for omitido em quarentena ou conflito, o
  // trabalho persiste o registro após o 503 ser enviado. A propriedade: 503 = nada gravado, nem agora nem depois.
  test("ingestão: tempo esgotado → 503 e, depois do fim do trabalho, quarentena interna e conflito não gravam nada", { timeout: 120_000 }, async () => {
    const h = await harness();
    const w = await world(h, "tmoqc");
    let delayWork = false;
    let hookExecuted = false;
    const slowService = (await import("../src/integrations/traccar/traccar-ingestion.service.js")).createTraccarIngestionService({
      client: h.role.client as PrismaClient,
      timeoutMs: 3_000,
      resolver: { maxTenants: 500, hintTtlMs: 600_000, negativeTtlMs: 60_000, cacheMax: 10_000 },
      budgets: RELAXED_BUDGETS,
      hooks: {
        afterBindingLocked: async () => {
          if (delayWork) {
            hookExecuted = true;
            await pause(1_500); // listener desiste aos 400 ms; o trabalho chega ao commit depois
          }
        },
      },
    });
    let work: Promise<unknown> | undefined;
    const app = h.app.createTraccarIngestApp({
      authenticator: h.auth.createTraccarForwardAuthenticator({ current: SECRET }),
      limiter: h.limit.createTraccarIngestLimiter({ ratePerSecond: 20, burst: 100, maxConcurrency: 10 }),
      ingest: (cmd, deadline) => {
        const running = slowService.ingest(cmd, deadline);
        work = running;
        return running;
      },
      instanceKey: INSTANCE,
      timeoutMs: 400,
      logger: (await import("pino")).default({ level: "silent" }),
    });
    const server: Server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    const { port } = server.address() as AddressInfo;
    const postPosition = async (body: Record<string, unknown>) => {
      const response = await fetch(`http://127.0.0.1:${port}/ingest/traccar/v1/positions`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-traccar-forward-token": SECRET },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { error?: { code?: string } };
      return { status: response.status, data };
    };

    try {
      // 1. Quarentena interna: fix inválido (valid: false) com vínculo ativo na organização.
      delayWork = true;
      hookExecuted = false;
      const fixInvalid = await fixNow();
      const resQuarantine = await postPosition(envelope(w.device, fixInvalid, -23.51, -46.61, { valid: false }));
      assert.equal(resQuarantine.status, 503, "tempo esgotado no listener");
      assert.deepEqual(resQuarantine.data, { error: { code: "unavailable" } });
      assert.ok(work, "o trabalho foi disparado");
      await work!.catch(() => undefined);
      assert.equal(hookExecuted, true, "controle: o trabalho passou pelo lockActiveBinding após o 503");
      assert.equal(await quarantineOf(h, w.device, "invalid_fix"), 0, "nenhuma quarentena gravada depois do 503");

      // 2. Prepara o recibo no banco com digest original (sem atraso).
      delayWork = false;
      const fixConflict = await fixNow();
      const resOriginal = await fetch(`http://127.0.0.1:${port}/ingest/traccar/v1/positions`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-traccar-forward-token": SECRET },
        body: JSON.stringify(envelope(w.device, fixConflict, -23.52, -46.62, { course: 90 })),
      });
      assert.equal(resOriginal.status, 204, "primeira entrega gravada com sucesso");
      await work!.catch(() => undefined);
      assert.equal(await count(h, "traccar_ingress_receipts", "tenant_id = $1::uuid", w.tenantId), 1);

      const getConflictCount = async () => {
        const rows = await h.admin.$queryRawUnsafe<Array<{ conflict_count: number }>>(
          `SELECT conflict_count FROM traccar_ingress_receipts WHERE tenant_id = $1::uuid AND instance_key = $2`,
          w.tenantId,
          INSTANCE,
        );
        return rows[0]?.conflict_count ?? 0;
      };
      assert.equal(await getConflictCount(), 0, "controle: antes da reentrega conflitante, 0 conflitos");

      // 3. markConflict: mesma chave de evento, digest diferente (course: 180), tempo esgotado.
      delayWork = true;
      hookExecuted = false;
      const resConflict = await postPosition(envelope(w.device, fixConflict, -23.52, -46.62, { course: 180 }));
      assert.equal(resConflict.status, 503, "tempo esgotado no listener na reentrega conflitante");
      assert.deepEqual(resConflict.data, { error: { code: "unavailable" } });
      assert.ok(work, "o trabalho de conflito foi disparado");
      await work!.catch(() => undefined);
      assert.equal(hookExecuted, true, "controle: o trabalho passou pelo lockActiveBinding após o 503");
      assert.equal(await getConflictCount(), 0, "nenhum conflito gravado depois do 503");
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  test("ingestão: a organização B não lê localização, recibo nem vínculo de A", { timeout: 120_000 }, async () => {
    const h = await harness();
    const a = await world(h, "isoa");
    assert.equal((await h.ingestion.ingest(command(h, a.device, await fixNow()))).kind, "stored");
    const b = await newTenant(h, "isob");
    const seen = await h.rls.withTenantRls(h.role.client as PrismaClient, b, async (tx: Prisma.TransactionClient) => ({
      locations: await tx.$queryRaw<Array<{ n: bigint }>>`SELECT count(*)::bigint AS n FROM field_operator_locations WHERE tenant_id = ${a.tenantId}::uuid`,
      receipts: await tx.$queryRaw<Array<{ n: bigint }>>`SELECT count(*)::bigint AS n FROM traccar_ingress_receipts WHERE instance_key = ${INSTANCE}`,
      bindings: await tx.$queryRaw<Array<{ n: bigint }>>`SELECT count(*)::bigint AS n FROM vehicle_tracking_bindings WHERE instance_key = ${INSTANCE}`,
    }));
    assert.deepEqual([Number(seen.locations[0]!.n), Number(seen.receipts[0]!.n), Number(seen.bindings[0]!.n)], [0, 0, 0]);
    assert.ok((await count(h, "traccar_ingress_receipts", "tenant_id = $1::uuid", a.tenantId)) >= 1, "controle: o recibo de A existe");
  });
}
