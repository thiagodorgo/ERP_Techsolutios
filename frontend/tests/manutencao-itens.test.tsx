import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { MaintenanceItemModal } from "../src/modules/fleet/maintenance/components/MaintenanceItemModal";
import { MaintenanceItemsSection } from "../src/modules/fleet/maintenance/components/MaintenanceItemsSection";
import type { MaintenanceOrder, MaintenanceOrderItem, MaintenanceOrderTotals } from "../src/modules/fleet/maintenance/maintenance-orders.types";

// Ω4C PR-06 — Manutenção (grade de itens, totais DERIVADOS do backend, sugestão de hodômetro, próxima
// manutenção, impressão). Recria o COMPORTAMENTO do AutEM no visual do ERP. Cobre: grade de itens render,
// lineTotal + totalizadores exibindo o DERIVADO do backend (nunca recalculado no cliente), rótulos PT-BR
// dos tipos, sub-modal (campos/validação qty·unit>0), campo próxima manutenção, sugestão de hodômetro (com
// e sem histórico → sem sugestão), §2.8 (nada sensível) e PayableToggle + Anexos INTOCADOS.

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

const ITEMS: MaintenanceOrderItem[] = [
  // lineTotal 250 é DELIBERADAMENTE ≠ 120×2=240 → prova que o grid exibe o DERIVADO do backend, não recalcula.
  { id: "it-1", itemType: "service", description: "Troca de óleo", unitValue: 120, quantity: 2, lineTotal: 250, notes: null },
  { id: "it-2", itemType: "product", description: "Filtro de ar", unitValue: 40.25, quantity: 2, lineTotal: 80.5, notes: null },
  { id: "it-3", itemType: "stock", description: "Parafuso M8", unitValue: 1, quantity: 5, lineTotal: 5, notes: null },
];

const TOTALS: MaintenanceOrderTotals = { totalServices: 250, totalProducts: 85.5, total: 335.5, itemCount: 3 };

function renderItemsSection(overrides: Partial<Parameters<typeof MaintenanceItemsSection>[0]> = {}): string {
  return renderToString(
    <MaintenanceItemsSection
      items={ITEMS}
      totals={TOTALS}
      canEdit
      onAdd={() => {}}
      onEditItem={() => {}}
      onRemoveItem={() => {}}
      onPrint={() => {}}
      {...overrides}
    />,
  );
}

function makeOrder(partial: Partial<MaintenanceOrder> & Pick<MaintenanceOrder, "id" | "vehicleId">): MaintenanceOrder {
  return {
    type: "preventiva",
    status: "agendada",
    scheduledFor: "2026-06-10T09:00:00.000Z",
    completedAt: null,
    cost: null,
    supplier: "Oficina Central",
    odometer: null,
    nextDueAt: "2026-09-10T00:00:00.000Z",
    description: "Troca de óleo",
    isActive: true,
    itemCount: 0,
    itemsTotal: 0,
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-01T10:00:00.000Z",
    ...partial,
  };
}

