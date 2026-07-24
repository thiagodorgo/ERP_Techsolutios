import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

import { haversineMeters } from "../src/modules/telemetry/haversine.js";
import { sumDailyKm } from "../src/modules/telemetry/telemetry.km.js";
import {
  createMemoryTelemetryService,
  resetTelemetryRuntimeForTests,
} from "../src/modules/telemetry/telemetry.service.js";
import type { TelemetryActorContext } from "../src/modules/telemetry/telemetry.types.js";
import {
  createMemoryOperatorProfileService,
  resetOperatorProfileRuntimeForTests,
} from "../src/modules/operator-profiles/operator-profile.service.js";
import type { OperatorProfileActorContext } from "../src/modules/operator-profiles/operator-profile.types.js";
import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

const DAY = "2026-07-24";
// Janela EXPLÍCITA (24h, dentro do teto de 168h) — determinística, independente do relógio de parede.
const WIN = { from: "2026-07-24T00:00:00.000Z", to: "2026-07-25T00:00:00.000Z" } as const;

// Um profissional (operator_profile) no repo de memória compartilhado; a telemetria resolve o consentimento
// por findByUserId (o mesmo caminho de produção).
async function seedProfessional(options: { readonly consent: boolean }): Promise<{
  readonly tenantId: string;
  readonly userId: string;
  readonly profileId: string;
}> {
  resetOperatorProfileRuntimeForTests();
  resetTelemetryRuntimeForTests();
  const tenantId = randomUUID();
  const userId = randomUUID();
  const opActor: OperatorProfileActorContext = {
    tenantId,
    userId: randomUUID(),
    roles: ["tenant_admin"],
    permissions: ["operator_profiles:create", "operator_profiles:read"],
  };
  const opSvc = createMemoryOperatorProfileService();
  const profile = await opSvc.create(opActor, { user_id: userId, tracking_consent: options.consent });
  return { tenantId, userId, profileId: profile.id };
}

function senderActor(tenantId: string, userId: string): TelemetryActorContext {
  return { tenantId, userId, roles: ["field_technician"], permissions: ["field_location:send"] };
}

function readerActor(tenantId: string): TelemetryActorContext {
  return { tenantId, userId: randomUUID(), roles: ["manager"], permissions: ["telemetry:read"] };
}

function heartbeat(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    client_action_id: randomUUID(),
    eventType: "heartbeat",
    capturedAt: `${DAY}T12:00:00.000Z`,
    lat: -23.55,
    lng: -46.63,
    ...overrides,
  };
}

// ── haversine (matemática pura) ───────────────────────────────────────────────────────────────────────
test("haversine — 1 grau de latitude no meridiano ≈ 111,19 km (distância conhecida)", () => {
  const meters = haversineMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
  assert.ok(Math.abs(meters - 111_194.9) < 5, `esperado ~111194.9 m, veio ${meters}`);
});

test("haversine — mesmo ponto → 0 m", () => {
  assert.equal(haversineMeters({ lat: -23.55, lng: -46.63 }, { lat: -23.55, lng: -46.63 }), 0);
});

// ── km on-read (RN-TELE-03 / RN-TELE-08) ──────────────────────────────────────────────────────────────
test("km — sem pontos → 0 HONESTO (nunca fabricado)", () => {
  assert.deepEqual(sumDailyKm([]), { kmTotal: 0, pointsUsed: 0 });
});

test("km — 1 ponto só → 0 (não há segmento)", () => {
  const summary = sumDailyKm([{ lat: 0, lng: 0, capturedAt: new Date("2026-07-24T12:00:00Z") }]);
  assert.deepEqual(summary, { kmTotal: 0, pointsUsed: 1 });
});

test("km — 2 pontos consecutivos (1 grau, 1h) → ~111,2 km", () => {
  const summary = sumDailyKm([
    { lat: 0, lng: 0, capturedAt: new Date("2026-07-24T12:00:00Z") },
    { lat: 1, lng: 0, capturedAt: new Date("2026-07-24T13:00:00Z") },
  ]);
  assert.equal(summary.pointsUsed, 2);
  assert.ok(Math.abs(summary.kmTotal - 111.2) < 0.1, `veio ${summary.kmTotal}`);
});

test("km — salto de velocidade irreal (1 grau em 1s) descartado do somatório", () => {
  const summary = sumDailyKm([
    { lat: 0, lng: 0, capturedAt: new Date("2026-07-24T12:00:00Z") },
    { lat: 1, lng: 0, capturedAt: new Date("2026-07-24T12:00:01Z") },
  ]);
  assert.equal(summary.pointsUsed, 2);
  assert.equal(summary.kmTotal, 0);
});

