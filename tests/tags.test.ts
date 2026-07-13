import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import {
  createMemoryTagService,
  resetTagRuntimeForTests,
} from "../src/modules/tags/tag.service.js";
import { TagError, type TagActorContext } from "../src/modules/tags/tag.types.js";

function actor(tenantId = randomUUID()): TagActorContext {
  return { tenantId, userId: randomUUID(), roles: ["manager"], permissions: ["tags:read", "tags:create", "tags:update"] };
}

function service() {
  resetTagRuntimeForTests();
  return createMemoryTagService();
}

test("cria Tag com defaults (is_active true, sem color/description)", async () => {
  const svc = service();
  const tag = await svc.create(actor(), { name: "Urgente" });
  assert.equal(tag.name, "Urgente");
  assert.equal(tag.isActive, true);
  assert.equal(tag.color, undefined);
  assert.equal(tag.description, undefined);
  assert.ok(tag.createdAt instanceof Date);
});

test("aceita color hex válida e description", async () => {
  const svc = service();
  const tag = await svc.create(actor(), { name: "Verde", color: "#22c55e", description: "Prioridade baixa" });
  assert.equal(tag.color, "#22c55e");
  assert.equal(tag.description, "Prioridade baixa");
});

test("nome vazio → 400", async () => {
  const svc = service();
  await assert.rejects(() => svc.create(actor(), {}), (e: unknown) => e instanceof TagError && e.statusCode === 400 && e.reason === "required_field");
});

test("color inválida (não-hex) → 400 invalid_color", async () => {
  const svc = service();
  await assert.rejects(
    () => svc.create(actor(), { name: "X", color: "green" }),
    (e: unknown) => e instanceof TagError && e.statusCode === 400 && e.reason === "invalid_color",
  );
});

test("color com formato #RGB curto → 400 invalid_color", async () => {
  const svc = service();
  await assert.rejects(
    () => svc.create(actor(), { name: "Y", color: "#abc" }),
    (e: unknown) => e instanceof TagError && e.statusCode === 400 && e.reason === "invalid_color",
  );
});

test("nome duplicado no mesmo tenant → 409", async () => {
  const svc = service();
  const ctx = actor();
  await svc.create(ctx, { name: "Igual" });
  await assert.rejects(() => svc.create(ctx, { name: "Igual" }), (e: unknown) => e instanceof TagError && e.statusCode === 409 && e.reason === "duplicate_name");
});

test("mesmo nome em tenant diferente → OK (chave natural composta)", async () => {
  const svc = service();
  await svc.create(actor(), { name: "Compartilhado" });
  const other = await svc.create(actor(), { name: "Compartilhado" });
  assert.equal(other.name, "Compartilhado");
});

test("isolamento: get/update de outro tenant → 404", async () => {
  const svc = service();
  const owner = actor();
  const t = await svc.create(owner, { name: "Do dono" });
  const intruder = actor();
  await assert.rejects(() => svc.get(intruder, t.id), (e: unknown) => e instanceof TagError && e.statusCode === 404);
  await assert.rejects(() => svc.update(intruder, t.id, { description: "x" }), (e: unknown) => e instanceof TagError && e.statusCode === 404);
});

test("list filtra por is_active e search (nome/descrição)", async () => {
  const svc = service();
  const ctx = actor();
  await svc.create(ctx, { name: "Alpha etiqueta", description: "cliente vip" });
  await svc.create(ctx, { name: "Beta etiqueta" });
  const byName = await svc.list(ctx, { search: "beta" });
  assert.equal(byName.items.length, 1);
  assert.equal(byName.items[0]!.name, "Beta etiqueta");
  const byDescription = await svc.list(ctx, { search: "vip" });
  assert.equal(byDescription.items.length, 1);
  assert.equal(byDescription.items[0]!.name, "Alpha etiqueta");
});

test("desativação lógica via is_active=false", async () => {
  const svc = service();
  const ctx = actor();
  const t = await svc.create(ctx, { name: "Inativar" });
  const off = await svc.update(ctx, t.id, { is_active: false });
  assert.equal(off.isActive, false);
  const actives = await svc.list(ctx, { is_active: true });
  assert.equal(actives.items.length, 0);
  const inactives = await svc.list(ctx, { is_active: false });
  assert.equal(inactives.items.length, 1);
});

test("update renomeia e troca color", async () => {
  const svc = service();
  const ctx = actor();
  const t = await svc.create(ctx, { name: "Antigo", color: "#111111" });
  const updated = await svc.update(ctx, t.id, { name: "Novo", color: "#abcdef" });
  assert.equal(updated.name, "Novo");
  assert.equal(updated.color, "#abcdef");
});

test("update para nome já existente no tenant → 409", async () => {
  const svc = service();
  const ctx = actor();
  await svc.create(ctx, { name: "Existente" });
  const t = await svc.create(ctx, { name: "Mutável" });
  await assert.rejects(() => svc.update(ctx, t.id, { name: "Existente" }), (e: unknown) => e instanceof TagError && e.statusCode === 409);
});

test("get com id inexistente → 404", async () => {
  const svc = service();
  await assert.rejects(() => svc.get(actor(), randomUUID()), (e: unknown) => e instanceof TagError && e.statusCode === 404);
});
