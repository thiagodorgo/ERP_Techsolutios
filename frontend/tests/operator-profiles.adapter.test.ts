import assert from "node:assert/strict";
import test from "node:test";

test("operator-profiles adapter normaliza envelope {items, pagination} e aceita snake_case (sem wrapper data)", async () => {
  const { adaptOperatorProfilesResponse } = await import("../src/modules/registry/operator-profiles/operator-profiles.adapter");

  const data = adaptOperatorProfilesResponse({
    items: [
      {
        id: "op-1",
        user_id: "550e8400-e29b-41d4-a716-446655440000",
        full_name: "João da Silva",
        cnh_number: "01234567890",
        cnh_category: "D",
        cnh_expires_at: "2027-12-31T00:00:00.000Z",
        tracking_consent: true,
        tracking_consent_at: "2026-06-01T10:00:00.000Z",
        phone: "(11) 99999-0000",
        notes: null,
        is_active: true,
        created_at: "2026-06-01T10:00:00.000Z",
      },
      // Sem userId → descartado (todo perfil é 1-1 com um usuário).
      { id: "op-x", full_name: "Órfão" },
    ],
    pagination: { limit: 20, offset: 0, total: 1 },
  });

  assert.equal(data.items.length, 1);
  assert.equal(data.source, "api");
  assert.equal(data.items[0].userId, "550e8400-e29b-41d4-a716-446655440000");
  assert.equal(data.items[0].fullName, "João da Silva");
  assert.equal(data.items[0].cnhNumber, "01234567890");
  assert.equal(data.items[0].cnhCategory, "D");
  assert.equal(data.items[0].trackingConsent, true);
  assert.equal(data.items[0].trackingConsentAt, "2026-06-01T10:00:00.000Z");
  assert.equal(data.items[0].isActive, true);
  assert.equal(data.pagination.total, 1);
});

test("operator-profiles adapter desembrulha item { data } e aplica defaults honestos (consent false, isActive true)", async () => {
  const { adaptOperatorProfileResponse } = await import("../src/modules/registry/operator-profiles/operator-profiles.adapter");

  const item = adaptOperatorProfileResponse({ data: { id: "op-2", userId: "user-abc" } });
  assert.equal(item?.id, "op-2");
  assert.equal(item?.userId, "user-abc");
  assert.equal(item?.fullName, null);
  assert.equal(item?.cnhNumber, null);
  assert.equal(item?.cnhExpiresAt, null);
  assert.equal(item?.trackingConsent, false); // default honesto — nunca presume consentimento
  assert.equal(item?.isActive, true);

  // Sem id ou sem userId → item inválido (nunca renderiza perfil sem usuário).
  assert.equal(adaptOperatorProfileResponse({ data: { userId: "user-abc" } }), null);
  assert.equal(adaptOperatorProfileResponse({ data: { id: "op-3" } }), null);
});

test("operator-profiles rotula a situação em PT-BR MASCULINO (Ativo/Inativo), nome de exibição e ID curto do usuário", async () => {
  const { getOperatorProfileStatusLabel, getOperatorProfileStatusTone, getOperatorProfileDisplayName, formatUserIdShort } = await import(
    "../src/modules/registry/operator-profiles/operator-profiles.adapter"
  );

  // Profissional é MASCULINO — mesma convenção de fornecedor/cliente/serviço.
  assert.equal(getOperatorProfileStatusLabel(true), "Ativo");
  assert.equal(getOperatorProfileStatusLabel(false), "Inativo");
  assert.equal(getOperatorProfileStatusTone(true), "success");
  assert.equal(getOperatorProfileStatusTone(false), "default");

  // Nome de exibição cai em "—" sem nome (nunca inventa nome a partir do userId opaco).
  assert.equal(getOperatorProfileDisplayName({ fullName: "Maria Souza" }), "Maria Souza");
  assert.equal(getOperatorProfileDisplayName({ fullName: null }), "—");
  assert.equal(getOperatorProfileDisplayName({ fullName: "   " }), "—");

  // ID do usuário abreviado (primeiro segmento do UUID); vazio → "—".
  assert.equal(formatUserIdShort("550e8400-e29b-41d4-a716-446655440000"), "550e8400");
  assert.equal(formatUserIdShort("shortid"), "shortid");
  assert.equal(formatUserIdShort(null), "—");
});

test("operator-profiles formata o selo da CNH: vencida (âmbar), válida (verde) e sem CNH (cinza)", async () => {
  const { formatCnhStatus } = await import("../src/modules/registry/operator-profiles/operator-profiles.adapter");

  const now = new Date("2026-07-12T12:00:00.000Z");

  // Sem número de CNH → cinza "Sem CNH".
  assert.deepEqual(formatCnhStatus(null, "2027-01-01T00:00:00.000Z", now), { label: "Sem CNH", tone: "default" });
  assert.deepEqual(formatCnhStatus("   ", null, now), { label: "Sem CNH", tone: "default" });

  // CNH com validade no passado → âmbar "Vencida".
  assert.deepEqual(formatCnhStatus("01234567890", "2026-01-01T00:00:00.000Z", now), { label: "Vencida", tone: "warning" });

  // CNH com validade futura → verde "Válida até dd/mm/aaaa" (data em UTC, sem deslocar o dia).
  const valida = formatCnhStatus("01234567890", "2027-12-31T00:00:00.000Z", now);
  assert.equal(valida.tone, "success");
  assert.equal(valida.label, "Válida até 31/12/2027");

  // CNH sem validade informada → cinza "Sem validade" (honesto, não presume vigência).
  assert.deepEqual(formatCnhStatus("01234567890", null, now), { label: "Sem validade", tone: "default" });
});

