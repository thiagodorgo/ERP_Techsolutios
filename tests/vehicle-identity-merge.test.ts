import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

process.env.LOG_LEVEL = "silent";

const connectionString = process.env.DATABASE_URL;

import {
  createMemoryVehicleIdentityService,
  getMemoryVehicleIdentityRepositoryForTests,
  resetVehicleIdentityRuntimeForTests,
} from "../src/modules/vehicle-identities/vehicle-identity.service.js";
import { VehicleIdentityError, type VehicleIdentityActorContext } from "../src/modules/vehicle-identities/vehicle-identity.types.js";

function actor(overrides: Partial<VehicleIdentityActorContext> = {}): VehicleIdentityActorContext {
  return {
    tenantId: overrides.tenantId ?? randomUUID(),
    userId: overrides.userId ?? randomUUID(),
    roles: overrides.roles ?? ["manager"],
    permissions: overrides.permissions ?? ["impound:read", "impound:update", "vehicle_identity:merge"],
  };
}

function setup() {
  resetVehicleIdentityRuntimeForTests();
  return { service: createMemoryVehicleIdentityService(), repository: getMemoryVehicleIdentityRepositoryForTests() };
}

// ── merge: fluxo feliz ───────────────────────────────────────────────────────

test("merge: fluxo feliz — 2 identidades viram 1 sobrevivente, processos migrados, evento gravado com snapshot", async () => {
  const { service, repository } = setup();
  const tenantActor = actor();
  const target = await service.create(tenantActor, { plate: "TGT0001" });
  const source = await service.create(tenantActor, { plate: "SRC0001" });
  repository.linkProcessForTests(source.id, "process-1");
  repository.linkProcessForTests(source.id, "process-2");

  const result = await service.merge(tenantActor, target.id, { mergedIdentityId: source.id, reason: "mesma placa confirmada em campo" });

  assert.equal(result.resolvedTargetId, target.id);
  assert.equal(result.movedProcessCount, 2);
  assert.equal(result.merged.confidence, "MERGED");
  assert.equal(result.merged.canonicalIdentityId, target.id);
  assert.deepEqual(repository.processLinksForTests(target.id).sort(), ["process-1", "process-2"]);
  assert.equal(repository.processLinksForTests(source.id).length, 0);

  const events = repository.mergeEventsForTests();
  assert.equal(events.length, 1);
  assert.equal(events[0].targetIdentityId, target.id);
  assert.equal(events[0].mergedIdentityId, source.id);
  assert.equal(events[0].reason, "mesma placa confirmada em campo");
  assert.ok(events[0].snapshotBefore);

  // A identidade fundida não é mais achável como "viva" para um novo merge (fica MERGED).
  const reread = await service.get(tenantActor, source.id);
  assert.equal(reread.confidence, "MERGED");
});

// ── merge: transitivo ────────────────────────────────────────────────────────

test("merge: transitivo — A já mergeada em B, tentar mergear A de novo (como alvo) resolve para B", async () => {
  const { service, repository } = setup();
  const tenantActor = actor();
  const identityA = await service.create(tenantActor, { plate: "AAA0001" });
  const identityB = await service.create(tenantActor, { plate: "BBB0001" });
  const identityX = await service.create(tenantActor, { plate: "XXX0001" });
  repository.linkProcessForTests(identityX.id, "process-x");

  // A é fundida em B primeiro (A vira MERGED, canonical=B).
  await service.merge(tenantActor, identityB.id, { mergedIdentityId: identityA.id, reason: "A e B são o mesmo veículo" });

  // Agora tenta mergear X usando A como ALVO — A está morta (MERGED->B); deve resolver transitivamente para B.
  const result = await service.merge(tenantActor, identityA.id, { mergedIdentityId: identityX.id, reason: "X também é o mesmo veículo que A/B" });

  assert.equal(result.resolvedTargetId, identityB.id, "o alvo efetivo deve resolver para B (o vivo no fim da cadeia)");
  assert.equal(result.movedProcessCount, 1);
  assert.deepEqual(repository.processLinksForTests(identityB.id), ["process-x"]);
});

// ── merge: rejeições ──────────────────────────────────────────────────────────

