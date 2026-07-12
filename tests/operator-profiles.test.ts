import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import {
  createMemoryOperatorProfileService,
  resetOperatorProfileRuntimeForTests,
} from "../src/modules/operator-profiles/operator-profile.service.js";
import { OperatorProfileError, type OperatorProfileActorContext } from "../src/modules/operator-profiles/operator-profile.types.js";

function actor(tenantId = randomUUID()): OperatorProfileActorContext {
  return {
    tenantId,
    userId: randomUUID(),
    roles: ["manager"],
    permissions: ["operator_profiles:read", "operator_profiles:create", "operator_profiles:update"],
  };
}

function service() {
  resetOperatorProfileRuntimeForTests();
  return createMemoryOperatorProfileService();
}

test("cria Profissional com defaults (consent false, sem carimbo, isActive true)", async () => {
  const svc = service();
  const userId = randomUUID();
  const profile = await svc.create(actor(), { user_id: userId, full_name: "João Guincho", cnh_category: "d" });
  assert.equal(profile.userId, userId);
  assert.equal(profile.fullName, "João Guincho");
  assert.equal(profile.cnhCategory, "D"); // normaliza maiúsculas
  assert.equal(profile.trackingConsent, false);
  assert.equal(profile.trackingConsentAt, undefined);
  assert.equal(profile.isActive, true);
});

test("consent true na criação grava tracking_consent_at", async () => {
  const svc = service();
  const profile = await svc.create(actor(), { user_id: randomUUID(), tracking_consent: true });
  assert.equal(profile.trackingConsent, true);
  assert.ok(profile.trackingConsentAt instanceof Date);
});

test("conceder consentimento no update (false→true) carimba consent_at", async () => {
  const svc = service();
  const ctx = actor();
  const created = await svc.create(ctx, { user_id: randomUUID() });
  assert.equal(created.trackingConsentAt, undefined);
  const granted = await svc.update(ctx, created.id, { tracking_consent: true });
  assert.equal(granted.trackingConsent, true);
  assert.ok(granted.trackingConsentAt instanceof Date);
});

test("revogar consentimento (→false) limpa tracking_consent_at", async () => {
  const svc = service();
  const ctx = actor();
  const created = await svc.create(ctx, { user_id: randomUUID(), tracking_consent: true });
  assert.ok(created.trackingConsentAt instanceof Date);
  const revoked = await svc.update(ctx, created.id, { tracking_consent: false });
  assert.equal(revoked.trackingConsent, false);
  assert.equal(revoked.trackingConsentAt, undefined);
});

test("update sem tracking_consent preserva flag e carimbo", async () => {
  const svc = service();
  const ctx = actor();
  const created = await svc.create(ctx, { user_id: randomUUID(), tracking_consent: true });
  const stamp = created.trackingConsentAt;
  const updated = await svc.update(ctx, created.id, { phone: "11999998888" });
  assert.equal(updated.trackingConsent, true);
  assert.deepEqual(updated.trackingConsentAt, stamp);
  assert.equal(updated.phone, "11999998888");
});

test("relação 1-1: criar 2º perfil para o mesmo user_id → 409 duplicate_profile", async () => {
  const svc = service();
  const ctx = actor();
  const userId = randomUUID();
  await svc.create(ctx, { user_id: userId });
  await assert.rejects(
    () => svc.create(ctx, { user_id: userId }),
    (e: unknown) => e instanceof OperatorProfileError && e.statusCode === 409 && e.reason === "duplicate_profile",
  );
});

test("user_id é imutável no update (novo user_id no body é ignorado)", async () => {
  const svc = service();
  const ctx = actor();
  const originalUserId = randomUUID();
  const created = await svc.create(ctx, { user_id: originalUserId });
  const updated = await svc.update(ctx, created.id, { user_id: randomUUID(), full_name: "Novo Nome" });
  assert.equal(updated.userId, originalUserId);
  assert.equal(updated.fullName, "Novo Nome");
});

