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
// [SV4]…[SV5c], [SV7] o reenvio e a corrida recebem o MESMO sucessor (S4); a troca é condicional.
// [SV14], [SV14b] a borda exata das janelas, em milissegundos, com relógio controlado (`Date.now`).
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
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

// Relógio controlado (SV14, SV14b): `fake` nulo = relógio real.
const realNow = Date.now.bind(Date);
let fake: number | null = null;
Date.now = () => (fake === null ? realNow() : fake);

// O par do aparelho: o compromisso do 1º envio e a prova dos reenvios (D1c).
function par(): { commit: string; proof: string } {
  const nonce = randomBytes(32);
  return { commit: createHash("sha256").update(nonce).digest("base64url"), proof: nonce.toString("base64url") };
}

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
    // Duas conexões abertas no pool do papel antes de prender a linha: a 2ª renovação não espera conexão nova.
    const warmPool = () =>
      Promise.all([0, 1].map(() => role.client.$transaction(async (tx) => tx.$queryRaw`SELECT pg_sleep(0.2)::text AS x`)));
    // O serviço direto, no formato da rota (status e corpo), para as corridas presas na trava da linha.
    const direct = async (token: string, binding: Record<string, string> = {}, service: Service = literal): Promise<Http> => {
      const r = await service.refreshSession(token, binding);
      return r.ok ? { status: 200, body: { data: { refresh_token: r.refreshToken } } } : { status: 401, body: { error: { reason: r.reason } } };
    };
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

    it("[SV4] a resposta da renovação se perde: o reenvio do R0 recebe o MESMO sucessor", async () => {
      const s = await newSession();
      const lost = await refresh(s.refreshToken); // a resposta "se perde": o teste a descarta
      assert.equal(lost.status, 200);
      const retry = await refresh(s.refreshToken);
      assert.equal(retry.status, 200);
      assert.equal(tok(retry), tok(lost), "o mesmo refresh_token");
      assert.equal(await revoked(s.sessionId), false);
      const next = await refresh(tok(retry) as string);
      assert.equal(next.status, 200, "o R1 renova");
      const success = (await audit(s.sessionId)).filter((row) => row.action === "auth.refresh.success");
      assert.equal(
        success.filter((row) => (row.metadata as { reason?: string } | null)?.reason === "retry_within_window").length,
        1,
        "1 linha auth.refresh.success com reason retry_within_window",
      );
    });

    it("[SV4b] o R0 três vezes: 3 × 200, um token só, e o R1 renova", async () => {
      const s = await newSession();
      const results = [await refresh(s.refreshToken), await refresh(s.refreshToken), await refresh(s.refreshToken)];
      assert.deepEqual(results.map((r) => r.status), [200, 200, 200]);
      assert.equal(new Set(results.map(tok)).size, 1);
      assert.equal((await refresh(tok(results[0]) as string)).status, 200);
    });

    it("[SV5] 2 renovações em voo com o R0: 2 × 200, o mesmo token, e o R1 renova", async () => {
      const s = await newSession();
      const [a, b] = await Promise.all([refresh(s.refreshToken), refresh(s.refreshToken)]);
      assert.deepEqual([a.status, b.status], [200, 200]);
      assert.equal(tok(a), tok(b));
      assert.equal(await revoked(s.sessionId), false);
      assert.equal((await refresh(tok(a) as string)).status, 200);
    });

    it("[SV5b] 10 em voo: 10 × 200, 1 token, e o R1 renova", async () => {
      const s = await newSession();
      const all = await Promise.all(Array.from({ length: 10 }, () => refresh(s.refreshToken)));
      assert.deepEqual(all.map((r) => r.status), Array(10).fill(200));
      assert.equal(new Set(all.map(tok)).size, 1);
      assert.equal((await refresh(tok(all[0]) as string)).status, 200);
    });

    it("[SV5c] 2 com o R0, a 2ª 1,2 s depois, presas na trava da linha: o mesmo token, e o R1 renova", async () => {
      const s = await newSession();
      await warmPool();
      let first: Promise<Http> | undefined;
      let second: Promise<Http> | undefined;
      await admin.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM auth_sessions WHERE id = ${s.sessionId}::uuid FOR UPDATE`;
          first = direct(s.refreshToken);
          await new Promise((resolve) => setTimeout(resolve, 1200));
          second = direct(s.refreshToken);
          // espera as duas renovações presas na trava da linha (pg_stat_activity), e só então solta
          for (let i = 0; ; i++) {
            const waiting = await tx.$queryRaw<{ n: bigint }[]>`
              SELECT count(*)::bigint AS n FROM pg_stat_activity
              WHERE usename = ${role.roleName} AND wait_event_type = 'Lock'`;
            if (Number(waiting[0].n) >= 2) break;
            assert.ok(i < 300, "as duas renovações não chegaram a esperar a trava");
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
        },
        { timeout: 60_000, maxWait: 10_000 },
      );
      const [a, b] = await Promise.all([first as Promise<Http>, second as Promise<Http>]);
      assert.deepEqual([a.status, b.status], [200, 200]);
      assert.equal(tok(a), tok(b), "o mesmo token nas duas");
      assert.equal((await refresh(tok(a) as string)).status, 200, "o R1 renova");
    });

    it("[SV7] o usuário desativado entre a troca e o reenvio: o reenvio dá 401 e não traz token", async () => {
      const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const other = await createOrgWithUser(admin, {
        name: `Sessao Renova SV7 ${suffix}`,
        slug: `sessao-renova-sv7-${suffix}`,
        email: `sessao-renova-sv7-${suffix}@example.com`,
        password: "SenhaRenova123!",
      });
      tenantIds.push(other.tenantId);
      const s = await newSession(literal, other);
      assert.equal((await refresh(s.refreshToken)).status, 200);
      await admin.user.update({ where: { id: other.userId }, data: { status: "inactive" } });
      const retry = await refresh(s.refreshToken);
      assert.equal(retry.status, 401);
      assert.equal(tok(retry), undefined);
    });

    // A borda exata (v3.3 §4.2): troca em T0; reenvio em T0 + W·1000 + d, d ∈ {−1, 0, +1} ms. T0 cai no meio de um
    // segundo, para que o arredondamento antigo em segundos (MP5x) aceite o +1 ms e morra aqui.
    const borda = async (
      W: number,
      first: (p: { commit: string; proof: string }) => Record<string, string>,
      second: (p: { commit: string; proof: string }) => Record<string, string>,
    ) => {
      const out: { d: number; ok: boolean; same: boolean }[] = [];
      for (const d of [-1, 0, 1]) {
        const s = await newSession();
        const p = par();
        const T0 = Math.floor(realNow() / 1000) * 1000 + 500;
        try {
          fake = T0;
          const r1 = await literal.refreshSession(s.refreshToken, first(p));
          fake = T0 + W * 1000 + d;
          const re = await literal.refreshSession(s.refreshToken, second(p));
          out.push({ d, ok: re.ok, same: r1.ok && re.ok && re.refreshToken === r1.refreshToken });
        } finally {
          fake = null;
        }
      }
      return out;
    };

    it("[SV14] borda exata da janela longa (60 s com prova): W−1 ms e W passam com o mesmo R1; W+1 ms não dá token", async () => {
      const modes: [string, (p: any) => Record<string, string>, (p: any) => Record<string, string>][] = [
        ["prova depois do compromisso (S33B)", (p) => ({ commit: p.commit }), (p) => ({ proof: p.proof })],
        ["compromisso atrasado depois da prova (S33D)", (p) => ({ proof: p.proof }), (p) => ({ commit: p.commit })],
        ["prova repetida depois da prova (S33C)", (p) => ({ proof: p.proof }), (p) => ({ proof: p.proof })],
      ];
      for (const [mode, first, second] of modes) {
        const out = await borda(60, first, second);
        assert.deepEqual(
          out.map((o) => [o.d, o.ok, o.same]),
          [[-1, true, true], [0, true, true], [1, false, false]],
          mode,
        );
      }
    });

    it("[SV14b] borda exata da janela curta (10 s sem prova): W−1 ms e W passam com o mesmo R1; W+1 ms não dá token", async () => {
      const modes: [string, (p: any) => Record<string, string>, (p: any) => Record<string, string>][] = [
        ["sem vínculo (S33E)", () => ({}), () => ({})],
        ["compromisso depois da web (S33E)", () => ({}), (p) => ({ commit: p.commit })],
      ];
      for (const [mode, first, second] of modes) {
        const out = await borda(10, first, second);
        assert.deepEqual(
          out.map((o) => [o.d, o.ok, o.same]),
          [[-1, true, true], [0, true, true], [1, false, false]],
          mode,
        );
      }
    });
  });
}
