import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

import {
  FEDERAL_DEFAULTS,
  TEMA_124_LEGACY_CAP,
  resolveDefaults,
} from "../src/modules/jurisdiction/jurisdiction.defaults.js";
import {
  createMemoryJurisdictionService,
  resetJurisdictionRuntimeForTests,
} from "../src/modules/jurisdiction/jurisdiction.service.js";
import { JurisdictionError, type JurisdictionActorContext } from "../src/modules/jurisdiction/jurisdiction.types.js";

function actor(tenantId = randomUUID()): JurisdictionActorContext {
  return {
    tenantId,
    userId: randomUUID(),
    roles: ["manager"],
    permissions: ["jurisdiction:read", "jurisdiction:create", "jurisdiction:update"],
  };
}

function setup() {
  resetJurisdictionRuntimeForTests();
  return createMemoryJurisdictionService();
}

// ── Defaults federais (constante canônica + resolveDefaults) ────────────────────

test("FEDERAL_DEFAULTS espelha a norma federal (10/30/60/15, ROLLING_24H, SIX_MONTHS)", () => {
  assert.deepEqual(FEDERAL_DEFAULTS, {
    ownerNotifDays: 10,
    noticeEdictDay: 30,
    auctionEligibleDay: 60,
    auctionEdictBusinessDays: 15,
    dailyModel: "ROLLING_24H",
    dailyCap: "SIX_MONTHS",
  });
});

test("resolveDefaults(PUBLIC_AGREEMENT) = federal estrito; PRIVATE_CONTRACT = dailyCap UNLIMITED", () => {
  const publicDefaults = resolveDefaults("PUBLIC_AGREEMENT");
  assert.equal(publicDefaults.ownerNotifDays, 10);
  assert.equal(publicDefaults.noticeEdictDay, 30);
  assert.equal(publicDefaults.auctionEligibleDay, 60);
  assert.equal(publicDefaults.auctionEdictBusinessDays, 15);
  assert.equal(publicDefaults.dailyModel, "ROLLING_24H");
  assert.equal(publicDefaults.dailyCap, "SIX_MONTHS");

  const privateDefaults = resolveDefaults("PRIVATE_CONTRACT");
  assert.equal(privateDefaults.dailyCap, "UNLIMITED");
  // os prazos federais seguem como referência mesmo no privado
  assert.equal(privateDefaults.ownerNotifDays, 10);
  assert.equal(privateDefaults.dailyModel, "ROLLING_24H");
});

test("TEMA_124_LEGACY_CAP é THIRTY_DAYS_LEGACY (intertemporal por data de entrada, não por scope)", () => {
  assert.equal(TEMA_124_LEGACY_CAP, "THIRTY_DAYS_LEGACY");
});

// ── CRUD ────────────────────────────────────────────────────────────────────────

test("cria perfil PUBLIC omitindo prazos → herda os defaults federais do scope", async () => {
  const service = setup();
  const profile = await service.create(actor(), { name: "Convênio Estadual", scope: "public_agreement" });
  assert.equal(profile.name, "Convênio Estadual");
  assert.equal(profile.scope, "PUBLIC_AGREEMENT");
  assert.equal(profile.ownerNotifDays, 10);
  assert.equal(profile.noticeEdictDay, 30);
  assert.equal(profile.auctionEligibleDay, 60);
  assert.equal(profile.auctionEdictBusinessDays, 15);
  assert.equal(profile.dailyModel, "ROLLING_24H");
  assert.equal(profile.dailyCap, "SIX_MONTHS");
  assert.deepEqual(profile.releaseRequirements, []);
  assert.equal(profile.active, true);
  assert.equal(profile.notes, undefined);
});

test("cria perfil PRIVATE omitindo cap → herda UNLIMITED do scope", async () => {
  const service = setup();
  const profile = await service.create(actor(), { name: "Contrato Shopping", scope: "private_contract" });
  assert.equal(profile.scope, "PRIVATE_CONTRACT");
  assert.equal(profile.dailyCap, "UNLIMITED");
});

