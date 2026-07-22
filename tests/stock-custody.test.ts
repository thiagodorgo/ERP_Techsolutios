import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

// Ω4C PR-08 (Estoque com custódia e movimentos — ledger imutável). Custódia BASE/PROFISSIONAL/VIATURA,
// saldo por custódia DERIVADO (Σ quantidade_sinalizada), guard NÃO-NEGATIVO por custódia, LINK/UNLINK
// (par irmão via transferGroupId), EXIT por custódia + estorno compensatório (imutabilidade). EST-01..12.

test("[EST-03] LINK move saldo BASE→PROFISSIONAL: par irmão (transferGroupId), global-Σ neta a zero", async () => {
  await withInventoryApi(async ({ baseUrl, seed }) => {
    const item = await createItem(baseUrl, seed.tenantA, seed.managerA, { sku: "LINK-1" });
    await entrada(baseUrl, seed.tenantA, seed.managerA, item.id, 10, 2);
    const professional = await createOperatorProfile(baseUrl, seed.tenantA, seed.managerA, seed.profUserA.id);

    const linked = await movementRaw(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "link",
      quantidade: 4,
      custody_type: "professional",
      custody_operator_profile_id: professional,
    });

    assert.equal(linked.status, 201, JSON.stringify(linked.body));
    const movements = linked.body.data.movements as Array<{
      custodyType: string;
      quantidadeSinalizada: number;
      transferGroupId: string;
      custodyOperatorProfileId: string | null;
    }>;
    assert.equal(movements.length, 2);
    assert.equal(linked.body.data.transferGroupId, movements[0].transferGroupId);
    assert.equal(movements[0].transferGroupId, movements[1].transferGroupId);
    // Perna BASE = −4; perna PROFISSIONAL = +4 (global neta a zero).
    const base = movements.find((m) => m.custodyType === "base");
    const prof = movements.find((m) => m.custodyType === "professional");
    assert.equal(base?.quantidadeSinalizada, -4);
    assert.equal(prof?.quantidadeSinalizada, 4);
    assert.equal(prof?.custodyOperatorProfileId, professional);

    // Saldo GLOBAL do item permanece 10 (LINK só move de local, não muda on-hand).
    const detail = await getItem(baseUrl, seed.tenantA, seed.managerA, item.id);
    assert.equal(detail.saldo, 10);

    // Resumo por custódia: BASE 6, PROFISSIONAL 4.
    const summary = await custodySummary(baseUrl, seed.tenantA, seed.managerA, item.id);
    assert.equal(summary.baseQty, 6);
    assert.equal(summary.professionalTotalQty, 4);
    assert.equal(summary.total, 10);
    assert.equal(summary.professionals.length, 1);
    assert.equal(summary.professionals[0].operatorProfileId, professional);
    assert.equal(summary.professionals[0].qty, 4);
  });
});

test("[EST-03] UNLINK devolve à base: custódia→BASE (par inverso)", async () => {
  await withInventoryApi(async ({ baseUrl, seed }) => {
    const item = await createItem(baseUrl, seed.tenantA, seed.managerA, { sku: "UNLINK-1" });
    await entrada(baseUrl, seed.tenantA, seed.managerA, item.id, 10, 2);
    const vehicle = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "AAA1A11");

    // Vincula 6 à viatura → BASE 4, VIATURA 6.
    await movement(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "link",
      quantidade: 6,
      custody_type: "vehicle",
      custody_vehicle_id: vehicle,
    });
    const afterLink = await custodySummary(baseUrl, seed.tenantA, seed.managerA, item.id);
    assert.equal(afterLink.baseQty, 4);
    assert.equal(afterLink.vehicleTotalQty, 6);
    assert.equal(afterLink.vehicles[0].vehicleId, vehicle);

    // Desvincula 6 da viatura → BASE 10, VIATURA 0.
    const unlinked = await movement(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "unlink",
      quantidade: 6,
      custody_type: "vehicle",
      custody_vehicle_id: vehicle,
    });
    const src = unlinked.movements.find((m) => m.custodyType === "vehicle");
    const dst = unlinked.movements.find((m) => m.custodyType === "base");
    assert.equal(src?.quantidadeSinalizada, -6);
    assert.equal(dst?.quantidadeSinalizada, 6);

    const afterUnlink = await custodySummary(baseUrl, seed.tenantA, seed.managerA, item.id);
    assert.equal(afterUnlink.baseQty, 10);
    assert.equal(afterUnlink.vehicleTotalQty, 0);
    assert.equal(afterUnlink.vehicles.length, 0); // custódia zerada some da lista
  });
});