async function renderEditModal(): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { MaintenanceFormModal } = await import("../src/modules/fleet/maintenance/components/MaintenanceFormModal");

  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  seedContext(["maintenance_orders:read", "maintenance_orders:create", "maintenance_orders:update", "financial_titles:create", "financial_titles:update"]);

  const order = makeOrder({ id: "mo-1", vehicleId: "veh-1" });
  return renderToString(
    <MemoryRouter initialEntries={["/fleet/maintenance"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <MaintenanceFormModal
              order={order}
              vehicles={[]}
              context={{}}
              canUploadAttachments
              canDeleteAttachments
              canLaunchPayable
              canRemovePayable
              onClose={() => {}}
              onSaved={() => {}}
            />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

// ── Grade de itens: lineTotal + totalizadores DERIVADOS do backend ───────────
test("grade de itens: exibe o lineTotal DERIVADO do backend (nunca recalcula no cliente)", () => {
  const html = renderItemsSection();
  // lineTotal do backend (250) aparece; o recálculo ingênuo (120×2=240) NÃO aparece.
  assert.match(html, /250,00/);
  assert.doesNotMatch(html, /240,00/);
  // Colunas da grade.
  assert.match(html, /Descrição/);
  assert.match(html, /Valor total/);
  assert.match(html, /Troca de óleo/);
});

test("totalizadores: Total Serviços / Total Produtos / Total exibem o DERIVADO do backend", () => {
  const html = renderItemsSection();
  assert.match(html, /Total Serviços/);
  assert.match(html, /Total Produtos/);
  assert.match(html, /Total:/);
  assert.match(html, /250,00/); // totalServices
  assert.match(html, /85,50/); // totalProducts
  assert.match(html, /335,50/); // total
});

test("rótulos PT-BR dos tipos: Serviço / Produto / Estoque (nunca o token técnico)", () => {
  const html = renderItemsSection();
  assert.match(html, /Serviço/);
  assert.match(html, /Produto/);
  assert.match(html, /Estoque/);
  assert.doesNotMatch(html, />service</);
  assert.doesNotMatch(html, />product</);
  assert.doesNotMatch(html, />stock</);
});

test("grade vazia: mostra linha honesta 'Nenhum item cadastrado' (D-007)", () => {
  const html = renderItemsSection({ items: [], totals: { totalServices: 0, totalProducts: 0, total: 0, itemCount: 0 } });
  assert.match(html, /Nenhum item cadastrado/);
});

// ── Sub-modal "Cadastrar item" ───────────────────────────────────────────────
test("sub-modal: 'Cadastrar item' com Tipo/Item/Valor unitário/Quantidade/Valor total + Continuar cadastrando", () => {
  const html = renderToString(<MaintenanceItemModal item={null} onSubmit={() => {}} onClose={() => {}} />);
  assert.match(html, /Cadastrar item/);
  assert.match(html, /Tipo/);
  assert.match(html, /Item/);
  assert.match(html, /Valor unitário/);
  assert.match(html, /Quantidade/);
  assert.match(html, /Valor total/);
  assert.match(html, /Continuar cadastrando/);
  // Opções de tipo PT-BR.
  assert.match(html, /Serviço/);
  assert.match(html, /Produto/);
  assert.match(html, /Estoque/);
  assert.match(html, /Adicionar/);
});

test("sub-modal ESTOQUE: nota honesta de baixa de custódia DEFERIDA (D-007, sem baixa fabricada)", () => {
  const stockItem: MaintenanceOrderItem = { id: "it-9", itemType: "stock", description: "Parafuso", unitValue: 1, quantity: 5, lineTotal: 5, notes: null };
  const html = renderToString(<MaintenanceItemModal item={stockItem} onSubmit={() => {}} onClose={() => {}} />);
  assert.match(html, /a baixa na custódia entra na etapa de estoque/);
  // Editar item → sem checkbox "Continuar cadastrando".
  assert.doesNotMatch(html, /Continuar cadastrando/);
  assert.match(html, /Salvar item/);
});

test("sub-modal validação: unit_value e quantity devem ser > 0 (espelha 422 do backend)", async () => {
  const { validateMaintenanceItem } = await import("../src/modules/fleet/maintenance/maintenance-orders.adapter");

  const zeroUnit = validateMaintenanceItem({ itemType: "service", description: "Item", unitValue: 0, quantity: 1 });
  assert.ok(zeroUnit.some((error) => error.field === "unitValue"));

  const zeroQty = validateMaintenanceItem({ itemType: "product", description: "Item", unitValue: 10, quantity: 0 });
  assert.ok(zeroQty.some((error) => error.field === "quantity"));

  const noDescription = validateMaintenanceItem({ itemType: "service", description: "", unitValue: 10, quantity: 2 });
  assert.ok(noDescription.some((error) => error.field === "description"));

  const valid = validateMaintenanceItem({ itemType: "service", description: "Troca de óleo", unitValue: 120, quantity: 2 });
  assert.equal(valid.length, 0);
});

// ── Sugestão de hodômetro (com e sem histórico) ──────────────────────────────
test("sugestão de hodômetro: com histórico → valor + fonte; sem histórico → null (D-007, nunca inventa)", async () => {
  const { adaptOdometerSuggestion } = await import("../src/modules/fleet/maintenance/maintenance-orders.adapter");

  const withHistory = adaptOdometerSuggestion({ data: { suggestedOdometer: 15500, source: "fuel_log", recordedAt: null } });
  assert.ok(withHistory);
  assert.equal(withHistory?.suggestedOdometer, 15500);
  assert.equal(withHistory?.source, "fuel_log");

  const fromMaintenance = adaptOdometerSuggestion({ data: { suggestedOdometer: 20000, source: "maintenance_order" } });
  assert.equal(fromMaintenance?.source, "maintenance_order");

  // Sem histórico → sem sugestão (não inventa leitura).
  assert.equal(adaptOdometerSuggestion({ data: null }), null);
  assert.equal(adaptOdometerSuggestion(null), null);
  assert.equal(adaptOdometerSuggestion({ data: { source: "fuel_log" } }), null); // sem valor → null
});

// ── §2.8: DTO do item projeta só a allowlist ─────────────────────────────────
test("§2.8: adapter do item projeta lineTotal DERIVADO do backend e NUNCA tenant_id/maintenance_order_id", async () => {
  const { adaptMaintenanceOrderItems } = await import("../src/modules/fleet/maintenance/maintenance-orders.adapter");

  const items = adaptMaintenanceOrderItems({
    data: {
      items: [
        {
          id: "it-1",
          item_type: "product",
          description: "Filtro",
          unit_value: 40.25,
          quantity: 2,
          line_total: 80.5,
          tenant_id: "ten-secret",
          maintenance_order_id: "mo-secret",
          client_action_id: "cai-secret",
        },
        { id: "", description: "sem id" },
      ],
    },
  });

  assert.equal(items.length, 1); // linha sem id descartada
  const item = items[0];
  assert.equal(item.itemType, "product");
  assert.equal(item.lineTotal, 80.5); // DERIVADO do backend, projetado como veio
  const serialized = JSON.stringify(item);
  assert.doesNotMatch(serialized, /tenant_id|ten-secret|maintenance_order_id|mo-secret|client_action_id|cai-secret/i);
});

// ── Modal de edição: próxima manutenção + PayableToggle + Anexos INTOCADOS ────
test("modal edição: seção 'Próxima manutenção' + campo de data (por tempo; sem campo de KM — PR-16)", async () => {
  const html = await renderEditModal();
  assert.match(html, /Próxima manutenção/);
  assert.match(html, /Data da próxima manutenção/);
  // Por-KM é PR-16 — não há campo de hodômetro-alvo na próxima manutenção.
  assert.doesNotMatch(html, /hodômetro-alvo/i);
  // R-Ω4C-PR06 (escalada de privilégio FECHADA): a notificação é intrinsecamente PRIVADA — o campo de data
  // permanece, mas NÃO há seletor de visibilidade nem opção "Pública (toda a organização)" (esta ordem tem
  // nextDueAt preenchido, então o seletor renderizaria se ainda existisse). Broadcast tenant-wide exige
  // notifications:create pela rota do motor — não um editor de manutenção.
  assert.doesNotMatch(html, /Pública \(toda a organização\)/);
  assert.doesNotMatch(html, /Quem recebe a notificação/);
});

test("modal edição: PayableToggle e aba Arquivos seguem intactos + grade de itens presente", async () => {
  const html = await renderEditModal();
  // PayableToggle (PR-02) presente.
  assert.match(html, /Contas a pagar/);
  // Aba Arquivos (Anexos PR-01) presente.
  assert.match(html, /Arquivos/);
  // Seção de itens (grade) presente com estado vazio honesto (efeitos não rodam no SSR).
  assert.match(html, /Itens/);
  assert.match(html, /Nenhum item cadastrado/);
  // §3/§2.8 — sem termo técnico nem tenant na UI.
  assert.doesNotMatch(html, /Tenant/i);
  assert.doesNotMatch(html, /tenant_id/i);
});
