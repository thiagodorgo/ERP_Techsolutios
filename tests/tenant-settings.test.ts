import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import {
  createMemoryTenantSettingService,
  resetTenantSettingRuntimeForTests,
} from "../src/modules/tenant-settings/tenant-setting.service.js";
import {
  TenantSettingError,
  type TenantSettingActorContext,
} from "../src/modules/tenant-settings/tenant-setting.types.js";

function actor(tenantId = randomUUID()): TenantSettingActorContext {
  return {
    tenantId,
    userId: randomUUID(),
    roles: ["tenant_admin"],
    permissions: ["tenant_settings:read", "tenant_settings:update"],
  };
}

function service() {
  resetTenantSettingRuntimeForTests();
  return createMemoryTenantSettingService();
}

test("upsert cria parâmetro novo com value/category/description", async () => {
  const svc = service();
  const ctx = actor();
  const setting = await svc.upsert(ctx, "organization.theme", {
    value: "enterprise_blue",
    category: "appearance",
    description: "Tema visual da organização",
  });
  assert.equal(setting.key, "organization.theme");
  assert.equal(setting.value, "enterprise_blue");
  assert.equal(setting.category, "appearance");
  assert.equal(setting.description, "Tema visual da organização");
  assert.equal(setting.tenantId, ctx.tenantId);
  assert.equal(setting.updatedBy, ctx.userId);
});

test("upsert atualiza a mesma key: value muda e não duplica", async () => {
  const svc = service();
  const ctx = actor();
  await svc.upsert(ctx, "organization.currency", { value: "BRL", category: "general" });
  const updated = await svc.upsert(ctx, "organization.currency", { value: "USD" });
  assert.equal(updated.value, "USD");
  // merge: category preservada quando ausente no update
  assert.equal(updated.category, "general");
  const listed = await svc.list(ctx, {});
  assert.equal(listed.total, 1);
  assert.equal(listed.items[0]!.value, "USD");
});

test("upsert faz merge: campos ausentes preservados, presentes sobrescritos", async () => {
  const svc = service();
  const ctx = actor();
  await svc.upsert(ctx, "organization.theme", { value: "enterprise_blue", category: "appearance", description: "Tema" });
  const merged = await svc.upsert(ctx, "organization.theme", { value: "midnight" });
  assert.equal(merged.value, "midnight");
  assert.equal(merged.category, "appearance");
  assert.equal(merged.description, "Tema");
  const withDesc = await svc.upsert(ctx, "organization.theme", { value: "midnight", description: "Novo tema" });
  assert.equal(withDesc.description, "Novo tema");
});

test("key inválida → 400 invalid_key (maiúscula, espaço, início inválido, curta/longa demais)", async () => {
  const svc = service();
  const ctx = actor();
  const invalidKeys = ["Organization.Theme", "with space", "1leading", "_underscore", "a", "", "x".repeat(81)];
  for (const key of invalidKeys) {
    await assert.rejects(
      () => svc.upsert(ctx, key, { value: "v" }),
      (error: unknown) => error instanceof TenantSettingError && error.statusCode === 400 && error.reason === "invalid_key",
    );
  }
});

test("get com key inválida → 400 invalid_key", async () => {
  const svc = service();
  await assert.rejects(
    () => svc.get(actor(), "BAD KEY"),
    (error: unknown) => error instanceof TenantSettingError && error.statusCode === 400 && error.reason === "invalid_key",
  );
});

test("key com pontos e underscores é válida", async () => {
  const svc = service();
  const setting = await svc.upsert(actor(), "organization.business_name", { value: "ACME" });
  assert.equal(setting.key, "organization.business_name");
});

test("value ausente → 400 required_value; value não-string → 400 invalid_value", async () => {
  const svc = service();
  const ctx = actor();
  await assert.rejects(
    () => svc.upsert(ctx, "organization.x", {}),
    (error: unknown) => error instanceof TenantSettingError && error.statusCode === 400 && error.reason === "required_value",
  );
  await assert.rejects(
    () => svc.upsert(ctx, "organization.y", { value: 42 }),
    (error: unknown) => error instanceof TenantSettingError && error.statusCode === 400 && error.reason === "invalid_value",
  );
  // Veto junta Ω2-e: value vazio/só-espaços → 400 required_value (parâmetro precisa ter conteúdo).
  await assert.rejects(
    () => svc.upsert(ctx, "organization.z", { value: "" }),
    (error: unknown) => error instanceof TenantSettingError && error.statusCode === 400 && error.reason === "required_value",
  );
  await assert.rejects(
    () => svc.upsert(ctx, "organization.z", { value: "   " }),
    (error: unknown) => error instanceof TenantSettingError && error.statusCode === 400 && error.reason === "required_value",
  );
});

