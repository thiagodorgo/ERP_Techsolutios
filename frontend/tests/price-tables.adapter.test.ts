import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

test("price-tables adapter normaliza envelope de lista {items, pagination} (sem wrapper data)", async () => {
  const { adaptPriceTablesResponse } = await import("../src/modules/registry/price-tables/price-tables.adapter");

  // O backend responde a lista como { items, pagination } direto (sem { data }).
  const data = adaptPriceTablesResponse({
    items: [
      {
        id: "pt-1",
        name: "Tabela Padrão 2026",
        currency: "brl",
        version: 2,
        validFrom: "2026-01-01T00:00:00.000Z",
        validTo: "2026-12-31T00:00:00.000Z",
        status: "published",
        is_active: true,
        created_at: "2026-06-01T10:00:00.000Z",
      },
      { id: "", name: "Sem identificador" },
    ],
    pagination: { limit: 20, offset: 0, total: 1 },
  });

  assert.equal(data.items.length, 1);
  assert.equal(data.source, "api");
  assert.equal(data.items[0].name, "Tabela Padrão 2026");
  assert.equal(data.items[0].currency, "BRL"); // normaliza para maiúsculas
  assert.equal(data.items[0].version, 2);
  assert.equal(data.items[0].status, "published");
  assert.equal(data.items[0].isActive, true);
  assert.equal(data.pagination.total, 1);
  assert.equal(data.pagination.limit, 20);
});

test("price-tables adapter desembrulha item { data } e status desconhecido cai em rascunho", async () => {
  const { adaptPriceTableResponse } = await import("../src/modules/registry/price-tables/price-tables.adapter");

  const item = adaptPriceTableResponse({
    data: { id: "pt-2", name: "Guincho Regional", currency: "BRL", version: 1, status: "draft", description: "Faixa 0-50km" },
  });
  assert.equal(item?.name, "Guincho Regional");
  assert.equal(item?.status, "draft");
  assert.equal(item?.description, "Faixa 0-50km");
  assert.equal(item?.version, 1);

  // Status técnico desconhecido nunca vaza cru → normaliza para "draft".
  const weird = adaptPriceTableResponse({ data: { id: "pt-3", name: "X", status: "qualquer-coisa" } });
  assert.equal(weird?.status, "draft");
  assert.equal(weird?.currency, "BRL"); // default de moeda
});

test("price-tables status de publicacao (token->PT-BR) e distinto da situacao (Ativa/Inativa, feminino)", async () => {
  const { getPriceTableStatusLabel, getPriceTableStatusTone, getPriceTableActiveLabel } = await import(
    "../src/modules/registry/price-tables/price-tables.adapter"
  );

  assert.equal(getPriceTableStatusLabel("draft"), "Rascunho");
  assert.equal(getPriceTableStatusLabel("published"), "Publicada");
  assert.equal(getPriceTableStatusLabel("archived"), "Arquivada");
  assert.equal(getPriceTableStatusLabel(undefined), "Rascunho");

  assert.equal(getPriceTableStatusTone("published"), "success");
  assert.equal(getPriceTableStatusTone("archived"), "default");
  assert.equal(getPriceTableStatusTone("draft"), "pending");

  // Situação (isActive) — tabela é FEMININO — e distinta do status de publicação.
  assert.equal(getPriceTableActiveLabel(true), "Ativa");
  assert.equal(getPriceTableActiveLabel(false), "Inativa");
  assert.notEqual(getPriceTableActiveLabel(true), getPriceTableStatusLabel("published"));
});

test("price-tables máquina de estado só oferece transições válidas (draft→[publicar,arquivar], published→[arquivar], archived→[])", async () => {
  const { getPriceTableStatusActions } = await import("../src/modules/registry/price-tables/price-tables.adapter");

  const fromDraft = getPriceTableStatusActions("draft");
  assert.deepEqual(fromDraft.map((a) => a.target), ["published", "archived"]);
  assert.equal(fromDraft.find((a) => a.target === "published")?.label, "Publicar");
  assert.equal(fromDraft.find((a) => a.target === "archived")?.label, "Arquivar");

  const fromPublished = getPriceTableStatusActions("published");
  assert.deepEqual(fromPublished.map((a) => a.target), ["archived"]);

  const fromArchived = getPriceTableStatusActions("archived");
  assert.equal(fromArchived.length, 0);

  // Status inválido é tratado como rascunho (nunca oferece transição fantasma).
  assert.deepEqual(getPriceTableStatusActions("nada").map((a) => a.target), ["published", "archived"]);
});