test("[EST-04] EXIT (saida) reduz a custódia de origem + exit_reason (venda direta)", async () => {
  await withInventoryApi(async ({ baseUrl, seed }) => {
    const item = await createItem(baseUrl, seed.tenantA, seed.managerA, { sku: "EXIT-1" });
    await entrada(baseUrl, seed.tenantA, seed.managerA, item.id, 10, 2);
    const professional = await createOperatorProfile(baseUrl, seed.tenantA, seed.managerA, seed.profUserA.id);
    await movement(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "link",
      quantidade: 5,
      custody_type: "professional",
      custody_operator_profile_id: professional,
    });

    const exited = await movementRaw(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "saida",
      quantidade: 2,
      custody_type: "professional",
      custody_operator_profile_id: professional,
      exit_reason: "direct_sale",
    });
    assert.equal(exited.status, 201, JSON.stringify(exited.body));
    assert.equal(exited.body.data.custodyType, "professional");
    assert.equal(exited.body.data.quantidadeSinalizada, -2);
    assert.equal(exited.body.data.reason, "direct_sale"); // exit_reason gravado no reason (sem coluna nova)

    // BASE 5, PROFISSIONAL 3 (5 vinculados − 2 vendidos). Global 8.
    const summary = await custodySummary(baseUrl, seed.tenantA, seed.managerA, item.id);
    assert.equal(summary.baseQty, 5);
    assert.equal(summary.professionalTotalQty, 3);
    assert.equal(summary.total, 8);

    const invalidReason = await movementRaw(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "saida",
      quantidade: 1,
      exit_reason: "roubo",
    });
    assert.equal(invalidReason.status, 400);
    assert.equal(invalidReason.body.error.reason, "invalid_exit_reason");
  });
});

test("[EST-02] saldo nunca negativo POR CUSTÓDIA → 409 insufficient_balance (LINK sem base; EXIT sem custódia)", async () => {
  await withInventoryApi(async ({ baseUrl, seed }) => {
    const item = await createItem(baseUrl, seed.tenantA, seed.managerA, { sku: "NEG-1" });
    await entrada(baseUrl, seed.tenantA, seed.managerA, item.id, 5, 2);
    const professional = await createOperatorProfile(baseUrl, seed.tenantA, seed.managerA, seed.profUserA.id);

    // LINK além do saldo da BASE (5) → 409.
    const overLink = await movementRaw(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "link",
      quantidade: 6,
      custody_type: "professional",
      custody_operator_profile_id: professional,
    });
    assert.equal(overLink.status, 409, JSON.stringify(overLink.body));
    assert.equal(overLink.body.error.reason, "insufficient_balance");

    // Vincula 3; a custódia PROFISSIONAL tem 3, a BASE tem 2.
    await movement(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "link",
      quantidade: 3,
      custody_type: "professional",
      custody_operator_profile_id: professional,
    });

    // EXIT da custódia PROFISSIONAL além do saldo dela (3) → 409, mesmo com saldo GLOBAL 5.
    const overExit = await movementRaw(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "saida",
      quantidade: 4,
      custody_type: "professional",
      custody_operator_profile_id: professional,
    });
    assert.equal(overExit.status, 409, JSON.stringify(overExit.body));
    assert.equal(overExit.body.error.reason, "insufficient_balance");

    // UNLINK além do saldo da custódia (3) → 409.
    const overUnlink = await movementRaw(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "unlink",
      quantidade: 4,
      custody_type: "professional",
      custody_operator_profile_id: professional,
    });
    assert.equal(overUnlink.status, 409);
    assert.equal(overUnlink.body.error.reason, "insufficient_balance");

    // Nada foi gravado pelos 409 — custódia intacta.
    const summary = await custodySummary(baseUrl, seed.tenantA, seed.managerA, item.id);
    assert.equal(summary.baseQty, 2);
    assert.equal(summary.professionalTotalQty, 3);
  });
});