test("merge: rejeita quando o SOURCE já está MERGED (merge_source_already_merged) — sem resolução transitiva", async () => {
  const { service } = setup();
  const tenantActor = actor();
  const identityA = await service.create(tenantActor, { plate: "SRA0001" });
  const identityB = await service.create(tenantActor, { plate: "SRB0001" });
  const identityC = await service.create(tenantActor, { plate: "SRC0002" });

  await service.merge(tenantActor, identityB.id, { mergedIdentityId: identityA.id, reason: "A dentro de B primeiro" });

  await assert.rejects(
    () => service.merge(tenantActor, identityC.id, { mergedIdentityId: identityA.id, reason: "tentando reusar A como source de novo" }),
    (error: unknown) => error instanceof VehicleIdentityError && error.reason === "merge_source_already_merged" && error.statusCode === 422,
  );
});

// Item 5 da junta de revisão — mensagem HONESTA do bound: cadeia acíclica longa demais (>20 hops) recebe
// `merge_target_chain_too_long` (teto de sanidade), DISTINTO de `merge_target_already_merged` (cadeia quebrada /
// aponta para inexistente). O ciclo é impedido pelo lock (item 1), não mais por este bound.
test("merge: rejeita quando a cadeia do ALVO é longa demais para resolver (merge_target_chain_too_long)", async () => {
  const { service } = setup();
  const tenantActor = actor();

  // Constrói uma cadeia de 21 elos (id0 -> id1 -> ... -> id21, id21 vivo) — excede MAX_MERGE_CHAIN_HOPS (20) do
  // repositório, provando que a resolução transitiva do alvo tem um limite defensivo (nunca gira indefinidamente).
  const chain = [];
  for (let i = 0; i <= 21; i += 1) {
    chain.push(await service.create(tenantActor, { plate: `CHN${String(i).padStart(4, "0")}` }));
  }
  for (let i = 0; i < 21; i += 1) {
    await service.merge(tenantActor, chain[i + 1].id, { mergedIdentityId: chain[i].id, reason: `elo ${i} da cadeia de teste` });
  }

  const newSource = await service.create(tenantActor, { plate: "NEWSRC1" });
  await assert.rejects(
    () => service.merge(tenantActor, chain[0].id, { mergedIdentityId: newSource.id, reason: "tentando usar o elo morto mais fundo como alvo" }),
    (error: unknown) => error instanceof VehicleIdentityError && error.reason === "merge_target_chain_too_long" && error.statusCode === 422,
  );
});

test("merge: rejeita targetId === mergedIdentityId (identities_must_differ)", async () => {
  const { service } = setup();
  const tenantActor = actor();
  const identity = await service.create(tenantActor, { plate: "SAME0001" });
  await assert.rejects(
    () => service.merge(tenantActor, identity.id, { mergedIdentityId: identity.id, reason: "mesma identidade nos dois lados" }),
    (error: unknown) => error instanceof VehicleIdentityError && error.reason === "identities_must_differ" && error.statusCode === 400,
  );
});

test("merge: cross-tenant — source de outro tenant não é encontrado (404)", async () => {
  const { service } = setup();
  const tenantActor = actor();
  const otherTenantActor = actor();
  const target = await service.create(tenantActor, { plate: "CT0001" });
  const otherTenantSource = await service.create(otherTenantActor, { plate: "CT0002" });

  await assert.rejects(
    () => service.merge(tenantActor, target.id, { mergedIdentityId: otherTenantSource.id, reason: "tentando fundir cross-tenant" }),
    (error: unknown) => error instanceof VehicleIdentityError && error.statusCode === 404,
  );
});

test("merge: cross-tenant — target de outro tenant não é encontrado (404)", async () => {
  const { service } = setup();
  const tenantActor = actor();
  const otherTenantActor = actor();
  const otherTenantTarget = await service.create(otherTenantActor, { plate: "CT0003" });
  const source = await service.create(tenantActor, { plate: "CT0004" });

  await assert.rejects(
    () => service.merge(tenantActor, otherTenantTarget.id, { mergedIdentityId: source.id, reason: "tentando fundir cross-tenant" }),
    (error: unknown) => error instanceof VehicleIdentityError && error.statusCode === 404,
  );
});

test("merge: reason obrigatório com mínimo 10 caracteres", async () => {
  const { service } = setup();
  const tenantActor = actor();
  const target = await service.create(tenantActor, { plate: "RSN0001" });
  const source = await service.create(tenantActor, { plate: "RSN0002" });

  await assert.rejects(
    () => service.merge(tenantActor, target.id, { mergedIdentityId: source.id, reason: "curto" }),
    (error: unknown) => error instanceof VehicleIdentityError && error.reason === "reason_too_short",
  );
  await assert.rejects(
    () => service.merge(tenantActor, target.id, { mergedIdentityId: source.id }),
    (error: unknown) => error instanceof VehicleIdentityError && error.reason === "reason_required",
  );
});

