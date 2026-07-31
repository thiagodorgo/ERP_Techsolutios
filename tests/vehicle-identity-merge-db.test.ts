import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

const connectionString = process.env.DATABASE_URL;

// Ω-VID PR-04 (§Parte A/B) — prova viva contra Postgres real: o repositório Prisma move de verdade
// impound_processes.identity_id dentro da MESMA transação do merge, grava o MergeEvent com snapshot_before, e o
// unmerge-admin NÃO reverte os processos movidos (limitação documentada). DB-gated (skip sem DATABASE_URL).
if (!connectionString) {
  test("Vehicle identity merge (Ω-VID PR-04) DB-gated requires DATABASE_URL and a migrated database", {
    skip: "Set DATABASE_URL, start PostgreSQL and run migrations to execute this test.",
  });
} else {
  test("merge REAL: ImpoundProcess.identity_id migrado para o alvo, evento com snapshot_before gravado", async () => {
    const { repository, prisma } = await bootstrap(connectionString);
    const tenantId = await seedTenant(prisma, "merge-real");
    try {
      const target = await repository.createIdentity({ tenantId, plateRaw: "REAL0001", plateKey: "REAL0001", unidentified: false });
      const source = await repository.createIdentity({ tenantId, plateRaw: "REAL0002", plateKey: "REAL0002", unidentified: false });
      const profileId = await seedProfile(prisma, tenantId);
      const processId1 = await seedProcess(prisma, tenantId, profileId, source.id);
      const processId2 = await seedProcess(prisma, tenantId, profileId, source.id);
      const unrelatedProcessId = await seedProcess(prisma, tenantId, profileId, target.id);

      const result = await repository.mergeIdentities({
        tenantId,
        targetId: target.id,
        mergedIdentityId: source.id,
        reason: "veiculo confirmado como o mesmo em vistoria de campo",
        actorId: undefined,
      });

      assert.equal(result.movedProcessCount, 2);
      assert.equal(result.resolvedTargetId, target.id);

      const process1 = await prisma.impoundProcess.findUniqueOrThrow({ where: { id: processId1 } });
      const process2 = await prisma.impoundProcess.findUniqueOrThrow({ where: { id: processId2 } });
      const unrelated = await prisma.impoundProcess.findUniqueOrThrow({ where: { id: unrelatedProcessId } });
      assert.equal(process1.identity_id, target.id);
      assert.equal(process2.identity_id, target.id);
      assert.equal(unrelated.identity_id, target.id, "já era do target — permanece");

      const mergedIdentity = await prisma.thirdPartyVehicleIdentity.findUniqueOrThrow({ where: { id: source.id } });
      assert.equal(mergedIdentity.confidence, "MERGED");
      assert.equal(mergedIdentity.canonical_identity_id, target.id);

      const events = await prisma.thirdPartyVehicleIdentityMergeEvent.findMany({ where: { tenant_id: tenantId } });
      assert.equal(events.length, 1);
      assert.equal(events[0].target_identity_id, target.id);
      assert.equal(events[0].merged_identity_id, source.id);
      const snapshot = events[0].snapshot_before as {
        target?: { id?: string };
        merged?: { id?: string; plateKey?: string };
        movedProcessCount?: number;
        movedProcessIds?: string[];
      };
      assert.equal(snapshot.target?.id, target.id);
      assert.equal(snapshot.merged?.id, source.id);
      assert.equal(snapshot.merged?.plateKey, "REAL0002");
      // Item 4 da junta de revisão — o snapshot persiste quantos/quais processos o merge moveu.
      assert.equal(snapshot.movedProcessCount, 2);
      assert.deepEqual([...(snapshot.movedProcessIds ?? [])].sort(), [processId1, processId2].sort());
    } finally {
      await teardown(prisma, tenantId);
    }
  });

  test("unmerge-admin REAL: reverte confidence/canonical mas NÃO reverte impound_processes.identity_id já movidos", async () => {
    const { repository, prisma } = await bootstrap(connectionString);
    const tenantId = await seedTenant(prisma, "unmerge-real");
    try {
      const target = await repository.createIdentity({ tenantId, plateRaw: "UNR0001", plateKey: "UNR0001", unidentified: false });
      const source = await repository.createIdentity({ tenantId, plateRaw: "UNR0002", plateKey: "UNR0002", unidentified: false });
      const profileId = await seedProfile(prisma, tenantId);
      const processId = await seedProcess(prisma, tenantId, profileId, source.id);

      const merge = await repository.mergeIdentities({ tenantId, targetId: target.id, mergedIdentityId: source.id, reason: "merge a ser estornado depois" });
      assert.equal(merge.movedProcessCount, 1);

      const beforeUnmerge = await prisma.impoundProcess.findUniqueOrThrow({ where: { id: processId } });
      assert.equal(beforeUnmerge.identity_id, target.id);

      const unmerge = await repository.unmergeIdentity({ tenantId, identityId: source.id, reason: "estorno administrativo do merge indevido" });
      assert.equal(unmerge.identity.confidence, "PROVISIONAL");
      assert.equal(unmerge.identity.canonicalIdentityId, undefined);
      assert.equal(unmerge.previousCanonicalIdentityId, target.id);
      // Item 4 da junta de revisão — o admin é avisado de que 1 processo ficou órfão no alvo.
      assert.equal(unmerge.strandedProcessCount, 1);

      // A LIMITAÇÃO documentada: o processo continua no TARGET, não volta para o source estornado.
      const afterUnmerge = await prisma.impoundProcess.findUniqueOrThrow({ where: { id: processId } });
      assert.equal(afterUnmerge.identity_id, target.id, "unmerge-admin NÃO reverte ImpoundProcess.identity_id (limitação documentada)");

      const events = await prisma.thirdPartyVehicleIdentityMergeEvent.findMany({
        where: { tenant_id: tenantId },
        orderBy: { created_at: "asc" },
      });
      assert.equal(events.length, 2, "merge original + evento de reversão");
      assert.match(events[1].reason, /^\[UNMERGE\]/);
      assert.equal(events[1].merged_identity_id, target.id, "referencia de quem era o antigo canonical");
    } finally {
      await teardown(prisma, tenantId);
    }
  });

  test("unmerge-admin REAL: restaura a confidence ORIGINAL CONFIRMED (não rebaixa para PROVISIONAL) — item 3", async () => {
    const { repository, prisma } = await bootstrap(connectionString);
    const tenantId = await seedTenant(prisma, "unmerge-confirmed");
    try {
      const target = await repository.createIdentity({ tenantId, plateRaw: "CNF0001", plateKey: "CNF0001", unidentified: false });
      const source = await repository.createIdentity({
        tenantId,
        plateRaw: "CNF0002",
        plateKey: "CNF0002",
        unidentified: false,
        confidence: "CONFIRMED",
      });

      await repository.mergeIdentities({ tenantId, targetId: target.id, mergedIdentityId: source.id, reason: "merge de uma identidade CONFIRMED em campo" });

      const merged = await prisma.thirdPartyVehicleIdentity.findUniqueOrThrow({ where: { id: source.id } });
      assert.equal(merged.confidence, "MERGED");

      const unmerge = await repository.unmergeIdentity({ tenantId, identityId: source.id, reason: "estorno deve restaurar a confidence CONFIRMED original" });
      assert.equal(unmerge.identity.confidence, "CONFIRMED", "a CONFIRMED original deve ser restaurada, não rebaixada");
      assert.equal(unmerge.identity.canonicalIdentityId, undefined);

      // Estado persistido coerente com o novo CHECK bicondicional (canonical=NULL ⟺ confidence≠MERGED).
      const reverted = await prisma.thirdPartyVehicleIdentity.findUniqueOrThrow({ where: { id: source.id } });
      assert.equal(reverted.confidence, "CONFIRMED");
      assert.equal(reverted.canonical_identity_id, null);
    } finally {
      await teardown(prisma, tenantId);
    }
  });

  test("findDuplicateCandidates REAL: outras identidades ATIVAS com a mesma placa via query real", async () => {
    const { repository, prisma } = await bootstrap(connectionString);
    const tenantId = await seedTenant(prisma, "dup-real");
    try {
      const first = await repository.createIdentity({ tenantId, plateRaw: "DBD0001", plateKey: "DBD0001", unidentified: false });
      const second = await repository.createIdentity({ tenantId, plateRaw: "DBD0001", plateKey: "DBD0001", unidentified: false });

      const candidates = await repository.findDuplicateCandidates(tenantId, first.id);
      assert.deepEqual(candidates, [second.id]);
    } finally {
      await teardown(prisma, tenantId);
    }
  });

  // Ω-VID PR-04 re-verificação adversarial — BAIXA #1 (TOCTOU): prova viva do lock pessimista FOR UPDATE dentro do
  // updateIdentity do repositório Prisma. Um update DIRETO (bypassando a guarda do service.update) a uma
  // identidade MERGED por caminho que NÃO toca confidence (só {brand}) é rejeitado atomicamente com
  // merged_identity_read_only — a garantia real é o FOR UPDATE no repo, não a guarda potencialmente stale do service.
  test("updateIdentity REAL: PATCH de campo cosmético ({brand}) numa identidade MERGED → merged_identity_read_only (FOR UPDATE)", async () => {
    const { repository, prisma } = await bootstrap(connectionString);
    const tenantId = await seedTenant(prisma, "update-merged");
    try {
      const target = await repository.createIdentity({ tenantId, plateRaw: "UPM0001", plateKey: "UPM0001", unidentified: false });
      const source = await repository.createIdentity({ tenantId, plateRaw: "UPM0002", plateKey: "UPM0002", unidentified: false });
      await repository.mergeIdentities({ tenantId, targetId: target.id, mergedIdentityId: source.id, reason: "merge para provar a trava FOR UPDATE no update" });

      await assert.rejects(
        () => repository.updateIdentity({ tenantId, identityId: source.id, brand: "Fiat" }),
        (error: unknown) =>
          error instanceof Error &&
          error.name === "VehicleIdentityError" &&
          (error as { reason?: string }).reason === "merged_identity_read_only" &&
          (error as { statusCode?: number }).statusCode === 422,
      );

      // O tombstone MERGED permanece intacto — nada cosmético gravado.
      const fresh = await prisma.thirdPartyVehicleIdentity.findUniqueOrThrow({ where: { id: source.id } });
      assert.equal(fresh.confidence, "MERGED");
      assert.equal(fresh.canonical_identity_id, target.id);
      assert.equal(fresh.brand, null, "o {brand} não pode ter sido gravado num tombstone MERGED");
    } finally {
      await teardown(prisma, tenantId);
    }
  });
}

