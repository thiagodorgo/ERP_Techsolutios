import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { InMemoryVehicleIdentityRepository } from "../src/modules/vehicle-identities/vehicle-identity.repository.js";

const connectionString = process.env.DATABASE_URL;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// ── Ω-VID PR-05 — helper de semeadura de identidade (unit, InMemory, SEMPRE roda) ─────────────────────────────
// A prova AUTORITATIVA (CHECK do banco, RLS, identity_id, links AUTO, concorrência real) é DB-gated abaixo; estes
// unitários provam a LÓGICA de reuso/exclusão-de-MERGED do helper sem depender do Postgres.
test("Ω-VID helper resolveOrCreateByPlateKey: cria na 1ª chamada e REUSA na 2ª (mesma placa → mesma identidade)", async () => {
  const repo = new InMemoryVehicleIdentityRepository();
  const tenantId = randomUUID();
  const first = await repo.resolveOrCreateByPlateKey({ tenantId, plateKey: "ABC1D23", seed: { plateRaw: "ABC-1D23", model: "GOL" } });
  assert.equal(first.reused, false, "1ª chamada funda a identidade");
  const second = await repo.resolveOrCreateByPlateKey({ tenantId, plateKey: "ABC1D23", seed: {} });
  assert.equal(second.reused, true, "2ª chamada reusa (dossiê por veículo ao longo do tempo)");
  assert.equal(second.id, first.id);
  const created = await repo.findIdentityById(tenantId, first.id);
  assert.equal(created?.confidence, "PROVISIONAL");
  assert.equal(created?.unidentified, false);
  assert.equal(created?.plateKey, "ABC1D23");
});

test("Ω-VID helper resolveOrCreateByPlateKey: identidade MERGED é EXCLUÍDA do reuso (mesmo sendo a mais antiga)", async () => {
  const repo = new InMemoryVehicleIdentityRepository();
  const tenantId = randomUUID();
  // A (mais antiga) e B (mais nova), mesma placa. Mescla A→B ⇒ A vira MERGED. resolve(placa) deve PULAR A e reusar B.
  const a = await repo.createIdentity({ tenantId, plateKey: "PPP1P11", plateRaw: "PPP1P11", unidentified: false, confidence: "PROVISIONAL" });
  await sleep(5);
  const b = await repo.createIdentity({ tenantId, plateKey: "PPP1P11", plateRaw: "PPP1P11", unidentified: false, confidence: "PROVISIONAL" });
  await repo.mergeIdentities({ tenantId, targetId: b.id, mergedIdentityId: a.id, reason: "reconciliação de teste" });
  const resolved = await repo.resolveOrCreateByPlateKey({ tenantId, plateKey: "PPP1P11", seed: {} });
  assert.equal(resolved.reused, true, "reusa a identidade ATIVA");
  assert.equal(resolved.id, b.id, "pula a MERGED (mais antiga) e reusa a ATIVA — mesma semântica confidence≠'MERGED' da query byte-idêntica");
});

test("Ω-VID helper createProvisionalUnidentified: PROVISIONAL/unidentified=true com reason, SEM plate_key", async () => {
  const repo = new InMemoryVehicleIdentityRepository();
  const tenantId = randomUUID();
  const result = await repo.createProvisionalUnidentified({ tenantId, unidentifiedReason: "sem placa plausível", seed: { model: "MOTO", color: "AZUL" } });
  assert.equal(result.reused, false);
  const identity = await repo.findIdentityById(tenantId, result.id);
  assert.equal(identity?.unidentified, true);
  assert.equal(identity?.confidence, "PROVISIONAL");
  assert.equal(identity?.plateKey, undefined, "ramo unidentified NUNCA grava identificador forte (placa)");
  assert.equal(identity?.unidentifiedReason, "sem placa plausível");
});