test("price-tables formata vigência/moeda/versão e adapter retorna lista vazia com fallback", async () => {
  const { formatValidity, formatCurrency, formatVersion, adaptPriceTablesResponse } = await import(
    "../src/modules/registry/price-tables/price-tables.adapter"
  );

  assert.equal(formatCurrency("brl"), "BRL");
  assert.equal(formatCurrency(null), "—");
  assert.equal(formatVersion(3), "v3");
  assert.equal(formatVersion(null), "—");

  assert.equal(formatValidity(null, null), "Sem vigência definida");
  assert.match(formatValidity("2026-01-01T00:00:00.000Z", null), /A partir de 01\/01\/2026/);
  assert.match(formatValidity(null, "2026-12-31T00:00:00.000Z"), /Até 31\/12\/2026/);
  assert.match(formatValidity("2026-01-01T00:00:00.000Z", "2026-12-31T00:00:00.000Z"), /01\/01\/2026 – 31\/12\/2026/);

  const data = adaptPriceTablesResponse({ items: [], pagination: { limit: 20, offset: 0, total: 0 } }, "fallback", "sem dados");
  assert.equal(data.items.length, 0);
  assert.equal(data.pagination.total, 0);
  assert.equal(data.source, "fallback");
  assert.equal(data.fallbackReason, "sem dados");
});

test("price-tables valida nome/moeda/versão/vigência e filtra por situação/busca", async () => {
  const { validatePriceTable, filterPriceTables } = await import("../src/modules/registry/price-tables/price-tables.adapter");

  const errors = validatePriceTable({ name: "", currency: "BR", version: 0, validFrom: "2026-12-31", validTo: "2026-01-01" });
  const fields = errors.map((error) => error.field);
  assert.ok(fields.includes("name"));
  assert.ok(fields.includes("currency"));
  assert.ok(fields.includes("version"));
  assert.ok(fields.includes("validTo")); // fim anterior ao início

  // Payload mínimo válido (só nome).
  assert.equal(validatePriceTable({ name: "Tabela A" }).length, 0);
  // Moeda de 3 letras e versão dentro do intervalo são válidas.
  assert.equal(validatePriceTable({ name: "Tabela A", currency: "usd", version: 5 }).length, 0);

  const base = {
    description: null,
    currency: "BRL",
    itemCount: 0,
    minUnitPrice: null,
    maxUnitPrice: null,
    version: 1,
    validFrom: null,
    validTo: null,
    createdAt: "2026-06-01T00:00:00.000Z",
  };
  const items = [
    { ...base, id: "a", name: "Tabela Padrão", status: "published" as const, isActive: true },
    { ...base, id: "b", name: "Tabela Guincho", status: "draft" as const, isActive: false },
  ];

  assert.equal(filterPriceTables(items, { search: "", isActive: "inactive" }).length, 1);
  assert.equal(filterPriceTables(items, { search: "guincho", isActive: "all" })[0].id, "b");
  assert.equal(filterPriceTables(items, { search: "padrão", isActive: "inactive" }).length, 0);
  // Busca também casa o rótulo PT-BR do status de publicação.
  assert.equal(filterPriceTables(items, { search: "rascunho", isActive: "all" })[0].id, "b");
});

// ── Agregado dos itens na tela ───────────────────────────────────────────────────────────────────────────
// O defeito: a tela dizia a MOEDA ("BRL") e nunca um NÚMERO. Estes testes caem se o agregado sumir do
// payload, do adapter ou da coluna.

