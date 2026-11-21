import "dotenv/config";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { closeServer, getBaseUrl, requestJson } from "./helpers/auth-identity-fixture.js";

// -----------------------------------------------------------------------------------------------
// B-APP-ORG-2S (S2a) — a CONCESSÃO dentro do grupo (`POST /api/v1/users/access-grants`, a cópia da
// credencial do par de origem, D1 do dono: cada pátio comanda o seu) e o Entrar sem escolha pela
// identidade. Postgres descartável em UTC; o app fala com o banco pelo papel de runtime
// (NOSUPERUSER NOBYPASSRLS, `DATABASE_URL`); a montagem dos dados usa a conexão administrativa
// (`ADMIN_DATABASE_URL`). Corridas com duas conexões de verdade (duas requisições HTTP em paralelo).
// Testes: G1, G2, G2b, G3–G7, G9b (a parte da S2a), G10–G14 e CM7 (plano 1.8.1 §7.1, 1.8.2 §4.1,
// 1.8.3 §5.1). G8, G9, G9c e GP* são da senha (S2b/S2p) e não estão aqui.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const adminConnectionString = process.env.ADMIN_DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (!connectionString || !adminConnectionString) {
  test("B-APP-ORG-2S S2a requer DATABASE_URL e ADMIN_DATABASE_URL", {
    skip: "Informe o papel de runtime e a conexão administrativa do Postgres descartável.",
  });
} else {
  test("B-APP-ORG-2S S2a: concessão no grupo e Entrar pela identidade", async (t) => {
    process.env.NODE_ENV = "test";
    process.env.LOG_LEVEL = "silent";
    process.env.JWT_SECRET = "bapporg2s-s2a-dev-only-secret-with-32-bytes";
    process.env.JWT_EXPIRES_IN = "15m";
    process.env.CORE_SAAS_PERSISTENCE = "prisma";

    const [{ createPrismaClient }, { createApp }, { PrismaCoreSaasService }, { PrismaCoreSaasStore }, { hashPassword }] =
      await Promise.all([
        import("../src/database/pg-connection.js"),
        import("../src/app.js"),
        import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
        import("../src/modules/core-saas/store/prisma-core-saas.store.js"),
        import("../src/modules/auth/services/password.service.js"),
      ]);

    const admin = createPrismaClient(adminConnectionString);
    const runtime = createPrismaClient(connectionString);
    const service = new PrismaCoreSaasService(new PrismaCoreSaasStore(runtime), runtime);
    let server: Server | undefined;

    const [{ rolsuper, rolbypassrls }] = await runtime.$queryRaw<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>`
      SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user
    `;
    assert.equal(rolsuper, false, "o app roda com papel sem superusuário");
    assert.equal(rolbypassrls, false, "o app roda com papel sem bypass de RLS");

    const systemRole = async (key: string): Promise<string> => {
      const role = await admin.role.findFirst({ where: { key, tenant_id: null }, select: { id: true } });
      assert.ok(role, `papel de sistema ${key} provisionado (npm run db:provision-rbac)`);
      return role.id;
    };
    const technicianRoleId = await systemRole("field_technician");
    const tenantAdminRoleId = await systemRole("tenant_admin");

    type Patio = { tenantId: string; adminId: string };
    type Tech = { tenantId: string; userId: string; identityId: string | null; email: string; password: string };

    const tag = `${Date.now().toString(36)}${Math.random().toString(16).slice(2, 8)}`;
    let seq = 0;
    const next = () => `${tag}-${(seq += 1)}`;
    const PASSWORD = "Senha-S2a-Forte-123!";

    async function patio(label: string, modules: string[] = ["finance", "work_orders"]): Promise<Patio> {
      const k = next();
      const tenant = await admin.tenant.create({
        data: { name: `Pátio ${label} ${k}`, slug: `s2a-${label.toLowerCase()}-${k}`, modules },
      });
      const actor = await admin.user.create({
        data: { tenant_id: tenant.id, name: `Gestor ${label}`, email: `gestor-${k}@s2a.test`, status: "active" },
      });
      await admin.userRoleAssignment.create({
        data: { tenant_id: tenant.id, user_id: actor.id, role_id: tenantAdminRoleId },
      });
      return { tenantId: tenant.id, adminId: actor.id };
    }

    async function technician(
      p: Patio,
      email: string,
      options: { identityId?: string | null; password?: string } = {},
    ): Promise<Tech> {
      const password = options.password ?? PASSWORD;
      const user = await admin.user.create({
        data: { tenant_id: p.tenantId, name: "Técnico", email, status: "active" },
      });
      await admin.userRoleAssignment.create({
        data: { tenant_id: p.tenantId, user_id: user.id, role_id: technicianRoleId },
      });
      let identityId: string | null = null;
      if (options.identityId !== null) {
        identityId = options.identityId ?? (await admin.authIdentity.create({ data: { id: randomUUID() } })).id;
        await admin.authIdentityLink.create({
          data: { identity_id: identityId, tenant_id: p.tenantId, user_id: user.id, attached_via: "backfill" },
        });
      }
      const hashed = await hashPassword(password);
      await admin.localAuthCredential.create({
        data: {
          tenant_id: p.tenantId,
          user_id: user.id,
          email,
          password_hash: hashed.password_hash,
          password_algorithm: hashed.password_algorithm,
        },
      });
      return { tenantId: p.tenantId, userId: user.id, identityId, email, password };
    }

    async function group(
      members: Array<{ tenantId: string; validTo?: Date | null }>,
    ): Promise<string> {
      const created = await admin.economicGroup.create({ data: { name: `Grupo ${next()}` } });
      for (const member of members) {
        await admin.economicGroupMember.create({
          data: {
            tenant_id: member.tenantId,
            group_id: created.id,
            valid_from: new Date("2026-01-01T00:00:00Z"),
            valid_to: member.validTo ?? null,
          },
        });
      }
      return created.id;
    }

    const headers = (p: Patio, role = "tenant_admin") => ({
      "x-tenant-id": p.tenantId,
      "x-user-id": p.adminId,
      "x-role": role,
    });
    const bearer = (token: string) => ({ authorization: `Bearer ${token}` });
    const emailOf = (label: string) => `tec-${label}-${next()}@s2a.test`;

    let baseUrl = "";
    const grant = (p: Patio, email: string, extra: Record<string, unknown> = {}, role = "tenant_admin") =>
      requestJson(baseUrl, "/api/v1/users/access-grants", {
        method: "POST",
        headers: headers(p, role),
        body: { email, name: "Técnico do grupo", ...extra },
      });
    const login = (email: string, password: string, tenantId?: string) =>
      requestJson(baseUrl, "/api/v1/auth/login", {
        method: "POST",
        body: tenantId ? { tenantId, email, password } : { email, password },
      });
    const setStatus = (p: Patio, userId: string, status: "active" | "inactive") =>
      requestJson(baseUrl, `/api/v1/users/${userId}`, {
        method: "PATCH",
        headers: headers(p),
        body: { status },
      });
    const pairOf = (tenantId: string, email: string) =>
      admin.user.findUnique({ where: { tenant_id_email: { tenant_id: tenantId, email } } });
    const credentialOf = (tenantId: string, userId: string) =>
      admin.localAuthCredential.findUnique({ where: { tenant_id_user_id: { tenant_id: tenantId, user_id: userId } } });
    const tokenOf = (response: { body: Record<string, unknown> }) =>
      (response.body.data as { access_token: string }).access_token;
    const errorOf = (response: { body: Record<string, unknown> }) =>
      (response.body.error ?? {}) as { code?: string; reason?: string; message?: string };
    const tenantsOfToken = async (token: string): Promise<Set<string>> => {
      const bootstrap = await requestJson(baseUrl, "/api/v1/mobile/bootstrap", { method: "GET", headers: bearer(token) });
      assert.equal(bootstrap.status, 200, JSON.stringify(bootstrap.body));
      const available = (bootstrap.body.data as { available_tenants: Array<{ tenantId: string }> }).available_tenants;
      return new Set(available.map((item) => item.tenantId));
    };

    try {
      server = createApp(service).listen(0);
      baseUrl = await getBaseUrl(server);

      // O grupo principal: X (origem do login de T), Y e Z dão acesso; X e Y com o Financeiro, Z sem.
      const X = await patio("X");
      const Y = await patio("Y");
      const Z = await patio("Z", ["work_orders"]);
      await group([{ tenantId: X.tenantId }, { tenantId: Y.tenantId }, { tenantId: Z.tenantId }]);
      const T = await technician(X, emailOf("t"));

      await t.test("G1: a concessão cria o par em Y com a mesma identidade e a cópia da credencial", async () => {
        const response = await grant(Y, T.email, { tenantId: X.tenantId });
        assert.equal(response.status, 201, JSON.stringify(response.body));

        const data = response.body.data as Record<string, unknown>;
        assert.deepEqual(Object.keys(data), ["user"], "o corpo só traz o usuário");
        const serialized = JSON.stringify(response.body);
        assert.equal(/password|senha|hash/i.test(serialized), false, "nenhuma senha nem hash no corpo");
        assert.equal(/identity/i.test(serialized), false, "nenhuma identidade no corpo");
        assert.equal(serialized.includes(X.tenantId), false, "nenhum pátio de origem no corpo");
        assert.equal(T.identityId !== null && serialized.includes(T.identityId), false);

        const granted = await pairOf(Y.tenantId, T.email);
        assert.ok(granted, "o par de Y existe");
        assert.equal(granted.status, "active");
        const roles = await admin.userRoleAssignment.findMany({
          where: { tenant_id: Y.tenantId, user_id: granted.id },
          select: { role: { select: { key: true } } },
        });
        assert.deepEqual(roles.map((row) => row.role.key), ["field_technician"]);

        const link = await admin.authIdentityLink.findUnique({
          where: { tenant_id_user_id: { tenant_id: Y.tenantId, user_id: granted.id } },
        });
        assert.ok(link, "o par de Y tem vínculo de identidade");
        assert.equal(link.identity_id, T.identityId, "a MESMA identidade do login de X");
        assert.equal(link.attached_via, "concessao");
        const identities = await admin.authIdentityLink.findMany({
          where: { user: { email: T.email } },
          select: { identity_id: true },
        });
        assert.equal(new Set(identities.map((row) => row.identity_id)).size, 1, "uma identidade só no grupo");
        const [{ events }] = await admin.$queryRaw<Array<{ events: number }>>`
          SELECT count(*)::int AS events FROM auth_identity_link_events
          WHERE tenant_id = ${Y.tenantId}::uuid AND user_id = ${granted.id}::uuid AND event = 'concessao'
        `;
        assert.equal(events, 1, "um evento concessao");

        const source = await credentialOf(X.tenantId, T.userId);
        const copy = await credentialOf(Y.tenantId, granted.id);
        assert.ok(source, "a credencial de origem existe");
        assert.ok(copy, "a credencial de Y é a cópia da de X");
        assert.equal(copy.password_hash, source.password_hash);
        assert.equal(copy.password_algorithm, source.password_algorithm);
        assert.equal(copy.must_change_password, source.must_change_password);
        assert.equal(copy.password_updated_at.toISOString(), source.password_updated_at.toISOString());
        assert.equal(copy.failed_attempts, source.failed_attempts);

        const log = await admin.userCreationLog.findFirst({ where: { tenant_id: Y.tenantId, user_id: granted.id } });
        assert.ok(log, "a concessão está no registro de criações");
        assert.equal(log.state, "concessao");
        assert.equal(log.origin_tenant_id, X.tenantId);

        const audit = await admin.auditLog.findFirst({
          where: { tenant_id: Y.tenantId, entity_id: granted.id, action: "user.access_granted" },
        });
        assert.ok(audit, "a auditoria user.access_granted fica em Y");
        assert.equal(JSON.stringify(audit).includes(X.tenantId), false, "a auditoria não cita o pátio de origem");
        assert.equal(
          await admin.auditLog.count({ where: { tenant_id: X.tenantId, action: "user.access_granted" } }),
          0,
          "o pátio de origem não recebe auditoria",
        );
        assert.equal(await admin.user.count({ where: { tenant_id: X.tenantId, email: T.email } }), 1);
      });

      await t.test("G2: Entrar sem organização entra sem escolha e o bootstrap lista X e Y; legado segue no 409", async () => {
        const response = await login(T.email, T.password);
        assert.equal(response.status, 200, JSON.stringify(response.body));
        assert.deepEqual(await tenantsOfToken(tokenOf(response)), new Set([X.tenantId, Y.tenantId]));

        const legacyEmail = emailOf("legado");
        const LX = await patio("LX");
        const LY = await patio("LY");
        await group([{ tenantId: LX.tenantId }, { tenantId: LY.tenantId }]);
        await technician(LX, legacyEmail);
        await technician(LY, legacyEmail);
        const ambiguous = await login(legacyEmail, PASSWORD);
        assert.equal(ambiguous.status, 409, JSON.stringify(ambiguous.body));
        assert.equal(errorOf(ambiguous).code, "TENANT_SELECTION_REQUIRED");
      });

      await t.test("G2b: dois pares sem vínculo de identidade, mesma senha, seguem no 409 de escolha", async () => {
        const email = emailOf("semvinculo");
        const NX = await patio("NX");
        const NY = await patio("NY");
        await group([{ tenantId: NX.tenantId }, { tenantId: NY.tenantId }]);
        await technician(NX, email, { identityId: null });
        await technician(NY, email, { identityId: null });
        const response = await login(email, PASSWORD);
        assert.equal(response.status, 409, JSON.stringify(response.body));
        assert.equal(errorOf(response).code, "TENANT_SELECTION_REQUIRED");
      });

      await t.test("G3/G4/G6: o 404 é o mesmo, byte a byte, fora do grupo, sem grupo e depois do valid_to", async () => {
        const target = await patio("G3T");
        const otherGroup = await patio("G3O");
        const noGroupOrigin = await patio("G3S");
        const leaver = await patio("G6P");
        const noGroupTarget = await patio("G4T");
        // Saiu do grupo há dois dias (o dia de negócio de São Paulo já passou do valid_to).
        const gone = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
        gone.setUTCHours(0, 0, 0, 0);
        await group([{ tenantId: target.tenantId }, { tenantId: leaver.tenantId, validTo: gone }]);
        await group([{ tenantId: otherGroup.tenantId }, { tenantId: noGroupTarget.tenantId, validTo: gone }]);
        const inOtherGroup = await technician(otherGroup, emailOf("g3"));
        const inNoGroup = await technician(noGroupOrigin, emailOf("g3s"));
        const inLeaver = await technician(leaver, emailOf("g6"));
        const inFormerGroup = await technician(otherGroup, emailOf("g4"));

        const missing = await grant(target, emailOf("inexistente"));
        assert.equal(missing.status, 404, JSON.stringify(missing.body));
        assert.equal(errorOf(missing).reason, "login_not_found_in_group");
        const raw = JSON.stringify(missing.body);
        for (const [label, response] of [
          ["G3 outro grupo", await grant(target, inOtherGroup.email)],
          ["G3 sem grupo", await grant(target, inNoGroup.email)],
          ["G4 Y sem grupo", await grant(noGroupTarget, inFormerGroup.email)],
          ["G6 saiu do grupo", await grant(target, inLeaver.email)],
        ] as const) {
          assert.equal(response.status, 404, `${label}: ${JSON.stringify(response.body)}`);
          assert.equal(JSON.stringify(response.body), raw, `${label}: o corpo é o mesmo do e-mail inexistente`);
        }
        for (const p of [target, noGroupTarget]) {
          assert.equal(await admin.user.count({ where: { tenant_id: p.tenantId, name: "Técnico do grupo" } }), 0);
        }
        assert.equal(await admin.userCreationLog.count({ where: { state: "em_curso" } }), 0, "nenhuma linha em_curso sobra");
      });

      await t.test("G5: duas identidades no grupo dão 409 e nada é criado", async () => {
        const email = emailOf("g5");
        const A = await patio("G5A");
        const B = await patio("G5B");
        const target = await patio("G5T");
        await group([{ tenantId: A.tenantId }, { tenantId: B.tenantId }, { tenantId: target.tenantId }]);
        await technician(A, email);
        await technician(B, email);
        const response = await grant(target, email);
        assert.equal(response.status, 409, JSON.stringify(response.body));
        assert.equal(errorOf(response).reason, "login_ambiguous_in_group");
        assert.equal(await admin.user.count({ where: { tenant_id: target.tenantId, email } }), 0);
        assert.equal(await admin.authIdentityLink.count({ where: { tenant_id: target.tenantId, user: { email } } }), 0);
      });

      await t.test("G7: sem users.manage dá 403; tenantId no corpo é ignorado", async () => {
        const email = emailOf("g7");
        const A = await patio("G7A");
        const B = await patio("G7B");
        const C = await patio("G7C");
        await group([{ tenantId: A.tenantId }, { tenantId: B.tenantId }, { tenantId: C.tenantId }]);
        await technician(A, email);
        const forbidden = await grant(B, email, {}, "auditor");
        assert.equal(forbidden.status, 403, JSON.stringify(forbidden.body));
        assert.equal(await admin.user.count({ where: { tenant_id: B.tenantId, email } }), 0);

        const ignored = await grant(B, email, { tenantId: C.tenantId, tenant_id: C.tenantId });
        assert.equal(ignored.status, 201, JSON.stringify(ignored.body));
        assert.equal(await admin.user.count({ where: { tenant_id: B.tenantId, email } }), 1, "criado no pátio do ator");
        assert.equal(await admin.user.count({ where: { tenant_id: C.tenantId, email } }), 0, "nada no pátio do corpo");
      });

      await t.test("G9b (parte da S2a): a troca em voo em X termina antes, e a cópia sai com o hash novo", async () => {
        const email = emailOf("g9b");
        const A = await patio("G9A");
        const B = await patio("G9B");
        await group([{ tenantId: A.tenantId }, { tenantId: B.tenantId }]);
        const tech = await technician(A, email);
        const fresh = await hashPassword("Senha-Nova-G9b-456!");
        let release!: () => void;
        const gate = new Promise<void>((resolve) => {
          release = resolve;
        });
        let updated!: () => void;
        const updateDone = new Promise<void>((resolve) => {
          updated = resolve;
        });
        const change = admin.$transaction(
          async (tx) => {
            await tx.$executeRaw`
              UPDATE local_auth_credentials SET password_hash = ${fresh.password_hash}
              WHERE tenant_id = ${A.tenantId}::uuid AND user_id = ${tech.userId}::uuid
            `;
            updated();
            await gate;
          },
          { timeout: 30_000 },
        );
        await updateDone;

        let settled = false;
        const pending = grant(B, email).then((response) => {
          settled = true;
          return response;
        });
        // Barreira determinística: a concessão está esperando a trava da linha da credencial de X.
        let waited = false;
        for (let i = 0; i < 100 && !settled; i += 1) {
          const [{ waiting }] = await admin.$queryRaw<Array<{ waiting: number }>>`
            SELECT count(*)::int AS waiting FROM pg_stat_activity
            WHERE wait_event_type = 'Lock' AND query ILIKE '%local_auth_credentials%FOR SHARE%'
          `;
          if (waiting > 0) {
            waited = true;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        release();
        await change;
        const response = await pending;
        assert.equal(response.status, 201, JSON.stringify(response.body));
        const granted = await pairOf(B.tenantId, email);
        assert.ok(granted);
        const copy = await credentialOf(B.tenantId, granted.id);
        assert.ok(copy);
        assert.equal(waited, true, "a concessão esperou a troca em voo (FOR SHARE)");
        assert.equal(copy.password_hash, fresh.password_hash, "a cópia sai com o hash que ficou");
      });

      await t.test("G10: duas concessões simultâneas do mesmo e-mail em Y, 20 rodadas: 1 usuário e um 409", async () => {
        const A = await patio("G10A");
        const B = await patio("G10B");
        await group([{ tenantId: A.tenantId }, { tenantId: B.tenantId }]);
        for (let round = 0; round < 20; round += 1) {
          const email = emailOf(`g10r${round}`);
          await technician(A, email);
          const responses = await Promise.all([grant(B, email), grant(B, email)]);
          const statuses = responses.map((response) => response.status).sort();
          assert.deepEqual(statuses, [201, 409], `rodada ${round}: ${JSON.stringify(responses.map((r) => r.body))}`);
          assert.equal(await admin.user.count({ where: { tenant_id: B.tenantId, email } }), 1, `rodada ${round}`);
        }
        assert.equal(await admin.userCreationLog.count({ where: { state: "em_curso" } }), 0);
      });

      await t.test("G11 (D1): cada pátio ativa e desativa só para si; o Entrar acha o pátio ativo", async () => {
        const email = emailOf("g11");
        const A = await patio("G11X");
        const B = await patio("G11Y");
        await group([{ tenantId: A.tenantId }, { tenantId: B.tenantId }]);
        const tech = await technician(A, email);
        assert.equal((await grant(B, email)).status, 201);
        const inB = await pairOf(B.tenantId, email);
        assert.ok(inB);

        const offOrigin = await setStatus(A, tech.userId, "inactive");
        assert.equal(offOrigin.status, 200, JSON.stringify(offOrigin.body));
        const onlyB = await login(email, PASSWORD);
        assert.equal(onlyB.status, 200, `X desativado: o Entrar segue: ${JSON.stringify(onlyB.body)}`);
        assert.equal((onlyB.body.data as { tenant: { id: string } }).tenant.id, B.tenantId);
        const toA = await requestJson(baseUrl, "/api/v1/auth/active-tenant", {
          method: "POST",
          headers: bearer(tokenOf(onlyB)),
          body: { tenantId: A.tenantId },
        });
        assert.equal(toA.status, 403, JSON.stringify(toA.body));
        assert.equal(await admin.user.count({ where: { tenant_id: B.tenantId, email, status: "active" } }), 1, "Y não mudou");

        assert.equal((await setStatus(A, tech.userId, "active")).status, 200);
        assert.equal((await setStatus(B, inB.id, "inactive")).status, 200);
        const onlyA = await login(email, PASSWORD);
        assert.equal(onlyA.status, 200, JSON.stringify(onlyA.body));
        assert.equal((onlyA.body.data as { tenant: { id: string } }).tenant.id, A.tenantId);

        assert.equal((await setStatus(A, tech.userId, "inactive")).status, 200);
        const none = await login(email, PASSWORD);
        assert.equal(none.status, 401, JSON.stringify(none.body));
      });

      await t.test("G12: par de Y inativo sai do available_tenants e active-tenant para Y dá 403", async () => {
        const email = emailOf("g12");
        const A = await patio("G12X");
        const B = await patio("G12Y");
        await group([{ tenantId: A.tenantId }, { tenantId: B.tenantId }]);
        await technician(A, email);
        assert.equal((await grant(B, email)).status, 201);
        const inB = await pairOf(B.tenantId, email);
        assert.ok(inB);
        const before = await login(email, PASSWORD, A.tenantId);
        assert.equal(before.status, 200);
        assert.deepEqual(await tenantsOfToken(tokenOf(before)), new Set([A.tenantId, B.tenantId]));

        assert.equal((await setStatus(B, inB.id, "inactive")).status, 200);
        const after = await login(email, PASSWORD, A.tenantId);
        assert.equal(after.status, 200);
        assert.deepEqual(await tenantsOfToken(tokenOf(after)), new Set([A.tenantId]));
        const toB = await requestJson(baseUrl, "/api/v1/auth/active-tenant", {
          method: "POST",
          headers: bearer(tokenOf(after)),
          body: { tenantId: B.tenantId },
        });
        assert.equal(toB.status, 403, JSON.stringify(toB.body));
      });

      await t.test("G13: guarda de migração verde e o domínio aceita concessao e recusa o resto", async () => {
        const guard = execFileSync(process.execPath, [path.join(ROOT, "scripts", "migration-transaction-guard.mjs")], {
          cwd: ROOT,
          encoding: "utf8",
        });
        assert.match(guard, /violações: 0$/m, guard);
        const email = emailOf("g13");
        const A = await patio("G13");
        const user = await admin.user.create({ data: { tenant_id: A.tenantId, name: "Domínio", email, status: "active" } });
        const identity = await admin.authIdentity.create({ data: { id: randomUUID() } });
        const accepted = await admin.$executeRaw`
          INSERT INTO auth_identity_links (identity_id, tenant_id, user_id, attached_via)
          VALUES (${identity.id}::uuid, ${A.tenantId}::uuid, ${user.id}::uuid, 'concessao')
        `;
        assert.equal(accepted, 1, "o domínio aceita concessao");
        await admin.$executeRaw`DELETE FROM auth_identity_links WHERE tenant_id = ${A.tenantId}::uuid AND user_id = ${user.id}::uuid`;
        await assert.rejects(
          admin.$executeRaw`
            INSERT INTO auth_identity_links (identity_id, tenant_id, user_id, attached_via)
            VALUES (${identity.id}::uuid, ${A.tenantId}::uuid, ${user.id}::uuid, 'emprestimo')
          `,
          /check|23514/i,
        );
      });

      await t.test("G14: com X desativado, a renovação da sessão de Y dá 200 e a de X dá 401", async () => {
        const email = emailOf("g14");
        const A = await patio("G14X");
        const B = await patio("G14Y");
        await group([{ tenantId: A.tenantId }, { tenantId: B.tenantId }]);
        const tech = await technician(A, email);
        assert.equal((await grant(B, email)).status, 201);
        const inA = await login(email, PASSWORD, A.tenantId);
        const inB = await login(email, PASSWORD, B.tenantId);
        assert.equal(inA.status, 200, JSON.stringify(inA.body));
        assert.equal(inB.status, 200, `login direto em Y com a cópia: ${JSON.stringify(inB.body)}`);
        assert.equal((await setStatus(A, tech.userId, "inactive")).status, 200);
        const refresh = (response: { body: Record<string, unknown> }) =>
          requestJson(baseUrl, "/api/v1/auth/refresh", {
            method: "POST",
            body: { refreshToken: (response.body.data as { refresh_token: string }).refresh_token },
          });
        const refreshA = await refresh(inA);
        const refreshB = await refresh(inB);
        assert.equal(refreshA.status, 401, JSON.stringify(refreshA.body));
        assert.equal(refreshB.status, 200, JSON.stringify(refreshB.body));
      });

      await t.test("CM7: o token de concessão de Y vê só a comissão dele em Y; Z sem Financeiro dá 403", async () => {
        assert.equal((await grant(Z, T.email)).status, 201, "concessão em Z");
        const inY = await pairOf(Y.tenantId, T.email);
        assert.ok(inY);
        async function commission(tenantId: string, payee: string, amount: string): Promise<void> {
          const k = next();
          const [{ id: policy }] = await admin.$queryRawUnsafe<Array<{ id: string }>>(
            `INSERT INTO commission_policies (tenant_id, name, scope, vertical, status, effective_from)
             VALUES ($1::uuid, $2, 'tenant', 'tow', 'active', now()) RETURNING id`,
            tenantId,
            `Política ${k}`,
          );
          const [{ id: event }] = await admin.$queryRawUnsafe<Array<{ id: string }>>(
            `INSERT INTO commission_basis_events (tenant_id, source_type, source_id, source_event_name, idempotency_key, payload, occurred_at, policy_id)
             VALUES ($1::uuid, 'work_order', $2, 'work_order.completed', $3, '{}'::jsonb, now(), $4::uuid) RETURNING id`,
            tenantId,
            k,
            `ev-${k}`,
            policy,
          );
          await admin.$executeRawUnsafe(
            `INSERT INTO commission_calculations (tenant_id, basis_event_id, policy_id, payee_id, eligible_user_id, amount, calculation_snapshot, idempotency_key)
             VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $4::uuid, $5::numeric, '{}'::jsonb, $6)`,
            tenantId,
            event,
            policy,
            payee,
            amount,
            `calc-${k}`,
          );
        }
        await commission(X.tenantId, T.userId, "10.00");
        await commission(Y.tenantId, inY.id, "5.50");
        await commission(Y.tenantId, Y.adminId, "99.00");

        const loginY = await login(T.email, T.password, Y.tenantId);
        assert.equal(loginY.status, 200, JSON.stringify(loginY.body));
        const tokenY = tokenOf(loginY);
        const get = (route: string, token: string) => requestJson(baseUrl, route, { method: "GET", headers: bearer(token) });

        for (const route of [
          "/api/v1/commissions/calculations/mine",
          `/api/v1/commissions/calculations/mine?payee_id=${Y.adminId}&payeeId=${T.userId}`,
        ]) {
          const mine = await get(route, tokenY);
          assert.equal(mine.status, 200, `${route}: ${JSON.stringify(mine.body)}`);
          const items = (mine.body as { items: Array<{ payeeId: string; amount: unknown }> }).items;
          assert.deepEqual(items.map((item) => [item.payeeId, Number(item.amount)]), [[inY.id, 5.5]], route);
          assert.equal(JSON.stringify(mine.body).includes(X.tenantId), false, `${route}: nada de X`);
        }
        for (const route of [
          "/api/v1/commissions/statements/my-summary",
          `/api/v1/commissions/statements/my-summary?payee_id=${Y.adminId}`,
        ]) {
          const summary = await get(route, tokenY);
          assert.equal(summary.status, 200, `${route}: ${JSON.stringify(summary.body)}`);
          const data = summary.body.data as { total: unknown; items: Array<{ payeeId: string }> };
          assert.equal(Number(data.total), 5.5, route);
          assert.deepEqual(data.items.map((item) => item.payeeId), [inY.id], route);
        }

        const loginZ = await login(T.email, T.password, Z.tenantId);
        assert.equal(loginZ.status, 200, JSON.stringify(loginZ.body));
        const blocked = await get("/api/v1/commissions/statements/my-summary", tokenOf(loginZ));
        assert.equal(blocked.status, 403, JSON.stringify(blocked.body));
        assert.equal(errorOf(blocked).reason, "module_not_enabled");
      });
    } finally {
      if (server) await closeServer(server);
      await Promise.allSettled([runtime.$disconnect(), admin.$disconnect()]);
    }
  });
}
