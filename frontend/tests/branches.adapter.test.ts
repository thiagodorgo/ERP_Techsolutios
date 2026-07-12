import assert from "node:assert/strict";
import test from "node:test";

test("branches adapter normaliza envelope {items, pagination} e aceita snake_case (sem wrapper data)", async () => {
  const { adaptBranchesResponse } = await import("../src/modules/registry/branches/branches.adapter");

  const data = adaptBranchesResponse({
    items: [
      {
        id: "br-1",
        name: "São Paulo — Zona Sul",
        code: "SP-01",
        status: "active",
        created_at: "2026-06-01T10:00:00.000Z",
        updated_at: "2026-06-10T10:00:00.000Z",
      },
      {
        id: "br-2",
        name: "Campinas",
        code: "CPS-01",
        status: "inactive",
        created_at: "2026-05-01T10:00:00.000Z",
      },
      // Sem nome → descartada (linha sem título nunca renderiza).
      { id: "br-x", code: "XX-99", status: "active" },
    ],
    pagination: { limit: 20, offset: 0, total: 2 },
  });

  assert.equal(data.items.length, 2);
  assert.equal(data.source, "api");
  assert.equal(data.items[0].name, "São Paulo — Zona Sul");
  assert.equal(data.items[0].code, "SP-01");
  assert.equal(data.items[0].status, "active");
  assert.equal(data.items[0].updatedAt, "2026-06-10T10:00:00.000Z");
  // updatedAt ausente cai no createdAt (nunca inventa data futura).
  assert.equal(data.items[1].updatedAt, "2026-05-01T10:00:00.000Z");
  assert.equal(data.items[1].status, "inactive");
  assert.equal(data.pagination.total, 2);
});

test("branches adapter desembrulha item { data }, exige id+nome e fecha o enum de status", async () => {
  const { adaptBranchResponse } = await import("../src/modules/registry/branches/branches.adapter");

  const item = adaptBranchResponse({ data: { id: "br-3", name: "Curitiba", code: "CWB-01", status: "inactive" } });
  assert.equal(item?.id, "br-3");
  assert.equal(item?.code, "CWB-01");
  assert.equal(item?.status, "inactive");

  // Status desconhecido/ausente → enum fechado cai em 'active' (default honesto do backend).
  assert.equal(adaptBranchResponse({ data: { id: "br-4", name: "Sorocaba", code: "SOR-01", status: "weird" } })?.status, "active");
  assert.equal(adaptBranchResponse({ data: { id: "br-5", name: "Santos", code: "STS-01" } })?.status, "active");

  // Sem id ou sem nome → item inválido.
  assert.equal(adaptBranchResponse({ data: { name: "Sem id", code: "X" } }), null);
  assert.equal(adaptBranchResponse({ data: { id: "br-6", code: "X" } }), null);
});

test("branches rotula a situação em PT-BR FEMININO (Ativa/Inativa) a partir do enum status", async () => {
  const { getBranchStatusLabel, getBranchStatusTone, isBranchActive, formatBranchDate } = await import(
    "../src/modules/registry/branches/branches.adapter"
  );

  // Não existe is_active em Filiais — a situação vem do enum `status`.
  assert.equal(getBranchStatusLabel("active"), "Ativa");
  assert.equal(getBranchStatusLabel("inactive"), "Inativa");
  assert.equal(getBranchStatusTone("active"), "success");
  assert.equal(getBranchStatusTone("inactive"), "default");
  assert.equal(isBranchActive("active"), true);
  assert.equal(isBranchActive("inactive"), false);

  assert.match(formatBranchDate("2026-06-01T10:00:00.000Z"), /\d{2}\/\d{2}\/2026/);
  assert.equal(formatBranchDate(null), "—");
  assert.equal(formatBranchDate("data-invalida"), "—");
});

test("branches valida obrigatórios (nome/código) e limites; busca cobre nome e código", async () => {
  const { validateBranch, filterBranches } = await import("../src/modules/registry/branches/branches.adapter");

  const errors = validateBranch({ name: "", code: "" });
  const fields = errors.map((error) => error.field);
  assert.ok(fields.includes("name"));
  assert.ok(fields.includes("code"));

  assert.ok(validateBranch({ name: "x".repeat(161), code: "OK" }).some((e) => e.field === "name"));
  assert.ok(validateBranch({ name: "Filial", code: "c".repeat(41) }).some((e) => e.field === "code"));
  assert.equal(validateBranch({ name: "Filial Centro", code: "CTR-01" }).length, 0);

  const base = { createdAt: "2026-06-01T00:00:00.000Z", updatedAt: "2026-06-01T00:00:00.000Z" } as const;
  const items = [
    { ...base, id: "a", name: "São Paulo — Zona Sul", code: "SP-01", status: "active" as const },
    { ...base, id: "b", name: "Campinas", code: "CPS-01", status: "inactive" as const },
  ];

  assert.equal(filterBranches(items, { search: "", isActive: "active" }).length, 1);
  assert.equal(filterBranches(items, { search: "", isActive: "inactive" })[0].id, "b");
  assert.equal(filterBranches(items, { search: "sp-01", isActive: "all" })[0].id, "a"); // busca por código
  assert.equal(filterBranches(items, { search: "campinas", isActive: "active" }).length, 0);
});

test("branches adapter retorna fallback vazio com motivo (D-007: nunca fabricar linhas)", async () => {
  const { adaptBranchesResponse } = await import("../src/modules/registry/branches/branches.adapter");

  const data = adaptBranchesResponse({ items: [], pagination: { limit: 20, offset: 0, total: 0 } }, "fallback", "sem dados");
  assert.equal(data.items.length, 0);
  assert.equal(data.source, "fallback");
  assert.equal(data.fallbackReason, "sem dados");
});
