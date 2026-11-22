import "dotenv/config";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  closeServer,
  createEphemeralRole,
  getBaseUrl,
  requestJson,
} from "./helpers/auth-identity-fixture.js";

// -----------------------------------------------------------------------------------------------
// B-APP-ORG-2S — a trava do dev HK1 PELAS ROTAS (plano 1.8.3 §6; arquivo declarado "nasce no bloco"
// na 1.8.3.1 §6). Pela rota HTTP, duas requisições em paralelo (duas conexões de verdade do pool do
// papel de runtime, NOSUPERUSER NOBYPASSRLS):
//   K1  `POST /users` × `POST /users` do mesmo e-mail novo em dois pátios do grupo, 50 rodadas:
//       sempre 201 e 409, 1 usuário, 1 identidade, o número do cancelado maior que o do confirmado;
//   K10 `POST /users/access-grants` em Y × `POST /users` em Z, e-mail que já existe em X, 30 rodadas
//       em cada ordem de disparo: a criação sempre 409, a concessão 201, 1 identidade no grupo;
//   K11 `POST /users` em X × `POST /users/access-grants` em Y, e-mail novo, 30 rodadas: (201 e 201)
//       ou (201 e 404); nunca 2 identidades;
//   ao fim, 0 linha `em_curso` e nenhum 5xx. O K14 (503 por prazo vencido) é da fatia S1 e não está
//   aqui (declarado no diário da S2a).
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const adminConnectionString = process.env.ADMIN_DATABASE_URL ?? connectionString;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (!connectionString) {
  test("B-APP-ORG-2S HK1 requer DATABASE_URL", {
    skip: "Informe a conexão administrativa do Postgres descartável.",
  });
} else {
  test("HK1 pelas rotas: K1, K10 e K11", async (t) => {
    process.env.NODE_ENV = "test";
    process.env.LOG_LEVEL = "silent";
    process.env.JWT_SECRET = "bapporg2s-hk1-dev-only-secret-with-32-bytes";
    process.env.CORE_SAAS_PERSISTENCE = "prisma";

    // O job `backend` não semeia RBAC; a suíte provisiona as linhas globais que usa.
    // NODE_TEST_CONTEXT sai do filho para não conectá-lo ao protocolo interno do runner pai.
    const { NODE_TEST_CONTEXT: _ignored, ...inherited } = process.env;
    execFileSync(process.execPath, ["--import", "tsx", path.join(ROOT, "scripts", "provision-rbac.ts")], {
      cwd: ROOT,
      env: { ...inherited, DATABASE_URL: connectionString },
      stdio: "pipe",
    });

    const [{ createPrismaClient }, { createApp }, { PrismaCoreSaasService }, { PrismaCoreSaasStore }, { hashPassword }, { creationEmailKey }] =
      await Promise.all([
        import("../src/database/pg-connection.js"),
        import("../src/app.js"),
        import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
        import("../src/modules/core-saas/store/prisma-core-saas.store.js"),
        import("../src/modules/auth/services/password.service.js"),
        import("../src/modules/core-saas/services/user-creation-log.js"),
      ]);

    const admin = createPrismaClient(adminConnectionString);
    const runtimeRole = await createEphemeralRole(admin, adminConnectionString, createPrismaClient);
    const runtime = runtimeRole.client;
    const service = new PrismaCoreSaasService(new PrismaCoreSaasStore(runtime), runtime);
    let server: Server | undefined;

    const [{ rolsuper, rolbypassrls }] = await runtime.$queryRaw<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>`
      SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user
    `;
    assert.equal(rolsuper, false);
    assert.equal(rolbypassrls, false);

    const roleId = async (key: string) => {
      const role = await admin.role.findFirst({ where: { key, tenant_id: null }, select: { id: true } });
      assert.ok(role, `papel de sistema ${key} provisionado`);
      return role.id;
    };
    const technicianRoleId = await roleId("field_technician");
    const tenantAdminRoleId = await roleId("tenant_admin");

    const tag = `${Date.now().toString(36)}${Math.random().toString(16).slice(2, 8)}`;
    let seq = 0;
    const next = () => `${tag}-${(seq += 1)}`;
    type Patio = { tenantId: string; adminId: string };

    async function patio(label: string): Promise<Patio> {
      const k = next();
      const tenant = await admin.tenant.create({
        data: { name: `Pátio ${label} ${k}`, slug: `hk1-${label.toLowerCase()}-${k}`, modules: ["work_orders"] },
      });
      const actor = await admin.user.create({
        data: { tenant_id: tenant.id, name: `Gestor ${label}`, email: `gestor-${k}@hk1.test`, status: "active" },
      });
      await admin.userRoleAssignment.create({ data: { tenant_id: tenant.id, user_id: actor.id, role_id: tenantAdminRoleId } });
      return { tenantId: tenant.id, adminId: actor.id };
    }

    const hashed = await hashPassword("Senha-HK1-Forte-123!");
    async function technician(p: Patio, email: string): Promise<void> {
      const user = await admin.user.create({ data: { tenant_id: p.tenantId, name: "Técnico", email, status: "active" } });
      await admin.userRoleAssignment.create({ data: { tenant_id: p.tenantId, user_id: user.id, role_id: technicianRoleId } });
      const identity = await admin.authIdentity.create({ data: { id: randomUUID() } });
      await admin.authIdentityLink.create({
        data: { identity_id: identity.id, tenant_id: p.tenantId, user_id: user.id, attached_via: "backfill" },
      });
      await admin.localAuthCredential.create({
        data: {
          tenant_id: p.tenantId,
          user_id: user.id,
          email,
          password_hash: hashed.password_hash,
          password_algorithm: hashed.password_algorithm,
        },
      });
    }

    let baseUrl = "";
    const actorHeaders = (p: Patio) => ({ "x-tenant-id": p.tenantId, "x-user-id": p.adminId, "x-role": "tenant_admin" });
    const create = (p: Patio, email: string) =>
      requestJson(baseUrl, "/api/v1/users", {
        method: "POST",
        headers: actorHeaders(p),
        body: { name: "Técnico novo", email, roles: ["field_technician"] },
      });
    const grant = (p: Patio, email: string) =>
      requestJson(baseUrl, "/api/v1/users/access-grants", {
        method: "POST",
        headers: actorHeaders(p),
        body: { name: "Técnico do grupo", email },
      });
    const identitiesOf = async (email: string, tenantIds: string[]) => {
      const links = await admin.authIdentityLink.findMany({
        where: { tenant_id: { in: tenantIds }, user: { email } },
        select: { identity_id: true },
      });
      return new Set(links.map((link) => link.identity_id)).size;
    };
    const statuses: number[] = [];
    const record = (...responses: Array<{ status: number }>) => {
      for (const response of responses) statuses.push(response.status);
      return responses.map((response) => response.status);
    };

    try {
      server = createApp(service).listen(0);
      baseUrl = await getBaseUrl(server);
      const X = await patio("X");
      const Y = await patio("Y");
      const Z = await patio("Z");
      const g = await admin.economicGroup.create({ data: { name: `Grupo HK1 ${tag}` } });
      for (const p of [X, Y, Z]) {
        await admin.economicGroupMember.create({
          data: { tenant_id: p.tenantId, group_id: g.id, valid_from: new Date("2026-01-01T00:00:00Z") },
        });
      }
      const group = [X.tenantId, Y.tenantId, Z.tenantId];

      await t.test("K1: duas criações simultâneas, 50 rodadas: 201 e 409, 1 usuário, o cancelado com número maior", async () => {
        for (let round = 0; round < 50; round += 1) {
          const email = `k1-${round}-${next()}@hk1.test`;
          const [a, b] = await Promise.all([create(X, email), create(Y, email)]);
          const pair = record(a, b);
          assert.deepEqual([...pair].sort(), [201, 409], `rodada ${round}: ${JSON.stringify([a.body, b.body])}`);
          const loser = pair[0] === 409 ? a : b;
          assert.equal((loser.body.error as { reason?: string }).reason, "email_in_group", `rodada ${round}`);
          assert.equal(await admin.user.count({ where: { tenant_id: { in: group }, email } }), 1, `rodada ${round}`);
          assert.equal(await identitiesOf(email, group), 1, `rodada ${round}`);
          const rows = await admin.userCreationLog.findMany({
            where: { email_key: creationEmailKey(email) },
            select: { seq: true, state: true },
          });
          const confirmed = rows.filter((row) => row.state === "confirmado");
          const cancelled = rows.filter((row) => row.state === "cancelado");
          assert.equal(confirmed.length, 1, `rodada ${round}: ${JSON.stringify(rows.map((r) => r.state))}`);
          assert.equal(cancelled.length, 1, `rodada ${round}`);
          assert.ok(cancelled[0].seq > confirmed[0].seq, `rodada ${round}: o cancelado tem número maior`);
        }
      });

      for (const order of ["concessão primeiro", "criação primeiro"] as const) {
        await t.test(`K10 (${order}), 30 rodadas: a criação 409, a concessão 201, 1 identidade`, async () => {
          for (let round = 0; round < 30; round += 1) {
            const email = `k10-${round}-${next()}@hk1.test`;
            await technician(X, email);
            const [grantResponse, createResponse] =
              order === "concessão primeiro"
                ? await Promise.all([grant(Y, email), create(Z, email)])
                : await Promise.all([create(Z, email), grant(Y, email)]).then(([c, g2]) => [g2, c] as const);
            record(grantResponse, createResponse);
            assert.equal(grantResponse.status, 201, `rodada ${round}: ${JSON.stringify(grantResponse.body)}`);
            assert.equal(createResponse.status, 409, `rodada ${round}: ${JSON.stringify(createResponse.body)}`);
            assert.equal(await admin.user.count({ where: { tenant_id: Z.tenantId, email } }), 0, `rodada ${round}`);
            assert.equal(await identitiesOf(email, group), 1, `rodada ${round}`);
          }
        });
      }

      await t.test("K11: criação em X × concessão em Y, e-mail novo, 30 rodadas: nunca 2 identidades", async () => {
        for (let round = 0; round < 30; round += 1) {
          const email = `k11-${round}-${next()}@hk1.test`;
          const [createResponse, grantResponse] = await Promise.all([create(X, email), grant(Y, email)]);
          record(createResponse, grantResponse);
          assert.equal(createResponse.status, 201, `rodada ${round}: ${JSON.stringify(createResponse.body)}`);
          assert.ok([201, 404].includes(grantResponse.status), `rodada ${round}: ${JSON.stringify(grantResponse.body)}`);
          assert.equal(await identitiesOf(email, group), 1, `rodada ${round}`);
        }
      });

      await t.test("fim: 0 linha em_curso e nenhum 5xx", async () => {
        assert.equal(await admin.userCreationLog.count({ where: { state: "em_curso" } }), 0);
        assert.deepEqual(statuses.filter((status) => status >= 500), []);
      });
    } finally {
      if (server) await closeServer(server);
      await Promise.allSettled([runtimeRole.drop(), admin.$disconnect()]);
    }
  });
}
