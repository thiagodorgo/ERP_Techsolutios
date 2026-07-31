import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

import {
  createMemoryVehicleIdentityService,
  resetVehicleIdentityRuntimeForTests,
} from "../src/modules/vehicle-identities/vehicle-identity.service.js";
import { VehicleIdentityError, type VehicleIdentityActorContext } from "../src/modules/vehicle-identities/vehicle-identity.types.js";

function actor(tenantId = randomUUID()): VehicleIdentityActorContext {
  return {
    tenantId,
    userId: randomUUID(),
    roles: ["manager"],
    permissions: ["impound:read", "impound:update"],
  };
}

function setup() {
  resetVehicleIdentityRuntimeForTests();
  return createMemoryVehicleIdentityService();
}

// ── create ────────────────────────────────────────────────────────────────────

test("create: identificado por placa deriva plate_key normalizado (portal-shared normalizePlateKey)", async () => {
  const service = setup();
  const identity = await service.create(actor(), { plate: "abc-1234", brand: "Fiat", model: "Uno" });
  assert.equal(identity.plateRaw, "abc-1234");
  assert.equal(identity.plateKey, "ABC1234");
  assert.equal(identity.unidentified, false);
  assert.equal(identity.confidence, "PROVISIONAL");
});

test("create: renavam é normalizado (só dígitos, zeros à esquerda preservados)", async () => {
  const service = setup();
  const identity = await service.create(actor(), { renavam: "012.345.678-90", unidentified: false });
  assert.equal(identity.renavamKey, "01234567890");
});

test("create: unidentified=true SEM unidentifiedReason -> 400 (belt-and-suspenders do identity_chk)", async () => {
  const service = setup();
  await assert.rejects(
    () => service.create(actor(), { unidentified: true }),
    (error: unknown) => error instanceof VehicleIdentityError && error.reason === "unidentified_requires_reason",
  );
});

test("create: unidentified=false SEM nenhum identificador -> 400 (belt-and-suspenders do identity_chk)", async () => {
  const service = setup();
  await assert.rejects(
    () => service.create(actor(), { unidentified: false, brand: "Fiat" }),
    (error: unknown) => error instanceof VehicleIdentityError && error.reason === "identified_requires_identifier",
  );
});

test("create: unidentified=true COM reason passa", async () => {
  const service = setup();
  const identity = await service.create(actor(), { unidentified: true, unidentifiedReason: "placa ilegível" });
  assert.equal(identity.unidentified, true);
  assert.equal(identity.unidentifiedReason, "placa ilegível");
});

test("create: confidence=MERGED é rejeitado (só o fluxo de merge do PR-04 o atinge)", async () => {
  const service = setup();
  await assert.rejects(
    () => service.create(actor(), { plate: "MRG0001", confidence: "MERGED" }),
    (error: unknown) => error instanceof VehicleIdentityError && error.reason === "invalid_confidence",
  );
});

test("create: confidence=CONFIRMED é aceito", async () => {
  const service = setup();
  const identity = await service.create(actor(), { plate: "CNF0001", confidence: "confirmed" });
  assert.equal(identity.confidence, "CONFIRMED");
});

// ── get ───────────────────────────────────────────────────────────────────────

test("get: identidade inexistente -> 404", async () => {
  const service = setup();
  await assert.rejects(
    () => service.get(actor(), randomUUID()),
    (error: unknown) => error instanceof VehicleIdentityError && error.statusCode === 404,
  );
});

test("get: identidade de OUTRO tenant não é encontrada (isolamento no memory repo)", async () => {
  const service = setup();
  const ownerActor = actor();
  const created = await service.create(ownerActor, { plate: "TEN0001" });
  await assert.rejects(
    () => service.get(actor(), created.id),
    (error: unknown) => error instanceof VehicleIdentityError && error.statusCode === 404,
  );
});

// ── update (patch) ───────────────────────────────────────────────────────────

test("update: corrige a placa sem tocar em merge (canonicalIdentityId nunca é exposto/gravável)", async () => {
  const service = setup();
  const tenantActor = actor();
  const created = await service.create(tenantActor, { plate: "OLD0001" });
  const updated = await service.update(tenantActor, created.id, { plate: "NEW0001" });
  assert.equal(updated.plateRaw, "NEW0001");
  assert.equal(updated.plateKey, "NEW0001");
  assert.equal(updated.canonicalIdentityId, undefined);
});

