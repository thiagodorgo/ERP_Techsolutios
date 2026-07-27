import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

import {
  createChargeServiceWithResolver,
  createMemoryChargeService,
  getMemoryChargeRepositoryForTests,
  resetChargeRuntimeForTests,
} from "../src/modules/charging/charge.service.js";
import { verifyChain } from "../src/modules/impound/impound.hashchain.js";
import { getMemoryImpoundRepositoryForTests, resetImpoundRuntimeForTests } from "../src/modules/impound/impound.service.js";
import {
  createMemoryReleaseService,
  getMemoryReleaseRepositoryForTests,
  resetReleaseRuntimeForTests,
} from "../src/modules/release/release.service.js";
import type { ReleaseActorContext } from "../src/modules/release/release.types.js";
import type { TariffResolver } from "../src/modules/tariffs/tariff-resolution.js";
import type { Tariff } from "../src/modules/tariffs/tariff.types.js";
import { getMemoryYardRepositoryForTests } from "../src/modules/yard/yard.service.js";
import type { DailyCap, DailyModel, ProfileScope } from "../src/modules/jurisdiction/jurisdiction.types.js";

const MS_PER_DAY = 86_400_000;

type Ctx = { tenantId: string; processId: string; profileId: string; spotId?: string };

function actor(tenantId: string): ReleaseActorContext {
  return {
    tenantId,
    userId: randomUUID(),
    roles: ["manager"],
    permissions: ["impound:read", "impound:transition", "impound:allocate", "release:process", "release:approve", "charging:settle"],
  };
}

async function reset(): Promise<string> {
  resetImpoundRuntimeForTests();
  resetChargeRuntimeForTests();
  resetReleaseRuntimeForTests();
  return randomUUID();
}

// Cria um processo em ACTIVE_CUSTODY (openFromRemovalAtomic→RECEPTION→ACTIVE_CUSTODY), com perfil de charging
// (scope/model/cap + dailyServiceCatalogId p/ o motor de diárias) e requisitos de liberação. Opcional: ocupa 1 vaga.
async function makeActiveProcess(
  tenantId: string,
  options: {
    t0: Date;
    scope?: ProfileScope;
    model?: DailyModel;
    cap?: DailyCap;
    requirements?: ReadonlyArray<{ code: string; label: string; required: boolean }>;
    withSpot?: boolean;
  },
): Promise<Ctx> {
  const impound = getMemoryImpoundRepositoryForTests();
  const profileId = randomUUID();
  const process = await impound.openFromRemovalAtomic({
    tenantId,
    serviceOrderId: randomUUID(),
    profileId,
    originAuthority: "Autoridade solicitante",
    unidentifiedReason: "Aguardando vistoria de recepção",
    completedAt: options.t0,
    actorId: undefined,
  });
  await impound.applyTransition({
    tenantId,
    processId: process.id,
    expectedFrom: "RECEPTION",
    to: "ACTIVE_CUSTODY",
    setEnteredAt: false,
    setFrozenAt: false,
    event: { type: "STATUS_CHANGE", payload: { from: "RECEPTION", to: "ACTIVE_CUSTODY", reason: null }, occurredAt: new Date(), actorId: undefined },
  });
  getMemoryChargeRepositoryForTests().setProfileForTests(tenantId, profileId, {
    scope: options.scope ?? "PUBLIC_AGREEMENT",
    model: options.model ?? "ROLLING_24H",
    cap: options.cap ?? "SIX_MONTHS",
    dailyServiceCatalogId: randomUUID(),
  });
  getMemoryReleaseRepositoryForTests().setProfileRequirementsForTests(tenantId, profileId, options.requirements ?? []);

  let spotId: string | undefined;
  if (options.withSpot) {
    const yard = getMemoryYardRepositoryForTests();
    const y = await yard.createYard({ tenantId, name: "Pátio Central", address: "Rua X, 1", timezone: "America/Sao_Paulo" });
    const area = await yard.createArea({ tenantId, yardId: y.id, kind: "BLOCK", name: "Q1" });
    const spot = await yard.createSpot({ tenantId, areaId: area.id, code: "S-1" });
    await impound.assignSpotAtomic({ tenantId, processId: process.id, spotId: spot.id, occurredAt: new Date() });
    spotId = spot.id;
  }
  return { tenantId, processId: process.id, profileId, spotId };
}

