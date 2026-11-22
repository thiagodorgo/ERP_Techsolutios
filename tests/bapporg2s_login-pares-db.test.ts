import assert from "node:assert/strict";
import test, { after } from "node:test";

import {
  call,
  credenciais,
  desmontarArnes,
  login,
  montarArnes,
  novaFamilia,
  trocarSenha,
  type Arnes,
} from "./bapporg2s_familia-helper.js";

// -----------------------------------------------------------------------------------------------
// B-APP-ORG-2S, fatia S2p — GL1 a GL5 da Emenda 1.8.3.2 §1: as escritas do LOGIN valem em todos os pares da
// identidade. Desde a Emenda 1.8.3.17 §2.2 (C2-04) elas rodam na MESMA transação do login (`acrossPairsInTx` de
// `src/modules/auth/auth-runtime.ts`, par a par, uma conexão só), sob o papel do app NOSUPERUSER NOBYPASSRLS. Pelas
// rotas do app real. Mutações (Emenda 1.8.3.17 §4; literais no diário dev-18317-cl):
//   MGL1b · a volta de `registerFailureAcrossPairs`: `acrossPairsInTx(tx, tenantId, pairs,` → `pairs.slice(0, 1)` (GL1)
//   MGL2b · a mesma troca na volta de `clearAcrossPairs` (GL2)
//   GL3   · mutação histórica da troca compartilhada (espelho removido na Revisão 1 da 1.8.3.13)
//   GL4   · sem mutação desde a 1.8.3.17 (os espelhos com transação própria deixaram de existir); o teste fica
//   MGL5b · `registerFailure(pair.credentialId,` → `registerFailure(undefined as unknown as string,` (GL5)
//   M17-6 · apagar a reposição do GUC no `finally` de `acrossPairsInTx` (GL1)
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("B-APP-ORG-2S S2p · GL (app real) exige DATABASE_URL e um PostgreSQL migrado", {
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

  test("GL1 — 3 erros em X e 2 em Y bloqueiam o login nos dois pátios por 15 min", async () => {
    const h = await harness();
    const f = await novaFamilia(h, "gl1", { pairs: 2 });
    const [x, y] = f.orgs;

    for (let i = 0; i < 3; i += 1) assert.equal((await login(h, x.tenantId, f.email, "errada")).status, 401);
    for (let i = 0; i < 2; i += 1) assert.equal((await login(h, y.tenantId, f.email, "errada")).status, 401);

    const now = Date.now();

    for (const row of await credenciais(h, f)) {
      assert.equal(row.failed_attempts, 5, "GL1: cada par conta as 5 tentativas da senha");
      assert.ok(row.locked_until, "GL1: cada par está bloqueado");
      const minutes = (row.locked_until.getTime() - now) / 60_000;
      assert.ok(minutes > 14 && minutes <= 15.05, `GL1: o bloqueio é de 15 min (medido ${minutes.toFixed(2)})`);
    }

    assert.notEqual((await login(h, x.tenantId, f.email, f.password)).status, 200, "GL1: X recusa a senha certa");
    assert.notEqual((await login(h, y.tenantId, f.email, f.password)).status, 200, "GL1: Y recusa a senha certa");
  });

  test("GL2 — o acerto em X zera o contador em X e em Y", async () => {
    const h = await harness();
    const f = await novaFamilia(h, "gl2", { pairs: 2 });
    const [x, y] = f.orgs;

    assert.equal((await login(h, x.tenantId, f.email, "errada")).status, 401);
    assert.equal((await login(h, y.tenantId, f.email, "errada")).status, 401);
    assert.deepEqual((await credenciais(h, f)).map((row) => row.failed_attempts), [2, 2], "fixture: 2 erros em cada par");

    assert.equal((await login(h, x.tenantId, f.email, f.password)).status, 200);

    for (const row of await credenciais(h, f)) {
      assert.equal(row.failed_attempts, 0, "GL2: o acerto zera todos os pares");
      assert.equal(row.locked_until, null);
    }
  });

  test("GL3 — a troca de senha em X vale no login por Y (P3)", async () => {
    const h = await harness();
    const f = await novaFamilia(h, "gl3", { pairs: 2 });
    const [x, y] = f.orgs;
    const session = await login(h, x.tenantId, f.email, f.password);

    assert.equal(session.status, 200);
    assert.equal((await trocarSenha(h, session.body.data.access_token, f.password, "SenhaNovaGL3!987")).status, 200);

    assert.equal((await login(h, y.tenantId, f.email, "SenhaNovaGL3!987")).status, 200, "GL3: a senha nova entra em Y");
    assert.equal((await login(h, x.tenantId, f.email, "SenhaNovaGL3!987")).status, 200, "GL3: a senha nova entra em X");
    assert.equal((await login(h, y.tenantId, f.email, f.password)).status, 401, "GL3: a senha antiga não entra em Y");
  });

  test("GL4 — falha de escrita na volta de Y desfaz a de X (transação única)", async () => {
    const h = await harness();
    const f = await novaFamilia(h, "gl4", { pairs: 2 });
    const [x, y] = f.orgs;

    // Falha injetada SEM DDL: o contador de Y no teto do inteiro, e o `+ 1` da volta de Y estoura.
    await h.admin.localAuthCredential.updateMany({ where: { tenant_id: y.tenantId, user_id: y.userId }, data: { failed_attempts: 2147483647 } });

    const failed = await login(h, x.tenantId, f.email, "errada");

    assert.ok(failed.status >= 500, `GL4: a escrita falhou (status ${failed.status})`);

    const [rowX, rowY] = await credenciais(h, f);

    assert.equal(rowX.failed_attempts, 0, "GL4: a volta de X voltou junto com a de Y");
    assert.equal(rowY.failed_attempts, 2147483647);

    // Controle: sem a falha, a mesma tentativa grava nos dois pares.
    await h.admin.localAuthCredential.updateMany({ where: { tenant_id: y.tenantId, user_id: y.userId }, data: { failed_attempts: 0 } });
    assert.equal((await login(h, x.tenantId, f.email, "errada")).status, 401);
    assert.deepEqual((await credenciais(h, f)).map((row) => row.failed_attempts), [1, 1], "GL4 controle: a volta grava nos dois");
  });

  test("GL-ID1 — sem organização, pelo runtime real: 2 pares da mesma identidade colapsam em 1 e a conta soma nos 2 (GP5b-sem-org)", async () => {
    const h = await harness();
    const f = await novaFamilia(h, "glid1", { pairs: 2 });

    for (let i = 0; i < 2; i += 1) assert.equal((await login(h, null, f.email, "errada")).status, 401);

    assert.deepEqual((await credenciais(h, f)).map((row) => row.failed_attempts), [2, 2], "GL-ID1: a conta da senha soma nos 2 pares (S2p)");

    const entered = await login(h, null, f.email, f.password);

    assert.equal(entered.status, 200, `GL-ID1: os 2 candidatos colapsam em 1, sem escolha (S2a): ${entered.status} ${JSON.stringify(entered.body).slice(0, 160)}`);
    assert.deepEqual((await credenciais(h, f)).map((row) => row.failed_attempts), [0, 0], "GP5b-sem-org: o acerto sem organização zera os 2 pares");
  });

  test("GL5 — sob o papel sem bypass, a volta de cada par grava só a linha daquele par", async () => {
    const h = await harness();
    const a = await novaFamilia(h, "gl5", { pairs: 2 });
    const [x] = a.orgs;
    const { LocalAuthCredentialRepository, LocalAuthCredentialService } = await import("../src/modules/auth/index.js");
    const otherEmail = `s2p-gl5-outra-${Date.now()}@example.com`;
    const other = await h.admin.user.create({ data: { tenant_id: x.tenantId, name: "Outra identidade", email: otherEmail, status: "active" } });

    await new LocalAuthCredentialService(new LocalAuthCredentialRepository(h.admin), {
      findByIdForTenant: (userId: string, tenantId: string) =>
        h.admin.user.findFirst({ where: { id: userId, tenant_id: tenantId }, select: { id: true, tenant_id: true, email: true } }),
    }).createCredentialForUser({ tenant_id: x.tenantId, user_id: other.id, email: otherEmail, password: "SenhaOutra!123" });

    assert.equal((await login(h, x.tenantId, a.email, "errada")).status, 401);

    assert.deepEqual((await credenciais(h, a)).map((row) => row.failed_attempts), [1, 1], "GL5: cada par da identidade soma 1");

    const otherRow = await h.admin.localAuthCredential.findFirst({ where: { tenant_id: x.tenantId, user_id: other.id } });

    assert.equal(otherRow?.failed_attempts, 0, "GL5: o par de outra identidade no mesmo pátio não muda");
    assert.equal((await call(h, "/api/v1/auth/login", { method: "POST", body: { tenantId: x.tenantId, email: otherEmail, password: "SenhaOutra!123" } })).status, 200);
  });
}
