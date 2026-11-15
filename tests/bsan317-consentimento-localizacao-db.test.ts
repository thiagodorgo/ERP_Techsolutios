import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import test, { after } from "node:test";

import { closeServer, createEphemeralRole, getBaseUrl, requestJson, type EphemeralRole } from "./helpers/auth-identity-fixture.js";
import { createBsan317AdminClient } from "./helpers/bsan317-db.js";
import {
  assertApplicationNamePropagated,
  buildApplicationName,
  captureSettled,
  waitForOwnBlockedOrSettled,
  withApplicationName,
} from "./helpers/pg-barrier.js";
import { TODOS_OS_MODULOS } from "./helpers/san3-18-modulos.js";

// -----------------------------------------------------------------------------------------------
// B-SAN3-17 (itens 18 e 52) — o consentimento de localização no POSTGRES REAL, sob um papel efêmero NOSUPERUSER
// sem BYPASSRLS (o RLS FORCE vale para ele; o admin só semeia e limpa). O app é o REAL (`createApp` com o núcleo
// Prisma, JWT e RBAC persistente), como o T-DB2b do `bsan315-technician-stock-db.test.ts`.
// Claude, sem cruzamento, declarado (§C7 11(2), ordem do dono de 13/11).
//
//   D1  sem perfil → 422 operator_profile_required e 0 linha em field_operator_locations
//   D2  o titular consente → tracking_consent true e carimbo; a posição → 201 e 1 linha
//   D3  revoga → false e carimbo nulo; a posição → 422 e continua 1 linha
//   D4  só o perfil do ator muda (o de outro técnico da organização fica byte a byte)
//   D5  audit_logs: as 3 ações (granted, revoked, superseded); as chaves de negócio do metadata são EXATAMENTE
//       {userId, hasConsent, textVersion, decidedAt, status}, além do envelope do `EnterpriseAuditLogService`
//       (leitura declarada no diário `dev-17-cl.md`); nada de organização, coordenada nem client_action_id
//   D6  (CR17R2-07) concede → revoga → reenvio do 1º aceite → superseded; tracking_consent false e a contagem não
//       muda depois de uma posição
//   T-17-TOCTOU-db (Emenda 1.5, CX3-568-01) a escrita revalida o consentimento na MESMA transação, com `FOR NO KEY UPDATE`
//       na linha do perfil: (a) a revogação confirma antes da gravação → 422 e 0 linha; (b) a gravação segura a
//       linha → a revogação espera, a posição gravada é anterior a ela, e a próxima gravação → 422.
//   T-17-FILA-db (Emenda 1.6, CX3-568-03) (a) duas posições que começam depois da revogação enfileirada esperam
//       atrás dela → 422 e 0 linha; (b) terminada a posição anterior, a revogação não espera a posição nova;
//       (c) a posição em voo não segura o INSERT com FK para o perfil (`telemetry_events`), porque `FOR NO KEY UPDATE`
//       não conflita com o `FOR KEY SHARE` das FKs.
//   T-17-ACEITE-VELHO-db (Emenda 1.7, C16-01) o aceite é decidido NA escrita: (a) o aceite velho e (b) o reenvio do
//       1º aceite, com a revogação na fila, saem superseded; (c) o aceite que passou a guarda perde para um aceite e
//       uma revogação mais novos; (d) o aceite novo com a revogação na fila vale; (e) a série.
//   T-17-RAJADA-db (Emendas 1.7 e 1.8) e T-17-RAJADA-CONSENT-db (Emenda 1.8): a rajada de posições (3 vagas) ou de
//       decisões (2 vagas) de UM titular espera na fila dele, fora do pool; a posição de outra organização passa.
//   T-17-CADASTRO-db (Emenda 1.8, `D-ORQ-568-CONSENTIMENTO-SO-PELO-APP`) o cadastro desliga e nunca liga.
//   T-17-PRAZO-db e T-17-PRAZO-TRAVA-db (Emenda 1.8, E17-07) a fila do titular tem prazo, e a escrita guardada tem
//       orçamento (`lock_timeout`): quem estoura sai 503 `field_location_busy`, e nada é gravado.
//   D7  (Emenda 1 da abertura, 2.2) o caso (a) do B22: traccar às 03:00 e app às 03:05; desligado o consentimento,
//       o latest e o detalhe da OS trazem o traccar; com since 03:01, nada do operador. Única prova do ramo
//       `source: { in: … }` do repositório Prisma.
//
// Semeadura em SQL cru pelo admin; teardown ESCOPADO por tenant_id (nunca curinga). Sem DATABASE_URL o arquivo
// DECLARA o pulo. Vermelho-controle na base `d2737339`: diário `dev-17-cl.md` §4.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
// pg-barrier: as conexões da suíte levam um application_name próprio, para a barreira só ver a fila desta suíte.
const APP = buildApplicationName("bsan317-db");
const ACCEPT_ROUTE = "/api/v1/mobile/location-consent";
const REVOKE_ROUTE = "/api/v1/mobile/location-consent/revoke";
const POSITION = "/api/v1/mobile/field-locations";
const TEXT_VERSION = "2026-11.b-san3-17.v1";
const AUDIT_ENVELOPE = new Set([
  "actorType",
  "actorEmail",
  "outcome",
  "severity",
  "correlationId",
  "requestId",
  "ipAddress",
  "userAgent",
  "resourceType",
  "resourceId",
]);

