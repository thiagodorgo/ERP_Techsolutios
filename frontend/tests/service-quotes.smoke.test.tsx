import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

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

async function renderOrcamentos(permissions: readonly string[]): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { OrcamentosPage } = await import("../src/modules/registry/service-quotes/pages/OrcamentosPage");

  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  seedContext(permissions);

  return renderToString(
    <MemoryRouter initialEntries={["/operations/quotes"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <OrcamentosPage />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("orçamentos renderiza cabeçalho, filtro de situação, ação de criar e estado vazio (D-007)", async () => {
  const html = await renderOrcamentos(["service_quotes:read", "service_quotes:create", "service_quotes:update"]);

  assert.match(html, /Orçamentos/);
  assert.match(html, /Preço congelado a partir da Tarifa vigente/);
  assert.match(html, /Novo orçamento/);
  assert.match(html, /Nenhum orçamento encontrado/);
  assert.match(html, /Rascunho/);
  assert.match(html, /Aprovado/);
  // Linguagem PT-BR de negócio: nunca "tenant".
  assert.doesNotMatch(html, /\btenant\b/i);
});

test("orçamentos esconde 'Novo orçamento' sem permissão de criação", async () => {
  const html = await renderOrcamentos(["service_quotes:read"]);
  assert.match(html, /Orçamentos/);
  assert.match(html, /Nenhum orçamento encontrado/);
  assert.doesNotMatch(html, /Novo orçamento/);
});

test("modal de criação mostra origem do preço (Tarifa/Manual) e serviço obrigatório", async () => {
  const { ServiceQuoteFormModal } = await import("../src/modules/registry/service-quotes/components/ServiceQuoteFormModal");
  const html = renderToString(<ServiceQuoteFormModal context={{}} onClose={() => undefined} onSaved={() => undefined} />);
  assert.match(html, /Novo orçamento/);
  assert.match(html, /Origem do preço/);
  assert.match(html, /Tarifa publicada/);
  assert.match(html, /Manual/);
  assert.match(html, /Serviço/);
});

// Veto cognicao-visual (ciclo 1) — serviço/OS/cliente viram SELECTS de rótulo humano (mata o input de
// UUID). Aqui o modal recebe as opções e renderiza o NOME do serviço, não o id.
test("modal usa selects de referência com rótulo humano (não UUID)", async () => {
  const { ServiceQuoteFormModal } = await import("../src/modules/registry/service-quotes/components/ServiceQuoteFormModal");
  const html = renderToString(
    <ServiceQuoteFormModal
      context={{}}
      services={[{ id: "svc-uuid-1", label: "Guincho Pesado" }]}
      customers={[{ id: "cus-uuid-1", label: "Transportadora Alfa" }]}
      workOrders={[{ id: "wo-uuid-1", label: "OS-2026-001" }]}
      onClose={() => undefined}
      onSaved={() => undefined}
    />,
  );
  const selectCount = (html.match(/<select/g) ?? []).length;
  assert.equal(selectCount >= 4, true); // serviço + OS + cliente + origem do preço
  assert.match(html, /Guincho Pesado/);
  assert.match(html, /Transportadora Alfa/);
  assert.match(html, /OS-2026-001/);
});

// ---------- adapter (formatação + validação + B1) ----------

test("formatMoney emite valor COM moeda (lição B1)", async () => {
  const { formatMoney } = await import("../src/modules/registry/service-quotes/service-quotes.adapter");
  const out = formatMoney(1234.5, "BRL");
  assert.match(out, /1\.234,50/);
  assert.match(out, /R\$/);
});

test("getServiceQuoteStatusLabel/Tone traduz e colore por situação", async () => {
  const { getServiceQuoteStatusLabel, getServiceQuoteStatusTone } = await import(
    "../src/modules/registry/service-quotes/service-quotes.adapter"
  );
  assert.equal(getServiceQuoteStatusLabel("draft"), "Rascunho");
  assert.equal(getServiceQuoteStatusLabel("approved"), "Aprovado");
  assert.equal(getServiceQuoteStatusLabel("rejected"), "Rejeitado");
  assert.equal(getServiceQuoteStatusLabel("void"), "Anulado");
  assert.equal(getServiceQuoteStatusTone("approved"), "success");
  assert.equal(getServiceQuoteStatusTone("rejected"), "danger");
  assert.equal(getServiceQuoteStatusTone("void"), "default");
  assert.equal(getServiceQuoteStatusTone("draft"), "info");
});

test("getServiceQuotePriceSourceLabel traduz origem", async () => {
  const { getServiceQuotePriceSourceLabel } = await import("../src/modules/registry/service-quotes/service-quotes.adapter");
  assert.equal(getServiceQuotePriceSourceLabel("tariff"), "Tarifa");
  assert.equal(getServiceQuotePriceSourceLabel("manual"), "Manual");
});

test("validateServiceQuote exige serviço", async () => {
  const { validateServiceQuote } = await import("../src/modules/registry/service-quotes/service-quotes.adapter");
  const errors = validateServiceQuote({ serviceCatalogId: "", priceSource: "tariff" });
  assert.equal(errors.some((e) => e.field === "serviceCatalogId"), true);
});

test("validateServiceQuote exige valor unitário no preço manual", async () => {
  const { validateServiceQuote } = await import("../src/modules/registry/service-quotes/service-quotes.adapter");
  const missing = validateServiceQuote({ serviceCatalogId: "svc", priceSource: "manual" });
  assert.equal(missing.some((e) => e.field === "unitPrice"), true);
  const ok = validateServiceQuote({ serviceCatalogId: "svc", priceSource: "manual", unitPrice: 10 });
  assert.equal(ok.some((e) => e.field === "unitPrice"), false);
});

test("validateServiceQuote rejeita quantidade <= 0", async () => {
  const { validateServiceQuote } = await import("../src/modules/registry/service-quotes/service-quotes.adapter");
  const errors = validateServiceQuote({ serviceCatalogId: "svc", priceSource: "tariff", quantity: 0 });
  assert.equal(errors.some((e) => e.field === "quantity"), true);
});

test("adaptServiceQuotesResponse aceita snake_case e emite DTO completo (B1)", async () => {
  const { adaptServiceQuotesResponse } = await import("../src/modules/registry/service-quotes/service-quotes.adapter");
  const data = adaptServiceQuotesResponse({
    items: [
      {
        id: "q1",
        work_order_id: "wo1",
        customer_id: "c1",
        service_catalog_id: "svc1",
        source_tariff_id: "t1",
        frozen_unit_price: 250,
        frozen_currency: "BRL",
        quantity: 2,
        frozen_total: 500,
        frozen_at: "2026-07-13T00:00:00.000Z",
        price_source: "tariff",
        status: "draft",
        is_active: true,
        created_at: "2026-07-13T00:00:00.000Z",
      },
    ],
    pagination: { limit: 20, offset: 0, total: 1 },
  });
  assert.equal(data.items.length, 1);
  const row = data.items[0]!;
  assert.equal(row.frozenUnitPrice, 250);
  assert.equal(row.frozenCurrency, "BRL");
  assert.equal(row.frozenTotal, 500);
  assert.equal(row.workOrderId, "wo1");
  assert.equal(row.customerId, "c1");
  assert.equal(row.priceSource, "tariff");
});

test("filterServiceQuotes filtra por situação de cadastro (isActive) e por busca", async () => {
  const { filterServiceQuotes } = await import("../src/modules/registry/service-quotes/service-quotes.adapter");
  const base = {
    id: "q",
    workOrderId: "wo-123",
    customerId: null,
    serviceCatalogId: "svc-abc",
    sourceTariffId: null,
    frozenUnitPrice: 10,
    frozenCurrency: "BRL",
    quantity: 1,
    frozenTotal: 10,
    frozenAt: "2026-07-13T00:00:00.000Z",
    priceSource: "tariff" as const,
    status: "draft" as const,
    isActive: true,
    createdAt: "2026-07-13T00:00:00.000Z",
  };
  const items = [base, { ...base, id: "q2", isActive: false, workOrderId: "wo-999" }];
  assert.equal(filterServiceQuotes(items, { search: "", isActive: "active" }).length, 1);
  assert.equal(filterServiceQuotes(items, { search: "", isActive: "inactive" }).length, 1);
  assert.equal(filterServiceQuotes(items, { search: "wo-999", isActive: "all" }).length, 1);
});

test("filterServiceQuotes casa o RÓTULO resolvido (nome do serviço), não só o UUID", async () => {
  const { filterServiceQuotes } = await import("../src/modules/registry/service-quotes/service-quotes.adapter");
  const item = {
    id: "q",
    workOrderId: null,
    customerId: null,
    serviceCatalogId: "svc-uuid-xyz",
    sourceTariffId: null,
    frozenUnitPrice: 10,
    frozenCurrency: "BRL",
    quantity: 1,
    frozenTotal: 10,
    frozenAt: "2026-07-13T00:00:00.000Z",
    priceSource: "tariff" as const,
    status: "draft" as const,
    isActive: true,
    createdAt: "2026-07-13T00:00:00.000Z",
  };
  const resolve = (q: typeof item) => (q.serviceCatalogId === "svc-uuid-xyz" ? ["Guincho Pesado"] : []);
  // sem resolver: buscar "guincho" não acha (só casa o UUID)
  assert.equal(filterServiceQuotes([item], { search: "guincho", isActive: "all" }).length, 0);
  // com resolver: casa o nome
  assert.equal(filterServiceQuotes([item], { search: "guincho", isActive: "all" }, resolve).length, 1);
});

test("shortRef encurta UUID e formatQuantity usa pt-BR", async () => {
  const { shortRef, formatQuantity } = await import("../src/modules/registry/service-quotes/service-quotes.adapter");
  assert.equal(shortRef("1234567890abcdef"), "12345678…");
  assert.equal(shortRef(null), "—");
  assert.equal(formatQuantity(2), "2");
});
