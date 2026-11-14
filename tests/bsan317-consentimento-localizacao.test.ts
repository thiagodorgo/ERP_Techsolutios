import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

// -----------------------------------------------------------------------------------------------
// B-SAN3-17 (itens 18 e 52 do portão) — o servidor é a autoridade do consentimento de localização.
// Claude, sem cruzamento, declarado (§C7 11(2), ordem do dono de 13/11).
//
// Lei: plano v2 §2.1–§3 + Emenda 1 do v2 (CR17R2-01..10) + abertura (E2.1, E2.3) + Emenda 1 da abertura
// (2.1, 2.2, 2.6, 2.7), que prevalece. Os casos são os da Emenda 1 da abertura, §3 ("servidor, 30"):
// B1–B8, B10–B13 e B15–B24 aqui; D1–D7 em `bsan317-consentimento-localizacao-db.test.ts`; G-B em
// `bsan317-escritores-de-posicao-guard.test.ts`.
//
// Forma: o app REAL (`createApp`) sobre o núcleo em memória. O técnico é um ator UUID só de cabeçalho
// (como `tests/telemetry.test.ts`), porque o perfil exige UUID (CR17-04). O gestor e o admin são do registro.
// B16 usa o arnês do gate de módulo (`tests/helpers/san3-18-gate.ts`), com JWT de verdade.
//
// Vermelho-controle na base `d2737339` (F0s, diário `dev-17-cl.md` §4): as rotas novas não existem, e o gate
// de módulo responde 403 `route_module_unclassified` antes de 404 (E2.1); a rota de posição grava sem
// consentimento (201); os leitores ao vivo não filtram; o gestor religa; a evidência guarda o gps.
// -----------------------------------------------------------------------------------------------

process.env.LOG_LEVEL = "silent";
process.env.CORE_SAAS_PERSISTENCE = "memory";

const ACCEPT_ROUTE = "/api/v1/mobile/location-consent";
const REVOKE_ROUTE = "/api/v1/mobile/location-consent/revoke";
const POSITION = "/api/v1/mobile/field-locations";
const TEXT_VERSION = "2026-11.b-san3-17.v1";

type Json = { readonly status: number; readonly body: any };
type Headers = Record<string, string>;

type Harness = Awaited<ReturnType<typeof harness>>;

