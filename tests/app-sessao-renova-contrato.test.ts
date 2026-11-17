// B-APP-SESSAO-RENOVA (item 68 do portão) — o contrato da renovação e do "Sair", SEM banco.
//
// [C2]  as chaves de `data` do `POST /auth/refresh` são as do fixture do app
//       (`mobile/flutter_app/test/fixtures/auth_refresh_resposta.json`), que o `DioAuthRepository.refresh` lê no
//       [C1] do app. O fixture prende o corpo dos dois lados: o app não pode exigir chave que o servidor não manda.
// [C2b] o "Sair" diz a verdade (S1): sem token, 400; falha interna, 503; sucesso, 200 `{revoked:true}`.
// [C3]  as duas janelas do reenvio (60 s com prova, 10 s sem prova).
// [C5]  o vetor fixo da prova de posse, o mesmo do [T11i] do app.
//
// O serviço de sessão é um DUBLÊ injetado por `createAuthRouter({ getSessionService })`; o roteador é o real.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? "silent";

const fixture = JSON.parse(
  readFileSync(new URL("../mobile/flutter_app/test/fixtures/auth_refresh_resposta.json", import.meta.url), "utf8"),
) as { data: Record<string, unknown> };

type SessionDouble = {
  refreshSession(refreshToken: string, binding?: unknown): Promise<unknown>;
  logout(refreshToken: string): Promise<void>;
};

async function startRouter(double: SessionDouble): Promise<{ baseUrl: string; server: Server }> {
  const [{ default: express }, { createAuthRouter }] = await Promise.all([
    import("express"),
    import("../src/modules/auth/routes/auth.routes.js"),
  ]);
  const app = express();
  app.use(express.json());
  app.use(
    "/api/v1/auth",
    createAuthRouter({ getSessionService: async () => double as never }),
  );
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  return { baseUrl: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, server };
}

async function post(baseUrl: string, path: string, body?: unknown) {
  const response = await fetch(`${baseUrl}${path}`, {
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
}

const close = (server: Server) => new Promise<void>((resolve) => server.close(() => resolve()));

test("[C2] o corpo da renovação tem as chaves do fixture do app; token inválido 401; sem token 400", async () => {
  const { baseUrl, server } = await startRouter({
    async refreshSession(refreshToken: string) {
      if (refreshToken !== "renovacao-valida") return { ok: false, reason: "invalid" };
      return {
        ok: true,
        accessToken: "acesso-contrato",
        accessTokenExpiresIn: 900,
        refreshToken: "renovacao-contrato",
        refreshTokenExpiresAt: new Date("2026-11-21T00:00:00.000Z"),
        refreshTokenExpiresIn: 604800,
        sessionId: "s-contrato",
      };
    },
    async logout() {},
  });

  try {
    const ok = await post(baseUrl, "/api/v1/auth/refresh", { refreshToken: "renovacao-valida" });
    assert.equal(ok.status, 200);
    assert.deepEqual(Object.keys(ok.body.data).sort(), Object.keys(fixture.data).sort());
    assert.deepEqual(ok.body.data, fixture.data);

    const invalid = await post(baseUrl, "/api/v1/auth/refresh", { refreshToken: "outro" });
    assert.equal(invalid.status, 401);

    const missing = await post(baseUrl, "/api/v1/auth/refresh", {});
    assert.equal(missing.status, 400);
  } finally {
    await close(server);
  }
});

test("[C2b] o \"Sair\" diz a verdade: falha interna 503, sem token 400, sucesso 200", async () => {
  let fail = false;
  const seen: string[] = [];
  const { baseUrl, server } = await startRouter({
    async refreshSession() {
      return { ok: false, reason: "invalid" };
    },
    async logout(refreshToken: string) {
      seen.push(refreshToken);
      if (fail) throw new Error("falha interna simulada");
    },
  });

  try {
    fail = true;
    const broken = await post(baseUrl, "/api/v1/auth/logout", { refreshToken: "R-qualquer" });
    assert.equal(broken.status, 503);
    assert.equal(broken.body.error.reason, "logout_failed");
    assert.equal(broken.body.data, undefined, "a falha interna não diz revoked:true");

    const missing = await post(baseUrl, "/api/v1/auth/logout", {});
    assert.equal(missing.status, 400);
    assert.equal(missing.body.error.reason, "refresh_token_required");

    const noBody = await post(baseUrl, "/api/v1/auth/logout");
    assert.equal(noBody.status, 400);

    fail = false;
    const ok = await post(baseUrl, "/api/v1/auth/logout", { refreshToken: "R-qualquer" });
    assert.equal(ok.status, 200);
    assert.deepEqual(ok.body, { data: { revoked: true } });
    assert.deepEqual(seen, ["R-qualquer", "R-qualquer"], "sem token, o serviço nem é chamado");
  } finally {
    await close(server);
  }
});

test("[C3] as janelas do reenvio: 60 s com prova, 10 s sem prova", async () => {
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "dev-only-refresh-change-me";
  const service = await import("../src/modules/auth/services/auth-session.service.js");
  assert.equal(service.REFRESH_REPLAY_WINDOW_SECONDS, 60);
  assert.equal(service.REFRESH_RACE_WINDOW_SECONDS, 10);
});

test("[C5] o vetor fixo da prova de posse (o mesmo do [T11i] do app)", async () => {
  const service = await import("../src/modules/auth/services/auth-session.service.js");
  assert.equal(
    service.proofCommit("AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8"),
    "Yw3NKWbEM2aRElRIu7JbT_QSpJxzLbLIq8G4WBvXEN0",
  );
});
