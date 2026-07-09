import assert from "node:assert/strict";
import test from "node:test";

import type { InventoryItem, StockMovement } from "../src/modules/inventory/inventory.types";

function makeItem(partial: Partial<InventoryItem> & Pick<InventoryItem, "id" | "sku" | "name">): InventoryItem {
  return {
    unit: "un",
    minQuantity: 0,
    maxQuantity: null,
    abcClass: null,
    avgCost: 0,
    leadTimeDays: null,
    safetyStock: null,
    saldo: 0,
    belowMin: false,
    isActive: true,
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-01T10:00:00.000Z",
    ...partial,
  };
}

function makeMovement(partial: Partial<StockMovement> & Pick<StockMovement, "id" | "itemId" | "type">): StockMovement {
  return {
    quantidadeSinalizada: 1,
    unitCost: null,
    workOrderId: null,
    vehicleId: null,
    reason: null,
    createdAt: "2026-06-01T10:00:00.000Z",
    createdBy: null,
    ...partial,
  };
}

test("inventory adapter: item normaliza envelope/snake_case com saldo e belowMin do servidor", async () => {
  const { adaptInventoryItemsResponse } = await import("../src/modules/inventory/inventory.adapter");

  const data = adaptInventoryItemsResponse({
    data: {
      items: [
        {
          id: "item-1",
          sku: "ELE-0021",
          name: "Cabo de rede Cat6",
          unit: "m",
          min_quantity: 50,
          max_quantity: 200,
          abc_class: "A",
          avg_cost: 4.25,
          lead_time_days: 7,
          safety_stock: 20,
          saldo: 12.5,
          below_min: true,
          is_active: true,
          created_at: "2026-06-20T08:30:00.000Z",
        },
        { id: "", sku: "X-1", name: "sem id" }, // descartada
        { id: "item-3", name: "sem sku" }, // descartada
      ],
      pagination: { limit: 20, offset: 0, total: 1 },
    },
  });

  assert.equal(data.items.length, 1); // linhas sem id/sku/nome são descartadas
  assert.equal(data.source, "api");
  const item = data.items[0];
  assert.equal(item.sku, "ELE-0021");
  assert.equal(item.unit, "m");
  assert.equal(item.minQuantity, 50);
  assert.equal(item.maxQuantity, 200);
  assert.equal(item.abcClass, "A");
  assert.equal(item.avgCost, 4.25);
  assert.equal(item.leadTimeDays, 7);
  assert.equal(item.safetyStock, 20);
  // saldo e belowMin vêm COMPUTADOS do servidor (R7.1) — o adapter só os preserva.
  assert.equal(item.saldo, 12.5);
  assert.equal(item.belowMin, true);
  assert.equal(data.pagination.total, 1);

  // Sem a flag do servidor, deriva belowMin do saldo × mínimo (resiliência).
  const derived = adaptInventoryItemsResponse({
    data: { items: [{ id: "i", sku: "S", name: "N", min_quantity: 10, saldo: 4 }], pagination: { limit: 20, offset: 0, total: 1 } },
  });
  assert.equal(derived.items[0].belowMin, true);
});

test("inventory adapter: movimento normaliza quantidade SINALIZADA + vínculos (OS/viatura)", async () => {
  const { adaptStockMovementsResponse } = await import("../src/modules/inventory/inventory.adapter");

  const data = adaptStockMovementsResponse({
    data: {
      items: [
        {
          id: "mov-1",
          item_id: "item-1",
          type: "consumo",
          quantidade_sinalizada: -3.5,
          unit_cost: 12.5,
          work_order_id: "wo-9",
          vehicle_id: "veh-2",
          reason: null,
          created_at: "2026-07-01T14:00:00.000Z",
          created_by: "user-1",
        },
        { id: "mov-2", item_id: "item-1", type: "entrada", quantidade_sinalizada: 50, unit_cost: 4.1 },
        { id: "mov-x", item_id: "item-1", type: "reserva" }, // tipo desconhecido → descartada
        { id: "mov-y", type: "saida" }, // sem item → descartada
      ],
      pagination: { limit: 20, offset: 0, total: 2 },
    },
  });

  assert.equal(data.items.length, 2);
  const consumo = data.items[0];
  assert.equal(consumo.type, "consumo");
  assert.equal(consumo.quantidadeSinalizada, -3.5); // débito preserva o sinal
  assert.equal(consumo.unitCost, 12.5);
  assert.equal(consumo.workOrderId, "wo-9");
  assert.equal(consumo.vehicleId, "veh-2");
  assert.equal(consumo.createdBy, "user-1");
  assert.equal(data.items[1].quantidadeSinalizada, 50); // crédito positivo
});