// PR-06 (D-Ω5P-REC-03 / RN-CUS-05) — gatilho OS→custódia DURÁVEL via SWEEP `impound.reconcile-removals`. DB-gated
// (skip sem DATABASE_URL) — a durabilidade se prova contra o Postgres vivo (partial-unique + FK + RLS).
if (!connectionString) {
  test("Impound trigger durability requires DATABASE_URL and a migrated database", {
    skip: "Set DATABASE_URL, start PostgreSQL and run migrations to execute this test.",
  });
} else {
  test("sweep abre custódia em RECEPÇÃO (entered_at = OS.completed_at) para OS de remoção concluída", async () => {
    const { client, service, reconcile } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedTenant(client, suffix);
    const completedAt = new Date("2026-07-20T09:30:00.000Z");
    try {
      await seedRemovalWorkOrder(client, ctx, { code: `WO-${suffix}-1`, profileId: ctx.profileId, status: "completed", completedAt });
      const opened = await reconcile(ctx.tenantId);
      assert.equal(opened, 1, "o sweep deve abrir exatamente 1 custódia");

      const rows = await selectProcesses(client, ctx.tenantId);
      assert.equal(rows.length, 1);
      assert.equal(rows[0].status, "RECEPTION");
      assert.equal(new Date(rows[0].entered_at).toISOString(), completedAt.toISOString(), "entered_at = t0 = completed_at");
      assert.equal(rows[0].vehicle_unidentified, true, "processo auto-aberto = identidade a confirmar pela vistoria");
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  test("idempotente: sweep 2× → 1 único processo (índice PARCIAL único tenant+service_order)", async () => {
    const { client, reconcile } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedTenant(client, suffix);
    try {
      await seedRemovalWorkOrder(client, ctx, { code: `WO-${suffix}-1`, profileId: ctx.profileId, status: "completed", completedAt: new Date() });
      const first = await reconcile(ctx.tenantId);
      const second = await reconcile(ctx.tenantId);
      assert.equal(first, 1);
      assert.equal(second, 0, "o 2º tick não reabre (LEFT JOIN exclui a OS já com processo)");
      const rows = await selectProcesses(client, ctx.tenantId);
      assert.equal(rows.length, 1, "exatamente 1 processo para a OS");
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  test("durável: OS concluída SEM processo (evento perdido) → o sweep reconcilia (catch-up)", async () => {
    const { client, reconcile } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedTenant(client, suffix);
    const completedAt = new Date("2026-07-18T14:00:00.000Z");
    try {
      // Simula o "evento perdido": a OS ficou concluída sem NENHUM processo (worker caído no momento da conclusão).
      await seedRemovalWorkOrder(client, ctx, { code: `WO-${suffix}-lost`, profileId: ctx.profileId, status: "completed", completedAt });
      const before = await selectProcesses(client, ctx.tenantId);
      assert.equal(before.length, 0, "sem processo antes do sweep (buraco probatório)");
      const opened = await reconcile(ctx.tenantId);
      assert.equal(opened, 1, "o sweep é o backstop de durabilidade");
      const after = await selectProcesses(client, ctx.tenantId);
      assert.equal(after.length, 1);
      assert.equal(after[0].status, "RECEPTION");
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  test("F-1(b) cura de half-open: processo preso em IN_REMOVAL (entered_at NULL) → sweep cura p/ RECEPÇÃO (entered_at=completed_at)", async () => {
    const { client, reconcile } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedTenant(client, suffix);
    const completedAt = new Date("2026-07-19T08:00:00.000Z");
    try {
      const wo = await seedRemovalWorkOrder(client, ctx, { code: `WO-${suffix}-half`, profileId: ctx.profileId, status: "completed", completedAt });
      // Simula o half-open HERDADO do gatilho NÃO-atômico anterior: create (IN_REMOVAL + abertura) SEM a transição
      // a RECEPÇÃO → entered_at fica NULL (t0 nunca setado). O openFromRemoval NOVO é atômico e nunca produz isto.
      const { RlsPrismaImpoundRepository } = await import("../src/modules/impound/impound-prisma.repository.js");
      const repo = new RlsPrismaImpoundRepository(client);
      const halfOpen = await repo.createProcess({
        tenantId: ctx.tenantId,
        vehicleUnidentified: true,
        unidentifiedReason: "Aguardando vistoria de recepção",
        profileId: ctx.profileId,
        originAuthority: "Solicitação de remoção (legado)",
        serviceOrderId: wo,
        openingEvent: { type: "STATUS_CHANGE", payload: { from: null, to: "IN_REMOVAL", reason: "process_opened" }, occurredAt: completedAt, actorId: undefined },
      });
      assert.equal(halfOpen.status, "IN_REMOVAL");
      assert.equal(halfOpen.enteredAt, undefined, "half-open: entered_at NULL (t0 da diária nunca setado)");

      const cured = await reconcile(ctx.tenantId);
      assert.equal(cured, 1, "o sweep amplia o candidato e CURA o half-open (não fica preso para sempre)");
      const rows = await selectProcesses(client, ctx.tenantId);
      assert.equal(rows.length, 1, "cura o existente — não cria um 2º processo");
      assert.equal(rows[0].id, halfOpen.id);
      assert.equal(rows[0].status, "RECEPTION");
      assert.equal(new Date(rows[0].entered_at).toISOString(), completedAt.toISOString(), "entered_at = t0 = completed_at após a cura");

      // Idempotente: um 2º tick não re-cura (já saiu de IN_REMOVAL / já tem entered_at).
      assert.equal(await reconcile(ctx.tenantId), 0);
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  test("OS de serviço SEM custody_profile_id → o sweep PULA (não abre custódia)", async () => {
    const { client, reconcile } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedTenant(client, suffix);
    try {
      // Catálogo sem custody_profile_id (serviço que NÃO abre custódia).
      const plainCatalog = await insertServiceCatalog(client, ctx.tenantId, `Cat Plain ${suffix}`, null);
      await insertWorkOrder(client, ctx.tenantId, { code: `WO-${suffix}-plain`, catalogId: plainCatalog, status: "completed", completedAt: new Date() });
      const opened = await reconcile(ctx.tenantId);
      assert.equal(opened, 0, "sem custody_profile_id ⇒ não é OS de remoção que abre custódia");
      assert.equal((await selectProcesses(client, ctx.tenantId)).length, 0);
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  test("corrida criação-manual × sweep → exatamente 1 processo (409 duplicate_service_order engolido)", async () => {
    const { client, service, reconcile } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedTenant(client, suffix);
    try {
      const wo = await seedRemovalWorkOrder(client, ctx, { code: `WO-${suffix}-race`, profileId: ctx.profileId, status: "completed", completedAt: new Date() });
      // Criação manual "concorrente": openFromRemoval 2× para a MESMA OS → 1 abre, o 2º engole o 409.
      const a = await service.openFromRemoval({ tenantId: ctx.tenantId, serviceOrderId: wo, profileId: ctx.profileId, originAuthority: "OS", completedAt: new Date() });
      const b = await service.openFromRemoval({ tenantId: ctx.tenantId, serviceOrderId: wo, profileId: ctx.profileId, originAuthority: "OS", completedAt: new Date() });
      assert.equal(a.opened, true);
      assert.equal(b.opened, false, "o 2º openFromRemoval engole o duplicate_service_order (idempotente)");
      // O sweep depois também não duplica.
      const swept = await reconcile(ctx.tenantId);
      assert.equal(swept, 0);
      assert.equal((await selectProcesses(client, ctx.tenantId)).length, 1, "exatamente 1 processo para a OS");
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  test("sweep ESCOPADO por tenant: reconciliar A não abre custódia da OS concluída de B", async () => {
    const { client, reconcile } = await bootstrap(connectionString);
    const suffixA = uniq();
    const suffixB = uniq();
    const ctxA = await seedTenant(client, suffixA);
    const ctxB = await seedTenant(client, suffixB);
    try {
      await seedRemovalWorkOrder(client, ctxB, { code: `WO-${suffixB}-1`, profileId: ctxB.profileId, status: "completed", completedAt: new Date() });
      const openedA = await reconcile(ctxA.tenantId); // reconcilia SÓ A
      assert.equal(openedA, 0, "A não tem OS de remoção");
      assert.equal((await selectProcesses(client, ctxB.tenantId)).length, 0, "a custódia de B NÃO foi aberta ao reconciliar A (sweep escopado)");
    } finally {
      await teardown(client, ctxA.tenantId);
      await teardown(client, ctxB.tenantId);
      await client.$disconnect();
    }
  });

  // ── Ω-VID PR-05 — semeadura de identidade agregadora + AUTO-link de checklist na abertura (DB-gated) ─────────
  test("Ω-VID: placa plausível → identity_id setado (PROVISIONAL, unidentified=false, plate_key = normalizePlateKey)", async () => {
    const { client, reconcile } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedTenant(client, suffix);
    try {
      await seedRemovalWorkOrder(client, ctx, {
        code: `WO-${suffix}-plate`,
        profileId: ctx.profileId,
        status: "completed",
        completedAt: new Date(),
        serviceDetails: { plate: "ABC-1D23", vehicle: "GOL 1.0", color: "PRATA" },
      });
      assert.equal(await reconcile(ctx.tenantId), 1);
      const procs = await selectProcesses(client, ctx.tenantId);
      assert.equal(procs.length, 1);
      assert.equal(procs[0].vehicle_unidentified, true, "o PROCESSO segue unidentified (identidade dele só pela vistoria — D-Ω5P-REC-10)");
      assert.ok(procs[0].identity_id, "identity_id resolvido na MESMA tx da abertura");
      const identity = await getIdentity(client, ctx.tenantId, procs[0].identity_id!);
      assert.equal(identity.confidence, "PROVISIONAL", "identidade agregadora é PROVISIONAL (não confirmada por hint)");
      assert.equal(identity.unidentified, false);
      assert.equal(identity.plate_key, "ABC1D23", "plate_key = normalizePlateKey(hint)");
      assert.equal(identity.model, "GOL 1.0");
      assert.equal(identity.color, "PRATA");
      assert.equal(identity.created_by, null, "efeito-de-domínio SISTEMA: created_by = NULL");
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  test("Ω-VID: OS sem placa → identidade PROVISIONAL/unidentified=true (satisfaz identity_chk), identity_id setado", async () => {
    const { client, reconcile } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedTenant(client, suffix);
    try {
      await seedRemovalWorkOrder(client, ctx, { code: `WO-${suffix}-noplate`, profileId: ctx.profileId, status: "completed", completedAt: new Date() });
      assert.equal(await reconcile(ctx.tenantId), 1);
      const procs = await selectProcesses(client, ctx.tenantId);
      assert.ok(procs[0].identity_id, "mesmo sem placa, a identidade agregadora é criada e vinculada");
      const identity = await getIdentity(client, ctx.tenantId, procs[0].identity_id!);
      assert.equal(identity.unidentified, true);
      assert.equal(identity.confidence, "PROVISIONAL");
      assert.equal(identity.plate_key, null, "ramo unidentified NUNCA grava plate_key");
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  test("Ω-VID: guard de placa — lixo (< 7 alfanuméricos) → identidade unidentified (nunca semeia de lixo)", async () => {
    const { client, reconcile } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedTenant(client, suffix);
    try {
      await seedRemovalWorkOrder(client, ctx, {
        code: `WO-${suffix}-junk`,
        profileId: ctx.profileId,
        status: "completed",
        completedAt: new Date(),
        serviceDetails: { plate: "??", vehicle: "" },
      });
      assert.equal(await reconcile(ctx.tenantId), 1);
      const procs = await selectProcesses(client, ctx.tenantId);
      const identity = await getIdentity(client, ctx.tenantId, procs[0].identity_id!);
      assert.equal(identity.unidentified, true, "placa implausível não vira plate_key");
      assert.equal(identity.plate_key, null);
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  test("Ω-VID: 2º tick idempotente → 0 novos, 1 processo, 1 identidade", async () => {
    const { client, reconcile } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedTenant(client, suffix);
    try {
      await seedRemovalWorkOrder(client, ctx, {
        code: `WO-${suffix}-idem`,
        profileId: ctx.profileId,
        status: "completed",
        completedAt: new Date(),
        serviceDetails: { plate: "IDE1M00" },
      });
      assert.equal(await reconcile(ctx.tenantId), 1);
      assert.equal(await reconcile(ctx.tenantId), 0, "2º tick não reabre");
      assert.equal((await selectProcesses(client, ctx.tenantId)).length, 1);
      assert.equal(await countIdentities(client, ctx.tenantId), 1, "sem 2ª identidade no re-tick");
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  test("Ω-VID: reuso de identidade da MESMA placa entre OS distintas (dossiê por veículo; sem 2ª identidade)", async () => {
    const { client, reconcile } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedTenant(client, suffix);
    try {
      await seedRemovalWorkOrder(client, ctx, { code: `WO-${suffix}-r1`, profileId: ctx.profileId, status: "completed", completedAt: new Date(), serviceDetails: { plate: "REU1S00" } });
      await reconcile(ctx.tenantId);
      await seedRemovalWorkOrder(client, ctx, { code: `WO-${suffix}-r2`, profileId: ctx.profileId, status: "completed", completedAt: new Date(), serviceDetails: { plate: "reu-1s00" } });
      await reconcile(ctx.tenantId);
      const procs = await selectProcesses(client, ctx.tenantId);
      assert.equal(procs.length, 2);
      const ids = new Set(procs.map((row) => row.identity_id));
      assert.equal(ids.size, 1, "as 2 OS da mesma placa apontam para a MESMA identidade");
      assert.equal(await countIdentities(client, ctx.tenantId, "REU1S00"), 1, "exatamente 1 identidade para a placa (reuso, não 2ª)");
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  test("Ω-VID: AUTO-link — 1 ChecklistRun da OS → 1 link (link_source=AUTO)", async () => {
    const { client, reconcile } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedTenant(client, suffix);
    try {
      const wo = await seedRemovalWorkOrder(client, ctx, { code: `WO-${suffix}-run1`, profileId: ctx.profileId, status: "completed", completedAt: new Date(), serviceDetails: { plate: "LNK1A00" } });
      const runId = await seedChecklistRun(client, ctx, wo, suffix);
      assert.equal(await reconcile(ctx.tenantId), 1);
      const procs = await selectProcesses(client, ctx.tenantId);
      const links = await selectLinks(client, ctx.tenantId, procs[0].id);
      assert.equal(links.length, 1, "o ChecklistRun da OS é auto-vinculado ao processo");
      assert.equal(links[0].checklist_run_id, runId);
      assert.equal(links[0].link_source, "AUTO");
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  test("Ω-VID: AUTO-link — OS com 2 ChecklistRun → 2 links", async () => {
    const { client, reconcile } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedTenant(client, suffix);
    try {
      const wo = await seedRemovalWorkOrder(client, ctx, { code: `WO-${suffix}-run2`, profileId: ctx.profileId, status: "completed", completedAt: new Date(), serviceDetails: { plate: "LNK2A00" } });
      await seedChecklistRun(client, ctx, wo, `${suffix}-a`);
      await seedChecklistRun(client, ctx, wo, `${suffix}-b`);
      await reconcile(ctx.tenantId);
      const procs = await selectProcesses(client, ctx.tenantId);
      const links = await selectLinks(client, ctx.tenantId, procs[0].id);
      assert.equal(links.length, 2, "ambas as runs da OS viram links AUTO");
      assert.ok(links.every((link) => link.link_source === "AUTO"));
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  test("Ω-VID: AUTO-link — OS SEM ChecklistRun → abre sem erro e sem link", async () => {
    const { client, reconcile } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedTenant(client, suffix);
    try {
      await seedRemovalWorkOrder(client, ctx, { code: `WO-${suffix}-run0`, profileId: ctx.profileId, status: "completed", completedAt: new Date(), serviceDetails: { plate: "LNK0A00" } });
      assert.equal(await reconcile(ctx.tenantId), 1, "abre normalmente mesmo sem checklist");
      const procs = await selectProcesses(client, ctx.tenantId);
      assert.equal((await selectLinks(client, ctx.tenantId, procs[0].id)).length, 0);
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  test("Ω-VID: AUTO-link idempotente — re-linkar o MESMO par (process, run) não duplica (upsert)", async () => {
    const { client, reconcile } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedTenant(client, suffix);
    try {
      const wo = await seedRemovalWorkOrder(client, ctx, { code: `WO-${suffix}-idl`, profileId: ctx.profileId, status: "completed", completedAt: new Date(), serviceDetails: { plate: "IDL1A00" } });
      const runId = await seedChecklistRun(client, ctx, wo, suffix);
      await reconcile(ctx.tenantId);
      const procs = await selectProcesses(client, ctx.tenantId);
      // Re-linka o MESMO par via o repositório de links (o primitivo que o sweep usa) — upsert ⇒ 1 linha só.
      const { RlsPrismaImpoundChecklistLinkRepository } = await import("../src/modules/impound/impound.checklist-link-prisma.repository.js");
      const linkRepo = new RlsPrismaImpoundChecklistLinkRepository(client);
      await linkRepo.createLink({ tenantId: ctx.tenantId, processId: procs[0].id, checklistRunId: runId, linkSource: "AUTO", createdBy: undefined });
      await linkRepo.createLink({ tenantId: ctx.tenantId, processId: procs[0].id, checklistRunId: runId, linkSource: "MANUAL", createdBy: undefined });
      const links = await selectLinks(client, ctx.tenantId, procs[0].id);
      assert.equal(links.length, 1, "re-link do mesmo par é no-op (idempotência pela unique)");
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  test("Ω-VID: duplicate_service_order CONCORRENTE → perdedor faz rollback SEM identidade/link órfãos", async () => {
    const { client, service } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedTenant(client, suffix);
    try {
      const wo = await seedRemovalWorkOrder(client, ctx, { code: `WO-${suffix}-conc`, profileId: ctx.profileId, status: "completed", completedAt: new Date(), serviceDetails: { plate: "CON1C00" } });
      const runId = await seedChecklistRun(client, ctx, wo, suffix);
      const open = () =>
        service.openFromRemoval({ tenantId: ctx.tenantId, serviceOrderId: wo, profileId: ctx.profileId, originAuthority: "OS", completedAt: new Date(), vehiclePlate: "CON1C00" });
      const [a, b] = await Promise.all([open(), open()]);
      assert.equal([a, b].filter((r) => r.opened).length, 1, "exatamente 1 abre; o perdedor engole o 409");
      assert.equal((await selectProcesses(client, ctx.tenantId)).length, 1, "1 processo para a OS");
      assert.equal(await countIdentities(client, ctx.tenantId), 1, "o perdedor NÃO deixa identidade órfã (rollback da tx inteira)");
      const procs = await selectProcesses(client, ctx.tenantId);
      const links = await selectLinks(client, ctx.tenantId, procs[0].id);
      assert.equal(links.length, 1, "1 link — nenhum link órfão do perdedor");
      assert.equal(links[0].checklist_run_id, runId);
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  test("Ω-VID: run de OUTRO tenant com mesmo related_entity_id NÃO é linkada (tenant-scoped)", async () => {
    const { client, reconcile } = await bootstrap(connectionString);
    const suffixA = uniq();
    const suffixB = uniq();
    const ctxA = await seedTenant(client, suffixA);
    const ctxB = await seedTenant(client, suffixB);
    try {
      const woA = await seedRemovalWorkOrder(client, ctxA, { code: `WO-${suffixA}-x`, profileId: ctxA.profileId, status: "completed", completedAt: new Date(), serviceDetails: { plate: "XTN1A00" } });
      const runA = await seedChecklistRun(client, ctxA, woA, suffixA);
      // Run em B cujo related_entity_id colide com a OS de A (campo TEXT livre, sem FK) — não pode ser linkada a A.
      await seedChecklistRunRaw(client, ctxB, woA, suffixB);
      await reconcile(ctxA.tenantId);
      const procsA = await selectProcesses(client, ctxA.tenantId);
      const links = await selectLinks(client, ctxA.tenantId, procsA[0].id);
      assert.equal(links.length, 1, "só a run do PRÓPRIO tenant é linkada");
      assert.equal(links[0].checklist_run_id, runA, "a run de B (mesmo related_entity_id) fica de fora");
    } finally {
      await teardown(client, ctxA.tenantId);
      await teardown(client, ctxB.tenantId);
      await client.$disconnect();
    }
  });

  test("Ω-VID: verifyChain OK com identity_id setado (identidade não entra no hash da cadeia)", async () => {
    const { client, service, reconcile } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedTenant(client, suffix);
    try {
      await seedRemovalWorkOrder(client, ctx, { code: `WO-${suffix}-vc`, profileId: ctx.profileId, status: "completed", completedAt: new Date(), serviceDetails: { plate: "VER1F00" } });
      await reconcile(ctx.tenantId);
      const procs = await selectProcesses(client, ctx.tenantId);
      const result = await service.verify({ tenantId: ctx.tenantId, userId: randomUUID(), roles: [], permissions: [] }, procs[0].id);
      assert.equal(result.valid, true, "a cadeia verifica — identity_id não é hasheado (é metadado do agregado, não evento)");
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  test("Ω-VID: N ticks CONCORRENTES da mesma OS → 1 processo e ≤ 1 identidade", async () => {
    const { client, reconcile } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedTenant(client, suffix);
    try {
      await seedRemovalWorkOrder(client, ctx, { code: `WO-${suffix}-nt`, profileId: ctx.profileId, status: "completed", completedAt: new Date(), serviceDetails: { plate: "NTK1A00" } });
      const results = await Promise.all([reconcile(ctx.tenantId), reconcile(ctx.tenantId), reconcile(ctx.tenantId), reconcile(ctx.tenantId)]);
      assert.equal(results.reduce((sum, opened) => sum + opened, 0), 1, "índice PARCIAL único ⇒ exatamente 1 abertura entre os ticks concorrentes");
      assert.equal((await selectProcesses(client, ctx.tenantId)).length, 1);
      assert.equal(await countIdentities(client, ctx.tenantId), 1, "perdedores revertem a identidade junto ⇒ ≤ 1 identidade");
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  test("Ω-VID: convergência backfill↔sweep — identidade pré-existente (helper standalone) é REUSADA pelo sweep", async () => {
    const { client, reconcile } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedTenant(client, suffix);
    try {
      const { RlsPrismaVehicleIdentityRepository } = await import("../src/modules/vehicle-identities/vehicle-identity-prisma.repository.js");
      const identityRepo = new RlsPrismaVehicleIdentityRepository(client);
      const pre = await identityRepo.resolveOrCreateByPlateKey({ tenantId: ctx.tenantId, plateKey: "CNV1G00", seed: { plateRaw: "CNV1G00" } });
      assert.equal(pre.reused, false, "cria a identidade pré-existente (simula o backfill)");
      await seedRemovalWorkOrder(client, ctx, { code: `WO-${suffix}-cnv`, profileId: ctx.profileId, status: "completed", completedAt: new Date(), serviceDetails: { plate: "CNV-1G00" } });
      await reconcile(ctx.tenantId);
      const procs = await selectProcesses(client, ctx.tenantId);
      assert.equal(procs[0].identity_id, pre.id, "o sweep reusa a identidade do backfill (query byte-idêntica ⇒ convergem)");
      assert.equal(await countIdentities(client, ctx.tenantId, "CNV1G00"), 1);
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  test("Ω-VID: isolamento de identidade entre tenants — B não reusa a identidade de A da mesma placa", async () => {
    const { client, reconcile } = await bootstrap(connectionString);
    const suffixA = uniq();
    const suffixB = uniq();
    const ctxA = await seedTenant(client, suffixA);
    const ctxB = await seedTenant(client, suffixB);
    try {
      const { RlsPrismaVehicleIdentityRepository } = await import("../src/modules/vehicle-identities/vehicle-identity-prisma.repository.js");
      const identityA = await new RlsPrismaVehicleIdentityRepository(client).resolveOrCreateByPlateKey({ tenantId: ctxA.tenantId, plateKey: "ISO1A00", seed: {} });
      await seedRemovalWorkOrder(client, ctxB, { code: `WO-${suffixB}-iso`, profileId: ctxB.profileId, status: "completed", completedAt: new Date(), serviceDetails: { plate: "ISO1A00" } });
      await reconcile(ctxB.tenantId);
      const procsB = await selectProcesses(client, ctxB.tenantId);
      assert.notEqual(procsB[0].identity_id, identityA.id, "B NÃO reusa a identidade de A (RLS/tenant-scoped)");
      assert.equal(await countIdentities(client, ctxB.tenantId, "ISO1A00"), 1, "B fundou a SUA própria identidade");
    } finally {
      await teardown(client, ctxA.tenantId);
      await teardown(client, ctxB.tenantId);
      await client.$disconnect();
    }
  });

  // ── Ω-VID PR-05 FIX-JUNTA (D-Ω-VID-05-SEED) — a VISTORIA reconcilia identity_id (SPLIT da colisão-por-reuso) ──
  test("Ω-VID FIX-JUNTA: vistoria com placa CONFIRMADA diferente da semeada → SPLIT (processo de Y sai da identidade de X)", async () => {
    const { client, service, reconcile } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedTenant(client, suffix);
    try {
      // Dois VEÍCULOS FÍSICOS distintos (X e Y) cujas placas na OS normalizam para a MESMA chave "XAB1C00" (a de Y
      // foi DIGITADA ERRADA e casou a de X). O sweep agrega AMBOS sob UMA identidade (a colisão-POR-REUSO do PoC).
      await seedRemovalWorkOrder(client, ctx, { code: `WO-${suffix}-x`, profileId: ctx.profileId, status: "completed", completedAt: new Date(), serviceDetails: { plate: "XAB-1C00", vehicle: "GOL" } });
      await seedRemovalWorkOrder(client, ctx, { code: `WO-${suffix}-y`, profileId: ctx.profileId, status: "completed", completedAt: new Date(), serviceDetails: { plate: "xab1c00", vehicle: "UNO" } });
      assert.equal(await reconcile(ctx.tenantId), 2, "o sweep abre 2 processos");
      const procs = await selectProcesses(client, ctx.tenantId);
      assert.equal(procs.length, 2);
      const seededId = procs[0].identity_id;
      assert.ok(seededId, "identidade semeada na abertura");
      assert.equal(procs[1].identity_id, seededId, "colisão-POR-REUSO: AMBOS os processos sob UMA identidade (a de X)");
      assert.equal(await countIdentities(client, ctx.tenantId, "XAB1C00"), 1, "1 identidade contém processos de 2 veículos");

      // Elege procs[1] como Y (veículo físico distinto). A vistoria de recepção confirma a placa REAL de Y.
      const y = procs[1];
      const x = procs[0];
      const actor = { tenantId: ctx.tenantId, userId: randomUUID(), roles: [], permissions: [] };
      await service.saveInspection(actor, y.id, { confirmed_plate: "YZW-2D00", agent_name: "Fiscal de recepção" });

      const after = await selectProcesses(client, ctx.tenantId);
      const yAfter = after.find((p) => p.id === y.id)!;
      const xAfter = after.find((p) => p.id === x.id)!;
      assert.notEqual(yAfter.identity_id, seededId, "SPLIT: o processo de Y SAIU da identidade de X");
      assert.equal(xAfter.identity_id, seededId, "o processo de X permanece na identidade de X (intacto)");
      const yIdentity = await getIdentity(client, ctx.tenantId, yAfter.identity_id!);
      assert.equal(yIdentity.plate_key, "YZW2D00", "re-apontado para a identidade da placa CONFIRMADA de Y");
      assert.equal(yIdentity.confidence, "CONFIRMED", "a vistoria confirma a identidade de Y");
      const xIdentity = await getIdentity(client, ctx.tenantId, seededId!);
      assert.equal(xIdentity.confidence, "PROVISIONAL", "a identidade semeada (X) fica como estava (PROVISIONAL)");
      assert.equal(xIdentity.plate_key, "XAB1C00");
      assert.equal(await countIdentities(client, ctx.tenantId, "YZW2D00"), 1, "1 identidade nova/correta para Y");
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  test("Ω-VID FIX-JUNTA: vistoria com a MESMA placa já semeada → no-op idempotente (sem re-apontar, sem 2ª identidade)", async () => {
    const { client, service, reconcile } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedTenant(client, suffix);
    try {
      await seedRemovalWorkOrder(client, ctx, { code: `WO-${suffix}-idm`, profileId: ctx.profileId, status: "completed", completedAt: new Date(), serviceDetails: { plate: "IDM1P00" } });
      assert.equal(await reconcile(ctx.tenantId), 1);
      const [proc] = await selectProcesses(client, ctx.tenantId);
      const seededId = proc.identity_id;
      assert.ok(seededId);
      const actor = { tenantId: ctx.tenantId, userId: randomUUID(), roles: [], permissions: [] };
      // Confirma a MESMA placa 2× (hífen/caixa diferentes → mesma plate_key). Deve ser no-op idempotente.
      await service.saveInspection(actor, proc.id, { confirmed_plate: "idm-1p00" });
      await service.saveInspection(actor, proc.id, { confirmed_plate: "IDM1P00" });
      const [after] = await selectProcesses(client, ctx.tenantId);
      assert.equal(after.identity_id, seededId, "no-op: identity_id inalterado (mesma placa resolve à mesma identidade)");
      assert.equal(await countIdentities(client, ctx.tenantId, "IDM1P00"), 1, "sem 2ª identidade");
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  test("Ω-VID FIX-JUNTA: vistoria confirma a placa semeada → identidade sobe PROVISIONAL → CONFIRMED (identity_id inalterado)", async () => {
    const { client, service, reconcile } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedTenant(client, suffix);
    try {
      await seedRemovalWorkOrder(client, ctx, { code: `WO-${suffix}-cfm`, profileId: ctx.profileId, status: "completed", completedAt: new Date(), serviceDetails: { plate: "CFM1R00" } });
      assert.equal(await reconcile(ctx.tenantId), 1);
      const [proc] = await selectProcesses(client, ctx.tenantId);
      const seededId = proc.identity_id!;
      assert.equal((await getIdentity(client, ctx.tenantId, seededId)).confidence, "PROVISIONAL", "semeada por hint = PROVISIONAL");
      const actor = { tenantId: ctx.tenantId, userId: randomUUID(), roles: [], permissions: [] };
      await service.saveInspection(actor, proc.id, { confirmed_plate: "CFM1R00" });
      const [after] = await selectProcesses(client, ctx.tenantId);
      assert.equal(after.identity_id, seededId, "mesma placa ⇒ identity_id inalterado");
      const identity = await getIdentity(client, ctx.tenantId, seededId);
      assert.equal(identity.confidence, "CONFIRMED", "a vistoria é a confirmação da identidade");
      assert.equal(identity.plate_key, "CFM1R00");
      assert.equal(identity.unidentified, false, "CONFIRMED coerente com identity_chk (unidentified=false + plate_key)");
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });
}

// ── infra ─────────────────────────────────────────────────────────────────────────────────────────────────
function uniq(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
  const { RlsPrismaImpoundRepository } = await import("../src/modules/impound/impound-prisma.repository.js");
  const { ImpoundService } = await import("../src/modules/impound/impound.service.js");
  const { reconcileTenantRemovals } = await import("../src/modules/impound/impound.reconcile.service.js");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  // Serviço prisma DIRETO (bypassa o env-gate) — o sweep opera sobre o MESMO client escopado do teste.
  const service = new ImpoundService(new RlsPrismaImpoundRepository(client));
  const reconcile = (tenantId: string) => reconcileTenantRemovals(client, tenantId, service, new Date());
  return { client, service, reconcile };
}

type TenantCtx = { tenantId: string; profileId: string; catalogId: string };
type BootstrapClient = Awaited<ReturnType<typeof bootstrap>>["client"];

async function seedTenant(client: BootstrapClient, suffix: string): Promise<TenantCtx> {
  const { withTenantRls } = await import("../src/database/rls.js");
  const tenant = await client.tenant.create({ data: { name: `Impound Sweep ${suffix}`, slug: `impound-sweep-${suffix}` } });
  const profileName = `Perfil ${suffix}`;
  const profileId = await withTenantRls(client, tenant.id, async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO jurisdiction_profiles (tenant_id, name, scope) VALUES (${tenant.id}::uuid, ${profileName}, 'PUBLIC_AGREEMENT') RETURNING id
    `;
    return rows[0].id;
  });
  const catalogId = await insertServiceCatalog(client, tenant.id, `Remoção ${suffix}`, profileId);
  return { tenantId: tenant.id, profileId, catalogId };
}

async function insertServiceCatalog(client: BootstrapClient, tenantId: string, name: string, custodyProfileId: string | null): Promise<string> {
  const { withTenantRls } = await import("../src/database/rls.js");
  return withTenantRls(client, tenantId, async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO service_catalog (tenant_id, name, service_type, custody_profile_id)
      VALUES (${tenantId}::uuid, ${name}, 'reboque', ${custodyProfileId}::uuid)
      RETURNING id
    `;
    return rows[0].id;
  });
}

async function insertWorkOrder(
  client: BootstrapClient,
  tenantId: string,
  input: { code: string; catalogId: string; status: string; completedAt: Date; serviceDetails?: Record<string, unknown> },
): Promise<string> {
  const { withTenantRls } = await import("../src/database/rls.js");
  // Ω-VID PR-05 — service_details (JSON) carrega os hints {plate, vehicle, color}. null quando não informado.
  const detailsJson = input.serviceDetails ? JSON.stringify(input.serviceDetails) : null;
  return withTenantRls(client, tenantId, async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO work_orders (tenant_id, code, title, status, completed_at, service_catalog_id, service_details)
      VALUES (${tenantId}::uuid, ${input.code}, 'Remoção', ${input.status}, ${input.completedAt}, ${input.catalogId}::uuid, ${detailsJson}::jsonb)
      RETURNING id
    `;
    return rows[0].id;
  });
}

async function seedRemovalWorkOrder(
  client: BootstrapClient,
  ctx: TenantCtx,
  input: { code: string; profileId: string; status: string; completedAt: Date; serviceDetails?: Record<string, unknown> },
): Promise<string> {
  return insertWorkOrder(client, ctx.tenantId, {
    code: input.code,
    catalogId: ctx.catalogId,
    status: input.status,
    completedAt: input.completedAt,
    serviceDetails: input.serviceDetails,
  });
}

// Ω-VID PR-05 — semeia um ChecklistRun ligado à OS (related_entity_type='work_order', related_entity_id=<woId>) —
// o elo que o AUTO-link procura. Cria também um template mínimo (FK dura template_id).
async function seedChecklistRun(client: BootstrapClient, ctx: TenantCtx, workOrderId: string, suffix: string): Promise<string> {
  return seedChecklistRunRaw(client, ctx, workOrderId, suffix);
}

async function seedChecklistRunRaw(client: BootstrapClient, ctx: TenantCtx, relatedEntityId: string, suffix: string): Promise<string> {
  const { withTenantRls } = await import("../src/database/rls.js");
  return withTenantRls(client, ctx.tenantId, async (tx) => {
    const tpl = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO checklist_templates (tenant_id, name, type, status, version, schema)
      VALUES (${ctx.tenantId}::uuid, ${`Checklist ${suffix}`}, 'towing_collection', 'published', 1, '{}'::jsonb)
      RETURNING id
    `;
    // related_entity_id é coluna TEXT (sem @db.Uuid) — armazena o id da OS como texto (igual ao que o app grava).
    const run = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO checklist_runs (tenant_id, template_id, template_version, related_entity_type, related_entity_id, status)
      VALUES (${ctx.tenantId}::uuid, ${tpl[0].id}::uuid, 1, 'work_order', ${relatedEntityId}, 'in_progress')
      RETURNING id
    `;
    return run[0].id;
  });
}

async function selectProcesses(client: BootstrapClient, tenantId: string) {
  const { withTenantRls } = await import("../src/database/rls.js");
  return withTenantRls(client, tenantId, (tx) =>
    tx.$queryRaw<Array<{ id: string; status: string; entered_at: Date; vehicle_unidentified: boolean; identity_id: string | null }>>`
      SELECT id, status, entered_at, vehicle_unidentified, identity_id FROM impound_processes WHERE tenant_id = ${tenantId}::uuid
    `,
  );
}

async function getIdentity(
  client: BootstrapClient,
  tenantId: string,
  identityId: string,
): Promise<{ confidence: string; unidentified: boolean; plate_key: string | null; model: string | null; color: string | null; created_by: string | null }> {
  const { withTenantRls } = await import("../src/database/rls.js");
  return withTenantRls(client, tenantId, async (tx) => {
    const rows = await tx.$queryRaw<
      Array<{ confidence: string; unidentified: boolean; plate_key: string | null; model: string | null; color: string | null; created_by: string | null }>
    >`
      SELECT confidence, unidentified, plate_key, model, color, created_by
      FROM third_party_vehicle_identities WHERE tenant_id = ${tenantId}::uuid AND id = ${identityId}::uuid
    `;
    return rows[0];
  });
}

async function countIdentities(client: BootstrapClient, tenantId: string, plateKey?: string): Promise<number> {
  const { withTenantRls } = await import("../src/database/rls.js");
  return withTenantRls(client, tenantId, async (tx) => {
    const rows = plateKey
      ? await tx.$queryRaw<Array<{ c: number }>>`
          SELECT count(*)::int AS c FROM third_party_vehicle_identities WHERE tenant_id = ${tenantId}::uuid AND plate_key = ${plateKey}
        `
      : await tx.$queryRaw<Array<{ c: number }>>`
          SELECT count(*)::int AS c FROM third_party_vehicle_identities WHERE tenant_id = ${tenantId}::uuid
        `;
    return Number(rows[0].c);
  });
}

async function selectLinks(client: BootstrapClient, tenantId: string, processId: string) {
  const { withTenantRls } = await import("../src/database/rls.js");
  return withTenantRls(client, tenantId, (tx) =>
    tx.$queryRaw<Array<{ checklist_run_id: string; link_source: string }>>`
      SELECT checklist_run_id, link_source FROM impound_process_checklist_links
      WHERE tenant_id = ${tenantId}::uuid AND process_id = ${processId}::uuid
    `,
  );
}

// Teardown FK-safe (todas RESTRICT): filhos antes dos pais. custody_events + merge_events têm TRIGGER append-only
// ⇒ session_replication_role='replica' (superuser) desliga os triggers. Ω-VID PR-05: os links (→ processos+runs) e
// as identidades (→ tenant; processos → identity_id) entram na cadeia — links antes de processos/runs; identidades
// depois de processos; runs antes de templates.
async function teardown(client: BootstrapClient, tenantId: string): Promise<void> {
  await client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
    await tx.$executeRawUnsafe(`DELETE FROM custody_events WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM impound_process_checklist_links WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM impound_intake_inspections WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM impound_processes WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM third_party_vehicle_identity_merge_events WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM third_party_vehicle_identities WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM checklist_runs WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM checklist_template_components WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM checklist_templates WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM work_orders WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM service_catalog WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM jurisdiction_profiles WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM audit_logs WHERE tenant_id = '${tenantId}'::uuid`);
  });
  await client.tenant.deleteMany({ where: { id: tenantId } });
}