test("km — ponto com accuracy ruim (>100 m) é excluído do km", () => {
  const good = sumDailyKm([
    { lat: 0, lng: 0, capturedAt: new Date("2026-07-24T12:00:00Z") },
    { lat: 1, lng: 0, capturedAt: new Date("2026-07-24T13:00:00Z") },
  ]);
  const withNoise = sumDailyKm([
    { lat: 0, lng: 0, capturedAt: new Date("2026-07-24T12:00:00Z") },
    { lat: 0.5, lng: 5, capturedAt: new Date("2026-07-24T12:30:00Z"), accuracyM: 500 },
    { lat: 1, lng: 0, capturedAt: new Date("2026-07-24T13:00:00Z") },
  ]);
  // O ponto ruidoso é descartado → resta o MESMO par bom → mesmo km e mesmos 2 pontos elegíveis.
  assert.equal(withNoise.pointsUsed, 2);
  assert.ok(Math.abs(withNoise.kmTotal - good.kmTotal) < 0.001);
});

// ── consent-gate (RN-TELE-01) ─────────────────────────────────────────────────────────────────────────
test("consent-gate — SEM consentimento: evento com GPS rejeitado, NADA de lat/lng gravado; evento sem GPS passa", async () => {
  const { tenantId, userId, profileId } = await seedProfessional({ consent: false });
  const telemetry = createMemoryTelemetryService();

  const summary = await telemetry.ingestBatch(senderActor(tenantId, userId), {
    events: [
      heartbeat(),
      { client_action_id: randomUUID(), eventType: "app_connect", capturedAt: `${DAY}T12:00:00.000Z` },
    ],
  });

  assert.equal(summary.summary.received, 2);
  assert.equal(summary.summary.accepted, 1); // só o app_connect (sem GPS)
  assert.equal(summary.summary.rejected, 1); // o heartbeat com GPS
  const rejected = summary.results.find((result) => result.status === "rejected");
  assert.equal(rejected?.reason, "tracking_consent_required");

  // PROVA: zero coordenada persistida para o profissional (rastreamento vazio).
  const track = await telemetry.getTrack(readerActor(tenantId), { professionalId: profileId, ...WIN });
  assert.deepEqual(track, []);
});

test("consent-gate — COM consentimento: heartbeat com GPS é gravado e aparece no rastreamento", async () => {
  const { tenantId, userId, profileId } = await seedProfessional({ consent: true });
  const telemetry = createMemoryTelemetryService();

  const summary = await telemetry.ingestBatch(senderActor(tenantId, userId), { events: [heartbeat()] });
  assert.equal(summary.summary.accepted, 1);

  const track = await telemetry.getTrack(readerActor(tenantId), { professionalId: profileId, ...WIN });
  assert.equal(track.length, 1);
  assert.equal(track[0].lat, -23.55);
  assert.equal(track[0].lng, -46.63);
});

test("ingestão — ator sem operator_profile → 422 operator_profile_required", async () => {
  resetOperatorProfileRuntimeForTests();
  resetTelemetryRuntimeForTests();
  const telemetry = createMemoryTelemetryService();
  await assert.rejects(
    telemetry.ingestBatch(senderActor(randomUUID(), randomUUID()), { events: [heartbeat()] }),
    /operator profile/i,
  );
});

// ── idempotência (RN-TELE-02) ─────────────────────────────────────────────────────────────────────────
test("idempotência — reprocessar o mesmo client_action_id → already_applied, sem duplicar", async () => {
  const { tenantId, userId, profileId } = await seedProfessional({ consent: true });
  const telemetry = createMemoryTelemetryService();
  const clientActionId = randomUUID();

  const first = await telemetry.ingestBatch(senderActor(tenantId, userId), {
    events: [heartbeat({ client_action_id: clientActionId })],
  });
  const second = await telemetry.ingestBatch(senderActor(tenantId, userId), {
    events: [heartbeat({ client_action_id: clientActionId })],
  });

  assert.equal(first.summary.accepted, 1);
  assert.equal(second.summary.accepted, 0);
  assert.equal(second.summary.already_applied, 1);

  const track = await telemetry.getTrack(readerActor(tenantId), { professionalId: profileId, ...WIN });
  assert.equal(track.length, 1); // não duplicou
});

