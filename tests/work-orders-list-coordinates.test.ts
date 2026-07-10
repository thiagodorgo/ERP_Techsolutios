import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { createMemoryWorkOrderService } from "../src/modules/work-orders/work-order.service.js";
import { toWorkOrderListDto } from "../src/modules/work-orders/work-order.dto.js";
import type { WorkOrderActorContext } from "../src/modules/work-orders/work-order.types.js";

// Ω1b — a lista de OS (GET /work-orders) precisa devolver as coordenadas para o Mapa Operacional
// posicionar o pin de chamado. Antes, `toWorkOrderListDto` as omitia (só o detalhe as expunha).

function actor(): WorkOrderActorContext {
  return {
    tenantId: randomUUID(),
    userId: randomUUID(),
    roles: ["tenant_admin"],
    permissions: ["work_orders:read", "work_orders:create"],
  };
}

test("Ω1b: toWorkOrderListDto expõe serviceLatitude/serviceLongitude quando a OS tem coordenada", async () => {
  const service = createMemoryWorkOrderService();
  const ctx = actor();

  await service.create(ctx, {
    title: "Atendimento com coordenada",
    priority: "high",
    serviceAddress: "Av. Paulista, 1000",
    serviceLatitude: -23.5613,
    serviceLongitude: -46.6558,
  });

  const result = await service.list(ctx, {});
  const dto = toWorkOrderListDto(result);
  const item = dto.items[0]!;

  assert.equal(item.serviceLatitude, -23.5613);
  assert.equal(item.serviceLongitude, -46.6558);
});

test("Ω1b: toWorkOrderListDto devolve coordenada null quando a OS não foi geocodificada", async () => {
  const service = createMemoryWorkOrderService();
  const ctx = actor();

  await service.create(ctx, {
    title: "Atendimento sem coordenada",
    priority: "medium",
    serviceAddress: "Rua sem GPS, 50",
  });

  const result = await service.list(ctx, {});
  const item = toWorkOrderListDto(result).items[0]!;

  assert.equal(item.serviceLatitude, null);
  assert.equal(item.serviceLongitude, null);
  // O endereço continua presente — é o que permite a OS aparecer no painel "Sem localização".
  assert.equal(item.serviceAddress, "Rua sem GPS, 50");
});