test("operator-profiles formata o selo de rastreamento LGPD (consentido em dd/mm/aaaa verde / sem consentimento cinza)", async () => {
  const { formatConsentStatus } = await import("../src/modules/registry/operator-profiles/operator-profiles.adapter");

  const consentido = formatConsentStatus(true, "2026-06-01T10:00:00.000Z");
  assert.equal(consentido.tone, "success");
  assert.equal(consentido.label, "Consentido em 01/06/2026");

  // Consentiu mas sem data registrada → "Consentido" (ainda verde).
  assert.deepEqual(formatConsentStatus(true, null), { label: "Consentido", tone: "success" });

  // Não consentiu → cinza "Sem consentimento".
  assert.deepEqual(formatConsentStatus(false, null), { label: "Sem consentimento", tone: "default" });
  assert.deepEqual(formatConsentStatus(false, "2026-06-01T10:00:00.000Z"), { label: "Sem consentimento", tone: "default" });
});

test("operator-profiles valida userId obrigatório, validade de CNH, telefone e limites de campos", async () => {
  const { validateOperatorProfile } = await import("../src/modules/registry/operator-profiles/operator-profiles.adapter");

  const errors = validateOperatorProfile({ userId: "", cnhExpiresAt: "nao-e-data", phone: "12" });
  const fields = errors.map((error) => error.field);
  assert.ok(fields.includes("userId")); // obrigatório
  assert.ok(fields.includes("cnhExpiresAt")); // data inválida
  assert.ok(fields.includes("phone")); // < 8 caracteres

  assert.ok(validateOperatorProfile({ userId: "u1", fullName: "x".repeat(161) }).some((e) => e.field === "fullName"));
  assert.ok(validateOperatorProfile({ userId: "u1", cnhNumber: "9".repeat(21) }).some((e) => e.field === "cnhNumber"));
  assert.ok(validateOperatorProfile({ userId: "u1", cnhCategory: "AAAAAAAAA" }).some((e) => e.field === "cnhCategory"));
  assert.ok(validateOperatorProfile({ userId: "u1", notes: "n".repeat(2001) }).some((e) => e.field === "notes"));

  // Payload mínimo válido: só o userId. Completo também passa.
  assert.equal(validateOperatorProfile({ userId: "user-abc" }).length, 0);
  assert.equal(
    validateOperatorProfile({
      userId: "550e8400-e29b-41d4-a716-446655440000",
      fullName: "João da Silva",
      cnhNumber: "01234567890",
      cnhCategory: "D",
      cnhExpiresAt: "2027-12-31",
      trackingConsent: true,
      phone: "(11) 99999-0000",
      notes: "Motorista de guincho pesado",
    }).length,
    0,
  );
});

test("operator-profiles busca cobre nome/CNH/categoria/telefone/userId e filtra por situação e consentimento; fallback vazio (D-007)", async () => {
  const { filterOperatorProfiles, adaptOperatorProfilesResponse } = await import("../src/modules/registry/operator-profiles/operator-profiles.adapter");

  const base = { cnhCategory: null, cnhExpiresAt: null, trackingConsentAt: null, notes: null, createdAt: "2026-06-01T00:00:00.000Z" };
  const items = [
    { ...base, id: "a", userId: "550e8400-e29b-41d4-a716-446655440000", fullName: "João da Silva", cnhNumber: "01234567890", cnhCategory: "D", phone: "(11) 91111-1111", trackingConsent: true, isActive: true },
    { ...base, id: "b", userId: "6f1e2d3c-0000-0000-0000-000000000000", fullName: "Maria Souza", cnhNumber: null, phone: "(11) 92222-2222", trackingConsent: false, isActive: false },
  ];

  // Situação.
  assert.equal(filterOperatorProfiles(items, { search: "", isActive: "inactive" }).length, 1);
  assert.equal(filterOperatorProfiles(items, { search: "", isActive: "active" })[0].id, "a");

  // Consentimento (has_consent).
  assert.equal(filterOperatorProfiles(items, { search: "", isActive: "all", hasConsent: "with" })[0].id, "a");
  assert.equal(filterOperatorProfiles(items, { search: "", isActive: "all", hasConsent: "without" })[0].id, "b");

  // Busca por vários campos, inclusive o userId (nunca traduzido para nome).
  assert.equal(filterOperatorProfiles(items, { search: "joão", isActive: "all" })[0].id, "a"); // nome
  assert.equal(filterOperatorProfiles(items, { search: "0123456", isActive: "all" })[0].id, "a"); // CNH
  assert.equal(filterOperatorProfiles(items, { search: "92222", isActive: "all" })[0].id, "b"); // telefone
  assert.equal(filterOperatorProfiles(items, { search: "6f1e2d3c", isActive: "all" })[0].id, "b"); // userId
  assert.equal(filterOperatorProfiles(items, { search: "maria", isActive: "active" }).length, 0);

  const data = adaptOperatorProfilesResponse({ items: [], pagination: { limit: 20, offset: 0, total: 0 } }, "fallback", "sem dados");
  assert.equal(data.items.length, 0);
  assert.equal(data.source, "fallback");
  assert.equal(data.fallbackReason, "sem dados");
});