test("[EST-07] custódia inconsistente → 422 invalid_custody; ref cross-tenant → 400 invalid_custody_reference", async () => {
  await withInventoryApi(async ({ baseUrl, seed }) => {
    const item = await createItem(baseUrl, seed.tenantA, seed.managerA, { sku: "CUST-1" });
    await entrada(baseUrl, seed.tenantA, seed.managerA, item.id, 10, 2);
    const professionalB = await createOperatorProfile(baseUrl, seed.tenantB, seed.managerB, seed.profUserB.id);
    const vehicleA = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "AAA2A22");

    // base + ref → 422.
    const baseWithRef = await movementRaw(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "saida",
      quantidade: 1,
      custody_type: "base",
      custody_vehicle_id: vehicleA,
    });
    assert.equal(baseWithRef.status, 422, JSON.stringify(baseWithRef.body));
    assert.equal(baseWithRef.body.error.reason, "invalid_custody");

    // professional sem ref → 422.
    const profNoRef = await movementRaw(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "link",
      quantidade: 1,
      custody_type: "professional",
    });
    assert.equal(profNoRef.status, 422);
    assert.equal(profNoRef.body.error.reason, "invalid_custody");

    // vehicle + operator ref juntos → 422.
    const bothRefs = await movementRaw(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "link",
      quantidade: 1,
      custody_type: "vehicle",
      custody_vehicle_id: vehicleA,
      custody_operator_profile_id: professionalB,
    });
    assert.equal(bothRefs.status, 422);

    // Profissional de OUTRO tenant → 400 invalid_custody_reference (resolver tenant-scoped).
    const crossTenant = await movementRaw(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "link",
      quantidade: 1,
      custody_type: "professional",
      custody_operator_profile_id: professionalB,
    });
    assert.equal(crossTenant.status, 400, JSON.stringify(crossTenant.body));
    assert.equal(crossTenant.body.error.reason, "invalid_custody_reference");

    // link para a BASE → 422 (transferência exige custódia não-base).
    const linkBase = await movementRaw(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "link",
      quantidade: 1,
      custody_type: "base",
    });
    assert.equal(linkBase.status, 422);
    assert.equal(linkBase.body.error.reason, "invalid_custody");
  });
});

