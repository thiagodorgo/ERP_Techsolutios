import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

const connectionString = process.env.DATABASE_URL;

// Ω-VID PR-04 rework — item 1 da junta de revisão adversarial (CRÍTICA, PoC comprovado): dois merges OPOSTOS
// concorrentes (A→B e B→A) sob READ COMMITTED criavam um 2-CICLO no grafo via write-skew (A.canonical=B E
// B.canonical=A ao mesmo tempo; o merge_chk do banco satisfaz o ciclo). A correção é um lock pessimista
// (SELECT ... FOR UPDATE ORDER BY id) das duas linhas ANTES dos UPDATEs, com re-validação do estado fresco.
//
// Este teste dispara os dois merges concorrentes contra o Postgres REAL e prova, rodada a rodada, que:
//   (1) EXATAMENTE UM sucede;
//   (2) o outro recebe rejeição LIMPA (VehicleIdentityError 4xx — nunca 500, nunca deadlock cru);
//   (3) ao final NÃO existe 2-ciclo (impossível A.canonical=B E B.canonical=A simultâneos).
// DB-gated (skip sem DATABASE_URL) — Node é single-thread; a corrida real exige o banco. Espelha o padrão de
// tests/impound-concurrency.test.ts / tests/release-gate-concurrency.test.ts.
if (!connectionString) {
  test("Vehicle identity merge concurrency (Ω-VID PR-04 item 1) requires DATABASE_URL and a migrated database", {
    skip: "Set DATABASE_URL, start PostgreSQL and run migrations to execute this test.",
  });
} else {
  const ROUNDS = 12;

  test("merge concorrente em direções opostas (A→B e B→A) → exatamente 1 vence, o outro rejeita limpo, ZERO 2-ciclo", async () => {
    const { repository, prisma } = await bootstrap(connectionString);
    const tenantId = await seedTenant(prisma, "merge-conc");
    const rejectionReasons: string[] = [];
    try {
      for (let round = 0; round < ROUNDS; round += 1) {
        // Placa IGUAL nos dois — cenário realista do banner de duplicata que incita dois operadores a reconciliar
        // o MESMO cluster de placa ao mesmo tempo (o gatilho descrito pela junta).
        const plate = `CNC${String(round).padStart(4, "0")}`;
        const a = await repository.createIdentity({ tenantId, plateRaw: plate, plateKey: plate, unidentified: false });
        const b = await repository.createIdentity({ tenantId, plateRaw: plate, plateKey: plate, unidentified: false });

        const results = await Promise.allSettled([
          // A→B: source=A, target=B
          repository.mergeIdentities({ tenantId, targetId: b.id, mergedIdentityId: a.id, reason: `corrida rodada ${round} sentido A→B` }),
          // B→A: source=B, target=A
          repository.mergeIdentities({ tenantId, targetId: a.id, mergedIdentityId: b.id, reason: `corrida rodada ${round} sentido B→A` }),
        ]);

        const fulfilled = results.filter((r) => r.status === "fulfilled");
        const rejected = results.filter((r) => r.status === "rejected");
        assert.equal(fulfilled.length, 1, `rodada ${round}: exatamente 1 merge deve vencer (o write-skew não pode fundir os dois)`);
        assert.equal(rejected.length, 1, `rodada ${round}: exatamente 1 merge deve ser rejeitado`);

        // (2) rejeição LIMPA: VehicleIdentityError de client-error (4xx), nunca 500/deadlock cru.
        const error = (rejected[0] as PromiseRejectedResult).reason as { name?: string; statusCode?: number; reason?: string };
        assert.equal(error.name, "VehicleIdentityError", `rodada ${round}: a rejeição deve ser um VehicleIdentityError (não 500/erro cru)`);
        assert.ok(
          typeof error.statusCode === "number" && error.statusCode >= 400 && error.statusCode < 500,
          `rodada ${round}: statusCode deve ser 4xx (limpo), veio ${error.statusCode}`,
        );
        rejectionReasons.push(`${error.statusCode}:${error.reason}`);

        // (3) ZERO 2-ciclo. Estado fresco das duas linhas (superuser bypassa RLS — leitura de verificação).
        const freshA = await prisma.thirdPartyVehicleIdentity.findUniqueOrThrow({ where: { id: a.id } });
        const freshB = await prisma.thirdPartyVehicleIdentity.findUniqueOrThrow({ where: { id: b.id } });

        const cycle = freshA.canonical_identity_id === b.id && freshB.canonical_identity_id === a.id;
        assert.equal(cycle, false, `rodada ${round}: 2-CICLO detectado (A.canonical=B E B.canonical=A) — o fix falhou`);

        const mergedCount = [freshA, freshB].filter((row) => row.confidence === "MERGED").length;
        assert.equal(mergedCount, 1, `rodada ${round}: exatamente 1 das duas identidades deve ficar MERGED`);

        const [mergedRow, aliveRow] = freshA.confidence === "MERGED" ? [freshA, freshB] : [freshB, freshA];
        assert.equal(mergedRow.canonical_identity_id, aliveRow.id, `rodada ${round}: o MERGED aponta para o vivo`);
        assert.equal(aliveRow.confidence !== "MERGED", true, `rodada ${round}: o sobrevivente não está MERGED`);
        assert.equal(aliveRow.canonical_identity_id, null, `rodada ${round}: o sobrevivente tem canonical=NULL (bicondicional)`);
      }
      // Prova visível de que a corrida foi de fato exercitada (mistura de merge_conflict_retry / already_merged /
      // identities_must_differ conforme o interleaving — TODAS limpas, NENHUMA 500).
      console.log(`[item 1] rejeições limpas em ${ROUNDS} rodadas:`, JSON.stringify(rejectionReasons));
    } finally {
      await teardown(prisma, tenantId);
    }
  });

  // Ω-VID PR-04 re-verificação adversarial — BAIXA #2: sem FOR UPDATE no unmergeIdentity, dois unmerge-admin
  // concorrentes da MESMA identidade MERGED liam MERGED antes do 1º commit e AMBOS gravavam um MergeEvent
  // [UNMERGE] (ruído de auditoria num domínio com trilha de auditoria). Com o lock pessimista, EXATAMENTE 1
  // unmerge vence + grava 1 evento [UNMERGE]; o outro bloqueia no lock, re-lê PROVISIONAL e rejeita `not_merged`
  // limpo, sem gravar evento duplicado. Prova viva contra o Postgres real.
  test("unmerge concorrente da MESMA identidade MERGED → exatamente 1 vence + 1 evento [UNMERGE], o outro rejeita not_merged (ZERO evento duplicado)", async () => {
    const { repository, prisma } = await bootstrap(connectionString);
    const tenantId = await seedTenant(prisma, "unmerge-conc");
    const rejectionReasons: string[] = [];
    try {
      for (let round = 0; round < ROUNDS; round += 1) {
        const target = await repository.createIdentity({ tenantId, plateRaw: `UMT${String(round).padStart(4, "0")}`, plateKey: `UMT${round}`, unidentified: false });
        const source = await repository.createIdentity({ tenantId, plateRaw: `UMS${String(round).padStart(4, "0")}`, plateKey: `UMS${round}`, unidentified: false });
        await repository.mergeIdentities({ tenantId, targetId: target.id, mergedIdentityId: source.id, reason: `merge da rodada ${round} para estornar concorrente` });

        const results = await Promise.allSettled([
          repository.unmergeIdentity({ tenantId, identityId: source.id, reason: `estorno concorrente rodada ${round} caminho A` }),
          repository.unmergeIdentity({ tenantId, identityId: source.id, reason: `estorno concorrente rodada ${round} caminho B` }),
        ]);

        const fulfilled = results.filter((r) => r.status === "fulfilled");
        const rejected = results.filter((r) => r.status === "rejected");
        assert.equal(fulfilled.length, 1, `rodada ${round}: exatamente 1 unmerge deve vencer`);
        assert.equal(rejected.length, 1, `rodada ${round}: exatamente 1 unmerge deve ser rejeitado`);

        // (2) rejeição LIMPA: not_merged 422 (o concorrente re-leu o estado já revertido sob o lock).
        const error = (rejected[0] as PromiseRejectedResult).reason as { name?: string; statusCode?: number; reason?: string };
        assert.equal(error.name, "VehicleIdentityError", `rodada ${round}: a rejeição deve ser um VehicleIdentityError (não 500/erro cru)`);
        assert.equal(error.statusCode, 422, `rodada ${round}: statusCode deve ser 422, veio ${error.statusCode}`);
        assert.equal(error.reason, "not_merged", `rodada ${round}: reason deve ser not_merged, veio ${error.reason}`);
        rejectionReasons.push(`${error.statusCode}:${error.reason}`);

        // (3) EXATAMENTE 1 evento [UNMERGE] gravado para esta identidade (o evento [UNMERGE] tem
        // target_identity_id = source.id; o merge original tem target_identity_id = target.id, então não conta).
        const unmergeEvents = await prisma.thirdPartyVehicleIdentityMergeEvent.findMany({
          where: { tenant_id: tenantId, target_identity_id: source.id, reason: { startsWith: "[UNMERGE]" } },
        });
        assert.equal(unmergeEvents.length, 1, `rodada ${round}: exatamente 1 evento [UNMERGE] (não 2) — sem ruído de auditoria`);

        // Estado final coerente: a identidade voltou revertida (PROVISIONAL) com canonical=NULL (bicondicional).
        const fresh = await prisma.thirdPartyVehicleIdentity.findUniqueOrThrow({ where: { id: source.id } });
        assert.equal(fresh.confidence, "PROVISIONAL", `rodada ${round}: a identidade estornada volta PROVISIONAL`);
        assert.equal(fresh.canonical_identity_id, null, `rodada ${round}: canonical=NULL após o estorno`);
      }
      console.log(`[BAIXA #2] rejeições limpas de unmerge concorrente em ${ROUNDS} rodadas:`, JSON.stringify(rejectionReasons));
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

async function seedTenant(prisma: Awaited<ReturnType<typeof bootstrap>>["prisma"], label: string): Promise<string> {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const tenant = await prisma.tenant.create({ data: { name: `VID ${label} ${suffix}`, slug: `vid-${label}-${suffix}` } });
  return tenant.id;
}

async function teardown(prisma: Awaited<ReturnType<typeof bootstrap>>["prisma"], tenantId: string): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
      await tx.$executeRawUnsafe(`DELETE FROM third_party_vehicle_identity_merge_events WHERE tenant_id = '${tenantId}'::uuid`);
      // confidence!='MERGED' junto do canonical=NULL na MESMA UPDATE (merge_chk + canonical_biconditional_chk).
      await tx.$executeRawUnsafe(
        `UPDATE third_party_vehicle_identities SET confidence = 'PROVISIONAL', canonical_identity_id = NULL WHERE tenant_id = '${tenantId}'::uuid`,
      );
      await tx.$executeRawUnsafe(`DELETE FROM third_party_vehicle_identities WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM audit_logs WHERE tenant_id = '${tenantId}'::uuid`);
    });
    await prisma.tenant.deleteMany({ where: { id: tenantId } });
  } finally {
    await prisma.$disconnect();
  }
}
