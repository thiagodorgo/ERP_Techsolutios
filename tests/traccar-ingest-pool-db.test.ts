import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";

import type { PrismaClient } from "@prisma/client";

// -----------------------------------------------------------------------------------------------
// B-TRC-01 · pool de banco PRÓPRIO da ingestão (plano v2.1 §4.1; A2-07; MUT-41). A ingestão usa um `PrismaClient`
// só dela (`traccar-db.ts`, `max = TRACCAR_DB_POOL_MAX`, `application_name=erp-traccar-ingest`); o app público fica
// com o dele (`src/database/prisma.ts`). Aqui o pool da ingestão é criado sobre a URL administrativa do cluster
// descartável: a propriedade medida é o NÚMERO de conexões, que não depende do papel (o papel efêmero do arnês não
// expõe a senha, e escrever catálogo de papel neste arquivo é vedado pelo guard de catálogo).
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("B-TRC-01 traccar-ingest-pool-db exige DATABASE_URL e um banco migrado", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suíte.",
  });
} else {
  process.env.LOG_LEVEL = "silent";

  const POOL_MAX = 5;
  const HOLD_MS = 2_000;
  const INSTANCE = `trc-pool-${randomUUID().slice(0, 8)}`;
  const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  type Harness = Awaited<ReturnType<typeof bootstrap>>;
  let harnessPromise: Promise<Harness> | undefined;
  const harness = (): Promise<Harness> => (harnessPromise ??= bootstrap());

  async function bootstrap() {
    const [{ createTraccarIngestPrismaClient, TRACCAR_INGEST_APPLICATION_NAME }, { prisma }] = await Promise.all([
      import("../src/integrations/traccar/traccar-db.js"),
      import("../src/database/prisma.js"),
    ]);
    const ingest = createTraccarIngestPrismaClient({ connectionString: connectionString!, max: POOL_MAX });
    const tenantId = (
      await prisma.$queryRawUnsafe<Array<{ id: string }>>(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, `trc-pool-${randomUUID().slice(0, 8)}`)
    )[0]!.id;
    const vehicleId = (
      await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO vehicles (tenant_id, plate, model) VALUES ($1::uuid, $2, 'Viatura sintética') RETURNING id`,
        tenantId,
        `TRC${randomUUID().slice(0, 5).toUpperCase()}`,
      )
    )[0]!.id;
    await prisma.$executeRawUnsafe(
      `INSERT INTO vehicle_tracking_bindings (tenant_id, vehicle_id, instance_key, external_device_key) VALUES ($1::uuid, $2::uuid, $3, 'trcpool01')`,
      tenantId,
      vehicleId,
      INSTANCE,
    );
    return { ingest, publicClient: prisma as PrismaClient, appName: TRACCAR_INGEST_APPLICATION_NAME, tenantId };
  }

  after(async () => {
    if (!harnessPromise) return;
    const h = await harnessPromise;
    try {
      await h.publicClient.$executeRawUnsafe(`DELETE FROM vehicle_tracking_bindings WHERE tenant_id = $1::uuid`, h.tenantId);
      await h.publicClient.$executeRawUnsafe(`DELETE FROM vehicles WHERE tenant_id = $1::uuid`, h.tenantId);
      await h.publicClient.$executeRawUnsafe(`DELETE FROM tenants WHERE id = $1::uuid`, h.tenantId);
    } finally {
      await h.ingest.$disconnect();
      await h.publicClient.$disconnect();
    }
  });

  /** Segura conexões da INGESTÃO em `FOR SHARE` sobre o vínculo, por `HOLD_MS`, em `count` transações simultâneas. */
  function holdIngestConnections(h: Harness, count: number): Promise<unknown[]> {
    return Promise.all(
      Array.from({ length: count }, () =>
        h.ingest.$transaction(
          async (tx) => {
            await tx.$queryRawUnsafe(
              `SELECT id FROM vehicle_tracking_bindings WHERE instance_key = $1 AND valid_to IS NULL FOR SHARE`,
              INSTANCE,
            );
            await pause(HOLD_MS);
          },
          { maxWait: 15_000, timeout: 15_000 },
        ),
      ),
    );
  }

  async function ingestConnections(h: Harness): Promise<number> {
    const rows = await h.publicClient.$queryRawUnsafe<Array<{ n: bigint }>>(
      `SELECT count(*)::bigint AS n FROM pg_stat_activity WHERE application_name = $1`,
      h.appName,
    );
    return Number(rows[0]!.n);
  }

  test("pool: com as conexões da ingestão presas em FOR SHARE, o client do app público responde em menos de 1 s", { timeout: 120_000 }, async () => {
    const h = await harness();
    await h.publicClient.$queryRaw`SELECT 1`;
    const holders = holdIngestConnections(h, POOL_MAX + 5);
    await pause(400);
    const startedAt = Date.now();
    await h.publicClient.$queryRaw`SELECT 1`;
    const elapsed = Date.now() - startedAt;
    assert.ok(elapsed < 1_000, `o app público esperou ${elapsed} ms`);
    assert.ok((await ingestConnections(h)) >= 1, "as conexões presas são da ingestão (application_name), não do app público");
    await holders;
  });

  test("pool: a ingestão nunca abre mais que TRACCAR_DB_POOL_MAX conexões", { timeout: 120_000 }, async () => {
    const h = await harness();
    const holders = holdIngestConnections(h, POOL_MAX * 3);
    let max = 0;
    const deadline = Date.now() + HOLD_MS;
    while (Date.now() < deadline) {
      max = Math.max(max, await ingestConnections(h));
      await pause(50);
    }
    await holders;
    assert.ok(max >= 1, "a ingestão abriu conexões com o application_name dela");
    assert.ok(max <= POOL_MAX, `a ingestão abriu ${max} conexões; o teto é ${POOL_MAX}`);
  });
}
