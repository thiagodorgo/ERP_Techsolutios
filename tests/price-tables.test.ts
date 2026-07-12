import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import {
  createMemoryPriceTableService,
  resetPriceTableRuntimeForTests,
} from "../src/modules/price-tables/price-table.service.js";
import { PriceTableError, type PriceTableActorContext } from "../src/modules/price-tables/price-table.types.js";

function actor(tenantId = randomUUID()): PriceTableActorContext {
  return { tenantId, userId: randomUUID(), roles: ["manager"], permissions: ["price_tables:read", "price_tables:create", "price_tables:update"] };
}

function service() {
  resetPriceTableRuntimeForTests();
  return createMemoryPriceTableService();
}

test("cria Tabela de Valores em rascunho com defaults (currency BRL, version 1)", async () => {
  const svc = service();
  const ctx = actor();
  const table = await svc.create(ctx, { name: "Tabela Padrão 2026" });
  assert.equal(table.status, "draft");
  assert.equal(table.currency, "BRL");
  assert.equal(table.version, 1);
  assert.equal(table.isActive, true);
  assert.equal(table.name, "Tabela Padrão 2026");
});

test("normaliza currency e version informados", async () => {
  const svc = service();
  const table = await svc.create(actor(), { name: "T", currency: "usd", version: "3", validFrom: "2026-01-01T00:00:00Z" });
  assert.equal(table.currency, "USD");
  assert.equal(table.version, 3);
  assert.ok(table.validFrom instanceof Date);
});

test("nome vazio → 400; currency inválida → 400", async () => {
  const svc = service();
  await assert.rejects(() => svc.create(actor(), {}), (e: unknown) => e instanceof PriceTableError && e.statusCode === 400);
  await assert.rejects(() => svc.create(actor(), { name: "X", currency: "reais" }), (e: unknown) => e instanceof PriceTableError && e.statusCode === 400);
});

test("nome duplicado no mesmo tenant → 409", async () => {
  const svc = service();
  const ctx = actor();
  await svc.create(ctx, { name: "Igual" });
  await assert.rejects(() => svc.create(ctx, { name: "Igual" }), (e: unknown) => e instanceof PriceTableError && e.statusCode === 409);
});

test("máquina de estado: draft→published→archived OK", async () => {
  const svc = service();
  const ctx = actor();
  const t = await svc.create(ctx, { name: "Fluxo" });
  const published = await svc.update(ctx, t.id, { status: "published" });
  assert.equal(published.status, "published");
  const archived = await svc.update(ctx, t.id, { status: "archived" });
  assert.equal(archived.status, "archived");
});

test("máquina de estado: transição inválida (published→draft) → 422", async () => {
  const svc = service();
  const ctx = actor();
  const t = await svc.create(ctx, { name: "Trava" });
  await svc.update(ctx, t.id, { status: "published" });
  await assert.rejects(
    () => svc.update(ctx, t.id, { status: "draft" }),
    (e: unknown) => e instanceof PriceTableError && e.statusCode === 422 && e.reason === "invalid_status_transition",
  );
});

test("máquina de estado: archived é terminal (archived→published) → 422", async () => {
  const svc = service();
  const ctx = actor();
  const t = await svc.create(ctx, { name: "Terminal" });
  await svc.update(ctx, t.id, { status: "published" });
  await svc.update(ctx, t.id, { status: "archived" });
  await assert.rejects(() => svc.update(ctx, t.id, { status: "published" }), (e: unknown) => e instanceof PriceTableError && e.statusCode === 422);
});

test("tabela publicada permanece EDITÁVEL (deferral consciente D-OMEGA2A)", async () => {
  const svc = service();
  const ctx = actor();
  const t = await svc.create(ctx, { name: "Editável" });
  await svc.update(ctx, t.id, { status: "published" });
  const renamed = await svc.update(ctx, t.id, { description: "nota nova" });
  assert.equal(renamed.status, "published");
  assert.equal(renamed.description, "nota nova");
});

test("isolamento: get/update de outro tenant → 404", async () => {
  const svc = service();
  const owner = actor();
  const t = await svc.create(owner, { name: "Do dono" });
  const intruder = actor();
  await assert.rejects(() => svc.get(intruder, t.id), (e: unknown) => e instanceof PriceTableError && e.statusCode === 404);
  await assert.rejects(() => svc.update(intruder, t.id, { description: "x" }), (e: unknown) => e instanceof PriceTableError && e.statusCode === 404);
});

test("list filtra por status e por is_active; search por nome/descrição", async () => {
  const svc = service();
  const ctx = actor();
  const a = await svc.create(ctx, { name: "Alpha preço" });
  await svc.create(ctx, { name: "Beta preço" });
  await svc.update(ctx, a.id, { status: "published" });
  const published = await svc.list(ctx, { status: "published" });
  assert.equal(published.items.length, 1);
  assert.equal(published.items[0]!.name, "Alpha preço");
  const search = await svc.list(ctx, { search: "beta" });
  assert.equal(search.items.length, 1);
  assert.equal(search.total, 1);
});

test("desativação lógica via is_active=false", async () => {
  const svc = service();
  const ctx = actor();
  const t = await svc.create(ctx, { name: "Inativar" });
  const off = await svc.update(ctx, t.id, { is_active: false });
  assert.equal(off.isActive, false);
  const actives = await svc.list(ctx, { is_active: true });
  assert.equal(actives.items.length, 0);
});
