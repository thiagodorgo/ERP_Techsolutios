import assert from "node:assert/strict";
import test from "node:test";

test("tenant-settings adapter normaliza envelope, coage valor para string e descarta item sem key", async () => {
  const { adaptTenantSettingsResponse } = await import("../src/modules/settings/tenant-settings.adapter");

  const data = adaptTenantSettingsResponse({
    items: [
      {
        key: "organization.business_name",
        value: "Techsolutions Industrial",
        category: "organization",
        description: "Razão social exibida em documentos",
        updated_at: "2026-07-10T12:00:00.000Z",
      },
      // valor não-string é coagido para texto editável; snake_case aceito.
      { key: "organization.max_users", value: 25, category: "organization" },
      { key: "flags.beta_enabled", value: true, category: null },
      // sem key → descartado (parâmetro sem identidade nunca renderiza).
      { value: "orfão", category: "organization" },
    ],
  });

  assert.equal(data.items.length, 3);
  assert.equal(data.source, "api");
  assert.equal(data.items[0].value, "Techsolutions Industrial");
  assert.equal(data.items[0].category, "organization");
  assert.equal(data.items[0].updatedAt, "2026-07-10T12:00:00.000Z");
  assert.equal(data.items[1].value, "25"); // number → string
  assert.equal(data.items[2].value, "true"); // boolean → string
  assert.equal(data.items[2].category, null);
});

test("tenant-settings adapter desembrulha { data } (envelope do backend) no item e na lista", async () => {
  const { adaptTenantSettingResponse, adaptTenantSettingsResponse } = await import(
    "../src/modules/settings/tenant-settings.adapter"
  );

  const item = adaptTenantSettingResponse({ data: { key: "organization.theme", value: "tech_dark" } });
  assert.equal(item?.key, "organization.theme");
  assert.equal(item?.value, "tech_dark");
  assert.equal(item?.category, null);
  assert.equal(item?.description, null);

  // Sem key → item inválido.
  assert.equal(adaptTenantSettingResponse({ data: { value: "x" } }), null);

  // Lista aninhada em { data: { items } }.
  const list = adaptTenantSettingsResponse({ data: { items: [{ key: "organization.currency", value: "BRL" }] } });
  assert.equal(list.items.length, 1);
  assert.equal(list.items[0].key, "organization.currency");
});

test("tenant-settings deriva rótulo a partir da key (curado + humanização) e resolve o editor por chave", async () => {
  const { deriveSettingLabel, humanizeSettingKey } = await import("../src/modules/settings/tenant-settings.adapter");
  const { resolveTenantSettingEditor } = await import("../src/modules/settings/tenant-settings.presentation");

  // Chave conhecida → rótulo PT-BR curado.
  assert.equal(deriveSettingLabel({ key: "organization.theme" }), "Tema visual");
  assert.equal(deriveSettingLabel({ key: "organization.business_name" }), "Razão social");

  // Chave desconhecida → humanização do último segmento da key.
  assert.equal(humanizeSettingKey("billing.invoice_prefix"), "Invoice prefix");
  assert.equal(humanizeSettingKey("standalone"), "Standalone");
  assert.equal(deriveSettingLabel({ key: "billing.invoice_prefix" }), "Invoice prefix");

  // Editor: tema vira <select> das opções; demais chaves = texto.
  const themeEditor = resolveTenantSettingEditor("organization.theme");
  assert.equal(themeEditor.kind, "select");
  assert.ok(themeEditor.kind === "select" && themeEditor.options.some((option) => option.value === "enterprise_blue"));
  assert.equal(resolveTenantSettingEditor("organization.currency").kind, "text");
});

test("tenant-settings agrupa por category (null → 'Outros parâmetros'), ordena grupos e itens", async () => {
  const { groupTenantSettings } = await import("../src/modules/settings/tenant-settings.adapter");

  const items = [
    { key: "appearance.density", value: "compact", category: "appearance", description: null, updatedAt: null },
    { key: "flags.beta_enabled", value: "true", category: null, description: null, updatedAt: null },
    { key: "organization.timezone", value: "America/Sao_Paulo", category: "organization", description: null, updatedAt: null },
    { key: "organization.currency", value: "BRL", category: "organization", description: null, updatedAt: null },
  ];

  const groups = groupTenantSettings(items);

  // 3 grupos: organization, appearance e o "sem categoria".
  assert.equal(groups.length, 3);
  // Ordem: organization (1) < appearance (2) < sem categoria (99).
  assert.equal(groups[0].category, "organization");
  assert.equal(groups[0].title, "Organização");
  assert.equal(groups[1].category, "appearance");
  assert.equal(groups[1].title, "Aparência");
  assert.equal(groups[2].category, null);
  assert.equal(groups[2].title, "Outros parâmetros");

  // Itens do grupo organization ordenados pelo rótulo PT-BR: "Fuso horário" antes de "Moeda"? não —
  // ordena alfabético: "Fuso horário" (F) < "Moeda" (M).
  assert.deepEqual(
    groups[0].items.map((item) => item.key),
    ["organization.timezone", "organization.currency"],
  );
});

test("tenant-settings D-007: fallback devolve lista vazia sem fabricar parâmetros; updatedAt formata pt-BR", async () => {
  const { adaptTenantSettingsResponse, formatSettingUpdatedAt } = await import(
    "../src/modules/settings/tenant-settings.adapter"
  );

  const data = adaptTenantSettingsResponse({ items: [] }, "fallback", "sem dados");
  assert.equal(data.items.length, 0);
  assert.equal(data.source, "fallback");
  assert.equal(data.fallbackReason, "sem dados");

  // Array cru também é aceito e vazio permanece vazio.
  assert.equal(adaptTenantSettingsResponse([]).items.length, 0);

  assert.match(formatSettingUpdatedAt("2026-07-10T12:00:00.000Z"), /\d{2}\/\d{2}\/2026/);
  assert.equal(formatSettingUpdatedAt(null), "—");
  assert.equal(formatSettingUpdatedAt("not-a-date"), "—");
});