test("price-tables adapter lê o agregado dos itens (camelCase e snake_case) sem inventar número", async () => {
  const { adaptPriceTablesResponse } = await import("../src/modules/registry/price-tables/price-tables.adapter");

  const data = adaptPriceTablesResponse({
    items: [
      { id: "pt-1", name: "Com faixa", currency: "BRL", itemCount: 11, minUnitPrice: 120, maxUnitPrice: 3400 },
      { id: "pt-2", name: "Snake case", currency: "BRL", item_count: 1, min_unit_price: 250, max_unit_price: 250 },
      { id: "pt-3", name: "Sem itens", currency: "BRL", itemCount: 0, minUnitPrice: null, maxUnitPrice: null },
      { id: "pt-4", name: "Backend antigo", currency: "BRL" },
    ],
    pagination: { limit: 20, offset: 0, total: 4 },
  });

  assert.equal(data.items[0].itemCount, 11);
  assert.equal(data.items[0].minUnitPrice, 120);
  assert.equal(data.items[0].maxUnitPrice, 3400);

  assert.equal(data.items[1].itemCount, 1);
  assert.equal(data.items[1].minUnitPrice, 250);

  assert.equal(data.items[2].itemCount, 0);
  assert.equal(data.items[2].minUnitPrice, null);
  assert.equal(data.items[2].maxUnitPrice, null);

  // Payload sem os campos → 0/null. A UI não inventa contagem nem faixa que o backend não afirmou.
  assert.equal(data.items[3].itemCount, 0);
  assert.equal(data.items[3].minUnitPrice, null);
});

test("price-tables formata 'N itens · faixa' e mostra vazio honesto — nunca R$ 0", async () => {
  const { formatTariffRange, formatItemCount } = await import(
    "../src/modules/registry/price-tables/price-tables.adapter"
  );

  assert.equal(formatItemCount(11), "11 itens");
  assert.equal(formatItemCount(1), "1 item"); // singular PT-BR
  assert.equal(formatItemCount(0), null);

  const faixa = formatTariffRange({ itemCount: 11, minUnitPrice: 120, maxUnitPrice: 3400, currency: "BRL" });
  assert.match(faixa, /^11 itens · R\$\s?120,00 – R\$\s?3\.400,00$/);

  // Um único valor não finge intervalo.
  assert.match(formatTariffRange({ itemCount: 1, minUnitPrice: 250, maxUnitPrice: 250, currency: "BRL" }), /^1 item · R\$\s?250,00$/);

  // Faixa invertida por dado ruim continua legível (piso à esquerda).
  assert.match(formatTariffRange({ itemCount: 2, minUnitPrice: 900, maxUnitPrice: 100, currency: "BRL" }), /R\$\s?100,00 – R\$\s?900,00/);

  // Moeda da própria tabela.
  assert.match(formatTariffRange({ itemCount: 2, minUnitPrice: 10, maxUnitPrice: 20, currency: "USD" }), /US\$|USD/);

  // Sem item: vazio honesto. NUNCA "R$ 0,00" — zero não é preço, é ausência de preço.
  const vazio = formatTariffRange({ itemCount: 0, minUnitPrice: null, maxUnitPrice: null, currency: "BRL" });
  assert.equal(vazio, "—");
  assert.doesNotMatch(vazio, /R\$|0,00/);

  // Contagem sem faixa conhecida → só a contagem (não fabrica valor).
  assert.equal(formatTariffRange({ itemCount: 4, minUnitPrice: null, maxUnitPrice: null, currency: "BRL" }), "4 itens");
});

test("tela Tabelas de Valores tem a coluna de valores ligada ao agregado", () => {
  // Guarda de tela: a lista precisa EXIBIR o agregado, não só recebê-lo. Se a coluna sair, isto cai.
  const page = fs.readFileSync(
    path.join(process.cwd(), "src/modules/registry/price-tables/pages/TabelasValoresPage.tsx"),
    "utf8",
  );
  assert.match(page, /formatTariffRange/, "a coluna precisa usar o formatador do agregado");
  assert.match(page, /header:\s*"Valores"/, "a lista precisa ter a coluna de valores");
  assert.match(page, /render:\s*\(table\)\s*=>\s*<strong>\{formatTariffRange\(table\)\}<\/strong>/);

  // O formatador de dinheiro é o do módulo irmão de Tarifas (nada de segundo formatador divergente).
  const adapter = fs.readFileSync(
    path.join(process.cwd(), "src/modules/registry/price-tables/price-tables.adapter.ts"),
    "utf8",
  );
  assert.match(adapter, /import \{ formatUnitPrice \} from "\.\.\/tariffs\/tariffs\.adapter";/);
});