test("update: campos omitidos preservam o valor atual (semântica PATCH)", async () => {
  const service = setup();
  const tenantActor = actor();
  const created = await service.create(tenantActor, { plate: "KEEP0001", brand: "Fiat", model: "Uno" });
  const updated = await service.update(tenantActor, created.id, { color: "branco" });
  assert.equal(updated.brand, "Fiat");
  assert.equal(updated.model, "Uno");
  assert.equal(updated.color, "branco");
});

test("update: campo explicitamente null limpa o valor (mas não pode violar identity_chk resultante)", async () => {
  const service = setup();
  const tenantActor = actor();
  const created = await service.create(tenantActor, { plate: "CLR0001", chassis: "CHASSIS1" });
  const updated = await service.update(tenantActor, created.id, { plate: null });
  assert.equal(updated.plateRaw, undefined);
  assert.equal(updated.chassis, "CHASSIS1", "ainda identificado pelo chassi, então o CHECK segue satisfeito");
});

test("update: limpar TODOS os identificadores sem virar unidentified -> 400 (identity_chk resultante)", async () => {
  const service = setup();
  const tenantActor = actor();
  const created = await service.create(tenantActor, { plate: "ALL0001" });
  await assert.rejects(
    () => service.update(tenantActor, created.id, { plate: null }),
    (error: unknown) => error instanceof VehicleIdentityError && error.reason === "identified_requires_identifier",
  );
});

test("update: mudar para unidentified=true exige reason mesmo em cima de um registro já identificado", async () => {
  const service = setup();
  const tenantActor = actor();
  const created = await service.create(tenantActor, { plate: "SWT0001" });
  await assert.rejects(
    () => service.update(tenantActor, created.id, { unidentified: true }),
    (error: unknown) => error instanceof VehicleIdentityError && error.reason === "unidentified_requires_reason",
  );
});

test("update: unidentified=true com identificador AINDA presente -> 400 (achado do crítico-adversarial, PR-02) — nunca limpa em silêncio", async () => {
  const service = setup();
  const tenantActor = actor();
  const created = await service.create(tenantActor, { plate: "SWT0001" });
  // Reason presente mas plate ainda populado (não veio null no body) -> deve rejeitar, não limpar sozinho.
  await assert.rejects(
    () => service.update(tenantActor, created.id, { unidentified: true, unidentifiedReason: "avaria" }),
    (error: unknown) => error instanceof VehicleIdentityError && error.reason === "unidentified_conflicts_with_identifier",
  );
  // Limpando o identificador explicitamente no mesmo PATCH -> aceito.
  const updated = await service.update(tenantActor, created.id, {
    unidentified: true,
    unidentifiedReason: "avaria",
    plate: null,
  });
  assert.equal(updated.unidentified, true);
  assert.equal(updated.plateRaw, undefined);
});

test("update: identidade de outro tenant -> 404 (isolamento)", async () => {
  const service = setup();
  const created = await service.create(actor(), { plate: "OTH0001" });
  await assert.rejects(
    () => service.update(actor(), created.id, { color: "azul" }),
    (error: unknown) => error instanceof VehicleIdentityError && error.statusCode === 404,
  );
});

// ── list ──────────────────────────────────────────────────────────────────────

test("list: filtra por tenant e por placa normalizada", async () => {
  const service = setup();
  const tenantActor = actor();
  await service.create(tenantActor, { plate: "LST-0001" });
  await service.create(tenantActor, { plate: "LST-0002" });
  await service.create(actor(), { plate: "LST-0001" }); // outro tenant, mesma placa

  const all = await service.list(tenantActor, {});
  assert.equal(all.total, 2);

  const filtered = await service.list(tenantActor, { plate: "lst 0001" });
  assert.equal(filtered.total, 1);
  assert.equal(filtered.items[0].plateKey, "LST0001");
});

test("list: pagina com limit/offset", async () => {
  const service = setup();
  const tenantActor = actor();
  for (let i = 0; i < 5; i += 1) {
    await service.create(tenantActor, { plate: `PAG000${i}` });
  }
  const page = await service.list(tenantActor, { limit: "2", offset: "1" });
  assert.equal(page.items.length, 2);
  assert.equal(page.total, 5);
  assert.equal(page.limit, 2);
  assert.equal(page.offset, 1);
});
