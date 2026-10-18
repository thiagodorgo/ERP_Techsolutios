import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import type { PrismaClient } from "@prisma/client";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";
import {
  assertApplicationNamePropagated,
  buildApplicationName,
  countBlockedStatements,
  waitForOwnBlockedStatement,
  withApplicationName,
} from "./helpers/pg-barrier.js";

// -----------------------------------------------------------------------------------------------
// B-TRC-01 · a janela fechada da confirmação, com BARREIRA entre conexões (plano v2.1 §4.3, §4.6; B-02, A2-03;
// MUT-04, MUT-05, MUT-40). A ingestão roda sob o papel efêmero NOSUPERUSER NOBYPASSRLS; o "outro escritor" (quem
// desativa ou segura o vínculo) é uma conexão administrativa própria. As barreiras só aceitam statement bloqueado
// das conexões DESTA suíte (`application_name`).
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = JSON.parse(
  readFileSync(path.join(ROOT, "infra", "traccar", "fixtures", "6.16.0", "position-osmand.json"), "utf8"),
) as { position: Record<string, unknown>; device: Record<string, unknown> };

if (!connectionString) {
  test("B-TRC-01 traccar-resolution-race-db exige DATABASE_URL e um banco migrado", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suíte.",
  });
} else {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "prisma";

  const INSTANCE = `trc-race-${randomUUID().slice(0, 8)}`;
  const APP_INGEST = buildApplicationName("trc-race-ingest");
  const APP_WRITER = buildApplicationName("trc-race-writer");
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
    const [{ PrismaPg }, { PrismaClient }, rls, dispatch, service, schema, adapter] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
      import("../src/database/rls.js"),
      import("../src/modules/field-dispatch/field-dispatch-prisma.repository.js"),
      import("../src/integrations/traccar/traccar-ingestion.service.js"),
      import("../src/integrations/traccar/traccar-position.schema.js"),
      import("../src/integrations/traccar/traccar-position.adapter.js"),
    ]);
    const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });
    const writer = new PrismaClient({ adapter: new PrismaPg({ connectionString: withApplicationName(connectionString!, APP_WRITER) }) });
    const role: EphemeralRole = await createEphemeralRole(admin, withApplicationName(connectionString!, APP_INGEST));
    await assertApplicationNamePropagated(role.client as never, APP_INGEST);
    await assertApplicationNamePropagated(writer as never, APP_WRITER);
    const makeService = (hooks: Record<string, () => unknown> = {}, budgets: typeof RELAXED_BUDGETS | undefined = RELAXED_BUDGETS) =>
      service.createTraccarIngestionService({
        client: role.client as PrismaClient,
        timeoutMs: 3_000,
        resolver: { maxTenants: 500, hintTtlMs: 600_000, negativeTtlMs: 60_000, cacheMax: 10_000 },
        budgets,
        hooks: hooks as never,
        publish: (async () => ({ event: {} as never, published: true })) as never,
      });
    return { admin, writer, role, rls, dispatch, schema, adapter, makeService, tenants: [] as string[] };
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
      await h.writer.$disconnect();
      await h.admin.$disconnect();
    }
  });

  async function adminId(h: Harness, sql: string, ...values: unknown[]): Promise<string> {
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(sql, ...values);
    return rows[0]!.id;
  }
  async function newTenant(h: Harness, tag: string): Promise<string> {
    const id = await adminId(h, `INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, `trc-race-${tag}-${randomUUID().slice(0, 8)}`);
    h.tenants.push(id);
    return id;
  }
  const newVehicle = (h: Harness, tenantId: string) =>
    adminId(h, `INSERT INTO vehicles (tenant_id, plate, model) VALUES ($1::uuid, $2, 'Viatura sintética') RETURNING id`, tenantId, `TRC${randomUUID().slice(0, 5).toUpperCase()}`);
  async function bindAs(h: Harness, tenantId: string, vehicleId: string, device: string): Promise<void> {
    await h.rls.withTenantRls(h.role.client as PrismaClient, tenantId, (tx) =>
      tx.$executeRaw`INSERT INTO vehicle_tracking_bindings (tenant_id, vehicle_id, instance_key, external_device_key)
        VALUES (${tenantId}::uuid, ${vehicleId}::uuid, ${INSTANCE}, ${device})`,
    );
  }
  /** Organização A com o rastreador vinculado e um técnico com despacho aceito. */
  async function worldA(h: Harness, tag: string) {
    const tenantId = await newTenant(h, tag);
    const vehicleId = await newVehicle(h, tenantId);
    const techId = await adminId(h, `INSERT INTO users (tenant_id, name, email) VALUES ($1::uuid, 'Técnico', $2) RETURNING id`, tenantId, `trc-race-${randomUUID().slice(0, 8)}@example.com`);
    const workOrderId = await adminId(h, `INSERT INTO work_orders (tenant_id, code, title, vehicle_id) VALUES ($1::uuid, $2, 'OS', $3::uuid) RETURNING id`, tenantId, `TRC-${randomUUID().slice(0, 8)}`, vehicleId);
    const device = `dev${randomUUID().slice(0, 8)}`;
    await bindAs(h, tenantId, vehicleId, device);
    await pause(STEP_MS);
    const dispatch = await h.rls.withTenantRls(h.role.client as PrismaClient, tenantId, (tx) =>
      new h.dispatch.PrismaFieldDispatchRepository(tx).create({ tenantId, workOrderId, operatorUserId: techId, status: "assigned" }),
    );
    await pause(STEP_MS);
    await h.rls.withTenantRls(h.role.client as PrismaClient, tenantId, (tx) =>
      new h.dispatch.PrismaFieldDispatchRepository(tx).changeStatus({ tenantId, dispatchId: dispatch.id, status: "accepted" }),
    );
    await pause(STEP_MS);
    return { tenantId, vehicleId, techId, device };
  }
  function command(h: Harness, device: string) {
    const body = structuredClone(FIXTURE);
    body.device.uniqueId = device;
    body.position.fixTime = new Date().toISOString();
    return h.adapter.buildTraccarPositionCommand(h.schema.parseTraccarPositionEnvelope(body), { instanceKey: INSTANCE, receivedAt: new Date() });
  }
  async function writesIn(h: Harness, tenantId: string): Promise<{ receipts: number; locations: number }> {
    const rows = await h.admin.$queryRawUnsafe<Array<{ receipts: bigint; locations: bigint }>>(
      `SELECT (SELECT count(*) FROM traccar_ingress_receipts WHERE tenant_id = $1::uuid)::bigint AS receipts,
              (SELECT count(*) FROM field_operator_locations WHERE tenant_id = $1::uuid AND source = 'traccar')::bigint AS locations`,
      tenantId,
    );
    return { receipts: Number(rows[0]!.receipts), locations: Number(rows[0]!.locations) };
  }
  function deactivateBy(client: PrismaClient, device: string) {
    return client.$executeRawUnsafe(
      `UPDATE vehicle_tracking_bindings SET valid_to = now(), updated_at = now()
        WHERE instance_key = $1 AND external_device_key = $2 AND valid_to IS NULL`,
      INSTANCE,
      device,
    );
  }
  function isUniqueViolation(error: unknown): boolean {
    const text = JSON.stringify(error, Object.getOwnPropertyNames(error ?? {})) ?? "";
    return /23505|unique constraint|duplicate key/i.test(text);
  }

  test("corrida: a desativação concorrente ESPERA a ingestão confirmada terminar, e a posição fica em A", { timeout: 120_000 }, async () => {
    const h = await harness();
    const a = await worldA(h, "wait");
    let reached!: () => void;
    const lockedAt = new Promise<void>((resolve) => (reached = resolve));
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const service = h.makeService({ afterBindingLocked: async () => { reached(); await gate; } });

    const ingestion = service.ingest(command(h, a.device));
    await lockedAt; // a ingestão está DENTRO da fase 2, com o vínculo em FOR SHARE
    let deactivatedAt = 0;
    const deactivation = deactivateBy(h.writer, a.device).then(() => (deactivatedAt = Date.now()));
    await waitForOwnBlockedStatement(h.admin as never, {
      applicationName: APP_WRITER,
      fragment: "vehicle_tracking_bindings",
      label: "a desativação tem de esperar o FOR SHARE da ingestão",
      timeoutMs: 5_000, // folgado: na suíte paralela o UPDATE pode demorar a chegar ao banco; sem trava ele nunca bloqueia (MUT-05)
    });
    const storedAt = await (async () => {
      release();
      const outcome = await ingestion;
      assert.equal(outcome.kind, "stored");
      return Date.now();
    })();
    await deactivation;
    assert.ok(deactivatedAt >= storedAt - 5, "a desativação só terminou depois do commit da ingestão");
    assert.deepEqual(await writesIn(h, a.tenantId), { receipts: 1, locations: 1 }, "a posição ficou em A");
  });

  test("corrida: a ingestão que começa durante uma desativação em voo confirma 0 e não grava em A", { timeout: 120_000 }, async () => {
    const h = await harness();
    const a = await worldA(h, "inflight");
    let commitDeactivation!: () => void;
    const holdDeactivation = new Promise<void>((resolve) => (commitDeactivation = resolve));
    let deactivationStarted!: () => void;
    const started = new Promise<void>((resolve) => (deactivationStarted = resolve));
    const deactivation = h.writer.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe(
          `UPDATE vehicle_tracking_bindings SET valid_to = now(), updated_at = now()
            WHERE instance_key = $1 AND external_device_key = $2 AND valid_to IS NULL`,
          INSTANCE,
          a.device,
        );
        deactivationStarted();
        await holdDeactivation;
      },
      { maxWait: 5_000, timeout: 10_000 },
    );
    await started;
    const ingestion = h.makeService().ingest(command(h, a.device));
    await waitForOwnBlockedStatement(h.admin as never, {
      applicationName: APP_INGEST,
      fragment: "vehicle_tracking_bindings",
      label: "o FOR SHARE da ingestão tem de esperar a desativação em voo",
      timeoutMs: 10_000, // conta até o FOR SHARE ESPERAR (descoberta antes, sob carga, pode levar mais de 1 s); a espera em si é limitada pelo lock_timeout
    });
    commitDeactivation();
    await deactivation;
    const outcome = await ingestion;
    assert.deepEqual(outcome, { kind: "quarantined", reason: "unmapped_device" }, "a re-checagem viu zero vínculos e a redescoberta não achou");
    assert.deepEqual(await writesIn(h, a.tenantId), { receipts: 0, locations: 0 }, "nada gravado em A");
  });

  test("corrida: o vínculo ativo em B falha enquanto A está ativo e passa depois da desativação", { timeout: 120_000 }, async () => {
    const h = await harness();
    const a = await worldA(h, "ab");
    const b = await newTenant(h, "ab-b");
    const vb = await newVehicle(h, b);
    await assert.rejects(() => bindAs(h, b, vb, a.device), isUniqueViolation);
    await deactivateBy(h.writer, a.device);
    await bindAs(h, b, vb, a.device);
    const active = await h.admin.$queryRawUnsafe<Array<{ tenant_id: string }>>(
      `SELECT tenant_id::text FROM vehicle_tracking_bindings WHERE instance_key = $1 AND external_device_key = $2 AND valid_to IS NULL`,
      INSTANCE,
      a.device,
    );
    assert.deepEqual(active.map((row) => row.tenant_id), [b]);
  });

  test("corrida: em nenhum instante amostrado há dois vínculos ativos do mesmo dispositivo", { timeout: 120_000 }, async () => {
    const h = await harness();
    const a = await worldA(h, "sample");
    const b = await newTenant(h, "sample-b");
    const vb = await newVehicle(h, b);
    let stop = false;
    let samples = 0;
    let maxActive = 0;
    let bWon = false;
    const sampler = (async () => {
      while (!stop) {
        const rows = await h.admin.$queryRawUnsafe<Array<{ n: bigint }>>(
          `SELECT count(*)::bigint AS n FROM vehicle_tracking_bindings WHERE instance_key = $1 AND external_device_key = $2 AND valid_to IS NULL`,
          INSTANCE,
          a.device,
        );
        samples += 1;
        maxActive = Math.max(maxActive, Number(rows[0]!.n));
      }
    })();
    const claimer = (async () => {
      for (let attempt = 0; attempt < 200 && !bWon; attempt++) {
        try {
          await bindAs(h, b, vb, a.device);
          bWon = true;
        } catch (error) {
          if (!isUniqueViolation(error)) throw error;
          await pause(5);
        }
      }
    })();
    await pause(300);
    await deactivateBy(h.writer, a.device);
    await claimer;
    await pause(100);
    stop = true;
    await sampler;
    assert.ok(bWon, "B vinculou depois da desativação de A");
    assert.ok(samples >= 10, `amostras: ${samples}`);
    assert.equal(maxActive, 1, "nunca dois vínculos ativos ao mesmo tempo");
  });

  test("corrida: com o vínculo preso por 4 s noutra conexão, a ingestão responde 503 antes de 3 s, sem recibo nem localização", { timeout: 120_000 }, async () => {
    const h = await harness();
    const a = await worldA(h, "held");
    let locked!: () => void;
    const isLocked = new Promise<void>((resolve) => (locked = resolve));
    const holder = h.writer.$transaction(
      async (tx) => {
        await tx.$queryRawUnsafe(
          `SELECT id FROM vehicle_tracking_bindings WHERE instance_key = $1 AND external_device_key = $2 AND valid_to IS NULL FOR UPDATE`,
          INSTANCE,
          a.device,
        );
        locked();
        await pause(4_000);
      },
      { maxWait: 5_000, timeout: 10_000 },
    );
    await isLocked;
    const startedAt = Date.now();
    const outcome = await h.makeService({}, undefined).ingest(command(h, a.device));
    const elapsed = Date.now() - startedAt;
    assert.equal(outcome.kind, "unavailable");
    assert.ok(elapsed < 3_000, `respondeu em ${elapsed} ms`);
    assert.deepEqual(await writesIn(h, a.tenantId), { receipts: 0, locations: 0 });
    assert.equal(await countBlockedStatements(h.admin as never, { fragment: "vehicle_tracking_bindings", applicationName: APP_INGEST }), 0, "nada da ingestão ficou esperando a trava");
    await holder;
  });
}