async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  const { RlsPrismaVehicleIdentityRepository } = await import("../src/modules/vehicle-identities/vehicle-identity-prisma.repository.js");
  const repository = new RlsPrismaVehicleIdentityRepository(prisma);
  return { prisma, repository };
}

function uniq(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function seedTenant(prisma: Awaited<ReturnType<typeof bootstrap>>["prisma"], label: string): Promise<string> {
  const suffix = uniq();
  const tenant = await prisma.tenant.create({ data: { name: `VID merge-db ${label} ${suffix}`, slug: `vid-merge-db-${label}-${suffix}` } });
  return tenant.id;
}

async function seedProfile(prisma: Awaited<ReturnType<typeof bootstrap>>["prisma"], tenantId: string): Promise<string> {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    INSERT INTO jurisdiction_profiles (tenant_id, name, scope) VALUES (${tenantId}::uuid, 'Perfil Merge', 'PUBLIC_AGREEMENT') RETURNING id
  `;
  return rows[0].id;
}

async function seedProcess(
  prisma: Awaited<ReturnType<typeof bootstrap>>["prisma"],
  tenantId: string,
  profileId: string,
  identityId: string,
): Promise<string> {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    INSERT INTO impound_processes (tenant_id, profile_id, origin_authority, vehicle_plate, identity_id)
    VALUES (${tenantId}::uuid, ${profileId}::uuid, 'Autoridade Teste', 'MRGDB01', ${identityId}::uuid)
    RETURNING id
  `;
  return rows[0].id;
}

async function teardown(prisma: Awaited<ReturnType<typeof bootstrap>>["prisma"], tenantId: string): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
      await tx.$executeRawUnsafe(`DELETE FROM impound_processes WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM third_party_vehicle_identity_merge_events WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`UPDATE third_party_vehicle_identities SET confidence = 'PROVISIONAL', canonical_identity_id = NULL WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM third_party_vehicle_identities WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM jurisdiction_profiles WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM audit_logs WHERE tenant_id = '${tenantId}'::uuid`);
    });
    await prisma.tenant.deleteMany({ where: { id: tenantId } });
  } finally {
    await prisma.$disconnect();
  }
}
