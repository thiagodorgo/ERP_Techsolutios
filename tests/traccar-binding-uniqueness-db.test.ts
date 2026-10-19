import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";

import type { Prisma, PrismaClient } from "@prisma/client";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";

// -----------------------------------------------------------------------------------------------
// B-TRC-01 · unicidade do vínculo rastreador→viatura e catálogo das tabelas novas (plano v2.1 §3.1, §4.3; B-02;
// MUT-04, MUT-34). Roda sob o papel efêmero NOSUPERUSER NOBYPASSRLS do arnês; semeadura e limpeza pela conexão
// administrativa, escopadas pelas organizações e pela chave de instância DESTA rodada (nunca por curinga).
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("B-TRC-01 traccar-binding-uniqueness-db exige DATABASE_URL e um banco migrado", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suíte.",
  });
} else {
  process.env.LOG_LEVEL = "silent";

  type Harness = Awaited<ReturnType<typeof bootstrap>>;
  let harnessPromise: Promise<Harness> | undefined;
  const harness = (): Promise<Harness> => (harnessPromise ??= bootstrap());
  const INSTANCE = `trc-uniq-${randomUUID().slice(0, 8)}`;

  async function bootstrap() {
    const [{ PrismaPg }, { PrismaClient }, rls] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
      import("../src/database/rls.js"),
    ]);
    const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });
    const role: EphemeralRole = await createEphemeralRole(admin, connectionString!);
    return { admin, role, rls, tenants: [] as string[] };
  }

  after(async () => {
    if (!harnessPromise) return;
    const h = await harnessPromise;
    try {
      const ids = [...h.tenants];
      if (ids.length > 0) {
        await h.admin.$executeRawUnsafe(`DELETE FROM vehicle_telemetry_events WHERE tenant_id = ANY($1::uuid[])`, ids);
        await h.admin.$executeRawUnsafe(`DELETE FROM traccar_ingress_receipts WHERE tenant_id = ANY($1::uuid[])`, ids);
        await h.admin.$executeRawUnsafe(`DELETE FROM vehicle_tracking_bindings WHERE tenant_id = ANY($1::uuid[])`, ids);
        await h.admin.$executeRawUnsafe(`DELETE FROM vehicles WHERE tenant_id = ANY($1::uuid[])`, ids);
        await h.admin.$executeRawUnsafe(`DELETE FROM tenants WHERE id = ANY($1::uuid[])`, ids);
      }
      await h.admin.$executeRawUnsafe(`DELETE FROM traccar_quarantine_items WHERE instance_key = $1`, INSTANCE);
    } finally {
      await h.role.drop();
      await h.admin.$disconnect();
    }
  });

  async function newTenant(h: Harness, tag: string): Promise<string> {
    const slug = `trc-uniq-${tag}-${randomUUID().slice(0, 8)}`;
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`,
      slug,
    );
    h.tenants.push(rows[0]!.id);
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

  function asTenant<T>(h: Harness, tenantId: string, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return h.rls.withTenantRls(h.role.client as PrismaClient, tenantId, work);
  }

  async function bindAs(h: Harness, tenantId: string, vehicleId: string, device: string): Promise<void> {
    await asTenant(h, tenantId, (tx) =>
      tx.$executeRaw`INSERT INTO vehicle_tracking_bindings (tenant_id, vehicle_id, instance_key, external_device_key)
        VALUES (${tenantId}::uuid, ${vehicleId}::uuid, ${INSTANCE}, ${device})`,
    );
  }

  function sqlState(error: unknown): string | undefined {
    const text = JSON.stringify(error, Object.getOwnPropertyNames(error ?? {})) ?? "";
    return /23505|unique constraint|duplicate key/i.test(text) ? "23505" : undefined;
  }

  test("vínculo: com o dispositivo ativo em A, o INSERT ativo em B falha com 23505 embora B não enxergue A", { timeout: 120_000 }, async () => {
    const h = await harness();
    const [a, b] = [await newTenant(h, "a1"), await newTenant(h, "b1")];
    const [va, vb] = [await newVehicle(h, a), await newVehicle(h, b)];
    const device = `dev-${randomUUID().slice(0, 8)}`;
    await bindAs(h, a, va, device);

    const visibleToB = await asTenant(h, b, (tx) =>
      tx.$queryRaw<Array<{ n: bigint }>>`SELECT count(*)::bigint AS n FROM vehicle_tracking_bindings
        WHERE instance_key = ${INSTANCE} AND external_device_key = ${device}`,
    );
    assert.equal(Number(visibleToB[0]!.n), 0, "B não pode enxergar o vínculo de A");

    await assert.rejects(() => bindAs(h, b, vb, device), (error) => sqlState(error) === "23505");
  });

  test("vínculo: sob B, `ON CONFLICT DO NOTHING` volta 0 linhas sem erro", { timeout: 120_000 }, async () => {
    const h = await harness();
    const [a, b] = [await newTenant(h, "a2"), await newTenant(h, "b2")];
    const [va, vb] = [await newVehicle(h, a), await newVehicle(h, b)];
    const device = `dev-${randomUUID().slice(0, 8)}`;
    await bindAs(h, a, va, device);

    const inserted = await asTenant(h, b, (tx) =>
      tx.$queryRaw<Array<{ id: string }>>`INSERT INTO vehicle_tracking_bindings (tenant_id, vehicle_id, instance_key, external_device_key)
        VALUES (${b}::uuid, ${vb}::uuid, ${INSTANCE}, ${device})
        ON CONFLICT (instance_key, external_device_key) WHERE valid_to IS NULL DO NOTHING
        RETURNING id`,
    );
    assert.equal(inserted.length, 0);
  });

  test("vínculo: na mesma organização, nem dispositivo ativo duplicado nem viatura com dois rastreadores ativos", { timeout: 120_000 }, async () => {
    const h = await harness();
    const a = await newTenant(h, "a3");
    const [v1, v2] = [await newVehicle(h, a), await newVehicle(h, a)];
    const device = `dev-${randomUUID().slice(0, 8)}`;
    await bindAs(h, a, v1, device);
    await assert.rejects(() => bindAs(h, a, v2, device), (error) => sqlState(error) === "23505", "segunda viatura com o mesmo rastreador");
    await assert.rejects(
      () => bindAs(h, a, v1, `dev-${randomUUID().slice(0, 8)}`),
      (error) => sqlState(error) === "23505",
      "mesma viatura com segundo rastreador ativo",
    );
  });

  test("vínculo: desativado em A (delete lógico), B vincula o mesmo dispositivo", { timeout: 120_000 }, async () => {
    const h = await harness();
    const [a, b] = [await newTenant(h, "a4"), await newTenant(h, "b4")];
    const [va, vb] = [await newVehicle(h, a), await newVehicle(h, b)];
    const device = `dev-${randomUUID().slice(0, 8)}`;
    await bindAs(h, a, va, device);
    await asTenant(h, a, (tx) =>
      tx.$executeRaw`UPDATE vehicle_tracking_bindings SET valid_to = now(), updated_at = now()
        WHERE instance_key = ${INSTANCE} AND external_device_key = ${device} AND valid_to IS NULL`,
    );
    await bindAs(h, b, vb, device);
    const active = await h.admin.$queryRawUnsafe<Array<{ tenant_id: string }>>(
      `SELECT tenant_id FROM vehicle_tracking_bindings WHERE instance_key = $1 AND external_device_key = $2 AND valid_to IS NULL`,
      INSTANCE,
      device,
    );
    assert.deepEqual(active.map((row) => row.tenant_id), [b]);
  });

  test("catálogo: FORCE nas duas tabelas por organização, zero `pg_rules`, nenhuma função de privilégio elevado nova, guard do runtime limpo", { timeout: 120_000 }, async () => {
    const h = await harness();
    const force = await h.admin.$queryRawUnsafe<Array<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }>>(
      `SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class
        WHERE relnamespace = 'public'::regnamespace
          AND relname IN ('vehicle_tracking_bindings', 'traccar_ingress_receipts', 'traccar_quarantine_items')
        ORDER BY relname`,
    );
    assert.deepEqual(
      force.map((row) => [row.relname, row.relrowsecurity, row.relforcerowsecurity]),
      [
        ["traccar_ingress_receipts", true, true],
        ["traccar_quarantine_items", false, false],
        ["vehicle_tracking_bindings", true, true],
      ],
    );

    const rules = await h.admin.$queryRawUnsafe<Array<{ n: bigint }>>(
      `SELECT count(*)::bigint AS n FROM pg_rules
        WHERE schemaname = 'public'
          AND tablename IN ('vehicle_tracking_bindings', 'traccar_ingress_receipts', 'traccar_quarantine_items', 'field_dispatches', 'field_operator_locations')`,
    );
    assert.equal(Number(rules[0]!.n), 0, "nenhuma regra de tabela (P-SAN3-05-REGRA-EM-TABELA)");

    const elevated = await h.admin.$queryRawUnsafe<Array<{ proname: string }>>(
      `SELECT p.proname FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.prosecdef ORDER BY p.proname`,
    );
    assert.deepEqual(elevated.map((row) => row.proname), ["auth_login_candidates"], "a única função elevada continua a de antes");

    const trigger = await h.admin.$queryRawUnsafe<Array<{ prosecdef: boolean; tgname: string; tgenabled: string }>>(
      `SELECT p.prosecdef, t.tgname::text AS tgname, t.tgenabled::text AS tgenabled FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid
        WHERE t.tgrelid = 'public.field_dispatches'::regclass AND p.proname = 'field_dispatch_operator_assigned_at'`,
    );
    assert.equal(trigger.length, 1, "o gatilho de operator_assigned_at existe");
    assert.equal(trigger[0]!.prosecdef, false);
    assert.equal(trigger[0]!.tgenabled, "O");

    const { RUNTIME_ROLE_GUARD_SQL } = await import("../src/database/runtime-role.js");
    const escapes = await (h.role.client as PrismaClient).$queryRawUnsafe<Array<{ via: string; is_self: boolean }>>(RUNTIME_ROLE_GUARD_SQL);
    assert.deepEqual(escapes, [], "o papel efêmero não escapa de FORCE por atributo, posse nem view");
  });

  test("catálogo: a quarentena não tem coluna de coordenada, de payload nem de organização", { timeout: 120_000 }, async () => {
    const h = await harness();
    const columns = await h.admin.$queryRawUnsafe<Array<{ column_name: string }>>(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'traccar_quarantine_items' ORDER BY ordinal_position`,
    );
    const names = columns.map((row) => row.column_name);
    // Allowlist FECHADA (§4.5): qualquer coluna a mais — coordenada, payload, organização, dado do device — reprova.
    assert.deepEqual(names, [
      "id",
      "instance_key",
      "external_device_key",
      "reason",
      "first_seen_at",
      "last_seen_at",
      "first_fix_at",
      "last_fix_at",
      "delivery_count",
      "last_event_key",
      "last_payload_digest",
      "resolved_at",
      "resolution",
    ]);
    for (const name of names) {
      assert.doesNotMatch(name, /lat|lon|lng|coord|tenant|attributes|phone|contact|^payload$|body|raw/i, `coluna proibida: ${name}`);
    }
  });
}
