import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

import {
  backfillTenant,
  buildAmbiguousMatches,
  chunk,
  computeGroupConfidence,
  findUnidentifiedMatchSuggestions,
  pickFirstNonNull,
  type ProcessRecord,
} from "../scripts/backfill-third-party-vehicle-identity.js";

// ── helpers PUROS (sem banco) ──────────────────────────────────────────────────────────────

test("chunk: parte um array em lotes do tamanho pedido, preservando o resto no último lote", () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(chunk([], 500), []);
  assert.deepEqual(chunk([1, 2], 500), [[1, 2]]);
});

test("pickFirstNonNull: retorna o primeiro valor não-nulo/não-vazio do grupo, na ordem de chegada", () => {
  const records = [{ v: null }, { v: "" }, { v: "Fiat" }, { v: "Volks" }] as const;
  assert.equal(pickFirstNonNull(records, "v"), "Fiat");
  assert.equal(pickFirstNonNull([{ v: null }], "v"), null);
});

test("computeGroupConfidence: CONFIRMED se QUALQUER processo do grupo tem vistoria completa; senão PROVISIONAL", () => {
  assert.equal(
    computeGroupConfidence([{ intake_inspection: null }, { intake_inspection: { completed_at: new Date() } }]),
    "CONFIRMED",
  );
  assert.equal(computeGroupConfidence([{ intake_inspection: null }, { intake_inspection: { completed_at: null } }]), "PROVISIONAL");
  assert.equal(computeGroupConfidence([]), "PROVISIONAL");
});

test("findUnidentifiedMatchSuggestions: NÃO sugere fora da janela de horas nem sem sinal de marca/modelo/cor", () => {
  const yardId = "yard-1";
  const base = new Date("2026-01-01T00:00:00Z");
  const withinWindow = new Date(base.getTime() + 10 * 3_600_000);
  const outsideWindow = new Date(base.getTime() + 200 * 3_600_000);

  const near = record({ id: "p1", yard_id: yardId, entered_at: base, vehicle_brand: "Fiat", vehicle_model: "Uno", vehicle_color: "Branco" });
  const nearMatch = record({
    id: "p2",
    yard_id: yardId,
    entered_at: withinWindow,
    vehicle_brand: "Fiat",
    vehicle_model: "Uno",
    vehicle_color: "Branco",
  });
  const farNoMatch = record({ id: "p3", yard_id: yardId, entered_at: outsideWindow, vehicle_brand: "Fiat", vehicle_model: "Uno", vehicle_color: "Branco" });
  const noSignal = record({ id: "p4", yard_id: yardId, entered_at: base });
  const differentYard = record({ id: "p5", yard_id: "yard-2", entered_at: base, vehicle_brand: "Fiat", vehicle_model: "Uno", vehicle_color: "Branco" });

  const suggestions = findUnidentifiedMatchSuggestions("tenant-x", [near, nearMatch, farNoMatch, noSignal, differentYard], 72);
  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0]!.processIdA, "p1");
  assert.equal(suggestions[0]!.processIdB, "p2");
  assert.deepEqual([...suggestions[0]!.matchedFields].sort(), ["brand", "color", "model"]);
});

test("buildAmbiguousMatches: reporta chassi/renavam/marca-modelo-cor batendo entre identidades DISTINTAS, nunca funde", () => {
  const plateGroups = new Map([
    ["AAA1111", [record({ id: "a1", vehicle_plate: "AAA1111", vehicle_chassis: "CH0001", vehicle_brand: "Fiat", vehicle_model: "Uno", vehicle_color: "Branco" })]],
    ["BBB2222", [record({ id: "b1", vehicle_plate: "BBB2222", vehicle_chassis: "CH0001", vehicle_brand: "Fiat", vehicle_model: "Uno", vehicle_color: "Branco" })]],
  ]);
  const ambiguous = buildAmbiguousMatches("tenant-x", plateGroups, []);
  assert.equal(ambiguous.length, 1);
  assert.equal(ambiguous[0]!.unitA, "plate:AAA1111");
  assert.equal(ambiguous[0]!.unitB, "plate:BBB2222");
  assert.ok(ambiguous[0]!.reasons.includes("chassi igual entre identidades distintas"));
  assert.ok(ambiguous[0]!.reasons.includes("marca/modelo/cor batendo com placas diferentes"));
});

