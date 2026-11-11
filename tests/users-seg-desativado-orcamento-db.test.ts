import assert from "node:assert/strict";
import test, { after } from "node:test";

import type { PrismaClient } from "@prisma/client";

import { requestJson } from "./helpers/auth-identity-fixture.js";
import {
  desmontarSessaoReal,
  entrar,
  montarSessaoReal,
  novaOrganizacao,
  portador,
  type SessaoRealHarness,
} from "./helpers/users-seg-desativado-sessao.js";

// -----------------------------------------------------------------------------------------------
// B-USERS-SEG-DESATIVADO — T13b (Emenda 1, A3): a conferência da sessão tem ORÇAMENTO. Banco lento vira 503
// `session_check_unavailable` em cerca de 1,5 s (o `statement_timeout` local da transação), nunca espera sem fim.
//
// O dublê: o Prisma global é o cliente do papel efêmero EMBRULHADO num Proxy que delega tudo ao cliente real; a
// única exceção é o `$transaction`, que embrulha o `tx`: com `lento.on`, o `$queryRaw` cujo texto contém
// `FROM auth_sessions s` roda antes, na MESMA transação, um `SELECT 1 FROM pg_sleep(5)` (a forma que o Prisma
// desserializa: `SELECT pg_sleep(5)` devolve uma coluna `void`, que falharia por outro motivo). O `pg_sleep` vem depois do
// `set_config('statement_timeout', …)` do helper, e por isso o próprio PostgreSQL o cancela. Arquivo próprio: o
// dublê não alcança outra suíte, e nada trava tabela no banco compartilhado. Modo `prisma` forçado e conferido;
// o singleton é o Proxy (A9).
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("B-USERS-SEG-DESATIVADO · orçamento (app real) exige DATABASE_URL e um PostgreSQL migrado", {
    skip: "Defina DATABASE_URL e rode as migrações para executar esta suíte.",
  });
} else {
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL = "silent";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";
  process.env.JWT_EXPIRES_IN = "15m";

  const lento = { on: false };

  const embrulharTx = (tx: object): object =>
    new Proxy(tx, {
      get(target, prop) {
        if (prop === "$queryRaw") {
          return async (strings: TemplateStringsArray, ...values: unknown[]) => {
            const real = target as { $queryRaw: (s: TemplateStringsArray, ...v: unknown[]) => Promise<unknown> };

            if (lento.on && Array.isArray(strings) && strings.join("").includes("FROM auth_sessions s")) {
              await (target as PrismaClient).$queryRaw`SELECT 1 AS dormiu FROM pg_sleep(5)`;
            }

            return real.$queryRaw(strings, ...values);
          };
        }

        const value = Reflect.get(target, prop, target) as unknown;

        return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(target) : value;
      },
    });

  const embrulharCliente = (client: PrismaClient): PrismaClient =>
    new Proxy(client, {
      get(target, prop) {
        if (prop === "$transaction") {
          return (arg: unknown, options?: unknown) => {
            if (typeof arg !== "function") {
              return (target.$transaction as (a: unknown, o?: unknown) => unknown)(arg, options);
            }

            return (target.$transaction as (a: unknown, o?: unknown) => unknown)(
              (tx: object) => (arg as (t: object) => unknown)(embrulharTx(tx)),
              options,
            );
          };
        }

        const value = Reflect.get(target, prop, target) as unknown;

        return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(target) : value;
      },
    });

  let harnessPromise: Promise<SessaoRealHarness> | undefined;

  const harness = (): Promise<SessaoRealHarness> =>
    (harnessPromise ??= (async () => {
      const h = await montarSessaoReal(connectionString, { embrulharCliente });

      try {
        const { env } = await import("../src/config/env.js");

        assert.equal(env.CORE_SAAS_PERSISTENCE, "prisma", "E1.5: a suíte roda em prisma, nunca em memória");
        assert.equal((await import("../src/database/prisma.js")).prisma, h.client, "A9: o portão usa o dublê do papel");
        assert.notEqual(h.client, h.role.client, "fixture: o singleton é o Proxy, não o cliente cru");
      } catch (error) {
        // O assert do modo ou do cliente falhou (drills D-A4/D-A9): desmonta antes de propagar, para o processo
        // não ficar preso no servidor aberto.
        await desmontarSessaoReal(h);
        throw error;
      }

      return h;
    })());

  after(async () => {
    lento.on = false;

    if (harnessPromise) {
      // Arnês que falhou já se desmontou.
      const h = await harnessPromise.catch(() => undefined);

      if (h) {
        await desmontarSessaoReal(h);
      }
    }
  });

  test("T13b — conferência lenta responde 503 session_check_unavailable dentro do orçamento; o 503 não é permanente", async () => {
    const h = await harness();
    const org = await novaOrganizacao(h, "t13b");
    const sessao = await entrar(h, { tenantId: org.tenantId, email: org.email, password: org.password });

    lento.on = true;

    const inicio = Date.now();
    let resposta: Awaited<ReturnType<typeof requestJson>>;

    try {
      resposta = await requestJson(h.baseUrl, "/api/v1/me/tenants", { headers: portador(sessao.accessToken) });
    } finally {
      lento.on = false;
    }

    const ms = Date.now() - inicio;

    assert.equal(resposta.status, 503, `conferência lenta (${ms} ms): ${JSON.stringify(resposta.body).slice(0, 200)}`);
    assert.equal(resposta.body.error?.code, "SERVICE_UNAVAILABLE");
    assert.equal(resposta.body.error?.reason, "session_check_unavailable");
    assert.ok(ms >= 1_400, `o pg_sleep rodou e foi cortado pelo orçamento, não antes (${ms} ms)`);
    assert.ok(ms < 2_500, `o corte vem dentro do orçamento (${ms} ms)`);

    const depois = await requestJson(h.baseUrl, "/api/v1/me/tenants", { headers: portador(sessao.accessToken) });

    assert.equal(depois.status, 200, "controle: sem lentidão, o mesmo token passa (o 503 não foi permanente)");
  });
}
