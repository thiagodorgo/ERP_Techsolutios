import assert from "node:assert/strict";
import test from "node:test";

test("pois adapter normaliza envelope {items, pagination}, aceita snake_case/lat-lng e descarta coordenada inválida", async () => {
  const { adaptPoisResponse } = await import("../src/modules/registry/pois/pois.adapter");

  const data = adaptPoisResponse({
    items: [
      {
        id: "poi-1",
        name: "Base Central",
        category: "Base",
        latitude: -23.55052,
        longitude: -46.63331,
        address: "Av. Paulista, 1000",
        is_active: true,
        created_at: "2026-06-01T10:00:00.000Z",
      },
      // Aliases lat/lng aceitos.
      { id: "poi-2", name: "Pátio Norte", lat: -22.9, lng: -43.2, is_active: false },
      // Latitude fora de faixa → descartada (nunca renderiza POI sem localização válida).
      { id: "poi-x", name: "Fora da Terra", latitude: 120, longitude: 10, is_active: true },
      // Sem nome → descartado.
      { id: "poi-y", latitude: -1, longitude: -1, is_active: true },
    ],
    pagination: { limit: 20, offset: 0, total: 2 },
  });

  assert.equal(data.items.length, 2);
  assert.equal(data.source, "api");
  assert.equal(data.items[0].name, "Base Central");
  assert.equal(data.items[0].latitude, -23.55052);
  assert.equal(data.items[0].longitude, -46.63331);
  assert.equal(data.items[1].latitude, -22.9); // via alias lat/lng
  assert.equal(data.pagination.total, 2);
});

test("pois adapter desembrulha item { data } e aplica defaults honestos (category/address null, isActive true)", async () => {
  const { adaptPoiResponse } = await import("../src/modules/registry/pois/pois.adapter");

  const item = adaptPoiResponse({ data: { id: "poi-3", name: "Cliente A", latitude: 0, longitude: -46.6 } });
  assert.equal(item?.id, "poi-3");
  assert.equal(item?.category, null);
  assert.equal(item?.address, null);
  assert.equal(item?.latitude, 0); // 0 isolado é válido; só (0,0) é rejeitado no formulário
  assert.equal(item?.isActive, true);

  // Sem id/nome ou sem coordenada → item inválido.
  assert.equal(adaptPoiResponse({ data: { name: "Sem id", latitude: 1, longitude: 1 } }), null);
  assert.equal(adaptPoiResponse({ data: { id: "poi-4", name: "Sem coord" } }), null);
});

test("pois formata coordenada (ponto decimal, até 6 casas) e rotula a situação em PT-BR MASCULINO (Ativo/Inativo)", async () => {
  const { formatCoordinate, formatCoordinatePart, getPoiStatusLabel, getPoiStatusTone, truncateText, formatPoiDate } = await import(
    "../src/modules/registry/pois/pois.adapter"
  );

  assert.equal(formatCoordinate(-23.55052, -46.63331), "-23.55052, -46.63331");
  assert.equal(formatCoordinatePart(-23.5505200001), "-23.55052"); // arredonda a 6 casas
  assert.equal(formatCoordinate(null, -46.6), "—");
  assert.equal(formatCoordinate(-23.5, undefined), "—");

  // Ponto é MASCULINO.
  assert.equal(getPoiStatusLabel(true), "Ativo");
  assert.equal(getPoiStatusLabel(false), "Inativo");
  assert.equal(getPoiStatusTone(true), "success");
  assert.equal(getPoiStatusTone(false), "default");

  assert.equal(truncateText(null), "—");
  assert.equal(truncateText("x".repeat(120)).endsWith("…"), true);

  assert.match(formatPoiDate("2026-06-01T10:00:00.000Z"), /\d{2}\/\d{2}\/2026/);
  assert.equal(formatPoiDate(null), "—");
});

test("pois valida nome obrigatório, coordenada (finita, faixa, rejeita 0,0) e busca cobre nome/categoria/endereço (D-007)", async () => {
  const { validatePoi, filterPois, adaptPoisResponse } = await import("../src/modules/registry/pois/pois.adapter");

  // Coordenada ausente/NaN → obrigatória.
  const missing = validatePoi({ name: "Base", latitude: Number.NaN, longitude: Number.NaN });
  const missingFields = missing.map((error) => error.field);
  assert.ok(missingFields.includes("latitude"));
  assert.ok(missingFields.includes("longitude"));

  // Fora de faixa.
  assert.ok(validatePoi({ name: "Base", latitude: 120, longitude: 10 }).some((e) => e.field === "latitude"));
  assert.ok(validatePoi({ name: "Base", latitude: 10, longitude: 200 }).some((e) => e.field === "longitude"));

  // Nome obrigatório.
  assert.ok(validatePoi({ name: "", latitude: -23.5, longitude: -46.6 }).some((e) => e.field === "name"));

  // Rejeita a ilha nula (0, 0).
  assert.ok(validatePoi({ name: "Base", latitude: 0, longitude: 0 }).some((e) => e.field === "latitude"));

  // Payload mínimo válido: nome + coordenada válida.
  assert.equal(validatePoi({ name: "Base Central", latitude: -23.55052, longitude: -46.63331 }).length, 0);
  // 0 isolado (só latitude) é permitido (equador/meridiano).
  assert.equal(validatePoi({ name: "Meridiano", latitude: 0, longitude: -46.6 }).length, 0);

  const base = { category: null, address: null, createdAt: "2026-06-01T00:00:00.000Z" };
  const items = [
    { ...base, id: "a", name: "Base Central", category: "Base", latitude: -23.55, longitude: -46.63, address: "Av. Paulista, 1000", isActive: true },
    { ...base, id: "b", name: "Pátio Norte", category: "Pátio", latitude: -22.9, longitude: -43.2, isActive: false },
  ];

  assert.equal(filterPois(items, { search: "", isActive: "inactive" }).length, 1);
  assert.equal(filterPois(items, { search: "paulista", isActive: "all" })[0].id, "a"); // busca por endereço
  assert.equal(filterPois(items, { search: "pátio", isActive: "all" })[0].id, "b"); // busca por categoria
  assert.equal(filterPois(items, { search: "central", isActive: "inactive" }).length, 0);

  // D-007: adapter retorna fallback vazio sem fabricar linhas.
  const data = adaptPoisResponse({ items: [], pagination: { limit: 20, offset: 0, total: 0 } }, "fallback", "sem dados");
  assert.equal(data.items.length, 0);
  assert.equal(data.source, "fallback");
  assert.equal(data.fallbackReason, "sem dados");
});