async function harness() {
  const [{ createApp }, fl, { CoreSaasRegistry }, { MemoryCoreSaasAdapter }, { InMemoryCoreSaasStore }, op, broker] =
    await Promise.all([
      import("../src/app.js"),
      import("../src/modules/field-location/field-location.service.js"),
      import("../src/modules/core-saas/services/core-saas.service.js"),
      import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
      import("../src/modules/core-saas/store/core-saas.store.js"),
      import("../src/modules/operator-profiles/operator-profile.service.js"),
      import("../src/modules/field-ops-realtime/field-ops-realtime.broker.js"),
    ]);
  fl.resetFieldLocationRuntimeForTests();
  op.resetOperatorProfileRuntimeForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenantA = core.createTenant({ name: "Org B-SAN3-17 A" });
  const tenantB = core.createTenant({ name: "Org B-SAN3-17 B" });
  const adminA = core.createUser({ tenantId: tenantA.id, name: "Admin A", email: `bsan317-admin-a-${randomUUID()}@example.com`, roles: ["tenant_admin"] });
  const adminB = core.createUser({ tenantId: tenantB.id, name: "Admin B", email: `bsan317-admin-b-${randomUUID()}@example.com`, roles: ["tenant_admin"] });
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server: Server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const req = async (path: string, headers: Headers, method = "GET", body?: unknown): Promise<Json> => {
    const response = await fetch(baseUrl + path, {
      method,
      headers: { "content-type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : undefined };
  };
  const as = (userId: string, role: string, tenantId: string = tenantA.id): Headers => ({
    "x-tenant-id": tenantId,
    "x-user-id": userId,
    "x-role": role,
  });

  const events: string[] = [];
  const unsubscribe = broker.fieldOpsRealtimeBroker.subscribe(tenantA.id, (event) => {
    if (event.name === "field_location.updated") events.push(String(event.payload?.operator_user_id ?? ""));
  });

  return {
    req,
    as,
    tenantA: tenantA.id,
    tenantB: tenantB.id,
    adminA: as(adminA.id, "tenant_admin"),
    adminB: as(adminB.id, "tenant_admin", tenantB.id),
    manager: as(randomUUID(), "manager"),
    repo: fl.getMemoryFieldLocationRepositoryForTests(),
    profiles: op.createMemoryOperatorProfileService(),
    events,
    close: async () => {
      unsubscribe();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      fl.resetFieldLocationRuntimeForTests();
      op.resetOperatorProfileRuntimeForTests();
    },
  };
}

async function withHarness(callback: (h: Harness) => Promise<void>): Promise<void> {
  const h = await harness();
  try {
    await callback(h);
  } finally {
    await h.close();
  }
}

function decision(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { decided_at: new Date().toISOString(), client_action_id: randomUUID(), text_version: TEXT_VERSION, ...overrides };
}

function point(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { latitude: -23.55052, longitude: -46.633308, ...extra };
}

async function createProfile(h: Harness, userId: string, consent: boolean, admin: Headers = h.adminA): Promise<string> {
  const created = await h.req("/api/v1/operator-profiles", admin, "POST", { user_id: userId, tracking_consent: consent });
  assert.equal(created.status, 201, `arranjo: o gestor cadastra o profissional (${JSON.stringify(created.body)})`);
  return created.body.data.id as string;
}

async function readProfile(h: Harness, profileId: string, admin: Headers = h.adminA): Promise<any> {
  const read = await h.req(`/api/v1/operator-profiles/${profileId}`, admin);
  assert.equal(read.status, 200, JSON.stringify(read.body));
  return read.body.data;
}

async function latestOf(h: Harness, userId: string, query = ""): Promise<any[]> {
  const latest = await h.req(`/api/v1/field-locations/latest${query}`, h.adminA);
  assert.equal(latest.status, 200, JSON.stringify(latest.body));
  return (latest.body.data as any[]).filter((row) => row.operatorUserId === userId);
}

async function storedOf(h: Harness, userId: string, tenantId: string = h.tenantA): Promise<number> {
  return (await h.repo.listHistory({ tenantId, operatorUserId: userId, limit: 500 })).length;
}

/** Cria uma OS e a atribui ao técnico; devolve o leitor do detalhe (`technician` de `map-start-points`). */
async function workOrderFor(h: Harness, userId: string): Promise<() => Promise<any>> {
  const created = await h.req("/api/v1/work-orders", h.adminA, "POST", { title: "OS B-SAN3-17", serviceAddress: "Rua A, 1", priority: "high" });
  assert.equal(created.status, 201, `arranjo: OS criada (${JSON.stringify(created.body)})`);
  const workOrderId = created.body.data.id as string;
  const assigned = await h.req(`/api/v1/work-orders/${workOrderId}/assign`, h.adminA, "POST", { operatorId: userId, userId });
  assert.equal(assigned.status, 200, `arranjo: OS atribuída (${JSON.stringify(assigned.body)})`);
  return async () => {
    const map = await h.req(`/api/v1/work-orders/${workOrderId}/map-start-points`, h.adminA);
    assert.equal(map.status, 200, JSON.stringify(map.body));
    return map.body.data.technician ?? null;
  };
}

function reasonOf(response: Json): string | undefined {
  return response.body?.error?.reason;
}

// ------------------------------------------------------------------------------------------- P5

test("[B1] técnico UUID sem perfil → 422 operator_profile_required; latest vazio; 0 gravado; 0 evento", async () => {
  await withHarness(async (h) => {
    const tech = randomUUID();
    const recorded = await h.req(POSITION, h.as(tech, "field_technician"), "POST", point());

    assert.equal(recorded.status, 422, JSON.stringify(recorded.body));
    assert.equal(reasonOf(recorded), "operator_profile_required");
    assert.deepEqual(await latestOf(h, tech), []);
    assert.equal(await storedOf(h, tech), 0);
    assert.deepEqual(h.events.filter((id) => id === tech), [], "nada é publicado na recusa");
  });
});

test("[B2] perfil sem consentimento → 422 tracking_consent_required; nada gravado; 0 evento", async () => {
  await withHarness(async (h) => {
    const tech = randomUUID();
    await createProfile(h, tech, false);

    const recorded = await h.req(POSITION, h.as(tech, "field_technician"), "POST", point());

    assert.equal(recorded.status, 422, JSON.stringify(recorded.body));
    assert.equal(reasonOf(recorded), "tracking_consent_required");
    assert.equal(await storedOf(h, tech), 0);
    assert.deepEqual(h.events.filter((id) => id === tech), []);
  });
});

// ------------------------------------------------------------------------------------------- P6 / P7

test("[B3] aceite → 200 applied, granted e carimbo; a posição seguinte → 201 e aparece no latest", async () => {
  await withHarness(async (h) => {
    const tech = randomUUID();
    const profileId = await createProfile(h, tech, false);
    const body = decision();

    const accepted = await h.req(ACCEPT_ROUTE, h.as(tech, "field_technician"), "POST", body);

    assert.equal(accepted.status, 200, JSON.stringify(accepted.body));
    assert.equal(accepted.body.data.status, "applied");
    assert.equal(accepted.body.data.granted, true);
    assert.equal(accepted.body.data.client_action_id, body.client_action_id);
    assert.equal(typeof accepted.body.data.granted_at, "string");
    assert.equal((await readProfile(h, profileId)).trackingConsent, true);

    const recorded = await h.req(POSITION, h.as(tech, "field_technician"), "POST", point());
    assert.equal(recorded.status, 201, JSON.stringify(recorded.body));
    assert.equal((await latestOf(h, tech)).length, 1);
  });
});

test("[B4] revogar → granted:false e carimbo nulo; a posição seguinte → 422 tracking_consent_required", async () => {
  await withHarness(async (h) => {
    const tech = randomUUID();
    const profileId = await createProfile(h, tech, true);

    const revoked = await h.req(REVOKE_ROUTE, h.as(tech, "field_technician"), "POST", decision());

    assert.equal(revoked.status, 200, JSON.stringify(revoked.body));
    assert.equal(revoked.body.data.status, "applied");
    assert.equal(revoked.body.data.granted, false);
    assert.equal(revoked.body.data.granted_at, null);
    const profile = await readProfile(h, profileId);
    assert.equal(profile.trackingConsent, false);
    assert.equal(profile.trackingConsentAt, null);

    const recorded = await h.req(POSITION, h.as(tech, "field_technician"), "POST", point());
    assert.equal(recorded.status, 422, JSON.stringify(recorded.body));
    assert.equal(reasonOf(recorded), "tracking_consent_required");
  });
});

test("[B5] ordem: latitude inválida, sem perfil → 400 invalid_coordinate (a validação vem antes do perfil)", async () => {
  await withHarness(async (h) => {
    const tech = randomUUID();
    const recorded = await h.req(POSITION, h.as(tech, "field_technician"), "POST", point({ latitude: -100 }));

    assert.equal(recorded.status, 400, JSON.stringify(recorded.body));
    assert.equal(reasonOf(recorded), "invalid_coordinate");
  });
});

test("[B6] CE-G2: viewer → 403 permission_required no aceite; field_technician → 200", async () => {
  await withHarness(async (h) => {
    const viewer = randomUUID();
    const tech = randomUUID();
    await createProfile(h, viewer, false);
    await createProfile(h, tech, false);

    const denied = await h.req(ACCEPT_ROUTE, h.as(viewer, "viewer"), "POST", decision());
    const allowed = await h.req(ACCEPT_ROUTE, h.as(tech, "field_technician"), "POST", decision());

    assert.equal(denied.status, 403, JSON.stringify(denied.body));
    assert.equal(reasonOf(denied), "permission_required");
    assert.equal(allowed.status, 200, JSON.stringify(allowed.body));
    assert.equal(allowed.body.data.granted, true);
  });
});

test("[B7] corpo inválido → 400 nos 3 casos; tenant_id do corpo é ignorado e o perfil da outra organização fica intacto", async () => {
  await withHarness(async (h) => {
    const tech = randomUUID();
    const profileA = await createProfile(h, tech, false);
    const profileB = await createProfile(h, tech, false, h.adminB);
    const headers = h.as(tech, "field_technician");

    const badCid = await h.req(ACCEPT_ROUTE, headers, "POST", decision({ client_action_id: "nao-e-uuid" }));
    const badDate = await h.req(ACCEPT_ROUTE, headers, "POST", decision({ decided_at: "ontem" }));
    const future = await h.req(ACCEPT_ROUTE, headers, "POST", decision({ decided_at: new Date(Date.now() + 6 * 60_000).toISOString() }));
    const badVersion = await h.req(ACCEPT_ROUTE, headers, "POST", decision({ text_version: "Versão Com Espaço" }));
    for (const [response, reason] of [
      [badCid, "invalid_client_action_id"],
      [badDate, "invalid_date"],
      [future, "invalid_date"],
      [badVersion, "invalid_text_version"],
    ] as const) {
      assert.equal(response.status, 400, JSON.stringify(response.body));
      assert.equal(response.body?.error?.code, "FIELD_LOCATION_INVALID");
      assert.equal(reasonOf(response), reason);
    }
    assert.equal((await readProfile(h, profileA)).trackingConsent, false, "nada é aplicado no corpo inválido");

    const crossed = await h.req(ACCEPT_ROUTE, headers, "POST", decision({ tenant_id: h.tenantB, tenantId: h.tenantB }));
    assert.equal(crossed.status, 200, JSON.stringify(crossed.body));
    assert.equal((await readProfile(h, profileA)).trackingConsent, true, "vale a organização do ator");
    assert.equal((await readProfile(h, profileB, h.adminB)).trackingConsent, false, "o perfil da outra organização fica intacto");
  });
});

test("[B8] o mesmo aceite 2 vezes → mesmo estado; o 2º é applied (reafirmação) e o carimbo não muda", async () => {
  await withHarness(async (h) => {
    const tech = randomUUID();
    const profileId = await createProfile(h, tech, false);
    const body = decision();

    const first = await h.req(ACCEPT_ROUTE, h.as(tech, "field_technician"), "POST", body);
    const stampAfterFirst = (await readProfile(h, profileId)).trackingConsentAt;
    const second = await h.req(ACCEPT_ROUTE, h.as(tech, "field_technician"), "POST", body);
    const profile = await readProfile(h, profileId);

    assert.equal(first.status, 200, JSON.stringify(first.body));
    assert.equal(second.status, 200, JSON.stringify(second.body));
    assert.equal(second.body.data.status, "applied");
    assert.equal(second.body.data.granted, true);
    assert.equal(profile.trackingConsent, true);
    assert.equal(typeof stampAfterFirst, "string");
    assert.equal(profile.trackingConsentAt, stampAfterFirst, "a reafirmação mantém o carimbo");
  });
});

test("[B10] o gestor cadastra já marcado e a posição passa; o técnico revoga e vence", async () => {
  await withHarness(async (h) => {
    const tech = randomUUID();
    const profileId = await createProfile(h, tech, true);
    const headers = h.as(tech, "field_technician");

    const before = await h.req(POSITION, headers, "POST", point());
    const revoked = await h.req(REVOKE_ROUTE, headers, "POST", decision());
    const after = await h.req(POSITION, headers, "POST", point());

    assert.equal(before.status, 201, JSON.stringify(before.body));
    assert.equal(revoked.status, 200, JSON.stringify(revoked.body));
    assert.equal(revoked.body.data.granted, false);
    assert.equal((await readProfile(h, profileId)).trackingConsent, false);
    assert.equal(after.status, 422, JSON.stringify(after.body));
    assert.equal(reasonOf(after), "tracking_consent_required");
  });
});

test("[B11] P11: aceite cid1 → revoga → reenvio de cid1 → superseded, granted:false; a posição → 422", async () => {
  await withHarness(async (h) => {
    const tech = randomUUID();
    await createProfile(h, tech, false);
    const headers = h.as(tech, "field_technician");
    const first = decision({ decided_at: new Date(Date.now() - 60_000).toISOString() });

    const accepted = await h.req(ACCEPT_ROUTE, headers, "POST", first);
    const revoked = await h.req(REVOKE_ROUTE, headers, "POST", decision());
    const replay = await h.req(ACCEPT_ROUTE, headers, "POST", first);
    const recorded = await h.req(POSITION, headers, "POST", point());

    assert.equal(accepted.status, 200, JSON.stringify(accepted.body));
    assert.equal(revoked.status, 200, JSON.stringify(revoked.body));
    assert.equal(replay.status, 200, JSON.stringify(replay.body));
    assert.equal(replay.body.data.status, "superseded");
    assert.equal(replay.body.data.granted, false);
    assert.equal(recorded.status, 422, JSON.stringify(recorded.body));
    assert.equal(reasonOf(recorded), "tracking_consent_required");
  });
});

test("[B12] ator com id do registro (não UUID) → 422 operator_profile_required na posição e no aceite (nunca o 400 de outro módulo)", async () => {
  await withHarness(async (h) => {
    const registryLike = "usr_000001";
    const headers = h.as(registryLike, "field_technician");

    const recorded = await h.req(POSITION, headers, "POST", point());
    const accepted = await h.req(ACCEPT_ROUTE, headers, "POST", decision());

    assert.equal(recorded.status, 422, JSON.stringify(recorded.body));
    assert.equal(reasonOf(recorded), "operator_profile_required");
    assert.equal(accepted.status, 422, JSON.stringify(accepted.body));
    assert.equal(reasonOf(accepted), "operator_profile_required");
  });
});

test("[B13] papel sem field_location:send e com perfil consentido: aceite 403, revogação 200 granted:false; sem papel → 403", async () => {
  await withHarness(async (h) => {
    const viewer = randomUUID();
    const profileId = await createProfile(h, viewer, true);

    const accepted = await h.req(ACCEPT_ROUTE, h.as(viewer, "viewer"), "POST", decision());
    const revoked = await h.req(REVOKE_ROUTE, h.as(viewer, "viewer"), "POST", decision());
    const noRole = await h.req(REVOKE_ROUTE, { "x-tenant-id": h.tenantA, "x-user-id": randomUUID() }, "POST", decision());

    assert.equal(accepted.status, 403, JSON.stringify(accepted.body));
    assert.equal(reasonOf(accepted), "permission_required");
    assert.equal(revoked.status, 200, JSON.stringify(revoked.body));
    assert.equal(revoked.body.data.granted, false);
    assert.equal((await readProfile(h, profileId)).trackingConsent, false, "revogar funciona para quem perdeu o send");
    assert.equal(noRole.status, 403, JSON.stringify(noRole.body));
    assert.equal(reasonOf(noRole), "role_required");
  });
});

test("[B15] P10/P12: aceite decidido antes de o perfil existir: 422 → (perfil criado) → superseded → aceite novo applied", async () => {
  await withHarness(async (h) => {
    const tech = randomUUID();
    const headers = h.as(tech, "field_technician");
    const early = decision({ decided_at: new Date(Date.now() - 60_000).toISOString() });

    const withoutProfile = await h.req(ACCEPT_ROUTE, headers, "POST", early);
    await createProfile(h, tech, false);
    const replay = await h.req(ACCEPT_ROUTE, headers, "POST", early);
    const fresh = await h.req(ACCEPT_ROUTE, headers, "POST", decision({ decided_at: new Date(Date.now() + 1_000).toISOString() }));

    assert.equal(withoutProfile.status, 422, JSON.stringify(withoutProfile.body));
    assert.equal(reasonOf(withoutProfile), "operator_profile_required");
    assert.equal(replay.status, 200, JSON.stringify(replay.body));
    assert.equal(replay.body.data.status, "superseded");
    assert.equal(replay.body.data.granted, false);
    assert.equal(fresh.status, 200, JSON.stringify(fresh.body));
    assert.equal(fresh.body.data.status, "applied");
    assert.equal(fresh.body.data.granted, true);
  });
});

test("[B16] gate de módulo: organização sem field_operations → aceite 403 module_not_enabled; revogação (núcleo) 200 granted:false", async () => {
  const [{ abrirArnesDoGate, TODOS_OS_MODULOS }, op] = await Promise.all([
    import("./helpers/san3-18-gate.js"),
    import("../src/modules/operator-profiles/operator-profile.service.js"),
  ]);
  op.resetOperatorProfileRuntimeForTests();
  const gate = await abrirArnesDoGate();
  try {
    const org = gate.criarOrganizacao(TODOS_OS_MODULOS.filter((module: string) => module !== "field_operations"));
    const tech = randomUUID();
    await op.createMemoryOperatorProfileService().create(
      { tenantId: org.id, userId: randomUUID(), roles: ["tenant_admin"], permissions: ["operator_profiles:create"] } as never,
      { user_id: tech, tracking_consent: true },
    );
    const token = await gate.token({ tenantId: org.id, userId: tech, roles: ["field_technician"] });

    const accepted = await gate.chamar("POST", ACCEPT_ROUTE, { token, body: decision() });
    const revoked = await gate.chamar("POST", REVOKE_ROUTE, { token, body: decision() });

    assert.equal(accepted.status, 403, JSON.stringify(accepted.body));
    assert.equal(accepted.reason, "module_not_enabled");
    assert.equal(revoked.status, 200, JSON.stringify(revoked.body));
    assert.equal(revoked.body?.data?.granted, false);
  } finally {
    await gate.fechar();
    op.resetOperatorProfileRuntimeForTests();
  }
});

// ------------------------------------------------------------------------------------------- P7 (a): leitores ao vivo

test("[B17] latest: consente → posição → revoga → o técnico some; o ponto traccar dele continua; o legado `web` some", async () => {
  await withHarness(async (h) => {
    const tech = randomUUID();
    await createProfile(h, tech, false);
    const headers = h.as(tech, "field_technician");

    assert.equal((await h.req(ACCEPT_ROUTE, headers, "POST", decision())).status, 200);
    assert.equal((await h.req(POSITION, headers, "POST", point({ recordedAt: "2026-11-14T03:05:00.000Z" }))).status, 201);
    await h.repo.record({ tenantId: h.tenantA, operatorUserId: tech, source: "web", latitude: -23.6, longitude: -46.7, recordedAt: new Date("2026-11-14T03:06:00Z") });
    const beforeRevoke = await latestOf(h, tech);
    assert.equal(beforeRevoke.length, 1, "legado: enquanto consente, o ponto `web` mais novo aparece");
    assert.equal(beforeRevoke[0].source, "web");

    assert.equal((await h.req(REVOKE_ROUTE, headers, "POST", decision())).status, 200);
    assert.deepEqual(await latestOf(h, tech), [], "depois da revogação nenhuma posição enviada pelo app continua no mapa");

    await h.repo.record({ tenantId: h.tenantA, operatorUserId: tech, source: "traccar", latitude: -22.9, longitude: -43.2, recordedAt: new Date("2026-11-14T03:10:00Z") });
    const withVehicle = await latestOf(h, tech);
    assert.equal(withVehicle.length, 1, "6.1 (a): a viatura (traccar) continua");
    assert.equal(withVehicle[0].source, "traccar");
  });
});

test("[B18] CR17R2-03: revogar com decided_at +6 min → 200 granted:false e a posição → 422; o aceite +6 min → 400 invalid_date", async () => {
  await withHarness(async (h) => {
    const tech = randomUUID();
    await createProfile(h, tech, true);
    const headers = h.as(tech, "field_technician");
    const future = new Date(Date.now() + 6 * 60_000).toISOString();

    const revoked = await h.req(REVOKE_ROUTE, headers, "POST", decision({ decided_at: future }));
    const recorded = await h.req(POSITION, headers, "POST", point());
    const accepted = await h.req(ACCEPT_ROUTE, headers, "POST", decision({ decided_at: future }));

    assert.equal(revoked.status, 200, JSON.stringify(revoked.body));
    assert.equal(revoked.body.data.granted, false);
    assert.equal(recorded.status, 422, JSON.stringify(recorded.body));
    assert.equal(accepted.status, 400, JSON.stringify(accepted.body));
    assert.equal(reasonOf(accepted), "invalid_date");
  });
});

test("[B19] CR17R2-04: aceite de 1 h atrás logo depois de o gestor criar o perfil → superseded com profile_updated_at; a reconfirmação com max(agora, profile_updated_at + 1 ms) → applied", async () => {
  await withHarness(async (h) => {
    const tech = randomUUID();
    await createProfile(h, tech, false);
    const headers = h.as(tech, "field_technician");

    const stale = await h.req(ACCEPT_ROUTE, headers, "POST", decision({ decided_at: new Date(Date.now() - 3_600_000).toISOString() }));
    assert.equal(stale.status, 200, JSON.stringify(stale.body));
    assert.equal(stale.body.data.status, "superseded");
    const profileUpdatedAt = Date.parse(stale.body.data.profile_updated_at);
    assert.ok(Number.isFinite(profileUpdatedAt), "o superseded devolve profile_updated_at");

    const reconfirm = await h.req(ACCEPT_ROUTE, headers, "POST", decision({ decided_at: new Date(Math.max(Date.now(), profileUpdatedAt + 1)).toISOString() }));
    assert.equal(reconfirm.status, 200, JSON.stringify(reconfirm.body));
    assert.equal(reconfirm.body.data.status, "applied");
    assert.equal(reconfirm.body.data.granted, true);
  });
});

test("[B20] N3: o detalhe da OS (map-start-points) traz o técnico enquanto ele consente e nulo depois de revogar; o traccar dele continua; o legado `web` some", async () => {
  await withHarness(async (h) => {
    const tech = randomUUID();
    await createProfile(h, tech, false);
    const headers = h.as(tech, "field_technician");
    const technicianOnMap = await workOrderFor(h, tech);

    assert.equal((await h.req(ACCEPT_ROUTE, headers, "POST", decision())).status, 200);
    assert.equal((await h.req(POSITION, headers, "POST", point({ recordedAt: "2026-11-14T03:05:00.000Z" }))).status, 201);
    await h.repo.record({ tenantId: h.tenantA, operatorUserId: tech, source: "web", latitude: -23.6, longitude: -46.7, recordedAt: new Date("2026-11-14T03:06:00Z") });
    const before = await technicianOnMap();
    assert.equal(before?.latitude, -23.6, "legado: enquanto consente, o ponto `web` mais novo aparece no detalhe");

    assert.equal((await h.req(REVOKE_ROUTE, headers, "POST", decision())).status, 200);
    assert.equal(await technicianOnMap(), null, "depois de revogar, o detalhe da OS não traz posição enviada pelo app");

    await h.repo.record({ tenantId: h.tenantA, operatorUserId: tech, source: "traccar", latitude: -22.9, longitude: -43.2, recordedAt: new Date("2026-11-14T02:00:00Z") });
    assert.equal((await technicianOnMap())?.latitude, -22.9, "6.1 (a): a viatura continua no detalhe, mesmo mais velha");
  });
});

// ------------------------------------------------------------------------------------------- Emenda 1 da abertura

test("[B21] 2.1: a rota móvel não aceita origem do cliente — web/system/traccar → 400 invalid_source e 0 gravado; mobile e ausente → 201 mobile", async () => {
  await withHarness(async (h) => {
    const tech = randomUUID();
    await createProfile(h, tech, true);
    const headers = h.as(tech, "field_technician");

    for (const source of ["web", "system", "traccar"]) {
      const refused = await h.req(POSITION, headers, "POST", point({ source }));
      assert.equal(refused.status, 400, `${source}: ${JSON.stringify(refused.body)}`);
      assert.equal(refused.body?.error?.code, "FIELD_LOCATION_INVALID");
      assert.equal(reasonOf(refused), "invalid_source");
    }
    assert.equal(await storedOf(h, tech), 0, "depois das 3 recusas, nada gravado");
    assert.deepEqual(h.events.filter((id) => id === tech), [], "e nada publicado");

    const mobile = await h.req(POSITION, headers, "POST", point({ source: "mobile" }));
    const absent = await h.req(POSITION, headers, "POST", point());
    assert.equal(mobile.status, 201, JSON.stringify(mobile.body));
    assert.equal(mobile.body.data.source, "mobile");
    assert.equal(absent.status, 201, JSON.stringify(absent.body));
    assert.equal(absent.body.data.source, "mobile");
  });
});

test("[B22] 2.2: a viatura continua no mapa do despacho — (a) traccar mais velho, (b) atrás de 21 pontos do app, (c) a ordem da lista", async (t) => {
  await t.test("(a) traccar às 03:00 e app às 03:05: depois de o consentimento ser desligado, latest e detalhe trazem o traccar; com since 03:01, nada", async () => {
    await withHarness(async (h) => {
      const tech = randomUUID();
      const profileId = await createProfile(h, tech, true);
      const technicianOnMap = await workOrderFor(h, tech);
      await h.repo.record({ tenantId: h.tenantA, operatorUserId: tech, source: "traccar", latitude: -22.9, longitude: -43.2, recordedAt: new Date("2026-11-14T03:00:00Z") });
      assert.equal((await h.req(POSITION, h.as(tech, "field_technician"), "POST", point({ recordedAt: "2026-11-14T03:05:00.000Z" }))).status, 201);

      const before = await latestOf(h, tech);
      assert.equal(before[0]?.source, "mobile", "antes de revogar, latest traz o ponto do app");

      // O gestor desliga (a porta que continua aberta para ele, 2.6). O filtro dos leitores não depende de quem desligou.
      assert.equal((await h.req(`/api/v1/operator-profiles/${profileId}`, h.manager, "PATCH", { tracking_consent: false })).status, 200);

      const after = await latestOf(h, tech);
      assert.equal(after.length, 1, JSON.stringify(after));
      assert.equal(after[0].source, "traccar");
      assert.equal(after[0].latitude, -22.9);
      assert.equal((await technicianOnMap())?.latitude, -22.9, "o detalhe da OS também traz a viatura");
      assert.deepEqual(await latestOf(h, tech, "?since=2026-11-14T03:01:00.000Z"), [], "o since vale para o ponto reposto");
    });
  });

  await t.test("(b) traccar e depois 21 pontos do app: os dois leitores trazem o traccar (sem lookback)", async () => {
    await withHarness(async (h) => {
      const tech = randomUUID();
      const profileId = await createProfile(h, tech, true);
      const technicianOnMap = await workOrderFor(h, tech);
      await h.repo.record({ tenantId: h.tenantA, operatorUserId: tech, source: "traccar", latitude: -22.9, longitude: -43.2, recordedAt: new Date("2026-11-14T02:00:00Z") });
      for (let i = 0; i < 21; i += 1) {
        const at = new Date(Date.parse("2026-11-14T02:10:00Z") + i * 60_000).toISOString();
        assert.equal((await h.req(POSITION, h.as(tech, "field_technician"), "POST", point({ recordedAt: at }))).status, 201);
      }

      assert.equal((await h.req(`/api/v1/operator-profiles/${profileId}`, h.manager, "PATCH", { tracking_consent: false })).status, 200);

      assert.equal((await technicianOnMap())?.latitude, -22.9);
      const after = await latestOf(h, tech);
      assert.equal(after[0]?.source, "traccar", JSON.stringify(after));
    });
  });

  await t.test("(c) dois operadores: a lista sai em ordem decrescente de hora, com o ponto reposto no lugar certo", async () => {
    await withHarness(async (h) => {
      const tech = randomUUID();
      const other = randomUUID();
      const profileId = await createProfile(h, tech, true);
      await createProfile(h, other, true);
      await h.repo.record({ tenantId: h.tenantA, operatorUserId: tech, source: "traccar", latitude: -22.9, longitude: -43.2, recordedAt: new Date("2026-11-14T03:00:00Z") });
      assert.equal((await h.req(POSITION, h.as(other, "field_technician"), "POST", point({ recordedAt: "2026-11-14T03:02:00.000Z" }))).status, 201);
      assert.equal((await h.req(POSITION, h.as(tech, "field_technician"), "POST", point({ recordedAt: "2026-11-14T03:05:00.000Z" }))).status, 201);

      assert.equal((await h.req(`/api/v1/operator-profiles/${profileId}`, h.manager, "PATCH", { tracking_consent: false })).status, 200);

      const all = (await h.req("/api/v1/field-locations/latest", h.adminA)).body.data as any[];
      assert.deepEqual(
        all.map((row) => `${row.operatorUserId === tech ? "tech" : "other"}:${row.source}`),
        ["other:mobile", "tech:traccar"],
      );
    });
  });
});

test("[B23] 2.6: o gestor não religa o consentimento que foi desligado (422 tracking_consent_holder_only); desliga e edita; só o titular liga", async () => {
  await withHarness(async (h) => {
    const tech = randomUUID();
    const profileId = await createProfile(h, tech, false);
    const headers = h.as(tech, "field_technician");
    const technicianOnMap = await workOrderFor(h, tech);

    assert.equal((await h.req(ACCEPT_ROUTE, headers, "POST", decision())).status, 200);
    assert.equal((await h.req(POSITION, headers, "POST", point())).status, 201);
    assert.equal((await h.req(REVOKE_ROUTE, headers, "POST", decision())).status, 200);

    const relink = await h.req(`/api/v1/operator-profiles/${profileId}`, h.manager, "PATCH", { tracking_consent: true });
    const relinkCamel = await h.req(`/api/v1/operator-profiles/${profileId}`, h.manager, "PATCH", { trackingConsent: true });
    assert.equal(relink.status, 422, JSON.stringify(relink.body));
    assert.equal(relink.body?.error?.code, "OPERATOR_PROFILE_CONSENT_HOLDER_ONLY");
    assert.equal(reasonOf(relink), "tracking_consent_holder_only");
    assert.equal(relinkCamel.status, 422, `o outro nome do campo não é porta: ${JSON.stringify(relinkCamel.body)}`);
    assert.equal((await readProfile(h, profileId)).trackingConsent, false, "nada é gravado na recusa");
    assert.equal(await technicianOnMap(), null, "o detalhe da OS continua sem o técnico");

    const otherField = await h.req(`/api/v1/operator-profiles/${profileId}`, h.manager, "PATCH", { phone: "11999990000", tracking_consent: false });
    assert.equal(otherField.status, 200, JSON.stringify(otherField.body));

    const holder = await h.profiles.update(
      { tenantId: h.tenantA, userId: tech, roles: ["field_technician"], permissions: [] } as never,
      profileId,
      { tracking_consent: true },
    );
    assert.equal(holder.trackingConsent, true, "pelo serviço, com o titular como ator, liga");
  });
});

test("[B23b] Emenda 1.1 (CR17R2E-01): o gestor salva o formulário com tracking_consent:true e o titular revoga entre a leitura e a escrita → termina false", async () => {
  const [{ OperatorProfileService }, { InMemoryOperatorProfileRepository }] = await Promise.all([
    import("../src/modules/operator-profiles/operator-profile.service.js"),
    import("../src/modules/operator-profiles/operator-profile.repository.js"),
  ]);
  const tenantId = randomUUID();
  const holderId = randomUUID();
  const managerId = randomUUID();
  const holder = { tenantId, userId: holderId, roles: ["field_technician"], permissions: [] } as never;
  const manager = { tenantId, userId: managerId, roles: ["manager"], permissions: ["operator_profiles:update"] } as never;
  let profileId = "";
  let midRace: boolean | undefined;

  // O repositório segura a ESCRITA do gestor (já depois da leitura que a guarda faz) e deixa o titular revogar antes.
  class RaceRepository extends InMemoryOperatorProfileRepository {
    private raced = false;
    override async update(input: Parameters<InMemoryOperatorProfileRepository["update"]>[0]) {
      if (input.updatedBy === managerId && !this.raced) {
        this.raced = true;
        await service.update(holder, profileId, { tracking_consent: false });
        midRace = (await this.findById(tenantId, profileId))?.trackingConsent;
      }
      return super.update(input);
    }
  }
  const service = new OperatorProfileService(new RaceRepository());
  const created = await service.create(
    { tenantId, userId: managerId, roles: ["manager"], permissions: ["operator_profiles:create"] } as never,
    { user_id: holderId, tracking_consent: true },
  );
  profileId = created.id;

  const saved = await service.update(manager, profileId, { phone: "11999990000", tracking_consent: true });
  const final = await service.get(manager, profileId);

  assert.equal(midRace, false, "o titular revogou no meio");
  assert.equal(saved.phone, "11999990000", "o resto do formulário é gravado");
  assert.equal(final.trackingConsent, false, "o não-titular nunca grava true: o \"não\" do titular fica");
  assert.equal(final.trackingConsentAt, undefined);
});

test("[B24] 2.7: a evidência pelo sync não guarda gps de quem não consentiu — com consentimento o recibo traz o gps; sem, aceita sem gps e a nota fica", async () => {
  await withHarness(async (h) => {
    const tech = randomUUID();
    const profileId = await createProfile(h, tech, true);
    const headers = h.as(tech, "field_technician");
    const send = async () => {
      const response = await h.req("/api/v1/mobile/sync/evidence-actions", headers, "POST", {
        client_batch_id: randomUUID(),
        actions: [
          {
            client_evidence_id: randomUUID(),
            type: "evidence.field_observation",
            local_created_at: "2026-11-14T03:00:00.000Z",
            payload: { note: "chegada no local", gps: { lat: -23.5617, lng: -46.6559, accuracy_m: 4 } },
          },
        ],
      });
      assert.equal(response.status, 200, JSON.stringify(response.body));
      const item = response.body?.data?.accepted?.[0] ?? response.body?.data?.rejected?.[0];
      return { status: item?.status, gps: item?.server_state?.metadata?.gps ?? null, note: item?.server_state?.metadata?.note };
    };

    const withConsent = await send();
    assert.equal(withConsent.status, "accepted");
    assert.deepEqual(withConsent.gps, { lat: -23.5617, lng: -46.6559, accuracy_m: 4 });

    assert.equal((await h.req(`/api/v1/operator-profiles/${profileId}`, h.manager, "PATCH", { tracking_consent: false })).status, 200);
    const withoutConsent = await send();
    assert.equal(withoutConsent.status, "accepted", "a ação não é recusada");
    assert.equal(withoutConsent.gps, null, "o servidor retira o gps");
    assert.equal(withoutConsent.note, "chegada no local", "a nota continua");
  });
});
