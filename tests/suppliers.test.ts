import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import {
  createMemorySupplierService,
  resetSupplierRuntimeForTests,
} from "../src/modules/suppliers/supplier.service.js";
import { SupplierError, type SupplierActorContext } from "../src/modules/suppliers/supplier.types.js";

function actor(tenantId = randomUUID()): SupplierActorContext {
  return { tenantId, userId: randomUUID(), roles: ["manager"], permissions: ["suppliers:read", "suppliers:create", "suppliers:update"] };
}

function service() {
  resetSupplierRuntimeForTests();
  return createMemorySupplierService();
}

test("cria Fornecedor com defaults (status active, is_active true)", async () => {
  const svc = service();
  const ctx = actor();
  const supplier = await svc.create(ctx, { name: "Auto Peças Silva" });
  assert.equal(supplier.name, "Auto Peças Silva");
  assert.equal(supplier.status, "active");
  assert.equal(supplier.isActive, true);
  assert.equal(supplier.createdBy, ctx.userId);
  assert.equal(supplier.document, undefined);
});

test("cria Fornecedor completo e normaliza email para minúsculas", async () => {
  const svc = service();
  const supplier = await svc.create(actor(), {
    name: "Guinchos União",
    document: "12.345.678/0001-90",
    email: "Contato@Uniao.COM.br",
    phone: "+55 11 99999-0000",
    address: "Av. Principal, 100 — São Paulo/SP",
    category: "guincho",
    notes: "Atende 24h",
  });
  assert.equal(supplier.email, "contato@uniao.com.br");
  assert.equal(supplier.document, "12.345.678/0001-90");
  assert.equal(supplier.category, "guincho");
});

test("name vazio → 400 required_field", async () => {
  const svc = service();
  await assert.rejects(() => svc.create(actor(), {}), (e: unknown) => e instanceof SupplierError && e.statusCode === 400 && e.reason === "required_field");
});

test("limites de tamanho: document > 20, phone > 40, address > 300, category > 80, notes > 2000 → 400", async () => {
  const svc = service();
  const ctx = actor();
  await assert.rejects(() => svc.create(ctx, { name: "A", document: "1".repeat(21) }), (e: unknown) => e instanceof SupplierError && e.statusCode === 400);
  await assert.rejects(() => svc.create(ctx, { name: "B", phone: "9".repeat(41) }), (e: unknown) => e instanceof SupplierError && e.statusCode === 400);
  await assert.rejects(() => svc.create(ctx, { name: "C", address: "r".repeat(301) }), (e: unknown) => e instanceof SupplierError && e.statusCode === 400);
  await assert.rejects(() => svc.create(ctx, { name: "D", category: "c".repeat(81) }), (e: unknown) => e instanceof SupplierError && e.statusCode === 400);
  await assert.rejects(() => svc.create(ctx, { name: "E", notes: "n".repeat(2001) }), (e: unknown) => e instanceof SupplierError && e.statusCode === 400);
});

test("email inválido → 400 invalid_email", async () => {
  const svc = service();
  await assert.rejects(() => svc.create(actor(), { name: "X", email: "sem-arroba" }), (e: unknown) => e instanceof SupplierError && e.statusCode === 400 && e.reason === "invalid_email");
  await assert.rejects(() => svc.create(actor(), { name: "Y", email: "a@b" }), (e: unknown) => e instanceof SupplierError && e.statusCode === 400 && e.reason === "invalid_email");
});

test("nome duplicado no mesmo tenant → 409 duplicate_name", async () => {
  const svc = service();
  const ctx = actor();
  await svc.create(ctx, { name: "Igual Ltda" });
  await assert.rejects(() => svc.create(ctx, { name: "Igual Ltda" }), (e: unknown) => e instanceof SupplierError && e.statusCode === 409 && e.reason === "duplicate_name");
});

test("mesmo nome em OUTRO tenant → 201 (unicidade composta por tenant)", async () => {
  const svc = service();
  await svc.create(actor(), { name: "Compartilhado SA" });
  const other = await svc.create(actor(), { name: "Compartilhado SA" });
  assert.equal(other.name, "Compartilhado SA");
});

