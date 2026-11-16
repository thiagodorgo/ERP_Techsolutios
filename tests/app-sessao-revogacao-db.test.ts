import "dotenv/config";

// B-APP-SESSAO-RENOVA (item 68 do portão) — o servidor é quem revoga, com banco (PostgreSQL real).
//
// O serviço de sessão real (`AuthSessionService`) roda sob um papel efêmero SEM superusuário e sem BYPASSRLS
// (`createEphemeralRole`), dentro do contexto da organização (`withTenantRls`), e o roteador real
// (`createAuthRouter`) o recebe injetado. A fixture (organização, usuário, papel) e as leituras de conferência
// usam o cliente privilegiado. Sem `DATABASE_URL`, a suíte pula declarando.
//
// [SV2]  o "Sair" com o token JÁ TROCADO revoga a sessão inteira (S2).
// [SV2b] o "Sair" com o token vigente revoga (regressão).
// [SV2c] o "Sair" de uma sessão já revogada responde 200 e não revoga de novo.
import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";

import type { PrismaClient } from "@prisma/client";

import {
  cleanupIdentityFixture,
  createEphemeralRole,
  createOrgWithUser,
  type EphemeralRole,
  type OrgFixture,
} from "./helpers/auth-identity-fixture.js";

process.env.LOG_LEVEL = "silent";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "dev-only-change-me";
process.env.JWT_EXPIRES_IN = "15m";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "dev-only-refresh-change-me";
process.env.JWT_REFRESH_EXPIRES_IN = "7d";

const connectionString = process.env.DATABASE_URL;

type ServiceModule = typeof import("../src/modules/auth/services/auth-session.service.js");
type Service = InstanceType<ServiceModule["AuthSessionService"]>;
type Http = { status: number; body: any };

