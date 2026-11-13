import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test, { mock } from "node:test";

import { SignJWT } from "jose";

// -----------------------------------------------------------------------------------------------
// B-USERS-SEG-DESATIVADO — o portão em MEMÓRIA, dentro do `npm test`. A conferência da sessão é trocada por
// dublê (`mock.method(sessionLiveness, "check")`); o resto é o app real (`createApp` em memória).
//
//   T13  conferência que falha (rejeição ou erro síncrono) → 503 `session_check_unavailable`, NUNCA 401 (401
//        desloga os clientes), e nenhuma rejeição ou exceção solta no processo                      · M8
//   T14  memo: UMA conferência por requisição, mesmo atravessando todas as montagens do portão      · M6
//   T15  `sid` fora do formato UUID torna o token inválido (401 INVALID_TOKEN, sem reason)
//   T15b em memória a conferência responde "skipped" ANTES de olhar o formato dos ids               · M16
// -----------------------------------------------------------------------------------------------

process.env.LOG_LEVEL = "silent";
process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.JWT_SECRET = "dev-only-change-me";
delete process.env.DATABASE_URL;
delete process.env.REDIS_URL;

type Montagem = {
  readonly base: string;
  readonly server: Server;
  readonly token: string;
  readonly userId: string;
  readonly tenantId: string;
};

async function montar(): Promise<Montagem> {
  const [{ createApp }, { signAccessToken }, { CoreSaasRegistry }, { MemoryCoreSaasAdapter }, { InMemoryCoreSaasStore }] =
    await Promise.all([
      import("../src/app.js"),
      import("../src/modules/auth/index.js"),
      import("../src/modules/core-saas/services/core-saas.service.js"),
      import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
      import("../src/modules/core-saas/store/core-saas.store.js"),
    ]);
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenant = core.createTenant({ name: "Portão memória", modules: ["work_orders", "field_operations"] });
  const user = core.createUser({ tenantId: tenant.id, name: "Gestor", email: "gestor-portao@example.com", roles: ["manager"] });
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server: Server = app.listen(0, "127.0.0.1");

  await new Promise<void>((resolve) => server.once("listening", () => resolve()));

  const token = await signAccessToken({
    user_id: user.id,
    tenant_id: tenant.id,
    email: "gestor-portao@example.com",
    roles: ["tenant_admin", "manager"],
  });

  return {
    base: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    server,
    token,
    userId: user.id,
    tenantId: tenant.id,
  };
}

async function fechar(m: Montagem): Promise<void> {
  await new Promise<void>((resolve, reject) => m.server.close((error) => (error ? reject(error) : resolve())));
}

async function pedir(base: string, path: string, token: string) {
  const response = await fetch(base + path, {
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(4000),
  });
  const text = await response.text();
  let body: { error?: { code?: string; reason?: string } } = {};

  try {
    body = JSON.parse(text) as typeof body;
  } catch {
    body = {};
  }

  return { status: response.status, body };
}

async function tokenCru(claims: Record<string, unknown>, sub: string): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime("15m")
    .setIssuer("erp-techsolutions")
    .setAudience("erp-techsolutions-api")
    .sign(new TextEncoder().encode("dev-only-change-me"));
}

