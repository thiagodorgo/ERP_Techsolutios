import assert from "node:assert/strict";
import test from "node:test";

test("tariffs adapter normaliza envelope {items, pagination} e aceita snake_case (sem wrapper data)", async () => {
  const { adaptTariffsResponse } = await import("../src/modules/registry/tariffs/tariffs.adapter");

  const data = adaptTariffsResponse({
    items: [
      {
        id: "tf-1",
        name: "Guincho 0–50 km",
        price_table_id: "pt-1",
        service_catalog_id: "svc-9",
        customer_id: null,
        unit_price: 150,
        currency: "brl",
        origin: "Tabela DNIT 2026",
        rule: "Até 50 km rodados",
        valid_from: "2026-01-01T00:00:00.000Z",
        valid_to: "2026-12-31T00:00:00.000Z",
        status: "active",
        is_active: true,
        created_at: "2026-06-01T10:00:00.000Z",
      },
      // Sem priceTableId → descartado (toda tarifa pertence a uma tabela).
      { id: "tf-x", name: "Órfã", unit_price: 10, origin: "X" },
    ],
    pagination: { limit: 20, offset: 0, total: 1 },
  });

  assert.equal(data.items.length, 1);
  assert.equal(data.source, "api");
  assert.equal(data.items[0].name, "Guincho 0–50 km");
  assert.equal(data.items[0].priceTableId, "pt-1");
  assert.equal(data.items[0].serviceCatalogId, "svc-9");
  assert.equal(data.items[0].customerId, null);
  assert.equal(data.items[0].unitPrice, 150);
  assert.equal(data.items[0].currency, "BRL"); // normaliza para maiúsculas
  assert.equal(data.items[0].origin, "Tabela DNIT 2026");
  assert.equal(data.items[0].isActive, true);
  assert.equal(data.pagination.total, 1);
});

test("tariffs adapter desembrulha item { data } e aplica defaults honestos (currency BRL, unitPrice 0)", async () => {
  const { adaptTariffResponse } = await import("../src/modules/registry/tariffs/tariffs.adapter");

  const item = adaptTariffResponse({
    data: { id: "tf-2", priceTableId: "pt-2", unitPrice: 89.9, origin: "Contrato PJ", serviceCatalogId: "svc-1", customerId: "cus-3" },
  });
  assert.equal(item?.id, "tf-2");
  assert.equal(item?.priceTableId, "pt-2");
  assert.equal(item?.unitPrice, 89.9);
  assert.equal(item?.currency, "BRL"); // default de moeda
  assert.equal(item?.customerId, "cus-3");

  // Sem id ou sem priceTableId → item inválido (nunca renderiza tarifa sem tabela).
  assert.equal(adaptTariffResponse({ data: { id: "tf-3", unitPrice: 1, origin: "Y" } }), null);
  assert.equal(adaptTariffResponse({ data: { priceTableId: "pt-9", unitPrice: 1, origin: "Y" } }), null);
});

test("tariffs formata valor unitário em BRL (2 casas), vigência e situação (Ativa/Inativa, feminino)", async () => {
  const { formatUnitPrice, formatValidity, getTariffActiveLabel, getTariffActiveTone } = await import(
    "../src/modules/registry/tariffs/tariffs.adapter"
  );

  // Valor unitário sempre em moeda com 2 casas; usa a moeda da própria tarifa.
  assert.match(formatUnitPrice(150, "BRL"), /R\$\s?150,00/);
  assert.match(formatUnitPrice(1234.5, "BRL"), /R\$\s?1\.234,50/);
  assert.equal(formatUnitPrice(null), "—");

  assert.equal(formatValidity(null, null), "Sem vigência definida");
  assert.match(formatValidity("2026-01-01T00:00:00.000Z", null), /A partir de 01\/01\/2026/);
  assert.match(formatValidity(null, "2026-12-31T00:00:00.000Z"), /Até 31\/12\/2026/);
  assert.match(formatValidity("2026-01-01T00:00:00.000Z", "2026-12-31T00:00:00.000Z"), /01\/01\/2026 – 31\/12\/2026/);

  // Situação (isActive) — tarifa é FEMININO.
  assert.equal(getTariffActiveLabel(true), "Ativa");
  assert.equal(getTariffActiveLabel(false), "Inativa");
  assert.equal(getTariffActiveTone(true), "success");
  assert.equal(getTariffActiveTone(false), "default");
});

