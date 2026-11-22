import assert from "node:assert/strict";
import test, { after } from "node:test";

import { createPrismaClient } from "../src/database/pg-connection.js";
import { credenciais, desmontarArnes, login, montarArnes, novaFamilia, type Arnes } from "./bapporg2s_familia-helper.js";

// -----------------------------------------------------------------------------------------------
// B-APP-ORG-2S (Emenda 1.8.3.17 §2.3 (b), C2-04) — o Entrar usa UMA conexão por login. A escrita do login nos pares
// (a tentativa errada que conta em todos e o acerto que zera todos) roda na MESMA transação do login. O arnês sobe o
// app com o cliente do papel efêmero limitado a 1 conexão; o do administrador fica no padrão. Se a escrita nos pares
// abrir outra transação no cliente global com a do login aberta, o login espera a si mesmo e responde 500.
// Arquivo próprio: o cliente global do app é fixado no primeiro `import` de `src/database/prisma.ts`, e um segundo
// arnês no mesmo processo não troca o pool. Mutação M17-7: `{ max: 1 }` → `undefined` (a fixture deixa de ter 1 conexão).
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("B-APP-ORG-2S · GL-POOL1 (app real) exige DATABASE_URL e um PostgreSQL migrado", {
    skip: "Defina DATABASE_URL e rode as migrações para executar esta suíte.",
  });
} else {
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL = "silent";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";
  process.env.JWT_EXPIRES_IN = "15m";

  let harnessPromise: Promise<Arnes> | undefined;
  const harness = (): Promise<Arnes> =>
    (harnessPromise ??= montarArnes(connectionString, {
      criarCliente: (url) => createPrismaClient(url, url === connectionString ? undefined : { max: 1 }),
    }));

  after(async () => {
    const h = harnessPromise ? await harnessPromise.catch(() => undefined) : undefined;

    if (h) {
      await desmontarArnes(h);
    }
  });

  async function umaConexaoSo(h: Arnes): Promise<void> {
    await h.role.client.$queryRaw`SELECT 1`;
    const t0 = Date.now();
    await Promise.all([h.role.client.$executeRaw`SELECT pg_sleep(0.3)`, h.role.client.$executeRaw`SELECT pg_sleep(0.3)`]);
    const ms = Date.now() - t0;

    assert.ok(ms >= 550, `fixture: o cliente do app tem 1 conexão (duas esperas de 300 ms em série; medido ${ms} ms)`);
  }

  for (const semOrg of [false, true]) {
    test(`GL-POOL1 (${semOrg ? "sem" : "com"} organização) — com 1 conexão no app: a errada dá 401 e conta nos 2 pares; a certa dá 200 e zera os 2`, { timeout: 120_000 }, async () => {
      const h = await harness();

      await umaConexaoSo(h);

      const f = await novaFamilia(h, `glpool1${semOrg ? "s" : "c"}`, { pairs: 2 });
      const tenantId = semOrg ? null : f.orgs[0]!.tenantId;
      const errada = await login(h, tenantId, f.email, "errada-de-proposito");
      const depoisDaErrada = (await credenciais(h, f)).map((row) => row.failed_attempts);
      const certa = await login(h, tenantId, f.email, f.password);
      const depoisDaCerta = (await credenciais(h, f)).map((row) => row.failed_attempts);

      console.log(`# GL-POOL1 ${JSON.stringify({ semOrg, errada: errada.status, depoisDaErrada, certa: certa.status, depoisDaCerta })}`);
      assert.equal(errada.status, 401, "GL-POOL1: a senha errada responde 401");
      assert.deepEqual(depoisDaErrada, [1, 1], "GL-POOL1: a tentativa errada conta nos 2 pares");
      assert.equal(certa.status, 200, "GL-POOL1: a senha certa entra");
      assert.deepEqual(depoisDaCerta, [0, 0], "GL-POOL1: o acerto zera os 2 pares");
    });
  }
}
