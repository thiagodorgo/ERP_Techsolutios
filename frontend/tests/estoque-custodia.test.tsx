import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { CustodySummaryPanel } from "../src/modules/inventory/components/CustodySummaryPanel";
import { ItemMovementsPanel } from "../src/modules/inventory/components/ItemMovementsPanel";
import { StockEntryModal } from "../src/modules/inventory/components/StockEntryModal";
import { StockExitModal } from "../src/modules/inventory/components/StockExitModal";
import { StockTransferModal } from "../src/modules/inventory/components/StockTransferModal";
import type { CustodySummary, InventoryItem, StockMovement } from "../src/modules/inventory/inventory.types";

// Ω4C PR-08 — Estoque com custódia e movimentos (ledger imutável). Recria o COMPORTAMENTO do AutEM no
// visual do ERP. Cobre: modal Item com abas Editar/Resumo/Movimentação; saldos POR CUSTÓDIA do backend;
// sub-modal Vincular com select de custódia; razão imutável (só Estornar, sem editar/excluir); 409
// insufficient_balance / movement_already_reversed honestos; rótulos PT-BR; §2.8 (nunca CNH).

function installBrowserTestGlobals() {
  const storage = new Map<string, string>();
  const listeners = new Map<string, Set<EventListener>>();

  const localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  };
  const windowStub = {
    localStorage,
    addEventListener: (event: string, listener: EventListener) => {
      const eventListeners = listeners.get(event) ?? new Set<EventListener>();
      eventListeners.add(listener);
      listeners.set(event, eventListeners);
    },
    removeEventListener: (event: string, listener: EventListener) => {
      listeners.get(event)?.delete(listener);
    },
    dispatchEvent: (event: Event) => {
      listeners.get(event.type)?.forEach((listener) => listener(event));
      return true;
    },
    setTimeout: globalThis.setTimeout.bind(globalThis),
  };

  Object.defineProperty(globalThis, "window", { configurable: true, value: windowStub });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { getElementById: () => null, createElement: () => ({ click() {}, set href(_v: string) {}, set download(_v: string) {} }) },
  });

  return { clear: () => storage.clear(), localStorage };
}

const browser = installBrowserTestGlobals();

function seedContext(permissions: readonly string[]) {
  browser.localStorage.setItem(
    "erp-techsolutions.active-context",
    JSON.stringify({
      tenantId: "ten-industrial-01",
      tenantName: "Techsolutions Industrial",
      tenantStatus: "active",
      branchId: "fil-sp-01",
      branchName: "Sao Paulo - Campo",
      role: "Gestor Operacional",
      permissions,
      enabledModules: ["dashboard", "work-orders"],
      scope: "branch",
    }),
  );
}

function makeItem(partial: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: "item-1",
    sku: "ELE-0021",
    name: "Cabo de rede Cat6",
    unit: "un",
    minQuantity: 10,
    maxQuantity: 100,
    abcClass: "A",
    avgCost: 4.25,
    leadTimeDays: 7,
    safetyStock: 5,
    reorderPoint: 20,
    needsReorder: false,
    saldo: 42,
    belowMin: false,
    isFuel: false,
    itemType: "product",
    purchasePrice: 3.5,
    salePrice: 9,
    description: "Cabo azul",
    isActive: true,
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-01T10:00:00.000Z",
    ...partial,
  };
}

function makeMovement(partial: Partial<StockMovement> & Pick<StockMovement, "id" | "type">): StockMovement {
  return {
    itemId: "item-1",
    quantidadeSinalizada: 1,
    unitCost: null,
    workOrderId: null,
    vehicleId: null,
    reason: null,
    custodyType: "base",
    custodyOperatorProfileId: null,
    custodyVehicleId: null,
    transferGroupId: null,
    reversesMovementId: null,
    createdAt: "2026-07-01T10:00:00.000Z",
    createdBy: null,
    ...partial,
  };
}