if (!connectionString) {
  test("B-SAN3-17 (consentimento de localização no Postgres) exige DATABASE_URL e um banco migrado", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suíte.",
  });
} else {
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL = "silent";
  process.env.JWT_SECRET ??= "dev-only-change-me";
  process.env.JWT_EXPIRES_IN ??= "15m";

  type Harness = Awaited<ReturnType<typeof bootstrap>>;
  let harnessPromise: Promise<Harness> | undefined;
  const harness = (): Promise<Harness> => (harnessPromise ??= bootstrap());

  async function bootstrap() {
    const taggedUrl = withApplicationName(connectionString!, APP);
    const admin = await createBsan317AdminClient(taggedUrl);
    const role: EphemeralRole = await createEphemeralRole(admin, taggedUrl);

    // O cliente GLOBAL do app (`src/database/prisma.ts` lê `globalThis.prisma` antes de criar o seu) passa a ser o do
    // papel efêmero: a rota real roda sem bypass de RLS, como o papel de runtime de produção (B-SAN3-05).
    (globalThis as { prisma?: unknown }).prisma = role.client;

    const posture = await role.client.$queryRawUnsafe<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>(
      `SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`,
    );
    assert.deepEqual(posture, [{ rolsuper: false, rolbypassrls: false }], "o app roda sob papel NOSUPERUSER e sem BYPASSRLS");
    await assertApplicationNamePropagated(role.client, APP);

    const [{ createApp }, { PrismaCoreSaasService }, { PrismaCoreSaasStore }, repos, { signAccessToken }] = await Promise.all([
      import("../src/app.js"),
      import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
      import("../src/modules/core-saas/store/prisma-core-saas.store.js"),
      import("../src/modules/core-saas/repositories/index.js"),
      import("../src/modules/auth/index.js"),
    ]);
    const client = role.client;
    const core = new PrismaCoreSaasService(
      new PrismaCoreSaasStore(
        client,
        new repos.TenantRepository(client),
        new repos.UserRepository(client),
        new repos.RoleRepository(client),
        new repos.UserRoleRepository(client),
        new repos.AuditLogRepository(client),
      ),
    );
    const server: Server = createApp(core).listen(0, "127.0.0.1");
    const baseUrl = await getBaseUrl(server);

    return { admin, role, server, baseUrl, signAccessToken, tenants: [] as string[] };
  }

  after(async () => {
    if (!harnessPromise) return;
    const h = await harnessPromise;
    try {
      await closeServer(h.server);
      const { drainCloudUsageBestEffortForTests } = await import("../src/modules/cloud-usage/cloud-usage.service.js");
      await drainCloudUsageBestEffortForTests();
      await teardownTenants(h.admin, h.tenants);
    } finally {
      await h.role.drop();
      await h.admin.$disconnect();
    }
  });

  // ------------------------------------------------------------------ semeadura (admin, SQL cru)

  type Actor = { readonly userId: string; readonly headers: Record<string, string> };
  type Scenario = { readonly tenantId: string; readonly tech: Actor; readonly manager: Actor; readonly profileId?: string };

  async function newTenant(h: Harness, tag: string): Promise<string> {
    const slug = `bsan317-${tag}-${randomUUID().slice(0, 8)}`;
    const moduleLiteral = `ARRAY[${TODOS_OS_MODULOS.map((module) => `'${module}'`).join(", ")}]::text[]`;
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO tenants (name, slug, modules) VALUES ($1, $1, ${moduleLiteral}) RETURNING id`,
      slug,
    );
    h.tenants.push(rows[0]!.id);
    return rows[0]!.id;
  }

  async function newUser(h: Harness, tenantId: string, tag: string): Promise<string> {
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO users (tenant_id, name, email) VALUES ($1::uuid, $2, $3) RETURNING id`,
      tenantId,
      `Usuário ${tag}`,
      `bsan317-${tag}-${randomUUID().slice(0, 8)}@example.com`,
    );
    return rows[0]!.id;
  }

  async function grantRole(h: Harness, tenantId: string, userId: string, key: string, permissions: readonly string[]): Promise<void> {
    const roles = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO roles (tenant_id, key, name, scope) VALUES ($1::uuid, $2, $3, 'tenant') RETURNING id`,
      tenantId,
      key,
      `Papel ${key} ${randomUUID().slice(0, 6)}`,
    );
    for (const permission of permissions) {
      const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO permissions (key, description) VALUES ($1, $1) ON CONFLICT (key) DO UPDATE SET key = EXCLUDED.key RETURNING id`,
        permission,
      );
      await h.admin.$executeRawUnsafe(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1::uuid, $2::uuid)`,
        roles[0]!.id,
        rows[0]!.id,
      );
    }
    await h.admin.$executeRawUnsafe(
      `INSERT INTO user_role_assignments (tenant_id, user_id, role_id) VALUES ($1::uuid, $2::uuid, $3::uuid)`,
      tenantId,
      userId,
      roles[0]!.id,
    );
  }

  async function actorOf(h: Harness, tenantId: string, userId: string, role: string): Promise<Actor> {
    const token = await h.signAccessToken({ user_id: userId, tenant_id: tenantId, email: `${userId}@example.com`, roles: [role] });
    return { userId, headers: { authorization: `Bearer ${token}` } };
  }

  async function newProfile(h: Harness, tenantId: string, userId: string, consent: boolean): Promise<string> {
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO operator_profiles (tenant_id, user_id, full_name, tracking_consent, tracking_consent_at)
       VALUES ($1::uuid, $2::uuid, 'Técnico B-SAN3-17', $3, CASE WHEN $3 THEN now() ELSE NULL END) RETURNING id`,
      tenantId,
      userId,
      consent,
    );
    return rows[0]!.id;
  }

  /** Organização com um técnico (field_location:send) e um gestor (leitura ao vivo, OS e cadastro). */
  async function scenario(h: Harness, tag: string, profile: "none" | "consented" | "not-consented"): Promise<Scenario> {
    const tenantId = await newTenant(h, tag);
    const techId = await newUser(h, tenantId, `${tag}-tec`);
    const managerId = await newUser(h, tenantId, `${tag}-gestor`);
    await grantRole(h, tenantId, techId, "field_technician", ["field_location:send"]);
    await grantRole(h, tenantId, managerId, "manager", [
      "field_location:read",
      "work_orders:read",
      "operator_profiles:read",
      "operator_profiles:update",
    ]);
    const profileId = profile === "none" ? undefined : await newProfile(h, tenantId, techId, profile === "consented");
    return {
      tenantId,
      tech: await actorOf(h, tenantId, techId, "field_technician"),
      manager: await actorOf(h, tenantId, managerId, "manager"),
      profileId,
    };
  }

  // A decisão padrão é de 1 s no futuro (dentro dos 5 min do contrato): um aceite feito logo depois de o gestor criar o
  // perfil não pode cair no mesmo milissegundo do `updated_at` dele, ou a guarda de ordem o trataria como velho.
  function decision(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return { decided_at: new Date(Date.now() + 1_000).toISOString(), client_action_id: randomUUID(), text_version: TEXT_VERSION, ...overrides };
  }

  const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  async function post(h: Harness, path: string, actor: Actor, body: Record<string, unknown>) {
    return requestJson(h.baseUrl, path, { method: "POST", headers: actor.headers, body });
  }

  async function locationRows(h: Harness, tenantId: string, userId: string): Promise<number> {
    const rows = await h.admin.$queryRawUnsafe<Array<{ n: number }>>(
      `SELECT count(*)::int AS n FROM field_operator_locations WHERE tenant_id = $1::uuid AND operator_user_id = $2::uuid`,
      tenantId,
      userId,
    );
    return rows[0]!.n;
  }

  async function profileRow(h: Harness, profileId: string) {
    const rows = await h.admin.$queryRawUnsafe<
      Array<{ tracking_consent: boolean; tracking_consent_at: Date | null; updated_at: Date; updated_by: string | null }>
    >(`SELECT tracking_consent, tracking_consent_at, updated_at, updated_by FROM operator_profiles WHERE id = $1::uuid`, profileId);
    return rows[0]!;
  }

  // ------------------------------------------------------------------ casos

  test("[D1] sem perfil → 422 operator_profile_required e 0 linha gravada (papel sem bypass)", async () => {
    const h = await harness();
    const s = await scenario(h, "d1", "none");

    const recorded = await post(h, POSITION, s.tech, { latitude: -23.55, longitude: -46.63 });

    assert.equal(recorded.status, 422, JSON.stringify(recorded.body));
    assert.equal(recorded.body.error?.reason, "operator_profile_required");
    assert.equal(await locationRows(h, s.tenantId, s.tech.userId), 0);
  });

  test("[D2] o titular consente → tracking_consent true e carimbo no banco; a posição → 201 e 1 linha", async () => {
    const h = await harness();
    const s = await scenario(h, "d2", "not-consented");

    const accepted = await post(h, ACCEPT_ROUTE, s.tech, decision());
    assert.equal(accepted.status, 200, JSON.stringify(accepted.body));
    const row = await profileRow(h, s.profileId!);
    assert.equal(row.tracking_consent, true);
    assert.ok(row.tracking_consent_at instanceof Date, "o carimbo é gravado");

    const recorded = await post(h, POSITION, s.tech, { latitude: -23.55, longitude: -46.63 });
    assert.equal(recorded.status, 201, JSON.stringify(recorded.body));
    assert.equal(await locationRows(h, s.tenantId, s.tech.userId), 1);
  });

  test("[D3] revoga → false e carimbo nulo no banco; a posição → 422 e continua 1 linha", async () => {
    const h = await harness();
    const s = await scenario(h, "d3", "consented");
    assert.equal((await post(h, POSITION, s.tech, { latitude: -23.55, longitude: -46.63 })).status, 201, "arranjo: 1 posição consentida");

    const revoked = await post(h, REVOKE_ROUTE, s.tech, decision());
    assert.equal(revoked.status, 200, JSON.stringify(revoked.body));
    const row = await profileRow(h, s.profileId!);
    assert.equal(row.tracking_consent, false);
    assert.equal(row.tracking_consent_at, null);

    const recorded = await post(h, POSITION, s.tech, { latitude: -23.55, longitude: -46.63 });
    assert.equal(recorded.status, 422, JSON.stringify(recorded.body));
    assert.equal(recorded.body.error?.reason, "tracking_consent_required");
    assert.equal(await locationRows(h, s.tenantId, s.tech.userId), 1);
  });

  test("[D4] só o perfil do ator muda: o de outro técnico da organização fica igual", async () => {
    const h = await harness();
    const s = await scenario(h, "d4", "not-consented");
    const otherId = await newUser(h, s.tenantId, "d4-outro");
    const otherProfile = await newProfile(h, s.tenantId, otherId, false);
    const before = await profileRow(h, otherProfile);

    const accepted = await post(h, ACCEPT_ROUTE, s.tech, decision({ user_id: otherId, operator_profile_id: otherProfile }));

    assert.equal(accepted.status, 200, JSON.stringify(accepted.body));
    assert.equal((await profileRow(h, s.profileId!)).tracking_consent, true);
    assert.deepEqual(await profileRow(h, otherProfile), before, "o perfil alheio não muda");
  });

  test("[D5] audit_logs: granted, revoked e superseded, com o metadata da allowlist e nada de organização ou coordenada", async () => {
    const h = await harness();
    const s = await scenario(h, "d5", "not-consented");
    // O 1º aceite é posterior ao cadastro e anterior à revogação.
    await pause(20);
    const first = decision({ decided_at: new Date().toISOString() });
    await pause(20);

    const granted = await post(h, ACCEPT_ROUTE, s.tech, first);
    assert.equal(granted.body?.data?.status, "applied", JSON.stringify(granted.body));
    assert.equal((await post(h, REVOKE_ROUTE, s.tech, decision())).status, 200);
    const replay = await post(h, ACCEPT_ROUTE, s.tech, first);
    assert.equal(replay.body?.data?.status, "superseded", JSON.stringify(replay.body));

    let rows: Array<{ action: string; entity: string; entity_id: string | null; actor_user_id: string | null; metadata: Record<string, unknown> }> = [];
    for (let attempt = 0; attempt < 20 && rows.length < 3; attempt += 1) {
      rows = await h.admin.$queryRawUnsafe(
        `SELECT action, entity, entity_id, actor_user_id, metadata FROM audit_logs
          WHERE tenant_id = $1::uuid AND action LIKE 'field_location.consent_%' ORDER BY created_at`,
        s.tenantId,
      );
      if (rows.length < 3) await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.deepEqual(
      rows.map((row) => row.action),
      ["field_location.consent_granted", "field_location.consent_revoked", "field_location.consent_superseded"],
    );
    for (const row of rows) {
      const metadata = row.metadata ?? {};
      const business = Object.keys(metadata).filter((key) => !AUDIT_ENVELOPE.has(key)).sort();
      assert.deepEqual(business, ["decidedAt", "hasConsent", "status", "textVersion", "userId"], `${row.action}: ${JSON.stringify(metadata)}`);
      assert.equal(metadata.userId, s.tech.userId);
      assert.equal(metadata.textVersion, TEXT_VERSION);
      assert.equal(metadata.resourceType, "operator_profile");
      assert.equal(metadata.resourceId, s.profileId);
      const raw = JSON.stringify(metadata);
      for (const forbidden of [s.tenantId, "tenant_id", "tenantId", "latitude", "longitude", "client_action_id", "clientActionId", first.client_action_id as string]) {
        assert.equal(raw.includes(forbidden), false, `${row.action}: o metadata não leva ${forbidden}`);
      }
    }
    assert.deepEqual(
      rows.map((row) => `${row.metadata.status}/${row.metadata.hasConsent}`),
      ["applied/true", "applied/false", "superseded/false"],
    );
  });

  test("[D6] CR17R2-07: concede → revoga → reenvio do 1º aceite → superseded; tracking_consent false e a contagem não muda", async () => {
    const h = await harness();
    const s = await scenario(h, "d6", "not-consented");
    await pause(20);
    const first = decision({ decided_at: new Date().toISOString() });
    await pause(20);

    const granted = await post(h, ACCEPT_ROUTE, s.tech, first);
    assert.equal(granted.body?.data?.status, "applied", JSON.stringify(granted.body));
    assert.equal((await post(h, POSITION, s.tech, { latitude: -23.55, longitude: -46.63 })).status, 201, "arranjo: 1 posição consentida");
    assert.equal((await post(h, REVOKE_ROUTE, s.tech, decision())).status, 200);
    const replay = await post(h, ACCEPT_ROUTE, s.tech, first);

    assert.equal(replay.status, 200, JSON.stringify(replay.body));
    assert.equal(replay.body.data.status, "superseded");
    assert.equal(replay.body.data.granted, false);
    assert.equal((await profileRow(h, s.profileId!)).tracking_consent, false);
    const recorded = await post(h, POSITION, s.tech, { latitude: -23.55, longitude: -46.63 });
    assert.equal(recorded.status, 422, JSON.stringify(recorded.body));
    assert.equal(await locationRows(h, s.tenantId, s.tech.userId), 1);
  });

  test("[D7] 2.2 no Postgres: traccar 03:00 e app 03:05; desligado o consentimento, latest e detalhe da OS trazem o traccar; since 03:01 → nada", async () => {
    const h = await harness();
    const s = await scenario(h, "d7", "consented");
    await h.admin.$executeRawUnsafe(
      `INSERT INTO field_operator_locations (tenant_id, operator_user_id, source, latitude, longitude, recorded_at, metadata)
       VALUES ($1::uuid, $2::uuid, 'traccar', -22.9, -43.2, '2026-11-14T03:00:00Z', '{}'::jsonb)`,
      s.tenantId,
      s.tech.userId,
    );
    const workOrders = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO work_orders (tenant_id, code, title, status, assigned_user_id) VALUES ($1::uuid, $2, 'OS B-SAN3-17 D7', 'assigned', $3::uuid) RETURNING id`,
      s.tenantId,
      `BSAN317-${randomUUID().slice(0, 6)}`,
      s.tech.userId,
    );
    const workOrderId = workOrders[0]!.id;
    const recorded = await post(h, POSITION, s.tech, { latitude: -23.55, longitude: -46.63, recordedAt: "2026-11-14T03:05:00.000Z" });
    assert.equal(recorded.status, 201, JSON.stringify(recorded.body));

    const latestOf = async (query = "") => {
      const response = await requestJson(h.baseUrl, `/api/v1/field-locations/latest${query}`, { headers: s.manager.headers });
      assert.equal(response.status, 200, JSON.stringify(response.body));
      return (response.body.data as any[]).filter((row) => row.operatorUserId === s.tech.userId);
    };
    assert.equal((await latestOf())[0]?.source, "mobile", "antes de desligar, latest traz o ponto do app");

    const off = await requestJson(h.baseUrl, `/api/v1/operator-profiles/${s.profileId}`, {
      method: "PATCH",
      headers: s.manager.headers,
      body: { tracking_consent: false },
    });
    assert.equal(off.status, 200, JSON.stringify(off.body));

    const after = await latestOf();
    assert.equal(after.length, 1, JSON.stringify(after));
    assert.equal(after[0].source, "traccar");
    assert.equal(after[0].latitude, -22.9);
    const map = await requestJson(h.baseUrl, `/api/v1/work-orders/${workOrderId}/map-start-points`, { headers: s.manager.headers });
    assert.equal(map.status, 200, JSON.stringify(map.body));
    assert.equal((map.body.data as any)?.technician?.latitude, -22.9, "o detalhe da OS traz a viatura");
    assert.deepEqual(await latestOf("?since=2026-11-14T03:01:00.000Z"), [], "o since vale para o ponto reposto");
  });

  // ------------------------------------------------------------------ Emenda 1.5 (CX3-568-01): a escrita é a autoridade

  function technicianActor(s: Scenario) {
    return { tenantId: s.tenantId, userId: s.tech.userId, roles: ["field_technician"], permissions: ["field_location:send"] } as const;
  }

  test("[T-17-TOCTOU-db] (a) a revogação confirma antes da gravação (depois da checagem do serviço) → 422 tracking_consent_required e 0 linha", async () => {
    const h = await harness();
    const s = await scenario(h, "toctou-a", "consented");
    const [{ FieldLocationService }, { RlsPrismaFieldLocationRepository }] = await Promise.all([
      import("../src/modules/field-location/field-location.service.js"),
      import("../src/modules/field-location/field-location-prisma.repository.js"),
    ]);
    const real = new RlsPrismaFieldLocationRepository(h.role.client);
    let revokedInsideTheWrite = false;
    const probe = {
      async record(...args: Parameters<typeof real.record>) {
        const revoked = await post(h, REVOKE_ROUTE, s.tech, decision());
        assert.equal(revoked.status, 200, JSON.stringify(revoked.body));
        revokedInsideTheWrite = true;
        return real.record(...args);
      },
      listLatest: (input: Parameters<typeof real.listLatest>[0]) => real.listLatest(input),
      listHistory: (input: Parameters<typeof real.listHistory>[0]) => real.listHistory(input),
    };
    const service = new FieldLocationService(probe);

    const outcome = await service.recordMobileLocation(technicianActor(s) as never, { latitude: -23.55, longitude: -46.63 }).then(
      (location) => ({ status: 201, reason: undefined as string | undefined, id: location.id }),
      (error: { statusCode?: number; reason?: string }) => ({ status: error.statusCode, reason: error.reason, id: undefined }),
    );

    assert.equal(revokedInsideTheWrite, true, "a sonda revogou dentro da escrita");
    assert.equal((await profileRow(h, s.profileId!)).tracking_consent, false, "o consentimento final é false");
    assert.deepEqual(
      { status: outcome.status, reason: outcome.reason },
      { status: 422, reason: "tracking_consent_required" },
      `a escrita, sob papel sem bypass, recusa a posição de quem revogou no meio (${JSON.stringify(outcome)})`,
    );
    assert.equal(await locationRows(h, s.tenantId, s.tech.userId), 0, "0 linha gravada");
  });

  test("[T-17-TOCTOU-db] (b) a gravação segura a linha do perfil (FOR NO KEY UPDATE): a revogação espera, a posição é anterior a ela, e a próxima → 422", async () => {
    const h = await harness();
    const s = await scenario(h, "toctou-b", "consented");
    const [{ FieldLocationService }, { RlsPrismaFieldLocationRepository }] = await Promise.all([
      import("../src/modules/field-location/field-location.service.js"),
      import("../src/modules/field-location/field-location-prisma.repository.js"),
    ]);
    let signalLocked!: () => void;
    const locked = new Promise<void>((resolve) => (signalLocked = resolve));
    let release!: () => void;
    const released = new Promise<void>((resolve) => (release = resolve));
    // O gancho roda dentro da transação da escrita, logo depois do `SELECT … FOR NO KEY UPDATE` e antes do INSERT.
    const repository = new RlsPrismaFieldLocationRepository(h.role.client, {
      afterConsentLocked: async () => {
        signalLocked();
        await released;
      },
    });
    const service = new FieldLocationService(repository);

    const write = captureSettled(service.recordMobileLocation(technicianActor(s) as never, { latitude: -23.55, longitude: -46.63 }));
    try {
      const held = await Promise.race([locked.then(() => true), pause(10_000).then(() => false)]);
      assert.equal(held, true, "a escrita segura a linha do perfil antes do INSERT (o gancho depois do FOR NO KEY UPDATE rodou)");

      const revoke = captureSettled(post(h, REVOKE_ROUTE, s.tech, decision()));
      let revokeSettled = false;
      void revoke.then(() => (revokeSettled = true));
      const seen = await waitForOwnBlockedOrSettled(h.admin, {
        applicationName: APP,
        loser: revoke,
        label: "a revogação do titular espera a escrita que segura a linha",
        timeoutMs: 3_000,
      });
      assert.match(seen, /^bloqueado: .*operator_profiles/i, `a revogação espera a escrita (${seen})`);
      // A ordem: o UPDATE da revogação espera a trava da escrita, e só anda quando a transação da escrita termina. Logo a
      // posição gravada é anterior à revogação. (Os carimbos não servem de prova: o Prisma os calcula fora do banco.)
      assert.equal(revokeSettled, false, "a revogação ainda espera quando a escrita é liberada");
      release();

      const written = await write;
      assert.equal(written.status, "fulfilled", JSON.stringify(written));
      const revoked = await revoke;
      assert.equal(revoked.status, "fulfilled", JSON.stringify(revoked));
      assert.equal(revoked.status === "fulfilled" ? revoked.value.status : 0, 200);

      assert.equal(await locationRows(h, s.tenantId, s.tech.userId), 1, "a posição da escrita que segurou a linha fica gravada");
      const profile = await profileRow(h, s.profileId!);
      assert.equal(profile.tracking_consent, false);

      const next = await post(h, POSITION, s.tech, { latitude: -23.56, longitude: -46.64 });
      assert.equal(next.status, 422, JSON.stringify(next.body));
      assert.equal(next.body.error?.reason, "tracking_consent_required");
      assert.equal(await locationRows(h, s.tenantId, s.tech.userId), 1, "a próxima gravação não grava");
    } finally {
      release();
      await write;
    }
  });


  // ------------------------------------------------------------------ Emendas 1.6 a 1.9: a fila da revogação, o aceite
  // decidido na escrita, o cadastro que só desliga, a fila do titular com prazo e o orçamento da escrita guardada.
  // A barreira é sempre causal: o grafo `pg_stat_activity` + `pg_blocking_pids`, escopado pelo `application_name` da
  // suíte, e os avisos das filas do titular. O relógio só aparece como prazo de falha ou como o prazo do próprio produto.

  function gate() {
    let open!: () => void;
    const opened = new Promise<void>((resolve) => (open = resolve));
    return { open, opened };
  }

  type GraphRow = { pid: number; state: string; wait: string | null; query: string; blockers: number[] };
  async function lockGraph(h: Harness): Promise<GraphRow[]> {
    return h.admin.$queryRawUnsafe<GraphRow[]>(
      "SELECT pid, state, wait_event_type AS wait, left(regexp_replace(query, '[[:space:]]+', ' ', 'g'), 80) AS query, pg_blocking_pids(pid) AS blockers " +
        "FROM pg_stat_activity WHERE application_name = $1 AND pid <> pg_backend_pid() AND backend_type = 'client backend' AND state <> 'idle'",
      APP,
    );
  }

  async function waitBlockedCount(h: Harness, n: number, loser: Promise<unknown>, label: string): Promise<string> {
    let settled = false;
    void loser.then(() => (settled = true));
    const deadline = Date.now() + 3_000;
    for (;;) {
      const rows = (await lockGraph(h)).filter((r) => r.state === "active" && r.wait === "Lock");
      if (rows.length >= n) return `bloqueado(${rows.length})`;
      if (settled) return "resolvido";
      if (Date.now() > deadline) return `timeout(${label}; bloqueados=${rows.length}/${n})`;
      await pause(10);
    }
  }

  function outcomeOf(o: { status: "fulfilled"; value: any } | { status: "rejected"; reason: any }): string {
    if (o.status === "fulfilled") {
      const v = o.value;
      if (v && typeof v === "object" && "body" in v && typeof v.status === "number") {
        const st = (v.body?.data as any)?.status;
        return `http${v.status}${st ? `:${st}` : ""}${v.body?.error?.reason ? `:${v.body.error.reason}` : ""}`;
      }
      if (v && typeof v === "object" && typeof v.status === "string") return `ok:${v.status}`;
      return "fulfilled";
    }
    const r = o.reason;
    return String(r?.reason ?? r?.code ?? r?.message ?? r).slice(0, 120);
  }

  const consentOf = async (h: Harness, profileId: string): Promise<boolean> => (await profileRow(h, profileId)).tracking_consent;

  async function realClasses(h: Harness) {
    const [fl, flRepo, op, opRepo] = await Promise.all([
      import("../src/modules/field-location/field-location.service.js"),
      import("../src/modules/field-location/field-location-prisma.repository.js"),
      import("../src/modules/operator-profiles/operator-profile.service.js"),
      import("../src/modules/operator-profiles/operator-profile-prisma.repository.js"),
    ]);
    return {
      FieldLocationService: fl.FieldLocationService,
      RlsPrismaFieldLocationRepository: flRepo.RlsPrismaFieldLocationRepository,
      profiles: new op.OperatorProfileService(new opRepo.RlsPrismaOperatorProfileRepository(h.role.client)),
    };
  }

  // A posição A (e, com holdCalls > 1, as seguintes) segura a linha do perfil no gancho, dentro da transação da escrita.
  async function holdA(h: Harness, s: Scenario, holdCalls: number, extraHooks: Record<string, unknown> = {}) {
    const k = await realClasses(h);
    let calls = 0;
    const locked: ReturnType<typeof gate>[] = [];
    const release: ReturnType<typeof gate>[] = [];
    for (let i = 0; i < holdCalls; i++) {
      locked.push(gate());
      release.push(gate());
    }
    const repository = new k.RlsPrismaFieldLocationRepository(h.role.client, {
      ...extraHooks,
      afterConsentLocked: async () => {
        const i = calls++;
        if (i < holdCalls) {
          locked[i]!.open();
          await release[i]!.opened;
        }
      },
    } as never);
    const service = new k.FieldLocationService(repository, async () => k.profiles);
    const send = (lat: number) => captureSettled(service.recordMobileLocation(technicianActor(s) as never, { latitude: lat, longitude: -46.6 }));
    const A = send(-23.5);
    assert.equal(await Promise.race([locked[0]!.opened.then(() => true), pause(10_000).then(() => false)]), true, "A no gancho");
    const aPid = (await lockGraph(h)).find((r) => r.state === "idle in transaction")?.pid;
    const releaseAll = () => release.forEach((g) => g.open());
    return { A, aPid, send, locked, release, releaseAll, service, k };
  }

  async function revokeBehind(h: Harness, s: Scenario, aPid: number | undefined) {
    const R = captureSettled(post(h, REVOKE_ROUTE, s.tech, decision()));
    const seenR = await waitForOwnBlockedOrSettled(h.admin, { applicationName: APP, loser: R, blockedBy: aPid, label: "R atrás de A", timeoutMs: 3_000 });
    const rPid = (await lockGraph(h)).find((r) => r.wait === "Lock" && /UPDATE.*operator_profiles/i.test(r.query))?.pid;
    return { R, seenR, rPid };
  }

  // O titular que TAMBÉM tem `operator_profiles:update` (o formulário web dele), com o perfil ligado.
  async function holderManager(h: Harness, tag: string): Promise<Scenario> {
    const tenantId = await newTenant(h, tag);
    const userId = await newUser(h, tenantId, `${tag}-titular-gestor`);
    await grantRole(h, tenantId, userId, "manager", ["field_location:send", "field_location:read", "operator_profiles:read", "operator_profiles:update"]);
    const profileId = await newProfile(h, tenantId, userId, true);
    const actor = await actorOf(h, tenantId, userId, "manager");
    return { tenantId, tech: actor, manager: actor, profileId };
  }

  const patchProfile = (h: Harness, s: Scenario, actor: Actor, body: Record<string, unknown>) =>
    requestJson(h.baseUrl, `/api/v1/operator-profiles/${s.profileId}`, { method: "PATCH", headers: actor.headers, body });

  // Só os comandos que escrevem ou travam a linha do perfil (a trava da posição e a do aceite começam por
  // `SELECT tracking_consent`; a revogação, por `UPDATE "public"."operator_profiles"`). A leitura do Prisma, `SELECT
  // "public"…`, não casa. O texto chega com espaço na frente e cortado em 80 caracteres pelo `lockGraph`.
  const GUARDED = /^\s*(SELECT tracking_consent(, updated_at)? FROM operator_profiles|UPDATE "public"\."operator_profiles")/;

  // ---- Emenda 1.6 (CX3-568-03): a revogação enfileirada não é ultrapassada

  test("[T-17-FILA-db] (a) CX3-568-03: duas posições que começam depois da revogação enfileirada esperam atrás dela → 422 e 0 linha", async () => {
    const h = await harness();
    const s = await scenario(h, "fila-a", "consented");
    const { A, aPid, send, releaseAll } = await holdA(h, s, 1);
    try {
      const { R, seenR, rPid } = await revokeBehind(h, s, aPid);
      assert.match(String(seenR), /^bloqueado/, `R espera A (${String(seenR)})`);
      const B = send(-23.51);
      const seenB = await waitForOwnBlockedOrSettled(h.admin, { applicationName: APP, loser: B, blockedBy: rPid, minBlocked: 1, label: "B", timeoutMs: 3_000 });
      const C = send(-23.52);
      const seenC = await waitForOwnBlockedOrSettled(h.admin, { applicationName: APP, loser: C, blockedBy: rPid, minBlocked: 2, label: "C", timeoutMs: 3_000 });
      assert.match(String(seenB), /^bloqueado/, `B espera atrás de R (${String(seenB)})`);
      assert.match(String(seenC), /^bloqueado/, `C espera atrás de R (${String(seenC)})`);
      const waiting = (await lockGraph(h)).filter((r) => r.state === "active" && r.wait === "Lock" && /SELECT tracking_consent/.test(r.query));
      assert.equal(waiting.length, 2, `B e C bloqueadas na trava guardada (${JSON.stringify(waiting)})`);
      for (const w of waiting) assert.ok(rPid !== undefined && w.blockers.includes(rPid), `pg_blocking_pids contém o pid de R (${JSON.stringify(w)})`);
      releaseAll();
      const [a, r, b, c] = await Promise.all([A, R, B, C]);
      assert.deepEqual(
        { A: outcomeOf(a), R: outcomeOf(r), B: outcomeOf(b), C: outcomeOf(c), rows: await locationRows(h, s.tenantId, s.tech.userId), final: await consentOf(h, s.profileId!) },
        { A: "fulfilled", R: "http200:applied", B: "tracking_consent_required", C: "tracking_consent_required", rows: 1, final: false },
      );
    } finally {
      releaseAll();
      await A;
    }
  });

  test("[T-17-FILA-db] (b) CX3-568-03: terminada a posição anterior, a revogação não espera a posição nova", async () => {
    const h = await harness();
    const s = await scenario(h, "fila-b", "consented");
    const { A, aPid, send, locked, release, releaseAll } = await holdA(h, s, 2);
    try {
      const { R, seenR, rPid } = await revokeBehind(h, s, aPid);
      assert.match(String(seenR), /^bloqueado/, `R espera A (${String(seenR)})`);
      const B = send(-23.51);
      await Promise.race([
        locked[1]!.opened,
        waitForOwnBlockedOrSettled(h.admin, { applicationName: APP, loser: B, blockedBy: rPid, minBlocked: 1, label: "B", timeoutMs: 3_000 }),
      ]);
      release[0]!.open();
      await A;
      const seenR2 = await waitForOwnBlockedOrSettled(h.admin, { applicationName: APP, loser: R, label: "R depois de A", timeoutMs: 3_000 });
      assert.equal(seenR2, "resolvido", `R não pode ficar presa pela posição nova (${seenR2})`);
      release[1]!.open();
      const [a, r, b] = await Promise.all([A, R, B]);
      assert.deepEqual(
        { A: outcomeOf(a), R: outcomeOf(r), B: outcomeOf(b), rows: await locationRows(h, s.tenantId, s.tech.userId), final: await consentOf(h, s.profileId!) },
        { A: "fulfilled", R: "http200:applied", B: "tracking_consent_required", rows: 1, final: false },
      );
    } finally {
      releaseAll();
      await A;
    }
  });

  test("[T-17-FILA-db] (c) a posição em voo não segura o INSERT com FK para o perfil (telemetry_events)", async () => {
    const h = await harness();
    const s = await scenario(h, "fila-c", "consented");
    const { withTenantRls } = await import("../src/database/rls.js");
    const { A, aPid, releaseAll } = await holdA(h, s, 1);
    try {
      const insert = captureSettled(
        withTenantRls(h.role.client, s.tenantId, (tx) =>
          tx.$executeRawUnsafe(
            "INSERT INTO telemetry_events (tenant_id, operator_profile_id, event_type, captured_at, client_action_id) VALUES ($1::uuid, $2::uuid, 'heartbeat', now(), $3)",
            s.tenantId,
            s.profileId,
            randomUUID(),
          ),
        ),
      );
      const seenFK = await waitForOwnBlockedOrSettled(h.admin, { applicationName: APP, loser: insert, blockedBy: aPid, label: "telemetria × posição em voo", timeoutMs: 3_000 });
      assert.equal(seenFK, "resolvido", `o INSERT com FK para o perfil não espera a posição em voo (${seenFK})`);
      releaseAll();
      const [a, ins] = await Promise.all([A, insert]);
      assert.deepEqual({ A: outcomeOf(a), FK: outcomeOf(ins) }, { A: "fulfilled", FK: "fulfilled" });
    } finally {
      releaseAll();
      await A;
    }
  });

  // ---- Emenda 1.7 (C16-01): o aceite do titular é decidido NA escrita, sob a linha travada

  test("[T-17-ACEITE-VELHO-db] (a) o aceite VELHO que chega com a revogação na fila não a desfaz", async () => {
    const h = await harness();
    const s = await scenario(h, "aceite-a", "consented");
    const { A, aPid, send, releaseAll } = await holdA(h, s, 1);
    try {
      const { R, seenR } = await revokeBehind(h, s, aPid);
      assert.match(String(seenR), /^bloqueado/, `R espera A (${String(seenR)})`);
      const G = captureSettled(post(h, ACCEPT_ROUTE, s.tech, decision({ decided_at: new Date(Date.now() - 60_000).toISOString() })));
      const seenG = await waitBlockedCount(h, 2, G, "G");
      assert.match(seenG, /^bloqueado/, `G espera na fila da linha (${seenG})`);
      releaseAll();
      const [, r, g] = await Promise.all([A, R, G]);
      const next = await send(-23.6);
      assert.deepEqual(
        { R: outcomeOf(r), G: outcomeOf(g), final: await consentOf(h, s.profileId!), next: outcomeOf(next) },
        { R: "http200:applied", G: "http200:superseded", final: false, next: "tracking_consent_required" },
      );
    } finally {
      releaseAll();
      await A;
    }
  });

  test("[T-17-ACEITE-VELHO-db] (b) o REENVIO do 1º aceite com a revogação na fila sai superseded (o D6 concorrente)", async () => {
    const h = await harness();
    const s = await scenario(h, "aceite-b", "not-consented");
    await pause(20);
    const first = decision({ decided_at: new Date().toISOString() });
    await pause(20);
    const granted = await post(h, ACCEPT_ROUTE, s.tech, first);
    assert.equal((granted.body?.data as any)?.status, "applied", JSON.stringify(granted.body));
    const { A, aPid, releaseAll } = await holdA(h, s, 1);
    try {
      const { R, seenR } = await revokeBehind(h, s, aPid);
      assert.match(String(seenR), /^bloqueado/, `R espera A (${String(seenR)})`);
      const G = captureSettled(post(h, ACCEPT_ROUTE, s.tech, first));
      const seenG = await waitBlockedCount(h, 2, G, "G");
      assert.match(seenG, /^bloqueado/, `o reenvio espera na fila da linha (${seenG})`);
      releaseAll();
      const [, , g] = await Promise.all([A, R, G]);
      const after = await post(h, POSITION, s.tech, { latitude: -23.56, longitude: -46.64 });
      assert.deepEqual(
        { replay: outcomeOf(g), final: await consentOf(h, s.profileId!), positionAfter: after.status },
        { replay: "http200:superseded", final: false, positionAfter: 422 },
      );
    } finally {
      releaseAll();
      await A;
    }
  });

  test("[T-17-ACEITE-VELHO-db] (c) o aceite lê false e passa a guarda; um aceite e uma revogação MAIS NOVOS confirmam antes da escrita dele", async () => {
    const h = await harness();
    const s = await scenario(h, "aceite-c", "not-consented");
    await pause(20);
    const k = await realClasses(h);
    let triggered = false;
    const wrapped = new Proxy(k.profiles as object, {
      get(target, prop, recv) {
        const v = Reflect.get(target, prop, recv);
        if (typeof v !== "function") return v;
        if (prop === "update" || prop === "applyOwnTrackingConsentGrant") {
          return async (...args: unknown[]) => {
            const isGrant = prop === "applyOwnTrackingConsentGrant" || (args[2] as { tracking_consent?: boolean })?.tracking_consent === true;
            if (isGrant && !triggered) {
              triggered = true;
              const g2 = await post(h, ACCEPT_ROUTE, s.tech, decision({ decided_at: new Date(Date.now() + 1_000).toISOString() }));
              assert.equal((g2.body?.data as any)?.status, "applied", JSON.stringify(g2.body));
              await pause(5);
              const r2 = await post(h, REVOKE_ROUTE, s.tech, decision());
              assert.equal(r2.status, 200);
            }
            return (v as (...x: unknown[]) => unknown).apply(target, args);
          };
        }
        return (v as (...x: unknown[]) => unknown).bind(target);
      },
    });
    const service = new k.FieldLocationService(new k.RlsPrismaFieldLocationRepository(h.role.client), async () => wrapped as never);
    const g = await captureSettled(service.setOwnTrackingConsent(technicianActor(s) as never, true, decision({ decided_at: new Date().toISOString() })));
    assert.deepEqual(
      { triggered, G: outcomeOf(g as never), final: await consentOf(h, s.profileId!) },
      { triggered: true, G: "ok:superseded", final: false },
    );
  });

  test("[T-17-ACEITE-VELHO-db] (d) (não regredir) o aceite NOVO com a revogação na fila continua valendo", async () => {
    const h = await harness();
    const s = await scenario(h, "aceite-d", "consented");
    const { A, aPid, releaseAll } = await holdA(h, s, 1);
    try {
      const { R, seenR } = await revokeBehind(h, s, aPid);
      assert.match(String(seenR), /^bloqueado/, `R espera A (${String(seenR)})`);
      const G = captureSettled(post(h, ACCEPT_ROUTE, s.tech, decision({ decided_at: new Date(Date.now() + 2_000).toISOString() })));
      const seenG = await waitBlockedCount(h, 2, G, "G");
      assert.match(seenG, /^bloqueado/, `G espera na fila da linha (${seenG})`);
      releaseAll();
      const [, , g] = await Promise.all([A, R, G]);
      assert.deepEqual({ G: outcomeOf(g), final: await consentOf(h, s.profileId!) }, { G: "http200:applied", final: true });
    } finally {
      releaseAll();
      await A;
    }
  });

  test("[T-17-ACEITE-VELHO-db] (e) (não regredir) em série: revoga; aceite velho → superseded; aceite novo → applied; reafirma → carimbo mantido", async () => {
    const h = await harness();
    const s = await scenario(h, "aceite-e", "consented");
    const k = await realClasses(h);
    const service = new k.FieldLocationService(new k.RlsPrismaFieldLocationRepository(h.role.client), async () => k.profiles);
    await pause(20);
    const r = await service.setOwnTrackingConsent(technicianActor(s) as never, false, decision());
    const gOld = await service.setOwnTrackingConsent(technicianActor(s) as never, true, decision({ decided_at: new Date(Date.now() - 60_000).toISOString() }));
    const f1 = await consentOf(h, s.profileId!);
    const gNew = await service.setOwnTrackingConsent(technicianActor(s) as never, true, decision({ decided_at: new Date(Date.now() + 1_000).toISOString() }));
    const again = await service.setOwnTrackingConsent(technicianActor(s) as never, true, decision({ decided_at: new Date(Date.now() + 1_500).toISOString() }));
    assert.deepEqual(
      { r: r.status, gOld: gOld.status, f1, gNew: gNew.status, again: again.status, final: await consentOf(h, s.profileId!), stampKept: String(again.grantedAt) === String(gNew.grantedAt) },
      { r: "applied", gOld: "superseded", f1: false, gNew: "applied", again: "applied", final: true, stampKept: true },
    );
  });

  // ---- Emenda 1.7 (C16-05) e 1.8 (E17-03): a rajada de UM titular não segura o pool de outra organização

  test("[T-17-RAJADA-db] 11 posições do mesmo titular com A segurando: no máximo 3 escritas guardadas; a org2 passa", async () => {
    const h = await harness();
    const org1 = await scenario(h, "raj1", "consented");
    const org2 = await scenario(h, "raj2", "consented");
    let gateWaits = 0;
    const { A, send, releaseAll, service } = await holdA(h, org1, 1, { onHolderGateWait: () => (gateWaits += 1) });
    const rest: Promise<any>[] = [];
    try {
      let settled = 0;
      for (let i = 0; i < 11; i++) {
        const p = send(-23.5);
        void p.then(() => (settled += 1));
        rest.push(p);
      }
      // As 11: bloqueadas na trava guardada, na fila do titular ou liquidadas. Contadas as 11, nenhuma está na leitura.
      const deadline = Date.now() + 8_000;
      for (;;) {
        const blocked = (await lockGraph(h)).filter((r) => r.state === "active" && r.wait === "Lock" && GUARDED.test(r.query)).length;
        if (blocked + gateWaits + settled >= 11) break;
        if (Date.now() > deadline) assert.fail(`timeout: bloqueados=${blocked} fila=${gateWaits} liquidadas=${settled}`);
        await pause(10);
      }
      const escritasGuardadas = (await lockGraph(h)).filter((r) => GUARDED.test(r.query)).length;
      const o2 = await captureSettled(service.recordMobileLocation(technicianActor(org2) as never, { latitude: -23.5, longitude: -46.6 }));
      releaseAll();
      await Promise.all([A, ...rest]);
      assert.equal(outcomeOf(o2 as never), "fulfilled", "a posição da org2 não depende da rajada da org1");
      assert.ok(escritasGuardadas <= 3, `o titular segura no máximo 3 escritas guardadas (${escritasGuardadas})`);
    } finally {
      releaseAll();
      await Promise.all([A, ...rest]);
    }
  });

  // ---- Emenda 1.8 (E17-01, `D-ORQ-568-CONSENTIMENTO-SO-PELO-APP`): o cadastro desliga e nunca liga

  test("[T-17-CADASTRO-db] o cadastro desliga e nunca liga o consentimento, nem para o titular", async () => {
    const h = await harness();
    // (a) concorrente: A segura; R (app) na fila; o PATCH do titular-gestor com tracking_consent:true atrás dela.
    const s = await holderManager(h, "cad-a");
    await pause(20);
    const { A, aPid, releaseAll } = await holdA(h, s, 1);
    try {
      const R = captureSettled(post(h, REVOKE_ROUTE, s.tech, decision()));
      const seenR = await waitForOwnBlockedOrSettled(h.admin, { applicationName: APP, loser: R, blockedBy: aPid, label: "R", timeoutMs: 3_000 });
      assert.match(String(seenR), /^bloqueado/, `R espera A (${String(seenR)})`);
      const F = captureSettled(patchProfile(h, s, s.tech, { phone: "11988887777", tracking_consent: true }));
      const seenF = await waitBlockedCount(h, 2, F, "F");
      assert.match(seenF, /^bloqueado/, `o formulário espera na fila da linha (${seenF})`);
      releaseAll();
      const [, r, f] = await Promise.all([A, R, F]);
      const phone = (await h.admin.$queryRawUnsafe<Array<{ phone: string | null }>>("SELECT phone FROM operator_profiles WHERE id = $1::uuid", s.profileId))[0]?.phone;
      const next = (await post(h, POSITION, s.tech, { latitude: -23.56, longitude: -46.64 })).status;
      assert.deepEqual(
        { R: outcomeOf(r), F: outcomeOf(f), final: await consentOf(h, s.profileId!), phone, next },
        { R: "http200:applied", F: "http200", final: false, phone: "11988887777", next: 422 },
      );
    } finally {
      releaseAll();
      await A;
    }
    // (b) em série: revoga pelo app; DEPOIS o formulário que ainda mostra "consentiu".
    const s2 = await holderManager(h, "cad-b");
    await pause(20);
    await post(h, REVOKE_ROUTE, s2.tech, decision());
    const f2 = await patchProfile(h, s2, s2.tech, { phone: "11988887777", tracking_consent: true });
    assert.deepEqual(
      { F: f2.status, reason: String(f2.body?.error?.reason ?? ""), final: await consentOf(h, s2.profileId!), next: (await post(h, POSITION, s2.tech, { latitude: -23.56, longitude: -46.64 })).status },
      { F: 422, reason: "tracking_consent_app_only", final: false, next: 422 },
    );
    // (c) reafirmar com o perfil ligado: o campo não é escrito, o resto é gravado, o carimbo fica.
    const s3 = await holderManager(h, "cad-c");
    const before = await profileRow(h, s3.profileId!);
    const f3 = await patchProfile(h, s3, s3.tech, { phone: "11977776666", tracking_consent: true });
    const after3 = await profileRow(h, s3.profileId!);
    assert.deepEqual(
      { F: f3.status, final: after3.tracking_consent, stampKept: String(after3.tracking_consent_at) === String(before.tracking_consent_at) },
      { F: 200, final: true, stampKept: true },
    );
    // (d) desligar pelo cadastro continua.
    const f4 = await patchProfile(h, s3, s3.tech, { tracking_consent: false });
    assert.deepEqual({ F: f4.status, final: await consentOf(h, s3.profileId!) }, { F: 200, final: false });
  });

  // ---- Emenda 1.8 (E17-02): a rajada de CONSENTIMENTO de um titular passa pela fila dele

  test("[T-17-RAJADA-CONSENT-db] A segura a linha; 11 revogações do mesmo titular; no máximo 2 decisões no banco; a org2 passa", async () => {
    const h = await harness();
    const org1 = await scenario(h, "rajc1", "consented");
    const org2 = await scenario(h, "rajc2", "consented");
    const { A, releaseAll, k } = await holdA(h, org1, 1);
    let gateWaits = 0;
    const service = new (k.FieldLocationService as any)(new k.RlsPrismaFieldLocationRepository(h.role.client), async () => k.profiles, {
      onConsentGateWait: () => (gateWaits += 1),
    });
    const rs: Promise<any>[] = [];
    try {
      let settled = 0;
      for (let i = 0; i < 11; i++) {
        const p = captureSettled(service.setOwnTrackingConsent(technicianActor(org1) as never, false, decision()));
        void p.then(() => (settled += 1));
        rs.push(p);
      }
      const deadline = Date.now() + 8_000;
      for (;;) {
        const blocked = (await lockGraph(h)).filter((r) => r.state === "active" && r.wait === "Lock").length;
        if (blocked + gateWaits + settled >= 11) break;
        if (Date.now() > deadline) assert.fail(`timeout: bloqueados=${blocked} fila=${gateWaits} liquidadas=${settled}`);
        await pause(10);
      }
      const decisoesNoPg = (await lockGraph(h)).filter((r) => r.state === "active" && r.wait === "Lock" && GUARDED.test(r.query)).length;
      const o2 = await captureSettled(service.recordMobileLocation(technicianActor(org2) as never, { latitude: -23.5, longitude: -46.6 }));
      releaseAll();
      await Promise.all([A, ...rs]);
      assert.equal(outcomeOf(o2 as never), "fulfilled", "a posição da org2 não depende da rajada de consentimento da org1");
      assert.ok(decisoesNoPg <= 2, `o titular segura no máximo 2 decisões no banco (${decisoesNoPg})`);
    } finally {
      releaseAll();
      await Promise.all([A, ...rs]);
    }
  });

  // ---- Emenda 1.8 (E17-07): a fila do titular tem prazo, e a escrita guardada tem orçamento

  test("[T-17-PRAZO-db] a fila do titular tem prazo: quem passa dele sai 503 field_location_busy e nunca é gravado", async () => {
    const h = await harness();
    const s = await scenario(h, "prazo", "consented");
    const { A, send, releaseAll } = await holdA(h, s, 1, { holderGateMaxWaitMs: 300 });
    const rest: Promise<any>[] = [];
    try {
      // B e C ocupam as 2 vagas restantes (no Postgres, atrás de A); D é a 4ª e fica na fila do titular.
      const B = send(-23.51);
      const C = send(-23.52);
      rest.push(B, C);
      const seenBC = await waitBlockedCount(h, 2, Promise.all([B, C]), "B e C");
      assert.match(seenBC, /^bloqueado/, `B e C esperam A no banco (${seenBC})`);
      const D = send(-23.53);
      rest.push(D);
      // D tem de liquidar com A AINDA segurando a linha (prazo de falha: 3 s; o da fila, aqui, é 300 ms).
      const dOut = await Promise.race([D.then((x: any) => outcomeOf(x)), pause(3_000).then(() => "pendente")]);
      const rowsAntes = await locationRows(h, s.tenantId, s.tech.userId);
      releaseAll();
      await Promise.all([A, ...rest]);
      assert.deepEqual({ D: dOut, rowsAntes, rows: await locationRows(h, s.tenantId, s.tech.userId) }, { D: "field_location_busy", rowsAntes: 0, rows: 3 });
    } finally {
      releaseAll();
      await Promise.all([A, ...rest]);
    }
  });

  test("[T-17-PRAZO-TRAVA-db] a posição que espera a trava além do orçamento sai 503 com a linha ainda presa, e não é gravada", async () => {
    const h = await harness();
    const s = await scenario(h, "prazot", "consented");
    const k = await realClasses(h);
    const holdLocked = gate();
    const holdRelease = gate();
    // Quem segura a linha é uma transação do ADMIN (fora do pool do app e sem o prazo do Prisma do app).
    const X = captureSettled(
      h.admin.$transaction(
        async (tx) => {
          await tx.$queryRawUnsafe("SELECT 1 FROM operator_profiles WHERE id = $1::uuid FOR NO KEY UPDATE", s.profileId);
          holdLocked.open();
          await holdRelease.opened;
        },
        { timeout: 30_000, maxWait: 5_000 },
      ),
    );
    try {
      await holdLocked.opened;
      const service = new k.FieldLocationService(new k.RlsPrismaFieldLocationRepository(h.role.client), async () => k.profiles);
      const t0 = Date.now();
      let ms = -1;
      const Bp = captureSettled(service.recordMobileLocation(technicianActor(s) as never, { latitude: -23.5, longitude: -46.6 })).then((x) => {
        ms = Date.now() - t0;
        return x;
      });
      // A linha fica presa por até 12 s: a resposta tem de sair ANTES de ela soltar (o `lock_timeout` da escrita guardada).
      const antes = await Promise.race([Bp.then(() => "liquidou com a linha presa"), pause(12_000).then(() => "pendente aos 12 s")]);
      holdRelease.open();
      await X;
      const B = await Bp;
      await pause(50);
      assert.equal(antes, "liquidou com a linha presa");
      assert.deepEqual({ B: outcomeOf(B as never), rows: await locationRows(h, s.tenantId, s.tech.userId) }, { B: "field_location_busy", rows: 0 });
      assert.ok(ms < 15_000, `a resposta sai antes dos 15 s do app (${ms} ms)`);
    } finally {
      holdRelease.open();
      await X;
    }
  });

  // ------------------------------------------------------------------ teardown escopado

  async function teardownTenants(admin: Harness["admin"], tenants: readonly string[]): Promise<void> {
    for (const tenantId of tenants) {
      for (const sql of [
        "DELETE FROM field_operator_locations WHERE tenant_id = $1::uuid",
        "DELETE FROM work_orders WHERE tenant_id = $1::uuid",
        "DELETE FROM operator_profiles WHERE tenant_id = $1::uuid",
        "DELETE FROM audit_logs WHERE tenant_id = $1::uuid",
        "DELETE FROM cloud_usage_events WHERE tenant_id = $1::uuid",
        "DELETE FROM role_permissions WHERE role_id IN (SELECT id FROM roles WHERE tenant_id = $1::uuid)",
        "DELETE FROM user_role_assignments WHERE tenant_id = $1::uuid",
        "DELETE FROM roles WHERE tenant_id = $1::uuid",
        "DELETE FROM users WHERE tenant_id = $1::uuid",
        "DELETE FROM tenants WHERE id = $1::uuid",
      ]) {
        await admin.$executeRawUnsafe(sql, tenantId);
      }
    }
  }
}