test("inventory adapter: rótulos/tons PT-BR dos tipos de movimento (Entrada/Saída/Consumo/Ajuste)", async () => {
  const { getMovementTypeLabel, getMovementTypeTone, STOCK_MOVEMENT_TYPE_OPTIONS, isStockMovementType } = await import(
    "../src/modules/inventory/inventory.adapter"
  );

  assert.equal(getMovementTypeLabel("entrada"), "Entrada");
  assert.equal(getMovementTypeLabel("saida"), "Saída");
  assert.equal(getMovementTypeLabel("consumo"), "Consumo");
  assert.equal(getMovementTypeLabel("ajuste"), "Ajuste");

  assert.equal(getMovementTypeTone("entrada"), "success");
  assert.equal(getMovementTypeTone("saida"), "danger");
  assert.equal(getMovementTypeTone("consumo"), "warning");
  assert.equal(getMovementTypeTone("ajuste"), "default");

  assert.equal(STOCK_MOVEMENT_TYPE_OPTIONS.length, 4);
  assert.equal(isStockMovementType("entrada"), true);
  assert.equal(isStockMovementType("reserva"), false);
});

test("inventory adapter: chip de reposição REAL a partir do belowMin do servidor", async () => {
  const { getReplenishmentLabel, getReplenishmentTone } = await import("../src/modules/inventory/inventory.adapter");

  assert.equal(getReplenishmentLabel(true), "Abaixo do mínimo");
  assert.equal(getReplenishmentTone(true), "warning");
  assert.equal(getReplenishmentLabel(false), "OK");
  assert.equal(getReplenishmentTone(false), "success");
});

test("inventory adapter: BRL, '—' para nulos, ABC nula e quantidade SEMPRE com sinal textual", async () => {
  const { formatValor, formatQuantity, formatSignedQuantity, getAbcClassLabel, parsePtBrNumber } = await import(
    "../src/modules/inventory/inventory.adapter"
  );

  assert.match(formatValor(12.5), /R\$/);
  assert.equal(formatValor(null), "—");
  assert.equal(formatValor(undefined), "—");

  // Classe ABC só chega no F7b — null renderiza "—".
  assert.equal(getAbcClassLabel(null), "—");
  assert.equal(getAbcClassLabel("B"), "B");

  assert.equal(formatQuantity(null), "—");
  assert.match(formatQuantity(1250.5, "un"), /1\.250,5 un/);

  // Sinal textual obrigatório: + credita, − debita.
  assert.match(formatSignedQuantity(50, "un"), /^\+50 un$/);
  assert.match(formatSignedQuantity(-12), /^[-−]12$/);
  assert.equal(formatSignedQuantity(null), "—");

  assert.equal(parsePtBrNumber("1.200,50"), 1200.5);
  assert.equal(parsePtBrNumber(""), undefined);
});