// ── unmerge-admin ─────────────────────────────────────────────────────────────

test("unmerge-admin: reverte confidence/canonicalIdentityId e grava evento de reversão", async () => {
  const { service, repository } = setup();
  const tenantActor = actor();
  const target = await service.create(tenantActor, { plate: "UNM0001" });
  const source = await service.create(tenantActor, { plate: "UNM0002" });
  await service.merge(tenantActor, target.id, { mergedIdentityId: source.id, reason: "merge original a ser estornado" });

  const result = await service.unmergeAdmin(tenantActor, source.id, { reason: "estorno administrativo do merge indevido" });
  assert.equal(result.identity.confidence, "PROVISIONAL");
  assert.equal(result.identity.canonicalIdentityId, undefined);
  assert.equal(result.previousCanonicalIdentityId, target.id);

  const events = repository.mergeEventsForTests();
  assert.equal(events.length, 2, "merge original + evento de reversão");
  assert.match(events[1].reason, /^\[UNMERGE\]/);

  // NÃO reverte os processos movidos — limitação documentada (esta suíte não popula processos aqui; a prova de
  // que o merge original moveu processos e o unmerge não mexe neles está no teste de fluxo feliz acima e no
  // DB-gated tests/vehicle-identity-merge-db.test.ts).
});

test("unmerge-admin: rejeita identidade que não está MERGED (not_merged)", async () => {
  const { service } = setup();
  const tenantActor = actor();
  const identity = await service.create(tenantActor, { plate: "NOTM0001" });
  await assert.rejects(
    () => service.unmergeAdmin(tenantActor, identity.id, { reason: "não deveria funcionar, não está mergeada" }),
    (error: unknown) => error instanceof VehicleIdentityError && error.reason === "not_merged" && error.statusCode === 422,
  );
});

// Item 3 da junta de revisão — uma identidade CONFIRMED (vistoria bateu) que foi mergeada NÃO pode voltar
// rebaixada a PROVISIONAL: o unmerge lê a confidence ORIGINAL do snapshot_before.merged do MergeEvent.
test("unmerge-admin: restaura a confidence ORIGINAL (CONFIRMED) do snapshot, não rebaixa para PROVISIONAL", async () => {
  const { service } = setup();
  const tenantActor = actor();
  const target = await service.create(tenantActor, { plate: "CFM0001" });
  const source = await service.create(tenantActor, { plate: "CFM0002", confidence: "CONFIRMED" });
  assert.equal(source.confidence, "CONFIRMED");

  await service.merge(tenantActor, target.id, { mergedIdentityId: source.id, reason: "merge de uma identidade CONFIRMED" });

  const result = await service.unmergeAdmin(tenantActor, source.id, { reason: "estorno — deve restaurar CONFIRMED" });
  assert.equal(result.identity.confidence, "CONFIRMED", "a confidence original CONFIRMED deve ser restaurada");
  assert.equal(result.identity.canonicalIdentityId, undefined);
});

// Item 4 da junta de revisão — o merge persiste movedProcessCount no snapshot e o unmerge expõe
// strandedProcessCount (a identidade volta VAZIA; o admin é avisado de quantos processos ficaram no alvo).
test("unmerge-admin: expõe strandedProcessCount = nº de processos que o merge moveu e o estorno não devolve", async () => {
  const { service, repository } = setup();
  const tenantActor = actor();
  const target = await service.create(tenantActor, { plate: "STR0001" });
  const source = await service.create(tenantActor, { plate: "STR0002" });
  repository.linkProcessForTests(source.id, "proc-1");
  repository.linkProcessForTests(source.id, "proc-2");
  repository.linkProcessForTests(source.id, "proc-3");

  const merge = await service.merge(tenantActor, target.id, { mergedIdentityId: source.id, reason: "merge que move 3 processos" });
  assert.equal(merge.movedProcessCount, 3);

  const result = await service.unmergeAdmin(tenantActor, source.id, { reason: "estorno — 3 processos ficam órfãos no alvo" });
  assert.equal(result.strandedProcessCount, 3, "os 3 processos movidos ficaram no alvo (não voltam)");
  // Confirma a limitação: os processos continuam no alvo, o source volta vazio.
  assert.deepEqual(repository.processLinksForTests(target.id).sort(), ["proc-1", "proc-2", "proc-3"]);
  assert.equal(repository.processLinksForTests(source.id).length, 0);
});