test("tenant_id forjado no body é IGNORADO; vale o do ator", async () => {
  const svc = service();
  const ctx = actor();
  const forged = randomUUID();
  const supplier = await svc.create(ctx, { name: "Forjado", tenant_id: forged, tenantId: forged });
  assert.equal(supplier.tenantId, ctx.tenantId);
});

test("isolamento: get/update de outro tenant → 404", async () => {
  const svc = service();
  const owner = actor();
  const supplier = await svc.create(owner, { name: "Do dono" });
  const intruder = actor();
  await assert.rejects(() => svc.get(intruder, supplier.id), (e: unknown) => e instanceof SupplierError && e.statusCode === 404);
  await assert.rejects(() => svc.update(intruder, supplier.id, { notes: "x" }), (e: unknown) => e instanceof SupplierError && e.statusCode === 404);
});

test("list NUNCA retorna fornecedor de outro tenant (3 tenants)", async () => {
  const svc = service();
  const [a, b, c] = [actor(), actor(), actor()];
  await svc.create(a, { name: "Fornecedor A" });
  await svc.create(b, { name: "Fornecedor B" });
  await svc.create(c, { name: "Fornecedor C" });
  const listed = await svc.list(a, {});
  assert.equal(listed.total, 1);
  assert.equal(listed.items[0]!.name, "Fornecedor A");
});

test("list filtra por is_active e busca por name/document/category", async () => {
  const svc = service();
  const ctx = actor();
  const inativo = await svc.create(ctx, { name: "Peças Alfa", document: "111.222.333-44", category: "pecas" });
  await svc.create(ctx, { name: "Serviços Beta", document: "99.888.777/0001-66", category: "servicos" });
  await svc.update(ctx, inativo.id, { is_active: false });
  const actives = await svc.list(ctx, { is_active: true });
  assert.equal(actives.items.length, 1);
  assert.equal(actives.items[0]!.name, "Serviços Beta");
  const byDocument = await svc.list(ctx, { search: "99.888" });
  assert.equal(byDocument.total, 1);
  const byCategory = await svc.list(ctx, { search: "pecas" });
  assert.equal(byCategory.items[0]!.name, "Peças Alfa");
});

test("list pagina com limit/offset e valida filtros", async () => {
  const svc = service();
  const ctx = actor();
  await svc.create(ctx, { name: "Um" });
  await svc.create(ctx, { name: "Dois" });
  await svc.create(ctx, { name: "Tres" });
  const page = await svc.list(ctx, { limit: "2", offset: "2" });
  assert.equal(page.items.length, 1);
  assert.equal(page.total, 3);
  await assert.rejects(() => svc.list(ctx, { limit: "101" }), (e: unknown) => e instanceof SupplierError && e.statusCode === 400);
});

test("update altera campos e registra updatedBy do ator", async () => {
  const svc = service();
  const ctx = actor();
  const supplier = await svc.create(ctx, { name: "Antigo" });
  const editor: SupplierActorContext = { ...ctx, userId: randomUUID() };
  const updated = await svc.update(editor, supplier.id, { name: "Novo", email: "novo@fornecedor.com", category: "logistica" });
  assert.equal(updated.name, "Novo");
  assert.equal(updated.email, "novo@fornecedor.com");
  assert.equal(updated.category, "logistica");
  assert.equal(updated.updatedBy, editor.userId);
  assert.equal(updated.createdBy, ctx.userId);
});

test("desativação lógica via is_active=false (sem delete físico)", async () => {
  const svc = service();
  const ctx = actor();
  const supplier = await svc.create(ctx, { name: "Inativar" });
  const off = await svc.update(ctx, supplier.id, { is_active: false });
  assert.equal(off.isActive, false);
  const stillThere = await svc.get(ctx, supplier.id);
  assert.equal(stillThere.isActive, false);
  const actives = await svc.list(ctx, { is_active: true });
  assert.equal(actives.items.length, 0);
});
