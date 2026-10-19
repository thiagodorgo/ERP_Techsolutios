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
// B-TRC-01 · quarentena contra o PostgreSQL real (plano v2.1 §4.5; B-05; MUT-13, MUT-14, MUT-29). Tabela GLOBAL,
// sem organização, sem coordenada, sem payload; um episódio aberto por (instância, dispositivo, motivo). Papel
// efêmero NOSUPERUSER NOBYPASSRLS; limpeza escopada pela chave de instância desta rodada.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = JSON.parse(
  readFileSync(path.join(ROOT, "infra", "traccar", "fixtures", "6.16.0", "position-osmand.json"), "utf8"),
) as { position: Record<string, unknown>; device: Record<string, unknown> };

if (!connectionString) {
  test("B-TRC-01 traccar-quarantine-db exige DATABASE_URL e um banco migrado", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suíte.",
  });
} else {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "prisma";

  const INSTANCE = `trc-quar-${randomUUID().slice(0, 8)}`;
  const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  // Orçamento de tempo RELAXADO só para a suíte paralela (dezenas de arquivos no mesmo cluster, no Windows): com o
  // `maxWait` de 250 ms do plano, a transação às vezes nem começa (P2028) e o caso vira 503, que não é o que ele mede.
  // O orçamento do plano é provado no `traccar-resolution-race-db` (503 antes de 3 s; MUT-40), que usa o default.
  const RELAXED_BUDGETS = { phaseTwo: { maxWait: 5_000, timeout: 10_000 }, discovery: { maxWait: 5_000, timeout: 10_000 } };

  type Harness = Awaited<ReturnType<typeof bootstrap>>;
  let harnessPromise: Promise<Harness> | undefined;
  const harness = (): Promise<Harness> => (harnessPromise ??= bootstrap());

  async function bootstrap() {
    const [{ PrismaPg }, { PrismaClient }, rls, service, schema, adapter, app] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
      import("../src/database/rls.js"),
      import("../src/integrations/traccar/traccar-ingestion.service.js"),
      import("../src/integrations/traccar/traccar-position.schema.js"),
      import("../src/integrations/traccar/traccar-position.adapter.js"),
      import("../src/integrations/traccar/traccar-ingest.app.js"),
    ]);
    const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });
    const role: EphemeralRole = await createEphemeralRole(admin, connectionString!);
    const ingestion = service.createTraccarIngestionService({
      client: role.client as PrismaClient,
      timeoutMs: 3_000,
      resolver: { maxTenants: 500, hintTtlMs: 600_000, negativeTtlMs: 60_000, cacheMax: 10_000 },
      budgets: RELAXED_BUDGETS,
      publish: (async () => ({ event: {} as never, published: true })) as never,
    });
    return { admin, role, rls, schema, adapter, app, ingestion, tenants: [] as string[] };
  }

  after(async () => {
    if (!harnessPromise) return;
    const h = await harnessPromise;
    try {
      const ids = [...h.tenants];
      if (ids.length > 0) {
        for (const table of ["vehicle_telemetry_events", "traccar_ingress_receipts", "field_operator_locations", "vehicle_tracking_bindings", "vehicles"]) {
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

  function command(h: Harness, device: string, fixAt: Date, extra: Record<string, unknown> = {}) {
    const body = structuredClone(FIXTURE);
    body.device.uniqueId = device;
    body.position.fixTime = fixAt.toISOString();
    Object.assign(body.position, extra);
    return h.adapter.buildTraccarPositionCommand(h.schema.parseTraccarPositionEnvelope(body), { instanceKey: INSTANCE, receivedAt: new Date() });
  }

  async function boundDevice(h: Harness, tag: string): Promise<{ tenantId: string; device: string }> {
    const tenants = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`,
      `trc-quar-${tag}-${randomUUID().slice(0, 8)}`,
    );
    const tenantId = tenants[0]!.id;
    h.tenants.push(tenantId);
    const vehicles = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO vehicles (tenant_id, plate, model) VALUES ($1::uuid, $2, 'Viatura sintética') RETURNING id`,
      tenantId,
      `TRC${randomUUID().slice(0, 5).toUpperCase()}`,
    );
    const device = `dev${randomUUID().slice(0, 8)}`;
    await h.rls.withTenantRls(h.role.client as PrismaClient, tenantId, (tx) =>
      tx.$executeRaw`INSERT INTO vehicle_tracking_bindings (tenant_id, vehicle_id, instance_key, external_device_key)
        VALUES (${tenantId}::uuid, ${vehicles[0]!.id}::uuid, ${INSTANCE}, ${device})`,
    );
    await pause(60);
    return { tenantId, device };
  }

  type QuarantineRow = {
    reason: string;
    delivery_count: number;
    first_fix_at: Date;
    last_fix_at: Date;
    resolved_at: Date | null;
  };
  function rowsOf(h: Harness, device: string): Promise<QuarantineRow[]> {
    return h.admin.$queryRawUnsafe<QuarantineRow[]>(
      `SELECT reason, delivery_count, first_fix_at, last_fix_at, resolved_at FROM traccar_quarantine_items
        WHERE instance_key = $1 AND external_device_key = $2 ORDER BY first_seen_at, id`,
      INSTANCE,
      device,
    );
  }

  test("quarentena: dispositivo sem vínculo — 202, uma linha aberta, nenhuma localização nem recibo", { timeout: 120_000 }, async () => {
    const h = await harness();
    const device = `orphan${randomUUID().slice(0, 8)}`;
    const outcome = await h.ingestion.ingest(command(h, device, new Date()));
    assert.deepEqual(outcome, { kind: "quarantined", reason: "unmapped_device" });
    assert.equal(h.app.traccarIngestResponse(outcome).status, 202);
    const rows = await rowsOf(h, device);
    assert.deepEqual(rows.map((row) => [row.reason, row.delivery_count, row.resolved_at]), [["unmapped_device", 1, null]]);
    const writes = await h.admin.$queryRawUnsafe<Array<{ n: bigint }>>(
      `SELECT ((SELECT count(*) FROM traccar_ingress_receipts WHERE instance_key = $1)
             + (SELECT count(*) FROM field_operator_locations WHERE source = 'traccar' AND metadata::text = '{}' AND recorded_at > now() - interval '1 minute' AND tenant_id = ANY($2::uuid[])))::bigint AS n`,
      INSTANCE,
      h.tenants.length > 0 ? h.tenants : ["00000000-0000-0000-0000-000000000000"],
    );
    assert.equal(Number(writes[0]!.n), 0);
  });

  test("quarentena: 20 entregas concorrentes — 1 linha, `delivery_count = 20`", { timeout: 120_000 }, async () => {
    const h = await harness();
    const device = `burst${randomUUID().slice(0, 8)}`;
    const base = Date.now();
    // Aquecimento: a 1ª entrega varre e grava o cache negativo; o episódio dela é fechado, para que as 20 seguintes
    // disputem só a gravação da quarentena (sem 20 descobertas brigando pelo pool de 10 do papel de teste — na
    // produção o limite de concorrência do listener é 10).
    await h.ingestion.ingest(command(h, device, new Date(base - 60_000)));
    await h.admin.$executeRawUnsafe(
      `UPDATE traccar_quarantine_items SET resolved_at = now(), resolution = 'aquecimento do teste'
        WHERE instance_key = $1 AND external_device_key = $2`,
      INSTANCE,
      device,
    );
    const outcomes = await Promise.all(
      Array.from({ length: 20 }, (_, index) => h.ingestion.ingest(command(h, device, new Date(base - index * 1_000)))),
    );
    assert.ok(outcomes.every((outcome) => h.app.traccarIngestResponse(outcome).status === 202), JSON.stringify(outcomes));
    const open = (await rowsOf(h, device)).filter((row) => row.resolved_at === null);
    assert.equal(open.length, 1, "um episódio aberto, não vinte");
    assert.equal(open[0]!.delivery_count, 20, "a contagem não perde entrega");
  });

  test("quarentena: episódio resolvido não reabre — a entrega seguinte abre outro", { timeout: 120_000 }, async () => {
    const h = await harness();
    const device = `resolved${randomUUID().slice(0, 8)}`;
    await h.ingestion.ingest(command(h, device, new Date()));
    await h.admin.$executeRawUnsafe(
      `UPDATE traccar_quarantine_items SET resolved_at = now(), resolution = 'descartado no teste'
        WHERE instance_key = $1 AND external_device_key = $2`,
      INSTANCE,
      device,
    );
    // o cache negativo do processo também vale aqui: a 2ª entrega vai direto à quarentena, sem varrer.
    await h.ingestion.ingest(command(h, device, new Date()));
    const rows = await rowsOf(h, device);
    assert.equal(rows.length, 2);
    assert.deepEqual(rows.map((row) => [row.delivery_count, row.resolved_at === null]), [[1, false], [1, true]]);
  });

  test("quarentena: `fixTime` anterior ao `valid_from` do vínculo — `fix_before_active_binding`", { timeout: 120_000 }, async () => {
    const h = await harness();
    const before = new Date(Date.now() - 60 * 60_000);
    const { device } = await boundDevice(h, "before");
    const outcome = await h.ingestion.ingest(command(h, device, before));
    assert.deepEqual(outcome, { kind: "quarantined", reason: "fix_before_active_binding" });
    assert.deepEqual((await rowsOf(h, device)).map((row) => row.reason), ["fix_before_active_binding"]);
  });

  test("quarentena: `valid=false` — `invalid_fix`", { timeout: 120_000 }, async () => {
    const h = await harness();
    const { device } = await boundDevice(h, "invalid");
    const outcome = await h.ingestion.ingest(command(h, device, new Date(), { valid: false }));
    assert.deepEqual(outcome, { kind: "quarantined", reason: "invalid_fix" });
    assert.deepEqual((await rowsOf(h, device)).map((row) => row.reason), ["invalid_fix"]);
  });

  test("quarentena: `first_fix_at`/`last_fix_at` acompanham o mínimo e o máximo", { timeout: 120_000 }, async () => {
    const h = await harness();
    const device = `window${randomUUID().slice(0, 8)}`;
    const middle = new Date(Date.now() - 30 * 60_000);
    const earliest = new Date(middle.getTime() - 10 * 60_000);
    const latest = new Date(middle.getTime() + 10 * 60_000);
    for (const fix of [middle, earliest, latest, middle]) {
      await h.ingestion.ingest(command(h, device, fix));
    }
    const [row] = await rowsOf(h, device);
    assert.equal(row!.delivery_count, 4);
    assert.equal(row!.first_fix_at.toISOString(), earliest.toISOString());
    assert.equal(row!.last_fix_at.toISOString(), latest.toISOString());
  });
}