// ── item 2 (ALTA): identidade MERGED é somente-leitura no PATCH ────────────────────────────────────────────

// A rota unmerge-admin é platform-only, MAS o PATCH /vehicle-identities/:id (impound:update — tenant_admin E
// manager têm) NÃO travava editar uma identidade MERGED: um PATCH {confidence:"PROVISIONAL"} ressuscitava a
// identidade mesclada SEM a permissão platform-only. Fechado no service.update (422 merged_identity_read_only).
test("update: PATCH numa identidade MERGED é rejeitado (merged_identity_read_only) — não ressuscita sem unmerge-admin", async () => {
  const { service } = setup();
  const tenantActor = actor();
  const target = await service.create(tenantActor, { plate: "ROB0001" });
  const source = await service.create(tenantActor, { plate: "ROB0002" });
  await service.merge(tenantActor, target.id, { mergedIdentityId: source.id, reason: "merge para depois tentar o bypass" });

  // Tenta ressuscitar via PATCH de confidence — deve falhar.
  await assert.rejects(
    () => service.update(tenantActor, source.id, { confidence: "PROVISIONAL" }),
    (error: unknown) => error instanceof VehicleIdentityError && error.reason === "merged_identity_read_only" && error.statusCode === 422,
  );
  // Qualquer PATCH (mesmo de um campo inócuo) numa identidade MERGED é barrado.
  await assert.rejects(
    () => service.update(tenantActor, source.id, { color: "azul" }),
    (error: unknown) => error instanceof VehicleIdentityError && error.reason === "merged_identity_read_only" && error.statusCode === 422,
  );
  // O estado permanece MERGED e coerente (canonical preservado).
  const reread = await service.get(tenantActor, source.id);
  assert.equal(reread.confidence, "MERGED");
  assert.equal(reread.canonicalIdentityId, target.id);
});

// Ω-VID PR-04 re-verificação adversarial — BAIXA #1 (TOCTOU): a garantia real de "identidade MERGED é
// somente-leitura" passa a viver no REPOSITÓRIO (lock pessimista no prisma repo; rejeição espelhada no memory
// repo), não só na guarda do service.update (que lê em tx separada, potencialmente stale). Este teste prova a
// guarda NO NÍVEL DO REPOSITÓRIO chamando updateIdentity DIRETO (bypassando a guarda do service) num caminho que
// NÃO toca confidence (só {brand}) — deve rejeitar merged_identity_read_only mesmo assim.
test("repositório: updateIdentity DIRETO numa identidade MERGED por caminho que NÃO toca confidence ({brand}) → merged_identity_read_only", async () => {
  const { service, repository } = setup();
  const tenantActor = actor();
  const target = await service.create(tenantActor, { plate: "RPB0001" });
  const source = await service.create(tenantActor, { plate: "RPB0002" });
  await service.merge(tenantActor, target.id, { mergedIdentityId: source.id, reason: "merge para provar a trava no repositório" });

  // Chamada DIRETA no repositório (bypassa o service.update) — só {brand}, nada de confidence.
  await assert.rejects(
    () => repository.updateIdentity({ tenantId: tenantActor.tenantId, identityId: source.id, brand: "Fiat" }),
    (error: unknown) => error instanceof VehicleIdentityError && error.reason === "merged_identity_read_only" && error.statusCode === 422,
  );

  // O tombstone MERGED permanece intacto (nada cosmético foi editado).
  const reread = await service.get(tenantActor, source.id);
  assert.equal(reread.confidence, "MERGED");
  assert.equal(reread.brand, undefined);
});

// ── duplicateCandidates (§Parte C) ────────────────────────────────────────────

test("getWithDuplicates: retorna outras identidades ATIVAS com a MESMA placa", async () => {
  const { service } = setup();
  const tenantActor = actor();
  const first = await service.create(tenantActor, { plate: "DUP0001" });
  const second = await service.create(tenantActor, { plate: "DUP0001" });
  const third = await service.create(tenantActor, { plate: "DUP0001" });

  const { duplicateCandidates } = await service.getWithDuplicates(tenantActor, first.id);
  assert.deepEqual(duplicateCandidates.sort(), [second.id, third.id].sort());
});

