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
// [SV11]…[SV11c], [SV16], [SV17] a rota passa a prova de posse ao serviço (S5).
// [SV3], [SV3b], [SV4c], [SV4d], [SV6], [SV8], [SV12], [SV12c], [SV12p] o reuso derruba a família (S3).
// [SV18]…[SV18c], [SV19] a ordem invertida da rede não derruba o técnico (S6, v3.3).
// [SV20a]…[SV20e] o resíduo R-3c (v3.4 §1.3), escolhido pelo dono (D-DONO-1511-68-NAO-DESLOGAR), preso na letra:
//   C = 1º envio do app (R0 + compromisso), P = reenvio (R0 + prova), X = cópia byte a byte de C por um terceiro.
// [SV9], [SV13], [SV15] os resíduos R-3 e R-3w na letra; [SV10] nada de segredo na auditoria.
// [SV21a], [SV21b] P-68-PERDEDOR-RELE-401 (v3.4 §5): quem PERDE a troca condicional e relê. Determinístico, sem
//   `Promise.all`: o teste embrulha `AuthSessionRepository.prototype.rotateRefreshToken` para executar ANTES a
//   renovação concorrente (que usa o método original) e só então a troca; o embrulho age uma vez e sai no `finally`.
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

// O portão de sessão viva (`attachAuthenticatedActor` → `sessionLiveness`) só confere a sessão no modo prisma.
// O job `backend` da CI força `memory` no ambiente; este arquivo precisa do portão real nos casos SV20.
if (connectionString) process.env.CORE_SAAS_PERSISTENCE = "prisma";

// Relógio controlado (SV14, SV14b): `fake` nulo = relógio real.
const realNow = Date.now.bind(Date);
let fake: number | null = null;
Date.now = () => (fake === null ? realNow() : fake);