function record(overrides: Partial<ProcessRecord>): ProcessRecord {
  return {
    id: "id",
    vehicle_plate: null,
    vehicle_chassis: null,
    vehicle_renavam: null,
    vehicle_brand: null,
    vehicle_model: null,
    vehicle_color: null,
    vehicle_year: null,
    vehicle_unidentified: false,
    unidentified_reason: null,
    yard_id: null,
    entered_at: null,
    created_at: new Date("2026-01-01T00:00:00Z"),
    intake_inspection: null,
    ...overrides,
  };
}

// ── prova viva (Postgres real, DB-gated) ───────────────────────────────────────────────────

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("Backfill de identidade de veículo (Ω-VID PR-03) requer DATABASE_URL e banco migrado", {
    skip: "Set DATABASE_URL, start PostgreSQL and run migrations to execute this test.",
  });
} else {
  test("(1) agrupa 3 processos da MESMA placa em 1 identidade; CONFIRMED se algum tem vistoria completa; idempotente numa 2ª rodada", async () => {
    const { client } = await bootstrap(connectionString);
    const tenant = await seedTenant(client, "group-confidence");
    try {
      const { withTenantRls } = await import("../src/database/rls.js");
      const profile = await seedProfile(client, tenant.id);

      const p1 = await insertProcess(client, tenant.id, profile.id, { plate: "ABC-1234" });
      const p2 = await insertProcess(client, tenant.id, profile.id, { plate: "abc1234" });
      const p3 = await insertProcess(client, tenant.id, profile.id, { plate: " ABC 1234 " });
      await insertCompletedInspection(client, tenant.id, p2.id);

      const firstRun = await withTenantRls(client, tenant.id, (tx) => backfillTenant(tx, { id: tenant.id, slug: tenant.slug }));
      assert.equal(firstRun.summary.identitiesCreated, 1, "as 3 variações da mesma placa colapsam em 1 identidade nova");
      assert.equal(firstRun.summary.identitiesReused, 0);
      assert.equal(firstRun.summary.processesLinked, 3);

      const linked = await client.impoundProcess.findMany({ where: { id: { in: [p1.id, p2.id, p3.id] } }, select: { identity_id: true } });
      const identityIds = new Set(linked.map((row) => row.identity_id));
      assert.equal(identityIds.size, 1, "os 3 processos apontam para a MESMA identidade");
      const [identityId] = [...identityIds];
      const identity = await client.thirdPartyVehicleIdentity.findUniqueOrThrow({ where: { id: identityId! } });
      assert.equal(identity.plate_key, "ABC1234");
      assert.equal(identity.confidence, "CONFIRMED", "1 dos 3 processos tem IntakeInspection.completed_at -> identidade CONFIRMED");

      // 2ª execução: idempotente — nada mais para linkar, nenhuma identidade nova.
      const secondRun = await withTenantRls(client, tenant.id, (tx) => backfillTenant(tx, { id: tenant.id, slug: tenant.slug }));
      assert.equal(secondRun.summary.identitiesCreated, 0);
      assert.equal(secondRun.summary.identitiesReused, 0);
      assert.equal(secondRun.summary.processesLinked, 0);
      assert.equal(secondRun.summary.processesAlreadyLinkedBefore, 3);

      const identityCountAfter = await client.thirdPartyVehicleIdentity.count({ where: { tenant_id: tenant.id, plate_key: "ABC1234" } });
      assert.equal(identityCountAfter, 1, "reexecução não duplica identidade");
    } finally {
      await teardown(client, tenant.id);
    }
  });

  test("(2) 2 processos 'não identificados' mesmo pátio+data próxima+marca/modelo/cor: aparecem como SUGESTÃO, NUNCA mesclados", async () => {
    const { client } = await bootstrap(connectionString);
    const tenant = await seedTenant(client, "unidentified-suggestion");
    try {
      const { withTenantRls } = await import("../src/database/rls.js");
      const profile = await seedProfile(client, tenant.id);
      const yard = await client.yard.create({ data: { tenant_id: tenant.id, name: "Pátio Teste", address: "Rua Teste, 1" } });

      const enteredA = new Date("2026-02-01T08:00:00Z");
      const enteredB = new Date("2026-02-01T20:00:00Z"); // 12h depois — dentro da janela de 72h

      const pA = await insertProcess(client, tenant.id, profile.id, {
        unidentified: true,
        reason: "placa ilegível",
        yardId: yard.id,
        enteredAt: enteredA,
        brand: "Fiat",
        model: "Uno",
        color: "Prata",
      });
      const pB = await insertProcess(client, tenant.id, profile.id, {
        unidentified: true,
        reason: "sem placa aparente",
        yardId: yard.id,
        enteredAt: enteredB,
        brand: "Fiat",
        model: "Uno",
        color: "Prata",
      });

      const run = await withTenantRls(client, tenant.id, (tx) => backfillTenant(tx, { id: tenant.id, slug: tenant.slug }));
      assert.equal(run.summary.identitiesCreated, 2, "cada 'não identificado' vira sua PRÓPRIA identidade individual");
      assert.equal(run.summary.individualUnidentifiedCount, 2);
      assert.equal(run.matchSuggestions.length, 1, "o par vira 1 SUGESTÃO no relatório");
      // Ordem do par não é garantida (a leitura é por keyset em `id`, não por ordem de inserção) — compara como conjunto.
      assert.deepEqual(
        [run.matchSuggestions[0]!.processIdA, run.matchSuggestions[0]!.processIdB].sort(),
        [pA.id, pB.id].sort(),
      );

      const linked = await client.impoundProcess.findMany({ where: { id: { in: [pA.id, pB.id] } }, select: { identity_id: true } });
      const identityIds = linked.map((row) => row.identity_id);
      assert.notEqual(identityIds[0], identityIds[1], "NUNCA mesclados automaticamente — identidades distintas");

      for (const identityId of identityIds) {
        const identity = await client.thirdPartyVehicleIdentity.findUniqueOrThrow({ where: { id: identityId! } });
        assert.equal(identity.unidentified, true);
        assert.equal(identity.plate_key, null, "identidade individual não herda identificador do processo de origem");
      }
    } finally {
      await teardown(client, tenant.id);
    }
  });

  test("(3) processo já com identity_id preenchido não é tocado na 2ª execução (idempotência)", async () => {
    const { client } = await bootstrap(connectionString);
    const tenant = await seedTenant(client, "already-linked");
    try {
      const { withTenantRls } = await import("../src/database/rls.js");
      const profile = await seedProfile(client, tenant.id);

      const preexisting = await withTenantRls(client, tenant.id, (tx) =>
        tx.thirdPartyVehicleIdentity.create({ data: { tenant_id: tenant.id, unidentified: false, plate_key: "PRE0001" } }),
      );
      const linkedProcess = await insertProcess(client, tenant.id, profile.id, { plate: "PRE0001", identityId: preexisting.id });
      const unlinkedProcess = await insertProcess(client, tenant.id, profile.id, { plate: "NEW0001" });

      const run = await withTenantRls(client, tenant.id, (tx) => backfillTenant(tx, { id: tenant.id, slug: tenant.slug }));
      assert.equal(run.summary.processesAlreadyLinkedBefore, 1);
      assert.equal(run.summary.processesScanned, 1, "só o processo SEM identity_id entra na varredura");
      assert.equal(run.summary.identitiesCreated, 1);

      const untouched = await client.impoundProcess.findUniqueOrThrow({ where: { id: linkedProcess.id } });
      assert.equal(untouched.identity_id, preexisting.id, "processo já vinculado não é tocado/realocado");

      const nowLinked = await client.impoundProcess.findUniqueOrThrow({ where: { id: unlinkedProcess.id } });
      assert.ok(nowLinked.identity_id, "o processo sem identity_id foi vinculado normalmente");
    } finally {
      await teardown(client, tenant.id);
    }
  });

  test("(4) corrida/catch-up: processo criado ENTRE rodadas (achado #1) fica órfão até a PRÓXIMA execução, que o reaproveita na identidade existente", async () => {
    const { client } = await bootstrap(connectionString);
    const tenant = await seedTenant(client, "concurrency-catchup");
    try {
      const { withTenantRls } = await import("../src/database/rls.js");
      const profile = await seedProfile(client, tenant.id);

      // Rodada 1: só o processo inicial existe.
      const initial = await insertProcess(client, tenant.id, profile.id, { plate: "CTU0001" });
      const firstRun = await withTenantRls(client, tenant.id, (tx) => backfillTenant(tx, { id: tenant.id, slug: tenant.slug }));
      assert.equal(firstRun.summary.identitiesCreated, 1);
      assert.equal(firstRun.summary.processesLinked, 1);

      // "Durante a janela" (simulado: depois que a rodada 1 já commitou) chega um processo NOVO da MESMA placa —
      // é exatamente o achado #1 da junta de arquitetura: fica órfão (sem identity_id) até a PRÓXIMA execução.
      const concurrent = await insertProcess(client, tenant.id, profile.id, { plate: "CTU0001" });
      const orphanBetweenRounds = await client.impoundProcess.findUniqueOrThrow({ where: { id: concurrent.id } });
      assert.equal(orphanBetweenRounds.identity_id, null, "processo criado entre rodadas fica órfão até a próxima execução (documentado no cabeçalho do script)");

      // Rodada 2 (catch-up): o órfão é pego e REAPROVEITA a identidade da rodada 1 (não cria uma 2ª para a mesma placa).
      const secondRun = await withTenantRls(client, tenant.id, (tx) => backfillTenant(tx, { id: tenant.id, slug: tenant.slug }));
      assert.equal(secondRun.summary.identitiesCreated, 0);
      assert.equal(secondRun.summary.identitiesReused, 1);
      assert.equal(secondRun.summary.processesLinked, 1);

      const [initialAfter, concurrentAfter] = await Promise.all([
        client.impoundProcess.findUniqueOrThrow({ where: { id: initial.id } }),
        client.impoundProcess.findUniqueOrThrow({ where: { id: concurrent.id } }),
      ]);
      assert.equal(initialAfter.identity_id, concurrentAfter.identity_id, "o processo órfão se junta à MESMA identidade da placa, criada na rodada 1");

      const identityCount = await client.thirdPartyVehicleIdentity.count({ where: { tenant_id: tenant.id, plate_key: "CTU0001" } });
      assert.equal(identityCount, 1, "nenhuma identidade duplicada surge do catch-up");
    } finally {
      await teardown(client, tenant.id);
    }
  });

  test("(5) chassi/renavam sozinhos NÃO agrupam automaticamente — placas diferentes com mesmo chassi viram AMBÍGUO, não fusão", async () => {
    const { client } = await bootstrap(connectionString);
    const tenant = await seedTenant(client, "chassis-no-autogroup");
    try {
      const { withTenantRls } = await import("../src/database/rls.js");
      const profile = await seedProfile(client, tenant.id);

      const pA = await insertProcess(client, tenant.id, profile.id, { plate: "AMB0001", chassis: "CHASSI-SAME" });
      const pB = await insertProcess(client, tenant.id, profile.id, { plate: "AMB0002", chassis: "CHASSI-SAME" });

      const run = await withTenantRls(client, tenant.id, (tx) => backfillTenant(tx, { id: tenant.id, slug: tenant.slug }));
      assert.equal(run.summary.identitiesCreated, 2, "placas diferentes NUNCA agrupam automaticamente, mesmo com chassi igual");
      assert.equal(run.ambiguous.length, 1, "vira 1 entrada de AMBÍGUO para revisão humana");
      assert.ok(run.ambiguous[0]!.reasons.some((reason) => reason.includes("chassi")));

      const [rowA, rowB] = await Promise.all([
        client.impoundProcess.findUniqueOrThrow({ where: { id: pA.id } }),
        client.impoundProcess.findUniqueOrThrow({ where: { id: pB.id } }),
      ]);
      assert.notEqual(rowA.identity_id, rowB.identity_id, "nunca funde automaticamente");
    } finally {
      await teardown(client, tenant.id);
    }
  });
}