test("T13 — conferência que falha → 503 session_check_unavailable, nunca 401, e nada solto no processo", async () => {
  const { sessionLiveness } = await import("../src/modules/auth/services/session-liveness.service.js");
  const m = await montar();
  const rejeicoes: unknown[] = [];
  const excecoes: unknown[] = [];
  const onRejection = (reason: unknown) => rejeicoes.push(reason);
  const onException = (error: unknown) => excecoes.push(error);

  process.on("unhandledRejection", onRejection);
  process.on("uncaughtException", onException);

  try {
    mock.method(sessionLiveness, "check", async () => {
      throw new Error("banco fora (dublê)");
    });

    const assincrona = await pedir(m.base, "/api/v1/users", m.token);

    assert.equal(assincrona.status, 503, `rejeição: ${JSON.stringify(assincrona.body)}`);
    assert.equal(assincrona.body.error?.code, "SERVICE_UNAVAILABLE");
    assert.equal(assincrona.body.error?.reason, "session_check_unavailable");

    mock.restoreAll();
    mock.method(sessionLiveness, "check", () => {
      throw new Error("erro síncrono (dublê)");
    });

    const sincrona = await pedir(m.base, "/api/v1/users", m.token);

    assert.equal(sincrona.status, 503, `erro síncrono: ${JSON.stringify(sincrona.body)}`);
    assert.equal(sincrona.body.error?.reason, "session_check_unavailable");

    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(rejeicoes, [], "nenhuma rejeição sem tratamento");
    assert.deepEqual(excecoes, [], "nenhuma exceção sem tratamento");
  } finally {
    mock.restoreAll();
    process.off("unhandledRejection", onRejection);
    process.off("uncaughtException", onException);
    await fechar(m);
  }
});

test("T14 — memo: UMA conferência por requisição, mesmo atravessando todas as montagens do portão", async () => {
  const { sessionLiveness } = await import("../src/modules/auth/services/session-liveness.service.js");
  const m = await montar();

  try {
    const check = mock.method(sessionLiveness, "check", async () => "alive" as const);
    const usuarios = await pedir(m.base, "/api/v1/users", m.token);

    assert.notEqual(usuarios.status, 401, "a conferência viva deixa passar");
    assert.equal(check.mock.callCount(), 1, "GET /api/v1/users (a última das montagens) confere uma vez só");

    const argumento = check.mock.calls[0]?.arguments[0] as { userId?: string; tenantId?: string } | undefined;

    assert.equal(argumento?.userId, m.userId, "a conferência recebe o usuário do token");
    assert.equal(argumento?.tenantId, m.tenantId, "a conferência recebe a organização do token");

    check.mock.resetCalls();
    await pedir(m.base, "/api/v1/work-orders", m.token);
    assert.equal(check.mock.callCount(), 1, "GET /api/v1/work-orders confere uma vez só");
  } finally {
    mock.restoreAll();
    await fechar(m);
  }
});

test("T15 — sid fora do formato UUID torna o token inválido (401 INVALID_TOKEN, sem reason)", async () => {
  const m = await montar();

  try {
    const claims = { tenant_id: m.tenantId, email: "gestor-portao@example.com", roles: ["manager"], type: "access" };
    const controle = await pedir(m.base, "/api/v1/users", await tokenCru({ ...claims, sid: randomUUID() }, m.userId));

    assert.notEqual(controle.status, 401, "controle: sid em formato UUID é aceito pela verificação");

    for (const sid of [123, "x"]) {
      const resposta = await pedir(m.base, "/api/v1/users", await tokenCru({ ...claims, sid }, m.userId));

      assert.equal(resposta.status, 401, `sid ${JSON.stringify(sid)}: ${JSON.stringify(resposta.body)}`);
      assert.equal(resposta.body.error?.code, "INVALID_TOKEN");
      assert.equal(resposta.body.error?.reason, undefined, "é o token inválido, não a sessão inativa");
    }
  } finally {
    await fechar(m);
  }
});

test("T15b — em memória a conferência responde 'skipped' antes de olhar o formato dos ids", async () => {
  const [{ sessionLiveness }, { env }] = await Promise.all([
    import("../src/modules/auth/services/session-liveness.service.js"),
    import("../src/config/env.js"),
  ]);

  assert.equal(env.CORE_SAAS_PERSISTENCE, "memory", "a suíte roda em memória");
  assert.equal(await sessionLiveness.check({ userId: "user-1", tenantId: "ten_demo" }), "skipped");
  assert.equal(
    await sessionLiveness.check({ userId: randomUUID(), tenantId: randomUUID(), sessionId: randomUUID() }),
    "skipped",
  );
});