// ── Modal "Item" — abas Editar | Resumo | Movimentação + campos AutEM + inativar ─────────────
async function renderItemModal(permissions: readonly string[]): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { InventoryItemFormModal } = await import("../src/modules/inventory/components/InventoryItemFormModal");

  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  seedContext(permissions);

  return renderToString(
    <MemoryRouter initialEntries={["/inventory"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <InventoryItemFormModal item={makeItem()} context={{}} onClose={() => {}} onSaved={() => {}} />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("modal Item (edição): abas Editar | Resumo | Movimentação + campos AutEM + Inativar", async () => {
  const html = await renderItemModal(["inventory_items:read", "inventory_items:update", "stock_movements:read", "stock_movements:create"]);

  // As três abas do modal de item.
  assert.match(html, /Editar</);
  assert.match(html, /Resumo</);
  assert.match(html, /Movimentação</);
  // Campos AutEM na aba Editar (PT-BR).
  assert.match(html, /Código \(SKU\)/);
  assert.match(html, /Tipo/);
  assert.match(html, /É combustível/);
  assert.match(html, /Descrição/);
  // PRODUTO mostra Compra/Venda.
  assert.match(html, /Compra \(R\$\)/);
  assert.match(html, /Venda \(R\$\)/);
  // Rodapé com inativar + badge de status.
  assert.match(html, /Inativar/);
  assert.match(html, /Ativo/);
  // Cadastrar não cria saldo (nota honesta).
  assert.match(html, /não cria saldo/);
  // §3 — sem termo técnico.
  assert.doesNotMatch(html, /Tenant/i);
});

test("modal Item (EQUIPAMENTO): oculta Compra/Venda — só PRODUTO tem preço", async () => {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { InventoryItemFormModal } = await import("../src/modules/inventory/components/InventoryItemFormModal");

  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  seedContext(["inventory_items:read", "inventory_items:update"]);

  const html = renderToString(
    <MemoryRouter initialEntries={["/inventory"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <InventoryItemFormModal item={makeItem({ itemType: "equipment" })} context={{}} onClose={() => {}} onSaved={() => {}} />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );

  assert.match(html, /Editar</);
  assert.doesNotMatch(html, /Compra \(R\$\)/);
  assert.doesNotMatch(html, /Venda \(R\$\)/);
});

// ── Aba Resumo — saldos POR CUSTÓDIA do backend (nunca CNH) ───────────────────────────────────
test("Resumo por custódia: Qtd. Base/Profissional/Viatura + nomes do backend (§2.8 — nunca CNH)", () => {
  const summary: CustodySummary = {
    itemId: "item-1",
    baseQty: 30,
    professionalTotalQty: 8,
    vehicleTotalQty: 4,
    total: 42,
    professionals: [{ operatorProfileId: "op-1", name: "João da Silva", qty: 8 }],
    vehicles: [{ vehicleId: "veh-1", plate: "ABC1D23", qty: 4 }],
  };

  const html = renderToString(<CustodySummaryPanel item={makeItem()} summary={summary} loading={false} error={null} />);

  assert.match(html, /Qtd\. Base/);
  assert.match(html, /Qtd\. Profissional/);
  assert.match(html, /Qtd\. Viatura/);
  assert.match(html, /Saldo global/);
  // Valores por custódia vindos do backend (derivados, não fabricados).
  assert.match(html, /30/);
  assert.match(html, /João da Silva/);
  assert.match(html, /ABC1D23/);
  // §2.8/LGPD — o custodiante é só o nome/placa; NUNCA CNH.
  assert.doesNotMatch(html, /CNH/i);
  assert.doesNotMatch(html, /cnh_number|cnhNumber/i);
});

test("Resumo por custódia: vazio honesto quando não há custódia (D-007, sem fabricar)", () => {
  const summary: CustodySummary = {
    itemId: "item-1",
    baseQty: 42,
    professionalTotalQty: 0,
    vehicleTotalQty: 0,
    total: 42,
    professionals: [],
    vehicles: [],
  };
  const html = renderToString(<CustodySummaryPanel item={makeItem()} summary={summary} loading={false} error={null} />);
  assert.match(html, /Nenhum item sob custódia de profissional/);
  assert.match(html, /Nenhum item sob custódia de viatura/);
});

// ── Aba Movimentação — razão IMUTÁVEL (só Estornar) + toolbar 4 ações ─────────────────────────
test("Movimentação: toolbar (Entrada/Vincular/Saída/Desvincular) + linhas com SÓ Estornar (imutável)", () => {
  const movements: StockMovement[] = [
    makeMovement({ id: "mv-1", type: "entrada", quantidadeSinalizada: 50, custodyType: "base" }),
    makeMovement({ id: "mv-2a", type: "link", quantidadeSinalizada: -8, custodyType: "base", transferGroupId: "grp-1" }),
    makeMovement({ id: "mv-2b", type: "link", quantidadeSinalizada: 8, custodyType: "professional", custodyOperatorProfileId: "op-1", transferGroupId: "grp-1" }),
    makeMovement({ id: "mv-3", type: "saida", quantidadeSinalizada: -3, custodyType: "base", reason: "Venda direta" }),
  ];

  const html = renderToString(
    <ItemMovementsPanel
      item={makeItem()}
      movements={movements}
      loading={false}
      error={null}
      canCreateMovement
      operatorNameById={new Map([["op-1", "João da Silva"]])}
      vehiclePlateById={new Map()}
      reversingId={null}
      onReverse={() => {}}
      onOpenEntry={() => {}}
      onOpenLink={() => {}}
      onOpenExit={() => {}}
      onOpenUnlink={() => {}}
    />,
  );

  // Toolbar com as 4 ações coloridas (PT-BR).
  assert.match(html, /Registrar entrada de estoque/);
  assert.match(html, /Vincular estoque a uma custódia/);
  assert.match(html, /Registrar saída de estoque/);
  assert.match(html, /Desvincular estoque de uma custódia/);
  // O razão é IMUTÁVEL: só existe Estornar — NUNCA editar/excluir movimento.
  assert.match(html, /Estornar/);
  assert.doesNotMatch(html, /Editar/);
  assert.doesNotMatch(html, /Excluir/);
  // Par de transferência colapsado numa linha Base → Profissional (nome como rótulo).
  assert.match(html, /Base/);
  assert.match(html, /João da Silva/);
});

test("Movimentação: linha já estornada mostra 'Estornado' e não oferece novo estorno", () => {
  const movements: StockMovement[] = [
    makeMovement({ id: "mv-1", type: "entrada", quantidadeSinalizada: 50, custodyType: "base" }),
    // Estorno compensatório apontando para mv-1.
    makeMovement({ id: "mv-2", type: "entrada", quantidadeSinalizada: -50, custodyType: "base", reversesMovementId: "mv-1", reason: "Estorno" }),
  ];
  const html = renderToString(
    <ItemMovementsPanel
      item={makeItem()}
      movements={movements}
      loading={false}
      error={null}
      canCreateMovement
      operatorNameById={new Map()}
      vehiclePlateById={new Map()}
      reversingId={null}
      onReverse={() => {}}
      onOpenEntry={() => {}}
      onOpenLink={() => {}}
      onOpenExit={() => {}}
      onOpenUnlink={() => {}}
    />,
  );
  assert.match(html, /Estornado/);
  assert.match(html, /Estorno/);
});

test("Movimentação: sem stock_movements:create → sem toolbar e sem Estornar (backend é a autoridade)", () => {
  const html = renderToString(
    <ItemMovementsPanel
      item={makeItem()}
      movements={[makeMovement({ id: "mv-1", type: "entrada", quantidadeSinalizada: 50 })]}
      loading={false}
      error={null}
      canCreateMovement={false}
      operatorNameById={new Map()}
      vehiclePlateById={new Map()}
      reversingId={null}
      onReverse={() => {}}
      onOpenEntry={() => {}}
      onOpenLink={() => {}}
      onOpenExit={() => {}}
      onOpenUnlink={() => {}}
    />,
  );
  assert.doesNotMatch(html, /Registrar entrada de estoque/);
  assert.doesNotMatch(html, /Estornar/);
});

// ── Sub-modais laranja ────────────────────────────────────────────────────────────────────────
test("sub-modal Vincular: select de custódia (Profissional/Viatura) + destino + quantidade (§2.8 sem CNH)", () => {
  const html = renderToString(
    <StockTransferModal
      mode="link"
      item={makeItem()}
      operatorOptions={[{ id: "op-1", label: "João da Silva" }]}
      vehicleOptions={[{ id: "veh-1", label: "ABC1D23 — Ford" }]}
      onSubmit={() => {}}
      onClose={() => {}}
    />,
  );
  assert.match(html, /Vincular a uma custódia/);
  assert.match(html, /Vincular por/);
  // Select de custódia destino com Profissional e Viatura.
  assert.match(html, /Profissional/);
  assert.match(html, /Viatura/);
  assert.match(html, /Quantidade/);
  assert.match(html, /João da Silva/);
  // §2.8 — nunca CNH no sub-modal.
  assert.doesNotMatch(html, /CNH/i);
});

test("sub-modal Desvincular: título/ação PT-BR (custódia devolve à Base)", () => {
  const html = renderToString(
    <StockTransferModal
      mode="unlink"
      item={makeItem()}
      operatorOptions={[{ id: "op-1", label: "João da Silva" }]}
      vehicleOptions={[]}
      onSubmit={() => {}}
      onClose={() => {}}
    />,
  );
  assert.match(html, /Desvincular de uma custódia/);
  assert.match(html, /devolve à Base/);
});

test("sub-modal Saída: origem por custódia (Base/Profissional/Viatura) + Tipo de Saída (Venda direta)", () => {
  const html = renderToString(
    <StockExitModal
      item={makeItem()}
      operatorOptions={[{ id: "op-1", label: "João da Silva" }]}
      vehicleOptions={[{ id: "veh-1", label: "ABC1D23" }]}
      onSubmit={() => {}}
      onClose={() => {}}
    />,
  );
  assert.match(html, /Saída de estoque/);
  assert.match(html, /Origem \(custódia\)/);
  assert.match(html, /Tipo de Saída/);
  assert.match(html, /Venda direta/);
});

test("sub-modal Entrada: quantidade + custo unitário; credita na Base (laranja registro-filho)", () => {
  const html = renderToString(<StockEntryModal item={makeItem()} onSubmit={() => {}} onClose={() => {}} />);
  assert.match(html, /Entrada de estoque/);
  assert.match(html, /credita na Base/);
  assert.match(html, /Quantidade/);
  assert.match(html, /Valor unitário \(R\$\)/);
});

// ── Erros honestos (409) + validação client espelhando o backend ─────────────────────────────
test("409 insufficient_balance é honesto (saldo da origem) e movement_already_reversed também", async () => {
  const { interpretCustodyMovementError, interpretStockReverseError } = await import("../src/modules/inventory/inventory.adapter");

  const insufficient = interpretCustodyMovementError({ status: 409, error: { reason: "insufficient_balance" } }, { currentSaldo: 5, unit: "un" });
  assert.equal(insufficient.reason, "insufficient_balance");
  assert.equal(insufficient.field, "quantidade");
  assert.match(insufficient.message, /insuficiente/i);

  const invalidCustody = interpretCustodyMovementError({ status: 422, error: { reason: "invalid_custody" } });
  assert.equal(invalidCustody.field, "custodyType");

  const reversed = interpretStockReverseError({ status: 409, error: { reason: "movement_already_reversed" } });
  assert.equal(reversed.reason, "movement_already_reversed");
  assert.match(reversed.message, /já foi estornado/);

  // Erro genérico preserva a mensagem.
  assert.equal(interpretStockReverseError(new Error("Falha de rede")).message, "Falha de rede");
});

test("validação client dos sub-modais espelha o backend (quantidade > 0; custódia obrigatória)", async () => {
  const { validateStockEntry, validateStockTransfer, validateStockExit } = await import("../src/modules/inventory/inventory.adapter");

  // Entrada exige quantidade > 0 e custo unitário.
  assert.ok(validateStockEntry({ quantidade: 0, unitCost: 5 }).some((e) => e.field === "quantidade"));
  assert.ok(validateStockEntry({ quantidade: 5 }).some((e) => e.field === "unitCost"));
  assert.equal(validateStockEntry({ quantidade: 5, unitCost: 3 }).length, 0);

  // Vincular exige custódia + referência.
  assert.ok(validateStockTransfer({ quantidade: 2, custodyType: "" }).some((e) => e.field === "custodyType"));
  assert.ok(validateStockTransfer({ quantidade: 2, custodyType: "professional" }).some((e) => e.field === "custodyOperatorProfileId"));
  assert.equal(validateStockTransfer({ quantidade: 2, custodyType: "vehicle", custodyVehicleId: "veh-1" }).length, 0);

  // Saída exige origem válida.
  assert.ok(validateStockExit({ quantidade: 0, custodyType: "base" }).some((e) => e.field === "quantidade"));
  assert.ok(validateStockExit({ quantidade: 2, custodyType: "professional" }).some((e) => e.field === "custodyOperatorProfileId"));
  assert.equal(validateStockExit({ quantidade: 2, custodyType: "base" }).length, 0);
});

test("razão imutável: buildMovementLedgerRows pareia transferência e detecta estorno", async () => {
  const { buildMovementLedgerRows } = await import("../src/modules/inventory/inventory.adapter");

  const rows = buildMovementLedgerRows([
    makeMovement({ id: "mv-1", type: "entrada", quantidadeSinalizada: 50, custodyType: "base" }),
    makeMovement({ id: "mv-2a", type: "link", quantidadeSinalizada: -8, custodyType: "base", transferGroupId: "grp-1" }),
    makeMovement({ id: "mv-2b", type: "link", quantidadeSinalizada: 8, custodyType: "professional", custodyOperatorProfileId: "op-1", transferGroupId: "grp-1" }),
    makeMovement({ id: "mv-3", type: "entrada", quantidadeSinalizada: -50, custodyType: "base", reversesMovementId: "mv-1" }),
  ]);

  // Par de transferência colapsa em UMA linha (2 legs → 1 linha Base→Profissional).
  const transferRow = rows.find((row) => row.transferGroupId === "grp-1");
  assert.ok(transferRow);
  assert.equal(transferRow?.fromCustodyType, "base");
  assert.equal(transferRow?.toCustodyType, "professional");

  // A entrada mv-1 aparece como JÁ estornada (existe compensatório apontando a ela).
  const entryRow = rows.find((row) => row.id === "mv-1");
  assert.equal(entryRow?.reversed, true);

  // O compensatório é sinalizado como estorno (não oferece novo estorno).
  const reversalRow = rows.find((row) => row.id === "mv-3");
  assert.equal(reversalRow?.isReversal, true);
});

test("rótulos PT-BR dos tipos e custódia (Vincular/Desvincular/Base/Profissional/Viatura)", async () => {
  const { getMovementTypeLabel, getCustodyTypeLabel, STOCK_MOVEMENT_TYPE_OPTIONS } = await import("../src/modules/inventory/inventory.adapter");

  assert.equal(getMovementTypeLabel("link"), "Vincular");
  assert.equal(getMovementTypeLabel("unlink"), "Desvincular");
  assert.equal(getCustodyTypeLabel("base"), "Base");
  assert.equal(getCustodyTypeLabel("professional"), "Profissional");
  assert.equal(getCustodyTypeLabel("vehicle"), "Viatura");
  // O seletor de tipo da aba Movimentações segue com os 4 tipos base (link/unlink têm sub-modais próprios).
  assert.equal(STOCK_MOVEMENT_TYPE_OPTIONS.length, 4);
});