if (!connectionString) {
  it("B-APP-SESSAO-RENOVA -db requires DATABASE_URL and a migrated PostgreSQL database", {
    skip: "Set DATABASE_URL and run migrations to execute the session revocation tests.",
  });
} else {
  describe("B-APP-SESSAO-RENOVA — o servidor revoga (Postgres, papel sem BYPASSRLS)", () => {
    let admin: PrismaClient;
    let role: EphemeralRole;
    let svcModule: ServiceModule;
    let org: OrgFixture;
    let literal: Service;
    let server: Server;
    let baseUrl: string;
    const tenantIds: string[] = [];

    // Monta o serviço real sobre o papel sem bypass, com as opções do teste (as janelas).
    const buildService = async (options?: Record<string, number>): Promise<Service> => {
      const [{ withTenantRls }, { AuditLogRepository }] = await Promise.all([
        import("../src/database/rls.js"),
        import("../src/modules/core-saas/repositories/index.js"),
      ]);
      const ServiceClass = svcModule.AuthSessionService as unknown as new (...args: unknown[]) => Service;
      return new ServiceClass(
        (tenantId: string, work: (tx: never) => Promise<unknown>) => withTenantRls(role.client, tenantId, work as never),
        (tx: never) => new AuditLogRepository(tx),
        ...(options ? [options] : []),
      );
    };

    const startRouter = async (service: Service): Promise<{ url: string; srv: Server }> => {
      const [{ default: express }, { createAuthRouter }] = await Promise.all([
        import("express"),
        import("../src/modules/auth/routes/auth.routes.js"),
      ]);
      const app = express();
      app.use(express.json());
      app.use("/api/v1/auth", createAuthRouter({ getSessionService: async () => service }));
      const srv = app.listen(0);
      await new Promise<void>((resolve) => srv.once("listening", resolve));
      return { url: `http://127.0.0.1:${(srv.address() as AddressInfo).port}`, srv };
    };

    const post = async (url: string, path: string, body?: unknown): Promise<Http> => {
      const response = await fetch(`${url}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await response.text();
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = text;
      }
      return { status: response.status, body: json };
    };

    const refresh = (token: string, extra: Record<string, string> = {}, url = baseUrl) =>
      post(url, "/api/v1/auth/refresh", { refreshToken: token, ...extra });
    const logout = (token: string, url = baseUrl) => post(url, "/api/v1/auth/logout", { refreshToken: token });
    const tok = (r: Http) => r.body?.data?.refresh_token as string | undefined;
    const newSession = (service: Service = literal, user: OrgFixture = org) =>
      service.createSession({ tenant_id: user.tenantId, user_id: user.userId });
    const revoked = async (sessionId: string) =>
      (await admin.authSession.findFirstOrThrow({ where: { id: sessionId } })).revoked_at !== null;
    const audit = (sessionId: string) =>
      admin.auditLog.findMany({ where: { entity_id: sessionId }, orderBy: { created_at: "asc" } });

    before(async () => {
      const [{ PrismaPg }, { PrismaClient: Client }] = await Promise.all([
        import("@prisma/adapter-pg"),
        import("@prisma/client"),
      ]);
      admin = new Client({ adapter: new PrismaPg({ connectionString }) });
      role = await createEphemeralRole(admin, connectionString);
      svcModule = await import("../src/modules/auth/services/auth-session.service.js");
      const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      org = await createOrgWithUser(admin, {
        name: `Sessao Renova ${suffix}`,
        slug: `sessao-renova-${suffix}`,
        email: `sessao-renova-${suffix}@example.com`,
        password: "SenhaRenova123!",
      });
      tenantIds.push(org.tenantId);
      literal = await buildService();
      const started = await startRouter(literal);
      server = started.srv;
      baseUrl = started.url;

      const papel = await role.client.$queryRaw<{ s: boolean; b: boolean }[]>`
        SELECT r.rolsuper AS s, r.rolbypassrls AS b FROM pg_roles r WHERE r.rolname = current_user`;
      assert.deepEqual(papel[0], { s: false, b: false }, "o serviço roda sob papel sem superusuário e sem BYPASSRLS");
    });

    after(async () => {
      if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
      if (admin) await cleanupIdentityFixture(admin, tenantIds);
      if (role) await role.drop();
      if (admin) await admin.$disconnect();
    });

    it("[SV2] o \"Sair\" com o token já trocado revoga a sessão inteira", async () => {
      const s = await newSession();
      const r1 = await refresh(s.refreshToken);
      assert.equal(r1.status, 200);
      const R1 = tok(r1);
      assert.ok(R1 && R1 !== s.refreshToken);

      const out = await logout(s.refreshToken);
      assert.equal(out.status, 200);
      assert.deepEqual(out.body, { data: { revoked: true } });
      assert.equal(await revoked(s.sessionId), true, "a sessão tem revoked_at");

      const again = await refresh(R1);
      assert.equal(again.status, 401, "o R1 não renova mais");
      assert.equal(tok(again), undefined);
    });

    it("[SV2b] o \"Sair\" com o token vigente revoga", async () => {
      const s = await newSession();
      const r1 = await refresh(s.refreshToken);
      const R1 = tok(r1) as string;

      const out = await logout(R1);
      assert.equal(out.status, 200);
      assert.equal(await revoked(s.sessionId), true);
      assert.equal((await refresh(R1)).status, 401);
    });

    it("[SV2c] o \"Sair\" de uma sessão já revogada responde 200 e não revoga de novo", async () => {
      const s = await newSession();
      assert.equal((await logout(s.refreshToken)).status, 200);
      const revokedAt = (await admin.authSession.findFirstOrThrow({ where: { id: s.sessionId } })).revoked_at;
      const before2 = (await audit(s.sessionId)).filter((row) => row.action === "auth.session.revoked").length;
      assert.equal(before2, 1);

      const second = await logout(s.refreshToken);
      assert.equal(second.status, 200);
      assert.deepEqual(second.body, { data: { revoked: true } });
      const rows = await audit(s.sessionId);
      assert.equal(rows.filter((row) => row.action === "auth.session.revoked").length, 1, "sem nova revogação na auditoria");
      const after2 = (await admin.authSession.findFirstOrThrow({ where: { id: s.sessionId } })).revoked_at;
      assert.equal(after2?.getTime(), revokedAt?.getTime(), "o revoked_at não muda");
    });
  });
}