test("value acima de 5000 chars → 400 value_too_long; exatamente 5000 é aceito", async () => {
  const svc = service();
  const ctx = actor();
  await assert.rejects(
    () => svc.upsert(ctx, "organization.blob", { value: "x".repeat(5001) }),
    (error: unknown) => error instanceof TenantSettingError && error.statusCode === 400 && error.reason === "value_too_long",
  );
  const setting = await svc.upsert(ctx, "organization.blob", { value: "y".repeat(5000) });
  assert.equal(setting.value.length, 5000);
});

test("category > 40 e description > 300 → 400", async () => {
  const svc = service();
  const ctx = actor();
  await assert.rejects(
    () => svc.upsert(ctx, "organization.a", { value: "v", category: "c".repeat(41) }),
    (error: unknown) => error instanceof TenantSettingError && error.statusCode === 400 && error.reason === "invalid_category",
  );
  await assert.rejects(
    () => svc.upsert(ctx, "organization.b", { value: "v", description: "d".repeat(301) }),
    (error: unknown) => error instanceof TenantSettingError && error.statusCode === 400 && error.reason === "invalid_description",
  );
});

test("value aceita JSON serializado e preserva espaços (sem trim)", async () => {
  const svc = service();
  const ctx = actor();
  const json = JSON.stringify({ a: 1, b: [2, 3] });
  const setting = await svc.upsert(ctx, "organization.payload", { value: json });
  assert.equal(setting.value, json);
  const padded = await svc.upsert(ctx, "organization.padded", { value: "  spaced  " });
  assert.equal(padded.value, "  spaced  ");
});

test("list retorna todos os parâmetros do tenant, ordenados por key, com total", async () => {
  const svc = service();
  const ctx = actor();
  await svc.upsert(ctx, "organization.theme", { value: "enterprise_blue", category: "appearance" });
  await svc.upsert(ctx, "organization.currency", { value: "BRL", category: "general" });
  await svc.upsert(ctx, "organization.timezone", { value: "America/Sao_Paulo", category: "general" });
  const listed = await svc.list(ctx, {});
  assert.equal(listed.total, 3);
  assert.deepEqual(
    listed.items.map((setting) => setting.key),
    ["organization.currency", "organization.theme", "organization.timezone"],
  );
});

test("list filtra por category", async () => {
  const svc = service();
  const ctx = actor();
  await svc.upsert(ctx, "organization.theme", { value: "enterprise_blue", category: "appearance" });
  await svc.upsert(ctx, "organization.currency", { value: "BRL", category: "general" });
  await svc.upsert(ctx, "organization.timezone", { value: "America/Sao_Paulo", category: "general" });
  const general = await svc.list(ctx, { category: "general" });
  assert.equal(general.total, 2);
  assert.ok(general.items.every((setting) => setting.category === "general"));
  const appearance = await svc.list(ctx, { category: "appearance" });
  assert.equal(appearance.total, 1);
  assert.equal(appearance.items[0]!.key, "organization.theme");
});

test("get de key inexistente → 404 not_found", async () => {
  const svc = service();
  await assert.rejects(
    () => svc.get(actor(), "organization.missing"),
    (error: unknown) => error instanceof TenantSettingError && error.statusCode === 404 && error.reason === "not_found",
  );
});

test("get retorna o parâmetro após o upsert", async () => {
  const svc = service();
  const ctx = actor();
  await svc.upsert(ctx, "organization.business_name", { value: "Organização Demonstração", category: "general" });
  const fetched = await svc.get(ctx, "organization.business_name");
  assert.equal(fetched.value, "Organização Demonstração");
  assert.equal(fetched.category, "general");
});

test("isolamento: a mesma key convive em tenants distintos sem vazar (lista e get)", async () => {
  const svc = service();
  const owner = actor();
  const intruder = actor();
  await svc.upsert(owner, "organization.theme", { value: "enterprise_blue" });
  await svc.upsert(intruder, "organization.theme", { value: "midnight" });
  const ownerList = await svc.list(owner, {});
  assert.equal(ownerList.total, 1);
  assert.equal(ownerList.items[0]!.value, "enterprise_blue");
  const intruderGet = await svc.get(intruder, "organization.theme");
  assert.equal(intruderGet.value, "midnight");
});

test("isolamento: get de key que só existe em outro tenant → 404", async () => {
  const svc = service();
  const owner = actor();
  const other = actor();
  await svc.upsert(owner, "organization.currency", { value: "BRL" });
  await assert.rejects(
    () => svc.get(other, "organization.currency"),
    (error: unknown) => error instanceof TenantSettingError && error.statusCode === 404,
  );
});

test("list NUNCA retorna parâmetro de outro tenant (3 tenants)", async () => {
  const svc = service();
  const [a, b, c] = [actor(), actor(), actor()];
  await svc.upsert(a, "organization.theme", { value: "a-theme" });
  await svc.upsert(b, "organization.theme", { value: "b-theme" });
  await svc.upsert(c, "organization.theme", { value: "c-theme" });
  const listed = await svc.list(a, {});
  assert.equal(listed.total, 1);
  assert.equal(listed.items[0]!.value, "a-theme");
});
