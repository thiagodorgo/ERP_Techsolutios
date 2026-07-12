import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import {
  createMemoryBranchService,
  resetBranchRuntimeForTests,
} from "../src/modules/branches/branch.service.js";
import { BranchError, type BranchActorContext } from "../src/modules/branches/branch.types.js";

function actor(tenantId = randomUUID()): BranchActorContext {
  return { tenantId, userId: randomUUID(), roles: ["manager"], permissions: ["branches:read", "branches:create", "branches:update"] };
}

function service() {
  resetBranchRuntimeForTests();
  return createMemoryBranchService();
}

test("cria Filial com defaults (status active)", async () => {
  const svc = service();
  const branch = await svc.create(actor(), { name: "Filial Centro", code: "FC-01" });
  assert.equal(branch.name, "Filial Centro");
  assert.equal(branch.code, "FC-01");
  assert.equal(branch.status, "active");
  assert.ok(branch.createdAt instanceof Date);
});

test("name vazio → 400; code vazio → 400", async () => {
  const svc = service();
  await assert.rejects(() => svc.create(actor(), { code: "X" }), (e: unknown) => e instanceof BranchError && e.statusCode === 400 && e.reason === "required_field");
  await assert.rejects(() => svc.create(actor(), { name: "X" }), (e: unknown) => e instanceof BranchError && e.statusCode === 400 && e.reason === "required_field");
});

test("name > 160 e code > 40 → 400 field_too_long", async () => {
  const svc = service();
  await assert.rejects(() => svc.create(actor(), { name: "a".repeat(161), code: "OK" }), (e: unknown) => e instanceof BranchError && e.statusCode === 400 && e.reason === "field_too_long");
  await assert.rejects(() => svc.create(actor(), { name: "OK", code: "c".repeat(41) }), (e: unknown) => e instanceof BranchError && e.statusCode === 400 && e.reason === "field_too_long");
});

test("code duplicado no mesmo tenant → 409 duplicate_code", async () => {
  const svc = service();
  const ctx = actor();
  await svc.create(ctx, { name: "Uma", code: "REP" });
  await assert.rejects(() => svc.create(ctx, { name: "Outra", code: "REP" }), (e: unknown) => e instanceof BranchError && e.statusCode === 409 && e.reason === "duplicate_code");
});

test("mesmo code em OUTRO tenant → 201 (unicidade composta por tenant)", async () => {
  const svc = service();
  await svc.create(actor(), { name: "A", code: "MESMO" });
  const other = await svc.create(actor(), { name: "B", code: "MESMO" });
  assert.equal(other.code, "MESMO");
});

test("tenant_id forjado no body é IGNORADO; vale o do ator", async () => {
  const svc = service();
  const ctx = actor();
  const forged = randomUUID();
  const branch = await svc.create(ctx, { name: "Forjada", code: "FRJ", tenant_id: forged, tenantId: forged });
  assert.equal(branch.tenantId, ctx.tenantId);
});

test("isolamento: get de outro tenant → 404", async () => {
  const svc = service();
  const owner = actor();
  const branch = await svc.create(owner, { name: "Do dono", code: "DONO" });
  await assert.rejects(() => svc.get(actor(), branch.id), (e: unknown) => e instanceof BranchError && e.statusCode === 404);
});

test("isolamento: update de outro tenant → 404", async () => {
  const svc = service();
  const owner = actor();
  const branch = await svc.create(owner, { name: "Do dono", code: "DONO" });
  await assert.rejects(() => svc.update(actor(), branch.id, { name: "invasor" }), (e: unknown) => e instanceof BranchError && e.statusCode === 404);
});

test("list NUNCA retorna filial de outro tenant (3 tenants)", async () => {
  const svc = service();
  const [a, b, c] = [actor(), actor(), actor()];
  await svc.create(a, { name: "Filial A", code: "A1" });
  await svc.create(b, { name: "Filial B", code: "B1" });
  await svc.create(c, { name: "Filial C", code: "C1" });
  const listed = await svc.list(a, {});
  assert.equal(listed.total, 1);
  assert.equal(listed.items[0]!.name, "Filial A");
});

test("list filtra por status e busca por name/code", async () => {
  const svc = service();
  const ctx = actor();
  const inativa = await svc.create(ctx, { name: "Filial Norte", code: "NOR" });
  await svc.create(ctx, { name: "Filial Sul", code: "SUL" });
  await svc.update(ctx, inativa.id, { status: "inactive" });
  const actives = await svc.list(ctx, { status: "active" });
  assert.equal(actives.items.length, 1);
  assert.equal(actives.items[0]!.name, "Filial Sul");
  const byName = await svc.list(ctx, { search: "norte" });
  assert.equal(byName.total, 1);
  const byCode = await svc.list(ctx, { search: "sul" });
  assert.equal(byCode.items[0]!.code, "SUL");
});

test("list pagina com limit/offset e valida filtros", async () => {
  const svc = service();
  const ctx = actor();
  await svc.create(ctx, { name: "Um", code: "P1" });
  await svc.create(ctx, { name: "Dois", code: "P2" });
  await svc.create(ctx, { name: "Tres", code: "P3" });
  const page = await svc.list(ctx, { limit: "2", offset: "1" });
  assert.equal(page.items.length, 2);
  assert.equal(page.total, 3);
  await assert.rejects(() => svc.list(ctx, { limit: "0" }), (e: unknown) => e instanceof BranchError && e.statusCode === 400);
});

test("update altera name/code e conserva o resto", async () => {
  const svc = service();
  const ctx = actor();
  const branch = await svc.create(ctx, { name: "Antiga", code: "ANT" });
  const updated = await svc.update(ctx, branch.id, { name: "Nova", code: "NOV" });
  assert.equal(updated.name, "Nova");
  assert.equal(updated.code, "NOV");
  assert.equal(updated.status, "active");
  assert.equal(updated.id, branch.id);
});

test("soft-delete via status inactive (o model não tem is_active)", async () => {
  const svc = service();
  const ctx = actor();
  const branch = await svc.create(ctx, { name: "Encerrar", code: "END" });
  const off = await svc.update(ctx, branch.id, { status: "inactive" });
  assert.equal(off.status, "inactive");
  const stillThere = await svc.get(ctx, branch.id);
  assert.equal(stillThere.status, "inactive");
  const actives = await svc.list(ctx, { status: "active" });
  assert.equal(actives.total, 0);
});
