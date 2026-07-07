import assert from "node:assert/strict";
import test from "node:test";

test("service-catalog adapter normaliza envelope de lista com paginacao", async () => {
  const { adaptServiceCatalogResponse } = await import("../src/modules/registry/service-catalog/service-catalog.adapter");

  const data = adaptServiceCatalogResponse({
    data: {
      items: [
        {
          id: "svc-1",
          name: "Guincho leve até 20km",
          description: "Reboque de veículos de passeio",
          category: "Reboque",
          estimatedDurationMinutes: 90,
          basePrice: 150,
          status: "active",
          is_active: true,
          created_at: "2026-06-01T10:00:00.000Z",
          updated_at: "2026-06-02T10:00:00.000Z",
        },
        {
          id: "",
          name: "Sem identificador",
        },
      ],
      pagination: { limit: 20, offset: 0, total: 1 },
    },
  });

  assert.equal(data.items.length, 1);
  assert.equal(data.source, "api");
  assert.equal(data.items[0].name, "Guincho leve até 20km");
  assert.equal(data.items[0].category, "Reboque");
  assert.equal(data.items[0].estimatedDurationMinutes, 90);
  assert.equal(data.items[0].isActive, true);
  assert.equal(data.pagination.total, 1);
  assert.equal(data.pagination.limit, 20);
});

test("service-catalog adapter le basePrice numerico (inclui zero e string) e formata em BRL", async () => {
  const { adaptServiceItemResponse, formatBRL } = await import("../src/modules/registry/service-catalog/service-catalog.adapter");

  const paid = adaptServiceItemResponse({ data: { id: "svc-2", name: "Prancha", base_price: "1250.5" } });
  assert.equal(typeof paid?.basePrice, "number");
  assert.equal(paid?.basePrice, 1250.5);
  assert.match(formatBRL(paid?.basePrice ?? null), /1\.250,50/);

  const free = adaptServiceItemResponse({ data: { id: "svc-3", name: "Cortesia", basePrice: 0 } });
  assert.equal(free?.basePrice, 0);
  assert.match(formatBRL(0), /R\$\s?0,00/);

  // Sem preço → null → "—".
  const noPrice = adaptServiceItemResponse({ data: { id: "svc-4", name: "Sem preço" } });
  assert.equal(noPrice?.basePrice, null);
  assert.equal(formatBRL(noPrice?.basePrice ?? null), "—");
});

test("service-catalog status operacional (token->PT-BR) e distinto do chip de situacao (Ativo/Inativo)", async () => {
  const { SERVICE_STATUS_OPTIONS, getServiceStatusOptionLabel, getServiceStatusLabel } = await import(
    "../src/modules/registry/service-catalog/service-catalog.adapter"
  );

  // Status operacional: token técnico jamais exibido cru.
  assert.equal(getServiceStatusOptionLabel("active"), "Disponível");
  assert.equal(getServiceStatusOptionLabel("suspended"), "Suspenso");
  assert.equal(getServiceStatusOptionLabel("inactive"), "Descontinuado");
  assert.equal(getServiceStatusOptionLabel("qualquer-coisa"), "Disponível");
  assert.equal(SERVICE_STATUS_OPTIONS.length, 3);

  // Chip de situação (isActive) — serviço é MASCULINO — e distinto dos rótulos operacionais.
  assert.equal(getServiceStatusLabel(true), "Ativo");
  assert.equal(getServiceStatusLabel(false), "Inativo");
  assert.notEqual(getServiceStatusLabel(true), getServiceStatusOptionLabel("active"));
});

test("service-catalog formatDuration produz min / h e adapter retorna lista vazia com fallback", async () => {
  const { formatDuration, adaptServiceCatalogResponse } = await import("../src/modules/registry/service-catalog/service-catalog.adapter");

  assert.equal(formatDuration(45), "45 min");
  assert.equal(formatDuration(90), "1h30");
  assert.equal(formatDuration(120), "2h");
  assert.equal(formatDuration(null), "—");
  assert.equal(formatDuration(undefined), "—");

  const data = adaptServiceCatalogResponse({ data: { items: [], pagination: { limit: 20, offset: 0, total: 0 } } }, "fallback", "sem dados");
  assert.equal(data.items.length, 0);
  assert.equal(data.pagination.total, 0);
  assert.equal(data.source, "fallback");
  assert.equal(data.fallbackReason, "sem dados");
});

test("service-catalog valida nome obrigatorio, preco/duracao invalidos e filtra por situacao/busca", async () => {
  const { validateServiceItem, filterServiceItems } = await import("../src/modules/registry/service-catalog/service-catalog.adapter");

  const errors = validateServiceItem({ name: "", basePrice: -5, estimatedDurationMinutes: 12.5 });
  const fields = errors.map((error) => error.field);
  assert.ok(fields.includes("name"));
  assert.ok(fields.includes("basePrice"));
  assert.ok(fields.includes("estimatedDurationMinutes"));

  // basePrice 0 e duração 0 são válidos; sem preço/duração também.
  assert.equal(validateServiceItem({ name: "Guincho", basePrice: 0, estimatedDurationMinutes: 0 }).length, 0);
  assert.equal(validateServiceItem({ name: "Guincho" }).length, 0);

  const base = {
    description: null,
    category: null,
    estimatedDurationMinutes: null,
    basePrice: null,
    status: "active",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  };
  const items = [
    { ...base, id: "a", name: "Guincho leve", category: "Reboque", isActive: true },
    { ...base, id: "b", name: "Prancha pesada", category: "Transporte", isActive: false },
  ];

  assert.equal(filterServiceItems(items, { search: "", isActive: "inactive" }).length, 1);
  assert.equal(filterServiceItems(items, { search: "prancha", isActive: "all" })[0].id, "b");
  assert.equal(filterServiceItems(items, { search: "guincho", isActive: "inactive" }).length, 0);
});