// O par do aparelho: o compromisso do 1º envio e a prova dos reenvios (D1c). Todo par sorteado fica guardado para o
// [SV10] procurar na auditoria.
const usedBindings: string[] = [];
function par(): { commit: string; proof: string } {
  const nonce = randomBytes(32);
  const pair = { commit: createHash("sha256").update(nonce).digest("base64url"), proof: nonce.toString("base64url") };
  usedBindings.push(pair.commit, pair.proof);
  return pair;
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
      const { attachAuthenticatedActor, getAuthenticatedActor } = await import("../src/modules/auth/index.js");
      const app = express();
      app.use(express.json());
      app.use("/api/v1/auth", createAuthRouter({ getSessionService: async () => service }));
      // O portão de sessão viva: o acesso devolvido pela renovação "passa" se a rota autenticada não o recusa.
      app.get("/api/v1/portao", attachAuthenticatedActor(), (request, response) => {
        response.status(getAuthenticatedActor(request) ? 200 : 401).json({});
      });
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
    const acc = (r: Http) => r.body?.data?.access_token as string | undefined;
    const passa = async (access: string | undefined) =>
      (await fetch(`${baseUrl}/api/v1/portao`, { headers: { authorization: `Bearer ${access ?? "x"}` } })).status !== 401;
    // Conexões abertas no pool do papel antes de prender a linha (2 por padrão): a renovação seguinte não espera conexão nova.
    const warmPool = (n = 2) =>
      Promise.all(Array.from({ length: n }, () => role.client.$transaction(async (tx) => tx.$queryRaw`SELECT pg_sleep(0.2)::text AS x`)));
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

    // [SV5], [SV5b] (J588-C1-01): a barreira causal do [SV5c], pela rota. A linha da sessão fica presa; cada onda de
    // renovações só sai depois que TODAS as anteriores esperam a trava (pg_stat_activity) e mais 1,2 s, então cada
    // onda calcula o sucessor noutro segundo. Só com todas presas a trava solta. Sem a troca condicional, cada onda
    // gravaria o seu sucessor, e os tokens seriam mais de um (o `Promise.all` solto não distinguia: duas trocas no
    // mesmo segundo calculam o mesmo token).
    const presasNaTrava = async (sessionId: string, ondas: number[], mandar: () => Promise<Http>): Promise<Http[]> => {
      await warmPool(ondas.reduce((soma, n) => soma + n, 0));
      const voo: Promise<Http>[] = [];
      await admin.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM auth_sessions WHERE id = ${sessionId}::uuid FOR UPDATE`;
          for (const [k, n] of ondas.entries()) {
            if (k > 0) await new Promise((resolve) => setTimeout(resolve, 1200));
            for (let j = 0; j < n; j++) voo.push(mandar());
            for (let i = 0; ; i++) {
              const waiting = await tx.$queryRaw<{ n: bigint }[]>`
                SELECT count(*)::bigint AS n FROM pg_stat_activity
                WHERE usename = ${role.roleName} AND wait_event_type = 'Lock'`;
              if (Number(waiting[0].n) >= voo.length) break;
              assert.ok(i < 300, `as ${voo.length} renovações não chegaram a esperar a trava`);
              await new Promise((resolve) => setTimeout(resolve, 50));
            }
          }
        },
        { timeout: 60_000, maxWait: 10_000 },
      );
      return Promise.all(voo);
    };

    it("[SV5] 2 renovações em voo com o R0, presas na trava e 1,2 s uma da outra: 2 × 200, o mesmo token, e o R1 renova", async () => {
      const s = await newSession();
      const [a, b] = await presasNaTrava(s.sessionId, [1, 1], () => refresh(s.refreshToken));
      assert.deepEqual([a.status, b.status], [200, 200]);
      assert.equal(tok(a), tok(b), "o mesmo token nas duas");
      assert.equal(await revoked(s.sessionId), false);
      assert.equal((await refresh(tok(a) as string)).status, 200, "o R1 renova");
    });

    it("[SV5b] 10 em voo, presas na trava, em 2 ondas de 5 a 1,2 s: 10 × 200, 1 token, e o R1 renova", async () => {
      const s = await newSession();
      const all = await presasNaTrava(s.sessionId, [5, 5], () => refresh(s.refreshToken));
      assert.deepEqual(all.map((r) => r.status), Array(10).fill(200));
      assert.equal(new Set(all.map(tok)).size, 1, "1 token nas 10");
      assert.equal(await revoked(s.sessionId), false);
      assert.equal((await refresh(tok(all[0]) as string)).status, 200, "o R1 renova");
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

    it("[SV11] pela rota: o 1º envio com o compromisso se perde; o reenvio com a prova recebe o mesmo R1", async () => {
      const s = await newSession();
      const p = par();
      const lost = await refresh(s.refreshToken, { renewalCommit: p.commit });
      assert.equal(lost.status, 200);
      const retry = await refresh(s.refreshToken, { renewalProof: p.proof });
      assert.equal(retry.status, 200);
      assert.equal(tok(retry), tok(lost));
      assert.equal(await revoked(s.sessionId), false);
      assert.equal((await refresh(tok(retry) as string, { renewalCommit: par().commit })).status, 200, "o R1 renova");
    });

    it("[SV11b] pela rota: o reenvio com prova 10,6 s depois recebe o mesmo R1; sem prova, no mesmo tempo, não", async () => {
      const s = await newSession();
      const p = par();
      const T0 = realNow();
      try {
        fake = T0;
        const lost = await refresh(s.refreshToken, { renewalCommit: p.commit });
        assert.equal(lost.status, 200);
        fake = T0 + 10_600;
        const withProof = await refresh(s.refreshToken, { renewalProof: p.proof });
        assert.equal(withProof.status, 200, "com prova, dentro dos 60 s");
        assert.equal(tok(withProof), tok(lost));
        const withoutProof = await refresh(s.refreshToken);
        assert.equal(tok(withoutProof), undefined, "sem prova, fora dos 10 s: não dá token");
        assert.notEqual(withoutProof.status, 200);
      } finally {
        fake = null;
      }
    });

    it("[SV11c] o 1º envio nunca chegou: o reenvio com prova troca, e o seguinte com a mesma prova recebe o mesmo R1", async () => {
      const s = await newSession();
      const p = par();
      const first = await refresh(s.refreshToken, { renewalProof: p.proof });
      assert.equal(first.status, 200);
      const again = await refresh(s.refreshToken, { renewalProof: p.proof });
      assert.equal(again.status, 200);
      assert.equal(tok(again), tok(first));
      assert.equal(await revoked(s.sessionId), false);
    });

    it("[SV16] o 1º envio preso na trava da linha e o reenvio com prova 1,2 s depois: 200 e 200, o mesmo R1", async () => {
      const s = await newSession();
      const p = par();
      await warmPool();
      let first: Promise<Http> | undefined;
      let second: Promise<Http> | undefined;
      await admin.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM auth_sessions WHERE id = ${s.sessionId}::uuid FOR UPDATE`;
          first = direct(s.refreshToken, { commit: p.commit });
          await new Promise((resolve) => setTimeout(resolve, 1200));
          second = direct(s.refreshToken, { proof: p.proof });
          for (let i = 0; ; i++) {
            const waiting = await tx.$queryRaw<{ n: bigint }[]>`
              SELECT count(*)::bigint AS n FROM pg_stat_activity
              WHERE usename = ${role.roleName} AND wait_event_type = 'Lock'`;
            if (Number(waiting[0].n) >= 2) break;
            assert.ok(i < 300, "os dois envios não chegaram a esperar a trava");
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
        },
        { timeout: 60_000, maxWait: 10_000 },
      );
      const [a, b] = await Promise.all([first as Promise<Http>, second as Promise<Http>]);
      assert.deepEqual([a.status, b.status], [200, 200]);
      assert.equal(tok(a), tok(b));
      assert.equal(await revoked(s.sessionId), false);
    });

    it("[SV17] a prova fora do formato é ignorada: numa troca sem vínculo, dentro da corrida, 200 e o mesmo R1", async () => {
      const s = await newSession();
      const r1 = await refresh(s.refreshToken);
      assert.equal(r1.status, 200);
      const odd = await refresh(s.refreshToken, { renewalProof: "A".repeat(4000) });
      assert.equal(odd.status, 200);
      assert.equal(tok(odd), tok(r1));
    });

    const reuseAudit = async (sessionId: string) => {
      const rows = await audit(sessionId);
      return {
        reuse: rows.filter(
          (row) => row.action === "auth.refresh.failed" && (row.metadata as { reason?: string } | null)?.reason === "reuse_detected",
        ).length,
        revokedRows: rows.filter((row) => row.action === "auth.session.revoked").length,
      };
    };

    it("[SV3] R0 → R1 → R2, e o R0 de novo: 401, a família cai, o R2 dá 401; auditoria do reuso", async () => {
      const s = await newSession();
      const r1 = await refresh(s.refreshToken);
      const r2 = await refresh(tok(r1) as string);
      assert.equal(r2.status, 200);
      const reuse = await refresh(s.refreshToken);
      assert.equal(reuse.status, 401);
      assert.equal(tok(reuse), undefined);
      assert.equal(await revoked(s.sessionId), true, "a sessão foi revogada");
      assert.equal((await refresh(tok(r2) as string)).status, 401, "o R2 não renova mais");
      assert.deepEqual(await reuseAudit(s.sessionId), { reuse: 1, revokedRows: 1 });
    });

    it("[SV3b] a cadeia normal (cada token usado uma vez) não revoga nada", async () => {
      const s = await newSession();
      let current = s.refreshToken;
      for (let i = 0; i < 3; i++) {
        const r = await refresh(current, { renewalCommit: par().commit });
        assert.equal(r.status, 200);
        current = tok(r) as string;
      }
      assert.equal(await revoked(s.sessionId), false);
      assert.deepEqual(await reuseAudit(s.sessionId), { reuse: 0, revokedRows: 0 });
    });

    it("[SV4c] o reenvio servido, o R1 usado, e o R0 de volta: 401 e a família cai", async () => {
      const s = await newSession();
      const r1 = await refresh(s.refreshToken);
      const again = await refresh(s.refreshToken);
      assert.equal(tok(again), tok(r1), "o reenvio foi servido");
      assert.equal((await refresh(tok(r1) as string)).status, 200, "o R1 foi usado");
      const back = await refresh(s.refreshToken);
      assert.equal(back.status, 401);
      assert.equal(await revoked(s.sessionId), true);
    });

    it("[SV4d] fora da janela (serviço com janelas de 1 s): o R0 2,5 s depois dá 401, a família cai, o R1 dá 401", async () => {
      const short = await buildService({ replayWindowSeconds: 1, raceWindowSeconds: 1 });
      const s = await newSession(short);
      const T0 = realNow();
      try {
        fake = T0;
        const r1 = await short.refreshSession(s.refreshToken);
        assert.equal(r1.ok, true);
        fake = T0 + 2500;
        const late = await short.refreshSession(s.refreshToken);
        assert.equal(late.ok, false);
        assert.equal(await revoked(s.sessionId), true);
        const withR1 = await short.refreshSession((r1 as { refreshToken: string }).refreshToken);
        assert.equal(withR1.ok, false);
      } finally {
        fake = null;
      }
    });

    it("[SV6] isolamento: o reuso na sessão A derruba só A", async () => {
      const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const colleague = await admin.user.create({
        data: { tenant_id: org.tenantId, name: "Colega", email: `colega-${suffix}@example.com`, status: "active" },
      });
      await admin.userRoleAssignment.create({ data: { tenant_id: org.tenantId, user_id: colleague.id, role_id: org.roleId } });
      const colleagueFixture: OrgFixture = { ...org, userId: colleague.id, email: colleague.email };
      const otherOrg = await createOrgWithUser(admin, {
        name: `Sessao Renova SV6 ${suffix}`,
        slug: `sessao-renova-sv6-${suffix}`,
        email: `sessao-renova-sv6-${suffix}@example.com`,
        password: "SenhaRenova123!",
      });
      tenantIds.push(otherOrg.tenantId);

      const a = await newSession();
      const sameUser = await newSession();
      const mate = await newSession(literal, colleagueFixture);
      const foreign = await newSession(literal, otherOrg);
      const a1 = await refresh(a.refreshToken);
      await refresh(tok(a1) as string);
      const mate1 = await refresh(mate.refreshToken);
      const mateRetry = await refresh(mate.refreshToken);
      assert.equal(tok(mateRetry), tok(mate1), "o colega teve um reenvio servido");

      assert.equal((await refresh(a.refreshToken)).status, 401, "o reuso na sessão A");
      assert.equal(await revoked(a.sessionId), true);

      for (const [name, sess, token] of [
        ["outra sessão do mesmo usuário", sameUser, sameUser.refreshToken],
        ["outro usuário da mesma organização", mate, tok(mate1) as string],
        ["outra organização", foreign, foreign.refreshToken],
      ] as const) {
        assert.equal(await revoked(sess.sessionId), false, name);
        assert.equal((await refresh(token)).status, 200, name);
      }
    });

    it("[SV8] o \"Sair\" com o R1, depois o R0 dentro da janela: 401 e a sessão revogada", async () => {
      const s = await newSession();
      const r1 = await refresh(s.refreshToken);
      assert.equal((await logout(tok(r1) as string)).status, 200);
      const back = await refresh(s.refreshToken);
      assert.equal(back.status, 401);
      assert.equal(tok(back), undefined);
      assert.equal(await revoked(s.sessionId), true);
    });

    it("[SV12] o app troca com compromisso; o R0 sem prova, na corrida: 401, sem token, a família cai, o R1 do app dá 401", async () => {
      const s = await newSession();
      const p = par();
      const app = await refresh(s.refreshToken, { renewalCommit: p.commit });
      assert.equal(app.status, 200);
      const thief = await refresh(s.refreshToken);
      assert.equal(thief.status, 401);
      assert.equal(tok(thief), undefined);
      assert.equal(await revoked(s.sessionId), true);
      assert.equal((await refresh(tok(app) as string, { renewalCommit: par().commit })).status, 401);
    });

    it("[SV12c] o R0 com o compromisso copiado: 401, sem token, a família cai", async () => {
      const s = await newSession();
      const p = par();
      assert.equal((await refresh(s.refreshToken, { renewalCommit: p.commit })).status, 200);
      const copy = await refresh(s.refreshToken, { renewalCommit: p.commit });
      assert.equal(copy.status, 401);
      assert.equal(tok(copy), undefined);
      assert.equal(await revoked(s.sessionId), true);
    });

    it("[SV12p] o R0 com uma prova inventada: 401, sem token, a família cai", async () => {
      const s = await newSession();
      const p = par();
      assert.equal((await refresh(s.refreshToken, { renewalCommit: p.commit })).status, 200);
      const forged = await refresh(s.refreshToken, { renewalProof: par().proof });
      assert.equal(forged.status, 401);
      assert.equal(tok(forged), undefined);
      assert.equal(await revoked(s.sessionId), true);
    });

    it("[SV18] a prova troca primeiro e o compromisso chega depois: 200 e 200, o mesmo R1, sessão viva, o R1 renova", async () => {
      const s = await newSession();
      const p = par();
      const byProof = await refresh(s.refreshToken, { renewalProof: p.proof });
      const lateCommit = await refresh(s.refreshToken, { renewalCommit: p.commit });
      assert.deepEqual([byProof.status, lateCommit.status], [200, 200]);
      assert.equal(tok(lateCommit), tok(byProof));
      assert.equal(await revoked(s.sessionId), false);
      assert.equal((await refresh(tok(byProof) as string, { renewalCommit: par().commit })).status, 200);
    });

    it("[SV18b] o compromisso atrasado chega depois dos 10 s e antes dos 60 s: o mesmo R1, sessão viva", async () => {
      const s = await newSession();
      const p = par();
      const T0 = realNow();
      try {
        fake = T0;
        const byProof = await refresh(s.refreshToken, { renewalProof: p.proof });
        fake = T0 + 30_000;
        const lateCommit = await refresh(s.refreshToken, { renewalCommit: p.commit });
        assert.deepEqual([byProof.status, lateCommit.status], [200, 200]);
        assert.equal(tok(lateCommit), tok(byProof));
        assert.equal(await revoked(s.sessionId), false);
      } finally {
        fake = null;
      }
    });

    it("[SV18c] depois do SV18, a prova repetida recebe o mesmo R1; usado o R1, o R0 com prova ou compromisso derruba a família", async () => {
      for (const back of ["proof", "commit"] as const) {
        const s = await newSession();
        const p = par();
        const byProof = await refresh(s.refreshToken, { renewalProof: p.proof });
        assert.equal(tok(await refresh(s.refreshToken, { renewalCommit: p.commit })), tok(byProof));
        const repeated = await refresh(s.refreshToken, { renewalProof: p.proof });
        assert.equal(tok(repeated), tok(byProof), "a prova repetida antes do uso do R1");
        assert.equal((await refresh(tok(byProof) as string, { renewalCommit: par().commit })).status, 200, "o R1 é usado");
        const late = await refresh(s.refreshToken, back === "proof" ? { renewalProof: p.proof } : { renewalCommit: p.commit });
        assert.equal(late.status, 401, back);
        assert.equal(tok(late), undefined, back);
        assert.equal(await revoked(s.sessionId), true, back);
      }
    });

    it("[SV19] depois de uma troca sem vínculo, o compromisso sem prova recebe o mesmo R1 em até 10 s; depois, a família cai", async () => {
      const T0 = realNow();
      try {
        const inside = await newSession();
        fake = T0;
        const web = await refresh(inside.refreshToken);
        fake = T0 + 9_000;
        const commitOnly = await refresh(inside.refreshToken, { renewalCommit: par().commit });
        assert.equal(commitOnly.status, 200);
        assert.equal(tok(commitOnly), tok(web));
        assert.equal(await revoked(inside.sessionId), false);

        const outside = await newSession();
        fake = T0;
        await refresh(outside.refreshToken);
        fake = T0 + 10_001;
        const tooLate = await refresh(outside.refreshToken, { renewalCommit: par().commit });
        assert.equal(tooLate.status, 401);
        assert.equal(await revoked(outside.sessionId), true);
      } finally {
        fake = null;
      }
    });

    it("[SV20a] ordem invertida, o app renova primeiro: a cópia leva o R1; a renovação legítima tira dela o poder de renovar; a família cai no 1º token velho", async () => {
      const s = await newSession();
      const p = par();
      const rP = await refresh(s.refreshToken, { renewalProof: p.proof });
      const rX = await refresh(s.refreshToken, { renewalCommit: p.commit });
      assert.equal(rP.status, 200);
      assert.equal(rX.status, 200, "a cópia recebe o R1 (R-3c)");
      assert.equal(tok(rX), tok(rP));
      assert.equal(await revoked(s.sessionId), false);
      assert.equal(await passa(acc(rX)), true, "o acesso da cópia passa o portão");
      const rApp = await refresh(tok(rP) as string, { renewalCommit: par().commit });
      assert.equal(rApp.status, 200);
      assert.notEqual(tok(rApp), tok(rP));
      assert.equal(await revoked(s.sessionId), false, "a renovação legítima não derruba a sessão");
      assert.equal(await passa(acc(rX)), true, "o acesso já emitido à cópia segue até expirar");
      const rX2 = await refresh(tok(rX) as string);
      assert.equal(rX2.status, 401);
      assert.equal(tok(rX2), undefined);
      assert.equal(await revoked(s.sessionId), true, "o R1 da cópia, já antecessor, derruba a família");
      assert.equal(await passa(acc(rX)), false);
      assert.equal(await passa(acc(rApp)), false);
      assert.equal((await refresh(tok(rApp) as string, { renewalCommit: par().commit })).status, 401);
    });

    it("[SV20b] como o SV20a, e a cópia tenta o R1 depois da janela curta com compromisso próprio: a família cai", async () => {
      const s = await newSession();
      const p = par();
      const T0 = realNow();
      try {
        fake = T0;
        const rP = await refresh(s.refreshToken, { renewalProof: p.proof });
        const rX = await refresh(s.refreshToken, { renewalCommit: p.commit });
        assert.equal(rX.status, 200);
        assert.equal(tok(rX), tok(rP));
        const rApp = await refresh(tok(rP) as string, { renewalCommit: par().commit });
        assert.equal(rApp.status, 200);
        fake = T0 + 10_000 + 1;
        assert.equal(await passa(acc(rX)), true);
        const rX2 = await refresh(tok(rX) as string, { renewalCommit: par().commit });
        assert.equal(rX2.status, 401);
        assert.equal(tok(rX2), undefined);
        assert.equal(await revoked(s.sessionId), true);
        assert.equal((await refresh(tok(rApp) as string, { renewalCommit: par().commit })).status, 401);
      } finally {
        fake = null;
      }
    });

    it("[SV20c] ordem invertida, a cópia renova primeiro: ela segue até o app voltar; aí a família cai", async () => {
      const s = await newSession();
      const p = par();
      const rP = await refresh(s.refreshToken, { renewalProof: p.proof });
      const rX = await refresh(s.refreshToken, { renewalCommit: p.commit });
      assert.equal(rX.status, 200);
      assert.equal(tok(rX), tok(rP));
      const rX2 = await refresh(tok(rX) as string, { renewalCommit: par().commit });
      assert.equal(rX2.status, 200, "a cópia gira o R1 primeiro");
      assert.equal(await passa(acc(rX2)), true);
      assert.equal(await revoked(s.sessionId), false);
      const rApp = await refresh(tok(rP) as string, { renewalCommit: par().commit });
      assert.equal(rApp.status, 401, "o app volta com o R1, já antecessor");
      assert.equal(tok(rApp), undefined);
      assert.equal(await revoked(s.sessionId), true);
      assert.equal((await refresh(tok(rX2) as string, { renewalCommit: par().commit })).status, 401);
      assert.equal(await passa(acc(rX2)), false);
    });

    it("[SV20d] a cópia chega depois da janela longa contada da troca pela prova: não leva nada e a família cai", async () => {
      const s = await newSession();
      const p = par();
      const T0 = realNow();
      try {
        fake = T0;
        const rP = await refresh(s.refreshToken, { renewalProof: p.proof });
        assert.equal(rP.status, 200);
        fake = T0 + 60_000 + 1;
        const rX = await refresh(s.refreshToken, { renewalCommit: p.commit });
        assert.equal(rX.status, 401);
        assert.equal(tok(rX), undefined);
        assert.equal(await revoked(s.sessionId), true);
        assert.equal((await refresh(tok(rP) as string, { renewalCommit: par().commit })).status, 401);
      } finally {
        fake = null;
      }
    });

    it("[SV20e] ordem normal (o controle do SV12c): o 1º envio verdadeiro troca; a cópia não leva nada e a família cai", async () => {
      const s = await newSession();
      const p = par();
      const rC = await refresh(s.refreshToken, { renewalCommit: p.commit });
      const rX = await refresh(s.refreshToken, { renewalCommit: p.commit });
      assert.equal(rC.status, 200);
      assert.equal(rX.status, 401);
      assert.equal(tok(rX), undefined);
      assert.equal(await revoked(s.sessionId), true);
    });

    it("[SV9] o terceiro atrás do app, numa troca sem vínculo (janelas de 1 s): leva o R1; 2,5 s depois da troca do app, o R1 derruba a família", async () => {
      const short = await buildService({ replayWindowSeconds: 1, raceWindowSeconds: 1 });
      const s = await newSession(short);
      const T0 = realNow();
      try {
        fake = T0;
        const app1 = await short.refreshSession(s.refreshToken);
        fake = T0 + 500;
        const thief = await short.refreshSession(s.refreshToken);
        assert.equal(thief.ok && app1.ok && thief.refreshToken === app1.refreshToken, true, "o terceiro recebe o mesmo R1 dentro da janela");
        fake = T0 + 600;
        const app2 = await short.refreshSession((app1 as { refreshToken: string }).refreshToken);
        assert.equal(app2.ok, true, "o app troca o R1 pelo R2");
        fake = T0 + 600 + 2500;
        const late = await short.refreshSession((thief as { refreshToken: string }).refreshToken);
        assert.equal(late.ok, false);
        assert.equal(await revoked(s.sessionId), true);
        assert.equal((await short.refreshSession((app2 as { refreshToken: string }).refreshToken)).ok, false, "o R2 do app dá 401");
      } finally {
        fake = null;
      }
    });

    it("[SV13] a resposta se perde e o R0 sem prova chega antes do reenvio: 401, a família cai; o reenvio com prova, depois, 401", async () => {
      const s = await newSession();
      const p = par();
      const lost = await refresh(s.refreshToken, { renewalCommit: p.commit });
      assert.equal(lost.status, 200);
      const thief = await refresh(s.refreshToken);
      assert.equal(thief.status, 401);
      assert.equal(tok(thief), undefined);
      assert.equal(await revoked(s.sessionId), true);
      const retry = await refresh(s.refreshToken, { renewalProof: p.proof });
      assert.equal(retry.status, 401);
      assert.equal(tok(retry), undefined);
    });

    it("[SV15] o R-3w na letra (corrida de 1 s, janela de 2 s): o terceiro sem vínculo leva o R1 e gira; o aparelho volta e a família cai; a 1,3 s cai na hora", async () => {
      const svc = await buildService({ replayWindowSeconds: 2, raceWindowSeconds: 1 });
      const T0 = realNow();
      try {
        const s = await newSession(svc);
        fake = T0;
        const device = await svc.refreshSession(s.refreshToken);
        fake = T0 + 500;
        const thief = await svc.refreshSession(s.refreshToken);
        assert.equal(thief.ok && device.ok && thief.refreshToken === device.refreshToken, true, "o R0 a 0,5 s recebe o R1");
        const thiefNext = await svc.refreshSession((thief as { refreshToken: string }).refreshToken);
        assert.equal(thiefNext.ok, true, "o terceiro gira e segue");
        assert.equal(await revoked(s.sessionId), false);
        fake = T0 + 500 + 1100; // o aparelho volta depois da corrida contada da troca do terceiro
        const back = await svc.refreshSession((device as { refreshToken: string }).refreshToken);
        assert.equal(back.ok, false, "o R1 do aparelho, quando volta, dá 401");
        assert.equal(await revoked(s.sessionId), true, "e derruba a família");
        assert.equal((await svc.refreshSession((thiefNext as { refreshToken: string }).refreshToken)).ok, false);

        const s2 = await newSession(svc);
        fake = T0;
        assert.equal((await svc.refreshSession(s2.refreshToken)).ok, true);
        fake = T0 + 1300;
        const late = await svc.refreshSession(s2.refreshToken);
        assert.equal(late.ok, false);
        assert.equal(await revoked(s2.sessionId), true, "a 1,3 s, fora da corrida, a família cai na hora");
      } finally {
        fake = null;
      }
    });

    // O perdedor determinístico: `winner` roda dentro da troca de `loser`, antes dela; `loser` perde e relê.
    const loseTheRotation = async (
      token: string,
      winner: Record<string, string>,
      loser: Record<string, string>,
    ): Promise<{ win: Http; lose: Http }> => {
      const { AuthSessionRepository } = await import("../src/modules/auth/repositories/auth-session.repository.js");
      const proto = AuthSessionRepository.prototype as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>;
      const original = proto.rotateRefreshToken;
      let armed = true;
      let win: Http | undefined;
      proto.rotateRefreshToken = async function (this: unknown, ...args: unknown[]) {
        if (armed) {
          armed = false;
          win = await direct(token, winner);
        }
        return original.apply(this, args);
      };
      try {
        await warmPool();
        const lose = await direct(token, loser);
        assert.equal(armed, false, "o embrulho agiu");
        return { win: win as Http, lose };
      } finally {
        proto.rotateRefreshToken = original;
      }
    };

    it("[SV21b] os perdedores legítimos (P perde para C; C para P; P para P; aba para aba): 200, o mesmo R1, sessão viva", async () => {
      const cases: [string, (p: { commit: string; proof: string }) => [Record<string, string>, Record<string, string>]][] = [
        ["P perde para C", (p) => [{ commit: p.commit }, { proof: p.proof }]],
        ["C perde para P", (p) => [{ proof: p.proof }, { commit: p.commit }]],
        ["P perde para P", (p) => [{ proof: p.proof }, { proof: p.proof }]],
        ["aba perde para aba", () => [{}, {}]],
      ];
      for (const [name, make] of cases) {
        const s = await newSession();
        const [winner, loser] = make(par());
        const { win, lose } = await loseTheRotation(s.refreshToken, winner, loser);
        assert.equal(win.status, 200, name);
        assert.equal(lose.status, 200, name);
        assert.equal(tok(lose), tok(win), name);
        assert.equal(await revoked(s.sessionId), false, name);
      }
    });

    it("[SV21a] C troca e a cópia X perde a troca: 401, sem token, e a família cai (S34M)", async () => {
      const s = await newSession();
      const p = par();
      const { win, lose } = await loseTheRotation(s.refreshToken, { commit: p.commit }, { commit: p.commit });
      assert.equal(win.status, 200);
      assert.equal(lose.status, 401);
      assert.equal(tok(lose), undefined);
      assert.equal(await revoked(s.sessionId), true, "o perdedor que relê e não casa candidato cai no S3");
      assert.deepEqual(await reuseAudit(s.sessionId), { reuse: 1, revokedRows: 1 });
    });

    // A borda exata (v3.3 §4.2): troca em T0; reenvio em T0 + W·1000 + d, d ∈ {−1, 0, +1} ms. T0 cai no meio de um
    // segundo, para que o arredondamento antigo em segundos (MP5x) aceite o +1 ms e morra aqui.
    const borda = async (
      W: number,
      first: (p: { commit: string; proof: string }) => Record<string, string>,
      second: (p: { commit: string; proof: string }) => Record<string, string>,
    ) => {
      const out: { d: number; ok: boolean; same: boolean; revoked: boolean }[] = [];
      for (const d of [-1, 0, 1]) {
        const s = await newSession();
        const p = par();
        const T0 = Math.floor(realNow() / 1000) * 1000 + 500;
        try {
          fake = T0;
          const r1 = await literal.refreshSession(s.refreshToken, first(p));
          fake = T0 + W * 1000 + d;
          const re = await literal.refreshSession(s.refreshToken, second(p));
          out.push({ d, ok: re.ok, same: r1.ok && re.ok && re.refreshToken === r1.refreshToken, revoked: await revoked(s.sessionId) });
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
          out.map((o) => [o.d, o.ok, o.same, o.revoked]),
          [[-1, true, true, false], [0, true, true, false], [1, false, false, true]],
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
          out.map((o) => [o.d, o.ok, o.same, o.revoked]),
          [[-1, true, true, false], [0, true, true, false], [1, false, false, true]],
          mode,
        );
      }
    });

    // Por último: varre a auditoria de TODAS as organizações do arquivo, depois de todos os casos.
    it("[SV10] nenhuma linha de auditoria tem token, jti, compromisso, prova ou o prefixo do domínio", async () => {
      const rows = await admin.auditLog.findMany({ where: { tenant_id: { in: [...tenantIds] } } });
      assert.ok(rows.length > 50, "a auditoria do arquivo tem linhas para varrer");
      assert.ok(usedBindings.length > 20, "os casos sortearam pares");
      for (const row of rows) {
        const text = JSON.stringify(row.metadata ?? {});
        for (const needle of ["eyJ", "refresh_token", "jti", "commit:", "proof:", ...usedBindings]) {
          assert.equal(text.includes(needle), false, `${row.action} contém ${needle.slice(0, 12)}`);
        }
      }
    });
  });
}