test("cria perfil com overrides explícitos (prazos/model/cap/notes)", async () => {
  const service = setup();
  const profile = await service.create(actor(), {
    name: "Convênio Custom",
    scope: "PUBLIC_AGREEMENT",
    owner_notif_days: 7,
    notice_edict_day: 45,
    auction_eligible_day: 90,
    auction_edict_business_days: 20,
    daily_model: "calendar",
    daily_cap: "thirty_days_legacy",
    notes: "regime intertemporal",
  });
  assert.equal(profile.ownerNotifDays, 7);
  assert.equal(profile.noticeEdictDay, 45);
  assert.equal(profile.auctionEligibleDay, 90);
  assert.equal(profile.auctionEdictBusinessDays, 20);
  assert.equal(profile.dailyModel, "CALENDAR");
  assert.equal(profile.dailyCap, "THIRTY_DAYS_LEGACY");
  assert.equal(profile.notes, "regime intertemporal");
});

test("get retorna o perfil; get inexistente → 404", async () => {
  const service = setup();
  const a = actor();
  const created = await service.create(a, { name: "P1", scope: "PUBLIC_AGREEMENT" });
  const fetched = await service.get(a, created.id);
  assert.equal(fetched.id, created.id);
  await assert.rejects(
    () => service.get(a, randomUUID()),
    (e: unknown) => e instanceof JurisdictionError && e.statusCode === 404,
  );
});

test("update edita name/prazos/cap/active", async () => {
  const service = setup();
  const a = actor();
  const created = await service.create(a, { name: "Antigo", scope: "PUBLIC_AGREEMENT" });
  const updated = await service.update(a, created.id, {
    name: "Novo",
    owner_notif_days: 5,
    daily_cap: "UNLIMITED",
    active: false,
  });
  assert.equal(updated.name, "Novo");
  assert.equal(updated.ownerNotifDays, 5);
  assert.equal(updated.dailyCap, "UNLIMITED");
  assert.equal(updated.active, false);
});

// ── Scope público × privado + filtro ────────────────────────────────────────────

test("ambos os scopes são criáveis; list filtra por scope", async () => {
  const service = setup();
  const a = actor();
  await service.create(a, { name: "Público A", scope: "PUBLIC_AGREEMENT" });
  await service.create(a, { name: "Privado B", scope: "PRIVATE_CONTRACT" });

  const all = await service.list(a, {});
  assert.equal(all.total, 2);

  const onlyPublic = await service.list(a, { scope: "public_agreement" });
  assert.equal(onlyPublic.total, 1);
  assert.equal(onlyPublic.items[0]?.scope, "PUBLIC_AGREEMENT");

  const onlyPrivate = await service.list(a, { scope: "PRIVATE_CONTRACT" });
  assert.equal(onlyPrivate.total, 1);
  assert.equal(onlyPrivate.items[0]?.scope, "PRIVATE_CONTRACT");
});

// ── Validação de prazos (> 0) ────────────────────────────────────────────────────

test("prazo 0 / negativo / > 3650 → 400 invalid_deadline", async () => {
  const service = setup();
  const a = actor();
  for (const bad of [0, -1, 3651]) {
    await assert.rejects(
      () => service.create(a, { name: `deadline-${bad}`, scope: "PUBLIC_AGREEMENT", owner_notif_days: bad }),
      (e: unknown) => e instanceof JurisdictionError && e.statusCode === 400 && e.reason === "invalid_deadline",
    );
  }
  // no update também
  const created = await service.create(a, { name: "ok", scope: "PUBLIC_AGREEMENT" });
  await assert.rejects(
    () => service.update(a, created.id, { auction_eligible_day: 0 }),
    (e: unknown) => e instanceof JurisdictionError && e.statusCode === 400 && e.reason === "invalid_deadline",
  );
});

// ── Enums inválidos ──────────────────────────────────────────────────────────────

test("scope / daily_model / daily_cap inválidos → 400", async () => {
  const service = setup();
  const a = actor();
  await assert.rejects(
    () => service.create(a, { name: "x", scope: "MUNICIPAL" }),
    (e: unknown) => e instanceof JurisdictionError && e.statusCode === 400 && e.reason === "invalid_scope",
  );
  await assert.rejects(
    () => service.create(a, { name: "x", scope: "PUBLIC_AGREEMENT", daily_model: "WEEKLY" }),
    (e: unknown) => e instanceof JurisdictionError && e.statusCode === 400 && e.reason === "invalid_daily_model",
  );
  await assert.rejects(
    () => service.create(a, { name: "x", scope: "PUBLIC_AGREEMENT", daily_cap: "ONE_YEAR" }),
    (e: unknown) => e instanceof JurisdictionError && e.statusCode === 400 && e.reason === "invalid_daily_cap",
  );
});

test("name vazio → 400 required_field", async () => {
  const service = setup();
  await assert.rejects(
    () => service.create(actor(), { scope: "PUBLIC_AGREEMENT" }),
    (e: unknown) => e instanceof JurisdictionError && e.statusCode === 400 && e.reason === "required_field",
  );
});

