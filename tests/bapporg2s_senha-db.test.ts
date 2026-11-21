import assert from "node:assert/strict";
import test, { after } from "node:test";

import { decodeJwt } from "jose";

import { administradorDe } from "./helpers/users-seg-desativado-sessao.js";
import {
  bearer,
  call,
  credenciais,
  desmontarArnes,
  login,
  montarArnes,
  novaFamilia,
  redefinir,
  trocarSenha,
  type Arnes,
  type Familia,
} from "./bapporg2s_familia-helper.js";

// -----------------------------------------------------------------------------------------------
// B-APP-ORG-2S, fatia S2p — os critérios do dono para a senha (P2, P3 e P1 (a)), pelas rotas do app real, sob o
// papel NOSUPERUSER NOBYPASSRLS. T é o técnico com o mesmo login em X, Y e Z (mesma identidade, vínculos que não
// são religação, os três no mesmo grupo). O relógio da validade é o `temporaryPasswordClock`; o do grupo, o
// `resetGroupClock`. IDs e mutações: Emenda 1.8.3 §5.1, 1.8.3.1 §3 e §4; o mapa id → linha está no diário
// `dev-s2p-cl`. O que depende da concessão (S2a) não está aqui: GP3, GP3b, GP8-pendente, GR6, GP5b-sem-org.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("B-APP-ORG-2S S2p · senha (app real) exige DATABASE_URL e um PostgreSQL migrado", {
    skip: "Defina DATABASE_URL e rode as migrações para executar esta suíte.",
  });
} else {
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL = "silent";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";
  process.env.JWT_EXPIRES_IN = "15m";

  let harnessPromise: Promise<Arnes> | undefined;
  const harness = (): Promise<Arnes> => (harnessPromise ??= montarArnes(connectionString));

  after(async () => {
    const h = harnessPromise ? await harnessPromise.catch(() => undefined) : undefined;

    if (h) {
      await desmontarArnes(h);
    }
  });

  const HOUR = 60 * 60 * 1000;

  async function rules() {
    return import("../src/modules/auth/temporary-password.rules.js");
  }

  async function comRelogio<T>(offsetMs: number, work: () => Promise<T>): Promise<T> {
    const { temporaryPasswordClock } = await rules();
    const original = temporaryPasswordClock.now;

    temporaryPasswordClock.now = () => new Date(Date.now() + offsetMs);

    try {
      return await work();
    } finally {
      temporaryPasswordClock.now = original;
    }
  }

  async function comDiaDoGrupo<T>(instant: string, work: () => Promise<T>): Promise<T> {
    const { resetGroupClock } = await import("../src/modules/auth/services/identity-link.service.js");
    const original = resetGroupClock.now;

    resetGroupClock.now = () => new Date(instant);

    try {
      return await work();
    } finally {
      resetGroupClock.now = original;
    }
  }

  async function hashes(h: Arnes, f: Familia): Promise<string[]> {
    return (await credenciais(h, f)).map((row) => row.password_hash);
  }

  async function provisoria(h: Arnes, actorTenantId: string, targetUserId: string): Promise<string> {
    const reset = await redefinir(h, actorTenantId, targetUserId);

    assert.equal(reset.status, 200, `fixture: redefinição ${reset.status} ${JSON.stringify(reset.body).slice(0, 200)}`);

    return String(reset.body.data.temporary_password);
  }

  // ---------------------------------------------------------------------------------------------
  // P2 — validade de 24 h (GP1, GP2)
  // ---------------------------------------------------------------------------------------------

  test("GP1 — 24 h: entra com 23h59; com 24h00m01s dá 401 nos três pátios, com e sem organização, sem contar tentativa", async () => {
    const h = await harness();
    const f = await novaFamilia(h, "gp1");
    const [x, y, z] = f.orgs;
    const temp = await provisoria(h, y.tenantId, y.userId);

    await comRelogio(23 * HOUR + 59 * 60_000, async () => {
      const entered = await login(h, x.tenantId, f.email, temp);

      assert.equal(entered.status, 200, "GP1: com 23h59 a provisória entra");
      assert.equal(entered.body.data.must_change_password ?? entered.body.data.mustChangePassword ?? true, true);
    });

    await comRelogio(24 * HOUR + 1_000, async () => {
      for (const org of [x, y, z]) {
        assert.equal((await login(h, org.tenantId, f.email, temp)).status, 401, "GP1: vencida, com organização, 401");
      }

      assert.equal((await login(h, null, f.email, temp)).status, 401, "GP1: vencida, sem organização, 401");
    });

    assert.deepEqual(
      (await credenciais(h, f)).map((row) => row.failed_attempts),
      [0, 0, 0],
      "GP1-contador: a provisória vencida não conta como tentativa errada",
    );

    const expiredAudits = await h.admin.auditLog.findMany({
      where: { tenant_id: { in: [x.tenantId, y.tenantId, z.tenantId] }, action: "auth.login.failed" },
      select: { metadata: true },
    });

    assert.ok(
      expiredAudits.some((row) => JSON.stringify(row.metadata).includes("temporary_password_expired")),
      "GP1: a auditoria interna grava o motivo temporary_password_expired",
    );

    const fresh = await provisoria(h, y.tenantId, y.userId);

    await comRelogio(24 * HOUR + 1_000, async () => {
      assert.equal((await login(h, x.tenantId, f.email, temp)).status, 401);
    });
    assert.equal((await login(h, x.tenantId, f.email, fresh)).status, 200, "GP1: uma nova redefinição devolve o acesso");
  });

  test("GP2 — sessão restrita aberta antes das 24 h: depois delas a troca dá 409 temporary_password_expired e nenhum hash muda", async () => {
    const h = await harness();
    const f = await novaFamilia(h, "gp2");
    const [x] = f.orgs;
    const temp = await provisoria(h, x.tenantId, x.userId);
    const session = await login(h, x.tenantId, f.email, temp);

    assert.equal(session.status, 200);

    const before = await hashes(h, f);
    const change = await comRelogio(24 * HOUR + 1_000, () =>
      trocarSenha(h, session.body.data.access_token, temp, "SenhaNovaGP2!987"),
    );

    assert.equal(change.status, 409, `GP2: ${JSON.stringify(change.body).slice(0, 200)}`);
    assert.equal(change.body.error?.reason, "temporary_password_expired");
    assert.deepEqual(await hashes(h, f), before, "GP2: nada muda");
  });

  // ---------------------------------------------------------------------------------------------
  // P2 — só serve para trocar (GP4)
  // ---------------------------------------------------------------------------------------------

  test("GP4 — só para trocar: em Y, a sessão da provisória não tem permissão, 5 rotas de dado dão 403 e só a troca dá 200", async () => {
    const h = await harness();
    const f = await novaFamilia(h, "gp4");
    const [x, y] = f.orgs;
    const temp = await provisoria(h, x.tenantId, x.userId);
    const session = await login(h, y.tenantId, f.email, temp);

    assert.equal(session.status, 200);

    const token = String(session.body.data.access_token);
    const claims = decodeJwt(token) as { permissions?: unknown; roles?: unknown; tenant_roles?: unknown; scope?: unknown };

    assert.deepEqual(claims.permissions ?? [], [], "GP4: permissões vazias");
    assert.deepEqual(claims.roles ?? [], [], "GP4: papéis vazios");
    assert.equal(claims.scope, "password_change");

    const dataRoutes: Array<{ path: string; method: string; body?: unknown }> = [
      { path: "/api/v1/work-orders", method: "GET" },
      { path: "/api/v1/commissions/calculations/mine", method: "GET" },
      { path: "/api/v1/users", method: "GET" },
      { path: "/api/v1/mobile/sync/expense-actions", method: "POST", body: { actions: [] } },
      { path: "/api/v1/mobile/sync/work-order-actions", method: "POST", body: { actions: [] } },
    ];

    for (const route of dataRoutes) {
      const response = await call(h, route.path, { method: route.method, headers: bearer(token), body: route.body });

      assert.equal(response.status, 403, `GP4: ${route.method} ${route.path}`);
      assert.equal(response.body.error?.reason, "password_change_required", `GP4: ${route.path}`);
    }

    assert.equal((await trocarSenha(h, token, temp, "SenhaNovaGP4!987")).status, 200, "GP4: só a troca dá 200");
  });

  // ---------------------------------------------------------------------------------------------
  // P2 — 5 tentativas (GP5, GP5b, GP5c)
  // ---------------------------------------------------------------------------------------------

  test("GP5 — 5 erros alternando as portas bloqueiam os três pares juntos; a provisória certa não entra no bloqueio", async () => {
    const h = await harness();
    const f = await novaFamilia(h, "gp5");
    const [x, y, z] = f.orgs;
    const temp = await provisoria(h, x.tenantId, x.userId);

    for (const tenantId of [x.tenantId, y.tenantId, z.tenantId, null, null]) {
      assert.equal((await login(h, tenantId, f.email, "errada")).status, 401);
    }

    for (const row of await credenciais(h, f)) {
      assert.equal(row.failed_attempts, 5, "GP5: failed_attempts = 5 em cada par");
      assert.ok(row.locked_until && row.locked_until.getTime() > Date.now(), "GP5: cada par bloqueado");
    }

    for (const org of [x, y, z]) {
      assert.notEqual((await login(h, org.tenantId, f.email, temp)).status, 200, "GP5: a provisória certa não entra");
    }

    assert.notEqual((await login(h, null, f.email, temp)).status, 200);
  });

  test("GP5b — 4 erros, 1 acerto, 4 erros: nenhum par bloqueia (o acerto zera todos)", async () => {
    const h = await harness();
    const f = await novaFamilia(h, "gp5b");
    const [x, y, z] = f.orgs;

    for (const tenantId of [x.tenantId, y.tenantId, null, z.tenantId]) {
      assert.equal((await login(h, tenantId, f.email, "errada")).status, 401);
    }

    assert.deepEqual((await credenciais(h, f)).map((row) => row.failed_attempts), [4, 4, 4]);
    assert.equal((await login(h, y.tenantId, f.email, f.password)).status, 200);
    assert.deepEqual((await credenciais(h, f)).map((row) => row.failed_attempts), [0, 0, 0], "GP5b: o acerto zera os três");

    for (const tenantId of [z.tenantId, null, x.tenantId, y.tenantId]) {
      assert.equal((await login(h, tenantId, f.email, "errada")).status, 401);
    }

    for (const row of await credenciais(h, f)) {
      assert.equal(row.failed_attempts, 4);
      assert.equal(row.locked_until, null, "GP5b: nenhum par bloqueia");
    }
  });

  test("GP5c — a troca de senha também é porta das 5 tentativas", async () => {
    const h = await harness();

    // (a) 5 trocas erradas em Y bloqueiam X, Y e Z.
    const f = await novaFamilia(h, "gp5c-a");
    const [x, y] = f.orgs;
    const session = await login(h, y.tenantId, f.email, f.password);

    assert.equal(session.status, 200);

    for (let i = 0; i < 5; i += 1) {
      assert.equal((await trocarSenha(h, session.body.data.access_token, "errada", "SenhaNovaGP5c!987")).status, 401);
    }

    for (const row of await credenciais(h, f)) {
      assert.equal(row.failed_attempts, 5, "GP5c (a): failed_attempts = 5 em cada par");
      assert.ok(row.locked_until, "GP5c (a): locked_until preenchido em cada par");
    }

    assert.notEqual((await login(h, x.tenantId, f.email, f.password)).status, 200, "GP5c (a): X recusa pelo bloqueio");

    const locked = await trocarSenha(h, session.body.data.access_token, f.password, "SenhaNovaGP5c!987");

    assert.equal(locked.status, 423);
    assert.equal(locked.body.error?.reason, "account_locked");

    // (b) num banco limpo: 2 trocas erradas em Y, 2 Entrar errados em X com organização e 1 sem organização.
    const g = await novaFamilia(h, "gp5c-b");
    const [gx, gy] = g.orgs;
    const gSession = await login(h, gy.tenantId, g.email, g.password);

    for (let i = 0; i < 2; i += 1) {
      assert.equal((await trocarSenha(h, gSession.body.data.access_token, "errada", "SenhaNovaGP5c!987")).status, 401);
    }

    for (let i = 0; i < 2; i += 1) assert.equal((await login(h, gx.tenantId, g.email, "errada")).status, 401);
    assert.equal((await login(h, null, g.email, "errada")).status, 401);

    for (const row of await credenciais(h, g)) {
      assert.equal(row.failed_attempts, 5, "GP5c (b): cada par com failed_attempts = 5");
      assert.ok(row.locked_until, "GP5c (b): os três bloqueados");
    }
  });

  // ---------------------------------------------------------------------------------------------
  // P2 — invalida na troca (GP6)
  // ---------------------------------------------------------------------------------------------

  test("GP6 — depois de T trocar a senha em Y, a provisória dá 401 em X, Y e Z, a marca some e as sessões restritas caem", async () => {
    const h = await harness();
    const f = await novaFamilia(h, "gp6");
    const [x, y, z] = f.orgs;
    const temp = await provisoria(h, x.tenantId, x.userId);
    const sessionY = await login(h, y.tenantId, f.email, temp);
    const sessionX = await login(h, x.tenantId, f.email, temp);

    assert.equal(sessionY.status, 200);
    assert.equal(sessionX.status, 200);
    assert.equal((await trocarSenha(h, sessionY.body.data.access_token, temp, "SenhaNovaGP6!987")).status, 200);

    for (const org of [x, y, z]) {
      assert.equal((await login(h, org.tenantId, f.email, temp)).status, 401, "GP6: a provisória não entra mais");
    }

    assert.deepEqual((await credenciais(h, f)).map((row) => row.must_change_password), [false, false, false], "GP6: a marca some nos três");

    const sessions = await h.admin.authSession.findMany({
      where: { id: { in: [String(sessionX.body.data.session_id), String(sessionY.body.data.session_id)] } },
      select: { revoked_at: true },
    });

    assert.equal(sessions.length, 2);
    assert.ok(sessions.every((row) => row.revoked_at !== null), "GP6: as sessões restritas caíram");
    assert.equal((await login(h, z.tenantId, f.email, "SenhaNovaGP6!987")).status, 200, "GP6: a senha nova vale em Z");
  });

  test("GP-ATOM — falha depois de gravar o 1º par e antes do último: nenhum par fica com a senha nova", async () => {
    const h = await harness();
    const f = await novaFamilia(h, "gpatom");
    const [x, ...rest] = f.orgs;
    // A volta grava o próprio par (X) primeiro e os outros em ordem fixa por pátio: o último é o de maior id.
    const last = [...rest].sort((a, b) => (a.tenantId < b.tenantId ? -1 : 1))[rest.length - 1];
    const session = await login(h, x.tenantId, f.email, f.password);

    assert.equal(session.status, 200);

    const before = await hashes(h, f);
    const name = `s2p_gpatom_${Date.now()}`;

    await h.admin.$executeRawUnsafe(`
      CREATE FUNCTION ${name}_fn() RETURNS trigger AS $$
      BEGIN
        IF NEW.tenant_id = '${last.tenantId}'::uuid THEN RAISE EXCEPTION 'GP-ATOM falha injetada'; END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await h.admin.$executeRawUnsafe(
      `CREATE TRIGGER ${name} BEFORE UPDATE ON local_auth_credentials FOR EACH ROW EXECUTE FUNCTION ${name}_fn()`,
    );

    let change: Awaited<ReturnType<typeof trocarSenha>>;

    try {
      change = await trocarSenha(h, session.body.data.access_token, f.password, "SenhaNovaATOM!987");
    } finally {
      await h.admin.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${name} ON local_auth_credentials`);
      await h.admin.$executeRawUnsafe(`DROP FUNCTION IF EXISTS ${name}_fn()`);
    }

    // A falha chega pelo tratador genérico de erro da main (medido: 400 invalid_request); o que se afirma é o resultado.
    assert.notEqual(change.status, 200, `GP-ATOM: a troca não aconteceu (status ${change.status})`);
    assert.deepEqual(await hashes(h, f), before, "GP-ATOM: nenhum par com a senha nova");

    for (const org of f.orgs) {
      assert.equal((await login(h, org.tenantId, f.email, "SenhaNovaATOM!987")).status, 401, "GP-ATOM: a nova não entra");
    }
  });

  // ---------------------------------------------------------------------------------------------
  // P2 — gerada pelo sistema e mostrada uma vez (GP7)
  // ---------------------------------------------------------------------------------------------

  test("GP7 — gerada pelo sistema: corpo com senha dá 400; duas redefinições, valores diferentes de 24; o valor não aparece em lugar nenhum", async () => {
    const h = await harness();
    const f = await novaFamilia(h, "gp7");
    const [x, y, z] = f.orgs;
    const before = await hashes(h, f);
    const withBody = await redefinir(h, x.tenantId, x.userId, { password: "x" });

    assert.equal(withBody.status, 400, "GP7: senha no corpo é recusada");
    assert.deepEqual(await hashes(h, f), before, "GP7: e nada muda");

    const first = await provisoria(h, x.tenantId, x.userId);
    const second = await provisoria(h, x.tenantId, x.userId);

    assert.notEqual(first, second, "GP7: duas redefinições dão valores diferentes");
    assert.equal(first.length, 24);
    assert.equal(second.length, 24);

    const admin = await administradorDe(h, x.tenantId);
    const list = await call(h, "/api/v1/users", { headers: admin.headers });
    const one = await call(h, `/api/v1/users/${x.userId}`, { headers: admin.headers });

    assert.equal(list.status, 200);

    for (const text of [JSON.stringify(list.body), JSON.stringify(one.body)]) {
      assert.ok(!text.includes(first) && !text.includes(second), "GP7: o valor não aparece em GET /users nem /users/:id");
    }

    const audits = await h.admin.auditLog.findMany({ where: { tenant_id: { in: [x.tenantId, y.tenantId, z.tenantId] } } });
    const auditText = JSON.stringify(audits);

    assert.ok(!auditText.includes(first) && !auditText.includes(second), "GP7: o valor não aparece na auditoria");

    const { verifyPassword } = await import("../src/modules/auth/index.js");

    for (const row of await credenciais(h, f)) {
      assert.ok(!row.password_hash.includes(second), "GP7: no banco só o hash");
      assert.equal(await verifyPassword(second, row.password_hash), true, "GP7: o hash é da última provisória");
    }

    const chosenEmail = `s2p-gp7-novo-${Date.now()}@example.com`;
    const created = await call(h, "/api/v1/users", {
      method: "POST",
      headers: admin.headers,
      body: { name: "Criado GP7", email: chosenEmail, roles: [], password: "EscolhidaGP7!123" },
    });

    assert.ok(created.status === 201 || created.status === 400 || created.status === 409, `GP7: criação ${created.status}`);
    assert.notEqual(
      (await login(h, x.tenantId, chosenEmail, "EscolhidaGP7!123")).status,
      200,
      "GP7: a senha mandada pelo cliente na criação não entra",
    );
  });

  // ---------------------------------------------------------------------------------------------
  // P2 — auditoria sem o valor (GP8)
  // ---------------------------------------------------------------------------------------------

  test("GP8 — auditoria: user.password_reset em X; user.password_reset_by_group_patio em Y e Z com o nome de X; nada do valor, do hash nem de outro pátio", async () => {
    const h = await harness();
    const f = await novaFamilia(h, "gp8");
    const [x, y, z] = f.orgs;
    const admin = await administradorDe(h, x.tenantId);
    const reset = await call(h, `/api/v1/auth/users/${x.userId}/reset-password`, { method: "POST", headers: admin.headers, body: {} });

    assert.equal(reset.status, 200);

    const temp = String(reset.body.data.temporary_password);
    const [credX] = await credenciais(h, f);
    const own = await h.admin.auditLog.findMany({ where: { tenant_id: x.tenantId, action: "user.password_reset" } });

    assert.equal(own.length, 1);
    assert.equal(own[0].actor_user_id, admin.userId, "GP8: em X, o ator");
    assert.equal(own[0].entity_id, x.userId, "GP8: em X, o técnico");

    for (const [i, org] of [y, z].entries()) {
      const peer = await h.admin.auditLog.findMany({ where: { tenant_id: org.tenantId, action: "user.password_reset_by_group_patio" } });

      assert.equal(peer.length, 1, `GP8: um registro em ${i === 0 ? "Y" : "Z"}`);
      assert.equal(peer[0].entity_id, org.userId, "GP8: com o técnico daquele pátio");
      assert.equal((peer[0].metadata as Record<string, unknown>).origin_patio_name, f.names[0], "GP8: com o nome de X");
      assert.equal(peer[0].actor_user_id, null, "GP8: sem o ator de fora");
    }

    for (const org of [x, y, z]) {
      const rows = await h.admin.auditLog.findMany({ where: { tenant_id: org.tenantId } });
      const text = JSON.stringify(rows);
      const others = [x, y, z].filter((other) => other.tenantId !== org.tenantId);

      assert.ok(!text.includes(temp), "GP8: a provisória não aparece");
      assert.ok(!text.includes(credX.password_hash), "GP8: o hash não aparece");

      for (const other of others) {
        assert.ok(!text.includes(other.tenantId), "GP8: nenhum identificador de outro pátio");
      }

      if (org.tenantId !== x.tenantId) {
        assert.ok(!text.includes(admin.userId), "GP8: nenhum ator de fora");
      }
    }
  });

  // ---------------------------------------------------------------------------------------------
  // P1 (a) — qualquer pátio em que o técnico está ativo redefine (GR1 a GR5)
  // ---------------------------------------------------------------------------------------------

  test("GR1 — Y redefine T: a mesma provisória entra em X, Y e Z; as sessões de T caem nos três; affected_patios = 3", async () => {
    const h = await harness();
    const f = await novaFamilia(h, "gr1");
    const [x, y, z] = f.orgs;
    const sessionIds: string[] = [];

    for (const org of [x, y, z]) {
      const session = await login(h, org.tenantId, f.email, f.password);

      assert.equal(session.status, 200);
      sessionIds.push(String(session.body.data.session_id));
    }

    const reset = await redefinir(h, y.tenantId, y.userId);

    assert.equal(reset.status, 200);
    assert.equal(reset.body.data.affected_patios, 3, "GR1: affected_patios = 3, um número");

    const revoked = await h.admin.authSession.findMany({ where: { id: { in: sessionIds } }, select: { revoked_at: true } });

    assert.ok(revoked.length === 3 && revoked.every((row) => row.revoked_at !== null), "GR1: todas as sessões de T caem");

    for (const org of [x, y, z]) {
      assert.equal((await login(h, org.tenantId, f.email, String(reset.body.data.temporary_password))).status, 200, "GR1: a provisória entra");
    }

    const rows = await credenciais(h, f);

    assert.equal(new Set(rows.map((row) => row.password_hash)).size, 1, "GR1: um hash só nos três");
    assert.equal(new Set(rows.map((row) => row.password_updated_at.getTime())).size, 1, "GR1: a mesma hora nos três");
  });

  test("GR2 — T desativado em X: X recebe 409 user_inactive; Y redefine e o par de X recebe a provisória", async () => {
    const h = await harness();
    const f = await novaFamilia(h, "gr2");
    const [x, y] = f.orgs;

    await h.admin.user.updateMany({ where: { tenant_id: x.tenantId, id: x.userId }, data: { status: "inactive" } });

    const fromX = await redefinir(h, x.tenantId, x.userId);

    assert.equal(fromX.status, 409);
    assert.equal(fromX.body.error?.reason, "user_inactive");

    const fromY = await redefinir(h, y.tenantId, y.userId);

    assert.equal(fromY.status, 200);

    const [credX, credY] = await credenciais(h, f);

    assert.equal(credX.password_hash, credY.password_hash, "GR2-inativo: o par inativo do grupo também recebe a provisória");

    await h.admin.user.updateMany({ where: { tenant_id: x.tenantId, id: x.userId }, data: { status: "active" } });
    assert.equal((await login(h, x.tenantId, f.email, String(fromY.body.data.temporary_password))).status, 200, "GR2: reativado, entra");
  });

  test("GR3 — identidade com par religacao: 409 identity_linked_elsewhere e nenhum hash muda", async () => {
    const h = await harness();
    const f = await novaFamilia(h, "gr3");
    const [x] = f.orgs;
    const { createOrgWithUser } = await import("./helpers/auth-identity-fixture.js");
    const suffix = `gr3w-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const w = await createOrgWithUser(h.admin, { name: `S2P W ${suffix}`, slug: `s2p-w-${suffix}`, email: f.email, password: f.password });

    h.tenantIds.push(w.tenantId);
    await h.admin.$executeRaw`
      INSERT INTO auth_identity_links (identity_id, tenant_id, user_id, attached_via)
      VALUES (${f.identityId}::uuid, ${w.tenantId}::uuid, ${w.userId}::uuid, 'religacao')
    `;

    const before = [...(await hashes(h, f)), (await h.admin.localAuthCredential.findFirst({ where: { tenant_id: w.tenantId } }))!.password_hash];
    const reset = await redefinir(h, x.tenantId, x.userId);

    assert.equal(reset.status, 409);
    assert.equal(reset.body.error?.reason, "identity_linked_elsewhere");

    const afterHashes = [...(await hashes(h, f)), (await h.admin.localAuthCredential.findFirst({ where: { tenant_id: w.tenantId } }))!.password_hash];

    assert.deepEqual(afterHashes, before, "GR3: nenhum hash muda");

    // O par do próprio alvo é `religacao`: a recusa também vale (a 2ª classe da MR2).
    const g = await novaFamilia(h, "gr3b", { pairs: 2 });
    const [gx, gy] = g.orgs;

    await h.admin.$executeRaw`UPDATE auth_identity_links SET attached_via = 'religacao' WHERE tenant_id = ${gy.tenantId}::uuid AND user_id = ${gy.userId}::uuid`;

    const gBefore = await hashes(h, g);
    const fromY = await redefinir(h, gy.tenantId, gy.userId);

    assert.equal(fromY.status, 409, "GR3: alvo religado em Y");
    assert.equal(fromY.body.error?.reason, "identity_linked_elsewhere");
    assert.equal((await redefinir(h, gx.tenantId, gx.userId)).body.error?.reason, "identity_linked_elsewhere", "GR3: X vê o par religado de Y");
    assert.deepEqual(await hashes(h, g), gBefore);
  });

  test("GR4 — Z fora do grupo desde hoje (dia de São Paulo): T ativo em Z dá 409; T inativo em Z passa e Z não muda", async () => {
    const h = await harness();
    const f = await novaFamilia(h, "gr4", { groupValidTo: [null, null, "2026-11-21"] });
    const [x, , z] = f.orgs;
    const before = await hashes(h, f);

    const active = await comDiaDoGrupo("2026-11-21T03:00:00Z", () => redefinir(h, x.tenantId, x.userId));

    assert.equal(active.status, 409, "GR4: Z fora do grupo, com T ativo");
    assert.equal(active.body.error?.reason, "identity_linked_elsewhere");
    assert.deepEqual(await hashes(h, f), before, "GR4: nada muda");

    // Um segundo antes, ainda é 20/11 em São Paulo: Z está no grupo e recebe.
    const yesterday = await comDiaDoGrupo("2026-11-21T02:59:59Z", () => redefinir(h, x.tenantId, x.userId));

    assert.equal(yesterday.status, 200, "GR4: no dia 20/11 (SP), Z ainda é do grupo");
    assert.equal(yesterday.body.data.affected_patios, 3);

    await h.admin.user.updateMany({ where: { tenant_id: z.tenantId, id: z.userId }, data: { status: "inactive" } });

    const zBefore = (await credenciais(h, f))[2].password_hash;
    const inactive = await comDiaDoGrupo("2026-11-21T03:00:00Z", () => redefinir(h, x.tenantId, x.userId));

    assert.equal(inactive.status, 200, "GR4: T inativo em Z, a redefinição passa");
    assert.equal(inactive.body.data.affected_patios, 2);

    const rows = await credenciais(h, f);

    assert.equal(rows[2].password_hash, zBefore, "GR4: o par de Z não muda");
    assert.equal(rows[0].password_hash, rows[1].password_hash);
  });

  test("GR5 — redefinições simultâneas por X e por Y, 20 rodadas: um hash só nos três, uma provisória entra e a outra não, nenhum 5xx", async () => {
    const h = await harness();
    const f = await novaFamilia(h, "gr5");
    const [x, y] = f.orgs;
    const adminX = await administradorDe(h, x.tenantId);
    const adminY = await administradorDe(h, y.tenantId);
    const { verifyPassword } = await import("../src/modules/auth/index.js");
    let last: { winner: string; loser: string } | undefined;

    for (let round = 0; round < 20; round += 1) {
      const [a, b] = await Promise.all([
        call(h, `/api/v1/auth/users/${x.userId}/reset-password`, { method: "POST", headers: adminX.headers, body: {} }),
        call(h, `/api/v1/auth/users/${y.userId}/reset-password`, { method: "POST", headers: adminY.headers, body: {} }),
      ]);

      assert.equal(a.status, 200, `GR5 rodada ${round}: X ${a.status} ${JSON.stringify(a.body).slice(0, 160)}`);
      assert.equal(b.status, 200, `GR5 rodada ${round}: Y ${b.status} ${JSON.stringify(b.body).slice(0, 160)}`);

      const rows = await credenciais(h, f);

      assert.equal(new Set(rows.map((row) => row.password_hash)).size, 1, `GR5 rodada ${round}: um hash só`);

      const tempA = String(a.body.data.temporary_password);
      const tempB = String(b.body.data.temporary_password);
      const okA = await verifyPassword(tempA, rows[0].password_hash);
      const okB = await verifyPassword(tempB, rows[0].password_hash);

      assert.notEqual(okA, okB, `GR5 rodada ${round}: exatamente uma das duas vale`);
      last = okA ? { winner: tempA, loser: tempB } : { winner: tempB, loser: tempA };
    }

    for (const org of f.orgs) {
      assert.equal((await login(h, org.tenantId, f.email, last!.winner)).status, 200, "GR5: a vencedora entra nos três");
      assert.equal((await login(h, org.tenantId, f.email, last!.loser)).status, 401, "GR5: a outra em nenhum");
    }
  });
}