test("inventory adapter: D-007 — lista vazia/fonte fallback preservadas, sem fabricar linhas", async () => {
  const { adaptInventoryItemsResponse, adaptStockMovementsResponse } = await import("../src/modules/inventory/inventory.adapter");

  const items = adaptInventoryItemsResponse({ data: { items: [], pagination: { limit: 20, offset: 0, total: 0 } } }, "fallback", "sem dados");
  assert.equal(items.items.length, 0);
  assert.equal(items.source, "fallback");
  assert.equal(items.fallbackReason, "sem dados");

  // Resposta malformada degrada para vazio sem lançar.
  const bareItems = adaptInventoryItemsResponse(null);
  assert.equal(bareItems.items.length, 0);
  assert.equal(bareItems.pagination.total, 0);

  const bareMovements = adaptStockMovementsResponse(undefined, "mock");
  assert.equal(bareMovements.items.length, 0);
  assert.equal(bareMovements.source, "mock");
});

test("inventory adapter: 409 insufficient_balance → saldo atual sob a Quantidade; 409 duplicate_sku → sob o SKU", async () => {
  const { interpretStockMovementSubmitError, interpretInventoryItemSubmitError } = await import("../src/modules/inventory/inventory.adapter");

  // 409 com motivo explícito + saldo conhecido → mensagem sob a Quantidade com o saldo atual.
  const insufficient = interpretStockMovementSubmitError(
    { status: 409, error: { reason: "insufficient_balance" } },
    { currentSaldo: 12.5, unit: "un" },
  );
  assert.equal(insufficient.reason, "insufficient_balance");
  assert.equal(insufficient.field, "quantidade");
  assert.match(insufficient.message, /Saldo atual: 12,5 un/);

  // 409 sem motivo explícito (ApiError não expõe o corpo) → infere insufficient_balance no contexto de movimento.
  const inferred = interpretStockMovementSubmitError({ status: 409 }, {});
  assert.equal(inferred.reason, "insufficient_balance");
  assert.equal(inferred.field, "quantidade");
  assert.doesNotMatch(inferred.message, /Saldo atual/); // sem saldo conhecido, não inventa número

  // 409 no formulário de ITEM → duplicate_sku sob o campo SKU.
  const duplicate = interpretInventoryItemSubmitError({ status: 409 });
  assert.equal(duplicate.reason, "duplicate_sku");
  assert.equal(duplicate.field, "sku");
  assert.match(duplicate.message, /SKU/);

  // Erro genérico preserva a mensagem.
  assert.equal(interpretStockMovementSubmitError(new Error("Falha de rede")).message, "Falha de rede");
});

test("inventory adapter: 400 condicionais por tipo (consumo→OS, entrada→custo, ajuste→motivo, referências)", async () => {
  const { interpretStockMovementSubmitError } = await import("../src/modules/inventory/inventory.adapter");

  const consumo = interpretStockMovementSubmitError({ status: 400, error: { reason: "consumo_requires_work_order" } });
  assert.equal(consumo.field, "workOrderId");

  const entrada = interpretStockMovementSubmitError({ status: 400, reason: "entrada_requires_unit_cost" });
  assert.equal(entrada.field, "unitCost");

  const ajuste = interpretStockMovementSubmitError({ status: 400, error: { reason: "ajuste_requires_reason" } });
  assert.equal(ajuste.field, "reason");

  const invalidWo = interpretStockMovementSubmitError({ status: 400, error: { reason: "invalid_work_order_reference" } });
  assert.equal(invalidWo.field, "workOrderId");

  const invalidVehicle = interpretStockMovementSubmitError({ status: 400, error: { reason: "invalid_vehicle_reference" } });
  assert.equal(invalidVehicle.field, "vehicleId");
});

