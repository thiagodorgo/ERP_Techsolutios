import assert from "node:assert/strict";
import test from "node:test";

import {
  computeMovingAverage,
  roundToDecimalPrecision,
  signQuantity,
  sumSignedQuantities,
  wouldOverdraw,
} from "../src/modules/inventory/inventory.calculations.js";
import { toInventoryItemDto, toStockMovementDto } from "../src/modules/inventory/inventory.dto.js";
import {
  InventoryError,
  type InventoryItemWithSaldo,
  type StockMovement,
} from "../src/modules/inventory/inventory.types.js";
import {
  parseMovementType,
  parseOptionalUnitCost,
  parseQuantidade,
} from "../src/modules/inventory/inventory.validators.js";

test("[R7.3] computeMovingAverage: saldo zero ou negativo -> novo avg = unit_cost (guard div-by-zero)", () => {
  assert.equal(computeMovingAverage(0, 0, 10, 12.5), 12.5);
  assert.equal(computeMovingAverage(0, 99, 4, 7), 7);
  assert.equal(computeMovingAverage(-3, 15, 10, 20), 20);
});

test("[R7.3] computeMovingAverage: media ponderada exata com arredondamento a 6 casas", () => {
  // (10×10 + 10×20) / (10 + 10) = 15
  assert.equal(computeMovingAverage(10, 10, 10, 20), 15);
  // (3×10 + 1×11) / 4 = 10.25
  assert.equal(computeMovingAverage(3, 10, 1, 11), 10.25);
  // (1×1 + 2×2) / 3 = 1.666666… → 6 casas (precisão DECIMAL(20,6))
  assert.equal(computeMovingAverage(1, 1, 2, 2), 1.666667);
  assert.equal(roundToDecimalPrecision(0.1 + 0.2), 0.3);
});

test("quantidade_sinalizada: entrada +, saida/consumo -, ajuste mantem o sinal", () => {
  assert.equal(signQuantity("entrada", 5), 5);
  assert.equal(signQuantity("saida", 5), -5);
  assert.equal(signQuantity("consumo", 2.5), -2.5);
  assert.equal(signQuantity("ajuste", 3), 3);
  assert.equal(signQuantity("ajuste", -3), -3);
});

test("[R7.1] saldo derivado (soma dos sinalizados) e guarda de estouro com tolerancia de float", () => {
  assert.equal(sumSignedQuantities([10, -4, -6]), 0);
  assert.equal(sumSignedQuantities([0.1, 0.2, -0.3]), 0);
  assert.equal(wouldOverdraw(0.3, -0.3), false);
  assert.equal(wouldOverdraw(0.3, -0.4), true);
  assert.equal(wouldOverdraw(10, 5), false);
  assert.equal(wouldOverdraw(0, -1), true);
});

test("parseQuantidade: entrada/saida/consumo exigem > 0; ajuste aceita sinal mas nunca zero", () => {
  assert.equal(parseQuantidade(5, "entrada"), 5);
  assert.equal(parseQuantidade("2.5", "saida"), 2.5);
  assert.equal(parseQuantidade(-4, "ajuste"), -4);

  for (const [value, type] of [
    [0, "entrada"],
    [-1, "saida"],
    [-2, "consumo"],
    [0, "ajuste"],
    [undefined, "entrada"],
    ["nan", "consumo"],
  ] as const) {
    assert.throws(
      () => parseQuantidade(value, type),
      (error: unknown) => {
        assert.ok(error instanceof InventoryError);
        assert.equal(error.statusCode, 400);
        assert.equal(error.code, "STOCK_INVALID");
        return true;
      },
    );
  }
});

test("parseMovementType rejeita tipo desconhecido; parseOptionalUnitCost rejeita negativo", () => {
  assert.equal(parseMovementType("ENTRADA"), "entrada");
  assert.equal(parseMovementType("ajuste"), "ajuste");
  assert.throws(() => parseMovementType("transferencia"), (error: unknown) => {
    assert.ok(error instanceof InventoryError);
    assert.equal(error.statusCode, 400);
    assert.equal(error.reason, "invalid_type");
    return true;
  });

  assert.equal(parseOptionalUnitCost(undefined), undefined);
  assert.equal(parseOptionalUnitCost("12.5"), 12.5);
  assert.throws(() => parseOptionalUnitCost(-1), (error: unknown) => {
    assert.ok(error instanceof InventoryError);
    assert.equal(error.reason, "invalid_unitCost");
    return true;
  });
});

test("DTOs nunca expõem tenant_id; belowMin é derivado (saldo < minQuantity)", () => {
  const item: InventoryItemWithSaldo = {
    id: "item-1",
    tenantId: "tenant-secret",
    sku: "FLT-001",
    name: "Filtro de óleo",
    unit: "un",
    minQuantity: 10,
    maxQuantity: undefined,
    abcClass: undefined,
    avgCost: 12.5,
    leadTimeDays: undefined,
    safetyStock: undefined,
    saldo: 4,
    isActive: true,
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    updatedAt: new Date("2026-07-01T00:00:00.000Z"),
  };
  const dto = toInventoryItemDto(item) as Record<string, unknown>;

  assert.equal(dto.tenantId, undefined);
  assert.equal(dto.tenant_id, undefined);
  assert.equal(dto.saldo, 4);
  assert.equal(dto.belowMin, true);
  assert.equal(dto.maxQuantity, null);
  assert.equal(dto.abcClass, null);
  assert.equal(JSON.stringify(dto).includes("tenant-secret"), false);

  const notBelow = toInventoryItemDto({ ...item, saldo: 10 }) as Record<string, unknown>;
  assert.equal(notBelow.belowMin, false);

  const movement: StockMovement = {
    id: "mov-1",
    tenantId: "tenant-secret",
    itemId: "item-1",
    type: "saida",
    quantidadeSinalizada: -3,
    unitCost: undefined,
    workOrderId: undefined,
    vehicleId: undefined,
    reason: undefined,
    cycleCountId: undefined,
    createdBy: "usr-1",
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
  };
  const movementDto = toStockMovementDto(movement) as Record<string, unknown>;

  assert.equal(movementDto.tenantId, undefined);
  assert.equal(movementDto.tenant_id, undefined);
  assert.equal(movementDto.quantidadeSinalizada, -3);
  assert.equal(movementDto.unitCost, null);
  assert.equal(JSON.stringify(movementDto).includes("tenant-secret"), false);
});