// ── Chave natural (tenant, name) ─────────────────────────────────────────────────

test("segundo perfil com o mesmo name no mesmo tenant → 409 JURISDICTION_CONFLICT", async () => {
  const service = setup();
  const a = actor();
  await service.create(a, { name: "Duplicado", scope: "PUBLIC_AGREEMENT" });
  await assert.rejects(
    () => service.create(a, { name: "Duplicado", scope: "PRIVATE_CONTRACT" }),
    (e: unknown) => e instanceof JurisdictionError && e.statusCode === 409 && e.code === "JURISDICTION_CONFLICT",
  );
});

test("update para um name já usado por OUTRO perfil → 409", async () => {
  const service = setup();
  const a = actor();
  await service.create(a, { name: "Alfa", scope: "PUBLIC_AGREEMENT" });
  const beta = await service.create(a, { name: "Beta", scope: "PUBLIC_AGREEMENT" });
  await assert.rejects(
    () => service.update(a, beta.id, { name: "Alfa" }),
    (e: unknown) => e instanceof JurisdictionError && e.statusCode === 409 && e.code === "JURISDICTION_CONFLICT",
  );
});

// ── release_requirements ─────────────────────────────────────────────────────────

test("release_requirements: lista válida persiste; shape inválido → 400", async () => {
  const service = setup();
  const a = actor();
  const created = await service.create(a, {
    name: "Com checklist",
    scope: "PUBLIC_AGREEMENT",
    release_requirements: [
      { code: "OWNER_ID", label: "Documento de quem retira", required: true },
      { code: "DEBTS", label: "Quitação", required: false },
    ],
  });
  assert.equal(created.releaseRequirements.length, 2);
  assert.equal(created.releaseRequirements[0]?.code, "OWNER_ID");
  assert.equal(created.releaseRequirements[0]?.required, true);
  assert.equal(created.releaseRequirements[1]?.required, false);

  // não-array → 400
  await assert.rejects(
    () => service.create(a, { name: "bad1", scope: "PUBLIC_AGREEMENT", release_requirements: { code: "X" } }),
    (e: unknown) => e instanceof JurisdictionError && e.statusCode === 400 && e.reason === "invalid_release_requirements",
  );
  // item sem code/label → 400
  await assert.rejects(
    () => service.create(a, { name: "bad2", scope: "PUBLIC_AGREEMENT", release_requirements: [{ required: true }] }),
    (e: unknown) => e instanceof JurisdictionError && e.statusCode === 400,
  );
});

// ── Endpoint de defaults (service.defaults) ──────────────────────────────────────

test("service.defaults(scope) valida o scope e devolve os defaults resolvidos", () => {
  const service = setup();
  const pub = service.defaults({ scope: "public_agreement" });
  assert.equal(pub.scope, "PUBLIC_AGREEMENT");
  assert.equal(pub.defaults.dailyCap, "SIX_MONTHS");
  const priv = service.defaults({ scope: "PRIVATE_CONTRACT" });
  assert.equal(priv.defaults.dailyCap, "UNLIMITED");
  assert.throws(
    () => service.defaults({ scope: "FOO" }),
    (e: unknown) => e instanceof JurisdictionError && e.statusCode === 400 && e.reason === "invalid_scope",
  );
});

// ── Escopo por tenant ────────────────────────────────────────────────────────────

test("perfil de um tenant é invisível a outro (get → 404; list vazia)", async () => {
  const service = setup();
  const a = actor();
  const b = actor();
  const created = await service.create(a, { name: "Só do A", scope: "PUBLIC_AGREEMENT" });
  await assert.rejects(
    () => service.get(b, created.id),
    (e: unknown) => e instanceof JurisdictionError && e.statusCode === 404,
  );
  const listB = await service.list(b, {});
  assert.equal(listB.total, 0);
  // mesmo name em tenant distinto NÃO colide (chave natural é por tenant)
  const inB = await service.create(b, { name: "Só do A", scope: "PUBLIC_AGREEMENT" });
  assert.equal(inB.name, "Só do A");
});

test("profileId malformado → 400 invalid_uuid", async () => {
  const service = setup();
  await assert.rejects(
    () => service.get(actor(), "not-a-uuid"),
    (e: unknown) => e instanceof JurisdictionError && e.statusCode === 400 && e.reason === "invalid_uuid",
  );
});