test("[EST-05/06] ledger imutável: sem PATCH/DELETE; estorno = compensatório; original intacto; 2º estorno → 409", async () => {
  await withInventoryApi(async ({ baseUrl, seed }) => {
    const item = await createItem(baseUrl, seed.tenantA, seed.managerA, { sku: "REV-1" });
    const entry = await movement(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "entrada",
      quantidade: 10,
      unit_cost: 2,
    });
    const entryId = entry.movements ? entry.movements[0].id : (entry as unknown as { id: string }).id;

    // PATCH/DELETE de movimento não existem.
    const patchAttempt = await requestJson(baseUrl, `/api/v1/stock-movements/${entryId}`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { quantidade: 999 },
    });
    const deleteAttempt = await requestJson(baseUrl, `/api/v1/stock-movements/${entryId}`, {
      method: "DELETE",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(patchAttempt.status, 404);
    assert.equal(patchAttempt.body.error.reason, "route_not_found");
    assert.equal(deleteAttempt.status, 404);

    // Estorno da entrada = movimento compensatório (−10 na mesma custódia base), original intacto.
    const reversed = await requestJson(baseUrl, `/api/v1/stock-movements/${entryId}/reverse`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { reason: "estorno de teste" },
    });
    assert.equal(reversed.status, 201, JSON.stringify(reversed.body));
    const compensating = reversed.body.data.movements[0];
    assert.equal(compensating.quantidadeSinalizada, -10);
    assert.equal(compensating.reversesMovementId, entryId);
    assert.equal(compensating.custodyType, "base");

    // Original permanece com +10 (imutável).
    const original = await requestJson(baseUrl, `/api/v1/stock-movements/${entryId}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(original.body.data.quantidadeSinalizada, 10);

    // Saldo derivado após estorno = 0.
    const detail = await getItem(baseUrl, seed.tenantA, seed.managerA, item.id);
    assert.equal(detail.saldo, 0);

    // 2º estorno do MESMO movimento → 409 movement_already_reversed.
    const secondReverse = await requestJson(baseUrl, `/api/v1/stock-movements/${entryId}/reverse`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(secondReverse.status, 409, JSON.stringify(secondReverse.body));
    assert.equal(secondReverse.body.error.reason, "movement_already_reversed");
  });
});

test("[EST-05] estorno de TRANSFERÊNCIA (link) = par inverso; estornar por qualquer perna bloqueia re-estorno", async () => {
  await withInventoryApi(async ({ baseUrl, seed }) => {
    const item = await createItem(baseUrl, seed.tenantA, seed.managerA, { sku: "REV-LINK" });
    await entrada(baseUrl, seed.tenantA, seed.managerA, item.id, 10, 2);
    const professional = await createOperatorProfile(baseUrl, seed.tenantA, seed.managerA, seed.profUserA.id);
    const linked = await movement(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "link",
      quantidade: 4,
      custody_type: "professional",
      custody_operator_profile_id: professional,
    });
    const profLegId = linked.movements.find((m) => m.custodyType === "professional")!.id;

    const reversed = await requestJson(baseUrl, `/api/v1/stock-movements/${profLegId}/reverse`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(reversed.status, 201, JSON.stringify(reversed.body));
    assert.equal(reversed.body.data.movements.length, 2); // par inverso

    // Custódia PROFISSIONAL voltou a zero; BASE 10 (transferência desfeita).
    const summary = await custodySummary(baseUrl, seed.tenantA, seed.managerA, item.id);
    assert.equal(summary.baseQty, 10);
    assert.equal(summary.professionalTotalQty, 0);

    // Estornar pela OUTRA perna → 409 (grupo já estornado).
    const baseLegId = linked.movements.find((m) => m.custodyType === "base")!.id;
    const secondReverse = await requestJson(baseUrl, `/api/v1/stock-movements/${baseLegId}/reverse`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(secondReverse.status, 409);
    assert.equal(secondReverse.body.error.reason, "movement_already_reversed");
  });
});

test("[EST-05] estorno respeita não-negativo: estornar entrada cujo estoque já saiu → 409 insufficient_balance", async () => {
  await withInventoryApi(async ({ baseUrl, seed }) => {
    const item = await createItem(baseUrl, seed.tenantA, seed.managerA, { sku: "REV-NEG" });
    const entry = await movement(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "entrada",
      quantidade: 5,
      unit_cost: 2,
    });
    const entryId = (entry as unknown as { id: string }).id ?? entry.movements[0].id;
    // Todo o estoque saiu da base.
    await movement(baseUrl, seed.tenantA, seed.managerA, { item_id: item.id, type: "saida", quantidade: 5 });

    const reverseEntry = await requestJson(baseUrl, `/api/v1/stock-movements/${entryId}/reverse`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(reverseEntry.status, 409, JSON.stringify(reverseEntry.body));
    assert.equal(reverseEntry.body.error.reason, "insufficient_balance");
  });
});

test("[EST-08] custody-summary: cross-tenant 404; item validado no tenant; §2.8 sem tenant_id/CNH", async () => {
  await withInventoryApi(async ({ baseUrl, seed }) => {
    const itemA = await createItem(baseUrl, seed.tenantA, seed.managerA, { sku: "SUM-A" });
    const itemB = await createItem(baseUrl, seed.tenantB, seed.managerB, { sku: "SUM-B" });

    const crossTenant = await requestJson(baseUrl, `/api/v1/inventory-items/${itemB.id}/custody-summary`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(crossTenant.status, 404);

    const own = await requestJson(baseUrl, `/api/v1/inventory-items/${itemA.id}/custody-summary`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(own.status, 200);
    assert.equal(own.body.data.baseQty, 0);
    assert.equal(own.body.data.total, 0);
    // §2.8 — sem tenant_id na resposta.
    assert.equal(JSON.stringify(own.body).includes("tenant_id"), false);
    assert.equal(JSON.stringify(own.body).includes("tenantId"), false);
  });
});

test("[EST-08] custody-summary rotula profissional por NOME (nunca CNH)", async () => {
  await withInventoryApi(async ({ baseUrl, seed }) => {
    const item = await createItem(baseUrl, seed.tenantA, seed.managerA, { sku: "SUM-LABEL" });
    await entrada(baseUrl, seed.tenantA, seed.managerA, item.id, 10, 2);
    const professional = await createOperatorProfile(baseUrl, seed.tenantA, seed.managerA, seed.profUserA.id, {
      full_name: "Fulano Guincheiro",
      cnh_number: "99887766554",
    });
    await movement(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "link",
      quantidade: 3,
      custody_type: "professional",
      custody_operator_profile_id: professional,
    });

    const summary = await custodySummary(baseUrl, seed.tenantA, seed.managerA, item.id);
    assert.equal(summary.professionals[0].name, "Fulano Guincheiro");
    // A CNH nunca vaza no resumo.
    assert.equal(JSON.stringify(summary).includes("99887766554"), false);
    assert.equal(JSON.stringify(summary).includes("cnh"), false);
  });
});

test("[EST-09] item AutEM: is_fuel/item_type/compra/venda/descrição; cadastrar NÃO cria saldo; inativar preserva histórico", async () => {
  await withInventoryApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/inventory-items", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {
        sku: "AUTEM-1",
        name: "Óleo 15W40",
        unit: "L",
        is_fuel: true,
        item_type: "product",
        purchase_price: 18.5,
        sale_price: 29.9,
        description: "Óleo lubrificante mineral",
      },
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.data.isFuel, true);
    assert.equal(created.body.data.itemType, "product");
    assert.equal(created.body.data.purchasePrice, 18.5);
    assert.equal(created.body.data.salePrice, 29.9);
    assert.equal(created.body.data.description, "Óleo lubrificante mineral");
    assert.equal(created.body.data.saldo, 0); // cadastrar NÃO cria saldo (só ENTRY)

    // EQUIPAMENTO.
    const equip = await requestJson(baseUrl, "/api/v1/inventory-items", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { sku: "EQUIP-1", name: "Macaco hidráulico", unit: "un", item_type: "equipment" },
    });
    assert.equal(equip.status, 201);
    assert.equal(equip.body.data.itemType, "equipment");

    const invalidType = await requestJson(baseUrl, "/api/v1/inventory-items", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { sku: "BAD-1", name: "X", unit: "un", item_type: "servico" },
    });
    assert.equal(invalidType.status, 400);
    assert.equal(invalidType.body.error.reason, "invalid_item_type");

    // Movimenta e inativa: histórico preservado (o movimento continua consultável).
    await entrada(baseUrl, seed.tenantA, seed.managerA, created.body.data.id, 4, 2);
    const deactivated = await requestJson(baseUrl, `/api/v1/inventory-items/${created.body.data.id}`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { is_active: false },
    });
    assert.equal(deactivated.body.data.isActive, false);
    assert.equal(deactivated.body.data.isFuel, true); // flags preservadas
    const movements = await requestJson(baseUrl, `/api/v1/stock-movements?item_id=${created.body.data.id}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(movements.body.pagination.total, 1); // ledger intacto após inativar
  });
});