test("user_id ausente → 400; user_id inválido → 400 invalid_uuid", async () => {
  const svc = service();
  await assert.rejects(
    () => svc.create(actor(), { full_name: "Sem user" }),
    (e: unknown) => e instanceof OperatorProfileError && e.statusCode === 400,
  );
  await assert.rejects(
    () => svc.create(actor(), { user_id: "nope" }),
    (e: unknown) => e instanceof OperatorProfileError && e.statusCode === 400 && e.reason === "invalid_uuid",
  );
});

test("validações: cnh_category longa demais → 400; phone longo demais → 400", async () => {
  const svc = service();
  await assert.rejects(
    () => svc.create(actor(), { user_id: randomUUID(), cnh_category: "ABCDEF" }),
    (e: unknown) => e instanceof OperatorProfileError && e.statusCode === 400 && e.reason === "invalid_cnh_category",
  );
  await assert.rejects(
    () => svc.create(actor(), { user_id: randomUUID(), phone: "9".repeat(41) }),
    (e: unknown) => e instanceof OperatorProfileError && e.statusCode === 400 && e.reason === "invalid_phone",
  );
});

test("CNH vencida (data passada) é aceita — o selo é do frontend", async () => {
  const svc = service();
  const profile = await svc.create(actor(), { user_id: randomUUID(), cnh_number: "12345678900", cnh_expires_at: "2000-01-01T00:00:00Z" });
  assert.ok(profile.cnhExpiresAt instanceof Date);
  assert.equal(profile.cnhNumber, "12345678900");
});

test("isolamento: get de outro tenant → 404", async () => {
  const svc = service();
  const created = await svc.create(actor(), { user_id: randomUUID() });
  await assert.rejects(
    () => svc.get(actor(), created.id),
    (e: unknown) => e instanceof OperatorProfileError && e.statusCode === 404,
  );
});

test("isolamento: update de outro tenant → 404", async () => {
  const svc = service();
  const created = await svc.create(actor(), { user_id: randomUUID() });
  await assert.rejects(
    () => svc.update(actor(), created.id, { full_name: "x" }),
    (e: unknown) => e instanceof OperatorProfileError && e.statusCode === 404,
  );
});

test("list filtra por has_consent", async () => {
  const svc = service();
  const ctx = actor();
  await svc.create(ctx, { user_id: randomUUID(), tracking_consent: true });
  await svc.create(ctx, { user_id: randomUUID(), tracking_consent: false });
  const consenting = await svc.list(ctx, { has_consent: true });
  assert.equal(consenting.items.length, 1);
  assert.equal(consenting.items[0]!.trackingConsent, true);
  const nonConsenting = await svc.list(ctx, { has_consent: false });
  assert.equal(nonConsenting.items.length, 1);
  assert.equal(nonConsenting.items[0]!.trackingConsent, false);
});

test("list search por full_name e por cnh_number", async () => {
  const svc = service();
  const ctx = actor();
  await svc.create(ctx, { user_id: randomUUID(), full_name: "Maria Prancha", cnh_number: "AAA111" });
  await svc.create(ctx, { user_id: randomUUID(), full_name: "Carlos Reboque", cnh_number: "BBB222" });
  const byName = await svc.list(ctx, { search: "prancha" });
  assert.equal(byName.items.length, 1);
  assert.equal(byName.items[0]!.fullName, "Maria Prancha");
  const byCnh = await svc.list(ctx, { search: "bbb222" });
  assert.equal(byCnh.items.length, 1);
  assert.equal(byCnh.items[0]!.cnhNumber, "BBB222");
});

test("list filtra por is_active e faz soft-delete via is_active=false", async () => {
  const svc = service();
  const ctx = actor();
  const created = await svc.create(ctx, { user_id: randomUUID() });
  const off = await svc.update(ctx, created.id, { is_active: false });
  assert.equal(off.isActive, false);
  const actives = await svc.list(ctx, { is_active: true });
  assert.equal(actives.items.length, 0);
  const inactives = await svc.list(ctx, { is_active: false });
  assert.equal(inactives.items.length, 1);
});

test("get retorna o perfil criado no mesmo tenant", async () => {
  const svc = service();
  const ctx = actor();
  const created = await svc.create(ctx, { user_id: randomUUID() });
  const fetched = await svc.get(ctx, created.id);
  assert.equal(fetched.id, created.id);
  assert.equal(fetched.userId, created.userId);
});
