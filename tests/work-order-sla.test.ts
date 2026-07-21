import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

// M-7 (J-MAPAS-8 · SLA real do mapa) — prazo de SLA da OS (sla_due_at). Coluna ADITIVA/nullable; o valor
// alimenta a fila/heatmap do Mapa Operacional (a lista DTO carrega slaDueAt para colorir/ordenar
// client-side). Invariantes cobertos aqui (CORE_SAAS_PERSISTENCE=memory):
//  · create/update persistem slaDueAt e ele RETORNA no DTO de lista E no DTO de detalhe (ISO);
//  · toWorkOrderListDto inclui slaDueAt (o mapa recebe o prazo);
//  · isolamento: manager-B não seta nem lê o slaDueAt de uma OS do tenant-A (404 cross-tenant);
//  · slaDueAt malformado → 400 invalid_date (reuso de parseOptionalDate, espelho de scheduledFor);
//  · OS sem prazo → DTO slaDueAt: null (null-safe), tanto no detalhe quanto na lista.
// Sem regra de futuro/campo-cruzado: uma OS PODE ser lançada já vencida (prazo livre como scheduledFor).

process.env.CORE_SAAS_PERSISTENCE = "memory";

import {
  createMemoryWorkOrderService,
  resetWorkOrderRuntimeForTests,
} from "../src/modules/work-orders/work-order.service.js";
import { toWorkOrderDto, toWorkOrderListDto } from "../src/modules/work-orders/work-order.dto.js";
import { WorkOrderError, type WorkOrderActorContext } from "../src/modules/work-orders/work-order.types.js";

function actor(tenantId = randomUUID()): WorkOrderActorContext {
  return {
    tenantId,
    userId: randomUUID(),
    roles: ["manager"],
    permissions: ["work_orders:read", "work_orders:create", "work_orders:update"],
  };
}

function setup() {
  resetWorkOrderRuntimeForTests();
  return { workOrders: createMemoryWorkOrderService() };
}

const SLA_ISO = "2026-08-20T18:00:00.000Z";

// ---------- (a) create/update persistem e RETORNAM slaDueAt no detalhe + lista ----------

test("create com slaDueAt persiste e o DETALHE + LISTA retornam o prazo (ISO)", async () => {
  const { workOrders } = setup();
  const ctx = actor();

  const wo = await workOrders.create(ctx, { title: "OS com SLA", slaDueAt: SLA_ISO });
  assert.ok(wo.slaDueAt instanceof Date);
  assert.equal((wo.slaDueAt as Date).toISOString(), SLA_ISO);

  // Detalhe.
  const detail = toWorkOrderDto(await workOrders.get(ctx, wo.id));
  assert.equal(detail.slaDueAt, SLA_ISO);

  // Lista (a CHAVE que alimenta o mapa).
  const listDto = toWorkOrderListDto(await workOrders.list(ctx, {}));
  const item = listDto.items.find((entry) => entry.id === wo.id);
  assert.ok(item, "a OS aparece na lista do próprio tenant");
  assert.equal(item.slaDueAt, SLA_ISO);
});

test("update seta o slaDueAt de uma OS que nasceu sem prazo (espelho de scheduledFor)", async () => {
  const { workOrders } = setup();
  const ctx = actor();

  const wo = await workOrders.create(ctx, { title: "OS sem prazo no início" });
  assert.equal(wo.slaDueAt, undefined);

  const updated = await workOrders.update(ctx, wo.id, { slaDueAt: SLA_ISO });
  assert.ok(updated.slaDueAt instanceof Date);
  assert.equal((updated.slaDueAt as Date).toISOString(), SLA_ISO);

  const detail = toWorkOrderDto(await workOrders.get(ctx, wo.id));
  assert.equal(detail.slaDueAt, SLA_ISO);
});