test("tariffs valida obrigatórios (tabela/valor/origem), 2 casas decimais, vigência e busca por campos da tarifa", async () => {
  const { validateTariff, filterTariffs } = await import("../src/modules/registry/tariffs/tariffs.adapter");

  const errors = validateTariff({ priceTableId: "", unitPrice: Number.NaN, origin: "", validFrom: "2026-12-31", validTo: "2026-01-01" });
  const fields = errors.map((error) => error.field);
  assert.ok(fields.includes("priceTableId"));
  assert.ok(fields.includes("unitPrice"));
  assert.ok(fields.includes("origin"));
  assert.ok(fields.includes("validTo")); // fim anterior ao início

  // Valor negativo e com mais de 2 casas decimais são rejeitados.
  assert.ok(validateTariff({ priceTableId: "pt-1", unitPrice: -1, origin: "X" }).some((e) => e.field === "unitPrice"));
  assert.ok(validateTariff({ priceTableId: "pt-1", unitPrice: 1.239, origin: "X" }).some((e) => e.field === "unitPrice"));

  // Payload mínimo válido (tabela + valor 0 permitido + origem).
  assert.equal(validateTariff({ priceTableId: "pt-1", unitPrice: 0, origin: "Cortesia" }).length, 0);
  // Moeda de 3 letras válida; opcionais preenchidos.
  assert.equal(validateTariff({ priceTableId: "pt-1", unitPrice: 99.9, origin: "Contrato", currency: "usd", rule: "Fim de semana" }).length, 0);

  const base = {
    priceTableId: "pt-1",
    serviceCatalogId: null,
    customerId: null,
    currency: "BRL",
    rule: null,
    validFrom: null,
    validTo: null,
    status: "active",
    createdAt: "2026-06-01T00:00:00.000Z",
  };
  const items = [
    { ...base, id: "a", name: "Guincho urbano", unitPrice: 150, origin: "Tabela DNIT", isActive: true },
    { ...base, id: "b", name: "Guincho rodoviário", unitPrice: 320, origin: "Contrato Sul", isActive: false, rule: "Acima de 100 km" },
  ];

  assert.equal(filterTariffs(items, { search: "", isActive: "inactive" }).length, 1);
  assert.equal(filterTariffs(items, { search: "dnit", isActive: "all" })[0].id, "a");
  assert.equal(filterTariffs(items, { search: "100 km", isActive: "all" })[0].id, "b"); // busca cobre a regra
  assert.equal(filterTariffs(items, { search: "urbano", isActive: "inactive" }).length, 0);
});

test("tariffs nome de exibição cai na origem quando não há nome próprio; adapter retorna fallback vazio", async () => {
  const { getTariffDisplayName, adaptTariffsResponse } = await import("../src/modules/registry/tariffs/tariffs.adapter");

  assert.equal(getTariffDisplayName({ name: "Guincho VIP", origin: "Tabela X" }), "Guincho VIP");
  assert.equal(getTariffDisplayName({ name: null, origin: "Tabela X" }), "Tabela X");
  assert.equal(getTariffDisplayName({ name: "  ", origin: "  " }), "Tarifa sem nome");

  const data = adaptTariffsResponse({ items: [], pagination: { limit: 20, offset: 0, total: 0 } }, "fallback", "sem dados");
  assert.equal(data.items.length, 0);
  assert.equal(data.source, "fallback");
  assert.equal(data.fallbackReason, "sem dados");
});
