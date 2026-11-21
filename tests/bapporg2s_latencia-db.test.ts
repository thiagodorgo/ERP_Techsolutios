import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import test, { after } from "node:test";

import { credenciais, desmontarArnes, montarArnes, novaFamilia, type Arnes } from "./bapporg2s_familia-helper.js";

// -----------------------------------------------------------------------------------------------
// B-APP-ORG-2S, fatia S2p — trava HC1b (Emenda 1.8.3 §6, l.227; entrou na S2p pela 1.8.3.11 §4). Entrar sem
// organização com 3 pares, senha certa e senha errada, 12 medidas de cada, já com a validade e a conta da
// senha: o trabalho ANTES do piso tem máximo < 300 ms (piso de 400 ms). O critério não se relaxa.
//
// Como se mede: o `AnonymousLoginService` montado com as MESMAS dependências da produção (`auth.routes.ts`,
// a montagem do serviço anônimo), ligadas ao runtime real no papel sem bypass; só duas trocas: a listagem de
// candidatos pelo administrador (a migração deixa a função sem EXECUTE para o papel efêmero) e o `sleep` do
// piso, que não espera: o tempo da chamada passa a ser só o trabalho. Uma chamada de aquecimento de cada forma
// fica FORA das 12 e é publicada à parte. Um serviço novo por chamada (o balde por e-mail não é o que se mede)
// e o contador zerado entre as erradas (para o bloqueio não encurtar o caminho medido).
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("B-APP-ORG-2S S2p · HC1b exige DATABASE_URL e um PostgreSQL migrado", {
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

  test("HC1b — Entrar sem organização com 3 pares: o trabalho antes do piso tem máximo < 300 ms", { timeout: 300_000 }, async () => {
    const h = await harness();
    const f = await novaFamilia(h, "hc1b");
    const [{ AnonymousLoginService }, { getLocalAuthLoginService }, { listLoginCandidatesViaFunction }, { ANONYMOUS_LOGIN_MIN_LATENCY_MS }] =
      await Promise.all([
        import("../src/modules/auth/services/anonymous-login.service.js"),
        import("../src/modules/auth/auth-runtime.js"),
        import("../src/modules/auth/repositories/login-candidates.repository.js"),
        import("../src/modules/auth/anonymous-login.constants.js"),
      ]);
    const loginService = await getLocalAuthLoginService();

    assert.equal(ANONYMOUS_LOGIN_MIN_LATENCY_MS, 400, "o piso é de 400 ms");

    async function measure(password: string): Promise<{ readonly ms: number; readonly kind: string; readonly slept: number | null }> {
      let slept: number | null = null;
      const service = new AnonymousLoginService({
        listCandidates: async (email) =>
          (await listLoginCandidatesViaFunction(h.admin, email)).map((row) => ({ tenantId: row.tenant_id, userId: row.user_id })),
        verifyCandidate: (tenantId, email, candidatePassword, verifyPasswordFn) =>
          loginService.verifyAnonymousCandidate({ tenant_id: tenantId, email, password: candidatePassword }, verifyPasswordFn),
        finalizeSuccess: (tenantId, credentialId, user, roleCount, auditContext) =>
          loginService.finalizeAnonymousLogin(tenantId, credentialId, user, roleCount, auditContext),
        registerFailure: (tenantId, credentialId, email, auditContext) =>
          loginService.registerAnonymousFailure(tenantId, credentialId, email, auditContext),
        sleep: async (ms) => {
          slept = ms;
        },
      });
      const started = performance.now();
      const outcome = await service.attempt({ email: f.email, password });
      const ms = performance.now() - started;

      return { ms, kind: (outcome as { kind: string }).kind, slept };
    }

    async function zerar(): Promise<void> {
      await h.admin.localAuthCredential.updateMany({
        where: { OR: f.orgs.map((org) => ({ tenant_id: org.tenantId, user_id: org.userId })) },
        data: { failed_attempts: 0, locked_until: null },
      });
    }

    const warmRight = await measure(f.password);
    const warmWrong = await measure("errada");

    await zerar();

    const right: number[] = [];
    const wrong: number[] = [];

    for (let i = 0; i < 12; i += 1) {
      const ok = await measure(f.password);

      assert.equal(ok.kind, "success", "HC1b: a senha certa entra (os 3 pares colapsam)");
      right.push(ok.ms);

      const bad = await measure("errada");

      assert.equal(bad.kind, "invalid");
      wrong.push(bad.ms);
      await zerar();
    }

    // A conta da senha rodou nas 12 erradas (cada uma somou nos 3 pares antes de zerar): confere a última forma.
    assert.equal((await measure("errada")).kind, "invalid");
    assert.deepEqual((await credenciais(h, f)).map((row) => row.failed_attempts), [1, 1, 1], "HC1b: a errada soma nos 3 pares");

    const fmt = (values: number[]) => values.map((value) => value.toFixed(1)).join(", ");

    console.log(`HC1b aquecimento: certa ${warmRight.ms.toFixed(1)} ms (${warmRight.kind}), errada ${warmWrong.ms.toFixed(1)} ms (${warmWrong.kind})`);
    console.log(`HC1b certa (12): ${fmt(right)} | máx ${Math.max(...right).toFixed(1)} ms`);
    console.log(`HC1b errada (12): ${fmt(wrong)} | máx ${Math.max(...wrong).toFixed(1)} ms`);

    assert.ok(Math.max(...right) < 300, `HC1b: certa, máximo ${Math.max(...right).toFixed(1)} ms < 300`);
    assert.ok(Math.max(...wrong) < 300, `HC1b: errada, máximo ${Math.max(...wrong).toFixed(1)} ms < 300`);
  });
}