// ── precisão na ingestão vs km (RN-TELE-08) ───────────────────────────────────────────────────────────
test("precisão — heartbeat com accuracy ruim é PERSISTIDO cru (aparece no track) mas some do km", async () => {
  const { tenantId, userId, profileId } = await seedProfessional({ consent: true });
  const telemetry = createMemoryTelemetryService();

  await telemetry.ingestBatch(senderActor(tenantId, userId), {
    events: [
      heartbeat({ client_action_id: randomUUID(), capturedAt: `${DAY}T12:00:00.000Z`, lat: 0, lng: 0 }),
      heartbeat({ client_action_id: randomUUID(), capturedAt: `${DAY}T12:30:00.000Z`, lat: 0.5, lng: 5, accuracyM: 500 }),
      heartbeat({ client_action_id: randomUUID(), capturedAt: `${DAY}T13:00:00.000Z`, lat: 1, lng: 0 }),
    ],
  });

  // Track: os 3 pontos crus (persistência honesta, inclusive o ruidoso).
  const track = await telemetry.getTrack(readerActor(tenantId), { professionalId: profileId, ...WIN });
  assert.equal(track.length, 3);

  // km: só os 2 pontos bons contam (o ruidoso é excluído).
  const km = await telemetry.getKm(readerActor(tenantId), { professionalId: profileId, ...WIN });
  assert.equal(km.length, 1);
  assert.equal(km[0].day, DAY);
  assert.equal(km[0].pointsUsed, 2);
  assert.ok(Math.abs(km[0].kmTotal - 111.2) < 0.1, `veio ${km[0].kmTotal}`);
});

test("km on-read — sem pontos para o profissional → data vazio (0 honesto)", async () => {
  const { tenantId, profileId } = await seedProfessional({ consent: true });
  const telemetry = createMemoryTelemetryService();
  const km = await telemetry.getKm(readerActor(tenantId), { professionalId: profileId, ...WIN });
  assert.deepEqual(km, []);
});

// ── recusas (RN-TELE-06) ──────────────────────────────────────────────────────────────────────────────
test("recusas — SERVICE_REFUSAL listada com motivo e OS de contexto", async () => {
  const { tenantId, userId, profileId } = await seedProfessional({ consent: false });
  const telemetry = createMemoryTelemetryService();
  const workOrderId = randomUUID();

  await telemetry.ingestBatch(senderActor(tenantId, userId), {
    events: [
      {
        client_action_id: randomUUID(),
        eventType: "service_refusal",
        capturedAt: `${DAY}T14:00:00.000Z`,
        refusalReason: "veiculo_incompativel",
        workOrderId,
      },
    ],
  });

  const refusals = await telemetry.getRefusals(readerActor(tenantId), { professionalId: profileId, ...WIN });
  assert.equal(refusals.length, 1);
  assert.equal(refusals[0].reason, "veiculo_incompativel");
  assert.equal(refusals[0].workOrderRef, workOrderId);
});

// ── §2.8 allowlists (RN-TELE-05) ──────────────────────────────────────────────────────────────────────
test("§2.8 — coordenada crua SÓ no /track; km/recusas/acessos/dispositivos NUNCA vazam lat/lng/IP/tenant/clientActionId", async () => {
  const { tenantId, userId, profileId } = await seedProfessional({ consent: true });
  const telemetry = createMemoryTelemetryService();

  await telemetry.ingestBatch(senderActor(tenantId, userId), {
    events: [
      heartbeat({ client_action_id: randomUUID(), capturedAt: `${DAY}T12:00:00.000Z`, lat: 0, lng: 0, sdkInt: 34, deviceModel: "Pixel 7", appVersion: "1.2.3" }),
      heartbeat({ client_action_id: randomUUID(), capturedAt: `${DAY}T13:00:00.000Z`, lat: 1, lng: 0 }),
      { client_action_id: randomUUID(), eventType: "app_connect", capturedAt: `${DAY}T11:00:00.000Z`, deviceModel: "Pixel 7", appVersion: "1.2.3", sdkInt: 34 },
      { client_action_id: randomUUID(), eventType: "service_refusal", capturedAt: `${DAY}T14:00:00.000Z`, refusalReason: "x" },
    ],
  });

  const reader = readerActor(tenantId);
  const forbidden = ["lat", "lng", "tenantId", "operatorProfileId", "clientActionId", "client_action_id", "ip", "ipAddress", "sdkInt", "sdk_int"];

  const km = await telemetry.getKm(reader, { professionalId: profileId, ...WIN });
  const refusals = await telemetry.getRefusals(reader, { professionalId: profileId, ...WIN });
  const access = await telemetry.getAccess(reader, { professionalId: profileId, ...WIN });
  const devices = await telemetry.getDevices(reader, { ...WIN });

  for (const view of [...km, ...refusals, ...access, ...devices]) {
    for (const key of forbidden) {
      assert.equal(key in (view as Record<string, unknown>), false, `${key} não pode vazar em ${JSON.stringify(view)}`);
    }
  }

  // Device: rótulo grosseiro sem sdk_int cru.
  assert.equal(devices.length, 1);
  assert.equal(devices[0].deviceLabel, "Pixel 7");

  // Track é o ÚNICO com coordenada crua.
  const track = await telemetry.getTrack(reader, { professionalId: profileId, ...WIN });
  assert.ok(track.length >= 1);
  assert.equal("lat" in track[0], true);
  assert.equal("lng" in track[0], true);
});