test("inventory adapter: validação condicional do movimento + sinal derivado do tipo no payload", async () => {
  const { validateStockMovement, buildStockMovementPayload } = await import("../src/modules/inventory/inventory.adapter");

  // Campos obrigatórios básicos.
  const missing = validateStockMovement({ type: "", itemId: "" });
  const missingFields = missing.map((error) => error.field);
  assert.ok(missingFields.includes("type"));
  assert.ok(missingFields.includes("itemId"));
  assert.ok(missingFields.includes("quantidade"));

  // Quantidade sempre positiva no formulário (o sinal vem do tipo).
  assert.ok(validateStockMovement({ type: "saida", itemId: "i", quantidade: -5 }).some((e) => e.field === "quantidade"));

  // Entrada exige custo unitário; consumo exige OS; ajuste exige motivo + direção.
  assert.ok(validateStockMovement({ type: "entrada", itemId: "i", quantidade: 5 }).some((e) => e.field === "unitCost"));
  assert.ok(validateStockMovement({ type: "consumo", itemId: "i", quantidade: 5 }).some((e) => e.field === "workOrderId"));
  const ajusteErrors = validateStockMovement({ type: "ajuste", itemId: "i", quantidade: 5 });
  assert.ok(ajusteErrors.some((e) => e.field === "reason"));
  assert.ok(ajusteErrors.some((e) => e.field === "ajusteDirection"));

  // Rascunhos completos e válidos por tipo.
  assert.equal(validateStockMovement({ type: "entrada", itemId: "i", quantidade: 5, unitCost: 4.1 }).length, 0);
  assert.equal(validateStockMovement({ type: "consumo", itemId: "i", quantidade: 5, workOrderId: "wo-1" }).length, 0);
  assert.equal(validateStockMovement({ type: "ajuste", itemId: "i", quantidade: 5, ajusteDirection: "saida", reason: "inventário" }).length, 0);

  // Sinal derivado: entrada +, saída/consumo −, ajuste segue a direção explícita.
  assert.equal(buildStockMovementPayload({ type: "entrada", itemId: "i", quantidade: 5, unitCost: 4.1 }).quantidadeSinalizada, 5);
  assert.equal(buildStockMovementPayload({ type: "saida", itemId: "i", quantidade: 5 }).quantidadeSinalizada, -5);
  assert.equal(buildStockMovementPayload({ type: "consumo", itemId: "i", quantidade: 2, workOrderId: "wo-1" }).quantidadeSinalizada, -2);
  assert.equal(
    buildStockMovementPayload({ type: "ajuste", itemId: "i", quantidade: 3, ajusteDirection: "entrada", reason: "sobra" }).quantidadeSinalizada,
    3,
  );
  assert.equal(
    buildStockMovementPayload({ type: "ajuste", itemId: "i", quantidade: 3, ajusteDirection: "saida", reason: "perda" }).quantidadeSinalizada,
    -3,
  );
});

test("inventory adapter: validação do item (SKU/nome/unidade obrigatórios; máx ≥ mín; números ≥ 0)", async () => {
  const { validateInventoryItem } = await import("../src/modules/inventory/inventory.adapter");

  const missing = validateInventoryItem({ sku: "", name: "", unit: "" });
  const fields = missing.map((error) => error.field);
  assert.ok(fields.includes("sku"));
  assert.ok(fields.includes("name"));
  assert.ok(fields.includes("unit"));

  assert.ok(validateInventoryItem({ sku: "S", name: "N", unit: "un", minQuantity: -1 }).some((e) => e.field === "minQuantity"));
  assert.ok(validateInventoryItem({ sku: "S", name: "N", unit: "un", minQuantity: 10, maxQuantity: 5 }).some((e) => e.field === "maxQuantity"));
  assert.ok(validateInventoryItem({ sku: "S", name: "N", unit: "un", leadTimeDays: 2.5 }).some((e) => e.field === "leadTimeDays"));
  assert.ok(validateInventoryItem({ sku: "S", name: "N", unit: "un", safetyStock: -3 }).some((e) => e.field === "safetyStock"));

  assert.equal(validateInventoryItem({ sku: "ELE-1", name: "Cabo", unit: "m", minQuantity: 10, maxQuantity: 100, leadTimeDays: 7, safetyStock: 5 }).length, 0);
});