async function addRemoval(tenantId: string, processId: string, amount = "150.00"): Promise<void> {
  await getMemoryChargeRepositoryForTests().createManualCharge({
    tenantId,
    processId,
    kind: "REMOVAL",
    quantity: "1.00",
    unitAmount: amount,
    totalAmount: amount,
    currency: "BRL",
    occurredAt: new Date(),
  });
}

function makeTariff(unitPrice: number): Tariff {
  const now = new Date();
  return {
    id: randomUUID(),
    tenantId: "tenant",
    priceTableId: randomUUID(),
    name: "Diária",
    unitPrice,
    currency: "BRL",
    origin: "test",
    status: "active",
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}
const fixedResolver = (unitPrice: number): TariffResolver => async () => makeTariff(unitPrice);

async function expectReason(promise: Promise<unknown>, reason: string): Promise<void> {
  await assert.rejects(promise, (error: unknown) => (error as { reason?: string }).reason === reason, `expected reason ${reason}`);
}

async function expectStatusReason(promise: Promise<unknown>, statusCode: number, reason: string): Promise<void> {
  await assert.rejects(
    promise,
    (error: unknown) => {
      const e = error as { statusCode?: number; reason?: string };
      return e.statusCode === statusCode && e.reason === reason;
    },
    `expected ${statusCode}/${reason}`,
  );
}

// Prepara o dossiê FOR_REPAIR (montar) + aprovação da autoridade e dispara a SAÍDA. Espelha o fluxo do console:
// for-repair/start (monta) → release/approve (release:approve) → for-repair/start (transiciona).
async function exitForRepair(
  release: ReturnType<typeof createMemoryReleaseService>,
  who: ReleaseActorContext,
  processId: string,
  opts: { recipientName?: string; deadlineDays?: number } = {},
): Promise<{ readonly view: import("../src/modules/release/release.types.js").ReleaseView; readonly transitioned: boolean }> {
  const deadline = new Date(Date.now() + (opts.deadlineDays ?? 30) * MS_PER_DAY);
  await release.startForRepair(who, processId, {
    repair_deadline: deadline.toISOString(),
    ...(opts.recipientName ? { recipient_name: opts.recipientName } : {}),
  });
  await release.approve(who, processId, { authority_reference: "OFICIO-REP-2026-01" });
  return release.startForRepair(who, processId, {});
}

// ── (i) saída OK → RELEASED_FOR_REPAIR + vaga liberada + frozen_at NULL + A DIÁRIA SEGUE ACUMULANDO ──────────────
test("(i) saída p/ reparo: RELEASED_FOR_REPAIR + vaga liberada + frozen_at NULL + diária SEGUE acumulando (não congela)", async () => {
  const tenantId = await reset();
  const t0 = new Date("2024-05-01T12:00:00.000Z");
  const ctx = await makeActiveProcess(tenantId, { t0, withSpot: true });
  const release = createMemoryReleaseService();
  const who = actor(tenantId);

  const exited = await exitForRepair(release, who, ctx.processId, { recipientName: "Transportadora Silva", deadlineDays: 30 });
  assert.equal(exited.transitioned, true);
  assert.equal(exited.view.release.status, "AUTHORIZED", "dossiê permanece AUTHORIZED (ativo até o retorno)");
  assert.equal(exited.view.release.kind, "FOR_REPAIR");

  const process = await getMemoryImpoundRepositoryForTests().findProcessById(tenantId, ctx.processId);
  assert.equal(process?.status, "RELEASED_FOR_REPAIR");
  assert.equal(process?.frozenAt, undefined, "frozen_at INTACTO na saída (D-Ω5P-REL-07: NÃO congela)");

  // vaga liberada:
  const spots = await getMemoryYardRepositoryForTests().listSpotsByYard({ tenantId, yardId: process!.yardId! });
  assert.equal(spots.find((spot) => spot.id === ctx.spotId)?.status, "FREE", "vaga liberada na saída p/ reparo");

  // A DIÁRIA SEGUE ACUMULANDO enquanto o veículo está fora (custódia jurídica ativa; sweep status-agnóstico,
  // frozen_at NULL). Prova: com o processo JÁ em RELEASED_FOR_REPAIR, avançar o relógio acumula +1 diária.
  const chargeRepo = getMemoryChargeRepositoryForTests();
  const engine = createChargeServiceWithResolver(fixedResolver(10));
  await engine.accrueProcess(tenantId, ctx.processId, new Date(t0.getTime() + 3 * MS_PER_DAY + 3_600_000));
  const dailiesA = (await chargeRepo.listCharges({ tenantId, processId: ctx.processId })).filter((c) => c.kind === "DAILY").length;
  assert.equal(dailiesA, 3, "3 diárias acumuladas mesmo FORA (RELEASED_FOR_REPAIR)");
  const later = await engine.accrueProcess(tenantId, ctx.processId, new Date(t0.getTime() + 4 * MS_PER_DAY + 3_600_000));
  assert.equal(later.accrued, 1, "avançar o relógio acumula +1 diária — prova que NÃO congelou");
  const dailiesB = (await chargeRepo.listCharges({ tenantId, processId: ctx.processId })).filter((c) => c.kind === "DAILY").length;
  assert.equal(dailiesB, dailiesA + 1, "a diária continuou correndo durante o reparo");

  // e frozen_at continua NULL após a acumulação:
  const stillOut = await getMemoryImpoundRepositoryForTests().findProcessById(tenantId, ctx.processId);
  assert.equal(stillOut?.frozenAt, undefined, "frozen_at segue NULL durante o reparo");
});

// ── (ii) saída bloqueada: sem autoridade / sem recipient / deadline ausente ou > 60d ──────────────────────────────
test("(ii) saída bloqueada: sem autoridade (409) / sem recipient (409) / deadline ausente (400) / deadline >60d (422)", async () => {
  const tenantId = await reset();
  const release = createMemoryReleaseService();
  const who = actor(tenantId);

  // deadline AUSENTE → 400 repair_deadline_invalid (no montar, antes de criar o dossiê).
  const dAbsent = await makeActiveProcess(tenantId, { t0: new Date(Date.now() - MS_PER_DAY) });
  await expectStatusReason(release.startForRepair(who, dAbsent.processId, {}), 400, "repair_deadline_invalid");

  // deadline > 60d → 422 repair_deadline_invalid.
  const dFar = await makeActiveProcess(tenantId, { t0: new Date(Date.now() - MS_PER_DAY) });
  await expectStatusReason(
    release.startForRepair(who, dFar.processId, { repair_deadline: new Date(Date.now() + 70 * MS_PER_DAY).toISOString() }),
    422,
    "repair_deadline_invalid",
  );

  // LOW-3: deadline NO PASSADO → 400 repair_deadline_invalid (prazo de reapresentação no passado é nonsense; a saída
  // não abre — nenhum dossiê FOR_REPAIR é montado).
  const dPast = await makeActiveProcess(tenantId, { t0: new Date(Date.now() - MS_PER_DAY) });
  await expectStatusReason(
    release.startForRepair(who, dPast.processId, { repair_deadline: new Date(Date.now() - 10 * MS_PER_DAY).toISOString() }),
    400,
    "repair_deadline_invalid",
  );
  await expectReason(release.get(who, dPast.processId), "release_not_found"); // saída NÃO abriu

  // sem AUTORIDADE: monta o dossiê (deadline + recipient), NÃO aprova, tenta sair → 409 release_authority_missing.
  const noAuth = await makeActiveProcess(tenantId, { t0: new Date(Date.now() - MS_PER_DAY) });
  await release.startForRepair(who, noAuth.processId, { repair_deadline: new Date(Date.now() + 20 * MS_PER_DAY).toISOString(), recipient_name: "R" });
  await expectStatusReason(release.startForRepair(who, noAuth.processId, {}), 409, "release_authority_missing");

  // sem RECIPIENT: monta (deadline só), aprova, tenta sair → 409 release_recipient_missing.
  const noRecip = await makeActiveProcess(tenantId, { t0: new Date(Date.now() - MS_PER_DAY) });
  await release.startForRepair(who, noRecip.processId, { repair_deadline: new Date(Date.now() + 20 * MS_PER_DAY).toISOString() });
  await release.approve(who, noRecip.processId, { authority_reference: "A-1" });
  await expectStatusReason(release.startForRepair(who, noRecip.processId, {}), 409, "release_recipient_missing");
});

// ── (iii) retorno → dossiê RETURNED + a liberação padrão passa a poder abrir + realocação de vaga (endpoint existente) ─
test("(iii) retorno: dossiê RETURNED + partial-unique liberado (start padrão abre) + realocação de vaga via endpoint existente", async () => {
  const tenantId = await reset();
  const impound = getMemoryImpoundRepositoryForTests();
  const yard = getMemoryYardRepositoryForTests();
  const ctx = await makeActiveProcess(tenantId, { t0: new Date(Date.now() - 2 * MS_PER_DAY), withSpot: true });
  const release = createMemoryReleaseService();
  const who = actor(tenantId);

  await exitForRepair(release, who, ctx.processId, { recipientName: "T", deadlineDays: 30 });
  // vaga liberada na saída:
  const proc1 = await impound.findProcessById(tenantId, ctx.processId);
  const spotsAfterExit = await yard.listSpotsByYard({ tenantId, yardId: proc1!.yardId! });
  assert.equal(spotsAfterExit.find((s) => s.id === ctx.spotId)?.status, "FREE");

  // retorno:
  const returned = await release.returnFromRepair(who, ctx.processId);
  assert.equal(returned.release.status, "RETURNED", "dossiê marcado RETURNED");
  const proc2 = await impound.findProcessById(tenantId, ctx.processId);
  assert.equal(proc2?.status, "ACTIVE_CUSTODY", "processo retorna a ACTIVE_CUSTODY");
  assert.equal(proc2?.frozenAt, undefined, "retorno NÃO congela");

  // partial-unique liberado: não há mais liberação em curso (RETURNED não é ativa).
  await expectReason(release.get(who, ctx.processId), "release_not_found");

  // realocação de vaga = endpoint EXISTENTE (impound:allocate/assignSpotAtomic) — pode ser vaga diferente.
  const area = await yard.createArea({ tenantId, yardId: proc2!.yardId!, kind: "BLOCK", name: "Q2" });
  const spot2 = await yard.createSpot({ tenantId, areaId: area.id, code: "S-2" });
  await impound.assignSpotAtomic({ tenantId, processId: ctx.processId, spotId: spot2.id, occurredAt: new Date() });
  const spotsAfterRealloc = await yard.listSpotsByYard({ tenantId, yardId: proc2!.yardId! });
  assert.equal(spotsAfterRealloc.find((s) => s.id === spot2.id)?.status, "OCCUPIED", "realocado em vaga diferente");

  // a liberação PADRÃO passa a poder abrir (restituição definitiva pelo caminho do PR-10a):
  const started = await release.start(who, ctx.processId, { recipient_name: "R" });
  assert.equal(started.release.status, "IN_PROGRESS");
  assert.equal(started.release.kind, "STANDARD");
});

// ── (iv) DÉBITOS DIFERIDOS: saída SUCEDE com débito ABERTO; a restituição definitiva BLOQUEIA até quitar ───────────
test("(iv) débitos diferidos: saída p/ reparo SUCEDE com débito EM ABERTO (≠ quitação); restituição definitiva BLOQUEIA enquanto o débito segue aberto", async () => {
  const tenantId = await reset();
  const ctx = await makeActiveProcess(tenantId, { t0: new Date(Date.now() - 2 * MS_PER_DAY) });
  await addRemoval(tenantId, ctx.processId, "150.00"); // débito EM ABERTO (não quitado)
  const release = createMemoryReleaseService();
  const charge = createMemoryChargeService();
  const who = actor(tenantId);

  // saída p/ reparo SUCEDE mesmo com o débito aberto (art. 271 §2º ≠ §1º):
  const exited = await exitForRepair(release, who, ctx.processId, { recipientName: "T", deadlineDays: 30 });
  assert.equal(exited.transitioned, true);
  assert.equal((await getMemoryImpoundRepositoryForTests().findProcessById(tenantId, ctx.processId))?.status, "RELEASED_FOR_REPAIR");
  // o débito continua ABERTO (não dispensado):
  const openState = await charge.getReleaseChargeState(tenantId, ctx.processId);
  assert.equal(openState?.debtsSettled, false, "débito segue EM ABERTO após a saída (nunca dispensado)");

  // restituição DEFINITIVA (reapresentação→padrão) BLOQUEIA enquanto o débito não é quitado:
  await release.returnFromRepair(who, ctx.processId);
  await release.start(who, ctx.processId, { recipient_name: "R" });
  await release.approve(who, ctx.processId, { authority_reference: "OFICIO-FINAL" });
  await expectReason(release.consume(who, ctx.processId), "release_debts_unsettled");

  // quitando, a restituição definitiva passa:
  await charge.settle(who, ctx.processId, {});
  const consumed = await release.consume(who, ctx.processId);
  assert.equal(consumed.release.status, "COMPLETED");
  assert.equal(consumed.release.settledTotal, "150.00");
});

// ── (v) freeze só na restituição definitiva: frozen_at NULL durante todo o reparo ─────────────────────────────────
test("(v) frozen_at NULL durante todo o reparo (saída + retorno); só o caminho de restituição definitiva (salto A) congela", async () => {
  const tenantId = await reset();
  const impound = getMemoryImpoundRepositoryForTests();
  const ctx = await makeActiveProcess(tenantId, { t0: new Date(Date.now() - 2 * MS_PER_DAY) });
  const release = createMemoryReleaseService();
  const who = actor(tenantId);

  await exitForRepair(release, who, ctx.processId, { recipientName: "T", deadlineDays: 30 });
  assert.equal((await impound.findProcessById(tenantId, ctx.processId))?.frozenAt, undefined, "saída NÃO congela");

  await release.returnFromRepair(who, ctx.processId);
  assert.equal((await impound.findProcessById(tenantId, ctx.processId))?.frozenAt, undefined, "retorno NÃO congela");

  // só a abertura da restituição definitiva (salto A do PR-10a) aplica T_stop:
  await release.start(who, ctx.processId, { recipient_name: "R" });
  assert.ok((await impound.findProcessById(tenantId, ctx.processId))?.frozenAt, "T_stop só na restituição definitiva (RELEASE_IN_PROGRESS)");
});

// ── (vi) a restituição definitiva aplica o GATE COMPLETO (I5) reusando o caminho padrão ───────────────────────────
test("(vi) restituição definitiva aplica o gate COMPLETO: consumar sem aprovação → 409 release_authority_missing; com tudo → RELEASED", async () => {
  const tenantId = await reset();
  const ctx = await makeActiveProcess(tenantId, {
    t0: new Date(Date.now() - 2 * MS_PER_DAY),
    requirements: [{ code: "AUTHORITY_RELEASE", label: "Autorização do órgão", required: true }],
    withSpot: true,
  });
  await addRemoval(tenantId, ctx.processId, "150.00");
  const release = createMemoryReleaseService();
  const charge = createMemoryChargeService();
  const who = actor(tenantId);

  await exitForRepair(release, who, ctx.processId, { recipientName: "T", deadlineDays: 30 });
  await release.returnFromRepair(who, ctx.processId);

  // caminho padrão (I5): abre a liberação; o checklist do perfil é snapshot no start.
  const started = await release.start(who, ctx.processId, { recipient_name: "R" });
  assert.equal(started.checks.length, 1, "checklist do perfil snapshot na abertura (I9)");
  await charge.settle(who, ctx.processId, {});
  await release.setRequirement(who, ctx.processId, { code: "AUTHORITY_RELEASE", satisfied: true });

  // sem aprovação da autoridade → 409 (gate completo aplicado):
  await expectReason(release.consume(who, ctx.processId), "release_authority_missing");

  await release.approve(who, ctx.processId, { authority_reference: "OFICIO-FINAL" });
  const consumed = await release.consume(who, ctx.processId);
  assert.equal(consumed.release.status, "COMPLETED");
  const process = await getMemoryImpoundRepositoryForTests().findProcessById(tenantId, ctx.processId);
  assert.equal(process?.status, "RELEASED");
});

// ── (vii) cadeia hash permanece valid após saída + retorno + restituição definitiva ──────────────────────────────
test("(vii) verify: cadeia permanece valid após saída p/ reparo + retorno + restituição definitiva", async () => {
  const tenantId = await reset();
  const ctx = await makeActiveProcess(tenantId, { t0: new Date(Date.now() - 2 * MS_PER_DAY) });
  await addRemoval(tenantId, ctx.processId, "150.00");
  const release = createMemoryReleaseService();
  const charge = createMemoryChargeService();
  const who = actor(tenantId);

  await exitForRepair(release, who, ctx.processId, { recipientName: "T", deadlineDays: 30 });
  await release.returnFromRepair(who, ctx.processId);
  await release.start(who, ctx.processId, { recipient_name: "R" });
  await charge.settle(who, ctx.processId, {});
  await release.approve(who, ctx.processId, { authority_reference: "OFICIO-FINAL" });
  await release.consume(who, ctx.processId);

  const snapshot = await getMemoryImpoundRepositoryForTests().readChainSnapshot(tenantId, ctx.processId);
  assert.ok(snapshot);
  const result = verifyChain({ tenantId, processId: ctx.processId, events: snapshot.events, head: snapshot.head, crossAnchors: snapshot.crossAnchors });
  assert.equal(result.valid, true, `cadeia deve permanecer valid (brokenAt=${result.brokenAt?.reason})`);
  // STATUS_CHANGE da saída e do retorno estão na cadeia (append-only):
  const statusReasons = snapshot.events.filter((e) => e.type === "STATUS_CHANGE").map((e) => (e.payload as { reason?: string }).reason);
  assert.ok(statusReasons.includes("released_for_repair"), "STATUS_CHANGE released_for_repair na cadeia");
  assert.ok(statusReasons.includes("returned_from_repair"), "STATUS_CHANGE returned_from_repair na cadeia");
  assert.equal(snapshot.events.filter((e) => e.type === "RELEASE").length, 1, "1 RELEASE (restituição definitiva)");
});

// ── (ix) sem DUPLA saída: processo já RELEASED_FOR_REPAIR → 2ª saída = 409 invalid_transition ──────────────────────
test("(ix) sem dupla saída: com o processo já RELEASED_FOR_REPAIR, a 2ª saída p/ reparo → 409 invalid_transition", async () => {
  const tenantId = await reset();
  const ctx = await makeActiveProcess(tenantId, { t0: new Date(Date.now() - 2 * MS_PER_DAY) });
  const release = createMemoryReleaseService();
  const who = actor(tenantId);

  await exitForRepair(release, who, ctx.processId, { recipientName: "T", deadlineDays: 30 });
  assert.equal((await getMemoryImpoundRepositoryForTests().findProcessById(tenantId, ctx.processId))?.status, "RELEASED_FOR_REPAIR");
  // 2ª tentativa de saída (dossiê FOR_REPAIR ainda AUTHORIZED/ativo) → resolveTransition from===to → invalid_transition.
  await expectStatusReason(release.startForRepair(who, ctx.processId, {}), 409, "invalid_transition");
});

// ── cross-tenant: saída p/ reparo em processo de outro tenant → 404 process_not_found ─────────────────────────────
test("cross-tenant: startForRepair em processo de outro tenant ⇒ 404 process_not_found", async () => {
  const tenantId = await reset();
  const ctx = await makeActiveProcess(tenantId, { t0: new Date(Date.now() - 2 * MS_PER_DAY) });
  const release = createMemoryReleaseService();
  const other = actor(randomUUID());
  await expectReason(release.startForRepair(other, ctx.processId, { repair_deadline: new Date(Date.now() + 20 * MS_PER_DAY).toISOString() }), "process_not_found");
});
