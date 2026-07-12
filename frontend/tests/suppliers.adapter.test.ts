import assert from "node:assert/strict";
import test from "node:test";

test("suppliers adapter normaliza envelope {items, pagination} e aceita snake_case (sem wrapper data)", async () => {
  const { adaptSuppliersResponse } = await import("../src/modules/registry/suppliers/suppliers.adapter");

  const data = adaptSuppliersResponse({
    items: [
      {
        id: "sup-1",
        name: "Auto Peças Silva",
        document: "12.345.678/0001-90",
        email: "contato@silva.example",
        phone: "(11) 99999-0000",
        address: "Rua das Oficinas, 100",
        category: "Peças",
        notes: null,
        status: "active",
        is_active: true,
        created_at: "2026-06-01T10:00:00.000Z",
      },
      // Sem nome → descartado (linha sem título nunca renderiza).
      { id: "sup-x", document: "000", is_active: true },
    ],
    pagination: { limit: 20, offset: 0, total: 1 },
  });

  assert.equal(data.items.length, 1);
  assert.equal(data.source, "api");
  assert.equal(data.items[0].name, "Auto Peças Silva");
  assert.equal(data.items[0].document, "12.345.678/0001-90");
  assert.equal(data.items[0].category, "Peças");
  assert.equal(data.items[0].isActive, true);
  assert.equal(data.pagination.total, 1);
});

test("suppliers adapter desembrulha item { data } e aplica defaults honestos (campos nulos, isActive true)", async () => {
  const { adaptSupplierResponse } = await import("../src/modules/registry/suppliers/suppliers.adapter");

  const item = adaptSupplierResponse({ data: { id: "sup-2", name: "Combustíveis Norte" } });
  assert.equal(item?.id, "sup-2");
  assert.equal(item?.document, null);
  assert.equal(item?.email, null);
  assert.equal(item?.phone, null);
  assert.equal(item?.category, null);
  assert.equal(item?.isActive, true);

  // Sem id ou sem nome → item inválido.
  assert.equal(adaptSupplierResponse({ data: { name: "Sem id" } }), null);
  assert.equal(adaptSupplierResponse({ data: { id: "sup-3" } }), null);
});

test("suppliers rotula a situação em PT-BR MASCULINO (Ativo/Inativo) e formata o contato", async () => {
  const { getSupplierStatusLabel, getSupplierStatusTone, formatSupplierContact, formatSupplierDate } = await import(
    "../src/modules/registry/suppliers/suppliers.adapter"
  );

  // Fornecedor é MASCULINO — mesma convenção de cliente/serviço.
  assert.equal(getSupplierStatusLabel(true), "Ativo");
  assert.equal(getSupplierStatusLabel(false), "Inativo");
  assert.equal(getSupplierStatusTone(true), "success");
  assert.equal(getSupplierStatusTone(false), "default");

  // Contato em uma célula: e-mail · telefone, com fallbacks honestos.
  assert.equal(formatSupplierContact({ email: "a@b.example", phone: "(11) 90000-0000" }), "a@b.example · (11) 90000-0000");
  assert.equal(formatSupplierContact({ email: "a@b.example", phone: null }), "a@b.example");
  assert.equal(formatSupplierContact({ email: null, phone: "(11) 90000-0000" }), "(11) 90000-0000");
  assert.equal(formatSupplierContact({ email: null, phone: null }), "—");

  assert.match(formatSupplierDate("2026-06-01T10:00:00.000Z"), /\d{2}\/\d{2}\/2026/);
  assert.equal(formatSupplierDate(null), "—");
});

test("suppliers valida nome obrigatório, documento, e-mail, telefone e limites de categoria/observações", async () => {
  const { validateSupplier } = await import("../src/modules/registry/suppliers/suppliers.adapter");

  const errors = validateSupplier({ name: "", document: "123", email: "invalido", phone: "12" });
  const fields = errors.map((error) => error.field);
  assert.ok(fields.includes("name"));
  assert.ok(fields.includes("document")); // < 11 caracteres
  assert.ok(fields.includes("email"));
  assert.ok(fields.includes("phone")); // < 8 caracteres

  assert.ok(validateSupplier({ name: "x".repeat(161) }).some((e) => e.field === "name"));
  assert.ok(validateSupplier({ name: "OK", category: "c".repeat(81) }).some((e) => e.field === "category"));
  assert.ok(validateSupplier({ name: "OK", notes: "n".repeat(2001) }).some((e) => e.field === "notes"));

  // Payload mínimo válido: só o nome. Completo também passa.
  assert.equal(validateSupplier({ name: "Auto Peças Silva" }).length, 0);
  assert.equal(
    validateSupplier({
      name: "Auto Peças Silva",
      document: "12.345.678/0001-90",
      email: "contato@silva.example",
      phone: "(11) 99999-0000",
      address: "Rua das Oficinas, 100",
      category: "Peças",
      notes: "Entrega em 24h",
    }).length,
    0,
  );
});

test("suppliers busca cobre nome/documento/contato/categoria; adapter retorna fallback vazio (D-007)", async () => {
  const { filterSuppliers, adaptSuppliersResponse } = await import("../src/modules/registry/suppliers/suppliers.adapter");

  const base = { address: null, notes: null, status: "active", createdAt: "2026-06-01T00:00:00.000Z" };
  const items = [
    { ...base, id: "a", name: "Auto Peças Silva", document: "12.345.678/0001-90", email: "silva@x.example", phone: "(11) 91111-1111", category: "Peças", isActive: true },
    { ...base, id: "b", name: "Combustíveis Norte", document: null, email: null, phone: "(11) 92222-2222", category: "Combustível", isActive: false },
  ];

  assert.equal(filterSuppliers(items, { search: "", isActive: "inactive" }).length, 1);
  assert.equal(filterSuppliers(items, { search: "0001-90", isActive: "all" })[0].id, "a"); // busca por documento
  assert.equal(filterSuppliers(items, { search: "92222", isActive: "all" })[0].id, "b"); // busca por telefone
  assert.equal(filterSuppliers(items, { search: "combustível", isActive: "all" })[0].id, "b"); // busca por categoria
  assert.equal(filterSuppliers(items, { search: "silva", isActive: "inactive" }).length, 0);

  const data = adaptSuppliersResponse({ items: [], pagination: { limit: 20, offset: 0, total: 0 } }, "fallback", "sem dados");
  assert.equal(data.items.length, 0);
  assert.equal(data.source, "fallback");
  assert.equal(data.fallbackReason, "sem dados");
});
