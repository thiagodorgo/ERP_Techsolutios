import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { toPriceTableListDto } from "../src/modules/price-tables/price-table.dto.js";
import {
  PriceTableService,
  createMemoryPriceTableService,
  getMemoryPriceTableRepositoryForTests,
  resetPriceTableRuntimeForTests,
} from "../src/modules/price-tables/price-table.service.js";
import { PriceTableError, type PriceTableActorContext } from "../src/modules/price-tables/price-table.types.js";
import { createMemoryTariffService, resetTariffRuntimeForTests } from "../src/modules/tariffs/tariff.service.js";

function actor(tenantId = randomUUID()): PriceTableActorContext {
  return { tenantId, userId: randomUUID(), roles: ["manager"], permissions: ["price_tables:read", "price_tables:create", "price_tables:update"] };
}

function service() {
  resetPriceTableRuntimeForTests();
  return createMemoryPriceTableService();
}

// Tabela de Valores + Tarifas no mesmo runtime de memória (o agregado atravessa os dois módulos).
function servicesWithTariffs() {
  resetPriceTableRuntimeForTests();
  resetTariffRuntimeForTests();
  return { pt: createMemoryPriceTableService(), tariff: createMemoryTariffService() };
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

// ── Agregado dos ITENS na listagem ───────────────────────────────────────────────────────────────────────
// O defeito que estes testes existem para não deixar voltar: a listagem dizia a MOEDA e nunca um NÚMERO,
// porque o valor mora nas Tarifas e a tabela é só o contêiner. Se o agregado sumir, estes testes caem.

test("listagem agrega os itens da tabela: contagem + faixa (min/max) de valor", async () => {
  const { pt, tariff } = servicesWithTariffs();
  const ctx = actor();

  const comItens = await pt.create(ctx, { name: "Guincho 2026" });
  const vazia = await pt.create(ctx, { name: "Ainda sem tarifa" });

  for (const unitPrice of [250, 120, 3400]) {
    await tariff.create(ctx, {
      price_table_id: comItens.id,
      service_catalog_id: randomUUID(),
      unit_price: unitPrice,
      origin: "manual",
    });
  }

  const page = await pt.list(ctx, {});
  const row = page.items.find((item) => item.id === comItens.id);
  assert.ok(row, "a tabela com itens precisa estar na listagem");
  assert.equal(row.tariffSummary.itemCount, 3);
  assert.equal(row.tariffSummary.minUnitPrice, 120);
  assert.equal(row.tariffSummary.maxUnitPrice, 3400);

  // Tabela sem tarifa → vazio HONESTO: contagem 0 e faixa NULA. Nunca 0,00 (zero não é preço).
  const empty = page.items.find((item) => item.id === vazia.id);
  assert.ok(empty, "a tabela sem itens precisa estar na listagem");
  assert.equal(empty.tariffSummary.itemCount, 0);
  assert.equal(empty.tariffSummary.minUnitPrice, null);
  assert.equal(empty.tariffSummary.maxUnitPrice, null);
});

test("agregado ignora tarifa APAGADA (is_active=false) na contagem e na faixa", async () => {
  const { pt, tariff } = servicesWithTariffs();
  const ctx = actor();
  const table = await pt.create(ctx, { name: "Com apagada" });

  await tariff.create(ctx, { price_table_id: table.id, service_catalog_id: randomUUID(), unit_price: 200, origin: "manual" });
  const apagada = await tariff.create(ctx, {
    price_table_id: table.id,
    service_catalog_id: randomUUID(),
    unit_price: 99999,
    origin: "manual",
  });
  await tariff.update(ctx, apagada.id, { is_active: false });

  const page = await pt.list(ctx, {});
  const row = page.items.find((item) => item.id === table.id);
  assert.ok(row);
  assert.equal(row.tariffSummary.itemCount, 1, "tarifa apagada não conta");
  assert.equal(row.tariffSummary.minUnitPrice, 200);
  assert.equal(row.tariffSummary.maxUnitPrice, 200, "tarifa apagada não pode empurrar o teto da faixa");
});

test("agregado não vaza entre organizações (tarifa de outro tenant não conta)", async () => {
  const { pt, tariff } = servicesWithTariffs();
  const dono = actor();
  const table = await pt.create(dono, { name: "Da organização A" });
  await tariff.create(dono, { price_table_id: table.id, service_catalog_id: randomUUID(), unit_price: 500, origin: "manual" });

  const intruso = actor();
  const page = await pt.list(intruso, {});
  assert.equal(page.items.length, 0, "a listagem de outra organização não enxerga a tabela");

  const own = await pt.list(dono, {});
  assert.equal(own.items[0]?.tariffSummary.itemCount, 1);
});

test("agregação é UMA passada para a página inteira — nunca uma consulta por linha (N+1)", async () => {
  resetPriceTableRuntimeForTests();
  const repository = getMemoryPriceTableRepositoryForTests();
  const ctx = actor();
  for (const name of ["A", "B", "C"]) {
    await repository.create({ tenantId: ctx.tenantId, name, currency: "BRL", version: 1, status: "draft" });
  }

  let calls = 0;
  let receivedIds: readonly string[] = [];
  const svc = new PriceTableService(repository, async ({ priceTableIds }) => {
    calls += 1;
    receivedIds = priceTableIds;
    return new Map();
  });

  const page = await svc.list(ctx, {});
  assert.equal(page.items.length, 3);
  assert.equal(calls, 1, "uma agregação por página, não uma por tabela");
  assert.equal(receivedIds.length, 3, "a agregação recebe os ids da página inteira de uma vez");

  // Agregador que não conhece a tabela → vazio honesto (não fabrica contagem nem faixa).
  assert.equal(page.items[0]?.tariffSummary.itemCount, 0);
  assert.equal(page.items[0]?.tariffSummary.minUnitPrice, null);
});

test("DTO da listagem publica itemCount/minUnitPrice/maxUnitPrice (o número chega ao cliente)", async () => {
  const { pt, tariff } = servicesWithTariffs();
  const ctx = actor();
  const table = await pt.create(ctx, { name: "Publicada no DTO" });
  await tariff.create(ctx, { price_table_id: table.id, service_catalog_id: randomUUID(), unit_price: 120, origin: "manual" });
  await tariff.create(ctx, { price_table_id: table.id, service_catalog_id: randomUUID(), unit_price: 3400, origin: "manual" });

  const dto = toPriceTableListDto(await pt.list(ctx, {}));
  const row = dto.items[0];
  assert.ok(row);
  assert.equal(row.itemCount, 2);
  assert.equal(row.minUnitPrice, 120);
  assert.equal(row.maxUnitPrice, 3400);
  // §allowlist — o agregado não pode arrastar identificador interno nem a organização para a resposta.
  assert.equal(Object.hasOwn(row, "tenantId"), false);
  assert.equal(Object.hasOwn(row, "tenant_id"), false);
});

test("caminho Prisma agrega com UM groupBy sobre tariffs (guarda estrutural anti-N+1)", () => {
  // O modo memória não prova SQL. Esta guarda lê o repositório Prisma e exige a forma agregada:
  // um `groupBy` filtrado por `is_active` e por `price_table_id IN (ids da página)`. Trocar isto por
  // uma consulta por linha (o N+1 que o comando proibiu) derruba o teste.
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/modules/price-tables/price-table-prisma.repository.ts"),
    "utf8",
  );
  assert.match(source, /aggregateTariffSummaries/, "o repositório Prisma precisa expor a agregação");
  assert.match(source, /this\.client\.tariff\.groupBy\(/, "a agregação precisa ser um groupBy sobre tariffs");
  assert.match(source, /by:\s*\["price_table_id"\]/, "agrupado por price_table_id");
  assert.match(source, /is_active:\s*true/, "tarifa apagada (is_active=false) não entra no agregado");
  assert.match(source, /price_table_id:\s*\{\s*in:/, "um IN com os ids da página — não uma consulta por linha");
});