type BootstrapClient = Awaited<ReturnType<typeof bootstrap>>["client"];

function uniq(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  return { client };
}

async function seedTenant(client: BootstrapClient, label: string) {
  const suffix = uniq();
  return client.tenant.create({ data: { name: `VID-BF ${label} ${suffix}`, slug: `vid-bf-${label}-${suffix}` } });
}

async function seedProfile(client: BootstrapClient, tenantId: string): Promise<{ id: string }> {
  const rows = await client.$queryRaw<Array<{ id: string }>>`
    INSERT INTO jurisdiction_profiles (tenant_id, name, scope) VALUES (${tenantId}::uuid, 'Perfil Backfill', 'PUBLIC_AGREEMENT') RETURNING id
  `;
  return rows[0]!;
}

type InsertProcessOptions = {
  readonly plate?: string | null;
  readonly chassis?: string | null;
  readonly renavam?: string | null;
  readonly brand?: string | null;
  readonly model?: string | null;
  readonly color?: string | null;
  readonly year?: number | null;
  readonly unidentified?: boolean;
  readonly reason?: string | null;
  readonly yardId?: string | null;
  readonly enteredAt?: Date | null;
  readonly identityId?: string | null;
};

async function insertProcess(
  client: BootstrapClient,
  tenantId: string,
  profileId: string,
  options: InsertProcessOptions,
): Promise<{ id: string }> {
  const rows = await client.$queryRaw<Array<{ id: string }>>`
    INSERT INTO impound_processes (
      tenant_id, profile_id, origin_authority, vehicle_plate, vehicle_chassis, vehicle_renavam,
      vehicle_brand, vehicle_model, vehicle_color, vehicle_year, vehicle_unidentified, unidentified_reason,
      yard_id, entered_at, identity_id
    ) VALUES (
      ${tenantId}::uuid, ${profileId}::uuid, 'Autoridade Teste',
      ${options.plate ?? null}, ${options.chassis ?? null}, ${options.renavam ?? null},
      ${options.brand ?? null}, ${options.model ?? null}, ${options.color ?? null}, ${options.year ?? null},
      ${options.unidentified ?? false}, ${options.reason ?? null},
      ${options.yardId ?? null}::uuid, ${options.enteredAt ?? null}, ${options.identityId ?? null}::uuid
    ) RETURNING id
  `;
  return rows[0]!;
}

async function insertCompletedInspection(client: BootstrapClient, tenantId: string, processId: string): Promise<void> {
  await client.$executeRaw`
    INSERT INTO impound_intake_inspections (tenant_id, process_id, inspected_at, completed_at, completed_by)
    VALUES (${tenantId}::uuid, ${processId}::uuid, now(), now(), gen_random_uuid())
  `;
}

// Teardown FK-safe (superuser + replica p/ os triggers append-only): intake_inspections -> impound_processes ->
// merge_events -> identities -> jurisdiction_profiles -> audit_logs -> yards, ANTES do tenant.
async function teardown(client: BootstrapClient, tenantId: string): Promise<void> {
  try {
    await client.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
      await tx.$executeRawUnsafe(`DELETE FROM impound_intake_inspections WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM impound_processes WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM third_party_vehicle_identity_merge_events WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`UPDATE third_party_vehicle_identities SET canonical_identity_id = NULL WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM third_party_vehicle_identities WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM jurisdiction_profiles WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM yards WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM audit_logs WHERE tenant_id = '${tenantId}'::uuid`);
    });
    await client.tenant.deleteMany({ where: { id: tenantId } });
  } finally {
    await client.$disconnect();
  }
}