test("[EST-10] baixa automática DEFERIDA: is_fuel é só marcação; nenhum movimento é fabricado no cadastro", async () => {
  await withInventoryApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/inventory-items", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { sku: "FUEL-FLAG", name: "Diesel S10", unit: "L", is_fuel: true },
    });
    assert.equal(created.status, 201);
    // Marcar combustível não gera EXIT/consumo algum (a baixa é PR-08b).
    const movements = await requestJson(baseUrl, `/api/v1/stock-movements?item_id=${created.body.data.id}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(movements.body.pagination.total, 0);
  });
});

test("[EST-11] §2.8 — DTO do movimento com custódia não vaza tenant_id; entrada força custódia BASE", async () => {
  await withInventoryApi(async ({ baseUrl, seed }) => {
    const item = await createItem(baseUrl, seed.tenantA, seed.managerA, { sku: "DTO-1" });
    const entered = await movementRaw(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "entrada",
      quantidade: 5,
      unit_cost: 2,
      // Tentativa de forçar custódia numa entrada — deve ser ignorada (entrada é SEMPRE base).
      custody_type: "professional",
      custody_operator_profile_id: "00000000-0000-4000-8000-000000000000",
    });
    assert.equal(entered.status, 201, JSON.stringify(entered.body));
    assert.equal(entered.body.data.custodyType, "base");
    assert.equal(entered.body.data.custodyOperatorProfileId, null);
    assert.equal(entered.body.data.tenantId, undefined);
    assert.equal(entered.body.data.tenant_id, undefined);
  });
});

test("[EST-12] isolamento: custódia de A invisível a B; movimento com custódia é tenant-scoped", async () => {
  await withInventoryApi(async ({ baseUrl, seed }) => {
    const itemA = await createItem(baseUrl, seed.tenantA, seed.managerA, { sku: "ISO-CUST-A" });
    await entrada(baseUrl, seed.tenantA, seed.managerA, itemA.id, 10, 2);
    const professional = await createOperatorProfile(baseUrl, seed.tenantA, seed.managerA, seed.profUserA.id);
    await movement(baseUrl, seed.tenantA, seed.managerA, {
      item_id: itemA.id,
      type: "link",
      quantidade: 4,
      custody_type: "professional",
      custody_operator_profile_id: professional,
    });

    // B não enxerga o custody-summary do item de A.
    const crossSummary = await requestJson(baseUrl, `/api/v1/inventory-items/${itemA.id}/custody-summary`, {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });
    assert.equal(crossSummary.status, 404);

    // B não enxerga os movimentos de A.
    const listB = await requestJson(baseUrl, "/api/v1/stock-movements", {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });
    assert.equal(listB.body.pagination.total, 0);
  });
});

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly managerA: User;
  readonly managerB: User;
  readonly profUserA: User;
  readonly profUserB: User;
};

type InventoryApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
};

async function withInventoryApi(callback: (context: InventoryApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { resetInventoryRuntimeForTests },
    { resetVehicleRuntimeForTests },
    { resetWorkOrderRuntimeForTests },
    { resetOperatorProfileRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/inventory/index.js"),
    import("../src/modules/vehicles/index.js"),
    import("../src/modules/work-orders/index.js"),
    import("../src/modules/operator-profiles/index.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  resetInventoryRuntimeForTests();
  resetVehicleRuntimeForTests();
  resetWorkOrderRuntimeForTests();
  resetOperatorProfileRuntimeForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCoreSaas(core);
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({ baseUrl, seed });
  } finally {
    await closeServer(server);
    resetInventoryRuntimeForTests();
    resetVehicleRuntimeForTests();
    resetWorkOrderRuntimeForTests();
    resetOperatorProfileRuntimeForTests();
  }
}

function seedCoreSaas(service: {
  createTenant(input: { readonly name: string; readonly modules?: readonly string[] }): Tenant;
  createUser(input: { readonly tenantId: string; readonly name: string; readonly email: string; readonly roles: readonly string[] }): User;
}): SeedData {
  const tenantA = service.createTenant({ name: "Tenant Custódia A", modules: ["dashboard", "work_orders"] });
  const tenantB = service.createTenant({ name: "Tenant Custódia B", modules: ["dashboard", "work_orders"] });
  const managerA = service.createUser({ tenantId: tenantA.id, name: "Manager A", email: "cust-manager-a@example.com", roles: ["manager"] });
  const managerB = service.createUser({ tenantId: tenantB.id, name: "Manager B", email: "cust-manager-b@example.com", roles: ["manager"] });
  const profUserA = service.createUser({ tenantId: tenantA.id, name: "Prof User A", email: "cust-prof-a@example.com", roles: ["field_technician"] });
  const profUserB = service.createUser({ tenantId: tenantB.id, name: "Prof User B", email: "cust-prof-b@example.com", roles: ["field_technician"] });

  return { tenantA, tenantB, managerA, managerB, profUserA, profUserB };
}

async function createItem(
  baseUrl: string,
  tenant: Tenant,
  user: User,
  body: Record<string, unknown>,
): Promise<{ readonly id: string }> {
  const created = await requestJson(baseUrl, "/api/v1/inventory-items", {
    method: "POST",
    headers: authHeaders(tenant, user, "manager"),
    body: { sku: "SKU-DEFAULT", name: "Item de estoque", unit: "un", ...body },
  });

  assert.equal(created.status, 201, `item creation failed: ${JSON.stringify(created.body)}`);

  return { id: created.body.data.id as string };
}

async function getItem(
  baseUrl: string,
  tenant: Tenant,
  user: User,
  itemId: string,
): Promise<{ readonly saldo: number }> {
  const detail = await requestJson(baseUrl, `/api/v1/inventory-items/${itemId}`, {
    headers: authHeaders(tenant, user, "manager"),
  });

  assert.equal(detail.status, 200, `item detail failed: ${JSON.stringify(detail.body)}`);

  return { saldo: detail.body.data.saldo as number };
}

async function movementRaw(baseUrl: string, tenant: Tenant, user: User, body: Record<string, unknown>) {
  return requestJson(baseUrl, "/api/v1/stock-movements", {
    method: "POST",
    headers: authHeaders(tenant, user, "manager"),
    body,
  });
}

type MovementDto = {
  readonly id: string;
  readonly custodyType: string;
  readonly quantidadeSinalizada: number;
  readonly transferGroupId: string | null;
};

async function movement(
  baseUrl: string,
  tenant: Tenant,
  user: User,
  body: Record<string, unknown>,
): Promise<{ readonly movements: MovementDto[] }> {
  const created = await movementRaw(baseUrl, tenant, user, body);

  assert.equal(created.status, 201, `movement failed: ${JSON.stringify(created.body)}`);
  // Transferência (link/unlink) → data.movements[]; movimento simples → data (envolvido num array de 1).
  const movements: MovementDto[] = created.body.data.movements ?? [created.body.data];

  return { movements };
}

async function entrada(
  baseUrl: string,
  tenant: Tenant,
  user: User,
  itemId: string,
  quantidade: number,
  unitCost: number,
): Promise<void> {
  await movement(baseUrl, tenant, user, { item_id: itemId, type: "entrada", quantidade, unit_cost: unitCost });
}

type CustodySummaryDto = {
  readonly baseQty: number;
  readonly professionalTotalQty: number;
  readonly vehicleTotalQty: number;
  readonly total: number;
  readonly professionals: Array<{ readonly operatorProfileId: string; readonly name: string | null; readonly qty: number }>;
  readonly vehicles: Array<{ readonly vehicleId: string; readonly plate: string | null; readonly qty: number }>;
};

async function custodySummary(baseUrl: string, tenant: Tenant, user: User, itemId: string): Promise<CustodySummaryDto> {
  const response = await requestJson(baseUrl, `/api/v1/inventory-items/${itemId}/custody-summary`, {
    headers: authHeaders(tenant, user, "manager"),
  });

  assert.equal(response.status, 200, `custody-summary failed: ${JSON.stringify(response.body)}`);

  return response.body.data as CustodySummaryDto;
}

async function createOperatorProfile(
  baseUrl: string,
  tenant: Tenant,
  user: User,
  profileUserId: string,
  body: Record<string, unknown> = {},
): Promise<string> {
  // O create do perfil valida o FORMATO do user_id (memory mode não checa existência); usamos um UUID v4
  // estrito para bater com o padrão do validador — o user semeado do core-saas não é v4 estrito.
  void profileUserId;
  const created = await requestJson(baseUrl, "/api/v1/operator-profiles", {
    method: "POST",
    headers: authHeaders(tenant, user, "manager"),
    body: { user_id: randomUUID(), ...body },
  });

  assert.equal(created.status, 201, `operator profile creation failed: ${JSON.stringify(created.body)}`);

  return created.body.data.id as string;
}

async function createVehicle(baseUrl: string, tenant: Tenant, user: User, plate: string): Promise<string> {
  const created = await requestJson(baseUrl, "/api/v1/vehicles", {
    method: "POST",
    headers: authHeaders(tenant, user, "manager"),
    body: { plate, model: "Caminhao Guincho" },
  });

  assert.equal(created.status, 201, `vehicle creation failed: ${JSON.stringify(created.body)}`);

  return created.body.data.id as string;
}

function authHeaders(tenant: Tenant, user: User, role: string): Record<string, string> {
  return {
    "x-tenant-id": tenant.id,
    "x-user-id": user.id,
    "x-role": role,
  };
}

async function requestJson(
  baseUrl: string,
  routePath: string,
  options: {
    readonly method?: string;
    readonly headers?: Record<string, string>;
    readonly body?: unknown;
  } = {},
) {
  const response = await fetch(`${baseUrl}${routePath}`, {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();

  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
  };
}

async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });

  const address = server.address();

  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");

  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