test("isolamento — profissional de outro tenant → 404 (RN-TELE-04)", async () => {
  const { profileId } = await seedProfessional({ consent: true });
  const telemetry = createMemoryTelemetryService();
  await assert.rejects(
    telemetry.getKm(readerActor(randomUUID()), { professionalId: profileId, ...WIN }),
    /not.*found/i,
  );
});

// ── RBAC + roteamento end-to-end via HTTP (RN-TELE-09) ────────────────────────────────────────────────
// A camada HTTP prova o que só ela pode: o gate de permissão (backend é a autoridade) e a rota montada.
// O consent-gate / km / §2.8 já são provados nos testes de serviço acima (memória compartilhada).
test("RBAC/HTTP — telemetry:read gate + ingestão reusa field_location:send (backend autoridade)", async () => {
  await withTelemetryApi(async ({ baseUrl, seed }) => {
    const professionalId = randomUUID();

    // field_technician NÃO tem telemetry:read → 403 no console (envia telemetria, não lê).
    const techConsole = await requestJson(baseUrl, `/api/v1/telemetry/km?professionalId=${professionalId}`, {
      headers: authHeaders(seed.tenant, seed.tech, "field_technician"),
    });
    assert.equal(techConsole.status, 403);
    assert.equal(techConsole.body.error.reason, "permission_required");

    // manager TEM telemetry:read → passa o gate; sem esse profissional → 404 (não 403). Prova o gate abre.
    const managerConsole = await requestJson(baseUrl, `/api/v1/telemetry/km?professionalId=${professionalId}`, {
      headers: authHeaders(seed.tenant, seed.manager, "manager"),
    });
    assert.equal(managerConsole.status, 404);

    // Ingestão: a rota /mobile/telemetry está montada e REUSA field_location:send. viewer NÃO tem essa
    // permissão → 403 permission_required (não 404 route_not_found — prova a rota montada + o gate).
    const viewerIngest = await requestJson(baseUrl, "/api/v1/mobile/telemetry", {
      method: "POST",
      headers: authHeaders(seed.tenant, seed.viewer, "viewer"),
      body: { events: [{ client_action_id: randomUUID(), eventType: "app_connect", capturedAt: "2026-07-24T11:00:00.000Z" }] },
    });
    assert.equal(viewerIngest.status, 403);
    assert.equal(viewerIngest.body.error.reason, "permission_required");
  });
});

type SeedData = {
  readonly tenant: Tenant;
  readonly admin: User;
  readonly manager: User;
  readonly tech: User;
  readonly viewer: User;
};

async function withTelemetryApi(callback: (context: { baseUrl: string; seed: SeedData }) => Promise<void>): Promise<void> {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  process.env.LOG_LEVEL = "silent";

  const [{ createApp }, { CoreSaasRegistry }, { MemoryCoreSaasAdapter }, { InMemoryCoreSaasStore }] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  resetOperatorProfileRuntimeForTests();
  resetTelemetryRuntimeForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenant = core.createTenant({ name: "Tenant Telemetry" });
  const admin = core.createUser({ tenantId: tenant.id, name: "Admin", email: "tele-admin@example.com", roles: ["tenant_admin"] });
  const manager = core.createUser({ tenantId: tenant.id, name: "Manager", email: "tele-manager@example.com", roles: ["manager"] });
  const tech = core.createUser({ tenantId: tenant.id, name: "Tech", email: "tele-tech@example.com", roles: ["field_technician"] });
  const viewer = core.createUser({ tenantId: tenant.id, name: "Viewer", email: "tele-viewer@example.com", roles: ["viewer"] });

  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({ baseUrl, seed: { tenant, admin, manager, tech, viewer } });
  } finally {
    await closeServer(server);
    resetOperatorProfileRuntimeForTests();
    resetTelemetryRuntimeForTests();
  }
}

function authHeaders(tenant: Tenant, user: User, role: string): Record<string, string> {
  return { "x-tenant-id": tenant.id, "x-user-id": user.id, "x-role": role };
}

async function requestJson(
  baseUrl: string,
  path: string,
  options: { readonly method?: string; readonly headers?: Record<string, string>; readonly body?: unknown } = {},
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json", ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");
  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