test("OS lançada JÁ VENCIDA é aceita (sem regra de futuro): prazo no passado persiste", async () => {
  const { workOrders } = setup();
  const ctx = actor();
  const passado = "2020-01-01T00:00:00.000Z";

  const wo = await workOrders.create(ctx, { title: "OS já vencida", slaDueAt: passado });
  assert.equal((wo.slaDueAt as Date).toISOString(), passado);
});

// ---------- (b) toWorkOrderListDto inclui a chave slaDueAt ----------

test("toWorkOrderListDto sempre inclui a chave slaDueAt (o mapa recebe o prazo ou null)", async () => {
  const { workOrders } = setup();
  const ctx = actor();

  await workOrders.create(ctx, { title: "OS A", slaDueAt: SLA_ISO });
  await workOrders.create(ctx, { title: "OS B (sem prazo)" });

  const listDto = toWorkOrderListDto(await workOrders.list(ctx, {}));
  assert.equal(listDto.items.length, 2);
  for (const item of listDto.items) {
    assert.ok("slaDueAt" in item, "a chave slaDueAt está SEMPRE presente no item da lista");
  }
});

// ---------- (c) isolamento cross-tenant: 404, sem vazar nem escrever o slaDueAt ----------

test("[isolamento] manager-B não seta nem lê o slaDueAt de uma OS do tenant-A (404)", async () => {
  const { workOrders } = setup();
  const ctxA = actor();
  const ctxB = actor();

  const wo = await workOrders.create(ctxA, { title: "OS do tenant A", slaDueAt: SLA_ISO });

  // B não lê (get cross-tenant → 404).
  await assert.rejects(
    () => workOrders.get(ctxB, wo.id),
    (error: WorkOrderError) => {
      assert.equal(error.statusCode, 404);
      assert.equal(error.reason, "not_found");
      return true;
    },
  );

  // B não escreve (update cross-tenant → 404).
  await assert.rejects(
    () => workOrders.update(ctxB, wo.id, { slaDueAt: "2030-01-01T00:00:00.000Z" }),
    (error: WorkOrderError) => {
      assert.equal(error.statusCode, 404);
      assert.equal(error.reason, "not_found");
      return true;
    },
  );

  // O prazo original de A permanece intacto.
  const detailA = toWorkOrderDto(await workOrders.get(ctxA, wo.id));
  assert.equal(detailA.slaDueAt, SLA_ISO);

  // A lista de B NÃO enxerga a OS de A.
  const listB = toWorkOrderListDto(await workOrders.list(ctxB, {}));
  assert.equal(listB.items.length, 0);
});

// ---------- (d) 400 invalid_date para slaDueAt malformado ----------

test("400 invalid_date para slaDueAt malformado (create e update)", async () => {
  const { workOrders } = setup();
  const ctx = actor();

  await assert.rejects(
    () => workOrders.create(ctx, { title: "OS SLA ruim", slaDueAt: "não-é-data" }),
    (error: WorkOrderError) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.reason, "invalid_date");
      return true;
    },
  );

  const wo = await workOrders.create(ctx, { title: "OS válida" });
  await assert.rejects(
    () => workOrders.update(ctx, wo.id, { slaDueAt: "31/12/2026" }),
    (error: WorkOrderError) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.reason, "invalid_date");
      return true;
    },
  );
});

// ---------- (e) OS sem prazo → DTO slaDueAt: null (null-safe) ----------

test("OS sem prazo → slaDueAt null no DETALHE e na LISTA (null-safe)", async () => {
  const { workOrders } = setup();
  const ctx = actor();

  const wo = await workOrders.create(ctx, { title: "OS sem SLA" });

  const detail = toWorkOrderDto(await workOrders.get(ctx, wo.id));
  assert.equal(detail.slaDueAt, null);

  const listDto = toWorkOrderListDto(await workOrders.list(ctx, {}));
  const item = listDto.items.find((entry) => entry.id === wo.id);
  assert.ok(item);
  assert.equal(item.slaDueAt, null);
});
