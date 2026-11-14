import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import test, { after } from "node:test";

import { closeServer, createEphemeralRole, getBaseUrl, requestJson, type EphemeralRole } from "./helpers/auth-identity-fixture.js";
import { createBsan317AdminClient } from "./helpers/bsan317-db.js";
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
//   D7  (Emenda 1 da abertura, 2.2) o caso (a) do B22: traccar às 03:00 e app às 03:05; desligado o consentimento,
//       o latest e o detalhe da OS trazem o traccar; com since 03:01, nada do operador. Única prova do ramo
//       `source: { in: … }` do repositório Prisma.
//
// Semeadura em SQL cru pelo admin; teardown ESCOPADO por tenant_id (nunca curinga). Sem DATABASE_URL o arquivo
// DECLARA o pulo. Vermelho-controle na base `d2737339`: diário `dev-17-cl.md` §4.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
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
    const admin = await createBsan317AdminClient(connectionString!);
    const role: EphemeralRole = await createEphemeralRole(admin, connectionString!);

    // O cliente GLOBAL do app (`src/database/prisma.ts` lê `globalThis.prisma` antes de criar o seu) passa a ser o do
    // papel efêmero: a rota real roda sem bypass de RLS, como o papel de runtime de produção (B-SAN3-05).
    (globalThis as { prisma?: unknown }).prisma = role.client;

    const posture = await role.client.$queryRawUnsafe<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>(
      `SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`,
    );
    assert.deepEqual(posture, [{ rolsuper: false, rolbypassrls: false }], "o app roda sob papel NOSUPERUSER e sem BYPASSRLS");

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