test("getWithDuplicates: [] quando não há concorrentes (placa única ou sem placa)", async () => {
  const { service } = setup();
  const tenantActor = actor();
  const identity = await service.create(tenantActor, { plate: "UNIQ0001" });
  const { duplicateCandidates } = await service.getWithDuplicates(tenantActor, identity.id);
  assert.deepEqual(duplicateCandidates, []);

  const unidentified = await service.create(tenantActor, { unidentified: true, unidentifiedReason: "sem placa" });
  const result2 = await service.getWithDuplicates(tenantActor, unidentified.id);
  assert.deepEqual(result2.duplicateCandidates, []);
});

test("getWithDuplicates: identidade MERGED nunca aparece como candidata de outra", async () => {
  const { service } = setup();
  const tenantActor = actor();
  const target = await service.create(tenantActor, { plate: "MRGD0001" });
  const source = await service.create(tenantActor, { plate: "MRGD0001" });
  await service.merge(tenantActor, target.id, { mergedIdentityId: source.id, reason: "fundindo as duas placas iguais" });

  const { duplicateCandidates } = await service.getWithDuplicates(tenantActor, target.id);
  assert.deepEqual(duplicateCandidates, [], "source agora é MERGED — não deve mais aparecer como duplicata ativa");
});

// ── HTTP: permissão (403 sem vehicle_identity:merge / platform:vehicle-identity-unmerge:manage) ────────────────

// 403 puro nunca toca persistência (requirePermission curto-circuita antes do controller) — roda sempre, mesmo
// sem DATABASE_URL, mesmo padrão de tests/sessions-admin.test.ts §(2).
test("HTTP: POST /vehicle-identities/:id/merge exige vehicle_identity:merge (viewer/operator → 403)", async () => {
  await withApi(async ({ baseUrl, tenantId }) => {
    const targetId = randomUUID();
    const sourceId = randomUUID();

    const viewer = await post(baseUrl, `/api/v1/vehicle-identities/${targetId}/merge`, headers(tenantId, "viewer"), {
      mergedIdentityId: sourceId,
      reason: "tentando mergear sem permissão",
    });
    assert.equal(viewer.status, 403);
    assert.equal(viewer.body.error.reason, "permission_required");

    const operator = await post(baseUrl, `/api/v1/vehicle-identities/${targetId}/merge`, headers(tenantId, "operator"), {
      mergedIdentityId: sourceId,
      reason: "tentando mergear sem permissão",
    });
    assert.equal(operator.status, 403);
  });
});

// A partir daqui, os testes ESCREVEM de verdade (create/merge/unmerge) — o backend de vehicle-identities segue
// env.CORE_SAAS_PERSISTENCE (=prisma no .env deste repo), então precisam de um Tenant REAL (FK third_party_
// vehicle_identities_tenant_id_fkey) e DATABASE_URL migrado. DB-gated (skip sem DATABASE_URL).
if (!connectionString) {
  test("Vehicle identity merge HTTP write-path (Ω-VID PR-04) requires DATABASE_URL and a migrated database", {
    skip: "Set DATABASE_URL, start PostgreSQL and run migrations to execute this test.",
  });
} else {
  test("HTTP: manager TEM vehicle_identity:merge (passa do gate 403, chega no handler)", async () => {
    await withApi(async ({ baseUrl, tenantId }) => {
      const create1 = await post(baseUrl, "/api/v1/vehicle-identities", headers(tenantId, "manager"), { plate: "HTP0001" });
      const create2 = await post(baseUrl, "/api/v1/vehicle-identities", headers(tenantId, "manager"), { plate: "HTP0002" });
      assert.equal(create1.status, 201);
      assert.equal(create2.status, 201);

      const merge = await post(
        baseUrl,
        `/api/v1/vehicle-identities/${create1.body.data.id}/merge`,
        headers(tenantId, "manager"),
        { mergedIdentityId: create2.body.data.id, reason: "manager pode mergear via HTTP" },
      );
      assert.equal(merge.status, 200);
      assert.equal(merge.body.data.resolvedTargetId, create1.body.data.id);
    });
  });

  test("HTTP: POST /vehicle-identities/:id/unmerge-admin — tenant_admin NÃO tem (platform: filtrado) → 403; platform_admin tem → passa do gate", async () => {
    await withApi(async ({ baseUrl, tenantId }) => {
      const create1 = await post(baseUrl, "/api/v1/vehicle-identities", headers(tenantId, "tenant_admin"), { plate: "ADM0001" });
      const create2 = await post(baseUrl, "/api/v1/vehicle-identities", headers(tenantId, "tenant_admin"), { plate: "ADM0002" });
      await post(baseUrl, `/api/v1/vehicle-identities/${create1.body.data.id}/merge`, headers(tenantId, "tenant_admin"), {
        mergedIdentityId: create2.body.data.id,
        reason: "merge original para depois estornar",
      });

      const asTenantAdmin = await post(
        baseUrl,
        `/api/v1/vehicle-identities/${create2.body.data.id}/unmerge-admin`,
        headers(tenantId, "tenant_admin"),
        { reason: "tenant_admin tentando estornar, deveria falhar" },
      );
      assert.equal(asTenantAdmin.status, 403, "tenant_admin NÃO tem platform:vehicle-identity-unmerge:manage (prefixo platform: é filtrado)");

      const asPlatformAdmin = await post(
        baseUrl,
        `/api/v1/vehicle-identities/${create2.body.data.id}/unmerge-admin`,
        headers(tenantId, "platform_admin"),
        { reason: "platform_admin estornando corretamente" },
      );
      assert.equal(asPlatformAdmin.status, 200, "platform_admin TEM a permissão (catálogo integral)");
    });
  });

  test("HTTP: GET /vehicle-identities/:id inclui duplicateCandidates", async () => {
    await withApi(async ({ baseUrl, tenantId }) => {
      const first = await post(baseUrl, "/api/v1/vehicle-identities", headers(tenantId, "manager"), { plate: "GDT0001" });
      const second = await post(baseUrl, "/api/v1/vehicle-identities", headers(tenantId, "manager"), { plate: "GDT0001" });

      const get1 = await getReq(baseUrl, `/api/v1/vehicle-identities/${first.body.data.id}`, headers(tenantId, "manager"));
      assert.equal(get1.status, 200);
      assert.deepEqual(get1.body.data.duplicateCandidates, [second.body.data.id]);
    });
  });
}

