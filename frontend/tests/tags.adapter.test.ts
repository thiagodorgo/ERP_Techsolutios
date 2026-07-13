import assert from "node:assert/strict";
import test from "node:test";

test("tags adapter normaliza envelope {items, pagination}, aceita snake_case e normaliza a cor para #rrggbb", async () => {
  const { adaptTagsResponse } = await import("../src/modules/registry/tags/tags.adapter");

  const data = adaptTagsResponse({
    items: [
      {
        id: "tag-1",
        name: "Prioritário",
        color: "#3B82F6",
        description: "Atendimento com SLA reduzido",
        is_active: true,
        created_at: "2026-06-01T10:00:00.000Z",
      },
      // Cor em forma curta (#rgb) é expandida para #rrggbb.
      { id: "tag-2", name: "Verde", color: "0F0", is_active: false, created_at: "2026-06-02T10:00:00.000Z" },
      // Sem nome → descartado (linha sem título nunca renderiza).
      { id: "tag-x", color: "#000000", is_active: true },
    ],
    pagination: { limit: 20, offset: 0, total: 2 },
  });

  assert.equal(data.items.length, 2);
  assert.equal(data.source, "api");
  assert.equal(data.items[0].name, "Prioritário");
  assert.equal(data.items[0].color, "#3b82f6"); // normalizado minúsculo
  assert.equal(data.items[0].isActive, true);
  assert.equal(data.items[1].color, "#00ff00"); // #rgb expandido
  assert.equal(data.pagination.total, 2);
});

test("tags adapter desembrulha item { data }, aplica defaults honestos e descarta cor inválida (null)", async () => {
  const { adaptTagResponse } = await import("../src/modules/registry/tags/tags.adapter");

  const item = adaptTagResponse({ data: { id: "tag-3", name: "Sem cor", color: "roxo" } });
  assert.equal(item?.id, "tag-3");
  assert.equal(item?.color, null); // "roxo" não é hex → null
  assert.equal(item?.description, null);
  assert.equal(item?.isActive, true);

  // Sem id ou sem nome → item inválido.
  assert.equal(adaptTagResponse({ data: { name: "Sem id" } }), null);
  assert.equal(adaptTagResponse({ data: { id: "tag-4" } }), null);
});

test("tags normaliza hex e rotula a situação em PT-BR FEMININO (Ativa/Inativa)", async () => {
  const { normalizeHexColor, formatTagColor, getTagStatusLabel, getTagStatusTone, truncateText, formatTagDate } = await import(
    "../src/modules/registry/tags/tags.adapter"
  );

  assert.equal(normalizeHexColor("#3B82F6"), "#3b82f6");
  assert.equal(normalizeHexColor("3b82f6"), "#3b82f6");
  assert.equal(normalizeHexColor("#0f0"), "#00ff00");
  assert.equal(normalizeHexColor(""), null);
  assert.equal(normalizeHexColor("#12345"), null); // 5 dígitos não é válido
  assert.equal(normalizeHexColor("verde"), null);

  // Coluna Cor: hex em maiúsculas ou "—".
  assert.equal(formatTagColor("#3b82f6"), "#3B82F6");
  assert.equal(formatTagColor(null), "—");
  assert.equal(formatTagColor("nope"), "—");

  // Etiqueta é FEMININO.
  assert.equal(getTagStatusLabel(true), "Ativa");
  assert.equal(getTagStatusLabel(false), "Inativa");
  assert.equal(getTagStatusTone(true), "success");
  assert.equal(getTagStatusTone(false), "default");

  // Descrição truncada com reticências; vazio → "—".
  assert.equal(truncateText(null), "—");
  assert.equal(truncateText("curta"), "curta");
  assert.equal(truncateText("x".repeat(120)).endsWith("…"), true);

  assert.match(formatTagDate("2026-06-01T10:00:00.000Z"), /\d{2}\/\d{2}\/2026/);
  assert.equal(formatTagDate(null), "—");
});

test("tags valida nome obrigatório, cor hexadecimal e limite de descrição; busca cobre nome/cor/descrição (D-007)", async () => {
  const { validateTag, filterTags, adaptTagsResponse } = await import("../src/modules/registry/tags/tags.adapter");

  const errors = validateTag({ name: "", color: "azul", description: "d".repeat(501) });
  const fields = errors.map((error) => error.field);
  assert.ok(fields.includes("name"));
  assert.ok(fields.includes("color")); // cor inválida
  assert.ok(fields.includes("description")); // acima do limite

  assert.ok(validateTag({ name: "x".repeat(121) }).some((e) => e.field === "name"));
  // Payload mínimo válido: só o nome. Com cor válida também passa.
  assert.equal(validateTag({ name: "Prioritário" }).length, 0);
  assert.equal(validateTag({ name: "Prioritário", color: "#3B82F6", description: "SLA reduzido" }).length, 0);

  const base = { description: null, createdAt: "2026-06-01T00:00:00.000Z" };
  const items = [
    { ...base, id: "a", name: "Prioritário", color: "#3b82f6", isActive: true },
    { ...base, id: "b", name: "Cortesia", color: "#22c55e", description: "sem custo", isActive: false },
  ];

  assert.equal(filterTags(items, { search: "", isActive: "inactive" }).length, 1);
  assert.equal(filterTags(items, { search: "3b82f6", isActive: "all" })[0].id, "a"); // busca por cor
  assert.equal(filterTags(items, { search: "custo", isActive: "all" })[0].id, "b"); // busca por descrição
  assert.equal(filterTags(items, { search: "prioritário", isActive: "inactive" }).length, 0);

  // D-007: adapter retorna fallback vazio sem fabricar linhas.
  const data = adaptTagsResponse({ items: [], pagination: { limit: 20, offset: 0, total: 0 } }, "fallback", "sem dados");
  assert.equal(data.items.length, 0);
  assert.equal(data.source, "fallback");
  assert.equal(data.fallbackReason, "sem dados");
});
