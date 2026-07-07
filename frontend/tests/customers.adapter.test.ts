import assert from "node:assert/strict";
import test from "node:test";

test("customers adapter normaliza envelope de lista com paginacao", async () => {
  const { adaptCustomersResponse } = await import("../src/modules/registry/customers/customers.adapter");

  const data = adaptCustomersResponse({
    data: {
      items: [
        {
          id: "cus-1",
          name: "Transportes Aurora",
          document: "12345678000190",
          phone: "1133224455",
          email: "contato@aurora.example",
          city: "São Paulo",
          state: "SP",
          zip_code: "01001000",
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
  assert.equal(data.items[0].name, "Transportes Aurora");
  assert.equal(data.items[0].zipCode, "01001000");
  assert.equal(data.items[0].isActive, true);
  assert.equal(data.pagination.total, 1);
  assert.equal(data.pagination.limit, 20);
});

test("customers adapter normaliza recurso unico e tolera campos ausentes", async () => {
  const { adaptCustomerResponse } = await import("../src/modules/registry/customers/customers.adapter");

  const customer = adaptCustomerResponse({ data: { id: "cus-2", name: "Cliente Mínimo" } });

  assert.ok(customer);
  assert.equal(customer?.id, "cus-2");
  assert.equal(customer?.name, "Cliente Mínimo");
  assert.equal(customer?.document, null);
  assert.equal(customer?.phone, null);
  assert.equal(customer?.city, null);
  // isActive default true quando o backend nao envia o campo.
  assert.equal(customer?.isActive, true);
  assert.equal(typeof customer?.createdAt, "string");
});

test("customers adapter mapeia isActive=false e camelCase", async () => {
  const { adaptCustomerResponse } = await import("../src/modules/registry/customers/customers.adapter");

  const customer = adaptCustomerResponse({
    data: { id: "cus-3", name: "Cliente Inativo", isActive: false, zipCode: "22000000" },
  });

  assert.equal(customer?.isActive, false);
  assert.equal(customer?.zipCode, "22000000");
});

test("customers adapter retorna lista vazia quando nao ha itens", async () => {
  const { adaptCustomersResponse } = await import("../src/modules/registry/customers/customers.adapter");

  const data = adaptCustomersResponse({ data: { items: [], pagination: { limit: 20, offset: 0, total: 0 } } }, "fallback", "sem dados");

  assert.equal(data.items.length, 0);
  assert.equal(data.pagination.total, 0);
  assert.equal(data.source, "fallback");
  assert.equal(data.fallbackReason, "sem dados");
});

test("customers adapter valida obrigatorio, limites e filtra por situacao/busca", async () => {
  const { validateCustomer, filterCustomers } = await import("../src/modules/registry/customers/customers.adapter");

  const errors = validateCustomer({ name: "", document: "123", state: "SPX", email: "invalido" });
  const fields = errors.map((error) => error.field);
  assert.ok(fields.includes("name"));
  assert.ok(fields.includes("document"));
  assert.ok(fields.includes("state"));
  assert.ok(fields.includes("email"));

  assert.equal(validateCustomer({ name: "Cliente Válido" }).length, 0);

  const base = {
    document: null,
    phone: null,
    email: null,
    address: null,
    city: null,
    state: null,
    zipCode: null,
    notes: null,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  };
  const items = [
    { ...base, id: "a", name: "Alfa Logística", city: "Campinas", state: "SP", isActive: true },
    { ...base, id: "b", name: "Beta Serviços", city: "Recife", state: "PE", isActive: false },
  ];

  assert.equal(filterCustomers(items, { search: "", isActive: "inactive" }).length, 1);
  assert.equal(filterCustomers(items, { search: "campinas", isActive: "all" })[0].id, "a");
  assert.equal(filterCustomers(items, { search: "beta", isActive: "active" }).length, 0);
});