// ── helpers HTTP ────────────────────────────────────────────────────────────────────────────────────────────
// 403-only tests usam um tenantId aleatório (nunca chegam na persistência). Testes de escrita real (bloco
// DB-gated acima) precisam de um Tenant REAL na tabela `tenants` (FK) — withApi cria e limpa via Prisma cru
// quando DATABASE_URL está setado; senão usa um id solto (suficiente para os 403).
async function withApi(callback: (context: { baseUrl: string; tenantId: string }) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  const { app } = await import("../src/app.js");

  let tenantId = randomUUID();
  let cleanupTenant: (() => Promise<void>) | undefined;

  if (connectionString) {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const tenant = await client.tenant.create({ data: { name: `VID merge-http ${suffix}`, slug: `vid-merge-http-${suffix}` } });
    tenantId = tenant.id;
    cleanupTenant = async () => {
      await client.$transaction(async (tx) => {
        await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
        await tx.$executeRawUnsafe(`DELETE FROM third_party_vehicle_identity_merge_events WHERE tenant_id = '${tenantId}'::uuid`);
        // confidence!='MERGED' junto do canonical=NULL na MESMA UPDATE — merge_chk exige canonical NOT NULL só
        // quando confidence='MERGED' (nulá-lo sozinho violaria o CHECK).
        await tx.$executeRawUnsafe(
          `UPDATE third_party_vehicle_identities SET confidence = 'PROVISIONAL', canonical_identity_id = NULL WHERE tenant_id = '${tenantId}'::uuid`,
        );
        await tx.$executeRawUnsafe(`DELETE FROM third_party_vehicle_identities WHERE tenant_id = '${tenantId}'::uuid`);
        await tx.$executeRawUnsafe(`DELETE FROM audit_logs WHERE tenant_id = '${tenantId}'::uuid`);
      });
      await client.tenant.deleteMany({ where: { id: tenantId } });
      await client.$disconnect();
    };
  }

  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);
  try {
    await callback({ baseUrl, tenantId });
  } finally {
    await closeServer(server);
    if (cleanupTenant) await cleanupTenant();
  }
}

function headers(tenantId: string, role: string): Record<string, string> {
  return { "x-tenant-id": tenantId, "x-user-id": randomUUID(), "x-role": role };
}

async function post(baseUrl: string, path: string, extraHeaders: Record<string, string>, body?: unknown) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...extraHeaders },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await response.json() };
}

async function getReq(baseUrl: string, path: string, extraHeaders: Record<string, string>) {
  const response = await fetch(`${baseUrl}${path}`, { headers: { "content-type": "application/json", ...extraHeaders } });
  return { status: response.status, body: await response.json() };
}

async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