test("inventory adapter: totais reais das janelas (itens ativos, abaixo do mínimo, movimentações)", async () => {
  const { computeInventoryTotals, countMovements30d } = await import("../src/modules/inventory/inventory.adapter");

  const items = [
    makeItem({ id: "1", sku: "A", name: "Item A", isActive: true, belowMin: true }),
    makeItem({ id: "2", sku: "B", name: "Item B", isActive: true, belowMin: false }),
    makeItem({ id: "3", sku: "C", name: "Item C", isActive: false, belowMin: true }),
  ];
  const movements = [
    makeMovement({ id: "m1", itemId: "1", type: "entrada", createdAt: "2026-07-01T10:00:00.000Z" }),
    makeMovement({ id: "m2", itemId: "1", type: "saida", createdAt: "2026-05-01T10:00:00.000Z" }),
  ];

  const totals = computeInventoryTotals(items, movements);
  assert.equal(totals.activeItems, 2);
  assert.equal(totals.belowMinItems, 2);
  assert.equal(totals.movementsCount, 2);

  // Janela de 30 dias do detalhe: só o movimento recente conta.
  assert.equal(countMovements30d(movements, new Date("2026-07-07T00:00:00.000Z")), 1);

  // Renderiza mesmo vazio.
  const empty = computeInventoryTotals([], []);
  assert.equal(empty.activeItems, 0);
  assert.equal(empty.belowMinItems, 0);
  assert.equal(empty.movementsCount, 0);
});

test("inventory adapter: filtros client-side (busca/situação/reposição em itens; tipo/item/busca em movimentos)", async () => {
  const { filterInventoryItems, filterStockMovements } = await import("../src/modules/inventory/inventory.adapter");

  const items = [
    makeItem({ id: "1", sku: "ELE-1", name: "Cabo de rede", isActive: true, belowMin: true }),
    makeItem({ id: "2", sku: "HID-2", name: "Registro de gaveta", isActive: true, belowMin: false }),
    makeItem({ id: "3", sku: "ELE-3", name: "Disjuntor", isActive: false, belowMin: false }),
  ];

  assert.deepEqual(filterInventoryItems(items, { search: "", isActive: "active" }).map((i) => i.id), ["1", "2"]);
  assert.deepEqual(filterInventoryItems(items, { search: "", isActive: "inactive" }).map((i) => i.id), ["3"]);
  assert.deepEqual(filterInventoryItems(items, { search: "", isActive: "all", belowMin: true }).map((i) => i.id), ["1"]);
  assert.deepEqual(filterInventoryItems(items, { search: "ele-", isActive: "all" }).map((i) => i.id), ["1", "3"]);
  assert.deepEqual(filterInventoryItems(items, { search: "gaveta", isActive: "all" }).map((i) => i.id), ["2"]);

  const movements = [
    makeMovement({ id: "m1", itemId: "1", type: "entrada" }),
    makeMovement({ id: "m2", itemId: "2", type: "consumo", workOrderId: "wo-1", reason: "uso em campo" }),
    makeMovement({ id: "m3", itemId: "1", type: "ajuste", reason: "inventário cíclico" }),
  ];

  assert.deepEqual(filterStockMovements(movements, { search: "", type: "consumo" }).map((m) => m.id), ["m2"]);
  assert.deepEqual(filterStockMovements(movements, { search: "", itemId: "1" }).map((m) => m.id), ["m1", "m3"]);
  assert.deepEqual(filterStockMovements(movements, { search: "cíclico", type: undefined }).map((m) => m.id), ["m3"]);
  // Busca pelo rótulo resolvido do item.
  const resolveItemLabel = (id: string) => (id === "1" ? "ELE-1 Cabo de rede" : undefined);
  assert.deepEqual(filterStockMovements(movements, { search: "cabo", resolveItemLabel }).map((m) => m.id), ["m1", "m3"]);
  // Busca pelo código resolvido da OS.
  const resolveWorkOrderCode = (id: string) => (id === "wo-1" ? "OS-1042" : undefined);
  assert.deepEqual(filterStockMovements(movements, { search: "os-1042", resolveWorkOrderCode }).map((m) => m.id), ["m2"]);
});
